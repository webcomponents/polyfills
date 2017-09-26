import {getDescriptor, getter, method} from "./Utilities.js";

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

/** @type {function(this: Element, !{mode: !string}): ShadowRoot} */
const attachShadowMethod = method(descriptors.attachShadow);
/** @type {function(this: Element, !string): ?string} */
const getAttributeMethod = method(descriptors.getAttribute);
/** @type {function(this: Element, ?string, !string): ?string} */
const getAttributeNSMethod = method(descriptors.getAttributeNS);
/** @type {function(this: Element): !string} */
const localNameGetter = getter(
  descriptors.localName || /* Edge / IE11 */ getDescriptor(window['Node'].prototype, 'localName'),
  function() { return this.localName; });
/** @type {function(this: Element, !string)} */
const removeAttributeMethod = method(descriptors.removeAttribute);
/** @type {function(this: Element, ?string, !string)} */
const removeAttributeNSMethod = method(descriptors.removeAttributeNS);
/** @type {function(this: Element, !string, !string): ?string} */
const setAttributeMethod = method(descriptors.setAttribute);
/** @type {function(this: Element, ?string, !string, !string): ?string} */
const setAttributeNSMethod = method(descriptors.setAttributeNS);

/**
 * @type {{
 *   attachShadow: function(!Element, !{mode: !string}): ShadowRoot,
 *   getAttribute: function(!Element, !string): ?string,
 *   getAttributeNS: function(!Element, ?string, !string): ?string,
 *   localName: function(!Element): !string,
 *   removeAttribute: function(!Element, !string),
 *   removeAttributeNS: function(!Element, ?string, !string),
 *   setAttribute: function(!Element, !string, !string): ?string,
 *   setAttributeNS: function(!Element, ?string, !string, !string): ?string,
 * }}
 */
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
