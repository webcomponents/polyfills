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

let domParser = new DOMParser();

let insertDOMFrom = function(target, from) {
  let c$ = Array.from(from.childNodes);
  for (let i=0; i < c$.length; i++) {
    target.appendChild(c$[i]);
  }
}

export let OutsideAccessors = {
  // node...
  parentElement: generateSimpleDescriptor('parentElement'),

  parentNode: generateSimpleDescriptor('parentNode'),

  nextSibling: generateSimpleDescriptor('nextSibling'),

  previousSibling: generateSimpleDescriptor('previousSibling'),

  className: {
    get() {
      return this.getAttribute('class');
    },
    set(value) {
      this.setAttribute('class', value);
    },
    configurable: true
  }
};

export let InsideAccessors = {
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
  },

  // fragment, element, document
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

  children: {
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
  },

  // element (HTMLElement on IE11)
  innerHTML: {
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
  }
};

export let OtherAccessors = {

  activeElement: mutation.activeElementDescriptor

};

export let getComposedInnerHTML = function(node) {
  return getInnerHTML(node, (n) => nativeTree.childNodes(n));
}

export let getComposedChildNodes = function(node) {
  return nativeTree.childNodes(node);
}

export function tryExtend(obj, accessors, force) {
  for (let p in accessors) {
    let objDesc = Object.getOwnPropertyDescriptor(obj, p);
    if ((objDesc && objDesc.configurable) ||
      (!objDesc && force)) {
      Object.defineProperty(obj, p, accessors[p]);
    } else if (force) {
      console.warn('Could not define', p, 'on', obj);
    }
  }
}

export function tryExtendAccessors(proto) {
  tryExtend(proto, OutsideAccessors);
  tryExtend(proto, InsideAccessors);
  tryExtend(proto, OtherAccessors);
}

export let ensureOutsideAccessors = utils.settings.hasDescriptors ?
  function() {} : function(element) {
    if (!element.__shady && !element.__shady.__outsideAccessors) {
      element.__shady = element.__shady || {};
      element.__shady.__outsideAccessors = true;
      tryExtend(element, OutsideAccessors, true);
    }
  }

export let ensureInsideAccessors = utils.settings.hasDescriptors ?
  function() {} : function(element) {
    if (!element.__shady && !element.__shady.__insideAccessors) {
      element.__shady = element.__shady || {};
      element.__shady.__insideAccessors = true;
      tryExtend(element, InsideAccessors, true);
    }
  }
