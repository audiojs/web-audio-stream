/**
 * @module  web-audio-stream
 */
'use strict';

var Writable = require('./writable');
var Readable = require('./readable');

Writable.Writable = Writable;
Writable.Readable = Readable;

module.exports = Writable;

