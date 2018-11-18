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
import {EventTarget} from './patches/EventTarget.js';
import {Node} from './patches/Node.js';
import {Slotable} from './patches/Slotable.js';
import {ParentNode, ParentNodeDocumentOrFragment} from './patches/ParentNode.js';
import {Element} from './patches/Element.js';
import {ElementOrShadowRoot} from './patches/ElementOrShadowRoot.js';
import {HTMLElement} from './patches/HTMLElement.js';
import {Slot} from './patches/Slot.js';
import {DocumentOrFragment} from './patches/DocumentOrFragment.js';
import {DocumentOrShadowRoot} from './patches/DocumentOrShadowRoot.js';
import {Document} from './patches/Document.js';
import {Window} from './patches/Window.js';

// setup patching
const patchMap = {
  EventTarget: [EventTarget],
  Node: [Node],
  Text: [Slotable],
  Element: [Element, ParentNode, Slotable, ElementOrShadowRoot, !window.HTMLSlotElement ? Slot : undefined],
  HTMLElement: [HTMLElement],
  HTMLSlotElement: [Slot],
  DocumentFragment: [ParentNodeDocumentOrFragment, DocumentOrFragment],
  Document: [Document, ParentNodeDocumentOrFragment, DocumentOrFragment, DocumentOrShadowRoot],
  Window: [Window]
}

const getPatchPrototype = (name) => (name === 'HTMLElement') ?
    utils.NativeHTMLElement.prototype :
    window[name] && window[name].prototype;

const onPatchMap = (fn) => {
  for (let p in patchMap) {
    const proto = getPatchPrototype(p);
    patchMap[p].forEach(patch => proto && patch && fn(proto, patch));
  }
}

export const patchPrototypes = () => {
  // perform shady patches
  onPatchMap((proto, patch) =>
    utils.defineAccessors(proto,
      Object.getOwnPropertyDescriptors(patch), utils.SHADY_PREFIX));

  // install `_activeElement` since cannot patch `activeElement` on some browsers
  const descriptor = Object.getOwnPropertyDescriptor(DocumentOrShadowRoot, 'activeElement');
  Object.defineProperty(window.Document.prototype, '_activeElement', descriptor);

  // force window since it does not have the accessors.
  utils.patchAccessors(window.Window.prototype,
      Object.getOwnPropertyDescriptors(Window), true, utils.SHADY_PREFIX);

  // only perform native patches if `noPatch` flag not set.
  if (!utils.settings.noPatch) {
    onPatchMap((proto, patch) =>
      utils.patchAccessors(proto, Object.getOwnPropertyDescriptors(patch)));

    utils.patchAccessors(window.Window.prototype,
      Object.getOwnPropertyDescriptors(Window), true);

    // TODO(sorvell): is this needed?
    // force HTMLElement since it does not have the accessors.
    // utils.patchAccessors(window.HTMLElement.prototype,
    //     Object.getOwnPropertyDescriptors(HTMLElement), true);
  }
};