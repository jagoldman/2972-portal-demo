/* Tools: Pneumatics (#tool-air). The air a robot's cylinders use in a match against what its tanks store, with an
   optional compressor. Isothermal (Boyle's law): the air is taken to stay at room temperature. The match plays: the
   cylinders stroke when they are used, the tank level and the gauge fall, and the pressure chart follows.
   The maths (M) runs in Node for tests/tool-air.test.js. Inches, psi and seconds inside; free air in cubic inches. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");

/* ---------- Maths ---------- */
var M = {};
M.ATM = 14.7;                    // psi, atmospheric pressure at sea level (absolute)
M.IN3_PER_ML = 1 / 16.387064;    // cubic inches in a millilitre
M.L_PER_IN3 = 0.016387064;       // litres in a cubic inch
M.IN3_PER_CF = 1728;             // cubic inches in a cubic foot
M.area = function (d) { return Math.PI * d * d / 4; };
// Volume (in^3) one extend and one retract fill.
M.strokeVol = function (c) { var A = M.area(c.bore), a = M.area(Math.min(c.rod, c.bore)); return { out: A * c.stroke, back: (A - a) * c.stroke }; };
// A volume at a gauge pressure, as free air (the volume it would fill at atmospheric pressure).
M.freeAir = function (vol, psig) { return vol * (psig + M.ATM) / M.ATM; };
// Force at a gauge pressure: push = P x bore area, pull = P x (bore area - rod area). lbf.
M.forces = function (c, psig) { var A = M.area(c.bore), a = M.area(Math.min(c.rod, c.bore)); return { push: psig * A, pull: psig * (A - a) }; };
// Tank pressure (psig) after one stroke of volume vol (in^3) from tanks of volume Vt at P (psig), regulated to work (psig).
// Returns { tank, cyl } : the tank's pressure after, and the pressure the cylinder got.
M.use = function (P, Vt, vol, work) {
  var pa = P + M.ATM, wa = work + M.ATM, after = pa - vol * wa / Vt;
  if (after >= wa) return { tank: after - M.ATM, cyl: work };
  // The tanks cannot hold working pressure through this stroke: tank and cylinder share what is left.
  var eq = (pa * Vt + M.ATM * vol) / (Vt + vol);
  if (eq - M.ATM >= work) return { tank: Math.max(after, wa) - M.ATM, cyl: work };
  return { tank: eq - M.ATM, cyl: eq - M.ATM };
};
// The strokes of a match, cycles spread evenly; each cycle is out, then back half a window later. win in seconds.
M.events = function (cyls, match) {
  var ev = [];
  cyls.forEach(function (c, i) {
    var n = Math.max(0, Math.round(c.cycles)); if (!n) return;
    var gap = match / n, win = Math.min(0.8 * gap, Math.max(2, match * 0.04)), v = M.strokeVol(c);
    for (var k = 0; k < n; k++) { var t = (k + 0.5) * gap; ev.push({ t: t, i: i, k: k, dir: "out", vol: v.out, win: win }); ev.push({ t: t + win / 2, i: i, k: k, dir: "back", vol: v.back, win: win }); }
  });
  ev.sort(function (a, b) { return a.t - b.t || a.i - b.i; });
  return ev;
};
/* A match. o: { tanks, ml (each), stored, work (psig), cfm (free air the compressor adds per minute; 0 = none),
   match (s), cyls: [{ name, bore, stroke, rod, cycles }] }.
   Returns { Vt (in^3), ev (each stroke with the pressure it got), pts ([[t, psig]] for a chart), end, used, stored,
   firstShort (the stroke that first got less than working pressure, or null), fullCycles, cycles }. */
