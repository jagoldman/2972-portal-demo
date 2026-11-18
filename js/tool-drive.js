/* Tools: Drivetrain (#tool-drive). Race two gearings over a sprint and see which one gets there first, with wheel
   slip, the current limit and battery sag included. The drawing is the race from above, to scale. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");

/* ---------- The maths (SI units, no page code) ---------- */
var M = {};
/* The battery voltage while the motors pull from it, solved in the same step (not from the step before, which swings
   between two values when the current is large). dr: an F.drive, w: output speed (rad/s), V0: battery at rest,
   Rb: battery and wiring resistance (ohms). Below the current limit each motor draws (V - e) / R; at the limit it
   draws Ls (Ls R + e) / V, so V comes from a quadratic. */
M.battery = function (dr, w, V0, Rb) {
  var m = dr.motor, n = dr.n, R = m.R, e = m.ke * w * dr.ratio, Ls = dr.statorA;
  if (!Rb || e >= V0) return V0;
  var k = Rb * n / R, V = (V0 + k * e) / (1 + k);            // no limit: V = V0 - Rb n (V - e) / R
  if (!Ls || (V - e) / R <= Ls) return V;
  var c = Rb * n * Ls * (Ls * R + e), disc = V0 * V0 - 4 * c; // at the limit: V^2 - V0 V + c = 0, the higher root
  return disc > 0 ? (V0 + Math.sqrt(disc)) / 2 : V0 / 2;
};
/* A standing-start sprint at full power. o: { drive (F.drive), m (kg), r (wheel radius, m), grip (N: the most the
   driven wheels can push before they spin), drag (N of rolling drag), V0, Rb, tmax (s), dist (m, stop there; omit to
   run for tmax), dt }. Returns arrays t, x, v, a (SI), amps (stator, per motor), volts, slip (true while the motors
   could push harder than the wheels grip), and dist, time (to dist, or Infinity). */
/* The forces at speed v (m/s), the same for the sprint and for top speed: the motors' push with the battery solved,
   capped by grip, less rolling drag. Returns { net (N), push, slip, V, q (the motor's answer) }. */
M.force = function (o, v) {
  var dr = o.drive, V0 = o.V0 == null ? 12.3 : o.V0, Rb = o.Rb == null ? 0.02 : o.Rb;
  var w = v / o.r, V = M.battery(dr, w, V0, Rb), q = dr.at(w, V, 1), push = q.torque / o.r;
  var slip = push > o.grip, f = slip ? o.grip : push;
  // Rolling drag only once it rolls (eased in over the first 5 cm/s), so a weak drive creeps rather than reverses.
  return { net: f - (o.drag || 0) * F.clamp(v / 0.05, 0, 1), push: push, slip: slip, V: V, q: q };
};
/* Top speed (m/s): the speed where the push has fallen to the drag, by bisection on M.force. Above the free speed at
   the battery's resting voltage the motors push back, so the answer lies between 0 and that. */
