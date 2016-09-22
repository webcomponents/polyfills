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
let closureCompiler = require('google-closure-compiler').gulp();
let sourcemaps = require('gulp-sourcemaps');
let rollup = require('rollup-stream');
let buble = require('rollup-plugin-buble');
let source = require('vinyl-source-stream');
let buffer = require('vinyl-buffer');
let del = require('del');

gulp.task('build', () => {
  return gulp.src(['./src/*.js'], {base: './'})
    .pipe(sourcemaps.init())
    .pipe(closureCompiler({
      dependency_mode: 'STRICT',
      new_type_inf: true,
      compilation_level: 'SIMPLE',
      language_in: 'ES6_STRICT',
      language_out: 'ES5_STRICT',
      output_wrapper: '(function(){\n%output%\n}).call(this)',
      entry_point: ['/src/ShadyCSS', '/src/custom-style'],
      js_output_file: 'shadycss.min.js'
    }))
    .on('error', (e) => console.error(e))
    .pipe(sourcemaps.write('/'))
    .pipe(gulp.dest('./'))
});

let modules = [
  'apply-shim',
  'css-parse',
  'custom-style',
  'style-cache',
  'style-info',
  'style-placeholder',
  'style-properties',
  'style-settings',
  'style-transformer',
  'style-util',
];

let moduleTasks = modules.map((m) => {
  gulp.task(`test-module-${m}`, () => {
    return rollup({
      entry: `./tests/module/${m}.js`,
      plugins: [buble()],
      format: 'iife',
      moduleName: `${m}`,
      sourceMap: true
    })
    .pipe(source(`${m}.js`, './tests/module/'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./tests/module/generated'))
  });
  return `test-module-${m}`;
});

gulp.task('test-modules', moduleTasks);

gulp.task('clean-test-modules', () => del(['tests/module/generated']));

gulp.task('default', ['build', 'test-modules']);
