/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {NativeHTMLElement} from '../Native/HTMLElement.js';
import {
  getUpgradingInstance,
  setUpgradingInstance,
  globalDefinitionForConstructor,
  definitionForElement,
} from '../sharedState.js';

export const install = () => {
  // User extends this HTMLElement, which returns the CE being upgraded
  window.HTMLElement = function HTMLElement() {
    // Upgrading case: the StandInElement constructor was run by the browser's
    // native custom elements and we're in the process of running the
    // "constructor-call trick" on the natively constructed instance, so just
    // return that here
    let instance = getUpgradingInstance();
    if (instance) {
      setUpgradingInstance(undefined);
      return instance;
    }
    // Construction case: we need to construct the StandInElement and return
    // it; note the current spec proposal only allows new'ing the constructor
    // of elements registered with the global registry
    const definition = globalDefinitionForConstructor.get(this.constructor);
    if (!definition) {
      throw new TypeError(
        'Illegal constructor (custom element class must be registered with global customElements registry to be newable)'
      );
    }
    instance = Reflect.construct(
      NativeHTMLElement,
      [],
      definition.standInClass
    );
    Object.setPrototypeOf(instance, this.constructor.prototype);
    definitionForElement.set(instance, definition);
    return instance;
  };
  window.HTMLElement.prototype = NativeHTMLElement.prototype;
};
