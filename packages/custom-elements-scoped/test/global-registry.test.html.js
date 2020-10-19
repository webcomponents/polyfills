import { expect } from "@open-wc/testing";

import { commonRegistryTests } from "./common-registry-tests.js";
import { getTestElement } from "./utils";

describe('Global Registry', () => {
  commonRegistryTests(customElements);

  describe('custom element constructors', () => {
    it('should allow to create a defined custom element', () => {
      const { tagName, CustomElementClass } = getTestElement();

      customElements.define(tagName, CustomElementClass);

      const el = new CustomElementClass();

      expect(el).to.not.be.undefined;
    });

    it('should throw if the custom element is not defined', () => {
      const { CustomElementClass } = getTestElement();

      expect(() => new CustomElementClass()).to.throw();
    });
  });
});
