/**
@license
Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/**
 * Terminology:
 *
 * x-a [0]
 *   #shadow-root
 *     <style>
 *       x-b::part(foo) { ... } [3]
 *     </style>
 *
 *     x-b [1]
 *       #shadow-root
 *         <div part="foo"></div> [2]
 *
 * [0] provider host
 * [1] receiver host
 * [2] consumer part node
 * [3] part rule
 */

/**
 * The general strategy for CSS Shadow Parts support in Shady CSS is
 * illustrated by this example:
 *
 * #document
 *   <style>
 *     x-a::part(a1) {
 *       color: red;
 *     }
 *     x-a::part(a2) {
 *       color: green;
 *     }
 *     x-a::part(a3) {
 *       color: blue;
 *     }
 *   </style>
 *   <x-a>
 *     #shadow-root
 *       <div part="a1"></div>
 *       <x-b exportparts="b1:a2,b2:a3">
 *         #shadow-root
 *           <div part="b1"></div>
 *           <x-c exportparts="c1:b2">
 *             #shadow-root
 *               <div part="c1"></div>
 *           </x-c>
 *       </x-b>
 *   </x-a>
 *
 * Becomes:
 *
 * #document
 *   <style>
 *     .part_document_x-a_a1 {
 *       color: red;
 *     }
 *     .part_document_x-a_a2 {
 *       color: green;
 *     }
 *     .part_document_x-a_a3 {
 *       color: blue;
 *     }
 *   </style>
 *   <x-a exportparts>
 *     #shadow-root
 *       <div part="a1"
 *            class="part_document_x-a_a1"></div>
 *       <x-b exportparts="b1:a2,b2:a3">
 *         #shadow-root
 *           <div part="b1"
 *                class="part_x-a_x-b_b1
 *                       part_document_x-a_a2"></div>
 *           <x-c exportparts="c1:b2">
 *             #shadow-root
 *               <div part="c1"
 *                    class="part_x-b_x-c_c1
 *                           part_x-a_x-b_b2
 *                           part_document_x-a_a3"></div>
 *           </x-c>
 *       </x-b>
 *   </x-a>
 *
 * Limitations:
 *
 * [1] ::part rules must include a custom-element name.
 *
 *    (A) x-a::part(foo)      OK
 *    (B) .clz x-a::part(foo) OK (TODO(aomarks) But could be wrong, right?)
 *    (C) x-a.bar::part(foo)  OK (except recursive patterns, see [3])
 *    (D) ::part(foo)         UNSUPPORTED
 *    (E) .bar::part(foo)     UNSUPPORTED
 *
 * [2] Recursive patterns are not supported.
 *
 *     TODO(aomarks) Example
 *
 * [3] Part style rules cannot change. If dynamism is needed, write a ::part
 *     rule for each state, predicated on some class or other attribute, and
 *     toggle that class or attribute on the dynamic element.
 *
 * [4] Part rules must appear inside a <template> or document-level <style>
 *     that has been prepared by ShadyCSS.
 */

import StyleInfo from './style-info.js';
import StyleProperties from './style-properties.js';
import {nativeCssVariables} from './style-settings.js';

/**
 * Parse a CSS Shadow Parts "part" attribute into an array of part names.
 *
 * Example:
 *   "foo bar" => ["foo", "bar"]
 *
 * @param {?string} attr The "part" attribute value.
 * @return {!Array<!string>}
 */
function parsePartAttribute(attr) {
  if (!attr) {
    return [];
  }
  return attr.trim().split(/\s+/);
}

/**
 * Parse a CSS Shadow Parts "exportparts" attribute into an array of
 * inner/outer part mappings.
 *
 * Example:
 *   "foo,bar:baz" => [{inner:"foo", outer:"foo"},
 *                     {inner:"bar", outer:"baz"}]
 *
 * @param {?string} attr The "exportparts" attribute value.
 * @return {!Array<{inner: !string, outer: !string}>}
 */
function parseExportPartsAttribute(attr) {
  if (!attr) {
    return [];
  }
  const parts = [];
  for (const part of attr.split(/\s*,\s*/)) {
    const split = part.split(/\s*:\s*/);
    let inner, outer;
    if (split.length === 1) {
      inner = outer = split[0];
    } else if (split.length === 2) {
      inner = split[0];
      outer = split[1];
    } else {
      continue;
    }
    parts.push({inner, outer});
  }
  return parts;
}

/**
 * Regular expression to de-compose a ::part rule into interesting pieces. See
 * parsePartSelector for description of pieces.
 *                  [0  ][1         ][2      ]        [3 ]   [4   ]
 */
const PART_REGEX = /(.*?)([a-z]+-\w+)([^\s]*?)::part\((.*)?\)(::.*)?/;

