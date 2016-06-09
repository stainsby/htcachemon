(function() {

  'use strict';


  var CONFIG = {
    api: {
      endpoint: "http://127.0.0.1:6453"
    },
    search: {
      entriesPerPage: 4
    }
  };


  var ngApp = angular.module('htcachemon');

  ngApp.constant('config', CONFIG);

})();
