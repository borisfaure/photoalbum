#!/usr/bin/node

var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');
var jade = require('jade');
var im = require('imagemagick');



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
        console.log(img);
        im.resize(o, function(err, stdout, stderr) {
            if (err) throw err;
            console.log('resized done');
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

genIndex(cfg);
