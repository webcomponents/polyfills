/**
 * Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

// This needs to run first so that it can catch reported errors before Mocha's
// global error handler does.
window.catchReportedErrors = (() => {
  let currentHandler = undefined;

  window.addEventListener('error', e => {
    if (currentHandler) currentHandler(e);
  }, true);

  return (fn, handler) => {
    currentHandler = handler;
    fn();
    currentHandler = undefined;
  };
})();
