'use strict';
const BaseMessage = require('./BaseMessage');

class DataMessage extends BaseMessage {
  constructor () {
    super();
    this.d = {};
    return this;
  }
}

module.exports = DataMessage;
