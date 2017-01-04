import BuiltIn from './BuiltIn';
import {CustomElementInternals} from '../CustomElementInternals';
import * as CustomElementInternalSymbols from '../CustomElementInternalSymbols';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  // Note: Setting arbitrary properties of NamedNodeMap and having them
  // reflected to attributes can't be patched without true support for Proxy,
  // which is generally unavailable as of now.

  /**
   * @param {!Attr} attr
   * @return {?Attr}
   * @suppress {duplicate}
   */
  NamedNodeMap.prototype.setNamedItem = function(attr) {
    const element = this[CustomElementInternalSymbols.associatedElement];
    if (!element) {
      return BuiltIn.NamedNodeMap_setNamedItem.call(this, attr);
    }

    const attrName = attr.name;
    const oldValue = BuiltIn.Element_getAttribute.call(element, attrName);
    const oldAttr = BuiltIn.NamedNodeMap_setNamedItem.call(this, attr);
    const newValue = BuiltIn.Element_getAttribute.call(element, attrName);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(element, attrName, oldValue, newValue, null);
    }
    return oldAttr;
  };

  /**
   * @param {!Attr} attr
   * @return {?Attr}
   * @suppress {duplicate}
   */
  NamedNodeMap.prototype['setNamedItemNS'] = function(attr) {
    const element = this[CustomElementInternalSymbols.associatedElement];
    if (!element) {
      return BuiltIn.NamedNodeMap_setNamedItemNS.call(this, attr);
    }

    const attrNS = attr.namespaceURI;
    const attrName = attr.name;
    const oldValue = BuiltIn.Element_getAttributeNS.call(this, attrNS, attrName);
    const oldAttr = BuiltIn.NamedNodeMap_setNamedItemNS.call(this, attr);
    const newValue = BuiltIn.Element_getAttributeNS.call(this, attrNS, attrName);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(element, attrName, oldValue, newValue, attrNS);
    }
    return oldAttr;
  };

  /**
   * @param {string} attrName
   * @return {!Attr}
   * @suppress {duplicate}
   */
  NamedNodeMap.prototype.removeNamedItem = function(attrName) {
    const element = this[CustomElementInternalSymbols.associatedElement];
    if (!element) {
      return BuiltIn.NamedNodeMap_removeNamedItem.call(this, attrName);
    }

    const oldValue = BuiltIn.Element_getAttribute.call(element, attrName);
    const oldAttr = BuiltIn.NamedNodeMap_removeNamedItem.call(this, attrName);
    const newValue = BuiltIn.Element_getAttribute.call(element, attrName);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(element, attrName, oldValue, newValue, null);
    }
    return oldAttr;
  };

  /**
   * @param {string} namespace
   * @param {string} attrName
   * @return {!Attr}
   * @suppress {duplicate}
   */
  NamedNodeMap.prototype['removeNamedItemNS'] = function(namespace, attrName) {
    const element = this[CustomElementInternalSymbols.associatedElement];
    if (!element) {
      return BuiltIn.NamedNodeMap_removeNamedItemNS.call(this, namespace, attrName);
    }

    const oldValue = BuiltIn.Element_getAttributeNS.call(element, namespace, attrName);
    const oldAttr = BuiltIn.NamedNodeMap_removeNamedItemNS.call(this, namespace, attrName);
    const newValue = BuiltIn.Element_getAttributeNS.call(element, namespace, attrName);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(element, attrName, oldValue, newValue, namespace);
    }
    return oldAttr;
  };
};
