/**
 * @module  web-audio-stream/pull
 */
'use strict';

const sink = require('./sink');
const source = require('./source');

sink.sink = sink;
sink.source = source;
module.exports = sink;
