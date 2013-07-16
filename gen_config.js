#!/usr/bin/node

var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');


var args = process.argv.splice(2);


var usage = function() {
    util.print("gen_config.js input_directory output_config_file\n");
    process.exit(1);
};

if (args.length != 2) {
    usage();
}

var inPath = args[0];
var cfgPath = args[1];

var json = {
    images: [],
    out: 'out/'
};

var dirs = fs.readdirSync(inPath);
for (var f in dirs) {
    var p = path.join(inPath, dirs[f]);
    var o = {
        path: p,
        legend: undefined,
    };
    json.images.push(o);
}

fs.writeFile(cfgPath, JSON.stringify(json, null, 4), function(err) {
    if (err) {
        throw (err);
    }
});
