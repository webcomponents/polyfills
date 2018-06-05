/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {getInnerHTML} from './innerHTML.js';
import * as utils from './utils.js';

let nodeWalker = document.createTreeWalker(document, NodeFilter.SHOW_ALL,
  null, false);

let elementWalker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT,
  null, false);

export function parentNode(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.parentNode();
}

export function firstChild(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.firstChild();
}

export function lastChild(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.lastChild();
}

export function previousSibling(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.previousSibling();
}

export function nextSibling(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.nextSibling();
}

export function childNodes(node) {
  let nodes = [];
  nodeWalker.currentNode = node;
  let n = nodeWalker.firstChild();
  while (n) {
    nodes.push(n);
    n = nodeWalker.nextSibling();
  }
  return nodes;
}

export function parentElement(node) {
  elementWalker.currentNode = node;
  return elementWalker.parentNode();
}

export function firstElementChild(node) {
  elementWalker.currentNode = node;
  return elementWalker.firstChild();
}

export function lastElementChild(node) {
  elementWalker.currentNode = node;
  return elementWalker.lastChild();
}

export function previousElementSibling(node) {
  elementWalker.currentNode = node;
  return elementWalker.previousSibling();
}

export function nextElementSibling(node) {
  elementWalker.currentNode = node;
  return elementWalker.nextSibling();
}

export function children(node) {
  let nodes = [];
  elementWalker.currentNode = node;
  let n = elementWalker.firstChild();
  while (n) {
    nodes.push(n);
    n = elementWalker.nextSibling();
  }
  return utils.createPolyfilledHTMLCollection(nodes);
}

export function innerHTML(node) {
  return getInnerHTML(node, (n) => childNodes(n));
}

export function textContent(node) {
  /* eslint-disable no-case-declarations */
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
    case Node.DOCUMENT_FRAGMENT_NODE:
      let textWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT,
        null, false);
      let content = '', n;
      while ( (n = textWalker.nextNode()) ) {
        // TODO(sorvell): can't use textContent since we patch it on Node.prototype!
        // However, should probably patch it only on element.
        content += n.nodeValue;
      }
      return content;
    default:
      return node.nodeValue;
  }
  /* eslint-enable */
}
