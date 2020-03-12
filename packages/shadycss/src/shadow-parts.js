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
 * [0] provider
 * [1] part rule
 * [2] receiver
 * [3] reciever
 * [4] part node
 *
 * Example:
 *
 * [0] <x-a>
 *       #shadow-root
 *         <style>
 * [1]       x-b::part(greeting) { ... }
 *         </style>
 *
 * [2]     <x-b>
 *           #shadow-root
 * [3]         <x-c exportparts="greeting">
 *               #shadow-root
 * [4]             <div part="greeting">hello</div>
 *             </x-c>
 *         </x-b>
 *     </x-a>
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
 * @param {?string} str The "part" attribute value.
 * @return {!Array<!string>} The part names. Order and duplicates are preserved.
 */
function splitPartString(str) {
  if (!str) {
    return [];
  }
  return str.trim().split(/\s+/);
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
  return splitPartString(parts).map(
      (part) => `[shady-part~=${formatPartSpecifier(part, scope, hostScope)}]`)
    .join('');
}

const partRuleCustomProperties = new Map();

/**
 * Find the CSS Custom Properties that are consumed by the given CSS text.
 *
 * @param {!string} cssText The CSS text.
 * @return {!Array<string>} The CSS Custom Property names.
 */
function consumedCustomProperties(cssText) {
  const obj = {};
  StyleProperties.collectPropertiesInCssText(cssText, obj);
  return Object.getOwnPropertyNames(obj);
}

/**
 * Do template preparation work.
 *
 * @param {!string} providerScope Lower-case tag name of the element whose
 *     template this is.
 * @param {!StyleNode} styleAst Parsed CSS for this template.
 */
export function prepareTemplate(templateScope, styleAst) {
  if (nativeCssVariables) {
    // The only thing this function does is check for ::part rules that have CSS
    // Custom Properties so that we can shim them correctly. No need to do
    // anything if we have native support.
    return;
  }
  if (!styleAst.rules) {
    return;
  }
  for (const rule of styleAst.rules) {
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
      const {elementName: receiverScope, parts} = parsed;
      if (parts.length > 0) {
        const key = [templateScope, receiverScope].join(':');
        let entries = partRuleCustomProperties.get(key);
        if (entries === undefined) {
          entries = [];
          partRuleCustomProperties.set(key, entries);
        }
        entries.push({rule, requiredParts: splitPartString(parts)});
      }
    }
  }
}

/**
 * TODO
 */
