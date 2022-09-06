const {playwrightLauncher} = require('@web/test-runner-playwright');
const {createSauceLabsLauncher} = require('@web/test-runner-saucelabs');
const {compileJSPlugin} = require('./compile-js-plugin.js');

const generateLocalBrowserLaunchers = () => {
  const defaultBrowsers = [
    playwrightLauncher({product: 'chromium'}),
    playwrightLauncher({product: 'firefox', concurrency: 1}),
  ];

  const envBrowsers = process.env.BROWSERS?.split(',').map((product) =>
    playwrightLauncher({product})
  );

  return envBrowsers ?? defaultBrowsers;
};

const generateSauceBrowserLaunchers = () => {
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

    // These browsers only support the older JWP protocol.
    //
    // Sauce Labs determines which protocol to use to talk to the launched
    // browser based on whether or not an option called `sauce:options` exists
    // in the given configuration. If this key is passed, the newer W3C standard
    // WebDriver protocol is used; otherwise, JWP is used.[^1]
    // `@web/test-runner-saucelabs` adds the `sauce:options` key if it sees the
    // `browserVersion` key, which is only supported by Sauce Labs with the
    // standard WebDriver protocol.[^2] So, we use the older key names here so
    // that JWP will be used with these browsers.
    //
    // [^1]: https://docs.saucelabs.com/dev/w3c-webdriver-capabilities/#use-sauceoptions
    // [^2]: https://github.com/modernweb-dev/web/blob/db4949ece675d9c6e4bb722bb9700347258b7e96/packages/test-runner-saucelabs/src/createSauceLabsLauncher.ts#L51-L72

    sauceLabsLauncher({
      platform: 'macos 10.13',
      browserName: 'safari',
      version: '11',
    }),
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

  /**
   * Parses a string representing a browser and platform combination into an
   * object with `platformName`, `browserName`, and `browserVersion` properties.
   */
  const parseCapabilities = (capabilities) => {
    const [platformName, rest] = capabilities.split('/');
    const [browserName, browserVersion] = rest.split('@');
    return {
      platformName,
      browserName,
      browserVersion,
    };
  };

  // If set, the `BROWSERS` environment variable overrides browsers in the
  // `defaultBrowsers` object. Add `;protocol=w3c` or `;protocol=jwp` to a
  // browser to explicitly control which protocol is used to control that
  // browser.
  const envBrowsers = process.env.BROWSERS?.split(',').map((browser) => {
    const [capabilities, paramStr] = browser.split(';');
    const params = new URLSearchParams(paramStr);
    const {platformName, browserName, browserVersion} = parseCapabilities(
      capabilities
    );

    const protocol = params.get('protocol');
    if (!protocol || protocol === 'w3c') {
      return sauceLabsLauncher({
        platformName,
        browserName,
        browserVersion,
      });
    } else if (protocol === 'jwp') {
      return sauceLabsLauncher({
        platform: platformName,
        browserName,
        version: browserVersion,
      });
    } else {
      console.error('`protocol` must be either undefined, "w3c", or "jwp".');
      process.exit(1);
    }
  });

  return envBrowsers ?? defaultBrowsers;
};

module.exports = {
  files: [
    'custom-elements/html/**/*.test.(js|html)',
    'formdata-event/**/*.test.(js|html)',
  ],
  rootDir: '../..',
  nodeResolve: true,
  concurrency: 1,
  concurrentBrowsers: 1,
  plugins: [compileJSPlugin()],
  groups: [
    {
      name: 'local',
      // This is intentionally a getter so that browser launchers are only
      // created on demand.
      get browsers() {
        return generateLocalBrowserLaunchers();
      },
    },
    {
      name: 'sauce',
      // This is intentionally a getter so that browser launchers are only
      // created on demand.
      get browsers() {
        return generateSauceBrowserLaunchers();
      },
    },
  ],
};
