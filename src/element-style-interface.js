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
import documentWait from './document-wait'

let ScopingShim;
let ApplyShim;
let CustomStyleInterface;

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
  ensure() {}
}

/** @implements {StylingInterface} */
class ApplyInterface {
  constructor() {
    this.applyShim = new ApplyShimUtils.ApplyShimShim();
    this.customStyleInterface = null;
    this.booted = false;
  }
  ensure() {
    if (this.booted) {
      return;
    }
    this.customStyleInterface = window['CustomStyleInterface'];
    if (this.customStyleInterface) {
      this.customStyleInterface['transformCallback'] = (style) => {
        this.applyShim.transformCustomStyle(style);
      };
      this.customStyleInterface['validateCallback'] = () => {
        this.flushCustomStyles();
      }
    }
    this.booted = true;
  }
  prepareTemplate(template, elementName) {
    this.ensure();
    templateMap[elementName] = template;
    this.applyShim.transformTemplate(template, elementName);
  }
  flushCustomStyles() {
    this.ensure();
    if (this.customStyleInterface) {
      this.customStyleInterface['findStyles']();
      let styles = this.customStyleInterface['customStyles'];
      for (let i = 0; i < styles.length; i++ ) {
        let cs = styles[i];
        let style = this.customStyleInterface['getStyleForCustomStyle'](cs);
        if (style) {
          this.applyShim.transformCustomStyle(style);
        }
      }
      this.customStyleInterface['enqueued'] = false;
    }
  }
  styleSubtree(element, properties) {
    this.ensure();
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
    this.ensure();
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
    this.ensure();
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

export default class ElementStyleInterface {
  constructor() {
    /** @type {StylingInterface} */
    this.styleInterface = null;
    documentWait(() => {this.ensure()});
  }
  ensure() {
    if (this.styleInterface) {
      return;
    }
    ScopingShim = window['ScopingShim'];
    ApplyShim = window['ApplyShim'];
    CustomStyleInterface = window['CustomStyleInterface'];
    if (ScopingShim) {
      this.styleInterface = new ShadyInterface();
    } else if (ApplyShim) {
      this.styleInterface = new ApplyInterface();
    } else if (CustomStyleInterface) {
      this.styleInterface = new CustomOnlyInterface();
    }
  }
  /**
   * @param {HTMLTemplateElement} template
   * @param {string} elementName
   * @param {string=} elementExtends
   */
  prepareTemplate(template, elementName, elementExtends) {
    this.ensure();
    if (this.styleInterface) {
      this.styleInterface.prepareTemplate(template, elementName, elementExtends)
    }
  }

  /**
   * @param {Element} element
   * @param {Object=} properties
   */
  styleSubtree(element, properties) {
    this.ensure();
    if (this.styleInterface) {
      this.styleInterface.flushCustomStyles();
      this.styleInterface.styleSubtree(element, properties);
    }
  }

  /**
   * @param {Element} element
   */
  styleElement(element) {
    this.ensure();
    if (this.styleInterface) {
      this.styleInterface.flushCustomStyles();
      this.styleInterface.styleElement(element);
    }
  }

  /**
   * @param {Object=} properties
   */
  styleDocument(properties) {
    this.ensure();
    if (this.styleInterface) {
      this.styleInterface.flushCustomStyles();
      this.styleInterface.styleDocument(properties);
    }
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