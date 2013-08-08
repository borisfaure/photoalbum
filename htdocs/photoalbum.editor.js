'use strict';

var _ = function (str) {
    return translations[str] || str;
};

var removeImage = function () {
    var $removeButton = $(this);
    var $parent = $removeButton.parent();

    if (confirm(_('Are you sure to remove this image from the album?'))) {
        $parent.remove();
    }
    return false;
};

var editDescription = function () {
    var $editButton = $(this);
    var $parent = $editButton.parent();
    var $legend = $editButton.next().next();

    var img = $parent.data('cfg');

    var l = img.legend || '';
    if (typeof l !== "string") {
        l = img.legend.join('\n');
    }
    var $textarea = $('<textarea />', {
        text: l
    });
    var $ok = $('<button />', {
        text: _('Ok')
    }).click(function () {;
        $editButton.show();
        l = $textarea.val();
        img.legend = l.split('\n')
        $legend.html(markdown.toHTML(l));
        return false;
    });
    var $cancel= $('<button />', {
        text: _('Cancel')
    }).click(function () {
        $editButton.show();
        $legend.html(markdown.toHTML(l));
        return false;
    });

    $editButton.hide();
    $legend.empty().append($ok, $cancel, $textarea);
    return false;
};

var displayThumbs = function () {
    var images = cfg.images;
    var $thumbs = $('#thumbs');
    var ul = [];

    $thumbs.sortable({
        addClasses: false,
        axis: "both",
        containment: "parent",
        cursor: "move",
        scroll: "true",
        snap: "true"
    });

    $.each(images, function(index, img) {
        var $div = $('<div />', {
            'class': 'imgContainer list'
        });
        $div.data('cfg', img);

        var $fullLink = $('<a />', {
            href: 'full/' + img.md5 + '.jpg',
            target: '_blank'
        });

        var $img = $('<img />', {
            'class': 'thumb',
            src: 'thumb/' + img.md5 + '.jpg',
            width: img.th_w,
            height: img.th_h,
            alt: img.l
        });
        $img.appendTo($fullLink);

        var $editButton = $('<img />', {
            'class': 'button other',
            src: 'edit.png',
            title: _('Edit')
        }).click(editDescription);

        var $removeButton = $('<img />', {
            'class': 'button other',
            src: 'del.png',
            title: _('Remove this image from the photo album')
        }).click(removeImage);

        var $legend = $('<div />', {
            'class': 'legend other'
        });
        if (img.legend) {
            var l = img.legend;
            if (typeof l !== "string") {
                l = img.legend.join('\n');
            }
            $legend.html(markdown.toHTML(l));
        }

        var $clear = $('<div />', {
            'class': 'clear'
        });

        $div.append($fullLink, $editButton, $removeButton, $legend, $clear);
        ul.push($div);
    });
    $('#thumbs').append(ul);
};

$(document).ready(function() {

    displayThumbs();

    $('#genConfigJson').click(function () {
        var $this = $(this);
        var $textarea = $('#cfgTextarea');
        var $thumbs = $('#thumbs');
        cfg.images = [];
        var children = $thumbs.children();
        $.each(children, function (index, child) {
            var $child = $(child);
            var img = $child.data('cfg');
            cfg.images.push(img);
        });
        $textarea.val(JSON.stringify(cfg, null, 4));
        return false;
    });

    var $thumbsIcon = $('#thumbsIcon');

    var toGrid;
    var toList = function () {
        $thumbsIcon.off('click').on('click', toGrid);
        $thumbsIcon.attr('src', 'thumbs.png');
        $('.other').show();
        $('.imgContainer').removeClass('grid').addClass('list');
        return false;
    };

    toGrid = function () {
        $thumbsIcon.off('click').on('click', toList);
        $thumbsIcon.attr('src', 'list.png');
        $('.other').hide();
        $('.imgContainer').removeClass('list').addClass('grid');
        return false;
    };

    $('#thumbsIcon').click(toGrid);
});
