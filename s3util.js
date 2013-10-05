/* 
 * s3.js
 * 
 * AWS S3 utilities.
 * 
 * varsion		: 0.1.0 
 * createTime	: 2013-9-27
 * updateTime : 2013-9-27
 */

var util 	= require('util'), 
		fs 		= require('fs'), 
		aws 	= require('aws-sdk');

aws.config.loadFromPath(__dirname + '/awsconfig.json');
s3 = new aws.S3();

/* 
 * s3Get function
 * 
 * jobs, s3 get job objects array
 * 		job, s3 get job object
 * 			id, 		job id
 * 			bucket, s3 bucket
 * 			key, 		s3 key
 *			file, 	local file
 * callback, callback function
 *		doneJobs, finished s3 get job objects array
 * 			doneJob, finished s3 get job object	
 * 				id, 		job id
 * 				bucket, s3 bucket
 * 				key, 		s3 key
 * 				file, 	local file
 * 				e, 			error object	
 */
exports.s3Get = function(jobs, callback) {
	var doneJobs = [];
	var callCount = 0, backCount = 0;
	for (var i in jobs) {
		_s3Get(jobs[i], function(doneJob) {
			backCount++;
			util.log('backCount: ' + backCount);
			doneJobs.push(doneJob);
			util.log('s3 get job done: ' + JSON.stringify(doneJob, null, 2));
			
			if (backCount === callCount) {
				util.log('all s3 get jobs done');
				callback(doneJobs);
			}	
		});
		callCount++;
		util.log('callCount: ' + callCount);
	}
}

/*
 * s3Put function
 * 
 * jobs, s3 put job objects array
 * 		job, s3 put job object
 * 			id, 		job id
 * 			file, 	local file
 * 			bucket, s3 bucket
 * 			key, 		s3 key
 * callback, callback function
 * 		doneJobs, finished s3 put job objects array
 * 			doneJob, finished s3 put job object
 * 				id, 		job id
 *				file, 	local file
 * 				bucket, s3 bucket
 * 				key, 		s3 key
 * 				e, 			error object
 */
exports.s3Put = function(jobs, callback) {
	var doneJobs = [];
	var callCount = 0, backCount = 0;
	for (var i in jobs) {
		_s3Put(jobs[i], function(doneJob) {
			backCount++;
			util.log('backCount: ' + backCount);
			doneJobs.push(doneJob);
			util.log('s3 put job done: ' + JSON.stringify(doneJob, null, 2));

			if (backCount === callCount) {
				util.log('all s3 put jobs done');
				callback(doneJobs);
			}
		});
		callCount++;
		util.log('callCount: ' + callCount);
	}
}

function _s3Get(job, callback) {
	var doneJob = job;
	s3.getObject({Bucket: job.bucket, Key: job.key}, function(e, data) {
		if (e) {
			doneJob.e = e;
			callback(doneJob.e);
			return;
		} 
		fs.writeFile(job.file, data.Body, function(e) {
			doneJob.e = e;
			callback(doneJob);
			return;
		});
	});
}

function _s3Put(job, callback) {
	var doneJob = job;
	fs.readFile(job.file, function(e, data) {
		if (e) { 
			doneJob.e = e;
			callback(doneJob);
			return;
		} 
		s3.putObject({Bucket: job.bucket, Key: job.key, Body: data}, function(e, info) {
			util.log(JSON.stringify(info, null, 2));
			doneJob.e = e;
			callback(doneJob);
			return;
		});
	});
}

