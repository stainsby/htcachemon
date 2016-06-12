module.exports = {
  cacheDir: '/var/cache/apache2/mod_disk_cache', // location of the disk cache
  cmd: {
    htcacheclean: '/usr/bin/htcacheclean' // how to invoke the 'htcacheclean' tool
  },
  uid: 33, // the UID of the user able to run htcache clean on your cache (eg. www-data)
  dump: {
    timeoutSeconds: 20, // wait at most this long for htcacheclean to complete a dump of the stats
    encoding: 'utf-8'
  },
  stats: {
    cacheTimeSeconds: 10 // cache the stats in memory for this long
  },
  http: {  // the server will serve from here
    host: '127.0.0.1',
    port: 6453
  },
  log: {
    level: 'info'
  }
};
