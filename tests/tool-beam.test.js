/* Checks for the Tube strength maths (js/tool-beam.js). Run: node tests/tool-beam.test.js
   Hand-worked case from the brief: a 2x1x1/16 6061-T6 tube, the tall way, held at one end, 30 in long, 25 lbf at the
   free end.
     I = (1 × 2³ − 0.875 × 1.875³) ÷ 12 = (8 − 5.767822) ÷ 12 = 0.186015 in^4
     deflection = 25 × 30³ ÷ (3 × 10.0e6 × 0.186015) = 675,000 ÷ 5,580,444 = 0.120958 in
     moment = 25 × 30 = 750 lbf in; stress = 750 × 1 ÷ 0.186015 = 4,031.9 psi; safety factor = 35,000 ÷ 4,031.9 = 8.68
     area = 2 − 0.875 × 1.875 = 0.359375 in^2; weight = 0.359375 × 30 × 0.0975 = 1.0512 lb */
"use strict";
var M = require("../js/tool-beam.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= tol, got + ", want " + want); }

var sec = M.section(M.sectionSpec("r2x1_16"), "tall"), al = M.mat("al");
near("I, 2x1x1/16 tall way", sec.I, 0.186015, 1e-6);
near("c", sec.c, 1, 1e-12);
near("area", sec.A, 0.359375, 1e-12);
var b = M.beam({ sec: sec, mat: al, L: 30, P: 25, hold: "cant" });
near("cantilever deflection", b.delta, 0.120958, 2e-6);
near("cantilever moment", b.Mmax, 750, 1e-9);
near("cantilever stress", b.stress, 4031.9, 0.1);
near("safety factor", b.sf, 8.681, 0.001);
near("weight", b.weight, 1.0512, 1e-4);
near("load at yield = load × safety factor", b.Pyield, 25 * b.sf, 1e-9);
near("stiffness = load ÷ deflection", b.stiff, 25 / b.delta, 1e-6);
// The curve agrees with the formula at the tip and is zero at the wall.
near("curve at the tip", M.deflect("cant", 25, 30, b.EI, 30), b.delta, 1e-12);
near("curve at the wall", M.deflect("cant", 25, 30, b.EI, 0), 0, 1e-15);

// Flat way: I = (2 × 1³ − 1.875 × 0.875³) ÷ 12 = (2 − 1.256104) ÷ 12 = 0.061991 in^4, a quarter-ish of the tall way.
var flat = M.section(M.sectionSpec("r2x1_16"), "flat");
near("I, flat way", flat.I, 0.061991, 1e-6);
near("c, flat way", flat.c, 0.5, 1e-12);

// Simply supported and fixed-fixed: the curve's middle matches P L^3 / 48 EI and P L^3 / 192 EI.
var s2 = M.beam({ sec: sec, mat: al, L: 30, P: 25, hold: "simple" }), s3 = M.beam({ sec: sec, mat: al, L: 30, P: 25, hold: "fixed" });
near("simple: middle", M.deflect("simple", 25, 30, s2.EI, 15), 25 * 27000 / (48 * s2.EI), 1e-12);
near("fixed: middle", M.deflect("fixed", 25, 30, s3.EI, 15), 25 * 27000 / (192 * s3.EI), 1e-12);
near("simple: moment P L / 4", s2.Mmax, 187.5, 1e-9);
near("fixed: moment P L / 8", s3.Mmax, 93.75, 1e-9);
near("simple: curve moment in the middle", M.moment("simple", 25, 30, 15), 187.5, 1e-9);
near("fixed: end moment equals middle", Math.abs(M.moment("fixed", 25, 30, 0)), M.moment("fixed", 25, 30, 15), 1e-9);
near("simple: ends do not move", M.deflect("simple", 25, 30, s2.EI, 30), 0, 1e-15);

// Round tube: I = π (1.125⁴ − 1.009⁴) ÷ 64 = π (1.601807 − 1.036488) ÷ 64 = 0.027750 in^4
near("I, round 1.125 x 0.058", M.section(M.sectionSpec("rd1125")).I, 0.027750, 2e-6);
// Flat bar, 1 x 1/4, tall way: 0.25 × 1³ ÷ 12 = 0.0208333; flat way: 1 × 0.25³ ÷ 12 = 0.0013021
near("I, flat bar tall", M.section(M.sectionSpec("flat"), "tall").I, 0.25 / 12, 1e-12);
near("I, flat bar flat", M.section(M.sectionSpec("flat"), "flat").I, 0.015625 / 12, 1e-12);
// A wall of half the side or more is a solid bar.
ok("thick wall becomes solid", M.section({ shape: "rect", a: 1, b: 1, t: 0.6 }, "tall").solid);
// No load: nothing breaks.
var z = M.beam({ sec: sec, mat: al, L: 30, P: 0, hold: "cant" });
ok("no load: no NaN", z.delta === 0 && z.stress === 0 && z.sf === Infinity && isFinite(z.Pyield));

// Finding 11 (Sol review): which face is squeezed follows the sign of the bending moment at the most-stressed point.
// Held at one end: M = -P L at the wall (hogging), so the top is stretched. Resting on both ends: +P L / 4 in the
// middle (sagging), top squeezed. Held at both ends: +P L / 8 in the middle and -P L / 8 at the supports, so the faces
// swap, where M = P (4u - L) / 8 = 0: a quarter of the way in.
var fC = M.faces("cant", 25, 30), fS = M.faces("simple", 25, 30), fF = M.faces("fixed", 25, 30);
ok("held at one end: top stretched at the wall", fC.x === 0 && fC.moment === -750 && !fC.topSqueezed && !fC.swap);
ok("resting on both ends: top squeezed in the middle", fS.moment === 25 * 30 / 4 && fS.topSqueezed && !fS.swap);
ok("held at both ends: top squeezed in the middle, faces swap", fF.moment === 25 * 30 / 8 && fF.topSqueezed && fF.swap);
near("held at both ends: hogs at the supports", M.moment("fixed", 25, 30, 0), -25 * 30 / 8, 1e-12);
near("held at both ends: no moment a quarter in", M.moment("fixed", 25, 30, 7.5), 0, 1e-12);
ok("no load: the way it would bend", M.faces("simple", 0, 30).topSqueezed && !M.faces("cant", 0, 30).topSqueezed);

// Finding 12 (Sol review): "four times stiffer" upright is a solid bar's figure. The default 2x1 tube with a 1/16 wall:
// 0.186015 / 0.061991 = 3.0. A solid 2x1 bar: (1 x 8) / (2 x 1) = 4 exactly.
near("2x1x1/16 tube: 3.0 times stiffer tall", M.tallRatio(M.sectionSpec("r2x1_16")), 0.186015 / 0.061991, 1e-4);
ok("2x1x1/16 tube: rounds to 3.0", M.tallRatio(M.sectionSpec("r2x1_16")).toFixed(1) === "3.0");
near("solid 2x1 bar: 4 times", M.tallRatio({ shape: "bar", a: 2, b: 1 }), 4, 1e-12);
near("square tube: the same either way", M.tallRatio(M.sectionSpec("r1x1_8")), 1, 1e-12);
var bsrc = require("fs").readFileSync(require("path").join(__dirname, "../js/tool-beam.js"), "utf8");
ok("notes no longer say four times stiffer", !/four times stiffer/.test(bsrc));
ok("notes no longer tie the faces to the hold alone", !/the other way round for a beam held at one end/.test(bsrc));

// The stress chart's top: a round number at or just above 1.2 times the peak.
near("niceTop 4,838 psi -> 5,000", M.niceTop(4032 * 1.2), 5000, 1e-12);
near("niceTop 1.2 -> 1.2", M.niceTop(1.2), 1.2, 1e-12);
near("niceTop 0.0071 -> 0.008", M.niceTop(0.0071), 0.008, 1e-12);
near("niceTop 42,000 -> 50,000", M.niceTop(42000), 50000, 1e-12);
near("niceTop of nothing -> 1", M.niceTop(0), 1, 0);

// Round 6: one grid for every frame and screen, from the length alone.
near("grid 30 in -> 1 in squares", M.gridStep(30), 1, 0);
near("grid 60 in -> 2 in squares", M.gridStep(60), 2, 0);
near("grid 96 in -> 6 in squares", M.gridStep(96), 6, 0);
// Round 6: the stress drawing's enlargement. 12% of yield is drawn 5x (60% of the scale); 0.5% is drawn 100x.
near("12% of yield drawn 5x", M.stressZoom(0.1152), 5, 0);
near("0.5% of yield drawn 100x", M.stressZoom(0.005), 100, 0);
near("30% or more is drawn true", M.stressZoom(0.3), 1, 0);
near("no load is drawn true", M.stressZoom(0), 1, 0);
ok("an enlarged share stays within the scale", [0.001, 0.01, 0.05, 0.1, 0.2, 0.29].every(function (x) { var z = M.stressZoom(x); return x * z <= 0.8 && x * z >= 0.16; }));

console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(fails ? 1 : 0);
