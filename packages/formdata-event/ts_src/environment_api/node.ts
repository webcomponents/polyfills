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
    ? (node: Node) => { return parentNodeGetter.call(node); }
    : (node: Node) => { return node.parentNode; };

export const getRootNode =
    (node: Node, options: GetRootNodeOptions | undefined = undefined) => {
  if (NodeMethods.getRootNode !== undefined) {
    return NodeMethods.getRootNode.call(node, options);
  }

  let current = node;
  let parent = getParentNode(current);
  while (parent !== null) {
    current = parent;
    parent = getParentNode(parent);
  }
  return current;
};

export const removeChild = (node: Node, child: Node): Node => {
  return NodeMethods.removeChild.call(node, child);
};

export const appendChild = (node: Node, child: Node): Node | null => {
  return NodeMethods.appendChild.call(node, child);
};

export const insertBefore =
    (node: Node, newNode: Node, refNode: Node | null): Node | null => {
  return NodeMethods.insertBefore.call(node, newNode, refNode);
};
