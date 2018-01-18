'use strict';

const gulp = require('gulp');
const eslint = require('gulp-eslint');
const babel = require('gulp-babel');

gulp.task('lint', () =>
{
	const src =
	[
		'.eslintrc.js',
		'gulpfile.js',
		'lib/**/*.js',
		'test/**/*.js'
	];

	return gulp.src(src)
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});

gulp.task('babel', () =>
{
	return gulp
		.src([ 'lib/**/*.js' ])
		.pipe(babel())
		.pipe(gulp.dest('lib-es5'));
});

gulp.task('default', gulp.series('lint', 'babel'));
