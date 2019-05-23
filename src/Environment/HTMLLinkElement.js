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

export const constructor = window['HTMLLinkElement'];
export const proto = constructor ? constructor['prototype'] : undefined;

export const descriptors = {
  import: getDescriptor(proto, 'import'),
};

/** @type {function(this: HTMLLinkElement): ?Document} */
const importGetter = getter(descriptors.import, function() { return this.import; });

export const proxy = {
  /** @type {function(!HTMLLinkElement): ?Document} */
  import: node => importGetter.call(node),
};
