const getDescriptor = (o, p) => Object.getOwnPropertyDescriptor(o, p);

const envDocument = window['Document'];
const envDocument_proto = envDocument['prototype'];
export const Document = {
  self: envDocument,
  // Closure's renaming breaks if this property is named `prototype`.
  proto: envDocument_proto,

  append: getDescriptor(envDocument_proto, 'append'),
  createElement: getDescriptor(envDocument_proto, 'createElement'),
  createElementNS: getDescriptor(envDocument_proto, 'createElementNS'),
  createTextNode: getDescriptor(envDocument_proto, 'createTextNode'),
  importNode: getDescriptor(envDocument_proto, 'importNode'),
  prepend: getDescriptor(envDocument_proto, 'prepend'),
  readyState: getDescriptor(envDocument_proto, 'readyState'),
};

const envElement = window['Element'];
const envElement_proto = envElement['prototype'];
export const Element = {
  self: envElement,
  proto: envElement_proto,

  after: getDescriptor(envElement_proto, 'after'),
  append: getDescriptor(envElement_proto, 'append'),
  attachShadow: getDescriptor(envElement_proto, 'attachShadow'),
  before: getDescriptor(envElement_proto, 'before'),
  getAttribute: getDescriptor(envElement_proto, 'getAttribute'),
  getAttributeNS: getDescriptor(envElement_proto, 'getAttributeNS'),
  innerHTML: getDescriptor(envElement_proto, 'innerHTML'),
  insertAdjacentElement: getDescriptor(envElement_proto, 'insertAdjacentElement'),
  localName: getDescriptor(envElement_proto, 'localName'),
  prepend: getDescriptor(envElement_proto, 'prepend'),
  remove: getDescriptor(envElement_proto, 'remove'),
  removeAttribute: getDescriptor(envElement_proto, 'removeAttribute'),
  removeAttributeNS: getDescriptor(envElement_proto, 'removeAttributeNS'),
  replaceWith: getDescriptor(envElement_proto, 'replaceWith'),
  setAttribute: getDescriptor(envElement_proto, 'setAttribute'),
  setAttributeNS: getDescriptor(envElement_proto, 'setAttributeNS'),
};

const envHTMLElement = window['HTMLElement'];
const envHTMLElement_proto = envHTMLElement['prototype'];
export const HTMLElement = {
  self: envHTMLElement,
  proto: envHTMLElement_proto,

  innerHTML: getDescriptor(envHTMLElement_proto, 'innerHTML'),
  insertAdjacentElement: getDescriptor(envHTMLElement_proto, 'insertAdjacentElement'),
};

const envHTMLTemplateElement = window['HTMLTemplateElement'];
const envHTMLTemplateElement_proto = envHTMLTemplateElement['prototype'];
export const HTMLTemplateElement = {
  self: envHTMLTemplateElement,
  proto: envHTMLTemplateElement_proto,

  content: getDescriptor(envHTMLTemplateElement_proto, 'content'),
};

const envMutationObserver = window['MutationObserver'];
const envMutationObserver_proto = envMutationObserver['prototype'];
export const MutationObserver = {
  self: envMutationObserver,
  proto: envMutationObserver_proto,

  disconnect: getDescriptor(envMutationObserver_proto, 'disconnect'),
  observe: getDescriptor(envMutationObserver_proto, 'observe'),
};

const envMutationRecord = window['MutationRecord'];
const envMutationRecord_proto = envMutationRecord['prototype'];
export const MutationRecord = {
  self: envMutationRecord,
  proto: envMutationRecord_proto,

  addedNodes: getDescriptor(envMutationRecord_proto, 'addedNodes'),
};

const envNode = window['Node'];
const envNode_proto = envNode['prototype'];
export const Node = {
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
