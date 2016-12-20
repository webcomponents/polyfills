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
import * as logicalTree from './logical-tree'
import * as events from './event-mixin'
import {ShadyRoot} from './shady-root'

let assignedSlotDesc = {
  get() {
    return logicalTree.getProperty(this, 'assignedSlot') || null;
  },
  configurable: true
};

export let Node = {

  addEventListener: events.addEventListener,

  removeEventListener: events.removeEventListener,

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
  }

};

Object.defineProperties(Node, {
  isConnected: {
    get() {
      return document.documentElement.contains(this);
    },
    configurable: true
  }
});

// NOTE: For some reason `Text` redefines `assignedSlot`
export let Text = {};

Object.defineProperties(Text, {
  assignedSlot: assignedSlotDesc
});

export let Fragment = {

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

export let Slot = {
  assignedNodes: assignedNodes
};

export let Element = utils.extendAll({}, Fragment, Slot, {

  setAttribute(name, value) {
    mutation.setAttribute(this, name, value);
  },

  removeAttribute(name) {
    mutation.removeAttribute(this, name);
  },

  attachShadow() {
    return new ShadyRoot(this);
  }

});

Object.defineProperties(Element, {

  assignedSlot: assignedSlotDesc,

  shadowRoot: {
    get() {
      return this.shadyRoot;
    },
    set(value) {
      this.shadyRoot = value;
    },
    configurable: true
  },

  slot: {
    get() {
      return this.getAttribute('slot');
    },
    set(value) {
      this.setAttribute('slot', value);
    },
    configurable: true
  }
})

// TODO(sorvell): importNode
export let Document = utils.extendAll({}, Fragment);

Object.defineProperties(Document, {
  _activeElement: mutation.activeElementDescriptor
});
