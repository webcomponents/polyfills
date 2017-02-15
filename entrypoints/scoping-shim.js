/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

import ScopingShim from '../src/scoping-shim'

/** @const {ScopingShim} */
const scopingShim = new ScopingShim();

window['ShadyCSS'] = {
  ['ScopingShim']: scopingShim,
  /**
   * @param {HTMLTemplateElement} template
   * @param {string} elementName
   * @param {string=} elementExtends
   */
  ['prepareTemplate'](template, elementName, elementExtends) {
    scopingShim.prepareTemplate(template, elementName, elementExtends)
  },

  /**
   * @param {Element} element
   * @param {Object=} properties
   */
  ['styleSubtree'](element, properties) {
    scopingShim.styleSubtree(element, properties);
  },

  /**
   * @param {Element} element
   */
  ['styleElement'](element) {
    scopingShim.styleElement(element);
  },

  /**
   * @param {Object=} properties
   */
  ['styleDocument'](properties) {
    scopingShim.styleDocument(properties);
  },

  /**
   * @param {Element} element
   * @param {string} property
   * @return {string}
   */
  ['getComputedStyleValue'](element, property) {
    return scopingShim.getComputedStyleValue(element, property);
  },

  ['nativeCss']: scopingShim.nativeCss,
  ['nativeShadow']: scopingShim.nativeShadow
};