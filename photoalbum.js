#!/usr/bin/node

/* {{{ Globals */

var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');
var im = require('imagemagick');
var crypto = require('crypto');
var mime = require('mime');
var http = require('http');
var url = require('url');


var DEFAULT_HTTP_PORT = 8080;
var NB_WORKERS = 10;
var IMAGES_PER_JSON = 50;

var cfgPath;

var editorFiles = [
    'photoalbum.editor.js',
    'photoalbum.editor.css',
    'jquery-ui.min.js',
    'jquery-ui.min.css',
    'edit.png',
    'del.png',
    'list.png',
    'save.png'
];
var indexFiles = [
    'photoalbum.css',
    'prev.png',
    'next.png',
    'play.png',
    'pause.png',
    'loading.gif',
    'photoalbum.js'
];
var bothFiles = [
    'jquery.min.js',
    'jquery.tipsy.js',
    'tipsy.css',
    'markdown.js',
    'black_paper.png',
    'thumbs.png'
];

var directories = [
    'json',
    'large',
    'thumb',
    'full'
];

/* }}} */
/* {{{ Utils */

if (!Object.prototype.keys) {
    Object.prototype.keys = function() {
        if (typeof this !== 'object') {
            throw new TypeError('Object.keys called on non-object');
        }
        var ret = [];
        var p;
        for (p in this) {
            if (Object.prototype.hasOwnProperty.call(this, p)) {
                ret.push(p);
            }
        }
        return ret;
    };
}

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
    fs.writeFile(cfgPath, JSON.stringify(cfg, null, 4), function(err) {
        if (err) {
            throw (err);
        }
    });
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

var genHtmlFile = function (cfg, source, onDone) {
    fs.readFile(source, {encoding: 'UTF-8'}, function (err, data) {
        if (err) {
            throw err;
        }
        data = data.replace(/%%TITLE%%/g, cfg.title || '');
        data = data.replace(/%%IMAGES_PER_JSON%%/g, IMAGES_PER_JSON);
        data = data.replace(/%%LANG%%/g, cfg.lang || 'en');
        var translations = getJSONFromPath('translations.json');
        data = data.replace(/%%TRANSLATIONS%%/g,
                            JSON.stringify(translations[cfg.lang] || {},
                                           null, 1));
        var langs = ["en"].concat(translations.keys());
        data = data.replace(/%%AVAILABLE_LANGS%%/g,
                            JSON.stringify(langs, null, 1));
        data = data.replace(/%%CFG%%/g,
                            JSON.stringify(cfg, null, 1));

        var _ = function (str) {
            return translations[str] || str;
        };
        data = data.replace(/%%DOWNLOAD_MORE%%/g, _('Download more images'));
        data = data.replace(/%%GENERATE_CFG%%/g, _('Generate config.json'));
        data = data.replace(/%%EDIT_TITLE%%/g, _('Title of the album: '));
        data = data.replace(/%%OUT_DIR%%/g, _('Output directory of the album: '));
        data = data.replace(/%%SELECT_LANG%%/g, _('Language of the album: '));
        onDone(data);
    });
};

/* }}} */
/* {{{ Setup */

