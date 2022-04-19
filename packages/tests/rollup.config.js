import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';

export default {
  input: 'environment.js',
  output: {
    file: 'environment-bundle.js',
    format: 'iife',
  },
  plugins: [
    commonjs(),
    nodeResolve({
      preferBuiltins: false,
    }),
  ],
};
