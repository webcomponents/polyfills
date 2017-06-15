import {getDescriptor, getter, method} from "./Utilities.js";

const envNode = window['Node'];
const envNode_proto = envNode['prototype'];

const Node = {
  self: envNode,
  proto: envNode_proto,

  addEventListener: getDescriptor(envNode_proto, 'addEventListener'),
  appendChild: getDescriptor(envNode_proto, 'appendChild'),
  childNodes: getDescriptor(envNode_proto, 'childNodes'),
  cloneNode: getDescriptor(envNode_proto, 'cloneNode'),
  firstChild: getDescriptor(envNode_proto, 'firstChild'),
  insertBefore: getDescriptor(envNode_proto, 'insertBefore'),
  isConnected: getDescriptor(envNode_proto, 'isConnected'),
  nextSibling: getDescriptor(envNode_proto, 'nextSibling'),
  nodeType: getDescriptor(envNode_proto, 'nodeType'),
  parentNode: getDescriptor(envNode_proto, 'parentNode'),
  removeChild: getDescriptor(envNode_proto, 'removeChild'),
  replaceChild: getDescriptor(envNode_proto, 'replaceChild'),
  textContent: getDescriptor(envNode_proto, 'textContent'),
};
export default Node;

const addEventListenerMethod = method(Node.addEventListener);
const appendChildMethod = method(Node.appendChild);
const childNodesGetter = getter(Node.childNodes);
const cloneNodeMethod = method(Node.cloneNode);
const firstChildGetter = getter(Node.firstChild);
const insertBeforeMethod = method(Node.insertBefore);
const isConnectedGetter = getter(Node.isConnected);
const nextSiblingGetter = getter(Node.nextSibling);
const nodeTypeGetter = getter(Node.nodeType);
const parentNodeGetter = getter(Node.parentNode);
const removeChildMethod = method(Node.removeChild);
const replaceChildMethod = method(Node.replaceChild);

export const Proxy = {
  addEventListener: (node, type, callback, options) => addEventListenerMethod.call(node, type, callback, options),
  appendChild: (node, deep) => appendChildMethod.call(node, deep),
  childNodes: node => childNodesGetter.call(node),
  cloneNode: (node, deep) => cloneNodeMethod.call(node, deep),
  firstChild: node => firstChildGetter.call(node),
  insertBefore: (node, newChild, refChild) => insertBeforeMethod.call(node, newChild, refChild),
  isConnected: node => isConnectedGetter.call(node),
  nextSibling: node => nextSiblingGetter.call(node),
  nodeType: node => nodeTypeGetter.call(node),
  parentNode: node => parentNodeGetter.call(node),
  removeChild: (node, deep) => removeChildMethod.call(node, deep),
  replaceChild: (node, newChild, oldChild) => replaceChildMethod.call(node, newChild, oldChild),
};
