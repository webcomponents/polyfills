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
import {ElementPatches} from './patches/Element.js';
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
  Object.defineProperty(NonStandardHTMLElement, 'parentElement',
    Object.getOwnPropertyDescriptor(NodePatches, 'parentElement'));
}

if (Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'contains')) {
  Object.defineProperty(NonStandardHTMLElement, 'contains',
    Object.getOwnPropertyDescriptor(NodePatches, 'contains'));
}

if (Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'children')) {
  Object.defineProperty(NonStandardHTMLElement, 'children',
    Object.getOwnPropertyDescriptor(ParentNodePatches, 'children'));
}

if (Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML')) {
  Object.defineProperty(NonStandardHTMLElement, 'innerHTML',
    Object.getOwnPropertyDescriptor(ElementOrShadowRootPatches, 'innerHTML'));
}

// setup patching
const patchMap = {
  EventTarget: [EventTargetPatches],
  Node: [NodePatches, !window.EventTarget ? EventTargetPatches : null],
  Text: [SlotablePatches],
  Element: [ElementPatches, ParentNodePatches, SlotablePatches,
    utils.settings.IS_IE ? null : ElementOrShadowRootPatches,
    !window.HTMLSlotElement ? SlotPatches : null],
  HTMLElement: [HTMLElementPatches, NonStandardHTMLElement],
  HTMLSlotElement: [SlotPatches],
  DocumentFragment: [ParentNodeDocumentOrFragmentPatches, DocumentOrFragmentPatches],
  Document: [DocumentPatches, ParentNodeDocumentOrFragmentPatches, DocumentOrFragmentPatches, DocumentOrShadowRootPatches],
  Window: [WindowPatches]
}

const getPatchPrototype = (name) => (name === 'HTMLElement') ?
    HTMLElement.prototype :
    window[name] && window[name].prototype;

export const applyPatches = (prefix) => {
  for (let p in patchMap) {
    const proto = getPatchPrototype(p);
    patchMap[p].forEach(patch => proto && patch &&
        utils.patchProperties(proto, utils.getOwnPropertyDescriptors(patch), true, prefix));
  }
}

export const addShadyPrefixedProperties = () => {
  // perform shady patches
  applyPatches(utils.SHADY_PREFIX);

  // install `_activeElement` because some browsers (older Chrome/Safari) do not have
  // a 'configurable' `activeElement` accesssor.
  const descriptor = Object.getOwnPropertyDescriptor(DocumentOrShadowRootPatches, 'activeElement');
  Object.defineProperty(document, '_activeElement', descriptor);

  // On Window, we're patching `addEventListener` which is a weird auto-bound
  // property that is not directly on the Window prototype.
  utils.patchProperties(Window.prototype,
      utils.getOwnPropertyDescriptors(WindowPatches), true, utils.SHADY_PREFIX);
};