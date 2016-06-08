(function() {

  'use strict';

  var ngApp = angular.module('htcachemon', ['ngRoute', 'ngResource']);


  ngApp.constant('moment', window.moment);
  ngApp.constant('filesize', window.filesize);


  ngApp.factory('Entries', function($log, $resource, config) {
    var entryPath = config.api.endpoint + '/entries';
    $log.info('API entry path', entryPath);
    return $resource(entryPath);
  });


  ngApp.controller('MainController', function($log, $resource, $scope, moment, filesize, Entries) {
    $scope.moment = moment;
    $scope.filesize = filesize;
    $log.debug('$scope:', $scope);
    Entries.get(
      {},
      function success(entries) {
        $log.debug('fetched entries:', entries);
        $scope.entries = entries;
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
