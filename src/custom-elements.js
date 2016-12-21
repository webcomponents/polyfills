/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {
  AlreadyConstructedMarker,
  CustomElementDefinition,
} from './CustomElementDefinition';
import {
  CustomElementInternals,
  CustomElementState,
  elementStateFlag,
} from './CustomElementInternals';
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
      /** @type {!Function} */
      const constructor = this.constructor;

      const definition = internals.constructorToDefinition(constructor);
      if (!definition) {
        throw new Error('The custom element being constructed was not registered with `customElements`.');
      }

      const constructionStack = definition.constructionStack;

      if (constructionStack.length === 0) {
        const self = document.createElement(definition.localName);
        Object.setPrototypeOf(self, constructor.prototype);
        self[elementStateFlag] = CustomElementState.custom;
        return self;
      }

      const lastIndex = constructionStack.length - 1;
      const element = constructionStack[lastIndex];
      if (element === AlreadyConstructedMarker) {
        throw new Error('The HTMLElement constructor was either called reentrantly for this constructor or called multiple times.');
      }
      constructionStack[lastIndex] = AlreadyConstructedMarker;

      Object.setPrototypeOf(element, constructor.prototype);

      return element;
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
