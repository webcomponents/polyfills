/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {
  nativeDefine,
  nativeGet,
  nativeRegistry,
} from '../Native/CustomElementRegistry.js';
import {NativeHTMLElement} from '../Native/HTMLElement.js';
import {
  creationContext,
  definitionForElement,
  globalDefinitionForConstructor,
  scopeForElement,
  setUpgradingInstance,
} from '../sharedState.js';

const pendingRegistryForElement = new WeakMap();

export const install = () => {
  // Constructable CE registry class, which uses the native CE registry to
  // register stand-in elements that can delegate out to CE classes registered
  // in scoped registries
  window.CustomElementRegistry = class {
    constructor() {
      this._definitionsByTag = new Map();
      this._definitionsByClass = new Map();
      this._whenDefinedPromises = new Map();
      this._awaitingUpgrade = new Map();
    }

    define(tagName, elementClass) {
      tagName = tagName.toLowerCase();
      if (this._getDefinition(tagName) !== undefined) {
        throw new DOMException(
          `Failed to execute 'define' on 'CustomElementRegistry': the name "${tagName}" has already been used with this registry`
        );
      }
      if (this._definitionsByClass.get(elementClass) !== undefined) {
        throw new DOMException(
          `Failed to execute 'define' on 'CustomElementRegistry': this constructor has already been used with this registry`
        );
      }
      // Since observedAttributes can't change, we approximate it by patching
      // set/removeAttribute on the user's class
      const attributeChangedCallback =
        elementClass.prototype.attributeChangedCallback;
      const observedAttributes = new Set(elementClass.observedAttributes || []);
      patchAttributes(
        elementClass,
        observedAttributes,
        attributeChangedCallback
      );
      // Register the definition
      const definition = {
        elementClass,
        connectedCallback: elementClass.prototype.connectedCallback,
        disconnectedCallback: elementClass.prototype.disconnectedCallback,
        adoptedCallback: elementClass.prototype.adoptedCallback,
        attributeChangedCallback,
        'formAssociated': elementClass['formAssociated'],
        'formAssociatedCallback':
          elementClass.prototype['formAssociatedCallback'],
        'formDisabledCallback': elementClass.prototype['formDisabledCallback'],
        'formResetCallback': elementClass.prototype['formResetCallback'],
        'formStateRestoreCallback':
          elementClass.prototype['formStateRestoreCallback'],
        observedAttributes,
      };
      this._definitionsByTag.set(tagName, definition);
      this._definitionsByClass.set(elementClass, definition);
      // Register a stand-in class which will handle the registry lookup & delegation
      let standInClass = nativeGet.call(nativeRegistry, tagName);
      if (!standInClass) {
        standInClass = createStandInElement(tagName);
        nativeDefine.call(nativeRegistry, tagName, standInClass);
      }
      if (this === window.customElements) {
        globalDefinitionForConstructor.set(elementClass, definition);
        definition.standInClass = standInClass;
      }
      // Upgrade any elements created in this scope before define was called
      const awaiting = this._awaitingUpgrade.get(tagName);
      if (awaiting) {
        this._awaitingUpgrade.delete(tagName);
        for (const element of awaiting) {
          pendingRegistryForElement.delete(element);
          customize(element, definition, true);
        }
      }
      // Flush whenDefined callbacks
      const info = this._whenDefinedPromises.get(tagName);
      if (info !== undefined) {
        info.resolve(elementClass);
        this._whenDefinedPromises.delete(tagName);
      }
      return elementClass;
    }

    upgrade() {
      creationContext.push(this);
      nativeRegistry.upgrade.apply(nativeRegistry, arguments);
      creationContext.pop();
    }

    get(tagName) {
      const definition = this._definitionsByTag.get(tagName);
      return definition?.elementClass;
    }

    _getDefinition(tagName) {
      return this._definitionsByTag.get(tagName);
    }

    whenDefined(tagName) {
      const definition = this._getDefinition(tagName);
      if (definition !== undefined) {
        return Promise.resolve(definition.elementClass);
      }
      let info = this._whenDefinedPromises.get(tagName);
      if (info === undefined) {
        info = {};
        info.promise = new Promise((r) => (info.resolve = r));
        this._whenDefinedPromises.set(tagName, info);
      }
      return info.promise;
    }

    _upgradeWhenDefined(element, tagName, shouldUpgrade) {
      let awaiting = this._awaitingUpgrade.get(tagName);
      if (!awaiting) {
        this._awaitingUpgrade.set(tagName, (awaiting = new Set()));
      }
      if (shouldUpgrade) {
        awaiting.add(element);
      } else {
        awaiting.delete(element);
      }
    }
  };
};

