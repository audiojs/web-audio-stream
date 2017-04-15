/**
 * @module  web-audio-stream
 */
'use strict';

const Writer = require('./write');
const Reader = require('./read');
Writer.Writer = Writer;
Writer.Reader = Reader;

module.exports = Writer;
