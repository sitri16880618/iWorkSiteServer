'use strict';
const EdgeAgent = require('./EdgeAgent');
const edgeConfig = require('./model/edge/EdgeConfig');
const edgeData = require('./model/edge/EdgeData');
const edgeDeviceStatus = require('./model/edge/EdgeDeviceStatus');
const edgeEnum = require('./common/enum');

module.exports = {
  EdgeAgent,
  EdgeConfig: edgeConfig.EdgeConfig,
  NodeConfig: edgeConfig.NodeConfig,
  DeviceConfig: edgeConfig.DeviceConfig,
  AnalogTagConfig: edgeConfig.AnalogTagConfig,
  DiscreteTagConfig: edgeConfig.DiscreteTagConfig,
  TextTagConfig: edgeConfig.TextTagConfig,
  EdgeData: edgeData.EdgeData,
  EdgeDataTag: edgeData.EdgeDataTag,
  EdgeDeviceStatus: edgeDeviceStatus.EdgeDeviceStatus,
  DeviceStatus: edgeDeviceStatus.DeviceStatus,
  constant: edgeEnum
};
