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
import * as nativeTree from './native-tree.js';
import {patchBuiltins} from './patch-builtins.js';
import {patchEvents} from './patch-events.js';
import {ShadyRoot} from './attach-shadow.js';

if (utils.settings.inUse) {
  let ShadyDOM = {
    // TODO(sorvell): remove when Polymer does not depend on this.
    'inUse': utils.settings.inUse,
    // TODO(sorvell): remove when Polymer does not depend on this
    'patch': (node) => node,
    'isShadyRoot': utils.isShadyRoot,
    'enqueue': enqueue,
    'flush': flush,
    'settings': utils.settings,
    'filterMutations': filterMutations,
    'observeChildren': observeChildren,
    'unobserveChildren': unobserveChildren,
    'nativeMethods': nativeMethods,
    'nativeTree': nativeTree
  };

  window['ShadyDOM'] = ShadyDOM;

  // Apply patches to events...
  patchEvents();
  // Apply patches to builtins (e.g. Element.prototype) where applicable.
  patchBuiltins();

  window.ShadowRoot = ShadyRoot;
}
