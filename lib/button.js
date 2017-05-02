var rpio = require('rpio');
var mpd = require('mpd');
var cmd = mpd.cmd;

//var deasync = require('deasync');
//var BtnThread = require('./btnThread');

module.exports = Button;


function Button(pin,action,client){
	this.pin = pin;
	rpio.init({mapping:'gpio'});
	rpio.open(this.pin, rpio.INPUT,rpio.PULL_DOWN);
	
	//rpio.pud(this.pin, rpio.PULL_DOWN);
	this.lastState = 0;
	
	this.action = action;
	this.client = client;

	rpio.poll(this.pin,function(pin){
		if(rpio.read(this.pin)){
			this.action(this.client,cmd);
		}		
	}.bind(this),rpio.POLL_HIGH);

/*
	this.thread = new BtnThread(this.pin,this.action,this.client);
	setInterval(function(thread){
		thread.check();
	},60,this.thread);

*/
}


