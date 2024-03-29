window.WCT = {
  // Force the 'root' path to be automatically detected relative to the
  // 'wct-browser-legacy/browser.js' script.
  root: null,
  environmentScripts: [
    'stacky/lib/parsing.js',
    'stacky/lib/formatting.js',
    'stacky/lib/normalization.js',
    'mocha/mocha.js',
    'chai/chai.js',
    '@polymer/sinonjs/sinon.js',
    // 'accessibility-developer-tools/dist/js/axs_testing.js',
    // '@polymer/test-fixture/test-fixture.js'
  ],
  environmentImports: [],
  // verbose: true
};
