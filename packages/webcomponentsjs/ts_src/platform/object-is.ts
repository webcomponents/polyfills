/**
@license
Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/

// Derived from a snippet on
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
// which was added after 2010.
// https://developer.mozilla.org/en-US/docs/MDN/About#Code_samples_and_snippets

export {};

if (!Object.hasOwnProperty('is')) {
  Object.defineProperty(Object, 'is', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function is(x: any, y: any): boolean {
      // SameValue algorithm
      if (x === y) { // Steps 1-5, 7-10
        // Steps 6.b-6.e: +0 != -0
        return x !== 0 || 1 / x === 1 / y;
      } else {
        // Step 6.a: NaN == NaN
        return x !== x && y !== y;
      }
    }
  });
}
