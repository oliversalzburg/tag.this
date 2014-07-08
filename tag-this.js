var appModule = angular.module( "TagThisApp", [], function( $locationProvider ) {
  $locationProvider.html5Mode( true );
} );

var stackExchangeAccessToken = "";

function TagThisController( $scope, $location, $http ) {
  // Check if we got an access token through OAuth with the SE API.
  var accessToken = $location.path().match( /\/access_token=(.+)&expires=\d+/ );
  if( accessToken ) {
    $scope.accessToken = stackExchangeAccessToken = accessToken[ 1 ];
    console.log( "Got access token " + stackExchangeAccessToken );
    $location.path("");
  }

  $scope.tag = $location.search()[ "tag" ] || $location.path().substr( 1 ) || "tag-this";

  $scope.sites = {
    stackoverflow : {
      site   : "stackoverflow",
      class  : "stackoverflow",
      domain : "stackoverflow.com"
    },
    serverfault   : {
      site   : "serverfault",
      class  : "serverfault",
      domain : "serverfault.com"
    },
    superuser     : {
      site   : "superuser",
      class  : "superuser",
      domain : "superuser.com"
    },
    meta          : {
      stackoverflow : {
        site   : "meta.stackoverflow",
        class  : "meta stackoverflow",
        domain : "meta.stackoverflow.com"
      },
      serverfault   : {
        site   : "meta.serverfault",
        class  : "meta serverfault",
        domain : "meta.serverfault.com"
      },
      superuser     : {
        site   : "meta.superuser",
        class  : "meta superuser",
        domain : "meta.superuser.com"
      }
    }
  };

  /**
   * Update the path in the URL with the current model.
   */
  $scope.updatePath = function() {
    $location.path( $scope.tag );
  }
}

appModule.factory( "tags", ["$q", "$timeout", "$http", function( $q, $timeout, $http ) {
  // A cache for already retrieved counts.
  var cache = {};
  // A store for promises to retrieve counts.
  var retriever = {};

  function getCount( site, tag ) {
    // Check if we already retrieved the count for that tag.
    if( cache[site] && cache[site][tag] ) {
      return cache[site][tag].promise;
    }
    // Store a deferred in the cache.
    cache[site] = cache[site] || {};
    cache[site][tag] = $q.defer();

    // Cancel existing retrievals
    if( retriever[site] ) {
      $timeout.cancel( retriever[site] );
      delete retriever[site];
    }

    // Construct a retriever that will run after a certain delay (to avoid sending tons of requests while typing).
    var retrieverPromise = $timeout( function() {
      console.log( "Retrieving " + tag + " for " + site );
      var requestUri = "https://api.stackexchange.com/2.2/tags/" + encodeURIComponent( tag ) + "/info?site=" + site;
      if( stackExchangeAccessToken ) {
        requestUri += "&key=1dkkO89fIM9mRiK55gzqQQ((&access_token=" + stackExchangeAccessToken;
      }
      $http.get( requestUri )
        .then( function( response ) {
                 if( response.status != 200 ) {
                   console.log( response );
                   cache[site][tag].reject( response );
                 } else {
                   if( response.data.items && response.data.items.length ) {
                     cache[site][tag].resolve( response.data.items[0].count );
                   } else {
                     cache[site][tag].resolve( 0 );
                   }
                 }
               } );
    }, 3000 );
    // Store the retriever, so it can be cancelled if a new retrieval is queued soon.
    retriever[site] = retrieverPromise;

    return cache[site][tag].promise;
  }

  // Export
  return {
    getCount : getCount
  };
}] );

var abstractTag = {
  restrict : "E",
  require  : "ngModel",
  scope    : {
    ngModel  : "=",
    tag      : "=",
    tagClass : "="
  },
  replace  : true
};
appModule.directive( "chatTag", ["tags", function( tags ) {
  var chatTag = angular.copy( abstractTag );
  chatTag.template = '<span class="tag-container" title="{{count}} questions with this tag">' +
                     '  <img class="favicon" ng-src="http://{{ngModel.domain}}/favicon.ico" width="16">' +
                     '  <a class="tag chat-tag {{ngModel.class}}" href="http://{{ngModel.domain}}/tags/{{tag}}">{{tag}}</a>' +
                     '</span>';

  chatTag.link = function postLink( scope, element, attributes ) {
    scope.$watch( "tag", function( newTag ) {
      if( !newTag ) return;
      tags.getCount( scope.ngModel.site, newTag )
        .then( function( count ) {
                 scope.count = count;
               } );
    } )
  };
  return chatTag;
}] );
appModule.directive( "siteTag", ["tags", function( tags ) {
  var siteTag = angular.copy( abstractTag );
  siteTag.template = '<span class="tag-container" title="{{count}} questions with this tag">' +
                     '  <img class="favicon" ng-src="http://{{ngModel.domain}}/favicon.ico" width="16">' +
                     '  <a class="tag site-tag {{ngModel.class}}" href="http://{{ngModel.domain}}/tags/{{tag}}">{{tag}}</a>' +
                     '</span>';

  siteTag.link = function postLink( scope, element, attributes ) {
    scope.$watch( "tag", function( newTag ) {
      if( !newTag ) return;
      tags.getCount( scope.ngModel.site, newTag )
        .then( function( count ) {
                 scope.count = count;
               } );
    } )
  };
  return siteTag;
}] );