// Helpers to return the scope for a node where its registry would be located
const isValidScope = (node) => node === document || node instanceof ShadowRoot;
const registryForNode = (node) => {
  // TODO: the algorithm for finding the scope is a bit up in the air; assigning
  // a one-time scope at creation time would require walking every tree ever
  // created, which is avoided for now
  let scope = node.getRootNode();
  // If we're not attached to the document (i.e. in a disconnected tree or
  // fragment), we need to get the scope from the creation context; that should
  // be a Document or ShadowRoot, unless it was created via innerHTML
  if (!isValidScope(scope)) {
    const context = creationContext[creationContext.length - 1];
    // When upgrading via registry.upgrade(), the registry itself is put on the
    // creationContext stack
    if (context instanceof CustomElementRegistry) {
      return context;
    }
    // Otherwise, get the root node of the element this was created from
    scope = context.getRootNode();
    // The creation context wasn't a Document or ShadowRoot or in one; this
    // means we're being innerHTML'ed into a disconnected element; for now, we
    // hope that root node was created imperatively, where we stash _its_
    // scopeForElement. Beyond that, we'd need more costly tracking.
    if (!isValidScope(scope)) {
      scope = scopeForElement.get(scope)?.getRootNode() || document;
    }
  }
  return scope.customElements;
};

// Helper to create stand-in element for each tagName registered that delegates
// out to the registry for the given element
const createStandInElement = (tagName) => {
  return class ScopedCustomElementBase {
    static get ['formAssociated']() {
      return true;
    }
    constructor() {
      // Create a raw HTMLElement first
      const instance = Reflect.construct(
        NativeHTMLElement,
        [],
        this.constructor
      );
      // We need to install the minimum HTMLElement prototype so that
      // scopeForNode can use DOM API to determine our construction scope;
      // upgrade will eventually install the full CE prototype
      Object.setPrototypeOf(instance, HTMLElement.prototype);
      // Get the node's scope, and its registry (falls back to global registry)
      const registry = registryForNode(instance) || window.customElements;
      const definition = registry._getDefinition(tagName);
      if (definition) {
        customize(instance, definition);
      } else {
        pendingRegistryForElement.set(instance, registry);
      }
      return instance;
    }

    connectedCallback() {
      const definition = definitionForElement.get(this);
      if (definition) {
        // Delegate out to user callback
        definition.connectedCallback &&
          definition.connectedCallback.apply(this, arguments);
      } else {
        // Register for upgrade when defined (only when connected, so we don't leak)
        pendingRegistryForElement
          .get(this)
          ._upgradeWhenDefined(this, tagName, true);
      }
    }

    disconnectedCallback() {
      const definition = definitionForElement.get(this);
      if (definition) {
        // Delegate out to user callback
        definition.disconnectedCallback &&
          definition.disconnectedCallback.apply(this, arguments);
      } else {
        // Un-register for upgrade when defined (so we don't leak)
        pendingRegistryForElement
          .get(this)
          ._upgradeWhenDefined(this, tagName, false);
      }
    }

    adoptedCallback() {
      const definition = definitionForElement.get(this);
      definition?.adoptedCallback?.apply(this, arguments);
    }

    // Form-associated custom elements lifecycle methods
    ['formAssociatedCallback']() {
      const definition = definitionForElement.get(this);
      if (definition && definition['formAssociated']) {
        definition?.['formAssociatedCallback']?.apply(this, arguments);
      }
    }

    ['formDisabledCallback']() {
      const definition = definitionForElement.get(this);
      if (definition?.['formAssociated']) {
        definition?.['formDisabledCallback']?.apply(this, arguments);
      }
    }

    ['formResetCallback']() {
      const definition = definitionForElement.get(this);
      if (definition?.['formAssociated']) {
        definition?.['formResetCallback']?.apply(this, arguments);
      }
    }

    ['formStateRestoreCallback']() {
      const definition = definitionForElement.get(this);
      if (definition?.['formAssociated']) {
        definition?.['formStateRestoreCallback']?.apply(this, arguments);
      }
    }

    // no attributeChangedCallback or observedAttributes since these
    // are simulated via setAttribute/removeAttribute patches
  };
};

