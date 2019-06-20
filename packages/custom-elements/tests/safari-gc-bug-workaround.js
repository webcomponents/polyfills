/**
 * @license
 * Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

// Some distributions of Safari 10 and 11 contain a bug where non-native
// properties added to certain globals very early in the lifetime of the page
// are not considered reachable and might be garbage collected. This happens
// randomly and appears to affect not only the `customElements` global but also
// the wrapper functions it attaches to other globals, like `Node.prototype`,
// effectively removing the polyfill. To work around this, this function checks
// if the polyfill is missing before running the tests. If so, it uses a
// special global function added by the polyfill (which doesn't get collected)
// to reinstall it.
//
// https://bugs.webkit.org/show_bug.cgi?id=172575
export function safariGCBugWorkaround() {
  if (customElements.polyfillWrapFlushCallback === undefined) {
    window.__CE_installPolyfill();
    console.warn('The custom elements polyfill was reinstalled.');
  }
}
