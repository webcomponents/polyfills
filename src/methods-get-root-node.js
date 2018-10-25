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
import * as nativeMethods from './native-methods.js';
import {ensureShadyDataForNode} from './shady-data.js';
import {ElementAccessors as accessors} from './accessors.js';

/**
 * @param {Node} node
 * @param {Object=} options
 */
export function getRootNode(node, options) { // eslint-disable-line no-unused-vars
  if (!node || !node.nodeType) {
    return;
  }
  const nodeData = ensureShadyDataForNode(node);
  let root = nodeData.ownerShadyRoot;
  if (root === undefined) {
    if (utils.isShadyRoot(node)) {
      root = node;
      nodeData.ownerShadyRoot = root;
    } else {
      let parent = accessors.parentNode.get.call(node);
      root = parent ? getRootNode(parent) : node;
      // memo-ize result for performance but only memo-ize
      // result if node is in the document. This avoids a problem where a root
      // can be cached while an element is inside a fragment.
      // If this happens and we cache the result, the value can become stale
      // because for perf we avoid processing the subtree of added fragments.
      if (nativeMethods.contains.call(document.documentElement, node)) {
        nodeData.ownerShadyRoot = root;
      }
    }

  }
  return root;
}