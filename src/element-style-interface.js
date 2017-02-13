/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import templateMap from './template-map'
import {getIsExtends} from './style-util'
import * as ApplyShimUtils from './apply-shim-utils'

const ScopingShim = window['ScopingShim'];
const ApplyShim = window['ApplyShim'];
const CustomStyleInterface = window['CustomStyleInterface'];

/**
 * @param {Element} element
 * @param {Object=} properties
 */
function updateNativeProperties(element, properties) {
  // remove previous properties
  for (let p in properties) {
    // NOTE: for bc with shim, don't apply null values.
    if (p === null) {
      element.style.removeProperty(p);
    } else {
      element.style.setProperty(p, properties[p]);
    }
  }
}

/**
 * @typedef {{
 *   prepareTemplate: function(HTMLTemplateElement, string, string=),
 *   flushCustomStyles: function(),
 *   styleSubtree: function(HTMLElement, Object=),
 *   styleElement: function(HTMLElement),
 *   styleDocument: function(Object=)
 * }}
 */
let StylingInterface; // eslint-disable-line no-unused-vars

/** @implements {StylingInterface} */
class ShadyInterface {
  prepareTemplate(template, elementName, elementExtends) {
    ScopingShim['prepareTemplate'](template, elementName, elementExtends);
  }
  flushCustomStyles() {
    ScopingShim['flushCustomStyles']();
  }
  styleSubtree(element, properties) {
    ScopingShim['applySubtreeStyle'](element, properties);
  }
  styleElement(element) {
    ScopingShim['applyElementStyle'](element);
  }
  styleDocument(properties) {
    ScopingShim['updateStyles'](properties);
  }
}

/** @implements {StylingInterface} */
class ApplyInterface {
  constructor() {
    this.applyShim = new ApplyShimUtils.ApplyShimShim();
    if (CustomStyleInterface) {
      CustomStyleInterface['transformCallback'] = (style) => {
        this.applyShim.transformCustomStyle(style);
      };
      CustomStyleInterface['validateCallback'] = () => {
        this.flushCustomStyles();
      }
    }
  }
  prepareTemplate(template, elementName) {
    templateMap[elementName] = template;
    this.applyShim.transformTemplate(template, elementName);
  }
  flushCustomStyles() {
    if (CustomStyleInterface) {
      CustomStyleInterface['findStyles']();
      let styles = CustomStyleInterface['customStyles'];
      for (let i = 0; i < styles.length; i++ ) {
        let cs = styles[i];
        let style = CustomStyleInterface['getStyleForCustomStyle'](cs);
        if (style) {
          this.applyShim.transformCustomStyle(style);
        }
      }
      CustomStyleInterface['enqueued'] = false;
    }
  }
  styleSubtree(element, properties) {
    if (properties) {
      updateNativeProperties(element, properties);
    }
    if (element.shadowRoot) {
      this.styleElement(element);
      let shadowChildren = element.shadowRoot.children || element.shadowRoot.childNodes;
      for (let i = 0; i < shadowChildren.length; i++) {
        this.styleSubtree(shadowChildren[i]);
      }
    }
    let children = element.children || element.childNodes;
    for (let i = 0; i < children.length; i++) {
      this.styleSubtree(children[i]);
    }
  }
  styleElement(element) {
    let {is} = getIsExtends(element);
    let template = templateMap[is];
    if (template && !ApplyShimUtils.templateIsValid(template)) {
      // only revalidate template once
      if (!ApplyShimUtils.templateIsValidating(template)) {
        this.prepareTemplate(template, is);
        ApplyShimUtils.startValidatingTemplate(template);
      }
      // update all instances
      let root = element.shadowRoot;
      if (root) {
        let style = /** @type {HTMLStyleElement} */(root.querySelector('style'));
        if (style) {
          this.applyShim.transformStyle(style, is);
        }
      }
    }
  }
  styleDocument(properties) {
    this.styleSubtree(document.documentElement, properties);
  }
}

/** @implements {StylingInterface} */
class CustomOnlyInterface {
  constructor() {
    CustomStyleInterface['validateCallback'] = this.flushCustomStyles;
  }
  prepareTemplate() {}
  flushCustomStyles() {
    CustomStyleInterface['findStyles']();
    CustomStyleInterface['enqueued'] = false;
  }
  styleSubtree(element, properties) {
    updateNativeProperties(element, properties);
  }
  styleElement(element) {} // eslint-disable-line no-unused-vars
  styleDocument(properties) {
    updateNativeProperties(document.documentElement, properties);
  }
}

/** @type {StylingInterface} */
let styleInterface;

if (ScopingShim) {
  styleInterface = new ShadyInterface();
} else if (ApplyShim) {
  styleInterface = new ApplyInterface();
} else {
  styleInterface = new CustomOnlyInterface();
}

export default class ElementStyleInterface {
  /**
   * @param {HTMLTemplateElement} template
   * @param {string} elementName
   * @param {string=} elementExtends
   */
  prepareTemplate(template, elementName, elementExtends) {
    styleInterface.prepareTemplate(template, elementName, elementExtends)
  }

  /**
   * @param {Element} element
   * @param {Object=} properties
   */
  styleSubtree(element, properties) {
    styleInterface.flushCustomStyles();
    styleInterface.styleSubtree(element, properties);
  }

  /**
   * @param {Element} element
   */
  styleElement(element) {
    styleInterface.flushCustomStyles();
    styleInterface.styleElement(element);
  }

  /**
   * @param {Object=} properties
   */
  styleDocument(properties) {
    styleInterface.flushCustomStyles();
    styleInterface.styleDocument(properties);
  }

  /**
   * @param {Element} element
   * @param {string} property
   * @return {string}
   */
  getComputedStyleValue(element, property) {
    if (ScopingShim) {
      return ScopingShim['getComputedStyleValue'](element, property);
    } else {
      return window.getComputedStyle(element).getPropertyValue(property).trim();
    }
  }
}

ElementStyleInterface.prototype['prepareTemplate'] = ElementStyleInterface.prototype.prepareTemplate;
ElementStyleInterface.prototype['styleSubtree'] = ElementStyleInterface.prototype.styleSubtree;
ElementStyleInterface.prototype['styleElement'] = ElementStyleInterface.prototype.styleElement;
ElementStyleInterface.prototype['styleDocument'] = ElementStyleInterface.prototype.styleDocument;
ElementStyleInterface.prototype['getComputedStyleValue'] = ElementStyleInterface.prototype.getComputedStyleValue;