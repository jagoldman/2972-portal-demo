/* Checks for js/frc.js. Run: node tests/frc.test.js */
"use strict";
var F = require("../js/frc.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= (tol == null ? 1e-6 : tol), got + ", want " + want); }

// Motors: stall and free speed come back out of the model.
var kr = F.motor("kraken60"), d1 = F.drive({ motor: "kraken60", n: 1, ratio: 1, eff: 1 });
near("stall torque", d1.at(0, 12, 1).torque, 7.16, 1e-9);
near("stall current", d1.at(0, 12, 1).statorA, 374, 1e-9);
near("free speed: no torque", d1.at(kr.free, 12, 1).torque, 0, 1e-9);
near("free speed: free current", d1.at(kr.free, 12, 1).statorA, 2.8, 1e-9);
var d40 = F.drive({ motor: "kraken60", n: 2, ratio: 10, eff: 0.9, statorA: 40 });
near("stator limit", d40.at(0, 12, 1).statorA, 40, 1e-9);
near("limited torque", d40.at(0, 12, 1).torque, kr.kt * (40 - 2.8) * 2 * 10 * 0.9, 1e-9);
var dsup = F.drive({ motor: "kraken60", n: 1, ratio: 1, eff: 1, supplyA: 30 }), half = dsup.at(kr.free / 2, 12, 1);
near("supply limit holds", half.supplyA, 30, 1e-6);
ok("supply limit: stator above supply at low duty", half.statorA > 30, half.statorA);
near("hold", d40.hold(d40.at(0, 12, 1).torque).statorA, 40, 1e-9);

// Battery: the solved voltage agrees with the current it causes, below the limit and at it.
var db = F.drive({ motor: "kraken60", n: 4, ratio: 6.75, eff: 1, statorA: 60 }), Rb = 0.02;
[0, 20, 60, 90].forEach(function (w) {
  var V = db.volts(w, 12.3, Rb, 1), q = db.at(w, V, 1);
  near("battery balance at " + w + " rad/s", V, 12.3 - Rb * q.supplyA, 1e-6);
});
near("no resistance, no sag", db.volts(30, 12.3, 0, 1), 12.3, 1e-12);
near("braking draws nothing", db.volts(30, 12.3, Rb, -1), 12.3, 1e-12);
// Top speed of a sprint is close to free speed at the battery's resting voltage (the coder's finding: a lagged
// voltage made this 17% low).
var top = F.moveLinear({ drive: db, m: 61, r: 0.0508, x0: 0, goal: 40, stop: false, tmax: 12 });
ok("sprint top speed near free speed", top.maxV > 0.93 * db.freeSpeed(12.3) * 0.0508, top.maxV / (db.freeSpeed(12.3) * 0.0508));

// Motion: a pure inertia with constant torque. Stator limit makes torque constant at low speed, so compare with
// the bang-bang answer t = 2 sqrt(d J / T) (well below the speed where back-EMF matters).
var big = F.drive({ motor: "kraken60", n: 1, ratio: 100, eff: 1, statorA: 20 }), T = big.at(0, 12, 1).torque, J = 50;
var mv = F.move({ drive: big, J: J, x0: 0, goal: 0.2, V: 12, Rbat: 0 });
ok("move reaches", mv.reached);
// Speeding up, friction (the free current) works against the motor; braking, it helps. So the two rates differ:
// t = sqrt(2 d (a1 + a2) / (a1 a2)).
var a1 = T / J, a2 = big.motor.kt * (20 + big.motor.freeA) * 100 / J;
near("brake torque includes friction", -big.at(0.3, 12, -1).torque, a2 * J, 1e-9);
near("move time (bang-bang)", mv.time, Math.sqrt(2 * 0.2 * (a1 + a2) / (a1 * a2)), 0.03);
near("move ends on the goal", mv.x[mv.x.length - 1], 0.2, 1e-9);
var down = F.move({ drive: big, J: J, x0: 0.2, goal: 0, V: 12, Rbat: 0 });
near("move down mirrors up", down.time, mv.time, 0.01);
// A short, quick move still arrives (it needs finer steps than the default).
var quick = F.moveLinear({ drive: F.drive({ motor: "kraken60", n: 2, ratio: 4, eff: 0.9, statorA: 80 }), m: 3, r: 0.0222, x0: 0, goal: 0.05, force: function () { return -3 * F.G; } });
ok("short move arrives", quick.reached && quick.time < 0.3, quick.time);
// An elevator that cannot lift its load stalls.
var weak = F.drive({ motor: "neo550", n: 1, ratio: 2, eff: 0.9, statorA: 20 });
var lift = F.moveLinear({ drive: weak, m: 20, r: 0.02, x0: 0, goal: 1, force: function () { return -20 * F.G; } });
ok("too weak: not reached", !lift.reached && lift.time === Infinity);
var strong = F.drive({ motor: "kraken60", n: 2, ratio: 10, eff: 0.9, statorA: 60 });
var up = F.moveLinear({ drive: strong, m: 10, r: 0.0222, x0: 0, goal: 1.2, force: function () { return -10 * F.G; } });
ok("elevator reaches", up.reached && up.time > 0.3 && up.time < 2, up.time);
ok("battery sags under load", up.minV < 12.3 && up.minV > 8, up.minV);

// A sprint runs through the line; grip caps the push; a load that changes part way is allowed.
var dt4 = F.drive({ motor: "kraken60", n: 4, ratio: 6.75, eff: 0.9, statorA: 60 }), rw = 0.0508;
var run = F.moveLinear({ drive: dt4, m: 60, r: rw, x0: 0, goal: 5, stop: false });
ok("sprint reaches at speed", run.reached && run.endV > 2, run.endV);
var slip = F.moveLinear({ drive: dt4, m: 60, r: rw, x0: 0, goal: 5, stop: false, maxForce: 0.3 * 60 * F.G });
ok("less grip is slower", slip.time > run.time, slip.time + " vs " + run.time);
near("grip-limited start = mu g", slip.acc[0], 0.3 * F.G, 1e-6);
var stepLoad = F.moveLinear({ drive: strong, m: function (x) { return x < 0.6 ? 5 : 12; }, r: 0.0222, x0: 0, goal: 1.2, force: function (x) { return -(x < 0.6 ? 5 : 12) * F.G; } });
ok("changing load still arrives", stepLoad.reached, stepLoad.time);

// Flywheel (Team 449): a very heavy wheel throws the ball at half the rim speed; energy is at most half used.
var ball = { mb: 0.215, rb: 0.075 };
var heavy = F.shot(Object.assign({ type: "hood", Iw: 1e6, rw: 0.0508, w: 400 }, ball));
near("heavy wheel: half rim speed", heavy.v, 0.0508 * 400 / 2, 1e-4);
near("ball rolls on the hood", heavy.spin * 0.075, heavy.v, 1e-9);
var real = F.shot(Object.assign({ type: "hood", Iw: 0.004, rw: 0.0508, w: 400 }, ball));
ok("real wheel slower than heavy", real.v < heavy.v && real.v > 0.5 * heavy.v, real.v);
ok("efficiency at most 50%", real.eff > 0.05 && real.eff <= 0.5 + 1e-9, real.eff);
near("wheel after = 2v / r", real.wAfter, 2 * real.v / 0.0508, 1e-9);
// Angular impulse check: wheel loses Iw dw = Hw rw; ball gains m v = Hw + Hh, Ib spin = (Hw - Hh) rb.
var Hw = 0.004 * real.drop / 0.0508, Ib = F.ballMoi("solid", 0.215, 0.075), Hh = Hw - Ib * real.spin / 0.075;
near("impulses add up to the ball's momentum", Hw + Hh, 0.215 * real.v, 1e-9);
// Dual wheels, equal and same speed: no spin, exit at rim speed after the drop. G = 0 is the hooded shooter.
var dual = F.shot(Object.assign({ type: "dual", Iw: 0.004, rw: 0.0508, rw2: 0.0508, G: 1, w: 400 }, ball));
near("dual: no spin", dual.spin, 0, 1e-9);
near("dual: exit = rim speed after", dual.v, 0.0508 * dual.wAfter, 1e-9);
var g0 = F.shot(Object.assign({ type: "dual", Iw: 0.004, rw: 0.0508, rw2: 0.0508, G: 0, w: 400 }, ball));
near("dual with G = 0 equals hooded", g0.v, real.v, 1e-9);
near("wheelFor inverts shot", F.wheelFor(Object.assign({ type: "hood", Iw: 0.004, rw: 0.0508 }, ball), real.v), 400, 1e-6);
ok("keep scales exit speed", Math.abs(F.shot(Object.assign({ type: "hood", Iw: 0.004, rw: 0.0508, w: 400, keep: 0.9 }, ball)).v - 0.9 * real.v) < 1e-9);
var fly = F.drive({ motor: "kraken60", n: 2, ratio: 1, eff: 0.95, statorA: 80 });
var sp = F.spin({ drive: fly, J: 0.004, w0: 0, target: 400 });
ok("spin-up finite", sp.time > 0.05 && sp.time < 3, sp.time);
// Near top speed the battery sag must not stall the simulation: 5,200 rpm is under this motor's free speed.
var hi = F.spin({ drive: fly, J: 0.004, w0: 0, target: 5200 * F.RPM });
ok("reaches a speed close to free speed", hi.time < Infinity && hi.time > sp.time, hi.time);
ok("cannot reach more than free speed", F.spin({ drive: fly, J: 0.004, w0: 0, target: 7000 * F.RPM }).time === Infinity);
var bu = F.burst({ drive: fly, target: 400, n: 5, rate: 6, shot: Object.assign({ type: "hood", Iw: 0.004, rw: 0.0508 }, ball) });
ok("burst: 5 shots", bu.shots.length === 5);
ok("burst: later shots no faster than the first", bu.shots[4].v <= bu.shots[0].v + 1e-9);

// Flight: no air gives the textbook range and apex.
var vac = F.fly({ v: 10, deg: 45, h0: 0, m: 0.215, r: 0.075, cd: 0, lift: false, dt: 0.0005 });
near("vacuum range", vac.range, 100 / F.G, 2e-3);
near("vacuum apex", vac.apex[1], 100 * 0.5 / (2 * F.G), 2e-3);
var air = F.fly({ v: 10, deg: 45, h0: 0, m: 0.215, r: 0.075 });
ok("drag shortens the shot", air.range < vac.range - 0.3, air.range);
var spun = F.fly({ v: 10, deg: 45, h0: 0, m: 0.215, r: 0.075, spin: 10 / 0.075 });
ok("backspin carries further than no spin", spun.range > air.range, spun.range);
ok("thin air carries further", F.fly({ v: 10, deg: 45, h0: 0, m: 0.215, r: 0.075, rho: F.air(5200) }).range > air.range);
near("air at sea level", F.air(0), 1.225, 1e-9);
ok("air at 5,200 ft about 1.05", Math.abs(F.air(5200) - 1.048) < 0.01, F.air(5200));

// Aim: the solved speed goes through the middle; the window edges just clip.
var tgt = { kind: "top", d: 3, h: 1.83, w: 1.06, r: 0.075 }, shot = { deg: 60, h0: 0.5, m: 0.215, r: 0.075 };
var aim = F.aim(shot, tgt);
ok("aim found", !!aim && aim.v > 5 && aim.v < 12, aim && aim.v);
near("aim: middle", aim.meet.miss, 0, 2e-3);
ok("aim: window brackets the speed", aim.lo < aim.v && aim.hi > aim.v);
var lowEdge = F.meet(F.fly(Object.assign({ v: aim.lo }, shot)).pts, tgt);
near("aim: slow edge just clears the near rim", lowEdge.room, 0, 4e-3);
// A shot too flat to clear the rim is not offered, even where a speed "reaches" the opening.
ok("close and flat: no shot", F.aim({ deg: 30, h0: 0.5, m: 0.215, r: 0.075 }, { kind: "top", d: 1.5, h: 1.83, w: 1.06, r: 0.075 }) === null);
ok("slanted entry needs more room than the radius", aim.meet.half < tgt.w / 2 - tgt.r && aim.meet.half > 0.3, aim.meet.half);
ok("too slow never arrives", F.meet(F.fly(Object.assign({ v: 3 }, shot)).pts, tgt) === null);
var front = F.aim({ deg: 30, h0: 0.5, m: 0.215, r: 0.075 }, { kind: "front", d: 4, h: 2, w: 0.8, r: 0.075 });
ok("front target aim", !!front && Math.abs(front.meet.miss) < 2e-3);
var best = F.bestAngle(shot, tgt, 45, 80, 35);
ok("best angle in range", best && best.deg >= 45 && best.deg <= 80, best && best.deg);
// Moving: standing still changes nothing; driving at the target shortens the shot; driving across needs a lead.
function sf(d) { var a = F.aim(shot, Object.assign({}, tgt, { d: d })); return a ? { v: a.v, time: a.meet.t } : null; }
var still = F.moving(3, 0, 0, sf);
near("moving: still", still.d, 3, 1e-9);
ok("moving: toward the target shoots shorter", F.moving(3, 0.5, 0, sf).d < 3);
ok("moving: across needs a lead", Math.abs(F.moving(3, 0, 2, sf).leadDeg) > 5);

// Belts: equal pulleys make it simple: C = (L - pi D) / 2.
var pd = F.beltPd(5, 24);
near("belt pitch diameter", pd, 24 * 5 / Math.PI / 25.4, 1e-12);
near("loop centre, equal pulleys", F.loopCenter(pd, pd, 100 * 5 / 25.4), (100 * 5 / 25.4 - Math.PI * pd) / 2, 1e-9);
var bl = F.belt({ pitch: 5, pld: 0.5715, n1: 16, n2: 24, target: 5, step: 5, min: 35, max: 400 });
ok("belt: nearest first", Math.abs(bl.options[0].err) <= Math.abs(bl.options[1].err));
// ReCalc lists 70 teeth at 4.915 in and 75 teeth at 5.408 in for these pulleys.
var b70 = bl.options.filter(function (o) { return o.teeth === 70; })[0], b75 = bl.options.filter(function (o) { return o.teeth === 75; })[0];
near("belt 70T centre (ReCalc 4.915)", b70.center, 4.915, 0.001);
near("belt 75T centre (ReCalc 5.408)", b75.center, 5.408, 0.001);
ok("belt teeth in mesh (ReCalc 7 and 12)", b70.mesh1 === 12 && b70.mesh2 === 7 || b70.mesh1 === 7 && b70.mesh2 === 12, b70.mesh1 + "," + b70.mesh2);
near("loop length round trip", F.loopLength(bl.pd1, bl.pd2, b70.center), 70 * 5 / 25.4, 1e-6);
var ch = F.chain({ pitch: 0.25, n1: 16, n2: 32, target: 6 });
ok("chain: even links", ch.options.every(function (o) { return o.links % 2 === 0; }));
near("sprocket pitch diameter", F.sprocketPd(0.25, 22), 0.25 / Math.sin(Math.PI / 22), 1e-12);
near("gear centre 20 DP 14:50", F.gearPair(14, 50, { dp: 20 }, 0.003).center, 1.603, 1e-9);

// ---- Findings from the independent review (Opus, 2026-11-18) ----
// A supply limit must not turn braking into a push.
var dsl = F.drive({ motor: "kraken60", n: 1, ratio: 1, eff: 1, supplyA: 40 }), brk = dsl.at(300, 12, -1);
ok("supply limit leaves braking alone", brk.torque < 0 && brk.statorA < 0 && brk.supplyA === 0, brk.torque);
// A load the brake cannot hold: the move has not "arrived", it has fallen.
var fall = F.move({ drive: big, J: 5, x0: 1.5, goal: 0, V: 12, Rbat: 0, ext: function () { return -1.2 * big.stallTorque(12); } });
ok("cannot stop is not an arrival", !fall.reached && fall.cannotStop === true && fall.time === Infinity);
// A tiny, quick move still arrives.
var tiny = F.move({ drive: F.drive({ motor: "kraken60", n: 2, ratio: 5, eff: 0.9, statorA: 80 }), J: 0.01, x0: 0, goal: 0.01, V: 12.3 });
ok("tiny move arrives", tiny.reached && tiny.time < 0.1, tiny.time);
// A steep, back-spun shot: more speed does not always carry further, and the search must still find the window.
var steepShot = { deg: 75, h0: 0.56, m: 0.215, r: 0.075, spinPer: 0.9 / 0.075 }, steepT = { kind: "top", d: 18 * F.FT, h: 1.83, w: 1.06, r: 0.075 };
var steep = F.aim(steepShot, steepT, 30);
ok("steep back-spun shot: a speed is found", !!steep && steep.meet.hit, steep && steep.v);
ok("steep: it is the first speed that reaches the middle", steep && F.meet(F.fly(Object.assign({ v: steep.v * 0.9, spin: steepShot.spinPer * steep.v * 0.9 }, steepShot)).pts, steepT) === null || steep && F.meet(F.fly(Object.assign({ v: steep.v * 0.9, spin: steepShot.spinPer * steep.v * 0.9 }, steepShot)).pts, steepT).miss < 0);
ok("steep: both edges score, just outside does not", [steep.lo + 0.02, steep.hi - 0.02].every(function (v) { return F.meet(F.fly(Object.assign({ v: v, spin: steepShot.spinPer * v }, steepShot)).pts, steepT).hit; }) && !F.meet(F.fly(Object.assign({ v: steep.hi + 0.05, spin: steepShot.spinPer * (steep.hi + 0.05) }, steepShot)).pts, steepT).hit);
// Too close: the ball meets the target's wall on the way up. That is not a score.
var closeT = { kind: "top", d: 4.5 * F.FT, h: 1.83, w: 1.06, r: 0.075 }, wallHits = 0, falseIn = 0, vv;
for (vv = 4; vv < 9; vv += 0.05) { var cm = F.meet(F.fly({ v: vv, deg: 62, h0: 0.56, m: 0.215, r: 0.075, spin: 12 * vv }).pts, closeT); if (cm && cm.wall) wallHits++; if (cm && cm.hit) { var pts2 = F.fly({ v: vv, deg: 62, h0: 0.56, m: 0.215, r: 0.075, spin: 12 * vv }).pts; pts2.forEach(function (q) { if (q[0] < cm.t && Math.hypot(q[1] - (closeT.d - 0.53), q[2] - 1.83) < 0.07) falseIn++; }); } }
ok("close shots that reach the wall are wall hits", wallHits > 5, wallHits);
ok("no shot scores through the rim", falseIn === 0, falseIn);
// Chain: two 16-tooth #25 sprockets and 64 links sit exactly 24 pitches (6 in) apart.
near("chain 16:16, 64 links", F.chainCenter(0.25, 16, 16, 64), 6, 1e-6);
near("chain links round trip", F.chainLinks(0.25, 16, 32, F.chainCenter(0.25, 16, 32, 72)), 72, 1e-6);
ok("chain centre a little more than the circle formula gave", F.chainCenter(0.25, 16, 32, 72) > F.loopCenter(F.sprocketPd(0.25, 16), F.sprocketPd(0.25, 32), 72 * 0.25));
// A burst survives a zero rate and a zero count.
ok("burst guards", F.burst({ drive: fly, target: 400, n: 0, rate: 0, shot: Object.assign({ type: "hood", Iw: 0.004, rw: 0.0508 }, ball) }).shots.length === 1);

console.log((n - fails) + " of " + n + " checks passed");
process.exit(fails ? 1 : 0);
