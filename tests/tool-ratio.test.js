/* Checks for the maths in js/tool-ratio.js. Run: node tests/tool-ratio.test.js */
"use strict";
var F = require("../js/frc.js"), M = require("../js/tool-ratio.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, tol) { ok(name, Math.abs(got - want) <= (tol == null ? 1e-6 : tol), got + ", want " + want); }

// The default train, worked by hand: 12:60 is 5:1, 18:54 is 3:1, so 15:1.
// Kraken X60 at 12 V: 6065 rpm free. Speeds: 6065, 6065 / 5 = 1213, 1213 / 3 = 404.33 rpm.
// Torque at a 60 A stator limit: kt = 7.16 / (374 - 2.8) = 0.0192888 N m/A, times (60 - 2.8) A = 1.10332 N m.
// After stage 1: 1.10332 x 5 x 0.97 = 5.35110; after stage 2: 5.35110 x 3 x 0.97 = 15.5717 N m.
var o = { motor: "kraken60", n: 1, V: 12, statorA: 60, effGear: 0.97, effPlanet: 0.93 };
var t = M.train([{ kind: "gear", a: 12, b: 60 }, { kind: "gear", a: 18, b: 54 }], o);
near("total reduction", t.total, 15, 1e-12);
near("motor speed", t.shafts[0].rpm, 6065, 1e-9);
near("speed after stage 1", t.shafts[1].rpm, 1213, 1e-9);
near("speed after stage 2", t.shafts[2].rpm, 404.3333, 1e-3);
near("motor torque at 60 A", t.shafts[0].torque, 7.16 / (374 - 2.8) * 57.2, 1e-9);
near("torque after stage 1", t.shafts[1].torque, 5.35110, 1e-4);
near("torque after stage 2", t.shafts[2].torque, 15.5717, 1e-3);
ok("two gear meshes: output turns as the motor", t.dirOut === 1 && t.shafts[1].dir === -1);
// Same answer as F.drive with the whole reduction and both efficiencies.
near("matches F.drive", t.torqueOut, F.drive({ motor: "kraken60", n: 1, ratio: 15, eff: 0.97 * 0.97, statorA: 60 }).at(0, 12, 1).torque, 1e-9);
// Belts, chain and planetary stages keep the direction; a planetary stage multiplies by its ratio.
var t2 = M.train([{ kind: "planet", p: 4 }, { kind: "belt", a: 18, b: 36 }, { kind: "chain", a: 16, b: 32 }], o);
near("planetary + belt + chain", t2.total, 16, 1e-12);
ok("planetary, belt, chain keep direction", t2.dirOut === 1 && t2.shafts.every(function (s) { return s.dir === 1; }));
near("planetary efficiency used", t2.eff, 0.93 * 0.97 * 0.97, 1e-12);
// A planetary stage's drawing teeth give its ratio: 1 + ring / sun.
M.PLANETS.forEach(function (R) { var z = M.planetTeeth(R); ok("planet teeth " + R, 1 + z.ring / z.sun === R && (z.ring + z.sun) % 3 === 0 && z.planet === (z.ring - z.sun) / 2); });

// Find: 15:1 from gears only, two stages, exact. 12:60, 18:54 is one of the exact answers.
var f = M.find({ target: 15, tol: 0.02, maxStages: 2, kinds: { gear: true }, minT: 8, maxT: 84 });
ok("find returns 12", f.length === 12, f.length);
ok("find: best is exact", Math.abs(f[0].ratio - 15) < 1e-9, f[0].ratio);
ok("find: all within 2%", f.every(function (c) { return Math.abs(c.ratio / 15 - 1) <= 0.02 + 1e-12; }));
ok("find: fewest stages first", f.every(function (c, i) { return !i || c.stages.length >= f[i - 1].stages.length; }));
var f2 = M.find({ target: 15, tol: 0.02, maxStages: 2, kinds: { gear: true }, minT: 12, maxT: 60, limit: 400 });
// The search keeps the smallest part set for each stage ratio, so 3:1 comes back as 14:42 rather than 18:54: an
// equally exact train, one size smaller.
ok("find: 12:60 then a 3:1 stage is among the exact trains", f2.some(function (c) { return c.stages[0].a === 12 && c.stages[0].b === 60 && c.stages.length === 2 && c.stages[1].b / c.stages[1].a === 3; }), f2.length);
ok("find: every result's reduction is right", f2.every(function (c) { return Math.abs(M.train(c.stages, o).total - c.ratio) < 1e-9; }));
// One stage when one stage does it.
var f3 = M.find({ target: 5, tol: 0, maxStages: 3, kinds: { gear: true }, minT: 8, maxT: 84 });
ok("find: one stage first", f3[0].stages.length === 1 && f3[0].ratio === 5, f3[0] && M.trainLabel(f3[0].stages));
// Nothing reaches 200:1 in two stages of 10 to 72 teeth; three stages of 8 to 84 do.
ok("find: none when out of reach", M.find({ target: 200, tol: 0.02, maxStages: 3, kinds: { gear: true }, minT: 10, maxT: 72 }).length === 0);
// Speed: the widest search (every kind, three stages, no error allowed) stays well under 50 ms.
var t0 = Date.now(); M.find({ target: 37.13, tol: 0, maxStages: 3, kinds: { gear: true, belt: true, chain: true, planet: true }, minT: 8, maxT: 84 });
var t1 = Date.now(); M.find({ target: 120, tol: 0.05, maxStages: 3, kinds: { gear: true, belt: true, chain: true, planet: true }, minT: 8, maxT: 84 });
ok("find is fast", Date.now() - t0 < 50, (t1 - t0) + " ms and " + (Date.now() - t1) + " ms");
// Cleaning a list from a link.
var c = M.clean([{ kind: "x", a: 3.5, b: "60" }, null, { kind: "planet", p: 6 }]);
ok("clean", c.length === 2 && c[0].kind === "gear" && c[0].a === 12 && c[0].b === 60 && c[1].p === 4, JSON.stringify(c));
ok("clean: empty gets one stage", M.clean([]).length === 1 && M.clean("no").length === 1);

// Fix round 5. The count is the whole set the best rows come from: the same as listing them all (gears, 15 : 1, 2%).
var cO = { target: 15, tol: 0.02, maxStages: 2, kinds: { gear: true }, minT: 10, maxT: 72 };
// (Round 7: the list merges orderings, so it is compared with the count of designs.)
ok("count of designs = every design listed", M.countDesigns(cO).n === M.find(Object.assign({ limit: 1e6 }, cO)).length && M.countDesigns(cO).exact, M.countDesigns(cO).n);
ok("orderings counted: at least the designs", M.count(cO) >= M.countDesigns(cO).n);
var cO3 = { target: 37, tol: 0.02, maxStages: 3, kinds: { gear: true }, minT: 10, maxT: 72 };
ok("count of designs = every design listed, three stages", M.countDesigns(cO3, 1e7).n === M.find(Object.assign({ limit: 1e6 }, cO3)).length, M.countDesigns(cO3, 1e7).n);
ok("past the cap, a floor of orderings / 6", (function () { var d = M.countDesigns(cO3, 10); return !d.exact && d.n === Math.ceil(M.count(cO3) / 6) && d.n <= M.countDesigns(cO3, 1e7).n; })());
// Parts and length, by hand: 12:60 and 18:54 at 20 DP sit (12 + 60) / 40 = 1.8 in and (18 + 54) / 40 = 1.8 in apart.
ok("length of 12:60, 18:54", Math.abs(M.length([{ kind: "gear", a: 12, b: 60 }, { kind: "gear", a: 18, b: 54 }]) - 3.6) < 1e-12);
ok("parts: gear 2, belt 3, planetary 1", M.parts([{ kind: "gear", a: 12, b: 60 }, { kind: "belt", a: 18, b: 36 }, { kind: "planet", p: 4 }]) === 6);
ok("smallest gear", M.smallGear([{ kind: "gear", a: 12, b: 60 }, { kind: "belt", a: 10, b: 36 }]) === 12);
// The knee: just below it the output torque is still the flat, limited value; just above it has fallen.
var kd = F.drive({ motor: "kraken60", n: 1, ratio: 15, eff: 0.97 * 0.97, statorA: 60 }), kr = M.kneeRpm("kraken60", 12, 60, 15), kf = kd.at(0, 12, 1).torque;
ok("knee: flat just below", Math.abs(kd.at(kr * 0.999 * F.RPM, 12, 1).torque - kf) < 1e-9);
ok("knee: falling just above", kd.at(kr * 1.01 * F.RPM, 12, 1).torque < kf - 1e-6);
ok("knee: none without a limit", M.kneeRpm("kraken60", 12, 0, 15) === null);
var srcR = require("fs").readFileSync(require("path").join(__dirname, "../js/tool-ratio.js"), "utf8");
ok("no file names in the notes", srcR.split("module.exports")[1].indexOf("frc.js") < 0);
// Round 6: among equally close trains, one with no gear under 14 teeth comes first, and its stages say so.
var fs = M.find({ target: 15, tol: 0.02, maxStages: 2, kinds: { gear: true }, minT: 8, maxT: 84 });
ok("find: the first exact train has no small pinion", fs[0].small >= M.SMALL && Math.abs(fs[0].ratio - 15) < 1e-9, M.trainLabel(fs[0].stages));
ok("find: small reported right", fs.every(function (c) { return c.small === M.smallGear(c.stages); }));
var f5 = M.find({ target: 5, tol: 0.1, maxStages: 1, kinds: { gear: true }, minT: 8, maxT: 84 });
ok("find: 14:70 before 8:40 at 5 : 1, both offered", M.trainLabel(f5[0].stages) === "14:70" && f5.some(function (c) { return M.trainLabel(c.stages) === "8:40"; }), f5.map(function (c) { return M.trainLabel(c.stages); }).join(" "));
ok("find: a closer train still beats one without a small pinion", f5.every(function (c, i) { return !i || Math.abs(c.err) >= Math.abs(f5[i - 1].err) - 1e-9; }));
// Round 7: the same stages in another order are one design, listed once and marked "either order".
var fd = M.find({ target: 15, tol: 0.02, maxStages: 2, kinds: { gear: true }, minT: 10, maxT: 72 });
var keys = fd.map(function (c) { return M.designKey(c.stages); });
ok("find: no design listed twice", keys.every(function (k, i) { return keys.indexOf(k) === i; }));
ok("design key ignores order", M.designKey([{ kind: "gear", a: 16, b: 56 }, { kind: "gear", a: 14, b: 60 }]) === M.designKey([{ kind: "gear", a: 14, b: 60 }, { kind: "gear", a: 16, b: 56 }]));
ok("find: 16:56, 14:60 is marked either order", fd.some(function (c) { return c.either && M.designKey(c.stages) === M.designKey([{ kind: "gear", a: 14, b: 60 }, { kind: "gear", a: 16, b: 56 }]); }));
ok("find: 18 teeth cannot drive from the motor, so 14:54, 18:70 is one order only", fd.filter(function (c) { return M.trainLabel(c.stages) === "14:54, 18:70"; }).every(function (c) { return !c.either; }));
console.log(fails ? fails + " of " + n + " checks failed" : "All " + n + " checks passed");
process.exit(fails ? 1 : 0);
