
(function _polyfills() {
	if(!String.prototype.trim) {
		String.prototype.trim = function() {
			return /^\s*(.*?)\s*$/.exec(this)[1];
		};
	}
	if(!String.prototype.repeat) {
		String.prototype.repeat = function(n) {
			var r = '';
			for(var i = 0; i < n; i++) {
				r += this;
			}
			return r;
		};
	}
})();

function roll(max, min) {
	if(min == undefined) min = 1;
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

var c_dice = (function() {
	function c_dice() {
		this._chk = new c_checker();
		this._log_time = 30 * 1000; // 30 seconds
		this._last_dice = [0, 0];
		this._history = [];
		this._count = 0;
	}
	c_dice.prototype.roll = function(s) {
		var info = this._parse_input(s);
		var r = this._c_roll(info.dice);
		return this._output(r, info.cond, info.commt);
	};
	c_dice.prototype.check = function(s) {
		var info = this._parse_input(s);
		if(!info.cs) return false;
		var rs = info.dice + 'c' + info.cnt + 'v' + info.val;
		if(info.his) {
			for(var i = 0; i < info.his.length; i++) {
				rs += 'v' + info.his[i];
			}
		}
		rs += '#' + info.cs;
		return this._chk.check(rs);
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
	c_dice.prototype._parse_input = function(s) {
		var re = /^\s*((\d*\s*d)?\s*\d+)\s*(=\s*(\d+)\s*)?(([<>]=?)\s*([\d+\-*/()]*?[\d)])\s*(\(.*\)\s*)?)?((\w+\s+)?(cnt:\s*(\d+)\s+)?(hst:\s*((\d+\s+)+))?chk:\s*(.*)\s*)?$/;
		var rs = re.exec(s);
		if(!rs) throw 'unknown dice';
		var rslt = {};
		rslt.dice = rs[1];
		if(rs[5]) {
			rslt.cond = rs[6].trim() + rs[7].trim()
			if(rs[8])
				rslt.commt = rs[8].trim();
		}
		if(rs[9]) {
			rslt.val = rs[4].trim();
			rslt.cnt = rs[12].trim();
			rslt.cs = rs[16].trim();
			if(rs[13])
				rslt.his = rs[14].trim().split(/\s+/);
		}
		return rslt;
	};
	c_dice.prototype._output = function(r, cond, cmt) {
		var dice = r[0];
		var count = r[1];
		var ccode = r[2].split('#')[1];
		var val = r[3];
		var rs = dice + '=' + val
		if(cond) {
			var check = eval(val + cond);
			rs += cond;
			if(cmt)
				rs += cmt;
			rs += ' ' + check;
		}
		rs += ' cnt: ' + count;
		if(r.length > 4) rs += ' hst:'
		for(var i = 4; i < r.length; i++) {
			rs += ' ' + r[i];
		}
		rs += ' chk: ' + ccode;
		return rs;
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
	c_dice.prototype._c_roll = function(s) {
		var r = this._s_roll(s);
		this._log_in(r[1], r[2], r[0]);
		var rs = r[1] + 'd' + r[2]  + 'c' + this._count;
		var his = [], histr = '';
		for(var i = this._history.length - 1; i > -1; i--) {
			his.push(this._history[i][0]);
			histr += 'v' + this._history[i][0];
		}
		rs += histr;
		var c = this._chk.gen(rs);
		return [r[1] + 'd' + r[2]].concat(this._count).concat(c).concat(his);
	};
	c_dice.prototype._log_in = function(c, t, v) {
		var cur = new Date();
		if(c != this._last_dice[0] || t != this._last_dice[1]) {
			this._last_dice[0] = c;
			this._last_dice[1] = t;
			this._history = [];
		} else {
			while(this._history.length && cur - this._history[0][1] > this._log_time)
				this._history.shift();
		}
		this._history.push([v, cur]);
		this._count++;
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
		return md5(s);//YaMD5.hashStr(s);
	};
	return c_checker;
})();
