var HTMLImports = {};

HTMLImports.useNative = false;
/**
 * @param {function()=} callback
 */
HTMLImports.whenReady = function(callback) {};
/**
 * @param {!Node} element
 * @return {HTMLLinkElement|null|undefined}
 */
HTMLImports.importForElement = function(element) {};

/**
 * Ensures imports contained in the element are imported.
 * Use this to handle dynamic imports attached to body.
 * @param {!(HTMLDocument|Element)} doc
 */
HTMLImports.loadImports = function(doc) {};
