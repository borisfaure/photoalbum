'use strict';


function showThumbs (images)
{
    var ul = [];
    $.each(images, function(i, img) {
        var $li = $('<li />');
        var $img = $('<img />', {
            src: 'thumb_' + i + '.jpg',
            width: img.th_w,
            height: img.th_h,
            alt: img.l
        });
        $img.appendTo($li);

        ul.push($li);
    });
    var $ul = $('<ul />').append(ul);

    $('#thumbs').append($ul);
}


$(document).ready(function() {

    $.get('images.json', function (data) {
        showThumbs(data);
    });

});
