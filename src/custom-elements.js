/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {
  AlreadyConstructedMarker,
  CustomElementDefinition,
} from './CustomElementDefinition';
import {
  CustomElementInternals,
} from './CustomElementInternals';
import * as CustomElementInternalSymbols from './CustomElementInternalSymbols';
const CustomElementState = CustomElementInternalSymbols.CustomElementState;
import CustomElementRegistry from './CustomElementRegistry';
import DocumentConstructionObserver from './DocumentConstructionObserver';
import * as Utilities from './Utilities';

import BuiltIn from './Patch/BuiltIn';
import PatchDocument from './Patch/Document';
import PatchNode from './Patch/Node';

if (!window['customElements'] || window['customElements']['forcePolyfill']) {
  /** @type {!CustomElementInternals} */
  const internals = new CustomElementInternals();

  /** @type {!CustomElementRegistry} */
  const customElements = new CustomElementRegistry(internals);

  Object.defineProperty(window, 'customElements', {
    configurable: true,
    enumerable: true,
    value: customElements,
  });

  /** @type {!DocumentConstructionObserver} */
  const constructionObserver = new DocumentConstructionObserver(internals, document);

  // PATCHING

  const native_HTMLElement = window.HTMLElement;
  const native_Element_attachShadow = window.Element.prototype['attachShadow'];
  const native_Element_id = Object.getOwnPropertyDescriptor(window.Element.prototype, 'id');
  const native_Element_className = Object.getOwnPropertyDescriptor(window.Element.prototype, 'className');
  const native_Element_slot = Object.getOwnPropertyDescriptor(window.Element.prototype, 'slot');
  const native_Element_innerHTML = Object.getOwnPropertyDescriptor(window.Element.prototype, 'innerHTML');
  const native_Element_getAttribute = window.Element.prototype.getAttribute;
  const native_Element_setAttribute = window.Element.prototype.setAttribute;
  const native_Element_removeAttribute = window.Element.prototype.removeAttribute;
  const native_Element_getAttributeNS = window.Element.prototype.getAttributeNS;
  const native_Element_setAttributeNS = window.Element.prototype.setAttributeNS;
  const native_Element_removeAttributeNS = window.Element.prototype.removeAttributeNS;

  window['HTMLElement'] = (function() {
    /**
     * @type {function(new: HTMLElement): !HTMLElement}
     */
    function HTMLElement() {
      // This should really be `new.target` but `new.target` can't be emulated
      // in ES5. Assuming the user keeps the default value of the constructor's
      // prototype's `constructor` property, this is equivalent.
      /** @type {!Function} */
      const constructor = this.constructor;

      const definition = internals.constructorToDefinition(constructor);
      if (!definition) {
        throw new Error('The custom element being constructed was not registered with `customElements`.');
      }

      const constructionStack = definition.constructionStack;

      if (constructionStack.length === 0) {
        const self = BuiltIn.Document_createElement.call(document, definition.localName);
        Object.setPrototypeOf(self, constructor.prototype);
        self[CustomElementInternalSymbols.state] = CustomElementState.custom;
        self[CustomElementInternalSymbols.definition] = definition;
        return self;
      }

      const lastIndex = constructionStack.length - 1;
      const element = constructionStack[lastIndex];
      if (element === AlreadyConstructedMarker) {
        throw new Error('The HTMLElement constructor was either called reentrantly for this constructor or called multiple times.');
      }
      constructionStack[lastIndex] = AlreadyConstructedMarker;

      Object.setPrototypeOf(element, constructor.prototype);

      return element;
    }

    HTMLElement.prototype = native_HTMLElement.prototype;

    return HTMLElement;
  })();

  PatchDocument(internals);
  PatchNode(internals);

  /**
   * @param {!{mode: string}} init
   * @return {ShadowRoot}
   */
  Element.prototype['attachShadow'] = function(init) {
    const shadowRoot = native_Element_attachShadow.call(this, init);
    this[CustomElementInternalSymbols.shadowRoot] = shadowRoot;
    return shadowRoot;
  };

  Object.defineProperty(Element.prototype, 'innerHTML', {
    enumerable: native_Element_innerHTML.enumerable,
    configurable: true,
    get: native_Element_innerHTML.get,
    set: function(htmlString) {
      native_Element_innerHTML.set.call(this, htmlString);
      internals.upgradeTree(this);
      return htmlString;
    },
  });

  Object.defineProperty(Element.prototype, 'id', {
    enumerable: native_Element_id.enumerable,
    configurable: true,
    get: native_Element_id.get,
    set: function(newValue) {
      const oldValue = native_Element_id.get.call(this);
      native_Element_id.set.call(this, newValue);
      newValue = native_Element_id.get.call(this);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, 'id', oldValue, newValue, null);
      }
    },
  });

  Object.defineProperty(Element.prototype, 'className', {
    enumerable: native_Element_className.enumerable,
    configurable: true,
    get: native_Element_className.get,
    set: function(newValue) {
      const oldValue = native_Element_className.get.call(this);
      native_Element_className.set.call(this, newValue);
      newValue = native_Element_className.get.call(this);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, 'class', oldValue, newValue, null);
      }
    },
  });

  Object.defineProperty(Element.prototype, 'slot', {
    enumerable: native_Element_slot.enumerable,
    configurable: true,
    get: native_Element_slot.get,
    set: function(newValue) {
      const oldValue = native_Element_slot.get.call(this);
      native_Element_slot.set.call(this, newValue);
      newValue = native_Element_slot.get.call(this);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, 'slot', oldValue, newValue, null);
      }
    },
  });

  /**
   * @param {string} name
   * @param {string} newValue
   */
  Element.prototype.setAttribute = function(name, newValue) {
    const oldValue = native_Element_getAttribute.call(this, name);
    native_Element_setAttribute.call(this, name, newValue);
    newValue = native_Element_getAttribute.call(this, name);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(this, name, oldValue, newValue, null);
    }
  };

  /**
   * @param {?string} namespace
   * @param {string} name
   * @param {string} newValue
   */
  Element.prototype.setAttributeNS = function(namespace, name, newValue) {
    const oldValue = native_Element_getAttributeNS.call(this, namespace, name);
    native_Element_setAttributeNS.call(this, namespace, name, newValue);
    newValue = native_Element_getAttributeNS.call(this, namespace, name);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
    }
  };

  /**
   * @param {string} name
   * @param {string} newValue
   */
  Element.prototype.removeAttribute = function(name) {
    const oldValue = native_Element_getAttribute.call(this, name);
    native_Element_removeAttribute.call(this, name);
    if (oldValue !== null) {
      internals.attributeChangedCallback(this, name, oldValue, null, null);
    }
  };

  /**
   * @param {?string} namespace
   * @param {string} name
   * @param {string} newValue
   */
  Element.prototype.removeAttributeNS = function(namespace, name) {
    const oldValue = native_Element_getAttributeNS.call(this, namespace, name);
    native_Element_removeAttributeNS.call(this, namespace, name);
    if (oldValue !== null) {
      internals.attributeChangedCallback(this, name, oldValue, null, namespace);
    }
  };
}
