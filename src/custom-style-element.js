/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/*
Wrapper over <style> elements to co-operate with ShadyCSS

Example:
<custom-style>
  <style>
  ...
  </style>
</custom-style>
*/

'use strict';

let ShadyCSS = window.ShadyCSS;

let enqueued = false;

let customStyles = [];

let hookFn = null;

/*
If a page only has <custom-style> elements, it will flash unstyled content,
as all the instances will boot asynchronously after page load.

Calling ShadyCSS.updateStyles() will force the work to happen synchronously
*/
function enqueueDocumentValidation() {
  if (enqueued) {
    return;
  }
  enqueued = true;
  if (window.HTMLImports) {
    window.HTMLImports.whenReady(validateDocument);
  } else if (document.readyState === 'complete') {
    validateDocument();
  } else {
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        validateDocument();
      }
    });
  }
}

function validateDocument() {
  requestAnimationFrame(() => {
    if (enqueued || ShadyCSS._elementsHaveApplied) {
      ShadyCSS.updateStyles();
    }
    enqueued = false;
  });
}

class CustomStyle extends HTMLElement {
  static get _customStyles() {
    return customStyles;
  }
  static get processHook() {
    return hookFn;
  }
  static set processHook(fn) {
    hookFn = fn;
  }
  static get _documentDirty() {
    return enqueued;
  }
  static findStyles() {
    for (let i = 0; i < customStyles.length; i++) {
      let c = customStyles[i];
      if (!c._style) {
        let style = c.querySelector('style');
        if (!style) {
          continue;
        }
        // HTMLImports polyfill may have cloned the style into the main document,
        // which is referenced with __appliedElement.
        // Also, we must copy over the attributes.
        if (style.__appliedElement) {
          for (let i = 0; i < style.attributes.length; i++) {
            let attr = style.attributes[i];
            style.__appliedElement.setAttribute(attr.name, attr.value);
          }
        }
        c._style = style.__appliedElement || style;
        if (hookFn) {
          hookFn(c._style);
        }
        ShadyCSS._transformCustomStyleForDocument(c._style);
      }
    }
  }
  static _revalidateApplyShim() {
    for (let i = 0; i < customStyles.length; i++) {
      let c = customStyles[i];
      if (c._style) {
        ShadyCSS._revalidateApplyShim(c._style);
      }
    }
  }
  static applyStyles() {
    for (let i = 0; i < customStyles.length; i++) {
      let c = customStyles[i];
      if (c._style) {
        ShadyCSS._applyCustomStyleToDocument(c._style);
      }
    }
    enqueued = false;
  }
  constructor() {
    super();
    customStyles.push(this);
    enqueueDocumentValidation();
  }
}

window['CustomStyle'] = CustomStyle;
window.customElements.define('custom-style', CustomStyle);