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

export let settings = window['ShadyDOM'] || {};

settings.hasNativeShadowDOM = Boolean(Element.prototype.attachShadow && Node.prototype.getRootNode);

let desc = Object.getOwnPropertyDescriptor(Node.prototype, 'firstChild');

settings.hasDescriptors = Boolean(desc && desc.configurable && desc.get);
settings.inUse = settings['force'] || !settings.hasNativeShadowDOM;

// Default to using native accessors (instead of treewalker) only for
// IE/Edge where they are faster.
const IS_IE = navigator.userAgent.match('Trident');
const IS_EDGE = navigator.userAgent.match('Edge');
if (settings.useNativeAccessors === undefined) {
  settings.useNativeAccessors = settings.hasDescriptors && (IS_IE || IS_EDGE);
}

export function isTrackingLogicalChildNodes(node) {
  const nodeData = shadyDataForNode(node);
  return (nodeData && nodeData.firstChild !== undefined);
}

export function isShadyRoot(obj) {
  return Boolean(obj._localName === 'ShadyRoot');
}

export function ownerShadyRootForNode(node) {
  let root = node.getRootNode();
  if (isShadyRoot(root)) {
    return root;
  }
}

let p = Element.prototype;
let matches = p.matches || p.matchesSelector ||
  p.mozMatchesSelector || p.msMatchesSelector ||
  p.oMatchesSelector || p.webkitMatchesSelector;

export function matchesSelector(element, selector) {
  return matches.call(element, selector);
}

function copyOwnProperty(name, source, target) {
  let pd = Object.getOwnPropertyDescriptor(source, name);
  if (pd) {
    Object.defineProperty(target, name, pd);
  }
}

export function extend(target, source) {
  if (target && source) {
    let n$ = Object.getOwnPropertyNames(source);
    for (let i=0, n; (i<n$.length) && (n=n$[i]); i++) {
      copyOwnProperty(n, source, target);
    }
  }
  return target || source;
}

export function extendAll(target, ...sources) {
  for (let i=0; i < sources.length; i++) {
    extend(target, sources[i]);
  }
  return target;
}

export function mixin(target, source) {
  for (var i in source) {
    target[i] = source[i];
  }
  return target;
}

export function patchPrototype(obj, mixin) {
  let proto = Object.getPrototypeOf(obj);
  if (!proto.hasOwnProperty('__patchProto')) {
    let patchProto = Object.create(proto);
    patchProto.__sourceProto = proto;
    extend(patchProto, mixin);
    proto['__patchProto'] = patchProto;
  }
  // old browsers don't have setPrototypeOf
  obj.__proto__ = proto['__patchProto'];
}


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
export function microtask(callback) {
  queue.push(callback);
  twiddle.textContent = content++;
}

export const hasDocumentContains = Boolean(document.contains);

export function contains(container, node) {
  while (node) {
    if (node == container) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

function getNodeHTMLCollectionName(node) {
  return node.getAttribute('id') || node.getAttribute('name');
}

function isValidHTMLCollectionName(name) {
  return name !== 'length' && isNaN(name);
}

export function createPolyfilledHTMLCollection(nodes) {
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
