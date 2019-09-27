/**
@license
Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/*
Wrapper over <style> elements to co-operate with ShadyCSS

Example:
<shady-css-scoped>
  <style>
  ...
  </style>
</shady-css-scoped>
*/
const CustomStyleInterface = window.ShadyCSS && window.ShadyCSS.CustomStyleInterface;
export default class ShadyCssScoped extends HTMLElement {

  constructor() {
    super();
    /** @type {HTMLStyleElement} */
    this._style = null;
    if (CustomStyleInterface) {
     CustomStyleInterface.addCustomStyle(this);
    }
  }

  /** @return {HTMLStyleElement} */
  getStyle() {
    if (!this._style) {
      this._style = /** @type {HTMLStyleElement} */ (this.querySelector('style'));
    }
    return this._style;
  }
}

ShadyCssScoped.prototype['getStyle'] = ShadyCssScoped.prototype.getStyle;// eslint-disable-line no-self-assign
window.customElements.define('shady-css-scoped', ShadyCssScoped);

