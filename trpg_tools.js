
/*(function _polyfills() {
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
})();*/

var MersenneTwister = (function() {
    function MersenneTwister(seed) {
      if (seed == undefined) {
        seed = new Date().getTime();
      } 
      /* Period parameters */  
      this.N = 624;
      this.M = 397;
      this.MATRIX_A = 0x9908b0df;   /* constant vector a */
      this.UPPER_MASK = 0x80000000; /* most significant w-r bits */
      this.LOWER_MASK = 0x7fffffff; /* least significant r bits */
     
      this.mt = new Array(this.N); /* the array for the state vector */
      this.mti=this.N+1; /* mti==N+1 means mt[N] is not initialized */

      this.init_genrand(seed);
    }  
     
    /* initializes mt[N] with a seed */
    MersenneTwister.prototype.init_genrand = function(s) {
      this.mt[0] = s >>> 0;
      for (this.mti=1; this.mti<this.N; this.mti++) {
          var s = this.mt[this.mti-1] ^ (this.mt[this.mti-1] >>> 30);
       this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253)
      + this.mti;
          /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
          /* In the previous versions, MSBs of the seed affect   */
          /* only MSBs of the array mt[].                        */
          /* 2002/01/09 modified by Makoto Matsumoto             */
          this.mt[this.mti] >>>= 0;
          /* for >32 bit machines */
      }
    };
    
    /* generates a random number on [0,0xffffffff]-interval */
    MersenneTwister.prototype.genrand_int32 = function() {
      var y;
      var mag01 = new Array(0x0, this.MATRIX_A);
      /* mag01[x] = x * MATRIX_A  for x=0,1 */

      if (this.mti >= this.N) { /* generate N words at one time */
        var kk;

        if (this.mti == this.N+1)   /* if init_genrand() has not been called, */
          this.init_genrand(5489); /* a default initial seed is used */

        for (kk=0;kk<this.N-this.M;kk++) {
          y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
          this.mt[kk] = this.mt[kk+this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
        }
        for (;kk<this.N-1;kk++) {
          y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
          this.mt[kk] = this.mt[kk+(this.M-this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
        }
        y = (this.mt[this.N-1]&this.UPPER_MASK)|(this.mt[0]&this.LOWER_MASK);
        this.mt[this.N-1] = this.mt[this.M-1] ^ (y >>> 1) ^ mag01[y & 0x1];

        this.mti = 0;
      }

      y = this.mt[this.mti++];

      /* Tempering */
      y ^= (y >>> 11);
      y ^= (y << 7) & 0x9d2c5680;
      y ^= (y << 15) & 0xefc60000;
      y ^= (y >>> 18);

      return y >>> 0;
    };
    
    /* generates a random number on [0,1)-real-interval */
    MersenneTwister.prototype.random = function() {
      return this.genrand_int32()*(1.0/4294967296.0); 
      /* divided by 2^32 */
    };
    
    return MersenneTwister;
})();

var c_dice = (function() {
	function c_dice() {
		this._chk = new c_checker();
		this._log_time = 30 * 1000; // 30 seconds
		this._last_dice = [0, 0];
		this._history = [];
        this._set_seed();
	}
    c_dice.prototype._set_seed = function(seed = null) {
        if(seed !== null) {
            this._seed = seed;
            this._mt = new MersenneTwister(seed);
        } else if(!this._mt) {
            this._set_seed(new Date().getTime());
            this._set_seed();
        } else {
            this._set_seed(this._mt.genrand_int32() >>> 16);
        }
    };
    c_dice.prototype._randint = function(min, max = null) {
        if(max === null) {
            max = min;
            min = 1;
        }
        return Math.floor(this._mt.random() * (max - min + 1)) + min;
    };
    c_dice.prototype._merge_dice = function(dc) {
        var rd = {};
        for(var [cnt, top] of dc) {
            if(!rd[top]) rd[top] = 0;
            rd[top] += parseInt(cnt);
        }
        return Object.keys(rd).sort((a,b)=>a-b).map(t=>[rd[t], t]);
    };
	c_dice.prototype._parse_dice = function(s) {
		var re = /(?:(\d+)?\s*d)?\s*(\d+)(?:[\s+]|$)/g;
        var rd = [];
        s.replace(re, (m, g1, g2) => {
            if(!g1) g1 = 1;
            rd.push([g1, g2]);
            return m;
        });
		if(rd.length <= 0) {
            throw 'unknown dice';
        }
        return this._merge_dice(rd);
	};
	c_dice.prototype._parse_input = function(s) {
		var re = /^\s*(((\d*\s*d)?\s*\d+)(\s*\+\s*((\d*\s*d)?\s*\d+))*)\s*(=\s*(\d+)\s*)?(([<>]=?)\s*([\d+\-*/()]*?[\d)])\s*(\(.*\)\s*)?(\w+\s+)?)?((hst:\s*((\d+\s+)+))?(sd:\s*(\d+)\s+)?chk:\s*(.*)\s*)?$/;
		var rs = re.exec(s.toLowerCase());
		if(!rs) throw 'unknown dice';
		var rslt = {};
		rslt.dice = this._parse_dice(rs[1]);
        if(rs[7]) {
            rslt.val = rs[8].trim();
        }
		if(rs[9]) {
			rslt.cond = rs[10].trim() + rs[11].trim()
			if(rs[12])
				rslt.commt = rs[12].trim();
		}
		if(rs[14]) {
			rslt.seed = rs[19].trim();
			rslt.chksum = rs[20].trim();
			if(rs[15])
				rslt.hist = rs[16].trim().split(/\s+/);
		}
		return rslt;
	};
    c_dice.prototype._infostr = function(info) {
        var rs = ''
        for(var [cnt, top] of info.dice) {
            rs += 'c' + cnt + 'd' + top;
        }
        rs += 's' + info.seed + 'v' + info.val;
        if(info.hist) {
			for(var i = 0; i < info.hist.length; i++) {
				rs += 'v' + info.hist[i];
			}
		}
        if(info.chksum) {
            rs += '#' + info.chksum;
        }
        return rs;
    };
	c_dice.prototype._roll = function(dc) {
		var rslt = 0;
        for(var [cnt, top] of dc) {
            for(var i = 0; i < cnt; i++) {
                rslt += this._randint(top);
            }
        }
		return rslt;
	};
	c_dice.prototype._c_roll = function(info) {
        var salt = this._randint(0xffff);
		info.val = this._roll(info.dice);
        this._set_seed();
        info.seed = this._seed;
        this._log_in(info.dice, info.val);
		info.hist = [];
		for(var i = this._history.length - 2; i > -1; i--) {
			info.hist.push(this._history[i][0]);
		}
		info.chksum = this._chk.gen(this._infostr(info), salt);
	};
    c_dice.prototype._dice_eq = function(a, b) {
        if(a === b) return true;
        if(!a || !b || a.length != b.length) return false;
        for(var i = 0; i < a.length; i++) {
            if(a[i][0] != b[i][0] || a[i][1] != b[i][1])
                return false;
        }
        return true;
    };
	c_dice.prototype._log_in = function(dc, v) {
		var cur = new Date();
		if(!this._dice_eq(dc, this._last_dice)) {
			this._last_dice = dc;
			this._history = [];
		} else {
			while(this._history.length && cur - this._history[0][1] > this._log_time)
				this._history.shift();
		}
		this._history.push([v, cur]);
	};
    c_dice.prototype._output = function(info) {
        var rdc = [];
        for(var [cnt, top] of info.dice) {
            rdc.push(cnt + 'd' + top);
        }
        var rs = rdc.join('+') + '=' + info.val;
		if(info.cond) {
			var check = eval(info.val + info.cond);
			rs += info.cond;
			if(info.commt)
				rs += info.comt;
			rs += ' ' + check;
		}
		if(info.hist && info.hist.length) {
            rs += ' hst:';
            for(var i of info.hist) {
                rs += ' ' + i;
            }
        }
        rs += ' sd: ' + info.seed;
		rs += ' chk: ' + info.chksum;
		return rs;
	};
    c_dice.prototype._rollinfo = function(info) {
        delete info.val;
        delete info.hist;
        delete info.chksum;
        if(info.seed && info.seed != this._seed) {
            this._set_seed(info.seed);
            this._last_dice = null;
			this._history = [];
        }
    };
    c_dice.prototype.roll = function(s) {
		var info = this._parse_input(s);
        this._rollinfo(info);
		this._c_roll(info);
		return this._output(info);
	};
    c_dice.prototype.check = function(s) {
		var info = this._parse_input(s);
		if(!info.chksum) return false;
		return this._chk.check(this._infostr(info));
	};
	return c_dice;
})();

var c_checker = (function() {
	function c_checker() {}
	c_checker.prototype.gen = function(s, salt) {
		salt = this._formatted_hex(salt, 4);
		var cs = s + '#' + salt;
		var md5 = this._md5(cs);
        //console.log('gen', cs);
		return salt + md5.slice(0, 4);
	}
	c_checker.prototype.check = function(s) {
        //console.log('chk', s)
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
