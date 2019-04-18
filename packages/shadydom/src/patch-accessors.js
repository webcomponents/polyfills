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
import {getInnerHTML} from './innerHTML.js';
import {accessors as nativeTree} from './native-tree.js';
import {nodeAccessors as nativeAccessors} from './native-tree-accessors.js';
import {contains as nativeContains} from './native-methods.js';
import {ensureShadyDataForNode, shadyDataForNode} from './shady-data.js';

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

const hasDescriptors = utils.settings.hasDescriptors;
const inertDoc = document.implementation.createHTMLDocument('inert');

const nativeIsConnectedAccessors =
/** @type {ObjectPropertyDescriptor} */(
  Object.getOwnPropertyDescriptor(Node.prototype, 'isConnected')
);

const nativeIsConnected = nativeIsConnectedAccessors && nativeIsConnectedAccessors.get;

const nativeActiveElementDescriptor =
  /** @type {ObjectPropertyDescriptor} */(
    Object.getOwnPropertyDescriptor(Document.prototype, 'activeElement')
  );
function getDocumentActiveElement() {
  if (nativeActiveElementDescriptor && nativeActiveElementDescriptor.get) {
    return nativeActiveElementDescriptor.get.call(document);
  } else if (!utils.settings.hasDescriptors) {
    return document.activeElement;
  }
}

