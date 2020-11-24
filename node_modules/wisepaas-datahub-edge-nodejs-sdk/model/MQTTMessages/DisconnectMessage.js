'use strict';
const BaseMessage = require('./BaseMessage');

class DObject {
  constructor () {
    this.dsc = 1;
    return {
      DsC: this.dsc
    };
  }
}

class DisconnectMessage extends BaseMessage {
  constructor () {
    super();
    this.d = new DObject();
    return this;
  }
}

module.exports = DisconnectMessage;
