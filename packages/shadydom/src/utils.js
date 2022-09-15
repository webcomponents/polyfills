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

settings.hasNativeShadowDOM = Boolean(
  Element.prototype.attachShadow && Node.prototype.getRootNode
);

// The user might need to pass the custom elements polyfill a flag by setting an
// object to `customElements`, so check for `customElements.define` also.
export const hasCustomElements = () =>
  Boolean(window.customElements && window.customElements.define);
// The custom elements polyfill is typically loaded after Shady DOM, so this
// check isn't reliable during initial evaluation. However, because the
// polyfills are loaded immediately after one another, it works at runtime.
export const hasPolyfilledCustomElements = () =>
  Boolean(
    window.customElements && window.customElements['polyfillWrapFlushCallback']
  );

const desc = Object.getOwnPropertyDescriptor(Node.prototype, 'firstChild');

settings.hasDescriptors = Boolean(desc && desc.configurable && desc.get);
settings.inUse = settings['force'] || !settings.hasNativeShadowDOM;
settings.noPatch = /** @type {string|boolean} */ (settings['noPatch'] || false);
// eslint-disable-next-line no-self-assign
settings.preferPerformance = settings['preferPerformance'];
settings.patchOnDemand = settings.noPatch === 'on-demand';
settings.querySelectorImplementation = (() => {
  const acceptedValues = ['native', 'selectorEngine'];
  const userValue = settings['querySelectorImplementation'];
  if (acceptedValues.indexOf(userValue) > -1) {
    return userValue;
  }
  return undefined;
})();

const IS_IE = navigator.userAgent.match('Trident');
settings.IS_IE = IS_IE;

// Helper for prefixed properties.
export const getPropertyName = (obj, name) => {
  const prefixed = `ms${name[0].toUpperCase() + name.slice(1)}`;
  return obj[prefixed] ? prefixed : name;
};

export const canUpgrade = () => !settings.IS_IE;

export const isTrackingLogicalChildNodes = (node) => {
  const nodeData = shadyDataForNode(node);
  return nodeData && nodeData.firstChild !== undefined;
};

export const isShadyRoot = (obj) => obj instanceof ShadowRoot;

export const hasShadowRootWithSlot = (node) => {
  const nodeData = shadyDataForNode(node);
  let root = nodeData && nodeData.root;
  return root && root._hasInsertionPoint();
};

let p = Element.prototype;
let matches =
  p.matches ||
  p.matchesSelector ||
  p.mozMatchesSelector ||
  p.msMatchesSelector ||
  p.oMatchesSelector ||
  p.webkitMatchesSelector;

export const matchesSelector = (element, selector) => {
  return matches.call(element, selector);
};

export const mixin = (target, source) => {
  for (var i in source) {
    target[i] = source[i];
  }
  return target;
};

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
    } catch (e) {
      // enqueue another record and throw
      twiddle.textContent = content++;
      throw e;
    }
  }
}).observe(twiddle, {characterData: true});

// use MutationObserver to get microtask async timing.
export const microtask = (callback) => {
  queue.push(callback);
  twiddle.textContent = content++;
};

/** @type {function(!Document, !Node): boolean} */
export const documentContains = (() => {
  if (document.contains) {
    return (doc, node) => doc[NATIVE_PREFIX + 'contains'](node);
  } else {
    return (doc, node) =>
      doc === node ||
      (doc.documentElement &&
        doc.documentElement[NATIVE_PREFIX + 'contains'](node));
  }
})();

export const contains = (container, node) => {
  while (node) {
    if (node == container) {
      return true;
    }
    node = node[SHADY_PREFIX + 'parentNode'];
  }
  return false;
};

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
  nodes.item = function (index) {
    return nodes[index];
  };
  nodes.namedItem = function (name) {
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
};

export const NATIVE_PREFIX = '__shady_native_';
export const SHADY_PREFIX = '__shady_';

export const nativeChildNodesArray = (parent) => {
  const result = [];
  for (
    let n = parent[NATIVE_PREFIX + 'firstChild'];
    n;
    n = n[NATIVE_PREFIX + 'nextSibling']
  ) {
    result.push(n);
  }
  return result;
};

