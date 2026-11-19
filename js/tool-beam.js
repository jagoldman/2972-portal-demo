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

// A round number at or a little above x, for the top of a chart: 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 times a power of ten.
/* Every stock section (not the custom one) under the same load, length, support, material and way up.
   o: { mat, L, P, hold, way }. Returns { rows: [{ id, name, delta, sf, weight }] lightest first, best: the id of the
   lightest with a safety factor of 3 or more, or null }. */
M.compare = function (o) {
  var rows = M.SECTIONS.filter(function (x) { return x.id !== "custom"; }).map(function (sp) {
    var sec = M.section(sp, sp.shape === "round" || sp.a === sp.b ? "tall" : o.way), b = M.beam({ sec: sec, mat: o.mat, L: o.L, P: o.P, hold: o.hold });
    return { id: sp.id, name: sp.name, delta: b.delta, sf: b.sf, weight: b.weight, big: b.big };
  }).sort(function (a, b) { return a.weight - b.weight; });
  var ok = rows.filter(function (q) { return q.sf >= 3; });
  return { rows: rows, best: ok.length ? ok[0].id : null };
};
/* How much to enlarge a bend so it shows: the largest round factor (1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 100 ...) that
   draws a bend of delta no deeper than 20% of the beam's length. 1 when it already shows. */
M.bendScale = function (delta, L) {
  if (!(delta > 0) || !(L > 0)) return 1;
  var want = 0.2 * L / delta, q = [1000, 500, 300, 200, 100, 50, 40, 30, 20, 10, 5, 4, 3, 2, 1];
  for (var i = 0; i < q.length; i++) if (q[i] <= want) return q[i];
  return 1;
};
/* The drawing's enlargement, chosen from things that do not move with the load (the tube, the material, the length
   and how it is held): the bend at the load that yields this tube is drawn 20% of the length deep or less. So dragging
   the load never changes the scale: more load always draws more bend, and yield always looks the same. r: M.beam(). */
M.drawScale = function (r) { return M.bendScale(r.Pyield / r.stiff, r.L); };
// The grid behind the beam: 1 in squares up to 40 in, 2 in up to 80 in, then 6 in. It depends on the length alone.
M.gridStep = function (L) { return L <= 40 ? 1 : L <= 80 ? 2 : 6; };
M.niceTop = function (x) { if (!(x > 0)) return 1; var m = Math.pow(10, Math.floor(Math.log10(x))), q = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]; for (var i = 0; i < q.length; i++) if (q[i] * m >= x * (1 - 1e-12)) return q[i] * m; return 10 * m; };

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- Page ---------- */
var K = D.calc, esc = D.esc, ID = "tool-beam", DUR = 2.2;
var NICE = [1000, 500, 300, 200, 100, 50, 40, 30, 20, 10, 5, 4, 3, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01];
function specOf(s) { var sp = M.sectionSpec(s.section); return sp.id === "custom" ? { shape: "rect", a: s.cw, b: s.ch, t: s.ct } : sp; }
function symmetric(s) { var sp = specOf(s); return sp.shape === "round" || sp.a === sp.b; }
function holdName(h) { return (M.HOLDS.filter(function (x) { return x[0] === h; })[0] || M.HOLDS[0])[1]; }
function where(h) { return h === "cant" ? "at the free end" : "in the middle"; }
// A length in inches with enough places to show something; huge ones with commas.
function inch(x) { return (x >= 1000 ? K.n(x, 0) : x > 0 && x < 0.0005 ? x.toFixed(5) : x < 0.01 ? x.toFixed(4) : x.toFixed(3)) + " in"; }
function psi(x) { return K.n(x, 0) + " psi"; }
/* The stress chart's level lines: yield, the peak (as a share of yield) and a safety factor of 3. Each label goes where
   it touches neither the curve nor another label: right or left, above or below its line. A line two others crowd out
   is left out (the safety factor first); a line whose label finds no clear spot is drawn bare and named in the caption. */
