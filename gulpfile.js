/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
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
  externs: ['externs/html-imports.js'],
  js_output_file: 'html-imports.min.js',
  assume_function_wrapper: true,
  new_type_inf: true,
  rewrite_polyfills: false,
  dependency_mode: 'STRICT',
  entry_point: 'src/html-imports.js',
};

gulp.task('default', () => {
  return gulp.src([
      './src/html-imports.js'
    ], {base: './', follow: true})
    .pipe(sourcemaps.init())
    .pipe(closure(closureOptions))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.'));
});