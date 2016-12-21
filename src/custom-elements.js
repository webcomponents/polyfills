/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import CustomElementDefinition from './CustomElementDefinition';
import CustomElementInternals from './CustomElementInternals';
import CustomElementRegistry from './CustomElementRegistry';

if (!window['customElements'] || window['customElements']['forcePolyfill']) {
  /** @type {!CustomElementInternals} */
  const internals = new CustomElementInternals();

  /** @type {!CustomElementRegistry} */
  const customElements = new CustomElementRegistry(internals);

  window['HTMLElement'] = (function(native_HTMLElement) {
    /**
     * @type {function(new: HTMLElement): !HTMLElement}
     */
    function HTMLElement() {
      const localName = internals.constructorToLocalName(this.constructor);
      if (!localName) {
        throw new Error('This element\'s constructor is not a known custom element constructor.');
      }
      const self = document.createElement(/** @type {string} */ (localName));

      // TODO(bicknellr): Upgrade element.

      return self;
    }

    HTMLElement.prototype = native_HTMLElement.prototype;

    return HTMLElement;
  })(window['HTMLElement']);

  Object.defineProperty(window, 'customElements', {
    configurable: true,
    enumerable: true,
    value: customElements,
  });
}
