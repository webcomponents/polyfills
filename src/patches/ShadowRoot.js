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
import {treeVisitor} from '../style-scoping.js';
import {recordChildNodes} from '../link-nodes.js';

export const ShadowRootPatches = utils.getOwnPropertyDescriptors({

  /**
   * @this {ShadowRoot}
   * @param {string} type
   * @param {Function} fn
   * @param {Object|boolean=} optionsOrCapture
   */
  addEventListener(type, fn, optionsOrCapture) {
    if (typeof optionsOrCapture !== 'object') {
      optionsOrCapture = {
        capture: Boolean(optionsOrCapture)
      }
    }
    optionsOrCapture.__shadyTarget = this;
    this.host[utils.SHADY_PREFIX + 'addEventListener'](type, fn, optionsOrCapture);
  },

  /**
   * @this {ShadowRoot}
   * @param {string} type
   * @param {Function} fn
   * @param {Object|boolean=} optionsOrCapture
   */
  removeEventListener(type, fn, optionsOrCapture) {
    if (typeof optionsOrCapture !== 'object') {
      optionsOrCapture = {
        capture: Boolean(optionsOrCapture)
      }
    }
    optionsOrCapture.__shadyTarget = this;
    this.host[utils.SHADY_PREFIX + 'removeEventListener'](type, fn, optionsOrCapture);
  },

  // Optimized initial insertion for pre-scoped node.
  ['_attachDom'](node) {
    /** @type {!Array<!HTMLSlotElement>} */
    let slotsAdded;
    /** @type {string} */
    // const newScopeName = ownerRoot ? ownerRoot.host.localName : currentScopeForNode(this);
    // /** @type {string} */
    // let oldScopeName;
    // remove from existing location
    // add to new parent
    let allowNativeInsert = true;
    const needsSlotFinding = !node['__noInsertionPoint'];
    if (needsSlotFinding) {
      treeVisitor(node, (node) => {
        if (node.localName === 'slot') {
          if (!slotsAdded) {
            slotsAdded = [];
          }
          slotsAdded.push(/** @type {!HTMLSlotElement} */(node));
        }
      });
    }
    // if a slot is added, must render containing root.
    if (slotsAdded) {
      this._addSlots(slotsAdded);
      this._asyncRender();
    }
    recordChildNodes(node, this);
    if (this._hasInsertionPoint()) {
        this._asyncRender();
        allowNativeInsert = false;
    }
    if (allowNativeInsert) {
      /** @type {ShadowRoot} */(this).host[utils.NATIVE_PREFIX + 'appendChild'](node);
    }
    return node;
  },

});