function activeElementForNode(node) {
  let active = getDocumentActiveElement();
  // In IE11, activeElement might be an empty object if the document is
  // contained in an iframe.
  // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10998788/
  if (!active || !active.nodeType) {
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
        !nativeContains.call(node.host, active)) {
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

let OutsideAccessors = {

  parentElement: {
    /** @this {Node} */
    get() {
      const nodeData = shadyDataForNode(this);
      let l = nodeData && nodeData.parentNode;
      if (l && l.nodeType !== Node.ELEMENT_NODE) {
        l = null;
      }
      return l !== undefined ? l : nativeTree.parentElement(this);
    },
    configurable: true
  },

  parentNode: {
    /** @this {Node} */
    get() {
      const nodeData = shadyDataForNode(this);
      const l = nodeData && nodeData.parentNode;
      return l !== undefined ? l : nativeTree.parentNode(this);
    },
    configurable: true
  },

  nextSibling: {
    /** @this {Node} */
    get() {
      const nodeData = shadyDataForNode(this);
      const l = nodeData && nodeData.nextSibling;
      return l !== undefined ? l : nativeTree.nextSibling(this);
    },
    configurable: true
  },

  previousSibling: {
    /** @this {Node} */
    get() {
      const nodeData = shadyDataForNode(this);
      const l = nodeData && nodeData.previousSibling;
      return l !== undefined ? l : nativeTree.previousSibling(this);
    },
    configurable: true
  },

  // fragment, element, document
  nextElementSibling: {
    /**
     * @this {HTMLElement}
     */
    get() {
      const nodeData = shadyDataForNode(this);
      if (nodeData && nodeData.nextSibling !== undefined) {
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
    /**
     * @this {HTMLElement}
     */
    get() {
      const nodeData = shadyDataForNode(this);
      if (nodeData && nodeData.previousSibling !== undefined) {
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
  }

};

export const ClassNameAccessor = {
  className: {
    /**
     * @this {HTMLElement}
     */
    get() {
      return this.getAttribute('class') || '';
    },
    /**
     * @this {HTMLElement}
     */
    set(value) {
      this.setAttribute('class', value);
    },
    configurable: true
  }
}

export const IsConnectedAccessor = {

  isConnected: {
    /**
     * @this {Node}
     */
    get() {
      if (nativeIsConnected && nativeIsConnected.call(this)) {
        return true;
      }
      if (this.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
        return false;
      }
      // Fast path for distributed nodes.
      const ownerDocument = this.ownerDocument;
      if (utils.hasDocumentContains) {
        if (nativeContains.call(ownerDocument, this)) {
          return true;
        }
      } else if (ownerDocument.documentElement &&
        nativeContains.call(ownerDocument.documentElement, this)) {
        return true;
      }
      // Slow path for non-distributed nodes.
      let node = this;
      while (node && !(node instanceof Document)) {
        node = node.parentNode || (utils.isShadyRoot(node) ? /** @type {ShadowRoot} */(node).host : undefined);
      }
      return !!(node && node instanceof Document);
    },
    configurable: true
  }
};

let InsideAccessors = {

  childNodes: {
    /**
     * @this {HTMLElement}
     */
    get() {
      let childNodes;
      if (utils.isTrackingLogicalChildNodes(this)) {
        const nodeData = shadyDataForNode(this);
        if (!nodeData.childNodes) {
          nodeData.childNodes = [];
          for (let n=this.firstChild; n; n=n.nextSibling) {
            nodeData.childNodes.push(n);
          }
        }
        childNodes = nodeData.childNodes;
      } else {
        childNodes = nativeTree.childNodes(this);
      }
      childNodes.item = function(index) {
        return childNodes[index];
      }
      return childNodes;
    },
    configurable: true
  },

  childElementCount: {
    /** @this {HTMLElement} */
    get() {
      return this.children.length;
    },
    configurable: true
  },

  firstChild: {
    /** @this {HTMLElement} */
    get() {
      const nodeData = shadyDataForNode(this);
      const l = nodeData && nodeData.firstChild;
      return l !== undefined ? l : nativeTree.firstChild(this);
    },
    configurable: true
  },

  lastChild: {
  /** @this {HTMLElement} */
    get() {
      const nodeData = shadyDataForNode(this);
      const l = nodeData && nodeData.lastChild;
      return l !== undefined ? l : nativeTree.lastChild(this);
    },
    configurable: true
  },

  textContent: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (utils.isTrackingLogicalChildNodes(this)) {
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
    /**
     * @this {HTMLElement}
     * @param {string} text
     */
    set(text) {
      if (typeof text === 'undefined' || text === null) {
        text = ''
      }
      switch (this.nodeType) {
        case Node.ELEMENT_NODE:
        case Node.DOCUMENT_FRAGMENT_NODE:
          if (!utils.isTrackingLogicalChildNodes(this) && hasDescriptors) {
            // may be removing a nested slot but fast path if we know we are not.
            const firstChild = this.firstChild;
            if (firstChild != this.lastChild ||
              (firstChild && firstChild.nodeType != Node.TEXT_NODE)) {
              clearNode(this);
            }
            nativeAccessors.textContent.set.call(this, text);
          } else {
            clearNode(this);
            // Document fragments must have no childnodes if setting a blank string
            if (text.length > 0 || this.nodeType === Node.ELEMENT_NODE) {
              this.appendChild(document.createTextNode(text));
            }
          }
          break;
        default:
          // TODO(sorvell): can't do this if patch nodeValue.
          this.nodeValue = text;
          break;
      }
    },
    configurable: true
  },

  // fragment, element, document
  firstElementChild: {
    /**
     * @this {HTMLElement}
     */
    get() {
      const nodeData = shadyDataForNode(this);
      if (nodeData && nodeData.firstChild !== undefined) {
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
    /**
     * @this {HTMLElement}
     */
    get() {
      const nodeData = shadyDataForNode(this);
      if (nodeData && nodeData.lastChild !== undefined) {
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

  children: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (!utils.isTrackingLogicalChildNodes(this)) {
        return nativeTree.children(this);
      }
      return utils.createPolyfilledHTMLCollection(Array.prototype.filter.call(this.childNodes, function(n) {
        return (n.nodeType === Node.ELEMENT_NODE);
      }));
    },
    configurable: true
  },

  // element (HTMLElement on IE11)
  innerHTML: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (utils.isTrackingLogicalChildNodes(this)) {
        const content = this.localName === 'template' ?
        /** @type {HTMLTemplateElement} */(this).content : this;
        return getInnerHTML(content);
      } else {
        return nativeTree.innerHTML(this);
      }
    },
    /**
     * @this {HTMLElement}
     */
    set(text) {
      const content = this.localName === 'template' ?
        /** @type {HTMLTemplateElement} */(this).content : this;
      clearNode(content);
      const containerName = this.localName || 'div';
      let htmlContainer;
      if (!this.namespaceURI || this.namespaceURI === inertDoc.namespaceURI) {
        htmlContainer = inertDoc.createElement(containerName);
      } else {
        htmlContainer = inertDoc.createElementNS(this.namespaceURI, containerName);
      }
      if (hasDescriptors) {
        nativeAccessors.innerHTML.set.call(htmlContainer, text);
      } else {
        htmlContainer.innerHTML = text;
      }
      const newContent = this.localName === 'template' ?
        /** @type {HTMLTemplateElement} */(htmlContainer).content : htmlContainer;
      while (newContent.firstChild) {
        content.appendChild(newContent.firstChild);
      }
    },
    configurable: true
  }

};

// Note: Can be patched on element prototype on all browsers.
// Must be patched on instance on browsers that support native Shadow DOM
// but do not have builtin accessors (old Chrome).
export let ShadowRootAccessor = {

  shadowRoot: {
    /**
     * @this {HTMLElement}
     */
    get() {
      const nodeData = shadyDataForNode(this);
      return nodeData && nodeData.publicRoot || null;
    },
    configurable: true
  }
};

// Note: Can be patched on document prototype on browsers with builtin accessors.
// Must be patched separately on simulated ShadowRoot.
// Must be patched as `_activeElement` on browsers without builtin accessors.
export let ActiveElementAccessor = {

  activeElement: {
    /**
     * @this {HTMLElement}
     */
    get() {
      return activeElementForNode(this);
    },
    /**
     * @this {HTMLElement}
     */
    set() {},
    configurable: true
  }

};

// patch a group of descriptors on an object only if it exists or if the `force`
// argument is true.
/**
 * @param {!Object} obj
 * @param {!Object} descriptors
 * @param {boolean=} force
 */
function patchAccessorGroup(obj, descriptors, force) {
  for (let p in descriptors) {
    let objDesc = Object.getOwnPropertyDescriptor(obj, p);
    if ((objDesc && objDesc.configurable) ||
      (!objDesc && force)) {
      Object.defineProperty(obj, p, descriptors[p]);
    } else if (force) {
      console.warn('Could not define', p, 'on', obj); // eslint-disable-line no-console
    }
  }
}

// patch dom accessors on proto where they exist
export function patchAccessors(proto) {
  patchAccessorGroup(proto, OutsideAccessors);
  patchAccessorGroup(proto, ClassNameAccessor);
  patchAccessorGroup(proto, InsideAccessors);
  patchAccessorGroup(proto, ActiveElementAccessor);
}

export function patchShadowRootAccessors(proto) {
  proto.__proto__ = DocumentFragment.prototype;
  // ensure element descriptors (IE/Edge don't have em)
  patchAccessorGroup(proto, OutsideAccessors, true);
  patchAccessorGroup(proto, InsideAccessors, true);
  patchAccessorGroup(proto, ActiveElementAccessor, true);
  // Ensure native properties are all safely wrapped since ShadowRoot is not an
  // actual DocumentFragment instance.
  Object.defineProperties(proto, {
    nodeType: {
      value: Node.DOCUMENT_FRAGMENT_NODE,
      configurable: true
    },
    nodeName: {
      value: '#document-fragment',
      configurable: true
    },
    nodeValue: {
      value: null,
      configurable: true
    }
  });
  // make undefined
  [
    'localName',
    'namespaceURI',
    'prefix'
  ].forEach((prop) => {
    Object.defineProperty(proto, prop, {
      value: undefined,
      configurable: true
    });
  });
  // defer properties to host
  [
    'ownerDocument',
    'baseURI',
    'isConnected'
  ].forEach((prop) => {
    Object.defineProperty(proto, prop, {
      get() {
        return this.host[prop];
      },
      configurable: true
    });
  });
}

// ensure an element has patched "outside" accessors; no-op when not needed
export let patchOutsideElementAccessors = utils.settings.hasDescriptors ?
  function() {} : function(element) {
    const sd = ensureShadyDataForNode(element);
    if (!sd.__outsideAccessors) {
      sd.__outsideAccessors = true;
      patchAccessorGroup(element, OutsideAccessors, true);
      patchAccessorGroup(element, ClassNameAccessor, true);
    }
  }

// ensure an element has patched "inside" accessors; no-op when not needed
export let patchInsideElementAccessors = utils.settings.hasDescriptors ?
  function() {} : function(element) {
    const sd = ensureShadyDataForNode(element);
    if (!sd.__insideAccessors) {
      patchAccessorGroup(element, InsideAccessors, true);
      patchAccessorGroup(element, ShadowRootAccessor, true);
    }
  }
