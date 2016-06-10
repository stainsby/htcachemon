(function() {

  'use strict';


  var CONFIG = {
    api: {
      endpoint: "http://127.0.0.1:6453"
    },
    search: {
      entriesPerPage: 10
    },
    credits: {
      author: {
        name: 'Sustainable Software Pty Ltd',
        url: 'http://www.sustainablesoftware.com.au/'
      }
    }
  };


  var ngApp = angular.module('htcachemon');

  ngApp.constant('config', CONFIG);

})();
