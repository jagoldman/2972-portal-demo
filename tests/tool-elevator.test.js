/* Checks for the elevator maths in js/tool-elevator.js. Run: node tests/tool-elevator.test.js */
"use strict";
var F = require("../js/frc.js"), M = require("../js/tool-elevator.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= (tol == null ? 1e-9 : tol), got + ", want " + want); }

// Hand-worked cascade, two moving stages: carriage 10 kg, each stage 3 kg, g = 9.8, carriage travel 1.2 m.
// Stage 1 moves 1x the rope, stage 2 2x, the carriage 3x. Rope force = 9.8 (3 x 10 + 1 x 3 + 2 x 3) = 9.8 x 39 = 382.2 N.
// Mass at the rope = 9 x 10 + 1 x 3 + 4 x 3 = 105 kg (kinetic energy: 1/2 (10 (3v)^2 + 3 v^2 + 3 (2v)^2) = 1/2 105 v^2).
var c2 = M.model({ n: 2, rig: "cascade", mc: 10, ms: 3, travel: 1.2, g: 9.8, spring: 0 });
near("cascade rope force", c2.load(0.2), 382.2, 1e-9);
near("cascade mass at the rope", c2.mass(0.2), 105, 1e-9);
near("cascade rope travel = travel / 3", c2.rope, 0.4, 1e-12);
var h = c2.heights(0.1);
near("cascade stage 1 moves with the rope", h[0], 0.1, 1e-12); near("cascade stage 2 twice", h[1], 0.2, 1e-12); near("cascade carriage three times", h[2], 0.3, 1e-12);
// A spring of 20 N on the carriage counts three times at the rope: 382.2 - 60 = 322.2 N.
near("cascade spring counts (n + 1) times", M.model({ n: 2, rig: "cascade", mc: 10, ms: 3, travel: 1.2, g: 9.8, spring: 20 }).load(0), 322.2, 1e-9);

// Continuous, same parts: the carriage alone, then stage 2 joins, then stage 1. Each part travels 0.4 m.
var k2 = M.model({ n: 2, rig: "continuous", mc: 10, ms: 3, travel: 1.2, g: 9.8, spring: 0 });
near("continuous rope travel = travel", k2.rope, 1.2, 1e-12);
near("continuous: carriage alone", k2.load(0.2), 98, 1e-9);
near("continuous: stage 2 has joined", k2.load(0.6), 9.8 * 13, 1e-9);
near("continuous: everything moving", k2.load(1.0), 9.8 * 16, 1e-9);
near("continuous mass steps too", k2.mass(1.0), 16, 1e-12);
var hk = k2.heights(0.6);
near("continuous: stage 1 still down", hk[0], 0, 1e-12); near("continuous: stage 2 part way", hk[1], 0.2, 1e-12); near("continuous: carriage 0.6", hk[2], 0.6, 1e-12);
var top = k2.heights(1.2); near("continuous ends like cascade: stage 1", top[0], 0.4, 1e-12); near("stage 2", top[1], 0.8, 1e-12); near("carriage", top[2], 1.2, 1e-12);

// Same work to the top either way: g (10 x 1.2 + 3 x 0.4 + 3 x 0.8) = 9.8 x 15.6 = 152.88 J.
near("work to the top, cascade", M.work(c2), 152.88, 1e-6);
near("work to the top, continuous", M.work(k2), 152.88, 1e-6);

// One moving stage (n = 0 is not offered). Holding at full height: cascade rope force g (2 mc + ms), continuous
// g (mc + ms), so on the same spool and gearbox the cascade needs (2 x 14 + 5) / (14 + 5) = 33 / 19 = 1.737 times the
// holding torque per motor, and the holding current above the motor's free current is in the same ratio.
var base = { stages: 1, rig: "cascade", travel: 55, carLb: 14, stageLb: 5, motor: "kraken60", motors: 2, ratio: 9, statorA: 60, eff: 90, spool: 1.75, tilt: 0, spring: 0, vbat: 12.3, rbat: 0.02 };
var rc = M.compute(base), rk = M.compute(Object.assign({}, base, { rig: "continuous" }));
near("holding torque ratio, cascade / continuous", rc.holdLoad / rk.holdLoad, 33 / 19, 1e-9);
var free = F.motor("kraken60").freeA;
near("holding current ratio above free current", (rc.hold.statorA - free) / (rk.hold.statorA - free), 33 / 19, 1e-9);
// Hand number for that holding current: 33 lbf on a 0.875 in spool = 3.2626 N m; per amp above free current,
// 2 motors x 9 x 0.9 x kt (7.16 / 371.2 = 0.019289) = 0.31248 N m, so 10.441 + 2.8 = 13.24 A.
near("cascade holding current by hand", rc.hold.statorA, 33 * F.LBF * 0.875 * F.IN / (2 * 9 * 0.9 * 7.16 / 371.2) + 2.8, 1e-9);
near("cascade holding current, rounded hand figure", rc.hold.statorA, 13.24, 0.01);
// Tilt scales gravity by cos(tilt): at 60 degrees the rope holds half.
var rt = M.compute(Object.assign({}, base, { tilt: 60 }));
near("tilt 60 halves the load", rt.holdLoad / rc.holdLoad, 0.5, 1e-9);

// The default lift reaches the top and comes back, and the timeline ends where it started.
var d = M.compute(Object.assign({}, base, { stages: 2 }));
ok("default reaches the top", d.reached && d.timeUp > 0.2 && d.timeUp < 2, d.timeUp);
ok("default comes back down", d.downOk && isFinite(d.timeDown), d.timeDown);
near("timeline ends at the bottom", d.X[d.X.length - 1], 0, 1e-9);
ok("timeline rises", d.T.every(function (t, i) { return !i || t >= d.T[i - 1]; }));
// Too weak: stalls, and the needed torque ratio says by how much.
var weak = M.compute(Object.assign({}, base, { ratio: 2, carLb: 40, motors: 1 }));
ok("too weak stalls", !weak.reached && weak.needRatio > 1, weak.needRatio);
// A short travel still arrives (finer steps for quick moves).
ok("6 in of travel arrives", M.compute(Object.assign({}, base, { travel: 6 })).reached);

// Every slider and field at its ends: nothing throws and the answers are numbers or Infinity, never NaN.
var ends = { stages: [1, 3], rig: ["cascade", "continuous"], travel: [6, 100], carLb: [0.5, 60], stageLb: [0, 25], motors: [1, 8], ratio: [0.05, 50], statorA: [5, 200], eff: [30, 100], spool: [0.25, 4], tilt: [0, 80], spring: [0, 80], vbat: [10, 13.5], rbat: [0, 0.1] };
var bad = [];
Object.keys(ends).forEach(function (k) { ends[k].forEach(function (v) { ["cascade", "continuous"].forEach(function (rig) {
  var o = Object.assign({}, base, { stages: 2, rig: rig }); o[k] = v; var r;
  try { r = M.compute(o); } catch (e) { bad.push(k + "=" + v + " threw " + e.message); return; }
  var nums = [r.timeUp, r.timeDown, r.topV, r.peakA, r.minV, r.hold.statorA, r.maxCarLb, r.kG, r.kV, r.kA, r.duration].concat(r.X, r.T, r.A);
  if (nums.some(function (x) { return x !== x; })) bad.push(k + "=" + v + " (" + rig + ") gave NaN");
  if (!isFinite(r.duration) || r.duration <= 0) bad.push(k + "=" + v + " duration " + r.duration);
}); }); });
ok("extremes: no NaN, no throw", !bad.length, bad.join("; "));

console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(fails ? 1 : 0);
