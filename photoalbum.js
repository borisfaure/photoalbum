#!/usr/bin/node

var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');
var jade = require('jade');
var im = require('imagemagick');

var images = [];

var setup = function (cfg) {
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
};

var genThumbs = function (cfg, onDone) {
    var i;
    var done = 0;
    cfg.images.forEach(function (img, i) {
        var o = {
            width: 256,
        };
        img._name = i;
        o.srcPath = img.path;
        img._thumb_name = 'thumb_'+i+'.jpg';
        o.dstPath = path.join(cfg.out, img._thumb_name);
        /* call imagemagick */
        im.resize(o, function(err, stdout, stderr) {
            if (err) throw err;
            im.identify(o.dstPath, function(err, features) {
                if (err) throw err;
                if (!images[i]) images[i] = {};
                images[i].th_w = features.width;
                images[i].th_h = features.height;

                done++;
                console.log(done + '/' + cfg.images.length);
                if (done == cfg.images.length) {
                    onDone();
                }
            });
        });
    });
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


var genJSONs = function (cfg, images) {
    var jsonPath = path.join(cfg.out, 'images.json');
    fs.writeFile(jsonPath, JSON.stringify(images, null, 4), function(err) {
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

//genIndex(cfg);
setup(cfg);
genThumbs(cfg, function () {
    genJSONs(cfg, images);
});
