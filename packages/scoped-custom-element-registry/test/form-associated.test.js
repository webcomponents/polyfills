import {expect} from '@open-wc/testing';

import {getFormAssociatedTestElement} from './utils';

export const commonRegistryTests = (registry) => {
  describe('Form associated custom elements', () => {
    it('should still be able to participate in a form', async () => {
      const {tagName, CustomElementClass} = getFormAssociatedTestElement();
      registry.define(tagName, CustomElementClass);

      const form = document.createElement('form');
      const element = new CustomElementClass();
      element.name = 'form-associated';
      form.append(element);

      expect(() => {
        form.append(element);
      }).not.to.throw;
    });
  });
};
