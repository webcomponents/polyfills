import {expect} from '@open-wc/testing';

import {commonRegistryTests} from './common-registry-tests.js';
import {commonRegistryTests as faceTests} from './form-associated.test.js';
import {getTestElement} from './utils';

describe('Global Registry', () => {
  commonRegistryTests(customElements);

  if (window.ElementInternals) {
    faceTests(customElements);
  }

  describe('custom element constructors', () => {
    it('should allow to create a defined custom element', () => {
      const {tagName, CustomElementClass} = getTestElement();

      customElements.define(tagName, CustomElementClass);

      const el = new CustomElementClass();

      expect(el).to.not.be.undefined;
    });

    it('should throw if the custom element is not defined', () => {
      const {CustomElementClass} = getTestElement();

      expect(() => new CustomElementClass()).to.throw();
    });
  });

  describe('whenDefined', () => {
    it('should resolve whenDefined when defined after calling whenDefined', async () => {
      const {tagName, CustomElementClass} = getTestElement();
      const whenDefined = customElements.whenDefined(tagName);
      customElements.define(tagName, CustomElementClass);
      const ctor = await whenDefined;
      expect(ctor).to.equal(CustomElementClass);
    });

    it('should resolve whenDefined when defined before calling whenDefined', async () => {
      const {tagName, CustomElementClass} = getTestElement();
      customElements.define(tagName, CustomElementClass);
      const ctor = await customElements.whenDefined(tagName);
      expect(ctor).to.equal(CustomElementClass);
    });
  });
});
