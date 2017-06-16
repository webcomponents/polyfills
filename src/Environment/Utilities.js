export const getDescriptor = (o, p) => Object.getOwnPropertyDescriptor(o, p);
export const getter = (descriptor, fallback) => descriptor && descriptor.get ? descriptor.get : fallback;
export const method = descriptor => descriptor ? descriptor.value : () => undefined;
