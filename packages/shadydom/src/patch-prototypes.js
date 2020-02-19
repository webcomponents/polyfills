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
import {EventTargetPatches} from './patches/EventTarget.js';
import {NodePatches} from './patches/Node.js';
import {SlotablePatches} from './patches/Slotable.js';
import {ParentNodePatches, ParentNodeDocumentOrFragmentPatches} from './patches/ParentNode.js';
import {ElementPatches, ElementShadowPatches} from './patches/Element.js';
import {ElementOrShadowRootPatches} from './patches/ElementOrShadowRoot.js';
import {HTMLElementPatches} from './patches/HTMLElement.js';
import {SlotPatches} from './patches/Slot.js';
import {DocumentOrFragmentPatches} from './patches/DocumentOrFragment.js';
import {DocumentOrShadowRootPatches} from './patches/DocumentOrShadowRoot.js';
import {DocumentPatches} from './patches/Document.js';
import {WindowPatches} from './patches/Window.js';

// Some browsers (IE/Edge) have non-standard HTMLElement accessors.
const NonStandardHTMLElement = {};

if (Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'parentElement')) {
  NonStandardHTMLElement.parentElement = NodePatches.parentElement;
}

if (Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'contains')) {
  NonStandardHTMLElement.contains = NodePatches.contains;
}

if (Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'children')) {
  NonStandardHTMLElement.children = ParentNodePatches.children;
}

if (Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML')) {
  NonStandardHTMLElement.innerHTML = ElementOrShadowRootPatches.innerHTML;
}

if (Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'className')) {
  NonStandardHTMLElement.className = ElementPatches.className;
}

// Avoid patching `innerHTML` if it does not exist on Element (IE)
// and we can patch accessors (hasDescriptors).
const ElementShouldHaveInnerHTML = !utils.settings.hasDescriptors || 'innerHTML' in Element.prototype;

// setup patching
const patchMap = {
  EventTarget: [EventTargetPatches],
  Node: [NodePatches, !window.EventTarget ? EventTargetPatches : null],
  Text: [SlotablePatches],
  Comment: [SlotablePatches],
  CDATASection: [SlotablePatches],
  ProcessingInstruction: [SlotablePatches],
  Element: [ElementPatches, ParentNodePatches, SlotablePatches,
    ElementShouldHaveInnerHTML ? ElementOrShadowRootPatches : null,
    !window.HTMLSlotElement ? SlotPatches : null],
  HTMLElement: [HTMLElementPatches, NonStandardHTMLElement],
  HTMLSlotElement: [SlotPatches],
  DocumentFragment: [ParentNodeDocumentOrFragmentPatches, DocumentOrFragmentPatches],
  Document: [DocumentPatches, ParentNodeDocumentOrFragmentPatches, DocumentOrFragmentPatches, DocumentOrShadowRootPatches],
  Window: [WindowPatches]
}

const getPatchPrototype = (name) => window[name] && window[name].prototype;

// Note, must avoid patching accessors on prototypes when descriptors are not correct
// because the CustomElements polyfill checks if these exist before patching instances.
// CustomElements polyfill *only* cares about these accessors.
const disallowedNativePatches = utils.settings.hasDescriptors ? null : ['innerHTML', 'textContent'];

/**
 * Patch a group of accessors on an object.
 * @param {!Object} proto
 * @param {!Array<Object>} list
 * @param {string=} prefix
 * @param {Array=} disallowed
 */
function applyPatchList(proto, list, prefix, disallowed) {
  list.forEach(patch => proto && patch &&
    utils.patchProperties(proto, patch, prefix, disallowed));
}

/** @param {string=} prefix */
export const applyPatches = (prefix) => {
  const disallowed = prefix ? null : disallowedNativePatches;
  for (let p in patchMap) {
    const proto = getPatchPrototype(p);
    applyPatchList(proto, patchMap[p], prefix, disallowed);
  }
}

const PROTO_IS_PATCHED = utils.SHADY_PREFIX + 'protoIsPatched';

// This property is stored directly on these objects, rather than in a local
// Map, because IE11 has a bug around `defineProperty`/`hasOwnProperty` which
// breaks Closure Compiler's WeakMap polyfill when using both certain native
// prototypes (e.g. of CDATASection) and their instances as keys - even if
// they're isolated to different WeakMaps. Closure's WeakMap polyfill is used
// transitively by its own Map and Set polyfills, so this bug applies to any
// situation where either of Map or Set are polyfilled also.
const PATCHED_PROTO = utils.SHADY_PREFIX + 'patchedProto';

// Patch non-element prototypes up front so that we don't have to check
// the type of Node when patching an can always assume we're patching an element.
['Text', 'Comment', 'CDATASection', 'ProcessingInstruction'].forEach(name => {
  const ctor = window[name];
  const patchedProto = Object.create(ctor.prototype);
  patchedProto[PROTO_IS_PATCHED] = true;
  applyPatchList(patchedProto, patchMap.EventTarget);
  applyPatchList(patchedProto, patchMap.Node);
  if (patchMap[name]) {
    applyPatchList(patchedProto, patchMap[name]);
  }
  ctor.prototype[PATCHED_PROTO] = patchedProto;
});

export const patchElementProto = (proto) => {
  proto[PROTO_IS_PATCHED] = true;
  applyPatchList(proto, patchMap.EventTarget);
  applyPatchList(proto, patchMap.Node);
  applyPatchList(proto, patchMap.Element);
  applyPatchList(proto, patchMap.HTMLElement);
  applyPatchList(proto, patchMap.HTMLSlotElement);
  return proto;
}

export const patchNodeProto = (node) => {
  if (node[PROTO_IS_PATCHED] || utils.isShadyRoot(node)) {
    return;
  }
  const nativeProto = Object.getPrototypeOf(node);
  // Note, this hasOwnProperty check is critical to avoid seeing a patched
  // prototype lower in the prototype chain, e.g. if an <s> element has been
  // patched, without this check, an <input> element would get the wrong patch.
  let proto = nativeProto.hasOwnProperty(PATCHED_PROTO) && nativeProto[PATCHED_PROTO];
  if (!proto) {
    proto = Object.create(nativeProto);
    patchElementProto(proto);
    nativeProto[PATCHED_PROTO] = proto;
  }
  Object.setPrototypeOf(node, proto);
}

export const patchShadowOnElement = () => {
  utils.patchProperties(Element.prototype, ElementShadowPatches);
}

export const addShadyPrefixedProperties = () => {
  // perform shady patches
  applyPatches(utils.SHADY_PREFIX);

  // install `_activeElement` because some browsers (older Chrome/Safari) do not have
  // a 'configurable' `activeElement` accesssor.
  const descriptor = DocumentOrShadowRootPatches.activeElement;
  Object.defineProperty(document, '_activeElement', descriptor);

  // On Window, we're patching `addEventListener` which is a weird auto-bound
  // property that is not directly on the Window prototype.
  utils.patchProperties(Window.prototype, WindowPatches, utils.SHADY_PREFIX);
};
