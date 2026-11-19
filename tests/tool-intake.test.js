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
// Round 8, item 12: a level line's name keeps clear of the curves, of the dot that marks yours and of the other name.
// A flat curve at 10 across the chart (y top 30): the name of a line at 10.5 cannot sit just above or below it.
var flat = [[1, 10], [10, 10]], av = [[200, 60, 216, 76]], n1 = M.place("drive speed", 12, [1, 10], 30, [flat], av), n2 = M.place("2 × drive speed", 12.6, [1, 10], 30, [flat], av);
ok("two names, two boxes remembered (plus the dot)", av.length === 3);
function boxOf(i) { return av[i]; }
ok("the two names do not overlap", !(boxOf(1)[0] < boxOf(2)[2] && boxOf(1)[2] > boxOf(2)[0] && boxOf(1)[1] < boxOf(2)[3] && boxOf(1)[3] > boxOf(2)[1]), JSON.stringify(av));
ok("neither name covers the dot", [1, 2].every(function (i) { var b = av[i]; return !(b[0] < 216 && b[2] > 200 && b[1] < 76 && b[3] > 60); }));
void n1; void n2;
// Round 11, intake 2: the pass line on the charts is the piece speed this page asks for, and the upright mark is where
// the piece's curve meets it. At the reduction for a good margin the piece moves at exactly the pass line's speed
// (1.1 x drive against a plate, 2 x drive between two driven surfaces).
[["plate", 1.1], ["both", 2]].forEach(function (cs) {
  var q0 = M.speeds({ drive: dr, V: 12, rollerR: 1 * F.IN, contact: cs[0], driveV: drive, travel: 0.3 });
  var dq = F.drive({ motor: "kraken44", n: 1, ratio: q0.ratioGood, eff: 0.9, statorA: 30 });
  var q1 = M.speeds({ drive: dq, V: 12, rollerR: 1 * F.IN, contact: cs[0], driveV: drive, travel: 0.3 });
  near(cs[0] + ": pass line = " + cs[1] + " x drive", q0.target * M.factor(cs[0]), cs[1], 1e-12);
  near(cs[0] + ": piece at the marked reduction is on the pass line", q1.piece, cs[1] * drive, 1e-9);
  // The roller diameter that passes, at your reduction: speed goes as diameter.
  var dGood = 2 * cs[1] * drive / q0.piece, q2 = M.speeds({ drive: dr, V: 12, rollerR: dGood / 2 * F.IN, contact: cs[0], driveV: drive, travel: 0.3 });
  near(cs[0] + ": piece at the marked diameter is on the pass line", q2.piece, cs[1] * drive, 1e-9);
});
// Owner's round 1, E1: "Over the bumper", one roller in front of the bumper. Hand-worked at the defaults: Kraken X44,
// 7757 rpm free at 12 V, through 2.5:1 on a 2 in roller: surface = pi x 2 x 7757 / 2.5 / 60 = 324.94 in/s = 27.08 ft/s.
// The floor comes in at 12 ft/s. Pinched between the roller and the floor the piece rolls between two surfaces moving
// the same way, so its centre is at their average, (27.08 + 12) / 2 = 19.54 ft/s. Against the bumper, which is fixed,
// half the surface: 13.54 ft/s.
var d25 = F.drive({ motor: "kraken44", n: 1, ratio: 2.5, eff: 0.9, statorA: 30 }), Rb = 5.91 / 2;
var ov = M.speeds({ drive: d25, V: 12, rollerR: 1 * F.IN, contact: "over", driveV: drive, travel: 14 * F.IN, pieceR: Rb * F.IN });
var vs = Math.PI * 2 * 7757 / 2.5 / 60 / 12;
near("over: surface 27.08 ft/s", ov.surface / F.FT, vs, 1e-9);
near("over: surface, rounded hand figure", ov.surface / F.FT, 27.08, 0.005);
near("over: on the floor = (surface + drive) / 2", ov.piece / F.FT, (vs + 12) / 2, 1e-9);
near("over: on the floor, rounded hand figure 19.54", ov.piece / F.FT, 19.54, 0.005);
near("over: up the bumper = surface / 2", ov.pieceB / F.FT, vs / 2, 1e-9);
near("over: up the bumper, rounded hand figure 13.54", ov.pieceB / F.FT, 13.54, 0.005);
near("over: the floor part is faster than the plate case by half the drive", ov.piece - ov.pieceB, drive / 2, 1e-9);
// The rule: the piece on the floor at least 1.1 x the drive, so (surface + drive) / 2 >= 1.1 drive, a surface of 1.2 x.
near("over: target surface 1.2 x drive", ov.target, 1.2, 1e-12);
near("over: pass line 1.1 x drive = 13.2 ft/s", ov.pass / F.FT, 13.2, 1e-9);
// Reduction for that: 2.5 x 27.08 / (1.2 x 12) = 4.701:1; there the floor speed is exactly 13.2 ft/s.
near("over: reduction for the margin by hand", ov.ratioGood, 2.5 * vs / 14.4, 1e-9);
near("over: reduction, rounded hand figure 4.70", ov.ratioGood, 4.70, 0.005);
var ovg = M.speeds({ drive: F.drive({ motor: "kraken44", n: 1, ratio: ov.ratioGood, eff: 0.9, statorA: 30 }), V: 12, rollerR: 1 * F.IN, contact: "over", driveV: drive, travel: 0.3, pieceR: Rb * F.IN });
near("over: at that reduction the floor speed is on the pass line", ovg.piece, 1.1 * drive, 1e-9);
ok("over: and it passes", ovg.state === "ok", ovg.state);
// States: the piece comes in faster than the floor exactly when the surface is faster than the drive.
ok("over: surface 0.9 x drive is a problem (pushed ahead)", M.state(0.9, 0.95, drive, "over") === "bad");
ok("over: surface 1.1 x drive is a check (piece 1.05 x)", M.state(1.1, 1.05, drive, "over") === "warn");
ok("over: surface 1.2 x drive is good, no 2 x rule", M.state(1.2, 1.1, drive, "over") === "ok");
ok("over: default setup is good", ov.state === "ok", ov.state);
near("over: default pieceRatio 1.63", ov.pieceRatio, (vs + 12) / 24, 1e-9);
// Time through 14 in: the floor part is sqrt 2 (Rr + Rb) = sqrt 2 x 3.955 = 5.593 in at 19.54 ft/s, the other 8.407 in
// at 13.54 ft/s: 5.593 / 234.5 + 8.407 / 162.5 = 0.0756 s.
var Lf = Math.SQRT2 * (1 + Rb);
near("over: floor part length", ov.floorLen / F.IN, Lf, 1e-9);
near("over: time by hand", ov.time, Lf / ((vs + 12) / 2 * 12) + (14 - Lf) / (vs / 2 * 12), 1e-9);
near("over: time, rounded hand figure", ov.time, 0.0756, 0.0005);
near("over: standing still the floor part is half the surface", M.speeds({ drive: d25, V: 12, rollerR: 1 * F.IN, contact: "over", driveV: 0, travel: 0.3, pieceR: Rb * F.IN }).piece, ov.surface / 2, 1e-12);
// The drawing's path: first touch at Rc from the roller, the corner touching floor, bumper and roller, the floor part
// as long as the sums use, the piece never squeezed by more than Rc (1 - 1/sqrt 2), and a path that does not jump.
[{ piece: 5.91, roller: 2, travel: 14 }, { piece: 9.5, roller: 4, travel: 30 }, { piece: 16, roller: 1, travel: 60 }].forEach(function (sz) {
  var G = M.geomOver(sz), Rc = sz.piece / 2 + sz.roller / 2, p0 = G.at(0).p, pq = G.at(G.Lf).p;
  near(sz.piece + " in: first touch at Rc from the roller", Math.hypot(p0[0] - G.C[0], p0[1] - G.C[1]), Rc, 1e-9);
  near(sz.piece + " in: at the corner the piece touches the roller", Math.hypot(pq[0] - G.C[0], pq[1] - G.C[1]), Rc, 1e-9);
  near(sz.piece + " in: floor part as in the sums", G.Lf, M.floorLen(sz.roller / 2, sz.piece / 2), 1e-9);
  var worst = 0, jump = 0, prev = p0;
  for (var i = 0; i <= 400; i++) { var dd = sz.travel * i / 400, q = G.at(dd).p; if (dd <= G.Lf) worst = Math.max(worst, Rc - Math.hypot(q[0] - G.C[0], q[1] - G.C[1])); jump = Math.max(jump, Math.hypot(q[0] - prev[0], q[1] - prev[1])); prev = q; }
  ok(sz.piece + " in: squeeze on the floor at most Rc (1 - 1/sqrt 2)", worst <= Rc * (1 - Math.SQRT1_2) + 1e-9, worst);
  ok(sz.piece + " in: the path does not jump", jump <= sz.travel / 400 + 1e-9, jump);
  ok(sz.piece + " in: on the floor until the corner", p0[1] === sz.piece / 2 && pq[1] === sz.piece / 2);
  // The bumper is the box x -3.5 to 0, y 1.5 to 6.5: the piece's centre stays at least its radius from it.
  var inside = 0;
  for (var j = 0; j <= 400; j++) { var c2 = G.at(sz.travel * j / 400).p, nx = Math.max(-3.5, Math.min(0, c2[0])), ny = Math.max(1.5, Math.min(6.5, c2[1])); inside = Math.max(inside, sz.piece / 2 - Math.hypot(c2[0] - nx, c2[1] - ny)); }
  ok(sz.piece + " in: never inside the bumper", inside <= 1e-9, inside);
});
// The reduction the verdict names is rounded down, so it passes itself (review, 2026-11-19). Over the bumper at
// 13 ft/s the exact figure is 7757 x 2 pi / (60 x 12) / (1.2 x 13) = 4.3393:1; "4.34 or lower" would name one that misses.
var d13 = M.speeds({ drive: F.drive({ motor: "kraken44", n: 1, ratio: 2.5, eff: 0.9, statorA: 30 }), V: 12, rollerR: 1 * F.IN, contact: "over", driveV: 13 * F.FT, travel: 14 * F.IN, pieceR: 5.91 / 2 * F.IN });
near("over at 13 ft/s: exact reduction 4.3393", d13.ratioGood, 4.339268913, 1e-6);
near("and the figure shown is 4.33", M.down2(d13.ratioGood), 4.33, 1e-12);
ok("4.33:1 passes and 4.34:1 does not", M.speeds({ drive: F.drive({ motor: "kraken44", n: 1, ratio: 4.33, eff: 0.9, statorA: 30 }), V: 12, rollerR: 1 * F.IN, contact: "over", driveV: 13 * F.FT, travel: 14 * F.IN, pieceR: 5.91 / 2 * F.IN }).state === "ok" && M.speeds({ drive: F.drive({ motor: "kraken44", n: 1, ratio: 4.34, eff: 0.9, statorA: 30 }), V: 12, rollerR: 1 * F.IN, contact: "over", driveV: 13 * F.FT, travel: 14 * F.IN, pieceR: 5.91 / 2 * F.IN }).state !== "ok");
console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
if (fails) process.exit(1);
