/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['HTMLElement'];
export const proto = constructor['prototype'];

export const descriptors = {
  contains: getDescriptor(proto, 'contains'),
  innerHTML: getDescriptor(proto, 'innerHTML'),
  insertAdjacentElement: getDescriptor(proto, 'insertAdjacentElement'),
  insertAdjacentHTML: getDescriptor(proto, 'insertAdjacentHTML'),
};

/** @type {function(this: Node, ?Node): boolean} */
const containsMethod = method(descriptors.contains);

export const proxy = {
  /** @type {function(!Node, ?Node): boolean} */
  contains: (node, other) => containsMethod.call(node, other),
};
