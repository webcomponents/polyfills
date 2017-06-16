import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['Element'];
export const prototype = constructor['prototype'];

export const descriptors = {
  after: getDescriptor(prototype, 'after'),
  append: getDescriptor(prototype, 'append'),
  attachShadow: getDescriptor(prototype, 'attachShadow'),
  before: getDescriptor(prototype, 'before'),
  getAttribute: getDescriptor(prototype, 'getAttribute'),
  getAttributeNS: getDescriptor(prototype, 'getAttributeNS'),
  innerHTML: getDescriptor(prototype, 'innerHTML'),
  insertAdjacentElement: getDescriptor(prototype, 'insertAdjacentElement'),
  localName: getDescriptor(prototype, 'localName'),
  prepend: getDescriptor(prototype, 'prepend'),
  remove: getDescriptor(prototype, 'remove'),
  removeAttribute: getDescriptor(prototype, 'removeAttribute'),
  removeAttributeNS: getDescriptor(prototype, 'removeAttributeNS'),
  replaceWith: getDescriptor(prototype, 'replaceWith'),
  setAttribute: getDescriptor(prototype, 'setAttribute'),
  setAttributeNS: getDescriptor(prototype, 'setAttributeNS'),
};

const attachShadowMethod = method(descriptors.attachShadow);
const getAttributeMethod = method(descriptors.getAttribute);
const getAttributeNSMethod = method(descriptors.getAttributeNS);
const localNameGetter = getter(descriptors.localName, function() { return this.localName; });
const removeAttributeMethod = method(descriptors.removeAttribute);
const removeAttributeNSMethod = method(descriptors.removeAttributeNS);
const setAttributeMethod = method(descriptors.setAttribute);
const setAttributeNSMethod = method(descriptors.setAttributeNS);

export const proxy = {
  attachShadow: (node, options) => attachShadowMethod.call(node, options),
  getAttribute: (node, name) => getAttributeMethod.call(node, name),
  getAttributeNS: (node, ns, name) => getAttributeNSMethod.call(node, ns, name),
  localName: node => localNameGetter.call(node),
  removeAttribute: (node, name) => removeAttributeMethod.call(node, name),
  removeAttributeNS: (node, ns, name) => removeAttributeNSMethod.call(node, ns, name),
  setAttribute: (node, name, value) => setAttributeMethod.call(node, name, value),
  setAttributeNS: (node, ns, name, value) => setAttributeNSMethod.call(node, ns, name, value),
};
