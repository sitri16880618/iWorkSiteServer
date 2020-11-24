'use strict';
const BaseMessage = require('./BaseMessage');
const edgeEnum = require('../../common/enum');

class DObject {
  constructor () {
    this.Action = edgeEnum.actionType.create;
    this.Scada = {};
    return this;
  }
}

class ConfigMessage extends BaseMessage {
  constructor () {
    super();
    this.d = new DObject();
    return this;
  }
}

class NodeObject {
  constructor (nodeId, nodeConfig, heartBeat) {
    this.Id = nodeId;
    this.Name = nodeConfig.node.name;
    if (nodeConfig.node.description) {
      this.Desc = nodeConfig.node.description;
    }
    this.Hbt = heartBeat / 1000;
    this.Type = edgeEnum.nodeConfigType.node;// 這是固定的?
    this.Device = {};
    return this;
  }
}

class DeviceObject {
  constructor (deviceConfig) {
    this.Name = deviceConfig.name;
    this.Type = deviceConfig.type;
    if (deviceConfig.description) {
      this.Desc = deviceConfig.description;
    }
    if (deviceConfig.retentionPolicyName) {
      this.RP = deviceConfig.retentionPolicyName;
    }
    this.Tag = {};
    return this;
  }
}

class TagObject {
  constructor (tagType, tagConfig) {
    this.Type = tagType;
    this.Desc = tagConfig && tagConfig.description ? tagConfig.description : '';
    this.RO = tagConfig && tagConfig.readOnly ? 1 : 0;
    this.Ary = tagConfig && tagConfig.arraySize ? tagConfig.arraySize : 0;
  }
}

class AnalogTagObject extends TagObject {
  constructor (analogConfig) {
    super(edgeEnum.tagType.analog, analogConfig);
    this.SH = analogConfig && analogConfig.spanHigh ? analogConfig.spanHigh : 1000;
    this.SL = analogConfig && analogConfig.spanLow ? analogConfig.spanLow : 0;
    this.EU = analogConfig && analogConfig.engineerUnit ? analogConfig.engineerUnit : '';
    this.IDF = analogConfig && analogConfig.integerDisplayFormat ? analogConfig.integerDisplayFormat : 4;
    this.FDF = analogConfig && analogConfig.fractionDisplayFormat ? analogConfig.fractionDisplayFormat : 2;
    this.SCALE = analogConfig && analogConfig.scalingType ? analogConfig.scalingType : 0;
    this.SF1 = analogConfig && analogConfig.scalingFactor1 ? analogConfig.scalingFactor1 : 0;
    this.SF2 = analogConfig && analogConfig.scalingFactor2 ? analogConfig.scalingFactor2 : 0;
    return this;
  }
}

class DiscreteTagObject extends TagObject {
  constructor (discreteConfig) {
    super(edgeEnum.tagType.discrete, discreteConfig);
    if (discreteConfig && discreteConfig.state0 !== '') this.S0 = discreteConfig.state0;
    if (discreteConfig && discreteConfig.state1 !== '') this.S1 = discreteConfig.state1;
    if (discreteConfig && discreteConfig.state2 !== '') this.S2 = discreteConfig.state2;
    if (discreteConfig && discreteConfig.state3 !== '') this.S3 = discreteConfig.state3;
    if (discreteConfig && discreteConfig.state4 !== '') this.S4 = discreteConfig.state4;
    if (discreteConfig && discreteConfig.state5 !== '') this.S5 = discreteConfig.state5;
    if (discreteConfig && discreteConfig.state6 !== '') this.S6 = discreteConfig.state6;
    if (discreteConfig && discreteConfig.state7 !== '') this.S7 = discreteConfig.state7;
    return this;
  }
}

class TextTagObject extends TagObject {
  constructor (textConfig) {
    super(edgeEnum.tagType.text, textConfig);

    return this;
  }
}

module.exports = {
  ConfigMessage,
  NodeObject,
  DeviceObject,
  AnalogTagObject,
  DiscreteTagObject,
  TextTagObject
};
