/* Tools: Tube strength (#tool-beam). One tube, bar or custom section, held at one end, resting on both ends or held at
   both ends, with one load. The drawing bends the beam along its true deflection curve, coloured by how close each
   part is to yielding, with the cross-section beside it. Standard small-deflection beam formulas (Euler-Bernoulli).
   The maths (M) runs in Node for tests/tool-beam.test.js. Inches, pounds and psi inside. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");

/* ---------- Maths ---------- */
var M = {};
M.MATS = [
  { id: "al", name: "6061-T6 aluminium", E: 10.0e6, yld: 35000, rho: 0.0975 },
  { id: "pc", name: "Polycarbonate", E: 345000, yld: 9000, rho: 0.0433 },
  { id: "st", name: "4130 steel", E: 29.7e6, yld: 63000, rho: 0.284 }
];
// a = the long side, b = the short side, t = wall (in). "bar" is solid.
M.SECTIONS = [
  { id: "r2x1_16", name: "2x1 tube, 1/16 wall", shape: "rect", a: 2, b: 1, t: 0.0625 },
  { id: "r2x1_8", name: "2x1 tube, 1/8 wall", shape: "rect", a: 2, b: 1, t: 0.125 },
  { id: "r1x1_16", name: "1x1 tube, 1/16 wall", shape: "rect", a: 1, b: 1, t: 0.0625 },
  { id: "r1x1_8", name: "1x1 tube, 1/8 wall", shape: "rect", a: 1, b: 1, t: 0.125 },
  { id: "r2x2_8", name: "2x2 tube, 1/8 wall", shape: "rect", a: 2, b: 2, t: 0.125 },
  { id: "rd1125", name: "Round tube, 1.125 OD x 0.058", shape: "round", d: 1.125, t: 0.058 },
  { id: "rd075", name: "Round tube, 0.75 OD x 0.049", shape: "round", d: 0.75, t: 0.049 },
  { id: "flat", name: "Flat bar, 1 x 1/4", shape: "bar", a: 1, b: 0.25 },
  { id: "custom", name: "Custom rectangle tube", shape: "rect" }
];
M.HOLDS = [["cant", "Held at one end"], ["simple", "Resting on both ends"], ["fixed", "Held at both ends"]];
M.mat = function (id) { return M.MATS.filter(function (m) { return m.id === id; })[0] || M.MATS[0]; };
M.sectionSpec = function (id) { return M.SECTIONS.filter(function (x) { return x.id === id; })[0] || M.SECTIONS[0]; };

/* The section as it sits in the beam. spec: { shape, a, b, t, d }; way: "tall" (long side upright, in the line of the
   load) or "flat". Returns { shape, B (across), H (in the line of the load), t, I (in^4), c (in), A (in^2), solid }. */
M.section = function (spec, way) {
  if (spec.shape === "round") {
    var D = spec.d, d = Math.max(0, D - 2 * spec.t);
    return { shape: "round", B: D, H: D, D: D, d: d, t: spec.t, I: Math.PI * (Math.pow(D, 4) - Math.pow(d, 4)) / 64, c: D / 2, A: Math.PI * (D * D - d * d) / 4, solid: d <= 0 };
  }
  var hi = Math.max(spec.a, spec.b), lo = Math.min(spec.a, spec.b), H = way === "flat" ? lo : hi, B = way === "flat" ? hi : lo;
  var t = spec.shape === "bar" ? 0 : spec.t, solid = spec.shape === "bar" || 2 * t >= lo;
  var bi = solid ? 0 : B - 2 * t, hi2 = solid ? 0 : H - 2 * t;
  return { shape: solid ? "bar" : "rect", B: B, H: H, t: solid ? 0 : t, I: (B * H * H * H - bi * hi2 * hi2 * hi2) / 12, c: H / 2, A: B * H - bi * hi2, solid: solid };
};

/* Deflection (in, down) at x along a beam of length L carrying P (lbf): held at one end with the load at the free end,
   or resting on / held at both ends with the load in the middle. Standard formulas. */
