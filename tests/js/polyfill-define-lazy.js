/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

suite('polyfillLazyDefine', function() {
  var work;
  var assert = chai.assert;

  customElements.enableFlush = true;

  setup(function() {
    work = document.createElement('div');
    document.body.appendChild(work);
  });

  teardown(function() {
    document.body.removeChild(work);
  });

  suite('defining', function() {

    test('requires a name argument', function() {
      assert.throws(function() {
        customElements.polyfillDefineLazy();
      }, '', 'customElements.define failed to throw when given no arguments');
    });

    test('name must contain a dash', function() {
      assert.throws(function () {
        customElements.polyfillDefineLazy('xfoo', () => {prototype: Object.create(HTMLElement.prototype)});
      }, '', 'customElements.define failed to throw when given no arguments');
    });

    test('name must not be a reserved name', function() {
      assert.throws(function() {
        customElements.polyfillDefineLazy('font-face', () => {prototype: Object.create(HTMLElement.prototype)});
      }, '', 'Failed to execute \'defineElement\' on \'Document\': Registration failed for type \'font-face\'. The type name is invalid.');
    });

    test('name must be unique', function() {
      const generator = () => class XDuplicate extends HTMLElement {};
      customElements.polyfillDefineLazy('x-lazy-duplicate', generator);
      assert.throws(function() {
        customElements.polyfillDefineLazy('x-lazy-duplicate', generator);
      }, '', 'customElements.define failed to throw when called multiple times with the same element name');
    });

    test('name must be unique and not defined', function() {
      customElements.define('x-lazy-duplicate-define', class extends HTMLElement {});
      assert.throws(function() {
        customElements.polyfillDefineLazy('x-lazy-duplicate-define', () => class extends HTMLElement {});
      }, '', 'customElements.define failed to throw when called multiple times with the same element name');
    });

    test('names are case-sensitive', function() {
      const generator = () => class XCase extends HTMLElement {};
      assert.throws(function() { customElements.polyfillDefineLazy('X-CASE', generator); });
    });

    test('requires a constructor argument', function() {
      assert.throws(function () {
        customElements.polyfillDefineLazy('x-no-options');
      }, '', 'customElements.define failed to throw without a constructor argument');
    });

    test('define succeeds with named used for a polyfillDefineLazy with an invalid class', function() {
      customElements.polyfillDefineLazy('x-failed-define-lazy', () => {});
      // Work around for console.error being considered an error.
      sinon.spy(console, 'error');
      let error;
      try {
        customElements.define('x-failed-define-lazy', class extends HTMLElement {});
      } catch (e) {
        error = !!(e && !console.error.called);
      }
      assert.isFalse(error, 'Error thrown when defining an element using the same name as a failed definition with an invalid class.')
      console.error.restore();
    });

    test('define succeeds with named used for a polyfillDefineLazy with invalid callbacks', function() {
      try {
        customElements.polyfillDefineLazy('x-failed-define-lazy-callbacks', () => class extends HTMLElement {
          attributeChangedCallback() {}
          static get observedAttributes() {
            throw new Error('no attributes');
          }
        });
      } catch (e) {}
      // Work around for console.error being considered an error.
      sinon.spy(console, 'error');
      let error;
      try {
        customElements.define('x-failed-define-lazy-callbacks', class extends HTMLElement {});
      } catch (e) {
        error = !!(e && !console.error.called);
      }
      assert.isFalse(error, 'Error thrown when defining an element using the same name as a failed definition with invalid callbacks.')
      console.error.restore();
    });

  });

  suite('get', function() {

    test('returns constructor', function() {
      const ctor = class extends HTMLElement {};
      customElements.polyfillDefineLazy('x-get-lazy', () => ctor);
      assert.equal(customElements.get('x-get-lazy'), ctor);
    });

  });

  suite('whenDefined', function() {

    test('resolves', function() {
      const ctor = class extends HTMLElement {};
      customElements.polyfillDefineLazy('x-when-defined-lazy', () => ctor);
      return customElements.whenDefined('x-when-defined-lazy');
    });

  });

  suite('upgrades', function() {

    test('createElement upgrades when defined', function() {
      customElements.polyfillDefineLazy('lazy-create-upgrade', () => {
        return class extends HTMLElement {
          constructor() {
            super();
            this.upgraded = true;
          }
        }
      });
      const el = document.createElement('lazy-create-upgrade');
      assert.isTrue(el.upgraded);
    });

    test('element in dom upgrades', function() {
      const el = document.createElement('lazy-dom-upgrade');
      work.appendChild(el);
      customElements.polyfillDefineLazy('lazy-dom-upgrade', () => {
        return class extends HTMLElement {
          constructor() {
            super();
            this.upgraded = true;
          }
          connectedCallback() {
            this.connected = true;
          }
        }
      });
      assert.isTrue(el.upgraded);
      assert.isTrue(el.connected);
    });

    test('creating an element throws if a constructor getter is used with `define`', function() {
      customElements.define('pass-getter-to-define', function() {});
      let error;
      try {
        document.createElement('pass-getter-to-define');
      } catch (e) {
        error = e;
      }
      assert.ok(error);
    });

   });

});
