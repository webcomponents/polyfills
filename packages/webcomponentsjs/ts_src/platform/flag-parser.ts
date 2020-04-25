/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

export {};

interface ExtendedWindow extends Window {
  WebComponents?: {flags?: Flags;};
  ShadyDOM?: {force?: boolean|string; noPatch?: boolean | string;};
  customElements: CustomElementRegistry&{
    forcePolyfill?: string|boolean;
  };
}

type Flags = Record<string, string|boolean|Record<string, boolean>>;


// Establish scope.
const extendedWindow = (window as unknown as ExtendedWindow);
extendedWindow['WebComponents'] =
    extendedWindow['WebComponents'] || {'flags': {}};

// loading script
const file = 'webcomponents-bundle';
const script = document.querySelector('script[src*="' + file + '"]');
const flagMatcher = /wc-(.+)/;

// Note(rictic): a lot of this code looks wrong. Should we be pulling
//     the flags local variable off of window.WebComponents.flags? If not
//     then why check for noOpts, which can't possibly have been set?

// Flags. Convert url arguments to flags
let flags: Flags = {};
if (!flags['noOpts']) {
  // from url
  location.search.slice(1).split('&').forEach(function(option) {
    let parts = option.split('=');
    let match;
    if (parts[0] && (match = parts[0].match(flagMatcher))) {
      flags[match[1]] = parts[1] || true;
    }
  });
  // from script
  if (script) {
    for (let i = 0, a; (a = script.attributes[i]); i++) {
      if (a.name !== 'src') {
        flags[a.name] = a.value || true;
      }
    }
  }
  // log flags
  const log: Record<string, boolean> = {};
  if (flags['log'] && (flags['log'] as string)['split']) {
    let parts = (flags['log'] as string).split(',');
    parts.forEach(function(f) {
      log[f] = true;
    });
  }
  flags['log'] = log;
}

// exports
extendedWindow['WebComponents']['flags'] = flags;
let forceShady = flags['shadydom'] as boolean|string;
if (forceShady) {
  extendedWindow['ShadyDOM'] = extendedWindow['ShadyDOM'] || {};
  extendedWindow['ShadyDOM']['force'] = forceShady;
  const noPatch = flags['noPatch'] as boolean|string;
  extendedWindow['ShadyDOM']['noPatch'] = noPatch === 'true' ? true : noPatch;
}

let forceCE = (flags['register'] || flags['ce']) as boolean|string;
if (forceCE && window['customElements']) {
  extendedWindow['customElements']['forcePolyfill'] = forceCE;
}
