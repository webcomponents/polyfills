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
import {getInnerHTML} from './innerHTML'
import * as logicalTree from './logical-tree'
import * as nativeTree from './native-tree'

function generateSimpleDescriptor(prop) {
  return {
    get() {
      let l = logicalTree.getProperty(this, prop);
      return l !== undefined ? l : nativeTree[prop](this);
    },
    configurable: true
  }
}

let assignedSlotDesc = {
  get() {
    return logicalTree.getProperty(this, 'assignedSlot') || null;
  },
  configurable: true
};

let NodeMixin = {

  appendChild(node) {
    return mutation.insertBefore(this, node);
  },

  insertBefore(node, ref_node) {
    return mutation.insertBefore(this, node, ref_node);
  },

  /**
    Removes the given `node` from the element's `lightChildren`.
    This method also performs dom composition.
  */
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
  }
};

Object.defineProperties(NodeMixin, {

  parentElement: generateSimpleDescriptor('parentElement'),

  parentNode: generateSimpleDescriptor('parentNode'),

  nextSibling: generateSimpleDescriptor('nextSibling'),

  previousSibling: generateSimpleDescriptor('previousSibling'),

  childNodes: {
    get() {
      if (logicalTree.hasProperty(this, 'firstChild')) {
        if (!this.__shady.childNodes) {
          this.__shady.childNodes = [];
          for (let n=this.firstChild; n; n=n.nextSibling) {
            this.__shady.childNodes.push(n);
          }
        }
        return this.__shady.childNodes;
      } else {
        return nativeTree.childNodes(this);
      }
    },
    configurable: true
  },

  firstChild: generateSimpleDescriptor('firstChild'),

  lastChild: generateSimpleDescriptor('lastChild'),

  textContent: {
    get() {
      if (logicalTree.hasProperty(this, 'firstChild')) {
        let tc = [];
        for (let i = 0, cn = this.childNodes, c; (c = cn[i]); i++) {
          if (c.nodeType !== Node.COMMENT_NODE) {
            tc.push(c.textContent);
          }
        }
        return tc.join('');
      } else {
        return nativeTree.textContent(this);
      }
    },
    set(text) {
      if (this.nodeType !== Node.ELEMENT_NODE) {
        // TODO(sorvell): can't do this if patch nodeValue.
        this.nodeValue = text;
      } else {
        mutation.clearNode(this);
        if (text) {
          this.appendChild(document.createTextNode(text));
        }
      }
    },
    configurable: true
  }
});

// NOTE: For some reason `Text` redefines `assignedSlot`
let TextMixin = utils.extend({}, NodeMixin);
Object.defineProperties(TextMixin, {
  assignedSlot: assignedSlotDesc
})

let FragmentMixin = {

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

let childrenDescriptor = {
  get() {
    if (logicalTree.hasProperty(this, 'firstChild')) {
      return Array.prototype.filter.call(this.childNodes, function(n) {
        return (n.nodeType === Node.ELEMENT_NODE);
      });
    } else {
      return nativeTree.children(this);
    }
  },
  configurable: true
};

let domParser = new DOMParser();

let insertDOMFrom = function(target, from) {
  let c$ = Array.from(from.childNodes);
  for (let i=0; i < c$.length; i++) {
    target.appendChild(c$[i]);
  }
}

let innerHTMLDescriptor = {
  get() {
    if (logicalTree.hasProperty(this, 'firstChild')) {
      return getInnerHTML(this);
    } else {
      return nativeTree.innerHTML(this);
    }
  },
  set(text) {
    mutation.clearNode(this);
    let doc = domParser.parseFromString(text, 'text/html');
    if (doc.head) {
      insertDOMFrom(this, doc.head);
    }
    if (doc.body) {
      insertDOMFrom(this, doc.body);
    }
  },
  configurable: true
};

Object.defineProperties(FragmentMixin, {

  children: childrenDescriptor,

  innerHTML: innerHTMLDescriptor,

  firstElementChild: {
    get() {
      if (logicalTree.hasProperty(this, 'firstChild')) {
        let n = this.firstChild;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.nextSibling;
        }
        return n;
      } else {
        return nativeTree.firstElementChild(this);
      }
    },
    configurable: true
  },

  lastElementChild: {
    get() {
      if (logicalTree.hasProperty(this, 'lastChild')) {
        let n = this.lastChild;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.previousSibling;
        }
        return n;
      } else {
        return nativeTree.lastElementChild(this);
      }
    },
    configurable: true
  }

});

let SlotMixin = {
  assignedNodes(options) {
    if (this.localName === 'slot') {
      mutation.renderRootNode(this);
      return this.__shady ?
        ((options && options.flatten ? this.__shady.distributedNodes :
        this.__shady.assignedNodes) || []) :
        [];
    }
  }
}

let ElementMixin = utils.extendAll({}, FragmentMixin, SlotMixin, {

  setAttribute(name, value) {
    mutation.setAttribute(this, name, value);
  },

  removeAttribute(name) {
    mutation.removeAttribute(this, name);
  }
});

Object.defineProperties(ElementMixin, {

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

  nextElementSibling: {
    get() {
      if (logicalTree.hasProperty(this, 'nextSibling')) {
        let n = this.nextSibling;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.nextSibling;
        }
        return n;
      } else {
        return nativeTree.nextElementSibling(this);
      }
    },
    configurable: true
  },

  previousElementSibling: {
    get() {
      if (logicalTree.hasProperty(this, 'previousSibling')) {
        let n = this.previousSibling;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.previousSibling;
        }
        return n;
      } else {
        return nativeTree.previousElementSibling(this);
      }
    },
    configurable: true
  },

  slot: {
    get() {
      return this.getAttribute('slot');
    },
    set(value) {
      this.setAttribute('slot', value);
    }
  }

});

let HTMLElementMixin = {};

Object.defineProperties(HTMLElementMixin, {

  children: childrenDescriptor,

  innerHTML: innerHTMLDescriptor

});

let ActiveElementMixin = {};
Object.defineProperties(ActiveElementMixin, {
  activeElement: mutation.activeElementDescriptor
});

let UnderActiveElementMixin = {};
Object.defineProperties(UnderActiveElementMixin, {
  _activeElement: mutation.activeElementDescriptor
});

export let Mixins = {

  Node: NodeMixin,

  Fragment: FragmentMixin,

  Text: TextMixin,

  Slot: SlotMixin,

  Element: ElementMixin,

  HTMLElement: HTMLElementMixin,

  // Note: activeElement cannot be patched on document (on some browsers)
  Document: utils.extendAll({}, ElementMixin,
    UnderActiveElementMixin, ActiveElementMixin)
};

export let patchProto = function(proto, mixin, ifExists) {
  proto.__nativeProps = Object.create(proto.__nativeProps || {});
  let n$ = Object.getOwnPropertyNames(mixin);
  for (let i=0, n; (i<n$.length) && (n=n$[i]); i++) {
    let sd = Object.getOwnPropertyDescriptor(proto, n);
    if (sd) {
      if (!sd.configurable) {
        window.console.warn('Could not patch', n, 'on', proto);
        return;
      }
      proto.__nativeProps[n] = sd;
    }
    if (!ifExists || (sd && sd.configurable)) {
      let md = Object.getOwnPropertyDescriptor(mixin, n);
      Object.defineProperty(proto, n, md);
    }
  }
}

export let getComposedInnerHTML = function(node) {
  return getInnerHTML(node, (n) => nativeTree.childNodes(n));
}

export let getComposedChildNodes = function(node) {
  return nativeTree.childNodes(node);
}