var setup = function (cfg, isEditor) {

    var workHtmlFile = function (filename) {
        var source = path.join('htdocs', filename);
        genHtmlFile(cfg, source, function (data) {
            var dest = path.join(cfg.out, filename);
            fs.writeFile(dest, data, function(err) {
                if (err) {
                    throw (err);
                }
            });
        });
    };


    var copyFilesList = function (l) {
        var i;
        for (i = 0; i < l.length; i++) {
            var filename = l[i];

            /* TODO: check file dates, do 'à la' make */
            var src = path.join('htdocs', filename);
            var dst = path.join(cfg.out, filename);
            var srcStream = fs.createReadStream(src);
            var dstStream = fs.createWriteStream(dst);

            srcStream.pipe(dstStream);
        }
    };

    if (isEditor) {
        copyFilesList(editorFiles); // includes editor.html
        workHtmlFile('editor.html');
    } else {
        copyFilesList(indexFiles); // includes index.html
        workHtmlFile('index.html');
    }
    copyFilesList(bothFiles);

    /* mkdir */
    var i;
    for (i = 0; i < directories.length; i++) {
        var dir = directories[i];
        var p = path.join(cfg.out, dir);
        fs.stat(p, function (err) {
            if (err) {
                fs.mkdir(p);
            }
        });
    }
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
                        l: genLegend(img.legend),
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
                l: genLegend(img.legend),
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
            util.print('\rgenerating thumbnails: ' + done + '/' + cfg.images.length);

            if (pos + NB_WORKERS < cfg.images.length) {
                dealImage(cfg, pos + NB_WORKERS, onDone);
            } else if (done == cfg.images.length) {
                util.print('\n');
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
/* {{{ copyFull */

var copyIfNotExits = function (src, dst, onDone) {
    fs.exists(dst, function (exists) {
        if (exists) {
            if (onDone) {
                onDone();
            }
            return;
        }

        var srcStream = fs.createReadStream(src);
        var dstStream = fs.createWriteStream(dst);

        if (onDone) {
            dstStream.on('close', onDone);
        }
        srcStream.pipe(dstStream);
    });
};

var copyFull = function (cfg, onDone) {
    var done = 0;
    var worker;

    worker = function (pos) {
        var img = cfg.images[pos];
        if (!img) {
            return;
        }
        var finish = function (pos) {
            done++;
            util.print('\rcopying full images: ' + done + '/' + cfg.images.length);
            if (pos + NB_WORKERS < cfg.images.length) {
                worker(pos + NB_WORKERS);
            } else if (done == cfg.images.length) {
                util.print('\n');
                onDone();
            }
        };
        copyIfNotExits(img.path,
                       path.join(cfg.out, 'full', img.md5 + '.jpg'),
                       function() {
                           finish(pos);
                       });
    };

    for (i = 0; i < NB_WORKERS; i++) {
        worker(i);
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
            util.print('\rworking on images: ' + done + '/' + cfg.images.length);
            if (pos + NB_WORKERS < cfg.images.length) {
                dealImage(cfg, pos + NB_WORKERS, onDone);
            } else if (done == cfg.images.length) {
                util.print('\n');
                onDone();
            }
        };

        var full = function () {
            var dest = path.join(cfg.out, 'full',  img.md5 + '.jpg');

            copyIfNotExits(img.path, dest, finish);
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
/* {{{ addImages */

var addImages = function (cfg, cfgPath, images, inPath) {

    var done = 0;
    var checkImage;
    checkImage = function(f) {
        if (f >= images.length) {
            return;
        }

        var onDone = function () {
            done++;
            util.print('\ranalysing files: ' + done + '/' + images.length);

            if (f + NB_WORKERS < images.length) {
                checkImage(f + NB_WORKERS);
            } else if (done == images.length) {
                util.print('\n' + cfg.images.length + ' images found\n');
                if (inPath) {
                    cfg.images.sort(function(imgA, imgB) {
                        if (imgA.path < imgB.path) {
                            return -1;
                        } else if (imgA.path > imgB.path) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });
                }
                saveCfg(cfgPath, cfg);
            }
        };

        var p = (inPath) ? path.join(inPath, images[f]) : images[f];
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
                cfg.images.push(o);
                onDone();
            });
        });
    };
    for (i = 0; i < NB_WORKERS; i++) {
        checkImage(i);
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

    util.print('Checking ' + dirs.length + ' files in ' + inPath);

    addImages(json, cfgPath, images, inPath)
};

/* }}} */
/* {{{ cleanup */

var cleanup = function (cfg) {
    var images = {};
    var i;
    for (i = 0; i < cfg.images.length; i++) {
        var img = cfg.images[i];
        if (img.md5) {
            images[img.md5 + '.jpg'] = true;
        }
    }

    var cleanupDir = function (allowedFiles, dir) {
        var dirPath = (dir) ? path.join(cfg.out, dir) : cfg.out;
        fs.readdir(dirPath, function (err, files) {
            if (err) {
                throw err;
            }
            var i;
            for (i = 0; i < files.length; i++) {
                (function(){
                    var filename = files[i];
                    if (!allowedFiles[filename]) {
                        var f = path.join(dirPath, filename);
                        fs.stat(f, function (err, stats) {
                            if (err) {
                                throw err;
                            }
                            if (stats.isDirectory()) {
                                console.err(f + ' is a directory that should'
                                            + ' be cleaned up');
                            } else {
                                fs.unlink(f, function (err) {
                                    if (err) {
                                        throw err;
                                    }
                                });
                            }
                        });
                    }
                })();
            }
        });
    };

    cleanupDir(images, 'full');
    cleanupDir(images, 'large');
    cleanupDir(images, 'thumb');


    fs.readdir('htdocs', function (err, files) {
        if (err) {
            throw err;
        }
        var i;
        var allowedFiles = {};
        var setupAllowedFiles = function (l) {
            for (i = 0; i < l.length; i++) {
                var filename = l[i];
                allowedFiles[filename] = true;
            }
        };
        setupAllowedFiles(indexFiles);
        setupAllowedFiles(bothFiles);
        setupAllowedFiles(directories);

        cleanupDir(allowedFiles);
    });

    var jsonNb = Math.ceil(cfg.images.length / IMAGES_PER_JSON);
    var i;
    var allowedFiles = {};
    for (i = 0; i < jsonNb; i++) {
        allowedFiles['images_' + i + '.json'] = true;
    }
    cleanupDir(allowedFiles, 'json');
};

/* }}} */
/* {{{ server */

var server = function (cfg, cfgPath) {
    var httpSimple = function(code, response) {
        response.writeHead(code, {'Content-Type': 'text/html'});
        response.end('<h1>' + http.STATUS_CODES[code] + '</h1>');
    };

    var serveStaticFile = function (pathname, response) {
        pathname = pathname.substr(1); // remove the leading '/'

        var filePath = path.join(cfg.out, pathname)
        fs.stat(filePath, function (err, stat) {
            if (err) {
                httpSimple(404, response);
                return;
            }

            var type = mime.lookup(filePath);
            response.writeHead(200, {
                'Content-Type': type,
                'Content-Length': stat.size
            });
            var readStream = fs.createReadStream(filePath);
            readStream.pipe(response);
        });
    };

    var handler = function (request, response) {
        if (request.method === 'GET') {
            var urlParts = url.parse(request.url, false);
            switch (urlParts.pathname) {
              case '/foo':
                response.writeHead(200, {'Content-Type': 'text/plain'});
                response.end('bar');
                break;
              case '/editor.html':
                /* regenerate editor.html on the fly */
                var source = 'htdocs/editor.html';
                genHtmlFile(cfg, source, function (data) {
                    var buf = Buffer(data);
                    response.writeHead(200, {
                        'Content-Type': 'text/html',
                        'Content-Length': buf.length
                    });
                    response.end(buf);
                });
                break;
              case '/':
                urlParts.pathname = '/index.html';
                break;
            }
            serveStaticFile(urlParts.pathname, response);
        } else if (request.method === 'POST') {
            var urlParts = url.parse(request.url, false);
            if (urlParts.pathname !== '/save') {
                httpSimple(501, response);
                return;
            }
            var data = "";
            request.on('data', function (chunk) {
                data += chunk;
            });
            request.on('end', function () {
                httpSimple(200, response);
                fs.writeFile(cfgPath, data, function(err) {
                    if (err) {
                        throw (err);
                    }
                });
            })
        } else {
            httpSimple(501, response);
        }
    };
    http.createServer(handler).listen(DEFAULT_HTTP_PORT);

    console.log('Server running at http://localhost:' + DEFAULT_HTTP_PORT + '/'
                + '\neditor available at http://localhost:' + DEFAULT_HTTP_PORT
                + '/editor.html');
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
    + "genEditor config_file\n"
    + "  generate an editor.html file in output directory\n"
    + "genJSONs config_file\n"
    + "  generate the JSONs files used by the web client\n"
    + "genImages config_file\n"
    + "  generates thumbnails/large images and copy the full-size images\n"
    + "server config_file\n"
    + "  launch an http server to use the editor and the resulting"
    +  " photoalbum\n"
    + "addImages config_file [images...]\n"
    + "  add the given images to the configuration file\n"
    + "cleanup\n"
    + "  remove unused files in the output directory. Use with caution.\n"
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
  case "genEditor":
    var cfg = getJSONFromPath(args[1]);
    setup(cfg);
    var onDone = function () {
        setup(cfg, true);
        copyFull(cfg, function() {
            saveCfg(args[1], cfg);
        });
    };
    genThumbs(cfg, onDone);
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
  case "addImages":
    var cfg = getJSONFromPath(args[1]);
    addImages(cfg, args[1], args.slice(2));
    break;
  case "cleanup":
    var cfg = getJSONFromPath(args[1]);
    cleanup(cfg);
    break;
  case "server":
    var cfg = getJSONFromPath(args[1]);
    server(cfg, args[1]);
    break;
  default:
    usage();
}

/* }}} */
