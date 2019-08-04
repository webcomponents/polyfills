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
import {getInnerHTML} from '../innerHTML.js';
import {clearNode} from './Node.js';

/** @type {!Document} */
const inertDoc = document.implementation.createHTMLDocument('inert');

export const ElementOrShadowRootPatches = utils.getOwnPropertyDescriptors({

  /** @this {Element} */
  get innerHTML() {
    if (utils.isTrackingLogicalChildNodes(this)) {
      const content = this.localName === 'template' ?
      /** @type {HTMLTemplateElement} */(this).content : this;
      return getInnerHTML(content, utils.childNodesArray);
    } else {
      return this[utils.NATIVE_PREFIX + 'innerHTML'];
    }
  },

  /**
   * @this {Element}
   * @param {string} value
   */
  set innerHTML(value) {
    if (this.localName === 'template') {
      this[utils.NATIVE_PREFIX + 'innerHTML'] = value;
    } else {
      clearNode(this);
      // Make sure that the domain attributes of inertDoc and the document for
      // are the same in order to avoid WrongDocumentError in IE11.
      if ((inertDoc.domain.indexOf(document.domain) >= 0) && (inertDoc.domain !== document.domain)) {
        inertDoc.domain = document.domain;
      }
      // Some libraries, like Angular, create their own document object for their tags,
      // so make sure that domain value matches as well.
      if ((this.ownerDocument.domain.indexOf(document.domain) >= 0) && (this.ownerDocument.domain !== document.domain)) {
        this.ownerDocument.domain = document.domain;
      }
      const containerName = this.localName || 'div';
      let htmlContainer;
      if (!this.namespaceURI || this.namespaceURI === inertDoc.namespaceURI) {
        htmlContainer = inertDoc.createElement(containerName);
      } else {
        htmlContainer = inertDoc.createElementNS(this.namespaceURI, containerName);
      }
      if (utils.settings.hasDescriptors) {
        htmlContainer[utils.NATIVE_PREFIX + 'innerHTML'] = value;
      } else {
        htmlContainer.innerHTML = value;
      }
      let firstChild;
      while ((firstChild = htmlContainer[utils.SHADY_PREFIX + 'firstChild'])) {
        this[utils.SHADY_PREFIX + 'insertBefore'](firstChild);
      }
    }
  }

});
