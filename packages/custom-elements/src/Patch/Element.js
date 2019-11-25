/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import Native from './Native.js';
import CustomElementInternals from '../CustomElementInternals.js';
import CEState from '../CustomElementState.js';
import * as Utilities from '../Utilities.js';

import PatchParentNode from './Interface/ParentNode.js';
import PatchChildNode from './Interface/ChildNode.js';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals, prefix = '') {

  const nativeMethods = Utilities.findNativeMethods(Element.prototype, prefix,
    ['attachShadow', 'setAttribute', 'getAttribute', 'setAttributeNS',
    'getAttributeNS', 'removeAttribute', 'removeAttributeNS']);

  const nodeNativeMethods = Utilities.findNativeMethods(Node.prototype, prefix,
    ['appendChild', 'removeChild', 'cloneNode']);

  if (Native.Element_attachShadow) {

    Utilities.setPropertyUnchecked(Element.prototype, prefix + 'attachShadow',
      /**
       * @this {Element}
       * @param {!{mode: string}} init
       * @return {ShadowRoot}
       */
      function(init) {
        const shadowRoot = nativeMethods.attachShadow.call(this, init);
        internals.patchNode(shadowRoot);
        this.__CE_shadowRoot = shadowRoot;
        return shadowRoot;
      });
  }

  function patch_innerHTML(destination, baseDescriptor = null) {

    let innerHTMLPrefix = /*baseDescriptor ? '' :*/ prefix;

    if (!baseDescriptor) {
      baseDescriptor = Object.getOwnPropertyDescriptor(destination, innerHTMLPrefix + 'innerHTML');
    }

    Object.defineProperty(destination, innerHTMLPrefix + 'innerHTML', {
      enumerable: baseDescriptor.enumerable,
      configurable: true,
      get: baseDescriptor.get,
      set: /** @this {Element} */ function(htmlString) {
        const isConnected = Utilities.isConnected(this);

        // NOTE: In IE11, when using the native `innerHTML` setter, all nodes
        // that were previously descendants of the context element have all of
        // their children removed as part of the set - the entire subtree is
        // 'disassembled'. This work around walks the subtree *before* using the
        // native setter.
        /** @type {!Array<!Element>|undefined} */
        let removedElements = undefined;
        if (isConnected) {
          removedElements = [];
          internals.forEachElement(this, element => {
            if (element !== this) {
              removedElements.push(element);
            }
          });
        }

        baseDescriptor.set.call(this, htmlString);

        if (removedElements) {
          for (let i = 0; i < removedElements.length; i++) {
            const element = removedElements[i];
            if (element.__CE_state === CEState.custom) {
              internals.disconnectedCallback(element);
            }
          }
        }

        // Only create custom elements if this element's owner document is
        // associated with the registry.
        if (!this.ownerDocument.__CE_registry) {
          internals.patchTree(this);
        } else {
          internals.patchAndUpgradeTree(this);
        }
        return htmlString;
      },
    });
  }

  const elementInnerHTMLDescriptor =
    Object.getOwnPropertyDescriptor(Element.prototype, prefix + 'innerHTML');

  const htmlElementInnerHTMLDescriptor =
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, prefix + 'innerHTML');

  if (elementInnerHTMLDescriptor && elementInnerHTMLDescriptor.get) {
    patch_innerHTML(Element.prototype);
  } else if (htmlElementInnerHTMLDescriptor && htmlElementInnerHTMLDescriptor.get) {
    patch_innerHTML(HTMLElement.prototype);
  } else {
    internals.addElementPatch(function(element) {
      patch_innerHTML(element, {
        enumerable: true,
        configurable: true,
        // Implements getting `innerHTML` by performing an unpatched `cloneNode`
        // of the element and returning the resulting element's `innerHTML`.
        // TODO: Is this too expensive?
        get: /** @this {Element} */ function() {
          return /** @type {!Element} */ (
                    Native.Node_cloneNode.call(this, true))
              .innerHTML;
        },
        // Implements setting `innerHTML` by creating an unpatched element,
        // setting `innerHTML` of that element and replacing the target
        // element's children with those of the unpatched element.
        set: /** @this {Element} */ function(assignedValue) {
          // NOTE: re-route to `content` for `template` elements.
          // We need to do this because `template.appendChild` does not
          // route into `template.content`.
          const isTemplate = (this.localName === 'template');
          /** @type {!Node} */
          const content = isTemplate ? (/** @type {!HTMLTemplateElement} */
            (this)).content : this;
          /** @type {!Element} */
          const rawElement = Native.Document_createElementNS.call(document,
              this.namespaceURI, this.localName);
          rawElement.innerHTML = assignedValue;

          while (content.childNodes.length > 0) {
            Native.Node_removeChild.call(content, content.childNodes[0]);
          }
          const container = isTemplate ?
              /** @type {!HTMLTemplateElement} */ (rawElement).content :
              rawElement;
          while (container.childNodes.length > 0) {
            Native.Node_appendChild.call(content, container.childNodes[0]);
          }
        },
      });
    });
  }

  Utilities.setPropertyUnchecked(Element.prototype, prefix + 'setAttribute',
    /**
     * @this {Element}
     * @param {string} name
     * @param {string} newValue
     */
    function(name, newValue) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return nativeMethods.setAttribute.call(this, name, newValue);
      }

      const oldValue = nativeMethods.getAttribute.call(this, name);
      nativeMethods.setAttribute.call(this, name, newValue);
      newValue = nativeMethods.getAttribute.call(this, name);
      internals.attributeChangedCallback(this, name, oldValue, newValue, null);
    });

  Utilities.setPropertyUnchecked(Element.prototype, prefix + 'setAttributeNS',
    /**
     * @this {Element}
     * @param {?string} namespace
     * @param {string} name
     * @param {string} newValue
     */
    function(namespace, name, newValue) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return nativeMethods.setAttributeNS.call(this, namespace, name, newValue);
      }

      const oldValue = nativeMethods.getAttributeNS.call(this, namespace, name);
      nativeMethods.setAttributeNS.call(this, namespace, name, newValue);
      newValue = nativeMethods.getAttributeNS.call(this, namespace, name);
      internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
    });

  Utilities.setPropertyUnchecked(Element.prototype, prefix + 'removeAttribute',
    /**
     * @this {Element}
     * @param {string} name
     */
    function(name) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return nativeMethods.removeAttribute.call(this, name);
      }

      const oldValue = nativeMethods.getAttribute.call(this, name);
      nativeMethods.removeAttribute.call(this, name);
      if (oldValue !== null) {
        internals.attributeChangedCallback(this, name, oldValue, null, null);
      }
    });

  Utilities.setPropertyUnchecked(Element.prototype, prefix + 'removeAttributeNS',
    /**
     * @this {Element}
     * @param {?string} namespace
     * @param {string} name
     */
    function(namespace, name) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return nativeMethods.removeAttributeNS.call(this, namespace, name);
      }

      const oldValue = nativeMethods.getAttributeNS.call(this, namespace, name);
      nativeMethods.removeAttributeNS.call(this, namespace, name);
      // In older browsers, `Element#getAttributeNS` may return the empty string
      // instead of null if the attribute does not exist. For details, see;
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttributeNS#Notes
      const newValue = nativeMethods.getAttributeNS.call(this, namespace, name);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
      }
    });


  function patch_insertAdjacentElement(destination) {

    const baseMethod = destination[prefix + 'insertAdjacentElement'];

    Utilities.setPropertyUnchecked(destination, prefix + 'insertAdjacentElement',
      /**
       * @this {Element}
       * @param {string} position
       * @param {!Element} element
       * @return {?Element}
       */
      function(position, element) {
        const wasConnected = Utilities.isConnected(element);
        const insertedElement = /** @type {!Element} */
          (baseMethod.call(this, position, element));

        if (wasConnected) {
          internals.disconnectTree(element);
        }

        if (Utilities.isConnected(insertedElement)) {
          internals.connectTree(element);
        }
        return insertedElement;
      });
  }

  if (Native.HTMLElement_insertAdjacentElement) {
    patch_insertAdjacentElement(HTMLElement.prototype);
  } else if (Native.Element_insertAdjacentElement) {
    patch_insertAdjacentElement(Element.prototype);
  }


  function patch_insertAdjacentHTML(destination) {

    const baseMethod = destination[prefix + 'insertAdjacentHTML'];
    /**
     * Patches and upgrades all nodes which are siblings between `start`
     * (inclusive) and `end` (exclusive). If `end` is `null`, then all siblings
     * following `start` will be patched and upgraded.
     * @param {!Node} start
     * @param {?Node} end
     */
    function upgradeNodesInRange(start, end) {
      const nodes = [];
      for (let node = start; node !== end; node = node.nextSibling) {
        nodes.push(node);
      }
      for (let i = 0; i < nodes.length; i++) {
        internals.patchAndUpgradeTree(nodes[i]);
      }
    }

    Utilities.setPropertyUnchecked(destination, prefix + 'insertAdjacentHTML',
      /**
       * @this {Element}
       * @param {string} position
       * @param {string} text
       */
      function(position, text) {
        position = position.toLowerCase();

        if (position === "beforebegin") {
          const marker = this.previousSibling;
          baseMethod.call(this, position, text);
          upgradeNodesInRange(marker || /** @type {!Node} */ (this.parentNode.firstChild), this);
        } else if (position === "afterbegin") {
          const marker = this.firstChild;
          baseMethod.call(this, position, text);
          upgradeNodesInRange(/** @type {!Node} */ (this.firstChild), marker);
        } else if (position === "beforeend") {
          const marker = this.lastChild;
          baseMethod.call(this, position, text);
          upgradeNodesInRange(marker || /** @type {!Node} */ (this.firstChild), null);
        } else if (position === "afterend") {
          const marker = this.nextSibling;
          baseMethod.call(this, position, text);
          upgradeNodesInRange(/** @type {!Node} */ (this.nextSibling), marker);
        } else {
          throw new SyntaxError(`The value provided (${String(position)}) is ` +
            "not one of 'beforebegin', 'afterbegin', 'beforeend', or 'afterend'.");
        }
      });
  }

  if (Native.HTMLElement_insertAdjacentHTML) {
    patch_insertAdjacentHTML(HTMLElement.prototype);
  } else if (Native.Element_insertAdjacentHTML) {
    patch_insertAdjacentHTML(Element.prototype);
  }


  PatchParentNode(internals, Element.prototype, {
    prepend: Native.Element_prepend,
    append: Native.Element_append,
  });

  PatchChildNode(internals, Element.prototype, {
    before: Native.Element_before,
    after: Native.Element_after,
    replaceWith: Native.Element_replaceWith,
    remove: Native.Element_remove,
  });
};
