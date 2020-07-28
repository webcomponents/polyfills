/**
@license
Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/* eslint-disable-next-line no-unused-vars */
import {StyleNode} from './css-parse.js';
import StyleInfo from './style-info.js';
import StyleProperties from './style-properties.js';
import * as StyleUtil from './style-util.js';
import {nativeCssVariables, disableShadowParts} from './style-settings.js';
import {NATIVE_PREFIX} from './common-utils.js';
import {anyPartRulesTransformed} from './style-transformer.js';

/**
 * Returns whether CSS Shadow Parts handling is currently necessary. True if we
 * have seen at least one ::part rule when processing any style rules, and if
 * window.ShadyCSS.disableShadowParts is not truthy.
 *
 * @return {!boolean}
 */
export function shadowPartsActive() {
  return !disableShadowParts && anyPartRulesTransformed();
}

/**
 * Set the "shady-part" attribute using the native method.
 *
 * @param {!HTMLElement} element
 * @param {!string} value
 * @return {void}
 */
function setShadyPartAttribute(element, value) {
  element[NATIVE_PREFIX + 'setAttribute']('shady-part', value);
}

/**
 * Remove the "shady-part" attribute using the native method.
 *
 * @param {!HTMLElement} element
 * @return {void}
 */
function removeShadyPartAttribute(element) {
  element[NATIVE_PREFIX + 'removeAttribute']('shady-part');
}

/**
 * Parse a CSS Shadow Parts "part" attribute into an array of part names.
 *
 * Example:
 *   Given: "foo bar  foo "
 *   Returns: ["foo", "bar", "foo"]
 *
 * @param {?string} str The "part" attribute value.
 * @return {!Array<!string>} The part names. Order and duplicates are preserved.
 */
export function splitPartString(str) {
  if (!str) {
    return [];
  }
  return str.trim().split(/\s+/);
}

/**
 * Parse a CSS Shadow Parts "exportparts" attribute into an array of inner/outer
 * part mappings.
 *
 * Example:
 *   Given: "foo, bar:baz"
 *   Returns: [
 *     {inner:"foo", outer:"foo"},
 *     {inner:"bar", outer:"baz"},
 *   ]
 *
 * @param {!string} attr The "exportparts" attribute value.
 * @return {!Array<{inner: !string, outer: !string}>} The inner/outer mapping.
 * Order and duplicates are preserved.
 */
export function parseExportPartsAttribute(attr) {
  const exports = [];
  for (const segment of attr.split(/\s*,\s*/)) {
    const split = segment.split(/\s*:\s*/);
    let inner, outer;
    if (split.length === 1) {
      // E.g. "foo"
      inner = outer = split[0];
    } else if (split.length === 2) {
      // E.g. "foo:bar"
      inner = split[0];
      outer = split[1];
    } else {
      // E.g. "foo:bar:baz". Invalid format; skip but keep parsing (this
      // matches native behavior).
      continue;
    }
    exports.push({inner, outer});
  }
  return exports;
}

/**
 * Regular expression to de-compose a ::part rule into interesting pieces. See
 * parsePartSelector for description of pieces.
 *                  [0  ][1              ][2      ]        [3 ]   [4    ]
 */
const PART_REGEX = /(.*?)([a-z]+(?:-\w+)+)([^\s]*?)::part\((.*)?\)(::?.*)?/;

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
 *   [0       ][1      ][2   ]       [3    ] [4   ]
 *   #parent > my-button.fancy::part(foo bar):hover
 *
 * @param {!string} selector The selector.
 * @return {?{
 *   combinators: !string,
 *   elementName: !string,
 *   selectors: !string,
 *   partNames: !string,
 *   pseudos: !string
 * }}
 */
export function parsePartSelector(selector) {
  const match = selector.match(PART_REGEX);
  if (match === null) {
    return null;
  }
  const [, combinators, elementName, selectors, partNames, pseudos] = match;
  return {
    combinators,
    elementName,
    selectors,
    partNames,
    pseudos: pseudos || '',
  };
}

/**
 * Format the shady-part attribute value for a part.
 *
 * Example:
 *   Given: "x-app", "x-btn", "prt1"
 *   Returns: "x-app:x-btn:prt1"
 *
 * @param {!string} providerScope Lowercase name of the custom element that
 *     provides the part style, or "document" if the style comes from the main
 *     document.
 * @param {!string} receiverScope Lowercase name of the custom element that
 *     receives the part style.
 * @param {!string} partName Name of the part.
 * @return {!string} Value for the shady-part attribute.
 */
