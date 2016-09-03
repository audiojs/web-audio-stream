/**
 * @module  web-audio-stream/source
 *
 * Source pull-stream for web-audio node
 */
'use strict';


var pull = require('pull-stream/pull');
var asyncMap = require('pull-stream/throughs/async-map');
var infinite = require('pull-stream/sources/infinite');
var createReader = require('./reader');

module.exports = source;


function source (node, options) {
	let read = createReader(node, options);

	//FIXME: too clumsy. I’d expect pull.asyncSource(read)
	let stream = pull(
		infinite(() => {}),
		asyncMap((_, cb) => {
			read(cb);
		})
	);

	stream.abort = read.end;

	return stream;
}
