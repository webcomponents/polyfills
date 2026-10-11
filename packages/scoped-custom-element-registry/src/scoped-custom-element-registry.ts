/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * Note: this file is a script, not a module, so toplevel
 * interfaces are global. This is relevant because those named
 * after existing global TypeScript types actually add to those
 * types, as though they were declared in a `declare global` in a module.
 */

declare interface PolyfillWindow {
  CustomElementRegistryPolyfill: {
    force?: boolean;
    formAssociated: Set<string>;
    nativeRegistry: CustomElementRegistry;
    hasCustomElementRegistry: boolean;
    hasNullCustomElementRegistry: boolean;
    inUse: boolean;
    loaded?: boolean;
  };
}

const polyfillWindow = (window as unknown) as PolyfillWindow;

/**
 * Polyfill helper object. This is global and distinct from
 * `CustomElementRegistry` because the polyfill does not use modules and
 * so that it is clearly polyfill-specific and not related to the native
 * feature.
 *
 * The `formAssociated` setting cannot be properly scoped and can only be set
 * once per name. This is determined by how it is set on the first defined
 * tag name. However, adding the name to
 * `CustomElementRegistryPolyfill.formAssociated` (a `Set`) before loading
 * reserves the given tag so it's always formAssociated.
 */
polyfillWindow[
  'CustomElementRegistryPolyfill'
] ??= {} as PolyfillWindow['CustomElementRegistryPolyfill'];
polyfillWindow['CustomElementRegistryPolyfill'][
  'formAssociated'
] ??= new Set<string>();

const {force} = polyfillWindow['CustomElementRegistryPolyfill'];

// Whether the browser's native support is complete enough to use. Added
// based on native issues noted via testing in Chrome/Webkit. Besides the
// registry itself, a null registry must: be inherited by parsed children, be
// set by the declarative attributes, and keep an element from being customized
// with a global definition. Note, the last check defines a uniquely named
// probe element in the global registry. Names the build doesn't know are
// quoted so it doesn't rename them.
const detectNativeSupport = () => {
  const hasCustomElementRegistry = 'customElementRegistry' in Element.prototype;
  let hasNullCustomElementRegistry = false;
  if (hasCustomElementRegistry) {
    try {
      const nullOptions = {
        ['customElementRegistry']: (null as unknown) as CustomElementRegistry,
      };
      const parent = document.createElement('div', nullOptions);
      parent.innerHTML = '<span></span>';
      const declarative = document.createElement('div');
      (declarative as HTMLElement)['setHTMLUnsafe'](
        '<div customelementregistry scopedcustomelementregistry></div>'
      );
      const probeName = `polyfill-null-registry-probe-${Math.random()
        .toString(36)
        .slice(2)}`;
      // Note, not a class: the build compiles classes to functions, which
      // can't construct an element (WebKit constructs the probe).
      const Probe = function Probe() {
        return Reflect.construct(HTMLElement, [], Probe);
      };
      Probe.prototype = Object.create(HTMLElement.prototype);
      customElements.define(
        probeName,
        (Probe as unknown) as CustomElementConstructor
      );
      const probe = document.createElement(probeName, nullOptions);
      hasNullCustomElementRegistry =
        (parent.firstChild as HTMLElement)['customElementRegistry'] === null &&
        (declarative.firstChild as HTMLElement)['customElementRegistry'] ===
          null &&
        !probe.matches(':defined');
    } catch (e) {
      // squelch, unsupported browser
    }
  }
  return {
    'hasCustomElementRegistry': hasCustomElementRegistry,
    'hasNullCustomElementRegistry': hasNullCustomElementRegistry,
    'inUse':
      force || !hasCustomElementRegistry || !hasNullCustomElementRegistry,
  };
};
// Note, a second load would run detection against the polyfill itself.
if (!polyfillWindow['CustomElementRegistryPolyfill']['loaded']) {
  Object.assign(
    polyfillWindow['CustomElementRegistryPolyfill'],
    detectNativeSupport()
  );
}

// Note, `??=` so a second load does not capture the shimmed registry.
polyfillWindow['CustomElementRegistryPolyfill']['nativeRegistry'] ??=
  window.customElements;

interface CustomElementConstructor {
  observedAttributes?: Array<string>;
  formAssociated?: boolean;

  new (...params: unknown[]): CustomHTMLElement;
}

interface CustomHTMLElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  ['connectedMoveCallback']?(): void;
  adoptedCallback?(): void;
  attributeChangedCallback?(
    name: string,
    oldValue?: string | null,
    newValue?: string | null,
    namespace?: string | null
  ): void;
  formAssociatedCallback?(form: HTMLFormElement | null): void;
  formDisabledCallback?(disabled: boolean): void;
  formResetCallback?(): void;
  formStateRestoreCallback?(
    state: File | string | FormData | null,
    mode: string
  ): void;
}

interface CustomElementDefinition {
  elementClass: CustomElementConstructor;
  tagName: string;
  /**
   * We hold onto the versions of callbacks at registration time, because
   * that's the specc'd behavior.
   */
  connectedCallback?: CustomHTMLElement['connectedCallback'];
  disconnectedCallback?: CustomHTMLElement['disconnectedCallback'];
  ['connectedMoveCallback']?: CustomHTMLElement['connectedMoveCallback'];
  adoptedCallback?: CustomHTMLElement['adoptedCallback'];
  attributeChangedCallback?: CustomHTMLElement['attributeChangedCallback'];
  formAssociated?: boolean;
  formAssociatedCallback?: CustomHTMLElement['formAssociatedCallback'];
  formDisabledCallback?: CustomHTMLElement['formDisabledCallback'];
  formResetCallback?: CustomHTMLElement['formResetCallback'];
  formStateRestoreCallback?: CustomHTMLElement['formStateRestoreCallback'];
  observedAttributes: Set<string>;
  disableShadow?: boolean;
  disableInternals?: boolean;
  // Whether the tag's stand-in is form-associated (see `define`).
  standInFormAssociated?: boolean;
  // The tag's stand-in class, which `new` constructs. Only set for a
  // definition in the global registry, the only one whose class `new` can
  // construct.
  standInClass?: CustomElementConstructor;
}

// Note, `customElementRegistry` matches spec, others provided for back compat.
interface ShadowRootWithSettableCustomElementRegistry extends ShadowRoot {
  ['registry']?: CustomElementRegistry | null;
  ['customElements']?: CustomElementRegistry | null;
  ['customElementRegistry']: CustomElementRegistry | null;
}

interface ShadowRootInitWithSettableCustomElements extends ShadowRootInit {
  ['registry']?: CustomElementRegistry;
  ['customElements']?: CustomElementRegistry;
  ['customElementRegistry']?: CustomElementRegistry;
}

type ParametersOf<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ((...args: any) => any) | undefined
> = T extends Function ? Parameters<T> : never;

