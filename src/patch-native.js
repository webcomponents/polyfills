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
import {patchAccessors} from './utils.js';
import {getInnerHTML} from './innerHTML.js';

const hasDescriptors = utils.settings.hasDescriptors;
export const NATIVE_PREFIX = utils.NATIVE_PREFIX;

const defineNativeAccessors = (proto, descriptors) =>
    patchAccessors(proto, descriptors, true, NATIVE_PREFIX);

const copyAccessors = (proto, list = []) => {
  for (let i = 0; i < list.length; i++) {
    const name = list[i];
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (descriptor) {
      Object.defineProperty(proto, NATIVE_PREFIX + name, descriptor);
    }
  }
}

const nodeWalker = document.createTreeWalker(document, window.NodeFilter.SHOW_ALL,
  null, false);

const elementWalker = document.createTreeWalker(document, window.NodeFilter.SHOW_ELEMENT,
  null, false);

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

export const patchNative = () => {

  // EventTarget
  const eventProps = [
    'dispatchEvent',
    'addEventListener',
    'removeEventListener'
  ];
  if (window.EventTarget) {
    copyAccessors(window.EventTarget.prototype, eventProps);
  } else {
    copyAccessors(window.Node.prototype, eventProps);
    copyAccessors(window.Window.prototype, eventProps);
  }


  // Node
  if (hasDescriptors) {
    copyAccessors(window.Node.prototype, [
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
    defineNativeAccessors(window.Node.prototype, {
      parentNode: {
        get() {
          nodeWalker.currentNode = this;
          return nodeWalker.parentNode();
        }
      },
      firstChild: {
        get() {
          nodeWalker.currentNode = this;
          return nodeWalker.firstChild();
        }
      },
      lastChild: {
        get() {
          nodeWalker.currentNode = this;
          return nodeWalker.lastChild();
        }

      },
      previousSibling: {
        get() {
          nodeWalker.currentNode = this;
          return nodeWalker.previousSibling();
        }
      },
      nextSibling: {
        get() {
          nodeWalker.currentNode = this;
          return nodeWalker.nextSibling();
        }
      },
      // TODO(sorvell): make this a NodeList or whatever
      childNodes: {
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
        get() {
          elementWalker.currentNode = this;
          return elementWalker.parentNode();
        }
      },
      textContent: {
        get() {
          /* eslint-disable no-case-declarations */
          switch (this.nodeType) {
            case window.Node.ELEMENT_NODE:
            case window.Node.DOCUMENT_FRAGMENT_NODE:
              let textWalker = document.createTreeWalker(this, window.NodeFilter.SHOW_TEXT,
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
        // TODO(sorvell): do we ever need this setter?
        set(value) {
          if (typeof value === 'undefined' || value === null) {
            value = ''
          }
          switch (this.nodeType) {
            case window.Node.ELEMENT_NODE:
            case window.Node.DOCUMENT_FRAGMENT_NODE:
              clearNode(this);
              // Document fragments must have no childnodes if setting a blank string
              if (value.length > 0 || this.nodeType === window.Node.ELEMENT_NODE) {
                this[NATIVE_PREFIX + 'insertBefore'](document.createTextNode(value));
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

  copyAccessors(window.Node.prototype, [
    'appendChild',
    'insertBefore',
    'removeChild',
    'replaceChild',
    'cloneNode',
    'contains'
  ]);

  const ParentNodeWalkerDescriptors = {
    firstElementChild: {
      get() {
        elementWalker.currentNode = this;
        return elementWalker.firstChild();
      }
    },
    lastElementChild: {
      get() {
        elementWalker.currentNode = this;
        return elementWalker.lastChild();
      }
    },
    children: {
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
      get() {
        return this.children.length;
      }
    }
  };

  // Element
  if (hasDescriptors) {
    copyAccessors(window.Element.prototype, ParentNodeAccessors);

    copyAccessors(window.Element.prototype, [
      'previousElementSibling',
      'nextElementSibling',
      'innerHTML'
    ]);

    // NOTE, IE 11 is the only supported browser with
    // children and innerHTML on HTMLElement instead of Element
    if (utils.settings.IS_IE) {
      copyAccessors(utils.NativeHTMLElement.prototype, [
        'children',
        'innerHTML'
      ]);
    }
  } else {
    defineNativeAccessors(window.Element.prototype, ParentNodeWalkerDescriptors);
    defineNativeAccessors(window.Element.prototype, {
      previousElementSibling: {
        get() {
          elementWalker.currentNode = this;
          return elementWalker.previousSibling();
        }
      },
      nextElementSibling: {
        get() {
          elementWalker.currentNode = this;
          return elementWalker.nextSibling();
        }
      },
      innerHTML: {
        get() {
          return getInnerHTML(this, n => n[NATIVE_PREFIX + 'childNodes']);
        },
        // TODO(sorvell): do we ever need this setter?
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
            content[NATIVE_PREFIX + 'insertBefore'](firstChild);
          }
        }
      }
    });
  }

  copyAccessors(window.Element.prototype, [
    'setAttribute',
    'getAttribute',
    'hasAttribute',
    'removeAttribute',
    // on older Safari, these are on Element.
    'focus',
    'blur',
  ]);
  copyAccessors(window.Element.prototype, ParentNodeMethods);

  // HTMLElement
  copyAccessors(window.HTMLElement.prototype, [
    'focus',
    'blur',
    // On IE these are on HTMLElement
    'contains'
  ]);

  if (hasDescriptors) {
    copyAccessors(window.HTMLElement.prototype, [
      'parentElement',
      'children',
      'innerHTML'
    ]);
  }

  // HTMLTemplateElement
  if (window.HTMLTemplateElement) {
    copyAccessors(window.HTMLTemplateElement.prototype, ['innerHTML']);
  }

  // DocumentFragment
  if (hasDescriptors) {
    // NOTE, IE 11 does not have on DocumentFragment
    // firstElementChild
    // lastElementChild
    copyAccessors(window.DocumentFragment.prototype, ParentNodeAccessors);
  } else {
    defineNativeAccessors(window.DocumentFragment.prototype, ParentNodeWalkerDescriptors);
  }

  copyAccessors(window.DocumentFragment.prototype, ParentNodeMethods);

  // Document
  if (hasDescriptors) {
    copyAccessors(window.DocumentFragment.prototype, ParentNodeAccessors);
    copyAccessors(window.Document.prototype, [
      'activeElement'
    ]);
  } else {
    defineNativeAccessors(window.Document.prototype, ParentNodeWalkerDescriptors);
  }

  copyAccessors(window.Document.prototype, [
    'importNode',
    'getElementById'
  ]);
  copyAccessors(window.Document.prototype, ParentNodeMethods);

};