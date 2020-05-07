/**
 * @license
 * Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

'use strict';
const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const closure = require('google-closure-compiler').gulp();
const closureOptions = {
  compilation_level: 'ADVANCED',
  warning_level: 'VERBOSE',
  language_in: 'ES6_STRICT',
  language_out: 'ES5_STRICT',
  js_output_file: 'shady-css-scoped-element.min.js',
  assume_function_wrapper: true,
  isolation_mode: 'IIFE',
  rewrite_polyfills: false,
  dependency_mode: 'STRICT',
  entry_point: 'src/shady-css-scoped-element.js',
  externs: 'externs/shadycss-externs.js'
};

gulp.task('default', () => {
  return gulp.src([
      './src/shady-css-scoped-element.js'
    ], {base: './', follow: true})
    .pipe(sourcemaps.init())
    .pipe(closure(closureOptions))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.'));
});
