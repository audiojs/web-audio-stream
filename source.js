/**
 * @module  web-audio-stream/source
 *
 * Source pull-stream for web-audio node
 */
'use strict';

var createReader = require('./reader');

module.exports = source;


function source (node, options) {
	let read = createReader(node, options);

	let stream = function (end, cb) {
		if (end) {
			read.end();
			return cb && cb(end)
		}

		return read(cb);
	}

	stream.abort = read.end;

	return stream;
}
