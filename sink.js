/**
 * @module  web-audio-stream/sink
 *
 * Sink pull-stream for web-audio
 */
'use strict';


var pull = require('pull-stream/pull');
var asyncMap = require('pull-stream/throughs/async-map');
var drain = require('pull-stream/sinks/drain');
var createWriter = require('./writer');

module.exports = sink;


function sink (node, options) {
	let write = createWriter(node, options);

	let stream = pull(
		asyncMap(write),
		drain()
	);

	stream.abort = write.end;

	return stream;
}
