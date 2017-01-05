import BuiltIn from './BuiltIn';
import CustomElementInternals from '../CustomElementInternals';
import * as CustomElementInternalSymbols from '../CustomElementInternalSymbols';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  /**
   * This function only exists to suppress Closure's warnings about applying the
   * `[]` operator to a DOMTokenList, which is assumed to always accept a number
   * and always return a string.
   *
   * @param {DOMTokenList} domTokenList
   * @return {!Element|undefined}
   * @suppress {checkTypes}
   */
  function getAssociatedElement(domTokenList) {
    return /** @type {!Element|undefined} */ (domTokenList[CustomElementInternalSymbols.associatedElement]);
  }

  /**
   * @param {...string} tokens
   * @suppress {duplicate}
   */
  DOMTokenList.prototype.add = function(...tokens) {
    const element = getAssociatedElement(this);
    if (!element) {
      return BuiltIn.DOMTokenList_add.apply(this, arguments);
    }

    const oldValue = BuiltIn.Element_getAttribute.call(element, 'class');
    BuiltIn.DOMTokenList_add.apply(this, arguments);
    const newValue = BuiltIn.Element_getAttribute.call(element, 'class');
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(element, 'class', oldValue, newValue, null);
    }
  };

  /**
   * @param {...string} tokens
   * @suppress {duplicate}
   */
  DOMTokenList.prototype.remove = function(...tokens) {
    const element = getAssociatedElement(this);
    if (!element) {
      return BuiltIn.DOMTokenList_remove.apply(this, arguments);
    }

    const oldValue = BuiltIn.Element_getAttribute.call(element, 'class');
    BuiltIn.DOMTokenList_remove.apply(this, arguments);
    const newValue = BuiltIn.Element_getAttribute.call(element, 'class');
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(element, 'class', oldValue, newValue, null);
    }
  };

  /**
   * @param {string} token
   * @param {boolean=} force
   * @suppress {duplicate}
   */
  DOMTokenList.prototype.toggle = function(token, force) {
    const element = getAssociatedElement(this);
    if (!element) {
      return BuiltIn.DOMTokenList_toggle.call(this, token, force);
    }

    const oldValue = BuiltIn.Element_getAttribute.call(element, 'class');
    BuiltIn.DOMTokenList_toggle.call(this, token, force);
    const newValue = BuiltIn.Element_getAttribute.call(element, 'class');
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(element, 'class', oldValue, newValue, null);
    }
  };

  /**
   * @param {string} token
   * @param {string} newToken
   * @suppress {duplicate}
   */
  DOMTokenList.prototype.replace = function(token, newToken) {
    const element = getAssociatedElement(this);
    if (!element) {
      return BuiltIn.DOMTokenList_replace.call(this, token, newToken);
    }

    const oldValue = BuiltIn.Element_getAttribute.call(element, 'class');
    BuiltIn.DOMTokenList_replace.call(this, token, newToken);
    const newValue = BuiltIn.Element_getAttribute.call(element, 'class');
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(element, 'class', oldValue, newValue, null);
    }
  };

  Object.defineProperty(DOMTokenList.prototype, 'value', {
    enumerable: BuiltIn.DOMTokenList_value.enumerable,
    configurable: true,
    get: BuiltIn.DOMTokenList_value.get,
    set: /** @this {DOMTokenList} */ function() {
      const element = getAssociatedElement(this);
      if (!element) {
        BuiltIn.DOMTokenList_value.set.apply(this, arguments);
        return;
      }

      const oldValue = BuiltIn.Element_getAttribute.call(element, 'class');
      BuiltIn.DOMTokenList_value.set.apply(this, arguments);
      const newValue = BuiltIn.Element_getAttribute.call(element, 'class');
      if (oldValue !== newValue) {
        internals.attributeChangedCallback(element, 'class', oldValue, newValue, null);
      }
    },
  });
};
