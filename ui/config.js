(function() {

  'use strict';


  var CONFIG = {
    api: {
      endpoint: "http://127.0.0.1:6453" // the server endpoint - if you proxy the server, this should be the proxied endpoint 
    },
    search: {
      entriesPerPage: 10 // default number of entries to show per page; valid values are 10, 25, 500 or 100
    },
    credits: { // remove this to remove the credits from the footer (but we'll be sad if you do!)
      author: {
        name: 'Sustainable Software Pty Ltd', // DO NOT MODIFY
        url: 'http://www.sustainablesoftware.com.au/' // DO NOT MODIFY
      }
    }
  };


  var ngApp = angular.module('htcachemon');

  ngApp.constant('config', CONFIG);

})();