M.deflect = function (hold, P, L, EI, x) {
  if (hold === "cant") return P * x * x * (3 * L - x) / (6 * EI);
  var u = Math.min(x, L - x);
  if (hold === "simple") return P * u * (3 * L * L - 4 * u * u) / (48 * EI);
  return P * u * u * (3 * L - 4 * u) / (48 * EI);
};
// Bending moment (lbf in) at x, sagging positive.
M.moment = function (hold, P, L, x) {
  if (hold === "cant") return -P * (L - x);
  var u = Math.min(x, L - x);
  return hold === "simple" ? P * u / 2 : P * (4 * u - L) / 8;
};
/* Which face is squeezed, from the sign of the bending moment at the most-stressed point x (the wall for a beam held
   at one end, the middle otherwise; held at both ends the supports are as stressed as the middle). Sagging (moment > 0)
   squeezes the top and stretches the bottom; hogging the reverse. swap: the sign changes along the beam (held at both
   ends: it hogs near the supports and sags in the middle, changing a quarter of the way in). */
M.faces = function (hold, P, L) {
  var x = hold === "cant" ? 0 : L / 2, m = M.moment(hold, P || 1, L, x);   // with no load, the way it would bend
  return { x: x, moment: P ? m : 0, topSqueezed: m > 0, swap: hold === "fixed" };
};
// How many times stiffer (and stronger in bending, for the same stress) the section is the tall way than the flat way.
M.tallRatio = function (spec) { return M.section(spec, "tall").I / M.section(spec, "flat").I; };
// The textbook maxima: deflection = P L^3 / (k EI), moment = P L / m.
M.COEF = { cant: { d: 3, m: 1 }, simple: { d: 48, m: 4 }, fixed: { d: 192, m: 8 } };

/* o: { sec (from M.section), mat, L (in), P (lbf), hold } */
M.beam = function (o) {
  var sec = o.sec, mat = o.mat, L = o.L, P = o.P, k = M.COEF[o.hold] || M.COEF.cant, EI = mat.E * sec.I;
  var Mmax = P * L / k.m, delta = P * L * L * L / (k.d * EI), stress = Mmax * sec.c / sec.I;
  var r = { hold: o.hold, L: L, P: P, EI: EI, I: sec.I, c: sec.c, A: sec.A, Mmax: Mmax, delta: delta, stress: stress,
    sf: stress > 0 ? mat.yld / stress : Infinity, share: stress / mat.yld, weight: sec.A * L * mat.rho,
    stiff: k.d * EI / (L * L * L), Pyield: mat.yld * sec.I / sec.c / (L / k.m), xmax: o.hold === "cant" ? L : L / 2 };
  r.big = delta > L / 10;
  return r;
};

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- Page ---------- */
var K = D.calc, ID = "tool-beam", DUR = 2.2;
var NICE = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01];
function specOf(s) { var sp = M.sectionSpec(s.section); return sp.id === "custom" ? { shape: "rect", a: s.cw, b: s.ch, t: s.ct } : sp; }
function symmetric(s) { var sp = specOf(s); return sp.shape === "round" || sp.a === sp.b; }
function holdName(h) { return (M.HOLDS.filter(function (x) { return x[0] === h; })[0] || M.HOLDS[0])[1]; }
function where(h) { return h === "cant" ? "at the free end" : "in the middle"; }
// A length in inches with enough places to show something; huge ones with commas.
function inch(x) { return (x >= 1000 ? K.n(x, 0) : x > 0 && x < 0.0005 ? x.toFixed(5) : x < 0.01 ? x.toFixed(4) : x.toFixed(3)) + " in"; }
function psi(x) { return K.n(x, 0) + " psi"; }
function ease(u) { u = F.clamp(u, 0, 1); return u * u * (3 - 2 * u); }

