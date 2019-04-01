/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from '../utils.js';
import {shadyDataForNode} from '../shady-data.js';
import {addEventListener, removeEventListener} from '../patch-events.js';

export const SlotPatches = utils.getOwnPropertyDescriptors({

  /**
   * @this {HTMLSlotElement}
   * @param {Object=} options
   */
  assignedNodes(options) {
    if (this.localName === 'slot') {
      // Force any containing shadowRoot to flush so that distribution occurs
      // and this node has assignedNodes.
      const root = this[utils.SHADY_PREFIX + 'getRootNode']();
      if (root && utils.isShadyRoot(root)) {
        root._render();
      }
      const nodeData = shadyDataForNode(this);
      return nodeData ?
        ((options && options.flatten ? nodeData.flattenedNodes :
          nodeData.assignedNodes) || []) :
        [];
    }
  },

  /**
   * @this {HTMLSlotElement}
   * @param {string} type
   * @param {Function} fn
   * @param {Object|boolean=} optionsOrCapture
   */
  addEventListener(type, fn, optionsOrCapture) {
    // NOTE, check if this is a `slot` because these patches are installed on
    // Element where browsers don't have `<slot>`
    if (this.localName !== 'slot' || type === 'slotchange') {
      addEventListener.call(this, type, fn, optionsOrCapture);
    } else {
      if (typeof optionsOrCapture !== 'object') {
        optionsOrCapture = {
          capture: Boolean(optionsOrCapture)
        }
      }
      const parent = this[utils.SHADY_PREFIX + 'parentNode'];
      if (!parent) {
        throw new Error('ShadyDOM cannot attach event to slot unless it has a `parentNode`');
      }
      optionsOrCapture.__shadyTarget = this;
      parent[utils.SHADY_PREFIX + 'addEventListener'](type, fn, optionsOrCapture);
    }
  },

  /**
   * @this {HTMLSlotElement}
   * @param {string} type
   * @param {Function} fn
   * @param {Object|boolean=} optionsOrCapture
   */
  removeEventListener(type, fn, optionsOrCapture) {
    // NOTE, check if this is a `slot` because these patches are installed on
    // Element where browsers don't have `<slot>`
    if (this.localName !== 'slot' || type === 'slotchange') {
      removeEventListener.call(this, type, fn, optionsOrCapture);
    } else {
      if (typeof optionsOrCapture !== 'object') {
        optionsOrCapture = {
          capture: Boolean(optionsOrCapture)
        }
      }
      const parent = this[utils.SHADY_PREFIX + 'parentNode'];
      if (!parent) {
        throw new Error('ShadyDOM cannot attach event to slot unless it has a `parentNode`');
      }
      optionsOrCapture.__shadyTarget = this;
      parent[utils.SHADY_PREFIX + 'removeEventListener'](type, fn, optionsOrCapture);
    }
  }

});
