[![view on npm](http://img.shields.io/npm/v/usage-stats.svg)](https://www.npmjs.org/package/usage-stats)
[![npm module downloads](http://img.shields.io/npm/dt/usage-stats.svg)](https://www.npmjs.org/package/usage-stats)
[![Build Status](https://travis-ci.org/75lb/usage-stats.svg?branch=master)](https://travis-ci.org/75lb/usage-stats)
[![Coverage Status](https://coveralls.io/repos/github/75lb/usage-stats/badge.svg?branch=master)](https://coveralls.io/github/75lb/usage-stats?branch=master)
[![Dependency Status](https://david-dm.org/75lb/usage-stats.svg)](https://david-dm.org/75lb/usage-stats)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

# usage-stats

A minimal, offline-friendly [Google Analytics Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/v1/) client for tracking usage statistics in node.js applications.

## Synopsis

### Simple

The most trivial example.

```js
const UsageStats = require('usage-stats')
const usageStats = new UsageStats('UA-98765432-1')

// track a hit on the 'main' screen with 'simple' mode set.
usageStats
  .screenView('main')
  .event('option', 'mode', 'simple')
  .send()
```

### Typical

More realistic usage. 

```js
const UsageStats = require('usage-stats')
const usageStats = new UsageStats('UA-98765432-1', {
  name: 'sick app',
  version: '1.0.0'
})

// start a new session
usageStats.start()

// user sets an option..
usageStats.event('option', 'verbose-level', 'infinite')

try {
  // register a hit on 'encoding mode'
  usageStats.screenView('encoding')
  beginEncoding(options)
} catch (err) {
  // exception tracking
  usageStats.exception(err.message, true)
}

// finished - mark the session as complete
// and send stats (or store until later, if offline).
usageStats.end().send()
```

## List of metrics sent

Beside tracking events, exceptions and screenviews, the follow stats are collected each session.

* [App name](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#an)
* [App version](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#av)
* Operating System version (sent in the UserAgent)
* [Client ID](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#cid) (a random UUID, generated once per OS user and stored)
* [Language](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#ul) (`process.env.LANG`, if set)
* [Screen resolution](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sr) (terminal rows by columns, by default)

### Custom info optionally sent

* Node.js version (sent as a Custom Dimension)


## API Reference

**Example**  
```js
const UsageStats = require('usage-stats')
```

* [usage-stats](#module_usage-stats)
    * [UsageStats](#exp_module_usage-stats--UsageStats) ⏏
        * [new UsageStats(trackingId, [options])](#new_module_usage-stats--UsageStats_new)
        * [.dir](#module_usage-stats--UsageStats.UsageStats+dir) : <code>string</code>
        * [.defaults](#module_usage-stats--UsageStats.UsageStats+defaults) : <code>Map</code>
        * [.start([sessionParams])](#module_usage-stats--UsageStats+start) ↩︎
        * [.end()](#module_usage-stats--UsageStats+end) ↩︎
        * [.disable()](#module_usage-stats--UsageStats+disable) ↩︎
        * [.enable()](#module_usage-stats--UsageStats+enable) ↩︎
        * [.event(category, action, [options])](#module_usage-stats--UsageStats+event) ↩︎
        * [.screenView(name, [options])](#module_usage-stats--UsageStats+screenView) ↩︎
        * [.exception(description, isFatal)](#module_usage-stats--UsageStats+exception) ↩︎
        * [.send([options])](#module_usage-stats--UsageStats+send) ⇒ <code>Promise</code>
        * [.abort()](#module_usage-stats--UsageStats+abort) ↩︎
        * [.save()](#module_usage-stats--UsageStats+save) ↩︎
        * [.hitsQueued()](#module_usage-stats--UsageStats+hitsQueued) ⇒ <code>number</code>

<a name="exp_module_usage-stats--UsageStats"></a>

### UsageStats ⏏
**Kind**: Exported class  
<a name="new_module_usage-stats--UsageStats_new"></a>

#### new UsageStats(trackingId, [options])

| Param | Type | Description |
| --- | --- | --- |
| trackingId | <code>string</code> | Google Analytics tracking ID (required). |
| [options] | <code>object</code> |  |
| [options.name] | <code>string</code> | App name |
| [options.version] | <code>string</code> | App version |
| [options.lang] | <code>string</code> | Language. Defaults to `process.env.LANG`. |
| [options.sr] | <code>string</code> | Screen resolution. Defaults to `${process.stdout.rows}x${process.stdout.columns}`. |
| [options.ua] | <code>string</code> | User Agent string to use. |
| [options.dir] | <code>string</code> | Path of the directory used for persisting clientID and queue. |
| [options.url] | <code>string</code> | Defaults to `'https://www.google-analytics.com/batch'`. |
| [options.debugUrl] | <code>string</code> | Defaults to `'https://www.google-analytics.com/debug/collect'`. |

**Example**  
```js
const usageStats = new UsageStats('UA-98765432-1', {
  name: 'sick app',
  version: '1.0.0'
})
```
<a name="module_usage-stats--UsageStats.UsageStats+dir"></a>

#### usageStats.dir : <code>string</code>
Cache directory where the queue and client ID is kept. Defaults to `~/.usage-stats`.

**Kind**: instance property of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
<a name="module_usage-stats--UsageStats.UsageStats+defaults"></a>

#### usageStats.defaults : <code>Map</code>
Set parameters on this map to send them with every hit.

**Kind**: instance property of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
<a name="module_usage-stats--UsageStats+start"></a>

#### usageStats.start([sessionParams]) ↩︎
Starts the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  

| Param | Type | Description |
| --- | --- | --- |
| [sessionParams] | <code>Array.&lt;Map&gt;</code> | An option map of paramaters to send with each hit in the sesison. |

<a name="module_usage-stats--UsageStats+end"></a>

#### usageStats.end() ↩︎
Ends the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  
<a name="module_usage-stats--UsageStats+disable"></a>

#### usageStats.disable() ↩︎
Disable the module. While disabled, all operations are no-ops.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  
<a name="module_usage-stats--UsageStats+enable"></a>

#### usageStats.enable() ↩︎
Re-enable the module.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  
<a name="module_usage-stats--UsageStats+event"></a>

#### usageStats.event(category, action, [options]) ↩︎
Track an event. All event hits are queued until `.send()` is called.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  

| Param | Type | Description |
| --- | --- | --- |
| category | <code>string</code> | Event category (required). |
| action | <code>string</code> | Event action (required). |
| [options] | <code>option</code> |  |
| [options.label] | <code>string</code> | Event label |
| [options.value] | <code>string</code> | Event value |
| [options.hitParams] | <code>Array.&lt;map&gt;</code> | One or more additional params to send with the hit. |

<a name="module_usage-stats--UsageStats+screenView"></a>

#### usageStats.screenView(name, [options]) ↩︎
Track a screenview. All screenview hits are queued until `.send()` is called.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Screen name |
| [options] | <code>object</code> |  |
| [options.hitParams] | <code>Array.&lt;map&gt;</code> | One or more additional params to set on the hit. |

<a name="module_usage-stats--UsageStats+exception"></a>

#### usageStats.exception(description, isFatal) ↩︎
Track a exception. All exception hits are queued until `.send()` is called.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  

| Param | Type | Description |
| --- | --- | --- |
| description | <code>string</code> | Error message |
| isFatal | <code>boolean</code> | Set true if the exception was fatal |
| [options.hitParams] | <code>Array.&lt;map&gt;</code> | One or more additional params to set on the hit. |

<a name="module_usage-stats--UsageStats+send"></a>

#### usageStats.send([options]) ⇒ <code>Promise</code>
Send queued stats using as few requests as possible (typically a single request - a max of 20 events/screenviews may be sent per request). If offline, the stats will be stored and re-tried on next invocation.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Fulfil**: `response[]` - array of responses  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>object</code> |  |
| [options.debug] | <code>boolean</code> | [Validates hits](https://developers.google.com/analytics/devguides/collection/protocol/v1/validating-hits), fulfilling with the result. |

<a name="module_usage-stats--UsageStats+abort"></a>

#### usageStats.abort() ↩︎
Aborts the in-progress .send() operation, queuing any unsent hits.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  
<a name="module_usage-stats--UsageStats+save"></a>

#### usageStats.save() ↩︎
Dumps unsent hits to the queue. They will dequeued and sent on next invocation of `.send()`.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  
<a name="module_usage-stats--UsageStats+hitsQueued"></a>

#### usageStats.hitsQueued() ⇒ <code>number</code>
Return the total hits stored on the queue.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  

* * *

&copy; 2016 Lloyd Brookes \<75pound@gmail.com\>. Documented by [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown).
