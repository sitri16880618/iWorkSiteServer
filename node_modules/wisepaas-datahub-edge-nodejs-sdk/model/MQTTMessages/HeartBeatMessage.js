'use strict';
const BaseMessage = require('./BaseMessage');

class DObject {
  constructor () {
    this.Hbt = 1;
    return {
      Hbt: this.Hbt
    };
  }
}

class HeartBeatMessage extends BaseMessage {
  constructor () {
    super();
    this.d = new DObject();
    return this;
  }
}

module.exports = HeartBeatMessage;
