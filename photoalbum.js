#!/usr/bin/node

/* {{{ Globals */

var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');
var im = require('imagemagick');
var crypto = require('crypto');
var mime = require('mime');


var NB_WORKERS = 100;
var IMAGES_PER_JSON = 50;

var cfgPath;

/* }}} */
/* {{{ Utils */

var md5 = function (path, onDone) {
    var md5sum = crypto.createHash('md5');
    var s = fs.ReadStream(path);
    s.on('data', function(d) {
        md5sum.update(d);
    });

    s.on('end', function() {
        var d = md5sum.digest('hex');
        onDone(d);
    });
};

var getJSONFromPath = function (path) {
    var data = fs.readFileSync(path);
    return JSON.parse(data);
};

var saveCfg = function (cfgPath, cfg) {
    fs.writeFile(cfgPath, JSON.stringify(cfg, null, 4),
                 function(err) {
                     if (err) {
                         throw (err);
                     }
                 }
    );
};

var getTranslations = function (lang) {
    if (!lang) {
        return {};
    }
    var translations = getJSONFromPath('translations.json');
    return translations[lang] || {};
};

var genLegend = function (legend) {
    if (legend) {
        if (typeof legend === "string") {
            return legend;
        } else {
            return legend.join('\n');
        }
    }
    return undefined;
};


/* }}} */
/* {{{ Setup */

var setup = function (cfg, isEditor) {

    var workHtmlFile = function (filename) {
        var source = path.join('htdocs', filename);
        var dest = path.join(cfg.out, filename);
        var data = fs.readFileSync(source, {encoding: 'UTF-8'});
        data = data.replace(/%%TITLE%%/g, cfg.title || '');
        data = data.replace(/%%IMAGES_PER_JSON%%/g, IMAGES_PER_JSON);
        data = data.replace(/%%LANG%%/g, cfg.lang || 'en');
        var translations = getTranslations(cfg.lang);

        var _ = function (str) {
            return translations[str] || str;
        };
        data = data.replace(/%%DOWNLOAD_MORE%%/g, _('Download more images'));
        data = data.replace(/%%TRANSLATIONS%%/g,
                            JSON.stringify(translations, null, 1));
        data = data.replace(/%%CFG%%/g,
                            JSON.stringify(cfg, null, 1));

        fs.writeFile(dest, data, function(err) {
            if (err) {
                throw (err);
            }
        });
    };

    /* TODO: check file dates, do 'à la' make */
    var copy = function(filename) {
        var source = path.join('htdocs', filename);
        var dest = path.join(cfg.out, filename);
        var data = fs.readFileSync(source);
        fs.writeFile(dest, data, function(err) {
            if (err) {
                throw (err);
            }
        });
    };

    copy('jquery.min.js');
    copy('markdown.js');
    if (isEditor) {
        copy('photoalbum.editor.js');
        copy('photoalbum.editor.css');
        workHtmlFile('editor.html');
    } else {
        copy('photoalbum.css');
        copy('prev.png');
        copy('next.png');
        copy('play.png');
        copy('pause.png');
        copy('thumbs.png');
        copy('loading.gif');
        copy('photoalbum.js');
        workHtmlFile('index.html');
    }

    var mkdir = function (dir) {
        var p = path.join(cfg.out, dir);
        fs.stat(p, function (err) {
            if (err) {
                fs.mkdir(p);
            }
        });
    };
    mkdir('json');
    mkdir('large');
    mkdir('thumb');
    mkdir('full');


};

/* }}} */
/* {{{ genJSONs */

var genJSONs = function (cfg, images, onDone) {
    var l = [];
    var i;
    var errFn = function (err) {
        if (err) {
            throw (err);
        }
    };
    for (i = 0; i < Math.ceil(images.length / IMAGES_PER_JSON); i++) {
        var o = {
            total: images.length,
            images: []
        };
        var j;
        var m = Math.min(IMAGES_PER_JSON, o.total - i * IMAGES_PER_JSON);
        for (j = 0; j < m; j++) {
            o.images.push(images[i * IMAGES_PER_JSON + j]);
        }
        var jsonPath = path.join(cfg.out, 'json', 'images_' + i + '.json');
        fs.writeFile(jsonPath, JSON.stringify(o, null, 4), errFn);
    }
    if (onDone) {
        onDone();
    }
};

/* }}} */
/* {{{ genThumbs */

