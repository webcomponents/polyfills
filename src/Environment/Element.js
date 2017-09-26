import {getDescriptor, getter, method} from "./Utilities.js";
import {descriptors as NodeDesc} from "./Node.js";

export const constructor = window['Element'];
export const proto = constructor['prototype'];

export const descriptors = {
  after: getDescriptor(proto, 'after'),
  append: getDescriptor(proto, 'append'),
  attachShadow: getDescriptor(proto, 'attachShadow'),
  before: getDescriptor(proto, 'before'),
  getAttribute: getDescriptor(proto, 'getAttribute'),
  getAttributeNS: getDescriptor(proto, 'getAttributeNS'),
  innerHTML: getDescriptor(proto, 'innerHTML'),
  insertAdjacentElement: getDescriptor(proto, 'insertAdjacentElement'),
  localName: getDescriptor(proto, 'localName'),
  prepend: getDescriptor(proto, 'prepend'),
  remove: getDescriptor(proto, 'remove'),
  removeAttribute: getDescriptor(proto, 'removeAttribute'),
  removeAttributeNS: getDescriptor(proto, 'removeAttributeNS'),
  replaceWith: getDescriptor(proto, 'replaceWith'),
  setAttribute: getDescriptor(proto, 'setAttribute'),
  setAttributeNS: getDescriptor(proto, 'setAttributeNS'),
};

const attachShadowMethod = method(descriptors.attachShadow);
const getAttributeMethod = method(descriptors.getAttribute);
const getAttributeNSMethod = method(descriptors.getAttributeNS);
const localNameGetter = getter(descriptors.localName || NodeDesc.localName, function() { return this.localName; });
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
