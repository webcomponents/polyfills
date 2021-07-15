import {expect} from '@open-wc/testing';

import {getTestElement} from './utils';

describe('Native HTMLElement', () => {
  describe('custom element constructors', () => {
    it('should allow to create a custom element which class has been created before applying the polyfill', async () => {
      const {tagName, CustomElementClass} = getTestElement();

      await import('../scoped-custom-element-registry.min.js');

      customElements.define(tagName, CustomElementClass);

      const element = document.createElement(tagName);

      expect(element).to.not.be.undefined;
    });
  });
});
