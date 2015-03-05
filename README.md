# protoo

Fast and extensible Node.js signaling framework for Real-Time Communication applications.

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Linux Build][travis-image]][travis-url]


## Installation

```bash
$ npm install protoo --save
```


## Documentation

Read the full [API documentation](docs/index.md) in the docs folder.


## Debugging

The library includes the Node [debug](https://github.com/visionmedia/debug) module. In order to enable debugging:

In Node set the `DEBUG=protoo*` environment variable before running the application, or set it at the top of the script:

```javascript
process.env.DEBUG = 'protoo*';
```


## Author

Iñaki Baz Castillo.


## License

[MIT](./LICENSE)


[npm-image]: https://img.shields.io/npm/v/protoo.svg
[npm-url]: https://npmjs.org/package/protoo
[downloads-image]: https://img.shields.io/npm/dm/protoo.svg
[downloads-url]: https://npmjs.org/package/protoo
[travis-image]: https://img.shields.io/travis/ibc/protoo/master.svg?label=linux
[travis-url]: https://travis-ci.org/ibc/protoo
