/* Checks for the Tip-over calculator's own maths (js/tool-tip.js). Run: node tests/tool-tip.test.js */
"use strict";
var M = require("../js/tool-tip.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= tol, got + ", want " + want); }
var box = { L: 30, H: 12, bumpX: 17, bBot: 2, bTop: 7, mastX: 8.5, mastTop: 57 };

// Hand-worked (the brief's case): centre of gravity 10 in high, 11 in behind the front wheel -> tips at 11 / 10 = 1.1 g.
var simple = Object.assign({ m1: 100, x1: 0, h1: 10, m2: 0, x2: 0, h2: 0, wb: 22, mu: 1.0, ramp: 0 }, box);
var L = M.limits(simple);
near("tip threshold 1.1 g", L.tipBrake, 1.1, 1e-12);
near("static tip angle atan(11/10)", L.staticF, Math.atan(1.1) * 180 / Math.PI, 1e-9);
ok("grip 1.0 < 1.1: slides first", L.slidesFirstBrake);

// Combined centre of gravity, hand-worked: 105 lb at (0, 7) and 22 lb at (4, 52): x = 88 / 127 = 0.693 in, h = 1879 / 127 = 14.80 in.
var dflt = Object.assign({ m1: 105, x1: 0, h1: 7, m2: 22, x2: 4, h2: 52, wb: 22, mu: 1.1, ramp: 0 }, box), c = M.cg(dflt);
near("combined x", c.x, 88 / 127, 1e-12);
near("combined h", c.h, (735 + 1144) / 127, 1e-12);
var Ld = M.limits(dflt);
near("default tips at (11 - x) / h", Ld.tipBrake, (11 - 88 / 127) / ((735 + 1144) / 127), 1e-12);

// The height for a braking rate gives back that rate.
var h = M.heightFor(dflt, 0.8);
near("height for 0.8 g", M.limits(Object.assign({}, dflt, { h2: h })).tipBrake, 0.8, 1e-9);
// The resultant lands on the front wheel exactly at the threshold.
near("landing at threshold = front wheel", M.landing(dflt, Ld.tipBrake), 11, 1e-9);

// A ramp, pointing down: tips at (d/h) cos b - sin b.
var ramp = Object.assign({}, simple, { ramp: 10 }), b = 10 * Math.PI / 180;
near("ramp down shifts forward tip", M.limits(ramp).tipBrake, 1.1 * Math.cos(b) - Math.sin(b), 1e-12);
near("ramp down helps acceleration tip", M.limits(ramp).tipAccel, 1.1 * Math.cos(b) + Math.sin(b), 1e-12);
// Standing on a ramp as steep as the static tip angle: tips with no braking at all.
near("static angle ramp: threshold 0", M.limits(Object.assign({}, simple, { ramp: L.staticF })).tipBrake, 0, 1e-12);

// The stop: below the threshold nothing lifts; well above it and long enough, it falls; a short stop drops back.
ok("below threshold stays down", !M.stop(simple, 1.0, 180, 2).lifted);
var fall = M.stop(Object.assign({}, dflt), 1.2, 300, 2);
ok("hard long stop falls", fall.fell, fall.maxPhi);
var brief = M.stop(Object.assign({}, dflt), Ld.tipBrake + 0.1, 30, 2);
ok("short stop lifts and drops back", brief.lifted && !brief.fell && brief.phi[brief.phi.length - 1] === 0, brief.maxPhi);
// The front bumper's bottom edge (6 in ahead of the wheel, 2 in up) reaches the floor at atan(2 / 6) = 18.4 degrees:
// the robot cannot tilt past that about its wheels; it then turns about the bumper edge.
var lean = M.stop(dflt, 0.8, 180, 2), bAng = Math.atan2(2, 6);
ok("default stop leans on the bumper", lean.bumper, lean.maxPhi * 180 / Math.PI);
ok("tilt about the wheels stops at the bumper angle", lean.phi.every(function (f, i) { return lean.piv[i] !== 1 || f <= bAng + 0.01; }));
ok("ends back on its wheels", lean.phi[lean.phi.length - 1] === 0 && lean.piv[lean.piv.length - 1] === 1);
ok("hard long stop ends resting on the bumper face or mast", fall.piv[fall.piv.length - 1] >= 3);
console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
if (fails) process.exit(1);
