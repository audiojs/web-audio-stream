/**
 * @module  web-audio-stream/sink
 *
 * Sink pull-stream for web-audio
 */
'use strict';


var pull = require('pull-stream/pull');
var asyncMap = require('pull-stream/throughs/async-map');
var drain = require('pull-stream/sinks/drain');
var createWriter = require('./write');

module.exports = sink;


function sink (node, options) {
	let write = createWriter(node, options);
	let d = drain();

	let stream = pull(asyncMap(write), d);

	stream.abort = () => {
		write.end();
		d.abort();
	};

	return stream;
}
