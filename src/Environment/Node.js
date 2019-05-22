import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['Node'];
export const proto = constructor['prototype'];

export const descriptors = {
  appendChild: getDescriptor(proto, 'appendChild'),
  childNodes: getDescriptor(proto, 'childNodes'),
  cloneNode: getDescriptor(proto, 'cloneNode'),
  contains: getDescriptor(proto, 'contains'),
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

/** @type {function(this: Node, !Node): !Node} */
const appendChildMethod = method(descriptors.appendChild);
/** @type {function(this: Node): !NodeList} */
const childNodesGetter = getter(descriptors.childNodes, function() { return this.childNodes; });
/** @type {function(this: Node, boolean=): !Node} */
const cloneNodeMethod = method(descriptors.cloneNode);
/** @type {function(this: Node, ?Node): boolean} */
const containsMethod = method(descriptors.contains);
/** @type {function(this: Node): ?Node} */
const firstChildGetter = getter(descriptors.firstChild, function() { return this.firstChild; });
/** @type {function(this: Node, !Node, ?Node): !Node} */
const insertBeforeMethod = method(descriptors.insertBefore);
/** @type {function(this: Node): boolean} */
const isConnectedGetter = getter(descriptors.isConnected, function() { return this.isConnected; });
/** @type {function(this: Node): ?Node} */
const nextSiblingGetter = getter(descriptors.nextSibling, function() { return this.nextSibling; });
/** @type {function(this: Node): number} */
const nodeTypeGetter = getter(descriptors.nodeType, function() { return this.nodeType; });
/** @type {function(this: Node): ?Document} */
const ownerDocumentGetter = getter(descriptors.ownerDocument, function() { return this.ownerDocument; });
/** @type {function(this: Node): ?Node} */
const parentNodeGetter = getter(descriptors.parentNode, function() { return this.parentNode; });
/** @type {function(this: Node, !Node): !Node} */
const removeChildMethod = method(descriptors.removeChild);
/** @type {function(this: Node, !Node, !Node): !Node} */
const replaceChildMethod = method(descriptors.replaceChild);
/** @type {function(this: Node): ?string} */
const textContentGetter = getter(descriptors.textContent, function() { return this.textContent; });

/**
 * @type {{
 *   appendChild: function(!Node, !Node): !Node,
 *   childNodes: function(!Node): !NodeList,
 *   cloneNode: function(!Node, boolean=): !Node,
 *   contains: function(!Node, ?Node): boolean,
 *   firstChild: function(!Node): ?Node,
 *   insertBefore: function(!Node, !Node, ?Node): !Node,
 *   isConnected: function(!Node): boolean,
 *   nextSibling: function(!Node): ?Node,
 *   nodeType: function(!Node): number,
 *   ownerDocument: function(!Node): ?Document,
 *   parentNode: function(!Node): ?Node,
 *   removeChild: function(!Node, !Node): !Node,
 *   replaceChild: function(!Node, !Node, !Node): !Node,
 *   textContent: function(!Node): ?string,
 * }}
 */
export const proxy = {
  appendChild: (node, deep) => appendChildMethod.call(node, deep),
  childNodes: node => childNodesGetter.call(node),
  cloneNode: (node, deep) => cloneNodeMethod.call(node, deep),
  contains: (node, other) => containsMethod.call(node, other),
  firstChild: node => firstChildGetter.call(node),
  insertBefore: (node, newChild, refChild) => insertBeforeMethod.call(node, newChild, refChild),
  isConnected: node => isConnectedGetter.call(node),
  nextSibling: node => nextSiblingGetter.call(node),
  nodeType: node => nodeTypeGetter.call(node),
  ownerDocument: node => ownerDocumentGetter.call(node),
  parentNode: node => parentNodeGetter.call(node),
  removeChild: (node, deep) => removeChildMethod.call(node, deep),
  replaceChild: (node, newChild, oldChild) => replaceChildMethod.call(node, newChild, oldChild),
  textContent: (node) => textContentGetter.call(node),
};
