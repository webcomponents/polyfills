const URL = require('core-js/stable/url');
require('whatwg-fetch');

if (!window.URL || !window.URLSearchParams) {
  window.URL = URL;
}
