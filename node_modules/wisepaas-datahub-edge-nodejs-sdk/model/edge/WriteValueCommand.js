'use strict';
class Device {
  constructor () {
    this.id = '';
    this.tagList = [];
    return {
      id: this.id,
      tagList: this.tagList
    };
  }
}

class Tag {
  constructor () {
    this.name = '';
    this.value = {};
    return {
      name: this.name,
      value: this.value
    };
  }
}

class WriteValueCommand {
  constructor () {
    this.deviceList = [];
    this.ts = Date.now();
    return this;
  }
}

module.exports = {
  WriteValueCommand,
  Device,
  Tag
};
