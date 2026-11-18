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
// kG balances gravity alone (fix round 5, item 15): 21.26 A above the free current x 12 / 374 ohm = 0.682 V. The old
// figure, 0.772 V, was the whole holding current (24.06 A) and so carried the motor's free current (kS = 0.090 V).
near("kG at level", r.kG, 0.682, 0.001);
near("kG by hand", r.kG, (r.holdWorst.statorA - 2.8) * 12 / 374, 1e-9);
near("kS = free current x resistance", r.kS, 2.8 * 12 / 374, 1e-12);
near("holding volts = kG + kS", r.holdLevel.volts, r.kG + r.kS, 1e-12);
near("kG doubles with the load", M.compute(Object.assign({}, s, { armLb: 12, loadLb: 8 })).kG / r.kG, 2, 1e-9);
near("kS does not change with the load", M.compute(Object.assign({}, s, { armLb: 12, loadLb: 8 })).kS, r.kS, 1e-15);
// Torque margin and the current ratio agree once the free current is taken off both.
near("margin = (limit - free) / (holding - free)", r.margin, (40 - 2.8) / (r.holdWorst.statorA - 2.8), 1e-9);
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

// Finding 4 (Sol review): no inertia floor. The default arm at 250:1 starts at the acceleration its real inertia gives,
// (torque at the 40 A limit - gravity at -60 degrees) / J = about 109 rad/s^2 (the floor made it 59).
var r250 = M.compute(Object.assign({}, s, { ratio: 250 }));
near("250:1 starts at 109 rad/s^2", r250.go.a[0], 109.2, 0.5);
near("250:1 start: (gives - gravity) / J", r250.go.a[0], (r250.avail - r250.arm.torque(-60 * DEG)) / r250.arm.J, 1e-6);
near("kA uses the same inertia", r250.kA, M.driveOf(Object.assign({}, s, { ratio: 250 })).kA(r250.arm.J), 1e-12);
ok("250:1 swings out and back", r250.reached && r250.backOk, r250.timeGo);
ok("no inertia floor left", M.minJ === undefined);
// A very light arm still swings (F.move picks its own steps); one with no weight at all says so.
var light = M.compute(Object.assign({}, s, { len: 4, armLb: 0, loadLb: 0.01, ratio: 250, motors: 8 }));
ok("very light arm reaches", light.reached && light.backOk && light.timeGo > 0, light.timeGo);
ok("weightless arm is flagged", M.compute(Object.assign({}, s, { armLb: 0, loadLb: 0 })).empty === true);

// Finding 8 (Sol review): a failed return names the torque that really resists it.
// Start level, end at -60, 20:1, no counterbalance: going back up, gravity needs 196 cos(angle) lb in against 114 the
// gearbox gives, so it stalls on the way back at -arccos(114 / 196) = -54 degrees. Gravity, not a counterbalance.
var down = M.compute(Object.assign({}, s, { start: 0, end: -60, ratio: 20 }));
ok("down then back: reaches the end", down.reached);
ok("down then back: fails on the return", !down.backOk);
ok("the return is held back by gravity", down.backWhy === "gravity", down.backWhy);
near("return stall angle by hand", down.stallBack, -Math.acos(down.avail / down.arm.tau0), 0.3 * DEG);
// A counterbalance of 2000 lb in against 196 of weight: going back down, the counterbalance is what resists.
var strong = M.compute(Object.assign({}, s, { cb: 2000 }));
ok("strong counterbalance: the counterbalance resists the return", strong.reached && !strong.backOk && strong.backWhy === "counterbalance", strong.backWhy);
ok("a stall going out under gravity says gravity", heavy.goWhy === "gravity", heavy.goWhy);

// Item 16: the end's fastest speed going out (here, up through level against gravity) never passes the no-load speed.
[s, Object.assign({}, s, { ratio: 20 }), Object.assign({}, s, { ratio: 40, loadLb: 0.5, armLb: 1 }), Object.assign({}, s, { start: -90, end: 90, ratio: 30 })].forEach(function (o, i) {
  var q = M.compute(o), lim = M.driveOf(o).freeSpeed(o.vbat) * q.L;
  ok("case " + i + ": end speed going out <= no-load speed", q.tipSpeed <= lim + 1e-9, q.tipSpeed + " > " + lim);
});
// Item 7: while the motor drives the arm (torque and speed the same way), its torque never passes what the chart's
// "gearbox gives" line shows. Braking may pass it, because the motor's friction helps then.
var drv = 0, brk = 0;
[r, M.compute(Object.assign({}, s, { ratio: 40 })), M.compute(Object.assign({}, s, { start: 80, end: -60 }))].forEach(function (q) {
  for (var i = 0; i < q.Q.length; i++) { if (q.Q[i] * q.W[i] > 0) drv = Math.max(drv, Math.abs(q.Q[i]) / q.avail); else if (q.Q[i] * q.W[i] < 0) brk = Math.max(brk, Math.abs(q.Q[i]) / q.avail); }
});
ok("driving torque never above the gearbox's figure at the limit", drv <= 1 + 1e-9, drv);
ok("braking torque can pass it (friction helps)", brk > 1, brk);

// Round 7, item 10: while braking at the current limit, the motor's torque is the gearbox's figure at the limit (the
// Torque margin card's) plus twice the friction torque: friction takes its share from a driving torque and adds it to a
// braking one. By hand at 80:1, 40 A: kt x 42.8 A x 72 = 526 lb in against kt x 37.2 x 72 = 457, and 2 x kt x 2.8 x 72 = 69.
var r80 = M.compute(Object.assign({}, s, { ratio: 80 })), seen = 0, worst = 0;
for (var i = 0; i < r80.Q.length; i++) if (r80.Q[i] * r80.W[i] < -1e-9 && r80.A[i] >= 40 - 1e-6) { seen++; worst = Math.max(worst, Math.abs(Math.abs(r80.Q[i]) - (r80.avail + 2 * r80.fricT))); }
ok("brakes at the limit somewhere", seen > 0, seen);
near("braking torque = limit figure + 2 x friction", worst, 0, 1e-6);
near("friction torque by hand (N m)", r80.fricT, 7.16 / 371.2 * 2.8 * 80 * 0.9, 1e-9);
near("braking at the limit by hand, 526 lb in", (r80.avail + 2 * r80.fricT) / LBIN, 526, 0.5);
near("limit figure by hand, 457 lb in", r80.avail / LBIN, 457, 0.5);

// Round 9, item 3: the arm's current with its sign (plus turns the arm up). Out from -60 to 80: plus at the start,
// minus while it brakes at the end; size always matches the record.
var r9 = M.compute(Object.assign({}, s, { ratio: 80 })), w9 = 0;
for (var j9 = 0; j9 < r9.A.length; j9++) w9 = Math.max(w9, Math.abs(Math.abs(r9.AS[j9]) - r9.A[j9]));
near("arm: signed size matches the record", w9, 0, 0.06);
ok("arm: plus at the start of the swing up", r9.AS[1] > 0, r9.AS[1]);
var kb = r9.T.findIndex(function (t) { return t >= M.reverseAt(r9.go) + 0.002; });
ok("arm: minus while braking at the end", r9.AS[kb] < 0, r9.AS[kb]);

console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(fails ? 1 : 0);
