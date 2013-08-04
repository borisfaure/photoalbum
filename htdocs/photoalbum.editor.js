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
        axis: "y",
        containment: "parent",
        cursor: "move",
        scroll: "true",
        snap: "true"
    });

    $.each(images, function(index, img) {
        var $div = $('<div />', {
            'class': 'imgContainer'
        });
        $div.data('cfg', img);
        var $img = $('<img />', {
            'class': 'thumb',
            src: 'thumb/' + img.md5 + '.jpg',
            width: img.th_w,
            height: img.th_h,
            alt: img.l
        });

        var $editButton = $('<img />', {
            'class': 'button',
            src: 'edit.png',
            title: _('Edit')
        }).click(editDescription);

        var $removeButton = $('<img />', {
            'class': 'button',
            src: 'del.png',
            title: _('Remove this image from the photo album')
        }).click(removeImage);

        var $legend = $('<div />');
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

        $div.append($img, $editButton, $removeButton, $legend, $clear);
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
});
