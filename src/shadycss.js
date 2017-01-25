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

import {parse, StyleNode} from './css-parse'
import {nativeShadow, nativeCssVariables} from './style-settings'
import StyleTransformer from './style-transformer'
import * as StyleUtil from './style-util'
import StyleProperties from './style-properties'
import placeholderMap from './style-placeholder'
import StyleInfo from './style-info'
import StyleCache from './style-cache'
import {flush as watcherFlush} from './document-watcher'
import templateMap from './template-map'
import CustomStyleInterface from './custom-style-interface'

let ApplyShim = window['ApplyShim'];
if (!ApplyShim) {
  /** no-op functions to skip checking `ApplyShim` in a bunch of spots */
  ApplyShim = {
    /**
     * @param {string} text
     * @return {boolean}
     */
    ['detectMixin'](text){ return false },
    /**
     * @param {StyleNode} ast
     * @param {string} elementName
     */
    ['transformRules'](ast, elementName){},
    /**
     * @param {StyleNode} ast
     */
    ['transformRule'](ast){}
  }
}

ApplyShim['invalidCallback'] = StyleInfo.invalidate;

/**
 * @const {StyleCache}
 */
const styleCache = new StyleCache();

class ShadyCSS {
  constructor() {
    this._scopeCounter = {};
    this._documentOwner = document.documentElement;
    this._documentOwnerStyleInfo = StyleInfo.set(document.documentElement, new StyleInfo({rules: []}));
    this._elementsHaveApplied = false;
    /** @type {function(!HTMLStyleElement)} */
    const transformFn = (style) => {this.transformCustomStyleForDocument(style)};
    const validateFn = () => {
      requestAnimationFrame(() => {
        if (this._customStyleInterface.enqueued || this._elementsHaveApplied) {
          this.updateStyles();
        }
        this._customStyleInterface.enqueued = false;
      })
    };
    this._customStyleInterface = new CustomStyleInterface(transformFn, validateFn);
  }
  flush() {
    watcherFlush();
  }
  _generateScopeSelector(name) {
    let id = this._scopeCounter[name] = (this._scopeCounter[name] || 0) + 1;
    return `${name}-${id}`;
  }
  getStyleAst(style) {
    return StyleUtil.rulesForStyle(style);
  }
  styleAstToString(ast) {
    return StyleUtil.toCssText(ast);
  }
  _gatherStyles(template) {
    let styles = template.content.querySelectorAll('style');
    let cssText = [];
    for (let i = 0; i < styles.length; i++) {
      let s = styles[i];
      cssText.push(s.textContent);
      s.parentNode.removeChild(s);
    }
    return cssText.join('').trim();
  }
  _getCssBuild(template) {
    let style = template.content.querySelector('style');
    if (!style) {
      return '';
    }
    return style.getAttribute('css-build') || '';
  }
  /**
   * Prepare the styling and template for the given element type
   *
   * @param {HTMLTemplateElement} template
   * @param {string} elementName
   * @param {string=} typeExtension
   */
  prepareTemplate(template, elementName, typeExtension) {
    if (template._prepared) {
      return;
    }
    template._prepared = true;
    template.name = elementName;
    template.extends = typeExtension;
    templateMap[elementName] = template;
    let cssBuild = this._getCssBuild(template);
    let cssText = this._gatherStyles(template);
    let info = {
      is: elementName,
      extends: typeExtension,
      __cssBuild: cssBuild,
    };
    if (!nativeShadow) {
      StyleTransformer.dom(template.content, elementName);
    }
    // check if the styling has mixin definitions or uses
    let hasMixins = ApplyShim['detectMixin'](cssText);
    let ast = parse(cssText);
    // only run the applyshim transforms if there is a mixin involved
    if (hasMixins && nativeCssVariables) {
      ApplyShim['transformRules'](ast, elementName);
    }
    template._styleAst = ast;
    template._cssBuild = cssBuild;

    let ownPropertyNames = [];
    if (!nativeCssVariables) {
      ownPropertyNames = StyleProperties.decorateStyles(template._styleAst, info);
    }
    if (!ownPropertyNames.length || nativeCssVariables) {
      let root = nativeShadow ? template.content : null;
      let placeholder = placeholderMap[elementName];
      let style = this._generateStaticStyle(info, template._styleAst, root, placeholder);
      template._style = style;
    }
    template._ownPropertyNames = ownPropertyNames;
  }
  _generateStaticStyle(info, rules, shadowroot, placeholder) {
    let cssText = StyleTransformer.elementStyles(info, rules);
    if (cssText.length) {
      return StyleUtil.applyCss(cssText, info.is, shadowroot, placeholder);
    }
  }
  _prepareHost(host) {
    let is = host.getAttribute('is') || host.localName;
    let typeExtension;
    if (is !== host.localName) {
      typeExtension = host.localName;
    }
    let placeholder = placeholderMap[is];
    let template = templateMap[is];
    let ast;
    let ownStylePropertyNames;
    let cssBuild;
    if (template) {
      ast = template._styleAst;
      ownStylePropertyNames = template._ownPropertyNames;
      cssBuild = template._cssBuild;
    }
    return StyleInfo.set(host,
      new StyleInfo(
        ast,
        placeholder,
        ownStylePropertyNames,
        is,
        typeExtension,
        cssBuild
      )
    );
  }
  /**
   * Apply styles for the given element
   *
   * @param {!HTMLElement} host
   * @param {Object=} overrideProps
   */
  applyStyle(host, overrideProps) {
    let is = host.getAttribute('is') || host.localName;
    let styleInfo = StyleInfo.get(host);
    let hasApplied = Boolean(styleInfo);
    if (!styleInfo) {
      styleInfo = this._prepareHost(host);
    }
    // Only trip the `elementsHaveApplied` flag if a node other that the root document has `applyStyle` called
    if (!this._isRootOwner(host)) {
      this._elementsHaveApplied = true;
    }
    this._customStyleInterface.flush();
    if (this._customStyleInterface.enqueued) {
      this._customStyleInterface.findStyles();
      let customStyles = this._customStyleInterface.customStyles;
      if (!nativeCssVariables) {
        this._updateProperties(this._documentOwner, this._documentOwnerStyleInfo);
      } else {
        this._revalidateCustomStyleApplyShim(customStyles);
      }
      this._applyCustomStyles(customStyles);
      // if no elements have booted yet, we can just update the document and be done
      if (!this._elementsHaveApplied) {
        return;
      }
      // if no native css custom properties, we must recalculate the whole tree
      if (!nativeCssVariables) {
        this.updateStyles();
        /*
        When updateStyles() runs, this element may not have a shadowroot yet.
        If not, we need to make sure that this element runs `applyStyle` on itself at least once to generate a style
        */
        if (hasApplied) {
          return;
        }
      }
    }
    if (overrideProps) {
      styleInfo.overrideStyleProperties =
        styleInfo.overrideStyleProperties || {};
      Object.assign(styleInfo.overrideStyleProperties, overrideProps);
    }
    if (nativeCssVariables) {
      if (styleInfo.overrideStyleProperties) {
        this._updateNativeProperties(host, styleInfo.overrideStyleProperties);
      }
      let template = templateMap[is];
      // bail early if there is no shadowroot for this element
      if (!template && !this._isRootOwner(host)) {
        return;
      }
      if (template && template._applyShimInvalid && template._style) {
        // update template
        if (!template._validating) {
          ApplyShim['transformRules'](template._styleAst, is);
          template._style.textContent = StyleTransformer.elementStyles(host, styleInfo.styleRules);
          StyleInfo.startValidating(is);
        }
        // update instance if native shadowdom
        if (nativeShadow) {
          let root = host.shadowRoot;
          if (root) {
            let style = root.querySelector('style');
            style.textContent = StyleTransformer.elementStyles(host, styleInfo.styleRules);
          }
        }
        styleInfo.styleRules = template._styleAst;
      }
    } else {
      this._updateProperties(host, styleInfo);
      if (styleInfo.ownStylePropertyNames && styleInfo.ownStylePropertyNames.length) {
        this._applyStyleProperties(host, styleInfo);
      }
    }
    if (hasApplied) {
      let root = this._isRootOwner(host) ? host : host.shadowRoot;
      // note: some elements may not have a root!
      if (root) {
        this._applyToDescendants(root);
      }
    }
  }
  _applyToDescendants(root) {
    let c$ = root.children;
    for (let i = 0, c; i < c$.length; i++) {
      c = c$[i];
      if (c.shadowRoot) {
        this.applyStyle(c);
      }
      this._applyToDescendants(c);
    }
  }
  _styleOwnerForNode(node) {
    let root = node.getRootNode();
    let host = root.host;
    if (host) {
      if (StyleInfo.get(host)) {
        return host;
      } else {
        return this._styleOwnerForNode(host);
      }
    }
    return this._documentOwner;
  }
  _isRootOwner(node) {
    return (node === this._documentOwner);
  }
  _applyStyleProperties(host, styleInfo) {
    let is = host.getAttribute('is') || host.localName;
    let cacheEntry = styleCache.fetch(is, styleInfo.styleProperties, styleInfo.ownStylePropertyNames);
    let cachedScopeSelector = cacheEntry && cacheEntry.scopeSelector;
    let cachedStyle = cacheEntry ? cacheEntry.styleElement : null;
    let oldScopeSelector = styleInfo.scopeSelector;
    // only generate new scope if cached style is not found
    styleInfo.scopeSelector = cachedScopeSelector || this._generateScopeSelector(is);
    let style = StyleProperties.applyElementStyle(host, styleInfo.styleProperties, styleInfo.scopeSelector, cachedStyle);
    if (!nativeShadow) {
      StyleProperties.applyElementScopeSelector(host, styleInfo.scopeSelector, oldScopeSelector);
    }
    if (!cacheEntry) {
      styleCache.store(is, styleInfo.styleProperties, style, styleInfo.scopeSelector);
    }
    return style;
  }
  _updateProperties(host, styleInfo) {
    let owner = this._styleOwnerForNode(host);
    let ownerStyleInfo = StyleInfo.get(owner);
    let ownerProperties = ownerStyleInfo.styleProperties;
    let props = Object.create(ownerProperties || null);
    let hostAndRootProps = StyleProperties.hostAndRootPropertiesForScope(host, styleInfo.styleRules);
    let propertyData = StyleProperties.propertyDataFromStyles(ownerStyleInfo.styleRules, host);
    let propertiesMatchingHost = propertyData.properties
    Object.assign(
      props,
      hostAndRootProps.hostProps,
      propertiesMatchingHost,
      hostAndRootProps.rootProps
    );
    this._mixinOverrideStyles(props, styleInfo.overrideStyleProperties);
    StyleProperties.reify(props);
    styleInfo.styleProperties = props;
  }
  _mixinOverrideStyles(props, overrides) {
    for (let p in overrides) {
      let v = overrides[p];
      // skip override props if they are not truthy or 0
      // in order to fall back to inherited values
      if (v || v === 0) {
        props[p] = v;
      }
    }
  }
  _updateNativeProperties(element, properties) {
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
   * Update styles of the whole document
   *
   * @param {Object=} properties
   */
  updateStyles(properties) {
    this.applyStyle(this._documentOwner, properties);
  }
  /* Custom Style operations */
  _revalidateCustomStyleApplyShim(customStyles) {
    for (let i = 0; i < customStyles.length; i++) {
      let c = customStyles[i];
      let s = this._customStyleInterface.getStyleForCustomStyle(c);
      if (s) {
        this._revalidateApplyShim(s);
      }
    }
  }
  _applyCustomStyles(customStyles) {
    for (let i = 0; i < customStyles.length; i++) {
      let c = customStyles[i];
      let s = this._customStyleInterface.getStyleForCustomStyle(c);
      if (s) {
        this._applyCustomStyleToDocument(s);
      }
    }
    this._customStyleInterface.enqueued = false;
  }
  transformCustomStyleForDocument(style) {
    let ast = StyleUtil.rulesForStyle(style);
    StyleUtil.forEachRule(ast, (rule) => {
      if (nativeShadow) {
        StyleTransformer.normalizeRootSelector(rule);
      } else {
        StyleTransformer.documentRule(rule);
      }
      if (nativeCssVariables) {
        ApplyShim['transformRule'](rule);
      }
    });
    if (nativeCssVariables) {
      style.textContent = StyleUtil.toCssText(ast);
    } else {
      this._documentOwnerStyleInfo.styleRules.rules.push(ast);
    }
  }
  addDocumentStyle(style) {
    this._customStyleInterface.addCustomStyle(style);
  }
  _revalidateApplyShim(style) {
    if (nativeCssVariables) {
      let ast = StyleUtil.rulesForStyle(style);
      ApplyShim['transformRules'](ast);
      style.textContent = StyleUtil.toCssText(ast);
    }
  }
  _applyCustomStyleToDocument(style) {
    if (!nativeCssVariables) {
      StyleProperties.applyCustomStyle(style, this._documentOwnerStyleInfo.styleProperties);
    }
  }
  getComputedStyleValue(element, property) {
    let value;
    if (!nativeCssVariables) {
      // element is either a style host, or an ancestor of a style host
      let styleInfo = StyleInfo.get(element) || StyleInfo.get(this._styleOwnerForNode(element));
      value = styleInfo.styleProperties[property];
    }
    // fall back to the property value from the computed styling
    value = value || window.getComputedStyle(element).getPropertyValue(property);
    // trim whitespace that can come after the `:` in css
    // example: padding: 2px -> " 2px"
    return value.trim();
  }
  // given an element and a classString, replaces
  // the element's class with the provided classString and adds
  // any necessary ShadyCSS static and property based scoping selectors
  setElementClass(element, classString) {
    let root = element.getRootNode();
    let classes = classString ? classString.split(/\s/) : [];
    let scopeName = root.host && root.host.localName;
    // If no scope, try to discover scope name from existing class.
    // This can occur if, for example, a template stamped element that
    // has been scoped is manipulated when not in a root.
    if (!scopeName) {
      var classAttr = element.getAttribute('class');
      if (classAttr) {
        let k$ = classAttr.split(/\s/);
        for (let i=0; i < k$.length; i++) {
          if (k$[i] === StyleTransformer.SCOPE_NAME) {
            scopeName = k$[i+1];
            break;
          }
        }
      }
    }
    if (scopeName) {
      classes.push(StyleTransformer.SCOPE_NAME, scopeName);
    }
    if (!nativeCssVariables) {
      let styleInfo = StyleInfo.get(element);
      if (styleInfo && styleInfo.scopeSelector) {
        classes.push(StyleProperties.XSCOPE_NAME, styleInfo.scopeSelector);
      }
    }
    StyleUtil.setElementClassRaw(element, classes.join(' '));
  }
  styleInfoForNode(node) {
    return StyleInfo.get(node);
  }
}

/* exports */
ShadyCSS.prototype['flush'] = ShadyCSS.prototype.flush;
ShadyCSS.prototype['prepareTemplate'] = ShadyCSS.prototype.prepareTemplate;
ShadyCSS.prototype['applyStyle'] = ShadyCSS.prototype.applyStyle;
ShadyCSS.prototype['updateStyles'] = ShadyCSS.prototype.updateStyles;
ShadyCSS.prototype['getComputedStyleValue'] = ShadyCSS.prototype.getComputedStyleValue;
ShadyCSS.prototype['setElementClass'] = ShadyCSS.prototype.setElementClass;
ShadyCSS.prototype['styleInfoForNode'] = ShadyCSS.prototype.styleInfoForNode;
ShadyCSS.prototype['transformCustomStyleForDocument'] = ShadyCSS.prototype.transformCustomStyleForDocument;
ShadyCSS.prototype['getStyleAst'] = ShadyCSS.prototype.getStyleAst;
ShadyCSS.prototype['styleAstToString'] = ShadyCSS.prototype.styleAstToString;
ShadyCSS.prototype['addDocumentStyle'] = ShadyCSS.prototype.addDocumentStyle;
Object.defineProperties(ShadyCSS.prototype, {
  'nativeShadow': {
    get() {
      return nativeShadow;
    }
  },
  'nativeCss': {
    get() {
      return nativeCssVariables;
    }
  },
  'documentStyleFlush': {
    /**
     * @this {ShadyCSS}
     * @return {function()}
     */
    get() {
      return this._customStyleInterface.flush;
    },
    /**
     * @this {ShadyCSS}
     * @param {function()} fn
     */
    set(fn) {
      this._customStyleInterface.flush = fn;
    }
  }
});

window['ShadyCSS'] = new ShadyCSS();