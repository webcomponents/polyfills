function createCustomStyleElement(customStyleInterface) {
  class CustomStyle extends HTMLElement {

    constructor() {
      super();
      /** @type {HTMLStyleElement} */
      this.styleElement = null;
      customStyleInterface.addCustomStyle(this);
    }

    /**
     * @return {HTMLStyleElement}
     */
    getStyle() {
      if (!this.styleElement) {
        this.styleElement = /** @type {HTMLStyleElement} */(this.querySelector('style'));
      }
      return this.styleElement;
    }
  }

  CustomStyle.prototype['getStyle'] = CustomStyle.prototype.getStyle; // eslint-disable-line no-self-assign
  customElements.define('custom-style', CustomStyle);
}

export default createCustomStyleElement;
