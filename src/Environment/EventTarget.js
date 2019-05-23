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

export const constructor = window['EventTarget'];
export const proto = constructor ? constructor['prototype'] : undefined;

export const descriptors = !proto ? {} : {
  addEventListener: getDescriptor(proto, 'addEventListener'),
};

/** @type {function(this: EventTarget, !string, ?Function, AddEventListenerOptions=)} */
const addEventListenerMethod =
  method(descriptors.addEventListener) ||
  // IE11
  method(getDescriptor(window['Node']['prototype'], 'addEventListener'));

export const proxy = {
  /** @type {function(!EventTarget, !string, ?Function, AddEventListenerOptions=)} */
  addEventListener: (node, type, callback, options) =>
      addEventListenerMethod.call(node, type, callback, options),
};
