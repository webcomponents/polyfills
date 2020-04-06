/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

import CustomElementInternals from '../CustomElementInternals.js';

import PatchParentNode from './Interface/ParentNode.js';
import * as Native from './Native.js';

export default function(internals: CustomElementInternals) {
  PatchParentNode(internals, DocumentFragment.prototype, {
    prepend: Native.DocumentFragment_prepend,
    append: Native.DocumentFragment_append,
  });
}
