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

const IEHTMLElement = {};

if (utils.settings.IS_IE) {
  Object.defineProperty(IEHTMLElement, 'parentElement',
    Object.getOwnPropertyDescriptor(Node, 'parentElement'));

  Object.defineProperty(IEHTMLElement, 'contains',
    Object.getOwnPropertyDescriptor(Node, 'contains'));

  Object.defineProperty(IEHTMLElement, 'children',
    Object.getOwnPropertyDescriptor(ParentNode, 'children'));

  Object.defineProperty(IEHTMLElement, 'innerHTML',
    Object.getOwnPropertyDescriptor(ElementOrShadowRoot, 'innerHTML'));

}

// setup patching
const patchMap = {
  EventTarget: [EventTarget],
  Node: [Node, !window.EventTarget ? EventTarget : null],
  Text: [Slotable],
  Element: [Element, ParentNode, Slotable, utils.settings.IS_IE ? null : ElementOrShadowRoot, !window.HTMLSlotElement ? Slot : null],
  HTMLElement: [HTMLElement, utils.settings.IS_IE ? IEHTMLElement : null],
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
    utils.patchAccessors(proto,
      utils.getOwnPropertyDescriptors(patch), true, utils.SHADY_PREFIX));

  // install `_activeElement` for backwards compatibility
  const descriptor = Object.getOwnPropertyDescriptor(DocumentOrShadowRoot, 'activeElement');
  Object.defineProperty(window.Document.prototype, '_activeElement', descriptor);

  // force window since it does not have the accessors.
  utils.patchAccessors(window.Window.prototype,
      utils.getOwnPropertyDescriptors(Window), true, utils.SHADY_PREFIX);

  // only perform native patches if `noPatch` flag not set.
  if (!utils.settings.noPatch) {
    // TODO(sorvell): what browsers need "force" here?
    // if it's needed, then need to try/catch since it fails on older browsers.
    // avoid "forcing" properties since this can error on some browsers.
    onPatchMap((proto, patch) =>
      utils.patchAccessors(proto, utils.getOwnPropertyDescriptors(patch), true));
  }
};