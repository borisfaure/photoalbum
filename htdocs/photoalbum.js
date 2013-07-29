'use strict';

var totalImages = 0;
var totalImagesDisplayed = 0;
var isDisplayingThumbnails = true;

var title;

var images = [];

var changeHistory = function (pos) {
    var newTitle;

    if (pos === undefined) {
        newTitle = title;
        pos = 0;
    } else {
        pos++;
        newTitle = title + ' - ' + pos + '/' + totalImages;
    }
    $('title').text(newTitle);

    if (!window.history.pushState) {
        return;
    }

    history.pushState({pos: pos}, newTitle, '#' + pos);
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
        $.each(images, function(pos, img) {
            var $li = $('<li />');
            var $img;
            if (img) {
                $img = $('<img />', {
                    src: 'thumb/' + pos + '.jpg',
                    width: img.th_w,
                    height: img.th_h,
                    alt: img.l
                });
            } else {
                if (pos > jsonBoundary) {
                    jsonBoundary += IMAGES_PER_JSON;
                    downloadMore(i, updateThumbs);
                }
                $img = $('<img />');
            }
            $img.click(function() {
                setupDiaporama(pos);
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

var setupDiaporama = function (pos) {
    var checkPos;
    var resizeFn;

    $('.thumb').hide();
    isDisplayingThumbnails = false;

    var $diaporama = $('#diaporama');

    var img = images[pos];
    if (!img) {
        downloadMore(pos, function () {
            setupDiaporama(pos);
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
    var $img = $('<img />', {
        src: 'large/' + pos + '.jpg',
        id: 'main'
    }).appendTo($imgContainer);

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

    checkPos = function () {
        if (pos == 0) {
            $prev.hide();
        } else {
            $prev.show();
        }
        if (pos == totalImages - 1) {
            $next.hide();
        } else {
            $next.show();
        }
    };

    var updateImage = function () {

        img = images[pos];
        if (!img) {
            downloadMore(pos, function () {
                setupDiaporama(pos);
            });
            return;
        }

        $diaporama.detach();

        $img.attr('src', 'large/' + pos + '.jpg');


        $legend.empty();
        if (img.l) {
            $legend.html(markdown.toHTML(img.l));
        }

        checkPos();
        $('body').append($diaporama);
        resizeFn();
        changeHistory(pos);
    };

    var prev = function() {
        pos--;
        updateImage();
    };
    $prev.click(prev);
    var next = function() {
        pos++;
        updateImage();
    };
    $next.click(next);

    $(window).resize(resizeFn);
    resizeFn();
    changeHistory(pos);
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
            if ($child.length) {
                $img = $($child.children()[0]);
                $img.attr('src', 'thumb/' + i + '.jpg');
                $img.attr('width', img.th_w);
                $img.attr('height', img.th_h);
                $img.attr('alt', img.l);
            } else {
                var $li = $('<li />');
                var _i = i;
                $img = $('<img />', {
                    src: 'thumb/' + i + '.jpg',
                    width: img.th_w,
                    height: img.th_h,
                    alt: img.l
                }).click(function() {
                    console.log(_i);
                    setupDiaporama(_i);
                });
                $img.appendTo($li);

                ul.push($li);
            }
        })();
    }

    $('#thumbs').append(ul);
};

var downloadMore = function (pos, onDone) {
    if (totalImages > 0 && totalImages == totalImagesDisplayed) {
        return;
    }
    var jsonNb = Math.floor(pos / IMAGES_PER_JSON);
    var file = 'json/images_' + jsonNb + '.json';
    $.get(file, function (data) {
        totalImages = data.total;

        var i;
        for (i = 0; i < data.images.length; i++) {
            var p = i + IMAGES_PER_JSON * jsonNb;
            if (!images[p]) {
                images[p] = data.images[i];
                totalImagesDisplayed++;
            }
        }

        if (onDone) {
            onDone(IMAGES_PER_JSON * jsonNb);
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
            console.log(hash);
            downloadMore(0, onDoneThumbs);
        } else {
            console.log(hash);
            setupDiaporama(hash);
        }
    } else {
        downloadMore(0, onDoneThumbs);
    }


    $(window).on('popstate', function(ev) {
        var state = ev.originalEvent.state;
        if (state && state.pos > 0) {
            setupDiaporama(state.pos - 1);
        } else {
            downloadMore(0, updateThumbs);
            backToThumbs();
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

            downloadMore(images.length, onDoneThumbs);

        }
    });

});
