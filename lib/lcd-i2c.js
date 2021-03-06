var rpio = require('rpio');

var CMDS = {};
CMDS.CLEAR	= 0x01;
CMDS.HOME	= 0x02;
CMDS.DISPLAYCONTROL = 0x08;
CMDS.SETCGRAMADDR = 0x40;
CMDS.SETDDRAMADDR = 0x80;

CMDS.DISPLAYON = 0x04;
CMDS.DISPLAYOFF = 0x00;

var LINEADDRESS = [];
LINEADDRESS[1] = 0x80;
LINEADDRESS[2] = 0xC0;

var init = new Buffer([0x03, 0x03, 0x03, 0x02, 0x28, 0x0c, 0x01, 0x06]);

var ports = {
	RS: 0x01,
	E: 0x04,
	D4: 0x10,
	D5: 0x20,
	D6: 0x40,
	D7: 0x80,

	CHR: 1,
	CMD: 0,

	backlight: 0x08,
	RW: 0x20
};


function LCD(addr){
	this.addr = addr;

	rpio.init({gpiomem:false});
	rpio.i2cBegin();
	rpio.i2cSetSlaveAddress(this.addr);
	rpio.i2cSetBaudRate(19200);

	for(var i=0; i<init.length;i++){
		this.write(init[i],ports.CMD);
	}

}


LCD.prototype.write4 = function(data){
	rpio.i2cWrite(Buffer([data | ports.backlight]));
	rpio.i2cWrite(Buffer([data | ports.E | ports.backlight]));
	rpio.i2cWrite(Buffer([(data & ~ports.E)| ports.backlight]));
}

LCD.prototype.write = function(data, mode){
	this.write4(mode | (data & 0xF0));
	this.write4(mode | ((data << 4) & 0xF0));
}

LCD.prototype.print = function(str, addr){
	this.write(addr,ports.CMD);


	if(typeof str !== 'string'){
		console.log("Not a string");
	}else {
		for(var i=0; i<str.length; i++){
			var c = str[i].charCodeAt(0);
			// Replace ß with s
			if(c==223){
				c = 115;
			}
			this.write(c, ports.CHR);
		}
	}
}
LCD.prototype.cprint = function(str, row, col){
	var addr = LINEADDRESS[row]+col;

	this.print(str,addr);
}

LCD.prototype.clear = function(){
	this.write(CMDS.CLEAR,ports.CMD);
}

LCD.prototype.off = function(){
	ports.backlight = 0x00;
	this.write(CMDS.DISPLAYCONTROL | CMDS.DISPLAYOFF, ports.CMD);
}
LCD.prototype.on = function() {
	ports.backlight = 0x08;
	this.write(CMDS.DISPLAYCONTROL | CMDS.DISPLAYON, ports.CMD);
}
LCD.prototype.home = function() {
	this.write(CMDS.SETDDRAMADDR | 0x00, ports.CMD);
}
LCD.prototype.clearLine = function(line){
	this.setCursor(line,0);
	for(var i=0;i<16;i++){
		this.write(0x20,ports.CHR);
	}
}
LCD.prototype.setCursor = function(row,col){
	var addr = LINEADDRESS[row]+col;
	this.write(addr,ports.CMD);
}
LCD.prototype.moveLeft = function(){
	this.setCursor(1,0);
	this.write(0x18, ports.CMD);
}
LCD.prototype.startScroll = function(str){
	clearInterval(this.scrollID);
	this.scrollText = str;
	this.lcdPos = 0;

	this.scrollID = setInterval(function(){
		if(this.lcdPos >= (this.scrollText.length+3)) this.lcdPos = 0;
		var currStr = this.scrollText.substr(this.lcdPos, this.scrollText.length - this.lcdPos);
		currStr += this.scrollText.substr(0,16);
		currStr = currStr.substr(0,16);

		this.cprint(currStr,1,0);
		this.lcdPos++;

	}.bind(this),750);

}
LCD.prototype.endScroll = function(){
	clearInterval(this.scrollID);
}

module.exports = LCD;
