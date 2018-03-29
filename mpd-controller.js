var mpd = require('mpd');
var cmd = mpd.cmd;

var RotaryEncoder = require('./lib/rotary-encoder');
var Button = require('./lib/button');
var LCD = require('./lib/lcd-i2c');


function MPDController(){

	// 0 => normal songs, 1 => Radio
	this.state = 0;

	this.currentTime = 0;

	this.client = mpd.connect();
	var connect = false;
	this.client.on('ready', function(){
		connect = true;
	});
	while(!connect){require('deasync').sleep(5);}

	this.buttons = {};
	// Menu is open or not
	this.menu = false;

	// Labels for menu
	this.menuLabels = ['Playlists'];

	// Menu-State, name of current menu. (menu for first)
	this.menuState = "menu";

	// Current menu position
	this.menuPosition = 0;

	// Current menu array options
	this.menuOptions = this.menuLabels;

	// Playlists
	this.playlists = [];
	this.getPlaylists();


	// Check for volume
  	this.client.on('system-mixer',function(){
		this.encoder.getVolume();

		this.client.sendCommand(cmd('status',[]),function(err,msg){
			if(err) console.log(err);
			else {
				this.volume = mpd.parseKeyValueMessage(msg).volume;
				this.displayVolume();
			}
		}.bind(this));
	}.bind(this));

	this.lcd = new LCD(0x27);
	this.lcd.clear();
	this.lcd.off();

	this.client.sendCommand(cmd('status',[]),function(err,msg){
		if(err) console.log(err);
		else {
			var response = mpd.parseKeyValueMessage(msg);
			if(response.state == 'play'){
				this.lcd.on();
				this.currentTime = parseInt(response.time);
				if(this.menu == false){
					this.setCurrentSong();
				}
				this.printTime();
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
					this.lcd.clear();
					this.currentTime = parseInt(response.time);
					if(this.menu == false){
						this.setCurrentSong();
					}
					this.printTime();
				}else {
					clearInterval(this.timeInterID);

					this.lcd.off();
				}
			}
		}.bind(this));
	}.bind(this));

}
function intTimeToStr(time){
	time = parseInt(time);
	var seconds = time%60;
	var str = parseInt(time/60)+":"+(seconds<10?"0"+seconds:seconds);
	return str;
}

MPDController.prototype.addButton = function(gpio, callback){
	this.buttons[gpio] = new Button(gpio, callback, this.client);
}

MPDController.prototype.removeButton = function(gpio){
	this.buttons[gpio] = undefined;
}

MPDController.prototype.setRotaryEncoder = function(clkPin, dtPin){
	this.encoder = new RotaryEncoder(clkPin, dtPin, this.client);
}


MPDController.prototype.printTime = function(){
	clearInterval(this.timeInterID);
	if(this.state != 0 || this.menu){
		return;
	}
	this.lcd.clearLine(2);
	this.middlePrint(intTimeToStr(this.currentTime),2);
	this.timeInterID = setInterval(function(){
		this.currentTime+=1;
		if(this.state == 0 && this.menu == false){
			this.middlePrint(intTimeToStr(this.currentTime),2);
		}
	}.bind(this),1000);
}

MPDController.prototype.displayClock = function(){
	clearInterval(this.clockInterID);
	if(this.state != 1 || this.menu){
		return;
	}
	this.lcd.clearLine(2);
	this.middlePrint(getCurrentClockString(),2);

	this.clockInterID = setInterval(function(){
		if(this.state == 1 && this.menu == false){
			var str = getCurrentClockString();
			this.middlePrint(str,2);
		}
	}.bind(this),1000);

}

var getCurrentClockString =  function(){
	var date = new Date();
	var hours = date.getHours() >= 10 ? date.getHours() : "0"+date.getHours();
	var mins = date.getMinutes() >= 10 ? date.getMinutes() : "0"+date.getMinutes();
	var secs = date.getSeconds() >= 10 ? date.getSeconds() : "0"+date.getSeconds();
	return hours+":"+mins+":"+secs;
}

MPDController.prototype.setCurrentSong = function(){
	this.client.sendCommand(cmd('currentsong',[]),function(err,msg){
		if(err) console.log(err);
		else {
			if(this.menu){
				return;
			}

      var title = mpd.parseKeyValueMessage(msg).Title;
			if(title === undefined){
				return;
			}
      if(title.length > 16){
				this.lcd.clearLine(1);
				this.lcd.cprint(title.substring(0,16),1,0);
        this.lcd.startScroll(title+" * ");
			}else {
  			this.lcd.endScroll();
				this.lcd.clearLine(1);
				this.middlePrint(title,1);
			}
		}
	}.bind(this));
}
MPDController.prototype.middlePrint = function(str,row){
	var shift = 0;
	if(str.length > 16){
		shift = 0;
	}else {
		shift = Math.floor((16-str.length)/2);
	}
	this.lcd.cprint(str,row,shift);
}


