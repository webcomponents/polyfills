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

export const SlotPatches = utils.getOwnPropertyDescriptors({

  /**
   * @this {HTMLSlotElement}
   * @param {object} options
   */
  assignedNodes(options) {
    if (this.localName === 'slot') {
      // Force any containing shadowRoot to flush so that distribution occurs
      // and this node has assignedNodes.
      const root = this[utils.SHADY_PREFIX + 'getRootNode']();
      if (root && utils.isShadyRoot(root)) {
        root._flush();
      }
      const nodeData = shadyDataForNode(this);
      return nodeData ?
        ((options && options.flatten ? nodeData.flattenedNodes :
          nodeData.assignedNodes) || []) :
        [];
    }
  }

});