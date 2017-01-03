import BuiltIn from './BuiltIn';
import {CustomElementInternals} from '../CustomElementInternals';
import * as CustomElementInternalSymbols from '../CustomElementInternalSymbols';

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
};