M.sim = function (o) {
  var Vt = o.tanks * o.ml * M.IN3_PER_ML, ev = M.events(o.cyls, o.match), P = o.stored, t = 0, pts = [[0, P]];
  var rate = (o.cfm || 0) * M.IN3_PER_CF / 60 * M.ATM / Vt;        // psi per second the compressor adds
  function fill(to) {
    if (rate > 0 && P < o.stored) { var need = (o.stored - P) / rate; if (t + need < to) { P = o.stored; pts.push([t + need, P]); } else P += rate * (to - t); }
    t = to;
  }
  var firstShort = null, used = 0, doneOut = {};
  ev.forEach(function (e) {
    fill(e.t); pts.push([e.t, P]);
    var u = M.use(P, Vt, e.vol, o.work); e.before = P; P = u.tank; e.p = u.cyl; e.after = P; pts.push([e.t, P]);
    e.short = u.cyl < o.work - 1e-6; if (e.short && !firstShort) firstShort = e;
    used += M.freeAir(e.vol, o.work);
  });
  fill(o.match); pts.push([o.match, P]);
  // Whole cycles with both strokes at working pressure, before the first short stroke.
  var full = 0; ev.forEach(function (e) { if (e.dir === "back" && !e.short && (!firstShort || e.t < firstShort.t)) full++; });
  var cycles = ev.length / 2;
  return { Vt: Vt, ev: ev, pts: pts, end: P, used: used, stored: Vt * (o.stored - o.work) / M.ATM, firstShort: firstShort, fullCycles: full, cycles: cycles, rate: rate };
};
// The fewest tanks of this size that keep working pressure all match (null if more than 60).
M.tanksNeeded = function (o) {
  for (var n = 1; n <= 60; n++) if (!M.sim(Object.assign({}, o, { tanks: n })).firstShort) return n;
  return null;
};

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- Page ---------- */
var K = D.calc, esc = D.esc, ID = "tool-air", DUR = 8, MAXC = 6;
function L(in3) { return in3 * M.L_PER_IN3; }
function clock(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
function cylsOf(s) {
  return (Array.isArray(s.cyls) ? s.cyls : []).filter(function (c) { return c && isFinite(c.bore) && isFinite(c.stroke) && isFinite(c.rod) && isFinite(c.cycles); })
    .map(function (c) { return { name: String(c.name || "Cylinder"), bore: c.bore, stroke: c.stroke, rod: Math.min(c.rod, c.bore * 0.95), cycles: Math.max(0, Math.round(c.cycles)) }; });
}
function simOf(s, tanks) { return { tanks: tanks || s.tanks, ml: s.ml, stored: s.stored, work: Math.min(s.work, s.stored), cfm: s.comp === "robot" ? s.cfm : 0, match: s.match, cyls: cylsOf(s) }; }

K.tool({
  id: ID,
  defaults: { tanks: 2, ml: 574, stored: 120, work: 60, comp: "none", cfm: 0.35, match: 160,
    cyls: [{ name: "Intake deploy", bore: 1.0625, stroke: 4, rod: 0.3125, cycles: 6 }, { name: "Climber latch", bore: 0.75, stroke: 2, rod: 0.25, cycles: 2 }] },
  stage: { ratio: 2.1, narrow: 1.0, label: "The air system as a schematic: tanks filled to their pressure, a gauge, the regulator, and each cylinder to scale, stroking as the match plays." },
  duration: function () { return DUR; }, autoplay: true, playLabel: "Play the match",

  compute: function (s) {
    var o = simOf(s), r = M.sim(o);
    r.o = o; r.cyls = o.cyls; r.need = r.firstShort ? M.tanksNeeded(o) : null;
    r.per = o.cyls.map(function (c) { var v = M.strokeVol(c), f = M.forces(c, o.work); return { c: c, cycleAir: M.freeAir(v.out + v.back, o.work), push: f.push, pull: f.pull, alone: Math.floor(r.stored / M.freeAir(v.out + v.back, o.work)) }; });
    return r;
  },

  controls: function (s) {
    var air = K.num(ID, "tanks", "Air tanks", { min: 1, max: 12, step: 1, slider: true }) +
      K.num(ID, "ml", "Volume of each", { unit: "mL", min: 50, max: 2000, step: 1, tip: "Printed on the tank. A common plastic tank holds 574 mL." }) +
      K.num(ID, "stored", "Stored pressure", { unit: "psi", min: 20, max: 120, step: 1, tip: "What the tanks are filled to. The game manual caps it, usually at 120 psi; check this year's rules." }) +
      K.num(ID, "work", "Working pressure", { unit: "psi", min: 5, max: 60, step: 1, tip: "What the regulator lets through to the cylinders. The game manual caps it, usually at 60 psi." });
    var comp = K.seg(ID, "comp", "Compressor", [["none", "None on the robot"], ["robot", "On the robot"]]) +
      (s.comp === "robot" ? K.num(ID, "cfm", "Flow", { unit: "cfm", min: 0.01, max: 3, step: 0.01, tip: "Read it off the compressor maker's chart at your working pressure, in cubic feet of free air per minute." }) : "");
    var rows = cylsOf(s).map(function (c, i) {
      function f(key, label, unit, min, max, step) { return '<label class="t-air-f"><span>' + label + '</span><span class="t-air-v"><input class="inp num" type="number" inputmode="decimal" min="' + min + '" max="' + max + '" step="' + step + '" value="' + c[key] + '" data-input="aircyl" data-i="' + i + '" data-f="' + key + '"><small>' + unit + "</small></span></label>"; }
      return '<div class="t-air-cyl"><div class="t-air-top"><input class="inp" type="text" value="' + esc(c.name) + '" aria-label="Name of cylinder ' + (i + 1) + '" data-input="aircyl" data-i="' + i + '" data-f="name"><button class="btn sm ghost" data-act="airdel" data-i="' + i + '">Remove</button></div><div class="t-air-grid">' +
        f("bore", "Bore", "in", 0.25, 4, 0.0625) + f("stroke", "Stroke", "in", 0.25, 36, 0.25) + f("rod", "Rod", "in", 0.0625, 3, 0.0625) + f("cycles", "Cycles", "a match", 0, 200, 1) + "</div></div>";
    }).join("");
    var cyl = '<p class="t-air-hint">One cycle is out and back. The rod must be thinner than the bore.</p>' + rows + (cylsOf(s).length < MAXC ? '<button class="btn sm" data-act="airadd">Add a cylinder</button>' : "");
    return K.group(ID, "air", "Air", air) + K.group(ID, "cyl", "Cylinders", cyl) + K.group(ID, "comp", "Compressor", comp) + K.group(ID, "adv", "Match", K.num(ID, "match", "Match length", { unit: "s", min: 15, max: 300, step: 1, tip: "The cycles are spread evenly through this time. 160 s is a typical match with autonomous and teleop together." }), true);
  },

  outs: function (s, r) {
    var o = r.o, text, st;
    if (!r.cycles) { st = "info"; text = "No cylinder is used in this match. Add cycles to see the air they need."; }
    else if (!r.firstShort) { st = "ok"; text = "The tanks last the match" + (o.cfm ? " with the compressor topping up" : "") + ": it uses " + K.n(L(r.used), 2) + " L of free air against " + K.n(L(r.stored), 2) + " L stored above " + o.work + " psi, and ends at " + K.n(r.end, 0) + " psi."; }
    else {
      st = "bad"; var f = r.firstShort;
      text = "Pressure falls below " + o.work + " psi at about " + K.n(f.t, 0) + " s (" + clock(f.t) + "), after " + r.fullCycles + " of " + r.cycles + " cycles. " +
        (r.need ? "It would take " + r.need + " tanks of this size (" + (r.need - o.tanks) + " more)" + (o.cfm ? "." : ", or a compressor on the robot.") : "More tanks will not fix it: use smaller or fewer cylinders, or a compressor.");
    }
    var share = r.stored > 0 ? r.used / r.stored : Infinity;
    return K.verdict(st, text) + K.outs([
      { k: "Air used in a match", v: K.n(L(r.used), 2), u: "L", sub: "free air, at " + o.work + " psi", tip: "Free air: the volume it would fill at atmospheric pressure. Each stroke fills its cylinder at working pressure, then lets it out." },
      { k: "Stored above working", v: K.n(L(r.stored), 2), u: "L", sub: "free air in " + o.tanks + " × " + K.n(o.ml, 0) + " mL", tip: "Only the air above working pressure is usable at full force." },
      { k: "Pressure at the end", v: K.n(r.end, 0), u: "psi", state: r.end < o.work - 1e-6 ? "bad" : "", sub: "in the tanks" },
      { k: "Cycles at full force", v: r.fullCycles + " of " + r.cycles, state: r.firstShort ? "bad" : "", sub: "before it falls below " + o.work + " psi" },
      { k: r.firstShort ? "Tanks it would take" : "Share of stored air", v: r.firstShort ? (r.need ? String(r.need) : "over 60") : K.n(share * 100, 0) + "%", state: r.firstShort ? "bad" : share > 0.8 ? "warn" : "", sub: r.firstShort ? "of " + K.n(o.ml, 0) + " mL" + (o.cfm ? ", with the compressor" : "") : "of what is stored above " + o.work + " psi" }]);
  },

  more: function (s, r) {
    var o = r.o;
    var chart = K.chart({ id: "air-p", title: "Tank pressure through the match", x: { label: "match time, s", name: "At", unit: "s", min: 0, max: o.match }, y: { label: "psi", unit: "psi", min: 0, max: Math.max(o.stored * 1.1, 10) },
      series: [{ name: "Tank pressure", pts: r.pts, color: 1 }], hlines: [{ y: o.work, label: "Working " + o.work + " psi" }],
      marks: r.firstShort ? [{ x: r.firstShort.t, label: "Below working" }] : [] });
    var strokes = K.chart({ id: "air-s", title: "Pressure each stroke gets", x: { label: "match time, s", name: "At", unit: "s", min: 0, max: o.match }, y: { label: "psi", unit: "psi", min: 0, max: Math.max(o.work * 1.2, 5) },
      series: r.cyls.map(function (cy, j) { return { name: cy.name, color: j < 3 ? j + 1 : "mute", pts: r.ev.filter(function (e) { return e.i === j; }).map(function (e) { return [e.t, e.p]; }) }; }), hlines: [{ y: o.work, label: "Working " + o.work + " psi" }] });
    var tab = '<section class="ctab"><h2>Cylinders at ' + o.work + ' psi</h2><div class="scroll"><table><thead><tr><th>Cylinder</th><th class="r">Bore × stroke</th><th class="r">Rod</th><th class="r">Cycles</th><th class="r">Air per cycle</th><th class="r">Push</th><th class="r">Pull</th><th class="r">Cycles from full, alone</th></tr></thead><tbody>' +
      r.per.map(function (p) { return "<tr><td>" + esc(p.c.name) + '</td><td class="r num">' + K.fix(p.c.bore, 4).replace(/0+$/, "").replace(/\.$/, "") + " × " + K.n(p.c.stroke, 2) + ' in</td><td class="r num">' + K.fix(p.c.rod, 4).replace(/0+$/, "").replace(/\.$/, "") + ' in</td><td class="r num">' + p.c.cycles + '</td><td class="r num">' + K.n(L(p.cycleAir), 3) + ' L</td><td class="r num">' + K.n(p.push, 1) + ' lbf</td><td class="r num">' + K.n(p.pull, 1) + ' lbf</td><td class="r num">' + (o.stored > o.work ? p.alone : 0) + "</td></tr>"; }).join("") +
      "</tbody></table></div></section>";
    return '<div class="chartrow">' + chart + strokes + "</div>" + tab + K.notes(
      "<p>Air is treated as staying at room temperature as it expands (isothermal, Boyle's law: pressure × volume stays the same for the same air). Pressures in the sums are absolute, gauge plus 14.7 psi.</p>" +
      '<p class="eq">one extend fills: bore area × stroke;  one retract fills: (bore area − rod area) × stroke</p>' +
      '<p class="eq">free air = volume × (working psi + 14.7) ÷ 14.7</p>' +
      '<p class="eq">stored above working = tank volume × (stored psi − working psi) ÷ 14.7</p>' +
      '<p class="eq">tank after a stroke: (P + 14.7) → (P + 14.7) − stroke volume × (working + 14.7) ÷ tank volume</p>' +
      '<p class="eq">push = working psi × bore area;  pull = working psi × (bore area − rod area)</p>' +
      "<p>Each cylinder's cycles are spread evenly through the match, out and then back a moment later. Once a stroke would pull the tanks under working pressure, the regulator is wide open: the tank and the cylinder share what is left, so that stroke and every one after it gets less pressure and less force.</p>" +
      "<p>The compressor's flow is taken as free air per minute, the same all the time, running whenever the tanks are under the stored pressure. A real compressor gives less as the pressure rises, so read its chart at your working pressure. It is also left out that the air cools as it expands in a quick stroke (which uses a little more), and the tubing and fittings, which hold some air too. Treat the answer as a close estimate and keep a margin.</p>" +
      "<p>In the drawing the tank fill shows its pressure against the stored pressure, and the gauge marks stored and working pressure. The cylinders are to scale against each other. The match runs in " + DUR + " s; each cylinder strokes when it is used.</p>");
  },

  draw: function (g, s, r, t) { drawAir(g, s, r, t); }
});

/* ---------- Rows of cylinders ---------- */
D.inputs.aircyl = function (el) {
  var s = K.state(ID), i = +el.dataset.i, f = el.dataset.f, c = s.cyls[i]; if (!c) return;
  if (f === "name") { c.name = el.value.slice(0, 40); K.refresh(ID); return; }
  var v = parseFloat(el.value), lo = +el.min, hi = +el.max, bad = !isFinite(v) || v < lo || v > hi;
  if (!bad && f === "rod" && v >= c.bore) bad = true;
  if (!bad && f === "bore" && v <= c.rod) bad = true;
  if (!bad && f === "cycles" && Math.round(v) !== v) bad = true;
  el.classList.toggle("t-air-bad", bad); if (bad) return;
  c[f] = v; K.refresh(ID);
};
D.acts.airadd = function () { var s = K.state(ID); if (s.cyls.length >= MAXC) return; s.cyls.push({ name: "Cylinder " + (s.cyls.length + 1), bore: 0.75, stroke: 2, rod: 0.25, cycles: 4 }); D.render(); };
D.acts.airdel = function (b) { var s = K.state(ID); s.cyls.splice(+b.dataset.i, 1); D.render(); };
(function () {
  var st = document.createElement("style");
  st.textContent = ".t-air-hint { font-size: .78rem; color: var(--mute); margin: 0; }" +
    ".t-air-cyl { display: grid; gap: 6px; padding: 8px 0 10px; border-bottom: 1px solid var(--line); }" +
    ".t-air-top { display: flex; gap: 8px; align-items: center; } .t-air-top .inp { flex: 1; min-width: 0; min-height: 36px; padding: 4px 8px; font-weight: 600; }" +
    ".t-air-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }" +
    ".t-air-f { display: grid; gap: 2px; font-size: .78rem; color: var(--text-2); }" +
    ".t-air-v { display: flex; align-items: center; gap: 4px; } .t-air-v .inp { width: 100%; min-width: 0; min-height: 34px; padding: 3px 6px; text-align: right; } .t-air-v small { color: var(--mute); white-space: nowrap; font-size: .74rem; }" +
    ".t-air-f .inp.t-air-bad { border-color: var(--bad); background: var(--bad-bg); }" +
    "@media (max-width: 640px) { .t-air-v .inp, .t-air-top .inp { min-height: 44px; } }";
  document.head.appendChild(st);
})();

/* ---------- The drawing ---------- */
function drawAir(g, s, r, t) {
  var c = g.c, ctx = g.ctx, W = g.w, H = g.h, o = r.o, narrow = W < 560, T = F.clamp(t / DUR, 0, 1) * o.match;
  var P = pAt(r.pts, T), low = P < o.work - 1e-6, full = Math.max(o.stored, 1);
  K.chartNow("air-p", T); K.chartNow("air-s", T);
  // Header: the match clock and the tank pressure.
  g.text("Match clock " + clock(T) + " of " + clock(o.match), 12, 20, { weight: 700, size: 13 });
  g.text("Tanks " + K.n(P, 0) + " psi" + (low ? ", below working pressure" : ""), 12, 37, { color: low ? c.bad : c.text2, weight: 600, size: 12 });
  // Left: tanks and gauge (top band on a phone).
  var leftW = narrow ? W : Math.min(W * 0.36, 330), topH = narrow ? Math.min(H * 0.5, 210) : H;
  var tw = narrow ? 30 : 36, nDraw = Math.min(o.tanks, Math.max(1, Math.floor(((narrow ? W - 80 : leftW) - 22 - 118) / (tw + 10)))), th = Math.min(topH - (narrow ? 96 : 110), narrow ? 120 : 170), tx0 = 22, ty0 = (narrow ? 66 : 56) + (topH - 56 - 34 - th) / 2;
  if (s.comp === "robot") {                         // the compressor feeds the tanks
    var running = P < o.stored - 0.05 && t > 0, cx0 = tx0, cy0 = ty0 + th + 8;
    g.rect(cx0, cy0, 66, 22, { fill: c.part2, stroke: c.partLine, width: 1, radius: 4 });
    g.text("Compressor", cx0 + 33, cy0 + 11, { align: "center", base: "middle", size: 10, weight: 700, halo: false });
    if (running) g.text("running", cx0 + 72, cy0 + 11, { base: "middle", size: 10, color: c.ok, weight: 600 });
  }
  for (var i = 0; i < nDraw; i++) {
    var x = tx0 + i * (tw + 10), frac = F.clamp(P / full, 0, 1);
    ctx.save(); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, ty0, tw, th, tw / 2); else ctx.rect(x, ty0, tw, th); ctx.clip();
    ctx.globalAlpha = 0.35; g.rect(x, ty0 + th * (1 - frac), tw, th * frac + 1, { fill: low ? c.bad : c.s1, stroke: null }); ctx.globalAlpha = 1;
    g.line(x, ty0 + th * (1 - frac), x + tw, ty0 + th * (1 - frac), { color: low ? c.bad : c.s1, width: 2 });
    ctx.restore();
    g.rect(x, ty0, tw, th, { stroke: c.partLine, width: 1.5, radius: tw / 2 });
    // The working-pressure level on each tank.
    var wy = ty0 + th * (1 - o.work / full); g.line(x - 3, wy, x + tw + 3, wy, { color: c.accent, width: 1, dash: [3, 2] });
  }
  var tanksRight = tx0 + nDraw * (tw + 10) - 10;
  g.text(o.tanks > nDraw ? o.tanks + " tanks, " + nDraw + " drawn" : o.tanks + " × " + K.n(o.ml, 0) + " mL", tx0, ty0 - 8, { size: 11, color: c.text2, weight: 600 });
  // Gauge.
  var gr = narrow ? 36 : Math.min(48, (leftW - tanksRight - 30) / 2), gx = narrow ? tanksRight + 30 + gr : tanksRight + 18 + gr, gy = ty0 + gr + 16;
  gauge(g, gx, gy, gr, P, o, full);
  // The feed: tanks to gauge to regulator.
  var feedY = ty0 + th - 12, regX = narrow ? W - 80 : leftW + 4, regY = feedY - 14;
  g.line(tanksRight, feedY, gx, feedY, { color: c.mute, width: 2 }); g.line(gx, gy + gr, gx, feedY, { color: c.mute, width: 2 });
  g.line(gx, feedY, regX, feedY, { color: c.mute, width: 2 });
  g.rect(regX, regY, 64, 28, { fill: c.part, stroke: c.partLine, width: 1.25, radius: 4 });
  g.text("Regulator", regX + 32, regY + 10, { align: "center", base: "middle", size: 10, weight: 700, halo: false });
  g.text(o.work + " psi", regX + 32, regY + 21, { align: "center", base: "middle", size: 10, color: c.text2, halo: false });
  // Right: the cylinders, to scale against each other.
  var cyls = r.cyls, n = cyls.length;
  var ax0 = narrow ? 16 : leftW + 96, ax1 = W - 16, ay0 = narrow ? topH + 8 : 50, ay1 = H - 10;
  if (!narrow) g.line(regX + 64, feedY, ax0 - 30, feedY, { color: c.mute, width: 2 });
  else if (cyls.length) { g.line(regX + 32, regY + 28, regX + 32, ay0 - 2, { color: c.mute, width: 2 }); g.line(regX + 32, ay0 - 2, 8, ay0 - 2, { color: c.mute, width: 2 }); }
  if (!n) { g.text("No cylinders. Add one in Cylinders.", ax0, (ay0 + ay1) / 2, { color: c.mute }); return; }
  var rowH = (ay1 - ay0) / n, maxLen = 0, maxBore = 0;
  cyls.forEach(function (cy) { maxLen = Math.max(maxLen, 2 * cy.stroke + 1.6); maxBore = Math.max(maxBore, cy.bore); });
  var k = Math.min((ax1 - ax0 - 70) / maxLen, (rowH - 34) * 0.8 / maxBore);
  var maxF = Math.max.apply(null, r.per.map(function (p) { return p.push; })) || 1;
  cyls.forEach(function (cy, j) {
    var st = state(r, j, T), ry = ay0 + rowH * j, mid = ry + 22 + (rowH - 22) / 2, bh = cy.bore * k, cap = 0.4 * k, body = cy.stroke * k + 2 * cap, bx = ax0;
    var short = st.p < o.work - 1e-6, col = short ? c.bad : c.text;
    // The feed line to this cylinder.
    var lineCol = st.moving ? (short ? c.bad : c.s1) : c.mute;
    if (!narrow) { g.line(ax0 - 30, feedY, ax0 - 30, mid, { color: c.mute, width: 2 }); g.line(ax0 - 30, mid, bx, mid, { color: lineCol, width: st.moving ? 3 : 2 }); }
    else { g.line(8, ay0 - 2, 8, mid, { color: c.mute, width: 2 }); g.line(8, mid, bx, mid, { color: lineCol, width: st.moving ? 3 : 2 }); }
    var ly = Math.max(ry + 13, mid - bh / 2 - 9);
    g.text(cy.name, bx, ly, { weight: 700, size: 12, color: col });
    g.text(fmtIn(cy.bore) + " × " + fmtIn(cy.stroke) + " in, cycle " + Math.min(st.done, cy.cycles) + " of " + cy.cycles + (short && st.started ? ", short of air" : ""), bx + g.textWidth(cy.name, { weight: 700, size: 12 }) + 8, ly, { size: 11, color: short && st.started ? c.bad : c.mute });
    // Body, with the pressurised side tinted.
    var px = bx + cap + st.ext * cy.stroke * k, pw = Math.max(3, 0.3 * k);
    ctx.globalAlpha = st.moving ? 0.45 : 0.18;
    if (st.dir === "out") g.rect(bx + cap * 0.5, mid - bh / 2 + 1, px - bx - cap * 0.5, bh - 2, { fill: short ? c.bad : c.s1, stroke: null });
    else g.rect(px + pw, mid - bh / 2 + 1, bx + body - cap * 0.5 - px - pw, bh - 2, { fill: short ? c.bad : c.s1, stroke: null });
    ctx.globalAlpha = 1;
    g.rect(bx, mid - bh / 2, body, bh, { stroke: c.partLine, width: 1.5, radius: 2 });
    g.rect(bx, mid - bh / 2, cap * 0.6, bh, { fill: c.part2, stroke: c.partLine, width: 1 });
    g.rect(bx + body - cap * 0.6, mid - bh / 2, cap * 0.6, bh, { fill: c.part2, stroke: c.partLine, width: 1 });
    // Piston and rod.
    var rh = Math.max(2, cy.rod * k), rodEnd = bx + body + st.ext * cy.stroke * k + 0.25 * k;
    g.rect(px, mid - bh / 2 + 1.5, pw, bh - 3, { fill: c.text2, stroke: null });
    g.rect(px + pw, mid - rh / 2, rodEnd - px - pw, rh, { fill: c.part, stroke: c.partLine, width: 1 });
    g.rect(rodEnd, mid - Math.max(rh, 6) / 2 - 1, 4, Math.max(rh, 6) + 2, { fill: c.text2, stroke: null });
    // The force while it moves.
    if (st.moving) {
      var fpush = M.forces(cy, st.p), fv = st.dir === "out" ? fpush.push : fpush.pull, len = 14 + 46 * fv / maxF;
      if (st.dir === "out") g.arrow(rodEnd + 6, mid, rodEnd + 6 + len, mid, { color: short ? c.bad : c.force, width: 2.5, label: K.n(fv, 0) + " lbf" });
      else g.arrow(rodEnd + 6 + len, mid, rodEnd + 6, mid, { color: short ? c.bad : c.force, width: 2.5 });
      if (st.dir !== "out") g.text(K.n(fv, 0) + " lbf", rodEnd + 12 + len, mid, { color: short ? c.bad : c.force, weight: 600, base: "middle" });
    }
  });
}
function fmtIn(x) { return String(Math.round(x * 10000) / 10000); }
// Tank pressure at match time T.
function pAt(pts, T) { var P = pts[0][1]; for (var i = 0; i < pts.length; i++) { if (pts[i][0] > T) { var a = pts[i - 1], b = pts[i]; return b[0] > a[0] ? a[1] + (b[1] - a[1]) * (T - a[0]) / (b[0] - a[0]) : a[1]; } P = pts[i][1]; } return P; }
/* Where cylinder j is at match time T: ext 0..1, which way it is pushing, whether it is moving, the pressure of its
   latest stroke, and how many cycles have started. */
