(function () { 'use strict';

const config = require('./config');
const p = require('child_process');

console.log('## CONFIG:\n', config);
console.log('##\n');


function _stringifyArgs(args) {
  return args.map(x => '' + x).join(' ');
}
function logDebug(msg, ...args) {
  console.log('DEBUG:', msg, _stringifyArgs(args));
}
function logInfo(msg, ...args) {
  console.log('INFO:', msg, _stringifyArgs(args));
}
function logWarn(msg, ...args) {
  console.log('WARNING:', msg, _stringifyArgs(args));
}
function logError(msg, ...args) {
  console.log('ERROR:', msg, _stringifyArgs(args));
}


function parseTimestamp(timestampStr) {
  // return new Date(parseInt(timestampStr/1000));
  return Math.floor(parseInt(timestampStr/1000)); // timestamp integer in milliseconds
}

function parseBoolean(booleanStr) {
  return parseInt(booleanStr) && true || false;
}


function parseEntryLine(line) {
  const parts = line.split(' ').map(part => part.trim()).filter(part => part.length);
  if (parts.length != 11) {
    logWarn(`incorrect number of parts for entry line: {$line}`);
    return null;
  }
  return {
    url: parts[0],
    headerSize: parseInt(parts[1]),
    bodySize: parseInt(parts[2]),
    status: parseInt(parts[3]),
    entityVersion: parseInt(parts[4]),
    date: parseTimestamp(parts[5]),
    expiry: parseTimestamp(parts[6]),
    requestTime: parseTimestamp(parts[7]),
    responseTime: parseTimestamp(parts[8]),
    bodyPresent: parseBoolean(parts[9]),
    headRequest: parseBoolean(parts[10])
  };
}


function dumpCacheStats() {
  
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
    .map(parseEntryLine)
    .filter(entry => entry)
    ;
  logDebug('## cache entries:', JSON.stringify(cacheEntries, true, 2));
}


dumpCacheStats();

})();
