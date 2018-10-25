/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from './utils.js';
import {shadowRootMixin, nodeMixin, windowMixin, textMixin, queryMixin, elementMixin, documentMixin, htmlElementMixin, slotMixin} from './methods.js';
import {ShadyRoot} from './attach-shadow.js';
import {patchShadowRootAccessors, patchAccessors} from './patch-accessors.js';

function patchBuiltin(proto, obj) {
  let n$ = Object.getOwnPropertyNames(obj);
  for (let i=0; i < n$.length; i++) {
    let n = n$[i];
    let d = Object.getOwnPropertyDescriptor(obj, n);
    // NOTE: we prefer writing directly here because some browsers
    // have descriptors that are writable but not configurable (e.g.
    // `appendChild` on older browsers)
    if (d.value) {
      proto[n] = d.value;
    } else {
      Object.defineProperty(proto, n, d);
    }
  }
}

const nativeHTMLElement =
    (window['customElements'] && window['customElements']['nativeHTMLElement']) ||
    HTMLElement;

// Apply patches to builtins (e.g. Element.prototype). Some of these patches
// can be done unconditionally (mostly methods like
// `Element.prototype.appendChild`) and some can only be done when the browser
// has proper descriptors on the builtin prototype
// (e.g. `Element.prototype.firstChild`)`. When descriptors are not available,
// elements are individually patched when needed (see e.g.
// `patchInside/OutsideElementAccessors` in `patch-accessors.js`).
export function patchBuiltins() {
  if (utils.settings.noPatch) {
    patchBuiltin(ShadyRoot.prototype, shadowRootMixin);
    patchShadowRootAccessors(ShadyRoot.prototype);
    return;
  }
  // These patches can always be done, for all supported browsers.
  patchBuiltin(ShadyRoot.prototype, shadowRootMixin);
  patchBuiltin(window.Node.prototype, nodeMixin);
  patchBuiltin(window.Window.prototype, windowMixin);
  patchBuiltin(window.Text.prototype, textMixin);
  patchBuiltin(window.DocumentFragment.prototype, queryMixin);
  patchBuiltin(window.Element.prototype, elementMixin);
  patchBuiltin(window.Document.prototype, documentMixin);
  if (window.HTMLSlotElement) {
    patchBuiltin(window.HTMLSlotElement.prototype, slotMixin);
  }
  patchBuiltin(nativeHTMLElement.prototype, htmlElementMixin);
  // These patches can *only* be done
  // on browsers that have proper property descriptors on builtin prototypes.
  // This includes: IE11, Edge, Chrome >= 4?; Safari >= 10, Firefox
  // On older browsers (Chrome <= 4?, Safari 9), a per element patching
  // strategy is used for patching accessors.
  if (utils.settings.hasDescriptors) {
    patchAccessors(window.Node.prototype);
    patchAccessors(window.Text.prototype);
    patchAccessors(window.DocumentFragment.prototype);
    patchAccessors(window.Element.prototype);
    patchAccessors(nativeHTMLElement.prototype);
    patchAccessors(window.Document.prototype);
    if (window.HTMLSlotElement) {
      patchAccessors(window.HTMLSlotElement.prototype);
    }
  }
  patchShadowRootAccessors(ShadyRoot.prototype);
}