K.tool({
  id: ID,
  defaults: { section: "r2x1_16", way: "tall", cw: 2, ch: 1, ct: 0.0625, mat: "al", L: 30, P: 25, hold: "cant" },
  stage: { ratio: 2.2, narrow: 1.0, label: "The beam to scale on its supports, bending under the load, coloured by how close it is to yielding, with its cross-section." },
  duration: function () { return DUR; }, autoplay: true, playLabel: "Load it",

  compute: function (s) {
    var sec = M.section(specOf(s), symmetric(s) ? "tall" : s.way), mat = M.mat(s.mat);
    var r = M.beam({ sec: sec, mat: mat, L: s.L, P: s.P, hold: s.hold });
    r.sec = sec; r.mat = mat; r.curve = []; r.stressCurve = [];
    for (var i = 0; i <= 80; i++) {
      var x = s.L * i / 80;
      r.curve.push([x, -M.deflect(s.hold, s.P, s.L, r.EI, x)]);
      r.stressCurve.push([x, Math.abs(M.moment(s.hold, s.P, s.L, x)) * sec.c / sec.I]);
    }
    return r;
  },

  controls: function (s) {
    var sp = specOf(s), tube = K.pick(ID, "section", "Section", M.SECTIONS.map(function (x) { return [x.id, x.name]; }));
    if (s.section === "custom") tube += K.num(ID, "cw", "Width", { unit: "in", min: 0.1, max: 8, step: 0.0625 }) + K.num(ID, "ch", "Height", { unit: "in", min: 0.1, max: 8, step: 0.0625 }) +
      K.num(ID, "ct", "Wall", { unit: "in", min: 0.01, max: 1, step: 0.001, tip: "Wall thickness. A wall of half the short side or more makes it a solid bar." });
    if (!symmetric(s)) tube += K.seg(ID, "way", "Which way it bends", [["tall", "Tall way"], ["flat", "Flat way"]], { tip: "Tall way: the long side of the section is upright, in line with the load. That is the stiff way." });
    tube += K.pick(ID, "mat", "Material", M.MATS.map(function (m) { return [m.id, m.name]; }));
    var load = K.pick(ID, "hold", "How it is held", M.HOLDS) +
      K.num(ID, "L", "Length", { unit: "in", min: 2, max: 96, step: 0.25, slider: true, tip: "Between the supports, or from the wall to the load for a beam held at one end." }) +
      K.num(ID, "P", "Load", { unit: "lbf", min: 0, max: 500, step: 0.5, slider: true, hintId: "beam-where", tip: "One steady load. A robot hit is many times its static load." });
    return K.group(ID, "tube", "Tube", tube) + K.group(ID, "load", "Load", load);
  },
  hints: function (s, r) { return { "beam-where": "Applied " + where(s.hold) + (r && r.Pyield ? ". It yields at " + K.n(r.Pyield, 0) + " lbf." : ".") }; },

  outs: function (s, r) {
    var st = r.sf < 1 ? "bad" : r.sf < 3 ? "warn" : "ok", text;
    if (!(s.P > 0)) text = "No load, so no bend. Set a load to see how the beam takes it.";
    else if (r.sf < 1) text = "Takes a permanent bend at this load: it needs " + K.fix(1 / r.sf, 1) + " times the strength. It yields at " + K.n(r.Pyield, 0) + " lbf; use a bigger or thicker section, a shorter span or a stronger material.";
    else if (r.sf < 3) text = "Bends " + inch(r.delta) + " and springs back, but a safety factor of " + K.fix(r.sf, 1) + " leaves little for a hit. Aim for 3 or more (a rule of thumb).";
    else text = "Bends " + inch(r.delta) + " (" + K.fix(r.delta * 25.4, r.delta < 0.004 ? 3 : 2) + " mm) and springs back, with a safety factor of " + K.fix(r.sf, 1) + ".";
    if (r.big && s.P > 0) text += " The formulas say it bends more than a tenth of its length; past that they are no longer accurate, so treat the bend as a warning, not a number.";
    return K.verdict(s.P > 0 ? st : "info", text) + K.outs([
      { k: "Deflection", v: inch(r.delta).replace(" in", ""), u: "in", sub: r.big ? "too far for the formula" : K.fix(r.delta * 25.4, r.delta < 0.004 ? 3 : 2) + " mm " + where(s.hold), state: r.big ? "warn" : "" },
      { k: "Bending stress", v: K.n(r.stress, 0), u: "psi", sub: K.n(r.share * 100, 0) + "% of yield, " + K.n(r.stress * 0.00689476, 1) + " MPa", state: st === "ok" ? "" : st, tip: "The highest stress, on the top and bottom faces where the bending moment is largest." },
      { k: "Safety factor", v: isFinite(r.sf) ? K.fix(r.sf, 1) : "–", sub: "yields at " + K.n(r.Pyield, 0) + " lbf. Ideal tube: no holes, joints or hits", state: s.P > 0 ? st : "", tip: "How many times this load it takes before it bends for good. 3 or more allows for hits (a rule of thumb)." },
      { k: "Stiffness", v: K.n(r.stiff), u: "lbf/in", sub: K.n(r.stiff * 4.448222 / 25.4) + " N/mm at the load", tip: "Load for each inch it bends at the load point." },
      { k: "Weight of the piece", v: K.fix(r.weight, 2), u: "lb", sub: K.fix(r.weight * 0.45359237, 3) + " kg, " + K.fix(s.L, 2) + " in long" }]);
  },

  more: function (s, r) {
    var defl = K.chart({ id: "beam-defl", title: "Deflection along the beam, true size", x: { label: "along the beam, in", name: "At", unit: "in", min: 0, max: s.L }, y: { label: "deflection, in", unit: "in" },
      series: [{ name: "Deflection", pts: r.curve, color: 1 }], dots: s.P > 0 ? [{ x: r.xmax, y: -r.delta, label: K.fix(r.delta, 3) + " in" }] : [] });
    var str = K.chart({ id: "beam-stress", title: "Bending stress along the beam", x: { label: "along the beam, in", name: "At", unit: "in", min: 0, max: s.L }, y: { label: "stress, psi", unit: "psi" },
      series: [{ name: "Stress", pts: r.stressCurve, color: 2 }], hlines: [{ y: r.mat.yld, label: "Yield " + psi(r.mat.yld) }, { y: r.mat.yld / 3, label: "Safety factor 3" }] });
    var k = M.COEF[s.hold];
    return '<div class="chartrow">' + defl + str + "</div>" + K.notes(
      "<p>The beam is treated as a straight, even beam that bends a little (Euler-Bernoulli beam theory). Three numbers decide it: how stiff the material is (E), how the section's material is spread away from its middle (the second moment of area, I) and the length.</p>" +
      '<p class="eq">I (rectangle tube) = (B × H³ − (B − 2t) × (H − 2t)³) ÷ 12</p>' +
      '<p class="eq">I (round tube) = π × (D⁴ − d⁴) ÷ 64</p>' +
      "<p>H is the side in line with the load, so " + (symmetric(s) ? "a square or round section is as stiff either way" : "this section is " + K.fix(M.tallRatio(specOf(s)), 1) + " times stiffer the tall way than the flat way") + ". The standard formulas for one load:</p>" +
      '<p class="eq">held at one end, load at the free end: deflection = P L³ ÷ (3 E I), moment = P L</p>' +
      '<p class="eq">resting on both ends, load in the middle: deflection = P L³ ÷ (48 E I), moment = P L ÷ 4</p>' +
      '<p class="eq">held at both ends, load in the middle: deflection = P L³ ÷ (192 E I), moment = P L ÷ 8</p>' +
      '<p class="eq">stress = M c ÷ I, c = H ÷ 2;  safety factor = yield ÷ stress;  weight = area × length × density</p>' +
      "<p>For this beam: I = " + K.fix(r.I, 4) + " in⁴, E = " + K.n(r.mat.E, 0) + " psi, moment = " + K.n(r.Mmax, 0) + " lbf in, deflection = " + K.n(s.P, 1) + " × " + K.n(s.L, 2) + "³ ÷ (" + k.d + " × E × I) = " + K.fix(r.delta, 4) + " in.</p>" +
      "<p>Which face is squeezed depends on which way the beam bends at that place, the sign of the bending moment there. Where it sags, the top is squeezed and the bottom stretched; where it curves the other way, the reverse. A beam held at one end curves the other way all along, so its top is stretched. A beam resting on both ends sags all along. A beam held at both ends sags in the middle and curves the other way near its supports, so the faces swap a quarter of the way in from each end. The stress is largest on the outer faces, which is why a tall, thin-walled tube does so much with so little metal.</p>" +
      "<p>What it leaves out: holes and lightening pockets (they cut I and raise the stress next to them), thin walls crumpling or buckling before the material yields, the beam's own weight, fatigue from many small loads, and impact. A robot hit can be many times the static load, so a safety factor of 3 or more is a common rule of thumb. When the beam bends more than about a tenth of its length the formulas become less accurate.</p>" +
      "<p>The drawing bends the beam along the true deflection curve, made larger by the stated factor when the real bend is too small to see. The colour shows each part's own stress against yield: the plain part colour above a safety factor of 3, toward the warning colour by 1, and the problem colour where it yields.</p>" +
      "<p>Material figures: 6061-T6 E 10.0 million psi, yield 35,000 psi; polycarbonate E 345,000 psi, yield 9,000 psi; 4130 steel E 29.7 million psi, yield 63,000 psi.</p>");
  },

  draw: function (g, s, r, t) {
    var c = g.c, W = g.w, H = g.h, narrow = W < 560, sec = r.sec, L = s.L;
    var frac = ease(t / DUR), P = s.P * frac;
    // Two areas: the beam, and the cross-section (at the right, or across the top on a phone).
    var pan = narrow ? { x: 0, y: H - Math.min(124, H * 0.36), w: W, h: Math.min(124, H * 0.36) } : { x: W - F.clamp(W * 0.3, 200, 280), y: 0, w: 0, h: H };
    if (!narrow) pan.w = W - pan.x;
    var ax0 = 36, ax1 = (narrow ? W : pan.x) - (s.hold === "cant" ? 70 : 36), top = 20, bot = (narrow ? pan.y : H) - 38;
    var arrowLen = Math.min(56, (bot - top) * 0.2);
    // One scale for length and depth, so the beam is to scale both ways.
    var k = Math.min((ax1 - ax0) / L, 0.2 * (bot - top) / sec.H), th = Math.max(4, sec.H * k);
    var x0 = ax0 + ((ax1 - ax0) - L * k) / 2, cy = top + 34 + arrowLen + th / 2;
    var V = { k: k, X: function (x) { return x0 + x * k; }, Y: function (y) { return cy - y * k; }, L: function (l) { return l * k; }, ux: function (px) { return (px - x0) / k; }, uy: function (py) { return (cy - py) / k; } };
    var step = [0.5, 1, 2, 6, 12].filter(function (q) { return q * k >= 12; })[0] || 12;
    g.grid(V, step, "");
    // How much to enlarge the bend so it shows.
    var room = bot - (cy + th / 2) - (s.hold === "simple" ? 26 : 14), dpx = r.delta * k, f = 1;
    if (dpx > 0 && (dpx < 0.25 * room || dpx > 0.9 * room)) { var want = 0.6 * room / dpx; f = want >= 1 ? NICE.filter(function (n) { return n <= want; })[0] : want; }
    function yAt(x) { return cy + M.deflect(s.hold, P, L, r.EI, x) * k * f; }
    // The beam unloaded, as a ghost.
    g.rect(V.X(0), cy - th / 2, L * k, th, { stroke: c.ghost, width: 1, dash: [5, 4] });
    // The beam, in slices coloured by their own stress against yield.
    var N = 90, i, xa, xb, top1 = [], bot1 = [];
    for (i = 0; i < N; i++) {
      xa = L * i / N; xb = L * (i + 1) / N;
      var sig = Math.abs(M.moment(s.hold, P, L, (xa + xb) / 2)) * sec.c / sec.I, sfl = sig > 0 ? r.mat.yld / sig : Infinity;
      var ya = yAt(xa), yb = yAt(xb);
      g.poly([[V.X(xa), ya - th / 2], [V.X(xb) + 0.6, yb - th / 2], [V.X(xb) + 0.6, yb + th / 2], [V.X(xa), ya + th / 2]], { fill: heat(c, sfl), stroke: null });
    }
    for (i = 0; i <= N; i++) { xa = L * i / N; top1.push([V.X(xa), yAt(xa) - th / 2]); bot1.push([V.X(xa), yAt(xa) + th / 2]); }
    g.path(top1, { color: c.partLine, width: 1.25 }); g.path(bot1, { color: c.partLine, width: 1.25 });
    g.line(top1[0][0], top1[0][1], bot1[0][0], bot1[0][1], { color: c.partLine, width: 1.25 }); g.line(top1[N][0], top1[N][1], bot1[N][0], bot1[N][1], { color: c.partLine, width: 1.25 });
    if (!sec.solid && sec.shape !== "round" && th > 14) {             // the walls inside, as hidden lines
      var wi = sec.t * k; if (wi > 2) { g.path(top1.map(function (p) { return [p[0], p[1] + wi]; }), { color: c.partLine, width: 1, dash: [4, 3] }); g.path(bot1.map(function (p) { return [p[0], p[1] - wi]; }), { color: c.partLine, width: 1, dash: [4, 3] }); }
    }
    // Supports.
    var sh = Math.max(th + 40, 64);
    if (s.hold === "cant" || s.hold === "fixed") wall(g, V.X(0), cy, sh, -1);
    if (s.hold === "fixed") wall(g, V.X(L), cy, sh, 1);
    if (s.hold === "simple") { pin(g, V.X(0), cy + th / 2, false); pin(g, V.X(L), cy + th / 2, true); }
    // The load.
    var xl = r.xmax, lx = V.X(xl), ly = yAt(xl) - th / 2;
    if (s.P > 0) {
      g.arrow(lx, ly - arrowLen, lx, ly - 2, { color: c.force, width: 2 + 2 * frac, head: 10 });
      g.text(K.n(P, P < 10 ? 1 : 0) + " lbf", lx + (s.hold === "cant" ? -8 : 8), ly - arrowLen + 4, { color: c.force, weight: 700, align: s.hold === "cant" ? "right" : "left", base: "middle" });
    }
    // Where it yields first, once it does.
    if (P > r.Pyield) {
      var hot = s.hold === "cant" ? 0 : L / 2, hy = yAt(hot);
      g.circle(V.X(hot), hy, th / 2 + 7, { stroke: c.bad, width: 2 });
      if (hot === 0) g.text("Yields here", V.X(hot) + 14, hy + th / 2 + 24, { color: c.bad, weight: 700 });
      else g.text("Yields here", V.X(hot) - th / 2 - 14, hy, { color: c.bad, weight: 700, align: "right", base: "middle" });
    }
    // The bend, dimensioned in true inches.
    var dTrue = M.deflect(s.hold, P, L, r.EI, xl), dDraw = dTrue * k * f, lab = "really " + inch(dTrue);
    if (s.hold === "cant") {                       // beside the free end
      if (dDraw > 10) g.dim(lx + 12, cy, lx + 12, cy + dDraw, lab, 0, { side: "right", color: c.text2 });
      else if (s.P > 0) g.text("Bends " + lab, lx + 8, cy + dDraw + th / 2 + 16, { color: c.text2, weight: 600, align: "right" });
    } else if (s.P > 0) {                          // under the middle: from where the bottom face was to where it is
      var yb0 = cy + th / 2;
      if (dDraw > 10) g.dim(lx + 16, yb0, lx + 16, yb0 + dDraw, "", 0, { color: c.text2 });
      g.text((dDraw > 10 ? "" : "Bends ") + lab, lx + 16, yb0 + dDraw + (s.hold === "simple" && L * k < 80 ? 40 : 16), { color: c.text2, weight: 600, align: "center" });
    }
    g.dim(V.X(0), H - 14, V.X(L), H - 14, K.n(L, 2) + " in", 0);
    // Words at the top left.
    g.text(holdName(s.hold) + ", " + where(s.hold).replace("at the ", "load at the ").replace("in the middle", "load in the middle"), 12, top + 8, { weight: 600, base: "middle" });
    var note = (step === 1 ? "1 in" : step + " in") + " squares" + (f !== 1 && s.P > 0 ? (f > 1 ? ". Bend drawn " + f + "× so it shows" : ". Bend drawn " + Math.round(1 / f) + " times smaller to fit") : "");
    g.text(note, 12, top + 24, { color: c.mute, size: 11, base: "middle" });
    // The cross-section.
    section(g, s, r, pan, narrow, k, frac);
  }
});

