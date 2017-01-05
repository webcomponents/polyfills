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

import * as utils from './utils'
import * as mutation from './shady-mutation'
import {ActiveElementAccessor, patchAccessors} from './patch-accessors'
import {getProperty} from './logical-properties'
import {addEventListener, removeEventListener} from './patch-events'
import {ShadyRoot} from './shady-root'

let assignedSlotDesc = {
  get() {
    mutation.renderRootNode(this);
    return getProperty(this, 'assignedSlot') || null;
  },
  configurable: true
};

let nodeMixin = {

  addEventListener: addEventListener,

  removeEventListener: removeEventListener,

  appendChild(node) {
    return mutation.insertBefore(this, node);
  },

  insertBefore(node, ref_node) {
    return mutation.insertBefore(this, node, ref_node);
  },

  removeChild(node) {
    return mutation.removeChild(this, node);
  },

  replaceChild(node, ref_node) {
    this.insertBefore(node, ref_node);
    this.removeChild(ref_node);
    return node;
  },

  cloneNode(deep) {
    return mutation.cloneNode(this, deep);
  },

  getRootNode(options) {
    return mutation.getRootNode(this, options);
  },

  get isConnected() {
    return document.documentElement.contains(this)
  }

};

// NOTE: For some reason `Text` redefines `assignedSlot`
let textMixin = {};

Object.defineProperties(Text, {
  assignedSlot: assignedSlotDesc
});

let fragmentMixin = {

  // TODO(sorvell): consider doing native QSA and filtering results.
  querySelector(selector) {
    // match selector and halt on first result.
    let result = mutation.query(this, function(n) {
      return utils.matchesSelector(n, selector);
    }, function(n) {
      return Boolean(n);
    })[0];
    return result || null;
  },

  querySelectorAll(selector) {
    return mutation.query(this, function(n) {
      return utils.matchesSelector(n, selector);
    });
  }

};

let assignedNodes = function(options) {
  if (this.localName === 'slot') {
    mutation.renderRootNode(this);
    return this.__shady ?
      ((options && options.flatten ? this.__shady.distributedNodes :
      this.__shady.assignedNodes) || []) :
      [];
  }
};

let slotMixin = {
  assignedNodes: assignedNodes
};

let elementMixin = utils.extendAll({}, fragmentMixin, slotMixin, {

  setAttribute(name, value) {
    mutation.setAttribute(this, name, value);
  },

  removeAttribute(name) {
    mutation.removeAttribute(this, name);
  },

  attachShadow() {
    return new ShadyRoot(this);
  },

  get slot() {
    return this.getAttribute('slot');
  },

  set slot(value) {
    this.setAttribute('slot', value);
  }

});

Object.defineProperties(elementMixin, {

  assignedSlot: assignedSlotDesc

});

// TODO(sorvell): importNode
let documentMixin = utils.extendAll({}, fragmentMixin);

Object.defineProperties(documentMixin, {
  _activeElement: ActiveElementAccessor.activeElement
});

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


// Apply patches to builtins (e.g. Element.prototype). Some of these patches
// can be done unconditionally (mostly methods like
// `Element.prototype.appendChild`) and some can only be done when the browser
// has proper descriptors on the builtin prototype
// (e.g. `Element.prototype.firstChild`)`. When descriptors are not available,
// elements are individually patched when needed.
export function patchBuiltins() {
  // These patches can always be done, for all supported browsers.
  patchBuiltin(window.Node.prototype, nodeMixin);
  patchBuiltin(window.Text.prototype, textMixin);
  patchBuiltin(window.DocumentFragment.prototype, fragmentMixin);
  patchBuiltin(window.Element.prototype, elementMixin);
  patchBuiltin(window.Document.prototype, documentMixin);
  if (window.HTMLSlotElement) {
    patchBuiltin(window.HTMLSlotElement.prototype, slotMixin);
  }
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
    let nativeHTMLElement =
      (window.customElements && customElements.nativeHTMLElement) ||
      HTMLElement;
    patchAccessors(nativeHTMLElement.prototype);
    patchAccessors(window.Document.prototype);
    if (window.HTMLSlotElement) {
      patchAccessors(window.HTMLSlotElement.prototype);
    }
  }
}