export function formatShadyPartAttribute(
  providerScope,
  receiverScope,
  partName
) {
  return `${providerScope}:${receiverScope}:${partName}`;
}

/**
 * Format the shady-part attribute CSS selector for a part rule.
 *
 * Example:
 *   Given: "x-app", "x-btn", "prt1 prt2"
 *   Returns: '[shady-part~="x-app:x-btn:prt1"][shady-part~="x-app:x-btn:prt2"]'
 *
 * @param {!string} providerScope Lowercase name of the custom element that
 *     provides the part style, or "document" if the style comes from the main
 *     document.
 * @param {!string} receiverScope Lowercase name of the custom element that
 *     receives the part style.
 * @param {!string} partNames Whitespace-separated part list.
 * @return {!string} shady-part attribute CSS selector.
 */
export function formatShadyPartSelector(
  providerScope,
  receiverScope,
  partNames
) {
  return splitPartString(partNames)
    .map((partName) => {
      const attr = formatShadyPartAttribute(
        providerScope,
        receiverScope,
        partName
      );
      return `[shady-part~="${attr}"]`;
    })
    .join('');
}

/**
 * Build a forwarding map from part names in the given host, to part names in
 * all ancestor scopes that also provide styles for those parts, by walking up
 * the DOM following "exportparts" attributes on each host element.
 *
 * For example, given the <x-c> node from the following tree:
 *
 *   #document
 *     <x-a exportparts="foo">
 *       #shadow-root
 *         <x-b exportparts="foo,bar:bar2,bar:bar3">
 *           #shadow-root
 *             <x-c>
 *
 * Then return:
 *
 *   {
 *     foo: [
 *       ["x-a", "x-b", "foo"],
 *       ["document", "x-a", "foo"],
 *     ],
 *     bar: [
 *       ["x-a", "x-b", "bar2"],
 *       ["x-a", "x-b", "bar3"],
 *     ],
 *  }
 *
 * @param {!HTMLElement} host The element whose shadow parts we are evaluating.
 * @return {!Object<!string, !Array<string>>} An object that maps from part name
 * in the given `host` to an array of `[providerScope, receiverScope, partName]`
 * triplets describing additional style sources for that part.
 *
 * TODO(aomarks) Cache each host's exportparts mapping so that we don't need to
 * walk any hosts twice.
 */
export function findExportedPartMappings(host) {
  // The mapping we will return.
  const result = {};

  // As we walk up the tree, this object always maintains a mapping from part
  // names in the previously walked scope, to part names in the base host scope.
  let forwarding;

  let superHost;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const attr = host.getAttribute('exportparts');
    if (!attr) {
      break;
    }

    // Initialize superHost on the first iteration. Done here, inside the loop,
    // so that we can return as quickly as possible when there is no exportparts
    // attribute.
    if (superHost === undefined) {
      const root = host.getRootNode();
      if (root === document || root === host) {
        // When document, there's nothing beyond the document scope where styles
        // could be exported from. When host, we're not attached to the DOM.
        break;
      }
      superHost = root.host;

      if (!superHost) {
        break;
      }
    }

    const receiverScope = superHost.localName;
    const superRoot = superHost.getRootNode();
    if (!superRoot) {
      break;
    }

    let providerScope;
    let superSuperHost;
    if (superRoot === document) {
      providerScope = 'document';
    } else {
      superSuperHost = superRoot.host;
      if (!superSuperHost) {
        break;
      }
      providerScope = superSuperHost.localName;
    }

    const exports = parseExportPartsAttribute(attr);
    if (exports.length === 0) {
      // This could happen if the attribute was set to something non-empty, but
      // it was entirely invalid.
      break;
    }

    const newForwarding = {};
    for (const {inner, outer} of exports) {
      let basePart;
      if (forwarding === undefined) {
        // We're in the immediate parent scope (since we haven't initialized the
        // forwarding map yet), so the name parsed from the "exportparts"
        // attribute is already the right one.
        basePart = inner;
      } else {
        basePart = forwarding[inner];
        if (basePart === undefined) {
          // We don't care about this exported part, because it doesn't
          // ultimately forward down to a part in our base scope.
          continue;
        }
      }
      let arr = result[basePart];
      if (arr === undefined) {
        arr = result[basePart] = [];
      }
      arr.push([providerScope, receiverScope, outer]);
      newForwarding[outer] = basePart;
    }

    if (superRoot === document) {
      break;
    }

    host = superHost;
    superHost = superSuperHost;
    forwarding = newForwarding;
  }

  return result;
}

