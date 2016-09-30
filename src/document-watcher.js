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

if (!nativeShadow) {
  let observer = new MutationObserver((mxns) => {
    mxns.forEach((mxn) => {
      mxn.addedNodes.forEach((n) => {
        if (n.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        if (n.classList.contains('style-scope')) {
          return;
        }
        let root = n.getRootNode();
        if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          let host = root.host;
          let scope = host.is || host.localName;
          StyleTransformer.dom(n, scope);
        }
      });
    });
  });

  let start = () => observer.observe(document, {childList: true, subtree: true});
  if (window.HTMLImports) {
    window.HTMLImports.whenReady(start);
  } else if (document.readyState === 'complete') {
    requestAnimationFrame(start);
  } else {
    document.addEventListener('readystatechange', function() {
      if (document.readyState === 'complete') {
        start();
      }
    });
  }
}
