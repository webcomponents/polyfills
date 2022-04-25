import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'environment-polyfills.js',
    output: {
      file: 'environment-polyfills-bundle.js',
      format: 'es',
    },
    plugins: [
      commonjs(),
      nodeResolve({
        preferBuiltins: false,
      }),
    ],
  },
  {
    input: 'environment.js',
    output: {
      file: 'environment-bundle.js',
      format: 'es',
    },
    plugins: [
      commonjs(),
      nodeResolve({
        preferBuiltins: false,
      }),
    ],
    makeAbsoluteExternalsRelative: false,
    external: ['/__web-dev-server__web-socket.js'],
  },
];
