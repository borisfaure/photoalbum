#!/usr/bin/node

var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');
var im = require('imagemagick');

var NB_WORKERS = 100;
var IMAGES_PER_JSON = 50;


var getJSONFromPath = function (path) {
    var data = fs.readFileSync(path);
    return JSON.parse(data);
};

var getTranslations = function (lang) {
    if (!lang) {
        return {};
    }
    var translations = getJSONFromPath('translations.json');
    return translations[lang] || {};
};

var setup = function (cfg) {
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
    copy('photoalbum.js');
    copy('photoalbum.css');
    copy('prev.png');
    copy('next.png');
    copy('thumbs.png');
    copy('loading.gif');

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


    var source = path.join('htdocs/index.html');
    var dest = path.join(cfg.out, 'index.html');
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

    fs.writeFile(dest, data, function(err) {
        if (err) {
            throw (err);
        }
    });
};

var genJSONs = function (cfg, images) {
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
};

var genLegend = function (cfg, pos, images) {
    var img = cfg.images[pos];
    if (img.legend) {
        if (typeof img.legend === "string") {
            images[pos].l = img.legend;
        } else {
            images[pos].l = img.legend.join('\n');
        }
    }
};

var genImagesTabFromCfg = function (cfg, onDone) {
    var i;
    var done = 0;
    var images = [];
    var imageSizing = function (cfg, pos, onDone) {
        var img = cfg.images[pos];
        if (!img) {
            return;
        }

        var finish = function () {

            genLegend(cfg, pos, images);

            done++;

            console.log(done + '/' + cfg.images.length);

            if (pos + NB_WORKERS < cfg.images.length) {
                imageSizing(cfg, pos + NB_WORKERS, onDone);
            } else if (done == cfg.images.length) {
                onDone(images);
            }
        };

        var large = function () {
            var dstPath = path.join(cfg.out, 'large', pos + '.jpg');

            /* call imagemagick */
            im.identify(dstPath, function(err, features) {
                if (err) throw err;
                if (!images[pos]) images[pos] = {};

                images[pos].l_w = features.width;
                images[pos].l_h = features.height;

                finish();
            });
        };

        {
            var dstPath = path.join(cfg.out, 'thumb', pos + '.jpg');

            /* call imagemagick */
            im.identify(dstPath, function(err, features) {
                if (err) throw err;
                if (!images[pos]) images[pos] = {};

                images[pos].th_w = features.width;
                images[pos].th_h = features.height;

                large();
            });
        }
    };
    for (i = 0; i < NB_WORKERS; i++) {
        imageSizing(cfg, i, onDone);
    }

};



var doAll = function (cfg, genJSON) {
    var i;
    var done = 0;
    var images = [];

    var dealImage = function (cfg, pos, onDone) {
        var o = {
            width: 256,
        };
        var img = cfg.images[pos];
        if (!img) {
            return;
        }
        o.srcPath = img.path;

        var finish = function () {

            genLegend(cfg, pos, images);

            done++;

            console.log(done + '/' + cfg.images.length);

            if (pos + NB_WORKERS < cfg.images.length) {
                dealImage(cfg, pos + NB_WORKERS, onDone);
            } else if (done == cfg.images.length) {
                onDone();
            }
        };

        var full = function () {
            var source = img.path;
            var dest = path.join(cfg.out, 'full',  pos + '.jpg');
            var data = fs.readFileSync(source);
            fs.writeFile(dest, data, function(err) {
                if (err) {
                    throw (err);
                }
            });

            finish();
        };

        var large = function () {
            o.dstPath = path.join(cfg.out, 'large', pos + '.jpg');
            o.width = 1024;
            o.heigth = 768;

            /* call imagemagick */
            im.resize(o, function(err, stdout, stderr) {
                if (err) throw err;
                im.identify(o.dstPath, function(err, features) {
                    if (err) throw err;
                    if (!images[pos]) images[pos] = {};

                    images[pos].l_w = features.width;
                    images[pos].l_h = features.height;

                    full();
                });
            });
        };

        // Generate thumbnail
        {
            o.dstPath = path.join(cfg.out, 'thumb', pos + '.jpg');

            /* call imagemagick */
            im.resize(o, function(err, stdout, stderr) {
                if (err) throw err;
                im.identify(o.dstPath, function(err, features) {
                    if (err) throw err;
                    if (!images[pos]) images[pos] = {};

                    images[pos].th_w = features.width;
                    images[pos].th_h = features.height;

                    large();
                });
            });
        }

    };


    var onDone = function () {
        if (genJSON) {
            genJSONs(cfg, images);
        }
    };
    for (i = 0; i < NB_WORKERS; i++) {
        dealImage(cfg, i, onDone);
    }
};


var genConfig = function(inPath, cfgPath) {
    var json = {
        images: [],
        out: 'out/',
        title: 'My pics'
    };

    var dirs = fs.readdirSync(inPath);
    for (var f in dirs) {
        var p = path.join(inPath, dirs[f]);
        var o = {
            path: p,
            legend: '',
            noGPS: true,
            lang: 'en',
            downloadMore: 'Download more images'
        };
        json.images.push(o);
    }

    fs.writeFile(cfgPath, JSON.stringify(json, null, 4), function(err) {
        if (err) {
            throw (err);
        }
    });
};



/* MAIN */

var usage = function() {
    util.print("usage: photoalbum command\n\n"
    + "command is one of the following:\n"
    + "genConfig input_directory output_config_file\n"
    + "  generate a configuration files about files in input_directory\n"
    + "setup config_file\n"
    + "  setup files in output directory\n"
    + "genJSONs config_file\n"
    + "  generate the JSONs files used by the web client\n"
    + "genImages\n"
    + "  generates thumbnails/large images and copy the full-size images\n"
    + "all config_file\n"
    + "  execute setup/genJSONs/genImages");
    process.exit(1);
};

var args = process.argv.splice(2);
if (args.length < 2) {
    usage();
}


switch (args[0]) {
  case "genConfig":
    genConfig(args[0], args[1]);
    break;
  case "setup":
    var cfg = getJSONFromPath(args[1]);
    setup(cfg);
    break;
  case "genJSONs":
    var cfg = getJSONFromPath(args[1]);
    var onDone = function (images) {
        genJSONs(cfg, images);
    };
    genImagesTabFromCfg(cfg, onDone);
    break;
  case "genImages":
    var cfg = getJSONFromPath(args[1]);
    doAll(cfg, false);
    break;
  case "all":
    var cfg = getJSONFromPath(args[1]);
    setup(cfg);
    doAll(cfg, true);
    break;
  default:
    usage();
}
