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

import {nativeShadow, nativeCssVariables} from './style-settings'
import {parse, stringify, types, StyleNode} from './css-parse'
import {MEDIA_MATCH} from './common-regex';

/**
 * @param {string|StyleNode} rules
 * @param {function(StyleNode)=} callback
 */
export function toCssText (rules, callback) {
  if (typeof rules === 'string') {
    rules = parse(rules);
  }
  if (callback) {
    forEachRule(rules, callback);
  }
  return stringify(rules, nativeCssVariables);
}

/**
 * @param {HTMLStyleElement} style
 * @return {StyleNode}
 */
export function rulesForStyle(style) {
  if (!style['__cssRules'] && style.textContent) {
    style['__cssRules'] = parse(style.textContent);
  }
  return style['__cssRules'];
}

// Tests if a rule is a keyframes selector, which looks almost exactly
// like a normal selector but is not (it has nothing to do with scoping
// for example).
/**
 * @param {StyleNode} rule
 * @return {boolean}
 */
export function isKeyframesSelector(rule) {
  return Boolean(rule['parent']) &&
  rule['parent']['type'] === types.KEYFRAMES_RULE;
}

/**
 * @param {StyleNode} node
 * @param {Function=} styleRuleCallback
 * @param {Function=} keyframesRuleCallback
 * @param {boolean=} onlyActiveRules
 */
export function forEachRule(node, styleRuleCallback, keyframesRuleCallback, onlyActiveRules) {
  if (!node) {
    return;
  }
  let skipRules = false;
  let type = node['type'];
  if (onlyActiveRules) {
    if (type === types.MEDIA_RULE) {
      let matchMedia = node['selector'].match(MEDIA_MATCH);
      if (matchMedia) {
        // if rule is a non matching @media rule, skip subrules
        if (!window.matchMedia(matchMedia[1]).matches) {
          skipRules = true;
        }
      }
    }
  }
  if (type === types.STYLE_RULE) {
    styleRuleCallback(node);
  } else if (keyframesRuleCallback &&
    type === types.KEYFRAMES_RULE) {
    keyframesRuleCallback(node);
  } else if (type === types.MIXIN_RULE) {
    skipRules = true;
  }
  let r$ = node['rules'];
  if (r$ && !skipRules) {
    for (let i=0, l=r$.length, r; (i<l) && (r=r$[i]); i++) {
      forEachRule(r, styleRuleCallback, keyframesRuleCallback, onlyActiveRules);
    }
  }
}

// add a string of cssText to the document.
/**
 * @param {string} cssText
 * @param {string} moniker
 * @param {Node} target
 * @param {Node} contextNode
 * @return {HTMLStyleElement}
 */
export function applyCss(cssText, moniker, target, contextNode) {
  let style = createScopeStyle(cssText, moniker);
  return applyStyle(style, target, contextNode);
}

/**
 * @param {Node} style
 * @param {?Node} target
 * @param {?Node} contextNode
 * @return {HTMLStyleElement}
 */
export function applyStyle(style, target, contextNode) {
  target = target || document.head;
  let after = (contextNode && contextNode.nextSibling) ||
  target.firstChild;
  lastHeadApplyNode = style;
  return /** @type {HTMLStyleElement} */(target.insertBefore(style, after));
}

/**
 * @param {string} cssText
 * @param {string} moniker
 * @return {Element}
 */
export function createScopeStyle(cssText, moniker) {
  let style = document.createElement('style');
  if (moniker) {
    style.setAttribute('scope', moniker);
  }
  style.textContent = cssText;
  return style;
}

/** @type {Node} */
let lastHeadApplyNode = null;

// insert a comment node as a styling position placeholder.
/**
 * @param {string} moniker
 * @return {Node}
 */
export function applyStylePlaceHolder(moniker) {
  let placeHolder = document.createComment(' Shady DOM styles for ' +
    moniker + ' ');
  let after = lastHeadApplyNode ?
    lastHeadApplyNode['nextSibling'] : null;
  let scope = document.head;
  scope.insertBefore(placeHolder, after || scope.firstChild);
  lastHeadApplyNode = placeHolder;
  return placeHolder;
}

/**
 * @param {string} buildType
 * @return {boolean}
 */
export function isTargetedBuild(buildType) {
  return nativeShadow ? buildType === 'shadow' : buildType === 'shady';
}

/**
 * @param {Element} element
 * @return {?string}
 */
export function getCssBuildType(element) {
  return element.getAttribute('css-build');
}

/**
 * Walk from text[start] matching parens and
 * returns position of the outer end paren
 * @param {string} text
 * @param {number} start
 * @return {number}
 */
function findMatchingParen(text, start) {
  let level = 0;
  for (let i=start, l=text.length; i < l; i++) {
    if (text[i] === '(') {
      level++;
    } else if (text[i] === ')') {
      if (--level === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * @param {string} str
 * @param {function(string, string, string, string)} callback
 */
export function processVariableAndFallback(str, callback) {
  // find 'var('
  let start = str.indexOf('var(');
  if (start === -1) {
    // no var?, everything is prefix
    return callback(str, '', '', '');
  }
  //${prefix}var(${inner})${suffix}
  let end = findMatchingParen(str, start + 3);
  let inner = str.substring(start + 4, end);
  let prefix = str.substring(0, start);
  // suffix may have other variables
  let suffix = processVariableAndFallback(str.substring(end + 1), callback);
  let comma = inner.indexOf(',');
  // value and fallback args should be trimmed to match in property lookup
  if (comma === -1) {
    // variable, no fallback
    return callback(prefix, inner.trim(), '', suffix);
  }
  // var(${value},${fallback})
  let value = inner.substring(0, comma).trim();
  let fallback = inner.substring(comma + 1).trim();
  return callback(prefix, value, fallback, suffix);
}

/**
 * @param {Element} element
 * @param {string} value
 */
export function setElementClassRaw(element, value) {
  // use native setAttribute provided by ShadyDOM when setAttribute is patched
  if (window['ShadyDOM']) {
    window['ShadyDOM']['nativeMethods']['setAttribute'].call(element, 'class', value);
  } else {
    element.setAttribute('class', value);
  }
}

/**
 * @param {Element|Object} element
 * @return {{is: string, extends: string}}
 */
export function getIsExtends(element) {
  let is = element.is || (element.getAttribute && element.getAttribute('is')) || element.localName;
  let extendz = element.extends || element.localName !== is ? element.localName : '';
  return {is, extends: extendz};
}