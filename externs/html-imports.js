/**
 * @typedef {{
 *   allImports: !Array<!HTMLLinkElement>,
 *   loadedImports: !Array<!HTMLLinkElement>,
 *   errorImports: !Array<!HTMLLinkElement>
 * }}
 */
var HTMLImportInfo;

var HTMLImports = {};

HTMLImports.useNative = false;
/**
 * @param {!function(!HTMLImportInfo)} callback
 */
HTMLImports.whenReady = function(callback){};
