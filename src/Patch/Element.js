import * as Env from '../Environment.js';
import * as EnvProxy from '../EnvironmentProxy.js';
import CustomElementInternals from '../CustomElementInternals.js';
import CEState from '../CustomElementState.js';
import * as Utilities from '../Utilities.js';

import PatchParentNode from './Interface/ParentNode.js';
import PatchChildNode from './Interface/ChildNode.js';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  if (Env.Element.attachShadow) {
    Utilities.setPropertyUnchecked(Element.prototype, 'attachShadow',
      /**
       * @this {Element}
       * @param {!{mode: string}} init
       * @return {ShadowRoot}
       */
      function(init) {
        const shadowRoot = Env.ElementProxy.attachShadow(this, init);
        this.__CE_shadowRoot = shadowRoot;
        return shadowRoot;
      });
  } else {
    console.warn('Custom Elements: `Element#attachShadow` was not patched.');
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
        if (!this.ownerDocument.__CE_hasRegistry) {
          internals.patchTree(this);
        } else {
          internals.patchAndUpgradeTree(this);
        }
        return htmlString;
      },
    });
  }

  if (Env.Element.innerHTML && Env.Element.innerHTML.get) {
    patch_innerHTML(Element.prototype, Env.Element.innerHTML);
  } else if (Env.HTMLElement.innerHTML && Env.HTMLElement.innerHTML.get) {
    patch_innerHTML(HTMLElement.prototype, Env.HTMLElement.innerHTML);
  } else {
    // In this case, `innerHTML` has no exposed getter but still exists. Rather
    // than using the environment proxy, we have to get and set it directly.

    /** @type {HTMLDivElement} */
    const rawDiv = Env.DocumentProxy.createElement(document, 'div');

    internals.addPatch(function(element) {
      patch_innerHTML(element, {
        enumerable: true,
        configurable: true,
        // Implements getting `innerHTML` by performing an unpatched `cloneNode`
        // of the element and returning the resulting element's `innerHTML`.
        // TODO: Is this too expensive?
        get: /** @this {Element} */ function() {
          return EnvProxy.cloneNode(this, true).innerHTML;
        },
        // Implements setting `innerHTML` by creating an unpatched element,
        // setting `innerHTML` of that element and replacing the target
        // element's children with those of the unpatched element.
        set: /** @this {Element} */ function(assignedValue) {
          // NOTE: re-route to `content` for `template` elements.
          // We need to do this because `template.appendChild` does not
          // route into `template.content`.
          /** @type {!Node} */
          const content =
            (Env.ElementProxy.localName(this) === 'template')
            ? EnvProxy.content(/** @type {!HTMLTemplateElement} */ (this))
            : this;
          rawDiv.innerHTML = assignedValue;

          while (EnvProxy.childNodes(content).length > 0) {
            EnvProxy.removeChild(content, content.childNodes[0]);
          }
          while (EnvProxy.childNodes(rawDiv).length > 0) {
            EnvProxy.appendChild(content, rawDiv.childNodes[0]);
          }
        },
      });
    });
  }


  Utilities.setPropertyUnchecked(Element.prototype, 'setAttribute',
    /**
     * @this {Element}
     * @param {string} name
     * @param {string} newValue
     */
    function(name, newValue) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return Env.ElementProxy.setAttribute(this, name, newValue);
      }

      const oldValue = Env.ElementProxy.getAttribute(this, name);
      Env.ElementProxy.setAttribute(this, name, newValue);
      newValue = Env.ElementProxy.getAttribute(this, name);
      internals.attributeChangedCallback(this, name, oldValue, newValue, null);
    });

  Utilities.setPropertyUnchecked(Element.prototype, 'setAttributeNS',
    /**
     * @this {Element}
     * @param {?string} namespace
     * @param {string} name
     * @param {string} newValue
     */
    function(namespace, name, newValue) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return Env.ElementProxy.setAttributeNS(this, namespace, name, newValue);
      }

      const oldValue = Env.ElementProxy.getAttributeNS(this, namespace, name);
      Env.ElementProxy.setAttributeNS(this, namespace, name, newValue);
      newValue = Env.ElementProxy.getAttributeNS(this, namespace, name);
      internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
    });

  Utilities.setPropertyUnchecked(Element.prototype, 'removeAttribute',
    /**
     * @this {Element}
     * @param {string} name
     */
    function(name) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return Env.ElementProxy.removeAttribute(this, name);
      }

      const oldValue = Env.ElementProxy.getAttribute(this, name);
      Env.ElementProxy.removeAttribute(this, name);
      if (oldValue !== null) {
        internals.attributeChangedCallback(this, name, oldValue, null, null);
      }
    });

  Utilities.setPropertyUnchecked(Element.prototype, 'removeAttributeNS',
    /**
     * @this {Element}
     * @param {?string} namespace
     * @param {string} name
     */
    function(namespace, name) {
      // Fast path for non-custom elements.
      if (this.__CE_state !== CEState.custom) {
        return Env.ElementProxy.removeAttributeNS(this, namespace, name);
      }

      const oldValue = Env.ElementProxy.getAttributeNS(this, namespace, name);
      Env.ElementProxy.removeAttributeNS(this, namespace, name);
      // In older browsers, `Element#getAttributeNS` may return the empty string
      // instead of null if the attribute does not exist. For details, see;
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttributeNS#Notes
      const newValue = Env.ElementProxy.getAttributeNS(this, namespace, name);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
      }
    });


  function patch_insertAdjacentElement(destination, baseMethod) {
    Utilities.setPropertyUnchecked(destination, 'insertAdjacentElement',
      /**
       * @this {Element}
       * @param {string} where
       * @param {!Element} element
       * @return {?Element}
       */
      function(where, element) {
        const wasConnected = Utilities.isConnected(element);
        const insertedElement = /** @type {!Element} */
          (baseMethod.call(this, where, element));

        if (wasConnected) {
          internals.disconnectTree(element);
        }

        if (Utilities.isConnected(insertedElement)) {
          internals.connectTree(element);
        }
        return insertedElement;
      });
  }

  if (Env.HTMLElement.insertAdjacentElement && Env.HTMLElement.insertAdjacentElement.value) {
    patch_insertAdjacentElement(HTMLElement.prototype, Env.HTMLElement.insertAdjacentElement.value);
  } else if (Env.Element.insertAdjacentElement && Env.Element.insertAdjacentElement.value) {
    patch_insertAdjacentElement(Element.prototype, Env.Element.insertAdjacentElement.value);
  } else {
    console.warn('Custom Elements: `Element#insertAdjacentElement` was not patched.');
  }


  PatchParentNode(internals, Element.prototype, {
    prepend: (Env.Element.prepend || {}).value,
    append: (Env.Element.append || {}).value,
  });

  PatchChildNode(internals, Element.prototype, {
    before: (Env.Element.before || {}).value,
    after: (Env.Element.after || {}).value,
    replaceWith: (Env.Element.replaceWith || {}).value,
    remove: (Env.Element.remove || {}).value,
  });
};
