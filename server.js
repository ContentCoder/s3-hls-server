/*
 * server.js
 *
 * HTTP Live Streaming encoding server for AWS S3.
 * 
 * version 			: 0.2.0
 * create date	: 2013-9-24
 * update date 	: 2013-9-27
 */

var util 		= require('util'),
		fs 			= require('fs'),  
		http 		= require('http'), 
		url 		= require('url'),
		uuid 		= require('node-uuid'), 
		request	= require('request'),
		s3util 	= require(__dirname + '/s3util'),
		fsutil 	= require(__dirname + '/fsutil'), 
		Encoder = require(__dirname + '/encoder');

var config, enc, task;

init();

function init() {
	// load configuration file
	config = JSON.parse(fs.readFileSync(__dirname + '/config.json').toString());
	util.log('config: ' + JSON.stringify(config, null, 2));

	// prepare work directory
	if (!fs.existsSync(config.workDir)) {
		util.log('work dir does not exist');
		fs.mkdirSync(config.workDir);
		util.log('make work dir: ' + config.workDir);
	} else {
		util.log('work dir exist');
	}
	emptyWorkDir();

	// create encoder
	enc = new Encoder();

	// create http server
	http.createServer(function(req, res) {
		util.log(req.method + req.url);
		req.parsedUrl = url.parse(req.url, true);	
		switch (req.method + req.parsedUrl.pathname) {
		case 'POST/encode/start':
			encodeStart(req, res);
			break;
		case 'POST/encode/stop':
			encodeStop(req, res);
			break;
		case 'GET/encode/status':
			encodeStatus(req, res);
			break;
		default:
			util.log('Not Found!');
			res.statusCode = 404;
			res.end();
			break;
		}
	}).listen(config.encodeServerPort, '127.0.0.1');
	util.log(util.format('s3 encode server running at %d port...', config.encodeServerPort));
}

function emptyWorkDir() {
	var files = fs.readdirSync(config.workDir);
	for (var i = 0; i < files.length; i++) {
		fs.unlink(config.workDir + '/' + files[i], function(e) {
			if (e) {
				util.log(JSON.stringify(e, null, 2));
			}
		});
		util.log('unlink: ' + config.workDir + '/' + files[i]);
	}
}

function encodeStart(req, res) {
	var body = '';
	req.setEncoding('utf8');
	req.on('data', function(chunk) {
		body += chunk;
	});

	req.on('end', function() {
		util.log(body);
		task = JSON.parse(body);
		task.userAbort = false;
		emptyWorkDir();
	
		var dstExt = task.dstKey.slice(task.dstKey.lastIndexOf('.'));
		var srcFile = task.id + '-ori',
				dstFile = task.id + '-enc' + dstExt;

		task.startTime = new Date().getTime();

		var getJobs = [
			{
				id			: 0, 
				bucket	: task.srcBucket, 
				key			: task.srcKey, 
				file		: config.workDir + '/' + srcFile
			}
		];
		s3util.s3Get(getJobs, function(doneGetJobs) {
			if (task.userAbort) {
				taskAborted();
				return;
			}

			if (doneGetJobs[0].e) {	
				taskFailed(doneGetJobs[0].e);
				return;
			} 

			enc.removeAllListeners();
			enc.on('error', 	taskFailed);
			enc.on('aborted', taskAborted);
			enc.on('succeed', function() {
				fsutil.listFiles(config.workDir, task.id + '-enc', function(e, dstFiles) {
					util.log(JSON.stringify(dstFiles, null, 2));
					var dstDir = task.dstKey.slice(0, task.dstKey.lastIndexOf('/') + 1);

					var putJobs = []; 
					for (var i in dstFiles) {
						var putJob 		= {};
						putJob.id 		= i;
						putJob.file 	= config.workDir + '/' + dstFiles[i];
						putJob.bucket = task.dstBucket;
						putJob.key 		= (dstFiles[i] === dstFile) ? task.dstKey : dstDir + dstFiles[i];
						putJobs[i] 		= putJob;
					}

					s3util.s3Put(putJobs, function(donePutJobs) {
						var e = null;
						for (var i in donePutJobs) {
							if (donePutJobs[i].e) {
								e = donePutJobs[i].e;
								break;
							}
						}
						if (e) {
							taskFailed(e);
						} else {
							taskSucceed();
						}
					});
				});
			});
			enc.start(config.workDir + '/' + srcFile, config.workDir + '/' + dstFile, task.params);
		});

		task.status = 'processing';
		res.statusCode = 200;
		res.end(JSON.stringify(task));
	});
}

function encodeStop(req, res) {
	if (req.parsedUrl.query.id == task.id) {
		if (task.status == 'processing') {
			task.userAbort = true;
			enc.stop();
		}
		res.statusCode = 200;
		res.end(JSON.stringify(task));
	} else {
		res.statusCode = 200;
		res.end();
	}
}

function encodeStatus(req, res) {
	if (req.parsedUrl.query.id == task.id) {
		res.statusCode = 200;
		res.end(JSON.stringify(task));
	} else {
		res.statusCode = 200;
		res.end();
	}
}

function taskSucceed() {
	task.status 	= 'succeed';
	task.endTime 	= new Date().getTime();
	emptyWorkDir();
	util.log('task succeed.');
}

function taskFailed(e) {
	task.status 	= 'failed';
	task.endTime 	= new Date().getTime();
	emptyWorkDir();
	util.log('task failed: ' + JSON.stringify(e, null, 2));
}

function taskAborted() {
	task.status 	= 'aborted';
	task.endTime 	= new Date().getTime();
	emptyWorkDir();
	util.log('task aborted.');
}


