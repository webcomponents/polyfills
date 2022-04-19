const URL = require('core-js/stable/url');

if (!window.URL || !window.URLSearchParams) {
  window.URL = URL;
}
