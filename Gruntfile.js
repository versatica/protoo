'use strict';


module.exports = function(grunt) {
	var files = {
		gruntfile: [ 'Gruntfile.js' ],
		lib:       [ 'lib/**/*.js' ],
		test:      [ 'test/**/*.js' ]
	};

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		jshint: {
			options: {
				// DOC: http://www.jshint.com/docs/options/
				curly: true,
				eqeqeq: true,
				forin: false,
				freeze: true,
				immed: true,
				latedef: true,
				newcap: true,
				noarg: true,
				noempty: true,
				nonbsp:  true,
				nonew: true,
				plusplus: false,  // Allow variable++.
				quotmark: 'single',
				undef: true,
				unused: true,
				strict: true,
				sub: true,  // Allow person['name'] vs. person.name.
				validthis: true,  // Allow 'this' in a non-constructor function.
				node: true,
				globals: {}
			},
			gruntfile: files.gruntfile,
			lib:       files.lib,
			test:      files.test
		},

		watch: {
			gruntfile: {
				files: files.gruntfile,
				tasks: [ 'jshint:gruntfile' ],
				options: {
					nospawn: true
				}
			},
			lib: {
				files: files.lib,
				tasks: [ 'jshint:lib' ],
				options: {
					nospawn: true
				}
			},
			test: {
				files: files.test,
				tasks: [ 'jshint:test' ],
				options: {
					nospawn: true
				}
			}
		},

		nodeunit: {
			files: files.test
		}
	});

	// Load Grunt plugins.
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');

	// Tasks.
	grunt.registerTask('test',    [ 'nodeunit' ]);
	grunt.registerTask('default', [ 'jshint' ]);
};
