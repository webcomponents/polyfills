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

export const constructor = window['DocumentFragment'];
export const proto = constructor['prototype'];

export const descriptors = {
  append: getDescriptor(proto, 'append'),
  prepend: getDescriptor(proto, 'prepend'),
};

/** @type {function(this: DocumentFragment, ...(!Node|!string))} */
const appendMethod = method(descriptors.append);
/** @type {function(this: DocumentFragment, ...(!Node|!string))} */
const prependMethod = method(descriptors.prepend);

export const proxy = {
  /** @type {function(!DocumentFragment, ...(!Node|!string))} */
  append: (fragment, ...nodes) => appendMethod.call(fragment, ...nodes),
  /** @type {function(!DocumentFragment, ...(!Node|!string))} */
  prepend: (fragment, ...nodes) => prependMethod.call(fragment, ...nodes),
};
