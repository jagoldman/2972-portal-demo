/* Checks for the maths in js/tool-power.js. Run: node tests/tool-power.test.js */
"use strict";
var M = require("../js/tool-power.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= (tol == null ? 1e-9 : tol), got + ", want " + want); }

// The defaults, by hand: 4 x 45 + 2 x 40 + 1 x 25 + 2 x 30 + 1 x 8 = 353 A.
// R = 0.015 + 0.006 = 0.021 ohm; sag = 353 x 0.021 = 7.413 V; robot sees 12.5 - 7.413 = 5.087 V (under 6.8: brown-out).
// Most before brown-out = (12.5 - 6.8) / 0.021 = 271.43 A, so 81.57 A too many. Heat = 353^2 x 0.021 = 2616.79 W.
// Tired battery (0.025 + 0.006 = 0.031 ohm): 12.5 - 353 x 0.031 = 1.557 V; most = 5.7 / 0.031 = 183.87 A.
var rows = [{ name: "Drive", n: 4, a: 45 }, { name: "Shooter", n: 2, a: 40 }, { name: "Intake", n: 1, a: 25 }, { name: "Elevator", n: 2, a: 30 }, { name: "Everything else", n: 1, a: 8 }];
var o = { rest: 12.5, rbat: 0.015, rwire: 0.006, brown: 6.8, main: 120 }, p = M.power(rows, o);
near("total current", p.I, 353);
near("voltage at the robot", p.V, 5.087, 1e-9);
near("brown-out current", p.Imax, 271.428571, 1e-5);
near("over by", p.cut, 81.571429, 1e-5);
ok("browns out", p.V < o.brown);
near("heat", p.heat, 2616.789, 1e-6);
near("heat in the battery", p.heatBat, 353 * 353 * 0.015, 1e-9);
near("share of the main breaker", p.share, 353 / 120, 1e-12);
near("tired: voltage", p.tired.V, 1.557, 1e-9);
near("tired: brown-out current", p.tired.Imax, 183.870968, 1e-5);
ok("biggest row is Drive", rows[p.worst].name === "Drive");
// At the brown-out current the voltage is exactly the brown-out voltage.
near("sag line meets brown-out", M.volts(o.rest, p.R, p.Imax), o.brown, 1e-9);
// A light load holds up.
var light = M.power([{ name: "Drive", n: 4, a: 30 }], o);
near("light load voltage", light.V, 12.5 - 120 * 0.021, 1e-12);
ok("light load fine", light.margin > 1 && light.marginA > 0);
// Nothing drawing: the robot sees rest voltage.
var none = M.power([], o);
ok("no rows", none.I === 0 && none.V === 12.5 && none.worst === -1);

// Finding 9 (Sol review): 101% of the main breaker is not "trips if it lasts many seconds". Up to 150% the words say it
// is above its rating and to check the trip curve; the firm words about tripping start at twice the rating.
var p101 = M.power([{ name: "Drive", n: 1, a: 121.2 }], o);
near("121.2 A is 101% of 120 A", p101.share, 1.01, 1e-12);
var w101 = M.breakerNote(p101.share);
ok("101%: above its rating, check the trip curve", /above its rating/.test(w101) && /trip curve/.test(w101) && !/trips/.test(w101), w101);
ok("150%: still the soft words", /trip curve/.test(M.breakerNote(1.5)), M.breakerNote(1.5));
ok("at or under 100%: carries it all match", /carries this all match/.test(M.breakerNote(1)));
ok("over 200%: it may trip, never a certainty", /it may trip/.test(M.breakerNote(2.01)), M.breakerNote(2.01));
ok("branch at 101%: above its rating, no trip words", M.branchNote(40.4 / 40) === ", above its rating", M.branchNote(1.01));
ok("branch at 250%: can trip in seconds", M.branchNote(2.5) === ", can trip in seconds");
ok("branch at its rating: nothing", M.branchNote(1) === "");

// Fix round 5: the verdict names the largest row, its share and the number to lower (the default: Drive, 4 x 40 A).
var dflt = M.power([{ name: "Drive", n: 4, a: 40 }, { name: "Shooter", n: 2, a: 25 }, { name: "Intake", n: 1, a: 20 }, { name: "Elevator hold", n: 2, a: 10 }, { name: "Everything else", n: 1, a: 8 }], { rest: 12.5, rbat: 0.015, rwire: 0.006, brown: 6.8, main: 120 });
ok("lever sentence", M.lever(dflt.rows[dflt.worst], dflt.I) === "Drive is the largest draw (160 A of 258 A): cutting what each of its motors draws from the battery (40 A here) helps most. A supply current limit in the motor controller does that.", M.lever(dflt.rows[dflt.worst], dflt.I));
var src = require("fs").readFileSync(require("path").join(__dirname, "../js/tool-power.js"), "utf8");
ok("breaker timing called a rough guide, with the trip curve named", /rough guide/.test(src) && /trip curve/.test(src) && !/carries its rating all day/.test(src));

// Round 6: twice the rating is where the tile turns red, so the words change there too, not just above it.
ok("200%: the same words as above it", M.breakerNote(2) === M.breakerNote(2.5), M.breakerNote(2));
ok("199%: the softer words", M.breakerNote(1.99) !== M.breakerNote(2));
// Round 7: a lump of small loads has no branch breaker; a row filled from another calculator takes its motors and limit.
ok("Everything else is a lump", M.isAggregate({ name: "Everything else" }) && M.isAggregate({ name: "x", agg: true }) && !M.isAggregate({ name: "Drive" }));
var fe = M.fromTool({ motors: 2, statorA: 60 }, "Elevator");
ok("fill from a calculator", fe.name === "Elevator" && fe.n === 2 && fe.a === 60, JSON.stringify(fe));
ok("fill: no motors, nothing", M.fromTool({}, "Arm") === null);
console.log(fails ? fails + " of " + n + " checks failed" : "All " + n + " checks passed");
process.exit(fails ? 1 : 0);