function refLines(r, ytop, dot) {
  var L = r.L, pts = r.stressCurve, out = [], bare = [], boxes = [];
  // The peak's dot label sits to the right of the dot, a little above it: keep the level lines' labels off it.
  if (dot) boxes.push({ x0: dot.x - 0.02 * L, x1: dot.x + (dot.label.length * 5.4 + 12) / 420 * L, lo: dot.y - 0.02 * ytop, hi: dot.y + 0.14 * ytop });
  function box(y, side, below) { return { x0: side === "left" ? 0 : 0.62 * L, x1: side === "left" ? 0.38 * L : L, lo: below ? y - 0.12 * ytop : y + 0.01 * ytop, hi: below ? y - 0.01 * ytop : y + 0.12 * ytop }; }
  function clear(b) {
    if (b.lo < 0.05 * ytop || b.hi > ytop) return false;
    if (pts.some(function (p) { return p[0] >= b.x0 - 1e-9 && p[0] <= b.x1 + 1e-9 && p[1] >= b.lo - 0.03 * ytop && p[1] <= b.hi + 0.03 * ytop; })) return false;
    return !boxes.some(function (o) { return o.x0 < b.x1 && b.x0 < o.x1 && o.lo < b.hi && b.lo < o.hi; });
  }
  var want = [[r.mat.yld, "Yield " + psi(r.mat.yld), "yield, " + psi(r.mat.yld)]];
  want.push([r.mat.yld / 3, "Safety factor 3", "a safety factor of 3, " + psi(r.mat.yld / 3)]);
  var kept = dot ? [dot.y] : [];
  want.forEach(function (h, i) {
    if (i === want.length - 1 && kept.some(function (k) { return Math.abs(k - h[0]) < 0.1 * ytop; })) return;   // safety factor 3 gives way
    kept.push(h[0]);
    var ways = [["right", false], ["right", true], ["left", false], ["left", true]], hit = null;
    ways.some(function (q) { var b = box(h[0], q[0], q[1]); if (clear(b)) { hit = q; boxes.push(b); return true; } return false; });
    if (hit) out.push({ y: h[0], label: h[1], side: hit[0] === "left" ? "left" : undefined, below: hit[1] });
    else { out.push({ y: h[0] }); bare.push(h[2]); }
  });
  return { lines: out, unlabelled: bare };
}
D.acts.beamuse = function (b) { K.state(ID).section = b.dataset.v; D.render(); };
function ease(u) { u = F.clamp(u, 0, 1); return u * u * (3 - 2 * u); }
(function () {
  var st = document.createElement("style");
  st.textContent = ".t-beam-cap { margin: 0; font-size: .8rem; color: var(--mute); } .t-beam-cmp .t-beam-cap { margin-bottom: 6px; } .t-beam-cmp td:first-child { white-space: normal; min-width: 12em; } @media (max-width: 640px) { .t-beam-cmp table.stk td:first-child { display: block; } } .t-beam-best { display: block; margin-top: 2px; font-size: .8rem; font-weight: 600; color: var(--ok); white-space: normal; } .t-beam-cmp td.t-beam-bad { color: var(--bad); font-weight: 700; } .t-beam-cmp td.t-beam-warn { color: var(--warn); font-weight: 700; }";
  document.head.appendChild(st);
})();

