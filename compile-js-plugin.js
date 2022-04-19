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
