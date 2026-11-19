/* Checks for the Shooter's model (js/tool-shooter.js). Run: node tests/tool-shooter.test.js */
"use strict";
var M = require("../js/tool-shooter.js"), F = require("../js/frc.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= tol, got + ", want " + want); }
var s = { view: "shot", piece: "fuel26", bd: 5.91, bw: 0.474, bshape: "solid", cd: 0.47, type: "hood", wd: 4, rpm: 3300, deg: 62, h0: 22, wd2: 4, g2: 0.6, ww: 1, fw: 2, fd: 4, keep: 90, vin: 0,
  motor: "kraken60", motors: 2, ratio: 1, eff: 95, statorA: 60, tpreset: "hub26", tkind: "top", th: 72, tw: 41.7, dist: 10, alt: 5200, lift: true, brate: 5, bn: 8, hood: "fixed", degLo: 48, degHi: 76, dnear: 5, dfar: 22, vtoward: 0, vacross: 6 };
function with_(o) { return Object.assign({}, s, o); }

var r = M.one(s);
// Moment of inertia by hand: wheels 1 lb and flywheel 2 lb, both 4 in discs: 0.5 x 3 lb x (2 in)^2 = 6 lb in^2.
near("moment of inertia", r.U.Iw / F.LBIN2, 6, 1e-9);
// Exit speed by hand from the Team 449 formula, then 90% kept.
var Iw = 6 * F.LBIN2, rw = 2 * F.IN, mb = 0.474 * F.LB, rb = 5.91 / 2 * F.IN, w = 3300 * F.RPM;
var hand = 0.9 * (2 * Iw / rw * w) / (4 * Iw / (rw * rw) + 0.4 * mb + mb);
near("exit speed", r.shot.v, hand, 1e-9);
ok("default shot scores", r.meet && r.meet.hit);
ok("window brackets the default speed", r.rpmLo < 3300 && r.rpmHi > 3300, r.rpmLo + ".." + r.rpmHi);
near("rpmFor inverts the shot", M.rpmFor(r.U, r.shot.v), 3300, 1e-6);
ok("the wheel slows", r.shot.wAfter < r.w && r.shot.drop / r.w > 0.02 && r.shot.drop / r.w < 0.3);
ok("recovers and spins up", r.recov.time > 0 && r.recov.time < 1 && r.spinup.time > r.recov.time);
ok("energy: at most half reaches the ball", r.shot.eff > 0 && r.shot.eff <= 0.5);
// More speed lands longer; too little never reaches the rim.
ok("faster lands longer", M.one(with_({ rpm: 3450 })).meet.miss > r.meet.miss);
ok("far too slow never reaches", M.one(with_({ rpm: 1500 })).meet === null);
// A heavier flywheel loses less speed per ball; no flywheel loses more.
ok("flywheel weight steadies the wheel", M.one(with_({ fw: 6 })).shot.drop < r.shot.drop && M.one(with_({ fw: 0 })).shot.drop > r.shot.drop);
// Sea-level air is thicker: the same shot falls shorter there than at 5,200 ft.
ok("thicker air, shorter shot", M.one(with_({ alt: 0 })).meet.miss < r.meet.miss);
// A motor geared too slow cannot reach the speed.
ok("cannot reach speed when geared down", M.one(with_({ ratio: 3 })).spinup.time === Infinity);
// Two equal wheels at equal speed: no spin.
near("two wheels, equal: no spin", M.one(with_({ type: "dual", g2: 1 })).shot.spin, 0, 1e-9);
ok("two wheels, slower upper: backspin", M.one(with_({ type: "dual", g2: 0.6 })).shot.spin > 0);

// Calibrating: ask for the keep that reproduces a landing spot made with a known keep.
var landed = M.flight(M.setup(with_({ keep: 78 })), F.shot(Object.assign({}, M.setup(with_({ keep: 78 })).sp, { w: 3300 * F.RPM })).v).range / F.FT;
near("keepFor recovers the keep", M.keepFor(s, landed), 78, 0.11);

// Findings from the independent review: a steep hood still finds its window, and a too-close shot is a wall hit.
var st70 = M.one(with_({ deg: 70, rpm: 3500 }));
ok("70 degrees: scores and has a window", st70.meet && st70.meet.hit && st70.aim && st70.rpmLo < 3500 && st70.rpmHi > 3500, st70.aim && st70.rpmLo + ".." + st70.rpmHi);
ok("fixed hood at 70 degrees: the map finds distances", M.map(with_({ view: "map", deg: 70 }), st70).good.length > 8);
var wallShot = M.one(with_({ dist: 4.5, rpm: 2650 }));
ok("4.5 ft at 2,650 rpm hits the wall, not the middle", wallShot.meet && wallShot.meet.wall && !wallShot.meet.hit);
ok("with a feeder the ball can get more than half", M.one(with_({ vin: 10, keep: 100 })).shot.eff > 0.5);

// Rapid fire: a starved wheel misses later balls; the stock one does not.
var b = M.burst(with_({ view: "burst" }), r);
ok("stock burst all in", b.hits === 8 && b.best > 5, b.hits + ", best " + b.best);
var weak = with_({ motors: 1, statorA: 20, rpm: 3120, brate: 10 }), rw2 = M.one(weak), b2 = M.burst(weak, rw2);
ok("starved burst: first in, a later one out", b2.shots[0].hit && b2.hits < 8, b2.hits);
ok("starved burst: best rate below the asked rate", b2.best < 10, b2.best);

// Every distance: further needs more speed; each row's speed really scores from its distance.
var mp = M.map(with_({ view: "map" }), r);
ok("map has rows", mp.good.length >= 10, mp.good.length);
ok("further needs more speed", mp.good.every(function (x, i) { return !i || x.rpm > mp.good[i - 1].rpm; }));
var mid = mp.good[6], chk = M.one(with_({ dist: mid.d, rpm: mid.rpm }));
ok("a row's speed scores from its distance", chk.meet && chk.meet.hit && Math.abs(chk.meet.miss) < 0.03, chk.meet && chk.meet.miss);
var adj = M.map(with_({ view: "map", hood: "adj" }), r);
ok("adjustable hood: angles inside the range", adj.good.every(function (x) { return x.deg >= 48 && x.deg <= 76; }));

// While driving: standing still needs no lead; driving right needs a lead to the left and a longer shot.
var mv0 = M.move(with_({ vacross: 0, vtoward: 0 }), r, mp);
near("still: no lead", mv0.lead.leadDeg, 0, 1e-9);
var mv = M.move(s, r, mp);
ok("driving right: aim left, shoot longer", mv.lead.leadDeg < -10 && mv.lead.d > r.target.d, mv.lead.leadDeg);
// The lead cancels the robot's motion: launcher velocity plus robot velocity carries the ball to the target.
var a = mv.lead.leadDeg * Math.PI / 180, hv = mv.lead.d / mv.lead.time, vx = hv * Math.sin(a) + 6 * F.FT, vy = hv * Math.cos(a);
near("lead cancels sideways motion", vx * mv.lead.time, 0, 0.02);
near("and covers the distance", vy * mv.lead.time, r.target.d, 0.02);

// The driving speeds that score. A made-up shooter that scores from 2 to 6 m with a flight of exactly 1 s, so the
// sums can be done by hand. From 3 m: driving at the target shortens the shot by v x 1 s, and it must stay 2 m or
// more, so 1 m/s = 3.28 ft/s (3.2 on the 0.1 ft/s steps); backing away lengthens it to at most 6 m, so 3 m/s =
// 9.84 ft/s (9.8); across, sqrt(9 + v^2) <= 6 gives 5.2 m/s = 17 ft/s, past the 14 ft/s the sliders reach.
function sf1(d) { return d < 2 - 1e-9 || d > 6 + 1e-9 ? null : { v: 8, time: 1 }; }
var E = M.envelope(3, 0, 0, sf1);
near("envelope: fastest toward", E.toward, 3.2, 1e-9);
near("envelope: fastest backing away", E.away, 9.8, 1e-9);
near("envelope: across runs to the sliders' end", E.across, M.LIM, 1e-9);
ok("envelope: standing still has no heading", E.heading === null);
// Backing away at 12 ft/s is past the limit, so no across speed scores at that toward speed, and the heading limit
// is the backing-away one.
var E2 = M.envelope(3, -12, 0, sf1);
near("envelope: nothing across when already too fast", E2.across, 0, 1e-9);
near("envelope: heading limit is the backing-away limit", E2.heading, 9.8, 1e-9);
// The zone is the same test on a grid: (0, 0) is in it, 12 ft/s backing away is not.
function inZone(Z, t, a) { return Z.zone.some(function (z) { return Math.abs(z[0] - t) < 1e-9 && a >= z[1] - 1e-9 && a <= z[2] + 1e-9; }); }
ok("zone: standing still scores", inZone(E, 0, 0));
ok("zone: 9.5 back scores, 10 back does not, 3 toward scores, 3.5 toward does not", inZone(E, -9.5, 0) && !inZone(E, -10, 0) && inZone(E, 3, 0) && !inZone(E, 3.5, 0));
// The real shooter: the default drive (6 ft/s across) scores and sits inside its own limits; 12 ft/s backing away
// with 8 across does not, and the page then says what would.
ok("default drive is inside its limits", mv.env.across >= 6 && mv.env.heading >= 6 && !mv.out, mv.env.across);
var mvx = M.move(with_({ vtoward: -12, vacross: 8 }), r, mp);
ok("too fast: out, with a slower speed that works on the same heading", mvx.out && mvx.env.heading > 0 && mvx.env.heading < mvx.speed, mvx.env.heading);
ok("too fast: the shot it would need is past the standing range", mvx.need > mvx.env.range[1], mvx.need);
var kh = mvx.env.heading / mvx.speed, back = M.move(with_({ vtoward: -12 * kh, vacross: 8 * kh }), r, mp);
ok("slowing to the heading limit scores", back && !back.out);

console.log((n - fails) + " of " + n + " checks passed");
process.exit(fails ? 1 : 0);
