import {getDescriptor, getter, method} from "./Utilities.js";

const HTMLTemplateElement = {};
const envHTMLTemplateElement = window['HTMLTemplateElement'];
if (envHTMLTemplateElement) {
  const envHTMLTemplateElement_proto = envHTMLTemplateElement['prototype'];
  HTMLTemplateElement.self = envHTMLTemplateElement;
  HTMLTemplateElement.proto = envHTMLTemplateElement_proto;
  HTMLTemplateElement.content = getDescriptor(envHTMLTemplateElement_proto, 'content');
}
export default HTMLTemplateElement;

const contentGetter = getter(HTMLTemplateElement.content, function() { return this.content; });

export const Proxy = {
  content: node => contentGetter.call(node),
};
