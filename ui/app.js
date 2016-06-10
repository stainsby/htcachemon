(function() {

  'use strict';

  var ngApp = angular.module('htcachemon', ['ngRoute', 'ngResource', 'ngAnimate']);


  ngApp.constant('moment', window.moment);
  ngApp.constant('filesize', window.filesize);
  ngApp.constant('db', window.TAFFY());


  ngApp.factory('entries', function($log, $resource, config) {
    var entryPath = config.api.endpoint + '/entries/:url';
    $log.info('API entry path', entryPath);
    return $resource(
      entryPath,
      {},
      {
        actions: {
          get: {method: 'GET', isArray: false},
          delete: {method: 'DELETE'},
        }
      }
    );
  });


  ngApp.controller('MainController', function($log, $resource, $scope, $rootScope, config, moment, filesize, status, entries, db) {

    $scope.moment = moment;
    $scope.filesize = filesize;
    $scope.dataLoaded = false;
    $scope.status = status;
    $scope.urlFilter = '';
    $scope.credits = config.credits;

    function doDatabaseRefresh() {
      $log.info('starting database refresh ...');
      $log.info('  - fetching cache entry stats');
      $scope.dataLoaded = false;
      entries.get().$promise.then(function(entryMap) {
        delete entryMap.$promise;
        delete entryMap.$resolved;
        $log.info('  - got entry stats for', Object.keys(entryMap).length, 'URLs');
        $log.info('  - clearing the database');
        db().remove(true); // clear the database
        $log.info('  - populating the database');
        angular.forEach(entryMap, function(entries, url) {
          angular.forEach(entries, function(entry) {
            entry.url = url;
            db.insert(entry);
          });
        });
        $scope.dataLoaded = true;
        $log.info('... database refresh done');
        doUrlFilter();
      });
    }

    function doUrlFilter() {

      var filter = $scope.urlFilter || '';
      $log.info('applying URL filter: \'' + filter + '\' ...');
      $scope.resultsLoaded = false;
      var results = (filter ? db( { url: { like: filter } } ) : db()).order('url, expiry');
      $log.info('  - found', results.count(), 'results');

      var entries = [];
      var currentUrl;
      var currentEntrySet = [];
      var url;

      function appendEntrySet(entrySet) {
        if (entrySet.length) {
          // find freshest entry
          var freshestExpiry;
          var freshestEntry;
          var purged;
          angular.forEach(entrySet, function(entry) {
            purged = purged || entry.purged;
            var expiry = entry.expiry;
            if (freshestExpiry === undefined || expiry > freshest) {
              freshestExpiry = expiry;
              freshestEntry = entry;
            }
          });
          var fresh = freshestEntry.expiry > Date.now();
          var newSet = {
            url: currentUrl,
            stats: entrySet,
            freshest: freshestEntry,
            fresh: fresh
          };
          if (!purged) {
            entries.push(newSet);
          }
        }
      }
      results.each(function(entry) {
        url = entry.url;
        if (currentUrl !== undefined && url !== currentUrl) {
          appendEntrySet(currentEntrySet);
          currentEntrySet = [];
        }
        currentUrl = url;
        currentEntrySet.push(entry);
      });
      if (currentUrl !== undefined) {
        appendEntrySet(currentEntrySet);
      }

      var totalCount = entries.length;
      var entriesPerPage = $rootScope.search.entriesPerPage;
      var page = 1;
      var entryIndexStart = (page - 1)*entriesPerPage;
      var pageEntryCount = Math.min(totalCount - entryIndexStart, entriesPerPage);
      var lastPage = Math.ceil(totalCount/entriesPerPage);

      $rootScope.search.entries = entries;
      $rootScope.search.totalCount = totalCount;
      $rootScope.search.page = page;
      $rootScope.search.lastPage = lastPage;

      onPagination();

      $log.info('... filtering done');
      $scope.resultsLoaded = true;

    }


    function doPurgeUrl(urlEntry) {
      var url = urlEntry.url;
      $log.info('purging URL: \'' + url + '\' ...');
      entries.delete({url: url}).$promise.then(function() {
        urlEntry.purged = true;
        angular.forEach(urlEntry.stats, function(stat) {
          stat.purged = true;
        });
        $log.info('... purged URL OK:', url);
      });
    }


    function onPagination() {
      var page = $rootScope.search.page;
      var totalCount = $rootScope.search.totalCount;
      var entriesPerPage = $rootScope.search.entriesPerPage;
      var entryIndexStart = (page - 1)*entriesPerPage;
      var pageEntryCount = Math.min(totalCount - entryIndexStart, entriesPerPage);
      $rootScope.search.entryIndexStart = entryIndexStart;
      $rootScope.search.pageEntryCount = pageEntryCount;
      $scope.urlEntries = $rootScope.search.entries.slice(entryIndexStart, entryIndexStart + pageEntryCount);
      $rootScope.entryShowState = {};
    }


    function resetPagination() {
      var totalCount = $rootScope.search.totalCount;
      var entriesPerPage = $rootScope.search.entriesPerPage;
      $rootScope.search.page = 1;
      $rootScope.search.lastPage = Math.ceil(totalCount/entriesPerPage);
      onPagination();
    }


    function pageForward() {
      var page = $rootScope.search.page;
      var lastPage = $rootScope.search.lastPage;
      $rootScope.search.page = page === lastPage ? page : page + 1;
      onPagination();
    }

    function pageBackward() {
      var page = $rootScope.search.page;
      $rootScope.search.page = page === 1 ? page : page - 1;
      onPagination();
    }


    function setEntriesPerPage() {
      $rootScope.search.entriesPerPage = parseInt($rootScope.search.entriesPerPageStr);
      resetPagination();
    }


    $scope.doDatabaseRefresh = doDatabaseRefresh;
    $scope.doUrlFilter = doUrlFilter;
    $scope.doPurgeUrl = doPurgeUrl;
    $scope.pageForward = pageForward;
    $scope.pageBackward = pageBackward;
    $scope.setEntriesPerPage = setEntriesPerPage;
    $rootScope.search.entriesPerPageStr = '' + $rootScope.search.entriesPerPage;


    doDatabaseRefresh();

  });


  ngApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/main', {
        templateUrl: 'main.html',
        controller: 'MainController'
      }).
      otherwise({
        redirectTo: '/main'
      });
  }]);


  ngApp.run(function($rootScope, $log, config) {
    $log.info('htcachemon web UI running');
    $rootScope.search = {
      entriesPerPage: config.search.entriesPerPage
    };
    $rootScope.entryShowState = {};
  });


})();
