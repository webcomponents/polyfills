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

/** @type {function(new: MutationObserver, function(...?): ?)} */
export const constructor = window['MutationObserver'];
export const proto = constructor['prototype'];

export const descriptors = {
  disconnect: getDescriptor(proto, 'disconnect'),
  observe: getDescriptor(proto, 'observe'),
};

/** @type {function(this: MutationObserver)} */
const disconnectMethod = method(descriptors.disconnect);
/** @type {function(this: MutationObserver, !Node, !MutationObserverInit=)} */
const observeMethod = method(descriptors.observe);

export const proxy = {
  /** @type {function(!MutationObserver)} */
  disconnect: mutationObserver => disconnectMethod.call(mutationObserver),
  /** @type {function(!MutationObserver, !Node, !MutationObserverInit=)} */
  observe: (mutationObserver, target, options) => observeMethod.call(mutationObserver, target, options),
};