export const childNodesArray = (parent) => {
  const result = [];
  for (
    let n = parent[SHADY_PREFIX + 'firstChild'];
    n;
    n = n[SHADY_PREFIX + 'nextSibling']
  ) {
    result.push(n);
  }
  return result;
};

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
    } catch (e) {
      // this error is harmless so we just trap it.
    }
  }
};

/**
 * Patch a group of accessors on an object. By default this overrides
 * @param {!Object} proto
 * @param {!Object} descriptors
 * @param {string=} prefix
 * @param {Array=} disallowedPatches
 */
export const patchProperties = (
  proto,
  descriptors,
  prefix = '',
  disallowedPatches
) => {
  for (let name in descriptors) {
    if (disallowedPatches && disallowedPatches.indexOf(name) >= 0) {
      continue;
    }
    patchProperty(proto, prefix + name, descriptors[name]);
  }
};

export const patchExistingProperties = (proto, descriptors) => {
  for (let name in descriptors) {
    if (name in proto) {
      patchProperty(proto, name, descriptors[name]);
    }
  }
};

// note, this is not a perfect polyfill since it doesn't include symbols
/** @return {!Object<!ObjectPropertyDescriptor>} */
export const getOwnPropertyDescriptors = (obj) => {
  const descriptors = {};
  Object.getOwnPropertyNames(obj).forEach((name) => {
    descriptors[name] = Object.getOwnPropertyDescriptor(obj, name);
  });
  return descriptors;
};

export const assign = (target, source) => {
  const names = Object.getOwnPropertyNames(source);
  for (let i = 0, p; i < names.length; i++) {
    p = names[i];
    target[p] = source[p];
  }
};

export const arrayFrom = (object) => {
  return [].slice.call(/** @type {IArrayLike} */ (object));
};

/**
 * Converts a single value to a node for `convertNodesIntoANode`.
 *
 * @param {*} arg
 * @return {!Node}
 */
const convertIntoANode = (arg) => {
  // `"" + arg` is used to implicitly coerce the value to a string (coercing a
  // symbol *should* fail here) before passing to `createTextNode`, which has
  // argument type `(number|string)`.
  return !(arg instanceof Node) ? document.createTextNode('' + arg) : arg;
};

/**
 * Implements 'convert nodes into a node'. The spec text indicates that strings
 * become text nodes, but doesn't describe what should happen if a non-Node,
 * non-string value is found in the arguments list. In practice, browsers coerce
 * these values to strings and convert those to text nodes.
 * https://dom.spec.whatwg.org/#converting-nodes-into-a-node
 *
 * @param {...*} args
 * @return {!Node}
 */
export const convertNodesIntoANode = (...args) => {
  if (args.length === 1) {
    return convertIntoANode(args[0]);
  }

  const fragment = document.createDocumentFragment();
  for (const arg of args) {
    fragment.appendChild(convertIntoANode(arg));
  }
  return fragment;
};

/**
 * Equivalent to `Array.prototype.flat`. Closure does not compile out this
 * function, so we need an implementation for browsers that don't natively
 * support it.
 *
 * @template T
 * @param {!Array<!T | !Array<!T>>} array
 * @param {number} depth
 * @return {!Array<!T>}
 */
export const flat = (array, depth = 1) => {
  for (; depth > 0; depth--) {
    array = array.reduce((acc, item) => {
      if (Array.isArray(item)) {
        acc.push(...item);
      } else {
        acc.push(item);
      }
      return acc;
    }, []);
  }

  return array;
};

/**
 * Deduplicates items in an array.
 *
 * This function could normally be implemented as merely `Array.from(new
 * Set(...))`. However, in IE 11, `Set` does not support being constructed with
 * an iterable. Further, some polyfills for `Array.from` effectively default to
 * `Array.prototype.slice.call(...)` when they are unable to find
 * `[Symbol.iterator]`; this is incompatible with `Set` which has no `length` or
 * indexable properties.
 *
 * @template T
 * @param {!Array<!T>} array
 * @return {!Array<!T>}
 */
export const deduplicate = (array) => {
  const results = [];
  const set = new Set();
  for (const item of array) {
    if (!set.has(item)) {
      results.push(item);
      set.add(item);
    }
  }
  return results;
};
