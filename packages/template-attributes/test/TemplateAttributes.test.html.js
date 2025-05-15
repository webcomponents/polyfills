import {expect} from '@open-wc/testing';

describe('Template Attributes', () => {
  it('should not break existing custom elements', () => {
    class EmptyElement extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({mode: 'open'});
      }
    }
    customElements.define('empty-element', EmptyElement);

    const el = document.createElement('empty-element');
    expect(el).to.not.be.undefined;
    expect(el).to.be.instanceof(HTMLElement);
  });
});
