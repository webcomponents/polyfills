/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

export {};

if (!Array.from) {
  Array.from = <T>(object: ArrayLike<T>): Array<T> => {
    return [].slice.call(object);
  };
}

if (!Object.assign) {
  const assign = (target: object, source: object) => {
    const n$ = Object.keys(source);
    for (let i = 0; i < n$.length; i++) {
      const p = n$[i];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (target as any)[p] = (source as any)[p];
    }
  };

  Object.assign = function (target: object) {
    // eslint-disable-next-line prefer-rest-params
    const args: object[] = [].slice.call(arguments, 1);
    for (let i = 0, s; i < args.length; i++) {
      s = args[i];
      if (s) {
        assign(target, s);
      }
    }
    return target;
  };
}
