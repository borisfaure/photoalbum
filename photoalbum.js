#!/usr/bin/node

var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');
var jade = require('jade');




var genIndex = function (cfg) {
    var j = fs.readFileSync('template/index.haml');

    var fn = jade.compile(j);

    var html = fn({pics: cfg.images});
    console.log(html);

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
