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
    $scope.loaded = false;
    $scope.status = status;
    $scope.urlFilter = '';

    function doDatabaseRefresh() {
      $log.info('starting database refresh');
      $log.info('fetching cache entry stats');
      entries.get().$promise.then(function(entryMap) {
        delete entryMap.$promise;
        delete entryMap.$resolved;
        $log.info('got entry stats for', Object.keys(entryMap).length, 'URLs');
        $log.info('clearing the database');
        db().remove(true); // clear the database
        $log.info('inserting new data into the database');
        angular.forEach(entryMap, function(entries, url) {
          angular.forEach(entries, function(entry) {
            entry.url = url;
            db.insert(entry);
          });
        });
        $log.info('database refresh done');
        $scope.loaded = true;
        doUrlFilter();
      });
    }

    function doUrlFilter() {
      var filter = $scope.urlFilter.trim();
      $log.info('applying URL filter:', filter);
      $scope.loaded = false;
      var results = (filter ? db( { url: { like: filter } } ) : db()).order('url, expiry');
      $log.info('found', results.count(), 'results');
      var entries = [];
      var currentUrl;
      var currentEntrySet = [];
      var url;
      results.each(function(entry) {
        url = entry.url;
        // delete entry.url;
        if (currentUrl !== undefined && url !== currentUrl) {
          entries.push({ url: currentUrl, stats: currentEntrySet });
          currentEntrySet = [];
        }
        currentUrl = url;
        currentEntrySet.push(entry);
      });
      entries.push({ url: currentUrl, stats: currentEntrySet }); // don't forget the last set!

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

      $scope.loaded = true;

    }


    function doPurgeUrl(url) {
      $log.info('purging URL:', url);
      entries.delete({url: url}).$promise.then(function() {
        $log.info('purging URL OK:', url);
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

    $scope.doDatabaseRefresh = doDatabaseRefresh;
    $scope.doUrlFilter = doUrlFilter;
    $scope.doPurgeUrl = doPurgeUrl;
    $scope.pageForward = pageForward;
    $scope.pageBackward = pageBackward;
    
    doDatabaseRefresh();

  });


  ngApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/main', {
        templateUrl: 'partials/main.html',
        controller: 'MainController'
      }).
      otherwise({
        redirectTo: '/main'
      });
  }]);


  ngApp.run(function($rootScope, $log, config) {
    $log.info('htcachemon running');
    $rootScope.search = {
      entriesPerPage: config.search.entriesPerPage
    };
    $rootScope.entryShowState = {};
  });


})();
