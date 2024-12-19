import {expect, nextFrame} from '@open-wc/testing';
import {
  getTestElement,
  createTemplate,
  getUnitializedShadowRoot,
} from './utils.js';

export const commonRegistryTests = (registry) => {
  describe('define', () => {
    it('should be able to define custom elements', () => {
      const {tagName, CustomElementClass} = getTestElement();

      registry.define(tagName, CustomElementClass);
    });

    it('should throw if the tag name has been defined previously', () => {
      const {tagName, CustomElementClass} = getTestElement();
      const {CustomElementClass: SecondCustomElementClass} = getTestElement();

      registry.define(tagName, CustomElementClass);

      expect(() =>
        registry.define(tagName, SecondCustomElementClass)
      ).to.throw();
    });

    it('should throw if the custom element has been defined previously', () => {
      const {tagName, CustomElementClass} = getTestElement();
      const {tagName: secondTagName} = getTestElement();

      registry.define(tagName, CustomElementClass);

      expect(() =>
        registry.define(secondTagName, CustomElementClass)
      ).to.throw();
    });
  });

  describe('get', () => {
    it(`should get a defined custom element through it's tagName`, () => {
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);

      expect(registry.get(tagName)).to.be.equal(CustomElementClass);
      expect(registry.get(tagName)).to.be.equal(CustomElementClass);
    });

    it('should undefined if the tagName is not defined', () => {
      const {tagName} = getTestElement();

      expect(registry.get(tagName)).to.be.undefined;
    });
  });

  describe('upgrade', () => {
    it('should upgrade a custom element directly', () => {
      const {tagName, CustomElementClass} = getTestElement();
      const $el = document.createElement(tagName);
      registry.define(tagName, CustomElementClass);

      expect($el).to.not.be.instanceof(CustomElementClass);
      registry.upgrade($el);

      expect($el).to.be.instanceof(CustomElementClass);
    });
  });

  describe('whenDefined', () => {
    it('should return a promise that resolves when a custom element becomes defined with a given name', async () => {
      const {tagName, CustomElementClass} = getTestElement();
      let defined = false;

      registry.whenDefined(tagName).then(() => (defined = true));

      expect(defined).to.be.false;

      registry.define(tagName, CustomElementClass);
      await nextFrame();

      expect(defined).to.be.true;
    });
  });

  describe('createElement', () => {
    it('should create built-in elements', async () => {
      const el = registry.createElement('div');
      expect(el).to.be.ok;
    });

    it('should create custom elements', async () => {
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      const el = registry.createElement(tagName);
      expect(el).to.be.instanceOf(CustomElementClass);
    });
  });

  describe('cloneSubtree', () => {
    it('should upgrade custom elements in cloned subtree', async () => {
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      const template = createTemplate(`
        <${tagName}><${tagName}></${tagName}></${tagName}>
        <${tagName}><${tagName}></${tagName}></${tagName}>
      `);
      const clone = registry.cloneSubtree(template.content);
      const els = clone.querySelectorAll(tagName);
      expect(els.length).to.be.equal(4);
      els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
    });
  });

  describe('initializeSubtree', () => {
    it('can create uninitialized roots', async () => {
      const shadowRoot = getUnitializedShadowRoot();
      expect(shadowRoot.customElements).to.be.null;
      shadowRoot.innerHTML = `<div></div>`;
      const el = shadowRoot.firstElementChild;
      expect(el.customElements).to.be.null;
    });

    it('initializeSubtree sets customElements', async () => {
      const shadowRoot = getUnitializedShadowRoot();
      shadowRoot.innerHTML = `<div></div>`;
      registry.initializeSubtree(shadowRoot);
      expect(shadowRoot.customElements).to.be.equal(registry);
      shadowRoot.innerHTML = `<div></div>`;
      const el = shadowRoot.firstElementChild;
      expect(el.customElements).to.be.equal(registry);
    });

    it('should not upgrade custom elements in uninitialized subtree', async () => {
      const shadowRoot = getUnitializedShadowRoot();
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      shadowRoot.innerHTML = `<${tagName}></${tagName}><div></div>`;
      const el = shadowRoot.firstElementChild;
      const container = shadowRoot.lastElementChild;
      expect(el.localName).to.be.equal(tagName);
      expect(el).not.to.be.instanceOf(CustomElementClass);
      container.innerHTML = `<${tagName}></${tagName}>`;
      const el2 = container.firstElementChild;
      expect(el2.localName).to.be.equal(tagName);
      expect(el2).not.to.be.instanceOf(CustomElementClass);
    });

    it('should upgrade custom elements in initialized subtree', async () => {
      const shadowRoot = getUnitializedShadowRoot();
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      shadowRoot.innerHTML = `<${tagName}></${tagName}><div></div>`;
      registry.initializeSubtree(shadowRoot);
      const el = shadowRoot.firstElementChild;
      const container = shadowRoot.lastElementChild;
      expect(el.localName).to.be.equal(tagName);
      expect(el).to.be.instanceOf(CustomElementClass);
      container.innerHTML = `<${tagName}></${tagName}>`;
      const el2 = container.firstElementChild;
      expect(el2.localName).to.be.equal(tagName);
      expect(el2).to.be.instanceOf(CustomElementClass);
    });

    it('should upgrade custom elements connected to subtree with registry', async () => {
      const shadowRoot = getUnitializedShadowRoot();
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      const container = registry.createElement('div');
      document.body.append(container);
      shadowRoot.innerHTML = `
        <${tagName}><${tagName}></${tagName}></${tagName}>
        <${tagName}><${tagName}></${tagName}></${tagName}>
      `;
      container.append(shadowRoot);
      const els = container.querySelectorAll(tagName);
      expect(els.length).to.be.equal(4);
      els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
      container.remove();
    });
  });
};
