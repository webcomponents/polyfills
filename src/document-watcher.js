/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

import {nativeShadow} from './style-settings'
import {StyleTransformer} from './style-transformer'

export let flush = function() {};

if (!nativeShadow) {
  let handler = (mxns) => {
    for (let x=0; x < mxns.length; x++) {
      let mxn = mxns[x];
      if (mxn.target === document.documentElement ||
        mxn.target === document.head) {
        continue;
      }
      for (let i=0; i < mxn.addedNodes.length; i++) {
        let n = mxn.addedNodes[i];
        if (n.nodeType === Node.ELEMENT_NODE &&
            !n.classList.contains(StyleTransformer.SCOPE_NAME)) {
          let root = n.getRootNode();
          if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            // may no longer be in a shadowroot
            let host = root.host;
            if (host) {
              let scope = host.is || host.localName;
              StyleTransformer.dom(n, scope);
            }
          }
        }
      }
      for (let i=0; i < mxn.removedNodes.length; i++) {
        let n = mxn.removedNodes[i];
        if (n.nodeType === Node.ELEMENT_NODE) {
          let classIdx = Array.from(n.classList)
            .indexOf(StyleTransformer.SCOPE_NAME);
          if (classIdx >= 0) {
            // NOTE: relies on the scoping class always being adjacent to the
            // SCOPE_NAME class.
            let scope = n.classList[classIdx + 1];
            if (scope) {
              StyleTransformer.dom(n, scope, true);
            }
          }
        }
      }
    }
  };

  let observer = new MutationObserver(handler);
  let start = (node) => {
    observer.observe(node, {childList: true, subtree: true});
  }
  let nativeCustomElements = (window.customElements &&
    !window.customElements.flush);
  // need to start immediately with native custom elements
  // TODO(dfreedm): with polyfilled HTMLImports and native custom elements
  // excessive mutations may be observed; this can be optimized via cooperation
  // with the HTMLImports polyfill.
  if (nativeCustomElements) {
    start(document);
  } else {
    let delayedStart = () => {
      start(document.body);
    }
    // use polyfill timing if it's available
    if (window.HTMLImports) {
      window.HTMLImports.whenReady(delayedStart);
    // otherwise push beyond native imports being ready
    // which requires RAF + readystate interactive.
    } else {
      requestAnimationFrame(function() {
        if (document.readyState === 'loading') {
          let listener = function() {
            delayedStart();
            document.removeEventListener('readystatechange', listener);
          }
          document.addEventListener('readystatechange', listener);
        } else {
          delayedStart();
        }
      });
    }
  }

  flush = function() {
    handler(observer.takeRecords());
  }
}
