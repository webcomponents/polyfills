/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

'use strict';

/* eslint-env node */
/* eslint-disable no-console */

let gulp = require('gulp');
let compilerPackage = require('google-closure-compiler');
let sourcemaps = require('gulp-sourcemaps');
let rollup = require('rollup-stream');
let rename = require('gulp-rename');
let source = require('vinyl-source-stream');
let buffer = require('vinyl-buffer');
let closureCompiler = compilerPackage.gulp();
let uglify = require('gulp-uglify');
let buble = require('rollup-plugin-buble')
let header = require('gulp-header');

let licenseHeader =
`/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
`;

gulp.task('closure', function() {
  return gulp.src(['./src/*.js'], {base: './'})
    .pipe(sourcemaps.init())
    .pipe(closureCompiler({
      new_type_inf: true,
      debug: true,
      compilation_level: 'SIMPLE',
      language_in: 'ES6_STRICT',
      language_out: 'ES5_STRICT',
      output_wrapper: '(function(){\n%output%\n}).call(this)',
      js_output_file: 'shadydom.min.js'
    }))
    .on('error', (e) => console.error(e))
    .pipe(sourcemaps.write('/'))
    .pipe(gulp.dest('./'))
});

gulp.task('default', () => {
  return rollup({
    entry: './src/env.js',
    format: 'iife',
    plugins: [buble()],
    moduleName: 'shadydom',
    sourceMap: true
  })
  .pipe(source('env.js', './src/'))
  .pipe(buffer())
  .pipe(rename('shadydom.min.js'))
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(uglify())
  .pipe(header(licenseHeader))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
});

gulp.task('debug', () => {
  return rollup({
    entry: './src/env.js',
    format: 'iife',
    plugins: [buble()],
    moduleName: 'shadydom',
    sourceMap: true
  })
  .pipe(source('env.js', './src/'))
  .pipe(buffer())
  .pipe(rename('shadydom.min.js'))
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
});
