import CustomStyleInterface from './custom-style-interface.js';

export default class CustomStyle extends HTMLElement {

  constructor() {
    super();
    this.styleElement = null;
    CustomStyleInterface.addCustomStyle(this);
  }

  getStyle() {
    if (!this.styleElement) {
      this.styleElement = this.querySelector('style');
    }
    return this.styleElement;
  }
}
customElements.define('custom-style', CustomStyle);
