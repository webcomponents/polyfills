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

module.exports = {
  files: ['test/**/*.test.(js|html)'],
  nodeResolve: true,
  concurrency: 10,
  browsers,
};
