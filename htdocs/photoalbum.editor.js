'use strict';

var displayThumbs = function () {
    var images = cfg.images;
    var $thumbs = $('#thumbs');
    var ul = [];


    $.each(images, function(index, img) {
        var order = index + 1;
        var $li = $('<li />');
        $li.data('cfg', img);
        var $img = $('<img />', {
            src: 'thumb/' + order + '.jpg',
            width: img.th_w,
            height: img.th_h,
            alt: img.l
        });

        var $editButton

        $img.appendTo($li);

        ul.push($li);
    });
    $('#thumbs').append(ul);
};

$(document).ready(function() {

    displayThumbs();

});
