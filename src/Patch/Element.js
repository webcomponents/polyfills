import BuiltIn from './BuiltIn';
import CustomElementInternals from '../CustomElementInternals';
import * as CustomElementInternalSymbols from '../CustomElementInternalSymbols';
/** @type {CustomElementInternalSymbols.CustomElementState} */
const CustomElementState = CustomElementInternalSymbols.CustomElementState;
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
  Element.prototype['attachShadow'] = function(init) {
    const shadowRoot = BuiltIn.Element_attachShadow.call(this, init);
    this[CustomElementInternalSymbols.shadowRoot] = shadowRoot;
    return shadowRoot;
  };

  Object.defineProperty(Element.prototype, 'innerHTML', {
    enumerable: BuiltIn.Element_innerHTML.enumerable,
    configurable: true,
    get: BuiltIn.Element_innerHTML.get,
    set: function(htmlString) {
      BuiltIn.Element_innerHTML.set.call(this, htmlString);
      internals.upgradeTree(this);
      return htmlString;
    },
  });

  /**
   * @param {string} name
   * @param {string} newValue
   * @suppress {duplicate}
   */
  Element.prototype.setAttribute = function(name, newValue) {
    const oldValue = BuiltIn.Element_getAttribute.call(this, name);
    BuiltIn.Element_setAttribute.call(this, name, newValue);
    newValue = BuiltIn.Element_getAttribute.call(this, name);
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
    const oldValue = BuiltIn.Element_getAttributeNS.call(this, namespace, name);
    BuiltIn.Element_setAttributeNS.call(this, namespace, name, newValue);
    newValue = BuiltIn.Element_getAttributeNS.call(this, namespace, name);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
    }
  };

  /**
   * @param {string} name
   * @suppress {duplicate}
   */
  Element.prototype.removeAttribute = function(name) {
    const oldValue = BuiltIn.Element_getAttribute.call(this, name);
    BuiltIn.Element_removeAttribute.call(this, name);
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
    const oldValue = BuiltIn.Element_getAttributeNS.call(this, namespace, name);
    BuiltIn.Element_removeAttributeNS.call(this, namespace, name);
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
      (BuiltIn.Element_insertAdjacentElement.call(this, where, element));

    if (wasConnected) {
      internals.disconnectTree(element);
    }

    if (Utilities.isConnected(insertedElement)) {
      internals.connectTree(element);
    }
    return insertedElement;
  };

  PatchParentNode(internals, Element.prototype, {
    prepend: BuiltIn.Element_prepend,
    append: BuiltIn.Element_append,
  });

  PatchChildNode(internals, Element.prototype, {
    before: BuiltIn.Element_before,
    after: BuiltIn.Element_after,
    replaceWith: BuiltIn.Element_replaceWith,
    remove: BuiltIn.Element_remove,
  });
};
