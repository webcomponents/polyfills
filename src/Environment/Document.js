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

export const proxy = {
  /** @type {function(!Document, !string): !HTMLElement} */
  createElement: (doc, localName) => createElementMethod.call(doc, localName),
  /** @type {function(!Document, ?string, !string): !Element} */
  createElementNS: (doc, namespace, qualifiedName) => createElementNSMethod.call(doc, namespace, qualifiedName),
  /** @type {function(!Document, !string): !Text} */
  createTextNode: (doc, localName) => createTextNodeMethod.call(doc, localName),
  /** @type {function(!Document, !Node, boolean=): !Node} */
  importNode: (doc, node, deep) => importNodeMethod.call(doc, node, deep),
  /** @type {function(!Document): (!string|undefined)} */
  readyState: doc => readyStateGetter.call(doc),
  /** @type {function(!Document): ?Window} */
  defaultView: doc => defaultViewGetter.call(doc),
};
