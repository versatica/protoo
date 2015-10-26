var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var stylish = require('gulp-jscs-stylish');
var mocha = require('gulp-mocha');

gulp.task('lint', function()
{
	var src = ['gulpfile.js', 'lib/**/*.js', 'test/**/*.js'];

	return gulp.src(src)
		.pipe(jshint('.jshintrc'))
		.pipe(jscs('.jscsrc'))
		.pipe(stylish.combineWithHintResults())
		.pipe(jshint.reporter('jshint-stylish', { verbose: true }))
		.pipe(jshint.reporter('fail'));
});

gulp.task('test', function()
{
	return gulp.src('test/test_*.js', { read: false })
		.pipe(mocha(
			{
				reporter: 'spec',
				timeout: 2000,
				bail: true
			}));
});

gulp.task('watch', function()
{
	gulp.watch(['lib/**/*.js'], ['lint']);
});

gulp.task('default', gulp.series('lint', 'test'));
