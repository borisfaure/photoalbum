/*jshint browser: true, jquery: true, globalstrict: true*/
/*global images, translations, markdown */
'use strict';
var App = angular.module('App', []);

App.factory(
    'preloader',
    function( $q, $rootScope ) {
        // I manage the preloading of image objects. Accepts an array of image URLs.
        function Preloader( imageLocations ) {
            // I am the image SRC values to preload.
            this.imageLocations = imageLocations;
            // As the images load, we'll need to keep track of the load/error
            // counts when announing the progress on the loading.
            this.imageCount = this.imageLocations.length;
            this.loadCount = 0;
            this.errorCount = 0;
            // I am the possible states that the preloader can be in.
            this.states = {
                PENDING: 1,
                LOADING: 2,
                RESOLVED: 3,
                REJECTED: 4
            };
            // I keep track of the current state of the preloader.
            this.state = this.states.PENDING;
            // When loading the images, a promise will be returned to indicate
            // when the loading has completed (and / or progressed).
            this.deferred = $q.defer();
            this.promise = this.deferred.promise;
        }
        // ---
        // STATIC METHODS.
        // ---
        // I reload the given images [Array] and return a promise. The promise
        // will be resolved with the array of image locations.
        Preloader.preloadImages = function( imageLocations ) {
            var preloader = new Preloader( imageLocations );
            return( preloader.load() );
        };
        // ---
        // INSTANCE METHODS.
        // ---
        Preloader.prototype = {
            // Best practice for "instnceof" operator.
            constructor: Preloader,
            // ---
            // PUBLIC METHODS.
            // ---
            // I determine if the preloader has started loading images yet.
            isInitiated: function isInitiated() {
                return( this.state !== this.states.PENDING );
            },
            // I determine if the preloader has failed to load all of the images.
            isRejected: function isRejected() {
                return( this.state === this.states.REJECTED );
            },
            // I determine if the preloader has successfully loaded all of the images.
            isResolved: function isResolved() {
                return( this.state === this.states.RESOLVED );
            },
            // I initiate the preload of the images. Returns a promise.
            load: function load() {
                // If the images are already loading, return the existing promise.
                if ( this.isInitiated() ) {
                    return( this.promise );
                }
                this.state = this.states.LOADING;
                for ( var i = 0 ; i < this.imageCount ; i++ ) {
                    this.loadImageLocation( this.imageLocations[ i ] );
                }
                // Return the deferred promise for the load event.
                return( this.promise );
            },
            // ---
            // PRIVATE METHODS.
            // ---
            // I handle the load-failure of the given image location.
            handleImageError: function handleImageError( imageLocation ) {
                this.errorCount++;
                // If the preload action has already failed, ignore further action.
                if ( this.isRejected() ) {
                    return;
                }
                this.state = this.states.REJECTED;
                this.deferred.reject( imageLocation );
            },
            // I handle the load-success of the given image location.
            handleImageLoad: function handleImageLoad( imageLocation ) {
                this.loadCount++;
                // If the preload action has already failed, ignore further action.
                if ( this.isRejected() ) {
                    return;
                }
                // Notify the progress of the overall deferred. This is different
                // than Resolving the deferred - you can call notify many times
                // before the ultimate resolution (or rejection) of the deferred.
                this.deferred.notify({
                    percent: Math.ceil( this.loadCount / this.imageCount * 100 ),
                    imageLocation: imageLocation
                });
                // If all of the images have loaded, we can resolve the deferred
                // value that we returned to the calling context.
                if ( this.loadCount === this.imageCount ) {
                    this.state = this.states.RESOLVED;
                    this.deferred.resolve( this.imageLocations );
                }
            },
            // I load the given image location and then wire the load / error
            // events back into the preloader instance.
            // --
            // NOTE: The load/error events trigger a $digest.
            loadImageLocation: function loadImageLocation( imageLocation ) {
                var preloader = this;
                // When it comes to creating the image object, it is critical that
                // we bind the event handlers BEFORE we actually set the image
                // source. Failure to do so will prevent the events from proper
                // triggering in some browsers.
                // --
                // The below removes a dependency on jQuery, based on a comment
                // on Ben Nadel's original blog by user Adriaan:
                // http://www.bennadel.com/members/11887-adriaan.htm
                var image = angular.element( new Image() )
                    .bind('load', function( event ) {
                        // Since the load event is asynchronous, we have to
                        // tell AngularJS that something changed.
                        $rootScope.$apply(
                            function() {
                                preloader.handleImageLoad( event.target.src );
                                // Clean up object reference to help with the
                                // garbage collection in the closure.
                                preloader = image = event = null;
                            }
                        );
                    })
                    .bind('error', function( event ) {
                        // Since the load event is asynchronous, we have to
                        // tell AngularJS that something changed.
                        $rootScope.$apply(
                            function() {
                                preloader.handleImageError( event.target.src );
                                // Clean up object reference to help with the
                                // garbage collection in the closure.
                                preloader = image = event = null;
                            }
                        );
                    })
                    .attr( 'src', imageLocation )
                ;
            }
        };
        // Return the factory instance.
        return( Preloader );
    }
);

