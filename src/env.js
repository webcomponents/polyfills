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
import {flush, enqueue} from './flush'
import {observeChildren, unobserveChildren, filterMutations} from './observe-changes'
import * as nativeMethods from './native-methods'
import * as mixins from './global-mixin'
import { tryExtendAccessors, tryExtend, OtherAccessors,
  getComposedInnerHTML, getComposedChildNodes} from './accessor-mixin'
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

  window.Event = events.PatchedEvent;
  window.CustomEvent = events.PatchedCustomEvent;
  window.MouseEvent = events.PatchedMouseEvent;
  events.activateFocusEventOverrides();

  mixins.extendGlobal(Node.prototype, mixins.Node);
  mixins.extendGlobal(Text.prototype, mixins.Text);
  mixins.extendGlobal(DocumentFragment.prototype, mixins.Fragment);
  mixins.extendGlobal(Element.prototype, mixins.Element);
  mixins.extendGlobal(Document.prototype, mixins.Document);
  if (window.HTMLSlotElement) {
    mixins.extendGlobal(window.HTMLSlotElement.prototype, mixins.Slot);
  }

  if (utils.settings.hasDescriptors) {
    tryExtendAccessors(Node.prototype);
    tryExtendAccessors(Text.prototype);
    tryExtendAccessors(DocumentFragment.prototype);
    tryExtendAccessors(Element.prototype);
    let nativeHTMLElement =
      (window.customElements && customElements.nativeHTMLElement) ||
      HTMLElement;
    tryExtendAccessors(nativeHTMLElement.prototype);
    tryExtendAccessors(Document.prototype);
    if (window.HTMLSlotElement) {
      tryExtendAccessors(window.HTMLSlotElement.prototype);
    }
  } else {
    Object.defineProperty(document, '_activeElement', OtherAccessors.activeElement);
  }

}