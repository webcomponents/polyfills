/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

import templateMap from './template-map'
import {StyleNode} from './css-parse'

/**
 * @const {Promise}
 */
const promise = Promise.resolve();

/**
 * @const {string}
 */
const infoKey = '__styleInfo';

export default class StyleInfo {
  static get(node) {
    return node[infoKey];
  }
  static set(node, styleInfo) {
    node[infoKey] = styleInfo;
    return styleInfo;
  }
  static invalidate(elementName) {
    if (templateMap[elementName]) {
      templateMap[elementName]._applyShimInvalid = true;
    }
  }
  /*
  the template is marked as `validating` for one microtask so that all instances
  found in the tree crawl of `applyStyle` will update themselves,
  but the template will only be updated once.
  */
  static startValidating(elementName) {
    /**
     * @const {Element|undefined}
     */
    const template = templateMap[elementName];
    if (!template._validating) {
      template._validating = true;
      promise.then(() => {
        template._applyShimInvalid = false;
        template._validating = false;
      });
    }
  }
  constructor(ast, placeholder, ownStylePropertyNames, elementName, typeExtension, cssBuild) {
    /** @type {?StyleNode} */
    this.styleRules = ast || null;
    /** @type {?Node} */
    this.placeholder = placeholder || null;
    /** @type {!Array<string>} */
    this.ownStylePropertyNames = ownStylePropertyNames || [];
    /** @type {?Array<Object>} */
    this.overrideStyleProperties = null;
    /** @type {string} */
    this.elementName = elementName || '';
    /** @type {string} */
    this.cssBuild = cssBuild || '';
    /** @type {string} */
    this.typeExtension = typeExtension || '';
    /** @type {?Array<Object>} */
    this.styleProperties = null;
    /** @type {?string} */
    this.scopeSelector = null;
    /** @type {?Node} */
    this.customStyle = null;
  }
}