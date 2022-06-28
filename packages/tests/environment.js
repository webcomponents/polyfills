/**
 * The test environment is intentionally imported into the test pages through
 * this _unbundled_ module so that the server middleware is the only step that
 * will compile out modules, if they aren't natively supported. This is
 * necessary to guarantee that their loading order matches the native behavior,
 * which is important here because `@web/test-runner-mocha` and the
 * dynamically-generated module that it imports depend on some of the polyfills
 * included here.
 *
 * Also, `chai` and `core-js` are only distributed as Common JS, but the server
 * middleware does not support compiling out Common JS, so they are each bundled
 * separately and those bundles are referenced here.
 */

import './core-js_url-bundle.js';
import 'whatwg-fetch';
export {assert} from './chai-bundle.js';
import {mocha, runTests as wtrRunTests} from '@web/test-runner-mocha';

export const runTests = (...args) => {
  mocha.setup({ui: 'tdd'});
  return wtrRunTests(...args);
};
