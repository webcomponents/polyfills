// Runs the package tests in a browser without native scoped registries, so the
// polyfill loads on its own (no `force`).
//
// Uses a Firefox-engine (Gecko) build driven by puppeteer. One source is Zen,
// which publishes Linux builds on GitHub:
//   curl -L -o zen.tar.xz https://github.com/zen-browser/desktop/releases/latest/download/zen.linux-x86_64.tar.xz
//   tar xf zen.tar.xz
// Install the launcher without downloading Chrome:
//   PUPPETEER_SKIP_DOWNLOAD=1 npm i -D @web/test-runner-puppeteer
// Then, with the built polyfill at scoped-custom-element-registry.min.js:
//   FIREFOX_PATH=/path/to/zen/zen wtr --config test/wtr.firefox.config.js
const {puppeteerLauncher} = require('@web/test-runner-puppeteer');

module.exports = {
  files: ['test/**/*.test.(js|html)'],
  nodeResolve: true,
  concurrency: 1,
  browserStartTimeout: 120000,
  testsFinishTimeout: 300000,
  browsers: [
    puppeteerLauncher({
      launchOptions: {
        browser: 'firefox',
        executablePath: process.env.FIREFOX_PATH,
        headless: true,
      },
    }),
  ],
};
