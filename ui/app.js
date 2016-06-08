(function() {

  'use strict';

  var ngApp = angular.module('htcachemon', ['ngRoute', 'ngResource', 'ngAnimate']);


  ngApp.constant('moment', window.moment);
  ngApp.constant('filesize', window.filesize);
  ngApp.constant('taffy', window.TAFFY);


  ngApp.factory('Entries', function($log, $resource, config) {
    var entryPath = config.api.endpoint + '/entries';
    $log.info('API entry path', entryPath);
    return $resource(entryPath);
  });


  ngApp.controller('MainController', function($log, $resource, $scope, moment, filesize, status, Entries) {
    $scope.moment = moment;
    $scope.filesize = filesize;
    $scope.loaded = false;
    $scope.status = status;
    Entries.get(
      {},
      function success(entries) {
        $scope.loaded = true;
        $scope.entries = entries;
        var urls = Object.keys(entries).length;
        $log.debug('fetched cache entries OK, unpacking entries for', urls.length, 'URLs');
        // $.each(urls, functiomn(idx, entries))
      },
      function failure(err) {
        $log.error('ERROR:', err);
      }
    );
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


  ngApp.run(function($rootScope, $log) {
    $log.info('htcachemon running');
    $rootScope.db = null;
  });


})();
