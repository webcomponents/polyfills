const express = require('express');

module.exports = (context, pluginOptions = {}, _plugin) => {
  const pathToPolicies = new Map();
  for (const rule of pluginOptions['enforce-trusted-types'] ?? []) {
    const [path, policies] = rule.split(';');
    pathToPolicies.set(path, policies?.split(',') ?? []);
  }

  context.hook('define:webserver', (app, assign, options, done) => {
    const newApp = express();

    newApp.use((req, res, next) => {
      const policies = pathToPolicies.get(req.path);
      if (policies !== undefined) {
        res.append(
          'Content-Security-Policy',
          `require-trusted-types-for 'script'`
        );
        res.append(
          'Content-Security-Policy',
          `trusted-types ${policies.join('')}`
        );
      }
      next();
    });

    newApp.use(app);
    assign(newApp);
    done();
  });
};
