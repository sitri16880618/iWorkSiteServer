'use strict';
const assert = require('assert');
const edgeEnum = require('../../common/enum');
class EdgeAgentOptions {
  constructor (options) {
    assert(options, 'No options to init EdgeAgent.');
    assert(options.nodeId, 'Node ID is required.');
    this.autoReconnect = options.autoReconnect ? options.autoReconnect : false;
    this.reconnectInterval = options.reconnectInterval ? options.reconnectInterval : 1000;
    this.nodeId = options.nodeId ? options.nodeId : '';
    this.deviceId = options.deviceId ? options.deviceId : '';
    this.type = options.type && options.type <= Object.keys(edgeEnum.edgeType).length ? options.type : edgeEnum.edgeType.Gateway;
    this.heartbeat = options.heartbeat ? options.heartbeat : 60000;
    this.dataRecover = options.dataRecover ? options.dataRecover : true;
    this.connectType = options.connectType && options.connectType <= Object.keys(edgeEnum.connectType).length ? options.connectType : edgeEnum.connectType.DCCS;
    this.useSecure = options.useSecure ? options.useSecure : false;
    this.ovpnPath = options.ovpnPath ? options.ovpnPath : '';

    if (options.connectType === edgeEnum.connectType.MQTT) {
      // if (!options.MQTT) {
      //   options.MQTT = {};
      // }
      this.MQTT = new MQTTOption(options.MQTT);
    } else {
      assert(options.DCCS.credentialKey, 'DCCS credentialkey is required, please check the options for new an edgeAgent.');
      assert(options.DCCS.APIUrl, 'DCCS APIUrl is required, please check the options for new an edgeAgent.');
      this.DCCS = new DCCSOptions(options.DCCS);
    }
    return this;
  }
}

class DCCSOptions {
  constructor (options) {
    this.credentialKey = options.credentialKey ? options.credentialKey : '';
    this.APIUrl = options.APIUrl ? options.APIUrl : '';
    return this;
  }
}

class MQTTOption {
  constructor (options) {
    this.host = options.hostName ? options.hostName : '';
    this.port = options.port ? options.port : 1883;
    this.username = options.username ? options.username : '';
    this.password = options.password ? options.password : '';
    this.protocolType = options.protocolType ? options.protocolType : edgeEnum.protocol.TCP;
    return this;
  }
}

module.exports = {
  EdgeAgentOptions,
  MQTTOption
};
