import { expect, nextFrame } from "@open-wc/testing";
import { getTestElement } from "./utils.js";

export const commonRegistryTests = registry => {
  describe('define', () => {
    it('should be able to define custom elements', () => {
      const { tagName, CustomElementClass } = getTestElement();

      registry.define(tagName, CustomElementClass);
    });

    it('should throw if the tag name has been defined previously', () => {
      const { tagName, CustomElementClass } = getTestElement();
      const { CustomElementClass : SecondCustomElementClass } = getTestElement();

      registry.define(tagName, CustomElementClass);

      expect(() => registry.define(tagName, SecondCustomElementClass)).to.throw();
    });

    it('should throw if the custom element has been defined previously', () => {
      const { tagName, CustomElementClass } = getTestElement();
      const { tagName : secondTagName } = getTestElement();

      registry.define(tagName, CustomElementClass);

      expect(() => 
      registry.define(secondTagName, CustomElementClass)
      ).to.throw();
    });
  });

  describe('get', () => {
    it(`should get a defined custom element through it's tagName`, () => {
      const { tagName, CustomElementClass } = getTestElement();
      registry.define(tagName, CustomElementClass);

      expect(registry.get(tagName)).to.be.equal(CustomElementClass);
      expect(registry.get(tagName)).to.be.equal(CustomElementClass);
    });

    it('should undefined if the tagName is not defined', () => {
      const { tagName } = getTestElement();

      expect(registry.get(tagName)).to.be.undefined;
    });
  });

  describe('upgrade', () => {
    it ('should upgrade a custom element directly', () => {
      const { tagName, CustomElementClass } = getTestElement();
      const $el = document.createElement(tagName);
      registry.define(tagName, CustomElementClass);

      expect($el).to.not.be.instanceof(CustomElementClass);
      registry.upgrade($el);

      expect($el).to.be.instanceof(CustomElementClass);
    });
  });

  describe('whenDefined', () => {
    it('should return a promise that resolves when a custom element becomes defined with a given name', async () => {
      const { tagName, CustomElementClass } = getTestElement();
      let defined = false;

      registry.whenDefined(tagName).then(() => defined = true);

      expect(defined).to.be.false;

      registry.define(tagName, CustomElementClass);
      await nextFrame();

      expect(defined).to.be.true;
    });
  });
};
