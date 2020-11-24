'use strict';
const BaseMessage = require('./BaseMessage');

class DObject {
  constructor () {
    this.UeD = 1;
    return this;
  }
}

class LastWillMessage extends BaseMessage {
  constructor () {
    super();
    this.d = new DObject();
    return this;
  }
}

module.exports = LastWillMessage;
