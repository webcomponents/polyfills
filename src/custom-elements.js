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
  const native_Document_createElement = window.Document.prototype.createElement;
  const native_Document_createElementNS = window.Document.prototype.createElementNS;
  const native_Document_importNode = window.Document.prototype.importNode;
  const native_Node_cloneNode = window.Node.prototype.cloneNode;
  const native_Node_insertBefore = window.Node.prototype.insertBefore;
  const native_Node_removeChild = window.Node.prototype.removeChild;
  const native_Element_attachShadow = window.Element.prototype['attachShadow'];
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
        const self = native_Document_createElement.call(document, definition.localName);
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

  /**
   * @param {string} localName
   * @return {!Element}
   */
  Document.prototype.createElement = function(localName) {
    const definition = internals.localNameToDefinition(localName);
    if (definition) {
      return new (definition.constructor)();
    }

    return native_Document_createElement.call(this, localName);
  };

  /**
   * @param {!Node} node
   * @param {boolean=} deep
   * @return {!Node}
   */
  Document.prototype.importNode = function(node, deep) {
    const clone = native_Document_importNode.call(this, node, deep);
    internals.upgradeTree(clone);
    return clone;
  };

  const NS_HTML = "http://www.w3.org/1999/xhtml";

  /**
   * @param {?string} namespace
   * @param {string} localName
   * @return {!Element}
   */
  Document.prototype.createElementNS = function(namespace, localName) {
    if (namespace === null || namespace === NS_HTML) {
      return this.createElement(localName);
    }

    return native_Document_createElementNS.call(this, namespace, localName);
  };

  /**
   * @param {!Node} node
   * @param {?Node} refNode
   * @return {!Node}
   */
  Node.prototype.insertBefore = function(node, refNode) {
    let nodes;
    if (node instanceof DocumentFragment) {
      nodes = [...node.childNodes];
    } else {
      nodes = [node];
    }

    const nativeResult = native_Node_insertBefore.call(this, node, refNode);

    const connected = Utilities.isConnected(this);
    if (connected) {
      for (const node of nodes) {
        Utilities.walkDeepDescendantElements(node, element => {
          if (element[CustomElementInternalSymbols.state] === CustomElementState.custom) {
            internals.connectedCallback(element);
          } else {
            internals.upgradeElement(element);
          }
        });
      }
    }

    return nativeResult;
  };

  // Keep a reference in case `Node#insertBefore` is patched again.
  const CE_Node_insertBefore = Node.prototype.insertBefore;

  /**
   * @param {!Node} node
   * @return {!Node}
   */
  Node.prototype.appendChild = function(node) {
    return CE_Node_insertBefore.call(this, node, null);
  };

  /**
   * @param {boolean=} deep
   * @return {!Node}
   */
  Node.prototype.cloneNode = function(deep) {
    const clone = native_Node_cloneNode.call(this, deep);
    internals.upgradeTree(clone);
    return clone;
  };

  /**
   * @param {!Node} node
   * @return {!Node}
   */
  Node.prototype.removeChild = function(node) {
    const nativeResult = native_Node_removeChild.call(this, node);

    Utilities.walkDeepDescendantElements(node, element => {
      if (element[CustomElementInternalSymbols.state] === CustomElementState.custom) {
        internals.disconnectedCallback(element);
      }
    });

    return nativeResult;
  };

  // Keep a reference in case `Node#removeChild` is patched again.
  const CE_Node_removeChild = Node.prototype.removeChild;

  /**
   * @param {!Node} nodeToInsert
   * @param {?Node} nodeToRemove
   * @return {!Node}
   */
  Node.prototype.replaceChild = function(nodeToInsert, nodeToRemove) {
    const refChild = nodeToRemove.nextSibling;
    CE_Node_removeChild.call(this, nodeToRemove);
    CE_Node_insertBefore.call(this, nodeToInsert, refChild);
    return nodeToRemove;
  };

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

  /**
   * @param {string} name
   * @param {string} newValue
   */
  Element.prototype.setAttribute = function(name, newValue) {
    const oldValue = native_Element_getAttribute.call(this, name);
    native_Element_setAttribute.call(this, name, newValue);
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
