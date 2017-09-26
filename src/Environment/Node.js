import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['Node'];
export const proto = constructor['prototype'];

export const descriptors = {
  appendChild: getDescriptor(proto, 'appendChild'),
  childNodes: getDescriptor(proto, 'childNodes'),
  cloneNode: getDescriptor(proto, 'cloneNode'),
  firstChild: getDescriptor(proto, 'firstChild'),
  insertBefore: getDescriptor(proto, 'insertBefore'),
  isConnected: getDescriptor(proto, 'isConnected'),
  nextSibling: getDescriptor(proto, 'nextSibling'),
  nodeType: getDescriptor(proto, 'nodeType'),
  ownerDocument: getDescriptor(proto, 'ownerDocument'),
  parentNode: getDescriptor(proto, 'parentNode'),
  removeChild: getDescriptor(proto, 'removeChild'),
  replaceChild: getDescriptor(proto, 'replaceChild'),
  textContent: getDescriptor(proto, 'textContent'),
};

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
