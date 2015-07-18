/*jshint browser: true, jquery: true, globalstrict: true*/
/*global langs, translations, cfg, markdown, moment */
'use strict';

var _ = function (str) {
    return translations[str] || str;
};

var pageFromCfg = function(page) {
    var emptyPage = {"type":"page", "content": "", "title": ""};
    if (!page) {
        page = emptyPage;
        page.md5 = "";
        var possible = "0123456789abcdef";
        for( var i=0; i < 32; i++ )
            page.md5 += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    var $div = $('<div />', {
        'class': 'imgContainer list'
    });

    var $title = $('<div />', {
        'class': 'thumb'
    });
    var $titleLabel = $('<label />', {
        'class': 'other',
        'text': _("Title of the page:")
    });
    var $titleInput = $('<input type="text">').addClass('title text');
    $titleInput.val(page.title);
    $title.append($titleLabel, $titleInput);

    var $textarea = $('<textarea />', {
        'text': page.content,
        'class': 'other'
    });

    var $content = $('<div />', {
        'class': 'content other'
    });
    var $preview = $('<button />', {
        text: _('Preview'),
        'class': 'other'
    }).click(function () {
        var c = $textarea.val();
        $content.html(c);
        $ok.show();
        $cancel.show();
        $preview.hide();
        return false;
    });
    var $ok = $('<button />', {
        text: _('Ok')
    }).click(function () {
        $preview.show();
        $ok.hide();
        $cancel.hide();
        var l = $textarea.val();
        page.content = l;
        $content.empty();
        return false;
    });
    var $cancel= $('<button />', {
        text: _('Cancel')
    }).click(function () {
        $preview.show();
        $ok.hide();
        $cancel.hide();
        $content.empty();
        $textarea.val(page.content);
        return false;
    });
    $ok.hide();
    $cancel.hide();
    var $removeButton = $('<img />', {
        'class': 'button other',
        src: 'del.png',
        title: _('Remove this page from the photo album')
    }).tipsy().click(removeImage);

    var $buttons = $('<div />', {
        'class': 'other'
    });
    $buttons.append($removeButton);
    $div.append($buttons, $title, $textarea, $preview, $ok, $cancel, $content);

    $div.data('cfg', page);
    return $div;
};
var addPage = function(page) {
    var $thumbs = $('#thumbs');
    console.log($thumbs);
    var $div = pageFromCfg(page);
    $thumbs.prepend($div);
};

var removeImage = function () {
    var $removeButton = $(this);
    var $parent = $removeButton.parent();

    if (window.confirm(_('Are you sure to remove this image from the album?'))) {
        $parent.remove();
    }
    return false;
};

var editDescription = function () {
    var $editButton = $(this);
    var $parent = $($editButton.parent());
    var $legend = $parent.find('.legend');

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
    }).click(function () {
        $editButton.show();
        l = $textarea.val();
        img.legend = l.split('\n');
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
        var $div;
        if (img.type === 'page') {
            $div = pageFromCfg(img);
        } else {
            $div = $('<div />', {
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

            var $date = $('<div />', {
                'class': 'other date'
            });
            if (img.metadata && img.metadata.dateTime) {
                var m = moment(img.metadata.dateTime);
                if (cfg.time_delta && cfg.time_delta !== 0) {
                    if (cfg.time_delta > 0)
                        m = m.add('hours', cfg.time_delta);
                    else
                        m = m.subtract('hours', -cfg.time_delta);
                }
                if (cfg.timezone && cfg.timezone !== "") {
                    m = m.tz(cfg.timezone);
                }
                var textDate = m.format('YYYY-MM-DD HH:mm');
                var $dateLabel = $('<label />', {
                    'class': 'other date',
                    'text': textDate
                });
                var $dateCx = $('<input type="checkbox">').addClass('date').change(function () {
                    if ($(this).is(':checked')) {
                        $dateLabel.removeClass('striked');
                    } else {
                        $dateLabel.addClass('striked');
                    }
                });
                if (img.metadata.showDate) {
                    $dateCx.prop('checked', true);
                } else {
                    $dateLabel.addClass('striked');
                }
                var $dateImg = $('<img />', {
                    'class': 'other',
                    'src': 'time.png'
                });
                $date.append($dateCx, $dateImg, $dateLabel);
            }

            var $position = $('<div />', {
                'class': 'other position'
            });
            var p;
            if (img.metadata && img.metadata.position) {
                p = img.metadata.position;
            }
            var $posImg = $('<img />', {
                'class': 'button other',
                'src': 'pos.png',
                'title': _('Show position on a map')
            }).tipsy();
            var $posLink = $('<a />', {
                'class': 'other position',
                'target': '_blank'
            });
            $posLink.append('OpenStreetMap');
            var $posCx = $('<input type="checkbox">').addClass('position cx').change(function () {
                if ($(this).is(':checked')) {
                    $posLink.removeClass('striked');
                } else {
                    $posLink.addClass('striked');
                }
            });
            if (img.metadata.showGPS) {
                $posCx.prop('checked', true);
            } else {
                $posLink.addClass('striked');
            }
            $posImg.appendTo($posLink);
            var $posInput = $('<input type="text">').addClass('position text').change(function () {
                var p = $posInput.val();
                var t = p.split(',');
                if (t.length == 2) {
                    var lat = parseFloat(t[0]);
                    var lon = parseFloat(t[1]);
                    $posLink.attr('href', 'http://www.openstreetmap.org/?mlat=' +
                                 lat + '&mlon=' + lon + '#map=14/'+ lat + '/' + lon);
                    $posCx.prop('checked', true);
                    $posLink.removeClass('striked');
                } else {
                    $posCx.prop('checked', false);
                    $posLink.addClass('striked');
                }
            });
            if (p) {
                $posInput.val(p.lat + ", " + p.lon);
                $posLink.attr('href', 'http://www.openstreetmap.org/?mlat=' +
                              p.lat + '&mlon=' + p.lon + '#map=14/'+ p.lat + '/' + p.lon);
            };
            $position.append($posCx, $posLink, $posInput);


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

            $div.append($fullLink, $editButton, $removeButton, $position, $date, $legend, $clear);
        }
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
        if (img.type === 'page') {
            var $textarea = $child.find('textarea');
            var $input = $child.find('input');
            var page = {
                "type": "page",
                "md5": img.md5,
                "content": $textarea.val(),
                "title": $input.val()
            }
            cfg.images.push(page);
        } else {
            var $label = $child.find('label.date');

            var $cx = $child.find('input.date');
            if ($cx.is(':checked')) {
                img.metadata.showDate = true;
                img.metadata.dateTimeStr = $label.text();
            } else {
                img.metadata.showDate = false;
                delete img.metadata.dateTimeStr;
            }

            $cx = $child.find('input.position.cx');
            if ($cx.is(':checked')) {
                img.metadata.showGPS = true;
                img.metadata.position = {};
                var $posInput = $child.find('input.position.text');
                var p = $posInput.val();
                var t = p.split(',');
                if (t.length == 2) {
                    img.metadata.position.lat = parseFloat(t[0]);
                    img.metadata.position.lon = parseFloat(t[1]);
                } else {
                    $posCx.prop('checked', false);
                    $posLink.addClass('striked');
                }

            } else {
                img.metadata.showGPS = false;
                delete img.metadata.dateTimeStr;
            }
            cfg.images.push(img);
        }
    });
    cfg.title = $('#title').val();
    cfg.out = $('#outDir').val();
    cfg.lang = $('#selectLang').children('option:selected').val();
    cfg.timezone = $('#selectTimezone').find('option:selected').val();
    cfg.time_deltat = $('#timeDelta').val();
};

$(document).ready(function() {

    var onCfgLoaded = function () {
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
        if (cfg.timezone) {
            $('#selectTimezone').val(cfg.timezone);
        }
        if (cfg.time_delta) {
            $('#timeDelta').val(cfg.time_delta);
        }

        displayThumbs();
    };

    $('#selectTimezone').change(function() {
        cfg.timezone = $(this).find('option:selected').val();
        var $thumbs = $('#thumbs');
        var children = $thumbs.children();
        $.each(children, function (index, child) {
            var $child = $(child);
            var img = $child.data('cfg');
            if (img.metadata && img.metadata.dateTime) {
                var m = moment(img.metadata.dateTime);
                if (cfg.time_delta && cfg.time_delta !== 0) {
                    if (cfg.time_delta > 0)
                        m = m.add('hours', cfg.time_delta);
                    else
                        m = m.subtract('hours', -cfg.time_delta);
                }
                if (cfg.timezone && cfg.timezone !== "") {
                    m = m.tz(cfg.timezone);
                }
                var textDate = m.format('YYYY-MM-DD HH:mm');
                var $label = $child.find('label.date');
                $label.text(textDate);
            }
        });
    });
    $('#timeDelta').change(function() {
        cfg.time_delta = $(this).val();
        var $thumbs = $('#thumbs');
        var children = $thumbs.children();
        $.each(children, function (index, child) {
            var $child = $(child);
            var img = $child.data('cfg');
            if (img.metadata && img.metadata.dateTime) {
                var m = moment(img.metadata.dateTime);
                if (cfg.time_delta && cfg.time_delta !== 0) {
                    if (cfg.time_delta > 0)
                        m = m.add('hours', cfg.time_delta);
                    else
                        m = m.subtract('hours', -cfg.time_delta);
                }
                if (cfg.timezone && cfg.timezone !== "") {
                    m = m.tz(cfg.timezone);
                }
                var textDate = m.format('YYYY-MM-DD HH:mm');
                var $label = $child.find('label.date');
                $label.text(textDate);
            }
        });
    });

    $('#genConfigJson').click(function () {
        var $textarea = $('#cfgTextarea');
        regenCfg();
        $textarea.val(JSON.stringify(cfg, null, 4));
        return false;
    });

    $('#addPage').click(function () {
        addPage();
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


    $.get('/cfg.json', function(data) {
        cfg = data;
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
                window.alert("unable to save the configuration");
            });
        });
        $('#thumbsIcon').after($save);
    }).always(function () {
        onCfgLoaded(cfg);
    });
});
