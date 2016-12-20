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
import {getInnerHTML} from './innerHTML'
import {getProperty, hasProperty} from './logical-properties'
import * as nativeTree from './native-tree'

function generateSimpleDescriptor(prop) {
  return {
    get() {
      let l = getProperty(this, prop);
      return l !== undefined ? l : nativeTree[prop](this);
    },
    configurable: true
  }
}

let domParser = new DOMParser();

function insertDOMFrom(target, from) {
  let c$ = Array.from(from.childNodes);
  for (let i=0; i < c$.length; i++) {
    target.appendChild(c$[i]);
  }
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

let nativeActiveElementDescriptor = Object.getOwnPropertyDescriptor(
  Document.prototype, 'activeElement');
function getDocumentActiveElement() {
  if (nativeActiveElementDescriptor && nativeActiveElementDescriptor.get) {
    return nativeActiveElementDescriptor.get.call(document);
  } else if (!utils.settings.hasDescriptors) {
    return document.activeElement;
  }
}

function activeElementForNode(node) {
  let active = getDocumentActiveElement();
  if (!active) {
    return null;
  }
  let isShadyRoot = !!(utils.isShadyRoot(node));
  if (node !== document) {
    // If this node isn't a document or shady root, then it doesn't have
    // an active element.
    if (!isShadyRoot) {
      return null;
    }
    // If this shady root's host is the active element or the active
    // element is not a descendant of the host (in the composed tree),
    // then it doesn't have an active element.
    if (node.host === active ||
        !node.host.contains(active)) {
      return null;
    }
  }
  // This node is either the document or a shady root of which the active
  // element is a (composed) descendant of its host; iterate upwards to
  // find the active element's most shallow host within it.
  let activeRoot = utils.ownerShadyRootForNode(active);
  while (activeRoot && activeRoot !== node) {
    active = activeRoot.host;
    activeRoot = utils.ownerShadyRootForNode(active);
  }
  if (node === document) {
    // This node is the document, so activeRoot should be null.
    return activeRoot ? null : active;
  } else {
    // This node is a non-document shady root, and it should be
    // activeRoot.
    return activeRoot === node ? active : null;
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
      if (hasProperty(this, 'firstChild')) {
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
      if (hasProperty(this, 'firstChild')) {
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
        clearNode(this);
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
      if (hasProperty(this, 'firstChild')) {
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
      if (hasProperty(this, 'lastChild')) {
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
      if (hasProperty(this, 'nextSibling')) {
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
      if (hasProperty(this, 'previousSibling')) {
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
      if (hasProperty(this, 'firstChild')) {
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
      if (hasProperty(this, 'firstChild')) {
        return getInnerHTML(this);
      } else {
        return nativeTree.innerHTML(this);
      }
    },
    set(text) {
      clearNode(this);
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

export let ExtraInsideAccessors = {
  shadowRoot: {
    get() {
      return this.shadyRoot;
    },
    set(value) {
      this.shadyRoot = value;
    },
    configurable: true
  }
};

export let OtherAccessors = {

  activeElement: {
    get() {
      return activeElementForNode(this);
    },
    set() {},
    configurable: true
  }

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
    if (!(element.__shady && element.__shady.__outsideAccessors)) {
      element.__shady = element.__shady || {};
      element.__shady.__outsideAccessors = true;
      tryExtend(element, OutsideAccessors, true);
    }
  }

export let ensureInsideAccessors = utils.settings.hasDescriptors ?
  function() {} : function(element) {
    if (!(element.__shady && element.__shady.__insideAccessors)) {
      element.__shady = element.__shady || {};
      element.__shady.__insideAccessors = true;
      tryExtend(element, InsideAccessors, true);
      tryExtend(element, ExtraInsideAccessors, true);
    }
  }
