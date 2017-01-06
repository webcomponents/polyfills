/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

export let settings = window.ShadyDOM || {};

settings.hasNativeShadowDOM = Boolean(Element.prototype.attachShadow && Node.prototype.getRootNode);

let desc = Object.getOwnPropertyDescriptor(Node.prototype, 'firstChild');

settings.hasDescriptors = Boolean(desc && desc.configurable && desc.get);
settings.inUse = settings.force || !settings.hasNativeShadowDOM;

export function isShadyRoot(obj) {
  return Boolean(obj.__localName === 'ShadyRoot');
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
    proto.__patchProto = patchProto;
  }
  // old browsers don't have setPrototypeOf
  obj.__proto__ = proto.__patchProto;
}

// TODO(sorvell): actually rely on a real Promise polyfill...
export let promish;
if (window.Promise) {
  promish = Promise.resolve();
} else {
  let twiddle = document.createTextNode('');
  let content = 0;
  promish = {
    then(cb) {
      // To preserve timing with Promise microtasks
      // we create a new observer for every callback.
      let observer = new MutationObserver(function() {
        observer.disconnect();
        cb();
      });
      observer.observe(twiddle, {characterData: true});
      twiddle.textContent = content++;
    }
  }
}