/**
 * De-compose a ::part rule into interesting pieces.
 *
 * [0] combinators: Optional combinator selectors constraining the receiving
 *     host.
 * [1] elementName: Required custom element name of the receiving host. Note
 *     that ShadyCSS part support requires there to be an explicit custom
 *     element name here, unlike native parts.
 * [2] selectors: Optional additional selectors constraining the receiving host.
 * [3] parts: The part name or names (whitespace-separated, this function does
 *     not split them).
 * [4] pseudos: Optional pseudo-classes or pseudo-elements of the part.
 *
 *     TODO(aomarks) Actually only "non-structural" pseudo-classes and
 *     pseudo-elements are supported here. We should validate them to be more
 *     spec-compliant.
 *
 * Example:
 *   [0       ][1      ][2   ]       [3    ] [4    ]
 *   #parent > my-button.fancy::part(foo bar)::hover
 *
 * @param {!string} selector The selector.
 * @return {?{
 *   combinators: !string,
 *   elementName: !string,
 *   selectors: !string,
 *   parts: !string,
 *   pseudos: !string
 * }}
 */
export function parsePartSelector(selector) {
  const match = selector.match(PART_REGEX);
  if (match === null) {
    return null;
  }
  const [, combinators, elementName, selectors, parts, pseudos] = match;
  return {combinators, elementName, selectors, parts, pseudos: pseudos || ''};
}

/**
 * Format the ShadyCSS class name for a part.
 *
 * @param {!string} partName Name of the part.
 * @param {!string} consumerScope Lowercase name of the custom element that
 *     receives the part style.
 * @param {!string} providerScope Lowercase name of the custom element that
 *     provides the part style, or "document" if the style comes from the main
 *     document.
 * @return {!string} Value for the shady-part attribute.
 */
export function formatPartSpecifier(partName, consumerScope, providerScope) {
  return `${consumerScope}_${providerScope}_${partName}`;
}

/**
 * Format the ShadyCSS selector for a part rule.
 *
 * @param {!string} parts Whitespace-separated part list.
 * @param {!string} scope Lowercase custom element name of the part node's
 *     host.
 * @param {!string} hostScope Lowercase custom-element name of the part
 *     node's host's host, or "document" if the host is in the main document.
 * @return {!string} CSS class selector.
 */
export function formatPartSelector(parts, scope, hostScope) {
  return parsePartAttribute(parts).map(
      (part) => `[shady-part~=${formatPartSpecifier(part, scope, hostScope)}]`)
    .join('');
}

const partRuleCustomProperties = new Map();

function consumedCustomProperties(cssText) {
  const obj = {};
  StyleProperties.collectPropertiesInCssText(cssText, obj);
  return Object.getOwnPropertyNames(obj);
}

/**
 * @param {!string} providerElementName Lower-case tag name of the element whose
 *     template this is.
 * @param {!StyleNode} styleAst Parsed CSS for this template.
 */
export function prepareTemplate(providerElementName, styleAst) {
  if (nativeCssVariables) {
    return;
  }
  if (!styleAst.rules) {
    return;
  }
  for (const rule of styleAst.rules) {
    // TODO(aomarks) We should not have to use literal indexing here because
    // there is a strong type. But other ShadyCSS code sets it with literal
    // indexing, so we have to read it that way too.
    const selector = rule['selector'];
    if (!selector || selector.indexOf('::part') === -1) {
      continue;
    }
    const consumedProperties = consumedCustomProperties(rule['cssText']);
    if (consumedProperties.length > 0) {
      const parsed = parsePartSelector(selector);
      if (parsed === null) {
        continue;
      }
      const {elementName: receiverElementName, parts} = parsed;
      const key = [providerElementName, receiverElementName, parts].join(':');
      let rules = partRuleCustomProperties.get(key);
      // Note when we are seeing this rule, "selector" has not yet been
      // transformed but later it will have been.
      if (rules === undefined) {
        rules = [];
        partRuleCustomProperties.set(key, rules);
      }
      rules.push(rule);
    }
  }
}

// function customPropertiesForPartRule(parentScope, childScope, partName) {
//  const key = [parentScope, childScope, partName].join(':');
//  const properties = partRuleCustomProperties.get(key);
//  return properties === undefined ? [] : properties;
//}

function customPropertyRulesForPart(parentScope, childScope, partName) {
  const key = [parentScope, childScope, partName].join(':');
  const properties = partRuleCustomProperties.get(key);
  return properties === undefined ? [] : properties;
}

/**
 * TODO
 *
 * @param {!Element} element
 * @param {!string} specifier
 * @return {void}
 */
export function addPartSpecifier(element, specifier) {
  const existing = element.getAttribute('shady-part');
  if (existing === null) {
    element.setAttribute('shady-part', specifier);
  } else {
    element.setAttribute('shady-part', existing + ' ' + specifier);
  }
}

