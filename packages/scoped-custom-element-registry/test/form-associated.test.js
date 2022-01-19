import {expect} from '@open-wc/testing';

import {
  getFormAssociatedTestElement,
  getFormAssociatedErrorTestElement,
} from './utils';

export const commonRegistryTests = (registry) => {
  describe('Form associated custom elements', () => {
    it('should still be able to participate in a form', async () => {
      const {tagName, CustomElementClass} = getFormAssociatedTestElement();
      registry.define(tagName, CustomElementClass);

      const form = document.createElement('form');
      const element = new CustomElementClass();
      element.setAttribute('name', 'form-associated');
      form.append(element);

      expect(() => {
        form.append(element);
      }).not.to.throw;
      expect(new FormData(form).get(element.getAttribute('name'))).to.equal(
        'FACE'
      );
    });
  });

  describe('Form associated elements that should throw', () => {
    it('should throw an error if not explicitly form associated', () => {
      const {tagName, CustomElementClass} = getFormAssociatedErrorTestElement();
      registry.define(tagName, CustomElementClass);

      const form = document.createElement('form');
      const element = new CustomElementClass();
      element.setAttribute('name', 'form-associated');
      form.append(element);

      expect(() => {
        form.append(element);
      }).to.throw;
    });
  });
};
