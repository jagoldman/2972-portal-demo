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

console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(fails ? 1 : 0);
