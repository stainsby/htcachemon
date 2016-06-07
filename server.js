(function () { 'use strict';

const config = require('./config');
const pkgConfig = require('./package');
const p = require('child_process');
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
  // return new Date(parseInt(timestampStr/1000));
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
  // final check: URL must end in '?'
  if (url[url.length - 1] !== '?') {
    logWarn('incorrect URL parsed (' + url + ') .. skipping:',  line);
    return null;
  }

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


function fetchCacheStats() {
  
  // sudo -u www-data /usr/bin/htcacheclean -p /var/cache/apacheCacheTest -A
  const dumpResult = p.spawnSync(
    '/usr/bin/htcacheclean',
    ['-p', config.cacheDir, '-A'],
    {
      uid: config.uid,
      timeout: config.dump.timeoutSeconds*1000,
      encoding: config.dump.encoding
    }
  );

  if (dumpResult.status !== 0) {
    console.log('dump failed: ', dumpResult.stderr);
    return;
  }
  const cacheEntries = dumpResult.stdout.split('\n')
    .map(line => line.trim())
    .filter(line => line.length)
    .map(parseDumpEntryLine)
    .filter(entry => entry)
    ;
  logInfo(`found ${cacheEntries.length} cache entries:`);
  logDebug('## cache entries:', JSON.stringify(cacheEntries, true, 4));
}


logInfo('starting', config.package.name, 'version', config.package.version);
fetchCacheStats();

})();
