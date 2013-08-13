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
        }).tipsy().click(editDescription);

        var $removeButton = $('<img />', {
            'class': 'button other',
            src: 'del.png',
            title: _('Remove this image from the photo album')
        }).tipsy().click(removeImage);

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

var regenCfg = function () {
    cfg.images = [];
    var $thumbs = $('#thumbs');
    var children = $thumbs.children();
    $.each(children, function (index, child) {
        var $child = $(child);
        var img = $child.data('cfg');
        cfg.images.push(img);
    });
    cfg.title = $('#title').val();
    cfg.out = $('#outDir').val();
    cfg.lang = $('#selectLang').children('option:selected').val();
};

$(document).ready(function() {

    $('#title').val(cfg.title || '');
    $('#outDir').val(cfg.out || '');
    var lang = $('html').prop('lang');
    var l = [];
    $.each(langs, function (i, lg) {
        var $o = $('<option />', {
            text: lg,
            value: lg
        }).prop('selected', lg === lang);
        l.push($o);
    });
    $('#selectLang').append(l);


    displayThumbs();

    $('#genConfigJson').click(function () {
        var $textarea = $('#cfgTextarea');
        regenCfg();
        $textarea.val(JSON.stringify(cfg, null, 4));
        return false;
    });

    var $thumbsIcon = $('#thumbsIcon');
    $thumbsIcon.prop('title', _('Display as grid'));
    $thumbsIcon.tipsy({gravity: 'e'});

    var toGrid;
    var toList = function () {
        $thumbsIcon.off('click').on('click', toGrid);
        $thumbsIcon.prop('src', 'thumbs.png');
        $thumbsIcon.prop('title', _('Display as grid'));
        $('.other').show();
        $('.imgContainer').removeClass('grid').addClass('list');
        return false;
    };

    toGrid = function () {
        $thumbsIcon.off('click').on('click', toList);
        $thumbsIcon.prop('src', 'list.png');
        $thumbsIcon.prop('title', _('Display as list'));
        $('.other').hide();
        $('.imgContainer').removeClass('list').addClass('grid');
        return false;
    };

    $('#thumbsIcon').click(toGrid);


    $.get('foo', function(data) {
        if (data === 'bar') {
            $('.standalone').remove();
            var $save = $('<img />', {
                src: 'save.png',
                id: 'saveIcon',
                'class': 'button',
                title: _('Save the configuration')
            }).tipsy({gravity: 'e'}).click(function () {
                regenCfg();
                $.post('save', JSON.stringify(cfg, null, 4))
                .fail(function () {
                    alert("unable to save the configuration");
                });
            });
            $('#thumbsIcon').after($save);
        }
    });
});