/**
 * Update the "shady-part" attribute when the "part" attribute is set.
 *
 * @param {!HTMLElement} element The element.
 * @return {void}
 */
export function onSetPartAttribute(element) {
  if (!element.getRootNode) {
    // TODO(aomarks) We're in noPatch mode. Wrap where needed and add tests.
    // https://github.com/webcomponents/polyfills/issues/343
    return;
  }
  const root = element.getRootNode();
  if (root === document || root === element) {
    // Nowhere to receive part styles from.
    return;
  }
  styleShadowParts(root.host, [element]);
}

/**
 * Remove the "shady-part" attribute when the "part" attribute is removed.
 *
 * @param {!HTMLElement} element The element.
 * @return {void}
 */
export function onRemovePartAttribute(element) {
  removeShadyPartAttribute(element);
}

/**
 * Update descendant parts when the "exportparts" attribute is set.
 *
 * @param {!HTMLElement} element The element.
 * @param {!string} newValue The new "exportparts" value.
 * @param {?string} oldValue The old "exportparts" value or null if was unset.
 * @return {void}
 */
export function onSetExportPartsAttribute(element, newValue, oldValue) {
  let exports = parseExportPartsAttribute(newValue);
  if (oldValue) {
    exports.push(...parseExportPartsAttribute(oldValue));
  }
  refreshShadyPartAttributes(
    element,
    exports.map(({inner}) => inner)
  );
}

/**
 * Update descendant parts when the "exportparts" attribute is removed.
 *
 * @param {!HTMLElement} element The element.
 * @param {!string} oldValue The old "exportparts" value.
 * @return {void}
 */
export function onRemoveExportPartsAttribute(element, oldValue) {
  const exports = parseExportPartsAttribute(oldValue);
  refreshShadyPartAttributes(
    element,
    exports.map(({inner}) => inner)
  );
}

/**
 * Update the "shady-parts" attribute for all part nodes that may be affected by
 * the given list of part names that have been added or removed, including those
 * in descendent scopes via "exportparts" attributes.
 *
 * @param {!HTMLElement} host The host element.
 * @param {!Array<!string>} staleNames The part names which have changed.
 * @return {void}
 */
function refreshShadyPartAttributes(host, staleNames) {
  if (staleNames.length === 0) {
    return;
  }
  const root = host.shadowRoot;
  if (!root) {
    return;
  }
  const stalePartNodes = [];
  // TODO(aomarks) We've already looked at this shadow root, since an insert
  // call must have already happened. It might be worth at least storing a bit
  // on each host that has a part or exporter, so that we can skip unneccessary
  // querySelectorAll calls here.
  for (const partNode of root.querySelectorAll('[part]')) {
    for (const name of splitPartString(partNode.getAttribute('part'))) {
      if (staleNames.includes(name)) {
        stalePartNodes.push(partNode);
        break;
      }
    }
  }
  if (stalePartNodes.length > 0) {
    styleShadowParts(host, stalePartNodes);
  }
  for (const exporter of root.querySelectorAll('[exportparts]')) {
    const staleInnerNames = [];
    const exports = parseExportPartsAttribute(
      exporter.getAttribute('exportparts')
    );
    for (const {inner, outer} of exports) {
      if (staleNames.includes(outer)) {
        staleInnerNames.push(inner);
      }
    }
    if (staleInnerNames.length > 0) {
      refreshShadyPartAttributes(exporter, staleInnerNames);
    }
  }
}

/* eslint-disable no-unused-vars */
/**
 * Add "shady-part" attributes to new nodes on insertion.
 *
 * This function will be called by ShadyDOM during any insertBefore call,
 * before the native insert has occured.
 *
 * @param {!HTMLElement} parentNode
 * @param {!HTMLElement} newNode
 * @param {?HTMLElement} referenceNode
 * @return {void}
 */
