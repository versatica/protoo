'use strict';

const gulp = require('gulp');
const eslint = require('gulp-eslint');

gulp.task('lint', () =>
{
	const src =
	[
		'.eslintrc.js',
		'gulpfile.js',
		'test.js'
	];

	return gulp.src(src)
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});

gulp.task('default', gulp.series('lint'));
