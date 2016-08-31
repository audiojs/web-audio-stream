/**
 * @module web-audio-stream/stream
 */
'use strict';

var Writable = require('./writable');
var Readable = require('./readable');

Writable.Writable = Writable;
Writable.Readable = Readable;

module.exports = Writable;
