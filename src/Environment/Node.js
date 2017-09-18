import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['Node'];
export const prototype = constructor['prototype'];

export const descriptors = {
  addEventListener: getDescriptor(prototype, 'addEventListener'),
  appendChild: getDescriptor(prototype, 'appendChild'),
  childNodes: getDescriptor(prototype, 'childNodes'),
  cloneNode: getDescriptor(prototype, 'cloneNode'),
  firstChild: getDescriptor(prototype, 'firstChild'),
  insertBefore: getDescriptor(prototype, 'insertBefore'),
  isConnected: getDescriptor(prototype, 'isConnected'),
  nextSibling: getDescriptor(prototype, 'nextSibling'),
  nodeType: getDescriptor(prototype, 'nodeType'),
  ownerDocument: getDescriptor(prototype, 'ownerDocument'),
  parentNode: getDescriptor(prototype, 'parentNode'),
  removeChild: getDescriptor(prototype, 'removeChild'),
  replaceChild: getDescriptor(prototype, 'replaceChild'),
  textContent: getDescriptor(prototype, 'textContent'),
};

const addEventListenerMethod = method(descriptors.addEventListener);
const appendChildMethod = method(descriptors.appendChild);
const childNodesGetter = getter(descriptors.childNodes, function() { return this.childNodes; });
const cloneNodeMethod = method(descriptors.cloneNode);
const firstChildGetter = getter(descriptors.firstChild, function() { return this.firstChild; });
const insertBeforeMethod = method(descriptors.insertBefore);
const isConnectedGetter = getter(descriptors.isConnected, function() { return this.isConnected; });
const nextSiblingGetter = getter(descriptors.nextSibling, function() { return this.nextSibling; });
const nodeTypeGetter = getter(descriptors.nodeType, function() { return this.nodeType; });
const ownerDocumentGetter = getter(descriptors.ownerDocument, function() { return this.ownerDocument; });
const parentNodeGetter = getter(descriptors.parentNode, function() { return this.parentNode; });
const removeChildMethod = method(descriptors.removeChild);
const replaceChildMethod = method(descriptors.replaceChild);

export const proxy = {
  addEventListener: (node, type, callback, options) => addEventListenerMethod.call(node, type, callback, options),
  appendChild: (node, deep) => appendChildMethod.call(node, deep),
  childNodes: node => childNodesGetter.call(node),
  cloneNode: (node, deep) => cloneNodeMethod.call(node, deep),
  firstChild: node => firstChildGetter.call(node),
  insertBefore: (node, newChild, refChild) => insertBeforeMethod.call(node, newChild, refChild),
  isConnected: node => isConnectedGetter.call(node),
  nextSibling: node => nextSiblingGetter.call(node),
  nodeType: node => nodeTypeGetter.call(node),
  ownerDocument: node => ownerDocumentGetter.call(node),
  parentNode: node => parentNodeGetter.call(node),
  removeChild: (node, deep) => removeChildMethod.call(node, deep),
  replaceChild: (node, newChild, oldChild) => replaceChildMethod.call(node, newChild, oldChild),
};
