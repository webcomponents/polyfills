/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from './utils.js';
import {Node} from './patches/Node.js';
import {ParentNode} from './patches/ParentNode.js';
import {DocumentOrFragment} from './patches/DocumentOrFragment.js';
import {DocumentOrShadowRoot} from './patches/DocumentOrShadowRoot.js';
import {ElementOrShadowRoot} from './patches/ElementOrShadowRoot.js';
import {ShadowRoot} from './patches/ShadowRoot.js';

const patchShadyAccessors = (proto, prefix) => {
  utils.defineAccessors(proto,
    Object.getOwnPropertyDescriptors(ShadowRoot), prefix);
  utils.defineAccessors(proto,
    Object.getOwnPropertyDescriptors(DocumentOrShadowRoot), prefix);
  utils.defineAccessors(proto,
    Object.getOwnPropertyDescriptors(ElementOrShadowRoot), prefix);
  // we ensure ParentNode accessors since these do not exist in Edge/IE on DocumentFragments
  utils.defineAccessors(proto,
    Object.getOwnPropertyDescriptors(ParentNode), prefix, true);
  if (utils.settings.noPatch) {
    utils.defineAccessors(proto,
      Object.getOwnPropertyDescriptors(Node), prefix);
    utils.defineAccessors(proto,
      Object.getOwnPropertyDescriptors(DocumentOrFragment), prefix);
  }
}

export const patchShadyRoot = (proto) => {
  proto.__proto__ = DocumentFragment.prototype;

  // patch both prefixed and not, even when noPatch == true.
  patchShadyAccessors(proto, utils.SHADY_PREFIX);
  patchShadyAccessors(proto);

  // Ensure native properties are all safely wrapped since ShadowRoot is not an
  // actual DocumentFragment instance.
  Object.defineProperties(proto, {
    nodeType: {
      value: window.Node.DOCUMENT_FRAGMENT_NODE,
      configurable: true
    },
    nodeName: {
      value: '#document-fragment',
      configurable: true
    },
    nodeValue: {
      value: null,
      configurable: true
    }
  });

  // make undefined
  [
    'localName',
    'namespaceURI',
    'prefix'
  ].forEach((prop) => {
    Object.defineProperty(proto, prop, {
      value: undefined,
      configurable: true
    });
  });

  // defer properties to host
  [
    'ownerDocument',
    'baseURI',
    'isConnected'
  ].forEach((prop) => {
    Object.defineProperty(proto, prop, {
      get() {
        return this.host[prop];
      },
      configurable: true
    });
  });
}