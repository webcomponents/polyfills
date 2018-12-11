/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from './utils.js';
import {ensureShadyDataForNode} from './shady-data.js';

export const InsideDescriptors = utils.getOwnPropertyDescriptors({

  /** @this {Node} */
  get childNodes() {
    return this[utils.SHADY_PREFIX + 'childNodes'];
  },

  /** @this {Node} */
  get firstChild() {
    return this[utils.SHADY_PREFIX + 'firstChild'];
  },

  /** @this {Node} */
  get lastChild() {
    return this[utils.SHADY_PREFIX + 'lastChild'];
  },

  /** @this {Node} */
  get textContent() {
    return this[utils.SHADY_PREFIX + 'textContent'];
  },

  /** @this {Node} */
  set textContent(value) {
    this[utils.SHADY_PREFIX + 'textContent'] = value;
  },

  /** @this {Node} */
  get childElementCount() {
    return this[utils.SHADY_PREFIX + 'childElementCount'];
  },

  /** @this {Node} */
  get children() {
    return this[utils.SHADY_PREFIX + 'children'];
  },

  /** @this {Node} */
  get firstElementChild() {
    return this[utils.SHADY_PREFIX + 'firstElementChild'];
  },

  /** @this {Node} */
  get lastElementChild() {
    return this[utils.SHADY_PREFIX + 'lastElementChild'];
  },

  /** @this {Node} */
  get innerHTML() {
    return this[utils.SHADY_PREFIX + 'innerHTML'];
  },

  /** @this {Node} */
  set innerHTML(value) {
    return this[utils.SHADY_PREFIX + 'innerHTML'] = value;
  },

  /** @this {Node} */
  get shadowRoot() {
    return this[utils.SHADY_PREFIX + 'shadowRoot'];
  }

});

export const OutsideDescriptors = utils.getOwnPropertyDescriptors({

  /** @this {Node} */
  get parentElement() {
    return this[utils.SHADY_PREFIX + 'parentElement'];
  },

  /** @this {Node} */
  get parentNode() {
    return this[utils.SHADY_PREFIX + 'parentNode'];
  },

  /** @this {Node} */
  get nextSibling() {
    return this[utils.SHADY_PREFIX + 'nextSibling'];
  },

  /** @this {Node} */
  get previousSibling() {
    return this[utils.SHADY_PREFIX + 'previousSibling'];
  },

  /** @this {Node} */
  get nextElementSibling() {
    return this[utils.SHADY_PREFIX + 'nextElementSibling'];
  },

  /** @this {Node} */
  get previousElementSibling() {
    return this[utils.SHADY_PREFIX + 'previousElementSibling'];
  },

  /** @this {Node} */
  get className() {
    return this[utils.SHADY_PREFIX + 'className'];
  },

  /** @this {Node} */
  set className(value) {
    return this[utils.SHADY_PREFIX + 'className'] = value;
  }

});

for (let prop in InsideDescriptors) {
  InsideDescriptors[prop].enumerable = false;
}

for (let prop in OutsideDescriptors) {
  OutsideDescriptors[prop].enumerable = false;
}

const noInstancePatching = utils.settings.hasDescriptors || utils.settings.noPatch;

// ensure an element has patched "outside" accessors; no-op when not needed
export let patchOutsideElementAccessors = noInstancePatching ?
  function() {} : function(element) {
    const sd = ensureShadyDataForNode(element);
    if (!sd.__outsideAccessors) {
      sd.__outsideAccessors = true;
      utils.patchProperties(element, OutsideDescriptors);
    }
  }

// ensure an element has patched "inside" accessors; no-op when not needed
export let patchInsideElementAccessors = noInstancePatching ?
  function() {} : function(element) {
    const sd = ensureShadyDataForNode(element);
    if (!sd.__insideAccessors) {
      sd.__insideAccessors = true;
      utils.patchProperties(element, InsideDescriptors);
    }
  }