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

function protoWithName(ctor, name) {
  return ctor.prototype.hasOwnProperty(name) && ctor.prototype;
}

function findNodeDescriptor(name) {
  const proto = protoWithName(Node, name) || protoWithName(Element, name) ||
    protoWithName(HTMLElement, name);
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
  let children;
  switch (node.nodeType) {
    case Node.DOCUMENT_FRAGMENT_NODE:
      children = fragmentAccessors.children.get.call(node);
      break;
    case Node.DOCUMENT_NODE:
      children = documentAccessors.children.get.call(node);
      break;
    default:
      children = nodeAccessors.children.get.call(node);
      break;
  }
  return Array.prototype.slice.call(children);
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