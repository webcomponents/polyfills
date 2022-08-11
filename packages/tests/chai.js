/**
 * This is the entrypoint for the Chai bundle used as part of the test
 * environment. Chai is only distributed as Common JS, so it must be bundled.
 *
 * Despite the `.mjs` extension, the module referenced here[^1] imports another
 * file[^2] that itself attempts to import the entire library using `require()`.
 *
 * [^1]: https://github.com/chaijs/chai/blob/v4.3.6/index.mjs
 * [^2]: https://github.com/chaijs/chai/blob/v4.3.6/index.js
 */

export * from 'chai/index.mjs';