function state(r, j, T) {
  var out = { ext: 0, dir: "out", moving: false, p: r.o.work, done: 0, started: false }, last = null;
  r.ev.forEach(function (e) { if (e.i === j && e.t <= T) last = e; });
  if (!last) return out;
  out.started = true; out.p = last.p; out.done = last.k + 1;
  var u = (T - (last.dir === "out" ? last.t : last.t - last.win / 2)) / last.win, mv = 0.12;
  if (last.dir === "out") { out.ext = ease(Math.min(1, u / mv)); out.moving = u < mv * 1.6; out.dir = "out"; }
  else { var v = (u - 0.5) / mv; out.ext = 1 - ease(Math.min(1, v)); out.moving = v < 1.6; out.dir = "back"; }
  return out;
}
function ease(u) { u = F.clamp(u, 0, 1); return u * u * (3 - 2 * u); }
// A pressure gauge: 0 at the lower left round to the top of the scale at the lower right.
function gauge(g, x, y, R, P, o, full) {
  var c = g.c, top = Math.ceil(full * 1.15 / 20) * 20, a0 = Math.PI * 0.75, sweep = Math.PI * 1.5;
  function ang(p) { return a0 + sweep * F.clamp(p / top, 0, 1); }
  g.circle(x, y, R, { fill: c.sheet, stroke: c.partLine, width: 1.5 });
  g.arc(x, y, R - 5, ang(0), ang(o.work), { color: c.bad, width: 4, cap: "butt" });
  g.arc(x, y, R - 5, ang(o.work), ang(o.stored), { color: c.ok, width: 4, cap: "butt" });
  for (var p = 0; p <= top + 1e-9; p += 20) { var a = ang(p); g.line(x + Math.cos(a) * (R - 10), y + Math.sin(a) * (R - 10), x + Math.cos(a) * (R - 2), y + Math.sin(a) * (R - 2), { color: c.text2, width: 1 }); }
  [[o.work, "working"], [o.stored, "stored"]].forEach(function (m) {
    var a = ang(m[0]), cs = Math.cos(a), sn = Math.sin(a);
    g.line(x + cs * (R - 12), y + sn * (R - 12), x + cs * (R + 4), y + sn * (R + 4), { color: c.text, width: 2 });
    g.text(m[1], x + cs * (R + 8), y + sn * (R + 8) - (sn < -0.5 ? 4 : 0), { size: 10, color: c.text2, weight: 600, align: cs < -0.2 ? "right" : cs > 0.2 ? "left" : "center", base: sn < -0.5 ? "alphabetic" : "middle" });
  });
  var an = ang(P), low = P < o.work - 1e-6;
  g.line(x, y, x + Math.cos(an) * (R - 9), y + Math.sin(an) * (R - 9), { color: low ? c.bad : c.text, width: 2.5 });
  g.circle(x, y, 3.5, { fill: c.text, stroke: null });
  g.text(K.n(P, 0), x, y + R * 0.5, { align: "center", base: "middle", weight: 700, size: 13, color: low ? c.bad : c.text });
  g.text("psi", x, y + R * 0.5 + 13, { align: "center", base: "middle", size: 10, color: c.mute });
}
})(typeof window !== "undefined" ? window : this);
