export {assert} from 'chai/index.mjs';
import {mocha, runTests as wtrRunTests} from '@web/test-runner-mocha';

export const runTests = (...args) => {
  mocha.setup({ui: 'tdd'});
  return wtrRunTests(...args);
};
