export const getDescriptor = (o, p) => Object.getOwnPropertyDescriptor(o, p);
export const getter = descriptor => descriptor ? descriptor.get : () => undefined;
export const method = descriptor => descriptor ? descriptor.value : () => undefined;
