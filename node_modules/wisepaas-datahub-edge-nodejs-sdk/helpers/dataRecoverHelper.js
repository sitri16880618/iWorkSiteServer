'use strict';
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const gzip = require('./gZippedJson');

const _dbFilePath = path.resolve(process.cwd(), './recover.sqlite.db');
let _db = null;

function _init () {
  try {
    if (!_db) {
      _db = new sqlite3.Database(_dbFilePath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, error => {
        if (error) {
          console.error('Establish database error: ' + error);
        }
      });
      _db.serialize(() => {
        _db.run('CREATE TABLE IF NOT EXISTS Data (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, message TEXT NOT NULL)', error => {
          if (error) {
            console.error('Create data table error: ' + error);
            throw error;
          }
        });
        _db.exec('VACUUM');
      });
    }
  } catch (error) {
    console.error('init database function error: ' + error);
  }
}

function _dataAvailable (callback) {
  try {
    let result = false;
    if (!fs.existsSync(_dbFilePath)) {
      return callback(result);
    }
    _db.all('SELECT * FROM Data LIMIT 1', (err, res) => {
      if (err) {
        console.error(err);
        throw err;
      }
      if (res && res.length > 0) {
        result = true;
      }
      callback(result);
    });
  } catch (error) {
    let result = false;
    callback(result);
    console.error('dataAvailable function error: ' + error);
  }
}

function _read (count, callback) {
  try {
    _db.all('SELECT * FROM Data LIMIT @Count', count, (error, row) => {
      if (error) {
        console.error(error);
        throw error;
      }
      let idList = [];
      let messageList = [];
      let resMsg = [];
      row.forEach(x => {
        idList.push(x.id);
        messageList.push(x.message);
      });
      for (let msg of messageList) {
        resMsg.push(gzip.decompressFromBase64String(msg));
      }
      if (idList.length > 0) {
        _db.run(`DELETE FROM Data WHERE id IN (${_queryString(idList)})`, idList, (error) => {
          if (error) console.log(error);
        });
      }
      callback(resMsg);
    });
  } catch (error) {
    console.error('Data recover read function error: ' + error);
  }
}

function _write (message) {
  try {
    _db.serialize(() => {
      _db.run('BEGIN');
      try {
        _db.run('CREATE TABLE IF NOT EXISTS Data (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, message TEXT NOT NULL)', error => {
          if (error) {
            console.error('Create data table error: ' + error);
            throw error;
          }
        });
        if (Array.isArray(message)) {
          for (let msg of message) {
            _writeMsgToDB(msg);
          }
        } else {
          _writeMsgToDB(message);
        }
        _db.run('COMMIT');
      } catch (error) {
        console.error('Insert database error: ', error);
        _db.run('ROLLBACK');
      }
    });
  } catch (error) {
    console.error('Data recover write error: ', error);
    _db.run('ROLLBACK');
  }
}

function _queryString (idList) {
  let res = '';
  for (let i = 0; i < idList.length; i++) {
    res = res + '?';
    if (i !== idList.length - 1) {
      res = res + ',';
    }
  }
  return res;
}

function _writeMsgToDB (msg) {
  let result = gzip.compressToBase64String(msg);
  _db.run('INSERT INTO Data (message) VALUES (@Message)', result, error => {
    if (error) {
      console.error('Insert data to database error: ' + error);
      throw error;
    }
  });
}
// function timeConvert (string) {
//   // let timeNow = Date.now();
//   const time = new Date();
//   const showtime = string + ' ' + time.getSeconds() + ':' + time.getMilliseconds();
//   console.log(showtime);
// }
module.exports = {
  init: _init,
  dataAvailable: _dataAvailable,
  read: _read,
  write: _write
};
