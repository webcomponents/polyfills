const { playwrightLauncher } = require('@web/test-runner-playwright');

module.exports = {
  files: `packages/custom-elements-scoped/test/**/*.test.(js|html)`,
  nodeResolve: true,
  concurrency: 10,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'webkit' }),
    playwrightLauncher({ product: 'firefox', concurrency: 1 }),
  ],
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
