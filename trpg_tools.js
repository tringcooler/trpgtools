
function roll(max, min) {
	if(min == undefined) min = 1;
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

var c_dice = (function() {
	function c_dice() {
		this._chk = new c_checker();
	}
	c_dice.prototype.roll = function(s) {
		var r = this._s_roll(s);
		var rs = r[1] + 'd' + r[2] + 'v' + r[0];
		var c = this._chk.gen(rs);
		return r.concat(c);
	};
	c_dice.prototype.check = function(s) {
		return this._chk.check(s);
	};
	c_dice.prototype._parse = function(s) {
		var re = /^\s*((\d*)\s*d)?\s*(\d+)\s*$/;
		var rslt = re.exec(s);
		if(rslt) {
			var dc = rslt[2];
			var dt = rslt[3];
			if(!dc) dc = 1;
			return [dc, dt];
		} else {
			throw 'unknown dice';
		}
	};
	c_dice.prototype._roll = function(c, t) {
		var rslt = 0;
		for(var i = 0; i < c; i++) {
			rslt += roll(t);
		}
		return rslt;
	};
	c_dice.prototype._s_roll = function(s) {
		var d = this._parse(s)
		var v = this._roll(d[0], d[1]);
		return [v, d[0], d[1]];
	};
	return c_dice;
})();

var c_checker = (function() {
	function c_checker() {}
	c_checker.prototype.gen = function(s) {
		var salt = this._formatted_hex(roll(0xffff), 4);
		var cs = s + '#' + salt;
		var md5 = this._md5(cs);
		return cs + md5.slice(0, 4);
	}
	c_checker.prototype.check = function(s) {
		var re = /^\s*(.*)#([\da-f]{8})\s*$/;
		var rg = re.exec(s);
		var src = rg[1], ch = rg[2];
		var salt = ch.slice(0, 4), hs = ch.slice(-4);
		var cs = src + '#' + salt;
		var md5 = this._md5(cs);
		if(md5.slice(0, 4) == hs) return true;
		else return false;
	}
	c_checker.prototype._formatted_hex = function(v, l) {
		return ('0'.repeat(l) + v.toString(16)).slice(-l);
	};
	c_checker.prototype._md5 = function(s) {
		return YaMD5.hashStr(s);
	};
	return c_checker;
})();
