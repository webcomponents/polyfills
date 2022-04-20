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

// wct -s 'windows 10/microsoftedge@17' -s 'windows 10/microsoftedge@15' -s 'windows 8.1/internet explorer@11' -s 'macos 10.13/safari@12' -s 'macos 10.13/safari@11' -s 'os x 10.11/safari@10' -s 'os x 10.11/safari@9' -s 'Linux/chrome@41'

const defaultBrowsers = [
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
  sauceLabsLauncher({
    platformName: 'os x 10.11',
    browserName: 'safari',
    browserVersion: '10',
  }),
  sauceLabsLauncher({
    platformName: 'os x 10.11',
    browserName: 'safari',
    browserVersion: '9',
  }),
  sauceLabsLauncher({
    platformName: 'Linux',
    browserName: 'chrome',
    browserVersion: '41',
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
