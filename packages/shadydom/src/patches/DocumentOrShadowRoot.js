/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from '../utils.js';
import {ownerShadyRootForNode} from '../attach-shadow.js';

function getDocumentActiveElement() {
  if (utils.settings.hasDescriptors) {
    return document[utils.NATIVE_PREFIX + 'activeElement'];
  } else {
    return document.activeElement;
  }
}

// Get the element within the given set of roots.
function getElInRoot(roots, el) {
  let elRoot;
  while (
    el &&
    !roots.has((elRoot = el[utils.SHADY_PREFIX + 'getRootNode']()))
  ) {
    el = elRoot.host;
  }
  return el;
}

function getAncestorRoots(docOrRoot) {
  const roots = new Set();
  roots.add(docOrRoot);
  while (utils.isShadyRoot(docOrRoot) && docOrRoot.host) {
    docOrRoot = docOrRoot.host[utils.SHADY_PREFIX + 'getRootNode']();
    roots.add(docOrRoot);
  }
  return roots;
}

const USE_NATIVE_DOCUMENT_EFP = 'useNativeDocumentEFP';

const elementsFromPointProperty =
  utils.NATIVE_PREFIX +
  utils.getPropertyName(Document.prototype, 'elementsFromPoint');

export const DocumentOrShadowRootPatches = utils.getOwnPropertyDescriptors({
  /** @this {Document|ShadowRoot} */
  get activeElement() {
    let active = getDocumentActiveElement();
    // In IE11, activeElement might be an empty object if the document is
    // contained in an iframe.
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10998788/
    if (!active || !active.nodeType) {
      return null;
    }
    let isShadyRoot = !!utils.isShadyRoot(this);
    if (this !== document) {
      // If this node isn't a document or shady root, then it doesn't have
      // an active element.
      if (!isShadyRoot) {
        return null;
      }
      // If this shady root's host is the active element or the active
      // element is not a descendant of the host (in the composed tree),
      // then it doesn't have an active element.
      if (
        this.host === active ||
        !this.host[utils.NATIVE_PREFIX + 'contains'](active)
      ) {
        return null;
      }
    }
    // This node is either the document or a shady root of which the active
    // element is a (composed) descendant of its host; iterate upwards to
    // find the active element's most shallow host within it.
    let activeRoot = ownerShadyRootForNode(active);
    while (activeRoot && activeRoot !== this) {
      active = activeRoot.host;
      activeRoot = ownerShadyRootForNode(active);
    }
    if (this === document) {
      // This node is the document, so activeRoot should be null.
      return activeRoot ? null : active;
    } else {
      // This node is a non-document shady root, and it should be
      // activeRoot.
      return activeRoot === this ? active : null;
    }
  },

  /** @this {Document|ShadowRoot} */
  elementsFromPoint(x, y) {
    const nativeResult = document[elementsFromPointProperty](x, y);
    // support optionally opt-ing out for document
    if (this === document && utils.settings[USE_NATIVE_DOCUMENT_EFP]) {
      return nativeResult;
    }
    const nativeArray = utils.arrayFrom(nativeResult);
    // Filter native result to return the element in this root
    // OR an above root.
    // Set containing this root and its ancestor roots.
    const ancestorRoots = getAncestorRoots(this);
    // Use a Set since the elements can repeat.
    const rootedResult = new Set();
    for (let i = 0; i < nativeArray.length; i++) {
      rootedResult.add(getElInRoot(ancestorRoots, nativeArray[i]));
    }
    // Note, for IE compat avoid Array.from(set).
    const r = [];
    rootedResult.forEach((x) => r.push(x));
    return r;
  },

  /** @this {Document|ShadowRoot} */
  elementFromPoint(x, y) {
    // support optionally opt-ing out for document
    return this === document && utils.settings[USE_NATIVE_DOCUMENT_EFP]
      ? this[utils.NATIVE_PREFIX + 'elementFromPoint'](x, y)
      : this[utils.SHADY_PREFIX + 'elementsFromPoint'](x, y)[0] || null;
  },
});
