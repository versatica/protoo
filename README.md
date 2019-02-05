# protoo

[![][npm-shield-protoo-server]][npm-protoo-server]
[![][npm-shield-protoo-client]][npm-protoo-client]
[![][travis-ci-shield-protoo]][travis-ci-protoo]

Minimalist and extensible Node.js signaling framework for multi-party Real-Time applications.


## Website and documentation

* [protoojs.org][protoo-website]


## Breaking changes in v4

* In **protoo-server**:
  - `peer.send()` has been renamed to `peer.request()`.
  - `room.spread()` has been removed.

* In **protoo-client**:
  - `peer.send()` has been renamed to `peer.request()`.


## Author

Iñaki Baz Castillo ([@ibc](https://github.com/ibc/) at Github)


## License

[MIT](./LICENSE)




[protoo-website]: https://protoojs.org
[npm-shield-protoo-server]: https://img.shields.io/npm/v/protoo-server.svg
[npm-shield-protoo-client]: https://img.shields.io/npm/v/protoo-client.svg
[npm-protoo-server]: https://npmjs.org/package/protoo-server
[npm-protoo-client]: https://npmjs.org/package/protoo-client
[travis-ci-shield-protoo]: https://travis-ci.com/versatica/protoo.svg?branch=master
[travis-ci-protoo]: https://travis-ci.com/versatica/protoo
