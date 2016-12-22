/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
var file = 'polyfills.js';
var src =
  document.querySelector('script[src*="' + file + '"]').getAttribute('src');
var basePath = src.slice(0, src.indexOf(file));

try {
  new URL(this.location.href);
} catch (e) {
  document.write('<script src="' + basePath +
    '../../url/url.js"></script>');
}

if (typeof window.Promise !== 'function') {
  document.write('<script src="' + basePath +
    '../../es6-promise/es6-promise.auto.min.js"></script>');
}

if (typeof HTMLTemplateElement === 'undefined') {
  document.write('<script src="' + basePath +
    '../../template/template.js"></script>');
}
