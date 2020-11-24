
'use strict';
const assert = require('assert');
const fs = require('fs');
const configMessage = require('../model/MQTTMessages/ConfigMessage');
const DataMessage = require('../model/MQTTMessages/DataMessage');
const DeviceStatusMessage = require('../model/MQTTMessages/DeviceStatusMessage');
const Const = require('./const');
const edgeEnum = require('./enum');

function _convertWholeConfig (action, nodeId, edgeConfig, heartBeat) {
  try {
    let msg = new configMessage.ConfigMessage();
    msg.d.Action = action;
    let nodeObj = new configMessage.NodeObject(nodeId, edgeConfig, heartBeat);
    for (var device of edgeConfig.node.deviceList) {
      assert(device.id, 'Device Id is required, please check the edge config properties.');
      assert(device.name, 'Device name is required, please check the edge config properties.');
      assert(device.type, 'Device type is required, please check the edge config properties.');
      let deviceObj = new configMessage.DeviceObject(device);
      if (device.analogTagList && device.analogTagList.length !== 0) {
        for (let anaTag of device.analogTagList) {
          assert(anaTag.name, 'Analog tag name is required, please check the edge config properties.');
          let analogTagObj = new configMessage.AnalogTagObject(anaTag);
          deviceObj.Tag[anaTag.name] = analogTagObj;
        }
      }
      if (device.discreteTagList && device.discreteTagList.length !== 0) {
        for (let disTag of device.discreteTagList) {
          assert(disTag.name, 'Discrete tag name is required, please check the edge config properties.');
          let disTagObj = new configMessage.DiscreteTagObject(disTag);
          deviceObj.Tag[disTag.name] = disTagObj;
        }
      }
      if (device.textTagList && device.textTagList.length !== 0) {
        for (let textTag of device.textTagList) {
          assert(textTag.name, 'Text tag name is required, please check the edge config properties.');
          let textTagObj = new configMessage.TextTagObject(textTag);
          deviceObj.Tag[textTag.name] = textTagObj;
        }
      }
      nodeObj.Device[device.id] = deviceObj;
      // console.log(deviceObj);
    }
    // console.log(nodeObj);
    msg.d.Scada[nodeId] = nodeObj;
    return msg;
  } catch (error) {
    throw Error('Convert edge config to MQTT format error! error message: ' + error);
  }
}

function _convertDeleteConfig (action, nodeId, edgeConfig) {
  let msg = new configMessage.ConfigMessage();
  msg.d.Action = action;
  let nodeObj = new configMessage.NodeObject(nodeId, edgeConfig, null);
  for (var device of edgeConfig.node.deviceList) {
    assert(device.id, 'Device Id is required, please check the edge config properties.');
    let deviceObj = new configMessage.DeviceObject(device);
    if (device.analogTagList && device.analogTagList.length !== 0) {
      for (let anaTag of device.analogTagList) {
        assert(anaTag.name, 'Analog tag name is required, please check the edge config properties.');
        let analogTagObj = new configMessage.AnalogTagObject(anaTag);
        deviceObj.Tag[anaTag.name] = analogTagObj;
      }
    }
    if (device.discreteTagList && device.discreteTagList.length !== 0) {
      for (let disTag of device.discreteTagList) {
        assert(disTag.name, 'Discrete tag name is required, please check the edge config properties.');
        let disTagObj = new configMessage.DiscreteTagObject(disTag);
        deviceObj.Tag[disTag.name] = disTagObj;
      }
    }
    if (device.textTagList && device.textTagList.length !== 0) {
      for (let textTag of device.textTagList) {
        assert(textTag.name, 'Text tag name is required, please check the edge config properties.');
        let textTagObj = new configMessage.TextTagObject(textTag);
        deviceObj.Tag[textTag.name] = textTagObj;
      }
    }
    nodeObj.Device[device.id] = deviceObj;
  }
  msg.d.Scada[nodeId] = nodeObj;
  return msg;
}

