#!/usr/bin/node

var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');
var jade = require('jade');
var im = require('imagemagick');

var images = [];
var NB_WORKERS = 100;

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
    }
    copy('index.html');
    copy('jquery.min.js');
    copy('photoalbum.js');
    copy('photoalbum.css');
};

var done = 0;

var genThumb = function (cfg, pos, onDone) {
    var o = {
        width: 256,
    };
    var img = cfg.images[pos];
    if (!img) {
        return;
    }
    img._name = pos;
    o.srcPath = img.path;
    img._thumb_name = 'thumb_' + pos + '.jpg';
    o.dstPath = path.join(cfg.out, img._thumb_name);
    /* call imagemagick */
    im.resize(o, function(err, stdout, stderr) {
        if (err) throw err;
        im.identify(o.dstPath, function(err, features) {
            if (err) throw err;
            if (!images[pos]) images[pos] = {};
            images[pos].th_w = features.width;
            images[pos].th_h = features.height;

            done++;

            console.log(done + '/' + cfg.images.length);

            if (pos + NB_WORKERS < cfg.images.length) {
                genThumb(cfg, pos + NB_WORKERS, onDone);
            } else
            if (done == cfg.images.length) {
                onDone();
            }
        });
    });
};



var genJSONs = function (cfg, images) {
    var jsonPath = path.join(cfg.out, 'images.json');
    fs.writeFile(jsonPath, JSON.stringify(images, null, 4), function(err) {
        if (err) {
            throw (err);
        }
    });
};

var main = function (cfg) {
    var i;

    var onDone = function () {
        genJSONs(cfg, images);
    };
    for (i = 0; i < NB_WORKERS; i++) {
        genThumb(cfg, i, onDone);
    }
};


var genIndex = function (cfg) {
    var j = fs.readFileSync('template/index.haml');

    var fn = jade.compile(j);

    var i;
    var o = {
        width: 256,
    };
    for (i in cfg.images) {
        var img = cfg.images[i];
        img._name = i;
        o.srcPath = img.path;
        img._thumb_name = 'thumb_'+i+'.jpg';
        o.dstPath = path.join(cfg.out, img._thumb_name);
        /* call imagemagick */
        im.resize(o, function(err, stdout, stderr) {
            if (err) throw err;
        });
    }
    var html = fn({pics: cfg.images});

    var indexPath = path.join(cfg.out, 'index.html');
    fs.writeFile(indexPath, html, function(err) {
        if (err) {
            throw (err);
        }
    });
};





var args = process.argv.splice(2);


var usage = function() {
    util.print("photoalbum config_file\n");
    process.exit(1);
};

if (args.length != 1) {
    usage();
}

var data = fs.readFileSync(args[0]);
var cfg = JSON.parse(data);

//setup(cfg);
main(cfg);
