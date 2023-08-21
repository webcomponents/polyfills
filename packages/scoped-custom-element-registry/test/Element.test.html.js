import {expect} from '@open-wc/testing';

import {
  getTestElement,
  getObservedAttributesTestElement,
  getShadowRoot,
  getHTML,
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
      const {tagName, CustomElementClass} = getObservedAttributesTestElement([
        'foo',
      ]);
      customElements.define(tagName, CustomElementClass);
      const $el = document.createElement(tagName);

      $el.setAttribute('foo', 'bar');

      expect($el.getAttribute('foo')).to.equal('bar');
    });

    it('setAttribute should trigger attributeChangedCallback', () => {
      const {tagName, CustomElementClass} = getObservedAttributesTestElement([
        'foo',
        'bar',
      ]);
      customElements.define(tagName, CustomElementClass);

      const $el = getHTML(`<${tagName} bar="value 1"></${tagName}>`);
      expect($el.changedAttributes[0]).to.deep.equal({
        name: 'bar',
        oldValue: null,
        newValue: 'value 1',
      });

      $el.setAttribute('foo', '');
      expect($el.changedAttributes[1]).to.deep.equal({
        name: 'foo',
        oldValue: null,
        newValue: '',
      });

      $el.setAttribute('foo', '');
      expect($el.changedAttributes[2]).to.deep.equal({
        name: 'foo',
        oldValue: '',
        newValue: '',
      });

      $el.setAttribute('foo', 'value 1');
      expect($el.changedAttributes[3]).to.deep.equal({
        name: 'foo',
        oldValue: '',
        newValue: 'value 1',
      });

      /* Setting an attribute just set programmatically with the same key and
       * value should still trigger the callback. */
      $el.setAttribute('foo', 'value 1');
      expect($el.changedAttributes[4]).to.deep.equal({
        name: 'foo',
        oldValue: 'value 1',
        newValue: 'value 1',
      });

      $el.setAttribute('foo', 'value 2');
      expect($el.changedAttributes[5]).to.deep.equal({
        name: 'foo',
        oldValue: 'value 1',
        newValue: 'value 2',
      });

      /* Setting an attribute that was already present in the HTML with the same
       * value should still trigger the callback. */
      $el.setAttribute('bar', 'value 1');
      expect($el.changedAttributes[6]).to.deep.equal({
        name: 'bar',
        oldValue: 'value 1',
        newValue: 'value 1',
      });

      $el.setAttribute('bar', 'value 2');
      expect($el.changedAttributes[7]).to.deep.equal({
        name: 'bar',
        oldValue: 'value 1',
        newValue: 'value 2',
      });
    });

    it('should call removeAttribute', () => {
      const {tagName, CustomElementClass} = getObservedAttributesTestElement([
        'foo',
      ]);
      customElements.define(tagName, CustomElementClass);
      const $el = getHTML(`<${tagName} foo></${tagName}>`);

      $el.removeAttribute('foo');

      expect($el.hasAttribute('foo')).to.be.false;
    });

    it('removeAttribute should trigger attributeChangedCallback', () => {
      const {tagName, CustomElementClass} = getObservedAttributesTestElement([
        'foo',
      ]);
      customElements.define(tagName, CustomElementClass);
      const $el = getHTML(`<${tagName} foo></${tagName}>`);

      $el.removeAttribute('foo');
      expect($el.changedAttributes[1]).to.deep.equal({
        name: 'foo',
        oldValue: '',
        newValue: null,
      });

      $el.setAttribute('foo', 'value');
      $el.removeAttribute('foo');
      expect($el.changedAttributes[3]).to.deep.equal({
        name: 'foo',
        oldValue: 'value',
        newValue: null,
      });
    });

    it('should call toggleAttribute', () => {
      const {tagName, CustomElementClass} = getObservedAttributesTestElement([
        'foo',
      ]);
      customElements.define(tagName, CustomElementClass);
      const $el = document.createElement(tagName);

      $el.toggleAttribute('foo', false);

      expect($el.hasAttribute('foo')).to.be.false;

      $el.setAttribute('foo', '');
      $el.toggleAttribute('foo', true);

      expect($el.hasAttribute('foo')).to.be.true;
    });

    it('toggleAttribute should trigger attributeChangedCallback', () => {
      const {tagName, CustomElementClass} = getObservedAttributesTestElement([
        'foo',
      ]);
      customElements.define(tagName, CustomElementClass);
      const $el = getHTML(`<${tagName} foo></${tagName}>`);

      /* Forcefully toggling an already present attribute on shouldn't trigger
       * a change. */
      $el.toggleAttribute('foo', true);
      expect($el.changedAttributes).to.have.length(1);

      /* Forcefully toggling a present attribute off. */
      $el.toggleAttribute('foo', false);
      expect($el.changedAttributes).to.have.length(2);
      expect($el.changedAttributes[1]).to.deep.equal({
        name: 'foo',
        oldValue: '',
        newValue: null,
      });

      /* Forcefully toggling a non-present attribute off shouldn't trigger a
       * change. */
      $el.toggleAttribute('foo', false);
      expect($el.changedAttributes).to.have.length(2);

      /* Forcefully toggling an absent attribute off. */
      $el.toggleAttribute('foo', true);
      expect($el.changedAttributes).to.have.length(3);
      expect($el.changedAttributes[2]).to.deep.equal({
        name: 'foo',
        oldValue: null,
        newValue: '',
      });

      /* Non-forcefully toggling attributes off and on. */
      $el.toggleAttribute('foo');
      $el.toggleAttribute('foo');
      expect($el.changedAttributes.slice(3)).to.deep.equal([
        {name: 'foo', oldValue: '', newValue: null},
        {name: 'foo', oldValue: null, newValue: ''},
      ]);
    });
  });
});
