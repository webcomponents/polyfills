import {expect} from '@open-wc/testing';

import {
  getTestElement,
  getFormAssociatedTestElement,
  getFormAssociatedErrorTestElement,
} from './utils';

const supportsFACE =
  !!window['ElementInternals'] &&
  !!window['ElementInternals'].prototype['setFormValue'];

export const commonRegistryTests = (registry) => {
  if (supportsFACE) {
    describe('Form associated custom elements', () => {
      describe('participating elements', () => {
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

        it('should still be able to participate in a form as a RadioGroup', async () => {
          const {tagName, CustomElementClass} = getFormAssociatedTestElement();
          registry.define(tagName, CustomElementClass);

          const form = document.createElement('form');
          const element = new CustomElementClass();
          const element2 = new CustomElementClass();
          const name = 'form-associated';

          element.setAttribute('name', name);
          element2.setAttribute('name', name);
          form.append(element);
          form.append(element2);
          document.body.append(form);
          expect(form.elements[name].includes(element)).to.be.true;
          expect(form.elements[name].includes(element2)).to.be.true;
          expect(form.elements[name].value).to.equal('');
        });

        it('should be present in form.elements', async () => {
          const {tagName, CustomElementClass} = getFormAssociatedTestElement();
          registry.define(tagName, CustomElementClass);

          const form = document.createElement('form');
          const element = new CustomElementClass();
          element.setAttribute('name', 'form-associated');
          form.append(element);

          expect(form.elements[0], 'by index key').to.equal(element);
          expect(form.elements['form-associated'], 'by control name').to.equal(
            element
          );
          expect(
            form.elements.namedItem('form-associated'),
            'by namedItem'
          ).to.equal(element);
          expect(form.elements.length).to.equal(1);
        });
      });
    });

    describe('Form associated elements that should throw', () => {
      it('should throw an error if not explicitly form associated', () => {
        const {
          tagName,
          CustomElementClass,
        } = getFormAssociatedErrorTestElement();
        registry.define(tagName, CustomElementClass);

        expect(() => {
          new CustomElementClass();
        }).to.throw(
          DOMException,
          `The target element is not a form-associated custom element.`
        );
      });
    });
  }

  describe('Form elements should only include form associated elements', () => {
    it('will not include non form-associated elements', () => {
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);

      const form = document.createElement('form');
      const element = new CustomElementClass();
      form.append(element);

      expect(form.elements.length).to.equal(0);
    });
  });
};
