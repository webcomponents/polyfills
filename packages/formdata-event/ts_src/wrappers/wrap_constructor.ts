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

export function wrapConstructor<T extends Object, C extends Constructor<T>>(
  Wrapper: C,
  Constructor: C,
  prototype: C['prototype'],
) {
  for (const prop of Object.keys(Constructor)) {
    // `Event.prototype` is not writable or configurable in Safari 9. We
    // overwrite it immediately after, so we might as well not copy it.
    if (prop === 'prototype') {
      continue;
    }

    Object.defineProperty(Wrapper, prop,
        Object.getOwnPropertyDescriptor(Constructor, prop) as PropertyDescriptor);
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
