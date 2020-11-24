'use strict';
const events = require('events').EventEmitter;
const fs = require('fs');
const edgeOptions = require('./model/edge/EdgeAgentOptions');
const edgeEnum = require('./common/enum');
const connHelper = require('./helpers/connectHelper');
const dataRecoverHelper = require('./helpers/dataRecoverHelper');
const converter = require('./common/converter');
const constant = require('./common/const');
const HeartBeatMessage = require('./model/MQTTMessages/HeartBeatMessage');
const ConnectMessage = require('./model/MQTTMessages/ConnectMessage');
const DisconnectMessage = require('./model/MQTTMessages/DisconnectMessage');
const writeValCmd = require('./model/edge/WriteValueCommand');
class EdgeAgent {
  constructor (options) {
    // this._options = new EdgeOptions.EdgeAgentOptions(options);
    this._options = new edgeOptions.EdgeAgentOptions(options);
    this._client = {};
    this._heartBeatInterval = {};
    this._dataRecoverInteval = {};
    // this._recoverHelper = new DataRecoverHelper();
    this.events = new events.EventEmitter();
    this._mqttTopic = {
      // nodeCmdTopic: `/wisepaas/scada/${options.nodeId}/cmd`,
      // deviceCmdTopic: `/wisepaas/scada/${options.nodeId}/${options.deviceId}/cmd`,
      _configTopic: `/wisepaas/scada/${options.nodeId}/cfg`,
      _dataTopic: `/wisepaas/scada/${options.nodeId}/data`,
      _nodeConnTopic: `/wisepaas/scada/${options.nodeId}/conn`,
      _deviceConnTopic: `/wisepaas/scada/${options.nodeId}/${options.deviceId}/conn`,
      _ackTopic: `/wisepaas/scada/${options.nodeId}/ack`,
      _cfgAckTopic: `/wisepaas/scada/${options.nodeId}/cfgack`,
      _cmdTopic: options.type === edgeEnum.edgeType.Gateway ? `/wisepaas/scada/${options.nodeId}/cmd` : `/wisepaas/scada/${options.nodeId}/${options.deviceId}/cmd`
    };
    // dataRecoverHelper.init();
  }

  connect (callback) {
    let result = true;
    callback = callback || function () { };
    return new Promise((resolve, reject) => {
      try {
        if (Object.keys(this._options) === 0) {
          result = false;
          const err = Error('Edge agent options is required.');
          reject(err);
          return callback(err, result);
        }
        connHelper.connectMQTTorDCCS.call(this).then((client) => {
          this._client = client;
          _initEventFunction.call(this);
          callback(null, result);
          resolve(true);
        }, error => {
          result = false;
          console.log(error.message);
          reject(error);
          callback(error, result);
        });
      } catch (error) {
        callback(error, result);
        reject(error);
      }
    });
  }

  disconnect (callback) {
    let result = true;
    callback = callback || function () { };
    return new Promise((resolve, reject) => {
      try {
        if (typeof this._client.on !== 'function') {
          result = false;
          const err = Error('Mqtt is disconnected.');
          reject(err);
          return callback(err, result);
        }
        let msg = new DisconnectMessage();
        let topic = this._options.type === edgeEnum.edgeType.Gateway ? this._mqttTopic._nodeConnTopic : this._mqttTopic._deviceConnTopic;
        this._client.publish(topic, JSON.stringify(msg), { qos: 1, retain: true }, _closeMQTTClient.bind(this, this.disconnected));
        clearInterval(this._heartBeatInterval);
        callback(null, result);
        resolve(result);
      } catch (error) {
        console.log('Disconnect error: ' + error);
        result = false;
        callback(error, result);
        reject(error);
      }
    });
  }

