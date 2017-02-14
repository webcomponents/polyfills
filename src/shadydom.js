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
import * as nativeTree from './native-tree'
import {patchBuiltins} from './patch-builtins'
import {patchEvents} from './patch-events'
import {ShadyRoot} from './attach-shadow'

if (utils.settings.inUse) {

  window.ShadyDOM = {
    // TODO(sorvell): remove when Polymer does not depend on this.
    inUse: utils.settings.inUse,
    // TODO(sorvell): remove when Polymer does not depend on this.
    patch: function(node) { return node; },
    isShadyRoot: utils.isShadyRoot,
    enqueue: enqueue,
    flush: flush,
    settings: utils.settings,
    filterMutations: filterMutations,
    observeChildren: observeChildren,
    unobserveChildren: unobserveChildren,
    nativeMethods: nativeMethods,
    nativeTree: nativeTree
  };

  // Apply patches to events...
  patchEvents();
  // Apply patches to builtins (e.g. Element.prototype) where applicable.
  patchBuiltins();

  window.ShadowRoot = ShadyRoot;
}
