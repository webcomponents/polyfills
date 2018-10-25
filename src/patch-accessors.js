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
import {OutsideAccessors, InsideAccessors, ClassNameAccessor, ActiveElementAccessor, ShadowRootAccessor} from './accessors.js';
import {ensureShadyDataForNode} from './shady-data.js';

// patch a group of descriptors on an object only if it exists or if the `force`
// argument is true.
/**
 * @param {!Object} obj
 * @param {!Object} descriptors
 * @param {boolean=} force
 */
function patchAccessorGroup(obj, descriptors, force) {
  for (let p in descriptors) {
    let objDesc = Object.getOwnPropertyDescriptor(obj, p);
    if ((objDesc && objDesc.configurable) ||
      (!objDesc && force)) {
      Object.defineProperty(obj, p, descriptors[p]);
    } else if (force) {
      console.warn('Could not define', p, 'on', obj); // eslint-disable-line no-console
    }
  }
}

// patch dom accessors on proto where they exist
export function patchAccessors(proto) {
  patchAccessorGroup(proto, OutsideAccessors);
  patchAccessorGroup(proto, ClassNameAccessor);
  patchAccessorGroup(proto, InsideAccessors);
  patchAccessorGroup(proto, ActiveElementAccessor);
}

export function patchShadowRootAccessors(proto) {
  proto.__proto__ = DocumentFragment.prototype;
  // ensure element descriptors (IE/Edge don't have em)
  patchAccessorGroup(proto, OutsideAccessors, true);
  patchAccessorGroup(proto, InsideAccessors, true);
  patchAccessorGroup(proto, ActiveElementAccessor, true);
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

// ensure an element has patched "outside" accessors; no-op when not needed
export let patchOutsideElementAccessors = utils.settings.hasDescriptors ?
  function() {} : function(element) {
    const sd = ensureShadyDataForNode(element);
    if (!sd.__outsideAccessors) {
      sd.__outsideAccessors = true;
      patchAccessorGroup(element, OutsideAccessors, true);
      patchAccessorGroup(element, ClassNameAccessor, true);
    }
  }

// ensure an element has patched "inside" accessors; no-op when not needed
export let patchInsideElementAccessors = utils.settings.hasDescriptors ?
  function() {} : function(element) {
    const sd = ensureShadyDataForNode(element);
    if (!sd.__insideAccessors) {
      patchAccessorGroup(element, InsideAccessors, true);
      patchAccessorGroup(element, ShadowRootAccessor, true);
    }
  }
