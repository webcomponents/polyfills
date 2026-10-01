export {};

declare global {
  interface CustomElementRegistry {
    // https://html.spec.whatwg.org/multipage/custom-elements.html#dom-customelementregistry-initialize
    initialize: (node: Node) => void;
  }

  // https://dom.spec.whatwg.org/#documentorshadowroot
  interface ShadowRoot {
    readonly customElementRegistry: CustomElementRegistry | null;
  }

  // https://dom.spec.whatwg.org/#documentorshadowroot
  interface Document {
    readonly customElementRegistry: CustomElementRegistry | null;
    // https://dom.spec.whatwg.org/#dom-document-createelement
    createElement<K extends keyof HTMLElementTagNameMap>(
      tagName: K,
      options?: ElementCreationOptions
    ): HTMLElementTagNameMap[K];
    // https://dom.spec.whatwg.org/#dom-document-createelementns
    createElementNS<K extends keyof HTMLElementTagNameMap>(
      namespace: string | null,
      tagName: K,
      options?: ElementCreationOptions
    ): HTMLElementTagNameMap[K];
    // https://dom.spec.whatwg.org/#dom-document-importnode
    importNode<T extends Node>(
      node: T,
      options?: boolean | ImportNodeOptions
    ): T;
  }

  // https://dom.spec.whatwg.org/#element
  interface Element {
    readonly customElementRegistry: CustomElementRegistry | null;
  }

  // https://dom.spec.whatwg.org/#dictdef-shadowrootinit
  interface ShadowRootInit {
    customElementRegistry?: CustomElementRegistry | null;
  }

  // https://dom.spec.whatwg.org/#dictdef-importnodeoptions
  interface ImportNodeOptions {
    /**
     * A boolean flag, whose default value is `false`, which controls whether to include the entire DOM
     * subtree of the `externalNode` in the import. `selfOnly` has the opposite effect of supplying a
     * boolean as the `options` argument.
     *
     * If `selfOnly` is set to `false`, then `externalNode` and all of its descendants are copied.
     * If `selfOnly` is set to `true`, then only `externalNode` is imported — the new node has no children.
     */
    selfOnly?: boolean;
    customElementRegistry?: CustomElementRegistry;
  }
  // https://dom.spec.whatwg.org/#dictdef-elementcreationoptions
  interface ElementCreationOptions {
    is?: string;
    customElementRegistry?: CustomElementRegistry | null;
  }
}
