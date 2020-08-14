# protoo-server

[![][npm-shield-protoo-server]][npm-protoo-server]
[![][travis-ci-shield-protoo]][travis-ci-protoo]

**protoo** is a minimalist and extensible Node.js signaling framework for multi-party Real-Time Communication applications.

This is the **protoo** server side Node.js module.


## Website and documentation

* [protoo.versatica.com][protoo-website]


## Breaking changes in v4

* In **protoo-server**:
  - `peer.send()` has been renamed to `peer.request()`.
  - `room.spread()` has been removed.

* In **protoo-client**:
  - `peer.send()` has been renamed to `peer.request()`.


## Author

Iñaki Baz Castillo ([@ibc](https://github.com/ibc/) at Github)


## License

MIT




[protoo-website]: https://protoo.versatica.com
[npm-shield-protoo-server]: https://img.shields.io/npm/v/protoo-server.svg
[npm-protoo-server]: https://npmjs.org/package/protoo-server
[travis-ci-shield-protoo]: https://travis-ci.com/versatica/protoo.svg?branch=master
[travis-ci-protoo]: https://travis-ci.com/versatica/protoo
