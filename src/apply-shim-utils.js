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
import templateMap from './template-map'
import {StyleNode} from './css-parse' // eslint-disable-line no-unused-vars

/**
 * @const {Promise}
 */
const promise = Promise.resolve();

export function invalidate(elementName){
  let template = templateMap[elementName];
  if (template) {
    invalidateTemplate(template);
  }
}

export function invalidateTemplate(template) {
  template._applyShimInvalid = true;
}

export function isValid(elementName) {
  let template = templateMap[elementName];
  if (template) {
    return templateIsValid(template);
  }
  return true;
}

export function templateIsValid(template) {
  return !template._applyShimInvalid;
}

export function isValidating(elementName) {
  let template = templateMap[elementName];
  if (template) {
    return templateIsValidating(template);
  }
  return false;
}

export function templateIsValidating(template) {
  return template._validating;
}

/*
the template is marked as `validating` for one microtask so that all instances
found in the tree crawl of `applyStyle` will update themselves,
but the template will only be updated once.
*/
export function startValidating(elementName) {
  let template = templateMap[elementName];
  startValidatingTemplate(template);
}

export function startValidatingTemplate(template) {
  if (!template._validating) {
    template._validating = true;
    promise.then(function() {
      template._applyShimInvalid = false;
      template._validating = false;
    });
  }
}

export class ApplyShimShim {
  constructor() {
    /** @type {Object} */
    this.impl;
  }
  ensure() {
    if (!this.impl) {
      this.impl = window['ApplyShim'] || {
        ['detectMixin'](){return false},
        ['transformRule'](){},
        ['transformRules'](){},
        ['transformTemplate'](){},
        ['transformCustomStyle'](){},
        ['transformStyle'](){}
      };
      this.impl['invalidCallback'] = invalidate;
    }
  }
  /**
   * @param {string} text
   * @return {boolean}
   */
  detectMixin(text) {
    this.ensure();
    return this.impl['detectMixin'](text);
  }
  /**
   * @param {StyleNode} ast
   * @param {string=} elementName
   */
  transformRules(ast, elementName) {
    this.ensure();
    return this.impl['transformRules'](ast, elementName);
  }
  /**
   * @param {StyleNode} ast
   */
  transformRule(ast) {
    this.ensure();
    this.impl['transformRule'](ast);
  }
  /**
   * @param {!HTMLStyleElement} style
   * @param {string=} elementName
   */
  transformStyle(style, elementName = '') {
    this.ensure();
    this.impl['transformStyle'](style, elementName);
  }
  /**
   * @param {!HTMLStyleElement} style
   */
  transformCustomStyle(style) {
    this.ensure();
    this.impl['transformCustomStyle'](style);
  }
  /**
   * @param {!HTMLTemplateElement} template
   * @param {string} elementName
   */
  transformTemplate(template, elementName) {
    this.ensure();
    this.impl['transformTemplate'](template, elementName);
  }
}