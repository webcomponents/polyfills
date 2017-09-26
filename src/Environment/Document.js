import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['Document'];
export const proto = constructor['prototype'];

export const descriptors = {
  append: getDescriptor(proto, 'append'),
  createElement: getDescriptor(proto, 'createElement'),
  createElementNS: getDescriptor(proto, 'createElementNS'),
  createTextNode: getDescriptor(proto, 'createTextNode'),
  importNode: getDescriptor(proto, 'importNode'),
  prepend: getDescriptor(proto, 'prepend'),
  readyState: getDescriptor(proto, 'readyState'),
};

const createElementMethod = method(descriptors.createElement);
const createElementNSMethod = method(descriptors.createElementNS);
const createTextNodeMethod = method(descriptors.createTextNode);
const importNodeMethod = method(descriptors.importNode);
const readyStateGetter = getter(descriptors.readyState, function() { return this.readyState; });

export const proxy = {
  createElement: (doc, localName) => createElementMethod.call(doc, localName),
  createElementNS: (doc, namespace, qualifiedName) => createElementNSMethod.call(doc, namespace, qualifiedName),
  createTextNode: (doc, localName) => createTextNodeMethod.call(doc, localName),
  importNode: (doc, node, deep) => importNodeMethod.call(doc, node, deep),
  readyState: doc => readyStateGetter.call(doc),
};
