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

import * as utils from './utils.js';
import {flush, enqueue} from './flush.js';
import {observeChildren, unobserveChildren, filterMutations} from './observe-changes.js';
import * as nativeMethods from './native-methods.js';
import {accessors as nativeTree} from './native-tree.js';
import {patchBuiltins} from './patch-builtins.js';
import {patchInsideElementAccessors, patchOutsideElementAccessors} from './patch-accessors.js';
import {patchEvents} from './patch-events.js';
import {ShadyRoot} from './attach-shadow.js';

if (utils.settings.inUse) {
  let ShadyDOM = {
    // TODO(sorvell): remove when Polymer does not depend on this.
    'inUse': utils.settings.inUse,
    // NOTE: old browsers without prototype accessors (very old Chrome
    // and Safari) need manually patched accessors to properly set
    // `innerHTML` and `textContent` when an element is:
    // (1) inside a shadowRoot
    // (2) does not have special (slot) children itself
    // (3) and setting the property needs to provoke distribution (because
    // a nested slot is added/removed)
    'patch': (node) => {
      patchInsideElementAccessors(node);
      patchOutsideElementAccessors(node);
      return node;
    },
    'isShadyRoot': utils.isShadyRoot,
    'enqueue': enqueue,
    'flush': flush,
    'settings': utils.settings,
    'filterMutations': filterMutations,
    'observeChildren': observeChildren,
    'unobserveChildren': unobserveChildren,
    'nativeMethods': nativeMethods,
    'nativeTree': nativeTree,
    // Set to true to defer native custom elements connection until the
    // document has fully parsed. This enables custom elements that create
    // shadowRoots to be defined while the document is loading. Elements
    // customized as they are created by the parser will successfully
    // render with this flag on.
    'deferConnectionCallbacks': utils.settings['deferConnectionCallbacks'],
    // Set to true to speed up the polyfill slightly at the cost of correctness
    // * does not patch querySelector/All on Document or DocumentFragment
    // * does not wrap connected/disconnected callbacks to de-dup these
    // when using native customElements
    // * does not wait to process children of elements with shadowRoots
    // meaning shadowRoots should not be created while an element is parsing
    // (e.g. if a custom element that creates a shadowRoot is defined before
    // a candidate element in the document below it.
    'preferPerformance': utils.settings['preferPerformance'],
    // Integration point with ShadyCSS to disable styling MutationObserver,
    // as ShadyDOM will now handle dynamic scoping.
    'handlesDynamicScoping': true
  };

  window['ShadyDOM'] = ShadyDOM;

  // Apply patches to events...
  patchEvents();
  // Apply patches to builtins (e.g. Element.prototype) where applicable.
  patchBuiltins();

  window.ShadowRoot = ShadyRoot;
}
