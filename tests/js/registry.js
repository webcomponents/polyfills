/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

suite('CustomElementsRegistry', function() {
  var work;
  var assert = chai.assert;
  var HTMLNS = 'http://www.w3.org/1999/xhtml';

  customElements.enableFlush = true;

  setup(function() {
    work = document.createElement('div');
    document.body.appendChild(work);
  });

  teardown(function() {
    document.body.removeChild(work);
  });

  suite('window', function () {

    test('customElements.define exists', function() {
      assert.isFunction(customElements.define);
    });

  });

  suite('define', function() {

    test('requires a name argument', function() {
      assert.throws(function() {
        customElements.define();
      }, '', 'customElements.define failed to throw when given no arguments');
    });

    test('name must contain a dash', function() {
      assert.throws(function () {
        customElements.define('xfoo', {prototype: Object.create(HTMLElement.prototype)});
      }, '', 'customElements.define failed to throw when given no arguments');
    });

    test('name must not be a reserved name', function() {
      assert.throws(function() {
        customElements.define('font-face', {prototype: Object.create(HTMLElement.prototype)});
      }, '', 'Failed to execute \'defineElement\' on \'Document\': Registration failed for type \'font-face\'. The type name is invalid.');
    });

    test('name must be unique', function() {
      class XDuplicate extends HTMLElement {}
      customElements.define('x-duplicate', XDuplicate);
      assert.throws(function() {
        customElements.define('x-duplicate', XDuplicate);
      }, '', 'customElements.define failed to throw when called multiple times with the same element name');
    });

    test('names are case-sensitive', function() {
      class XCase extends HTMLElement {}
      assert.throws(function() { customElements.define('X-CASE', XCase); });
    });

    test('requires a constructor argument', function() {
      assert.throws(function () {
        customElements.define('x-no-options');
      }, '', 'customElements.define failed to throw without a constructor argument');
    });

    test('second argument prototype property is required', function() {
      assert.throws(function () {
        customElements.define('x-no-proto', {});
      }, '', 'customElements.define failed to throw with a constructor argument with no prototype');
    });

  });

  suite('get', function() {

    test('returns a defined constructor', function () {
      class XGet extends HTMLElement {}
      customElements.define('x-get', XGet);
      assert.equal(XGet, customElements.get('x-get'));
    });

    test('returns undefined for an undefined constructor', function () {
      assert.isUndefined(customElements.get('x-undefined'));
    });

  });

  suite('whenDefined', function() {

    test('resolves when a tag is defined', function () {
      var promise = customElements.whenDefined('x-when-defined').then(function (r) {
        assert.isUndefined(r);
      });
      class XDefined extends HTMLElement {}
      customElements.define('x-when-defined', XDefined);
      return promise;
    });

    test('throws for an invalid element name', function () {
      return customElements.whenDefined('div').then(
        function() {
          assert.fail();
        },
        function() {
          // pass
          return;
        });
    });

  });

  // Tests taken from the web-platform-test project:
  // https://github.com/w3c/web-platform-tests/pull/9869
  suite('upgrade', function() {
    test('Upgrading an element directly (example from the spec)', function() {
      const el = document.createElement('spider-man');

      class SpiderMan extends HTMLElement {}
      customElements.define('spider-man', SpiderMan);

      assert.isFalse(el instanceof SpiderMan, 'The element must not yet be upgraded');

      customElements.upgrade(el);
      assert.isTrue(el instanceof SpiderMan, 'The element must now be upgraded');
    });

    test('Two elements as children of the upgraded node', function() {
      const el1 = document.createElement('element-a-1');
      const el2 = document.createElement('element-a-2');
      const container = document.createElement('div');
      container.appendChild(el1);
      container.appendChild(el2);

      class Element1 extends HTMLElement {}
      class Element2 extends HTMLElement {}
      customElements.define('element-a-1', Element1);
      customElements.define('element-a-2', Element2);

      assert.isFalse(el1 instanceof Element1, 'element 1 must not yet be upgraded');
      assert.isFalse(el2 instanceof Element2, 'element 2 must not yet be upgraded');

      customElements.upgrade(container);
      assert.isTrue(el1 instanceof Element1, 'element 1 must now be upgraded');
      assert.isTrue(el2 instanceof Element2, 'element 2 must now be upgraded');
    });

    test('Two elements as descendants of the upgraded node', function() {
      const el1 = document.createElement('element-b-1');
      const el2 = document.createElement('element-b-2');
      const container = document.createElement('div');
      const subContainer = document.createElement('span');
      const subSubContainer = document.createElement('span');
      container.appendChild(subContainer);
      subContainer.appendChild(el1);
      subContainer.appendChild(subSubContainer);
      subSubContainer.appendChild(el2);

      class Element1 extends HTMLElement {}
      class Element2 extends HTMLElement {}
      customElements.define('element-b-1', Element1);
      customElements.define('element-b-2', Element2);

      assert.isFalse(el1 instanceof Element1, 'element 1 must not yet be upgraded');
      assert.isFalse(el2 instanceof Element2, 'element 2 must not yet be upgraded');

      customElements.upgrade(container);
      assert.isTrue(el1 instanceof Element1, 'element 1 must now be upgraded');
      assert.isTrue(el2 instanceof Element2, 'element 2 must now be upgraded');
    });

    test('Two elements as shadow-including descendants (and not descendants) of the upgraded node', function() {
      const el1 = document.createElement('element-d-1');
      const el2 = document.createElement('element-d-2');

      const container = document.createElement('div');
      const subContainer = document.createElement('span');
      subContainer.attachShadow({ mode: 'open' });
      const subSubContainer = document.createElement('span');
      subSubContainer.attachShadow({ mode: 'open' });

      container.appendChild(subContainer);
      subContainer.shadowRoot.appendChild(el1);
      subContainer.shadowRoot.appendChild(subSubContainer);
      subSubContainer.shadowRoot.appendChild(el2);

      class Element1 extends HTMLElement {}
      class Element2 extends HTMLElement {}
      customElements.define('element-d-1', Element1);
      customElements.define('element-d-2', Element2);

      assert.isFalse(el1 instanceof Element1, 'element 1 must not yet be upgraded');
      assert.isFalse(el2 instanceof Element2, 'element 2 must not yet be upgraded');

      customElements.upgrade(container);
      assert.isTrue(el1 instanceof Element1, 'element 1 must now be upgraded');
      assert.isTrue(el2 instanceof Element2, 'element 2 must now be upgraded');
    });

    test('Elements inside a template contents DocumentFragment node', function() {
      const template = document.createElement('template');
      template.innerHTML = `
        <div>
          <element-c-1></element-c-1>
          <element-c-2>
            <element-c-3></element-c-3>
            <span>
              <element-c-4></element-c-4>
            </span>
          </element-c-2>
        </div>
        <element-c-5></element-c-5>
      `;

      // This code feels repetitive but I tried to make it use loops and it became harder to see the correctness.

      const el1 = template.content.querySelector('element-c-1');
      const el2 = template.content.querySelector('element-c-2');
      const el3 = template.content.querySelector('element-c-3');
      const el4 = template.content.querySelector('element-c-4');
      const el5 = template.content.querySelector('element-c-5');

      class Element1 extends HTMLElement {}
      class Element2 extends HTMLElement {}
      class Element3 extends HTMLElement {}
      class Element4 extends HTMLElement {}
      class Element5 extends HTMLElement {}

      customElements.define('element-c-1', Element1);
      customElements.define('element-c-2', Element2);
      customElements.define('element-c-3', Element3);
      customElements.define('element-c-4', Element4);
      customElements.define('element-c-5', Element5);

      assert.isFalse(el1 instanceof Element1, 'element 1 must not yet be upgraded');
      assert.isFalse(el2 instanceof Element2, 'element 2 must not yet be upgraded');
      assert.isFalse(el3 instanceof Element3, 'element 3 must not yet be upgraded');
      assert.isFalse(el4 instanceof Element4, 'element 4 must not yet be upgraded');
      assert.isFalse(el5 instanceof Element5, 'element 5 must not yet be upgraded');

      customElements.upgrade(template);

      assert.isFalse(el1 instanceof Element1, 'element 1 must not yet be upgraded despite upgrading the template');
      assert.isFalse(el2 instanceof Element2, 'element 2 must not yet be upgraded despite upgrading the template');
      assert.isFalse(el3 instanceof Element3, 'element 3 must not yet be upgraded despite upgrading the template');
      assert.isFalse(el4 instanceof Element4, 'element 4 must not yet be upgraded despite upgrading the template');
      assert.isFalse(el5 instanceof Element5, 'element 5 must not yet be upgraded despite upgrading the template');

      customElements.upgrade(template.content);

      assert.isTrue(el1 instanceof Element1, 'element 1 must now be upgraded');
      assert.isTrue(el2 instanceof Element2, 'element 2 must now be upgraded');
      assert.isTrue(el3 instanceof Element3, 'element 3 must now be upgraded');
      assert.isTrue(el4 instanceof Element4, 'element 4 must now be upgraded');
      assert.isTrue(el5 instanceof Element5, 'element 5 must now be upgraded');
    });
  });

});
