const {htmlTransform, jsTransform} = require('polymer-build');
const {getRequestFilePath} = require('@web/dev-server-core');
const {browserCapabilities} = require('browser-capabilities');
const {getCompileTarget} = require('polyserve/lib/get-compile-target.js');

/**
 * This `@web/dev-server` plugin is used to roughly mimic the automatic JS
 * compilation behavior of WCT's test server (`polyserve`) as is assumed by many
 * of the tests.
 */
exports.compileJSPlugin = () => {
  let rootDir = undefined;

  /**
   * Compute the settings that should be passed to `polymer-build`'s
   * `htmlTransform` given a Koa `Context`.[^1] (The options for `jsTransform`
   * are embedded as the `js` property.)
   *
   * [^1]: https://github.com/modernweb-dev/web/blob/3f671e732201f141d910b59c60666f31df9c6126/packages/dev-server-core/src/plugins/Plugin.ts#L35
   */
  const getHTMLTransformOptions = (context) => {
    const capabilities = browserCapabilities(context.headers['user-agent']);
    const compileTarget = getCompileTarget(capabilities, 'auto');

    const jsOptions = {
      compile: compileTarget,
      moduleResolution: 'node',
      transformModulesToAmd: !capabilities.has('modules'),
      filePath: getRequestFilePath(context, rootDir),
    };
    const htmlOptions = {
      js: jsOptions,
      injectAmdLoader: jsOptions.transformModulesToAmd,
    };

    return htmlOptions;
  };

  return {
    name: 'compile-js-plugin',

    async serverStart(args) {
      rootDir = args.config.rootDir;
    },

    // `@web/test-runner` reuses the same server across multiple browser
    // launchers (e.g. when we test on Sauce Labs). This cache key determines if
    // the result of `transform()` below can be reused for later requests to the
    // same path. Without it, all `transform()` results are permanently cached,
    // which is a problem when different browsers require different transforms.
    async transformCacheKey(context) {
      if (context.path.includes(`/node_modules/@webcomponents/`)) {
        return;
      }

      return JSON.stringify(getHTMLTransformOptions(context));
    },

    async transform(context) {
      if (context.path.includes(`/node_modules/@webcomponents/`)) {
        return;
      }

      const htmlOptions = getHTMLTransformOptions(context);
      const jsOptions = htmlOptions.js;

      if (context.response.is('html')) {
        // Inform any caches that UA affects the response.
        context.append('Vary', 'User-Agent');
        context.body = htmlTransform(context.body, htmlOptions);
      } else if (context.response.is('js')) {
        // Inform any caches that UA affects the response.
        context.append('Vary', 'User-Agent');
        context.body = jsTransform(context.body, jsOptions);
      }
    },
  };
};
