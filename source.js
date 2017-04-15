/**
 * @module  web-audio-stream/source
 *
 * Source pull-stream for web-audio node
 */
'use strict';

var createReader = require('./read');

module.exports = source;


function source (node, options) {
	let read = createReader(node, options);
	let ended = false;

	let stream = function (end, cb) {
		if (end || ended) {
			if (!ended) {
				read.end();
			}

			ended = true;
			return cb && cb(true)
		}

		return read(cb);
	}

	stream.abort = () => {
		ended = true;
		read.end();
	}

	return stream;
}
