/**
 * @module  web-audio-stream
 */
'use strict';

const Writer = require('./writer');
const Reader = require('./reader');
Writer.Writer = Writer;
Writer.Reader = Reader;

module.exports = Writer;
