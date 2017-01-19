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

const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');
const rename = require('gulp-rename');
const rollup = require('rollup-stream');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const closure = require('google-closure-compiler').gulp();
const size = require('gulp-size');

gulp.task('debug', () => {
  return rollup({
    entry: 'src/shadycss.js',
    format: 'iife',
    moduleName: 'shadycss',
    sourceMap: true
  })
  .pipe(source('shadycss.js', 'src'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(rename('shadycss.min.js'))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
});

const modules = [
  'apply-shim',
  'css-parse',
  'custom-style-element',
  'make-element',
  'style-cache',
  'style-info',
  'style-placeholder',
  'style-properties',
  'style-settings',
  'style-transformer',
  'style-util',
  'svg-in-shadow'
];

const moduleTasks = modules.map((m) => {
  gulp.task(`test-module-${m}`, () => {
    return rollup({
      entry: `tests/module/${m}.js`,
      format: 'iife',
      moduleName: m
    })
    .pipe(source(`${m}.js`, 'tests/module'))
    .pipe(gulp.dest('./tests/module/generated'))
  });
  return `test-module-${m}`;
});

gulp.task('test-modules', moduleTasks);

gulp.task('clean-test-modules', () => del(['tests/module/generated']));

gulp.task('default', ['closure', 'test-modules']);

gulp.task('closure', () => {
  return gulp.src('src/*.js')
  .pipe(sourcemaps.init())
  .pipe(closure({
    new_type_inf: true,
    compilation_level: 'ADVANCED',
    language_in: 'ES6_STRICT',
    language_out: 'ES5_STRICT',
    output_wrapper: '(function(){\n%output%\n}).call(self)',
    js_output_file: 'shadycss.min.js',
    entry_point: '/src/shadycss.js',
    dependency_mode: 'STRICT',
    warning_level: 'VERBOSE',
    rewrite_polyfills: false,
  }))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('.'))
});