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

export const definitionForElement = new WeakMap();
export const globalDefinitionForConstructor = new WeakMap();
// TBD: This part of the spec proposal is unclear:
// > Another option for looking up registries is to store an element's
// > originating registry with the element. The Chrome DOM team was concerned
// > about the small additional memory overhead on all elements. Looking up the
// > root avoids this.
export const scopeForElement = new WeakMap();

export let creationContext = [document];

let upgradingInstance;
export const getUpgradingInstance = () => upgradingInstance;
export const setUpgradingInstance = (x) => {
  upgradingInstance = x;
};