  uploadConfig (action, edgeConfig, callback) {
    let result = true;
    callback = callback || function () { };
    return new Promise((resolve, reject) => {
      try {
        let message = {};
        if (!this._client.connected) {
          result = false;
          const err = Error('Mqtt is connection is not exist.');
          reject(err);
          return callback(err, result);
        }
        if (Object.keys(edgeConfig) === 0) {
          result = false;
          const err = Error('Edge config can not be empty.');
          reject(err);
          return callback(err, result);
        }
        switch (action) {
          case edgeEnum.actionType.create:
          case edgeEnum.actionType.update:
          case edgeEnum.actionType.delsert:
            message = converter.convertWholeConfig(action, this._options.nodeId, edgeConfig, this._options.heartbeat);
            break;
          case edgeEnum.actionType.delete:
            message = converter.convertDeleteConfig(action, this._options.nodeId, edgeConfig, 60);
            break;
        }
        if (Object.keys(message) !== 0) {
          _writeConfigFile(message, action);
          this._client.publish(this._mqttTopic._configTopic, JSON.stringify(message), { qos: 1 });
        }
        callback(null, result);
        resolve(true);
      } catch (error) {
        result = false;
        console.log(error);
        callback(error, result);
        reject(error);
      }
    });
  }

  sendData (data, callback) {
    let result = true;
    callback = callback || function () { };
    return new Promise((resolve, reject) => {
      try {
        if (Object.keys(data).length === 0) {
          result = false;
          const err = Error('Data is required.');
          reject(err);
          return callback(err, result);
        }
        let msgArray = converter.convertData(data, this._options.nodeId);
        if (this._client.connected === false) {
          dataRecoverHelper.write(msgArray);
        } else {
          for (let msg of msgArray) {
            this._client.publish(this._mqttTopic._dataTopic, JSON.stringify(msg), { qos: 1 }, (error) => {
              if (error) {
                dataRecoverHelper.write(msg);
                console.log('publish error = ' + error);
                result = false;
                reject(error);
                return callback(error, result);
              }
            });
          }
        }
        callback(null, result);
        resolve(true);
      } catch (error) {
        result = false;
        reject(error);
        callback(error, result);
      }
    });
  }

  sendDeviceStatus (devieStatus, callback) {
    let result = true;
    callback = callback || function () { };
    return new Promise((resolve, reject) => {
      try {
        let msg = converter.convertDeviceStatus(devieStatus);
        this._client.publish(this._mqttTopic._nodeConnTopic, JSON.stringify(msg), { qos: 1, retain: true });
        resolve(true);
        callback(null, result);
      } catch (error) {
        result = false;
        console.log('Send device status error: ' + error);
        reject(error);
        callback(error, result);
      }
    });
  }
}

function _initEventFunction () {
  this._client.on('connect', _mqttConnected.bind(this));
  this._client.on('close', _mqttDisconnected.bind(this));
  this._client.on('message', (topic, message, packet) => {
    _mqttMessageReceived.call(this, topic, message, packet);
  });
}

function _mqttConnected () {
  try {
    this.events.emit('connected');
    _sendConnectMessage.call(this);
    if (this._options.heartbeat > 0) {
      this._heartBeatInterval = setInterval(_sendHeartBeatMessage.bind(this), this._options.heartbeat);
    }
    if (this._options.dataRecover) {
      dataRecoverHelper.init();
      this._dataRecoverInteval = setInterval(_dataRecoverMessage.bind(this), constant.DEAFAULT_DATARECOVER_INTERVAL);
    }
    this._client.subscribe(this._mqttTopic._cmdTopic);
    this._client.subscribe(this._mqttTopic._ackTopic);
  } catch (error) {
    console.error('_mqttConnected function error: ' + error);
  }
}

function _mqttDisconnected () {
  try {
    this.events.emit('disconnected');
    clearInterval(this._heartBeatInterval);
    clearInterval(this._dataRecoverInteval);
    if (this._options.connectType === edgeEnum.connectType.DCCS) {
      this._client.end(true, []);
      connHelper.getCredentialFromDCCS.call(this).then(client => {
        this._client = client;
        _initEventFunction.call(this);
      });
    }
  } catch (error) {
    console.error('_mqttDisconnected function error: ' + error);
  }
}

