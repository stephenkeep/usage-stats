'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = require('path');
var os = require('os');
var fs = require('fs');

var UsageStats = function () {
  function UsageStats(trackingId, options) {
    _classCallCheck(this, UsageStats);

    if (!trackingId) throw new Error('a Google Analytics TrackingID is required');
    options = options || {};

    var homePath = require('home-path');
    var cacheDir = path.resolve(homePath(), '.usage-stats');

    this.dir = options.dir || cacheDir;

    this._queuePath = path.resolve(this.dir, 'queue');
    this._disabled = false;
    this._hits = [];
    var ua = 'Mozilla/5.0 ' + this._getOSVersion() + ' Node/' + process.version;

    this._url = {
      debug: options.debugUrl || 'https://www.google-analytics.com/debug/collect',
      batch: options.url || 'https://www.google-analytics.com/batch'
    };

    this._defaults = {
      v: 1,
      tid: trackingId,
      ds: 'app',
      cid: this._getClientId(),
      ua: ua,
      ul: options.lang || process.env.LANG,
      sr: options.sr || this._getScreenResolution(),
      an: options.name || '',
      av: options.version || '',
      cd1: process.version,
      cd2: os.type(),
      cd3: os.release()
    };

    this._requestController = {};
  }

  _createClass(UsageStats, [{
    key: 'start',
    value: function start() {
      if (this._disabled) return this;
      this._sessionStarted = true;
      return this;
    }
  }, {
    key: 'end',
    value: function end() {
      if (this._disabled) return this;
      this._hits[this._hits.length - 1] += '&sc=end';
      return this;
    }
  }, {
    key: 'disable',
    value: function disable() {
      this._disabled = true;
      return this;
    }
  }, {
    key: 'enable',
    value: function enable() {
      this._disabled = false;
      return this;
    }
  }, {
    key: 'event',
    value: function event(category, action, label, value) {
      if (this._disabled) return this;
      if (!(category && action)) throw new Error('category and action required');
      var t = require('typical');
      var form = Object.assign({}, this._defaults, {
        t: 'event',
        ec: category,
        ea: action
      });
      if (this._sessionStarted) {
        form.sc = 'start';
        this._sessionStarted = false;
      }
      if (t.isDefined(label)) form.el = label;
      if (t.isDefined(value)) form.ev = value;
      this._hits.push(postData(form));
      return this;
    }
  }, {
    key: 'screenView',
    value: function screenView(name) {
      if (this._disabled) return this;
      var form = Object.assign({}, this._defaults, {
        t: 'screenview',
        cd: name
      });
      if (this._sessionStarted) {
        form.sc = 'start';
        this._sessionStarted = false;
      }
      this._hits.push(postData(form));
      return this;
    }
  }, {
    key: 'exception',
    value: function exception(description, isFatal) {
      if (this._disabled) return this;
      var form = Object.assign({}, this._defaults, {
        t: 'exception',
        exd: description,
        exf: isFatal ? 1 : 0
      });
      this._hits.push(postData(form));
      return this;
    }
  }, {
    key: 'send',
    value: function send(options) {
      var _this = this;

      if (this._disabled) return Promise.resolve([]);
      options = options || {};

      var toSend = this._dequeue().concat(this._hits);
      this._hits.length = 0;

      var url = require('url');
      var requests = [];

      var reqOptions = url.parse(options.debug ? this._url.debug : this._url.batch);
      reqOptions.method = 'POST';
      reqOptions.headers = {
        'content-type': 'text/plain'
      };
      reqOptions.controller = this._requestController;

      if (options.debug) {
        this._enqueue(toSend);
        return this._request(reqOptions, createHitsPayload(toSend)).then(function (response) {
          return {
            hits: toSend,
            result: JSON.parse(response.data.toString())
          };
        }).catch(function (err) {
          return {
            hits: toSend,
            err: err
          };
        });
      } else {
        var _loop = function _loop() {
          var batch = toSend.splice(0, 20);
          var req = _this._request(reqOptions, createHitsPayload(batch)).then(function (response) {
            if (response.res.statusCode >= 300) {
              throw new Error('Unexpected response');
            } else {
              return response;
            }
          }).catch(function (err) {
            batch = batch.map(function (hit) {
              if (err.name === 'aborted') hit += '&cd4=true';

              hit += '&cd5=true';
              return hit;
            });

            _this._enqueue(batch);
            return {
              err: err
            };
          });
          requests.push(req);
        };

        while (toSend.length && !this._aborted) {
          _loop();
        }
        return Promise.all(requests).then(function (results) {
          if (_this._aborted) {
            toSend = toSend.map(function (hit) {
              hit += '&cd4=true';

              hit += '&cd5=true';
              return hit;
            });
            _this._enqueue(toSend);
            _this._aborted = false;
          }
          return results;
        });
      }
    }
  }, {
    key: 'abort',
    value: function abort() {
      if (this._disabled) return this;
      if (this._requestController && this._requestController.abort) {
        this._aborted = true;
        this._requestController.abort();
      }
      return this;
    }
  }, {
    key: '_getClientId',
    value: function _getClientId() {
      var cid = null;
      var uuid = require('node-uuid');
      var cidPath = path.resolve(this.dir, 'cid');
      try {
        cid = fs.readFileSync(cidPath, 'utf8');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        cid = uuid.v4();
        fs.writeFileSync(cidPath, cid);
      }
      return cid;
    }
  }, {
    key: '_getOSVersion',
    value: function _getOSVersion() {
      var output = null;
      var osVersionPath = path.resolve(this.dir, 'osversion');
      try {
        output = fs.readFileSync(osVersionPath, 'utf8');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        var execSync = require('child_process').execSync;
        if (!execSync) {
          output = 'N/A';
        } else {
          if (os.platform() === 'win32') {
            output = '(Windows NT ' + os.release() + ')';
          } else if (os.platform() === 'darwin') {
            output = '(Macintosh; MAC OS X ' + execSync('sw_vers -productVersion').toString().trim() + '; Node ' + process.version + ')';
          } else if (os.platform() === 'linux') {
            output = '(X11; Linux ' + os.release() + ')';
          }
        }
        fs.writeFileSync(osVersionPath, output);
      }
      return output;
    }
  }, {
    key: '_request',
    value: function _request(reqOptions, data) {
      var request = require('req-then');
      return request(reqOptions, data);
    }
  }, {
    key: '_dequeue',
    value: function _dequeue(count) {
      try {
        var queue = fs.readFileSync(this._queuePath, 'utf8');
        var hits = queue ? queue.trim().split(os.EOL) : [];
        var output = [];
        if (count) {
          output = hits.splice(0, count);
          fs.writeFileSync(this._queuePath, createHitsPayload(hits));
        } else {
          fs.writeFileSync(this._queuePath, '');
          output = hits;
        }
        return output;
      } catch (err) {
        if (err.code === 'ENOENT') {
          return [];
        } else {
          throw err;
        }
      }
    }
  }, {
    key: '_enqueue',
    value: function _enqueue(hits) {
      fs.appendFileSync(this._queuePath, createHitsPayload(hits));
    }
  }, {
    key: '_getScreenResolution',
    value: function _getScreenResolution() {
      return process.stdout.rows && process.stdout.columns ? process.stdout.rows + 'x' + process.stdout.columns : 'N/A';
    }
  }, {
    key: 'dir',
    get: function get() {
      return this._dir;
    },
    set: function set(val) {
      this._dir = val;
      var mkdirp = require('mkdirp');
      mkdirp.sync(this._dir);
    }
  }]);

  return UsageStats;
}();

function postData(form) {
  return Object.keys(form).map(function (key) {
    return key + '=' + encodeURIComponent(form[key]);
  }).join('&');
}

function createHitsPayload(array) {
  var output = array.join(os.EOL);
  if (output) output += os.EOL;
  return output;
}

module.exports = UsageStats;