var genOneThumbnail = function (img, images, onDone) {
    fs.stat(img.path, function (err, stat) {
        if (err) {
            console.error(err);
            finish();
            return;
        }

        var resize = function () {
            var o = {
                width: 256,
                srcPath: img.path,
                dstPath: path.join(cfg.out, 'thumb', img.md5 + '.jpg')
            };
            im.resize(o, function(err, stdout, stderr) {
                if (err) throw err;
                im.identify(o.dstPath, function(err, features) {
                    if (err) throw err;

                    img.th_w = features.width;
                    img.th_h = features.height;

                    var o = {
                        legend: genLegend(img.legend),
                        md5: img.md5,
                        th_w: img.th_w,
                        th_h: img.th_h
                    };
                    images.push(o);
                    onDone();
                });
            });
        };
        var mtime = stat.mtime.getTime();
        if (mtime !== img.mtime || !img.md5 ||
            !fs.existsSync(path.join(cfg.out, 'thumb', img.md5 + '.jpg')))
        {
            img.mtime = mtime;
            md5(img.path, function(hex) {
                img.md5 = hex;
                resize();
            });
        } else {
            var o = {
                legend: genLegend(img.legend),
                md5: img.md5,
                th_w: img.th_w,
                th_h: img.th_h
            };
            images.push(o);
            onDone();
        }
    });
};

var genThumbs = function (cfg, onDone) {
    var i;
    var done = 0;
    var images = [];

    var dealImage = function (cfg, pos, onDone) {
        var img = cfg.images[pos];
        if (!img) {
            return;
        }

        var finish = function () {
            done++;
            console.log(done + '/' + cfg.images.length);

            if (pos + NB_WORKERS < cfg.images.length) {
                dealImage(cfg, pos + NB_WORKERS, onDone);
            } else if (done == cfg.images.length) {
                onDone(images);
            }
        };
        genOneThumbnail(img, images, finish);
    };

    for (i = 0; i < NB_WORKERS; i++) {
        dealImage(cfg, i, onDone);
    }
};

/* }}} */
/* {{{ editor */

var editor = function (cfg) {

    /* TODO: boris */
    var images = [];
    var done = 0;
    var mkdir = function (dir) {
        var p = path.join(cfg.out, dir);
        fs.stat(p, function (err) {
            if (err) {
                fs.mkdir(p);
            }
        });
    };

    var onDone = function () {
        console.log('ondone');
        /* TODO: boris */

        var isEditor = true;
        setup(cfg, isEditor);

        var source = path.join('htdocs/editor.html');
        var dest = path.join(cfg.out, 'editor.html');
        var data = fs.readFileSync(source, {encoding: 'UTF-8'});

        fs.writeFile(dest, data, function(err) {
            if (err) {
                throw (err);
            }
        });
    };

    var dealImage;
    dealImage = function (cfg, pos, onDone) {
        var name = pos + 1;
        var o = {
            width: 256,
        };
        var img = cfg.images[pos];
        if (!img) {
            return;
        }
        o.srcPath = img.path;

        var finish = function () {
            done++;
            console.log(done + '/' + cfg.images.length);

            if (pos + NB_WORKERS < cfg.images.length) {
                dealImage(cfg, pos + NB_WORKERS, onDone);
            } else if (done == cfg.images.length) {
                onDone();
            }
        };
        // Generate thumbnail
        {
            o.dstPath = path.join(cfg.out, 'thumb', name + '.jpg');

            /* call imagemagick */
            im.resize(o, function(err, stdout, stderr) {
                if (err) throw err;
                im.identify(o.dstPath, function(err, features) {
                    if (err) throw err;
                    if (!images[pos]) images[pos] = {};

                    images[pos].th_w = features.width;
                    images[pos].th_h = features.height;

                    finish();
                });
            });
        }
    };
    for (i = 0; i < NB_WORKERS; i++) {
        dealImage(cfg, i, onDone);
    }
};

/* }}} */
/* {{{ doAll */

