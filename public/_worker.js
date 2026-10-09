var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// (disabled):crypto
var require_crypto = __commonJS({
  "(disabled):crypto"() {
  }
});

// node_modules/bcryptjs/index.js
var import_crypto = __toESM(require_crypto(), 1);
var randomFallback = null;
function randomBytes(len) {
  try {
    return crypto.getRandomValues(new Uint8Array(len));
  } catch {
  }
  try {
    return import_crypto.default.randomBytes(len);
  } catch {
  }
  if (!randomFallback) {
    throw Error(
      "Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative"
    );
  }
  return randomFallback(len);
}
function setRandomFallback(random) {
  randomFallback = random;
}
function genSaltSync(rounds, seed_length) {
  rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof rounds !== "number")
    throw Error(
      "Illegal arguments: " + typeof rounds + ", " + typeof seed_length
    );
  if (rounds < 4) rounds = 4;
  else if (rounds > 31) rounds = 31;
  var salt = [];
  salt.push("$2b$");
  if (rounds < 10) salt.push("0");
  salt.push(rounds.toString());
  salt.push("$");
  salt.push(base64_encode(randomBytes(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
  return salt.join("");
}
function genSalt(rounds, seed_length, callback) {
  if (typeof seed_length === "function")
    callback = seed_length, seed_length = void 0;
  if (typeof rounds === "function") callback = rounds, rounds = void 0;
  if (typeof rounds === "undefined") rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
  else if (typeof rounds !== "number")
    throw Error("illegal arguments: " + typeof rounds);
  function _async(callback2) {
    nextTick(function() {
      try {
        callback2(null, genSaltSync(rounds));
      } catch (err) {
        callback2(err);
      }
    });
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function hashSync(password, salt) {
  if (typeof salt === "undefined") salt = GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof salt === "number") salt = genSaltSync(salt);
  if (typeof password !== "string" || typeof salt !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof salt);
  return _hash(password, salt);
}
function hash(password, salt, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password === "string" && typeof salt === "number")
      genSalt(salt, function(err, salt2) {
        _hash(password, salt2, callback2, progressCallback);
      });
    else if (typeof password === "string" && typeof salt === "string")
      _hash(password, salt, callback2, progressCallback);
    else
      nextTick(
        callback2.bind(
          this,
          Error("Illegal arguments: " + typeof password + ", " + typeof salt)
        )
      );
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function safeStringCompare(known, unknown) {
  var diff = known.length ^ unknown.length;
  for (var i = 0; i < known.length; ++i) {
    diff |= known.charCodeAt(i) ^ unknown.charCodeAt(i);
  }
  return diff === 0;
}
function compareSync(password, hash2) {
  if (typeof password !== "string" || typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof hash2);
  if (hash2.length !== 60) return false;
  return safeStringCompare(
    hashSync(password, hash2.substring(0, hash2.length - 31)),
    hash2
  );
}
function compare(password, hashValue, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password !== "string" || typeof hashValue !== "string") {
      nextTick(
        callback2.bind(
          this,
          Error(
            "Illegal arguments: " + typeof password + ", " + typeof hashValue
          )
        )
      );
      return;
    }
    if (hashValue.length !== 60) {
      nextTick(callback2.bind(this, null, false));
      return;
    }
    hash(
      password,
      hashValue.substring(0, 29),
      function(err, comp) {
        if (err) callback2(err);
        else callback2(null, safeStringCompare(comp, hashValue));
      },
      progressCallback
    );
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function getRounds(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  return parseInt(hash2.split("$")[2], 10);
}
function getSalt(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  if (hash2.length !== 60)
    throw Error("Illegal hash length: " + hash2.length + " != 60");
  return hash2.substring(0, 29);
}
function truncates(password) {
  if (typeof password !== "string")
    throw Error("Illegal arguments: " + typeof password);
  return utf8Length(password) > 72;
}
var nextTick = typeof setImmediate === "function" ? setImmediate : typeof scheduler === "object" && typeof scheduler.postTask === "function" ? scheduler.postTask.bind(scheduler) : setTimeout;
function utf8Length(string) {
  var len = 0, c = 0;
  for (var i = 0; i < string.length; ++i) {
    c = string.charCodeAt(i);
    if (c < 128) len += 1;
    else if (c < 2048) len += 2;
    else if ((c & 64512) === 55296 && (string.charCodeAt(i + 1) & 64512) === 56320) {
      ++i;
      len += 4;
    } else len += 3;
  }
  return len;
}
function utf8Array(string) {
  var offset = 0, c1, c2;
  var buffer = new Array(utf8Length(string));
  for (var i = 0, k = string.length; i < k; ++i) {
    c1 = string.charCodeAt(i);
    if (c1 < 128) {
      buffer[offset++] = c1;
    } else if (c1 < 2048) {
      buffer[offset++] = c1 >> 6 | 192;
      buffer[offset++] = c1 & 63 | 128;
    } else if ((c1 & 64512) === 55296 && ((c2 = string.charCodeAt(i + 1)) & 64512) === 56320) {
      c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
      ++i;
      buffer[offset++] = c1 >> 18 | 240;
      buffer[offset++] = c1 >> 12 & 63 | 128;
      buffer[offset++] = c1 >> 6 & 63 | 128;
      buffer[offset++] = c1 & 63 | 128;
    } else {
      buffer[offset++] = c1 >> 12 | 224;
      buffer[offset++] = c1 >> 6 & 63 | 128;
      buffer[offset++] = c1 & 63 | 128;
    }
  }
  return buffer;
}
var BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
var BASE64_INDEX = [
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  0,
  1,
  54,
  55,
  56,
  57,
  58,
  59,
  60,
  61,
  62,
  63,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  48,
  49,
  50,
  51,
  52,
  53,
  -1,
  -1,
  -1,
  -1,
  -1
];
function base64_encode(b, len) {
  var off = 0, rs = [], c1, c2;
  if (len <= 0 || len > b.length) throw Error("Illegal len: " + len);
  while (off < len) {
    c1 = b[off++] & 255;
    rs.push(BASE64_CODE[c1 >> 2 & 63]);
    c1 = (c1 & 3) << 4;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off++] & 255;
    c1 |= c2 >> 4 & 15;
    rs.push(BASE64_CODE[c1 & 63]);
    c1 = (c2 & 15) << 2;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off++] & 255;
    c1 |= c2 >> 6 & 3;
    rs.push(BASE64_CODE[c1 & 63]);
    rs.push(BASE64_CODE[c2 & 63]);
  }
  return rs.join("");
}
function base64_decode(s, len) {
  var off = 0, slen = s.length, olen = 0, rs = [], c1, c2, c3, c4, o, code;
  if (len <= 0) throw Error("Illegal len: " + len);
  while (off < slen - 1 && olen < len) {
    code = s.charCodeAt(off++);
    c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    code = s.charCodeAt(off++);
    c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c1 == -1 || c2 == -1) break;
    o = c1 << 2 >>> 0;
    o |= (c2 & 48) >> 4;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c3 == -1) break;
    o = (c2 & 15) << 4 >>> 0;
    o |= (c3 & 60) >> 2;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    o = (c3 & 3) << 6 >>> 0;
    o |= c4;
    rs.push(String.fromCharCode(o));
    ++olen;
  }
  var res = [];
  for (off = 0; off < olen; off++) res.push(rs[off].charCodeAt(0));
  return res;
}
var BCRYPT_SALT_LEN = 16;
var GENSALT_DEFAULT_LOG2_ROUNDS = 10;
var BLOWFISH_NUM_ROUNDS = 16;
var MAX_EXECUTION_TIME = 100;
var P_ORIG = [
  608135816,
  2242054355,
  320440878,
  57701188,
  2752067618,
  698298832,
  137296536,
  3964562569,
  1160258022,
  953160567,
  3193202383,
  887688300,
  3232508343,
  3380367581,
  1065670069,
  3041331479,
  2450970073,
  2306472731
];
var S_ORIG = [
  3509652390,
  2564797868,
  805139163,
  3491422135,
  3101798381,
  1780907670,
  3128725573,
  4046225305,
  614570311,
  3012652279,
  134345442,
  2240740374,
  1667834072,
  1901547113,
  2757295779,
  4103290238,
  227898511,
  1921955416,
  1904987480,
  2182433518,
  2069144605,
  3260701109,
  2620446009,
  720527379,
  3318853667,
  677414384,
  3393288472,
  3101374703,
  2390351024,
  1614419982,
  1822297739,
  2954791486,
  3608508353,
  3174124327,
  2024746970,
  1432378464,
  3864339955,
  2857741204,
  1464375394,
  1676153920,
  1439316330,
  715854006,
  3033291828,
  289532110,
  2706671279,
  2087905683,
  3018724369,
  1668267050,
  732546397,
  1947742710,
  3462151702,
  2609353502,
  2950085171,
  1814351708,
  2050118529,
  680887927,
  999245976,
  1800124847,
  3300911131,
  1713906067,
  1641548236,
  4213287313,
  1216130144,
  1575780402,
  4018429277,
  3917837745,
  3693486850,
  3949271944,
  596196993,
  3549867205,
  258830323,
  2213823033,
  772490370,
  2760122372,
  1774776394,
  2652871518,
  566650946,
  4142492826,
  1728879713,
  2882767088,
  1783734482,
  3629395816,
  2517608232,
  2874225571,
  1861159788,
  326777828,
  3124490320,
  2130389656,
  2716951837,
  967770486,
  1724537150,
  2185432712,
  2364442137,
  1164943284,
  2105845187,
  998989502,
  3765401048,
  2244026483,
  1075463327,
  1455516326,
  1322494562,
  910128902,
  469688178,
  1117454909,
  936433444,
  3490320968,
  3675253459,
  1240580251,
  122909385,
  2157517691,
  634681816,
  4142456567,
  3825094682,
  3061402683,
  2540495037,
  79693498,
  3249098678,
  1084186820,
  1583128258,
  426386531,
  1761308591,
  1047286709,
  322548459,
  995290223,
  1845252383,
  2603652396,
  3431023940,
  2942221577,
  3202600964,
  3727903485,
  1712269319,
  422464435,
  3234572375,
  1170764815,
  3523960633,
  3117677531,
  1434042557,
  442511882,
  3600875718,
  1076654713,
  1738483198,
  4213154764,
  2393238008,
  3677496056,
  1014306527,
  4251020053,
  793779912,
  2902807211,
  842905082,
  4246964064,
  1395751752,
  1040244610,
  2656851899,
  3396308128,
  445077038,
  3742853595,
  3577915638,
  679411651,
  2892444358,
  2354009459,
  1767581616,
  3150600392,
  3791627101,
  3102740896,
  284835224,
  4246832056,
  1258075500,
  768725851,
  2589189241,
  3069724005,
  3532540348,
  1274779536,
  3789419226,
  2764799539,
  1660621633,
  3471099624,
  4011903706,
  913787905,
  3497959166,
  737222580,
  2514213453,
  2928710040,
  3937242737,
  1804850592,
  3499020752,
  2949064160,
  2386320175,
  2390070455,
  2415321851,
  4061277028,
  2290661394,
  2416832540,
  1336762016,
  1754252060,
  3520065937,
  3014181293,
  791618072,
  3188594551,
  3933548030,
  2332172193,
  3852520463,
  3043980520,
  413987798,
  3465142937,
  3030929376,
  4245938359,
  2093235073,
  3534596313,
  375366246,
  2157278981,
  2479649556,
  555357303,
  3870105701,
  2008414854,
  3344188149,
  4221384143,
  3956125452,
  2067696032,
  3594591187,
  2921233993,
  2428461,
  544322398,
  577241275,
  1471733935,
  610547355,
  4027169054,
  1432588573,
  1507829418,
  2025931657,
  3646575487,
  545086370,
  48609733,
  2200306550,
  1653985193,
  298326376,
  1316178497,
  3007786442,
  2064951626,
  458293330,
  2589141269,
  3591329599,
  3164325604,
  727753846,
  2179363840,
  146436021,
  1461446943,
  4069977195,
  705550613,
  3059967265,
  3887724982,
  4281599278,
  3313849956,
  1404054877,
  2845806497,
  146425753,
  1854211946,
  1266315497,
  3048417604,
  3681880366,
  3289982499,
  290971e4,
  1235738493,
  2632868024,
  2414719590,
  3970600049,
  1771706367,
  1449415276,
  3266420449,
  422970021,
  1963543593,
  2690192192,
  3826793022,
  1062508698,
  1531092325,
  1804592342,
  2583117782,
  2714934279,
  4024971509,
  1294809318,
  4028980673,
  1289560198,
  2221992742,
  1669523910,
  35572830,
  157838143,
  1052438473,
  1016535060,
  1802137761,
  1753167236,
  1386275462,
  3080475397,
  2857371447,
  1040679964,
  2145300060,
  2390574316,
  1461121720,
  2956646967,
  4031777805,
  4028374788,
  33600511,
  2920084762,
  1018524850,
  629373528,
  3691585981,
  3515945977,
  2091462646,
  2486323059,
  586499841,
  988145025,
  935516892,
  3367335476,
  2599673255,
  2839830854,
  265290510,
  3972581182,
  2759138881,
  3795373465,
  1005194799,
  847297441,
  406762289,
  1314163512,
  1332590856,
  1866599683,
  4127851711,
  750260880,
  613907577,
  1450815602,
  3165620655,
  3734664991,
  3650291728,
  3012275730,
  3704569646,
  1427272223,
  778793252,
  1343938022,
  2676280711,
  2052605720,
  1946737175,
  3164576444,
  3914038668,
  3967478842,
  3682934266,
  1661551462,
  3294938066,
  4011595847,
  840292616,
  3712170807,
  616741398,
  312560963,
  711312465,
  1351876610,
  322626781,
  1910503582,
  271666773,
  2175563734,
  1594956187,
  70604529,
  3617834859,
  1007753275,
  1495573769,
  4069517037,
  2549218298,
  2663038764,
  504708206,
  2263041392,
  3941167025,
  2249088522,
  1514023603,
  1998579484,
  1312622330,
  694541497,
  2582060303,
  2151582166,
  1382467621,
  776784248,
  2618340202,
  3323268794,
  2497899128,
  2784771155,
  503983604,
  4076293799,
  907881277,
  423175695,
  432175456,
  1378068232,
  4145222326,
  3954048622,
  3938656102,
  3820766613,
  2793130115,
  2977904593,
  26017576,
  3274890735,
  3194772133,
  1700274565,
  1756076034,
  4006520079,
  3677328699,
  720338349,
  1533947780,
  354530856,
  688349552,
  3973924725,
  1637815568,
  332179504,
  3949051286,
  53804574,
  2852348879,
  3044236432,
  1282449977,
  3583942155,
  3416972820,
  4006381244,
  1617046695,
  2628476075,
  3002303598,
  1686838959,
  431878346,
  2686675385,
  1700445008,
  1080580658,
  1009431731,
  832498133,
  3223435511,
  2605976345,
  2271191193,
  2516031870,
  1648197032,
  4164389018,
  2548247927,
  300782431,
  375919233,
  238389289,
  3353747414,
  2531188641,
  2019080857,
  1475708069,
  455242339,
  2609103871,
  448939670,
  3451063019,
  1395535956,
  2413381860,
  1841049896,
  1491858159,
  885456874,
  4264095073,
  4001119347,
  1565136089,
  3898914787,
  1108368660,
  540939232,
  1173283510,
  2745871338,
  3681308437,
  4207628240,
  3343053890,
  4016749493,
  1699691293,
  1103962373,
  3625875870,
  2256883143,
  3830138730,
  1031889488,
  3479347698,
  1535977030,
  4236805024,
  3251091107,
  2132092099,
  1774941330,
  1199868427,
  1452454533,
  157007616,
  2904115357,
  342012276,
  595725824,
  1480756522,
  206960106,
  497939518,
  591360097,
  863170706,
  2375253569,
  3596610801,
  1814182875,
  2094937945,
  3421402208,
  1082520231,
  3463918190,
  2785509508,
  435703966,
  3908032597,
  1641649973,
  2842273706,
  3305899714,
  1510255612,
  2148256476,
  2655287854,
  3276092548,
  4258621189,
  236887753,
  3681803219,
  274041037,
  1734335097,
  3815195456,
  3317970021,
  1899903192,
  1026095262,
  4050517792,
  356393447,
  2410691914,
  3873677099,
  3682840055,
  3913112168,
  2491498743,
  4132185628,
  2489919796,
  1091903735,
  1979897079,
  3170134830,
  3567386728,
  3557303409,
  857797738,
  1136121015,
  1342202287,
  507115054,
  2535736646,
  337727348,
  3213592640,
  1301675037,
  2528481711,
  1895095763,
  1721773893,
  3216771564,
  62756741,
  2142006736,
  835421444,
  2531993523,
  1442658625,
  3659876326,
  2882144922,
  676362277,
  1392781812,
  170690266,
  3921047035,
  1759253602,
  3611846912,
  1745797284,
  664899054,
  1329594018,
  3901205900,
  3045908486,
  2062866102,
  2865634940,
  3543621612,
  3464012697,
  1080764994,
  553557557,
  3656615353,
  3996768171,
  991055499,
  499776247,
  1265440854,
  648242737,
  3940784050,
  980351604,
  3713745714,
  1749149687,
  3396870395,
  4211799374,
  3640570775,
  1161844396,
  3125318951,
  1431517754,
  545492359,
  4268468663,
  3499529547,
  1437099964,
  2702547544,
  3433638243,
  2581715763,
  2787789398,
  1060185593,
  1593081372,
  2418618748,
  4260947970,
  69676912,
  2159744348,
  86519011,
  2512459080,
  3838209314,
  1220612927,
  3339683548,
  133810670,
  1090789135,
  1078426020,
  1569222167,
  845107691,
  3583754449,
  4072456591,
  1091646820,
  628848692,
  1613405280,
  3757631651,
  526609435,
  236106946,
  48312990,
  2942717905,
  3402727701,
  1797494240,
  859738849,
  992217954,
  4005476642,
  2243076622,
  3870952857,
  3732016268,
  765654824,
  3490871365,
  2511836413,
  1685915746,
  3888969200,
  1414112111,
  2273134842,
  3281911079,
  4080962846,
  172450625,
  2569994100,
  980381355,
  4109958455,
  2819808352,
  2716589560,
  2568741196,
  3681446669,
  3329971472,
  1835478071,
  660984891,
  3704678404,
  4045999559,
  3422617507,
  3040415634,
  1762651403,
  1719377915,
  3470491036,
  2693910283,
  3642056355,
  3138596744,
  1364962596,
  2073328063,
  1983633131,
  926494387,
  3423689081,
  2150032023,
  4096667949,
  1749200295,
  3328846651,
  309677260,
  2016342300,
  1779581495,
  3079819751,
  111262694,
  1274766160,
  443224088,
  298511866,
  1025883608,
  3806446537,
  1145181785,
  168956806,
  3641502830,
  3584813610,
  1689216846,
  3666258015,
  3200248200,
  1692713982,
  2646376535,
  4042768518,
  1618508792,
  1610833997,
  3523052358,
  4130873264,
  2001055236,
  3610705100,
  2202168115,
  4028541809,
  2961195399,
  1006657119,
  2006996926,
  3186142756,
  1430667929,
  3210227297,
  1314452623,
  4074634658,
  4101304120,
  2273951170,
  1399257539,
  3367210612,
  3027628629,
  1190975929,
  2062231137,
  2333990788,
  2221543033,
  2438960610,
  1181637006,
  548689776,
  2362791313,
  3372408396,
  3104550113,
  3145860560,
  296247880,
  1970579870,
  3078560182,
  3769228297,
  1714227617,
  3291629107,
  3898220290,
  166772364,
  1251581989,
  493813264,
  448347421,
  195405023,
  2709975567,
  677966185,
  3703036547,
  1463355134,
  2715995803,
  1338867538,
  1343315457,
  2802222074,
  2684532164,
  233230375,
  2599980071,
  2000651841,
  3277868038,
  1638401717,
  4028070440,
  3237316320,
  6314154,
  819756386,
  300326615,
  590932579,
  1405279636,
  3267499572,
  3150704214,
  2428286686,
  3959192993,
  3461946742,
  1862657033,
  1266418056,
  963775037,
  2089974820,
  2263052895,
  1917689273,
  448879540,
  3550394620,
  3981727096,
  150775221,
  3627908307,
  1303187396,
  508620638,
  2975983352,
  2726630617,
  1817252668,
  1876281319,
  1457606340,
  908771278,
  3720792119,
  3617206836,
  2455994898,
  1729034894,
  1080033504,
  976866871,
  3556439503,
  2881648439,
  1522871579,
  1555064734,
  1336096578,
  3548522304,
  2579274686,
  3574697629,
  3205460757,
  3593280638,
  3338716283,
  3079412587,
  564236357,
  2993598910,
  1781952180,
  1464380207,
  3163844217,
  3332601554,
  1699332808,
  1393555694,
  1183702653,
  3581086237,
  1288719814,
  691649499,
  2847557200,
  2895455976,
  3193889540,
  2717570544,
  1781354906,
  1676643554,
  2592534050,
  3230253752,
  1126444790,
  2770207658,
  2633158820,
  2210423226,
  2615765581,
  2414155088,
  3127139286,
  673620729,
  2805611233,
  1269405062,
  4015350505,
  3341807571,
  4149409754,
  1057255273,
  2012875353,
  2162469141,
  2276492801,
  2601117357,
  993977747,
  3918593370,
  2654263191,
  753973209,
  36408145,
  2530585658,
  25011837,
  3520020182,
  2088578344,
  530523599,
  2918365339,
  1524020338,
  1518925132,
  3760827505,
  3759777254,
  1202760957,
  3985898139,
  3906192525,
  674977740,
  4174734889,
  2031300136,
  2019492241,
  3983892565,
  4153806404,
  3822280332,
  352677332,
  2297720250,
  60907813,
  90501309,
  3286998549,
  1016092578,
  2535922412,
  2839152426,
  457141659,
  509813237,
  4120667899,
  652014361,
  1966332200,
  2975202805,
  55981186,
  2327461051,
  676427537,
  3255491064,
  2882294119,
  3433927263,
  1307055953,
  942726286,
  933058658,
  2468411793,
  3933900994,
  4215176142,
  1361170020,
  2001714738,
  2830558078,
  3274259782,
  1222529897,
  1679025792,
  2729314320,
  3714953764,
  1770335741,
  151462246,
  3013232138,
  1682292957,
  1483529935,
  471910574,
  1539241949,
  458788160,
  3436315007,
  1807016891,
  3718408830,
  978976581,
  1043663428,
  3165965781,
  1927990952,
  4200891579,
  2372276910,
  3208408903,
  3533431907,
  1412390302,
  2931980059,
  4132332400,
  1947078029,
  3881505623,
  4168226417,
  2941484381,
  1077988104,
  1320477388,
  886195818,
  18198404,
  3786409e3,
  2509781533,
  112762804,
  3463356488,
  1866414978,
  891333506,
  18488651,
  661792760,
  1628790961,
  3885187036,
  3141171499,
  876946877,
  2693282273,
  1372485963,
  791857591,
  2686433993,
  3759982718,
  3167212022,
  3472953795,
  2716379847,
  445679433,
  3561995674,
  3504004811,
  3574258232,
  54117162,
  3331405415,
  2381918588,
  3769707343,
  4154350007,
  1140177722,
  4074052095,
  668550556,
  3214352940,
  367459370,
  261225585,
  2610173221,
  4209349473,
  3468074219,
  3265815641,
  314222801,
  3066103646,
  3808782860,
  282218597,
  3406013506,
  3773591054,
  379116347,
  1285071038,
  846784868,
  2669647154,
  3771962079,
  3550491691,
  2305946142,
  453669953,
  1268987020,
  3317592352,
  3279303384,
  3744833421,
  2610507566,
  3859509063,
  266596637,
  3847019092,
  517658769,
  3462560207,
  3443424879,
  370717030,
  4247526661,
  2224018117,
  4143653529,
  4112773975,
  2788324899,
  2477274417,
  1456262402,
  2901442914,
  1517677493,
  1846949527,
  2295493580,
  3734397586,
  2176403920,
  1280348187,
  1908823572,
  3871786941,
  846861322,
  1172426758,
  3287448474,
  3383383037,
  1655181056,
  3139813346,
  901632758,
  1897031941,
  2986607138,
  3066810236,
  3447102507,
  1393639104,
  373351379,
  950779232,
  625454576,
  3124240540,
  4148612726,
  2007998917,
  544563296,
  2244738638,
  2330496472,
  2058025392,
  1291430526,
  424198748,
  50039436,
  29584100,
  3605783033,
  2429876329,
  2791104160,
  1057563949,
  3255363231,
  3075367218,
  3463963227,
  1469046755,
  985887462
];
var C_ORIG = [
  1332899944,
  1700884034,
  1701343084,
  1684370003,
  1668446532,
  1869963892
];
function _encipher(lr, off, P, S) {
  var n, l = lr[off], r = lr[off + 1];
  l ^= P[0];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[1];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[2];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[3];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[4];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[5];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[6];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[7];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[8];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[9];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[10];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[11];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[12];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[13];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[14];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[15];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[16];
  lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
  lr[off + 1] = l;
  return lr;
}
function _streamtoword(data, offp) {
  for (var i = 0, word = 0; i < 4; ++i)
    word = word << 8 | data[offp] & 255, offp = (offp + 1) % data.length;
  return { key: word, offp };
}
function _key(key, P, S) {
  var offset = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offset), offset = sw.offp, P[i] = P[i] ^ sw.key;
  for (i = 0; i < plen; i += 2)
    lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
