/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

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
  insertAdjacentHTML: getDescriptor(proto, 'insertAdjacentHTML'),
  localName: getDescriptor(proto, 'localName'),
  namespaceURI: getDescriptor(proto, 'namespaceURI'),
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
/** @type {function(this: Element): !string} */
const namespaceURIGetter = getter(descriptors.namespaceURI,
  function() { return this.namespaceURI; });
/** @type {function(this: Element, !string)} */
const removeAttributeMethod = method(descriptors.removeAttribute);
/** @type {function(this: Element, ?string, !string)} */
const removeAttributeNSMethod = method(descriptors.removeAttributeNS);
/** @type {function(this: Element, !string, !string): ?string} */
const setAttributeMethod = method(descriptors.setAttribute);
/** @type {function(this: Element, ?string, !string, !string): ?string} */
const setAttributeNSMethod = method(descriptors.setAttributeNS);

export const proxy = {
  /** @type {function(!Element, !{mode: !string}): ShadowRoot} */
  attachShadow: (node, options) => attachShadowMethod.call(node, options),
  /** @type {function(!Element, !string): ?string} */
  getAttribute: (node, name) => getAttributeMethod.call(node, name),
  /** @type {function(!Element, ?string, !string): ?string} */
  getAttributeNS: (node, ns, name) => getAttributeNSMethod.call(node, ns, name),
  /** @type {function(!Element): !string} */
  localName: node => localNameGetter.call(node),
  /** @type {function(!Element): !string} */
  namespaceURI: node => namespaceURIGetter.call(node),
  /** @type {function(!Element, !string)} */
  removeAttribute: (node, name) => removeAttributeMethod.call(node, name),
  /** @type {function(!Element, ?string, !string)} */
  removeAttributeNS: (node, ns, name) => removeAttributeNSMethod.call(node, ns, name),
  /** @type {function(!Element, !string, !string): ?string} */
  setAttribute: (node, name, value) => setAttributeMethod.call(node, name, value),
  /** @type {function(!Element, ?string, !string, !string): ?string} */
  setAttributeNS: (node, ns, name, value) => setAttributeNSMethod.call(node, ns, name, value),
};
