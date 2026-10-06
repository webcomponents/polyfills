// Runs the vendored WPTs (see test/wpt/README.md) with the polyfill, in the
// browsers of web-test-runner.config.js. `npm run test:wpt` forces the
// polyfill (FORCE_POLYFILL), so it's tested in every engine.
import config from './web-test-runner.config.js';
import {wptPlugin} from './test/wpt/plugin.mjs';

export default {
  ...config,
  // wireit runs test:wpt in parallel with test:forced, which uses the
  // default port (8000).
  port: 8100,
  files: ['test/wpt/custom-elements/registries/*.html'],
  plugins: [
    ...config.plugins,
    wptPlugin({updateBaseline: Boolean(process.env.WPT_UPDATE_BASELINE)}),
  ],
};
