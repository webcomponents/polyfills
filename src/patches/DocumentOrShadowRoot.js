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

function getDocumentActiveElement() {
  if (utils.settings.hasDescriptors) {
    return document[utils.NATIVE_PREFIX + 'activeElement'];
  } else {
    return document.activeElement;
  }
}

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
    let isShadyRoot = !!(utils.isShadyRoot(this));
    if (this !== document) {
      // If this node isn't a document or shady root, then it doesn't have
      // an active element.
      if (!isShadyRoot) {
        return null;
      }
      // If this shady root's host is the active element or the active
      // element is not a descendant of the host (in the composed tree),
      // then it doesn't have an active element.
      if (this.host === active ||
          !this.host[utils.NATIVE_PREFIX + 'contains'](active)) {
        return null;
      }
    }
    // This node is either the document or a shady root of which the active
    // element is a (composed) descendant of its host; iterate upwards to
    // find the active element's most shallow host within it.
    let activeRoot = utils.ownerShadyRootForNode(active);
    while (activeRoot && activeRoot !== this) {
      active = activeRoot.host;
      activeRoot = utils.ownerShadyRootForNode(active);
    }
    if (this === document) {
      // This node is the document, so activeRoot should be null.
      return activeRoot ? null : active;
    } else {
      // This node is a non-document shady root, and it should be
      // activeRoot.
      return activeRoot === this ? active : null;
    }
  }
});
