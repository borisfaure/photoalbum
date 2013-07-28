'use strict';

var totalImages = 0;
var totalImagesDisplayed = 0;
var nextJson = 0;
var downloading = false;
var isDisplayingThumbnails = true;

var images = [];

var setupDiaporama = function (pos) {
    $('#thumbs').hide();
    $('#loading').hide();
    $('#downloadMore').hide();

    var $diaporama = $('#diaporama');

    console.log(pos);
    var img = images[pos];

    $diaporama.detach();
    $diaporama.empty();

    console.log(img);

    var $prev = $('<div />', {
        'class': 'nav',
        id: 'prev'
    }).click(function() {
        console.log('prev', img, pos);
    });
    $('<div/>').appendTo($prev);


    var $imgContainer = $('<div />');
    var $img = $('<img />', {
        src: 'large/' + pos + '.jpg',
        id: 'main'
    }).appendTo($imgContainer)
    .click(function() {
        console.log('foo', img, pos);
    });

    var $next = $('<div />', {
        'class': 'nav',
        id: 'next'
    }).click(function() {
        console.log('next', img, pos);
    });
    $('<div/>').appendTo($next);

    var $legend = $('<div />', {
        id: 'legend'
    });
    $('<p />', {text: '1/5) YOOOOOOOOOOOO'}).appendTo($legend);
    $('<p />', {text: '2/5) YOOOOOOOOOOOO'}).appendTo($legend);
    $('<p />', {text: '3/5) YOOOOOOOOOOOO'}).appendTo($legend);
    $('<p />', {text: '4/5) YOOOOOOOOOOOO'}).appendTo($legend);
    $('<p />', {text: '5/5) YOOOOOOOOOOOO'}).appendTo($legend);

    $diaporama.append($imgContainer, $prev, $next, $legend);

    $('body').append($diaporama);

    var resizeFn = function() {
        console.log($(window).height(), $legend.height());
        var newHeigth = $(window).height() - $legend.height() - 5;
        $imgContainer.height(newHeigth);
        $prev.height(newHeigth);
        $next.height(newHeigth);
    };

    var checkPos = function () {
        if (pos == 0) {
            $prev.hide();
        } else {
            $prev.show();
        }
        if (pos == images.length - 1) {
            $next.hide();
        } else {
            $next.show();
        }
    };

    var updateImage = function () {

        console.log('pos:', pos);
        img = images[pos];

        $diaporama.detach();

        $img.attr('src', 'large/' + pos + '.jpg');


        $legend.empty();


        checkPos();
        $('body').append($diaporama);
        resizeFn();
    };

    var prev = function() {
        pos--;
        updateImage();
    };
    $prev.click(prev);
    var next = function() {
        pos--;
        updateImage();
    };
    $next.click(next);

    $(window).resize(resizeFn);
    resizeFn();
};


var appendThumbs = function (newImages)
{
    var ul = [];
    $.each(newImages, function(i, img) {
        var pos = i + nextJson * IMAGES_PER_JSON;
        var $li = $('<li />');
        var $img = $('<img />', {
            src: 'thumb/' + pos + '.jpg',
            width: img.th_w,
            height: img.th_h,
            alt: img.l
        }).click(function() {
            setupDiaporama(pos);
        });
        $img.appendTo($li);

        ul.push($li);
    });

    totalImagesDisplayed += newImages.length;

    $('#thumbs').append(ul);
};

var downloadMore = function () {
    if (downloading) {
        return;
    }
    if (totalImages > 0 && totalImages == totalImagesDisplayed) {
        return;
    }
    downloading = true;
    $('#loading').show();
    $('#downloadMore').hide();
    var file = 'json/images_' + nextJson + '.json';
    $.get(file, function (data) {
        totalImages = data.total;

        images = images.concat(data.images);

        appendThumbs(data.images);
        nextJson++;
        downloading = false;
        $('#loading').hide();
        if (totalImagesDisplayed < totalImages) {
            $('#downloadMore').show();
        }
    });

};


$(document).ready(function() {

    downloadMore();

    $('#downloadMore').click(downloadMore);

    $(window).scroll(function (ev) {
        if (downloading) {
            return;
        }
        var scrollTop = $(window).scrollTop();
        var height = $(document).height();
        if (scrollTop * 3 > 2 * height) {
            downloadMore();
        }
    });

});