// How it works
//
// - Stand-ins: each tag defined in any registry gets one native "stand-in"
//   definition. The browser constructs stand-ins and delivers their reactions;
//   the polyfill forwards them to the user's class from the element's registry,
//   upgrading with the "constructor call trick" (see `customize`).
// - Registries: `registryForNode` records each node's registry. A patched
//   API records the registry of each node it creates. A node made by a parser
//   gets its registry from where it is, recorded the first time it's needed
//   (see `getRegistry`). Native registry state is never consulted, so behavior
//   is the same whether or not the browser has support.
// - Queue and flush: the stand-in constructor only queues. Every patched API
//   that can construct elements is an "entry point" (`withDeferredUpgrades`)
//   that records registries for what it created, then flushes before
//   returning, customizing each queued element with its registry's
//   definition. Elements the main parser creates are customized once inserted
//   (see `observeParsing`), since a parsed element's tree and attributes aren't
//   known when it's constructed.
// - Null registries come from options, the null registry attributes, and
//   declarative shadow roots (see `DSD_HOST_ATTRIBUTE`).
// - Moves: a node's registry is recorded before it's moved or removed, so
//   it doesn't change (see `recordRegistriesBeforeMove`).
// - Cloning is native, then each copy is paired with its source by index to
//   get its registry (see `cloneWithRegistries`).
// - Forms: an element whose own class isn't form-associated, of a tag that
//   is, is left out of its form's collections (see `isFormControl`).
// - Windows: same-origin windows each run the polyfill, but share its state,
//   so registries, elements and nodes work across them (see `shared`).
//
// Use an IIFE to prevent polyfill use if native scoped registries are detected
(() => {
  const {['inUse']: inUse} = polyfillWindow['CustomElementRegistryPolyfill'];
  if (!inUse) {
    return;
  }
  // Note, loading twice would re-patch the already patched DOM API.
  if (polyfillWindow['CustomElementRegistryPolyfill']['loaded']) {
    return;
  }

  // Same-origin windows share the polyfill's state: the first copy to load
  // puts it on the topmost window it can reach, and later copies use it, so
  // registries, elements and nodes work across windows (e.g. iframes). A
  // copy of another version keeps its own. Each window still has its own
  // patches, global registry, stand-in classes and parser queue.
  const STATE_VERSION = '1';
  const stateKey = '__scopedCustomElementRegistryPolyfillState';
  const topWindow = (() => {
    let top: Window = window;
    try {
      while (top.parent !== top && top.parent.document) {
        top = top.parent;
      }
    } catch {
      // Note, a cross-origin ancestor can't be reached.
    }
    return (top as unknown) as Record<string, Record<string, unknown>>;
  })();
  let state = topWindow[stateKey];
  if (state?.['version'] !== STATE_VERSION) {
    state = {['version']: STATE_VERSION};
    if (!topWindow[stateKey]) {
      topWindow[stateKey] = state;
    }
  }
  const shared = <T>(name: string, create: () => T): T =>
    (state![name] ??= create()) as T;
  polyfillWindow['CustomElementRegistryPolyfill']['loaded'] = true;

  // Note, the parser consumes a declarative template, taking with it the
  // standard `shadowrootcustomelementregistry` attribute, so this attribute on
  // the host tells the polyfill the shadow root has a null registry. Markup
  // should carry both: the standard one for browsers with native support, and
  // this one for the polyfill.
  const DSD_HOST_ATTRIBUTE = 'polyfill-shadowrootcustomelementregistry';
  // Note, these attributes mark an element, and its parsed contents, as
  // having a null registry. The standard attribute is being renamed from
  // `customelementregistry` to `scopedcustomelementregistry`
  // (https://github.com/whatwg/html/pull/12000), so both are honored. Where
  // the browser has native support, it handles whichever it implements before
  // the polyfill runs. The polyfill- prefixed forms are equivalent, but the
  // browser never handles them, so the polyfill does in every browser; they do
  // nothing without the polyfill.
  const NULL_REGISTRY_ATTRIBUTES = [
    'customelementregistry',
    'scopedcustomelementregistry',
    'polyfill-customelementregistry',
    'polyfill-scopedcustomelementregistry',
  ];
  const NULL_REGISTRY_SELECTOR = NULL_REGISTRY_ATTRIBUTES.map(
    (name) => `[${name}]`
  ).join(', ');
  const NativeHTMLElement = window.HTMLElement;

  // Note, `:defined` matches every stand-in, including ones the polyfill has
  // not customized (e.g. while parsing, or with no definition in its registry),
  // and can't be changed. So a stand-in carries this custom state until it's
  // customized, and CSS can use
  // `:is(:not(:defined), :state(polyfill-undefined))` in place of
  // `:not(:defined)`. Without the polyfill, the state is never set.
  const UNDEFINED_STATE = 'polyfill-undefined';
  // Note, an element can attach internals only once, so the stand-in's
  // internals are handed to the user (see `attachInternals` below).
  const nativeAttachInternals = NativeHTMLElement.prototype['attachInternals'];
  const internalsForElement = shared(
    'internalsForElement',
    () => new WeakMap<HTMLElement, ElementInternals>()
  );
  const internalsAttachedByUser = shared(
    'internalsAttachedByUser',
    () => new WeakSet<HTMLElement>()
  );
  const nativeInternalsFormGetter = window['ElementInternals']
    ? Object.getOwnPropertyDescriptor(
        window['ElementInternals'].prototype,
        'form'
      )?.get
    : undefined;
  const statesOf = (internals: ElementInternals | undefined) =>
    (internals as {['states']?: Set<string>} | undefined)?.['states'];
  const nativeDefine = window.customElements.define;
  const nativeGet = window.customElements.get;
  const nativeUpgrade = window.customElements.upgrade;
  const nativeRegistry = window.customElements;

  const definitionForElement = shared(
    'definitionForElement',
    () => new WeakMap<HTMLElement, CustomElementDefinition>()
  );
  const globalDefinitionForConstructor = new WeakMap<
    CustomElementConstructor,
    CustomElementDefinition
  >();

  /**
   * This WeakMap associates elements with registries. In general, an element's
   * registry cannot change once set unless it is initially null.
   * An element gets its registry from (1) the `customElementRegistry` provided
   * via its DOM creation API, e.g. `createElement` or `importNode`, or (2)
   * via a call to `customElementRegistry.initialize(node)` on an ancestor or the
   * element, or (3) from root of the tree in which its created, e.g.
   * `documentOrShadowRoot.customElementRegistry`, or (4) and importantly when
   * created via an HTML string (e.g. innerHTML, insertAdjacentHTML), the
   * *parent* element. A node made by a parser gets its registry from where it
   * is (see `getRegistry`).
   *
   * See https://dom.spec.whatwg.org/#concept-create-element
   */
  const registryForNode = shared(
    'registryForNode',
    () => new WeakMap<Node, ShimmedCustomElementsRegistry | null>()
  );
  const childrenOf = (node: Node) =>
    Array.from((node as ParentNode).children ?? []);
  // Note, not `instanceof`, which fails for nodes from other windows.
  const isShadowRoot = (node: unknown): node is ShadowRoot =>
    (node as Node | null)?.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
    'host' in (node as ShadowRoot);
  const isTemplate = (node: unknown): node is HTMLTemplateElement =>
    (node as Element | null)?.localName === 'template' &&
    (node as Element).namespaceURI === 'http://www.w3.org/1999/xhtml';
  // Calls `fn` for `node` and each element under it, in tree order, and if
  // `shadowRoots`, also for the shadow roots the polyfill knows and what's in
  // them.
  const forEachInTree = (
    node: Node,
    fn: (node: Node) => void,
    shadowRoots = false
  ) => {
    fn(node);
    const shadowRoot = shadowRoots ? getShadowRoot(node) : undefined;
    if (shadowRoot) {
      forEachInTree(shadowRoot, fn, true);
    }
    // Note, `fn` doesn't change the tree: callers only record registries, or
    // queue upgrades, which run when their entry point returns.
    for (
      let child = (node as ParentNode).firstElementChild;
      child;
      child = child.nextElementSibling
    ) {
      forEachInTree(child, fn, shadowRoots);
    }
  };

  // Gives `node` and every element under it with a null registry `registry`
  // (see `initialize`).
  const initializeSubtree = (
    node: Node,
    registry: ShimmedCustomElementsRegistry
  ) =>
    forEachInTree(node, (n) => {
      if (getRegistry(n) === null) {
        registryForNode.set(n, registry);
      }
    });

  // Upgrades each element in `node`'s subtree whose registry is `registry`,
  // or has it wait for a definition.
  const upgradeSubtree = (
    node: Node,
    registry: ShimmedCustomElementsRegistry
  ) =>
    forEachInTree(node, (n) => {
      if (n.nodeType === Node.ELEMENT_NODE && getRegistry(n) === registry) {
        registry._upgradeOrWait(n as HTMLElement);
      }
    });

  class AsyncInfo<T> {
    readonly promise: Promise<T>;
    readonly resolve: (val: T) => void;
    constructor() {
      let resolve: (val: T) => void;
      this.promise = new Promise<T>((r) => {
        resolve = r;
      });
      this.resolve = resolve!;
    }
  }

  // Set only while constructing the global registry so it is not scoped.
  let isCreatingGlobalRegistry = false;
  // Every registry the polyfill created, so a registry from elsewhere (e.g. a
  // window without the polyfill, or a user's object) is never used as one.
  const polyfillRegistries = shared(
    'polyfillRegistries',
    () => new WeakSet<object>()
  );
  const isPolyfillRegistry = (
    value: unknown
  ): value is ShimmedCustomElementsRegistry =>
    polyfillRegistries.has(value as object);

  // https://html.spec.whatwg.org/#valid-custom-element-name
  const reservedCustomElementNames = new Set([
    'annotation-xml',
    'color-profile',
    'font-face',
    'font-face-src',
    'font-face-uri',
    'font-face-format',
    'font-face-name',
    'missing-glyph',
  ]);
  const isValidCustomElementName = (name: string) =>
    /^[a-z][^\t\n\f\r \0/>A-Z]*$/.test(name) &&
    name.includes('-') &&
    !reservedCustomElementNames.has(name);

  // Whether an HTML element named `name` would be an HTMLUnknownElement.
  const nativeCreateElementNS = Document.prototype.createElementNS as (
    this: Document,
    namespace: string | null,
    name: string,
    options?: ElementCreationOptions
  ) => Element;
  const isUnknownElementName = (name: string) => {
    try {
      return (
        nativeCreateElementNS.call(
          document,
          'http://www.w3.org/1999/xhtml',
          name
        ) instanceof HTMLUnknownElement
      );
    } catch {
      return true;
    }
  };

  // Whether `value` is a constructor, without calling it.
  const isConstructor = (value: unknown) => {
    try {
      Reflect.construct(String, [], value as Function);
      return true;
    } catch {
      return false;
    }
  };

  // https://webidl.spec.whatwg.org/#js-sequence
  const toStrings = (value: unknown, property: string) => {
    if (value === undefined) {
      return [];
    }
    if (
      (typeof value !== 'object' && typeof value !== 'function') ||
      value === null ||
      typeof (value as Iterable<unknown>)[Symbol.iterator] !== 'function'
    ) {
      throw new TypeError(`${property} must be iterable`);
    }
    return Array.from(value as Iterable<unknown>, String);
  };

  // https://webidl.spec.whatwg.org/#js-callback-function
  const toCallback = (value: unknown, property: string) => {
    if (value !== undefined && typeof value !== 'function') {
      throw new TypeError(`${property} must be a function`);
    }
    return value as Function | undefined;
  };

  const defineError = (reason: string, name = 'NotSupportedError') =>
    new DOMException(
      `Failed to execute 'define' on 'CustomElementRegistry': ${reason}`,
      name
    );

  // Reads a definition from the user's class, in the order native `define`
  // does, validating as it goes. Note, this can run user code.
  // https://html.spec.whatwg.org/#dom-customelementregistry-define
  const readDefinition = (
    tagName: string,
    elementClass: CustomElementConstructor
  ): CustomElementDefinition => {
    const {prototype} = elementClass;
    if (
      (typeof prototype !== 'object' && typeof prototype !== 'function') ||
      prototype === null
    ) {
      throw new TypeError('The class prototype must be an object');
    }
    const callback = (name: string) =>
      toCallback((prototype as Record<string, unknown>)[name], name);
    const lifecycle = {
      connectedCallback: callback('connectedCallback'),
      disconnectedCallback: callback('disconnectedCallback'),
      'connectedMoveCallback': callback('connectedMoveCallback'),
      adoptedCallback: callback('adoptedCallback'),
      attributeChangedCallback: callback('attributeChangedCallback'),
    };
    const observedAttributes = lifecycle.attributeChangedCallback
      ? toStrings(elementClass.observedAttributes, 'observedAttributes')
      : [];
    const disabledFeatures = toStrings(
      (elementClass as {['disabledFeatures']?: unknown})['disabledFeatures'],
      'disabledFeatures'
    );
    const formAssociated = Boolean(elementClass['formAssociated']);
    const formCallbacks = formAssociated
      ? {
          'formAssociatedCallback': callback('formAssociatedCallback'),
          'formResetCallback': callback('formResetCallback'),
          'formDisabledCallback': callback('formDisabledCallback'),
          'formStateRestoreCallback': callback('formStateRestoreCallback'),
        }
      : {};
    return {
      tagName,
      elementClass,
      ...(lifecycle as Partial<CustomElementDefinition>),
      ...(formCallbacks as Partial<CustomElementDefinition>),
      observedAttributes: new Set(observedAttributes),
      disableShadow: disabledFeatures.includes('shadow'),
      disableInternals: disabledFeatures.includes('internals'),
      'formAssociated': formAssociated,
    };
  };

  // Constructable CE registry class, which uses the native CE registry to
  // register stand-in elements that can delegate out to CE classes registered
  // in scoped registries
  class ShimmedCustomElementsRegistry implements CustomElementRegistry {
    private readonly _definitionsByTag = new Map<
      string,
      CustomElementDefinition
    >();
    private readonly _definitionsByClass = new Map<
      CustomElementConstructor,
      CustomElementDefinition
    >();
    private readonly _whenDefinedPromises = new Map<
      string,
      AsyncInfo<CustomElementConstructor>
    >();
    private readonly _elementsWaitingForDefinition = new Map<
      string,
      Set<HTMLElement>
    >();
    // Note, set while `define` reads the user's class (see `_whileDefining`).
    private _isDefining = false;
    readonly _isScoped = !isCreatingGlobalRegistry;
    // Note, as natively (its "scoped document set"), the documents a scoped
    // registry is used in, in the order it was first used there, which is
    // the order `define` upgrades in. Approximated by when it's associated
    // with a node (a shadow root, element or `initialize`), rather than when
    // that node is connected.
    readonly _documents = new Set<Document>();
    _associate(doc: Document) {
      if (this._isScoped) {
        this._documents.add(doc);
      }
    }

    constructor() {
      polyfillRegistries.add(this);
    }

    // Note, defining can upgrade existing elements, so it's an entry point.
    define(
      tagName: string,
      elementClass: CustomElementConstructor,
      options?: ElementDefinitionOptions
    ) {
      withDeferredUpgrades(() =>
        this._define(String(tagName), elementClass, options)
      );
    }

    _define(
      tagName: string,
      elementClass: CustomElementConstructor,
      options?: ElementDefinitionOptions
    ) {
      if (!isConstructor(elementClass)) {
        throw new TypeError(
          `Failed to execute 'define' on 'CustomElementRegistry': the provided value is not a constructor`
        );
      }
      if (!isValidCustomElementName(tagName)) {
        throw defineError(
          `"${tagName}" is not a valid custom element name`,
          'SyntaxError'
        );
      }
      if (this._getDefinition(tagName) !== undefined) {
        throw defineError(
          `the name "${tagName}" has already been used with this registry`
        );
      }
      if (this._definitionsByClass.has(elementClass)) {
        throw defineError(
          'this constructor has already been used with this registry'
        );
      }
      if (options?.extends !== undefined) {
        this._defineCustomizedBuiltIn(tagName, elementClass, options);
        return;
      }
      const checkStandIn = () => {
        const standInClass = nativeGet.call(nativeRegistry, tagName);
        if (standInClass && !standInClasses.has(standInClass)) {
          throw defineError(
            `the name "${tagName}" is already defined natively (e.g. as a customized built-in element)`
          );
        }
        return standInClass;
      };
      checkStandIn();
      const definition = this._whileDefining(() =>
        readDefinition(tagName, elementClass)
      );
      // Note, reading the class runs user code, which can define the tag
      // elsewhere, so the stand-in is looked up after it. The browser only
      // knows the stand-in, so whether the tag can be form-associated is fixed
      // by its first definition, or reserved in
      // `CustomElementRegistryPolyfill.formAssociated`.
      let standInClass = checkStandIn();
      definition.standInFormAssociated = standInClass
        ? Boolean(standInClass['formAssociated'])
        : definition['formAssociated'] ||
          polyfillWindow['CustomElementRegistryPolyfill']['formAssociated'].has(
            tagName
          );
      // Note, native define constructs the stand-ins of existing elements,
      // which are customized when this entry point returns.
      if (!standInClass) {
        defineStandInEverywhere(tagName, definition.standInFormAssociated);
        standInClass = nativeGet.call(nativeRegistry, tagName);
      }
      this._definitionsByTag.set(tagName, definition);
      this._definitionsByClass.set(elementClass, definition);
      patchHTMLElement(elementClass);
      if (this === globalCustomElementRegistry) {
        globalDefinitionForConstructor.set(elementClass, definition);
        definition.standInClass = standInClass;
      }
      // Upgrade the elements waiting for this definition
      const awaiting = this._elementsWaitingForDefinition.get(tagName);
      if (awaiting) {
        this._elementsWaitingForDefinition.delete(tagName);
        for (const element of awaiting) {
          this._upgradeOrWait(element, definition);
        }
      }
      // Note, as natively, a scoped registry upgrades document by document,
      // in its documents' order, then in tree order (the queue's order).
      if (this._isScoped) {
        const documents = [...this._documents];
        const order = (element: HTMLElement) => {
          const index = documents.indexOf(element.ownerDocument);
          return index === -1 ? documents.length : index;
        };
        const queue = currentQueue();
        const sorted = [...queue].sort((a, b) => order(a) - order(b));
        queue.clear();
        sorted.forEach((element) => queue.add(element));
      }
      this._resolveWhenDefined(tagName, elementClass);
    }

    // Note, customized built-ins can't be scoped, so they're defined natively
    // as they are, which also validates `extends`.
    _defineCustomizedBuiltIn(
      tagName: string,
      elementClass: CustomElementConstructor,
      options: ElementDefinitionOptions
    ) {
      if (this._isScoped) {
        throw defineError(
          "a scoped registry can't define customized built-in elements"
        );
      }
      const extendsName = String(options.extends);
      if (
        isValidCustomElementName(extendsName) ||
        isUnknownElementName(extendsName)
      ) {
        throw defineError(`"${extendsName}" can't be extended`);
      }
      // Note, the class is read and validated first, as native define does,
      // so it isn't visible if that fails. Native define upgrades existing
      // elements before returning, so the definition is then recorded, for
      // their constructors and callbacks. Native define reads the class
      // again: if that fails, the definition is removed.
      const definition = this._whileDefining(() =>
        readDefinition(tagName, elementClass)
      );
      this._definitionsByTag.set(tagName, definition);
      this._definitionsByClass.set(elementClass, definition);
      try {
        nativeDefine.call(nativeRegistry, tagName, elementClass, options);
      } catch (e) {
        this._definitionsByTag.delete(tagName);
        this._definitionsByClass.delete(elementClass);
        throw e;
      }
      this._resolveWhenDefined(tagName, elementClass);
    }

    // Runs `read`, which reads the user's class and so can run user code,
    // rejecting any `define` it causes.
    _whileDefining<T>(read: () => T): T {
      if (this._isDefining) {
        throw defineError('another definition is running');
      }
      this._isDefining = true;
      try {
        return read();
      } finally {
        this._isDefining = false;
      }
    }

    _resolveWhenDefined(
      tagName: string,
      elementClass: CustomElementConstructor
    ) {
      const info = this._whenDefinedPromises.get(tagName);
      if (info !== undefined) {
        info.resolve(elementClass);
        this._whenDefinedPromises.delete(tagName);
      }
    }

    // Upgrades the elements in the tree that use this registry; as natively,
    // others are left as they are.
    upgrade(root: Node) {
      withDeferredUpgrades(() => {
        // Note, as natively, elements the browser hasn't constructed are
        // constructed (queuing them) so they can be customized. Shadow roots
        // are upgraded natively one by one too, since WebKit's upgrade doesn't
        // reach into them (https://bugs.webkit.org/show_bug.cgi?id=326259).
        nativeUpgrade.call(nativeRegistry, root);
        forEachInTree(
          root,
          (node) => {
            if (isShadowRoot(node)) {
              nativeUpgrade.call(nativeRegistry, node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              this._upgradeOrWait(node as HTMLElement);
            }
          },
          true
        );
      });
    }

    get(tagName: string) {
      const definition = this._definitionsByTag.get(String(tagName));
      return definition?.elementClass;
    }

    ['getName'](elementClass: CustomElementConstructor) {
      const definition = this._definitionsByClass.get(elementClass);
      return definition?.tagName ?? null;
    }

    _getDefinition(tagName: string) {
      return this._definitionsByTag.get(tagName);
    }

    ['whenDefined'](name: string) {
      let tagName: string;
      try {
        tagName = String(name);
      } catch (e) {
        return Promise.reject(e);
      }
      if (!isValidCustomElementName(tagName)) {
        return Promise.reject(
          new DOMException(
            `Failed to execute 'whenDefined' on 'CustomElementRegistry': "${tagName}" is not a valid custom element name`,
            'SyntaxError'
          )
        );
      }
      const definition = this._getDefinition(tagName);
      if (definition !== undefined) {
        return Promise.resolve(definition.elementClass);
      }
      let info = this._whenDefinedPromises.get(tagName);
      if (info === undefined) {
        info = new AsyncInfo<CustomElementConstructor>();
        this._whenDefinedPromises.set(tagName, info);
      }
      return info.promise;
    }

    _waitForDefinition(element: HTMLElement) {
      const tagName = element.localName;
      let waiting = this._elementsWaitingForDefinition.get(tagName);
      if (!waiting) {
        waiting = new Set<HTMLElement>();
        this._elementsWaitingForDefinition.set(tagName, waiting);
      }
      waiting.add(element);
    }

    _stopWaitingForDefinition(element: HTMLElement) {
      this._elementsWaitingForDefinition
        .get(element.localName)
        ?.delete(element);
    }

    // Upgrades the element if this registry defines it, otherwise has it wait
    // for a definition.
    _upgradeOrWait(element: HTMLElement, definition?: CustomElementDefinition) {
      if (getRegistry(element) !== this) {
        return;
      }
      definition ??= this._getDefinition(element.localName);
      if (definition !== undefined) {
        customize(element, definition);
      } else if (element.localName.includes('-')) {
        // Note, so once defined, it's customized as an upgrade (see
        // `constructedDirectly`).
        constructedDirectly.delete(element);
        // Note, only custom names can be defined. A connected stand-in waits
        // for a definition here (its disconnected callback stops waiting, and
        // its connected callback waits again). Any other element is upgraded
        // once the browser constructs it, by native define or on its next
        // connection.
        if (element.isConnected && standInElements.has(element)) {
          this._waitForDefinition(element);
        }
      }
    }

    ['initialize'](node: Node) {
      withDeferredUpgrades(() => this._initialize(node));
    }

    _initialize(node: Node) {
      // https://html.spec.whatwg.org/multipage/custom-elements.html#dom-customelementregistry-initialize
      if (
        !this._isScoped &&
        (node.nodeType === Node.DOCUMENT_NODE ||
          getRegistry(node.ownerDocument!) !== this)
      ) {
        throw new DOMException(
          `Failed to execute 'initialize' on 'CustomElementRegistry': a global registry can only initialize nodes in its document`,
          'NotSupportedError'
        );
      }
      this._associate(node.ownerDocument ?? (node as Document));
      initializeSubtree(node, this);
      // Note, with native support, the browser never constructs elements it
      // parsed into a null registry subtree, so they get no native reactions.
      // Initializing natively too makes them stand-ins. The native global
      // registry only initializes nodes in its own document, and not the
      // document itself, so its element is used instead.
      // Note, this could instead be done eagerly wherever the polyfill applies
      // a null registry, so no element stays natively uncustomized; plain
      // `:defined` would then match those elements, as it does without native
      // support.
      const nativeRoot =
        node.nodeType === Node.DOCUMENT_NODE
          ? (node as Document).documentElement
          : node;
      if (nativeRoot?.ownerDocument === document) {
        (nativeRegistry as {
          initialize?: (node: Node) => void;
        })['initialize']?.call(nativeRegistry, nativeRoot);
      }
      upgradeSubtree(node, this);
    }
  }

  isCreatingGlobalRegistry = true;
  const globalCustomElementRegistry = new ShimmedCustomElementsRegistry();
  isCreatingGlobalRegistry = false;

  // The element being customized, and the class whose constructor is running
  // for it (see `customize`). Note, a constructor can create or construct
  // other elements before calling `super()`, so this is saved and restored
  // around each customization, and only taken by that class.
  // Note, during an upgrade, once the constructor has called `super()`,
  // `instance` is cleared rather than the whole value: as natively (the
  // "already constructed" marker), the constructor can't then construct its
  // own class again.
  const current = shared('current', () => ({
    construction: undefined as
      | {
          instance: HTMLElement | undefined;
          elementClass: CustomElementConstructor;
          isUpgrade: boolean;
        }
      | undefined,
    directConstructions: 0,
    excludableFormElementCount: 0,
  }));
  // User extends this HTMLElement, which returns the CE being upgraded
  window.HTMLElement = (function HTMLElement(this: HTMLElement) {
    // Customizing: the browser constructed the stand-in, and the user's
    // constructor is being called on it (the "constructor-call trick"), so
    // it's returned here.
    // Note, `this` has the constructed class's prototype. (The build compiles
    // to ES5, which can't express `new.target`.)
    if (
      current.construction &&
      Object.getPrototypeOf(this) ===
        current.construction.elementClass.prototype
    ) {
      const {instance, elementClass, isUpgrade} = current.construction;
      if (instance === undefined) {
        throw new TypeError(
          'Failed to construct a custom element: it is being upgraded, and its constructor already called super()'
        );
      }
      current.construction = isUpgrade
        ? {instance: undefined, elementClass, isUpgrade}
        : undefined;
      // Note, as natively, the prototype is set by `super()`, so a
      // constructor that throws before it leaves the element as it was.
      Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
      return instance;
    }
    // Constructing with `new`: a stand-in is constructed and returned. As
    // natively, only a class defined in the global registry can be.
    const definition = globalDefinitionForConstructor.get(
      this.constructor as CustomElementConstructor
    );
    if (!definition) {
      throw new TypeError(
        'Illegal constructor (custom element class must be registered with global customElements registry to be newable)'
      );
    }
    const instance = Reflect.construct(
      NativeHTMLElement,
      [],
      definition.standInClass
    );
    Object.setPrototypeOf(instance, this.constructor.prototype);
    definitionForElement.set(instance!, definition);
    // Note, as natively, a constructed element has the global registry.
    registryForNode.set(instance, globalCustomElementRegistry);
    // Note, the browser didn't construct a stand-in, so this element is
    // noted here if it may be left out of its form (see `isFormControl`).
    if (definition.standInFormAssociated && !definition['formAssociated']) {
      addExcludableFormElement(instance);
    }
    return instance;
  } as unknown) as typeof HTMLElement;
  window.HTMLElement.prototype = NativeHTMLElement.prototype;
  // Note, so it and its subclasses inherit the statics of `Element` and
  // `Node` (e.g. `ELEMENT_NODE`), as natively.
  Object.setPrototypeOf(
    window.HTMLElement,
    Object.getPrototypeOf(NativeHTMLElement)
  );
  // Note, so `element.constructor === HTMLElement` holds, as natively, and
  // its name is kept, since the build compiles the function to an anonymous
  // one.
  Object.defineProperty(window.HTMLElement, 'name', {value: 'HTMLElement'});
  Object.defineProperty(NativeHTMLElement.prototype, 'constructor', {
    value: window.HTMLElement,
    writable: true,
    configurable: true,
  });

  // Creates the stand-in class the browser knows for a tag, which delegates to
  // the definition of each element's own registry.
  // Note, its callbacks call the user's directly, since the browser reports
  // their errors. Callbacks the polyfill calls itself go through
  // `invokeCallback`, which reports them.
  const standInClasses = new WeakSet<CustomElementConstructor>();
  const createStandInClass = (
    formAssociated: boolean
  ): CustomElementConstructor => {
    const standInClass = (class ScopedCustomElementBase {
      // Note, this can't vary by registry (see `define`).
      static get ['formAssociated']() {
        return formAssociated;
      }
      constructor() {
        const instance = Reflect.construct(
          NativeHTMLElement,
          [],
          this.constructor
        );
        // Note, the user's prototype is installed when it's customized.
        Object.setPrototypeOf(instance, HTMLElement.prototype);
        if (nativeAttachInternals) {
          const internals = nativeAttachInternals.call(instance);
          // Note, browsers that required a `--` prefix (e.g. Chrome before
          // 125) throw for this name; the state is then simply unavailable.
          try {
            statesOf(internals)?.add(UNDEFINED_STATE);
          } catch {
            // squelch
          }
          internalsForElement.set(instance, internals);
        }
        // Note, the element is only queued. Whatever caused its construction
        // (a polyfill entry point, or the parser) flushes the queue once the
        // element is in its tree and its registry is known (see
        // `flushUpgrades`).
        standInElements.add(instance);
        if (
          current.directConstructions > 0 ||
          (isParsing() && entryQueues.length === 0)
        ) {
          constructedDirectly.add(instance);
        }
        if (formAssociated) {
          addExcludableFormElement(instance);
        }
        currentQueue().add(instance);
        if (!shouldDeferUpgrade()) {
          scheduleFlush();
        }
        return instance;
      }

      connectedCallback(
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['connectedCallback']>
      ) {
        const definition = definitionForElement.get(this);
        if (definition) {
          definition.connectedCallback?.apply(this, args);
        } else {
          // Note, a newly constructed element is still queued, and is left to
          // the flush. Otherwise, it upgrades via its current registry (which
          // may have changed, e.g. by adoption), or waits for a definition
          // while connected.
          if (isUpgradeQueued(this)) {
            return;
          }
          getRegistry(this)?._upgradeOrWait(this);
        }
      }

      disconnectedCallback(
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['disconnectedCallback']>
      ) {
        const definition = definitionForElement.get(this);
        if (definition) {
          definition.disconnectedCallback?.apply(this, args);
        } else {
          // Note, so a disconnected element isn't kept alive. Its registry
          // hasn't changed since it started waiting: `initialize` only changes
          // a null registry, which never waits, and adoption, which changes
          // registries before the move, stops it waiting first (see
          // `adoptRegistries`).
          getRegistry(this)?._stopWaitingForDefinition(this);
        }
      }

      // Note, since the stand-in defines this, the browser calls it for every
      // `moveBefore` rather than disconnecting and reconnecting the element.
      // So, as natively, a user class without it is disconnected and
      // reconnected instead. A move doesn't change whether an uncustomized
      // element is connected, so it needs nothing.
      ['connectedMoveCallback'](this: HTMLElement) {
        const definition = definitionForElement.get(this);
        if (!definition) {
          return;
        }
        if (definition['connectedMoveCallback']) {
          definition['connectedMoveCallback'].call(this);
        } else {
          invokeCallback(definition.disconnectedCallback, this);
          invokeCallback(definition.connectedCallback, this);
        }
      }

      adoptedCallback(
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['adoptedCallback']>
      ) {
        // Note, its registry was already changed by the patched API that
        // adopted it (see `adoptRegistries`).
        definitionForElement.get(this)?.adoptedCallback?.apply(this, args);
      }

      // Form-associated custom elements lifecycle methods
      ['formAssociatedCallback'](
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['formAssociatedCallback']>
      ) {
        getFormAssociatedDefinition(this)?.['formAssociatedCallback']?.apply(
          this,
          args
        );
      }

      ['formDisabledCallback'](
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['formDisabledCallback']>
      ) {
        getFormAssociatedDefinition(this)?.['formDisabledCallback']?.apply(
          this,
          args
        );
      }

      ['formResetCallback'](
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['formResetCallback']>
      ) {
        getFormAssociatedDefinition(this)?.['formResetCallback']?.apply(
          this,
          args
        );
      }

      ['formStateRestoreCallback'](
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['formStateRestoreCallback']>
      ) {
        getFormAssociatedDefinition(this)?.['formStateRestoreCallback']?.apply(
          this,
          args
        );
      }

      // no attributeChangedCallback or observedAttributes since these
      // are simulated via setAttribute/removeAttribute patches
    } as unknown) as CustomElementConstructor;
    standInClasses.add(standInClass);
    return standInClass;
  };

  // Note, every window sharing the state (see `shared`) gets a stand-in for
  // each name any registry defines, so its browser constructs elements of it
  // too. A window that's closed or gone is dropped.
  const standInTags = shared('standInTags', () => new Map<string, boolean>());
  const standInDefiners = shared(
    'standInDefiners',
    () =>
      new Set<{
        window: Window;
        define: (tagName: string, formAssociated: boolean) => void;
      }>()
  );
  const defineStandInHere = (tagName: string, formAssociated: boolean) => {
    if (!nativeGet.call(nativeRegistry, tagName)) {
      nativeDefine.call(
        nativeRegistry,
        tagName,
        createStandInClass(formAssociated)
      );
    }
  };
  const defineStandInEverywhere = (
    tagName: string,
    formAssociated: boolean
  ) => {
    standInTags.set(tagName, formAssociated);
    for (const definer of standInDefiners) {
      try {
        if (definer.window.closed) {
          throw new Error('closed');
        }
        definer.define(tagName, formAssociated);
      } catch {
        standInDefiners.delete(definer);
      }
    }
  };
  window.CustomElementRegistry = ShimmedCustomElementsRegistry;

  // The browser only knows the stand-in class, whose observed attributes can't
  // vary by registry, so `attributeChangedCallback` is approximated by
  // patching `setAttribute`, `removeAttribute` and `toggleAttribute` once,
  // calling the callback of the element's own definition.
  const observingDefinition = (element: Element, name: string) => {
    const definition = definitionForElement.get(element as HTMLElement);
    return definition?.attributeChangedCallback &&
      definition.observedAttributes.has(String(name).toLowerCase())
      ? definition
      : undefined;
  };
  const patchAttributeMethod = (
    method: 'setAttribute' | 'removeAttribute' | 'toggleAttribute'
  ) => {
    const prototype = (Element.prototype as unknown) as Record<
      typeof method,
      (this: Element, name: string, ...args: Array<unknown>) => unknown
    >;
    const native = prototype[method];
    prototype[method] = function (
      this: Element,
      name: string,
      ...args: Array<unknown>
    ) {
      const definition = observingDefinition(this, name);
      if (definition === undefined) {
        return native.call(this, name, ...args);
      }
      const oldValue = this.getAttribute(name);
      const result = native.call(this, name, ...args);
      const newValue = this.getAttribute(name);
      // Note, as natively, setting always calls back, while removing or
      // toggling calls back only if the attribute changed.
      if (method === 'setAttribute' || oldValue !== newValue) {
        invokeCallback(
          definition.attributeChangedCallback,
          this as HTMLElement,
          String(name).toLowerCase(),
          oldValue,
          newValue,
          null
        );
      }
      return result;
    };
  };
  patchAttributeMethod('setAttribute');
  patchAttributeMethod('removeAttribute');
  patchAttributeMethod('toggleAttribute');

  // Note, as natively, each entry point has its own queue, customized in
  // creation order when that entry point returns; queues of enclosing entry
  // points are left alone. So an element whose constructor calls an entry point
  // (e.g. `attachShadow`) finishes before elements queued with it are
  // customized, while elements created by that inner call are customized
  // before it returns. The bottom queue holds elements the main parser creates
  // (customized once inserted, see `observeParsing`) and ones constructed
  // outside any entry point (customized in a microtask).
  const isParsing = () => document.readyState === 'loading';
  // Note, entry points' queues are shared, since an entry point in one window
  // can make another window's browser construct stand-ins (see
  // `defineStandInEverywhere`). The parser's queue is this window's.
  const entryQueues = shared(
    'entryQueues',
    () => [] as Array<Set<HTMLElement>>
  );
  const parserQueue = new Set<HTMLElement>();
  const flushingQueues = shared(
    'flushingQueues',
    () => new WeakSet<Set<HTMLElement>>()
  );
  const currentQueue = () => entryQueues[entryQueues.length - 1] ?? parserQueue;
  const shouldDeferUpgrade = () =>
    !flushingQueues.has(currentQueue()) &&
    (isParsing() || entryQueues.length > 0);
  const isUpgradeQueued = (element: HTMLElement) =>
    parserQueue.has(element) || entryQueues.some((queue) => queue.has(element));
  // Elements the browser constructed as stand-ins. Only these are customized
  // (besides elements constructed with `new`, see `HTMLElement` above):
  // customizing any other element would be undone when the browser later
  // constructs it, which resets its prototype.
  const standInElements = shared(
    'standInElements',
    () => new WeakSet<HTMLElement>()
  );

  // Elements which failed to upgrade, so are never customized again. Their
  // definition is removed (see `customize`), so they get no reactions.
  const failedElements = shared(
    'failedElements',
    () => new WeakSet<HTMLElement>()
  );
  // Elements constructed directly, as natively by `createElement` and the main
  // parser for an element whose definition already exists. Customizing any
  // other element (made by fragment parsing or cloning, or before its
  // definition) is an upgrade (see `current.construction`).
  const constructedDirectly = shared(
    'constructedDirectly',
    () => new WeakSet<HTMLElement>()
  );
  const constructDirectly = <T>(construct: () => T): T => {
    current.directConstructions++;
    try {
      return construct();
    } finally {
      current.directConstructions--;
    }
  };

  // The definition of an element customized with a form-associated class. As
  // natively, only such an element gets form callbacks and is a form control.
  const getFormAssociatedDefinition = (element: Element) => {
    const definition = definitionForElement.get(element as HTMLElement);
    return definition?.['formAssociated'] ? definition : undefined;
  };

  // Stand-ins that may be left out of their form's collections (see
  // `isFormControl`): those of a form-associated tag, until customized with a
  // form-associated class. Note, while there are none, collections are read
  // without filtering. One that's garbage collected first is never removed,
  // which only loses that shortcut.
  const excludableFormElements = shared(
    'excludableFormElements',
    () => new WeakSet<HTMLElement>()
  );
  const addExcludableFormElement = (element: HTMLElement) => {
    excludableFormElements.add(element);
    current.excludableFormElementCount++;
  };

  // Note, as natively, an error from a constructor or callback is reported
  // rather than thrown, so the remaining reactions still run. Only a failed
  // constructor marks the element (see `customize`).
  const reportReactionError = (error: unknown) => {
    if (typeof reportError === 'function') {
      reportError(error);
    } else {
      setTimeout(() => {
        throw error;
      });
    }
  };
  const invokeCallback = (
    callback: Function | undefined,
    element: HTMLElement,
    ...args: Array<unknown>
  ) => {
    try {
      callback?.apply(element, args);
    } catch (error) {
      reportReactionError(error);
    }
  };

  // Note, elements added to the queue while it's flushing (e.g. constructed by
  // an unpatched API in a user's constructor) are customized in this flush.
  const flushUpgrades = (queue: Set<HTMLElement>) => {
    if (queue.size === 0) {
      return;
    }
    flushingQueues.add(queue);
    try {
      queue.forEach((instance) => {
        queue.delete(instance);
        try {
          getRegistry(instance)?._upgradeOrWait(instance);
        } catch (e) {
          reportReactionError(e);
        }
      });
    } finally {
      flushingQueues.delete(queue);
    }
  };

  // Note, every native API which constructs custom elements, and which the
  // polyfill patches, is an entry point that flushes before returning. An
  // element constructed any other way (e.g. `execCommand('insertHTML')`) is
  // flushed in a microtask, so it upgrades later than natively.
  let flushScheduled = false;
  const scheduleFlush = () => {
    if (flushScheduled) {
      return;
    }
    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;
      if (!isParsing()) {
        flushUpgrades(parserQueue);
      }
    });
  };

  // An entry point: runs `fn` with its own queue, then flushes it. Note,
  // elements constructed outside any entry point (e.g. by an API the polyfill
  // doesn't patch) wait for a microtask to be customized. An entry point
  // customizes them first, so it sees them as natively it would (e.g. a
  // `define` upgrading them).
  const withDeferredUpgrades = <T>(fn: () => T): T => {
    if (!isParsing() && parserQueue.size && !flushingQueues.has(parserQueue)) {
      flushUpgrades(parserQueue);
    }
    const queue = new Set<HTMLElement>();
    entryQueues.push(queue);
    try {
      return fn();
    } finally {
      flushUpgrades(queue);
      entryQueues.pop();
    }
  };

  // While the main document is parsing, the elements the parser constructs
  // are customized once inserted, when their registry can be worked out from
  // where they are. Note, the parser constructs an element before setting its
  // attributes and inserting it, and microtasks run straight after the
  // constructor, so a microtask is too early. A mutation observer's callback
  // runs only after an insertion, and, since the browser runs microtasks
  // before each script the parser runs, before any script that follows.
  // Elements not yet inserted wait for a later callback, and any left are
  // customized when the document becomes interactive.
  const observeParsing = () => {
    const parsed = parserQueue;
    const observer = new MutationObserver(() => {
      const inserted = new Set(
        Array.from(parsed).filter((element) => element.parentNode !== null)
      );
      inserted.forEach((element) => parsed.delete(element));
      // Note, so customizing isn't deferred back to the bottom queue.
      flushingQueues.add(parsed);
      try {
        flushUpgrades(inserted);
      } finally {
        flushingQueues.delete(parsed);
      }
    });
    observer.observe(document, {childList: true, subtree: true});
    document.addEventListener(
      'readystatechange',
      () => {
        observer.disconnect();
        recordRegistries(document);
        flushUpgrades(parsed);
      },
      {once: true}
    );
  };
  if (isParsing()) {
    observeParsing();
  }

  // Sets the registry for a subtree, replacing any registry already set.
  const setRegistryForSubtree = (
    node: Node,
    registry: ShimmedCustomElementsRegistry | null
  ) => forEachInTree(node, (n) => registryForNode.set(n, registry));

  // As natively on upgrade, calls back for each observed attribute the element
  // has, in attribute order (the stand-in observes none, see
  // `patchAttributeMethod`).
  const invokeInitialAttributeCallbacks = (
    instance: CustomHTMLElement & HTMLElement,
    definition: CustomElementDefinition
  ) => {
    for (const attr of Array.from(instance.attributes)) {
      if (definition.observedAttributes.has(attr.localName)) {
        invokeCallback(
          definition.attributeChangedCallback,
          instance,
          attr.localName,
          null,
          attr.value,
          attr.namespaceURI
        );
      }
    }
  };

  // Makes a class that extends the native HTMLElement (e.g. one defined before
  // the polyfill loaded) extend the polyfill's instead.
  const patchHTMLElement = (elementClass: CustomElementConstructor) => {
    for (
      let ctor: unknown = elementClass;
      ctor;
      ctor = Object.getPrototypeOf(ctor)
    ) {
      const parent = Object.getPrototypeOf(ctor);
      if (parent === window.HTMLElement) {
        return;
      }
      if (parent === NativeHTMLElement) {
        Object.setPrototypeOf(ctor, window.HTMLElement);
        return;
      }
    }
  };

  // Helper to upgrade an instance with a CE definition using "constructor call trick"
  const customize = (
    instance: HTMLElement,
    definition: CustomElementDefinition
  ) => {
    // Note, as natively, an element is customized at most once, and never
    // after its upgrade failed.
    if (definitionForElement.has(instance) || failedElements.has(instance)) {
      return;
    }
    // Note, an element the browser hasn't constructed is left to it; it's
    // customized once constructed (see `standInElements`).
    if (!standInElements.has(instance)) {
      return;
    }
    // Note, inside an entry point or while parsing, the element is queued.
    if (shouldDeferUpgrade()) {
      currentQueue().add(instance);
      return;
    }
    definitionForElement.set(instance, definition);
    const {elementClass} = definition;
    const previous = current.construction;
    current.construction = {
      instance,
      elementClass,
      isUpgrade: !constructedDirectly.has(instance),
    };
    try {
      // Note, as natively, an element with a shadow root can't upgrade to a
      // class that disables them.
      if (
        definition.disableShadow &&
        (getShadowRoot(instance) ?? getShadowRootFromInternals(instance))
      ) {
        throw new DOMException(
          `Failed to upgrade '${definition.tagName}': it has a shadow root, which its class disables`,
          'NotSupportedError'
        );
      }
      // Note, as natively, the constructor must return the element.
      if (new elementClass() !== instance) {
        throw new TypeError(
          `The constructor of '${definition.tagName}' didn't return the element being upgraded`
        );
      }
    } catch (e) {
      // Note, as natively, an element whose constructor throws has no
      // definition, so gets no further reactions, and is never customized
      // again.
      definitionForElement.delete(instance);
      failedElements.add(instance);
      throw e;
    } finally {
      current.construction = previous;
    }
    statesOf(internalsForElement.get(instance))?.delete(UNDEFINED_STATE);
    if (
      definition['formAssociated'] &&
      excludableFormElements.delete(instance)
    ) {
      current.excludableFormElementCount--;
    }
    if (definition.attributeChangedCallback) {
      invokeInitialAttributeCallbacks(instance, definition);
    }
    // Note, the stand-in's own connected callback ran before it was
    // customized, so the user's runs now.
    if (instance.isConnected) {
      invokeCallback(definition.connectedCallback, instance);
    }
    // Note, as natively on upgrade, a form-associated element is told its
    // form and whether it's disabled. The stand-in's own form callbacks ran
    // before it was customized (see `getFormAssociatedDefinition`).
    if (definition['formAssociated'] && definition.standInFormAssociated) {
      const internals = internalsForElement.get(instance);
      const form = internals && nativeInternalsFormGetter?.call(internals);
      if (form) {
        invokeCallback(definition['formAssociatedCallback'], instance, form);
      }
      if (instance.matches(':disabled')) {
        invokeCallback(definition['formDisabledCallback'], instance, true);
      }
    }
  };

  // https://dom.spec.whatwg.org/#dom-element-attachshadow etc.: a non-scoped
  // registry must be the document's registry.
  const validateRegistry = (
    registry: CustomElementRegistry | null | undefined,
    doc: Document,
    method: string
  ) => {
    // Note, as WebIDL converts the argument.
    if (registry != null && !isPolyfillRegistry(registry)) {
      throw new TypeError(
        `Failed to execute '${method}': customElementRegistry is not a CustomElementRegistry`
      );
    }
    if (
      registry &&
      !(registry as ShimmedCustomElementsRegistry)._isScoped &&
      registry !== getRegistry(doc)
    ) {
      throw new DOMException(
        `Failed to execute '${method}': a global registry must be the document's registry`,
        'NotSupportedError'
      );
    }
  };

  // Shadow roots the polyfill knows, including closed ones.
  const shadowRootForHost = shared(
    'shadowRootForHost',
    () => new WeakMap<Element, ShadowRoot>()
  );

  // The shadow root exposed to a host's internals, without recording its
  // registry.
  const internalsShadowRootDescriptor = window['ElementInternals']
    ? Object.getOwnPropertyDescriptor(
        window['ElementInternals'].prototype,
        'shadowRoot'
      )
    : undefined;
  const getShadowRootFromInternals = (host: Element) => {
    const internals = internalsForElement.get(host as HTMLElement);
    return internals
      ? (internalsShadowRootDescriptor?.get?.call(internals) as
          | ShadowRoot
          | null
          | undefined) ?? null
      : null;
  };
  const getShadowRoot = (node: Node) =>
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element).shadowRoot ?? shadowRootForHost.get(node as Element)
      : undefined;

  // Records the root's registry.
  const nativeAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (
    init: ShadowRootInitWithSettableCustomElements,
    ...args: Array<unknown>
  ) {
    // Note, the registry is removed from the init object so it isn't passed to
    // the native implementation. `registry` and `customElements` are earlier
    // names, still supported for back compat; the standard name wins. Use
    // string keys to avoid renaming in Closure.
    const {
      'customElementRegistry': customElementRegistry,
      'registry': legacyRegistry,
      'customElements': legacyCustomElements,
      ...nativeInit
    } = init;
    const registry =
      customElementRegistry !== undefined
        ? customElementRegistry
        : legacyRegistry !== undefined
        ? legacyRegistry
        : legacyCustomElements;
    validateRegistry(registry, this.ownerDocument, 'attachShadow');
    // Note, the browser only knows the stand-in class, so the user's
    // `disabledFeatures` is checked here.
    if (definitionForElement.get(this as HTMLElement)?.disableShadow) {
      throw new DOMException(
        `Failed to execute 'attachShadow' on 'Element': the element's class disables shadow roots.`,
        'NotSupportedError'
      );
    }
    (registry as ShimmedCustomElementsRegistry | undefined)?._associate?.(
      this.ownerDocument
    );
    const shadowRoot = nativeAttachShadow.call(
      this,
      nativeInit,
      ...(args as [])
    ) as ShadowRootWithSettableCustomElementRegistry;
    // Note, for a host with the polyfill's declarative attribute, native
    // returns its existing declarative root, emptied.
    if (this.hasAttribute(DSD_HOST_ATTRIBUTE)) {
      getRegistry(shadowRoot);
      return shadowRoot;
    }
    shadowRootForHost.set(this, shadowRoot);
    // Note, as native does, the root uses the document's registry by
    // default. Recording it marks the root as attached by the polyfill (see
    // `getRegistry`).
    registryForNode.set(
      shadowRoot,
      registry !== undefined
        ? (registry as ShimmedCustomElementsRegistry | null)
        : getRegistry(this.ownerDocument)
    );
    if (registry !== undefined) {
      // Note, for back compat, `registry` and `customElements` are set too.
      shadowRoot['registry'] = registry;
      shadowRoot['customElements'] = registry;
    }
    return shadowRoot;
  };

  // The global registry of a document's window: this window's for its
  // document, otherwise null (a document without a window, or another
  // window's, whose registries this copy of the polyfill doesn't know).
  // Note, native registry state is deliberately not consulted, so the
  // polyfill behaves the same whether or not the browser has support.
  const getWindowRegistry = (doc: Document) => {
    // Note, `window.customElements` is writable, so this window's isn't read.
    if (doc === document) {
      return globalCustomElementRegistry;
    }
    const registry = doc.defaultView?.customElements;
    return isPolyfillRegistry(registry) ? registry : null;
  };

  // The registry of a node.
  //
  // Every API the polyfill patches records the registry of each node it
  // creates, when it creates it. So a node without a record was made by a
  // parser (the main parser, or a parsing API before its wrapper records the
  // new nodes), and its registry follows the parser's rules, worked out from
  // where it is (see `getParsedRegistry`). It's then recorded, so later
  // moves or attribute changes don't change it.
  const getRegistry = (node: Node): ShimmedCustomElementsRegistry | null => {
    const recorded = registryForNode.get(node);
    if (recorded !== undefined) {
      return recorded;
    }
    if (node.nodeType === Node.DOCUMENT_NODE) {
      return getWindowRegistry(node as Document);
    }
    const parent = node.parentNode;
    const isRoot = isShadowRoot(node);
    // Note, a parsed node is constructed before it's inserted, so one without
    // a parent isn't recorded yet. One in a plain fragment (e.g. template
    // contents) gets its window's registry, which for template contents is
    // null.
    if (
      !isRoot &&
      (parent === null ||
        (parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
          !isShadowRoot(parent)))
    ) {
      return getWindowRegistry(node.ownerDocument!);
    }
    const registry = isRoot
      ? getShadowRootRegistry(node as ShadowRoot)
      : getParsedRegistry(node, parent!);
    registryForNode.set(node, registry);
    return registry;
  };

  // The parser's rules for a node: null if it's an element with a null
  // registry attribute, else its parent's registry.
  // Note, the attribute only matters while parsing; it's checked here since
  // a node without a record was made by a parser (see `getRegistry`).
  const getParsedRegistry = (node: Node, parent: Node) =>
    (node as Element).matches?.(NULL_REGISTRY_SELECTOR)
      ? null
      : getRegistry(parent);

  // A shadow root without a record is either declarative (the parser
  // attached it) or a cloned closed root the polyfill couldn't reach when
  // cloning (see `pairUnreachableCopyRoots`):
  // - a cloned root: the registry kept for it;
  // - a declarative root whose host has the polyfill's attribute: null;
  // - another declarative root: its document's registry.
  const getShadowRootRegistry = (root: ShadowRoot) => {
    const {host} = root;
    shadowRootForHost.set(host, root);
    if (clonedShadowRootRegistries.has(host)) {
      return clonedShadowRootRegistries.get(host)!;
    }
    return host.hasAttribute(DSD_HOST_ATTRIBUTE)
      ? null
      : getRegistry(host.ownerDocument);
  };

  // Records the registries of `node` and every element under it, including in
  // shadow roots (see `getRegistry`), so that moving them later doesn't
  // change them.
  const recordRegistries = (node: Node) =>
    forEachInTree(node, getRegistry, true);

  const customElementRegistryDescriptor = {
    get(this: Node) {
      return getRegistry(this);
    },
    enumerable: true,
    configurable: true,
  };

  const {importNode, adoptNode} = Document.prototype;
  const createElement = Document.prototype.createElement as (
    this: Document,
    tagName: string,
    options?: ElementCreationOptions
  ) => Element;

  // https://dom.spec.whatwg.org/#flatten-element-creation-options
  // Returns the registry to use and the options to pass to the native method.
  const flattenElementCreationOptions = (
    doc: Document,
    options: string | ElementCreationOptions | undefined,
    method: string
  ): [
    CustomElementRegistry | null,
    string | ElementCreationOptions | undefined
  ] => {
    if (typeof options !== 'object' || options === null) {
      return [getRegistry(doc), options];
    }
    const {
      'customElementRegistry': optionsRegistry,
      ...nativeOptions
    } = options;
    if (optionsRegistry === undefined) {
      return [getRegistry(doc), nativeOptions];
    }
    if (nativeOptions['is'] !== undefined) {
      throw new DOMException(
        `Failed to execute '${method}' on 'Document': 'is' and 'customElementRegistry' cannot both be specified`,
        'NotSupportedError'
      );
    }
    validateRegistry(optionsRegistry, doc, method);
    (optionsRegistry as ShimmedCustomElementsRegistry | null)?._associate(doc);
    return [optionsRegistry, nativeOptions];
  };

  // Creates an element with the registry from `options`, constructing it
  // directly (see `constructedDirectly`).
  const createElementWithRegistry = (
    doc: Document,
    options: string | ElementCreationOptions | undefined,
    method: string,
    create: (options: ElementCreationOptions | undefined) => Element
  ) => {
    const [registry, nativeOptions] = flattenElementCreationOptions(
      doc,
      options,
      method
    );
    return withDeferredUpgrades(() => {
      const element = constructDirectly(() =>
        create(nativeOptions as ElementCreationOptions | undefined)
      );
      registryForNode.set(element, registry as ShimmedCustomElementsRegistry);
      return element;
    });
  };

  Object.defineProperty(
    Element.prototype,
    'customElementRegistry',
    customElementRegistryDescriptor
  );
  Object.defineProperties(Document.prototype, {
    'customElementRegistry': customElementRegistryDescriptor,
    // https://dom.spec.whatwg.org/#dom-document-createelement
    'createElement': {
      value(
        this: Document,
        tagName: string,
        options?: string | ElementCreationOptions
      ) {
        return createElementWithRegistry(this, options, 'createElement', (o) =>
          createElement.call(this, tagName, o)
        );
      },
      enumerable: true,
      configurable: true,
    },
    'createElementNS': {
      value(
        this: Document,
        namespace: string | null,
        tagName: string,
        options?: string | ElementCreationOptions
      ) {
        return createElementWithRegistry(
          this,
          options,
          'createElementNS',
          (o) => nativeCreateElementNS.call(this, namespace, tagName, o)
        );
      },
      enumerable: true,
      configurable: true,
    },
    // https://dom.spec.whatwg.org/#dom-document-importnode
    'importNode': {
      value<T extends Node>(
        this: Document,
        node: T,
        options?: boolean | ImportNodeOptions
      ): T {
        // Note, as WebIDL converts `(boolean or ImportNodeOptions)`: omitted
        // is a shallow copy, null or an object is a dictionary (deep unless
        // `selfOnly`), and anything else is a boolean.
        const isDictionary =
          options === null ||
          typeof options === 'object' ||
          typeof options === 'function';
        const dictionary = (isDictionary
          ? options ?? {}
          : {}) as ImportNodeOptions;
        const deep = isDictionary ? !dictionary['selfOnly'] : Boolean(options);
        const optionsRegistry = dictionary['customElementRegistry'];
        // Note, as natively, the option isn't nullable.
        if (optionsRegistry === null) {
          throw new TypeError(
            "Failed to execute 'importNode' on 'Document': customElementRegistry can't be null"
          );
        }
        validateRegistry(optionsRegistry, this, 'importNode');
        // Note, the provided registry is used only as a fallback to set when
        // the imported node's registry is null.
        const fallbackRegistry = optionsRegistry ?? getRegistry(this);
        return withDeferredUpgrades(() =>
          cloneWithRegistries(
            node,
            deep,
            (n, nodeDeep) => importNode.call(this, n, nodeDeep),
            fallbackRegistry
          )
        ) as T;
      },
      enumerable: true,
      configurable: true,
    },
    'adoptNode': {
      value<T extends Node>(this: Document, node: T): T {
        // Note, no upgrade here: as native does, adopted elements upgrade
        // when they are connected.
        recordRegistriesBeforeMove([node]);
        return withAdoption(
          this,
          [node],
          () => adoptNode.call(this, node) as T
        );
      },
      enumerable: true,
      configurable: true,
    },
  });
  Object.defineProperty(
    ShadowRoot.prototype,
    'customElementRegistry',
    customElementRegistryDescriptor
  );

  // Adopting a node into another document updates registries as natively
  // (https://dom.spec.whatwg.org/#concept-node-adopt), in shadow-including
  // tree order. Scoped registries are kept. A shadow root's null or global
  // registry becomes the document's effective global registry, except a
  // declarative root with the null registry attribute stays null. An
  // element's null or global registry becomes the effective global registry
  // of the document's registry if it was global, or it's the adopted node
  // (whose parent is removed first) or in a document fragment; otherwise of
  // its parent's.
  const effectiveGlobal = (registry: ShimmedCustomElementsRegistry | null) =>
    registry?._isScoped ? null : registry;
  // Each change is noted in `previous`, so it can be undone.
  const adoptRegistries = (
    node: Node,
    documentRegistry: ShimmedCustomElementsRegistry | null,
    previous: Array<[Node, ShimmedCustomElementsRegistry | null | undefined]>,
    isAdoptedNode = true
  ) => {
    const current = getRegistry(node);
    if (current === null || !current._isScoped) {
      let registry: ShimmedCustomElementsRegistry | null | undefined;
      if (isShadowRoot(node)) {
        const keepsNull =
          current === null && node.host.hasAttribute(DSD_HOST_ATTRIBUTE);
        if (!keepsNull) {
          registry = effectiveGlobal(documentRegistry);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const parent = node.parentNode;
        const fromDocument =
          current !== null ||
          isAdoptedNode ||
          parent === null ||
          (parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
            !isShadowRoot(parent));
        registry = effectiveGlobal(
          fromDocument ? documentRegistry : getRegistry(parent)
        );
        // Note, the native move disconnects it after this, by which time its
        // registry has changed.
        current?._stopWaitingForDefinition(node as HTMLElement);
      }
      if (registry !== undefined) {
        previous.push([node, registryForNode.get(node)]);
        registryForNode.set(node, registry);
      }
    }
    const shadowRoot = getShadowRoot(node);
    if (shadowRoot) {
      adoptRegistries(shadowRoot, documentRegistry, previous, false);
    }
    for (const child of childrenOf(node)) {
      adoptRegistries(child, documentRegistry, previous, false);
    }
  };

  // Runs `fn`, which inserts or adopts `nodes` into `doc`, having first given
  // those from other documents their adopted registries (see
  // `adoptRegistries`). If `fn` throws, the registries are restored.
  // Note, as natively, adopted elements upgrade when connected: stand-ins
  // via their `connectedCallback`, others when the browser constructs them.
  const withAdoption = <T>(
    doc: Document,
    nodes: Array<unknown>,
    fn: () => T
  ): T => {
    const previous: Array<
      [Node, ShimmedCustomElementsRegistry | null | undefined]
    > = [];
    for (const node of nodes) {
      // Note, a document can't be adopted (native throws).
      if (
        typeof (node as Node | null)?.nodeType === 'number' &&
        (node as Node).nodeType !== Node.DOCUMENT_NODE &&
        (node as Node).ownerDocument !== doc
      ) {
        adoptRegistries(node as Node, getRegistry(doc), previous);
      }
    }
    try {
      return fn();
    } catch (e) {
      for (let i = previous.length - 1; i >= 0; i--) {
        const [node, registry] = previous[i];
        // Note, a native method can adopt and then throw, e.g. `append` of a
        // node from another document along with an invalid node.
        if (node.ownerDocument === doc) {
          continue;
        }
        if (registry === undefined) {
          registryForNode.delete(node);
        } else {
          registryForNode.set(node, registry);
        }
      }
      throw e;
    }
  };
  // A node without a record gets its registry from where it is (see
  // `getRegistry`), so before a node is moved or removed, its registry is
  // recorded. Recording the node is enough, since its descendants' registries
  // are worked out through it. Every patched API that moves or removes nodes
  // does this: the wrappers of the insertion methods, parsing methods and
  // setters, and `Range` methods as part of their work, and `recordBefore`
  // for methods that only move or remove.
  const recordRegistriesBeforeMove = (nodes: Iterable<unknown>) => {
    for (const node of nodes) {
      const type = (node as Node | null)?.nodeType;
      if (type === Node.ELEMENT_NODE) {
        // Note, `getRegistry` doesn't record a node without a parent (or in a
        // plain fragment), so it's recorded here.
        if (!registryForNode.has(node as Node)) {
          registryForNode.set(node as Node, getRegistry(node as Node));
        }
      } else if (type === Node.DOCUMENT_FRAGMENT_NODE) {
        recordRegistriesBeforeMove(childrenOf(node as Node));
      }
    }
  };
  // The elements a range intersects: those it moves, removes or copies.
  const elementsInRange = (range: Range) =>
    Array.from(
      (range.commonAncestorContainer as ParentNode).querySelectorAll?.('*') ??
        []
    ).filter((element) => range.intersectsNode(element));

  // Insertion methods are entry points, since inserting can construct
  // elements, and handle adoption, which changes null and global registries
  // and can't be observed directly. `removed` gives the nodes a method
  // removes other than its arguments.
  const installScopedMethod = (
    ctor: Function,
    method: string,
    removed?: (target: Node) => Iterable<Node>
  ) => {
    const native = ctor.prototype[method];
    if (native === undefined) {
      return;
    }
    ctor.prototype[method] = function (
      this: Element | ShadowRoot,
      ...args: Array<unknown>
    ) {
      return withDeferredUpgrades(() => {
        recordRegistriesBeforeMove(args);
        if (removed) {
          recordRegistriesBeforeMove(removed(this));
        }
        return withAdoption(
          (this.ownerDocument ?? this) as Document,
          args,
          () => native.apply(this, args)
        );
      });
    };
  };

  // Records the registries of the new nodes between `start` and `end` in
  // `parent`.
  const recordRegistriesBetween = (
    parent: Node,
    start: Node | null,
    end: Node | null
  ) => {
    for (
      let n = start ? start.nextSibling : parent.firstChild;
      n && n !== end;
      n = n.nextSibling
    ) {
      recordRegistries(n);
    }
  };

  // Runs `parse`, which replaces `target`'s children with parsed ones,
  // recording the registries of the old children before and the new after.
  const replaceChildrenByParsing = (target: Node, parse: () => void) =>
    withDeferredUpgrades(() => {
      recordRegistriesBeforeMove(childrenOf(target));
      parse();
      childrenOf(target).forEach(recordRegistries);
    });
  // Parsing methods that replace the children, e.g. `setHTMLUnsafe`.
  const installScopedParsingMethod = (ctor: Function, method: string) => {
    const native = ctor.prototype[method];
    if (native === undefined) {
      return;
    }
    ctor.prototype[method] = function (this: Node, ...args: Array<unknown>) {
      replaceChildrenByParsing(this, () => native.apply(this, args));
    };
  };

  // Note, the parsing context is the parent for `beforebegin` and `afterend`,
  // and only the inserted nodes are new.
  const nativeInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (
    this: Element,
    position: InsertPosition,
    html: string
  ) {
    const where = String(position).toLowerCase();
    const isOutside = where === 'beforebegin' || where === 'afterend';
    const parent = (isOutside ? this.parentNode : this) ?? this;
    const start =
      where === 'beforebegin'
        ? this.previousSibling
        : where === 'beforeend'
        ? this.lastChild
        : where === 'afterend'
        ? this
        : null;
    const end =
      where === 'beforebegin'
        ? this
        : where === 'afterbegin'
        ? this.firstChild
        : where === 'afterend'
        ? this.nextSibling
        : null;
    withDeferredUpgrades(() => {
      nativeInsertAdjacentHTML.call(this, position, html);
      recordRegistriesBetween(parent, start, end);
    });
  };
  for (const ctor of [Element, ShadowRoot]) {
    installScopedParsingMethod(ctor, 'setHTMLUnsafe');
    installScopedParsingMethod(ctor, 'setHTML');
  }

  // Clones a tree, preserving each node's registry.
  //
  // Note, the clone is made natively, including clonable shadow roots, and
  // nothing is customized until the flush. Source and copy are then paired by
  // index (light DOM, document order): each copy gets its source's registry.
  // Copied shadow roots are paired the same way (see `pairClonedElement` and
  // `pairUnreachableCopyRoots`). So are a template's contents, which a deep
  // clone copies too. Pairing happens before the flush, so no user code has
  // changed a source yet.
  // https://dom.spec.whatwg.org/#concept-node-clone
  const elementsOf = (node: Node, deep: boolean) => {
    const elements: Array<Element> =
      node.nodeType === Node.ELEMENT_NODE ? [node as Element] : [];
    if (deep) {
      elements.push(
        ...Array.from((node as Element).querySelectorAll?.('*') ?? [])
      );
    }
    return elements;
  };

  // Note, as natively, a global registry becomes the copy's document's
  // effective global registry: its registry if that's global, otherwise null
  // (e.g. a document with a scoped registry, or template contents).
  const getCloneRegistry = (
    registry: CustomElementRegistry | null,
    copy: Node,
    fallbackRegistry?: CustomElementRegistry | null
  ) => {
    if (registry === null && fallbackRegistry !== undefined) {
      registry = fallbackRegistry;
    }
    if (registry && !(registry as ShimmedCustomElementsRegistry)._isScoped) {
      const documentRegistry = getRegistry(copy.ownerDocument!);
      return documentRegistry?._isScoped ? null : documentRegistry;
    }
    return registry as ShimmedCustomElementsRegistry | null;
  };

  const pairClonedElement = (
    sourceElement: Element,
    copyElement: Element,
    fallbackRegistry?: CustomElementRegistry | null
  ) => {
    registryForNode.set(
      copyElement,
      getCloneRegistry(
        getRegistry(sourceElement),
        copyElement,
        fallbackRegistry
      )
    );
    // Note, as natively, the fallback registry doesn't apply to a template's
    // contents. A shallow clone doesn't copy them, so there's nothing to pair.
    if (isTemplate(sourceElement)) {
      const sources = elementsOf(sourceElement.content, true);
      const copies = elementsOf(
        (copyElement as HTMLTemplateElement).content,
        true
      );
      if (sources.length === copies.length) {
        sources.forEach((source, i) => pairClonedElement(source, copies[i]));
      }
    }
    const sourceRoot = getShadowRoot(sourceElement);
    // Note, a root that isn't clonable isn't copied.
    if (
      !sourceRoot ||
      (sourceRoot as {['clonable']?: boolean})['clonable'] === false
    ) {
      return;
    }
    // Note, a closed copy root is reached via the copy host's internals, or
    // else see `pairUnreachableCopyRoots`.
    const copyRoot =
      copyElement.shadowRoot ?? getShadowRootFromInternals(copyElement);
    if (copyRoot) {
      shadowRootForHost.set(copyElement, copyRoot);
      pairClonedShadowRoot(sourceRoot, copyRoot);
    } else {
      unreachableCopyRoots.set(copyElement, sourceRoot);
    }
  };

  // Note, the fallback registry of `importNode` doesn't apply inside shadow
  // roots. If the counts differ (e.g. a customized built-in's constructor
  // changed the source during the native clone), the copy can't be paired by
  // index, so it gets the source root's registry throughout.
  const pairClonedShadowRoot = (
    sourceRoot: ShadowRoot,
    copyRoot: ShadowRoot
  ) => {
    const registry = getCloneRegistry(getRegistry(sourceRoot), copyRoot);
    const sources = elementsOf(sourceRoot, true);
    const copies = elementsOf(copyRoot, true);
    if (sources.length !== copies.length) {
      setRegistryForSubtree(copyRoot, registry);
      return;
    }
    registryForNode.set(copyRoot, registry);
    sources.forEach((source, i) => pairClonedElement(source, copies[i]));
  };

  // A closed copy root can't be reached when its host has no internals: it
  // wasn't a defined custom element when the root was attached (e.g. a `div`,
  // or an undefined custom element). Its host is noted with its source root
  // (`unreachableCopyRoots`) while the clone is paired. Then, before the
  // flush runs any user code, the root is reached through any element inside
  // it that the clone constructed, which is queued, and is paired exactly.
  // Otherwise only the root's registry is kept (`clonedShadowRootRegistries`,
  // see `getRegistry`). Known limitation (see README): an element inside such
  // a copy that's only defined later gets the root's registry (or, in a root
  // nested inside it, which can't be reached either, the document's), even if
  // its original used a different one.
  const unreachableCopyRoots = new Map<Element, ShadowRoot>();
  const clonedShadowRootRegistries = shared(
    'clonedShadowRootRegistries',
    () => new WeakMap<Element, ShimmedCustomElementsRegistry | null>()
  );
  const pairUnreachableCopyRoots = () => {
    // Note, pairing a root can note roots nested in it, so this repeats.
    let paired = true;
    while (paired && unreachableCopyRoots.size > 0) {
      paired = false;
      for (const element of currentQueue()) {
        // Note, a root nested in a noted root is only noted once that one is
        // paired, so the element's root may be reached through its host's.
        let root = element.getRootNode();
        while (isShadowRoot(root) && !unreachableCopyRoots.has(root.host)) {
          root = root.host.getRootNode();
        }
        const source = isShadowRoot(root)
          ? unreachableCopyRoots.get(root.host)
          : undefined;
        if (source) {
          unreachableCopyRoots.delete((root as ShadowRoot).host);
          shadowRootForHost.set((root as ShadowRoot).host, root as ShadowRoot);
          pairClonedShadowRoot(source, root as ShadowRoot);
          paired = true;
        }
      }
    }
    for (const [host, source] of unreachableCopyRoots) {
      clonedShadowRootRegistries.set(
        host,
        getCloneRegistry(getRegistry(source), host)
      );
    }
    unreachableCopyRoots.clear();
  };

  const cloneWithRegistries = (
    node: Node,
    deep: boolean,
    nativeClone: (node: Node, deep: boolean) => Node,
    fallbackRegistry?: CustomElementRegistry | null
  ): Node => {
    const clone = nativeClone(node, deep);
    // Note, as natively, a cloned document keeps a scoped registry (and its
    // copied elements with a global registry get null, see
    // `getCloneRegistry`).
    if (node.nodeType === Node.DOCUMENT_NODE) {
      const registry = getRegistry(node);
      if (registry?._isScoped) {
        registryForNode.set(clone, registry);
      }
    }
    const sources = elementsOf(node, deep);
    const copies = elementsOf(clone, deep);
    if (sources.length === copies.length) {
      sources.forEach((source, i) =>
        pairClonedElement(source, copies[i], fallbackRegistry)
      );
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Note, the copy can't be paired by index (e.g. a customized built-in's
      // constructor changed the source during the native clone), so it gets
      // the source's registry throughout. A copied fragment or document is
      // left unrecorded, so its elements get their registries from where
      // they are (see `getRegistry`).
      setRegistryForSubtree(
        clone,
        getCloneRegistry(getRegistry(node), clone, fallbackRegistry)
      );
    }
    pairUnreachableCopyRoots();
    return clone;
  };

  // Note, `cloneContents` copies the elements a range intersects, and
  // `extractContents` copies those it partially selects and moves the rest.
  // Either way, the copies are the fragment's elements that aren't
  // originals, and their sources are the intersected elements still in
  // place: both in document order, so they pair by index.
  const installRangeCopy = (method: 'cloneContents' | 'extractContents') => {
    const native = Range.prototype[method];
    Range.prototype[method] = function (this: Range) {
      return withDeferredUpgrades(() => {
        const intersected = elementsInRange(this);
        recordRegistriesBeforeMove(intersected);
        const fragment = native.call(this);
        const originals = new Set(intersected);
        const sources = intersected.filter(
          (element) => !fragment.contains(element)
        );
        const copies = Array.from(fragment.querySelectorAll('*')).filter(
          (element) => !originals.has(element)
        );
        if (sources.length === copies.length) {
          sources.forEach((source, i) => pairClonedElement(source, copies[i]));
        }
        pairUnreachableCopyRoots();
        return fragment;
      });
    };
  };
  installRangeCopy('cloneContents');
  installRangeCopy('extractContents');

  // Note, these Range methods insert or parse, which can construct elements,
  // and move nodes.
  const nativeInsertNode = Range.prototype.insertNode;
  Range.prototype.insertNode = function (this: Range, node: Node) {
    const container = this.startContainer;
    return withDeferredUpgrades(() => {
      recordRegistriesBeforeMove([node]);
      withAdoption(
        (container.ownerDocument ?? container) as Document,
        [node],
        () => nativeInsertNode.call(this, node)
      );
    });
  };
  const nativeSurroundContents = Range.prototype.surroundContents;
  Range.prototype.surroundContents = function (this: Range, newParent: Node) {
    const container = this.startContainer;
    return withDeferredUpgrades(() => {
      // Note, the range's contents replace `newParent`'s children.
      recordRegistriesBeforeMove([newParent, ...childrenOf(newParent)]);
      recordRegistriesBeforeMove(elementsInRange(this));
      withAdoption(
        (container.ownerDocument ?? container) as Document,
        [newParent],
        () => nativeSurroundContents.call(this, newParent)
      );
    });
  };
  // Note, the new nodes are parsed in the context of the range's start, so
  // they get its registry.
  const nativeCreateContextualFragment =
    Range.prototype.createContextualFragment;
  Range.prototype.createContextualFragment = function (
    this: Range,
    html: string
  ) {
    const start = this.startContainer;
    const context = (start.nodeType === Node.ELEMENT_NODE
      ? start
      : start.parentElement) as Element | null;
    // Note, as natively, elements parsed in a template's context go into its
    // contents, which have a null registry.
    const registry = isTemplate(context)
      ? null
      : getRegistry(context ?? start.ownerDocument ?? (start as Document));
    return withDeferredUpgrades(() => {
      const fragment = nativeCreateContextualFragment.call(this, html);
      // Note, the fragment's elements get the context's registry.
      Array.from(fragment.children).forEach((element) => {
        registryForNode.set(
          element,
          element.matches(NULL_REGISTRY_SELECTOR) ? null : registry
        );
        recordRegistries(element);
      });
      return fragment;
    });
  };

  const nativeCloneNode = Node.prototype.cloneNode;
  Node.prototype['cloneNode'] = function (this: Node, deep?: boolean) {
    return withDeferredUpgrades(() =>
      cloneWithRegistries(this, !!deep, (node, nodeDeep) =>
        nativeCloneNode.call(node, nodeDeep)
      )
    );
  };

  installScopedMethod(Node, 'appendChild');
  installScopedMethod(Node, 'insertBefore');
  installScopedMethod(Node, 'replaceChild');
  installScopedMethod(Element, 'append');
  installScopedMethod(Element, 'prepend');
  installScopedMethod(Element, 'replaceChildren', childrenOf);
  installScopedMethod(Element, 'insertAdjacentElement');
  installScopedMethod(Element, 'replaceWith', (element) => [element]);
  installScopedMethod(Element, 'before');
  installScopedMethod(Element, 'after');
  installScopedMethod(DocumentFragment, 'append');
  installScopedMethod(DocumentFragment, 'prepend');
  installScopedMethod(DocumentFragment, 'replaceChildren', childrenOf);
  installScopedMethod(Document, 'append');
  installScopedMethod(Document, 'prepend');
  installScopedMethod(Document, 'replaceChildren', childrenOf);
  installScopedMethod(CharacterData, 'before');
  installScopedMethod(CharacterData, 'after');
  installScopedMethod(CharacterData, 'replaceWith');

  // Methods that move or remove nodes without constructing any, which only
  // need to record the registries of those nodes first.
  const recordBefore = <T>(
    ctor: Function,
    method: string,
    nodesOf: (target: T, args: Array<unknown>) => Iterable<unknown>
  ) => {
    const native = ctor.prototype[method];
    if (native === undefined) {
      return;
    }
    ctor.prototype[method] = function (this: T, ...args: Array<unknown>) {
      recordRegistriesBeforeMove(nodesOf(this, args));
      return native.apply(this, args);
    };
  };
  recordBefore<Element>(Element, 'remove', (element) => [element]);
  recordBefore(Node, 'removeChild', (_, args) => args);
  recordBefore(Element, 'moveBefore', (_, args) => args);
  recordBefore(Document, 'moveBefore', (_, args) => args);
  recordBefore(DocumentFragment, 'moveBefore', (_, args) => args);
  recordBefore<Range>(Range, 'deleteContents', elementsInRange);
  // Setters that replace nodes with text, which only need to record the
  // registries of the nodes they remove.
  const recordBeforeSetter = (
    ctor: Function,
    name: string,
    nodesOf: (target: Node) => Iterable<unknown>
  ) => {
    const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, name);
    if (!descriptor?.set) {
      return;
    }
    Object.defineProperty(ctor.prototype, name, {
      ...descriptor,
      set(this: Node, value: unknown) {
        recordRegistriesBeforeMove(nodesOf(this));
        descriptor.set!.call(this, value);
      },
    });
  };
  // Note, most `textContent` targets have no element children.
  const elementChildrenOf = (node: Node) =>
    (node as ParentNode).firstElementChild ? childrenOf(node) : [];
  recordBeforeSetter(Node, 'textContent', elementChildrenOf);
  recordBeforeSetter(HTMLElement, 'innerText', elementChildrenOf);
  recordBeforeSetter(HTMLElement, 'outerText', (element) => [element]);

  // Install scoped innerHTML on Element & ShadowRoot
  const installScopedSetter = (ctor: Function, name: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, name);
    if (!descriptor?.set) {
      return;
    }
    Object.defineProperty(ctor.prototype, name, {
      ...descriptor,
      set(this: Node, value: unknown) {
        replaceChildrenByParsing(this, () => descriptor.set!.call(this, value));
      },
    });
  };
  installScopedSetter(Element, 'innerHTML');
  installScopedSetter(ShadowRoot, 'innerHTML');

  // Note, for `outerHTML` the parent is the parsing context and only the
  // inserted nodes are new.
  const outerHTMLDescriptor = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'outerHTML'
  )!;
  Object.defineProperty(Element.prototype, 'outerHTML', {
    ...outerHTMLDescriptor,
    set(this: Element, value: string) {
      const {parentNode, previousSibling, nextSibling} = this;
      withDeferredUpgrades(() => {
        recordRegistriesBeforeMove([this]);
        outerHTMLDescriptor.set!.call(this, value);
        if (parentNode) {
          recordRegistriesBetween(parentNode, previousSibling, nextSibling);
        }
      });
    },
  });

  // Note, a custom element host reaches its closed declarative root, with its
  // content, via `attachInternals().shadowRoot`, so the root's registry is
  // recorded there.
  if (internalsShadowRootDescriptor?.get) {
    Object.defineProperty(window['ElementInternals'].prototype, 'shadowRoot', {
      ...internalsShadowRootDescriptor,
      get(this: ElementInternals) {
        const shadowRoot = internalsShadowRootDescriptor.get!.call(
          this
        ) as ShadowRoot | null;
        if (shadowRoot) {
          getRegistry(shadowRoot);
        }
        return shadowRoot;
      },
    });
  }

  // Reflects the template's `shadowrootcustomelementregistry` attribute, for
  // browsers that don't.
  if (!('shadowRootCustomElementRegistry' in HTMLTemplateElement.prototype)) {
    Object.defineProperty(
      HTMLTemplateElement.prototype,
      'shadowRootCustomElementRegistry',
      {
        get(this: HTMLTemplateElement) {
          return this.getAttribute('shadowrootcustomelementregistry') ?? '';
        },
        set(this: HTMLTemplateElement, value: string) {
          this.setAttribute('shadowrootcustomelementregistry', value);
        },
        enumerable: true,
        configurable: true,
      }
    );
  }

  // Install global registry
  Object.defineProperty(window, 'customElements', {
    value: globalCustomElementRegistry,
    configurable: true,
    writable: true,
  });

  // Note, a stand-in has already attached internals (see `UNDEFINED_STATE`),
  // so they are returned to the user, emulating native: internals can be
  // attached once, only to a custom element (one being or already customized,
  // not failed), and not if the element's class disables them.
  const internalsToHostMap = new WeakMap<ElementInternals, HTMLElement>();
  if (nativeAttachInternals) {
    HTMLElement.prototype['attachInternals'] = function (this: HTMLElement) {
      // Note, the browser only knows the stand-in class, so the user's class
      // is checked here, however the element was constructed.
      const definition = definitionForElement.get(this);
      if (
        definition?.disableInternals ||
        internalsAttachedByUser.has(this) ||
        (standInElements.has(this) && !definition)
      ) {
        throw new DOMException(
          `Failed to execute 'attachInternals' on 'HTMLElement': ElementInternals for the specified element was already attached, is disabled, or the element isn't a custom element.`,
          'NotSupportedError'
        );
      }
      const internals =
        internalsForElement.get(this) ?? nativeAttachInternals.call(this);
      internalsAttachedByUser.add(this);
      internalsToHostMap.set(internals, this);
      return internals;
    };
  }

  if (
    window['ElementInternals'] &&
    window['ElementInternals'].prototype['setFormValue']
  ) {
    // Note, the browser only knows the stand-in, so the form members of an
    // element's internals are checked here: as natively, they only work for
    // an element customized with a form-associated class that didn't fail
    // (see `getFormAssociatedDefinition`).
    const proto = (window['ElementInternals'].prototype as unknown) as Record<
      string,
      unknown
    >;
    const checkFormAssociated = (
      internals: ElementInternals,
      member: string
    ) => {
      const host = internalsToHostMap.get(internals);
      if (!host || !getFormAssociatedDefinition(host)) {
        throw new DOMException(
          `Failed to execute '${member}' on 'ElementInternals': The target element is not a form-associated custom element.`,
          'NotSupportedError'
        );
      }
    };
    for (const method of [
      'setFormValue',
      'setValidity',
      'checkValidity',
      'reportValidity',
    ]) {
      const native = proto[method] as Function;
      proto[method] = function (
        this: ElementInternals,
        ...args: Array<unknown>
      ) {
        checkFormAssociated(this, method);
        return native.apply(this, args);
      };
    }
    for (const getter of [
      'form',
      'labels',
      'willValidate',
      'validity',
      'validationMessage',
    ]) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, getter);
      if (descriptor?.get) {
        const nativeGetter = descriptor.get;
        Object.defineProperty(proto, getter, {
          ...descriptor,
          get(this: ElementInternals) {
            checkFormAssociated(this, getter);
            return nativeGetter.call(this);
          },
        });
      }
    }

    // Note, the browser only knows the stand-in, so an element whose tag is
    // form-associated (see `standInFormAssociated`) but whose own class isn't
    // is still a form control natively. It's left out of its form's
    // collections, as natively. So every form's `elements`, and the lists its
    // `namedItem` returns, are live views of the native ones without such
    // elements, and its `length` counts only the rest.
    const isFormControl = (element: Element) =>
      getFormAssociatedDefinition(element) !== undefined ||
      !(
        standInElements.has(element as HTMLElement) ||
        definitionForElement.has(element as HTMLElement)
      );
    const controlsOf = (list: ArrayLike<Element>): ArrayLike<Element> =>
      current.excludableFormElementCount === 0
        ? list
        : (Array.prototype.filter.call(list, isFormControl) as Array<Element>);
    const nativeNamedItem = HTMLFormControlsCollection.prototype.namedItem;
    const namedControl = (
      collection: HTMLFormControlsCollection,
      name: string
    ) => {
      const found = nativeNamedItem.call(collection, name);
      if (found === null || found instanceof Element) {
        return found && isFormControl(found) ? found : null;
      }
      const controls = controlsOf((found as unknown) as ArrayLike<Element>);
      return controls.length > 1 ? filteredView(found) : controls[0] ?? null;
    };
    // Note, only a canonical number is an index; '01' is a name.
    const isIndex = (key: string | symbol) =>
      typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key);
    // Note, a string key the list's prototype doesn't have is a name.
    const isName = (target: object, key: string | symbol) =>
      typeof key === 'string' &&
      target instanceof HTMLFormControlsCollection &&
      !(key in Object.getPrototypeOf(target));
    // Note, a RadioNodeList has these methods; in a form's collection, they're
    // names.
    const listMethods = ['forEach', 'entries', 'keys', 'values'];
    const filteringHandler: ProxyHandler<HTMLFormControlsCollection> = {
      get(target, key) {
        const controls = () => controlsOf(target);
        if (key === 'length') {
          return controls().length;
        }
        if (key === 'item') {
          return (index: number) => controls()[index] ?? null;
        }
        if (
          key === 'namedItem' &&
          target instanceof HTMLFormControlsCollection
        ) {
          return (name: string) => namedControl(target, name);
        }
        if (key === Symbol.iterator) {
          return () => Array.prototype[Symbol.iterator].call(controls());
        }
        if (
          typeof key === 'string' &&
          listMethods.includes(key) &&
          key in Object.getPrototypeOf(target)
        ) {
          return (...args: Array<unknown>) =>
            ((Array.prototype as unknown) as Record<string, Function>)[
              key
            ].apply(controls(), args);
        }
        if (isIndex(key)) {
          return controls()[Number(key)];
        }
        if (isName(target, key)) {
          return namedControl(target, key as string) ?? undefined;
        }
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, key, value) {
        return Reflect.set(target, key, value, target);
      },
      has(target, key) {
        return isIndex(key) || isName(target, key)
          ? filteringHandler.getOwnPropertyDescriptor!(target, key) !==
              undefined
          : Reflect.has(target, key);
      },
      getOwnPropertyDescriptor(target, key) {
        if (!isIndex(key) && !isName(target, key)) {
          return Reflect.getOwnPropertyDescriptor(target, key);
        }
        const value = isIndex(key)
          ? controlsOf(target)[Number(key)]
          : namedControl(target, key as string);
        // Note, as natively, indexes are enumerable and names aren't.
        return value === undefined || value === null
          ? undefined
          : {
              value,
              writable: false,
              enumerable: isIndex(key),
              configurable: true,
            };
      },
      ownKeys(target) {
        const keys = Reflect.ownKeys(target);
        return [
          ...Array.from(controlsOf(target), (_, index) => String(index)),
          ...keys.filter(
            (key) =>
              !isIndex(key) &&
              (!isName(target, key) || namedControl(target, key as string))
          ),
        ];
      },
    };
    const filteredViews = new WeakMap<object, object>();
    const filteredView = <T extends object>(list: T): T => {
      let view = filteredViews.get(list);
      if (view === undefined) {
        view = new Proxy(list, filteringHandler as ProxyHandler<object>);
        filteredViews.set(list, view);
      }
      return view as T;
    };
    const formElementsDescriptor = Object.getOwnPropertyDescriptor(
      HTMLFormElement.prototype,
      'elements'
    )!;
    Object.defineProperty(HTMLFormElement.prototype, 'elements', {
      ...formElementsDescriptor,
      get(this: HTMLFormElement) {
        return filteredView(formElementsDescriptor.get!.call(this));
      },
    });
    const formLengthDescriptor = Object.getOwnPropertyDescriptor(
      HTMLFormElement.prototype,
      'length'
    )!;
    Object.defineProperty(HTMLFormElement.prototype, 'length', {
      ...formLengthDescriptor,
      get(this: HTMLFormElement) {
        return controlsOf(formElementsDescriptor.get!.call(this)).length;
      },
    });
  }

  // Note, last, since defining stand-ins can construct elements, which needs
  // everything above. A window joining later catches up on names defined so
  // far.
  standInDefiners.add({window, define: defineStandInHere});
  standInTags.forEach((formAssociated, tagName) =>
    defineStandInHere(tagName, formAssociated)
  );
})();
