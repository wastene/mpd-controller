var mpd = require('mpd');
var cmd = mpd.cmd;


var RotaryEncoder = require('./lib/rotary-encoder');
var Button = require('./lib/button');
var LCD = require('./lib/lcd-i2c');

var CLK_PIN = 20;
var DT_PIN = 21;
var PLAY_PIN = 13;
var PAUSE_PIN = 19;
var NEXT_PIN = 16;
var PREV_PIN = 26;

var PLAY_FUNC = function(client,cmd){
        client.sendCommand(cmd("play",[]),null);
};
var PAUSE_FUNC = function(client,cmd){
        client.sendCommand(cmd("pause",[]),null);
};
var NEXT_FUNC = function(client,cmd){
        client.sendCommand(cmd("next",[]),null);
};
var PREV_FUNC = function(client,cmd){
        client.sendCommand(cmd("previous",[]),null);
};


function MPDController(){

	this.client = mpd.connect();
	var connect = false;
	this.client.on('ready', function(){
		connect = true;
	});
	while(!connect){require('deasync').sleep(5);}

	this.encoder = new RotaryEncoder(CLK_PIN,DT_PIN,this.client);
	
	// Check for volume
	this.client.on('system-mixer',function(){
		this.getVolume();
		/*
		this.client.sendCommand(cmd("status",[]),function(err,msg){
			if(err) console.log(err);
			else {
				var response = mpd.parseKeyValueMessage(msg);
				var volume = response.volume;
				this.encoder.setValue(volume);
			}
		}.bind(this));
		*/
		
	}.bind(this.encoder));

	this.playBtn = new Button(PLAY_PIN, PLAY_FUNC, this.client);
	this.pauseBtn = new Button(PAUSE_PIN, PAUSE_FUNC,this.client);
	this.nextBtn = new Button(NEXT_PIN, NEXT_FUNC,this.client);
	this.prevBtn = new Button(PREV_PIN, PREV_FUNC,this.client);
	
	

	this.lcd = new LCD(0x27);
	this.lcd.clear();
	this.lcd.off();
	
	this.client.sendCommand(cmd('status',[]),function(err,msg){
		if(err) console.log(err);
		else {
			var response = mpd.parseKeyValueMessage(msg);
			if(response.state == 'play'){
				this.lcd.on();
				this.setCurrentSong();
				this.printTime();
				
				clearInterval(this.timeInterID);
				this.timeInterID = setInterval(timeInterval, 1000,this);
			}else {
				this.lcd.off();
			}
		}
	}.bind(this));
	
	// Check for play/pause and next song
	this.client.on('system-player',function(){

		this.client.sendCommand(cmd("status", []), function(err, msg){
			if(err) console.log(err);
			else {
				var response = mpd.parseKeyValueMessage(msg);
				if(response.state == 'play'){
					this.lcd.on();
					this.setCurrentSong();					

					this.printTime();
					clearInterval(this.timeInterId);
					this.timeInterID = setInterval(timeInterval,1000,this);
				}else {
					clearInterval(this.timeInterID);
						
					this.lcd.off();
				}
			}
		}.bind(this));
	}.bind(this));
		
}
function timeInterval(controller){
	controller.printTime();
}
function intTimeToStr(time){
	time = parseInt(time);
	var seconds = time%60;
	var str = parseInt(time/60)+":"+(seconds<10?"0"+seconds:seconds);
	return str;
}

MPDController.prototype.printTime = function(){
	this.client.sendCommand(cmd('status',[]),function(err,msg){
		if(err) console.log(err);
		else {
			this.lcd.cprint(intTimeToStr(mpd.parseKeyValueMessage(msg).time),2,6);
		}
	}.bind(this));
}
MPDController.prototype.setCurrentSong = function(){
	this.client.sendCommand(cmd('currentsong',[]),function(err,msg){
		if(err) console.log(err);
		else {
			var response = mpd.parseKeyValueMessage(msg);
			this.printToLCD(response.Title);
		}
	}.bind(this));
}
MPDController.prototype.printToLCD = function(str){
	if(str.length > 16){

		clearInterval(this.lcdID);
		this.lcdPos = 0;
		this.lcdID = setInterval(function(lcdStr){
			
			if(this.lcdPos >= lcdStr.length) this.lcdPos = 0;
	
			var currStr = lcdStr.substr(this.lcdPos, lcdStr.length-this.lcdPos);
			currStr += '   ';
			currStr += lcdStr.substr(0, 16);
			currStr = currStr.substr(0, 16);
			
			this.lcd.cprint(currStr,1,0);
			this.lcdPos++;

		}.bind(this),750,str);

	}else {
		clearInterval(this.lcdID);
		this.lcd.cprint(str,1,0);

		for(var i=str.length; i<=16;i++){
			this.lcd.print(' ');
		}
	}
}
module.exports = MPDController;
