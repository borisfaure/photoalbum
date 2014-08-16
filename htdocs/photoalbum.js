/*jshint browser: true, jquery: true, globalstrict: true*/
/*global IMAGES_PER_JSON, translations, markdown */
'use strict';

var totalImages = 0;
var totalImagesDisplayed = 0;
var isDisplayingThumbnails = true;

var title;
var intervalId = null;
var images = [];
var img;

var changeHistory = function (order) {
    var newTitle;

    if (order === undefined) {
        newTitle = title;
        order = 0;
    } else {
        newTitle = title + ' - ' + order + '/' + totalImages;
    }
    $('title').text(newTitle);

    if (!window.history.pushState) {
        return;
    }

    var hash = '#' + order;
    if (window.location.hash !== hash) {
        history.pushState({order: order}, newTitle, hash);
    }
};

var backToThumbs = function (md5) {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    var $diaporama = $('#diaporama');
    $diaporama.empty();
    $('#downloadMore').hide();
    $('#loading').hide();
    changeHistory();
    isDisplayingThumbnails = true;
    if (totalImages != totalImagesDisplayed) {
        $('#thumbs').empty();
        var jsonBoundary = 0;
        var ul = [];
        $.each(images, function(index, img) {
            var order = index + 1;
            var $li = $('<li />');
            var $img;
            if (img) {
                $img = $('<img />', {
                    id: img.md5,
                    src: 'thumb/' + img.md5 + '.jpg',
                    width: img.th_w,
                    height: img.th_h,
                    alt: img.l
                });
            } else {
                if (index > jsonBoundary) {
                    jsonBoundary += IMAGES_PER_JSON;
                    downloadMore(order, updateThumbs);
                }
                $img = $('<img />');
            }
            $img.click(function() {
                setupDiaporama(order);
            });
            $img.appendTo($li);

            ul.push($li);
        });
        $('#thumbs').append(ul);
    }
    $('.thumb').show();
    if (md5) {
        var offset = $('#'+md5).offset();
        $('body,html').animate({
            scrollTop: offset.top
        }, 500);
    }
};

var _ = function (str) {
    return translations[str] || str;
};

var setupDiaporama = function (order) {
    var checkOrder;
    var resizeFn;
    var prevFn;
    var nextFn;

    var index = order - 1;

    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    $('.thumb').hide();
    isDisplayingThumbnails = false;

    var $diaporama = $('#diaporama');

    img = images[index];
    if (!img) {
        var i;
        downloadMore(order, function (newJson) {
            setupDiaporama(order);
            updateThumbs(newJson);
        });
        /* Download missing */
        for (i = 0; i < Math.floor(order / IMAGES_PER_JSON); i++) {
            downloadMore(i * IMAGES_PER_JSON + 1, updateThumbs);
        }
        return;
    }

    $diaporama.detach();
    $diaporama.empty();

    var $prev = $('<div />', {
        'class': 'nav',
        id: 'prev'
    });
    $('<div/>', {
        title: _('Show previous picture')
    }).tipsy({gravity: 'w'}).appendTo($prev);


    var $imgContainer = $('<div />');
    var $fullLink = $('<a />', {
        href: 'full/' + img.md5 + '.jpg'
    }).appendTo($imgContainer);
    var $img = $('<img />', {
        src: 'large/' + img.md5 + '.jpg',
        id: 'main'
    }).appendTo($fullLink);

    var $next = $('<div />', {
        'class': 'nav',
        id: 'next'
    });
    $('<div/>', {
        title: _('Show next picture')
    }).tipsy({gravity: 'e'}).appendTo($next);

    var $bottom = $('<div />', {
        id: 'bottom'
    });
    var $toolbar = $('<div />', {
        id: 'toolbar'
    });
    var $thumbs = $('<img />', {
        src: 'thumbs.png',
        id: 'thumbstoolbar',
        width: 32,
        height: 32,
        title: _('Show Thumbnails')
    }).tipsy({gravity: 'e'}).click(function () {
        $(this).tipsy('hide');
        backToThumbs(img.md5);
    }).appendTo($toolbar);

    var $playpause;
    var pauseDiaporama;
    var playDiaporama = function () {
        $playpause.prop('src', 'pause.png');
        $playpause.prop('title', _('Pause diaporama'));
        $playpause.off('click');
        $playpause.on('click', function () {
            $(this).tipsy('hide');
            pauseDiaporama();
        });
        intervalId = setInterval(nextFn, 3700);
    };
    pauseDiaporama = function () {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        $playpause.prop('src', 'play.png');
        $playpause.prop('title', _('Play diaporama'));
        $playpause.off('click');
        $playpause.on('click', function () {
            $(this).tipsy('hide');
            playDiaporama();
        });
    };
    $playpause = $('<img />', {
        width: 32,
        height: 32,
        id: 'playpause',
    }).tipsy({gravity: 'e'}).appendTo($toolbar);
    pauseDiaporama();

    var renderLegend = function (img) {
        if (img.md && img.md.pos) {
            var p = img.md.pos;
            var $posImg = $('<img />', {
                'class': 'button other',
                'src': 'pos.png',
                'title': _('Show position on a map')
            }).tipsy({gravity: 'w'});
            var $posLink = $('<a />', {
                'class': 'other position',
                'target': '_blank',
                'href': 'http://www.openstreetmap.org/?mlat=' + p.lat +
                    '&mlon=' + p.lon + '#map=14/'+ p.lat + '/' + p.lon
            });
            $posImg.appendTo($posLink);
            $posLink.append(p.lat + ',' + p.lon);
            $posLink.appendTo($legend);
        }
        if (img.md && img.md.dateStr) {
            $('<img />', {
                'class': 'other',
                'src': 'time.png'
            }).appendTo($legend);
            $('<label />').text(img.md.dateStr).appendTo($legend);
        }
        if (img.l) {
            var $d = $('<div />').addClass('legend');
            $d.append(markdown.toHTML(img.l));
            $legend.append($d);
        }
    };

    var $legend = $('<div />', {
        id: 'legend'
    });
    renderLegend(img);
    $bottom.append($toolbar, $legend);

    $diaporama.append($imgContainer, $prev, $next, $bottom);

    $('body').append($diaporama);

    resizeFn = function() {
        var newHeigth = $(window).height() -
            Math.max($bottom.height(), $legend.height()) - 15;
        $('#main').height(newHeigth);
        $prev.height(newHeigth);
        $next.height(newHeigth);
    };

    checkOrder = function () {
        if (order == 1) {
            $prev.hide();
        } else {
            $prev.show();
        }
        if (order == totalImages) {
            $next.hide();
        } else {
            $next.show();
        }
    };

    var updateImage = function () {
        img = images[index];
        if (!img) {
            downloadMore(order, function (newJson) {
                setupDiaporama(order);
                updateThumbs(newJson);
            });
            return;
        }

        $diaporama.detach();

        $img.remove();
        $img = $('<img />', {
            src: 'large/' + img.md5 + '.jpg',
            id: 'main'
        }).appendTo($fullLink);
        $fullLink.prop('href', 'full/' + img.md5 + '.jpg');

        $legend.empty();
        renderLegend(img);

        checkOrder();
        $('body').append($diaporama);
        resizeFn();
        changeHistory(order);
    };

    prevFn = function() {
        order--;
        index--;
        updateImage();
    };
    $prev.click(function () {
        $(this).children(':first').tipsy('hide');
        pauseDiaporama();
        prevFn();
    });
    nextFn = function() {
        order++;
        index++;
        updateImage();
    };
    $next.click(function () {
        $(this).children(':first').tipsy('hide');
        pauseDiaporama();
        nextFn();
    });

    checkOrder();
    $(window).resize(resizeFn);
    resizeFn();
    changeHistory(order);
};


