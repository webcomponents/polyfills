interface ShadyCSSInterface {
  styleElement(element: HTMLElement): void;
  styleSubtree(
    element: HTMLElement,
    properties?: {[name: string]: string}
  ): void;
  prepareTemplate(
    template: HTMLTemplateElement,
    elementName: string,
    elementExtends?: string
  ): void;
  prepareTemplateStyles(
    template: HTMLTemplateElement,
    elementName: string,
    elementExtends?: string
  ): void;
  prepareTemplateDom(template: HTMLTemplateElement, elementName: string): void;
  styleDocument(properties?: {[name: string]: string}): void;
  flushCustomStyles(): void;
  getComputedStyleValue(element: Element, property: string): string;
  ScopingShim?: Object;
  ApplyShim?: Object;
  CustomStyleInterface?: Object;
  nativeCss: boolean;
  nativeShadow: boolean;
  cssBuild?: string;
  disableRuntime: boolean;
}

interface ShadyCSSOptions {
  shimcssproperties?: boolean;
  shimshadow?: boolean;
  cssBuild?: boolean;
  disableRuntime?: boolean;
}

interface Window {
  ShadyCSS?: ShadyCSSInterface | ShadyCSSOptions;
}

interface Element {
  extends?: string;
  _element?: Element | null;
  __cssBuild?: string;
}

interface HTMLTemplateElement {
  _validating?: boolean;
  _prepared?: boolean;
  _domPrepared?: boolean;
  _content?: DocumentFragment | null;
  _gatheredStyle?: HTMLStyleElement | null;
  _style?: HTMLStyleElement | null;
}
