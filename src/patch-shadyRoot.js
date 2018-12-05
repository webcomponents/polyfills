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
import {NodePatches} from './patches/Node.js';
import {OutsideDescriptors, InsideDescriptors} from './patch-instances.js';
import {ParentNodePatches} from './patches/ParentNode.js';
import {DocumentOrFragmentPatches} from './patches/DocumentOrFragment.js';
import {DocumentOrShadowRootPatches} from './patches/DocumentOrShadowRoot.js';
import {ElementOrShadowRootPatches} from './patches/ElementOrShadowRoot.js';
import {ShadowRootPatches} from './patches/ShadowRoot.js';

const patchShadyAccessors = (proto, prefix) => {
  utils.patchProperties(proto, ShadowRootPatches, prefix);
  utils.patchProperties(proto, DocumentOrShadowRootPatches, prefix);
  utils.patchProperties(proto, ElementOrShadowRootPatches, prefix);
  // We ensure ParentNode accessors since these do not exist in Edge/IE on DocumentFragments.
  utils.patchProperties(proto, ParentNodePatches, prefix);
  // Ensure `shadowRoot` has basic descriptors when we cannot rely
  // on them coming from DocumentFragment.
  //
  // Case 1, noPatching: Because we want noPatch ShadyRoots to have native property
  // names so that they do not have to be wrapped...
  // When we do *not* patch Node/DocumentFragment.prototype
  // we must manually install those properties on ShadyRoot's prototype.
  // Note, it's important to only install these in this mode so as not to stomp
  // over CustomElements polyfill's patches on Node/DocumentFragment methods.
  if (utils.settings.noPatch && !prefix) {
    utils.patchProperties(proto, NodePatches, prefix);
    utils.patchProperties(proto, DocumentOrFragmentPatches, prefix);
  // Case 2, bad descriptors: Ensure accessors are on ShadowRoot.
  // These descriptors are normally used for instance patching but because
  // ShadyRoot can always be patched, just do it to the prototype.
  } else if (!utils.settings.hasDescriptors) {
    utils.patchProperties(proto, OutsideDescriptors);
    utils.patchProperties(proto, InsideDescriptors);
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
      value: Node.DOCUMENT_FRAGMENT_NODE,
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