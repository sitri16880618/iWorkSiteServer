'use strict';
const BaseMessage = require('./BaseMessage');

class DObject {
  constructor () {
    this.dev = {};
    return {
      Dev: this.dev
    };
  }
}

class DeviceStatusMessage extends BaseMessage {
  constructor () {
    super();
    this.d = new DObject();
    return this;
  }
}

module.exports = DeviceStatusMessage;