App.directive('fullimg', function ($window) {
    return function (scope, element, attrs) {
        var onResize = function () {
            var imgHeight = $(element).data('lh');
            var imgWidth = $(element).data('lw');
            var winHeight = $window.innerHeight;
            var winWidth = $window.innerWidth;
            var ratio = imgHeight / imgWidth;
            var maximiseHeight = true;

            if (imgWidth > 1.8 * imgHeight) {
                // panorama
                var $parent = $(element).parent();
                $parent.addClass("panorama");
                $parent.paver();
            } else {
                maximiseHeight = ((winHeight / ratio) < winWidth);
            }
            if (maximiseHeight) {
                element.css({
                    width: 'auto',
                    height: winHeight + 'px'
                });
            } else {
                element.css({
                    height: 'auto',
                    width: winWidth + 'px'
                });
            }
        };
        var windowElement = angular.element($window);
        windowElement.bind('resize', onResize);
        element.bind('load', function () {
            onResize();
        });
    }
});

var fullpageOptions = {
    anchors: [],
    animateAnchor: false,
    scrollingSpeed: 200
};

var fullpageRebuild = function () {
    if ($.fn.fullpage.destroy) {
        $.fn.fullpage.destroy('all');
    }
    $('#fullpage').fullpage(fullpageOptions);
}


App.controller('MainCtrl',
    function ($scope, $sce, $http, $location, $window, $timeout, preloader) {

    $scope.mode = '/empty.html';
    $scope.thumbs = [];
    $scope.diapos = [];
    var items = [];

    $scope.showOverlays = true;
    $scope.mdPos = null;
    $scope.mdDateStr = '';
    $scope.tplThumbsUrls = {
        img: '/img_thumb.html',
        page: '/page_thumb.html'
    };
    $scope.tplSlidesUrls = {
        img: '/img_slide.html',
        page: '/page_slide.html'
    };

    $scope.legend = $sce.trustAsHtml("");
    $sce.getTrustedHtml($scope.legend);

    var cur_item = null;
    fullpageOptions.afterLoad = function(anchorLink, index) {
        if (index >= 1) {
            $timeout(function(){
                var item = items[index - 1];
                if (item.type == 'img') {
                    item.large = "large/"+item.md5+".jpg";
                    var l = "";
                    if (item.type !== 'page' && item.l) {
                        l = markdown.toHTML(item.l);
                    }
                    $scope.mdPos = item.md.pos;
                    $scope.mdDateStr = item.md.dateStr;
                    l = $sce.trustAsHtml(l);
                    $scope.legend = l;
                    $scope.showOverlays = true;
                } else {
                    $scope.legend = $sce.trustAsHtml("");
                    $scope.mdPos = null;
                    $scope.mdDateStr = '';
                    item.real_content = $sce.trustAsHtml(item.content);
                }
                cur_item = item;
                var imgs = [];
                for ( var i = 0 ; i < 6 ; i++ ) {
                    if (i < items.length) {
                        var item = items[index+i];
                        if (item.type == 'img' && item.preloaded == false) {
                            imgs.push("large/"+item.md5+".jpg")
                            item.preloaded = true;
                        }
                    }
                }
                if (imgs.length > 0) {
                    $timeout(function() {
                        preloader.preloadImages(imgs);
                    });
                }
            });
        }
    };
    fullpageOptions.onLeave = function() {
        if (cur_item) {
            $timeout(function() {
                cur_item.real_content = $sce.trustAsHtml("");
            });
        }
    };

    $scope.displayThumbs = function() {
        if ($.fn.fullpage.destroy) {
            $.fn.fullpage.destroy('all');
        }
        $scope.diapos = [];
        $scope.thumbs = items;
        $scope.mode = '/thumbs.html';
    };

    var displayDiaporama = function(slide) {

        $scope.thumbs = [];
        $scope.diapos = items;
        $scope.mode = '/diaporama.html';
        $scope.$evalAsync(function() {
            $timeout(function() {
                fullpageRebuild();
                if (slide > 0) {
                    if ($.fn.fullpage.silentMoveTo) {
                        $.fn.fullpage.silentMoveTo(slide);
                    }
                }
            });
        });
        window.scrollTo(0,1);

    };

    $scope.toggleOverlays = function() {
        $scope.showOverlays = !$scope.showOverlays;
    }

    $http.get('images.json').then(function(response) {
        angular.forEach(response.data, function(item, i) {
            item.idx = i+1;
            item.toDiapo = function() {
                displayDiaporama(item.idx);
            }
            fullpageOptions.anchors.push('diapo_'+i);
            if (item.md === undefined)
                item.md = {}
            if (item.md.pos == undefined)
                item.md.pos = null;
            if (item.md.dateStr == undefined)
                item.md.dateStr = ''
            item.preloaded = false;

            items.push(item);
        });


        var hash = $location.hash();
        var re = /diapo_(\d+)/i;
        var found = hash.match(re);
        if (found) {
            var slide = parseInt(found[1]) + 1;
            displayDiaporama(slide);
        } else {
            $scope.displayThumbs();
        }
    });
});
