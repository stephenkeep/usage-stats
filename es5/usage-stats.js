'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var request = require('req-then');
var url = require('url');
var path = require('path');
var os = require('os');
var fs = require('fs');
var reqOptions = url.parse('http://www.google-analytics.com/batch');
reqOptions.method = 'POST';

var UsageStats = function () {
  function UsageStats(options) {
    _classCallCheck(this, UsageStats);

    options = options || {};
    this._dir = path.resolve(os.tmpdir(), 'usage-stats');
    this._queuePath = path.resolve(this._dir, 'queue');
    this._appName = options.appName;
    this._version = options.version;
    this._disabled = false;
    this._readClientId();
    this._defaults = {
      v: 1,
      tid: options.tid,
      cid: this._cid,
      ds: 'app',
      ul: process.env.LANG,
      ua: 'jsdoc2md/' + options.version + ' (' + os.type() + '; ' + os.release() + ')',
      sr: process.stdout.rows + 'x' + process.stdout.columns
    };
    this._hits = [];
  }

  _createClass(UsageStats, [{
    key: 'start',
    value: function start() {
      if (this._disabled) return this;
      this._hits.push({ sc: 'start' });
      return this;
    }
  }, {
    key: 'end',
    value: function end() {
      if (this._disabled) return this;
      this._hits.push({ sc: 'end' });
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
      var t = require('typical');
      var form = Object.assign({}, this._defaults, {
        t: 'event',
        ec: category,
        ea: action
      });
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
        an: this._appName,
        av: this._version,
        aid: process.version,
        cd: name
      });
      this._hits.push(postData(form));
      return this;
    }
  }, {
    key: 'send',
    value: function send() {
      var _this = this;

      if (this._disabled) return this;
      var queued = '';
      try {
        queued = fs.readFileSync(this._queuePath, 'utf8');
        fs.unlinkSync(this._queuePath);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      var lines = queued ? queued.trim().split('\n').concat(this._hits) : this._hits.slice(0);
      this._hits.length = 0;

      var _loop = function _loop() {
        var batch = lines.splice(0, 5).join('\n') + '\n';
        request(reqOptions, batch).catch(function (err) {
          try {
            fs.appendFileSync(_this._queuePath, batch);
          } catch (err) {
            if (err.code !== 'ENOENT') throw err;
            try {
              fs.mkdirSync(_this._dir);
            } catch (err) {}
            fs.appendFileSync(_this._queuePath, batch);
          }
        });
      };

      while (lines.length) {
        _loop();
      }
      return this;
    }
  }, {
    key: '_readClientId',
    value: function _readClientId() {
      if (!this._cid) {
        var uuid = require('node-uuid');
        var cidPath = path.resolve(this._dir, 'cid');
        try {
          this._cid = fs.readFileSync(cidPath, 'utf8');
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
          this._cid = uuid.v4();
          try {
            fs.mkdirSync(this._dir);
          } catch (err) {}
          fs.writeFileSync(cidPath, this._cid);
        }
      }
    }
  }]);

  return UsageStats;
}();

function postData(form) {
  return Object.keys(form).map(function (key) {
    return key + '=' + form[key];
  }).join('&');
}

module.exports = UsageStats;