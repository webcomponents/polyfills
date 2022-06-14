const {createSauceLabsLauncher} = require('@web/test-runner-saucelabs');
const {compileJSPlugin} = require('./compile-js-plugin.js');

const sauceLabsLauncher = createSauceLabsLauncher(
  {
    user: process.env.SAUCE_USERNAME,
    key: process.env.SAUCE_ACCESS_KEY,
  },
  {
    name: 'Polyfills tests',
    build: process.env.GITHUB_REF ?? 'local',
  }
);

const defaultBrowsers = [
  // These browsers support the standard W3C WebDriver protocol.

  sauceLabsLauncher({
    platformName: 'windows 10',
    browserName: 'microsoftedge',
    browserVersion: '17',
  }),
  sauceLabsLauncher({
    platformName: 'windows 10',
    browserName: 'microsoftedge',
    browserVersion: '15',
  }),
  sauceLabsLauncher({
    platformName: 'windows 8.1',
    browserName: 'internet explorer',
    browserVersion: '11',
  }),
  sauceLabsLauncher({
    platformName: 'macos 10.13',
    browserName: 'safari',
    browserVersion: '12',
  }),
  sauceLabsLauncher({
    platformName: 'macos 10.13',
    browserName: 'safari',
    browserVersion: '11',
  }),

  // These browsers only support the older JWP protocol.
  //
  // Sauce Labs determines which protocol to use to talk to the launched browser
  // based on whether or not an option called `sauce:options` exists in the
  // given configuration. If this key is passed, the newer W3C standard
  // WebDriver protocol is used; otherwise, JWP is used.[^1]
  // `@web/test-runner-saucelabs` adds the `sauce:options` key if it sees the
  // `browserVersion` key, which is only supported by Sauce Labs with the
  // standard WebDriver protocol.[^2] So, we use the older key names here so
  // that JWP will be used with these browsers.
  //
  // [^1]: https://docs.saucelabs.com/dev/w3c-webdriver-capabilities/#use-sauceoptions
  // [^2]: https://github.com/modernweb-dev/web/blob/db4949ece675d9c6e4bb722bb9700347258b7e96/packages/test-runner-saucelabs/src/createSauceLabsLauncher.ts#L51-L72

  sauceLabsLauncher({
    platform: 'os x 10.11',
    browserName: 'safari',
    version: '10',
  }),
  sauceLabsLauncher({
    platform: 'os x 10.11',
    browserName: 'safari',
    version: '9',
  }),
  sauceLabsLauncher({
    platform: 'Linux',
    browserName: 'chrome',
    version: '41',
  }),
];

const envBrowsers = process.env.BROWSERS?.split(',').map((product) => {
  const [platformName, rest] = product.split('/');
  const [browserName, browserVersion] = rest.split('@');
  return sauceLabsLauncher({
    platformName,
    browserName,
    browserVersion,
  });
});

const browsers = envBrowsers ?? defaultBrowsers;

module.exports = {
  files: [
    //'packages/scoped-custom-element-registry/test/**/*.test.(js|html)',
    'packages/tests/custom-elements/wtr/**/*.test.(js|html)',
  ],
  nodeResolve: true,
  concurrency: 1,
  concurrentBrowsers: 1,
  browsers,
  plugins: [compileJSPlugin()],
};
