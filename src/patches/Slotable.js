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

// TODO(sorvell): why does this force rendering without checking if anything is pending?
export function renderRootNode(element) {
  var root = element[utils.SHADY_PREFIX + 'getRootNode']();
  if (utils.isShadyRoot(root)) {
    root._render(true);
  }
}

export const Slotable = {

  get assignedSlot() {
    renderRootNode(this);
    const nodeData = shadyDataForNode(this);
    return nodeData && nodeData.assignedSlot || null;
  }

};