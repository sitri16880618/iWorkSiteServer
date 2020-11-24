'use strict';
class TimeSyncCommand {
  constructor () {
    this.UTCTime = Date.now();
    return this;
  }
}

module.exports = TimeSyncCommand;
