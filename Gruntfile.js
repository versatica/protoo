module.exports = function(grunt) {
	var files = {
		gruntfile: [ 'Gruntfile.js' ],
		lib:	   [ 'lib/**/*.js' ],
		test:	  [ 'test/**/*.js' ],
		doc:	   [ 'README.md', 'lib/**/*.js' ]
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
				strict: false,
				sub: true,  // Allow person['name'] vs. person.name.
				validthis: true,  // Allow 'this' in a non-constructor function.
				node: true,
				globals: {}
			},
			gruntfile: files.gruntfile,
			lib:	   files.lib,
			test:	  files.test
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
		},

		jsdoc : {
			basic: {
				src: files.doc,
				options: {
					destination: 'doc/basic/',
					private: false
				}
			},
			docstrap: {
				src: files.doc,
				options: {
					destination: 'doc/docstrap/',
					private: false,
					template: 'node_modules/grunt-jsdoc/node_modules/ink-docstrap/template',
					configure: 'jsdoc.conf.json'
				}
			}
		}
	});

	// Load Grunt plugins.
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	grunt.loadNpmTasks('grunt-jsdoc');

	// Tasks.
	grunt.registerTask('test',    [ 'nodeunit' ]);
	grunt.registerTask('doc',    [ 'jsdoc:docstrap' ]);
	grunt.registerTask('default', [ 'jshint' ]);
};
