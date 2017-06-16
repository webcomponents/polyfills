import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['Document'];
export const prototype = constructor['prototype'];

export const descriptors = {
  append: getDescriptor(prototype, 'append'),
  createElement: getDescriptor(prototype, 'createElement'),
  createElementNS: getDescriptor(prototype, 'createElementNS'),
  createTextNode: getDescriptor(prototype, 'createTextNode'),
  importNode: getDescriptor(prototype, 'importNode'),
  prepend: getDescriptor(prototype, 'prepend'),
  readyState: getDescriptor(prototype, 'readyState'),
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
