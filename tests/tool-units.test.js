/* Checks for the Units and code constants maths (js/tool-units.js). Run: node tests/tool-units.test.js
   Round trips: every unit converted to every other and back gives the number it started with. Known answers from
   the definitions: 1 in = 25.4 mm, 1 lbf = 4.4482216 N, 1 ft lbf = 1.3558179 N m, 1 psi = 6.8947573 kPa,
   60 mph = 88 ft/s, 1 rotation/s = 60 rpm = 360 deg/s, 1 lb in² = 2.9263965e-4 kg m². */
"use strict";
var M = require("../js/tool-units.js"), fails = 0, n = 0;
function ok(name, cond, got) { n++; if (!cond) { fails++; console.log("FAIL " + name + (got !== undefined ? " (got " + got + ")" : "")); } }
function near(name, got, want, rel) { ok(name, Math.abs(got - want) <= Math.abs(want) * (rel || 1e-9), got + ", want " + want); }

M.KINDS.forEach(function (k) {
  k.units.forEach(function (a) {
    k.units.forEach(function (b) {
      var x = 3.7, there = M.convert(k.id, x, a[0])[b[0]], back = M.convert(k.id, there, b[0])[a[0]];
      near("round trip " + k.id + " " + a[0] + " to " + b[0], back, x, 1e-12);
    });
    near("identity " + k.id + " " + a[0], M.convert(k.id, 5, a[0])[a[0]], 5, 1e-15);
  });
});
near("1 in = 25.4 mm", M.convert("length", 1, "in").mm, 25.4);
near("1 ft = 12 in", M.convert("length", 1, "ft")["in"], 12);
near("1 lb = 16 oz", M.convert("mass", 1, "lb").oz, 16);
near("1 lbf in N", M.convert("force", 1, "lbf").N, 4.4482216152605);
near("1 lb ft in N m", M.convert("torque", 1, "lbft").Nm, 1.3558179483, 1e-9);
near("1 lb ft = 12 lb in", M.convert("torque", 1, "lbft").lbin, 12);
near("1 lb in = 16 oz in", M.convert("torque", 1, "lbin").ozin, 16);
near("1 psi in kPa", M.convert("pressure", 1, "psi").kPa, 6.894757293, 1e-9);
near("1 bar = 100 kPa", M.convert("pressure", 1, "bar").kPa, 100);
near("60 mph = 88 ft/s", M.convert("speed", 60, "mph").fps, 88);
near("1 rotation/s = 60 rpm", M.convert("turn", 1, "rps").rpm, 60);
near("1 rotation/s = 360 deg/s", M.convert("turn", 1, "rps").degs, 360);
near("1 lb in² in kg m²", M.convert("moi", 1, "lbin2").kgm2, 2.9263965e-4, 1e-7);

// Mechanisms: 12:1 onto a 1.5 in spool, 2x rigging: π × 1.5 × 0.0254 × 2 ÷ 12 = 0.0199491 m per motor rotation.
var sp = M.mech({ kind: "spool", ratio: 12, dia: 1.5, rig: 2, rpm: 6000 });
near("spool per motor rotation", sp.perRot, Math.PI * 1.5 * 0.0254 * 2 / 12, 1e-12);
near("spool per motor rotation (hand)", sp.perRot, 0.0199491, 1e-5);
near("spool speed per rpm", sp.perRpm, sp.perRot / 60, 1e-12);
near("spool max speed", sp.max, 0.0199491 * 100, 1e-5);
var wh = M.mech({ kind: "wheel", ratio: 6.75, dia: 4, rig: 3, rpm: 6000 });
near("wheel ignores rigging", wh.perRot, Math.PI * 4 * 0.0254 / 6.75, 1e-12);
var arm = M.mech({ kind: "arm", ratio: 100, rpm: 6000 });
near("arm degrees per motor rotation", arm.perRotDeg, 3.6);
near("arm radians per motor rotation", arm.perRot, 2 * Math.PI / 100);
near("arm max speed: 60 rpm out = 360 deg/s", arm.maxDeg, 360);

console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(fails ? 1 : 0);
