function createCustomStyleElement(customStyleInterface) {
  class CustomStyle extends HTMLElement {

    constructor() {
      super();
      this.styleElement = null;
      customStyleInterface.addCustomStyle(this);
    }

    ['getStyle']() {
      if (!this.styleElement) {
        this.styleElement = this.querySelector('style');
      }
      return this.styleElement;
    }
  }
  customElements.define('custom-style', CustomStyle);
}

export default createCustomStyleElement;
