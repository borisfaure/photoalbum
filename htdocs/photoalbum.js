'use strict';

var totalImages = 0;
var totalImagesDisplayed = 0;
var isDisplayingThumbnails = true;

var title;

var images = [];

/* XXX:
 * Let arr = [a, b, c],
 * "order" of a is 1, 2 for b, and 3 for c
 * "index" of a is 0, 1 for b and 2 for c
 */

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

    history.pushState({order: order}, newTitle, '#' + order);
};

var backToThumbs = function () {
    var $diaporama = $('#diaporama');
    $diaporama.empty();
    $('#downloadMore').hide();
    $('#loading').hide();
    changeHistory();
    isDisplayingThumbnails = true;
    if (totalImages != totalImagesDisplayed) {
        var jsonBoundary = 0;
        var ul = [];
        $.each(images, function(index, img) {
            var order = index + 1;
            var $li = $('<li />');
            var $img;
            if (img) {
                $img = $('<img />', {
                    src: 'thumb/' + order + '.jpg',
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
};

var _ = function (str) {
    return translations[str] || str;
};

var setupDiaporama = function (order) {
    var checkOrder;
    var resizeFn;

    var index = order - 1;

    $('.thumb').hide();
    isDisplayingThumbnails = false;

    var $diaporama = $('#diaporama');

    var img = images[index];
    if (!img) {
        downloadMore(order, function () {
            setupDiaporama(order);
        });
        img = {};
    }

    $diaporama.detach();
    $diaporama.empty();

    var $prev = $('<div />', {
        'class': 'nav',
        id: 'prev'
    });
    $('<div/>').appendTo($prev);


    var $imgContainer = $('<div />');
    var $fullLink = $('<a />', {
        href: 'full/' + order + '.jpg'
    }).appendTo($imgContainer);
    var $img = $('<img />', {
        src: 'large/' + order + '.jpg',
        id: 'main'
    }).appendTo($fullLink);

    var $next = $('<div />', {
        'class': 'nav',
        id: 'next'
    });
    $('<div/>').appendTo($next);

    var $bottom = $('<div />', {
        id: 'bottom'
    });
    var $toolbar = $('<div />', {
        id: 'toolbar'
    });
    var $thumbs = $('<img />', {
        src: 'thumbs.png',
        width: 32,
        height: 32,
        title: _('Show Thumbnails')
    }).click(backToThumbs);
    $toolbar.append($thumbs);
    var $legend = $('<div />', {
        id: 'legend'
    });
    if (img.l) {
        $legend.html(markdown.toHTML(img.l));
    }
    $bottom.append($toolbar, $legend);


    $diaporama.append($imgContainer, $prev, $next, $bottom);

    $('body').append($diaporama);

    resizeFn = function() {
        var newHeigth = $(window).height()
                      - Math.max($bottom.height(), $toolbar.height())
                      - 5;
        $imgContainer.height(newHeigth);
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
            downloadMore(order, function () {
                setupDiaporama(order);
            });
            return;
        }

        $diaporama.detach();

        $img.attr('src', 'large/' + order + '.jpg');
        $fullLink.attr('href', 'full/' + order + '.jpg');


        $legend.empty();
        if (img.l) {
            $legend.html(markdown.toHTML(img.l));
        }

        checkOrder();
        $('body').append($diaporama);
        resizeFn();
        changeHistory(order);
    };

    var prev = function() {
        order--;
        index--;
        updateImage();
    };
    $prev.click(prev);
    var next = function() {
        order++;
        index++;
        updateImage();
    };
    $next.click(next);

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
    for (i = newJson * IMAGES_PER_JSON; i < m; i++) {
        (function(){
            var img = images[i];
            var $img;
            var $child = $($children[i]);
            var order = i + 1;
            if ($child.length) {
                $img = $($child.children()[0]);
                $img.attr('src', 'thumb/' + order + '.jpg');
                $img.attr('width', img.th_w);
                $img.attr('height', img.th_h);
                $img.attr('alt', img.l);
            } else {
                var $li = $('<li />');
                $img = $('<img />', {
                    src: 'thumb/' + order + '.jpg',
                    width: img.th_w,
                    height: img.th_h,
                    alt: img.l
                }).click(function() {
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
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.log(errorThrown);
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
        var state = ev.originalEvent.state;
        if (state && state.order > 0) {
            setupDiaporama(state.order);
        } else {
            var hash = parseInt(window.location.hash.substr(1), 10);
            if (isNaN(hash) || hash <= 0) {
                downloadMore(1, updateThumbs);
                backToThumbs();
            } else {
                setupDiaporama(hash);
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
