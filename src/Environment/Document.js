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
  defaultView: getDescriptor(proto, 'defaultView'),
};

/** @type {function(this: Document, !string): !HTMLElement} */
const createElementMethod = method(descriptors.createElement);
/** @type {function(this: Document, ?string, !string): !Element} */
const createElementNSMethod = method(descriptors.createElementNS);
/** @type {function(this: Document, !string): !Text} */
const createTextNodeMethod = method(descriptors.createTextNode);
/** @type {function(this: Document, !Node, boolean=): !Node} */
const importNodeMethod = method(descriptors.importNode);
/** @type {function(this: Document): (!string|undefined)} */
const readyStateGetter = getter(descriptors.readyState, function() { return this.readyState; });
/** @type {function(this: Document): ?Window} */
const defaultViewGetter = getter(descriptors.defaultView, function() { return this.defaultView; });

/**
 * @type {{
 *   createElement: function(!Document, !string): !Element,
 *   createElementNS: function(!Document, ?string, !string): !Element,
 *   createTextNode: function(!Document, !string): !Text,
 *   importNode: function(!Document, !Node, boolean=): !Node,
 *   readyState: function(!Document): (!string|undefined),
 *   defaultView: function(!Document): ?Window,
 * }}
 */
export const proxy = {
  createElement: (doc, localName) => createElementMethod.call(doc, localName),
  createElementNS: (doc, namespace, qualifiedName) => createElementNSMethod.call(doc, namespace, qualifiedName),
  createTextNode: (doc, localName) => createTextNodeMethod.call(doc, localName),
  importNode: (doc, node, deep) => importNodeMethod.call(doc, node, deep),
  readyState: doc => readyStateGetter.call(doc),
  defaultView: doc => defaultViewGetter.call(doc),
};