M.topSpeed = function (o) {
  var lo = 0, hi = o.drive.freeSpeed(o.V0 == null ? 12.3 : o.V0) * o.r * 1.01 + 1e-6;
  if (M.force(o, hi).net > 0) return hi;
  for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (M.force(o, mid).net > 0) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
};
M.sprint = function (o) {
  var dt = o.dt || 0.002, tmax = o.tmax || 8;
  var out = { t: [], x: [], v: [], a: [], amps: [], volts: [], slip: [], time: Infinity };
  var t = 0, x = 0, v = 0;
  while (t <= tmax + 1e-9) {
    var fo = M.force(o, v), a = fo.net / o.m;
    if (v <= 0 && a < 0) a = 0;
    out.t.push(t); out.x.push(x); out.v.push(v); out.a.push(a); out.amps.push(Math.abs(fo.q.statorA)); out.volts.push(fo.V); out.slip.push(fo.slip);
    if (o.dist != null && x >= o.dist) break;
    v += a * dt; x += v * dt; t += dt;
  }
  var n = out.x.length;
  if (o.dist != null && out.x[n - 1] >= o.dist) out.time = M.timeAt(out, o.dist);
  return out;
};
// Time at which a sprint reaches distance d (m), or Infinity.
M.timeAt = function (sim, d) { var n = sim.x.length; if (!n || sim.x[n - 1] < d) return Infinity; return d <= 0 ? 0 : F.interp(sim.x, sim.t, d); };
M.at = function (sim, key, t) { return F.interp(sim.t, sim[key], t); };
/* Everything about one gearing. o: { motor, n, ratio, eff, statorA, m, r, grip, drag, V0, Rb, dist } */
M.lane = function (o) {
  var dr = F.drive({ motor: o.motor, n: o.n, ratio: o.ratio, eff: o.eff, statorA: o.statorA });
  var sim = M.sprint({ drive: dr, m: o.m, r: o.r, grip: o.grip, drag: o.drag, V0: o.V0, Rb: o.Rb, tmax: 8 });
  var L = { ratio: o.ratio, sim: sim, drive: dr };
  L.time = M.timeAt(sim, o.dist);
  L.reached = isFinite(L.time);
  var tEnd = L.reached ? L.time : sim.t[sim.t.length - 1], i, n = sim.t.length;
  L.vLine = L.reached ? M.at(sim, "v", L.time) : NaN;
  L.top = M.topSpeed({ drive: dr, m: o.m, r: o.r, grip: o.grip, drag: o.drag, V0: o.V0, Rb: o.Rb });   // push = drag
  L.sampleTop = sim.v[n - 1];                             // how fast the 8 s run got (it may still be speeding up)
  L.free = dr.freeSpeed(12) * o.r;                        // the catalogue figure: 12 V, no load
  L.acc0 = sim.a[0];
  L.peakA = 0; L.minV = Infinity;
  for (i = 0; i < n && sim.t[i] <= tEnd + 1e-9; i++) { L.peakA = Math.max(L.peakA, sim.amps[i]); L.minV = Math.min(L.minV, sim.volts[i]); }
  // Wheel slip at the start: until what speed and over what distance.
  L.slipEnd = -1;
  for (i = 0; i < n && sim.slip[i]; i++) L.slipEnd = i;
  L.slipT = L.slipEnd >= 0 ? sim.t[L.slipEnd] : 0; L.slipV = L.slipEnd >= 0 ? sim.v[L.slipEnd] : 0; L.slipX = L.slipEnd >= 0 ? sim.x[L.slipEnd] : 0;
  // Pushing against a wall at the current limit: the motors' force, against what the wheels can grip.
  L.push = dr.at(0, M.battery(dr, 0, o.V0, o.Rb), 1).torque / o.r;
  L.grip = o.grip;
  return L;
};
/* The sentence after the winner: where the lead changes, or that it does not, but only as far as the crossings were
   searched (searched, m). cross from M.crossings, dist (m) the sprint, wn the winner's letter. */
M.leadText = function (cross, dist, searched, wn) {
  var after = cross.filter(function (c) { return c.d > dist; }), before = cross.filter(function (c) { return c.d <= dist; });
  if (after.length) return after[0].ahead + " is ahead after " + Math.round(after[0].d / F.FT) + " ft.";
  if (before.length) return wn + " is behind at first and takes the lead at " + Math.round(before[before.length - 1].d / F.FT) + " ft.";
  return wn + " stays ahead on any run up to " + Math.floor(searched / F.FT) + " ft, as far as this looks.";
};
/* Where the lead changes: distances (m) at which the two time-over-distance curves cross, from 0 to xmax. */
M.crossings = function (simA, simB, xmax, step) {
  var out = [], prev = 0, d;
  step = step || 0.05;
  for (d = step; d <= xmax; d += step) {
    var diff = M.timeAt(simA, d) - M.timeAt(simB, d);
    if (!isFinite(diff)) break;
    var sg = Math.abs(diff) < 2e-4 ? 0 : diff < 0 ? -1 : 1;   // -1: A ahead, 1: B ahead
    if (sg && prev && sg !== prev) out.push({ d: d, ahead: sg < 0 ? "A" : "B" });
    if (sg) prev = sg;
  }
  return out;
};

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The page ---------- */
var K = D.calc, ID = "tool-drive", esc = D.esc;
var PRESETS = [
  ["mk4i-l1", "SDS MK4i L1", 8.14], ["mk4i-l2", "SDS MK4i L2", 6.75], ["mk4i-l3", "SDS MK4i L3", 6.12],
  ["mk4n-l1", "SDS MK4n L1+", 7.13], ["mk4n-l2", "SDS MK4n L2+", 5.90], ["mk4n-l3", "SDS MK4n L3+", 5.36],
  ["mk5n-r1", "SDS MK5n R1", 7.03], ["mk5n-r2", "SDS MK5n R2", 6.03], ["mk5n-r3", "SDS MK5n R3", 5.27],
  ["max-low", "REV MAXSwerve low", 5.50, 3], ["max-med", "REV MAXSwerve medium", 5.08, 3], ["max-high", "REV MAXSwerve high", 4.71, 3]
];
function preset(id) { return PRESETS.filter(function (p) { return p[0] === id; })[0]; }
function matchPreset(ratio, cur) {
  var p = preset(cur); if (p && Math.abs(p[2] - ratio) < 1e-9) return cur;
  var m = PRESETS.filter(function (q) { return Math.abs(q[2] - ratio) < 1e-9; })[0]; return m ? m[0] : "custom";
}
function laneName(s, k) { var p = preset(s["preset" + k]); return p ? p[1] : "Custom"; }
var FT = F.FT, LBF = F.LBF;
function ft(x) { return x / FT; }
function fts(v) { return K.fix(v / FT, 1); }

