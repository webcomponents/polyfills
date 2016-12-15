/**
 * @typedef {{
 *   allImports: !Node,
 *   loadedImports: !Array<!Node>,
 *   errorImports: !Array<!Node>
 * }}
 */
var HTMLImportInfo;

var HTMLImports = {};

HTMLImports.useNative = false;
/**
 * @param {!function(!HTMLImportInfo)} callback
 */
HTMLImports.whenReady = function(callback){};
