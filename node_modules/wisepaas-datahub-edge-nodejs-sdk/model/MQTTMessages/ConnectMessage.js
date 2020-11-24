'use strict';
const BaseMessage = require('./BaseMessage');
class DObject {
  constructor () {
    this.Con = 1;
    return this;
  }
}

class ConnectMessage extends BaseMessage {
  constructor () {
    super();
    this.d = new DObject();
    return this;
  }
}

module.exports = ConnectMessage;