K.tool({
  id: ID,
  defaults: { section: "r2x1_16", way: "tall", cw: 2, ch: 1, ct: 0.0625, mat: "al", L: 30, P: 25, hold: "cant" },
  stage: { ratio: 2.2, narrow: 0.8, tall: true, label: "The beam to scale on its supports, bending under the load, coloured by how close it is to yielding, with its cross-section." },
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
    var more = s.P > 0 ? "Ideal bending of a plain tube: holes, joints, thin walls buckling and hits can make it fail sooner." : "";
    return K.verdict(s.P > 0 ? st : "info", text, more) + K.outs([
      { k: "Deflection", v: inch(r.delta).replace(" in", ""), u: "in", sub: r.big ? "too far for the formula" : where(s.hold), state: r.big ? "warn" : "" },
      { k: "Bending stress", v: K.n(r.stress, 0), u: "psi", sub: K.n(r.stress * 0.00689476, 1) + " MPa", state: st === "ok" ? "" : st, tip: "The highest stress, on the top and bottom faces where the bending moment is largest." },
      { k: "Safety factor", v: isFinite(r.sf) ? K.fix(r.sf, 1) : "–", sub: "against bending yield, ideal tube", state: s.P > 0 ? st : "", tip: "How many times this load it takes before it bends for good. 3 or more allows for hits (a rule of thumb)." },
      { k: "Stiffness", v: K.n(r.stiff), u: "lbf/in", sub: K.n(r.stiff * 4.448222 / 25.4) + " N/mm", tip: "Load for each inch it bends at the load point." },
      { k: "Weight of the piece", v: K.fix(r.weight, 2), u: "lb", sub: K.fix(r.weight * 0.45359237, 3) + " kg" }]);
  },

  more: function (s, r) {
    var defl = K.chart({ id: "beam-defl", title: "Deflection along the beam (real, not exaggerated)", note: s.P > 0 ? "Most: " + inch(r.delta) + " " + where(s.hold) + " (the dot)." : "", x: { label: "along the beam, in", name: "At", unit: "in", min: 0, max: s.L }, y: { label: "deflection, in", unit: "in" },
      series: [{ name: "Deflection", pts: r.curve, color: 1 }], dots: s.P > 0 ? [{ x: r.xmax, y: -r.delta }] : [] });
    // The axis runs to yield (or past the peak when it yields), so the curve reads against yield; the peak is marked
    // with its share of yield.
    var ref, peak = r.stress, ytop = M.niceTop(Math.max(r.mat.yld * 1.05, peak * 1.15)), at = s.hold === "cant" ? "at the wall" : s.hold === "simple" ? "at the middle" : "at the middle and ends";
    var dot = s.P > 0 ? { x: s.hold === "cant" ? 0 : s.L / 2, y: peak, label: psi(peak) + " " + at } : null;
    ref = refLines(r, ytop, dot);
    var note = (s.P > 0 ? "Peak " + psi(peak) + " " + at + (s.hold === "cant" ? " (0 in along the beam)" : " (" + K.n(s.L / 2, 1) + " in along the beam)") + ", " + K.n(r.share * 100, 0) + "% of yield. " : "") + "The scale runs to yield, so the gap above the curve is the strength left." + (ref.unlabelled.length ? " Dashed: " + ref.unlabelled.join("; ") + "." : "");
    var str = K.chart({ id: "beam-stress", title: "Bending stress along the beam", note: note, x: { label: "along the beam, in", name: "At", unit: "in", min: 0, max: s.L }, y: { label: "stress, psi", unit: "psi", min: 0, max: ytop },
      series: [{ name: "Stress", pts: r.stressCurve, color: 2 }], hlines: ref.lines, dots: dot ? [dot] : [] });
    var k = M.COEF[s.hold];
    // Every stock section under this same load, lightest first.
    var cmp = M.compare({ mat: r.mat, L: s.L, P: s.P, hold: s.hold, way: s.way }), cur = s.section;
    var tab = '<section class="ctab t-beam-cmp"><h2>Other sections under this load</h2><p class="t-beam-cap">' + esc(r.mat.name) + ", " + K.n(s.L, 2) + " in, " + K.n(s.P, 1) + " lbf, " + holdName(s.hold).toLowerCase() + (symmetric(s) ? "" : ", rectangles the " + (s.way === "flat" ? "flat" : "tall") + " way") + ". Lightest first. The safety factor is against bending yield only, so check the bend too.</p>" +
      '<div class="scroll"><table><thead><tr><th>Section</th><th class="r">Bend</th><th class="r">Safety factor</th><th class="r">Weight</th><th></th></tr></thead><tbody>' +
      cmp.rows.map(function (q) {
        var on = q.id === cur, best = q.id === cmp.best, sfc = q.sf < 1 ? "bad" : q.sf < 3 ? "warn" : "";
        return '<tr class="' + (on ? "pick" : "") + '"><td>' + esc(q.name) + (best ? '<small class="t-beam-best">Lightest with a safety factor of 3; it bends ' + K.fix(q.delta, 2) + " in</small>" : "") + '</td><td class="r num">' + (q.sf < 1 ? "yields" : q.big ? "too far" : inch(q.delta)) + '</td><td class="r num' + (sfc ? " t-beam-" + sfc : "") + '">' + (isFinite(q.sf) ? K.fix(q.sf, 1) : "–") + '</td><td class="r num">' + K.fix(q.weight, 2) + ' lb</td><td class="r">' +
          (on ? '<span class="pill ok">In the drawing</span>' : '<button class="btn sm" data-act="beamuse" data-v="' + q.id + '">Use this one</button>') + "</td></tr>";
      }).join("") + "</tbody></table></div>" + (cmp.best ? "" : '<p class="t-beam-cap">None of these keeps a safety factor of 3 here. Shorten the span, support both ends, or use steel.</p>') + "</section>";
    return '<div class="chartrow">' + defl + str + "</div>" + tab + K.notes(
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
    var frac = ease(t / DUR), P = s.P * frac, loading = frac < 0.999 && s.P > 0;
    /* Two areas: the beam, and the cross-section (a column at the right on a laptop; a short strip along the bottom
       on a phone, so the beam gets most of the phone's stage). */
    var panH = narrow ? Math.min(168, Math.round(H * 0.42)) : H;
    var pan = narrow ? { x: 0, y: H - panH, w: W, h: panH } : { x: W - F.clamp(W * 0.36, 250, 320), y: 0, w: 0, h: H };
    if (!narrow) pan.w = W - pan.x;
    // Room at the free end for the whole bend label ("really 0.121 in"), so it is never cut off.
    var finalLab = "really " + inch(r.delta), labW = g.textWidth(finalLab, { size: 12, weight: 600 });
    var rightRoom = s.hold === "cant" ? (narrow ? 26 : labW + 34) : 36;
    var ax0 = 36, ax1 = (narrow ? W : pan.x) - rightRoom, top = 20, bot = (narrow ? pan.y : H) - 38;
    var arrowLen = Math.min(narrow ? 44 : 56, (bot - top) * 0.2);
    // One scale for length and depth, so the beam is to scale both ways.
    var k = Math.min((ax1 - ax0) / L, 0.2 * (bot - top) / sec.H), th = Math.max(4, sec.H * k);
    // Room in the header for its extra lines: a compared setup, and the past-yield note.
    var cmp = K.compare ? K.compare(ID) : null, extra = (cmp && cmp.r && isFinite(cmp.r.EI) ? 16 : 0) + (s.P > r.Pyield ? 16 : 0);
    var x0 = ax0 + ((ax1 - ax0) - L * k) / 2, cy = top + 34 + extra + arrowLen + th / 2;
    var V = { k: k, X: function (x) { return x0 + x * k; }, Y: function (y) { return cy - y * k; }, L: function (l) { return l * k; }, ux: function (px) { return (px - x0) / k; }, uy: function (py) { return (cy - py) / k; } };
    var step = M.gridStep(L);                       // from the length alone: the same squares in every frame and on every screen
    g.ctx.save(); g.ctx.beginPath(); g.ctx.rect(0, 0, narrow ? W : pan.x, narrow ? pan.y : H); g.ctx.clip(); g.grid(V, step, ""); g.ctx.restore();
    // How much to enlarge the bend so it shows: on a phone, a little more of the room under the beam.
    var below = s.hold === "simple" ? 26 : s.hold === "cant" && narrow ? 30 : 14;
    // The bend's enlargement is fixed by the tube, its length and how it is held (M.drawScale), never by the load, so
    // it holds still while the load is dragged or comes on. A bend deeper than the room under the beam (well past
    // yield) is drawn to the room's edge and the note says it runs off.
    var room = bot - (cy + th / 2) - below, f = M.drawScale(r), maxPx = Math.max(10, room), offRoom = false;
    function yAt(x) { var d = M.deflect(s.hold, P, L, r.EI, x) * k * f; if (d > maxPx) { offRoom = true; d = maxPx; } return cy + d; }
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
    // The faces, named on the tube itself where it bends most (near the wall, or a third of the way in): which one is
    // stretched and which squeezed, from the sign of the bending moment there.
    var faceBotY = -1;
    if (s.P > 0) {
      var fxx = s.hold === "cant" ? 0.24 * L : s.hold === "simple" ? 0.2 * L : 0.3 * L, mo = M.moment(s.hold, s.P, L, fxx), topSt = mo < 0;
      var fo = { size: 12, weight: 600, color: c.text2, align: "center" }, t1 = "top " + (topSt ? "stretched" : "squeezed"), t2 = "bottom " + (topSt ? "squeezed" : "stretched");
      // Clear of the supports at the ends, and (resting on or held at both ends) left of the middle, where the bend's figure is.
      var hw = Math.max(g.textWidth(t1, fo), g.textWidth(t2, fo)) / 2 + 4, fpx = Math.max(V.X(0) + 24 + hw, Math.min(V.X(L) - 10 - hw, V.X(fxx)));
      if (s.hold !== "cant") fpx = Math.max(V.X(0) + 24 + hw, Math.min(fpx, V.X(L / 2) - 8 - hw));
      // Each word clears the beam (and the unloaded outline) all along its own width.
      var hiY = cy, loY = cy; for (var q2 = 0; q2 <= 8; q2++) { var xx = F.clamp(V.ux(fpx - hw + 2 * hw * q2 / 8), 0, L), yy = yAt(xx); hiY = Math.min(hiY, yy); loY = Math.max(loY, yy); }
      g.text(t1, fpx, hiY - th / 2 - 8, fo);
      g.text(t2, fpx, loY + th / 2 + 17, fo); faceBotY = loY + th / 2 + 17;
    }
    // A saved setup being compared (the kit's Saved setups, then Compare): its bent centre line, dotted grey as on the charts, at this
    // drawing's scale and enlargement whatever its length or support, with its name and its largest bend. It is drawn
    // over this tube rather than under it, because a centre line under a tube is hidden by the tube's own width.
    if (cmp && cmp.r && cmp.s && isFinite(cmp.r.EI)) drawSaved(g, cmp, V, cy, f, maxPx, narrow ? W : pan.x, top);
    // Supports.
    var sh = Math.max(th + 40, 64);
    if (s.hold === "cant" || s.hold === "fixed") wall(g, V.X(0), cy, sh, -1);
    if (s.hold === "fixed") wall(g, V.X(L), cy, sh, 1);
    if (s.hold === "simple") { pin(g, V.X(0), cy + th / 2, false); pin(g, V.X(L), cy + th / 2, true); }
    // The load. While "Load it" plays, the arrow says how far the load has got, so it does not read as an answer.
    var xl = r.xmax, lx = V.X(xl), ly = yAt(xl) - th / 2;
    var pd = s.P < 10 ? 1 : 0, ltxt = loading ? "loading: " + K.n(P, pd) + " of " + K.n(s.P, pd) + " lbf" : K.n(s.P, pd) + " lbf";
    if (s.P > 0) {
      g.arrow(lx, ly - arrowLen, lx, ly - 2, { color: c.force, width: 2 + 2 * frac, head: 10 });
      // Beside the arrow, clear of the bend's dimension line (just right of the arrow when held at both ends or resting
      // on them), and only where it does not touch the bent beam; the line at the top of the drawing always gives it.
      var dimHere = s.hold !== "cant" && M.deflect(s.hold, P, L, r.EI, xl) * k * f > 10, lw = g.textWidth(ltxt, { weight: 700 });
      var lx0 = s.hold === "cant" ? lx - 8 - lw : lx + (dimHere ? 26 : 8), lyy = ly - arrowLen + 4, hitBeam = false;
      for (var q = 0; q <= 12; q++) { var px = lx0 + lw * q / 12, bx = V.ux(px); if (bx >= 0 && bx <= L) { var bt = yAt(bx) - th / 2, bb = yAt(bx) + th / 2; if (bb > lyy - 10 && bt < lyy + 10) hitBeam = true; } }
      if (!hitBeam) { g.rect(lx0 - 4, lyy - 9, lw + 8, 18, { fill: c.sheet, stroke: null, radius: 3 }); g.text(ltxt, lx0, lyy, { color: c.force, weight: 700, base: "middle", halo: false }); }
    }
    // Where it yields first, once it does.
    if (P > r.Pyield) {
      var hot = s.hold === "cant" ? 0 : L / 2, hy = yAt(hot);
      g.circle(V.X(hot), hy, th / 2 + 7, { stroke: c.bad, width: 2 });
      if (hot === 0) g.text("Yields here", V.X(hot) + 14, hy + th / 2 + 24, { color: c.bad, weight: 700 });
      // In the middle it goes under the bend's figure (below), clear of the beam and the dimension line.
    }
    // The bend, dimensioned in true inches: the same figure, to the same places, as the Deflection answer.
    var dTrue = M.deflect(s.hold, P, L, r.EI, xl), dDraw = dTrue * k * f, lab = "really " + inch(dTrue);
    if (s.hold === "cant") {                       // beside the free end, or under it on a phone
      if (dDraw > 16) g.dim(lx + 12, cy, lx + 12, cy + dDraw, narrow ? "" : lab, 0, { side: "right", color: c.text2 });
      if (s.P > 0 && (narrow || dDraw <= 16)) g.text((dDraw > 16 ? "" : "Bends ") + lab, lx + 14, cy + dDraw + th / 2 + 18, { color: c.text2, weight: 600, align: "right" });
    } else if (s.P > 0) {                          // under the middle: from where the bottom face was to where it is
      var yb0 = cy + th / 2;
      if (dDraw > 16) g.dim(lx + 16, yb0, lx + 16, yb0 + dDraw, "", 0, { color: c.text2 });
      var ry0 = yb0 + dDraw + (s.hold === "simple" && L * k < 80 ? 40 : 16) + (P > r.Pyield ? 10 : 0);
      // Under the low point, starting just right of the middle (the face label keeps to the left of it).
      var bt = (dDraw > 16 ? "" : "Bends ") + lab, btw = g.textWidth(bt, { weight: 600 });
      if (lx + 6 + btw <= V.X(L) - 24) g.text(bt, lx + 6, ry0, { color: c.text2, weight: 600 });
      else g.text(bt, lx, Math.max(ry0, faceBotY + 18), { color: c.text2, weight: 600, align: "center" });   // no room: a line lower, centred
      if (P > r.Pyield) g.text("Yields here (circled)", lx, ry0 + 17, { color: c.bad, weight: 700, align: "center" });
    }
    g.dim(V.X(0), (narrow ? pan.y : H) - 14, V.X(L), (narrow ? pan.y : H) - 14, K.n(L, 2) + " in", 0);
    // Words at the top left.
    g.text(holdName(s.hold) + ", " + (s.P > 0 ? ltxt : "no load") + " " + where(s.hold), 12, top + 8, { weight: 600, base: "middle" });
    var note = (step === 1 ? "1 in" : step + " in") + " squares. Bend drawn " + (f > 1 ? f + "×" + (narrow ? " at every load" : ", the same at every load") : "true size");
    var hy = top + 40;
    if (offRoom) { g.text("Past yield the bend runs off the drawing", 12, hy, { color: c.warn, size: 11, weight: 600, base: "middle" }); hy += 16; }
    // The compared setup, named once in the header beside a sample of its dashed line.
    if (cmp && cmp.r && isFinite(cmp.r.EI)) { g.line(12, hy, 34, hy, { color: c.text2, width: 2.25, dash: [1, 5.5] }); g.text(cmp.name + ", its centre line: bends " + inch(cmp.r.delta) + (cmp.s.L !== L ? ", " + K.n(cmp.s.L, 2) + " in long" : "") + (cmp.s.hold !== s.hold ? ", " + holdName(cmp.s.hold).toLowerCase() : ""), 40, hy, { color: c.text2, size: 11, weight: 700, base: "middle" }); }
    g.text(note, 12, top + 24, { color: c.mute, size: 11, base: "middle" });
    // The cross-section.
    section(g, s, r, pan, narrow, k, frac);
  }
});