export function onInsertBefore(parentNode, newNode, referenceNode) {
  /* eslint-enable no-unused-vars */
  if (newNode instanceof Text || newNode instanceof Comment) {
    // No parts in text or comments.
    return;
  }
  if (!parentNode.getRootNode) {
    // TODO(aomarks) We're in noPatch mode. Wrap where needed and add tests.
    // https://github.com/webcomponents/polyfills/issues/343
    return;
  }
  const root = parentNode.getRootNode();
  if (root === document) {
    // Parts in the document scope would never have any effect. Return early so
    // we don't waste time querying it.
    return;
  }
  const host = root.host;
  if (!host) {
    // If there's no host, we're not connected, so no part styles could apply
    // here.
    return;
  }
  let partNodes = newNode.querySelectorAll('[part]');
  // TODO(aomarks) We should be able to get much better performance over the
  // querySelectorAll calls here by integrating the part check into the walk
  // that ShadyDOM already does to find slots.
  // https://github.com/webcomponents/polyfills/issues/345
  if (newNode instanceof HTMLElement && newNode.hasAttribute('part')) {
    partNodes = [newNode, ...partNodes];
  }
  if (partNodes.length > 0) {
    styleShadowParts(host, partNodes);
  }
  // Handle "exportparts" nodes moving from one root to another. In this case,
  // any descendant part nodes have already been inserted, so we can't rely on
  // the upwards-walk that we would normally get from an insert call. We can
  // skip this work if we're inserting from a DocumentFragment, though, because
  // it's safe to assume in that case that the children have never been
  // connected anywhere else.
  if (!(newNode instanceof DocumentFragment)) {
    let exporters = newNode.querySelectorAll('[exportparts]');
    if (newNode instanceof HTMLElement && newNode.hasAttribute('exportparts')) {
      exporters = [newNode, ...exporters];
    }
    for (const exporter of exporters) {
      const exports = parseExportPartsAttribute(
        exporter.getAttribute('exportparts')
      ).map(({inner}) => inner);
      refreshShadyPartAttributes(exporter, exports);
    }
  }
}

/**
 * Enable/update styling of the given part nodes in the given host. All given
 * part nodes are assumed to be within the shadow root of the given host. This
 * function does the following:
 *
 *   [1] For each given part node, add a "shady-part" attribute with format
 *   "host-scope:parent-scope:part-name".
 *
 *   [2] Walk upwards through the tree of shadow hosts following "exportparts"
 *   attributes. For each exporting scope, for each given part node, add an
 *   additional "shady-part" attribute value with format e.g.
 *   "grand-parent-scope:parent-scope:aliased-part-name".
 *
 *   [3] If any of these ancestor scopes provide a ::part style rule to any of
 *   the given parts, and if any of those rules consume a CSS custom property,
 *   then "adopt" those style rules (by adding them to the host's StyleInfo
 *   object) and enable per-instance styling, so that CSS custom property values
 *   are computed at the correct scope (the receiver's scope, not the
 *   provider's).
 *
 * @param {!HTMLElement} host The host element of the given parts.
 * @param {!Array<!HTMLElement>} partNodes The new or changed part elements.
 * @return {void}
 */
