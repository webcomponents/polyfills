import {getDescriptor, getter, method} from "./Utilities.js";

const envElement = window['Element'];
const envElement_proto = envElement['prototype'];

const Element = {
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
export default Element;

const attachShadowMethod = method(Element.attachShadow);
const getAttributeMethod = method(Element.getAttribute);
const getAttributeNSMethod = method(Element.getAttributeNS);
const localNameGetter = getter(Element.localName);
const removeAttributeMethod = method(Element.removeAttribute);
const removeAttributeNSMethod = method(Element.removeAttributeNS);
const setAttributeMethod = method(Element.setAttribute);
const setAttributeNSMethod = method(Element.setAttributeNS);

export const Proxy = {
  attachShadow: (node, options) => attachShadowMethod.call(node, options),
  getAttribute: (node, name) => getAttributeMethod.call(node, name),
  getAttributeNS: (node, ns, name) => getAttributeNSMethod.call(node, ns, name),
  localName: node => localNameGetter.call(node),
  removeAttribute: (node, name) => removeAttributeMethod.call(node, name),
  removeAttributeNS: (node, ns, name) => removeAttributeNSMethod.call(node, ns, name),
  setAttribute: (node, name, value) => setAttributeMethod.call(node, name, value),
  setAttributeNS: (node, ns, name, value) => setAttributeNSMethod.call(node, ns, name, value),
};
