'use strict';

var IMAGES_PER_JSON = 100;
var totalImages = 0;
var totalImagesDisplayed = 0;
var nextJson = 0;
var downloading = false;


var appendThumbs = function (images)
{
    var ul = [];
    $.each(images, function(i, img) {
        var $li = $('<li />');
        var $img = $('<img />', {
            src: 'thumb_' + (i + nextJson * IMAGES_PER_JSON) + '.jpg',
            width: img.th_w,
            height: img.th_h,
            alt: img.l
        });
        $img.appendTo($li);

        ul.push($li);
    });

    totalImagesDisplayed += images.length;

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
    var file = 'images_' + nextJson + '.json';
    $.get(file, function (data) {
        totalImages = data.total;
        appendThumbs(data.images);
        nextJson++;
        downloading = false;
    });

};


$(document).ready(function() {

    downloadMore();

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
