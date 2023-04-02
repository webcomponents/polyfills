const {playwrightLauncher} = require('@web/test-runner-playwright');

const defaultBrowsers = [
  playwrightLauncher({product: 'chromium'}),
  playwrightLauncher({product: 'firefox', concurrency: 1}),
];

const envBrowsers = process.env.BROWSERS?.split(',').map((product) =>
  playwrightLauncher({product})
);

const browsers = envBrowsers ?? defaultBrowsers;

module.exports = {
  files: ['test/**/*.test.(js|html)', '!test/jsdom/**/*'],
  nodeResolve: true,
  concurrency: 10,
  browsers,
};
