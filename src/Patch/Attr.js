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
};
