/**
 * @template T
 * @param {T} o
 * @param {string|symbol} p
 * @return {!ObjectPropertyDescriptor<T>|undefined}
 */
export const getDescriptor = (o, p) => Object.getOwnPropertyDescriptor(o, p);

/**
 * @template THIS
 * @param {!ObjectPropertyDescriptor<THIS>|undefined} descriptor
 * @param {function(this: THIS): ?} fallback
 * @returns {function(this: THIS): ?}
 */
export const getter = (descriptor, fallback) => descriptor && descriptor.get ? descriptor.get : fallback;

/**
 * @param {!ObjectPropertyDescriptor|undefined} descriptor
 * @returns {?}
 */
export const method = descriptor => descriptor && descriptor.value;
