const express = require('express');

module.exports = (context, pluginOptions = {}, _plugin) => {
  context.hook('define:webserver', (app, assign, options, done) => {
    const newApp = express();

    newApp.use((req, res, next) => {
      const policies = req.query['enforce-trusted-types'];
      if (policies !== undefined) {
        res.append(
          'Content-Security-Policy',
          `require-trusted-types-for 'script'`
        );
        res.append('Content-Security-Policy', `trusted-types ${policies}`);
      }
      next();
    });

    newApp.use(app);
    assign(newApp);
    done();
  });
};
