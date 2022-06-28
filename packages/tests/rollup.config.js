import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'chai.js',
    output: {
      file: 'chai-bundle.js',
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
    input: 'core-js_url.js',
    output: {
      file: 'core-js_url-bundle.js',
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
