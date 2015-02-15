## `Application` class API


### Methods


#### `websocket(httpServer, onConnection)`

Adds a WebSocket server to the application.

Arguments:

* `httpServer` {http.Server|https.Server}: A Node HTTP or HTTPS server.
* `onConnection` {Function}: User handler for new WebSocket connections. It's called with the following arguments:
    * `info` {Object}: Information about the WebSocket handshake:
        - `req` {http.IncomingRequest}:  The HTTP request.
        - `origin` {String}: The Origin header value in the client request (may be null).
        - `socket` {net.Socket}: The Node net.Socket instance.
    * `accept` {Function}: Function the user must invoke to accept the connection.
    * `reject` {Function}: Function the user must invoke to reject the connection.

The `accept(username, uuid, data, onPeer)` function must be called with the following arguments:

* `username` {String}: Username of the peer.
* `uuid` {String}: UUID of the peer.
* `data` {Object}: Custom data for the peer.
* `onPeer` {Function}: Callback called upon peer
* creation and before the "peer:online" event. It is called with the new [Peer](Peer.md) instance as argument.

The `reject(code, reason)` function must be called with the following arguments:

* `code` {Number}: Rejection cause code.
* `reason` {String}: Rejection description.


#### `close(closeServers=false)`

Closes the application and disconnect peers.

Arguments:

* `closeServers` {Boolean}: Close the WebSocket server(s) instead of just disabling them.


### Events

The `Application` class inherints the methods of the Node's [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter).


#### "online" event

Emitted when a peer becomes online.

Parameters:

* `peer` {[Peer](Peer.md)}: The Peer instance.


#### "offline" event

Emitted when a peer becomes offline.

Parameters:

* `peer` {[Peer](Peer.md)}: The Peer instance.