/* The saved setup's centre line, from its own support, length and load, drawn with this page's scale (V, f) and cut at
   the same depth as this tube's (maxPx) and at the drawing's right edge (xMax). Its name and bend are in the header. */
function drawSaved(g, cmp, V, cy, f, maxPx, xMax, top) {
  var c = g.c, cs = cmp.s, cr = cmp.r, L = cs.L, pts = [], deep = { y: -Infinity, x: 0 };
  for (var i = 0; i <= 80; i++) {
    var x = L * i / 80, px = V.X(x); if (px > xMax - 4) break;
    var d = Math.min(M.deflect(cs.hold, cs.P, L, cr.EI, x) * V.k * f, maxPx), py = cy + d;
    pts.push([px, py]); if (py > deep.y) deep = { x: px, y: py };
  }
  if (pts.length < 2) return;
  g.path(pts, { color: c.text2, width: 2.25, dash: [1, 5.5] });
}
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
// The cross-section, enlarged, with its neutral axis and the stress across it on a scale from yield to yield.
function section(g, s, r, pan, narrow, kBeam, frac) {
  var c = g.c, sec = r.sec;
  g.rect(pan.x, pan.y, pan.w, pan.h, { fill: c.sheet, stroke: null });
  if (narrow) g.line(0, pan.y, g.w, pan.y, { color: c.line, width: 1 }); else g.line(pan.x, 0, pan.x, g.h, { color: c.line, width: 1 });
  // Room for the height label on the left, and on the right for the stress scale (its gap, two halves and "yield").
  var Lh = Math.max(44, 30 + g.textWidth(frac2(sec.H) + " in", { size: 12, weight: 600 }));
  var boxW = narrow ? Math.min(80, pan.w * 0.21) : Math.max(24, Math.min(pan.w * 0.24, pan.w - Lh - 36 - 68 - 34)), boxH = narrow ? pan.h - 116 : Math.min(pan.h * 0.34, 124);
  var ks = Math.min(boxW / sec.B, boxH / sec.H), bw = sec.B * ks, bh = sec.H * ks;
  var cx = (narrow ? 0 : pan.x) + Lh + bw / 2, cy = narrow ? pan.y + 64 + boxH / 2 : pan.y + 72 + boxH / 2;
  g.text(narrow ? "Cross-section" : "Cross-section, enlarged", narrow ? 12 : pan.x + 12, pan.y + 18, { weight: 600, size: 12 });
  if (sec.shape === "round") {
    g.circle(cx, cy, bw / 2, { fill: c.part, stroke: c.partLine, width: 1.25 });
    if (!sec.solid) g.circle(cx, cy, sec.d * ks / 2, { fill: c.sheet, stroke: c.partLine, width: 1.25 });
  } else {
    g.rect(cx - bw / 2, cy - bh / 2, bw, bh, { fill: c.part, stroke: c.partLine, width: 1.25 });
    if (!sec.solid) { var tw = sec.t * ks; g.rect(cx - bw / 2 + tw, cy - bh / 2 + tw, bw - 2 * tw, bh - 2 * tw, { fill: c.sheet, stroke: c.partLine, width: 1.25 }); }
  }
  // Dimensions.
  g.dim(cx - bw / 2, cy + bh / 2 + 10, cx + bw / 2, cy + bh / 2 + 10, frac2(sec.B) + " in", 0, { side: "below", size: 12 });
  g.dim(cx - bw / 2 - 12, cy + bh / 2, cx - bw / 2 - 12, cy - bh / 2, frac2(sec.H) + " in", 0, { side: "left", size: 12 });
  /* The stress across the depth, as a small chart on its side: zero on the neutral axis, the red dashes at yield
     either side (squeezed one way, stretched the other), and the wedge reaching out to this load's stress. */
  // A fixed scale, 0 to yield either side, with a mark at a third of yield (a safety factor of 3): it never refits to
  // the load, so the wedge grows as the load does.
  var zoom = 1, lim = narrow ? 34 : 44, sx = cx + bw / 2 + (narrow ? 46 : 36) + lim, share = r.share * frac, wv = lim * Math.min(share * zoom, 1.15);
  var fc = M.faces(s.hold, s.P, s.L), topSq = fc.topSqueezed;   // from the moment's sign at the most-stressed point
  g.line(cx - bw / 2 - 6, cy, sx + lim + 4, cy, { color: c.accent, width: 1.25, dash: [8, 3, 2, 3] });
  g.line(sx, cy - bh / 2 - 2, sx, cy + bh / 2 + 2, { color: c.text2, width: 1 });
  [-1, 1].forEach(function (sg) { g.line(sx + sg * lim, cy - bh / 2 - 4, sx + sg * lim, cy + bh / 2 + 4, { color: c.bad, width: 1, dash: [3, 3] }); g.line(sx + sg * lim / 3, cy - bh / 2, sx + sg * lim / 3, cy + bh / 2, { color: c.mute, width: 1, dash: [2, 3] }); });
  if (wv > 0.5) {
    var col = share >= 1 ? c.bad : share > 1 / 3 ? c.warn : c.s1, d = topSq ? -1 : 1;
    g.poly([[sx, cy], [sx + d * wv, cy - bh / 2], [sx, cy - bh / 2]], { fill: col, stroke: null });
    g.poly([[sx, cy], [sx - d * wv, cy + bh / 2], [sx, cy + bh / 2]], { fill: col, stroke: null });
  }
  // The scale under it: yield, 0, yield; and which side is squeezed and which stretched.
  var sy = cy + bh / 2 + 32, ss = { size: 12, weight: 600, align: "center" };
  var tick = zoom > 1 ? K.n(100 / zoom, 0) + "%" : "yield", tc = zoom > 1 ? c.text2 : c.bad;
  g.text(tick, sx - lim, sy, Object.assign({ color: tc }, ss)); g.text("0", sx, sy, Object.assign({ color: c.text2 }, ss)); g.text(tick, sx + lim, sy, Object.assign({ color: tc }, ss));
  if (zoom > 1) { var zt = "ticks: % of yield", tw0 = g.textWidth(narrow ? "Cross-section" : "Cross-section, enlarged", { weight: 600, size: 12 }); if (narrow) g.text(zt, 12 + tw0 + 10, pan.y + 18, { size: 12, color: c.mute }); else g.text(zt, pan.x + 12, pan.y + 34, { size: 12, color: c.mute }); }
  // Each face's word beside its own end of the triangle: the top's above it, the bottom's below it, each on the side
  // its wedge points to.
  var dd = topSq ? -1 : 1, tTop = topSq ? "squeezed" : "stretched", tBot = topSq ? "stretched" : "squeezed", lo = { size: 12, color: c.text2, weight: 600 };
  // The triangle's tip value, just above its top end; the face's word above that.
  if (s.P > 0 && wv > 0.5) { var tipT = K.n(share * 100, 0) + "%", tipW = g.textWidth(tipT, { size: 12, weight: 700 }), tipX = sx + dd * wv; g.text(tipT, dd > 0 ? Math.min(tipX - tipW / 2, pan.x + pan.w - 8 - tipW) : Math.max(tipX - tipW / 2, sx - wv - tipW), cy - bh / 2 - 6, { size: 12, weight: 700, color: col }); }
  g.text(tTop, dd > 0 ? Math.min(sx + 3, pan.x + pan.w - 8 - g.textWidth(tTop, lo)) : sx - 3, cy - bh / 2 - 22, Object.assign({ align: dd > 0 ? "left" : "right" }, lo));
  g.text(tBot, dd > 0 ? sx - 3 : Math.min(sx + 3, pan.x + pan.w - 8 - g.textWidth(tBot, lo)), cy + bh / 2 + 16, Object.assign({ align: dd > 0 ? "right" : "left" }, lo));
  // The neutral axis named on its own line, at its right-hand end; the wall named beside the section.
  var nax = sx + lim + 7, naw = g.textWidth("neutral axis", { size: 12, weight: 600 });
  // Where it fits: at the line's right-hand end, else inside the section just above the line, else in the lines below.
  // At the line's right-hand end where it fits; on a laptop's narrow panel, as a key under the picture: a sample of
  // the dash-dot line and its name, with the wall thickness beside it.
  var naxis = !narrow && nax + naw < pan.x + pan.w - 4;
  if (naxis) g.text("neutral axis", nax, cy, { size: 12, weight: 600, color: c.accent, base: "middle" });
  if (!narrow) {
    var ky = sy + 30, kx = pan.x + 12;
    if (!naxis) { g.line(kx, ky - 4, kx + 22, ky - 4, { color: c.accent, width: 1.25, dash: [8, 3, 2, 3] }); g.text("neutral axis, no stress", kx + 28, ky, { size: 12, weight: 600, color: c.accent }); naxis = true; ky += 16; }
    g.line(kx + 10, ky - 10, kx + 10, ky + 1, { color: c.mute, width: 1, dash: [2, 3] }); g.text("a third of yield (safety factor 3)", kx + 28, ky, { size: 12, color: c.mute }); ky += 16;
    if (!sec.solid) g.text("tube wall " + frac2(sec.t) + " in", kx, ky, { size: 12, color: c.mute });
  }
  var lab = narrow ? Math.max(sx + lim + 14, sx + 14 + g.textWidth("stretched", { size: 12 })) : pan.x + 12, ly = narrow ? pan.y + 44 : sy + 86, maxW = (narrow ? g.w : pan.x + pan.w) - lab - 8;
  // One line each: where, which face is stretched, the stress, and its share of yield.
  var where = s.hold === "cant" ? "At the support, most stressed" : s.hold === "simple" ? "At the middle, most stressed" : "At the middle and the held ends";
  var rows = [[where, { color: c.accent, size: 12, weight: 700 }],
    [fc.swap ? (topSq ? "Middle: top squeezed; ends: top stretched" : "Middle: top stretched; ends: top squeezed") : "Top " + (topSq ? "squeezed" : "stretched") + ", bottom " + (topSq ? "stretched" : "squeezed"), { color: c.text2, size: 12 }],
    [K.n(r.stress * frac, 0) + " psi, " + K.n(share * 100, 0) + "% of yield", { color: share >= 1 ? c.bad : c.text, size: 12, weight: 600 }]];
  if (narrow) { rows.push(["Dash-dot: no stress", { color: c.accent, size: 12, weight: 600 }]); rows.push(["Grey dashes: a third of yield", { color: c.mute, size: 12 }]); if (!sec.solid) rows.push(["Tube wall " + frac2(sec.t) + " in", { color: c.mute, size: 12 }]); }
  // Each label wrapped to the room beside the section, so nothing runs off a phone's edge.
  var y = ly, lh = narrow ? 15 : 17;
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
