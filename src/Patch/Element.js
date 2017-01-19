import Native from './Native';
import CustomElementInternals from '../CustomElementInternals';
import * as Utilities from '../Utilities';

import PatchParentNode from './Interface/ParentNode';
import PatchChildNode from './Interface/ChildNode';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  if (Native.Element_attachShadow) {
    Utilities.setPropertyUnchecked(Element.prototype, 'attachShadow',
      /**
       * @this {Element}
       * @param {!{mode: string}} init
       * @return {ShadowRoot}
       */
      function(init) {
        const shadowRoot = Native.Element_attachShadow.call(this, init);
        this.__CE_shadowRoot = shadowRoot;
        return shadowRoot;
      });
  } else {
    console.warn('Custom Elements: `Element#attachShadow` was not patched.');
  }

  // TODO: Patch instances in browsers without an `Element#innerHTML` descriptor (Early Chrome, IE).
  if (Native.Element_innerHTML) {
    Object.defineProperty(Element.prototype, 'innerHTML', {
      enumerable: Native.Element_innerHTML.enumerable,
      configurable: true,
      get: Native.Element_innerHTML.get,
      set: function(htmlString) {
        Native.Element_innerHTML.set.call(this, htmlString);
        internals.patchTree(this);
        internals.upgradeTree(this);
        return htmlString;
      },
    });
  } else {
    console.warn('Custom Elements: `Element#innerHTML` was not patched.');
  }

  Utilities.setPropertyUnchecked(Element.prototype, 'setAttribute',
    /**
     * @this {Element}
     * @param {string} name
     * @param {string} newValue
     */
    function(name, newValue) {
      const oldValue = Native.Element_getAttribute.call(this, name);
      Native.Element_setAttribute.call(this, name, newValue);
      newValue = Native.Element_getAttribute.call(this, name);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, name, oldValue, newValue, null);
      }
    });

  Utilities.setPropertyUnchecked(Element.prototype, 'setAttributeNS',
    /**
     * @this {Element}
     * @param {?string} namespace
     * @param {string} name
     * @param {string} newValue
     */
    function(namespace, name, newValue) {
      const oldValue = Native.Element_getAttributeNS.call(this, namespace, name);
      Native.Element_setAttributeNS.call(this, namespace, name, newValue);
      newValue = Native.Element_getAttributeNS.call(this, namespace, name);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
      }
    });

  Utilities.setPropertyUnchecked(Element.prototype, 'removeAttribute',
    /**
     * @this {Element}
     * @param {string} name
     */
    function(name) {
      const oldValue = Native.Element_getAttribute.call(this, name);
      Native.Element_removeAttribute.call(this, name);
      if (oldValue !== null) {
        internals.attributeChangedCallback(this, name, oldValue, null, null);
      }
    });

  Utilities.setPropertyUnchecked(Element.prototype, 'remoteAttributeNS',
    /**
     * @this {Element}
     * @param {?string} namespace
     * @param {string} name
     */
    function(namespace, name) {
      const oldValue = Native.Element_getAttributeNS.call(this, namespace, name);
      Native.Element_removeAttributeNS.call(this, namespace, name);
      if (oldValue !== null) {
        internals.attributeChangedCallback(this, name, oldValue, null, namespace);
      }
    });

  Utilities.setPropertyUnchecked(Element.prototype, 'insertAdjacentElement',
    /**
     * @this {Element}
     * @param {string} where
     * @param {!Element} element
     * @return {?Element}
     */
    function(where, element) {
      const wasConnected = Utilities.isConnected(element);
      const insertedElement = /** @type {!Element} */
        (Native.Element_insertAdjacentElement.call(this, where, element));

      if (wasConnected) {
        internals.disconnectTree(element);
      }

      if (Utilities.isConnected(insertedElement)) {
        internals.connectTree(element);
      }
      return insertedElement;
    });

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
