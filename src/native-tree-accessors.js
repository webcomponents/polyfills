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

const hasDescriptors = utils.settings.hasDescriptors;

// Find descriptor on the "lowest" native prototype. Safe as these are not
// overridden and we call these on nodes.
const nativeProtos = [Node.prototype, Element.prototype, HTMLElement.prototype];
// note, avoid Array.find for IE11 compat.
function findNativeProtoWithDescriptor(name) {
  for (let i=0; i < nativeProtos.length; i++) {
    const proto = nativeProtos[i];
    if (proto.hasOwnProperty(name)) {
      return proto;
    }
  }
}
function findNodeDescriptor(name) {
  const proto = findNativeProtoWithDescriptor(name);
  if (!proto) {
    throw Error(`Could not find descriptor for ${name}`);
  }
  return Object.getOwnPropertyDescriptor(proto, name);
}

export const nodeAccessors = hasDescriptors ? {
  parentNode: findNodeDescriptor('parentNode'),
  firstChild: findNodeDescriptor('firstChild'),
  lastChild: findNodeDescriptor('lastChild'),
  previousSibling: findNodeDescriptor('previousSibling'),
  nextSibling: findNodeDescriptor('nextSibling'),
  childNodes: findNodeDescriptor('childNodes'),
  parentElement: findNodeDescriptor('parentElement'),
  previousElementSibling: findNodeDescriptor('previousElementSibling'),
  nextElementSibling: findNodeDescriptor('nextElementSibling'),
  innerHTML: findNodeDescriptor('innerHTML'),
  textContent: findNodeDescriptor('textContent'),
  firstElementChild: findNodeDescriptor('firstElementChild'),
  lastElementChild: findNodeDescriptor('lastElementChild'),
  children: findNodeDescriptor('children'),
} : {};

export const fragmentAccessors = hasDescriptors ? {
  firstElementChild: Object.getOwnPropertyDescriptor(
    DocumentFragment.prototype, 'firstElementChild'),
  lastElementChild: Object.getOwnPropertyDescriptor(
    DocumentFragment.prototype, 'lastElementChild'),
  children: Object.getOwnPropertyDescriptor(
    DocumentFragment.prototype, 'children')
} : {};

export const documentAccessors = hasDescriptors ? {
  firstElementChild: Object.getOwnPropertyDescriptor(
    Document.prototype, 'firstElementChild'),
  lastElementChild: Object.getOwnPropertyDescriptor(
    Document.prototype, 'lastElementChild'),
  children: Object.getOwnPropertyDescriptor(
    Document.prototype, 'children')
} : {};

export function parentNode(node) {
  return nodeAccessors.parentNode.get.call(node);
}

export function firstChild(node) {
  return nodeAccessors.firstChild.get.call(node);
}

export function lastChild(node) {
  return nodeAccessors.lastChild.get.call(node);
}

export function previousSibling(node) {
  return nodeAccessors.previousSibling.get.call(node);
}

export function nextSibling(node) {
  return nodeAccessors.nextSibling.get.call(node);
}

export function childNodes(node) {
  return Array.prototype.slice.call(nodeAccessors.childNodes.get.call(node));
}

export function parentElement(node) {
  return nodeAccessors.parentElement.get.call(node);
}

export function previousElementSibling(node) {
  return nodeAccessors.previousElementSibling.get.call(node);
}

export function nextElementSibling(node) {
  return nodeAccessors.nextElementSibling.get.call(node);
}

export function innerHTML(node) {
  return nodeAccessors.innerHTML.get.call(node);
}

export function textContent(node) {
  return nodeAccessors.textContent.get.call(node);
}

export function children(node) {
  switch (node.nodeType) {
    case Node.DOCUMENT_FRAGMENT_NODE:
      return fragmentAccessors.children.get.call(node);
    case Node.DOCUMENT_NODE:
      return documentAccessors.children.get.call(node);
    default:
      return nodeAccessors.children.get.call(node);
  }
}

export function firstElementChild(node) {
  switch (node.nodeType) {
    case Node.DOCUMENT_FRAGMENT_NODE:
      return fragmentAccessors.firstElementChild.get.call(node);
    case Node.DOCUMENT_NODE:
      return documentAccessors.firstElementChild.get.call(node);
    default:
      return nodeAccessors.firstElementChild.get.call(node);
  }
}

export function lastElementChild(node) {
  switch (node.nodeType) {
    case Node.DOCUMENT_FRAGMENT_NODE:
      return fragmentAccessors.lastElementChild.get.call(node);
    case Node.DOCUMENT_NODE:
      return documentAccessors.lastElementChild.get.call(node);
    default:
      return nodeAccessors.lastElementChild.get.call(node);
  }
}
