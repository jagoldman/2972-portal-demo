/* Checks for the Drivetrain calculator's own maths (js/tool-drive.js). Run: node tests/tool-drive.test.js */
"use strict";
var F = require("../js/frc.js"), M = require("../js/tool-drive.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= tol, got + ", want " + want); }

var m = 135 * F.LB, r = 2 * F.IN, dr = F.drive({ motor: "kraken60", n: 4, ratio: 6.75, eff: 0.9, statorA: 60 });

// 1. Grip-limited with no drag: a constant force, so d = a t^2 / 2 (hand-worked: grip 0.5 g -> a = 4.903 m/s^2,
//    after 0.2 s d = 0.5 * 4.903 * 0.04 = 0.0981 m).
var grip = 0.5 * m * F.G, sp = M.sprint({ drive: dr, m: m, r: r, grip: grip, drag: 0, V0: 12.3, Rb: 0.02, tmax: 1, dt: 0.0005 });
var i = Math.round(0.2 / 0.0005);
ok("still grip-limited at 0.2 s", sp.slip[i]);
near("constant acceleration while grip-limited", sp.a[i], 0.5 * F.G, 1e-9);
near("d = a t^2 / 2", sp.x[i], 0.5 * 0.5 * F.G * 0.2 * 0.2, 0.0981 * 0.01);

// 2. The battery voltage satisfies V = V0 - Rb * supply current, both below and at the current limit.
[0, 20, 60, 90].forEach(function (w) {
  var V = M.battery(dr, w, 12.3, 0.02), q = dr.at(w, V, 1);
  near("battery solved at " + w + " rad/s", V, 12.3 - 0.02 * q.supplyA, 1e-6);
});
ok("no sag at rest resistance 0", M.battery(dr, 30, 12.3, 0) === 12.3);

// 3. With no battery resistance the result matches F.moveLinear (whose voltage step is then exact). 15 ft sprint.
var mv = F.moveLinear({ drive: dr, m: m, r: r, x0: 0, goal: 15 * F.FT, stop: false, maxForce: 1.1 * m * F.G, V: 12.3, Rbat: 0 });
var mine = M.sprint({ drive: dr, m: m, r: r, grip: 1.1 * m * F.G, drag: 0, V0: 12.3, Rb: 0, tmax: 8, dist: 15 * F.FT });
near("same time as F.moveLinear with Rbat 0", mine.time, mv.time, 0.01);

// 4. Top speed with no drag and no sag is the free speed at 12.3 V less the free-current loss (within 1 %).
var top = M.lane({ motor: "kraken60", n: 4, ratio: 6.75, eff: 0.9, statorA: 60, m: m, r: r, grip: 1.1 * m * F.G, drag: 0, V0: 12.3, Rb: 0, dist: 5 });
near("top speed near free speed x 12.3 / 12", top.top, top.free * 12.3 / 12, top.free * 0.01);
// With drag the top speed is lower, and both lanes start grip-limited at the same acceleration.
var A = M.lane({ motor: "kraken60", n: 4, ratio: 6.75, eff: 0.9, statorA: 60, m: m, r: r, grip: 1.1 * m * F.G, drag: 6 * F.LBF, V0: 12.3, Rb: 0.02, dist: 15 * F.FT });
var B = M.lane({ motor: "kraken60", n: 4, ratio: 6.12, eff: 0.9, statorA: 60, m: m, r: r, grip: 1.1 * m * F.G, drag: 6 * F.LBF, V0: 12.3, Rb: 0.02, dist: 15 * F.FT });
ok("drag lowers top speed", A.top < top.top);
ok("top speed levels off (flat over the last second)", Math.abs(A.sim.v[A.sim.v.length - 1] - A.sim.v[A.sim.v.length - 500]) < 0.001);
near("launch = smaller of push and grip, over mass (A)", A.acc0, Math.min(A.push, A.grip) / m, 1e-3);
// With a high current limit both slip at launch and so start with the same acceleration, grip x g.
var A2 = M.lane({ motor: "kraken60", n: 4, ratio: 6.75, eff: 0.9, statorA: 120, m: m, r: r, grip: 1.1 * m * F.G, drag: 6 * F.LBF, V0: 12.3, Rb: 0.02, dist: 15 * F.FT });
var B2 = M.lane({ motor: "kraken60", n: 4, ratio: 6.12, eff: 0.9, statorA: 120, m: m, r: r, grip: 1.1 * m * F.G, drag: 6 * F.LBF, V0: 12.3, Rb: 0.02, dist: 15 * F.FT });
near("same launch while both slip", A2.acc0, B2.acc0, 1e-9);
near("slipping launch = (grip - 0 drag) / m", A2.acc0, 1.1 * F.G, 1e-9);
ok("slip ends later on the lower gearing", A2.slipV > B2.slipV, A2.slipV + " vs " + B2.slipV);
ok("higher gearing faster at the top", B.top > A.top, B.top + " vs " + A.top);
ok("times finite", A.reached && B.reached, A.time + " " + B.time);
// Crossings: where the time-over-distance curves cross, the times are equal.
var cr = M.crossings(A.sim, B.sim, 30);
cr.forEach(function (c) { near("crossing times equal at " + c.d.toFixed(2) + " m", M.timeAt(A.sim, c.d), M.timeAt(B.sim, c.d), 0.002); });
// A drive too weak to beat the drag creeps forward and never reverses.
var weak = M.sprint({ drive: F.drive({ motor: "neo550", n: 1, ratio: 1, eff: 0.9, statorA: 5 }), m: m, r: r, grip: 1.1 * m * F.G, drag: 6 * F.LBF, V0: 12.3, Rb: 0.02, tmax: 2 });
ok("weak drive never goes backward", Math.min.apply(null, weak.v) >= 0);

// Finding 5 (Sol review): top speed is where push equals drag, not wherever an 8 s run has got to.
// A 200 lb robot on a 10 A limit is still speeding up after 8 s (1.4 ft/s in its last second).
var slow = M.lane({ motor: "kraken60", n: 4, ratio: 6.75, eff: 0.9, statorA: 10, m: 200 * F.LB, r: r, grip: 1.1 * 200 * F.LB * F.G, drag: 6 * F.LBF, V0: 12.3, Rb: 0.02, dist: 15 * F.FT });
var so = { drive: slow.drive, m: 200 * F.LB, r: r, grip: 1.1 * 200 * F.LB * F.G, drag: 6 * F.LBF, V0: 12.3, Rb: 0.02 };
near("top speed: push = drag there", M.force(so, slow.top).net, 0, 0.01);
ok("top speed above what 8 s reached", slow.top > slow.sim.v[slow.sim.v.length - 1] + 0.3, slow.top + " vs " + slow.sim.v[slow.sim.v.length - 1]);
ok("just under top speed it still speeds up, just over it slows", M.force(so, slow.top - 0.01).net > 0 && M.force(so, slow.top + 0.01).net < 0);
// The default lane already levels off in 8 s, so the two agree there.
near("default: bisection = levelled-off run", A.top, A.sim.v[A.sim.v.length - 1], 1e-4);
// Hand check with no drag and no sag: top = free speed at 12.3 V less the free current, (12.3 - 2.8 R) / ke / G x r.
var km = F.motor("kraken60"), hand = (12.3 - km.freeA * km.R) / km.ke / 6.75 * r;
near("no drag, no sag: top by hand", top.top, hand, hand * 1e-3);
// The sentence after the winner speaks only to the distance searched, not "any longer run".
var lt = M.leadText([], 15 * F.FT, 60 * F.FT, "B");
ok("lead sentence names the distance searched", /up to 60 ft/.test(lt) && !/any longer/.test(lt), lt);
ok("a crossing past the sprint is named", M.leadText([{ d: 20 * F.FT, ahead: "A" }], 15 * F.FT, 60 * F.FT, "B") === "A is ahead after 20 ft.");

// Finding 10 (Sol review): back-EMF takes the push away sooner on the larger reduction. At the same robot speed the
// 8.14:1 motors spin faster than the 6.12:1 ones, so with no current limit and no sag a bigger share of their stall
// push is gone. The notes must say "larger".
function share(G, v) { var d = F.drive({ motor: "kraken60", n: 4, ratio: G, eff: 0.9 }), o = { drive: d, m: m, r: r, grip: 1e9, drag: 0, V0: 12.3, Rb: 0 }; return M.force(o, v).push / M.force(o, 0).push; }
ok("larger reduction keeps less of its push at 10 ft/s", share(8.14, 10 * F.FT) < share(6.12, 10 * F.FT), share(8.14, 10 * F.FT) + " vs " + share(6.12, 10 * F.FT));
var src = require("fs").readFileSync(require("path").join(__dirname, "../js/tool-drive.js"), "utf8");
ok("notes: sooner on the larger reduction", /sooner on the larger reduction/.test(src) && !/sooner on the smaller reduction/.test(src));

console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
console.log("default race: A " + A.time.toFixed(3) + " s, B " + B.time.toFixed(3) + " s; top " + (A.top / F.FT).toFixed(2) + " / " + (B.top / F.FT).toFixed(2) + " ft/s; slip until " + (A.slipV / F.FT).toFixed(2) + " / " + (B.slipV / F.FT).toFixed(2) + " ft/s; min V " + A.minV.toFixed(2) + "; crossings (ft) " + cr.map(function (c) { return (c.d / F.FT).toFixed(1) + c.ahead; }).join(" "));
if (fails) process.exit(1);
