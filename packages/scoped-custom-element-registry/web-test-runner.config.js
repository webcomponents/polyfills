const {playwrightLauncher} = require('@web/test-runner-playwright');

const defaultBrowsers = [
  playwrightLauncher({product: 'chromium'}),
  playwrightLauncher({product: 'firefox', concurrency: 1}),
  playwrightLauncher({product: 'webkit'}),
];

const envBrowsers = process.env.BROWSERS?.split(',').map((product) =>
  playwrightLauncher({product})
);

const browsers = envBrowsers ?? defaultBrowsers;

// With FORCE_POLYFILL set, the polyfill is used even where the browser
// supports scoped registries natively, so its code is tested there too.
const forcePolyfill = {
  name: 'force-polyfill',
  transform(context) {
    if (context.path.endsWith('/scoped-custom-element-registry.min.js')) {
      return {
        body: `window.CustomElementRegistryPolyfill = {force: true};\n${context.body}`,
      };
    }
  },
};

module.exports = {
  files: ['test/**/*.test.(js|html)'],
  nodeResolve: true,
  concurrency: 10,
  browsers,
  plugins: process.env.FORCE_POLYFILL ? [forcePolyfill] : [],
};
