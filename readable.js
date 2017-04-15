/**
 * @module  web-audio-stram/readable
 *
 * Pipe web-audio to stream
 */

'use strict';


const inherits = require('inherits');
const Readable = require('stream').Readable;
const createReader = require('./read');

module.exports = WAAReadable;


inherits(WAAReadable, Readable);


//@constructor
function WAAReadable (node, options) {
	if (!(this instanceof WAAReadable)) return new WAAReadable(node, options);

	let read = createReader(node, options);

	Readable.call(this, {
		objectMode: true,

		//to keep processing delays very short, in case of RT binding.
		//otherwise each stream will hoard data and release only when it’s full.
		highWaterMark: 0,

		read: function (size) {
			if (size === null) read.end();

			read((err, buffer) => {
				if (!err) this.push(buffer);
			});
		}
	});

	this.end = function () {
		read.end();
		return this;
	}
}

// WAAReadable.WORKER_MODE = 2;
// WAAReadable.ANALYZER_MODE = 0;
WAAReadable.SCRIPT_MODE = 1;

WAAReadable.prototype.mode = WAAReadable.prototype.SCRIPT_MODE;