/* The heat colour: the part colour with a safety factor of 3 or more, toward warn at 1, problem colour below 1. */
function heat(c, sf) { if (!(sf < 3)) return c.part; if (sf >= 1) return mix(c.part, c.warn, (3 - sf) / 2); return c.bad; }
function rgb(col) {
  var m = /^#([0-9a-f]{3,8})$/i.exec(col || ""), h;
  if (m) { h = m[1]; if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  m = /rgba?\(([^)]+)\)/.exec(col || ""); if (m) { var p = m[1].split(",").map(parseFloat); return [p[0], p[1], p[2]]; }
  return null;
}
function mix(a, b, f) { var x = rgb(a), y = rgb(b); f = F.clamp(f, 0, 1); if (!x || !y) return f < 0.5 ? a : b; return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * f); }).join(",") + ")"; }

// A wall the beam is held in: a thick line with hatching on the far side. side -1 = wall on the left.
function wall(g, x, cy, h, side) {
  var c = g.c, ctx = g.ctx, y0 = cy - h / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(side < 0 ? x - 16 : x, y0, 16, h); ctx.clip();
  for (var y = y0 - 20; y < y0 + h + 20; y += 7) g.line(x - 20, y + 20, x + 20, y - 20, { color: c.line2, width: 1 });
  ctx.restore();
  g.line(x, y0, x, y0 + h, { color: c.text2, width: 2.5, cap: "butt" });
}
// A support the beam rests on: a triangle, with rollers under the second one.
function pin(g, x, y, roll) {
  var c = g.c, hh = 14, base = y + hh + (roll ? 7 : 0);
  g.poly([[x, y], [x - 9, y + hh], [x + 9, y + hh]], { fill: c.part2, stroke: c.partLine, width: 1 });
  if (roll) { g.circle(x - 5, y + hh + 3.5, 3.2, { fill: c.sheet, stroke: c.partLine, width: 1 }); g.circle(x + 5, y + hh + 3.5, 3.2, { fill: c.sheet, stroke: c.partLine, width: 1 }); }
  g.ground(base, x - 16, x + 16);
}
// The cross-section, enlarged, with its neutral axis and the stress across it.
function section(g, s, r, pan, narrow, kBeam, frac) {
  var c = g.c, sec = r.sec;
  g.rect(pan.x, pan.y, pan.w, pan.h, { fill: c.sheet, stroke: null });
  if (narrow) g.line(0, pan.y, g.w, pan.y, { color: c.line, width: 1 }); else g.line(pan.x, 0, pan.x, g.h, { color: c.line, width: 1 });
  var boxW = narrow ? Math.min(80, pan.w * 0.24) : pan.w * 0.42, boxH = narrow ? pan.h - 62 : Math.min(pan.h * 0.36, 130);
  var ks = Math.min(boxW / sec.B, boxH / sec.H), cx = narrow ? 52 + Math.min(boxW, sec.B * Math.min(boxW / sec.B, boxH / sec.H)) / 2 : pan.x + 26 + boxW / 2, cy = narrow ? pan.y + 28 + boxH / 2 : pan.y + 50 + boxH / 2;
  var bw = sec.B * ks, bh = sec.H * ks;
  g.text("Cross-section, enlarged", narrow ? 12 : pan.x + 12, pan.y + 18, { weight: 600, size: 12 });
  if (sec.shape === "round") {
    g.circle(cx, cy, bw / 2, { fill: c.part, stroke: c.partLine, width: 1.25 });
    if (!sec.solid) g.circle(cx, cy, sec.d * ks / 2, { fill: c.sheet, stroke: c.partLine, width: 1.25 });
  } else {
    g.rect(cx - bw / 2, cy - bh / 2, bw, bh, { fill: c.part, stroke: c.partLine, width: 1.25 });
    if (!sec.solid) { var tw = sec.t * ks; g.rect(cx - bw / 2 + tw, cy - bh / 2 + tw, bw - 2 * tw, bh - 2 * tw, { fill: c.sheet, stroke: c.partLine, width: 1.25 }); }
  }
  // Neutral axis.
  g.line(cx - bw / 2 - 10, cy, cx + bw / 2 + 10, cy, { color: c.accent, width: 1.25, dash: [8, 3, 2, 3] });
  // Dimensions.
  g.dim(cx - bw / 2, cy + bh / 2 + 12, cx + bw / 2, cy + bh / 2 + 12, frac2(sec.B) + " in", 0, { side: "below", size: 11 });
  g.dim(cx - bw / 2 - 12, cy + bh / 2, cx - bw / 2 - 12, cy - bh / 2, frac2(sec.H) + " in", 0, { side: "left", size: 11 });
  // The stress across the depth: zero on the neutral axis, largest at the faces, against yield.
  var lim = narrow ? 30 : 38, sx = cx + bw / 2 + 16 + lim, share = r.share * frac, wv = lim * Math.min(share, 1.15);
  var fc = M.faces(s.hold, s.P, s.L), topSq = fc.topSqueezed;   // from the moment's sign at the most-stressed point
  g.line(sx, cy - bh / 2, sx, cy + bh / 2, { color: c.text2, width: 1 });
  [-1, 1].forEach(function (sg) { g.line(sx + sg * lim, cy - bh / 2 - 4, sx + sg * lim, cy + bh / 2 + 4, { color: c.bad, width: 1, dash: [3, 3] }); });
  if (wv > 0.5) {
    var col = share >= 1 ? c.bad : share > 1 / 3 ? c.warn : c.s1, d = topSq ? -1 : 1;
    g.poly([[sx, cy], [sx + d * wv, cy - bh / 2], [sx, cy - bh / 2]], { fill: col, stroke: null });
    g.poly([[sx, cy], [sx - d * wv, cy + bh / 2], [sx, cy + bh / 2]], { fill: col, stroke: null });
  }
  var lab = narrow ? sx + lim + 10 : pan.x + 12, ly = narrow ? pan.y + 26 : cy + bh / 2 + 44, maxW = (narrow ? g.w : pan.x + pan.w) - lab - 8;
  var faces = fc.swap ? (topSq ? "Top squeezed in the middle, stretched at the ends" : "Top stretched in the middle, squeezed at the ends") : "Top " + (topSq ? "squeezed" : "stretched") + ", bottom " + (topSq ? "stretched" : "squeezed");
  var rows = [["At the most-stressed point. Neutral axis: no stress", { color: c.accent, size: 11, weight: 600 }], [faces, { color: c.text2, size: 11 }],
    [K.n(r.stress * frac, 0) + " psi, " + K.n(share * 100, 0) + "% of yield", { color: share >= 1 ? c.bad : c.text2, size: 11, weight: 600 }]];
  if (!narrow) { rows.push(["Red dashes: yield, " + K.n(r.mat.yld, 0) + " psi", { color: c.mute, size: 11 }]); if (!sec.solid) rows.push(["Wall " + frac2(sec.t) + " in", { color: c.mute, size: 11 }]); }
  // Each label wrapped to the room beside the section, so nothing runs off a phone's edge.
  var y = ly, lh = narrow ? 14 : 16;
  rows.forEach(function (row) {
    var words = row[0].split(" "), line = "";
    words.forEach(function (w) { var tryL = line ? line + " " + w : w; if (line && g.textWidth(tryL, row[1]) > maxW) { g.text(line, lab, y, row[1]); y += lh; line = w; } else line = tryL; });
    if (line) { g.text(line, lab, y, row[1]); y += lh; }
  });
}
// 0.0625 -> "1/16"; other numbers as decimals.
function frac2(x) {
  for (var d = 1; d <= 64; d *= 2) { var n = Math.round(x * d); if (Math.abs(n / d - x) < 1e-6) { var w = Math.floor(n / d), rem = n - w * d; return rem ? (w ? w + " " : "") + rem + "/" + d : String(w); } }
  return String(Math.round(x * 1000) / 1000);
}
})(typeof window !== "undefined" ? window : this);
