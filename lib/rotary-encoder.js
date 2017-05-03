var rpio = require('rpio');

var mpd = require('mpd');
var cmd = mpd.cmd;

module.exports = RotaryEncoder;

function RotaryEncoder(clk, dt,client){
	this.clk = clk;
	this.dt = dt;
	this.client = client;

	this.getVolume();

	rpio.init({mapping:'gpio'});
	rpio.open(this.clk,rpio.INPUT,rpio.PULL_DOWN);
	rpio.open(this.dt,rpio.INPUT,rpio.PULL_DOWN);

	rpio.poll(this.dt, function(pin){
		if(rpio.read(this.dt) == 1){

			if(this.start) {
				this.time = new Date() - this.start;
			}

			if(rpio.read(this.clk) == 0){
				this.incVol(this.time);
			}else {
				this.decVol(this.time);
			}
			this.time = null;
			this.start = new Date();
		}
	}.bind(this),rpio.POLL_HIGH);
}

RotaryEncoder.prototype.setValue = function(value){
	this.value = value;
}
RotaryEncoder.prototype.getValue = function(){
	return this.value;
}
RotaryEncoder.prototype.getVolume = function(){
	this.client.sendCommand(cmd('status',[]),function(err,msg){
		if(err) console.log(err);
		else {
			this.value = parseInt(mpd.parseKeyValueMessage(msg).volume);
		}
	}.bind(this));
}
RotaryEncoder.prototype.setVolume = function() {
	this.client.sendCommand(cmd('setvol',[this.value]),null);
}
RotaryEncoder.prototype.incVol = function(lastTime) {
	if(!lastTime){
		this.value++;
		this.setVolume();
		return;
	}

	if(this.value < 100){
		if(lastTime < 25){
			if(this.value < 90){
				this.value += 10;
			}else {
				this.value = 100;
			}
		}else if(lastTime < 100){
			if(this.value < 95){
				this.value += 5;
			}else {
				this.value = 100;
			}
		}else if(lastTime < 200){
			if(this.value < 98){
				this.value += 2;
			}else {
				this.value = 100;
			}
		}else {
			this.value++;
		}
	}
	this.setVolume();
}
RotaryEncoder.prototype.decVol = function(lastTime) {
	if(!lastTime){
		this.value--;
		this.setVolume();
		return;
	}

	if(this.value > 0){
                if(lastTime < 25){
                        if(this.value > 10){
                                this.value -= 10;
                        }else {
                                this.value = 0;
                        }
                }else if(lastTime < 100){
                        if(this.value > 5){
                                this.value -= 5;
                        }else {
                                this.value = 0;
                        }
                }else if(lastTime < 200){
                        if(this.value > 2){
                                this.value -= 2;
                        }else {
                                this.value = 0;
                        }
                }else {
                        this.value--;
                }
        }
        this.setVolume();
}
