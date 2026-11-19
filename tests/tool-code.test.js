/* Checks for the Code constants maths (js/tool-code.js). Run: node tests/tool-code.test.js
   Moved from tests/tool-units.test.js when Code constants became its own tool. Hand-worked cases below. */
"use strict";
var M = require("../js/tool-code.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, rel) { ok(name, Math.abs(got - want) <= Math.abs(want) * (rel || 1e-9), got + ", want " + want); }

// Mechanisms: 12:1 onto a 1.5 in spool, 2x rigging: π × 1.5 × 0.0254 × 2 ÷ 12 = 0.0199491 m per motor rotation.
var sp = M.mech({ kind: "spool", ratio: 12, dia: 1.5, rig: 2, rpm: 6000 });
near("spool per motor rotation", sp.perRot, Math.PI * 1.5 * 0.0254 * 2 / 12, 1e-12);
near("spool per motor rotation (hand)", sp.perRot, 0.0199491, 1e-5);
near("spool speed per rpm", sp.perRpm, sp.perRot / 60, 1e-12);
near("spool max speed", sp.max, 0.0199491 * 100, 1e-5);
var wh = M.mech({ kind: "wheel", ratio: 6.75, dia: 4, rig: 3, rpm: 6000 });
near("wheel ignores rigging", wh.perRot, Math.PI * 4 * 0.0254 / 6.75, 1e-12);
var arm = M.mech({ kind: "arm", ratio: 100, rpm: 6000 });
near("arm degrees per motor rotation", arm.perRotDeg, 3.6);
near("arm radians per motor rotation", arm.perRot, 2 * Math.PI / 100);
near("arm max speed: 60 rpm out = 360 deg/s", arm.maxDeg, 360);

// Round 7: the Java names follow the mechanism, and the plain "1 rpm of the motor" line.
ok("names: wheel", M.prefix("wheel") === "Wheel"); ok("names: spool", M.prefix("spool") === "Spool"); ok("names: arm", M.prefix("arm") === "Arm");
ok("names: never Elevator or Drive", ["wheel", "spool", "arm"].every(function (k) { return !/Elevator|Drive/.test(M.prefix(k)); }));
ok("1 rpm of the motor on the default spool = 0.000166 m/s", M.plain3(M.mech({ kind: "spool", ratio: 12, dia: 1.5, rig: 1, rpm: 6000 }).perRpm) === "0.000166", M.plain3(M.mech({ kind: "spool", ratio: 12, dia: 1.5, rig: 1, rpm: 6000 }).perRpm));
ok("plain3 of nothing", M.plain3(0) === "0");

// The default page: 12:1 onto a 1.5 in spool, 1x rigging, at 6,065 rpm (a Kraken X60's free speed):
// π × 1.5 × 0.0254 ÷ 12 = 0.00997456 m per motor rotation; × 6,065 ÷ 60 = 1.00826 m/s.
var d0 = M.mech({ kind: "spool", ratio: 12, dia: 1.5, rig: 1, rpm: 6065 });
near("default per motor rotation", d0.perRot, 0.00997456, 1e-6);
near("default speed at 6,065 rpm", d0.max, 1.00826, 1e-5);

console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(fails ? 1 : 0);
