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

// Finding 1 (Sol review): test the resultant against both contact points before any stable verdict.
// Mechanism and chassis both 15 in behind the middle on a 22 in wheelbase: the centre of gravity is 4 in behind the
// rear wheel, so it tips backward standing still (it used to say "the wheels slide before it can tip").
var backHeavy = Object.assign({}, dflt, { x1: -15, x2: -15 });
near("back-heavy: weight 4 in behind the rear wheel", M.landing(backHeavy, 0), -15, 1e-12);
ok("back-heavy: tips backward standing still", M.judge(backHeavy, 0).kind === "back", M.judge(backHeavy, 0).kind);
ok("back-heavy: braking does not make it safe", M.judge(backHeavy, 0.8).kind === "back");
// Mechanism up at 100 in, pointing up a 30 degree ramp: past its rearward static tip angle (26.8 degrees), so it tips
// backward standing still (it used to say "Holds").
var steep = Object.assign({}, dflt, { h2: 100, ramp: -30 });
ok("steep ramp: past the rearward static angle", M.limits(steep).staticR < 30, M.limits(steep).staticR);
ok("steep ramp: tips backward standing still", M.judge(steep, 0).kind === "back", M.judge(steep, 0).kind);
// Pointing down a slope steeper than the forward static angle: tips forward standing still.
ok("downhill past static angle: tips forward", M.judge(Object.assign({}, simple, { ramp: L.staticF + 1 }), 0).kind === "front");
// Centre of gravity just ahead of the front wheel, but pointing up a 30 degree ramp: the weight lands inside, so it stands.
var upFront = Object.assign({}, simple, { x1: 12, ramp: -30 });
ok("ahead of the front wheel but up a ramp: stands", ["holds", "slides", "tips"].indexOf(M.judge(upFront, 0).kind) >= 0, M.judge(upFront, 0).kind);
// The ordinary cases keep their verdicts.
ok("default at 0.5 g: holds", M.judge(dflt, 0.5).kind === "holds", M.judge(dflt, 0.5).kind);
ok("simple (grip 1.0 < 1.1): slides", M.judge(simple, 0.8).kind === "slides");
ok("default above its threshold: tips", M.judge(dflt, Ld.tipBrake + 0.05).kind === "tips");
near("judge caps braking at the tread", M.judge(simple, 1.3).brake, 1.0, 1e-12);

