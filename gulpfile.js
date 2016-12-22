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
const babel = require('gulp-babel');
const del = require('del');
const rename = require('gulp-rename');
const rollup = require('rollup-stream');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');

function singleLicenseComment() {
  let hasLicense = false;
  return (comment) => {
    if (hasLicense) {
      return false;
    }
    return hasLicense = /@license/.test(comment);
  }
}

const babiliConfig = {
  presets: ['babili'],
  shouldPrintComment: singleLicenseComment()
};

const es5Config = {
  presets: ['es2015']
}

gulp.task('minify', () => {
  return rollup({
    entry: 'index.js',
    format: 'iife',
    moduleName: 'shadycss',
    sourceMap: true
  })
  .pipe(source('index.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(babel(babiliConfig))
  .pipe(rename('shadycss.min.js'))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
});

gulp.task('debug', () => {
  return rollup({
    entry: 'index.js',
    format: 'iife',
    moduleName: 'shadycss',
    sourceMap: true
  })
  .pipe(source('index.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(rename('shadycss.min.js'))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
})

gulp.task('es5', () => {
  return rollup({
    entry: 'index.js',
    format: 'iife',
    moduleName: 'shadycss',
    sourceMap: true
  })
  .pipe(source('index.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(babel(es5Config))
  .pipe(rename('shadycss.min.js'))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
})

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

gulp.task('default', ['minify', 'test-modules']);
