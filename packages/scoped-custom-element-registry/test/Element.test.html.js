import {expect} from '@open-wc/testing';

import {
  getTestElement,
  getObservedAttributesTestElement,
  getShadowRoot,
  getHTML
} from './utils.js';

describe('Element', () => {
  describe('global registry', () => {
    describe('innerHTML', () => {
      it('should upgrade an element defined in the global registry', () => {
        const {tagName, CustomElementClass} = getTestElement();
        customElements.define(tagName, CustomElementClass);
        const $el = getHTML('<div></div>');

        $el.innerHTML = `<${tagName}></${tagName}>`;

        expect($el.firstElementChild).to.be.instanceof(CustomElementClass);
      });

      it(`shouldn't upgrade an element defined in a custom registry`, () => {
        const {tagName, CustomElementClass} = getTestElement();
        const registry = new CustomElementRegistry();
        registry.define(tagName, CustomElementClass);
        const $el = getHTML('<div></div>');

        $el.innerHTML = `<${tagName}></${tagName}>`;

        expect($el.firstElementChild).to.not.be.instanceof(CustomElementClass);
      });
    });

    describe('insertAdjacentHTML', () => {
      it('should upgrade an element defined in the global registry', () => {
        const {tagName, CustomElementClass} = getTestElement();
        customElements.define(tagName, CustomElementClass);
        const $el = getHTML('<div></div>');

        $el.insertAdjacentHTML('afterbegin', `<${tagName}></${tagName}>`);

        expect($el.firstElementChild).to.be.instanceof(CustomElementClass);
      });

      it(`shouldn't upgrade an element defined in a custom registry`, () => {
        const {tagName, CustomElementClass} = getTestElement();
        const registry = new CustomElementRegistry();
        registry.define(tagName, CustomElementClass);
        const $el = getHTML('<div></div>');

        $el.insertAdjacentHTML('afterbegin', `<${tagName}></${tagName}>`);

        expect($el.firstElementChild).to.not.be.instanceof(CustomElementClass);
      });
    });
  });

  describe('custom registry', () => {
    describe('innerHTML', () => {
      it('should upgrade an element defined in the custom registry', () => {
        const {tagName, CustomElementClass} = getTestElement();
        const registry = new CustomElementRegistry();
        const shadowRoot = getShadowRoot(registry);
        const $el = getHTML('<div></div>', shadowRoot);
        registry.define(tagName, CustomElementClass);

        $el.innerHTML = `<${tagName}></${tagName}>`;

        expect($el.firstElementChild).to.be.instanceof(CustomElementClass);
      });

      it(`shouldn't upgrade an element defined in the global registry`, () => {
        const {tagName, CustomElementClass} = getTestElement();
        const registry = new CustomElementRegistry();
        const shadowRoot = getShadowRoot(registry);
        const $el = getHTML('<div></div>', shadowRoot);
        customElements.define(tagName, CustomElementClass);

        $el.innerHTML = `<${tagName}></${tagName}>`;

        expect($el.firstElementChild).to.not.be.instanceof(CustomElementClass);
      });
    });
  });

  describe('insertAdjacentHTML', () => {
    it('should upgrade an element defined in the custom registry', () => {
      const {tagName, CustomElementClass} = getTestElement();
      const registry = new CustomElementRegistry();
      const shadowRoot = getShadowRoot(registry);
      const $el = getHTML('<div></div>', shadowRoot);
      registry.define(tagName, CustomElementClass);

      $el.insertAdjacentHTML('afterbegin', `<${tagName}></${tagName}>`);

      expect($el.firstElementChild).to.be.instanceof(CustomElementClass);
    });

    it(`shouldn't upgrade an element defined in the global registry`, () => {
      const {tagName, CustomElementClass} = getTestElement();
      const registry = new CustomElementRegistry();
      const shadowRoot = getShadowRoot(registry);
      const $el = getHTML('<div></div>', shadowRoot);
      customElements.define(tagName, CustomElementClass);

      $el.insertAdjacentHTML('afterbegin', `<${tagName}></${tagName}>`);

      expect($el.firstElementChild).to.not.be.instanceof(CustomElementClass);
    });
  });

  describe('attributes', () => {
    it('should call setAttribute', () => {
      const {tagName, CustomElementClass} = getObservedAttributesTestElement(['foo']);
      customElements.define(tagName, CustomElementClass);
      const $el = getHTML('<div></div>');
      $el.innerHTML = `<${tagName}></${tagName}>`;

      $el.firstElementChild.setAttribute('foo', 'bar');

      expect($el.firstElementChild.getAttribute('foo')).to.equal('bar');
    });
    it('should call removeAttribute', () => {
      const {tagName, CustomElementClass} = getObservedAttributesTestElement(['foo']);
      customElements.define(tagName, CustomElementClass);
      const $el = getHTML('<div></div>');
      $el.innerHTML = `<${tagName} foo></${tagName}>`;

      $el.firstElementChild.removeAttribute('foo');

      expect($el.firstElementChild.hasAttribute('foo')).to.be.false;
    });
    it('should call toggleAttribute', () => {
      const {tagName, CustomElementClass} = getObservedAttributesTestElement(['foo']);
      customElements.define(tagName, CustomElementClass);
      const $el = getHTML('<div></div>');
      $el.innerHTML = `<${tagName}></${tagName}>`;

      $el.firstElementChild.toggleAttribute('foo', false);

      expect($el.firstElementChild.hasAttribute('foo')).to.be.false;

      $el.firstElementChild.toggleAttribute('foo', true);

      expect($el.firstElementChild.hasAttribute('foo')).to.be.true;
    });
  });
});
