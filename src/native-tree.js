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

import {getInnerHTML} from './innerHTML'

let nodeWalker = document.createTreeWalker(document, NodeFilter.SHOW_ALL,
  null, false);

let elementWalker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT,
  null, false);

export let nativeTree = {

  parentNode(node) {
    nodeWalker.currentNode = node;
    return nodeWalker.parentNode();
  },

  firstChild(node) {
    nodeWalker.currentNode = node;
    return nodeWalker.firstChild();
  },

  lastChild(node) {
    nodeWalker.currentNode = node;
    return nodeWalker.lastChild();
  },

  previousSibling(node) {
    nodeWalker.currentNode = node;
    return nodeWalker.previousSibling();
  },

  nextSibling(node) {
    nodeWalker.currentNode = node;
    return nodeWalker.nextSibling();
  },

  childNodes(node) {
    let nodes = [];
    nodeWalker.currentNode = node;
    let n = nodeWalker.firstChild();
    while (n) {
      nodes.push(n);
      n = nodeWalker.nextSibling();
    }
    return nodes;
  },

  parentElement(node) {
    elementWalker.currentNode = node;
    return elementWalker.parentNode();
  },

  firstElementChild(node) {
    elementWalker.currentNode = node;
    return elementWalker.firstChild();
  },

  lastElementChild(node) {
    elementWalker.currentNode = node;
    return elementWalker.lastChild();
  },

  previousElementSibling(node) {
    elementWalker.currentNode = node;
    return elementWalker.previousSibling();
  },

  nextElementSibling(node) {
    elementWalker.currentNode = node;
    return elementWalker.nextSibling();
  },

  children(node) {
    let nodes = [];
    elementWalker.currentNode = node;
    let n = elementWalker.firstChild();
    while (n) {
      nodes.push(n);
      n = elementWalker.nextSibling();
    }
    return nodes;
  },

  innerHTML(node) {
    return getInnerHTML(node, (n) => this.childNodes(n));
  },

  textContent(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return node.nodeValue;
    }
    let textWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT,
      null, false);
    let content = '', n;
    while ( (n = textWalker.nextNode()) ) {
      // TODO(sorvell): can't use textContent since we patch it on Node.prototype!
      // However, should probably patch it only on element.
      content += n.nodeValue;
    }
    return content;
  }

};