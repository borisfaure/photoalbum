#!/usr/bin/node

var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');


var args = process.argv.splice(2);


var usage = function() {
    util.print("photoalbum config_file\n");
    process.exit(1);
};

if (args.length != 1) {
    usage();
}
console.log(args);
