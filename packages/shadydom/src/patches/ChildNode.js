/**
@license
Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from '../utils.js';

export const ChildNodePatches = utils.getOwnPropertyDescriptors({
  /** @this {Element} */
  after(...args) {
    const parentNode = this[utils.SHADY_PREFIX + 'parentNode'];
    if (parentNode === null) {
      return;
    }
    const nextSibling = this[utils.SHADY_PREFIX + 'nextSibling'];
    parentNode[utils.SHADY_PREFIX + 'insertBefore'](
      utils.convertNodesIntoANode(...args),
      nextSibling
    );
  },

  /** @this {Element} */
  before(...args) {
    const parentNode = this[utils.SHADY_PREFIX + 'parentNode'];
    if (parentNode === null) {
      return;
    }
    parentNode[utils.SHADY_PREFIX + 'insertBefore'](
      utils.convertNodesIntoANode(...args),
      this
    );
  },

  /** @this {Element} */
  remove() {
    const parentNode = this[utils.SHADY_PREFIX + 'parentNode'];
    if (parentNode === null) {
      return;
    }
    parentNode[utils.SHADY_PREFIX + 'removeChild'](this);
  },

  /** @this {Element} */
  replaceWith(...args) {
    const parentNode = this[utils.SHADY_PREFIX + 'parentNode'];
    if (parentNode === null) {
      return;
    }
    const nextSibling = this[utils.SHADY_PREFIX + 'nextSibling'];
    parentNode[utils.SHADY_PREFIX + 'removeChild'](this);
    parentNode[utils.SHADY_PREFIX + 'insertBefore'](
      utils.convertNodesIntoANode(...args),
      nextSibling
    );
  },
});
