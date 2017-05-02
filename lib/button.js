var rpio = require('rpio');
var mpd = require('mpd');
var cmd = mpd.cmd;

module.exports = Button;


function Button(pin,action,client){
	this.pin = pin;
	rpio.init({mapping:'gpio'});
	rpio.open(this.pin, rpio.INPUT,rpio.PULL_DOWN);
		
	this.action = action;
	this.client = client;

	rpio.poll(this.pin,function(pin){
		if(rpio.read(this.pin)){
			this.action(this.client,cmd);
		}		
	}.bind(this),rpio.POLL_HIGH);
}


