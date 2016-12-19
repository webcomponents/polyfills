/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/**
 * Patches elements that interacts with ShadyDOM
 * such that tree traversal and mutation apis act like they would under
 * ShadowDOM.
 *
 * This import enables seemless interaction with ShadyDOM powered
 * custom elements, enabling better interoperation with 3rd party code,
 * libraries, and frameworks that use DOM tree manipulation apis.
 */

'use strict';
import * as utils from './utils'
import {ShadyRoot} from './shady-root'
import {flush, enqueue} from './flush'
import {observeChildren, unobserveChildren, filterMutations} from './observe-changes'
import * as nativeMethods from './native-methods'
// TODO(sorvell): remove when code that depends on this is moved to dom-mixin
import {getRootNode, setAttribute} from './shady-mutation'
import { Mixins, patchProto,
  getComposedInnerHTML, getComposedChildNodes} from './dom-mixin'
import * as events from './event-mixin'

if (utils.settings.inUse) {

  window.ShadyDOM = {
    // TODO(sorvell): remove when Polymer does not depend on this.
    inUse: utils.settings.inUse,
    // TODO(sorvell): remove when Polymer does not depend on this.
    patch: function(node) { return node; },
    getComposedInnerHTML: getComposedInnerHTML,
    getComposedChildNodes: getComposedChildNodes,
    isShadyRoot: utils.isShadyRoot,
    // TODO(sorvell): exposed for testing only, worth it?
    enqueue: enqueue,
    flush: flush,
    settings: utils.settings,
    filterMutations: filterMutations,
    observeChildren: observeChildren,
    unobserveChildren: unobserveChildren,
    nativeMethods: nativeMethods
  };

  let createRootAndEnsurePatched = function(node) {
    // TODO(sorvell): need to ensure ancestors are patched but this introduces
    // a timing problem with gathering composed children.
    // (1) currently the child list is crawled and patched when patching occurs
    // (this needs to change)
    // (2) we can only patch when an element has received its parsed children
    // because we cannot detect them when inserted by parser.
    // let ancestor = node;
    // while (ancestor) {
    //   patchNode(ancestor);
    //   ancestor = ancestor.parentNode || ancestor.host;
    // }
    //patch.patchNode(node);
    let root = new ShadyRoot(node);
    //patch.patchNode(root);
    return root;
  }

  Element.prototype.attachShadow = function() {
    return createRootAndEnsurePatched(this);
  }

  Node.prototype.addEventListener = events.addEventListener;
  Node.prototype.removeEventListener = events.removeEventListener;
  Event = events.PatchedEvent;
  CustomEvent = events.PatchedCustomEvent;
  MouseEvent = events.PatchedMouseEvent;
  events.activateFocusEventOverrides();

  Object.defineProperty(Node.prototype, 'isConnected', {
    get() {
      return document.documentElement.contains(this);
    },
    configurable: true
  });

  Node.prototype.getRootNode = function(options) {
    return getRootNode(this, options);
  }

  Object.defineProperty(Element.prototype, 'slot', {
    get() {
      return this.getAttribute('slot');
    },
    set(value) {
      this.setAttribute('slot', value);
    },
    configurable: true
  });

  Object.defineProperty(Node.prototype, 'assignedSlot', {
    get() {
      return (this.__shady && this.__shady.assignedSlot) || null;
    },
    configurable: true
  });

  // let nativeSetAttribute = Element.prototype.setAttribute;
  // Element.prototype.setAttribute = setAttribute;
  // NOTE: expose native setAttribute to allow hooking native method
  // (e.g. this is done in ShadyCSS)

  let classNameDescriptor = {
    get() {
      return this.getAttribute('class');
    },
    set(value) {
      this.setAttribute('class', value);
    },
    configurable: true
  };


  // Safari 9 `className` is not configurable
  let cn = Object.getOwnPropertyDescriptor(Element.prototype, 'className');
  if (cn && cn.configurable) {
    Object.defineProperty(Element.prototype, 'className', classNameDescriptor);
  } else {
    // on IE `className` is on Element
    let h = window.customElements && window.customElements.nativeHTMLElement ||
      HTMLElement;
    cn = Object.getOwnPropertyDescriptor(h.prototype, 'className');
    if (cn && cn.configurable) {
      Object.defineProperty(h.prototype, 'className', classNameDescriptor);
    }
  }

  patchProto(Node.prototype, Mixins.Node);
  patchProto(Text.prototype, Mixins.Text);
  patchProto(DocumentFragment.prototype, Mixins.Fragment);
  patchProto(Element.prototype, Mixins.Element);
  let he = (window.customElements && customElements.nativeHTMLElement) ||
    HTMLElement;
  patchProto(he.prototype, Mixins.HTMLElement, true);
  patchProto(Document.prototype, Mixins.Document);
  if (window.HTMLSlotElement) {
    patchProto(HTMLSlotElement.prototype, Mixins.Slot);
  }

  // Safari 9 testing
  // patchProto(Text.prototype, Mixins.Node);
  // patchProto(he.prototype, Mixins.Node);
  // patchProto(he.prototype, Mixins.Element);

}