const randomString = () => Math.random().toString(32).substring(2);

export const state = '_CE_state_' + randomString();

/**
 * @enum {number}
 */
export const CustomElementState = {
  custom: 1,
  failed: 2,
};

export const definition = '_CE_definition_' + randomString();
export const shadowRoot = '_CE_shadowRoot_' + randomString();
export const elementForDOMTokenList = '_CE_elementForDOMTokenList_' + randomString();