export function styleShadowParts(host, partNodes) {
  const hostScope = host.localName;
  const superRoot = host.getRootNode();
  const parentScope =
    superRoot === document ? 'document' : superRoot.host.localName;
  const exportMap = findExportedPartMappings(host);

  // Things to keep track of that determine if and how we need to update this
  // host to account for ::part rules that consume custom properties.
  let needsRescoping = false;
  let newStyleNodes, newProperties;

  for (const node of partNodes) {
    const shadyParts = [];
    const partNames = splitPartString(node.getAttribute('part'));
    if (partNames.length === 0) {
      // Remove the "shady-part" attribute to support the case of "part" getting set to
      // the empty string or whitespace.
      removeShadyPartAttribute(node);
      continue;
    }

    let scopeKeys;
    if (!nativeCssVariables) {
      scopeKeys = new Set();
    }

    for (const name of partNames) {
      // Styles from our immediate parent scope.
      shadyParts.push(formatShadyPartAttribute(parentScope, hostScope, name));
      if (!nativeCssVariables) {
        scopeKeys.add(parentScope + ':' + hostScope);
      }

      // Styles from grand-parent and higher ancestor scopes, via the forwarding
      // map defined by "exportparts" attributes.
      const exported = exportMap[name];
      if (exported !== undefined) {
        for (const [providerScope, receiverScope, exportedName] of exported) {
          shadyParts.push(
            formatShadyPartAttribute(providerScope, receiverScope, exportedName)
          );
          if (!nativeCssVariables) {
            scopeKeys.add(providerScope + ':' + receiverScope);
          }
        }
      }
    }
    setShadyPartAttribute(node, shadyParts.join(' '));

    if (!nativeCssVariables) {
      // Find the part rules that match this node and that consume custom
      // properties. We'll need to switch to per-instance styling if we find any
      // within this host.
      for (const scopeKey of scopeKeys.values()) {
        const rules = findPartRulesThatMatchPartNode(scopeKey, partNames);
        for (const rule of rules) {
          if (!needsRescoping) {
            needsRescoping = true;
            newStyleNodes = new Set();
            newProperties = new Set();
          }
          newStyleNodes.add(rule.styleNode);
          newProperties.add(...rule.consumedProperties);
        }
      }
    }
  }

  if (needsRescoping) {
    rescopeForCustomProperties(host, newStyleNodes, newProperties);
  }
}
/* eslint-enable no-unused-vars */

/**
 * Update a host to account for it receiving part styles which consume custom
 * properties.
 *
 * We need special handling here because if an instance is receiving a part rule
 * that consumes a custom property, our basic handling above is not sufficient,
 * as we'd get incorrect property values.
 *
 * This is because the values of properties in part rules are determined in each
 * scope where the part rules are _consumed_, not in the scope where the part
 * rule is _defined_.
 *
 * To address this, when we see that an instance is consuming a part rule that
 * consumes a custom property, we "adopt" that part rule into the styles tracked
 * by ShadyCSS for that instance, and re-run the custom property shim logic.
 * This causes the part rule to be copied into the <style> tag for this
 * instance, with correct property values computed for the specific instance.
 *
 * @param host {!HTMLElement} The host to re-scope.
 * @param newStyleNodes {!Array<!StyleNode>} New part rules that need to be
 * adopted by this instance.
 * @param newProperties {!Array<!string>} New custom properties that this
 * instance now needs to track.
 * @return {void}
 */
function rescopeForCustomProperties(host, newStyleNodes, newProperties) {
  const styleInfo = StyleInfo.get(host);

  // These arrays aren't always initialized.
  if (!styleInfo.styleRules.rules) {
    styleInfo.styleRules.rules = [];
  }
  if (!styleInfo.customPropertyPartRules) {
    styleInfo.customPropertyPartRules = [];
  }

  for (const styleNode of newStyleNodes) {
    // Inject this ::part rule into the array of style rules managed by this
    // instance. This way, the standard ShadyCSS mechanism for evaluating
    // per-instance styles will take effect.
    if (styleInfo.styleRules.rules.indexOf(styleNode) === -1) {
      styleInfo.styleRules.rules.push(styleNode);
    }

    // We need to explicitly enumerate the active part rules on the styleInfo,
    // because that is used as part of the per-instance style cache lookup.
    if (styleInfo.customPropertyPartRules.indexOf(styleNode) === -1) {
      styleInfo.customPropertyPartRules.push(styleNode);
    }
  }

  // Augment the array of CSS custom properties consumed by this instance,
  // because that is also used in the per-instance style cache lookup.
  for (const property of newProperties) {
    if (styleInfo.ownStylePropertyNames.indexOf(property) === -1) {
      styleInfo.ownStylePropertyNames.push(property);
    }
  }

  // Re-scope this host. This creates a new <style> for this instance, or
  // re-uses an existing one by checking the cache, and updates "scope" classes
  // in this host's shadow root.
  //
  // TODO(aomarks) This function will already have been called on this instance,
  // when the element first connected. In that first invocation, we weren't able
  // to do any parts handling, because the DOM hadn't stamped yet, so we didn't
  // even know if the shadow root had any parts. We might be able to optimize
  // out these redundant calls, e.g. by skipping the first initial
  // _applyStyleProperties if we know that there *could* be part styles that
  // consume custom properties, based on ancestor template styles.
  // https://github.com/webcomponents/polyfills/issues/348
  window.ShadyCSS.ScopingShim._applyStyleProperties(host, styleInfo);
}

