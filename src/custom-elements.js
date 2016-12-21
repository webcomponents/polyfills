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
  CustomElementState,
  elementState,
  elementDefinition,
} from './CustomElementInternals';
import CustomElementRegistry from './CustomElementRegistry';
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

  // TODO(bicknellr): Is there a better way to know when the whole document is
  // available to attempt upgrades on elements that weren't in the document as
  // of the last call to `CustomElementsRegistry#define`?
  document.addEventListener('DOMContentLoaded', function() {
    internals.upgradeTree(document);
  });


  // PATCHING

  const native_HTMLElement = window.HTMLElement;
  const native_Document_createElement = window.Document.prototype.createElement;
  const native_Document_createElementNS = window.Document.prototype.createElementNS;
  const native_Node_insertBefore = window.Node.prototype.insertBefore;

  window['HTMLElement'] = (function() {
    /**
     * @type {function(new: HTMLElement): !HTMLElement}
     */
    function HTMLElement() {
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
        self[elementState] = CustomElementState.custom;
        self[elementDefinition] = definition;
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

    for (const node of nodes) {
      native_Node_insertBefore.call(this, node, refNode);
    }

    const connected = Utilities.isConnected(this);
    if (connected) {
      const walker = document.createTreeWalker(this, NodeFilter.SHOW_ELEMENT);
      do {
        const currentNode = /** @type {!Element} */ (walker.currentNode);
        if (currentNode === this) continue;

        if (currentNode[elementState] === CustomElementState.custom) {
          internals.connectedCallback(currentNode);
        } else {
          internals.upgradeElement(currentNode);
        }
      } while (walker.nextNode());
    }

    return node;
  };

  /**
   * @param {!Node} node
   * @return {!Node}
   */
  Node.prototype.appendChild = function(node) {
    return Node.prototype.insertBefore.call(this, node, null);
  };
}
