/*
 * encoder.js
 *
 * Encoder node module.
 *
 * version			: 0.2.0
 * create date	: 2013-9-6
 * update date 	: 2013-9-25
 */

var util 		= require('util'), 
		events 	= require('events'),
		cp 			= require('child_process');

function Encoder() {
	events.EventEmitter.call(this);
	this.ffmpeg = null;
}

util.inherits(Encoder, events.EventEmitter);

Encoder.prototype.start = function(src, dst, params) {
	util.log(util.format('ffmpeg -i %s -y %s %s', src, params, dst));
	var cmd = util.format('-i %s -y %s %s', src, params, dst).split(' ');
	this.ffmpeg = cp.spawn('ffmpeg', cmd);
	util.log('encoding start');
	
	var self = this;
	this.ffmpeg.on('close', function(code, signal) {
		self.ffmpeg = null;
		if (code != null) {
			if (code == 0) {
				util.log('encoding succeed');
				self.emit('succeed');
			} else {
				util.log('encoding failed: ' + code);
				self.emit('error', {message: 'encoding failed: ' + code});
			}
		}
		if (signal != null) {
			util.log('encoding aborted');
			self.emit('aborted');
		}
	});
}

Encoder.prototype.stop = function() {
	if (this.ffmpeg) {
		util.log('stopping encoding');
		this.ffmpeg.kill('SIGABRT');
	}
}

module.exports = Encoder;


