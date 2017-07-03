/*jshint browser: true, jquery: true, globalstrict: true*/
/*global images, translations, markdown */
'use strict';



//var totalImages = 0;
//var isDisplayingThumbnails = true;
//
//var title;
//var intervalId = null;
//var img;
//
//var changeHistory = function (order) {
//    var newTitle;
//
//    if (order === undefined) {
//        newTitle = title;
//        order = 0;
//    } else {
//        newTitle = title + ' - ' + order + '/' + totalImages;
//    }
//    $('title').text(newTitle);
//
//    if (!window.history.pushState) {
//        return;
//    }
//
//    var hash = '#' + order;
//    if (window.location.hash !== hash) {
//        history.pushState({order: order}, newTitle, hash);
//    }
//};
//
//var backToThumbs = function (md5) {
//    if (intervalId) {
//        clearInterval(intervalId);
//        intervalId = null;
//    }
//    var $diaporama = $('#diaporama');
//    $diaporama.empty();
//    changeHistory();
//    isDisplayingThumbnails = true;
//    $('.thumb').show();
//    updateThumbs();
//    if (md5) {
//        var offset = $('#'+md5).offset();
//        $('body,html').animate({
//            scrollTop: offset.top
//        }, 500);
//    } else {
//        $('#thumbs li img:in-viewport').each(function() {
//            var $t = $(this);
//            $t.prop('src', 'thumb/' + $t.prop('id') + '.jpg');
//        });
//    }
//};
//
//var _ = function (str) {
//    return translations[str] || str;
//};
//
//var setupDiaporama = function (order) {
//    var checkOrder;
//    var resizeFn;
//    var prevFn;
//    var nextFn;
//
//    var index = order - 1;
//
//    if (intervalId) {
//        clearInterval(intervalId);
//        intervalId = null;
//    }
//
//    $('.thumb').hide();
//    isDisplayingThumbnails = false;
//
//    var $diaporama = $('#diaporama');
//
//    img = images[index];
//
//    $diaporama.detach();
//    $diaporama.empty();
//
//    var $prev = $('<div />', {
//        'class': 'nav',
//        id: 'prev'
//    });
//    $('<div/>', {
//        title: _('Show previous picture')
//    }).tipsy({gravity: 'w'}).appendTo($prev);
//
//
//    var $imgContainer = $('<div />');
//    var $next = $('<div />', {
//        'class': 'nav',
//        id: 'next'
//    });
//    $('<div/>', {
//        title: _('Show next picture')
//    }).tipsy({gravity: 'e'}).appendTo($next);
//
//    var $bottom = $('<div />', {
//        id: 'bottom'
//    });
//    var $toolbar = $('<div />', {
//        id: 'toolbar'
//    });
//    var $thumbs = $('<img />', {
//        src: 'thumbs.png',
//        id: 'thumbstoolbar',
//        width: 32,
//        height: 32,
//        title: _('Show Thumbnails')
//    }).tipsy({gravity: 'e'}).click(function () {
//        $(this).tipsy('hide');
//        backToThumbs(img.md5);
//    }).appendTo($toolbar);
//
//    var $playpause;
//    var pauseDiaporama;
//    var playDiaporama = function () {
//        $playpause.prop('src', 'pause.png');
//        $playpause.prop('title', _('Pause diaporama'));
//        $playpause.off('click');
//        $playpause.on('click', function () {
//            $(this).tipsy('hide');
//            pauseDiaporama();
//        });
//        intervalId = setInterval(nextFn, 3700);
//    };
//    pauseDiaporama = function () {
//        if (intervalId) {
//            clearInterval(intervalId);
//            intervalId = null;
//        }
//        $playpause.prop('src', 'play.png');
//        $playpause.prop('title', _('Play diaporama'));
//        $playpause.off('click');
//        $playpause.on('click', function () {
//            $(this).tipsy('hide');
//            playDiaporama();
//        });
//    };
//    $playpause = $('<img />', {
//        width: 32,
//        height: 32,
//        id: 'playpause',
//    }).tipsy({gravity: 'e'}).appendTo($toolbar);
//    pauseDiaporama();
//
//    var renderLegend = function (img) {
//        if (img.md && img.md.pos) {
//            var p = img.md.pos;
//            var $posImg = $('<img />', {
//                'class': 'button other',
//                'width': 32,
//                'height': 32,
//                'src': 'pos.png',
//                'title': _('Show position on a map')
//            }).tipsy({gravity: 'w'});
//            var $posLink = $('<a />', {
//                'class': 'other position',
//                'target': '_blank',
//                'href': 'http://www.openstreetmap.org/?mlat=' + p.lat +
//                    '&mlon=' + p.lon + '#map=14/'+ p.lat + '/' + p.lon
//            });
//            $posImg.appendTo($posLink);
//            $posLink.append(p.lat + ',' + p.lon);
//            $posLink.appendTo($legend);
//        }
//        if (img.md && img.md.dateStr) {
//            $('<img />', {
//                'class': 'other',
//                'width': 32,
//                'height': 32,
//                'src': 'time.png'
//            }).appendTo($legend);
//            $('<label />').text(img.md.dateStr).appendTo($legend);
//        }
//        if (img.l) {
//            var $d = $('<div />').addClass('legend');
//            $d.append(markdown.toHTML(img.l));
//            $legend.append($d);
//        }
//    };
//
//    var $legend = $('<div />', {
//        id: 'legend'
//    });
//
//    $bottom.append($toolbar, $legend);
//
//    $diaporama.append($imgContainer, $prev, $next, $bottom);
//
//    checkOrder = function () {
//        if (order == 1) {
//            $prev.hide();
//        } else {
//            $prev.show();
//        }
//        if (order == totalImages) {
//            $next.hide();
//        } else {
//            $next.show();
//        }
//    };
//
//    var updateImage = function () {
//        img = images[index];
//
//        $diaporama.detach();
//
//        $imgContainer.empty();
//
//        $legend.empty();
//        var resizeFn;
//
//        if (img.type === 'page') {
//            var page = img;
//            var $h1 = $('<h1 />', {
//                text: page.title
//            });
//            var $content = $('<div />', {'id': 'content'});
//            $content.html(page.content);
//            $imgContainer.append($h1, $content);
//            resizeFn = function() {
//                var windowHeight = $(window).height();
//                var newHeight = windowHeight - 15;
//                $prev.height(newHeight);
//                $next.height(newHeight);
//            };
//        } else {
//            var $fullLink = $('<a />', {
//                href: 'full/' + img.md5 + '.jpg'
//            }).appendTo($imgContainer);
//            var $img = $('<img />', {
//                src: 'large/' + img.md5 + '.jpg',
//                id: 'main'
//            }).appendTo($fullLink);
//
//
//            resizeFn = function() {
//                var img = images[index];
//                var legendHeight = $legend.height();
//                var windowHeight = $(window).height();
//                var windowWidth= $(window).width();
//                var newHeight = windowHeight - legendHeight - 15;
//                var factor = img.l_h / newHeight;
//                var imgWidth = img.l_w / factor;
//                if (imgWidth > windowWidth) {
//                    if (imgWidth * 0.8 <= windowWidth) {
//                        factor = img.l_w / (windowWidth - 10);
//                        newHeight = img.l_h / factor;
//                    } else {
//                        newHeight -= 12; /* take the scrollar into account */
//                    }
//                }
//                $img.height(newHeight);
//                $prev.height(newHeight);
//                $next.height(newHeight);
//            };
//
//            renderLegend(img);
//        }
//
//        checkOrder();
//        $('body').append($diaporama);
//        $(window).resize(resizeFn);
//        resizeFn();
//        changeHistory(order);
//    };
//
//    prevFn = function() {
//        order--;
//        index--;
//        updateImage();
//    };
//    $prev.click(function () {
//        $(this).children(':first').tipsy('hide');
//        pauseDiaporama();
//        prevFn();
//    });
//    nextFn = function() {
//        order++;
//        index++;
//        updateImage();
//    };
//    $next.click(function () {
//        $(this).children(':first').tipsy('hide');
//        pauseDiaporama();
//        nextFn();
//    });
//
//    updateImage();
//    changeHistory(order);
//};
//
//var renderThumbImg = function (img, $children, i) {
//    var $img;
//    var $li;
//    var $child = $($children[i]);
//    var order = i + 1;
//    /* TODO: when are we in that case?*/
//    if ($child.length) {
//        $img = $($child.children()[0]);
//        $img.prop('id', img.md5);
//        $img.prop('src', '');
//        $img.prop('width', img.th_w);
//        $img.prop('height', img.th_h);
//        $img.prop('alt', img.l);
//    } else {
//        $li = $('<li />');
//        $img = $('<img />', {
//            id: img.md5,
//            src: '',
//            width: img.th_w,
//            height: img.th_h,
//            alt: img.l
//        }).click(function() {
//            setupDiaporama(order);
//        });
//        $img.appendTo($li);
//    }
//    return $li;
//};
//
//var renderThumbPage = function (page, $children, i) {
//    var $page;
//    var $li;
//    var $child = $($children[i]);
//    var order = i + 1;
//    $li = $('<li />');
//    $page = $('<span/>', {
//        'id': page.md5,
//        'text': page.title
//    }).click(function() {
//        setupDiaporama(order);
//    });
//    $page.appendTo($li);
//    return $li;
//};
//
//var updateThumbs = function (newJson) {
//    var $thumbs = $('#thumbs');
//    var $children = $thumbs.children();
//    var ul = [];
//    var i;
//    var m = images.length;
//    if ($children.length == m)
//        return;
//    for (i = 0; i < m; i++) {
//        (function(){
//            var img = images[i];
//            var $li;
//            if (img.type === 'page') {
//                $li = renderThumbPage(img, $children, i);
//            } else {
//                $li = renderThumbImg(img, $children, i);
//            }
//            ul.push($li);
//        })();
//    }
//
//    $('#thumbs').append(ul);
//};
//
//$(document).ready(function() {
//    title = $('title').text();
//
//    $("#loading").remove();
//    totalImages = images.length;
//
//    if (window.location.hash) {
//        var hash = parseInt(window.location.hash.substr(1), 10);
//        if (isNaN(hash) || hash <= 0) {
//            updateThumbs();
//        } else {
//            setupDiaporama(hash);
//        }
//    } else {
//        updateThumbs();
//    }
//
//
//    $(window).on('popstate', function(ev) {
//        var state = (ev.originalEvent) ? ev.originalEvent.state : ev.state;
//        if (state) {
//            if (state.order > 0) {
//                setupDiaporama(state.order);
//            } else {
//                if (img) {
//                    backToThumbs(img.md5);
//                } else {
//                    backToThumbs();
//                }
//            }
//        } else {
//            if (window.location.hash) {
//                var hash = parseInt(window.location.hash.substr(1), 10);
//                if (isNaN(hash) || hash <= 0) {
//                    backToThumbs();
//                } else {
//                    setupDiaporama(hash);
//                }
//            } else {
//                backToThumbs();
//            }
//        }
//    });
//
//    var onScroll = function (ev) {
//        if (!isDisplayingThumbnails) {
//            return;
//        }
//        $('#thumbs li img:in-viewport').each(function() {
//            var $t = $(this);
//            $t.prop('src', 'thumb/' + $t.prop('id') + '.jpg');
//        });
//    };
//    $(window).scroll(onScroll);
//    onScroll();
//
//
//});