function _mqttMessageReceived (topic, message, packet) {
  try {
    let msg = JSON.parse(message.toString());
    let result = {};
    let resMsg = {};
    if (!msg || !msg.d) {
      return;
    }
    if (msg.d.Cmd !== undefined) {
      switch (msg.d.Cmd) {
        case 'WV':
          resMsg = new writeValCmd.WriteValueCommand();
          for (let devObj in msg.d.Val) {
            let device = new writeValCmd.Device();
            // console.log(devObj);
            device.id = devObj;
            for (let tagObj in msg.d.Val[devObj]) {
              let tag = new writeValCmd.Tag();
              tag.name = tagObj;
              tag.value = msg.d.Val[devObj][tagObj];
              device.tagList.push(tag);
            }
            resMsg.deviceList.push(device);
          }
          result.type = edgeEnum.messageType.writeValue;
          result.message = resMsg;
          // messageReceived(result);
          this.events.emit('messageReceived', result);
          break;
        case 'WC':
          break;
        case 'TSyn':
          break;
      }
    } else if (msg.d.Cfg) {
      result.type = edgeEnum.messageType.configAck;
      result.message = msg.d.Cfg === 1;
      this.events.emit('messageReceived', result);
    }
  } catch (error) {
    console.log('_mqttMessageReceived function error: ' + error);
  }
}

function _dataRecoverMessage () {
  if (this._client.connected === false) {
    return;
  }
  dataRecoverHelper.dataAvailable((res) => {
    if (res) {
      dataRecoverHelper.read(constant.DEAFAULT_DATARECOVER_COUNT, (message) => {
        for (let msg of message) {
          this._client.publish(this._mqttTopic._dataTopic, msg, { qos: 1 });
        }
      });
    }
  });
}

function _sendHeartBeatMessage () {
  let msg = new HeartBeatMessage();
  let topic = this._options.type === edgeEnum.edgeType.Gateway ? this._mqttTopic._nodeConnTopic : this._mqttTopic._deviceConnTopic;
  this._client.publish(topic, JSON.stringify(msg), { qos: 1, retain: true });
}

function _sendConnectMessage () {
  let msg = new ConnectMessage();
  let topic = this._options.type === edgeEnum.edgeType.Gateway ? this._mqttTopic._nodeConnTopic : this._mqttTopic._deviceConnTopic;
  this._client.publish(topic, JSON.stringify(msg), { qos: 1, retain: true });
}

function _closeMQTTClient () {
  this._client.end(true, []);
}

function _writeConfigFile (message, action) {
  if (action === edgeEnum.actionType.create || action === edgeEnum.actionType.delsert) {
    constant.edgentConfig = JSON.stringify(message.d);
    if (!fs.existsSync(constant.configFilePath)) {
      fs.writeFileSync(constant.configFilePath, JSON.stringify(message));
    } else {
      fs.writeFileSync(constant.configFilePath, JSON.stringify(message));
    }
  }
  // else { // delete 不存config 只讀config
  //   let data = fs.readFileSync(constant.configFilePath);
  //   data = JSON.parse(data);
  //   // 執行delete時將Action修改存檔，這樣下一次upload不用刪除config.json
  //   if (data.d.Action !== edgeEnum.actionType.delete) {
  //     data.d.Action = edgeEnum.actionType.delete;
  //     fs.writeFileSync(constant.configFilePath, JSON.stringify(data));
  //   } else {
  //     data.d.Action = edgeEnum.actionType.delete;
  //   }
  //   constant.edgentConfig = JSON.stringify(data.d);
  //   return false;
  // }
}
// function timeConvert (string) {
//   // let timeNow = Date.now();
//   const time = new Date();
//   const showtime = string + ' ' + time.getSeconds() + ':' + time.getMilliseconds();
//   console.log(showtime);
// }

module.exports = EdgeAgent;
