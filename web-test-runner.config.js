const { playwrightLauncher } = require('@web/test-runner-playwright');

const defaultBrowsers = [
  playwrightLauncher({ product: 'chromium' }),
  playwrightLauncher({ product: 'webkit' }),
  playwrightLauncher({ product: 'firefox', concurrency: 1 }),
];

const envBrowsers = process.env.BROWSERS?.split(',').map((product) => playwrightLauncher({product}));

const browsers = envBrowsers ?? defaultBrowsers;

module.exports = {
  files: `packages/scoped-custom-element-registry/test/**/*.test.(js|html)`,
  nodeResolve: true,
  concurrency: 10,
  browsers,
  coverage: true,
  coverageConfig: {
    report: true,
    reportDir: 'coverage',
    threshold: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    }
  },
};
