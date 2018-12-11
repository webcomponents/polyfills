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
import {addNativePrefixedProperties, nativeMethods, nativeTree} from './patch-native.js';
import {patchInsideElementAccessors, patchOutsideElementAccessors} from './patch-instances.js';
import {patchEvents, patchClick, composedPath} from './patch-events.js';
import {ShadyRoot} from './attach-shadow.js';
import {wrap, Wrapper} from './wrapper.js';
import {addShadyPrefixedProperties, applyPatches} from './patch-prototypes.js';

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
    'handlesDynamicScoping': true,
    'wrap': utils.settings.noPatch ? wrap : (n) => n,
    'Wrapper': Wrapper,
    'composedPath': composedPath,
    // Set to true to avoid patching regular platform property names. When set,
    // Shadow DOM compatible behavior is only available when accessing DOM
    // API using `ShadyDOM.wrap`, e.g. `ShadyDOM.wrap(element).shadowRoot`.
    // This setting provides a small performance boost, but requires all DOM API
    // access that requires Shadow DOM behavior to be proxied via `ShadyDOM.wrap`.
    'noPatch': utils.settings.noPatch,
    'nativeMethods': nativeMethods,
    'nativeTree': nativeTree
  };

  window['ShadyDOM'] = ShadyDOM;

  // Modifies native prototypes for Node, Element, etc. to
  // make native platform behavior available at prefixed names, e.g.
  // `utils.NATIVE_PREFIX + 'firstChild'` or `__shady_native_firstChild`.
  // This allows the standard names to be safely patched while retaining the
  // ability for native behavior to be used. This polyfill manipulates DOM
  // by using this saved native behavior.
  // Note, some browsers do not have proper element descriptors for
  // accessors; in this case, native behavior for these accessors is simulated
  // via a TreeWalker.
  addNativePrefixedProperties();

  // Modifies native prototypes for Node, Element, etc. to make ShadowDOM
  // behavior available at prefixed names, e.g.
  // `utils.SHADY_PREFIX + 'firstChild` or `__shady_firstChild`. This is done
  // so this polyfill can perform Shadow DOM style DOM manipulation.
  // Because patching normal platform property names is optional, these prefixed
  // names are used internally.
  addShadyPrefixedProperties();

  // Modifies native prototypes for Node, Element, etc. to patch
  // regular platform property names to have Shadow DOM compatible API behavior.
  // This applies the utils.SHADY_PREFIX behavior to normal names. For example,
  // if `noPatch` is not set, then `el.__shady_firstChild` is equivalent to
  // `el.firstChild`.
  // NOTE, on older browsers (old Chrome/Safari) native accessors cannot be
  // patched on prototypes (e.g. Node.prototype.firstChild cannot be modified).
  // On these browsers, instance level patching is performed where needed; this
  // instance patching is only done when `noPatch` is *not* set.
  if (!utils.settings.noPatch) {
    applyPatches();
    // Patch click event behavior only if we're patching
    patchClick()
  }

  // For simplicity, patch events unconditionally.
  // Patches the event system to have Shadow DOM compatible behavior (e.g.
  // event retargeting). When `noPatch` is set, retargeting is only available
  // when adding event listeners and dispatching events via `ShadyDOM.wrap`
  // (e.g. `ShadyDOM.wrap(element).addEventListener(...)`).
  patchEvents();

  window.ShadowRoot = ShadyRoot;
}
