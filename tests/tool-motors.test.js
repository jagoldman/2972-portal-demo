/* Checks for the maths in js/tool-motors.js. Run: node tests/tool-motors.test.js */
"use strict";
var F = require("../js/frc.js"), M = require("../js/tool-motors.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= (tol == null ? 1e-6 : tol), got + ", want " + want); }

// Hand calculation, Kraken X60 at 12 V with a 60 A stator limit, from its four listed figures
// (6065 rpm free, 7.16 N m stall, 374 A stall, 2.8 A free):
//   R  = 12 / 374                        = 0.0320856 ohm
//   wf = 6065 x pi / 30                  = 635.125 rad/s
//   ke = (12 - 2.8 R) / wf               = 0.0187525 V s/rad
//   kt = 7.16 / (374 - 2.8)              = 0.0192888 N m/A
//   torque under the limit = kt (60 - 2.8)  = 1.10332 N m
//   knee: (12 - 60 R) / ke               = 537.256 rad/s (5130.4 rpm)
//   unlimited peak would be at (12 - 2.8 R) / (2 ke) = 317.56 rad/s, below the knee, so the peak is at the knee:
//   peak power = 1.10332 x 537.256      = 592.76 W
var p = M.peak("kraken60", 12, 60);
near("knee speed", p.w, 537.256, 0.01);
near("peak power under 60 A", p.power, 592.76, 0.05);
near("torque at the peak", p.torque, 1.10332, 1e-4);
// No limit: the peak is at about half the free speed, P = kt (V/R - Ifree - ke w / R) w.
var u = M.peak("kraken60", 12, 0), R = 12 / 374, wf = 6065 * Math.PI / 30, ke = (12 - 2.8 * R) / wf, kt = 7.16 / 371.2, w = (12 - 2.8 * R) / (2 * ke);
near("unlimited peak speed", u.w, w, 1e-9);
near("unlimited peak power", u.power, kt * ((12 - ke * w) / R - 2.8) * w, 1e-6);
ok("unlimited peak about 1,135 W", Math.abs(u.power - 1135) < 5, u.power);
// The exact peak agrees with a fine sweep, for every motor and a few limits.
F.MOTORS.forEach(function (m) {
  [0, 20, 40, 60, 80, 120].forEach(function (L) {
    var pk = M.peak(m.id, 12, L), best = 0, wf2 = m.free;
    for (var k = 0; k <= 4000; k++) best = Math.max(best, M.at(m.id, 12, L, wf2 * k / 4000).power);
    ok("peak matches sweep: " + m.id + " " + L + " A", Math.abs(pk.power - best) < 0.002 * best + 0.01, pk.power + " vs " + best);
  });
});
// Efficiency is power out over battery power in, and stays between 0 and 1.
var a = M.at("neo", 12, 40, 400);
near("efficiency definition", a.eff, a.torque * 400 / (12 * a.supplyA), 1e-12);
ok("efficiency below 1 everywhere", F.MOTORS.every(function (m) { for (var k = 0; k <= 50; k++) { var e = M.at(m.id, 12, 60, m.free * k / 50).eff; if (!(e >= 0 && e < 1)) return false; } return true; }));
// Supply current never exceeds the stator current.
ok("supply below stator", (function () { for (var k = 0; k <= 50; k++) { var q = M.at("vortex", 12, 60, F.motor("vortex").free * k / 50); if (q.supplyA > q.statorA + 1e-9) return false; } return true; })());

// Fix round 5: the knee dot on the Torque chart. At the knee the torque is still the limit's flat torque; just past it,
// it has started to fall. Kraken X60 at 12 V, 60 A.
var kn = M.peak("kraken60", 12, 60).knee, flat = M.at("kraken60", 12, 60, 0).torque;
ok("knee: torque still flat there", Math.abs(M.at("kraken60", 12, 60, kn * 0.999).torque - flat) < 1e-9);
ok("knee: falls just past it", M.at("kraken60", 12, 60, kn * 1.02).torque < flat - 1e-6);
var srcM = require("fs").readFileSync(require("path").join(__dirname, "../js/tool-motors.js"), "utf8");
ok("no file names in the notes", srcM.split("module.exports")[1].indexOf("frc.js") < 0);
ok("table note names both NEO Vortex rows", /NEO Vortex \(CTRE\\?'s test\)/.test(srcM) && /NEO Vortex \(REV\\?'s sheet\)/.test(srcM));
// Round 7: the supply-current lines end at the free current, not at zero (the chart's note says so). At free speed
// on 12 V the motor draws its free current, from the battery as in the windings.
["kraken60", "vortex", "kraken44"].forEach(function (id) {
  var m = F.motor(id), q = M.at(id, 12, 60, m.free);
  near("free current at free speed, " + id, q.supplyA, m.freeA, 1e-6);
});
// Owner round 1: the torque card's one figure is the level the limit holds, to the knee the drawing marks; above the
// knee the torque falls. Kraken X60 at 12 V, 60 A: 1.10 N m to 5,130 rpm; 7.16 N m with no limit.
var ft = M.flatTorque("kraken60", 12, 60);
near("held torque", ft.held, M.at("kraken60", 12, 60, 0).torque, 1e-12);
ok("held to the knee the drawing marks", Math.abs(ft.kneeRpm - M.peak("kraken60", 12, 60).knee / F.RPM) < 1e-9 && Math.round(ft.kneeRpm) === 5130, ft.kneeRpm);
ok("level below the knee, falling above it", Math.abs(M.at("kraken60", 12, 60, ft.kneeRpm * 0.5 * F.RPM).torque - ft.held) < 1e-9 && M.at("kraken60", 12, 60, ft.kneeRpm * 1.05 * F.RPM).torque < ft.held - 1e-3);
near("no-limit stall", ft.stall, 7.16, 1e-9);
ok("no limit: no knee", M.flatTorque("kraken60", 12, 0).kneeRpm === null);
console.log(fails ? fails + " of " + n + " checks failed" : "All " + n + " checks passed");
process.exit(fails ? 1 : 0);
