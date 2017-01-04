import BuiltIn from './BuiltIn';
import {CustomElementInternals} from '../CustomElementInternals';
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

  Object.defineProperty(Element.prototype, 'attributes', {
    enumerable: BuiltIn.Element_attributes.enumerable,
    configurable: true,
    get: function() {
      const attributes = BuiltIn.Element_attributes.get.call(this);
      if (!attributes[CustomElementInternalSymbols.associatedElement]) {
        attributes[CustomElementInternalSymbols.associatedElement] = this;
      }
      return attributes;
    },
    set: BuiltIn.Element_attributes.set,
  });

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

  Object.defineProperty(Element.prototype, 'id', {
    enumerable: BuiltIn.Element_id.enumerable,
    configurable: true,
    get: BuiltIn.Element_id.get,
    set: function(newValue) {
      const oldValue = BuiltIn.Element_id.get.call(this);
      BuiltIn.Element_id.set.call(this, newValue);
      newValue = BuiltIn.Element_id.get.call(this);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, 'id', oldValue, newValue, null);
      }
    },
  });

  Object.defineProperty(Element.prototype, 'classList', {
    enumerable: BuiltIn.Element_classList.enumerable,
    configurable: true,
    get: function() {
      const classList = BuiltIn.Element_classList.get.call(this);
      if (!classList[CustomElementInternalSymbols.associatedElement]) {
        classList[CustomElementInternalSymbols.associatedElement] = this;
      }
      return classList;
    },
    set: BuiltIn.Element_classList.set,
  });

  Object.defineProperty(Element.prototype, 'className', {
    enumerable: BuiltIn.Element_className.enumerable,
    configurable: true,
    get: BuiltIn.Element_className.get,
    set: function(newValue) {
      const oldValue = BuiltIn.Element_className.get.call(this);
      BuiltIn.Element_className.set.call(this, newValue);
      newValue = BuiltIn.Element_className.get.call(this);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, 'class', oldValue, newValue, null);
      }
    },
  });

  Object.defineProperty(Element.prototype, 'slot', {
    enumerable: BuiltIn.Element_slot.enumerable,
    configurable: true,
    get: BuiltIn.Element_slot.get,
    set: function(newValue) {
      const oldValue = BuiltIn.Element_slot.get.call(this);
      BuiltIn.Element_slot.set.call(this, newValue);
      newValue = BuiltIn.Element_slot.get.call(this);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this, 'slot', oldValue, newValue, null);
      }
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
   * @param {!Attr} attr
   * @return {?Attr}
   * @suppress {duplicate}
   */
  Element.prototype.setAttributeNode = function(attr) {
    const attrName = attr.name;
    const oldValue = BuiltIn.Element_getAttribute.call(this, attrName);
    const oldAttr = BuiltIn.Element_setAttributeNode.call(this, attr);
    const newValue = BuiltIn.Element_getAttribute.call(this, attrName);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(this, attrName, oldValue, newValue, null);
    }
    return oldAttr;
  };

  /**
   * @param {!Attr} attr
   * @return {?Attr}
   * @suppress {duplicate}
   */
  Element.prototype.setAttributeNodeNS = function(attr) {
    const attrNS = attr.namespaceURI;
    const attrName = attr.name;
    const oldValue = BuiltIn.Element_getAttributeNS.call(this, attrNS, attrName);
    const oldAttr = BuiltIn.Element_setAttributeNodeNS.call(this, attr);
    const newValue = BuiltIn.Element_getAttributeNS.call(this, attrNS, attrName);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(this, attrName, oldValue, newValue, attrNS);
    }
    return oldAttr;
  };

  /**
   * @param {!Attr} attr
   * @return {!Attr}
   * @suppress {duplicate}
   */
  Element.prototype.removeAttributeNode = function(attr) {
    const attrNS = attr.namespaceURI;
    const attrName = attr.name;
    const oldValue =
      (attrNS === null)
      ? BuiltIn.Element_getAttribute.call(this, attrName)
      : BuiltIn.Element_getAttributeNS.call(this, attrNS, attrName);
    const oldAttr = BuiltIn.Element_removeAttributeNode.call(this, attr);
    if (oldValue !== null) {
      internals.attributeChangedCallback(this, attrName, oldValue, null, attrNS);
    }
    return oldAttr;
  };

  /**
   * @param {string} where
   * @param {!Element} element
   * @return {?Element}
   */
  Element.prototype['insertAdjacentElement'] = function(where, element) {
    const insertedElement = /** @type {!Element} */
      (BuiltIn.Element_insertAdjacentElement.call(this, where, element));

    const connected = Utilities.isConnected(insertedElement);
    if (connected) {
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