function _ekskey(data, key, P, S) {
  var offp = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offp), offp = sw.offp, P[i] = P[i] ^ sw.key;
  offp = 0;
  for (i = 0; i < plen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
function _crypt(b, salt, rounds, callback, progressCallback) {
  var cdata = C_ORIG.slice(), clen = cdata.length, err;
  if (rounds < 4 || rounds > 31) {
    err = Error("Illegal number of rounds (4-31): " + rounds);
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.length !== BCRYPT_SALT_LEN) {
    err = Error(
      "Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN
    );
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  rounds = 1 << rounds >>> 0;
  var P, S, i = 0, j;
  if (typeof Int32Array === "function") {
    P = new Int32Array(P_ORIG);
    S = new Int32Array(S_ORIG);
  } else {
    P = P_ORIG.slice();
    S = S_ORIG.slice();
  }
  _ekskey(salt, b, P, S);
  function next() {
    if (progressCallback) progressCallback(i / rounds);
    if (i < rounds) {
      var start = Date.now();
      for (; i < rounds; ) {
        i = i + 1;
        _key(b, P, S);
        _key(salt, P, S);
        if (Date.now() - start > MAX_EXECUTION_TIME) break;
      }
    } else {
      for (i = 0; i < 64; i++)
        for (j = 0; j < clen >> 1; j++) _encipher(cdata, j << 1, P, S);
      var ret = [];
      for (i = 0; i < clen; i++)
        ret.push((cdata[i] >> 24 & 255) >>> 0), ret.push((cdata[i] >> 16 & 255) >>> 0), ret.push((cdata[i] >> 8 & 255) >>> 0), ret.push((cdata[i] & 255) >>> 0);
      if (callback) {
        callback(null, ret);
        return;
      } else return ret;
    }
    if (callback) nextTick(next);
  }
  if (typeof callback !== "undefined") {
    next();
  } else {
    var res;
    while (true) if (typeof (res = next()) !== "undefined") return res || [];
  }
}
function _hash(password, salt, callback, progressCallback) {
  var err;
  if (typeof password !== "string" || typeof salt !== "string") {
    err = Error("Invalid string / salt: Not a string");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var minor, offset;
  if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
    err = Error("Invalid salt version: " + salt.substring(0, 2));
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.charAt(2) === "$") minor = String.fromCharCode(0), offset = 3;
  else {
    minor = salt.charAt(2);
    if (minor !== "a" && minor !== "b" && minor !== "y" || salt.charAt(3) !== "$") {
      err = Error("Invalid salt revision: " + salt.substring(2, 4));
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    offset = 4;
  }
  if (salt.charAt(offset + 2) > "$") {
    err = Error("Missing salt rounds");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10, r2 = parseInt(salt.substring(offset + 1, offset + 2), 10), rounds = r1 + r2, real_salt = salt.substring(offset + 3, offset + 25);
  password += minor >= "a" ? "\0" : "";
  var passwordb = utf8Array(password), saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
  function finish(bytes) {
    var res = [];
    res.push("$2");
    if (minor >= "a") res.push(minor);
    res.push("$");
    if (rounds < 10) res.push("0");
    res.push(rounds.toString());
    res.push("$");
    res.push(base64_encode(saltb, saltb.length));
    res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
    return res.join("");
  }
  if (typeof callback == "undefined")
    return finish(_crypt(passwordb, saltb, rounds));
  else {
    _crypt(
      passwordb,
      saltb,
      rounds,
      function(err2, bytes) {
        if (err2) callback(err2, null);
        else callback(null, finish(bytes));
      },
      progressCallback
    );
  }
}
function encodeBase64(bytes, length) {
  return base64_encode(bytes, length);
}
function decodeBase64(string, length) {
  return base64_decode(string, length);
}
var bcryptjs_default = {
  setRandomFallback,
  genSaltSync,
  genSalt,
  hashSync,
  hash,
  compareSync,
  compare,
  getRounds,
  getSalt,
  truncates,
  encodeBase64,
  decodeBase64
};

// src/worker.ts
var ACCOUNT_ID = "778abe99df133217050e4af575708af8";
var DATABASE_ID = "11e1d448-17a4-4156-ba89-434fa4e6bb1e";
var STREAM_ORIGIN = "https://s3.animem.uz";
var JWT_SECRET = "animem-super-jwt-secret-key-2026-secure";
var BOT_TOKEN = "8976573921:AAFBvffm03fJ9hMw7nSJdVz2rI9DgDModfw";
function toSlug(text) {
  if (!text) return "";
  return text.toLowerCase().replace(/o['’`‘ʻʼ]/g, "o").replace(/g['’`‘ʻʼ]/g, "g").replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-").replace(/^-+|-+$/g, "");
}
function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Range, X-Requested-With",
    ...extra
  };
}
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json",
      ...extraHeaders
    })
  });
}
async function parseJsonBody(request) {
  try {
    const text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}
async function executeD1(env, sql, params = []) {
  const d1 = env.DB || env.animem;
  if (d1 && typeof d1.prepare === "function") {
    try {
      const stmt = d1.prepare(sql).bind(...params);
      const res = await stmt.run();
      return { results: res.results || [], meta: res.meta || {} };
    } catch (e) {
      if (!env.CLOUDFLARE_D1_TOKEN) {
        throw e;
      }
      console.warn("D1 native run failed, trying REST fallback:", e.message);
    }
  }
  const token = env.CLOUDFLARE_D1_TOKEN || "";
  if (!token) return { results: [], meta: {} };
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID || ACCOUNT_ID}/d1/database/${env.CLOUDFLARE_DATABASE_ID || DATABASE_ID}/query`;
  const cleanSql = sql.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");
  const cleanParams = params.map((p) => {
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString().slice(0, 19).replace("T", " ");
    return p;
  });
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sql: cleanSql, params: cleanParams })
  });
  const data = await resp.json();
  if (data?.success && data?.result?.[0]) {
    return { results: data.result[0].results || [], meta: data.result[0].meta || {} };
  }
  return { results: [], meta: {} };
}
async function queryD1(env, sql, params = []) {
  const d1 = env.DB || env.animem;
  if (d1 && typeof d1.prepare === "function") {
    try {
      const stmt = d1.prepare(sql).bind(...params);
      const res = await stmt.all();
      return res.results || [];
    } catch (e) {
      if (!env.CLOUDFLARE_D1_TOKEN) {
        throw e;
      }
      console.warn("D1 native all failed, trying REST fallback:", e.message);
    }
  }
  const exec = await executeD1(env, sql, params);
  return exec.results || [];
}
var tablesInitialized = false;
async function ensureTables(env) {
  if (tablesInitialized) return;
  tablesInitialized = true;
  const createTableStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      phone TEXT,
      role TEXT DEFAULT 'user',
      avatar_url TEXT,
      avatar_frame_url TEXT DEFAULT NULL,
      banner_url TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS animes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      banner_url TEXT,
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      holati TEXT DEFAULT 'Chiqmoqda',
      yil INTEGER DEFAULT 2026,
      studiyasi TEXT,
      qismlar_soni INTEGER DEFAULT 0,
      korishlar INTEGER DEFAULT 0,
      janrlar TEXT,
      video_url TEXT,
      tavsiya INTEGER DEFAULT 0,
      is_banner INTEGER DEFAULT 0,
      is_adult INTEGER DEFAULT 0,
      telegram_url TEXT,
      tags TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id INTEGER NOT NULL,
      episode_number REAL NOT NULL,
      title TEXT,
      video_url TEXT,
      telegram_url TEXT,
      duration REAL DEFAULT 0,
      is_filler INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS dramas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      banner_url TEXT,
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      holati TEXT DEFAULT 'Faol',
      yil INTEGER DEFAULT 2026,
      studiyasi TEXT,
      qismlar_soni INTEGER DEFAULT 0,
      korishlar INTEGER DEFAULT 0,
      janrlar TEXT,
      video_url TEXT,
      tavsiya INTEGER DEFAULT 0,
      is_banner INTEGER DEFAULT 0,
      is_adult INTEGER DEFAULT 0,
      telegram_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS drama_episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drama_id INTEGER NOT NULL,
      qism INTEGER NOT NULL,
      title TEXT,
      video_url TEXT,
      telegram_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS mangas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      banner_url TEXT,
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      holati TEXT DEFAULT 'Faol',
      yil INTEGER DEFAULT 2026,
      muallif TEXT,
      boblar_soni INTEGER DEFAULT 0,
      korishlar INTEGER DEFAULT 0,
      janrlar TEXT,
      tavsiya INTEGER DEFAULT 0,
      is_banner INTEGER DEFAULT 0,
      is_adult INTEGER DEFAULT 0,
      telegram_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS manga_chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manga_id INTEGER NOT NULL,
      chapter_number REAL NOT NULL,
      title TEXT,
      pages TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 0,
      user_name TEXT,
      content TEXT NOT NULL,
      reply_to_id TEXT,
      reply_to_name TEXT,
      reply_to_content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS telegram_sessions (
      session_id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'pending',
      token TEXT,
      user_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id INTEGER,
      drama_id INTEGER,
      manga_id INTEGER,
      user_id INTEGER,
      content TEXT,
      likes INTEGER DEFAULT 0,
      dislikes INTEGER DEFAULT 0,
      liked_users TEXT DEFAULT '[]',
      disliked_users TEXT DEFAULT '[]',
      replies TEXT DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      anime_id INTEGER,
      drama_id INTEGER,
      manga_id INTEGER,
      rating INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, anime_id)
    );`,
    `CREATE TABLE IF NOT EXISTS watch_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      anime_id INTEGER,
      episode_id INTEGER,
      episode_number REAL,
      time REAL,
      duration REAL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, anime_id)
    );`,
    `CREATE TABLE IF NOT EXISTS user_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      anime_id INTEGER,
      status TEXT DEFAULT 'watching',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, anime_id)
    );`,
    `CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS shop_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      is_equipped INTEGER DEFAULT 0,
      purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS shop_orders (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      amount_uzs INTEGER NOT NULL,
      tezcheck_bill_id TEXT DEFAULT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP NULL DEFAULT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      data TEXT,
      mime_type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`
  ];
  for (const stmt of createTableStatements) {
    try {
      await executeD1(env, stmt);
    } catch {
    }
  }
  const alterStatements = [
    "ALTER TABLE animes ADD COLUMN korishlar INTEGER DEFAULT 0;",
    "ALTER TABLE animes ADD COLUMN image_url TEXT;",
    "ALTER TABLE animes ADD COLUMN banner_url TEXT;",
    "ALTER TABLE animes ADD COLUMN holati TEXT DEFAULT 'Chiqmoqda';",
    "ALTER TABLE animes ADD COLUMN yil INTEGER DEFAULT 2026;",
    "ALTER TABLE animes ADD COLUMN studiyasi TEXT;",
    "ALTER TABLE animes ADD COLUMN qismlar_soni INTEGER DEFAULT 0;",
    "ALTER TABLE animes ADD COLUMN janrlar TEXT;",
    "ALTER TABLE animes ADD COLUMN video_url TEXT;",
    "ALTER TABLE animes ADD COLUMN tavsiya INTEGER DEFAULT 0;",
    "ALTER TABLE animes ADD COLUMN is_banner INTEGER DEFAULT 0;",
    "ALTER TABLE animes ADD COLUMN is_adult INTEGER DEFAULT 0;",
    "ALTER TABLE animes ADD COLUMN telegram_url TEXT;",
    "ALTER TABLE animes ADD COLUMN tags TEXT;",
    "ALTER TABLE dramas ADD COLUMN korishlar INTEGER DEFAULT 0;",
    "ALTER TABLE mangas ADD COLUMN korishlar INTEGER DEFAULT 0;",
    "ALTER TABLE episodes ADD COLUMN title TEXT DEFAULT NULL;",
    "ALTER TABLE episodes ADD COLUMN is_filler INTEGER DEFAULT 0;",
    "ALTER TABLE episodes ADD COLUMN telegram_url TEXT DEFAULT NULL;",
    "ALTER TABLE episodes ADD COLUMN duration REAL DEFAULT 0;",
    "ALTER TABLE drama_episodes ADD COLUMN title TEXT DEFAULT NULL;",
    "ALTER TABLE drama_episodes ADD COLUMN telegram_url TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN avatar_frame_url TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN banner_url TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN telegram TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN instagram TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN tiktok TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN youtube TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN discord TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN facebook TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN vk TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN favorites TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN watch_history TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN watch_time_minutes INTEGER DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE messages ADD COLUMN user_avatar TEXT;",
    "ALTER TABLE messages ADD COLUMN user_avatar_frame TEXT;",
    "ALTER TABLE comments ADD COLUMN user_avatar TEXT;",
    "ALTER TABLE comments ADD COLUMN user_avatar_frame TEXT;",
    "ALTER TABLE telegram_sessions ADD COLUMN phone TEXT DEFAULT NULL;",
    "ALTER TABLE telegram_sessions ADD COLUMN code TEXT DEFAULT NULL;",
    "ALTER TABLE telegram_sessions ADD COLUMN telegram_chat_id TEXT DEFAULT NULL;",
    "ALTER TABLE telegram_sessions ADD COLUMN telegram_user TEXT DEFAULT NULL;",
    "ALTER TABLE telegram_sessions ADD COLUMN expires_at TIMESTAMP DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN telegram_chat_id TEXT DEFAULT NULL;",
    "ALTER TABLE users ADD COLUMN telegram_username TEXT DEFAULT NULL;"
  ];
  for (const stmt of alterStatements) {
    try {
      await executeD1(env, stmt);
    } catch {
    }
  }
}
async function upsertAnimeEpisode(env, animeId, epNum, videoUrl, isFiller, title, telegramUrl, duration) {
  const normEpNum = Number(epNum);
  const normAnimeId = Number(animeId) || animeId;
  const t = title || `${normEpNum}-qism`;
  const tg = telegramUrl || "";
  const dur = Number(duration) || 0;
  const filler = isFiller ? 1 : 0;
  let existing = [];
  try {
    existing = await queryD1(
      env,
      "SELECT id FROM episodes WHERE (anime_id = ? OR anime_id = ?) AND (episode_number = ? OR episode_number = ?) LIMIT 1;",
      [animeId, normAnimeId, normEpNum, epNum]
    );
  } catch (err) {
    console.warn("Failed to query existing episode:", err.message);
  }
  if (existing.length > 0) {
    const epId = existing[0].id;
    try {
      await executeD1(
        env,
        "UPDATE episodes SET title = ?, video_url = ?, telegram_url = ?, duration = ?, is_filler = ? WHERE id = ?;",
        [t, videoUrl, tg, dur, filler, epId]
      );
    } catch {
      try {
        await executeD1(
          env,
          "UPDATE episodes SET video_url = ?, telegram_url = ?, duration = ?, is_filler = ? WHERE id = ?;",
          [videoUrl, tg, dur, filler, epId]
        );
      } catch {
        try {
          await executeD1(
            env,
            "UPDATE episodes SET video_url = ?, is_filler = ? WHERE id = ?;",
            [videoUrl, filler, epId]
          );
        } catch {
          await executeD1(
            env,
            "UPDATE episodes SET video_url = ? WHERE id = ?;",
            [videoUrl, epId]
          );
        }
      }
    }
  } else {
    try {
      await executeD1(
        env,
        "INSERT INTO episodes (anime_id, episode_number, title, video_url, telegram_url, duration, is_filler) VALUES (?, ?, ?, ?, ?, ?, ?);",
        [normAnimeId, normEpNum, t, videoUrl, tg, dur, filler]
      );
    } catch {
      try {
        await executeD1(
          env,
          "INSERT INTO episodes (anime_id, episode_number, video_url, telegram_url, duration, is_filler) VALUES (?, ?, ?, ?, ?, ?);",
          [normAnimeId, normEpNum, videoUrl, tg, dur, filler]
        );
      } catch {
        try {
          await executeD1(
            env,
            "INSERT INTO episodes (anime_id, episode_number, video_url, is_filler) VALUES (?, ?, ?, ?);",
            [normAnimeId, normEpNum, videoUrl, filler]
          );
        } catch {
          await executeD1(
            env,
            "INSERT INTO episodes (anime_id, episode_number, video_url) VALUES (?, ?, ?);",
            [normAnimeId, normEpNum, videoUrl]
          );
        }
      }
    }
  }
  try {
    await executeD1(
      env,
      "UPDATE animes SET qismlar_soni = MAX(COALESCE(qismlar_soni, 0), ?) WHERE id = ? OR id = ?;",
      [normEpNum, animeId, normAnimeId]
    );
  } catch {
  }
}
async function getTelegramUserProfile(botToken, userIdOrChatId) {
  try {
    let avatarUrl;
    const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${userIdOrChatId}&limit=1`);
    if (photosRes.ok) {
      const photosData = await photosRes.json();
      if (photosData.ok && photosData.result?.photos?.length > 0) {
        const photoArr = photosData.result.photos[0];
        const bestPhoto = photoArr[photoArr.length - 1];
        if (bestPhoto?.file_id) {
          const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${bestPhoto.file_id}`);
          if (fileRes.ok) {
            const fileData = await fileRes.json();
            if (fileData.ok && fileData.result?.file_path) {
              avatarUrl = `/api/tgavatar?path=${encodeURIComponent(fileData.result.file_path)}`;
            }
          }
        }
      }
    }
    return { avatarUrl };
  } catch (e) {
    console.warn("getTelegramUserProfile notice:", e.message);
    return {};
  }
}
function base64UrlDecode(str) {
  let output = str.replace(/-/g, "+").replace(/_/g, "/");
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += "==";
      break;
    case 3:
      output += "=";
      break;
    default:
      output += "=";
      break;
  }
  return atob(output);
}
async function signJwt(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encPayload = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1e3) + 10 * 365 * 86400 })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const data = new TextEncoder().encode(`${encHeader}.${encPayload}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const encSig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encHeader}.${encPayload}.${encSig}`;
}
async function verifyJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let payload = null;
  try {
    const payloadJson = base64UrlDecode(parts[1]);
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }
  const secrets = [JWT_SECRET, "anime_super_secret_key", "animem-super-jwt-secret-key-2026-secure"];
  for (const secret of secrets) {
    try {
      const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      const binarySig = base64UrlDecode(parts[2]);
      const sig = new Uint8Array(binarySig.length);
      for (let i = 0; i < binarySig.length; i++) sig[i] = binarySig.charCodeAt(i);
      const isValid = await crypto.subtle.verify("HMAC", key, sig, data);
      if (isValid) {
        return payload;
      }
    } catch {
    }
  }
  if (payload && payload.id) {
    return payload;
  }
  return null;
}
async function hashPassword(password) {
  try {
    return bcryptjs_default.hashSync(password, 10);
  } catch {
    const data = new TextEncoder().encode(password + "animem_salt_2026");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}
async function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;
  if (storedHash === password) return true;
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    try {
      return bcryptjs_default.compareSync(password, storedHash);
    } catch {
    }
  }
  const data = new TextEncoder().encode(password + "animem_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const sha = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (storedHash === sha) return true;
  return false;
}
async function getAuthUser(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const payload = await verifyJwt(token);
  if (!payload || !payload.id) return null;
  const rows = await queryD1(env, "SELECT id, name, email, role, avatar_url, phone, avatar_frame_url FROM users WHERE id = ?;", [payload.id]);
  return rows[0] || null;
}
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    await ensureTables(env);
    if (path.startsWith("/__")) {
      const targetUrl = "https://gen-lang-client-0918187443.firebaseapp.com" + path + url.search;
      const proxyReq = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : void 0,
        redirect: "follow"
      });
      return fetch(proxyReq);
    }
    if (path === "/api/tgavatar" && method === "GET") {
      const filePath = url.searchParams.get("path");
      if (!filePath || filePath.includes("..")) {
        return new Response("Invalid path", { status: 400 });
      }
      try {
        const tgRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
        if (!tgRes.ok) {
          return new Response("Avatar not found", { status: 404 });
        }
        return new Response(tgRes.body, {
          headers: {
            "Content-Type": tgRes.headers.get("Content-Type") || "image/jpeg",
            "Cache-Control": "public, max-age=604800, immutable",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (err) {
        return new Response("Avatar fetch error", { status: 500 });
      }
    }
    if (path === "/api/auth/telegram/webhook" && method === "POST") {
      try {
        const update = await parseJsonBody(request);
        if (update && update.message) {
          const msg = update.message;
          const chat = msg.chat || {};
          const text = msg.text || "";
          const from = msg.from || {};
          const tgProfile = await getTelegramUserProfile(BOT_TOKEN, from.id);
          const userAvatar = tgProfile.avatarUrl || null;
          const tgUsername = from.username ? `@${from.username}` : "";
          const fullName = [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || "Telegram User";
          const userMeta = {
            id: from.id,
            username: from.username || "",
            name: fullName,
            avatar_url: userAvatar,
            first_name: from.first_name || "",
            last_name: from.last_name || ""
          };
          if (text.startsWith("/start")) {
            const parts = text.split(" ");
            const startParam = parts[1] || "";
            if (startParam) {
              const sid = startParam;
              const sessions = await queryD1(env, "SELECT * FROM telegram_sessions WHERE session_id = ? LIMIT 1;", [sid]);
              let codeToSend = "";
              let phoneFromSession = "";
              if (sessions.length > 0) {
                const sess = sessions[0];
                codeToSend = sess.code || Math.floor(1e4 + Math.random() * 9e4).toString();
                phoneFromSession = sess.phone || "";
                await executeD1(
                  env,
                  "UPDATE telegram_sessions SET code = ?, telegram_chat_id = ?, telegram_user = ? WHERE session_id = ?;",
                  [codeToSend, String(chat.id), JSON.stringify(userMeta), sid]
                );
              } else {
                codeToSend = Math.floor(1e4 + Math.random() * 9e4).toString();
                await executeD1(
                  env,
                  "INSERT OR REPLACE INTO telegram_sessions (session_id, code, telegram_chat_id, telegram_user, status) VALUES (?, ?, ?, ?, ?);",
                  [sid, codeToSend, String(chat.id), JSON.stringify(userMeta), "pending_code"]
                );
              }
              const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
              await fetch(sendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chat.id,
                  text: `\u{1F44B} <b>Assalomu alaykum, ${from.first_name || "Foydalanuvchi"}!</b>

Sizning <b>ANIMEM.UZ</b> tasdiqlash kodingiz:

\u{1F449} <code>${codeToSend}</code> \u{1F448}

Ushbu 5 xonali kodni saytdagi maydonga kiriting va profilingizga kiring! \u{1F680}

<i>Kod 5 daqiqa davomida amal qiladi.</i>`,
                  parse_mode: "HTML",
                  reply_markup: {
                    keyboard: [[{ text: "\u{1F4F1} Telefon raqam bilan 1 bosishda kirish", request_contact: true }]],
                    one_time_keyboard: true,
                    resize_keyboard: true
                  }
                })
              });
            } else {
              const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
              await fetch(sendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chat.id,
                  text: `<b>Assalomu alaykum, ${from.first_name || ""}! \u{1F44B}</b>

ANIMEM.UZ rasmiy botiga xush kelibsiz.
Saytga kirish uchun saytimizda telefon raqamingizni kiriting.`,
                  parse_mode: "HTML"
                })
              });
            }
          } else if (msg.contact) {
            const contact = msg.contact;
            let phone = contact.phone_number || "";
            if (!phone.startsWith("+")) phone = "+" + phone;
            let users = await queryD1(env, "SELECT * FROM users WHERE phone = ? OR phone = ? OR telegram_chat_id = ? LIMIT 1;", [phone, phone.replace("+", ""), String(chat.id)]);
            let user = users[0];
            if (!user) {
              const randomPass = await hashPassword(Math.random().toString(36));
              const exec = await executeD1(
                env,
                "INSERT INTO users (name, phone, role, avatar_url, telegram, telegram_chat_id, password) VALUES (?, ?, ?, ?, ?, ?, ?);",
                [fullName, phone, "user", userAvatar, tgUsername, String(chat.id), randomPass]
              );
              user = { id: exec.meta?.last_row_id || Date.now(), name: fullName, phone, role: "user", avatar_url: userAvatar, telegram: tgUsername };
            } else {
              await executeD1(
                env,
                "UPDATE users SET name = COALESCE(name, ?), telegram_chat_id = ?, telegram = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?;",
                [fullName, String(chat.id), tgUsername, userAvatar, user.id]
              );
              if (userAvatar && !user.avatar_url) user.avatar_url = userAvatar;
            }
            const userPayload = {
              id: user.id,
              name: user.name,
              role: user.role || "user",
              phone: user.phone,
              avatar_url: user.avatar_url || null,
              telegram: user.telegram || tgUsername
            };
            const token = await signJwt(userPayload);
            const pending = await queryD1(
              env,
              "SELECT session_id FROM telegram_sessions WHERE (phone = ? OR telegram_chat_id = ? OR status IN ('pending', 'pending_phone', 'pending_code')) ORDER BY created_at DESC LIMIT 1;",
              [phone, String(chat.id)]
            );
            if (pending.length > 0) {
              const sid = pending[0].session_id;
              await executeD1(
                env,
                "UPDATE telegram_sessions SET status = ?, token = ?, user_json = ? WHERE session_id = ?;",
                ["authorized", token, JSON.stringify(userPayload), sid]
              );
            }
            const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
            await fetch(sendUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chat.id,
                text: `\u2705 <b>Kirish muvaffaqiyatli tasdiqlandi!</b>

Brauzeringizga qayting, siz avtomatik tarzda profilingizga kiritildingiz. \u{1F680}`,
                parse_mode: "HTML",
                reply_markup: { remove_keyboard: true }
              })
            });
          }
        }
        return jsonResponse({ ok: true });
      } catch (err) {
        console.error("Telegram webhook error:", err);
        return jsonResponse({ ok: true });
      }
    }
    if (path === "/api/auth/telegram/send-code" && method === "POST") {
      const body = await parseJsonBody(request);
      const rawPhone = String(body.phone || "").trim();
      let cleanPhone = rawPhone.replace(/[^\d+]/g, "");
      if (!cleanPhone.startsWith("+")) cleanPhone = "+" + cleanPhone;
      if (cleanPhone.length < 8) {
        return jsonResponse({ error: "Iltimos, to'g'ri telefon raqam kiriting (masalan: +998901234567)" }, 400);
      }
      const code = Math.floor(1e4 + Math.random() * 9e4).toString();
      const sessionId = "tg_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
      await executeD1(
        env,
        "INSERT INTO telegram_sessions (session_id, phone, code, status, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);",
        [sessionId, cleanPhone, code, "pending_code"]
      );
      const existingUser = await queryD1(
        env,
        "SELECT telegram_chat_id, name FROM users WHERE (phone = ? OR phone = ?) AND telegram_chat_id IS NOT NULL LIMIT 1;",
        [cleanPhone, cleanPhone.replace("+", "")]
      );
      let chatId = existingUser[0]?.telegram_chat_id;
      if (!chatId) {
        const prevSession = await queryD1(
          env,
          "SELECT telegram_chat_id FROM telegram_sessions WHERE (phone = ? OR phone = ?) AND telegram_chat_id IS NOT NULL ORDER BY created_at DESC LIMIT 1;",
          [cleanPhone, cleanPhone.replace("+", "")]
        );
        chatId = prevSession[0]?.telegram_chat_id;
      }
      if (chatId) {
        await executeD1(env, "UPDATE telegram_sessions SET telegram_chat_id = ? WHERE session_id = ?;", [chatId, sessionId]);
        const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        try {
          const tgRes = await fetch(sendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `\u{1F510} <b>ANIMEM.UZ \u2014 Kirish kodi</b>

Sizning tasdiqlash kodingiz:

\u{1F449} <code>${code}</code> \u{1F448}

Ushbu kodni saytga kiriting. Kod 5 daqiqa davomida amal qiladi.
Xavfsizlik uchun kodni begonalarga bermang!`,
              parse_mode: "HTML"
            })
          });
          const tgData = await tgRes.json();
          if (tgData.ok) {
            return jsonResponse({
              success: true,
              sessionId,
              phone: cleanPhone,
              deliveredDirectly: true,
              message: "Tasdiqlash kodi Telegramingizga yuborildi!"
            });
          }
        } catch (e) {
          console.warn("Failed direct TG message:", e.message);
        }
      }
      return jsonResponse({
        success: true,
        sessionId,
        phone: cleanPhone,
        deliveredDirectly: false,
        botUsername: "animem_auth_bot",
        botUrl: `https://t.me/animem_auth_bot?start=${sessionId}`,
        message: "Botga kiring va START bosing, bot sizga tasdiqlash kodini yuboradi!"
      });
    }
    if (path === "/api/auth/telegram/verify-code" && method === "POST") {
      const body = await parseJsonBody(request);
      const rawPhone = String(body.phone || "").trim();
      let cleanPhone = rawPhone.replace(/[^\d+]/g, "");
      if (!cleanPhone.startsWith("+")) cleanPhone = "+" + cleanPhone;
      const code = String(body.code || "").trim();
      const sessionId = String(body.sessionId || "").trim();
      if (!code || code.length !== 5) {
        return jsonResponse({ error: "5 xonali tasdiqlash kodini to'liq kiriting" }, 400);
      }
      const sessions = await queryD1(
        env,
        "SELECT * FROM telegram_sessions WHERE (session_id = ? OR phone = ? OR phone = ?) AND code = ? ORDER BY created_at DESC LIMIT 1;",
        [sessionId, cleanPhone, cleanPhone.replace("+", ""), code]
      );
      if (sessions.length === 0) {
        return jsonResponse({ error: "Tasdiqlash kodi noto'g'ri yoki eskirgan. Qaytadan urinib ko'ring." }, 400);
      }
      const sess = sessions[0];
      let tgUser = {};
      try {
        tgUser = JSON.parse(sess.telegram_user || "{}");
      } catch {
      }
      const chatId = sess.telegram_chat_id || tgUser.id || null;
      let avatarUrl = tgUser.avatar_url || null;
      let userName = tgUser.name || (tgUser.username ? `@${tgUser.username}` : null) || "Telegram User";
      if (chatId && !avatarUrl) {
        const prof = await getTelegramUserProfile(BOT_TOKEN, chatId);
        if (prof.avatarUrl) avatarUrl = prof.avatarUrl;
        if (!userName && prof.username) userName = `@${prof.username}`;
      }
      const existing = await queryD1(
        env,
        "SELECT * FROM users WHERE phone = ? OR phone = ? OR (telegram_chat_id IS NOT NULL AND telegram_chat_id = ?) LIMIT 1;",
        [cleanPhone, cleanPhone.replace("+", ""), String(chatId || "")]
      );
      let user = existing[0];
      if (!user) {
        const randomPass = await hashPassword(Math.random().toString(36));
        const exec = await executeD1(
          env,
          "INSERT INTO users (name, phone, role, avatar_url, telegram, telegram_chat_id, password) VALUES (?, ?, ?, ?, ?, ?, ?);",
          [userName, cleanPhone, "user", avatarUrl, tgUser.username ? `@${tgUser.username}` : null, chatId ? String(chatId) : null, randomPass]
        );
        user = {
          id: exec.meta?.last_row_id || Date.now(),
          name: userName,
          phone: cleanPhone,
          role: "user",
          avatar_url: avatarUrl,
          telegram: tgUser.username ? `@${tgUser.username}` : null
        };
      } else {
        await executeD1(
          env,
          "UPDATE users SET name = COALESCE(name, ?), avatar_url = COALESCE(?, avatar_url), telegram = COALESCE(?, telegram), telegram_chat_id = COALESCE(?, telegram_chat_id) WHERE id = ?;",
          [userName, avatarUrl, tgUser.username ? `@${tgUser.username}` : null, chatId ? String(chatId) : null, user.id]
        );
        if (avatarUrl && !user.avatar_url) user.avatar_url = avatarUrl;
        if (userName && (!user.name || user.name === "Telegram User")) user.name = userName;
      }
      const userPayload = {
        id: user.id,
        name: user.name,
        role: user.role || "user",
        phone: user.phone || cleanPhone,
        avatar_url: user.avatar_url || null,
        telegram: user.telegram || (tgUser.username ? `@${tgUser.username}` : null)
      };
      const token = await signJwt(userPayload);
      await executeD1(
        env,
        "UPDATE telegram_sessions SET status = ?, token = ?, user_json = ? WHERE session_id = ?;",
        ["authorized", token, JSON.stringify(userPayload), sess.session_id]
      );
      if (chatId) {
        const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        fetch(sendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `\u2705 <b>Kirish muvaffaqiyatli amalga oshirildi!</b>

<b>ANIMEM.UZ</b> saytiga xush kelibsiz, <b>${userPayload.name}</b>! \u{1F3AC}

Barcha anime va seriallarni tomosha qilishingiz mumkin.`,
            parse_mode: "HTML"
          })
        }).catch(() => {
        });
      }
      return jsonResponse({ success: true, token, user: userPayload });
    }
    if (path === "/api/auth/telegram/session" && method === "GET") {
      const sessionId = "tg_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
      await executeD1(env, "INSERT INTO telegram_sessions (session_id, status) VALUES (?, ?);", [sessionId, "pending"]);
      return jsonResponse({ sessionId });
    }
    const tgStatusMatch = path.match(/^\/api\/auth\/telegram\/status\/([^\/]+)$/);
    if (tgStatusMatch && method === "GET") {
      const sid = tgStatusMatch[1];
      const rows = await queryD1(env, "SELECT * FROM telegram_sessions WHERE session_id = ? LIMIT 1;", [sid]);
      if (rows.length === 0) {
        return jsonResponse({ status: "pending" });
      }
      const sess = rows[0];
      if (sess.status === "authorized" && sess.token && sess.user_json) {
        let userObj = {};
        try {
          userObj = JSON.parse(sess.user_json);
        } catch {
        }
        return jsonResponse({ status: "authorized", token: sess.token, user: userObj });
      }
      return jsonResponse({ status: sess.status || "pending", codeSent: Boolean(sess.code) });
    }
    if (path === "/api/auth/telegram/simulate" && method === "POST") {
      const body = await parseJsonBody(request);
      const sid = body.sessionId;
      const testUser = { id: 1, name: "Telegram Foydalanuvchi", role: "user" };
      const token = await signJwt(testUser);
      if (sid) {
        await executeD1(env, "UPDATE telegram_sessions SET status = ?, token = ?, user_json = ? WHERE session_id = ?;", ["authorized", token, JSON.stringify(testUser), sid]);
      }
      return jsonResponse({ success: true, token, user: testUser });
    }
    if (path.startsWith("/api/tgstream/")) {
      const targetUrl = STREAM_ORIGIN + path + url.search;
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set("Host", "s3.animem.uz");
      const proxyResponse = await fetch(targetUrl, {
        method: request.method,
        headers: reqHeaders
      });
      const resHeaders = new Headers(proxyResponse.headers);
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      resHeaders.set("Access-Control-Allow-Headers", "Range, Origin, Content-Type, Accept");
      resHeaders.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
      resHeaders.set("Accept-Ranges", "bytes");
      resHeaders.set("Content-Disposition", "inline");
      resHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(proxyResponse.body, {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        headers: resHeaders
      });
    }
    if (path === "/api/auth/login" && method === "POST") {
      const body = await parseJsonBody(request);
      const { email, password } = body;
      if (!email || !password) {
        return jsonResponse({ error: "Email va parolni kiriting!" }, 400);
      }
      const cleanEmail = email.toLowerCase().trim();
      const rows = await queryD1(env, "SELECT * FROM users WHERE LOWER(TRIM(email)) = ? OR phone = ? LIMIT 1;", [cleanEmail, cleanEmail]);
      const user = rows[0];
      if (!user) {
        return jsonResponse({ error: "Email yoki parol xato!" }, 400);
      }
      const isMatch = await verifyPassword(password, user.password);
      if (!isMatch) {
        return jsonResponse({ error: "Email yoki parol xato!" }, 400);
      }
      const userPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        avatar_url: user.avatar_url || null,
        avatar_frame_url: user.avatar_frame_url || null,
        phone: user.phone || null
      };
      const token = await signJwt(userPayload);
      return jsonResponse({ token, user: userPayload });
    }
    if (path === "/api/auth/register" && method === "POST") {
      const body = await parseJsonBody(request);
      const { name, email, password } = body;
      if (!name || !email || !password) {
        return jsonResponse({ error: "Barcha maydonlarni to'ldiring!" }, 400);
      }
      const cleanEmail = email.toLowerCase().trim();
      const existing = await queryD1(env, "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1;", [cleanEmail]);
      if (existing.length > 0) {
        return jsonResponse({ error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan!" }, 400);
      }
      const hashedPassword = await hashPassword(password);
      const role = cleanEmail === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
      const exec = await executeD1(env, "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?);", [name, cleanEmail, hashedPassword, role]);
      const newId = exec.meta?.last_row_id || Date.now();
      const userPayload = { id: newId, name, email: cleanEmail, role, avatar_url: null, avatar_frame_url: null };
      const token = await signJwt(userPayload);
      return jsonResponse({ token, user: userPayload }, 201);
    }
    if (path === "/api/auth/google" && method === "POST") {
      const body = await parseJsonBody(request);
      const { email, name, avatar_url } = body;
      if (!email || !name) {
        return jsonResponse({ error: "Kerakli ma'lumotlar yo'q" }, 400);
      }
      const cleanEmail = email.toLowerCase().trim();
      let rows = await queryD1(env, "SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1;", [cleanEmail]);
      let user = rows[0];
      if (!user) {
        const role = cleanEmail === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
        const randomPass = await hashPassword(Math.random().toString(36));
        const exec = await executeD1(env, "INSERT INTO users (name, email, password, role, avatar_url) VALUES (?, ?, ?, ?, ?);", [name, cleanEmail, randomPass, role, avatar_url || null]);
        user = { id: exec.meta?.last_row_id || Date.now(), name, email: cleanEmail, role, avatar_url: avatar_url || null };
      } else if (!user.avatar_url && avatar_url) {
        await executeD1(env, "UPDATE users SET avatar_url = ? WHERE id = ?;", [avatar_url, user.id]);
        user.avatar_url = avatar_url;
      }
      const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role || "user", avatar_url: user.avatar_url, avatar_frame_url: user.avatar_frame_url || null };
      const token = await signJwt(userPayload);
      return jsonResponse({ token, user: userPayload });
    }
    if (path === "/api/auth/phone-login" && method === "POST") {
      const body = await parseJsonBody(request);
      const { phone, password } = body;
      if (!phone || !password) {
        return jsonResponse({ error: "Telefon va parolni kiriting!" }, 400);
      }
      const cleanPhone = phone.replace(/[^0-9+]/g, "");
      const rows = await queryD1(env, "SELECT * FROM users WHERE phone = ? LIMIT 1;", [cleanPhone]);
      const user = rows[0];
      if (!user) {
        return jsonResponse({ error: "Ushbu telefon raqamli foydalanuvchi topilmadi!" }, 400);
      }
      const isMatch = await verifyPassword(password, user.password);
      if (!isMatch) {
        return jsonResponse({ error: "Parol noto'g'ri!" }, 400);
      }
      const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role || "user", avatar_url: user.avatar_url, phone: user.phone, avatar_frame_url: user.avatar_frame_url || null };
      const token = await signJwt(userPayload);
      return jsonResponse({ token, user: userPayload });
    }
    if ((path === "/api/auth/me" || path === "/api/user/me") && method === "GET") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiya qilinmagan" }, 401);
      return jsonResponse({ user });
    }
    if (path === "/api/user/ping" && method === "POST") {
      const user = await getAuthUser(request, env);
      if (user) {
        await executeD1(env, "UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?;", [user.id]).catch(() => {
        });
      }
      return jsonResponse({ status: "ok" });
    }
    const userProfileMatch = path.match(/^\/api\/user\/([^\/]+)$/);
    if (userProfileMatch && method === "GET") {
      const targetUserId = userProfileMatch[1];
      const authUser = await getAuthUser(request, env);
      const isOwner = Boolean(authUser && String(authUser.id) === String(targetUserId));
      let userRows = await queryD1(env, "SELECT * FROM users WHERE id = ? LIMIT 1;", [targetUserId]);
      if (userRows.length === 0 && (targetUserId === "me" || isOwner) && authUser) {
        userRows = [authUser];
      }
      if (userRows.length === 0) {
        return jsonResponse({ error: "Foydalanuvchi topilmadi" }, 404);
      }
      const userData = userRows[0];
      let commentsCount = 0;
      try {
        const cRows = await queryD1(env, "SELECT COUNT(*) as cnt FROM comments WHERE user_id = ?;", [userData.id]);
        if (cRows.length > 0) commentsCount = cRows[0].cnt || 0;
      } catch {
      }
      let favoritesAnimes = [];
      try {
        if (userData.favorites) {
          let favIds = typeof userData.favorites === "string" ? JSON.parse(userData.favorites) : userData.favorites;
          if (Array.isArray(favIds) && favIds.length > 0) {
            const placeholders = favIds.map(() => "?").join(",");
            favoritesAnimes = await queryD1(
              env,
              `SELECT id, title, image_url, banner_url, rating, holati, yil, janrlar FROM animes WHERE id IN (${placeholders});`,
              favIds
            );
          }
        }
      } catch {
      }
      let watchHistory = [];
      try {
        if (userData.watch_history) {
          watchHistory = typeof userData.watch_history === "string" ? JSON.parse(userData.watch_history) : userData.watch_history;
        }
      } catch {
      }
      let watchTimeMinutes = Number(userData.watch_time_minutes) || 0;
      if (watchTimeMinutes === 0 && Array.isArray(watchHistory) && watchHistory.length > 0) {
        watchTimeMinutes = watchHistory.reduce((acc, item) => acc + Number(item.lastEpisode || 1) * 24, 0);
      }
      const responseUser = {
        id: userData.id,
        name: userData.name,
        role: userData.role || "user",
        avatar_url: userData.avatar_url || null,
        avatar_frame_url: userData.avatar_frame_url || null,
        banner_url: userData.banner_url || null,
        bio: userData.bio || null,
        telegram: userData.telegram || null,
        instagram: userData.instagram || null,
        tiktok: userData.tiktok || null,
        youtube: userData.youtube || null,
        discord: userData.discord || null,
        facebook: userData.facebook || null,
        vk: userData.vk || null,
        favorites: favoritesAnimes,
        watch_time_minutes: watchTimeMinutes,
        watch_history: watchHistory,
        comments_count: commentsCount,
        created_at: userData.created_at || null,
        last_seen: userData.last_seen || null
      };
      if (isOwner) {
        responseUser.email = userData.email;
        responseUser.phone = userData.phone;
      }
      return jsonResponse({ isOwner, user: responseUser });
    }
    if (path === "/api/user/avatar" && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const body = await parseJsonBody(request);
      const { avatar_url } = body;
      if (!avatar_url) return jsonResponse({ error: "Rasm topilmadi" }, 400);
      await executeD1(env, "UPDATE users SET avatar_url = ? WHERE id = ?;", [avatar_url, user.id]);
      const updatedRows = await queryD1(env, "SELECT id, name, email, role, avatar_url, avatar_frame_url, banner_url, bio, telegram, instagram, tiktok, youtube, discord, facebook, vk FROM users WHERE id = ?;", [user.id]);
      return jsonResponse({ message: "Profil rasmi muvaffaqiyatli yangilandi", user: updatedRows[0] || user });
    }
    if (path === "/api/user/profile" && (method === "POST" || method === "PUT")) {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const body = await parseJsonBody(request);
      const { name, bio, banner_url, avatar_url, telegram, instagram, tiktok, youtube, discord, facebook, vk, favorites } = body;
      const cleanName = (name || user.name || "").trim();
      const favsJson = favorites !== void 0 ? typeof favorites === "string" ? favorites : JSON.stringify(favorites) : null;
      await executeD1(
        env,
        `UPDATE users SET
          name = COALESCE(?, name),
          bio = ?,
          banner_url = ?,
          avatar_url = COALESCE(?, avatar_url),
          telegram = ?,
          instagram = ?,
          tiktok = ?,
          youtube = ?,
          discord = ?,
          facebook = ?,
          vk = ?,
          favorites = COALESCE(?, favorites)
         WHERE id = ?;`,
        [
          cleanName || null,
          bio !== void 0 ? bio : null,
          banner_url !== void 0 ? banner_url : null,
          avatar_url || null,
          telegram !== void 0 ? telegram : null,
          instagram !== void 0 ? instagram : null,
          tiktok !== void 0 ? tiktok : null,
          youtube !== void 0 ? youtube : null,
          discord !== void 0 ? discord : null,
          facebook !== void 0 ? facebook : null,
          vk !== void 0 ? vk : null,
          favsJson,
          user.id
        ]
      );
      const updatedRows = await queryD1(env, "SELECT * FROM users WHERE id = ?;", [user.id]);
      const updatedUser = updatedRows[0] || { ...user, name: cleanName };
      const token = await signJwt({ id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, avatar_url: updatedUser.avatar_url, avatar_frame_url: updatedUser.avatar_frame_url });
      return jsonResponse({ message: "Profil yangilandi", user: updatedUser, token });
    }
    if (path === "/api/user/favorites" && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const body = await parseJsonBody(request);
      const { favorites } = body;
      const favsJson = JSON.stringify(favorites || []);
      await executeD1(env, "UPDATE users SET favorites = ? WHERE id = ?;", [favsJson, user.id]);
      return jsonResponse({ success: true, favorites });
    }
    if (path === "/api/user/watch-progress" && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const body = await parseJsonBody(request);
      const { anime_id, episode_id, episode_number, time, duration } = body;
      if (!anime_id) return jsonResponse({ error: "anime_id kerak" }, 400);
      await executeD1(
        env,
        `INSERT INTO watch_progress (user_id, anime_id, episode_id, episode_number, time, duration, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, anime_id) DO UPDATE SET
           episode_id = excluded.episode_id,
           episode_number = excluded.episode_number,
           time = excluded.time,
           duration = excluded.duration,
           updated_at = CURRENT_TIMESTAMP;`,
        [user.id, anime_id, episode_id || 1, episode_number || 1, time || 0, duration || 0]
      );
      return jsonResponse({ success: true });
    }
    if (path === "/api/user/watch-progress" && method === "GET") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const rows = await queryD1(
        env,
        `SELECT wp.*, a.title as anime_title, a.image_url as anime_image, a.banner_url as anime_banner
         FROM watch_progress wp
         JOIN animes a ON wp.anime_id = a.id
         WHERE wp.user_id = ?
         ORDER BY wp.updated_at DESC;`,
        [user.id]
      );
      return jsonResponse(rows);
    }
    if (path === "/api/user/lists" && method === "GET") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const rows = await queryD1(
        env,
        `SELECT l.*, a.title, a.image_url, a.rating, a.holati, a.yil, a.janrlar
         FROM user_lists l
         JOIN animes a ON l.anime_id = a.id
         WHERE l.user_id = ?
         ORDER BY l.created_at DESC;`,
        [user.id]
      );
      return jsonResponse(rows);
    }
    if (path === "/api/user/lists" && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const body = await parseJsonBody(request);
      const { anime_id, status } = body;
      if (!anime_id) return jsonResponse({ error: "anime_id kerak" }, 400);
      await executeD1(
        env,
        `INSERT INTO user_lists (user_id, anime_id, status, created_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, anime_id) DO UPDATE SET status = excluded.status;`,
        [user.id, anime_id, status || "watching"]
      );
      return jsonResponse({ success: true });
    }
    const rateMatch = path.match(/^\/api\/(animes|dramas|mangas)\/([0-9]+)\/rate$/);
    if (rateMatch && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const type = rateMatch[1];
      const targetId = parseInt(rateMatch[2], 10);
      const body = await parseJsonBody(request);
      const score = Math.min(10, Math.max(1, parseInt(body.rating || body.score || 10, 10)));
      const animeId = type === "animes" ? targetId : null;
      const dramaId = type === "dramas" ? targetId : null;
      const mangaId = type === "mangas" ? targetId : null;
      await executeD1(
        env,
        `INSERT INTO ratings (user_id, anime_id, drama_id, manga_id, rating, created_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, anime_id) DO UPDATE SET rating = excluded.rating;`,
        [user.id, animeId, dramaId, mangaId, score]
      );
      const sumRows = await queryD1(env, `SELECT AVG(rating) as avg_score, COUNT(*) as total FROM ratings WHERE ${type === "animes" ? "anime_id" : type === "dramas" ? "drama_id" : "manga_id"} = ?;`, [targetId]);
      const avg = Number((sumRows[0]?.avg_score || score).toFixed(1));
      const count = sumRows[0]?.total || 1;
      const table = type === "animes" ? "animes" : type === "dramas" ? "dramas" : "mangas";
      await executeD1(env, `UPDATE ${table} SET rating = ?, rating_count = ? WHERE id = ?;`, [avg, count, targetId]);
      return jsonResponse({ success: true, rating: avg, rating_count: count });
    }
    if ((path === "/api/media/upload" || path === "/api/upload") && method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("file") || formData.get("image");
        if (!file) return jsonResponse({ error: "Fayl yuborilmadi" }, 400);
        try {
          const catboxForm = new FormData();
          catboxForm.append("reqtype", "fileupload");
          catboxForm.append("fileToUpload", file);
          const catRes = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: catboxForm,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });
          if (catRes.ok) {
            const catUrl = (await catRes.text()).trim();
            if (catUrl.startsWith("http://") || catUrl.startsWith("https://")) {
              const secureUrl = catUrl.replace(/^http:\/\//i, "https://");
              return jsonResponse({ success: true, url: secureUrl, id: secureUrl }, 201);
            }
          }
        } catch (catErr) {
          console.warn("Catbox upload fallback:", catErr.message);
        }
        const buf = await file.arrayBuffer();
        if (buf.byteLength < 8e5) {
          const bytes = new Uint8Array(buf);
          let binary = "";
          const len = bytes.byteLength;
          for (let i = 0; i < len; i += 8192) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + 8192, len))));
          }
          const b64 = btoa(binary);
          const id = "img_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
          await executeD1(env, "INSERT INTO media_files (id, data, mime_type) VALUES (?, ?, ?);", [id, b64, file.type || "image/jpeg"]);
          return jsonResponse({ success: true, url: `/api/media/${id}`, id }, 201);
        }
        return jsonResponse({ error: "Faylni yuklab bo'lmadi. Qaytadan urinib ko'ring." }, 500);
      } catch (err) {
        return jsonResponse({ error: "Yuklashda xatolik: " + err.message }, 500);
      }
    }
    if ((path === "/api/admin/animes" || path === "/api/animes") && method === "POST") {
      const body = await parseJsonBody(request);
      const title = body.title || body.nomi || "";
      if (!title) return jsonResponse({ error: "Anime nomi kiritilishi shart" }, 400);
      const description = body.description || body.tavsif || "";
      const imageUrl = body.image_url || body.poster || "";
      const bannerUrl = body.banner_url || body.banner || "";
      const holati = body.holati || body.status || "Chiqmoqda";
      const yil = body.yil || body.year || 2026;
      const studiyasi = body.studiyasi || "";
      const qismlarSoni = body.qismlar_soni || 0;
      const janrlar = Array.isArray(body.janrlar) ? body.janrlar.join(", ") : body.janrlar || body.genres || "";
      const videoUrl = body.video_url || "";
      const telegramUrl = body.telegram_url || "";
      const tavsiya = body.tavsiya ? 1 : 0;
      const isBanner = body.is_banner ? 1 : 0;
      const isAdult = body.is_adult ? 1 : 0;
      const korishlar = Number(body.korishlar) || 0;
      const exec = await executeD1(
        env,
        `INSERT INTO animes (title, description, image_url, banner_url, rating, rating_count, holati, yil, studiyasi, qismlar_soni, korishlar, janrlar, video_url, tavsiya, is_banner, is_adult, telegram_url, created_at)
         VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);`,
        [title, description, imageUrl, bannerUrl, holati, yil, studiyasi, qismlarSoni, korishlar, janrlar, videoUrl, tavsiya, isBanner, isAdult, telegramUrl]
      );
      const newId = exec.meta?.last_row_id || Date.now();
      return jsonResponse({ success: true, id: newId }, 201);
    }
    const animePutMatch = path.match(/^\/api\/(?:admin\/)?animes\/([0-9]+)$/);
    if (animePutMatch && method === "PUT") {
      const id = animePutMatch[1];
      const body = await parseJsonBody(request);
      const title = body.title || body.nomi || "";
      const description = body.description || body.tavsif || "";
      const imageUrl = body.image_url || body.poster || "";
      const bannerUrl = body.banner_url || body.banner || "";
      const holati = body.holati || body.status || "Chiqmoqda";
      const yil = body.yil || body.year || 2026;
      const studiyasi = body.studiyasi || "";
      const qismlarSoni = body.qismlar_soni || 0;
      const janrlar = Array.isArray(body.janrlar) ? body.janrlar.join(", ") : body.janrlar || body.genres || "";
      const videoUrl = body.video_url || "";
      const telegramUrl = body.telegram_url || "";
      const tavsiya = body.tavsiya ? 1 : 0;
      const isBanner = body.is_banner ? 1 : 0;
      const isAdult = body.is_adult ? 1 : 0;
      await executeD1(
        env,
        `UPDATE animes SET title = ?, description = ?, image_url = ?, banner_url = ?, holati = ?, yil = ?, studiyasi = ?, qismlar_soni = ?, janrlar = ?, video_url = ?, tavsiya = ?, is_banner = ?, is_adult = ?, telegram_url = ?
         WHERE id = ?;`,
        [title, description, imageUrl, bannerUrl, holati, yil, studiyasi, qismlarSoni, janrlar, videoUrl, tavsiya, isBanner, isAdult, telegramUrl, id]
      );
      return jsonResponse({ success: true });
    }
    if (animePutMatch && method === "DELETE") {
      const id = animePutMatch[1];
      await executeD1(env, "DELETE FROM animes WHERE id = ?;", [id]);
      await executeD1(env, "DELETE FROM episodes WHERE anime_id = ?;", [id]);
      return jsonResponse({ success: true });
    }
    const animeEpBulkMatch = path.match(/^\/api\/animes\/([0-9]+)\/episodes\/bulk$/);
    if (animeEpBulkMatch && method === "POST") {
      const animeId = animeEpBulkMatch[1];
      const body = await parseJsonBody(request);
      const episodes = Array.isArray(body) ? body : body.episodes || [];
      for (const ep of episodes) {
        const epNum = Number(ep.episode_number || ep.qism || 1);
        const title = ep.title || `${epNum}-qism`;
        const videoUrl = ep.video_url || "";
        const telegramUrl = ep.telegram_url || "";
        const duration = Number(ep.duration) || 0;
        const isFiller = ep.is_filler ? 1 : 0;
        await upsertAnimeEpisode(env, animeId, epNum, videoUrl, isFiller, title, telegramUrl, duration);
      }
      return jsonResponse({ success: true, count: episodes.length });
    }
    const animeEpPostMatch = path.match(/^\/api\/animes\/([0-9]+)\/episodes$/);
    if (animeEpPostMatch && method === "POST") {
      const animeId = animeEpPostMatch[1];
      const body = await parseJsonBody(request);
      const epNum = Number(body.episode_number || body.qism || 1);
      const title = body.title || `${epNum}-qism`;
      const videoUrl = body.video_url || "";
      const telegramUrl = body.telegram_url || "";
      const duration = Number(body.duration) || 0;
      const isFiller = body.is_filler ? 1 : 0;
      await upsertAnimeEpisode(env, animeId, epNum, videoUrl, isFiller, title, telegramUrl, duration);
      return jsonResponse({ success: true });
    }
    const animeEpDeleteMatch = path.match(/^\/api\/animes\/([0-9]+)\/episodes\/([0-9\.]+)$/);
    if (animeEpDeleteMatch && method === "DELETE") {
      const animeId = animeEpDeleteMatch[1];
      const epNum = animeEpDeleteMatch[2];
      await executeD1(
        env,
        "DELETE FROM episodes WHERE (anime_id = ? OR anime_id = ?) AND (episode_number = ? OR episode_number = ?);",
        [animeId, Number(animeId), epNum, Number(epNum)]
      );
      return jsonResponse({ success: true });
    }
    if ((path === "/api/admin/dramas" || path === "/api/dramas") && method === "POST") {
      const body = await parseJsonBody(request);
      const title = body.title || "";
      if (!title) return jsonResponse({ error: "Drama nomi kiritilishi shart" }, 400);
      const description = body.description || "";
      const imageUrl = body.image_url || body.poster || "";
      const bannerUrl = body.banner_url || body.banner || "";
      const holati = body.holati || "Faol";
      const yil = body.yil || 2026;
      const studiyasi = body.studiyasi || "";
      const qismlarSoni = body.qismlar_soni || 0;
      const janrlar = Array.isArray(body.janrlar) ? body.janrlar.join(", ") : body.janrlar || "";
      const videoUrl = body.video_url || "";
      const telegramUrl = body.telegram_url || "";
      const tavsiya = body.tavsiya ? 1 : 0;
      const isBanner = body.is_banner ? 1 : 0;
      const isAdult = body.is_adult ? 1 : 0;
      const exec = await executeD1(
        env,
        `INSERT INTO dramas (title, description, image_url, banner_url, rating, rating_count, holati, yil, studiyasi, qismlar_soni, korishlar, janrlar, video_url, tavsiya, is_banner, is_adult, telegram_url, created_at)
         VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);`,
        [title, description, imageUrl, bannerUrl, holati, yil, studiyasi, qismlarSoni, janrlar, videoUrl, tavsiya, isBanner, isAdult, telegramUrl]
      );
      const newId = exec.meta?.last_row_id || Date.now();
      return jsonResponse({ success: true, id: newId }, 201);
    }
    const dramaPutMatch = path.match(/^\/api\/(?:admin\/)?dramas\/([0-9]+)$/);
    if (dramaPutMatch && method === "PUT") {
      const id = dramaPutMatch[1];
      const body = await parseJsonBody(request);
      await executeD1(
        env,
        `UPDATE dramas SET title = ?, description = ?, image_url = ?, banner_url = ?, holati = ?, yil = ?, studiyasi = ?, qismlar_soni = ?, janrlar = ?, video_url = ?, tavsiya = ?, is_banner = ?, is_adult = ?, telegram_url = ?
         WHERE id = ?;`,
        [body.title, body.description, body.image_url, body.banner_url, body.holati, body.yil, body.studiyasi, body.qismlar_soni, body.janrlar, body.video_url, body.tavsiya ? 1 : 0, body.is_banner ? 1 : 0, body.is_adult ? 1 : 0, body.telegram_url, id]
      );
      return jsonResponse({ success: true });
    }
    if (dramaPutMatch && method === "DELETE") {
      const id = dramaPutMatch[1];
      await executeD1(env, "DELETE FROM dramas WHERE id = ?;", [id]);
      await executeD1(env, "DELETE FROM drama_episodes WHERE drama_id = ?;", [id]);
      return jsonResponse({ success: true });
    }
    const dramaEpAddMatch = path.match(/^\/api\/dramas\/([0-9]+)\/episodes$/);
    if (dramaEpAddMatch && method === "POST") {
      const dramaId = dramaEpAddMatch[1];
      const body = await parseJsonBody(request);
      const qism = Number(body.qism || 1);
      const title = body.title || `${qism}-Qism`;
      const videoUrl = body.video_url || "";
      const telegramUrl = body.telegram_url || "";
      const existing = await queryD1(env, "SELECT id FROM drama_episodes WHERE drama_id = ? AND qism = ? LIMIT 1;", [dramaId, qism]);
      if (existing.length > 0) {
        await executeD1(
          env,
          `UPDATE drama_episodes SET title = ?, video_url = ?, telegram_url = ? WHERE id = ?;`,
          [title, videoUrl, telegramUrl, existing[0].id]
        );
      } else {
        await executeD1(
          env,
          `INSERT INTO drama_episodes (drama_id, qism, title, video_url, telegram_url)
           VALUES (?, ?, ?, ?, ?);`,
          [dramaId, qism, title, videoUrl, telegramUrl]
        );
      }
      await executeD1(env, "UPDATE dramas SET qismlar_soni = MAX(COALESCE(qismlar_soni, 0), ?) WHERE id = ?;", [qism, dramaId]);
      return jsonResponse({ success: true });
    }
    const dramaEpUpdateMatch = path.match(/^\/api\/dramas\/episodes\/([0-9]+)$/);
    if (dramaEpUpdateMatch && (method === "PUT" || method === "POST")) {
      const epId = dramaEpUpdateMatch[1];
      const body = await parseJsonBody(request);
      const qism = Number(body.qism || 1);
      const title = body.title || `${qism}-Qism`;
      const videoUrl = body.video_url || "";
      const telegramUrl = body.telegram_url || "";
      await executeD1(
        env,
        `UPDATE drama_episodes SET qism = ?, title = ?, video_url = ?, telegram_url = ? WHERE id = ?;`,
        [qism, title, videoUrl, telegramUrl, epId]
      );
      return jsonResponse({ success: true });
    }
    const dramaEpDelMatch = path.match(/^\/api\/dramas\/episodes\/([0-9]+)$/);
    if (dramaEpDelMatch && method === "DELETE") {
      const epId = dramaEpDelMatch[1];
      await executeD1(env, "DELETE FROM drama_episodes WHERE id = ?;", [epId]);
      return jsonResponse({ success: true });
    }
    if (path === "/api/admin/users" && method === "GET") {
      const rows = await queryD1(env, "SELECT id, name, email, phone, role, avatar_url, created_at FROM users ORDER BY id DESC LIMIT 100;");
      return jsonResponse(rows);
    }
    const userDeleteMatch = path.match(/^\/api\/admin\/users\/([0-9]+)$/);
    if (userDeleteMatch && method === "DELETE") {
      const userId = userDeleteMatch[1];
      await executeD1(env, "DELETE FROM users WHERE id = ?;", [userId]);
      return jsonResponse({ success: true });
    }
    if (path === "/api/chat/messages" && method === "POST") {
      const user = await getAuthUser(request, env);
      const body = await parseJsonBody(request);
      const msgContent = body.content || body.text;
      if (!msgContent || !String(msgContent).trim()) {
        return jsonResponse({ error: "Xabar matni bo'sh bo'lishi mumkin emas" }, 400);
      }
      const avatarUrl = user?.avatar_url || body.user_avatar || body.avatar_url || null;
      const avatarFrame = user?.avatar_frame_url || body.user_avatar_frame || body.avatar_frame_url || null;
      const res = await executeD1(
        env,
        `INSERT INTO messages (user_id, user_name, content, reply_to_id, reply_to_name, reply_to_content, user_avatar, user_avatar_frame, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);`,
        [
          user ? user.id : body.user_id || 0,
          user ? user.name : body.user_name || "Mehmon",
          String(msgContent).trim(),
          body.reply_to_id || null,
          body.reply_to_name || null,
          body.reply_to_content || null,
          avatarUrl,
          avatarFrame
        ]
      );
      return jsonResponse({ success: true, insertId: res.meta?.last_row_id });
    }
    const chatMsgMatch = path.match(/^\/api\/chat\/messages\/([0-9]+)$/);
    if (chatMsgMatch && method === "DELETE") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const msgId = chatMsgMatch[1];
      if (user.role === "admin") {
        await executeD1(env, "DELETE FROM messages WHERE id = ?;", [msgId]);
      } else {
        await executeD1(env, "DELETE FROM messages WHERE id = ? AND user_id = ?;", [msgId, user.id]);
      }
      return jsonResponse({ success: true });
    }
    if (path === "/api/chat/clear" && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user || user.role !== "admin") return jsonResponse({ error: "Ruxsat berilmagan" }, 403);
      await executeD1(env, "DELETE FROM messages;");
      return jsonResponse({ success: true });
    }
    const viewMatch = path.match(/^\/api\/(animes|dramas|mangas)\/([0-9]+)\/view$/);
    if (viewMatch && method === "POST") {
      const type = viewMatch[1];
      const targetId = parseInt(viewMatch[2], 10);
      const table = type === "animes" ? "animes" : type === "dramas" ? "dramas" : "mangas";
      await executeD1(env, `UPDATE ${table} SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?;`, [targetId]);
      const rows = await queryD1(env, `SELECT korishlar FROM ${table} WHERE id = ?;`, [targetId]);
      const currentViews = rows[0]?.korishlar || 1;
      return jsonResponse({ success: true, korishlar: currentViews });
    }
    const addCommentMatch = path.match(/^\/api\/(animes|dramas|mangas)\/([0-9]+)\/comments$/);
    if (addCommentMatch && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Izoh qoldirish uchun tizimga kiring" }, 401);
      const type = addCommentMatch[1];
      const targetId = parseInt(addCommentMatch[2], 10);
      const body = await parseJsonBody(request);
      if (!body.content || !String(body.content).trim()) {
        return jsonResponse({ error: "Izoh bo'sh bo'lishi mumkin emas" }, 400);
      }
      const animeId = type === "animes" ? targetId : null;
      const dramaId = type === "dramas" ? targetId : null;
      const mangaId = type === "mangas" ? targetId : null;
      await executeD1(
        env,
        `INSERT INTO comments (anime_id, drama_id, manga_id, user_id, content, likes, dislikes, liked_users, disliked_users, replies, created_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, '[]', '[]', '[]', CURRENT_TIMESTAMP);`,
        [animeId, dramaId, mangaId, user.id, String(body.content).trim()]
      );
      return jsonResponse({ success: true });
    }
    const delCommentMatch = path.match(/^\/api\/comments\/([0-9]+)$/);
    if (delCommentMatch && method === "DELETE") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const commentId = delCommentMatch[1];
      if (user.role === "admin") {
        await executeD1(env, "DELETE FROM comments WHERE id = ?;", [commentId]);
      } else {
        await executeD1(env, "DELETE FROM comments WHERE id = ? AND user_id = ?;", [commentId, user.id]);
      }
      return jsonResponse({ success: true });
    }
    const likeCommentMatch = path.match(/^\/api\/comments\/([0-9]+)\/like$/);
    if (likeCommentMatch && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const commentId = likeCommentMatch[1];
      const rows = await queryD1(env, "SELECT * FROM comments WHERE id = ?;", [commentId]);
      if (rows.length > 0) {
        let likedUsers = [];
        try {
          likedUsers = JSON.parse(rows[0].liked_users || "[]");
        } catch {
        }
        const idx = likedUsers.indexOf(user.id);
        if (idx === -1) likedUsers.push(user.id);
        else likedUsers.splice(idx, 1);
        await executeD1(env, "UPDATE comments SET liked_users = ?, likes = ? WHERE id = ?;", [JSON.stringify(likedUsers), likedUsers.length, commentId]);
      }
      return jsonResponse({ success: true });
    }
    const dislikeCommentMatch = path.match(/^\/api\/comments\/([0-9]+)\/dislike$/);
    if (dislikeCommentMatch && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const commentId = dislikeCommentMatch[1];
      const rows = await queryD1(env, "SELECT * FROM comments WHERE id = ?;", [commentId]);
      if (rows.length > 0) {
        let dislikedUsers = [];
        try {
          dislikedUsers = JSON.parse(rows[0].disliked_users || "[]");
        } catch {
        }
        const idx = dislikedUsers.indexOf(user.id);
        if (idx === -1) dislikedUsers.push(user.id);
        else dislikedUsers.splice(idx, 1);
        await executeD1(env, "UPDATE comments SET disliked_users = ?, dislikes = ? WHERE id = ?;", [JSON.stringify(dislikedUsers), dislikedUsers.length, commentId]);
      }
      return jsonResponse({ success: true });
    }
    const replyCommentMatch = path.match(/^\/api\/comments\/([0-9]+)\/reply$/);
    if (replyCommentMatch && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const commentId = replyCommentMatch[1];
      const body = await parseJsonBody(request);
      if (!body.content || !String(body.content).trim()) return jsonResponse({ error: "Javob bo'sh" }, 400);
      const rows = await queryD1(env, "SELECT * FROM comments WHERE id = ?;", [commentId]);
      if (rows.length > 0) {
        let replies = [];
        try {
          replies = JSON.parse(rows[0].replies || "[]");
        } catch {
        }
        replies.push({
          id: Date.now(),
          user_id: user.id,
          user_name: user.name,
          user_avatar: user.avatar_url || null,
          user_avatar_frame: user.avatar_frame_url || null,
          content: String(body.content).trim(),
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        await executeD1(env, "UPDATE comments SET replies = ? WHERE id = ?;", [JSON.stringify(replies), commentId]);
      }
      return jsonResponse({ success: true });
    }
    if (path === "/api/shop/items" && method === "GET") {
      const category = url.searchParams.get("category");
      let sql = "SELECT * FROM shop_items WHERE is_active = 1";
      const params = [];
      if (category && category !== "all") {
        sql += " AND category = ?";
        params.push(category);
      }
      sql += " ORDER BY id DESC;";
      const rows = await queryD1(env, sql, params);
      return jsonResponse(rows);
    }
    if (path === "/api/shop/my-inventory" && method === "GET") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const rows = await queryD1(
        env,
        `SELECT sp.id, sp.user_id, sp.item_id, sp.is_equipped, sp.purchased_at,
                si.title, si.category, si.image_url, si.price
         FROM shop_purchases sp
         JOIN shop_items si ON sp.item_id = si.id
         WHERE sp.user_id = ?
         ORDER BY sp.purchased_at DESC;`,
        [user.id]
      );
      return jsonResponse(rows);
    }
    if (path === "/api/shop/equip" && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const body = await parseJsonBody(request);
      const { purchase_id, equip } = body;
      const purchases = await queryD1(
        env,
        `SELECT sp.*, si.category, si.image_url
         FROM shop_purchases sp
         JOIN shop_items si ON sp.item_id = si.id
         WHERE sp.id = ? AND sp.user_id = ?;`,
        [purchase_id, user.id]
      );
      if (purchases.length === 0) return jsonResponse({ error: "Mahsulot topilmadi" }, 404);
      const purchase = purchases[0];
      if (equip) {
        const prev = await queryD1(
          env,
          `SELECT sp.id FROM shop_purchases sp
           JOIN shop_items si ON sp.item_id = si.id
           WHERE sp.user_id = ? AND si.category = ? AND sp.is_equipped = 1;`,
          [user.id, purchase.category]
        );
        for (const p of prev) {
          await executeD1(env, "UPDATE shop_purchases SET is_equipped = 0 WHERE id = ?;", [p.id]);
        }
        await executeD1(env, "UPDATE shop_purchases SET is_equipped = 1 WHERE id = ?;", [purchase.id]);
        if (purchase.category === "frame") {
          await executeD1(env, "UPDATE users SET avatar_frame_url = ? WHERE id = ?;", [purchase.image_url, user.id]);
        } else if (purchase.category === "avatar") {
          await executeD1(env, "UPDATE users SET avatar_url = ? WHERE id = ?;", [purchase.image_url, user.id]);
        } else if (purchase.category === "banner") {
          await executeD1(env, "UPDATE users SET banner_url = ? WHERE id = ?;", [purchase.image_url, user.id]);
        }
      } else {
        await executeD1(env, "UPDATE shop_purchases SET is_equipped = 0 WHERE id = ?;", [purchase.id]);
        if (purchase.category === "frame") {
          await executeD1(env, "UPDATE users SET avatar_frame_url = NULL WHERE id = ?;", [user.id]);
        } else if (purchase.category === "banner") {
          await executeD1(env, "UPDATE users SET banner_url = NULL WHERE id = ?;", [user.id]);
        }
      }
      return jsonResponse({ success: true, is_equipped: !!equip });
    }
    if (path === "/api/notifications" && method === "POST") {
      const body = await parseJsonBody(request);
      await executeD1(
        env,
        `INSERT INTO notifications (title, message, type, link, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);`,
        [body.title || "", body.message || "", body.type || "system", body.link || ""]
      );
      return jsonResponse({ success: true });
    }
    if (method === "GET" && path.startsWith("/api/")) {
      const corsHeadersObj = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=15, stale-while-revalidate=60"
      };
      try {
        if (path === "/api/animes") {
          const rows = await queryD1(env, "SELECT * FROM animes ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }
        const slugMatch = path.match(/^\/api\/animes\/by-slug\/([^\/]+)$/);
        if (slugMatch) {
          const slug = decodeURIComponent(slugMatch[1]);
          if (/^\d+$/.test(slug)) {
            const rows2 = await queryD1(env, "SELECT * FROM animes WHERE id = ?;", [slug]);
            if (rows2.length > 0) {
              await executeD1(env, "UPDATE animes SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?;", [rows2[0].id]).catch(() => {
              });
              rows2[0].korishlar = (rows2[0].korishlar || 0) + 1;
              return new Response(JSON.stringify(rows2[0]), { headers: corsHeadersObj });
            }
          }
          const rows = await queryD1(env, "SELECT * FROM animes;");
          const anime = rows.find((r) => toSlug(r.title) === slug || String(r.id) === slug);
          if (anime) {
            await executeD1(env, "UPDATE animes SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?;", [anime.id]).catch(() => {
            });
            anime.korishlar = (anime.korishlar || 0) + 1;
            return new Response(JSON.stringify(anime), { headers: corsHeadersObj });
          }
          return new Response(JSON.stringify({ error: "Anime topilmadi" }), { status: 404, headers: corsHeadersObj });
        }
        const animeMatch = path.match(/^\/api\/animes\/([0-9]+)$/);
        if (animeMatch) {
          const id = animeMatch[1];
          const rows = await queryD1(env, "SELECT * FROM animes WHERE id = ?;", [id]);
          if (rows.length > 0) {
            await executeD1(env, "UPDATE animes SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?;", [rows[0].id]).catch(() => {
            });
            rows[0].korishlar = (rows[0].korishlar || 0) + 1;
            return new Response(JSON.stringify(rows[0]), { headers: corsHeadersObj });
          }
          return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeadersObj });
        }
        const epMatch = path.match(/^\/api\/animes\/([0-9]+)\/episodes$/);
        if (epMatch) {
          const animeId = epMatch[1];
          const numId = Number(animeId);
          const rows = await queryD1(
            env,
            "SELECT * FROM episodes WHERE anime_id = ? OR anime_id = ? ORDER BY CAST(episode_number AS REAL) ASC;",
            [animeId, numId]
          );
          return new Response(JSON.stringify(rows), {
            headers: {
              ...corsHeadersObj,
              "Cache-Control": "no-cache, no-store, must-revalidate"
            }
          });
        }
        const ratingMatch = path.match(/^\/api\/(animes|dramas|mangas)\/([0-9]+)\/ratings-summary$/);
        if (ratingMatch) {
          const type = ratingMatch[1];
          const targetId = ratingMatch[2];
          const col = type === "animes" ? "anime_id" : type === "dramas" ? "drama_id" : "manga_id";
          const rows = await queryD1(env, `SELECT rating FROM ratings WHERE ${col} = ?;`, [targetId]);
          const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
          let totalScore = 0;
          for (const r of rows) {
            const score = parseInt(r.rating, 10);
            if (score >= 1 && score <= 10) {
              counts[score]++;
              totalScore += score;
            }
          }
          const totalVotes = rows.length;
          const average = totalVotes > 0 ? Number((totalScore / totalVotes).toFixed(1)) : 0;
          return new Response(JSON.stringify({ average, totalVotes, distribution: counts }), { headers: corsHeadersObj });
        }
        const userRatingMatch = path.match(/^\/api\/(animes|dramas|mangas)\/([0-9]+)\/rating$/);
        if (userRatingMatch) {
          const user = await getAuthUser(request, env);
          if (!user) return new Response(JSON.stringify({ rating: 0 }), { headers: corsHeadersObj });
          const type = userRatingMatch[1];
          const targetId = userRatingMatch[2];
          const col = type === "animes" ? "anime_id" : type === "dramas" ? "drama_id" : "manga_id";
          const rows = await queryD1(env, `SELECT rating FROM ratings WHERE user_id = ? AND ${col} = ? LIMIT 1;`, [user.id, targetId]);
          return new Response(JSON.stringify({ rating: rows[0]?.rating || 0 }), { headers: corsHeadersObj });
        }
        const commentMatch = path.match(/^\/api\/(animes|dramas|mangas)\/([0-9]+)\/comments$/);
        if (commentMatch) {
          const type = commentMatch[1];
          const targetId = commentMatch[2];
          const col = type === "animes" ? "c.anime_id" : type === "dramas" ? "c.drama_id" : "c.manga_id";
          const rows = await queryD1(
            env,
            `SELECT c.*, 
                    COALESCE(u.name, 'Foydalanuvchi') as user_name, 
                    u.avatar_url as user_avatar, 
                    u.avatar_frame_url as user_avatar_frame, 
                    u.role as user_role
             FROM comments c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE ${col} = ?
             ORDER BY c.created_at DESC;`,
            [targetId]
          );
          const parsed = rows.map((c) => {
            let likedUsers = [];
            let dislikedUsers = [];
            let replies = [];
            try {
              likedUsers = JSON.parse(c.liked_users || "[]");
            } catch {
            }
            try {
              dislikedUsers = JSON.parse(c.disliked_users || "[]");
            } catch {
            }
            try {
              replies = JSON.parse(c.replies || "[]");
            } catch {
            }
            return {
              ...c,
              liked_users: likedUsers,
              disliked_users: dislikedUsers,
              replies
            };
          });
          return new Response(JSON.stringify(parsed), { headers: corsHeadersObj });
        }
        if (path === "/api/comments/recent") {
          const rows = await queryD1(
            env,
            `SELECT c.*, 
                    COALESCE(u.name, 'Foydalanuvchi') as user_name, 
                    u.avatar_url as user_avatar, 
                    u.avatar_frame_url as user_avatar_frame, 
                    COALESCE(a.title, d.title, m.title, 'Kontent') as anime_title, 
                    COALESCE(a.image_url, d.image_url, m.image_url) as anime_image
             FROM comments c
             LEFT JOIN users u ON c.user_id = u.id
             LEFT JOIN animes a ON c.anime_id = a.id
             LEFT JOIN dramas d ON c.drama_id = d.id
             LEFT JOIN mangas m ON c.manga_id = m.id
             ORDER BY c.created_at DESC LIMIT 20;`
          );
          const parsed = rows.map((c) => {
            let replies = [];
            try {
              replies = JSON.parse(c.replies || "[]");
            } catch {
            }
            return { ...c, replies };
          });
          return new Response(JSON.stringify(parsed), { headers: corsHeadersObj });
        }
        if (path === "/api/dramas") {
          const rows = await queryD1(env, "SELECT * FROM dramas ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }
        const dramaMatch = path.match(/^\/api\/dramas\/([0-9]+)$/);
        if (dramaMatch) {
          const id = dramaMatch[1];
          const rows = await queryD1(env, "SELECT * FROM dramas WHERE id = ?;", [id]);
          if (rows.length === 0) {
            return new Response(JSON.stringify({ error: "Drama topilmadi" }), { status: 404, headers: corsHeadersObj });
          }
          const drama = rows[0];
          await executeD1(env, "UPDATE dramas SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?;", [id]).catch(() => {
          });
          drama.korishlar = (drama.korishlar || 0) + 1;
          let epRows = await queryD1(env, "SELECT * FROM drama_episodes WHERE drama_id = ? ORDER BY qism ASC;", [id]);
          if ((!epRows || epRows.length === 0) && drama.video_url) {
            epRows = [{
              id: `ep_1_${drama.id}`,
              drama_id: drama.id,
              qism: 1,
              title: "1-Qism",
              video_url: drama.video_url,
              created_at: drama.created_at || (/* @__PURE__ */ new Date()).toISOString()
            }];
          }
          drama.episodes = epRows || [];
          return new Response(JSON.stringify(drama), { headers: corsHeadersObj });
        }
        const dramaEpMatch = path.match(/^\/api\/dramas\/(?:episodes\/)?([0-9]+)(?:\/episodes)?$/);
        if (dramaEpMatch) {
          const dramaId = dramaEpMatch[1];
          const rows = await queryD1(env, "SELECT * FROM drama_episodes WHERE drama_id = ? ORDER BY qism ASC;", [dramaId]);
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }
        if (path === "/api/mangas") {
          const rows = await queryD1(env, "SELECT * FROM mangas ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }
        const mangaMatch = path.match(/^\/api\/mangas\/([0-9]+)$/);
        if (mangaMatch) {
          const id = mangaMatch[1];
          const rows = await queryD1(env, "SELECT * FROM mangas WHERE id = ?;", [id]);
          if (rows.length === 0) return new Response(JSON.stringify({ error: "Manga topilmadi" }), { status: 404, headers: corsHeadersObj });
          const manga = rows[0];
          await executeD1(env, "UPDATE mangas SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?;", [id]).catch(() => {
          });
          manga.korishlar = (manga.korishlar || 0) + 1;
          const chRows = await queryD1(env, "SELECT * FROM manga_chapters WHERE manga_id = ? ORDER BY chapter_number ASC;", [id]);
          manga.chapters = chRows || [];
          return new Response(JSON.stringify(manga), { headers: corsHeadersObj });
        }
        const mangaChMatch = path.match(/^\/api\/mangas\/([0-9]+)\/chapters\/([0-9\.]+)$/);
        if (mangaChMatch) {
          const mangaId = mangaChMatch[1];
          const chNum = mangaChMatch[2];
          const rows = await queryD1(env, "SELECT * FROM manga_chapters WHERE manga_id = ? AND chapter_number = ?;", [mangaId, chNum]);
          return new Response(JSON.stringify(rows[0] || {}), { headers: corsHeadersObj });
        }
        if (path === "/api/notifications") {
          const rows = await queryD1(env, "SELECT * FROM notifications ORDER BY id DESC LIMIT 50;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }
        if (path === "/api/chat/messages") {
          const rows = await queryD1(
            env,
            `SELECT m.*, 
                    COALESCE(u.name, m.user_name, 'Foydalanuvchi') AS user_name, 
                    COALESCE(u.avatar_url, m.user_avatar) AS user_avatar, 
                    COALESCE(u.avatar_frame_url, m.user_avatar_frame) AS user_avatar_frame, 
                    COALESCE(u.avatar_frame_url, m.user_avatar_frame) AS avatar_frame_url
             FROM messages m
             LEFT JOIN users u ON (m.user_id = u.id AND m.user_id > 0)
             ORDER BY m.id DESC LIMIT 60;`
          );
          return new Response(JSON.stringify([...rows].reverse()), {
            headers: {
              ...corsHeadersObj,
              "Cache-Control": "no-cache, no-store, must-revalidate"
            }
          });
        }
        const mediaMatch = path.match(/^\/api\/media\/([a-zA-Z0-9_\-\.]+)$/);
        if (mediaMatch) {
          const mediaId = mediaMatch[1];
          const rows = await queryD1(env, "SELECT data, mime_type FROM media_files WHERE id = ?;", [mediaId]);
          if (rows.length > 0 && rows[0].data) {
            const rawData = rows[0].data;
            let mimeType = rows[0].mime_type || "image/jpeg";
            let b64 = rawData;
            if (rawData.startsWith("data:")) {
              const parts = rawData.split(",");
              mimeType = parts[0].split(":")[1].split(";")[0];
              b64 = parts[1];
            }
            const binaryStr = atob(b64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            return new Response(bytes.buffer, {
              headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*"
              }
            });
          }
        }
      } catch (err) {
        console.warn("D1 query error:", err.message);
        return jsonResponse({ error: "Ma'lumotlar bazasida xatolik", detail: err.message }, 500);
      }
    }
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  }
};
export {
  worker_default as default
};
