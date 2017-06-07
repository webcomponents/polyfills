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
import {flush} from './flush.js';
import {dispatchEvent} from './native-methods.js';
import * as mutation from './logical-mutation.js';
import {ActiveElementAccessor, ShadowRootAccessor, patchAccessors} from './patch-accessors.js';
import {addEventListener, removeEventListener} from './patch-events.js';
import {attachShadow, ShadyRoot} from './attach-shadow.js';

function getAssignedSlot(node) {
  mutation.renderRootNode(node);
  return node.__shady && node.__shady.assignedSlot || null;
}

let windowMixin = {

  // NOTE: ensure these methods are bound to `window` so that `this` is correct
  // when called directly from global context without a receiver; e.g.
  // `addEventListener(...)`.
  addEventListener: addEventListener.bind(window),

  removeEventListener: removeEventListener.bind(window)

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

  /**
   * @this {Node}
   */
  replaceChild(node, ref_node) {
    this.insertBefore(node, ref_node);
    this.removeChild(ref_node);
    return node;
  },

  /**
   * @this {Node}
   */
  cloneNode(deep) {
    return mutation.cloneNode(this, deep);
  },

  /**
   * @this {Node}
   */
  getRootNode(options) {
    return mutation.getRootNode(this, options);
  },

  /**
   * @this {Node}
   */
  get isConnected() {
    // Fast path for distributed nodes.
    const ownerDocument = this.ownerDocument;
    if (ownerDocument && ownerDocument.contains && ownerDocument.contains(this)) return true;
    const ownerDocumentElement = ownerDocument.documentElement;
    if (ownerDocumentElement && ownerDocumentElement.contains && ownerDocumentElement.contains(this)) return true;

    let node = this;
    while (node && !(node instanceof Document)) {
      node = node.parentNode || (node instanceof ShadyRoot ? /** @type {ShadowRoot} */(node).host : undefined);
    }
    return !!(node && node instanceof Document);
  },

  /**
   * @this {Node}
   */
  dispatchEvent(event) {
    flush();
    return dispatchEvent.call(this, event);
  }

};

// NOTE: For some reason `Text` redefines `assignedSlot`
let textMixin = {
  /**
   * @this {Text}
   */
  get assignedSlot() {
    return getAssignedSlot(this);
  }
};

let fragmentMixin = {

  // TODO(sorvell): consider doing native QSA and filtering results.
  /**
   * @this {DocumentFragment}
   */
  querySelector(selector) {
    // match selector and halt on first result.
    let result = mutation.query(this, function(n) {
      return utils.matchesSelector(n, selector);
    }, function(n) {
      return Boolean(n);
    })[0];
    return result || null;
  },

  /**
   * @this {DocumentFragment}
   */
  querySelectorAll(selector) {
    return mutation.query(this, function(n) {
      return utils.matchesSelector(n, selector);
    });
  }

};

let slotMixin = {

  /**
   * @this {HTMLSlotElement}
   */
  assignedNodes(options) {
    if (this.localName === 'slot') {
      mutation.renderRootNode(this);
      return this.__shady ?
        ((options && options.flatten ? this.__shady.distributedNodes :
        this.__shady.assignedNodes) || []) :
        [];
    }
  }

};

let elementMixin = utils.extendAll({

  /**
   * @this {HTMLElement}
   */
  setAttribute(name, value) {
    mutation.setAttribute(this, name, value);
  },

  /**
   * @this {HTMLElement}
   */
  removeAttribute(name) {
    mutation.removeAttribute(this, name);
  },

  /**
   * @this {HTMLElement}
   */
  attachShadow(options) {
    return attachShadow(this, options);
  },

  /**
   * @this {HTMLElement}
   */
  get slot() {
    return this.getAttribute('slot');
  },

  /**
   * @this {HTMLElement}
   */
  set slot(value) {
    this.setAttribute('slot', value);
  },

  /**
   * @this {HTMLElement}
   */
  get assignedSlot() {
    return getAssignedSlot(this);
  }

}, fragmentMixin, slotMixin);

Object.defineProperties(elementMixin, ShadowRootAccessor);

let documentMixin = utils.extendAll({
  /**
   * @this {Document}
   */
  importNode(node, deep) {
    return mutation.importNode(node, deep);
  },

  /**
   * @this {Document}
   */
  getElementById(id) {
    return this.querySelector(`#${id}`);
  }

}, fragmentMixin);

Object.defineProperties(documentMixin, {
  '_activeElement': ActiveElementAccessor.activeElement
});

let nativeBlur = HTMLElement.prototype.blur;

let htmlElementMixin = utils.extendAll({
  /**
   * @this {HTMLElement}
   */
  blur() {
    let root = this.shadowRoot;
    let shadowActive = root && root.activeElement;
    if (shadowActive) {
      shadowActive.blur();
    } else {
      nativeBlur.call(this);
    }
  }
})

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
// elements are individually patched when needed (see e.g.
// `patchInside/OutsideElementAccessors` in `patch-accessors.js`).
export function patchBuiltins() {
  let nativeHTMLElement =
    (window['customElements'] && window['customElements']['nativeHTMLElement']) ||
    HTMLElement;
  // These patches can always be done, for all supported browsers.
  patchBuiltin(window.Node.prototype, nodeMixin);
  patchBuiltin(window.Window.prototype, windowMixin);
  patchBuiltin(window.Text.prototype, textMixin);
  patchBuiltin(window.DocumentFragment.prototype, fragmentMixin);
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
}
