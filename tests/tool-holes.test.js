/* Checks for the Holes and fasteners tables (js/tool-holes.js). Run: node tests/tool-holes.test.js
   Every value in the brief (new-apps/briefs/calcs/D_BEAM_HOLES_AIR_UNITS.md) is copied here by hand and compared
   with the tables, both ways: nothing missing, nothing changed, nothing added. */
"use strict";
var M = require("../js/tool-holes.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function same(name, got, want) { ok(name, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) + ", want " + JSON.stringify(want)); }

// Taps (thread: tap drill, decimal in or mm).
same("taps", M.TAPS.map(function (r) { return r.slice(0, 3).concat(r[3] ? ["mm"] : []); }), [
  ["#4-40", "#43", 0.0890], ["#6-32", "#36", 0.1065], ["#8-32", "#29", 0.1360], ["#10-24", "#25", 0.1495], ["#10-32", "#21", 0.1590],
  ["1/4-20", "#7", 0.2010], ["1/4-28", "#3", 0.2130], ["5/16-18", "F", 0.2570], ["3/8-16", "5/16", 0.3125],
  ["M3x0.5", "2.5 mm", 2.5, "mm"], ["M4x0.7", "3.3 mm", 3.3, "mm"], ["M5x0.8", "4.2 mm", 4.2, "mm"], ["M6x1.0", "5.0 mm", 5.0, "mm"], ["M8x1.25", "6.8 mm", 6.8, "mm"]]);
// Clearance (screw: close fit, free fit).
same("clearance", M.CLEAR.map(function (r) { return r.slice(0, 5).concat(r[5] ? ["mm"] : []); }), [
  ["#4", "#32", 0.1160, "#30", 0.1285], ["#6", "#27", 0.1440, "#25", 0.1495], ["#8", "#18", 0.1695, "#16", 0.1770], ["#10", "#9", 0.1960, "#7", 0.2010],
  ["1/4", "F", 0.2570, "H", 0.2660], ["5/16", "P", 0.3230, "Q", 0.3320], ["3/8", "W", 0.3860, "X", 0.3970],
  ["M3", "3.2 mm", 3.2, "3.4 mm", 3.4, "mm"], ["M4", "4.3 mm", 4.3, "4.5 mm", 4.5, "mm"], ["M5", "5.3 mm", 5.3, "5.5 mm", 5.5, "mm"],
  ["M6", "6.4 mm", 6.4, "6.6 mm", 6.6, "mm"], ["M8", "8.4 mm", 8.4, "9.0 mm", 9.0, "mm"]]);
// Rivets (blind rivet: drill).
same("rivets", M.RIVETS, [["1/8", "#30", 0.1285], ["5/32", "#20", 0.1610], ["3/16", "#11", 0.1910]]);
// Press and slip fits: 1.125 bearing 1.125 / 1.124; 0.875 bearing 0.875 / 0.874; 1/2 hex: the part's own bore.
same("press fits", M.PRESS.map(function (r) { return r.slice(0, 3); }), [["1.125 in bearing", 1.125, 1.124], ["0.875 in bearing", 0.875, 0.874], ["1/2 in hex shaft", null, null]]);
// 3D-printed: add 0.2 mm.
same("printed hole allowance", M.PRINT_ADD_MM, 0.2);

// Helpers: screw-number rule, pitch from the name, nearest drills.
ok("#10 is 0.190", Math.abs(M.major("#10-32") - 0.190) < 1e-12, M.major("#10-32"));
ok("#4 is 0.112", Math.abs(M.major("#4") - 0.112) < 1e-12);
ok("1/4 is 0.25", M.major("1/4-20") === 0.25);
ok("M3 is 3 mm", Math.abs(M.major("M3x0.5") * 25.4 - 3) < 1e-12);
ok("1/4-20 pitch", M.pitch("1/4-20") === 1 / 20);
ok("M8x1.25 pitch", Math.abs(M.pitch("M8x1.25") * 25.4 - 1.25) < 1e-12);
same("nearest fractional to #7 (0.2010)", M.nearFrac(0.2010).name, "13/64 in");
same("nearest metric to #7 (0.2010)", M.nearMm(0.2010).name, "5.1 mm");
same("nearest fractional to 0.25", M.nearFrac(0.25).name, "1/4 in");
ok("number and letter drills", M.isNumLetter("#7") && M.isNumLetter("F") && !M.isNumLetter("5/16") && !M.isNumLetter("2.5 mm"));

// Round 6: is the nearest drill a fair stand-in? Within 0.004 in it is; further off it is not.
var nv = M.nearVerdict(13 / 64, 0.2010);
ok("13/64 for a #7 is 0.0021 in bigger and fine", Math.abs(nv.off - 0.0021) < 1e-4 && nv.bigger && nv.ok, JSON.stringify(nv));
var nm = M.nearVerdict(5.1 / 25.4, 0.2010);
ok("5.1 mm for a #7 is 0.0002 in smaller and fine", Math.abs(nm.off - 0.0002) < 1e-4 && !nm.bigger && nm.ok, JSON.stringify(nm));
var n29 = M.nearVerdict(9 / 64, 0.1360);
ok("9/64 for a #29 is 0.0046 in bigger: too far", Math.abs(n29.off - 0.0046) < 1e-4 && !n29.ok, JSON.stringify(n29));
ok("exactly 0.004 in off is still fine", M.nearVerdict(0.204, 0.200).ok);

console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(fails ? 1 : 0);
