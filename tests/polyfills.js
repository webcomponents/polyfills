/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

// CustomEvent polyfill.
// TODO(valdrin) move it to a separate polyfill.
if (typeof window.CustomEvent !== 'function') {
  function CustomEvent(event, params) {
    params = params || {
      bubbles: false,
      cancelable: false,
      detail: undefined
    };
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
}

try {
  new URL(this.location.href);
} catch (e) {
  document.write('<script src="/bower_components/url/url.js"></script>');
}

if (typeof window.Promise !== 'function') {
  document.write('<script src="/bower_components/es6-promise/dist/es6-promise.auto.min.js"></script>');
}

if (typeof HTMLTemplateElement === 'undefined') {
  document.write('<script src="/bower_components/template/template.js"></script>');
}
