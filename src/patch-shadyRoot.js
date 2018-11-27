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
import {OutsideDescriptors, InsideDescriptors} from './patch-instances.js';
import {ParentNode} from './patches/ParentNode.js';
import {DocumentOrFragment} from './patches/DocumentOrFragment.js';
import {DocumentOrShadowRoot} from './patches/DocumentOrShadowRoot.js';
import {ElementOrShadowRoot} from './patches/ElementOrShadowRoot.js';
import {ShadowRoot} from './patches/ShadowRoot.js';

const patchShadyAccessors = (proto, prefix) => {
  utils.patchAccessors(proto,
    utils.getOwnPropertyDescriptors(ShadowRoot), true, prefix);
  utils.patchAccessors(proto,
    utils.getOwnPropertyDescriptors(DocumentOrShadowRoot), true, prefix);
  utils.patchAccessors(proto,
    utils.getOwnPropertyDescriptors(ElementOrShadowRoot), true, prefix);
  // we ensure ParentNode accessors since these do not exist in Edge/IE on DocumentFragments
  utils.patchAccessors(proto,
    utils.getOwnPropertyDescriptors(ParentNode), true, prefix);
  // Ensure `shadowRoot` has basic descriptors when we cannot rely
  // on them coming from DocumentFragment.
  // noPatching case: ensure all Node descriptors are on ShadowRoot
  if (utils.settings.noPatch) {
    utils.patchAccessors(proto,
      utils.getOwnPropertyDescriptors(Node), true, prefix);
    utils.patchAccessors(proto,
      utils.getOwnPropertyDescriptors(DocumentOrFragment), true, prefix);
  // bad descriptors case: ensure only accessors are on ShadowRoot.
  } else if (!utils.settings.hasDescriptors) {
    utils.patchAccessors(proto, OutsideDescriptors, true);
    utils.patchAccessors(proto, InsideDescriptors, true);
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