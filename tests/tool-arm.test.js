/* Checks for the arm maths in js/tool-arm.js. Run: node tests/tool-arm.test.js */
"use strict";
var F = require("../js/frc.js"), M = require("../js/tool-arm.js"), fails = 0, n = 0, DEG = Math.PI / 180;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= (tol == null ? 1e-9 : tol), got + ", want " + want); }
var LBIN = F.LBF * F.IN;

// Hand-worked: a 28 in arm weighing 6 lb with its weight half way (14 in), 4 lb at the end.
// Gravity torque at level = 6 x 14 + 4 x 28 = 196 lb in = 22.145 N m; at 60 degrees, half: 98 lb in.
var arm = M.arm({ L: 28 * F.IN, ma: 6 * F.LB, rc: 14 * F.IN, ml: 4 * F.LB, cb: 0 });
near("gravity torque at level", arm.tau0 / LBIN, 196, 1e-9);
near("gravity torque at 60 degrees", arm.torque(60 * DEG) / LBIN, 98, 1e-9);
near("gravity torque at -60 degrees", arm.torque(-60 * DEG) / LBIN, 98, 1e-9);
near("none straight up", arm.torque(90 * DEG) / LBIN, 0, 1e-9);
near("pushes back past vertical", arm.torque(120 * DEG) / LBIN, -98, 1e-9);
// Inertia: a 6 lb uniform 28 in bar about its end, 1/3 x 6 x 28^2 = 1568 lb in^2, plus 4 x 28^2 = 3136: 4704 lb in^2.
near("inertia about the pivot", arm.J / F.LBIN2, 4704, 1e-9);
near("combined centre of mass", arm.com / F.IN, 196 / 10, 1e-9);
// A counterbalance of 196 lb in cancels gravity everywhere.
near("full counterbalance", M.arm({ L: 28 * F.IN, ma: 6 * F.LB, rc: 14 * F.IN, ml: 4 * F.LB, cb: 196 * LBIN }).torque(0.3), 0, 1e-9);

// Holding current by hand: Kraken X60, kt = 7.16 N m / (374 - 2.8) A = 0.019289; one motor, 60:1, 90%:
// 22.145 N m / (60 x 0.9 x 0.019289) = 21.26 A above the 2.8 A free current = 24.06 A; volts = 24.06 x 12 / 374 = 0.772.
var s = { len: 28, armLb: 6, comPct: 50, loadLb: 4, start: -60, end: 80, motor: "kraken60", motors: 1, ratio: 60, statorA: 40, eff: 90, cb: 0, vbat: 12.3, rbat: 0.02 };
var r = M.compute(s);
near("worst angle is level", r.worstAngle, 0, 1e-12);
near("holding current at level", r.holdWorst.statorA, 196 * LBIN / (60 * 0.9 * 7.16 / 371.2) + 2.8, 1e-9);
near("holding current, rounded hand figure", r.holdWorst.statorA, 24.06, 0.01);
near("kG at level", r.kG, 0.772, 0.001);
// Torque at the 40 A limit: (40 - 2.8) x 0.019289 x 60 x 0.9 = 38.75 N m = 343 lb in; margin 343 / 196 = 1.75.
near("available torque", r.avail, 37.2 * 7.16 / 371.2 * 54, 1e-9);
near("available torque in lb in", r.avail / LBIN, 343, 0.5);
near("torque margin", r.margin, 37.2 * 7.16 / 371.2 * 54 / (196 * LBIN), 1e-9);
ok("default swings out and back", r.reached && r.backOk && r.timeGo > 0.2 && r.timeGo < 2, r.timeGo);
near("timeline ends at the start", r.X[r.X.length - 1], -60 * DEG, 1e-9);
// A range that stays above level: worst at its lowest angle, 10 degrees.
near("worst angle in 10..80", M.worst(10 * DEG, 80 * DEG), 10 * DEG, 1e-12);
near("worst angle in 100..170 is 170", M.worst(100 * DEG, 170 * DEG), 170 * DEG, 1e-12);
// Too much load: cannot lift past the first angle where gravity needs more than the gearbox gives.
var heavy = M.compute(Object.assign({}, s, { loadLb: 30, len: 60 }));
ok("too heavy stalls", !heavy.reached, heavy.timeGo);
// Gravity needed at -60: (6 x 30 + 30 x 60) x 0.5 = 990 lb in, more than 343.
near("stall angle is the start", heavy.stallGo, -60 * DEG, 1e-9);
var mid = M.compute(Object.assign({}, s, { statorA: 30 }));   // 27.2 A above free: 251 lb in, more than 196 at level
ok("30 A still lifts (251 lb in > 196 lb in)", mid.reached, mid.timeGo);
var low = M.compute(Object.assign({}, s, { statorA: 20 }));   // 17.2 A: 158.6 lb in, so it stalls at -arccos(158.6 / 196) = -36 degrees
var want = -Math.acos((17.2 * 7.16 / 371.2 * 54) / (196 * LBIN));
ok("20 A stalls", !low.reached);
near("20 A stall angle by hand", low.stallGo, want, 0.3 * DEG);

// Every field at its ends: nothing throws and nothing is NaN.
var ends = { len: [4, 60], armLb: [0, 30], comPct: [0, 100], loadLb: [0, 30], start: [-90, 180], end: [-90, 180], motors: [1, 8], ratio: [0.05, 250], statorA: [5, 200], eff: [30, 100], cb: [0, 2000], vbat: [10, 13.5], rbat: [0, 0.1] };
var bad = [];
Object.keys(ends).forEach(function (k) { ends[k].forEach(function (v) {
  var o = Object.assign({}, s); o[k] = v; var q;
  try { q = M.compute(o); } catch (e) { bad.push(k + "=" + v + " threw " + e.message); return; }
  var nums = [q.timeGo, q.timeBack, q.tipSpeed, q.peakA, q.minV, q.holdWorst.statorA, q.margin, q.kG, q.kV, q.kA, q.duration].concat(q.X, q.T, q.A, q.Q);
  if (nums.some(function (x) { return x !== x; })) bad.push(k + "=" + v + " gave NaN");
  if (!isFinite(q.duration) || q.duration <= 0) bad.push(k + "=" + v + " duration " + q.duration);
}); });
ok("extremes: no NaN, no throw", !bad.length, bad.join("; "));

console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(fails ? 1 : 0);
