/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import * as utils from '../utils.js';
import { query } from './ParentNode.js';

export const DocumentOrFragmentPatches = utils.getOwnPropertyDescriptors({

  /**
   * @this {Element}
   * @param {string} id
   */
  getElementById(id) {
    if (id === '') {
      return null;
    }
    let result = query(this, function(n) {
      return n.id == id;
    }, function(n) {
      return Boolean(n);
    })[0];
    return result || null;
  }

});