K.tool({
  id: ID,
  defaults: { lb: 135, wheel: 4, grip: 1.1, driven: "all", share: 100, motor: "kraken60", motors: 4, statorA: 60, eff: 90,
    presetA: "mk4i-l2", ratioA: 6.75, presetB: "mk4i-l3", ratioB: 6.12, dist: 15, V0: 12.3, Rbat: 0.02, drag: 6 },
  stage: { ratio: 2.4, narrow: 2, label: "The race from above, to scale: robot A and robot B on two lanes of carpet, with a mark every 5 feet and the finish line." },
  autoplay: true,
  onPick: function (key, v, s) {
    if (key === "presetA" || key === "presetB") {
      var p = preset(v), k = key.slice(-1);
      if (p) { s["ratio" + k] = p[2]; if (p[3]) s.wheel = p[3]; }
    }
  },

  compute: function (s) {
    var m = s.lb * F.LB, r = s.wheel * F.IN / 2, share = s.driven === "all" ? 1 : F.clamp(s.share, 0, 100) / 100;
    var grip = s.grip * m * F.G * share, dist = s.dist * FT;
    var base = { motor: s.motor, n: s.motors, eff: s.eff / 100, statorA: s.statorA, m: m, r: r, grip: grip, drag: s.drag * LBF, V0: s.V0, Rb: s.Rbat, dist: dist };
    var A = M.lane(Object.assign({}, base, { ratio: s.ratioA })), B = M.lane(Object.assign({}, base, { ratio: s.ratioB }));
    A.name = laneName(s, "A"); B.name = laneName(s, "B");
    var xmax = Math.min(A.sim.x[A.sim.x.length - 1], B.sim.x[B.sim.x.length - 1]);
    var searched = Math.min(xmax, 120 * FT), r0 = { A: A, B: B, dist: dist, grip: grip, m: m, r: r, searched: searched, cross: M.crossings(A.sim, B.sim, searched) };
    // Time over this distance for other reductions.
    var lo = Math.min(4, s.ratioA, s.ratioB), hi = Math.max(10, s.ratioA, s.ratioB), sweep = [], best = null;
    for (var i = 0; i <= 48; i++) {
      var G = lo + (hi - lo) * i / 48, dr = F.drive({ motor: s.motor, n: s.motors, ratio: G, eff: s.eff / 100, statorA: s.statorA });
      var sp = M.sprint({ drive: dr, m: m, r: r, grip: grip, drag: s.drag * LBF, V0: s.V0, Rb: s.Rbat, tmax: 8, dist: dist, dt: 0.003 });
      sweep.push([G, sp.time]); if (isFinite(sp.time) && (!best || sp.time < best[1])) best = [G, sp.time];
    }
    r0.sweep = sweep; r0.best = best;
    var tA = A.reached ? A.time : 8, tB = B.reached ? B.time : 8;
    r0.win = !A.reached && !B.reached ? null : tA <= tB ? "A" : "B";
    r0.dur = Math.min(8.3, Math.max(tA, tB) + 0.35);
    return r0;
  },

  controls: function (s) {
    var opts = PRESETS.map(function (p) { return [p[0], p[1] + " (" + p[2].toFixed(2) + (p[3] ? ", 3 in wheel" : "") + ")"]; }).concat([["custom", "Custom"]]);
    var hint = "Ratios as published. Check your module's sheet.";
    var gear = K.pick(ID, "presetA", "Gearing A", opts, { hint: hint }) + K.num(ID, "ratioA", "Reduction A", { unit: ": 1", min: 1, max: 20, step: 0.01, hintId: "drv-hA", tip: "Motor turns for one turn of the wheel." }) +
      K.pick(ID, "presetB", "Gearing B", opts) + K.num(ID, "ratioB", "Reduction B", { unit: ": 1", min: 1, max: 20, step: 0.01, hintId: "drv-hB", tip: "Motor turns for one turn of the wheel." });
    var run = K.num(ID, "dist", "Sprint distance", { unit: "ft", min: 3, max: 54, step: 0.5, slider: true, tip: "From a standing start. The field is about 54 ft long; a dash across the middle is often 15 to 25 ft." });
    var robot = K.num(ID, "lb", "Weight", { unit: "lb", min: 40, max: 200, step: 1, slider: true, tip: "With battery and bumpers." }) +
      K.num(ID, "wheel", "Wheel diameter", { unit: "in", min: 2, max: 8, step: 0.05, tip: "Measure a used wheel; tread wears it down.", hintId: "drv-hW" }) +
      K.num(ID, "grip", "Wheel grip on carpet", { min: 0.3, max: 2, step: 0.05, slider: true, tip: "Friction coefficient: the most push the wheels give, as a share of the weight on them. 1.0 to 1.3 for tread on carpet; lower when it is worn." }) +
      K.seg(ID, "driven", "Driven wheels", [["all", "All wheels (swerve)"], ["some", "Some"]]) +
      (s.driven === "some" ? K.num(ID, "share", "Weight on driven wheels", { unit: "%", min: 10, max: 100, step: 1, tip: "Only the weight on the driven wheels gives them grip." }) : "");
    return K.group(ID, "gear", "Gearings to race", gear) + K.group(ID, "run", "Run", run) + K.group(ID, "robot", "Robot", robot) +
      K.group(ID, "motors", "Drive motors", K.motorFields(ID, { noRatio: true })) +
      K.group(ID, "adv", "Fine tuning", K.num(ID, "V0", "Battery at rest", { unit: "V", min: 10, max: 13.5, step: 0.1 }) +
        K.num(ID, "Rbat", "Battery resistance", { unit: "Ω", min: 0, max: 0.06, step: 0.001, tip: "The battery's own resistance plus the main wiring. 0.015 to 0.025 ohms for a good battery and short 6 AWG leads." }) +
        K.num(ID, "drag", "Rolling drag", { unit: "lbf", min: 0, max: 40, step: 0.5, tip: "The force it takes to keep the robot rolling: tread on carpet, module friction. A rule of thumb, not a measurement." }), true);
  },

  hints: function (s, r) {
    // Keep each dropdown on the preset its number matches, or on Custom when someone types their own.
    ["A", "B"].forEach(function (k) { s["preset" + k] = matchPreset(s["ratio" + k], s["preset" + k]); var el = document.getElementById("c-preset" + k); if (el) el.value = s["preset" + k]; });
    var pa = preset(s.presetA), pb = preset(s.presetB), mixed = pa && pb && !!pa[3] !== !!pb[3];
    function fr(L) { return L ? "Free speed " + fts(L.free) + " ft/s" : ""; }
    return { "drv-hA": fr(r && r.A), "drv-hB": fr(r && r.B),
      "drv-hW": mixed ? "MAXSwerve ratios are for a 3 in wheel and SDS ones for 4 in. Both race on this wheel." : "" };
  },

  outs: function (s, r) {
    var A = r.A, B = r.B, d = s.dist, state = "info", text;
    if (!A.reached && !B.reached) return K.verdict("bad", "Neither gearing gets the robot to " + d + " ft in 8 s. Check the current limit and the weight.");
    var W = r.win === "A" ? A : B, Lo = r.win === "A" ? B : A, wn = r.win, ln = wn === "A" ? "B" : "A";
    if (!Lo.reached) { state = "bad"; text = ln + " cannot get the robot to " + d + " ft in 8 s; " + wn + " takes " + K.fix(W.time, 2) + " s."; }
    else if (Math.abs(A.time - B.time) < 0.005) text = "A and B reach " + d + " ft together, within 0.005 s.";
    else {
      var back = ft(r.dist - M.at(Lo.sim, "x", W.time));
      text = Lo.time - W.time < 0.05 ? "Too close to call over " + d + " ft: " + wn + " is ahead by " + K.fix(Lo.time - W.time, 3) + " s (about " + K.fix(back, 1) + " ft), less than a driver's reaction." : wn + " gets to " + d + " ft first, " + K.fix(Lo.time - W.time, 2) + " s ahead of " + ln + " (about " + K.fix(back, 1) + " ft).";
    }
    if (Lo.reached && Math.abs(A.time - B.time) >= 0.005) {
      text += " " + M.leadText(r.cross, r.dist, r.searched, wn);
    }
    var low = Math.min(A.minV, B.minV);
    if (low < 7 && state !== "bad") { state = "warn"; text += " The battery drops to " + K.fix(low, 1) + " V, " + (low < 6.8 ? "below" : "close to") + " the 6.8 V where the roboRIO cuts the motors (a brownout), so a real robot would not run this fast: lower the current limit or add a supply limit."; }
    function two(a, b, n) { return K.fix(a, n) + " / " + K.fix(b, n); }
    return K.verdict(state, text) + K.outs([
      { k: "Time to " + d + " ft", v: two(A.time, B.time, Math.abs(A.time - B.time) < 0.05 ? 3 : 2), u: "s", sub: "A / B", tip: "From a standing start, full power all the way." },
      { k: "Speed at the line", v: two(A.vLine / FT, B.vLine / FT, 1), u: "ft/s", sub: two(A.vLine, B.vLine, 2) + " m/s" },
      { k: "Top speed", v: two(A.top / FT, B.top / FT, 1), u: "ft/s", sub: "free speed " + two(A.free / FT, B.free / FT, 1), tip: "The speed where the motors' push has fallen to the rolling drag, with battery sag. Free speed is the catalogue figure: 12 V and no load." },
      { k: "Wheels slip until", v: (A.slipEnd < 0 ? "never" : fts(A.slipV)) + " / " + (B.slipEnd < 0 ? "never" : fts(B.slipV)), u: A.slipEnd < 0 && B.slipEnd < 0 ? "" : "ft/s", sub: "launch " + two(A.acc0 / F.G, B.acc0 / F.G, 2) + " g", state: A.slipEnd >= 0 || B.slipEnd >= 0 ? "" : "ok", tip: "While the motors could push harder than the tread grips, the wheels spin on the carpet and grip sets the acceleration." }
    ]);
  },

  more: function (s, r) {
    var A = r.A, B = r.B, sd = s.dist;
    function row(label, a, b, tip) { return "<tr><td" + (tip ? ' class="abbr" tabindex="0" data-tip="' + esc(tip) + '"' : "") + ">" + esc(label) + '</td><td class="r num">' + a + '</td><td class="r num">' + b + "</td></tr>"; }
    function both(f) { return [f(A, "A"), f(B, "B")]; }
    function slipTxt(L) { return L.slipEnd < 0 ? "No" : "Until " + fts(L.slipV) + " ft/s, first " + K.fix(ft(L.slipX), 1) + " ft"; }
    function pushTxt(L) { return K.n(L.push / LBF, 0) + " lbf (" + (L.push > L.grip ? "wheels slip first" : "motors limit first") + ")"; }
    function bold(L, k, txt) { return r.win === k && A.reached && B.reached && Math.abs(A.time - B.time) >= 0.005 ? "<b>" + txt + "</b>" : txt; }
    var rows = [
      ["Reduction", both(function (L, k) { return esc(K.fix(L.ratio, 2) + ":1 (" + L.name + ")"); })],
      ["Time over " + sd + " ft", both(function (L, k) { return bold(L, k, L.reached ? K.fix(L.time, 2) + " s" : "Not in 8 s"); })],
      ["Speed at the line", both(function (L) { return fts(L.vLine) + " ft/s (" + K.fix(L.vLine, 2) + " m/s)"; })],
      ["Top speed", both(function (L) { return fts(L.top) + " ft/s (" + K.fix(L.top, 2) + " m/s)"; }), "Where the push has fallen to the rolling drag."],
      ["Free speed", both(function (L) { return fts(L.free) + " ft/s (" + K.fix(L.free, 2) + " m/s)"; }), "Motor free speed at 12 V through the reduction, with no load. No robot reaches it."],
      ["Launch acceleration", both(function (L) { return K.fix(L.acc0 / FT, 1) + " ft/s² (" + K.fix(L.acc0 / F.G, 2) + " g)"; })],
      ["Wheels slip", both(slipTxt), "Grip-limited: the motors could push harder than the tread holds."],
      ["Peak current per motor", both(function (L) { return K.n(L.peakA, 0) + " A"; }), "Stator current over the sprint. While the wheels slip this is what the motors would draw if the wheels held; spinning wheels draw a little less."],
      ["Lowest battery", both(function (L) { return K.fix(L.minV, 1) + " V"; }), "The roboRIO starts cutting motor output at 6.8 V."],
      ["Pushing force at the limit", both(pushTxt), "Pushing against a wall: what the motors give at the current limit. Grip allows " + K.n(r.grip / LBF, 0) + " lbf; whichever is lower gives first."]
    ];
    var table = '<section class="ctab"><h2>A and B side by side</h2><div class="scroll"><table><thead><tr><th></th><th class="r"><span class="t-drive-key a"></span>A</th><th class="r"><span class="t-drive-key b"></span>B</th></tr></thead><tbody>' +
      rows.map(function (q) { return row(q[0], q[1][0], q[1][1], q[2]); }).join("") + "</tbody></table></div></section>";
    var dur = r.dur;
    function pts(L, key, k) { var o = [], sim = L.sim; for (var i = 0; i < sim.t.length && sim.t[i] <= dur + 1e-9; i += 5) o.push([sim.t[i], sim[key][i] * k]); return o; }
    var sA = { name: "A " + K.fix(A.ratio, 2), color: 1 }, sB = { name: "B " + K.fix(B.ratio, 2), color: 2 };
    var x = { label: "time (s)", name: "Time", unit: "s", min: 0, max: dur };
    var speed = K.chart({ id: "drv-v", title: "Speed", x: x, y: { label: "ft/s", unit: "ft/s" }, series: [Object.assign({ pts: pts(A, "v", 1 / FT) }, sA), Object.assign({ pts: pts(B, "v", 1 / FT) }, sB)] });
    var dist = K.chart({ id: "drv-x", title: "Distance", x: x, y: { label: "ft", unit: "ft" }, series: [Object.assign({ pts: pts(A, "x", 1 / FT) }, sA), Object.assign({ pts: pts(B, "x", 1 / FT) }, sB)], hlines: [{ y: sd, label: "finish, " + sd + " ft" }] });
    var amps = K.chart({ id: "drv-a", title: "Current per motor", x: x, y: { label: "A", unit: "A", min: 0 }, series: [Object.assign({ pts: pts(A, "amps", 1) }, sA), Object.assign({ pts: pts(B, "amps", 1) }, sB)], hlines: s.statorA ? [{ y: s.statorA, label: "limit" }] : [] });
    var sw = r.sweep.filter(function (p) { return isFinite(p[1]); });
    var tA = A.reached ? A.time : null, tB = B.reached ? B.time : null, dots = [];
    var ymax = sw.length ? Math.min(Math.max.apply(null, sw.map(function (p) { return p[1]; })), (r.best ? r.best[1] : 3) * 1.6) : 1;
    sw = sw.map(function (p) { return [p[0], p[1] <= ymax + 1e-9 ? p[1] : NaN]; });   // leave out what is above the top
    if (tA != null && tA <= ymax) dots.push({ x: A.ratio, y: tA, label: "A" }); if (tB != null && tB <= ymax) dots.push({ x: B.ratio, y: tB, label: "B" });
    var sweep = K.chart({ id: "drv-s", title: "Time over " + sd + " ft for other reductions", x: { label: "reduction (: 1)", name: "Reduction", min: r.sweep[0][0], max: r.sweep[r.sweep.length - 1][0] }, y: { label: "s", unit: "s", min: r.best ? Math.floor(r.best[1] * 10 * 0.95) / 10 : 0, max: ymax },
      series: [{ name: "Time", pts: sw, color: 3 }], dots: dots, marks: r.best ? [{ x: r.best[0], label: "fastest " + K.fix(r.best[0], 2) }] : [] });
    return '<div class="chartrow">' + speed + dist + '</div><div class="chartrow">' + amps + sweep + "</div>" + table +
      K.notes("<p>Each robot starts at rest and drives at full power through the line. Every 2 ms the calculator works out the motors' torque at the robot's speed, with the current limit and the battery's voltage drop, turns it into a push at the wheels, and moves the robot on.</p>" +
        '<p class="eq">push = motor torque × motors × reduction × efficiency ÷ wheel radius</p>' +
        '<p class="eq">acceleration = (smaller of push and grip − rolling drag) ÷ mass</p>' +
        '<p class="eq">grip = wheel grip × weight on the driven wheels</p>' +
        '<p class="eq">battery voltage = battery at rest − resistance × current drawn</p>' +
        "<p>Off the line, either the current limit or the tread sets the push. If the motors could push harder than the tread grips, the wheels spin and grip sets the acceleration, so two gearings that both slip start the same. If the current limit is reached first, the bigger reduction pushes harder. As the robot speeds up, back-EMF takes the push away, sooner on the larger reduction (its motors spin faster at the same robot speed, so they make more back-EMF). So a lower-geared robot is quicker off the line and a higher-geared one faster at the top: which wins depends on the distance.</p>" +
        "<p>Top speed is the speed where the motors' push has fallen to the rolling drag, found directly from the same forces the race uses, so it does not depend on how long a run lasts. Free speed is the motor's free speed through the reduction at 12 V with no load; it is a catalogue figure no robot reaches.</p>" +
        "<p>Left out: turning, the robot's own spinning parts (which add a little to its inertia), carpet that varies, tread that wears, the motor heating up over a match, and supply current limits. The battery voltage is solved in each step from the current it gives; a real battery sags more as it discharges. Wheel grip and rolling drag are rules of thumb: measure your own tread if you can (pull the robot with a spring scale until the wheels skid).</p>" +
        "<p>Motor figures from ReCalc's motor page. Swerve ratios from SDS and REV's published module sheets, as listed in the dropdown; check yours.</p>");
  },

  duration: function (s, r) { return r && r.dur || 3; },

  draw: function (g, s, r, t) {
    var c = g.c, d = s.dist;
    if (!r || !r.A) return;
    var Lr = 33 / 12, inset = 6 / 12, x0 = -Lr - 0.5, x1 = d + 3.6, pad = { l: 10, r: 10, t: 30, b: 26 };
    // Lanes as tall as the space allows (a lane's width is not a physical number), never narrower than a robot plus 6 in.
    var kx = (g.w - pad.l - pad.r) / (x1 - x0), laneH = F.clamp((g.h - pad.t - pad.b) / kx / 2, Lr + 2 * inset, 6);
    var V = g.view({ x0: x0, x1: x1, y0: 0, y1: 2 * laneH }, pad, "middle");
    var step = V.k >= 9 ? 1 : 5;
    var narrow = g.w < 600;
    g.grid(V, step, narrow ? "" : step === 1 ? "1 ft squares" : "5 ft squares");
    var lanes = [{ k: "A", L: r.A, y: laneH * 1.5, col: c.s1 }, { k: "B", L: r.B, y: laneH * 0.5, col: c.s2 }];
    // Carpet.
    lanes.forEach(function (ln) { g.rect(V.X(x0), V.Y(ln.y + laneH / 2), V.L(x1 - x0), V.L(laneH), { fill: c.surface2, stroke: c.line, width: 1 }); });
    g.grid(V, step);
    // Marks every 5 ft, the start and the finish.
    var top = V.Y(2 * laneH), bot = V.Y(0), every = V.L(5) < 26 ? 10 : 5;
    for (var m = every; m < d; m += every) {
      g.line(V.X(m), top, V.X(m), bot, { color: c.line2, width: 1 });
      if (Math.abs(V.X(m) - V.X(d)) > 40) g.text(m + " ft", V.X(m), bot + 15, { align: "center", color: c.mute, size: 11 });
    }
    g.line(V.X(0), top, V.X(0), bot, { color: c.text2, width: 2, cap: "butt" });
    g.text("Start", V.X(0), bot + 15, { align: "center", color: c.mute, size: 11 });
    var sq = Math.max(3, Math.min(V.L(laneH) / 8, 8)), fx = V.X(d);
    for (var j = 0; j * sq < bot - top - 0.5; j++) for (var col = 0; col < 2; col++) if ((j + col) % 2 === 0) g.rect(fx + col * sq - sq, top + j * sq, sq, Math.min(sq, bot - top - j * sq), { fill: c.text, stroke: null });
    g.line(fx, top, fx, bot, { color: c.text, width: 1, cap: "butt" });
    g.text("Finish " + d + " ft", fx, bot + 15, { align: "center", weight: 600, size: 11 });

    var vmax = Math.max(r.A.top, r.B.top, 0.1), wr = s.wheel / 24;
    var tw = r.win ? (r.win === "A" ? r.A : r.B).time : Infinity;
    lanes.forEach(function (ln) {
      var L = ln.L, sim = L.sim, x = ft(M.at(sim, "x", t)), v = M.at(sim, "v", t), done = L.reached && t >= L.time;
      var xf = Math.min(x, d + 2.6), yc = ln.y, half = Lr / 2;
      var slipping = L.slipEnd >= 0 && t < L.slipT;
      // Rubber left on the carpet while the wheels spun.
      if (L.slipEnd >= 0 && t > 0) {
        var sEnd = Math.min(ft(L.slipX), xf), wy = [yc + half - inset - 0.15, yc - half + inset + 0.15];
        [-Lr + inset + 0.15, -inset - 0.15].forEach(function (ox) { wy.forEach(function (yy) { g.line(V.X(ox), V.Y(yy), V.X(sEnd + ox), V.Y(yy), { color: c.ghost, width: Math.max(1, V.L(0.1)), cap: "butt" }); }); });
      }
      // Bumpers, frame, four modules.
      g.rect(V.X(xf - Lr), V.Y(yc + half), V.L(Lr), V.L(Lr), { fill: ln.col, stroke: null, radius: Math.min(4, V.L(0.25)) });
      g.rect(V.X(xf - Lr + 0.25), V.Y(yc + half - 0.25), V.L(Lr - 0.5), V.L(Lr - 0.5), { fill: c.part, stroke: c.partLine, width: 1 });
      var ang = x / (s.wheel / 24);   // wheel turns, for the tread marks
      [[xf - Lr + inset + 0.15, yc + half - inset - 0.15], [xf - inset - 0.15, yc + half - inset - 0.15], [xf - Lr + inset + 0.15, yc - half + inset + 0.15], [xf - inset - 0.15, yc - half + inset + 0.15]].forEach(function (p) {
        var cx = p[0], wx0 = V.X(cx - wr), wy0 = V.Y(p[1] + 0.07), ww = V.L(2 * wr), wh = Math.max(2, V.L(0.14));
        g.rect(wx0, wy0, ww, wh, { fill: c.text2, stroke: null });
        if (ww > 10) { for (var q = 0; q < 3; q++) { var ph = ((ang * 0.5 + q / 3) % 1 + 1) % 1; g.line(wx0 + ph * ww, wy0, wx0 + ph * ww, wy0 + wh, { color: c.part2, width: 1, cap: "butt" }); } }
        if (slipping) for (var k = 0; k < 3; k++) {
          var jit = ((t * 37 + k * 0.37) % 1), len = 3 + 5 * jit, sx = wx0 - 3 - k * 4 - jit * 3;
          g.line(sx, wy0 + wh / 2 + (k - 1) * 2.2, sx - len, wy0 + wh / 2 + (k - 1) * 2.2, { color: c.force, width: 1.25 });
        }
      });
      var cxp = V.X(xf - half), cyp = V.Y(yc), fs = F.clamp(V.L(Lr) * 0.45, 11, 20);
      g.text(ln.k, cxp, cyp, { align: "center", base: "middle", weight: 700, size: fs, halo: false, color: c.text });
      // Speed arrow and its number, or the finish time.
      var fx2 = V.X(xf) + 3, len2 = done ? 0 : 6 + 46 * v / vmax, label = done ? ln.k + " " + K.fix(L.time, 2) + " s" : fts(v) + " ft/s" + (slipping ? ", wheels slipping" : "");
      if (len2 > 8) g.arrow(fx2, cyp, fx2 + len2, cyp, { color: ln.col, width: 2, head: 7 });
      var tx = fx2 + len2 + 5, tw2 = g.textWidth(label, { weight: 600 });
      if (tx + tw2 > g.w - 6) g.text(label, V.X(xf - Lr) - 6, cyp, { align: "right", base: "middle", weight: 600, color: c.text });
      else g.text(label, tx, cyp, { base: "middle", weight: 600, color: c.text });
    });
    // Where the other robot was when the winner crossed.
    if (r.win && t >= tw) {
      var lo = r.win === "A" ? lanes[1] : lanes[0], xl = ft(M.at(lo.L.sim, "x", tw));
      if (xl < d - 0.05) {
        g.line(V.X(xl), V.Y(lo.y + laneH / 2) + 1, V.X(xl), V.Y(lo.y - laneH / 2) - 1, { color: lo.col, width: 2, dash: [4, 3] });
      }
    }
    // The clock, and the result once someone has crossed.
    g.text(K.fix(t, 2) + " s", 12, 19, { weight: 700, size: 13 });
    if (r.win && t >= tw) {
      var W = r.win === "A" ? r.A : r.B, Lo = r.win === "A" ? r.B : r.A, ln2 = r.win === "A" ? "B" : "A";
      var msg = !Lo.reached ? r.win + " finishes; " + ln2 + " cannot get there" : Math.abs(W.time - Lo.time) < 0.005 ? "A dead heat" : (Lo.time - W.time < 0.05 ? "Too close to call: " + r.win + " by " : r.win + " wins by ") + K.fix(Lo.time - W.time, 2) + " s" + (narrow ? "" : "; " + ln2 + " was " + K.fix(d - ft(M.at(Lo.sim, "x", tw)), 1) + " ft back (dashed line)");
      g.text(msg, 70, 19, { weight: 600, color: c.text2, size: 12 });
    }
    K.chartNow("drv-v", t); K.chartNow("drv-x", t); K.chartNow("drv-a", t);
  }
});
// The table's colour keys, matching the chart lines.
if (!document.getElementById("t-drive-css")) {
  var st = document.createElement("style"); st.id = "t-drive-css";
  st.textContent = ".t-drive-key{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}.t-drive-key.a{background:var(--s1)}.t-drive-key.b{background:var(--s2)}";
  document.head.appendChild(st);
}
})(typeof window !== "undefined" ? window : this);
