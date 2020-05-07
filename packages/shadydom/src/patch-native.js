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
import {patchProperties} from './utils.js';
import {getInnerHTML} from './innerHTML.js';

const hasDescriptors = utils.settings.hasDescriptors;
export const NATIVE_PREFIX = utils.NATIVE_PREFIX;

// Object on which raw native methods are stored.
// e.g. `nativeMethods.querySelector.call(node, selector)`
// same as `node.querySelector(selector)`
export const nativeMethods = {
  /** @this {Element} */
  querySelector(selector) {
    return this[NATIVE_PREFIX + 'querySelector'](selector);
  },
  /** @this {Element} */
  querySelectorAll(selector) {
    return this[NATIVE_PREFIX + 'querySelectorAll'](selector);
  }
};
// Object on which raw native accessors are available via `accessorName(node)`.
// e.g. `nativeTree.firstChild(node)`
// same as `node.firstChild`
export const nativeTree = {};

const installNativeAccessor = (name) => {
  nativeTree[name] = (node) => node[NATIVE_PREFIX + name];
}

const installNativeMethod = (name, fn) => {
  if (!nativeMethods[name]) {
    nativeMethods[name] = fn;
  }
}


const defineNativeAccessors = (proto, descriptors) => {
  patchProperties(proto, descriptors, NATIVE_PREFIX);
  // make native accessors available to users
  for (let prop in descriptors) {
    installNativeAccessor(prop);
  }
}

const copyProperties = (proto, list = []) => {
  for (let i = 0; i < list.length; i++) {
    const name = list[i];
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (descriptor) {
      Object.defineProperty(proto, NATIVE_PREFIX + name, descriptor);
      // make native methods/accessors available to users
      if (descriptor.value) {
        installNativeMethod(name, descriptor.value);
      } else {
        installNativeAccessor(name);
      }
    }
  }
}

/** @type {!TreeWalker} */
const nodeWalker = document.createTreeWalker(document, NodeFilter.SHOW_ALL,
  null, false);

/** @type {!TreeWalker} */
const elementWalker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT,
  null, false);

/** @type {!Document} */
const inertDoc = document.implementation.createHTMLDocument('inert');

const clearNode = node => {
  let firstChild;
  while ((firstChild = node[NATIVE_PREFIX + 'firstChild'])) {
    node[NATIVE_PREFIX + 'removeChild'](firstChild);
  }
}

const ParentNodeAccessors = [
  'firstElementChild',
  'lastElementChild',
  'children',
  'childElementCount',
];

const ParentNodeMethods = [
  'querySelector',
  'querySelectorAll'
  // 'append', 'prepend'
];

