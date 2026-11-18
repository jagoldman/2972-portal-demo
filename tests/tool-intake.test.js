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
// Between two belts the reduction for a good margin gives exactly twice the drive speed.
var d2 = F.drive({ motor: "kraken44", n: 1, ratio: b.ratioGood, eff: 0.9, statorA: 30 });
near("both sides: reduction for 2x", M.speeds({ drive: d2, V: 12, rollerR: 1 * F.IN, contact: "both", driveV: drive, travel: 0.3 }).surface, 2 * drive, 1e-9);
// Grip force at the current limit: torque at 30 A through 3:1 at 90 %, over a 1 in radius.
var m = F.motor("kraken44"), T = m.kt * (30 - m.freeA) * 3 * 0.9;
near("grip force (N)", p.force, T / (1 * F.IN), 1e-9);
// Half the battery, half the speed.
near("speed in proportion to battery", M.speeds({ drive: dr, V: 6, rollerR: 1 * F.IN, contact: "plate", driveV: drive, travel: 0.3 }).surface, p.surface / 2, 1e-12);
ok("standing still: ratio infinite, no NaN", M.speeds({ drive: dr, V: 12, rollerR: 1 * F.IN, contact: "plate", driveV: 0, travel: 0.3 }).surfRatio === Infinity);

// Thresholds (fix round 5, item 13). Against a plate the piece moves at half the surface speed, so a surface speed of
// exactly 2 times the drive speed only lets the piece match the drive speed: no margin. Hand cases at 12 ft/s.
near("plate: 2x surface means the piece only matches the drive", M.speeds({ drive: F.drive({ motor: "kraken44", n: 1, ratio: 7757 * Math.PI * 2 / 60 / (2 * 144), eff: 0.9, statorA: 30 }), V: 12, rollerR: 1 * F.IN, contact: "plate", driveV: drive, travel: 0.3 }).pieceRatio, 1, 1e-9);
ok("state: piece slower than the floor is a problem", M.state(1.9, 0.95, drive) === "bad");
ok("state: plate at exactly 2x is not good (no margin)", M.state(2, 1, drive) === "warn");
ok("state: plate at 2.1x is a check", M.state(2.1, 1.05, drive) === "warn");
ok("state: plate at 2.2x is good", M.state(2.2, 1.1, drive) === "ok");
ok("state: both sides at 1.5x is a check (under the rule of thumb)", M.state(1.5, 1.5, drive) === "warn");
ok("state: both sides at 2x is good", M.state(2, 2, drive) === "ok");
ok("state: standing still is fine", M.state(Infinity, Infinity, 0) === "ok");
near("plate target is 2.2", p.target, 2.2, 1e-12);
near("both-sides target is 2", b.target, 2, 1e-12);
// The reduction for a good margin gives a surface speed of exactly the target, and is on the edge of good.
var dg = F.drive({ motor: "kraken44", n: 1, ratio: p.ratioGood, eff: 0.9, statorA: 30 }), pg = M.speeds({ drive: dg, V: 12, rollerR: 1 * F.IN, contact: "plate", driveV: drive, travel: 0.3 });
near("reduction for 2.2x gives 2.2x", pg.surfRatio, 2.2, 1e-9);
ok("at that reduction it is good", pg.state === "ok", pg.state);
ok("a little slower is not", M.speeds({ drive: F.drive({ motor: "kraken44", n: 1, ratio: p.ratioGood * 1.02, eff: 0.9, statorA: 30 }), V: 12, rollerR: 1 * F.IN, contact: "plate", driveV: drive, travel: 0.3 }).state === "warn");
// By hand: 7757 rpm = 812.3 rad/s; 2.2 x 12 ft/s = 316.8 in/s at a 1 in radius is 316.8 rad/s, so 812.3 / 316.8 = 2.564:1.
near("reduction for 2.2x by hand", p.ratioGood, 7757 * 2 * Math.PI / 60 / 316.8, 1e-9);
near("reduction for 2.2x, rounded hand figure", p.ratioGood, 2.564, 0.001);

// The drawing's geometry (item 11): the piece touches the roller (or its belt) and the plate along the whole path.
[{ piece: 5.91, roller: 2, travel: 14 }, { piece: 16, roller: 0.5, travel: 60 }, { piece: 2, roller: 6, travel: 2 }, { piece: 9.5, roller: 3, travel: 30 }].forEach(function (sz) {
  var G = M.geom(sz), worst = 0;
  for (var i = 0; i <= 200; i++) {
    var d = sz.travel * i / 200, q = G.at(d).p, toTop, toPlate;
    if (d <= G.Larc) { var rc = Math.hypot(q[0] - G.C[0], q[1] - G.C[1]); toTop = rc - G.Rr; toPlate = G.Rp - rc; }
    else {
      // Distance from the centre to the belt's lower run and to the plate, both lines along u.
      var nx = -G.r1[0], ny = -G.r1[1];
      toTop = (G.C[0] + G.r1[0] * G.Rr - q[0]) * nx + (G.C[1] + G.r1[1] * G.Rr - q[1]) * ny;
      toPlate = (q[0] - G.P1[0]) * nx + (q[1] - G.P1[1]) * ny;
    }
    worst = Math.max(worst, Math.abs(toTop - G.Rb), Math.abs(toPlate - G.Rb));
  }
  near("piece " + sz.piece + " in, roller " + sz.roller + " in: touches both all the way", worst, 0, 1e-9);
  near("first touch is on the floor", G.at(0).p[1], G.Rb, 1e-12);
  ok("the lip clears the bumper face", G.P1[0] >= 0.5 - 1e-12 && G.P1[1] + G.P1[0] * Math.tan(M.TH) >= G.bTop + 0.5 - 1e-9);
  ok("the pulley is past where the piece stops", G.run >= G.straight + G.Rr);
});

// Item 12 (round 6): the piece's speed is compared with the drive speed as it stands, because at first touch the
// piece's path runs along the floor, the same line the robot drives on. Check that direction for several sizes.
[{ piece: 5.91, roller: 2, travel: 14 }, { piece: 16, roller: 0.5, travel: 60 }, { piece: 2, roller: 6, travel: 2 }].forEach(function (sz) {
  var dir = M.geom(sz).at(0).dir;
  near("piece " + sz.piece + " in: at first touch it moves along the floor (x)", dir[0], -1, 1e-12);
  near("piece " + sz.piece + " in: and not up or down", dir[1], 0, 1e-12);
});
console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
if (fails) process.exit(1);