MPDController.prototype.displayVolume = function(){
  	var volume = this.volume;
  	volume = volume<10?'  '+volume:volume<100?' '+volume:volume;
  	clearInterval(this.timeInterID);
		if(this.menu == false){
			this.middlePrint("Vol: "+volume+"%",2);
  	}
  	clearTimeout(this.volumeID);
  	this.volumeID = setTimeout(function(){
				if(this.menu){
					return;
				}
    		this.lcd.clearLine(2);
				this.printTime();
  	}.bind(this),2000);
}

MPDController.prototype.toggleMenu = function(){
	this.lcd.endScroll();
	this.lcd.clear();
	if(this.menu){
		this.menu = false;
		this.setCurrentSong();
		if(this.state == 0){
			this.printTime();
		}else if(this.state == 1){
			this.displayClock();
		}
	}else {
		this.menu = true;
		this.menuState = "menu";
		this.menuPosition = 0;
		this.menuOptions = this.menuLabels;
		this.reloadMenu();
	}
}

MPDController.prototype.action = function(action){
	action = action.toLowerCase();
	switch(action){
		case "0":	this.state = 0;
		 	break;
			this.reloadState();
		case "1": this.state = 1;
			this.reloadState();
			break;
		case "channelup":
		case "channeldown":
			if(this.state == 0){
				this.state = 1;
			}else if(this.state == 1){
				this.state = 0;
			}
			this.reloadState();
			break;
		case "play":
		case "pause":
			this.client.sendCommand(cmd("pause",[]));
			break;
		case "stop":
			this.client.sendCommand(cmd("stop",[]));
			break;
		case "nextsong":
			this.client.sendCommand(cmd("next",[]));
			break;
		case "previoussong":
			this.client.sendCommand(cmd("previous,[]"));
			break;
			default:
				break;
	}
}

MPDController.prototype.reloadState = function(){
	if(this.state == 0){
		this.lcd.clearLine(2);
		this.printTime();
	}else if(this.state == 1){
		this.lcd.clearLine(2);
		this.displayClock();
	}
}

MPDController.prototype.menuAction = function(action){
	var menuAction = action.toLowerCase();
	if(menuAction == "menu"){
		this.toggleMenu();
	}else if(menuAction == "ok"){

		if(this.menuState == 'menu'){
			if(this.menuPosition < this.menuOptions.length){
				this.menuState = this.menuOptions[this.menuPosition];
				if(this.menuOptions[this.menuPosition] == "Playlists"){
					this.menuOptions = this.playlists;
					this.menuPosition = 0;
				}
			}
		}else if(this.menuState == "Playlists"){
			this.client.sendCommand(cmd("clear",[]));
			if(this.menuPosition < this.menuOptions.length){
				this.client.sendCommand(cmd("load "+this.menuOptions[this.menuPosition],[]));
				this.client.sendCommand(cmd("play",[]));

				this.menuState = "menu";
				this.menuOptions = this.menuLabels;
				this.menu = false;
				this.menuPosition = 0;
			}
		}
		this.reloadMenu();
	}else if(menuAction == "up"){
		if(this.menuPosition <= 0){
			this.menuPosition = this.menuOptions.length-1;
		}else {
			this.menuPosition--;
		}
		this.reloadMenu();
	}else if(menuAction == "down"){
		if(this.menuPosition >= this.menuOptions.length-1){
			this.menuPosition = 0;
		}else {
			this.menuPosition++;
		}
		this.reloadMenu();
	}else if(menuAction == "back"){
		if(this.menu == false){
			return;
		}
		if(this.menuState == "menu" && this.menu){
			this.toggleMenu();
		}else if(this.menuState == "Playlists" && this.menu){
			this.menuState = "menu";
		}
		this.reloadMenu();
	}
}

MPDController.prototype.getPlaylists = function(){
	this.client.sendCommand(cmd('listplaylists',[]), function(err, msg){
		if(err) console.log(err);
		else {
			var playlists = mpd.parseArrayMessage(msg);
			this.playlists = [];
			for(var i=0;i<playlists.length;i++){
				this.playlists.push(playlists[i].playlist);
			}

			if(this.menu && this.menuState == "Playlists"){
				this.menuOptions = this.playlists;
				this.reloadMenu();
			}
		}
	}.bind(this));
}

MPDController.prototype.reloadMenu = function(){
	this.lcd.clear();
	if(this.menu){
		if(this.menuState == "menu"){
			this.menuOptions = this.menuLabels;

		}else if(this.menuState == "Playlists"){
			this.menuOptions = this.playlists;
		}

		if(this.menuPosition >= this.menuOptions.length){
     	this.menuPostion = 0;
    }
    this.middlePrint("> "+this.menuOptions[this.menuPosition],1);

    var name = "";
    if(this.menuPosition+1 < this.menuOptions.length){
      name = this.menuOptions[this.menuPosition+1];
    }else if(this.menuPosition == this.menuOptions.length-1 && this.menuOptions.length > 1 && this.menuPosition != 0){
      name = this.menuOptions[0];
    }
    this.middlePrint(name,2);
	}
}

module.exports = MPDController;
