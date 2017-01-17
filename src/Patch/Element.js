import Native from './Native';
import CustomElementInternals from '../CustomElementInternals';
import * as CESymbols from '../CustomElementInternalSymbols';
import * as Utilities from '../Utilities';

import PatchParentNode from './Interface/ParentNode';
import PatchChildNode from './Interface/ChildNode';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  /**
   * @param {!{mode: string}} init
   * @return {ShadowRoot}
   */
  if (Native.Element_attachShadow) {
    Element.prototype['attachShadow'] = function(init) {
      const shadowRoot = Native.Element_attachShadow.call(this, init);
      this[CESymbols.shadowRoot] = shadowRoot;
      return shadowRoot;
    };
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
        internals.upgradeTree(this);
        return htmlString;
      },
    });
  } else {
    console.warn('Custom Elements: `Element#innerHTML` was not patched.');
  }

  /**
   * @param {string} name
   * @param {string} newValue
   * @suppress {duplicate}
   */
  Element.prototype.setAttribute = function(name, newValue) {
    const oldValue = Native.Element_getAttribute.call(this, name);
    Native.Element_setAttribute.call(this, name, newValue);
    newValue = Native.Element_getAttribute.call(this, name);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(this, name, oldValue, newValue, null);
    }
  };

  /**
   * @param {?string} namespace
   * @param {string} name
   * @param {string} newValue
   * @suppress {duplicate}
   */
  Element.prototype.setAttributeNS = function(namespace, name, newValue) {
    const oldValue = Native.Element_getAttributeNS.call(this, namespace, name);
    Native.Element_setAttributeNS.call(this, namespace, name, newValue);
    newValue = Native.Element_getAttributeNS.call(this, namespace, name);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
    }
  };

  /**
   * @param {string} name
   * @suppress {duplicate}
   */
  Element.prototype.removeAttribute = function(name) {
    const oldValue = Native.Element_getAttribute.call(this, name);
    Native.Element_removeAttribute.call(this, name);
    if (oldValue !== null) {
      internals.attributeChangedCallback(this, name, oldValue, null, null);
    }
  };

  /**
   * @param {?string} namespace
   * @param {string} name
   * @suppress {duplicate}
   */
  Element.prototype.removeAttributeNS = function(namespace, name) {
    const oldValue = Native.Element_getAttributeNS.call(this, namespace, name);
    Native.Element_removeAttributeNS.call(this, namespace, name);
    if (oldValue !== null) {
      internals.attributeChangedCallback(this, name, oldValue, null, namespace);
    }
  };

  /**
   * @param {string} where
   * @param {!Element} element
   * @return {?Element}
   */
  Element.prototype['insertAdjacentElement'] = function(where, element) {
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
  };

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
