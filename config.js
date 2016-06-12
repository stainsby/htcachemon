module.exports = {
  cacheDir: '/var/cache/apache2/mod_disk_cache',
  cmd: {
    htcacheclean: '/usr/bin/htcacheclean'
  },
  uid: 33, // user: www-data
  dump: {
    timeoutSeconds: 20,
    encoding: 'utf-8'
  },
  stats: {
    cacheTimeSeconds: 10
  },
  http: {
    host: '127.0.0.1',
    port: 6453
  },
  log: {
    level: 'debug'
  }
};
