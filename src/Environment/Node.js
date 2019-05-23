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

export const proxy = {
  /** @type {function(!Node, !Node): !Node} */
  appendChild: (node, deep) => appendChildMethod.call(node, deep),
  /** @type {function(!Node): !NodeList} */
  childNodes: node => childNodesGetter.call(node),
  /** @type {function(!Node, boolean=): !Node} */
  cloneNode: (node, deep) => cloneNodeMethod.call(node, deep),
  /** @type {function(!Node, ?Node): boolean} */
  contains: (node, other) => containsMethod.call(node, other),
  /** @type {function(!Node): ?Node} */
  firstChild: node => firstChildGetter.call(node),
  /** @type {function(!Node, !Node, ?Node): !Node} */
  insertBefore: (node, newChild, refChild) => insertBeforeMethod.call(node, newChild, refChild),
  /** @type {function(!Node): boolean} */
  isConnected: node => isConnectedGetter.call(node),
  /** @type {function(!Node): ?Node} */
  nextSibling: node => nextSiblingGetter.call(node),
  /** @type {function(!Node): number} */
  nodeType: node => nodeTypeGetter.call(node),
  /** @type {function(!Node): ?Document} */
  ownerDocument: node => ownerDocumentGetter.call(node),
  /** @type {function(!Node): ?Node} */
  parentNode: node => parentNodeGetter.call(node),
  /** @type {function(!Node, !Node): !Node} */
  removeChild: (node, deep) => removeChildMethod.call(node, deep),
  /** @type {function(!Node, !Node, !Node): !Node} */
  replaceChild: (node, newChild, oldChild) => replaceChildMethod.call(node, newChild, oldChild),
  /** @type {function(!Node): ?string} */
  textContent: (node) => textContentGetter.call(node),
};
