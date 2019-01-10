/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import {shadyDataForNode} from './shady-data.js';

export const settings = window['ShadyDOM'] || {};

settings.hasNativeShadowDOM = Boolean(Element.prototype.attachShadow && Node.prototype.getRootNode);

const desc = Object.getOwnPropertyDescriptor(Node.prototype, 'firstChild');

settings.hasDescriptors = Boolean(desc && desc.configurable && desc.get);
settings.inUse = settings['force'] || !settings.hasNativeShadowDOM;
settings.noPatch = settings['noPatch'] || false;
settings.preferPerformance = settings['preferPerformance'];

export const isTrackingLogicalChildNodes = (node) => {
  const nodeData = shadyDataForNode(node);
  return (nodeData && nodeData.firstChild !== undefined);
}

export const isShadyRoot = (obj) => {
  return Boolean(obj._localName === 'ShadyRoot');
}

export const ownerShadyRootForNode = (node) => {
  let root = node[SHADY_PREFIX + 'getRootNode']();
  if (isShadyRoot(root)) {
    return root;
  }
}

export const hasShadowRootWithSlot = (node) => {
  const nodeData = shadyDataForNode(node);
  let root = nodeData && nodeData.root;
  return (root && root._hasInsertionPoint());
}

let p = Element.prototype;
let matches = p.matches || p.matchesSelector ||
  p.mozMatchesSelector || p.msMatchesSelector ||
  p.oMatchesSelector || p.webkitMatchesSelector;

export const matchesSelector = (element, selector) => {
  return matches.call(element, selector);
}

export const mixin = (target, source) => {
  for (var i in source) {
    target[i] = source[i];
  }
  return target;
}

// NOTE, prefer MutationObserver over Promise for microtask timing
// for consistency x-platform.
let twiddle = document.createTextNode('');
let content = 0;
let queue = [];
new MutationObserver(() => {
  while (queue.length) {
    // catch errors in user code...
    try {
      queue.shift()();
    } catch(e) {
      // enqueue another record and throw
      twiddle.textContent = content++;
      throw(e);
    }
  }
}).observe(twiddle, {characterData: true});

// use MutationObserver to get microtask async timing.
export const microtask = (callback) => {
  queue.push(callback);
  twiddle.textContent = content++;
}

export const hasDocumentContains = Boolean(document.contains);

export const contains = (container, node) => {
  while (node) {
    if (node == container) {
      return true;
    }
    node = node[SHADY_PREFIX + 'parentNode'];
  }
  return false;
}

const getNodeHTMLCollectionName = (node) =>
    node.getAttribute('id') || node.getAttribute('name');

const isValidHTMLCollectionName = (name) => name !== 'length' && isNaN(name);

export const createPolyfilledHTMLCollection = (nodes) => {
  // Note: loop in reverse so that the first named item matches the named property
  for (let l = nodes.length - 1; l >= 0; l--) {
    const node = nodes[l];
    const name = getNodeHTMLCollectionName(node);

    if (name && isValidHTMLCollectionName(name)) {
      nodes[name] = node;
    }
  }
  nodes.item = function(index) {
    return nodes[index];
  }
  nodes.namedItem = function(name) {
    if (isValidHTMLCollectionName(name) && nodes[name]) {
      return nodes[name];
    }

    for (const node of nodes) {
      const nodeName = getNodeHTMLCollectionName(node);

      if (nodeName == name) {
        return node;
      }
    }

    return null;
  };
  return nodes;
}

export const NATIVE_PREFIX = '__shady_native_';
export const SHADY_PREFIX = '__shady_';


// patch a group of accessors on an object only if it exists or if the `force`
// argument is true.
/**
 * @param {!Object} obj
 * @param {!Object} descriptors
 * @param {boolean=} force
 * @param {Array=} disallowedPatches
 */
export const patchProperties = (proto, descriptors, prefix = '', disallowedPatches) => {
  for (let p in descriptors) {
    const newDescriptor = descriptors[p];
    if (disallowedPatches && disallowedPatches.indexOf(p) >= 0) {
      continue;
    }
    newDescriptor.configurable = true;
    const name = prefix + p;
    // NOTE: we prefer writing directly because some browsers
    // have descriptors that are writable but not configurable (e.g.
    // `appendChild` on older browsers)
    if (newDescriptor.value) {
      proto[name] = newDescriptor.value;
    } else {
      // NOTE: this can throw if 'force' is used so catch the error.
      try {
        Object.defineProperty(proto, name, newDescriptor);
      } catch(e) {
        // this error is harmless so we just trap it.
      }
    }
  }
}

export const NativeHTMLElement =
    (window['customElements'] && window['customElements']['nativeHTMLElement']) ||
    HTMLElement;

// note, this is not a perfect polyfill since it doesn't include symbols
export const getOwnPropertyDescriptors = (obj) => {
  const descriptors = {};
  Object.getOwnPropertyNames(obj).forEach((name) => {
    descriptors[name] = Object.getOwnPropertyDescriptor(obj, name);
  });
  return descriptors;
};
