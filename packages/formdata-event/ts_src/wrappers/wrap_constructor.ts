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

type Constructor<T> = new (...args: Array<any>) => T;

/**
 * Modifies a constructible function, `Wrapper`, to act as a wrapper for some
 * other constructor, `Original`, by copying the function's own properties and
 * prototype. `prepareWrapper` does not modify `Original` or any objects
 * accessible from it, so it can be safely called before knowing if the wrapper
 * is actually required but still sets up the wrapper enough to be properly
 * extended by another ES5-compiled class.
 */
export function prepareWrapper<T extends Object>(
  Wrapper: Constructor<T>,
  Original: Constructor<T>,
  prototype: Constructor<T>['prototype'],
) {
  // Set `Wrapper`'s prototype to that of `Original`.
  Object.setPrototypeOf(Wrapper, Object.getPrototypeOf(Original));

  // Copy own properties from `Original` to `Wrapper`.
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

  // `Event.prototype.constructor` is not writable in Safari 9, which breaks the
  // ES5-compiled class that sets `constructor` to the prototype created as
  // `Object.create(Event.prototype)` as well as `installWrapper`.
  Object.defineProperty(prototype, 'constructor', {
    writable: true,
    configurable: true,
    enumerable: false,
    value: prototype.constructor,
  });
};

/**
 * Sets a constructible function's `.prototype.constructor` to point to itself.
 * This step should be performed after a previous call to `prepareWrapper` and
 * only when the wrapper is actually needed as it will modify `.prototype`,
 * which was copied from a global object.
 */
export function installWrapper<T extends Object>(Wrapper: Constructor<T>) {
  Wrapper.prototype.constructor = Wrapper;
};
