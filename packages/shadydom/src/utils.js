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

/** @type {!Object} */
export const settings = window['ShadyDOM'] || {};

settings.hasNativeShadowDOM = Boolean(Element.prototype.attachShadow && Node.prototype.getRootNode);

// The user might need to pass the custom elements polyfill a flag by setting an
// object to `customElements`, so check for `customElements.define` also.
export const hasCustomElements =
    () => Boolean(window.customElements && window.customElements.define);
// The custom elements polyfill is typically loaded after Shady DOM, so this
// check isn't reliable during initial evaluation. However, because the
// polyfills are loaded immediately after one another, it works at runtime.
export const hasPolyfilledCustomElements =
    () => Boolean(window.customElements && window.customElements['polyfillWrapFlushCallback']);

const desc = Object.getOwnPropertyDescriptor(Node.prototype, 'firstChild');

/* eslint-disable */
settings.hasDescriptors = Boolean(desc && desc.configurable && desc.get);
settings.inUse = settings['force'] || !settings.hasNativeShadowDOM;
settings.noPatch = /** @type {string|boolean} */(settings['noPatch'] || false);
settings.preferPerformance = settings['preferPerformance'];
settings.patchOnDemand = (settings.noPatch === 'on-demand');
/* eslint-enable */

const IS_IE = navigator.userAgent.match('Trident');
settings.IS_IE = IS_IE;

export const canUpgrade = () => !settings.IS_IE;

export const isTrackingLogicalChildNodes = (node) => {
  const nodeData = shadyDataForNode(node);
  return (nodeData && nodeData.firstChild !== undefined);
}

export const isShadyRoot = obj => obj instanceof ShadowRoot;

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

export const nativeChildNodesArray = (parent) => {
  const result = [];
  for (let n=parent[NATIVE_PREFIX + 'firstChild']; n; n = n[NATIVE_PREFIX + 'nextSibling']) {
    result.push(n);
  }
  return result;
}

export const childNodesArray = (parent) => {
  const result = [];
  for (let n=parent[SHADY_PREFIX + 'firstChild']; n; n = n[SHADY_PREFIX + 'nextSibling']) {
    result.push(n);
  }
  return result;
}

const patchProperty = (proto, name, descriptor) => {
  descriptor.configurable = true;
  // NOTE: we prefer writing directly because some browsers
  // have descriptors that are writable but not configurable (e.g.
  // `appendChild` on older browsers)
  if (descriptor.value) {
    proto[name] = descriptor.value;
  } else {
    try {
      Object.defineProperty(proto, name, descriptor);
    } catch(e) {
      // this error is harmless so we just trap it.
    }
  }
}

/**
 * Patch a group of accessors on an object. By default this overrides
 * @param {!Object} proto
 * @param {!Object} descriptors
 * @param {string=} prefix
 * @param {Array=} disallowedPatches
 */
export const patchProperties = (proto, descriptors, prefix = '', disallowedPatches) => {
  for (let name in descriptors) {
    if (disallowedPatches && disallowedPatches.indexOf(name) >= 0) {
      continue;
    }
    patchProperty(proto,  prefix + name, descriptors[name]);
  }
}

export const patchExistingProperties = (proto, descriptors) => {
  for (let name in descriptors) {
    if (name in proto) {
      patchProperty(proto,  name, descriptors[name]);
    }
  }
}

/** @type {!function(new:HTMLElement)} */
export const NativeHTMLElement =
    (window['customElements'] && window['customElements']['nativeHTMLElement']) ||
    HTMLElement;

// note, this is not a perfect polyfill since it doesn't include symbols
/** @return {!Object<!ObjectPropertyDescriptor>} */
export const getOwnPropertyDescriptors = (obj) => {
  const descriptors = {};
  Object.getOwnPropertyNames(obj).forEach((name) => {
    descriptors[name] = Object.getOwnPropertyDescriptor(obj, name);
  });
  return descriptors;
};
