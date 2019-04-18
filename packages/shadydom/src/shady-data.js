/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/


export class ShadyData {
  constructor() {
    /** @type {ShadowRoot} */
    this.root = null;
    /** @type {ShadowRoot} */
    this.publicRoot = null;
    this.dirty = false;
    this.observer = null;
    /** @type {Array<Node>} */
    this.assignedNodes = null;
    /** @type {Element} */
    this.assignedSlot = null;
    /** @type {Array<Node>} */
    this._previouslyAssignedNodes = null;
    /** @type {Element} */
    this._prevAssignedSlot = null;
    /** @type {Array<Node>} */
    this.flattenedNodes = null;
    this.ownerShadyRoot = undefined;
    /** @type {Node|undefined} */
    this.parentNode = undefined;
    /** @type {Node|undefined} */
    this.firstChild = undefined;
    /** @type {Node|undefined} */
    this.lastChild = undefined;
    /** @type {Node|undefined} */
    this.previousSibling = undefined;
    /** @type {Node|undefined} */
    this.nextSibling = undefined;
    /** @type {Array<Node>|undefined} */
    this.childNodes = undefined;
    this.__outsideAccessors = false;
    this.__insideAccessors = false;
    this.__onCallbackListeners = {};
  }

  toJSON() {
    return {};
  }
}

export function ensureShadyDataForNode(node) {
  if (!node.__shady) {
    node.__shady = new ShadyData();
  }
  return node.__shady;
}

export function shadyDataForNode(node) {
  return node && node.__shady;
}