function customPropertyRulesForPart(providerScope, receiverScope, partNames) {
  const key = [providerScope, receiverScope].join(':');
  const entries = partRuleCustomProperties.get(key);
  if (entries === undefined) {
    return [];
  }
  const rules = [];
  for (const {rule, requiredParts} of entries) {
    let matches = true;
    for (const requiredPart of requiredParts) {
      if (partNames.indexOf(requiredPart) === -1) {
        matches = false;
        break;
      }
    }
    if (matches === true) {
      rules.push(rule);
    }
  }
  return rules;
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
 * The data comprising a ShadyCSS emulated ::part selector.
 *
 * @record
 */
class ShadyPartSelectors {
 constructor() {
   /**
    * Name of the part.
    * @type {!Array<!string>}
    */
   this.partNames;

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
 *   selectors: !Array<!ShadyPartSelectors>
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
  const exportTree = getExportPartsMap(element);
  const parts = [];

  for (const partNode of partNodes) {
    const partAttr = partNode.getAttribute('part');
    const partNames = splitPartString(partAttr);
    const selectors = [];

    // ::part rules that could match from our immediate parent.
    selectors.push({
      providerScope: parentScope,
      receiverScope: elementScope,
      partNames,
    });

    // ::part rules that could match from our grandparent and above via the
    // exportparts tree.
    const scopeMap = {};
    for (const partName of partNames) {
      const exportedNames = exportTree[partName];
      if (exportedNames === undefined) {
        continue;
      }
      for (const {hostScope: providerScope, scope: receiverScope, partName} of exportedNames) {
        const scopeKey = providerScope + ':' + receiverScope;
        let scopeObj = scopeMap[scopeKey];
        if (scopeObj === undefined) {
          scopeObj = scopeMap[scopeKey] = {
            providerScope,
            receiverScope,
            partNames: [],
          };
          selectors.push(scopeObj);
        }
        scopeObj.partNames.push(partName);
      }
    }

    parts.push({
      partNode,
      selectors,
    });
  }

  return parts;
}

/**
 * Apply ::part styles to all part nodes in the given host element.
 *
 * @param {!HTMLElement} host
 */
export function applyStylesToPartNodes(host) {
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

  const styleInfo = StyleInfo.get(host);
  const partRulesApplied = styleInfo.partRulesApplied;
  let styleRules = styleInfo.styleRules.rules;
  if (styleRules === null) {
    styleRules = styleInfo.styleRules.rules = [];
  }
  // TODO(aomarks) We should also clear out any properties from
  // ownStylePropertyNames that we're no longer using (though it's probably
  // safe for them to stick around, it just might not be optimal).
  for (const rule of partRulesApplied) {
    partRulesApplied.pop();
    styleRules.splice(styleRules.indexOf(rule), 1);
  }
  let hasAnyPartStylesWithCustomProperties = false;

  for (const {partNode, selectors} of findPartsWithShadySelectors(host)) {
    removeAllPartSpecifiers(partNode);
    for (const {providerScope, receiverScope, partNames} of selectors) {
      // The simple case works for ::part rules that do not consume a CSS Custom
      // Property.
      for (const partName of partNames) {
        addPartSpecifier(
            partNode, formatPartSpecifier(partName, receiverScope, providerScope));
      }

      // For ::part rules that do consume a CSS Custom Property, we need to
      // switch to per-instance styles, because the value of those properties
      // will change depending on where the host is in the tree. If we don't do
      // this, then custom property values would be set from the position of the
      // providing host, instead of the receiving one.
      const customPropertyPartRules =
          customPropertyRulesForPart(providerScope, receiverScope, partNames);
      if (customPropertyPartRules.length > 0) {
        hasAnyPartStylesWithCustomProperties = true;
        for (const rule of customPropertyPartRules) {
          // Transplant this ::part rule into the array of style rules managed
          // by this instance. This way, the normal mechanism for evaluating
          // per-instance styles will take over and substitute the correct
          // custom property values.
          styleRules.push(rule);
          // We also need to explicitly enumerate the active part rules on the
          // styleInfo, because that will be used as part of the per-instance
          // style cache lookup.
          partRulesApplied.push(rule);
          // Augment the array of CSS Custom Properties consumed by this
          // instance, since that is also used in the per-instance style cache
          // lookup.
          const propertiesConsumed =
              consumedCustomProperties(rule['parsedCssText']);
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
    applyStylesToPartNodes(element);
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
  // TODO(aomarks) Add caching

  const attr = host.getAttribute('exportparts');
  if (attr === null) {
    return {};
  }

  const root = host.getRootNode();
  if (root === document) {
    // There's nowhere to export parts to above the main document.
    return {};
  }

  const superHost = root.host;
  const scope = superHost.localName;
  const superRoot = superHost.getRootNode();
  const hostScope = scopeForRoot(superRoot);
  if (hostScope === undefined) {
    return {};
  }

  const map = {};
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
    applyStylesToPartNodes(element);
  } else {
    // This is in a RAF because we need to wait for the template to render the
    // first time.
    requestAnimationFrame(() => {
      applyStylesToPartNodes(element);
    });
  }
}

/* eslint-disable no-unused-vars */

/**
 * Update part styles in response to an insertBefore operation.
 *
 * @param {!HTMLElement} parentNode
 * @param {!HTMLElement} newNode
 * @param {?HTMLElement} referenceNode
 */
export function onInsertBefore(parentNode, newNode, referenceNode) {
  // Note this function is called after other ShadyDOM and ShadyCSS operations
  // have finished (so the node is already inserted).
  if (!newNode.getRootNode) {
    // TODO(aomarks) Why is it in noPatch mode on Chrome 41 and other older
    // browsers that getRootNode is undefined?
    return;
  }
  const root = newNode.getRootNode();
  if (root.host) {
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
    addPartSpecifiersToElement(element, splitPartString(newValue));
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