// Helper to patch CE class setAttribute/getAttribute to implement
// attributeChangedCallback
const patchAttributes = (
  elementClass,
  observedAttributes,
  attributeChangedCallback
) => {
  if (observedAttributes.size === 0 || attributeChangedCallback === undefined) {
    return;
  }
  const setAttribute = elementClass.prototype.setAttribute;
  if (setAttribute) {
    elementClass.prototype.setAttribute = function (n, value) {
      const name = n.toLowerCase();
      if (observedAttributes.has(name)) {
        const old = this.getAttribute(name);
        setAttribute.call(this, name, value);
        attributeChangedCallback.call(this, name, old, value);
      } else {
        setAttribute.call(this, name, value);
      }
    };
  }
  const removeAttribute = elementClass.prototype.removeAttribute;
  if (removeAttribute) {
    elementClass.prototype.removeAttribute = function (n) {
      const name = n.toLowerCase();
      if (observedAttributes.has(name)) {
        const old = this.getAttribute(name);
        removeAttribute.call(this, name);
        attributeChangedCallback.call(this, name, old, null);
      } else {
        removeAttribute.call(this, name);
      }
    };
  }
  const toggleAttribute = elementClass.prototype.toggleAttribute;
  if (toggleAttribute) {
    elementClass.prototype.toggleAttribute = function (n) {
      const name = n.toLowerCase();
      if (observedAttributes.has(name)) {
        const old = this.getAttribute(name);
        toggleAttribute.call(this, name);
        const newValue = this.getAttribute(name);
        attributeChangedCallback.call(this, name, old, newValue);
      } else {
        toggleAttribute.call(this, name);
      }
    };
  }
};

// Helper to patch CE class hierarchy changing those CE classes created before applying the polyfill
// to make them work with the new patched CustomElementsRegistry
const patchHTMLElement = (elementClass) => {
  const parentClass = Object.getPrototypeOf(elementClass);

  if (parentClass !== window.HTMLElement) {
    if (parentClass === NativeHTMLElement) {
      return Object.setPrototypeOf(elementClass, window.HTMLElement);
    }

    return patchHTMLElement(parentClass);
  }
};

// Helper to upgrade an instance with a CE definition using "constructor call trick"
const customize = (instance, definition, isUpgrade = false) => {
  Object.setPrototypeOf(instance, definition.elementClass.prototype);
  definitionForElement.set(instance, definition);
  setUpgradingInstance(instance);
  try {
    new definition.elementClass();
  } catch (_) {
    patchHTMLElement(definition.elementClass);
    new definition.elementClass();
  }
  // Approximate observedAttributes from the user class, since the stand-in element had none
  definition.observedAttributes.forEach((attr) => {
    if (instance.hasAttribute(attr)) {
      definition.attributeChangedCallback.call(
        instance,
        attr,
        null,
        instance.getAttribute(attr)
      );
    }
  });
  if (isUpgrade && definition.connectedCallback && instance.isConnected) {
    definition.connectedCallback.call(instance);
  }
};
