/* Checks for the Pneumatics maths (js/tool-air.js). Run: node tests/tool-air.test.js
   Hand-worked case: the default intake cylinder, 1.0625 in bore × 4 in stroke, rod 0.3125 in, at 60 psi, from two
   574 mL tanks at 120 psi.
     bore area = π × 1.0625² ÷ 4 = 0.88664 in²; one extend = 0.88664 × 4 = 3.5466 in³
     free air = 3.5466 × (60 + 14.7) ÷ 14.7 = 18.022 in³
     tanks = 2 × 574 mL = 1148 mL = 70.055 in³
     after one extend: 120 + 14.7 = 134.7 psia; 134.7 − 3.5466 × 74.7 ÷ 70.055 = 130.918 psia = 116.218 psig
     push = 60 × 0.88664 = 53.198 lbf; retract volume = (0.88664 − π × 0.3125² ÷ 4) × 4 = 3.2398 in³ */
"use strict";
var M = require("../js/tool-air.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= tol, got + ", want " + want); }

var cyl = { bore: 1.0625, stroke: 4, rod: 0.3125, cycles: 6 }, v = M.strokeVol(cyl);
near("bore area", M.area(1.0625), 0.88664, 1e-5);
near("extend volume", v.out, 3.5466, 1e-4);
near("retract volume", v.back, 3.2398, 1e-4);
near("free air of one extend", M.freeAir(v.out, 60), 18.022, 1e-3);
var Vt = 2 * 574 * M.IN3_PER_ML;
near("tank volume", Vt, 70.055, 1e-3);
var u = M.use(120, Vt, v.out, 60);
near("tank after one extend", u.tank, 116.218, 1e-3);
ok("cylinder got working pressure", u.cyl === 60);
near("push", M.forces(cyl, 60).push, 53.198, 1e-3);
near("pull = P × (bore − rod area)", M.forces(cyl, 60).pull, 60 * (M.area(1.0625) - M.area(0.3125)), 1e-9);

// A match with no compressor: pressure only falls, by Boyle's law, and the sim agrees with the step formula.
var o = { tanks: 2, ml: 574, stored: 120, work: 60, cfm: 0, match: 160, cyls: [cyl] }, r = M.sim(o);
near("first stroke in the sim", r.ev[0].after, 116.218, 1e-3);
ok("pressure never rises without a compressor", r.pts.every(function (p, i) { return !i || p[1] <= r.pts[i - 1][1] + 1e-9; }));
near("air used = 6 cycles of free air", r.used, 6 * M.freeAir(v.out + v.back, 60), 1e-9);
near("stored above working", r.stored, Vt * 60 / 14.7, 1e-9);
ok("defaults last the match", !r.firstShort, r.end);
// Closed form for the end pressure with no shortfall: each stroke takes vol × 74.7 ÷ Vt psi.
near("end pressure", r.end, 120 - 6 * (v.out + v.back) * 74.7 / Vt, 1e-9);
// Too little air: one small tank, many cycles. It runs short, and more tanks fix it.
var big = { tanks: 1, ml: 574, stored: 120, work: 60, cfm: 0, match: 160, cyls: [{ bore: 1.5, stroke: 10, rod: 0.625, cycles: 10 }] }, rb = M.sim(big);
ok("runs short", !!rb.firstShort && rb.fullCycles < 10, rb.fullCycles);
ok("short strokes get less than working pressure", rb.ev.filter(function (e) { return e.short; }).every(function (e) { return e.p < 60; }));
var need = M.tanksNeeded(big);
ok("tanks needed works", need > 1 && !M.sim(Object.assign({}, big, { tanks: need })).firstShort && !!M.sim(Object.assign({}, big, { tanks: need - 1 })).firstShort, need);
// A compressor tops the tanks up but never past the stored pressure.
var rc = M.sim(Object.assign({}, big, { cfm: 0.35 }));
ok("compressor never above stored", rc.pts.every(function (p) { return p[1] <= 120 + 1e-9; }));
ok("compressor ends higher", rc.end > rb.end, rc.end + " vs " + rb.end);
// No cylinders: nothing used, nothing breaks.
var r0 = M.sim(Object.assign({}, o, { cyls: [] }));
ok("no cylinders", r0.used === 0 && r0.end === 120 && !r0.firstShort && r0.cycles === 0);


// Finding 2 (Sol review): below working pressure the tank's air spreads into tank and cylinder (absolute pressures).
// 100 in^3 at 67 psig (81.7 psia), one 10 in^3 stroke regulated to 60: 81.7 x 100 / 110 = 74.273 psia = 59.573 psig.
// (The old step returned 60 and 60: it made air.)
var lo = M.use(67, 100, 10, 60);
near("low step: tank equilibrium", lo.tank, 81.7 * 100 / 110 - 14.7, 1e-9);
near("low step: 59.573 psig", lo.tank, 59.573, 1e-3);
ok("low step: cylinder gets the same, under working", lo.cyl === lo.tank && lo.cyl < 60);
// Air is kept: tank air before = tank + cylinder air after (absolute pressure x volume).
near("low step keeps the air", (lo.tank + 14.7) * 110, 81.7 * 100, 1e-9);
// It joins the regulated formula where they meet: exactly enough for one stroke gives working pressure either way.
var edge = 74.7 * (1 + 10 / 100) - 14.7;
near("the two cases meet", M.use(edge, 100, 10, 60).tank, 60, 1e-9);
near("just past the edge", M.use(edge - 1e-6, 100, 10, 60).tank, 60, 1e-5);

// Finding 7 (Sol review): reaching the search cap is not "more tanks will not fix it".
var huge = { tanks: 1, ml: 50, stored: 120, work: 60, cfm: 0, match: 160, cyls: [{ bore: 4, stroke: 36, rod: 1, cycles: 200 }] };
ok("cap reached: null", M.tanksNeeded(huge) === null);
ok("cap reached: says more than 60", /more than 60 tanks/.test(M.needText(M.tanksNeeded(huge), 1, 0)) && !/will not/.test(M.needText(null, 1, 0)), M.needText(null, 1, 0));
// Stored no higher than working: no number of tanks will do, and it says why.
var under = { tanks: 1, ml: 574, stored: 40, work: 60, cfm: 0, match: 160, cyls: [{ bore: 1, stroke: 4, rod: 0.3, cycles: 2 }] };
ok("stored under working: Infinity", M.tanksNeeded(under) === Infinity);
ok("stored under working: will not fix it", /will not fix/.test(M.needText(Infinity, 1, 0)));
ok("a number: how many more", M.needText(5, 2, 0) === "It would take 5 tanks of this size (3 more), or a compressor on the robot.", M.needText(5, 2, 0));
console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(fails ? 1 : 0);