var doAll = function (cfg, genJSON, onDone) {
    var i;
    var done = 0;
    var images = [];

    var dealImage = function (cfg, pos, onDone) {
        var img = cfg.images[pos];
        if (!img) {
            return;
        }

        var finish = function () {
            done++;
            console.log(done + '/' + cfg.images.length);
            if (pos + NB_WORKERS < cfg.images.length) {
                dealImage(cfg, pos + NB_WORKERS, onDone);
            } else if (done == cfg.images.length) {
                onDone();
            }
        };

        var full = function () {
            var dest = path.join(cfg.out, 'full',  img.md5 + '.jpg');

            if (!fs.existsSync(dest)) {
                var data = fs.readFileSync(img.path);
                fs.writeFile(dest, data, function(err) {
                    if (err) {
                        throw (err);
                    }
                });
                finish();
            } else {
                finish();
            }
        };

        var large = function () {
            var o = {
                srcPath: img.path,
                dstPath: path.join(cfg.out, 'large', img.md5 + '.jpg'),
                width: 1024,
                heigth: 768
            };

            if (!fs.existsSync(o.dstPath)) {
                im.resize(o, function(err, stdout, stderr) {
                    if (err) throw err;

                    full();
                });
            } else {
                full();
            }
        };

        genOneThumbnail(img, images, large);
    };


    var itsOver = function () {
        if (genJSON) {
            genJSONs(cfg, images);
        }
        onDone();
    };
    for (i = 0; i < NB_WORKERS; i++) {
        dealImage(cfg, i, itsOver);
    }
};

/* }}} */
/* {{{ genConfig */

var genConfig = function(inPath, cfgPath) {
    var json = {
        images: [],
        out: 'out/',
        title: 'My pics',
        noGPS: true,
        lang: 'en'
    };

    var dirs = fs.readdirSync(inPath);

    console.log('Checking ' + dirs.length + ' files in ' + inPath);
    var done = 0;
    var checkImage;
    checkImage = function(f) {
        if (f > dirs.length) {
            return;
        }

        var onDone = function () {
            done++;
            console.log(done + '/' + dirs.length);

            if (f + NB_WORKERS < dirs.length) {
                checkImage(f + NB_WORKERS);
            } else if (done == dirs.length) {
                console.log(json.images.length + ' images found');
                saveCfg(cfgPath, json);
            }
        };

        var p = path.join(inPath, dirs[f]);
        var type = mime.lookup(p);
        if (type.indexOf('image') !== 0) {
            onDone();
            return;
        }

        fs.stat(p, function (err, stat) {
            if (err) {
                console.error(err);
                onDone();
                return;
            }
            md5(p, function(hex) {
                var o = {
                    path: p,
                    legend: '',
                    md5: hex,
                    mtime: stat.mtime.getTime()
                };
                json.images.push(o);
                onDone();
            });
        });
    };
    for (i = 0; i < NB_WORKERS; i++) {
        checkImage(i, onDone);
    }
};

/* }}} */
/* {{{ main */

var usage = function() {
    util.print("usage: photoalbum command\n\n"
    + "command is one of the following:\n"
    + "genConfig input_directory output_config_file\n"
    + "  generate a configuration files about files in input_directory\n"
    + "setup config_file\n"
    + "  setup files in output directory\n"
    + "genThumbs config_file\n"
    + "  generates thumbnails and copy the full-size images\n"
    + "editor config_file\n"
    + "  generate an editor.html file in output directory\n"
    + "genJSONs config_file\n"
    + "  generate the JSONs files used by the web client\n"
    + "genImages\n"
    + "  generates thumbnails/large images and copy the full-size images\n"
    + "all config_file\n"
    + "  execute setup/genJSONs/genImages\n");
    process.exit(1);
};

var args = process.argv.splice(2);
if (args.length < 2) {
    usage();
}


switch (args[0]) {
  case "genConfig":
    if (args.length < 3) {
        usage();
    }
    genConfig(args[1], args[2]);
    break;
  case "setup":
    var cfg = getJSONFromPath(args[1]);
    setup(cfg);
    break;
  case "editor":
    var cfg = getJSONFromPath(args[1]);
    setup(cfg);
    editor(cfg);
    break;
  case "genThumbs":
    var cfg = getJSONFromPath(args[1]);
    setup(cfg);
    var onDone = function () {
        saveCfg(args[1], cfg);
    };
    genThumbs(cfg, onDone);
    break;
  case "genJSONs":
    var cfg = getJSONFromPath(args[1]);
    var onDone = function (images) {
        genJSONs(cfg, images, function () {
            saveCfg(args[1], cfg);
        });
    };
    genThumbs(cfg, onDone);
    break;
  case "genImages":
    var cfg = getJSONFromPath(args[1]);
    doAll(cfg, false, function () {
        saveCfg(args[1], cfg);
    });
    break;
  case "all":
    var cfg = getJSONFromPath(args[1]);
    setup(cfg);
    doAll(cfg, true, function () {
        saveCfg(args[1], cfg);
    });
    break;
  default:
    usage();
}

/* }}} */
