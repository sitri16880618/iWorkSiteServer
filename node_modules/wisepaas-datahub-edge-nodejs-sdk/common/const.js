'use strict';
const path = require('path');

module.exports = {
  DEAFAULT_DATARECOVER_INTERVAL: 3000,
  DEAFAULT_DATARECOVER_COUNT: 10,
  configFilePath: path.resolve(process.cwd(), './config.json'),
  edgentConfig: '',
  win32: 'win32',
  linux: 'linux',
  macOS: 'darwin',
  base64: 'base64',
  packageSize: 100
};