function _convertData (data, nodeId) {
  let result = [];
  let msg = new DataMessage();
  let count = 0;
  for (let i = 0; i < data.tagList.length; i++) {
    let tag = data.tagList[i];
    assert(tag.deviceId, 'Device ID is required when call the sendData function.');
    assert(tag.tagName, 'Tag name is required when call the sendData function.');
    if (!msg.d[tag.deviceId]) {
      msg.d[tag.deviceId] = {};
    }
    if (fs.existsSync(Const.configFilePath)) {
      _checkTypeOfTagValue(tag, nodeId);
      msg.d[tag.deviceId][tag.tagName] = _fractionDisplayFormat(tag, nodeId);
    } else {
      msg.d[tag.deviceId][tag.tagName] = tag.value;
    }
    count++;
    if (count === Const.packageSize || i === data.tagList.length - 1) {
      msg.ts = data.ts;
      result.push(msg);
      msg = new DataMessage();
      count = 0;
    }
  }
  return result;
}

function _convertDeviceStatus (deviceStatus) {
  try {
    if (Object.keys(deviceStatus).length === 0) {
      return;
    }
    let msg = new DeviceStatusMessage();
    msg.ts = deviceStatus.ts;
    for (let device of deviceStatus.deviceList) {
      assert(device.id, 'Device ID is required when call the updateDeviceStatus function.');
      msg.d.Dev[device.id] = device.status;
    }
    return msg;
  } catch (error) {
    console.log('error occured in convertDeviceStatus function, error: ' + error);
  }
}

function _fractionDisplayFormat (tag, nodeId) {
  try {
    let edgentConfig = JSON.parse(Const.edgentConfig);
    if (edgentConfig.Scada[nodeId].Device[tag.deviceId].Tag[tag.tagName]) {
      let fractionVal = edgentConfig.Scada[nodeId].Device[tag.deviceId].Tag[tag.tagName].FDF;
      if (fractionVal) {
        if (typeof (tag.value) !== 'object') {
          return Math.floor(tag.value * Math.pow(10, fractionVal)) / Math.pow(10, fractionVal);
        } else {
          for (let key in tag.value) {
            tag.value[key] = Math.floor(tag.value[key] * Math.pow(10, fractionVal)) / Math.pow(10, fractionVal);
          }
          return tag.value;
        }
      } else {
        return tag.value;
      }
    }
  } catch (err) {
    console.error('_fractionDisplayFormat ' + err);
    throw Error(err);
  }
}

function _checkTypeOfTagValue (tag, nodeId) {
  try {
    let edgentConfig = JSON.parse(Const.edgentConfig);
    if (edgentConfig.Scada[nodeId].Device[tag.deviceId].Tag[tag.tagName]) {
      let type = edgentConfig.Scada[nodeId].Device[tag.deviceId].Tag[tag.tagName].Type;
      switch (type) {
        case edgeEnum.tagType.analog:
          if (typeof (tag.value) !== 'object') {
            if (typeof (tag.value) !== 'number') {
              throw Error('Tag Name: ' + tag.tagName + '. Type of value type is not number');
            }
          } else {
            for (let key in tag.value) {
              if (typeof (tag.value[key]) !== 'number') {
                throw Error('Tag Name: ' + tag.tagName + ', index: ' + key + ' type is not number');
              }
            }
          }
          break;
        case edgeEnum.tagType.discrete:
          let RegExp = /^\d+$/;
          if (typeof (tag.value) !== 'object') {
            let res = RegExp.test(tag.value);
            if (!res) {
              throw Error('Tag Name: ' + tag.tagName + '. Type of value is not positive integer.');
            }
          } else {
            for (let key in tag.value) {
              if (!RegExp.test(tag.value[key])) {
                throw Error('Tag Name: ' + tag.tagName + ', index: ' + key + ' type is not positive integer.');
              }
            }
          }
          break;
        case edgeEnum.tagType.text:
          if (typeof (tag.value) !== 'object') {
            if (typeof (tag.value) !== 'string') {
              throw Error('Tag Name: ' + tag.tagName + '. Type of value is not string.');
            }
          } else {
            for (let key in tag.value) {
              if (typeof (tag.value[key]) !== 'string') {
                throw Error('Tag Name: ' + tag.tagName + ', index: ' + key + ' type is not string');
              }
            }
          }
          break;
      }
    }
  } catch (error) {
    console.error('_checkTypeOfTagValue error: ' + error);
  }
}

module.exports = {
  convertWholeConfig: _convertWholeConfig,
  convertData: _convertData,
  convertDeviceStatus: _convertDeviceStatus,
  convertDeleteConfig: _convertDeleteConfig
};
