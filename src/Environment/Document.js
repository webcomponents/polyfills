import {getDescriptor, getter, method} from "./Utilities.js";

const envDocument = window['Document'];
const envDocument_proto = envDocument['prototype'];

const Document = {
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
export default Document;

const createElementMethod = method(Document.createElement);
const createElementNSMethod = method(Document.createElementNS);
const createTextNodeMethod = method(Document.createTextNode);
const importNodeMethod = method(Document.importNode);
const readyStateGetter = getter(Document.readyState, function() { return this.readyState; });

export const Proxy = {
  createElement: (doc, localName) => createElementMethod.call(doc, localName),
  createElementNS: (doc, namespace, qualifiedName) => createElementNSMethod.call(doc, namespace, qualifiedName),
  createTextNode: (doc, localName) => createTextNodeMethod.call(doc, localName),
  importNode: (doc, node, deep) => importNodeMethod.call(doc, node, deep),
  readyState: doc => readyStateGetter.call(doc),
};
