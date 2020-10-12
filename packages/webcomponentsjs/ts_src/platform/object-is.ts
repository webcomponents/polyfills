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