var App = angular.module('App', ['fullPage.js']);

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

App.controller('MainCtrl',
    function ($scope, $sce, $http, $location, $window, $timeout) {

    $scope.tplUrls = {
        img: '/img_thumb.html',
        page: '/page_thumb.html'
    };

    $scope.mode = '/empty.html';
    $scope.thumbs = [];
    $scope.diapos = [];
    var items = [];

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
    $scope.trustAsHtml = function (x) {
        return $sce.trustAsHtml("<pre>lolol</pre>");
    };

    $scope.legend = $sce.trustAsHtml("");
    $sce.getTrustedHtml($scope.legend);

    var displayThumbs = function() {
        if ($.fn.fullpage.destroy) {
            $.fn.fullpage.destroy('all');
        }
        $scope.diapos = [];
        $scope.thumbs = items;
        $scope.mode = '/thumbs.html';
    };

    $scope.fullpageOptions = {
        anchors: [],
        afterLoad: function(anchorLink, index) {
            if (index >= 1) {
                $timeout(function(){
                    var item = items[index - 1];
                    if (item.type == 'img')
                        item.large = "large/"+item.md5+".jpg";
                    var l = "";
                    if (item.type !== 'page' && item.l) {
                        l = markdown.toHTML(item.l);
                    }
                    $scope.mdPos = item.md.pos;
                    $scope.mdDateStr = item.md.dateStr;
                    l = $sce.trustAsHtml(l);
                    $scope.legend = l;
                });
            }
        },
        onLeave: function() {
        },
        animateAnchor: false,
        scrollingSpeed: 200
    };


    var displayDiaporama = function(slide) {

        $scope.thumbs = [];
        $scope.diapos = items;
        $scope.mode = '/diaporama.html';
        $timeout(function() {
            if (slide > 0) {
                $.fn.fullpage.silentMoveTo(slide);
            }
        });
    };

    $http.get('images.json').then(function(response) {
        angular.forEach(response.data, function(item, i) {
            item.idx = i;
            item.toDiapo = function() {
                displayDiaporama(item.idx);
            }
            $scope.fullpageOptions.anchors.push('diapo_'+i);
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
            displayThumbs();
        }
    });
});
