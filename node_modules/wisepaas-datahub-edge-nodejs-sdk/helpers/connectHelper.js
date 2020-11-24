'use strict';
const mqtt = require('mqtt');
const request = require('request-promise');
const edgeEnum = require('../common/enum');
const Const = require('../common/const');
const edgeOptions = require('../model/edge/EdgeAgentOptions');
const exec = require('child_process').exec;
const os = require('os');
const LastWillMessage = require('../model/MQTTMessages/LastWillMessage');

function _connectMQTTorDCCS () {
  return new Promise((resolve, reject) => {
    _openvpnConnect.call(this);
    if (this._options.connectType === edgeEnum.connectType.MQTT) {
      this._options.MQTT.will = {
        topic: `/wisepaas/scada/${this._options.nodeId}/conn`,
        payload: JSON.stringify(new LastWillMessage()),
        qos: 1,
        retain: true
      };
      this._options.MQTT.reconnectPeriod = this._options.reconnectInterval;
      let client = mqtt.connect(this._options.MQTT);
      resolve(client);
    } else {
      _getCredentialFromDCCS.call(this).then(res => {
        resolve(res);
      });
    }
  });
}

function _getCredentialFromDCCS () {
  return new Promise((resolve, reject) => {
    let reqOpt = {
      uri: this._options.DCCS.APIUrl + 'v1/serviceCredentials/' + this._options.DCCS.credentialKey,
      json: true
    };
    request.get(reqOpt).then(res => {
      let credential = res.credential;
      let mqttOptions = {
        host: res.serviceHost
      };
      if (this._options.useSecure) {
        mqttOptions.port = credential.protocols['mqtt+ssl'].port;
        mqttOptions.userName = credential.protocols['mqtt+ssl'].username;
        mqttOptions.password = credential.protocols['mqtt+ssl'].password;
      } else {
        mqttOptions.port = credential.protocols.mqtt.port;
        mqttOptions.username = credential.protocols.mqtt.username;
        mqttOptions.password = credential.protocols.mqtt.password;
      }
      mqttOptions.will = {
        topic: `/wisepaas/scada/${this._options.nodeId}/conn`,
        payload: JSON.stringify(new LastWillMessage()),
        qos: 1,
        retain: true
      };

      mqttOptions.reconnectPeriod = this._options.reconnectInterval;
      let client = mqtt.connect(mqttOptions);
      resolve(client);
    }, () => { // 即使失敗也給他預設MQTT選項，建立mqtt client object
      let mqttOptions = new edgeOptions.MQTTOption({});
      let client = mqtt.connect(mqttOptions);
      resolve(client);
    }).catch(err => {
      reject(err);
    });
  });
}

function _openvpnConnect () {
  try {
    if (os.platform() === Const.win32) {

    } else if (os.platform() === Const.linux || os.platform() === Const.macOS) {
      if (this._options.ovpnPath) {
        let ovpnhandler = exec('./vendor/openvpn ' + this._options.ovpnPath);
        ovpnhandler.stdout.on('data', (data) => {
          console.log(data);
        });
        ovpnhandler.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
        });
      }
    }
  } catch (error) {
    console.error('openvpn error: ' + error);
  }
}

module.exports = {
  connectMQTTorDCCS: _connectMQTTorDCCS,
  getCredentialFromDCCS: _getCredentialFromDCCS
};
