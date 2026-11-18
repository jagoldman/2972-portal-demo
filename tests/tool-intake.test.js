/* Checks for the Intake calculator's own maths (js/tool-intake.js). Run: node tests/tool-intake.test.js */
"use strict";
var F = require("../js/frc.js"), M = require("../js/tool-intake.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= tol, got + ", want " + want); }

// Hand-worked: a 2 in roller on a Kraken X44 (7757 rpm free) through 3:1 turns at 2585.7 rpm.
// Surface speed = pi x 2 in x 2585.7 / 60 = 270.75 in/s = 22.56 ft/s. Against a plate the piece moves at half: 11.28 ft/s.
var dr = F.drive({ motor: "kraken44", n: 1, ratio: 3, eff: 0.9, statorA: 30 }), drive = 12 * F.FT;
var p = M.speeds({ drive: dr, V: 12, rollerR: 1 * F.IN, contact: "plate", driveV: drive, travel: 14 * F.IN });
near("roller rpm", p.rpm, 7757 / 3, 0.01);
near("surface speed (ft/s)", p.surface / F.FT, Math.PI * 2 * 7757 / 3 / 60 / 12, 1e-6);
near("surface speed hand value", p.surface / F.FT, 22.56, 0.01);
near("piece against a plate is half", p.piece, p.surface / 2, 1e-12);
var b = M.speeds({ drive: dr, V: 12, rollerR: 1 * F.IN, contact: "both", driveV: drive, travel: 14 * F.IN });
near("piece between two rollers is full", b.piece, b.surface, 1e-12);
near("surface to drive ratio", p.surfRatio, 22.56 / 12, 0.001);
near("time through 14 in", p.time, 14 / (11.28 * 12), 0.001);
// The reduction for 2x drive speed gives exactly twice the drive speed.
var d2 = F.drive({ motor: "kraken44", n: 1, ratio: p.ratio2x, eff: 0.9, statorA: 30 });
near("ratio for 2x", M.speeds({ drive: d2, V: 12, rollerR: 1 * F.IN, contact: "plate", driveV: drive, travel: 0.3 }).surface, 2 * drive, 1e-9);
// Grip force at the current limit: torque at 30 A through 3:1 at 90 %, over a 1 in radius.
var m = F.motor("kraken44"), T = m.kt * (30 - m.freeA) * 3 * 0.9;
near("grip force (N)", p.force, T / (1 * F.IN), 1e-9);
// Half the battery, half the speed.
near("speed in proportion to battery", M.speeds({ drive: dr, V: 6, rollerR: 1 * F.IN, contact: "plate", driveV: drive, travel: 0.3 }).surface, p.surface / 2, 1e-12);
ok("standing still: ratio infinite, no NaN", M.speeds({ drive: dr, V: 12, rollerR: 1 * F.IN, contact: "plate", driveV: 0, travel: 0.3 }).surfRatio === Infinity);

console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
if (fails) process.exit(1);
