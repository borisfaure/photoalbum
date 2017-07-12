/*jshint browser: true, jquery: true, globalstrict: true*/
/*global images, translations, markdown */
'use strict';
var App = angular.module('App', []);

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
    function ($scope, $sce, $http, $location, $window, $timeout) {

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
    };

    $scope.toggleOverlays = function() {
        $scope.showOverlays = !$scope.showOverlays;
    }

    $http.get('images.json').then(function(response) {
        $
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
