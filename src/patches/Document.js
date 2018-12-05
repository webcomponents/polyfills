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

const doc = window.document;

export const DocumentPatches = utils.getOwnPropertyDescriptors({

  // note: Though not technically correct, we fast path `importNode`
  // when called on a node not owned by the main document.
  // This allows, for example, elements that cannot
  // contain custom elements and are therefore not likely to contain shadowRoots
  // to cloned natively. This is a fairly significant performance win.
  /**
   * @this {Document}
   * @param {Node} node
   * @param {boolean} deep
   */
  importNode(node, deep) {
    // A template element normally has no children with shadowRoots, so make
    // sure we always make a deep copy to correctly construct the template.content
    if (node.ownerDocument !== doc || node.localName === 'template') {
      return this[utils.NATIVE_PREFIX + 'importNode'](node, deep);
    }
    let n = this[utils.NATIVE_PREFIX + 'importNode'](node, false);
    if (deep) {
      let c$ = node[utils.SHADY_PREFIX + 'childNodes'];
      for (let i=0, nc; i < c$.length; i++) {
        nc = this[utils.SHADY_PREFIX + 'importNode'](c$[i], true);
        n[utils.SHADY_PREFIX + 'appendChild'](nc);
      }
    }
    return n;
  }

});