/**
 * A map from "providerScope:receiverScope" compound string key to an array of
 * ::part rules that were found during template preparation.
 *
 * We only populate this map if a ::part rule consumes a custom property and
 * native custom properties are not available.
 *
 * This map is used to quickly lookup whether a given ::part rule being applied
 * to an instance of a part node needs special handling for custom properties.
 *
 * @type {!Map<string, !Array<!PartRulesMapEntry>>}
 */
const partRulesMap = new Map();

/* eslint-disable no-unused-vars */
/**
 * An entry in the part rules map. Note this class is just used as a type; it
 * will be dead-code removed.
 * @record
 */
class PartRulesMapEntry {
  constructor() {
    /**
     * The ShadyCSS StyleNode for this ::part rule.
     * @type {!StyleNode}
     */
    this.styleNode;

    /**
     * The CSS custom property names consumed by this ::part rule.
     * @type {!Array<!string>}
     */
    this.consumedProperties;

    /**
     * The parsed part names that this ::part rule targets.
     * @type {!Array<!string>}
     */
    this.partNames;
  }
}
/* eslint-enable no-unused-vars */

/**
 * Look for any ::part rules in the given AST that consume custom properties,
 * and load those into the part rules map.
 *
 * @param {!string} providerScope Lower-case tag name of the element whose
 *     template this is.
 * @param {!StyleNode} styleAst Parsed CSS for this template.
 */
export function analyzeTemplatePartRules(providerScope, styleAst) {
  if (nativeCssVariables || !styleAst.rules) {
    return;
  }
  for (const styleNode of styleAst.rules) {
    const selectorList = styleNode['selector'];
    if (!selectorList || selectorList.indexOf('::part') === -1) {
      // TODO(aomarks) We do the `indexOf` check here to make the case where no
      // `::part` rules are used is as fast as possible, but we could get away
      // with just the `parsePartSelector` call we're doing next if the
      // difference is negligible. Needs benchmarking.
      continue;
    }
    const consumedProperties = findConsumedCustomProperties(
      styleNode['cssText']
    );
    if (consumedProperties.length === 0) {
      continue;
    }
    const selectors = StyleUtil.splitSelectorList(selectorList);
    for (const selector of selectors) {
      const parsed = parsePartSelector(selector);
      if (parsed === null) {
        continue;
      }
      const {elementName: receiverScope, partNames} = parsed;
      if (partNames.length === 0) {
        continue;
      }
      const key = [providerScope, receiverScope].join(':');
      let entries = partRulesMap.get(key);
      if (entries === undefined) {
        entries = [];
        partRulesMap.set(key, entries);
      }
      entries.push({
        styleNode,
        consumedProperties,
        partNames: splitPartString(partNames),
      });
    }
  }
}

/**
 * Extract the CSS custom property names that are consumed by the given CSS
 * text.
 *
 * @param {!string} cssText The CSS text.
 * @return {!Array<!string>}>} The CSS Custom Property names.
 */
function findConsumedCustomProperties(cssText) {
  const obj = {};
  StyleProperties.collectPropertiesInCssText(cssText, obj);
  return Object.getOwnPropertyNames(obj);
}

/**
 * Use the partRulesMap to retrieve any ::part rules that match a node in the
 * given scope with the given list of part names.
 *
 * Note that, by the spec, a specifier like "::part(foo bar)" will only match a
 * node that has both "foo" AND "bar" in its "part" attribute.
 *
 * @param {!string} scopeKey The compound scope key with format
 * "providerScope:receiverScope".
 * @param {!Array<!string>} partNames The split "part" attribute of some part
 * node.
 * @return {!Array<!PartRulesMapEntry>} The matching entries.
 */
function findPartRulesThatMatchPartNode(scopeKey, partNames) {
  const entries = partRulesMap.get(scopeKey);
  if (entries === undefined) {
    return [];
  }
  const matching = [];
  for (const entry of entries) {
    let matches = true;
    for (const partName of entry.partNames) {
      if (partNames.indexOf(partName) === -1) {
        // This rule does not match the given part node. E.g. the specifier is
        // "::part(foo bar)" but this part node is missin either "foo" or "bar"
        // or both in its "part" attribute.
        matches = false;
        break;
      }
    }
    if (matches === true) {
      matching.push(entry);
    }
  }
  return matching;
}
