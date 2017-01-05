import BuiltIn from './BuiltIn';
import {CustomElementInternals} from '../CustomElementInternals';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  Object.defineProperty(Attr.prototype, 'value', {
    enumerable: BuiltIn.Attr_value.enumerable,
    configurable: true,
    get: BuiltIn.Attr_value.get,
    set: /** @this {Attr} */ function() {
      if (!this.ownerElement) {
        BuiltIn.Attr_value.set.apply(this, arguments);
        return;
      }

      const oldValue = BuiltIn.Attr_value.get.call(this);
      BuiltIn.Attr_value.set.apply(this, arguments);
      const newValue = BuiltIn.Attr_value.get.call(this);
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this.ownerElement, this.name, oldValue, newValue, null);
      }
    },
  });

  Object.defineProperty(Attr.prototype, 'nodeValue', {
    enumerable: BuiltIn.Attr_nodeValue.enumerable,
    configurable: true,
    get: BuiltIn.Attr_nodeValue.get,
    set: /** @this {!Attr} */ function(assignedValue) {
      if (!this.ownerElement) {
        BuiltIn.Attr_nodeValue.set.call(this, assignedValue);
        return;
      }

      const oldValue = BuiltIn.Attr_nodeValue.get.call(this);
      BuiltIn.Attr_nodeValue.set.call(this, assignedValue);
      const newValue = BuiltIn.Attr_nodeValue.get.call(this);

      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this.ownerElement, this.name, oldValue, newValue, null);
      }
    },
  });

  Object.defineProperty(Attr.prototype, 'textContent', {
    enumerable: BuiltIn.Attr_textContent.enumerable,
    configurable: true,
    get: BuiltIn.Attr_textContent.get,
    set: /** @this {!Attr} */ function(assignedValue) {
      if (!this.ownerElement) {
        BuiltIn.Attr_textContent.set.call(this, assignedValue);
        return;
      }

      const oldValue = BuiltIn.Attr_textContent.get.call(this);
      BuiltIn.Attr_textContent.set.call(this, assignedValue);
      const newValue = BuiltIn.Attr_textContent.get.call(this);

      if (oldValue !== newValue) {
        internals.attributeChangedCallback(this.ownerElement, this.name, oldValue, newValue, null);
      }
    },
  });
};