// Finding 3 (Sol review): the hand-over keeps angular momentum about the new contact point (perfectly plastic hit).
// Hand-worked: a point mass (I = 0) 1 in above the old point P = (0, 0) lands on Q = (1, 0): (G - Q) . (G - P) = 1,
// |G - Q|^2 = 2, so it turns at half the rate. (The old rule, 0.5 w Iold / Inew, gave a quarter.)
near("hand-over, point mass", M.handover(2, 0, 1, [0, 1], [0, 0], [1, 0]), 1, 1e-12);
// A body with inertia about its centre: I = 3, m = 1: (3 + 1) / (3 + 2) = 0.8.
near("hand-over, with inertia", M.handover(1, 3, 1, [0, 1], [0, 0], [1, 0]), 0.8, 1e-12);
// If it would turn back the other way, the old point is pressed into the floor and it stops: a low G = (0.5, 0.1)
// between P and Q gives (G - Q) . (G - P) = -0.24 < 0.
ok("hand-over never reverses", M.handover(1, 0, 1, [0.5, 0.1], [0, 0], [1, 0]) === 0);
// In the default stop, the robot's hand-over onto the bumper matches that formula and loses energy.
var hb = lean.hand.filter(function (h) { return h.to === 2; })[0], cd = M.cg(dflt);
var Ic = 105 * ((30 * 30 + 12 * 12) / 12 + sq(0 - cd.x) + sq(7 - cd.h)) + 22 * (sq(4 - cd.x) + sq(52 - cd.h));
function sq(x) { return x * x; }
function Ip(p) { return Ic + 127 * (sq(cd.x - p[0]) + sq(cd.h - p[1])); }
ok("default stop hands over to the bumper", !!hb);
var Gd = [cd.x, cd.h], Pw = [11, 0], Qb = [17, 2];
near("bumper hand-over by angular momentum", hb.w1, hb.w0 * (Ic + 127 * ((Gd[0] - 17) * (Gd[0] - 11) + (Gd[1] - 2) * Gd[1])) / Ip(Qb), 1e-9);
ok("the hit loses energy", Ip(Qb) * hb.w1 * hb.w1 <= Ip(Pw) * hb.w0 * hb.w0 + 1e-9);
// Fix round 5: the drawing rests on the moment of greatest tilt when the rear lifts, and on the end when it does not.
var tsim = { t: [0, 0.1, 0.2, 0.3], phi: [0, 0.2, 0.33, 0.1], lifted: true };
ok("worst tilt frame", M.worstT(tsim) === 0.2, M.worstT(tsim));
ok("no tilt: no rest frame (the page rests on the end)", M.worstT({ t: [0, 1], phi: [0, 0], lifted: false }) === null);
// Round 7: the typed figure as an acceleration. With the defaults (chassis 105 lb at 7 in, mechanism 22 lb at 52 in, 4 in
// forward, 22 in wheelbase) the front lifts from 0.79 g, so 0.80 g tips it backward as well as forward.
var dflt = { m1: 105, x1: 0, h1: 7, m2: 22, x2: 4, h2: 52, wb: 22, mu: 1.1, ramp: 0 };
near("defaults: front lifts from 0.79 g", M.limits(dflt).tipAccel, 0.790, 0.001);
ok("defaults: 0.80 g accelerating tips it backward", M.judgeAccel(dflt, 0.8).tips === true);
ok("0.70 g accelerating does not", M.judgeAccel(dflt, 0.7).tips === false);
ok("the tread caps acceleration", M.judgeAccel(dflt, 1.5).acc === M.limits(dflt).gripAccel && M.judgeAccel(dflt, 1.5).capped);
// The height for accelerating: at that mechanism height the backward threshold is exactly the figure.
var hb = M.heightForAccel(dflt, 0.8);
near("height for 0.80 g accelerating gives 0.80 g", M.limits(Object.assign({}, dflt, { h2: hb })).tipAccel, 0.8, 1e-9);
// Hand check: d_rear = 11 + 0.69 = 11.69 in; combined height for 0.80 g = 11.69 / 0.8 = 14.61 in; mechanism height
// = (14.61 x 127 - 105 x 7) / 22 = 50.97 in.
near("height for accelerating, by hand", hb, (11 + 88 / 127) / 0.8 * 127 / 22 - 105 * 7 / 22, 1e-9);
// Round 8: the line under the cards says the static tip angle's tangent is the g figure beside it. On flat ground
// both are the distance to the wheel over the height, so they agree (defaults: tan 35.0 deg = 0.70 g).
var Lf = M.limits(dflt);
near("tan(static forward angle) = braking that tips it", Math.tan(Lf.staticF * Math.PI / 180), Lf.tipBrake, 1e-9);
near("tan(static backward angle) = acceleration that tips it", Math.tan(Lf.staticR * Math.PI / 180), Lf.tipAccel, 1e-9);
// Round 9: "just over" under 5% (0.80 against 0.79 g is 1.3% over), "over" past it (0.80 against 0.70 g).
ok("just over", M.overWords(0.8, 0.79) === "just over" && M.overWords(0.8, 0.7) === "over");
// The tilt chart's marks, from a stop that lifts the rear and hands over to the bumper: the peak is where it starts
// leaning on the bumper, and it is back on its wheels after that.
var sim9 = M.stop(Object.assign({}, dflt, { L: 33, H: 12, bumpX: 17, bBot: 2, bTop: 7, mastX: 8.5, mastTop: 57 }), 0.8, 180, 2), tmk = M.tiltMarks(sim9);
ok("tilt marks: lifts and comes back", tmk && tmk.backT != null && tmk.backT > tmk.peakT, JSON.stringify(tmk));
ok("tilt marks: peak is the most tilt (sampled frames, within half a degree)", tmk && Math.abs(tmk.peakDeg - sim9.maxPhi * 180 / Math.PI) < 0.5);
ok("tilt marks: none when it does not lift", M.tiltMarks({ lifted: false }) === null);
// Round 11 (must-fix): every angle and tangent shown agree on a calculator to the digits shown. The default backward
// angle is 38.3° (tan 38.3° = 0.79), not 38°, whose tangent is 0.78.
var Ld = M.limits(dflt), at = M.angleTan(Ld.dr / Ld.cg.h);
ok("defaults: tan 38.3° = 0.79, the same 0.79 as the card", at.a === "38.3" && at.t === "0.79" && Ld.tipAccel.toFixed(2) === at.t, JSON.stringify(at));
var bad = 0;
for (var hh = 4; hh <= 40; hh += 0.37) for (var dd = 3; dd <= 30; dd += 0.53) {
  var q = M.angleTan(dd / hh);
  if (Math.tan(+q.a * Math.PI / 180).toFixed(2) !== q.t || (dd / hh).toFixed(2) !== q.t) bad++;
}
ok("angle and tangent agree as shown, across 5,000 robots", bad === 0, bad);
// Round 11 (GPT Sol, must-fix): the braking arrow is a force, so no label on it gives it in g.
var srcT = require("fs").readFileSync(require("path").join(__dirname, "../js/tool-tip.js"), "utf8");
ok("no force arrow labelled in g", !/"inertia, " \+ g2\(brk\) \+ " g"/.test(srcT) && !/"forward, " \+ g2\(brk\) \+ " g"/.test(srcT) && /" × weight"/.test(srcT));
// Owner round 1: the stop runs until the motion is over, holds 0.3 s, and never past the 8 s ceiling.
var geo = { L: 33, H: 12, bumpX: 17, bBot: 2, bTop: 7, mastX: 8.5, mastTop: 57 }, base = Object.assign({}, dflt, geo);
function ended(sm) { var k = sm.t.length - 1; return sm.how !== "ceiling" && sm.T >= sm.endT + M.HOLD - 1e-9 && sm.T < sm.endT + M.HOLD + 0.011 && sm.T <= M.CEILING; }
var sD = M.stop(base, 0.8, 180, M.CEILING);
ok("default: back on its wheels, then a hold, well before 8 s", sD.how === "wheels" && ended(sD) && sD.phi[sD.phi.length - 1] === 0 && sD.T < 3, sD.how + " " + sD.T);
ok("default: the caption names the landing", /^back on its wheels at 1\.\d\d s$/.test(M.endWords(sD)), M.endWords(sD));
var sO = M.stop(Object.assign({}, base, { m2: 40, h2: 90, mastTop: 95 }), 1.1, 240, M.CEILING);
ok("a tall heavy mechanism goes right over and comes to rest", sO.how === "over" && sO.fell && ended(sO), sO.how + " " + sO.T);
var sR = M.stop(Object.assign({}, base, { ramp: 5 }), 0.6, 180, M.CEILING);
ok("on a ramp: the run ends at rest", sR.how !== "ceiling" && ended(sR), sR.how + " " + sR.T);
var sN = M.stop(Object.assign({}, base, { h2: 14 }), 0.8, 180, M.CEILING);
ok("never lifts: ends with the braking, plus the hold", sN.how === "still" && !sN.lifted && Math.abs(sN.endT - sN.stopT) < 0.002 && ended(sN), sN.endT + " " + sN.stopT);
var sC = M.stop(Object.assign({}, base, { m2: 40, h2: 90, mastTop: 95 }), 1.1, 240, 0.2);
ok("the ceiling stops a run and says so", sC.how === "ceiling" && sC.T <= 0.2 + 1e-9 && /longest this runs/.test(M.endWords(sC)), sC.how);
// Standing still on a ramp so steep that the weight alone tips it (review, 2026-11-19): the run must not end at
// once as "still". It lifts, goes over and only then ends.
var sG = M.stop(Object.assign({}, base, { m2: 40, h2: 100, mastTop: 105, ramp: 30 }), 0, 180, M.CEILING);
ok("tips under its own weight on a steep ramp: not over at the first instant", sG.how !== "still" && sG.lifted && sG.endT > 0.3 && sG.maxPhi > 0.3, sG.how + " endT " + sG.endT);
console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
if (fails) process.exit(1);