/**
 * Remove all part classes from the given element.
 *
 * @param {!Element} element
 * @return {void}
 */
export function removeAllPartSpecifiers(element) {
  element.removeAttribute('shady-part');
}

/**
 * Return the name that identifies the given root. Either the lowercase name of
 * the host element, or "document" if this is the document.
 *
 * @param {!Node} root
 * @return {!string|undefined}
 */
function scopeForRoot(root) {
  if (root === document) {
    // TODO(aomarks) Should this check host.ownerDocument instead?
    return 'document';
  }
  if (root.host) {
    return root.host.localName;
  }
}

const initialized = new Set();

/**
 * The data comprising a ShadyCSS emulated ::part selector.
 *
 * @record
 */
 class ShadyPartSelector {
   constructor() {
     /**
      * Name of the part.
      * @type {!string}
      */
     this.partName;

     /**
      * Custom element name of the host that provides a part style rule.
      * @type {!string}
      */
     this.providerScope;

     /**
      * Custom element name of the host that receives a part style rule.
      * @type {!string}
      */
     this.receiverScope;
   }
 }

/**
 * Find all of the part nodes in the shadow root of the given element, along
 * with the data needed to apply emulated part rule styles to that node,
 * accounting for exported parts.
 *
 * @param {!HTMLElement} element
 * @return {!Array<!{
 *   partNode: !HTMLElement,
 *   selectors: !ShadyPartSelector
 * >}
 */
function findPartsWithShadySelectors(element) {
  if (!element.shadowRoot) {
    return [];
  }
  const partNodes = element.shadowRoot.querySelectorAll('[part]');
  if (partNodes.length === 0) {
    return [];
  }
  const root = element.getRootNode();
  const parentScope = scopeForRoot(root);
  if (parentScope === undefined) {
    return [];
  }
  const elementScope = element.localName;
  const exportPartsMap = getExportPartsMap(element);
  const parts = [];
  for (const partNode of partNodes) {
    const partAttr = partNode.getAttribute('part');
    const partNames = parsePartAttribute(partAttr);
    const selectors = [];
    for (const partName of partNames) {
      // Selector for ::part rules provided by our direct parent.
      selectors.push({
        partName,
        providerScope: parentScope,
        receiverScope: elementScope,
      });
      // Walk up the exportparts tree to find selectors for ::part rules
      // provided by our grandparent and above,
      const exportParts = exportPartsMap[partName];
      if (exportParts !== undefined) {
        for (const {hostScope, scope, partName} of exportParts) {
          selectors.push({
            partName,
            providerScope: hostScope,
            receiverScope: scope,
          });
        }
      }
    }
    parts.push({partNode, selectors});
  }
  return parts;
}

/**
 * Add the appropriate "part_" class to all parts in the Shady root of the
 * given host.
 *
 * @param {!HTMLElement} host
 */
export function scopeAllHostParts(host) {
  if (!host.shadowRoot) {
    return;
  }
  const partNodes = host.shadowRoot.querySelectorAll('[part]');
  if (partNodes.length === 0) {
    return;
  }

  const root = host.getRootNode();
  const hostScope = scopeForRoot(root);
  if (hostScope === undefined) {
    return;
  }

  const scope = host.localName;
  const exportPartsMap = getExportPartsMap(host);
  const styleInfo = StyleInfo.get(host);
  const partRulesApplied = styleInfo.partRulesApplied;
  let styleRules = styleInfo.styleRules.rules;
  if (styleRules === null) {
    styleRules = styleInfo.styleRules.rules = [];
  }
  for (const rule of partRulesApplied) {
    partRulesApplied.pop();
    styleRules.splice(styleRules.indexOf(rule), 1);
  }
  // TODO(aomarks) Clear out existing part rules from the main list too.
  let hasAnyPartStylesWithCustomProperties = false;

  for (const {partNode, selectors} of findPartsWithShadySelectors(host)) {
    removeAllPartSpecifiers(partNode);
    for (const {partName, providerScope, receiverScope} of selectors) {
      addPartSpecifier(
          partNode, formatPartSpecifier(partName, receiverScope, providerScope));
      const customPropertyRules =
          customPropertyRulesForPart(providerScope, receiverScope, partName);
      if (customPropertyRules.length > 0) {
        hasAnyPartStylesWithCustomProperties = true;
        for (const rule of customPropertyRules) {
          partRulesApplied.push(rule);
          styleRules.push(rule);
          const propertiesConsumed = consumedCustomProperties(rule['parsedCssText']);
          for (const property of propertiesConsumed) {
            if (styleInfo.ownStylePropertyNames.indexOf(property) === -1) {
              styleInfo.ownStylePropertyNames.push(property);
            }
          }
        }
      }
    }
  }

  if (hasAnyPartStylesWithCustomProperties && initialized.has(host) === false) {
    initialized.add(host);
    foo = true;
    window['ShadyCSS'].styleElement(host);
  }
}

