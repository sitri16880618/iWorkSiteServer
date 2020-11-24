'use strict';
class EdgeDataTag {
  constructor () {
    this.deviceId = '';
    this.tagName = '';
    this.value = '';
    return this;
  }
}

class EdgeData {
  constructor () {
    this.tagList = [];
    this.ts = Date.now();
    return this;
  }
}

module.exports = {
  EdgeData,
  EdgeDataTag
};
