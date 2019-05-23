/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {proxy as DocumentProxy} from '../Environment/Document.js';
import {
  descriptors as ElementDesc,
  proto as ElementProto,
  proxy as ElementProxy,
} from '../Environment/Element.js';
import {
  descriptors as HTMLElementDesc,
  proto as HTMLElementProto,
} from '../Environment/HTMLElement.js';
import {proxy as HTMLTemplateElementProxy} from '../Environment/HTMLTemplateElement.js';
import {proxy as NodeProxy} from '../Environment/Node.js';

import CustomElementInternals from '../CustomElementInternals.js';
import CEState from '../CustomElementState.js';
import * as Utilities from '../Utilities.js';

import {
  default as PatchParentNode,
  PrependType,
  AppendType,
} from './Interface/ParentNode.js';
import {
  default as PatchChildNode,
  BeforeType,
  AfterType,
  ReplaceWithType,
  RemoveType,
}from './Interface/ChildNode.js';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  if (ElementDesc.attachShadow) {
    Utilities.setPropertyUnchecked(ElementProto, 'attachShadow',
      /**
       * @this {Element}
       * @param {!{mode: string}} init
       * @return {!ShadowRoot}
       */
      function(init) {
        const shadowRoot = /** @type {!ShadowRoot} */ (
            ElementProxy.attachShadow(this, init));
        internals.patchNode(shadowRoot);
        this.__CE_shadowRoot = shadowRoot;
        return shadowRoot;
      });
  }


  function patch_innerHTML(destination, baseDescriptor) {
    Object.defineProperty(destination, 'innerHTML', {
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
          Utilities.walkDeepDescendantElements(this, element => {
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
        if (!NodeProxy.ownerDocument(this).__CE_hasRegistry) {
          internals.patchTree(this);
        } else {
          internals.patchAndUpgradeTree(this);
        }
        return htmlString;
      },
    });
  }

  if (ElementDesc.innerHTML && ElementDesc.innerHTML.get) {
    patch_innerHTML(ElementProto, ElementDesc.innerHTML);
  } else if (HTMLElementDesc.innerHTML && HTMLElementDesc.innerHTML.get) {
    patch_innerHTML(HTMLElementProto, HTMLElementDesc.innerHTML);
  } else {
    // In this case, `innerHTML` has no exposed getter but still exists. Rather
    // than using the environment proxy, we have to get and set it directly.

    internals.addElementPatch(function(element) {
      patch_innerHTML(element, {
        enumerable: true,
        configurable: true,
        // Implements getting `innerHTML` by performing an unpatched `cloneNode`
        // of the element and returning the resulting element's `innerHTML`.
        // TODO: Is this too expensive?
        get: /** @this {Element} */ function() {
          return /** @type {Element} */ (
              NodeProxy.cloneNode(this, true)).innerHTML;
        },
        // Implements setting `innerHTML` by creating an unpatched element,
        // setting `innerHTML` of that element and replacing the target
        // element's children with those of the unpatched element.
        set: /** @this {Element} */ function(assignedValue) {
          // NOTE: re-route to `content` for `template` elements.
          // We need to do this because `template.appendChild` does not
          // route into `template.content`.
          const localName = ElementProxy.localName(this);
          const namespaceURI = ElementProxy.namespaceURI(this);
          const isTemplate = (localName === 'template');
          /** @type {!Node} */
          const content =
            isTemplate
            ? HTMLTemplateElementProxy.content(/** @type {!HTMLTemplateElement} */ (this))
            : this;
          /** @type {!Element} */
          const rawElement = DocumentProxy.createElementNS(document, namespaceURI, localName);
          rawElement.innerHTML = assignedValue;

          while (NodeProxy.childNodes(content).length > 0) {
            NodeProxy.removeChild(content, content.childNodes[0]);
          }
          const container = isTemplate ?
              HTMLTemplateElementProxy.content(
                  /** @type {!HTMLTemplateElement} */ (rawElement)) :
              rawElement;
          while (NodeProxy.childNodes(container).length > 0) {
            NodeProxy.appendChild(content, container.childNodes[0]);
          }
        },
      });
    });
  }


  Utilities.setPropertyUnchecked(ElementProto, 'setAttribute',
    /**
     * @this {Element}
     * @param {string} name
     * @param {string} newValue
     */
    function(name, newValue) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return ElementProxy.setAttribute(this, name, newValue);
      }

      const before = ElementProxy.getAttribute(this, name);
      ElementProxy.setAttribute(this, name, newValue);
      const after = ElementProxy.getAttribute(this, name);
      internals.attributeChangedCallback(this, name, before, after, null);
    });

  Utilities.setPropertyUnchecked(ElementProto, 'setAttributeNS',
    /**
     * @this {Element}
     * @param {?string} namespace
     * @param {string} name
     * @param {string} newValue
     */
    function(namespace, name, newValue) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return ElementProxy.setAttributeNS(this, namespace, name, newValue);
      }

      const before = ElementProxy.getAttributeNS(this, namespace, name);
      ElementProxy.setAttributeNS(this, namespace, name, newValue);
      const after = ElementProxy.getAttributeNS(this, namespace, name);
      internals.attributeChangedCallback(this, name, before, after, namespace);
    });

  Utilities.setPropertyUnchecked(ElementProto, 'removeAttribute',
    /**
     * @this {Element}
     * @param {string} name
     */
    function(name) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return ElementProxy.removeAttribute(this, name);
      }

      const oldValue = ElementProxy.getAttribute(this, name);
      ElementProxy.removeAttribute(this, name);
      if (oldValue !== null) {
        internals.attributeChangedCallback(this, name, oldValue, null, null);
      }
    });

  Utilities.setPropertyUnchecked(ElementProto, 'removeAttributeNS',
    /**
     * @this {Element}
     * @param {?string} namespace
     * @param {string} name
     */
    function(namespace, name) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return ElementProxy.removeAttributeNS(this, namespace, name);
      }

      const oldValue = ElementProxy.getAttributeNS(this, namespace, name);
      ElementProxy.removeAttributeNS(this, namespace, name);
      // In older browsers, `Element#getAttributeNS` may return the empty string
      // instead of null if the attribute does not exist. For details, see;
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttributeNS#Notes
      const newValue = ElementProxy.getAttributeNS(this, namespace, name);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
      }
    });


  function patch_insertAdjacentElement(destination, baseMethod) {
    Utilities.setPropertyUnchecked(destination, 'insertAdjacentElement',
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

  if (HTMLElementDesc.insertAdjacentElement && HTMLElementDesc.insertAdjacentElement.value) {
    patch_insertAdjacentElement(HTMLElementProto, HTMLElementDesc.insertAdjacentElement.value);
  } else if (ElementDesc.insertAdjacentElement && ElementDesc.insertAdjacentElement.value) {
    patch_insertAdjacentElement(ElementProto, ElementDesc.insertAdjacentElement.value);
  } else {
    console.warn('Custom Elements: `Element#insertAdjacentElement` was not patched.');
  }


  function patch_insertAdjacentHTML(destination, baseMethod) {
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

    Utilities.setPropertyUnchecked(destination, 'insertAdjacentHTML',
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

  if (HTMLElementDesc.insertAdjacentHTML) {
    patch_insertAdjacentHTML(HTMLElementProto, HTMLElementDesc.insertAdjacentHTML.value);
  } else if (ElementDesc.insertAdjacentHTML) {
    patch_insertAdjacentHTML(ElementProto, ElementDesc.insertAdjacentHTML.value);
  } else {
    console.warn('Custom Elements: `Element#insertAdjacentHTML` was not patched.');
  }


  PatchParentNode(internals, ElementProto, {
    prepend: /** @type {PrependType|undefined} */ ((ElementDesc.prepend || {}).value),
    append: /** @type {AppendType|undefined} */ ((ElementDesc.append || {}).value),
  });

  PatchChildNode(internals, ElementProto, {
    before: /** @type {BeforeType|undefined} */ ((ElementDesc.before || {}).value),
    after: /** @type {AfterType|undefined} */ ((ElementDesc.after || {}).value),
    replaceWith: /** @type {ReplaceWithType|undefined} */ ((ElementDesc.replaceWith || {}).value),
    remove: /** @type {RemoveType|undefined} */ ((ElementDesc.remove || {}).value),
  });
};
