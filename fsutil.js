/* 
 * fsutil.js
 * 
 * file system utilities.
 *
 * version 			: 0.1.0
 * createTime 	: 2013-9-29
 * updateTime 	: 2013-9-29
 */

var util 	= require('util'),
		fs 		= require('fs');

/*
exports.listFiles = function(path, baseName, callback) {
	var files = [];
	fs.readdir(path, function(e, all) {
		if (e) {
			callback(e, files);
			return;
		}
		for (var i in all) {
			if (all[i].indexOf(baseName) === 0) {
				files.push(all[i]);
			}
		}
		callback(null, files);
		return;
	});
}
*/

exports.listFiles = function(path, baseName, callback) {
	var files = [];
	fs.readdir(path, function(e, all) {
		if (e) {
			callback(e, files);
			return;
		}
		for (var i in all) {
			var re = new RegExp(util.format('^%s(\\d+\\.ts|\\.m3u8)$', baseName), 'i');
			if (all[i].search(re) != -1) {
				files.push(all[i]);
			}
		}
		callback(null, files);
		return;
	});
}


