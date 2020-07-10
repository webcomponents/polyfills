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

interface Constructor<T> extends Function {
  new (...args: Array<any>): T;
}

/**
 * Modifies a constructible function, `Wrapper`, to act as a wrapper for some
 * other constructor, `Original`. This includes copying the function's own
 * properties and prototype, but with `Wrapper.prototype.constructor` continuing
 * to point to `Wrapper`.
 */
export function wrapConstructor<T extends Object, C extends Constructor<T>>(
  Wrapper: C,
  Original: C,
  prototype: C['prototype'],
) {
  for (const prop of Object.keys(Original)) {
    // `Event.prototype` is not writable or configurable in Safari 9. We
    // overwrite it immediately after, so we might as well not copy it.
    if (prop === 'prototype') {
      continue;
    }

    Object.defineProperty(Wrapper, prop,
        Object.getOwnPropertyDescriptor(Original, prop) as PropertyDescriptor);
  }
  Wrapper.prototype = prototype;
  // `Event.prototype.constructor` is not writable in Safari 9, so we have to
  // define it with `defineProperty`.
  Object.defineProperty(Wrapper.prototype, 'constructor', {
    writable: true,
    configurable: true,
    enumerable: false,
    value: Wrapper,
  });
};
