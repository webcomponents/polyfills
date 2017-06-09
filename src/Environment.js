function getOwnPropertyDescriptors(target) {
  const clone = {};

  const keys = Object.getOwnPropertyNames(target);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    clone[key] = Object.getOwnPropertyDescriptor(target, key);
  }

  return clone;
}

export const Document = getOwnPropertyDescriptors(window.Document.prototype);
export const Element = getOwnPropertyDescriptors(window.Element.prototype);
export const HTMLElement = getOwnPropertyDescriptors(window.HTMLElement.prototype);
export const HTMLTemplateElement = getOwnPropertyDescriptors(window.HTMLElement.prototype);
export const MutationObserver = getOwnPropertyDescriptors(window.MutationObserver.prototype);
export const MutationRecord = getOwnPropertyDescriptors(window.MutationRecord.prototype);
export const Node = getOwnPropertyDescriptors(window.Node.prototype);
