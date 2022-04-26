const {htmlTransform, jsTransform} = require('polymer-build');
const {getRequestFilePath} = require('@web/dev-server-core');
const {browserCapabilities} = require('browser-capabilities');
const {getCompileTarget} = require('polyserve/lib/get-compile-target.js');

exports.compileJSPlugin = () => {
  let rootDir = undefined;

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

      const capabilities = browserCapabilities(context.headers['user-agent']);
      const compileTarget = getCompileTarget(capabilities, 'auto');

      return JSON.stringify({
        compile: compileTarget,
        transformModulesToAmd: !capabilities.has('modules'),
        filePath: getRequestFilePath(context, rootDir),
      });
    },

    async transform(context) {
      if (context.path.includes(`/node_modules/@webcomponents/`)) {
        return;
      }

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

      if (context.response.is('html')) {
        context.body = htmlTransform(context.body, htmlOptions);
      } else if (context.response.is('js')) {
        context.body = jsTransform(context.body, jsOptions);
      }
    },
  };
};
