'use strict';
class EdgeConfig {
  constructor () {
    this.node = new NodeConfig();
    return this;
  }
}

class NodeConfig {
  constructor () {
    this.name = '';
    this.description = '';
    this.deviceList = [];
    return this;
  }
}

class DeviceConfig {
  constructor () {
    this.id = '';
    this.name = '';
    this.type = '';
    this.description = '';
    this.retentionPolicyName = '';
    this.analogTagList = [];
    this.discreteTagList = [];
    this.textTagList = [];
    return this;
  }
}

class TagConfig {
  constructor () {
    this.name = '';
  }
}

class AnalogTagConfig extends TagConfig {
  constructor () {
    super();
    // this.name = 'ATag';
    this.description = '';
    this.readOnly = false;
    this.arraySize = 0;
    this.spanHigh = 1000;
    this.spanLow = 0;
    this.engineerUnit = '';
    this.integerDisplayFormat = 4;
    this.fractionDisplayFormat = 2;
    this.scalingType = 0;
    this.scalingFactor1 = 0;
    this.scalingFactor2 = 0;
    return this;
  }
}

class DiscreteTagConfig extends TagConfig {
  constructor () {
    super();
    // this.name = 'DTag';
    this.description = '';
    this.readOnly = false;
    this.arraySize = 0;
    this.state0 = '0';
    this.state1 = '1';
    this.state2 = '';
    this.state3 = '';
    this.state4 = '';
    this.state5 = '';
    this.state6 = '';
    this.state7 = '';
    return this;
  }
}

class TextTagConfig extends TagConfig {
  constructor () {
    super();
    // this.name = 'DTag';
    this.description = '';
    this.readOnly = false;
    this.arraySize = 0;
    return this;
  }
}

module.exports = {
  EdgeConfig,
  NodeConfig,
  DeviceConfig,
  AnalogTagConfig,
  DiscreteTagConfig,
  TextTagConfig
};
