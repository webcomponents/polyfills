/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved. This
 * code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be
 * found at http://polymer.github.io/AUTHORS.txt The complete set of
 * contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt Code
 * distributed by Google as part of the polymer project is also subject to an
 * additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {methods as NodeMethods, descriptors as NodeDescriptors} from '../environment/node.js';

// `Object.getOwnPropertyDescriptor(Node.prototype, 'parentNode')` is
// undefined in Chrome 41.
// `Object.getOwnPropertyDescriptor(Node.prototype, 'parentNode').get` is
// undefined in Safari 9.
const parentNodeGetter = NodeDescriptors.parentNode?.get;
export const getParentNode = parentNodeGetter !== undefined
    ? function(this: Node) { return parentNodeGetter.call(this); }
    : function(this: Node) { return this.parentNode; };

export const getRootNode: Node['getRootNode'] = function(
    this: Node, options: GetRootNodeOptions | undefined = undefined) {
  if (NodeMethods.getRootNode !== undefined) {
    return NodeMethods.getRootNode.call(this, options);
  }

  let current = this;
  let parent = getParentNode.call(current);
  while (parent !== null) {
    current = parent;
    parent = getParentNode.call(parent);
  }
  return current;
};
