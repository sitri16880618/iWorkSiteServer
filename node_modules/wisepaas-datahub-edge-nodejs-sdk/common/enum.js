'use strict';
module.exports = {
  edgeType: {
    Gateway: 1,
    Device: 2
  },
  connectType: {
    MQTT: 1,
    DCCS: 2
  },
  protocol: {
    TCP: 1,
    WebSocket: 2
  },
  actionType: {
    create: 1,
    update: 2,
    delete: 3,
    delsert: 4
  },
  nodeConfigType: {
    node: 1,
    gateway: 2,
    virtualGroup: 3
  },
  tagType: {
    analog: 1,
    discrete: 2,
    text: 3
  },
  status: {
    offline: 0,
    online: 1
  },
  messageType: {
    writeValue: 0,
    writeConfig: 1,
    timeSync: 2,
    configAck: 3
  }
};