var updateThumbs = function (newJson) {
    var $thumbs = $('#thumbs');
    var $children = $thumbs.children();
    var ul = [];
    var i;
    var m = Math.min(images.length, (newJson + 1) * IMAGES_PER_JSON);
    for (i = 0; i < m; i++) {
        (function(){
            var img = images[i];
            var $img;
            var $li;
            if (img) {
                var $child = $($children[i]);
                var order = i + 1;
                if ($child.length) {
                    $img = $($child.children()[0]);
                    $img.prop('id', img.md5);
                    $img.prop('src', 'thumb/' + img.md5 + '.jpg');
                    $img.prop('width', img.th_w);
                    $img.prop('height', img.th_h);
                    $img.prop('alt', img.l);
                } else {
                    $li = $('<li />');
                    $img = $('<img />', {
                        id: img.md5,
                        src: 'thumb/' + img.md5 + '.jpg',
                        width: img.th_w,
                        height: img.th_h,
                        alt: img.l
                    }).click(function() {
                        setupDiaporama(order);
                    });
                    $img.appendTo($li);

                    ul.push($li);
                }
            } else {
                $li = $('<li />');
                $img = $('<img />').click(function() {
                    setupDiaporama(order);
                });
                $img.appendTo($li);

                ul.push($li);
            }
        })();
    }

    $('#thumbs').append(ul);
};

var downloadMore = function (order, onDone) {
    if (totalImages > 0 && totalImages == totalImagesDisplayed) {
        $('#loading').hide();
        $('#downloadMore').hide();
        return;
    }
    var index = order - 1;
    var jsonNb = Math.floor(index / IMAGES_PER_JSON);
    var file = 'json/images_' + jsonNb + '.json';
    $.getJSON(file, function (data) {
        totalImages = data.total;

        var i;
        for (i = 0; i < data.images.length; i++) {
            var idx = i + IMAGES_PER_JSON * jsonNb;
            if (!images[idx]) {
                images[idx] = data.images[i];
                totalImagesDisplayed++;
            }
        }

        if (onDone) {
            onDone(jsonNb);
        }
    });

};


$(document).ready(function() {
    var downloading = false;

    title = $('title').text();
    $('#downloadMore').click(downloadMore);

    var onDoneThumbs = function (jsonNb) {
        updateThumbs(jsonNb);

        $('#loading').hide();
        if (totalImagesDisplayed < totalImages) {
            $('#downloadMore').show();
        }
    };

    if (window.location.hash) {
        var hash = parseInt(window.location.hash.substr(1), 10);
        if (isNaN(hash) || hash <= 0) {
            downloadMore(1, onDoneThumbs);
        } else {
            setupDiaporama(hash);
        }
    } else {
        downloadMore(1, onDoneThumbs);
    }


    $(window).on('popstate', function(ev) {
        var state = (ev.originalEvent) ? ev.originalEvent.state : ev.state;
        if (state) {
            if (state.order > 0) {
                setupDiaporama(state.order);
            } else {
                downloadMore(1, updateThumbs);
                if (img) {
                    backToThumbs(img.md5);
                } else {
                    backToThumbs();
                }
            }
        }
    });

    $(window).scroll(function (ev) {
        if (downloading || !isDisplayingThumbnails) {
            return;
        }
        var scrollTop = $(window).scrollTop();
        var height = $(document).height();
        if (scrollTop * 3 > 2 * height) {
            $('#loading').show();
            $('#downloadMore').hide();

            downloadMore(images.length + 1, onDoneThumbs);
        }
    });

});
