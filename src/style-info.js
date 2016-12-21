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

const promise = Promise.resolve();

export default class StyleInfo {
  static get(node) {
    return node.__styleInfo;
  }
  static set(node, styleInfo) {
    node.__styleInfo = styleInfo;
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
    this.styleRules = ast || null;
    this.placeholder = placeholder || null;
    this.ownStylePropertyNames = ownStylePropertyNames || [];
    this.overrideStyleProperties = null;
    this.elementName = elementName || '';
    this.cssBuild = cssBuild || '';
    this.typeExtension = typeExtension || '';
    this.styleProperties = null;
    this.scopeSelector = null;
    this.customStyle = null;
  }
}
