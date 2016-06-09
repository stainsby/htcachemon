(function () { 'use strict';

const config = require('./config');
const pkgConfig = require('./package');
const spawnSync = require('child_process').spawnSync;
var restify = require('restify');

config.package = pkgConfig;

const DUMP_LINE_PARTS_COUNT = 11;


const logLevel = config.log.level || 'info';
function _stringifyArgs(args) {
  return args.map(x => '' + x).join(' ');
}
function logDebug(msg, ...args) {
  if (logLevel === 'info' || logLevel === 'warn' || logLevel == 'error') { return; }
  console.log('DEBUG:', msg, _stringifyArgs(args));
}
function logInfo(msg, ...args) {
  if (logLevel === 'warn' || logLevel == 'error') { return; }
  console.log('INFO:', msg, _stringifyArgs(args));
}
function logWarn(msg, ...args) {
  if (logLevel === 'error') { return; }
  console.log('WARNING:', msg, _stringifyArgs(args));
}
function logError(msg, ...args) {
  console.log('ERROR:', msg, _stringifyArgs(args));
}


function parseDumpTimestamp(timestampStr) {
  return Math.floor(parseInt(timestampStr/1000)); // timestamp integer in milliseconds
}


function parseDumpBoolean(booleanStr) {
  return parseInt(booleanStr) && true || false;
}


function parseDumpEntryLine(line) {

  const parts = line.split(' ').map(part => part.trim()).filter(part => part.length);
  
  if (parts.length < DUMP_LINE_PARTS_COUNT) {
    logWarn('incorrect number of parts (' + parts.length + ') for entry line: {$line} .. skipping:',  line);
    return null;
  }

  // if there are too many parts, we assume the URL has spaces so we concatenate those parts
  const urlPartsCount = 1 + parts.length - DUMP_LINE_PARTS_COUNT;
  const urlParts = [];
  var urlPartsLeft = urlPartsCount;
  while (urlPartsLeft > 0) {
    urlPartsLeft--;
    urlParts.push(parts.shift());
  }
  const url = urlParts.join(' ');

  return {
    url: url,
    headerSize: parseInt(parts[0]),
    bodySize: parseInt(parts[1]),
    status: parseInt(parts[2]),
    entityVersion: parseInt(parts[3]),
    date: parseDumpTimestamp(parts[4]),
    expiry: parseDumpTimestamp(parts[5]),
    requestTime: parseDumpTimestamp(parts[6]),
    responseTime: parseDumpTimestamp(parts[7]),
    bodyPresent: parseDumpBoolean(parts[8]),
    headRequest: parseDumpBoolean(parts[9])
  };
}


const HTCACHECLEAN_SPAWN_OPTIONS = {
    uid: config.uid,
    timeout: config.dump.timeoutSeconds*1000,
    encoding: config.dump.encoding
};


function fetchCacheStats() {
  
  const dumpResult = spawnSync(
    config.cmd.htcacheclean,
    ['-p', config.cacheDir, '-A'],
    HTCACHECLEAN_SPAWN_OPTIONS
  );

  if (dumpResult.status !== 0) {
    logError('dump failed: ', dumpResult.stderr);
    return [];
  }
  const cacheEntries = dumpResult.stdout.split('\n')
    .map(line => line.trim())
    .filter(line => line.length)
    .map(parseDumpEntryLine)
    .filter(entry => entry)
    ;
  // logDebug('cache entries:', JSON.stringify(cacheEntries, true, 4));

  return cacheEntries;
}


let cacheStats = null;
let cacheEntriesUntil = 0; // timestamp in millisecods to cache entries until


function httpGetEntries(req, res, next) {

  logDebug(`refresh cache if ${Date.now()} > ${cacheEntriesUntil}`);
  if (Date.now() > cacheEntriesUntil) {
    logDebug('fetching new stats');
    const entries = fetchCacheStats();
    if (entries === null) {
      cacheStats = null;
    } else {
      logInfo(`found ${entries.length} cache entries`);
      cacheStats = {};
      for (const entry of entries) {
        const url = entry.url;
        delete(entry.url);
        if (!cacheStats[url]) {
          cacheStats[url] = [];
        }
        cacheStats[url].push(entry);
      }
    }
    cacheEntriesUntil = Date.now() + config.stats.cacheTimeSeconds*1000;
  } else {
    logDebug('using cached stats');
  }

  if (cacheStats) {
    res.send(cacheStats);
    return next();
  } else {
    return next(new restify.ConflictError('entries are missing'));
  }
}


function httpDeleteEntry(url, req, res, next) {

  logInfo('deleting entries for URL: ', url);
  const deleteResult = spawnSync(
    config.cmd.htcacheclean,
    ['-p', config.cacheDir, url],
    HTCACHECLEAN_SPAWN_OPTIONS
  );

  cacheEntriesUntil = 0; // invalidate the cache

  const status = deleteResult.status;
  const failed = status !== 0 && status !== 2;
  if (failed) {
    logError('delete failed: ', deleteResult.stderr);
    return next(new Error('delete failed'));
  }

  const deleted = status === 0;
  logInfo(deleted ? 'deleted ok' : 'not deleted because entry did not exist');
  res.send({deleted: deleted});
  return next();
}


function startServer() {

  var server = restify.createServer();

  server.pre(
    function(req, res, next){
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, DELETE");
      return next();
    }
  );


  server.pre(restify.CORS());
  server.use(restify.fullResponse());

  server.on('uncaughtException', function(req, res, route, error) {
    logError(error);
  });
  
  server.opts('/entries', function(req, res, next) {
    res.send();
    return next();
  });
  server.get('/entries', httpGetEntries);
  server.del('/entries/:url', function(req, res, next) {
    res.setHeader("Access-Control-Allow-Methods", "DELETE");
    const url = decodeURIComponent(req.params.url);
    return httpDeleteEntry(url, req, res, next);
  });
  
  server.listen(config.http.port, config.http.host, function() {
    logInfo(`HTTP service listening at ${server.url}`);
  });

}


logInfo('starting', config.package.name, 'version', config.package.version);
startServer();

})();
