import {default as Document, Proxy as DocumentProxy} from './Environment/Document.js';
import {default as Element, Proxy as ElementProxy} from './Environment/Element.js';
import {default as HTMLElement, Proxy as HTMLElementProxy} from './Environment/HTMLElement.js';
import {default as HTMLTemplateElement, Proxy as HTMLTemplateElementProxy} from './Environment/HTMLTemplateElement.js';
import {default as MutationObserver, Proxy as MutationObserverProxy} from './Environment/MutationObserver.js';

export {
  Document, DocumentProxy,
  Element, ElementProxy,
  HTMLElement, HTMLElementProxy,
  HTMLTemplateElement, HTMLTemplateElementProxy,
  MutationObserver, MutationObserverProxy,
};

const getDescriptor = (o, p) => Object.getOwnPropertyDescriptor(o, p);

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
