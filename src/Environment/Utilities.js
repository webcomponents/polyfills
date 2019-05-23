/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

/**
 * @template T
 * @param {T} o
 * @param {string|symbol} p
 * @return {!ObjectPropertyDescriptor<T>|undefined}
 */
export const getDescriptor = (o, p) => Object.getOwnPropertyDescriptor(o, p);

/**
 * @template THIS
 * @param {!ObjectPropertyDescriptor<THIS>|undefined} descriptor
 * @param {function(this: THIS): ?} fallback
 * @returns {function(this: THIS): ?}
 */
export const getter = (descriptor, fallback) => descriptor && descriptor.get ? descriptor.get : fallback;

/**
 * @param {!ObjectPropertyDescriptor|undefined} descriptor
 * @returns {?}
 */
export const method = descriptor => descriptor && descriptor.value;