let foo = false;

/**
 * @param {!HTMLElement} element
 * @param {!Array<!string>} partNames
 */
function addPartSpecifiersToElement(element, partNames) {
  const root = element.getRootNode();
  if (root === element || root === document) {
    // Not yet in a shadow root or in the document, in which case parts can't
    // possibly be applied.
     return;
  }
  const host = root.host;
  const scope = host.localName;
  const superRoot = host.getRootNode();
  const superScope = (superRoot === document)
      ? 'document' : superRoot.host.localName;

  const exportPartsMap = getExportPartsMap(host);

  for (const partName of partNames) {
    addPartSpecifier(element, formatPartSpecifier(partName, scope, superScope));
    const exportParts = exportPartsMap[partName];
    if (exportParts !== undefined) {
      for (const {partName, scope, hostScope} of exportParts) {
        addPartSpecifier(element, formatPartSpecifier(partName, scope, hostScope));
      }
    }
  }
}

/**
 * TODO
 * @param {!HTMLElement} element
 */
function rescopeRecursive(element) {
  // element.shadyCssExportPartsMap = undefined;
  if (element.shadowRoot) {
    scopeAllHostParts(element);
    const exports = /** @type {!NodeList<!HTMLElement>} */ (
        element.shadowRoot.querySelectorAll('[exportparts]'));
    for (const child of exports) {
      // child.shadyCssExportPartsMap = undefined;
      rescopeRecursive(child);
    }
  }
}

/**
 * TODO(aomarks) Description
 *
 * @param {!HTMLElement} host
 * @return {!Object<!string, !Array<{
 *     partName: string,
 *     scope: string,
 *     hostScope: string
 *   }>>}
 */
function getExportPartsMap(host) {
  // TODO(aomarks) Add to externs (or move).
  // if (host.shadyCssExportPartsMap !== undefined) {
  //   return host.shadyCssExportPartsMap;
  // }
  const map = {};
  // host.shadyCssExportPartsMap = map;

  const attr = host.getAttribute('exportparts');
  if (attr === null) {
    return map;
  }

  const root = host.getRootNode();
  if (root === document) {
    // TODO(aomarks) Document why.
    return map;
  }

  const superHost = root.host;
  const scope = superHost.localName;
  const superRoot = superHost.getRootNode();
  const hostScope = scopeForRoot(superRoot);
  if (hostScope === undefined) {
    return map;
  }

  const superExports = getExportPartsMap(superHost);

  for (const {inner, outer} of parseExportPartsAttribute(attr)) {
    let arr = map[inner];
    if (arr === undefined) {
      arr = [];
      map[inner] = arr;
    }
    arr.push({hostScope, scope, partName: outer});
    const superParts = superExports[outer];
    if (superParts !== undefined) {
      for (const partData of superParts) {
        arr.push(partData);
      }
    }
  }

  return map;
}

/**
 * TODO
 * @param {!HTMLElement} element
 */
export function onStyleElement(element) {
  if (foo) {
    foo = false;
    return;
  }
  if (element.shadowRoot) {
    scopeAllHostParts(element);
  } else {
    // This is in a RAF because we need to wait for the template to render the
    // first time.
    requestAnimationFrame(() => {
      scopeAllHostParts(element);
    });
  }
}

/* eslint-disable no-unused-vars */

/**
 * TODO
 * @param {!HTMLElement} parentNode
 * @param {!HTMLElement} newNode
 * @param {?HTMLElement} referenceNode
 */
export function onInsertBefore(parentNode, newNode, referenceNode) {
  if (!newNode.getRootNode) {
    // TODO(aomarks) Why is it in noPatch mode on Chrome 41 and other older
    // browsers that getRootNode is undefined?
    return;
  }
  const root = newNode.getRootNode();
  if (root.host) {
    // TODO(aomarks) Optimize.
    rescopeRecursive(root.host);
  }
}

/**
 * Update a node whose "part" attribute has changed.
 *
 * @param {!HTMLElement} element
 * @param {?string} oldValue
 * @param {?string} newValue
 */
export function onPartAttributeChanged(element, oldValue, newValue) {
  if (!newValue) {
    removeAllPartSpecifiers(element);
  } else {
    addPartSpecifiersToElement(element, parsePartAttribute(newValue));
  }
}

/**
 * Update a node whose "exportparts" attribute has changed.
 *
 * @param {!HTMLElement} element
 * @param {?string} oldValue
 * @param {?string} newValue
 */
export function onExportPartsAttributeChanged(element, oldValue, newValue) {
  // TODO(aomarks) Optimize.
  rescopeRecursive(element);
}

/* eslint-enable no-unused-vars */
