var mpdController = require('./mpd-controller');

var controller = new mpdController();

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

controller.addButton(PLAY_PIN, PLAY_FUNC);
controller.addButton(PAUSE_PIN, PAUSE_FUNC);
controller.addButton(NEXT_PIN, NEXT_FUNC);
controller.addButton(PREV_PIN, PREV_FUNC);

controller.setRotaryEncoder(CLK_PIN,DT_PIN);

lirc = require('lirc_node');
lirc.init();

const { exec } = require('child_process');

var listenerId = lirc.addListener(function(data){
  var index = data.key.toString().indexOf('_');
  var action = data.key.substring(index+1);
	if(data.remote == "BlueDiamondRemote"){
		if(data.key == "KEY_VOLUMEUP"){
			exec('mpc -q volume +1');
		}else if(data.key == "KEY_VOLUMEDOWN"){
			exec('mpc -q volume -1');
		}

		if(data.repeat == 0){
			
			switch(data.key){
				case "KEY_MENU":
				case "KEY_BACK":
				case "KEY_OK":
        			case "KEY_EXIT":
        			case "KEY_LEFT":
        			case "KEY_RIGHT": controller.menuAction(action);
          				break;
        			default:
          				controller.action(action);
          				break;

			}
		}
	}
});