export const addNativePrefixedProperties = () => {

  // EventTarget
  const eventProps = [
    'dispatchEvent',
    'addEventListener',
    'removeEventListener'
  ];
  if (window.EventTarget) {
    copyProperties(window.EventTarget.prototype, eventProps);
  } else {
    copyProperties(Node.prototype, eventProps);
    copyProperties(Window.prototype, eventProps);
  }


  // Node
  if (hasDescriptors) {
    copyProperties(Node.prototype, [
      'parentNode',
      'firstChild',
      'lastChild',
      'previousSibling',
      'nextSibling',
      'childNodes',
      'parentElement',
      'textContent',
    ]);
  } else {
    defineNativeAccessors(Node.prototype, {
      parentNode: {
        /** @this {Node} */
        get() {
          nodeWalker.currentNode = this;
          return nodeWalker.parentNode();
        }
      },
      firstChild: {
        /** @this {Node} */
        get() {
          nodeWalker.currentNode = this;
          return nodeWalker.firstChild();
        }
      },
      lastChild: {
        /** @this {Node} */
        get() {
          nodeWalker.currentNode = this;
          return nodeWalker.lastChild();
        }

      },
      previousSibling: {
        /** @this {Node} */
        get() {
          nodeWalker.currentNode = this;
          return nodeWalker.previousSibling();
        }
      },
      nextSibling: {
        /** @this {Node} */
        get() {
          nodeWalker.currentNode = this;
          return nodeWalker.nextSibling();
        }
      },
      // TODO(sorvell): make this a NodeList or whatever
      childNodes: {
        /** @this {Node} */
        get() {
          const nodes = [];
          nodeWalker.currentNode = this;
          let n = nodeWalker.firstChild();
          while (n) {
            nodes.push(n);
            n = nodeWalker.nextSibling();
          }
          return nodes;
        }
      },
      parentElement: {
        /** @this {Node} */
        get() {
          elementWalker.currentNode = this;
          return elementWalker.parentNode();
        }
      },
      textContent: {
        /** @this {Node} */
        get() {
          /* eslint-disable no-case-declarations */
          switch (this.nodeType) {
            case Node.ELEMENT_NODE:
            case Node.DOCUMENT_FRAGMENT_NODE:
              // TODO(sorvell): This cannot be a single TreeWalker that's reused
              // at least for Safari 9, but it's unclear why.
              const textWalker = document.createTreeWalker(this, NodeFilter.SHOW_TEXT,
                null, false);
              let content = '', n;
              while ( (n = textWalker.nextNode()) ) {
                // TODO(sorvell): can't use textContent since we patch it on Node.prototype!
                // However, should probably patch it only on element.
                content += n.nodeValue;
              }
              return content;
            default:
              return this.nodeValue;
          }
        },
        // Needed on browsers that do not proper accessors (e.g. old versions of Chrome)
        /** @this {Node} */
        set(value) {
          if (typeof value === 'undefined' || value === null) {
            value = ''
          }
          switch (this.nodeType) {
            case Node.ELEMENT_NODE:
            case Node.DOCUMENT_FRAGMENT_NODE:
              clearNode(this);
              // Document fragments must have no childnodes if setting a blank string
              if (value.length > 0 || this.nodeType === Node.ELEMENT_NODE) {
                // Note: old Chrome versions require 2nd argument here
                this[NATIVE_PREFIX + 'insertBefore'](document.createTextNode(value), undefined);
              }
              break;
            default:
              // TODO(sorvell): can't do this if patch nodeValue.
              this.nodeValue = value;
              break;
          }
        }
      }
    });
  }

  copyProperties(Node.prototype, [
    'appendChild',
    'insertBefore',
    'removeChild',
    'replaceChild',
    'cloneNode',
    'contains'
  ]);

  // NOTE, on some browsers IE 11 / Edge 15 some properties are incorrectly on HTMLElement
  copyProperties(HTMLElement.prototype, [
    'parentElement',
    'contains'
  ]);

  const ParentNodeWalkerDescriptors = {
    firstElementChild: {
      /** @this {ParentNode} */
      get() {
        elementWalker.currentNode = this;
        return elementWalker.firstChild();
      }
    },
    lastElementChild: {
      /** @this {ParentNode} */
      get() {
        elementWalker.currentNode = this;
        return elementWalker.lastChild();
      }
    },
    children: {
      /** @this {ParentNode} */
      get() {
        let nodes = [];
        elementWalker.currentNode = this;
        let n = elementWalker.firstChild();
        while (n) {
          nodes.push(n);
          n = elementWalker.nextSibling();
        }
        return utils.createPolyfilledHTMLCollection(nodes);
      }
    },
    childElementCount: {
      /** @this {ParentNode} */
      get() {
        if (this.children) {
          return this.children.length;
        }
        return 0;
      }
    }
  };

  // Element
  if (hasDescriptors) {
    copyProperties(Element.prototype, ParentNodeAccessors);

    copyProperties(Element.prototype, [
      'previousElementSibling',
      'nextElementSibling',
      'innerHTML',
      'className'
    ]);

    // NOTE, on some browsers IE 11 / Edge 15 some properties are incorrectly on HTMLElement
    copyProperties(HTMLElement.prototype, [
      'children',
      'innerHTML',
      'className'
    ]);
  } else {
    defineNativeAccessors(Element.prototype, ParentNodeWalkerDescriptors);
    defineNativeAccessors(Element.prototype, {
      previousElementSibling: {
        /** @this {Element} */
        get() {
          elementWalker.currentNode = this;
          return elementWalker.previousSibling();
        }
      },
      nextElementSibling: {
        /** @this {Element} */
        get() {
          elementWalker.currentNode = this;
          return elementWalker.nextSibling();
        }
      },
      innerHTML: {
        /** @this {Element} */
        get() {
          return getInnerHTML(this, utils.nativeChildNodesArray);
        },
        // Needed on browsers that do not proper accessors (e.g. old versions of Chrome)
        /** @this {Element} */
        set(value) {
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
          htmlContainer.innerHTML = value;
          const newContent = this.localName === 'template' ?
            /** @type {HTMLTemplateElement} */(htmlContainer).content : htmlContainer;
          let firstChild;
          while ((firstChild = newContent[NATIVE_PREFIX + 'firstChild'])) {
            // Note: old Chrome versions require 2nd argument here
            content[NATIVE_PREFIX + 'insertBefore'](firstChild, undefined);
          }
        }
      },
      className: {
        /** @this {Element} */
        get() {
          return this.getAttribute('class') || '';
        },
        /** @this {Element} */
        set(value) {
          this.setAttribute('class', value);
        }
      }
    });
  }

  copyProperties(Element.prototype, [
    'setAttribute',
    'getAttribute',
    'hasAttribute',
    'removeAttribute',
    // on older Safari, these are on Element.
    'focus',
    'blur',
  ]);
  copyProperties(Element.prototype, ParentNodeMethods);

  // HTMLElement
  copyProperties(HTMLElement.prototype, [
    'focus',
    'blur'
  ]);

  // HTMLTemplateElement
  if (window.HTMLTemplateElement) {
    copyProperties(window.HTMLTemplateElement.prototype, ['innerHTML']);
  }

  // DocumentFragment
  if (hasDescriptors) {
    // NOTE, IE 11 does not have on DocumentFragment
    // firstElementChild
    // lastElementChild
    copyProperties(DocumentFragment.prototype, ParentNodeAccessors);
  } else {
    defineNativeAccessors(DocumentFragment.prototype, ParentNodeWalkerDescriptors);
  }

  copyProperties(DocumentFragment.prototype, ParentNodeMethods);

  // Document
  if (hasDescriptors) {
    copyProperties(Document.prototype, ParentNodeAccessors);
    copyProperties(Document.prototype, [
      'activeElement'
    ]);
  } else {
    defineNativeAccessors(Document.prototype, ParentNodeWalkerDescriptors);
  }

  copyProperties(Document.prototype, [
    'importNode',
    'getElementById'
  ]);
  copyProperties(Document.prototype, ParentNodeMethods);

};
