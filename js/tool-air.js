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
  // The tanks cannot hold working pressure through this stroke: the regulator is wide open and the tank's air spreads
  // into tank and cylinder together (Boyle's law, absolute pressures). Always below working pressure here.
  var eq = pa * Vt / (Vt + vol);
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
// The fewest tanks of this size that keep working pressure all match: null if it needs more than M.MAXT (the search
// stops there), Infinity if no number will do (stored no higher than working pressure).
M.MAXT = 60;
M.tanksNeeded = function (o) {
  if (o.stored <= o.work && o.cyls.some(function (c) { return Math.round(c.cycles) > 0; })) return Infinity;
  for (var n = 1; n <= M.MAXT; n++) if (!M.sim(Object.assign({}, o, { tanks: n })).firstShort) return n;
  return null;
};
// The sentence after a shortfall: how many tanks it would take, given need (from M.tanksNeeded) and the tanks now.
M.needText = function (need, have, cfm) {
  if (need === Infinity) return "More tanks will not fix it: the tanks are stored no higher than the working pressure, so raise the stored pressure or lower the working pressure.";
  if (need == null) return "It needs more than " + M.MAXT + " tanks of this size: use smaller or fewer cylinders, fewer cycles" + (cfm ? "." : ", or a compressor on the robot.");
  return "It would take " + need + " tanks of this size (" + (need - have) + " more)" + (cfm ? "." : ", or a compressor on the robot.");
};

/* When each stroke is drawn, on a screen that plays the whole match in dur seconds. A real stroke is over in a blink,
   so each is drawn over a fixed time on screen, about half a second at 1x (show seconds of playback), or less when a
   cylinder strokes so often that it must be shorter to fit, and the last ends by the match's end. A stroke starts at its own time or, when the one before it
   on the same cylinder is still being drawn, as soon as that one ends; they never overlap. Returns, for each event in
   ev's order, { from, to } in match seconds. */
M.schedule = function (ev, match, dur, show) {
  var per = (show == null ? 0.5 : show) * match / dur, end = {}, n = {}, out = [];
  ev.forEach(function (e) { n[e.i] = (n[e.i] || 0) + 1; });
  ev.forEach(function (e) {
    var gap = match / Math.max(1, n[e.i] / 2), d = Math.min(per, gap / 2.2), from = Math.max(e.t, end[e.i] || -Infinity);
    var to = Math.max(Math.min(from + d, match), Math.min(from + 1e-3, match));   // the last stroke ends by the whole match's end
    out.push({ from: from, to: to }); end[e.i] = to;
  });
  return out;
};
// What a stroke did, in a few words: "out: 0.30 L, tanks 120 to 116 psi". e: an event from M.sim, or null.
M.strokeLine = function (e, work) {
  if (!e) return "no stroke yet";
  var L = M.freeAir(e.vol, work) * M.L_PER_IN3;
  return (e.dir === "out" ? "out" : "back") + ": " + L.toFixed(2) + " L, tanks " + Math.round(e.before) + " to " + Math.round(e.after) + " psi" + (e.short ? ", short of air (" + Math.round(e.p) + " psi)" : "");
};
// The tank chart's y ticks: 0, the working pressure and the stored pressure, the two typed in.
M.tankTicks = function (o) { return [0, o.work, o.stored].filter(function (v, i, a) { return a.indexOf(v) === i; }); };

/* A size in inches as a shop fraction and its decimal, the way vendors and CAD name it: 1.0625 -> "1-1/16 in (1.0625)",
   0.75 -> "3/4 in (0.75)", 2 -> "2 in". A size that is not a 1/64 fraction stays a decimal. */
M.inFrac = function (x) {
  var dec = String(Math.round(x * 10000) / 10000);
  for (var d = 1; d <= 64; d *= 2) {
    var n = Math.round(x * d); if (Math.abs(n / d - x) > 1e-6) continue;
    var w = Math.floor(n / d), rem = n - w * d;
    if (!rem) return w + " in";
    return (w ? w + "-" : "") + rem + "/" + d + " in (" + dec + ")";
  }
  return dec + " in";
};

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- Page ---------- */
var K = D.calc, esc = D.esc, ID = "tool-air", DUR = 16, SHOW = 0.5, MAXC = 6;
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
  stage: { ratio: 2.3, narrow: 0.78, tall: true, label: "The air system as a schematic: tanks filled to their pressure, a gauge, the regulator, and each cylinder to scale, stroking as the match plays." },
  duration: function () { return DUR; }, autoplay: true, playLabel: "Play the match",

  compute: function (s) {
    var o = simOf(s), r = M.sim(o);
    r.o = o; r.cyls = o.cyls; r.show = M.schedule(r.ev, o.match, DUR, SHOW); r.ev.forEach(function (e, n) { e.from = r.show[n].from; e.to = r.show[n].to; }); r.need = r.firstShort ? M.tanksNeeded(o) : null;
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
    var cyl = '<p class="t-air-hint">One cycle is out and back. Each cylinder\'s cycles are spread evenly through the match. The rod must be thinner than the bore.</p>' + rows + (cylsOf(s).length < MAXC ? '<button class="btn sm" data-act="airadd">Add a cylinder</button>' : "");
    return K.group(ID, "air", "Air", air) + K.group(ID, "cyl", "Cylinders", cyl) + K.group(ID, "comp", "Compressor", comp) + K.group(ID, "adv", "Match", K.num(ID, "match", "Match length", { unit: "s", min: 15, max: 300, step: 1, hint: "The cycles are spread evenly through it.", tip: "The cycles are spread evenly through this time. 160 s is a typical match with autonomous and teleop together." }), true);
  },

  outs: function (s, r) {
    var o = r.o, text, st;
    if (!r.cycles) { st = "info"; text = "No cylinder is used in this match. Add cycles to see the air they need."; }
    else if (!r.firstShort) { st = "ok"; text = "With these cycle counts the tanks last the match" + (o.cfm ? " with the compressor topping up" : "") + ": it uses " + K.n(L(r.used), 2) + " L of free air against " + K.n(L(r.stored), 2) + " L stored above " + o.work + " psi, and ends at " + K.n(r.end, 0) + " psi."; }
    else {
      st = "bad"; var f = r.firstShort;
      text = "Pressure falls below " + o.work + " psi at about " + K.n(f.t, 0) + " s (" + clock(f.t) + "), after " + r.fullCycles + " of " + r.cycles + " cycles. " +
        M.needText(r.need, o.tanks, o.cfm);
    }
    var share = r.stored > 0 ? r.used / r.stored : Infinity;
    var more = r.cycles ? "This assumes the cycles are spread evenly through the match, no leaks and ideal air use (no air lost in tubing, fittings or cooling). Keep a margin." : "";
    return K.verdict(st, text, more) + K.outs([
      { k: "Air used in a match", v: K.n(L(r.used), 2), u: "L", sub: "free air, measured at room pressure", tip: "Free air: the volume it would fill at atmospheric pressure. Each stroke fills its cylinder at working pressure, then lets it out." },
      { k: "Stored above working", v: K.n(L(r.stored), 2), u: "L", sub: r.cycles && isFinite(share) ? "the match uses " + K.n(share * 100, 0) + "% of it" : "between " + o.stored + " and " + o.work + " psi", state: !r.firstShort && share > 0.8 ? "warn" : "", tip: "Free air the tanks give up falling from " + o.stored + " to " + o.work + " psi. Only the air above working pressure is usable at full force." },
      { k: "Pressure at the end", v: K.n(r.end, 0), u: "psi", state: r.end < o.work - 1e-6 ? "bad" : "", sub: "in the tanks" },
      { k: "Cycles at full force", v: r.firstShort ? r.fullCycles + " of " + r.cycles : r.cycles ? "All " + r.cycles : "None", state: r.firstShort ? "bad" : "",
        sub: r.firstShort ? "then below " + o.work + " psi" : r.cycles ? "each gets the full " + o.work + " psi" : "no cycles planned", tip: "Assumes evenly spaced cycles, no leaks and no line losses. Full force is theoretical: pressure times area, before friction and flow losses." },
      r.firstShort ? { k: "Tanks it would take", v: r.firstShort ? (r.need === Infinity ? "none will do" : r.need ? String(r.need) : "over " + M.MAXT) : K.n(share * 100, 0) + "%", state: r.firstShort ? "bad" : share > 0.8 ? "warn" : "", sub: r.firstShort ? "of " + K.n(o.ml, 0) + " mL" + (o.cfm ? ", with the compressor" : "") : "of what is stored above " + o.work + " psi" } : null]);
  },

  more: function (s, r) {
    var o = r.o;
    var anyShort = r.ev.some(function (e) { return e.short; });
    // The tank chart's scale marks 0, the working pressure and the stored pressure (the two typed in), and names the
    // start and the working line where neither touches the curve.
    var ch = anyShort ? 190 : 160, ytop = Math.max(o.stored * 1.2, 10);
    var chart = K.chart({ id: "air-p", h: ch, title: "Tank pressure through the match", note: "Dashed: working pressure, " + o.work + " psi.", x: { label: "match time, s", name: "At", unit: "s", min: 0, max: o.match }, y: { label: "psi", unit: "psi", min: 0, max: ytop, ticks: M.tankTicks(o) },
      series: [{ name: "Tank pressure", pts: r.pts, color: 1 }], hlines: [{ y: o.work }], dots: [{ x: 0, y: o.stored, label: o.stored + " psi stored" }],
      marks: r.firstShort ? [{ x: r.firstShort.t, label: "Below working" }] : [] });
    var strokes = !anyShort ? "" : K.chart({ id: "air-s", title: "Pressure each stroke gets", x: { label: "match time, s", name: "At", unit: "s", min: 0, max: o.match }, y: { label: "psi", unit: "psi", min: 0, max: Math.max(o.work * 1.2, 5) },
      series: r.cyls.map(function (cy, j) { return { name: cy.name, color: j < 3 ? j + 1 : "mute", dash: j % 2 === 1, pts: r.ev.filter(function (e) { return e.i === j; }).map(function (e) { return [e.t, e.p]; }) }; }), hlines: [workLine(o.work, "Working " + o.work + " psi", r.cyls.map(function (cy, j) { return r.ev.filter(function (e) { return e.i === j; }).map(function (e) { return [e.t, e.p]; }); }), Math.max(o.work * 1.2, 5), o.match, [])] });
    var tab = '<section class="ctab"><h2>Cylinders at ' + o.work + ' psi</h2><div class="scroll"><table><thead><tr><th>Cylinder</th><th class="r">Bore × stroke</th><th class="r">Rod</th><th class="r">Cycles</th><th class="r">Air per cycle</th><th class="r">Push, theoretical</th><th class="r">Pull, theoretical</th><th class="r"><span class="abbr" tabindex="0" data-tip="Before the tanks fall to working pressure, starting full, if no other cylinder drew on them.">Cycles alone</span></th></tr></thead><tbody>' +
      r.per.map(function (p) { return "<tr><td>" + esc(p.c.name) + '</td><td class="r num">' + M.inFrac(p.c.bore).replace(" in", "") + " × " + M.inFrac(p.c.stroke) + '</td><td class="r num">' + K.fix(p.c.rod, 4).replace(/0+$/, "").replace(/\.$/, "") + ' in</td><td class="r num">' + p.c.cycles + '</td><td class="r num">' + K.n(L(p.cycleAir), 3) + ' L</td><td class="r num">' + K.n(p.push, 1) + ' lbf</td><td class="r num">' + K.n(p.pull, 1) + ' lbf</td><td class="r num">' + (o.stored > o.work ? p.alone : 0) + "</td></tr>"; }).join("") +
      '</tbody></table></div><p class="t-air-hint">Cycles alone: how many cycles full tanks give one cylinder before they fall to working pressure, if no other cylinder draws on them.</p></section>';
    // When every stroke gets full pressure there is nothing to chart per stroke: the tank chart takes the whole width
    // and says so under it.
    var charts = anyShort ? '<div class="chartrow">' + chart + strokes + "</div>" :
      '<div class="t-air-wide">' + chart.replace(/<\/figure>$/, '<p class="t-air-under">' + (r.cycles ? "Every stroke gets the full " + o.work + " psi (working pressure), so each cylinder pushes with its full theoretical force all match." : "No strokes in this match.") + "</p></figure>") + "</div>";
    return charts + tab + K.notes(
      "<p>Air is treated as staying at room temperature as it expands (isothermal, Boyle's law: pressure × volume stays the same for the same air). Two kinds of pressure appear below. <b>Gauge</b> (psig) is what a gauge reads, the pressure above the room's; every pressure you type and every pressure the page shows is gauge. <b>Absolute</b> (psia) is gauge plus 14.7 psi, the room's own pressure at sea level. Boyle's law needs absolute pressures.</p>" +
      '<p class="eq">one extend fills: bore area × stroke;  one retract fills: (bore area − rod area) × stroke  (volumes, no pressure)</p>' +
      '<p class="eq">free air = volume × (working psig + 14.7) ÷ 14.7  (working pressure as absolute, over the room\'s absolute 14.7)</p>' +
      '<p class="eq">stored above working = tank volume × (stored psig − working psig) ÷ 14.7  (a difference, so gauge and absolute give the same)</p>' +
      '<p class="eq">tank after a stroke, absolute: (P psig + 14.7) → (P psig + 14.7) − stroke volume × (working psig + 14.7) ÷ tank volume</p>' +
      '<p class="eq">once that would fall under working, absolute: (P psig + 14.7) → (P psig + 14.7) × tank volume ÷ (tank volume + stroke volume)</p>' +
      '<p class="eq">push = working psig × bore area;  pull = working psig × (bore area − rod area)  (gauge: the room\'s 14.7 psi pushes on the other side too)</p>' +
      "<p>Each cylinder's cycles are spread evenly through the match, out and then back a moment later. Once a stroke would pull the tanks under working pressure, the regulator is wide open: the tank and the cylinder share what is left, so that stroke and every one after it gets less pressure and less force.</p>" +
      "<p>The compressor's flow is taken as free air per minute, the same all the time, running whenever the tanks are under the stored pressure. A real compressor gives less as the pressure rises, so read its chart at your working pressure. It is also left out that the air cools as it expands in a quick stroke (which uses a little more), and the tubing and fittings, which hold some air too. Treat the answer as a close estimate and keep a margin.</p>" +
      "<p>In the drawing each tank is tinted by the pressure of its air, darker the higher it is (the tanks hold only air; the gauge gives the number), and the gauge marks stored and working pressure. The cylinders are to scale against each other, with a dashed outline where the rod reaches at full stroke. The force arrows are the theoretical force, pressure times area. The gauge's green band is the pressure above working pressure: the air the cylinders can use at full force. Each cylinder is double-acting: it has a port at each end, and its valve feeds one port and vents the other. Feeding the cap end extends it (it pushes); feeding the rod end retracts it (it pulls, with a little less force, because the rod takes up part of the piston's area). The whole match plays in " + DUR + " s. A real stroke takes a fraction of a second, so each is drawn slowed, over about half a second of playback (less when a cylinder strokes very often), starting when it is used; the tanks' pressure drops at the stroke's real time. Each cylinder's line in the drawing keeps its last stroke on show until the next: which way it went, the free air it used and the tanks' pressure before and after.</p>");
  },

  draw: function (g, s, r, t) { drawAir(g, s, r, t); }
});

/* The working-pressure line on a chart, with its label put where no curve and no upright mark is: right or left,
   below or above the line (the first clear one). ytop: the chart's top; xmax: its right end; marks: upright lines' x. */
function workLine(y, label, curves, ytop, xmax, marks) {
  // Left first: the "now" line rests at the right-hand end when the match is not playing.
  var ways = [["left", true], ["left", false], ["right", true], ["right", false]], pick = null;
  ways.some(function (w) {
    var x0 = w[0] === "left" ? 0 : 0.6 * xmax, x1 = w[0] === "left" ? 0.4 * xmax : xmax, lo = w[1] ? y - 0.14 * ytop : y + 0.01 * ytop, hi = w[1] ? y - 0.01 * ytop : y + 0.14 * ytop;
    if (lo < 0.04 * ytop || hi > ytop) return false;
    if (marks.some(function (m) { return m >= x0 && m <= x1; })) return false;
    var hit = curves.some(function (pts) {
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[i + 1] || pts[i];
        if (Math.max(a[0], b[0]) < x0 || Math.min(a[0], b[0]) > x1) continue;
        if (Math.max(a[1], b[1]) >= lo - 0.02 * ytop && Math.min(a[1], b[1]) <= hi + 0.02 * ytop) return true;
      }
      return false;
    });
    if (!hit) pick = w;
    return !hit;
  });
  pick = pick || ways[0];
  return { y: y, label: label, side: pick[0] === "left" ? "left" : undefined, below: pick[1] };
}

/* The playback note, on its own line beside Play: the transport belongs to the kit, so the line is added here after
   each render and kept up to date when the match length changes. */
function playNote(match) {
  var tr = document.querySelector('.bench[data-calc="' + ID + '"] .transport'); if (!tr) return;
  var el = tr.querySelector(".t-air-play"), txt = "Plays the whole " + clock(match) + " match in " + DUR + " s. Each stroke is drawn slowed, over about half a second, so you can follow it.";
  if (!el) { el = document.createElement("p"); el.className = "t-air-play"; tr.appendChild(el); }
  if (el.textContent !== txt) el.textContent = txt;
}
D.after.push(function () { if (D.S.route === ID) { var s = K.state(ID); playNote(s && s.match || 160); } });

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
    ".t-air-play { flex-basis: 100%; order: 9; margin: 0; font-size: .85rem; font-weight: 600; color: var(--text-2); }" +
    ".t-air-wide .chart svg { max-width: 600px; } .t-air-under { margin: 0; font-size: .9rem; color: var(--text-2); }" +
    ".t-air-f .inp.t-air-bad { border-color: var(--bad); background: var(--bad-bg); }" +
    "@media (max-width: 640px) { .t-air-v .inp, .t-air-top .inp { min-height: 44px; } }";
  document.head.appendChild(st);
})();

/* ---------- The drawing ---------- */
function drawAir(g, s, r, t) {
  var c = g.c, ctx = g.ctx, W = g.w, H = g.h, o = r.o, narrow = W < 560, T = F.clamp(t / DUR, 0, 1) * o.match;
  var P = pAt(r.pts, T), low = P < o.work - 1e-6, full = Math.max(o.stored, 1);
  K.chartNow("air-p", T); K.chartNow("air-s", T);
  // Header: the match clock and the tank pressure. At the bottom right: what the playback time means.
  g.text(clock(T) + " into the " + clock(o.match) + " match", 12, 20, { weight: 700, size: 13 });
  g.text("Tanks " + K.n(P, 0) + " psi" + (low ? ", below working pressure" : ""), 12, 37, { color: low ? c.bad : c.text2, weight: 600, size: 12 });
  playNote(o.match);
  // Along the bottom: one key for the gauge's bands and the lines from each valve, the same words on every screen,
  // flowing onto as many lines as the width needs.
  var keyLines = keyLayout(g, W - 24), keyH = keyLines.length * 16;
  drawKey(g, keyLines, 12, H - 9 - (keyLines.length - 1) * 16);
  /* The supply: tanks, gauge, regulator. A narrow column at the left on a laptop; a short band across the top on a
     phone. The cylinders get the rest, so they are the larger part of the drawing. */
  var leftW = narrow ? W : F.clamp(W * 0.35, 250, 340);
  var tw = narrow ? 24 : 30, gapT = narrow ? 7 : 9, maxDraw = narrow ? 3 : Math.max(1, Math.floor((leftW - 2 - 64 - 10 - 64 - 20 - 20 + gapT) / (tw + gapT)));   // room left for a gauge of radius 32 and the regulator
  var nDraw = Math.min(o.tanks, maxDraw);
  var tx0 = narrow ? 16 : 20, ty0 = narrow ? 88 : 92, th = narrow ? 78 : Math.max(60, Math.min(170, H - ty0 - 120));
  var tanksRight = tx0 + nDraw * (tw + gapT) - gapT, feedY = ty0 + th + (narrow ? 14 : 24);
  // What the tanks are. They hold air, so they are tinted, not filled: the tint is darker the higher the pressure,
  // and the gauge gives the number.
  var size = o.tanks + " × " + K.n(o.ml, 0) + " mL of air" + (o.tanks > nDraw ? " (" + nDraw + " drawn)" : "");
  if (narrow) g.text(size + ": darker tint, more pressure", 12, 60, { size: 11, color: c.text2, weight: 600 });
  else { g.text(size, tx0, 62, { size: 12, color: c.text2, weight: 700 }); g.text("Darker tint, more pressure", tx0, 78, { size: 11, color: c.mute }); }
  for (var i = 0; i < nDraw; i++) {
    var x = tx0 + i * (tw + gapT), frac = F.clamp(P / full, 0, 1);
    ctx.globalAlpha = 0.04 + 0.7 * frac * frac; g.rect(x, ty0, tw, th, { fill: low ? c.bad : c.s1, stroke: null, radius: tw / 2 }); ctx.globalAlpha = 1;
    g.rect(x, ty0, tw, th, { stroke: c.partLine, width: 1.5, radius: tw / 2 });
    g.line(x + tw / 2, ty0 + th, x + tw / 2, feedY, { color: c.mute, width: 2 });
  }
  // Gauge, to the right of the tanks; its stem drops to the feed line below it, clear of the "psi" in its face.
  // On a laptop the gauge fits between the tank tops and the feed line, with room under it for its 0 and over it for
  // its working mark, and clear of the regulator on the feed line.
  var gr = narrow ? 36 : F.clamp(Math.min((leftW - (tanksRight - tx0) - 66) / 2, (feedY - ty0 - 34) / 2, (leftW - 2 - 64 - 10 - tanksRight - 20) / 2), 32, 44), gx = tanksRight + 20 + gr, gy = narrow ? ty0 + th / 2 - 2 : ty0 + gr + 10;
  if (gy + gr + 6 > feedY) gy = feedY - gr - 6;
  g.line(gx, gy + gr, gx, feedY, { color: c.mute, width: 2 });
  gauge(g, gx, gy, gr, P, o, full, null);
  // Regulator on the feed line.
  var regW = 64, regX = narrow ? W - regW - 14 : Math.max(leftW - regW - 2, gx + gr + 10), regY = feedY - 14;
  g.line(tx0 + tw / 2, feedY, regX, feedY, { color: c.mute, width: 2 });
  g.rect(regX, regY, regW, 28, { fill: c.part, stroke: c.partLine, width: 1.25, radius: 4 });
  g.text("Regulator", regX + regW / 2, regY + 10, { align: "center", base: "middle", size: 10, weight: 700, halo: false });
  g.text(o.work + " psi", regX + regW / 2, regY + 21, { align: "center", base: "middle", size: 10, color: c.text2, halo: false });
  if (s.comp === "robot") {                         // the compressor feeds the tanks
    var running = P < o.stored - 0.05 && t > 0, cw = 70, cx0 = narrow ? regX - 2 : tx0, cy0 = narrow ? ty0 - 4 : feedY + 14;
    if (narrow) cx0 = W - cw - 12;
    g.line(cx0 + 12, narrow ? cy0 + 22 : cy0, cx0 + 12, feedY, { color: c.mute, width: 2 });
    g.rect(cx0, cy0, cw, 22, { fill: c.part2, stroke: c.partLine, width: 1, radius: 4 });
    g.text("Compressor", cx0 + cw / 2, cy0 + 11, { align: "center", base: "middle", size: 10, weight: 700, halo: false });
    if (running) g.text("running", narrow ? cx0 + cw / 2 : cx0 + cw + 6, narrow ? cy0 + 34 : cy0 + 11, { base: "middle", align: narrow ? "center" : "left", size: 10, color: c.ok, weight: 600 });
  }
  // The cylinders, to scale against each other: right of the supply on a laptop, under it on a phone.
  var cyls = r.cyls, n = cyls.length, manX = narrow ? 8 : leftW + 22;
  var ax0 = narrow ? 58 : leftW + 78, ax1 = W - 14, ay0 = narrow ? feedY + 32 : 50, ay1 = H - keyH - (narrow ? 22 : 26);
  if (narrow) { g.line(regX + regW / 2, regY + 28, regX + regW / 2, feedY + 22, { color: c.mute, width: 2 }); g.line(regX + regW / 2, feedY + 22, manX, feedY + 22, { color: c.mute, width: 2 }); }
  else g.line(regX + regW, feedY, manX, feedY, { color: c.mute, width: 2 });
  if (!n) { g.text("No cylinders. Add one in Cylinders.", ax0, (ay0 + ay1) / 2, { color: c.mute }); return; }
  var rowH = (ay1 - ay0) / n, maxLen = 0, maxBore = 0;
  cyls.forEach(function (cy) { maxLen = Math.max(maxLen, 2 * cy.stroke + 1.05); maxBore = Math.max(maxBore, cy.bore); });
  var arrowRoom = narrow ? 44 : 64, k = Math.min((ax1 - ax0 - arrowRoom) / maxLen, (rowH - (narrow ? 61 : 74)) * 0.95 / maxBore, narrow ? 60 : 110);
  var maxF = Math.max.apply(null, r.per.map(function (p) { return p.push; })) || 1;
  var feedTop = narrow ? feedY + 22 : feedY;
  cyls.forEach(function (cy, j) {
    var st = state(r, j, T), ry = ay0 + rowH * j, bh = Math.max(6, cy.bore * k), mid = ry + (narrow ? 39 : 46) + bh / 2 + Math.max(0, (rowH - (narrow ? 61 : 74) - bh) / 2) * 0.5;
    var cap = 0.4 * k, body = cy.stroke * k + 2 * cap, bx = ax0;
    var short = st.p < o.work - 1e-6, col = short && st.started ? c.bad : c.text;
    if (j > 0) g.line(ax0 - 4, ry, ax1, ry, { color: c.line, width: 1 });
    /* Supply to the cylinder's valve, then a line from the valve to each end: the cap end (extends it) and the rod end
       (retracts it). The valve always feeds one end and vents the other through its exhaust, an open mark under it,
       to the room: the fed route is drawn blue (bolder while the cylinder moves), the venting route dashed. Before its
       first stroke a cylinder sits retracted, so its rod end is the fed one. */
    var vw = 24, vh = 16, vx = manX + (narrow ? 10 : 12), fedCol = short && st.started ? c.bad : c.s1, fw = st.moving ? 3 : 2;
    g.line(manX, Math.min(feedTop, mid), manX, Math.max(feedTop, mid), { color: c.mute, width: 2 });
    g.line(manX, mid, vx, mid, { color: c.mute, width: 2 });
    var capFed = st.started && st.dir === "out", yB = mid + bh / 2 + 9, xB = bx + body - cap * 0.3;
    g.line(vx + vw, mid, bx, mid, capFed ? { color: fedCol, width: fw } : { color: c.mute, width: 1.5, dash: [4, 3] });
    g.path([[vx + vw / 2, mid + vh / 2], [vx + vw / 2, yB], [xB, yB], [xB, mid + bh / 2]], capFed ? { color: c.mute, width: 1.5, dash: [4, 3] } : { color: fedCol, width: fw });
    exhaust(g, vx + 5, mid + vh / 2);
    g.rect(vx, mid - vh / 2, vw, vh, { fill: c.part2, stroke: c.partLine, width: 1, radius: 2 });
    g.line(vx + 5, mid, vx + vw - 5, mid, { color: c.partLine, width: 1 });
    g.text("valve", vx + vw / 2, mid - vh / 2 - 4, { align: "center", size: 10, color: c.mute });
    // Its name on a line of its own, then what it is and where it has got to.
    var ly = ry + (narrow ? 15 : 20), nw = g.textWidth(cy.name, { weight: 700, size: narrow ? 12 : 13 });
    g.text(cy.name, bx, ly, { weight: 700, size: narrow ? 12 : 13, color: col });
    g.text(M.inFrac(cy.bore) + " bore, cycle " + Math.min(st.done, cy.cycles) + " of " + cy.cycles, bx + nw + 8, ly, { size: 11, color: c.mute });
    // Its last stroke, on its own line, kept until the next one: which way, the free air it used, the tanks before and after.
    g.text(M.strokeLine(st.last, o.work), bx, ly + (narrow ? 15 : 17), { size: narrow ? 11 : 12, weight: 600, color: short && st.started ? c.bad : st.started ? c.text2 : c.mute });
    // Where the rod reaches at full stroke: a faint shadow of the rod (not a dashed line, which is the venting route),
    // with the stroke dimensioned under it.
    var rh = Math.max(2, cy.rod * k), endK = 0.25 * k, rod0 = bx + body + endK, rodFull = rod0 + cy.stroke * k;
    ctx.globalAlpha = 0.18; g.rect(bx + body, mid - rh / 2, rodFull - bx - body, rh, { fill: c.text2, stroke: null }); g.rect(rodFull, mid - Math.max(rh, 6) / 2 - 1, 4, Math.max(rh, 6) + 2, { fill: c.text2, stroke: null }); ctx.globalAlpha = 1;
    g.dim(rod0 + 2, mid + bh / 2 + 4, rodFull + 2, mid + bh / 2 + 4, fmtIn(cy.stroke) + " in stroke", -1, { side: "below", size: 11 });
    // Body, with the pressurised side tinted.
    var px = bx + cap + st.ext * cy.stroke * k, pw = Math.max(3, 0.3 * k);
    // The chamber under pressure, shaded: behind the piston when it extends, in front of it (round the rod) when it retracts.
    ctx.globalAlpha = st.moving ? 0.6 : 0.32;
    if (st.dir === "out") g.rect(bx + cap * 0.5, mid - bh / 2 + 1, px - bx - cap * 0.5, bh - 2, { fill: short ? c.bad : c.s1, stroke: null });
    else g.rect(px + pw, mid - bh / 2 + 1, bx + body - cap * 0.5 - px - pw, bh - 2, { fill: short ? c.bad : c.s1, stroke: null });
    ctx.globalAlpha = 1;
    g.rect(bx, mid - bh / 2, body, bh, { stroke: c.partLine, width: 1.5, radius: 2 });
    g.rect(bx, mid - bh / 2, cap * 0.6, bh, { fill: c.part2, stroke: c.partLine, width: 1 });
    g.rect(bx + body - cap * 0.6, mid - bh / 2, cap * 0.6, bh, { fill: c.part2, stroke: c.partLine, width: 1 });
    // Piston and rod.
    var rodEnd = rod0 + st.ext * cy.stroke * k;
    g.rect(px, mid - bh / 2 + 1.5, pw, bh - 3, { fill: c.text2, stroke: null });
    g.rect(px + pw, mid - rh / 2, rodEnd - px - pw, rh, { fill: c.part, stroke: c.partLine, width: 1 });
    g.rect(rodEnd, mid - Math.max(rh, 6) / 2 - 1, 4, Math.max(rh, 6) + 2, { fill: c.text2, stroke: null });
    // The force while it moves: pressure times area, before friction.
    if (st.moving) {
      var fp = M.forces(cy, st.p), fv = st.dir === "out" ? fp.push : fp.pull, len = 12 + (arrowRoom - 18) * fv / maxF, fx = rodEnd + 8, fcol = short ? c.bad : c.force;
      if (st.dir === "out") g.arrow(fx, mid, fx + len, mid, { color: fcol, width: 2.5 }); else g.arrow(fx + len, mid, fx, mid, { color: fcol, width: 2.5 });
      // Its value above the rod's travel, inside the drawing.
      var lab = (st.dir === "out" ? "push " : "pull ") + K.n(fv, 1) + " lbf, " + (narrow ? "ideal" : "theoretical"), lw = g.textWidth(lab, { size: 11, weight: 700 });
      var lx0 = Math.max(bx + body + 12, Math.min((rod0 + rodFull) / 2 - lw / 2, W - 10 - lw));
      g.text(lab, lx0, mid - Math.max(rh, 6) / 2 - 8, { color: fcol, weight: 700, size: 11 });
    }
  });
}
/* The key: items { head } (a grey lead-in that stays with the item after it) or { sw: "band" | "line" | "dash" | "box",
   col, text, tc }. Laid out into lines no wider than maxW; returns [[{ item, w }], ...]. */
// A valve's exhaust: a short stub down from the valve and an open triangle, the symbol for a port open to the room.
function exhaust(g, x, y) {
  var c = g.c;
  g.line(x, y, x, y + 5, { color: c.mute, width: 1.25 });
  g.poly([[x - 4, y + 5], [x + 4, y + 5], [x, y + 11]], { stroke: c.mute, width: 1.25, close: true });
}
function keyItems(c) {
  return [{ head: "Gauge:" }, { sw: "band", col: c.ok, text: "above working: usable", tc: c.ok }, { sw: "band", col: c.bad, text: "below working: no full force", tc: c.bad },
    { head: "Double-acting cylinders, each with a valve:" }, { sw: "line", col: c.s1, text: "fed" }, { sw: "dash", col: c.mute, text: "venting to the room" }, { sw: "exh", text: "exhaust" }, { sw: "box", col: c.s1, text: "side under pressure" }];
}
function keyW(g, it) { return it.head ? g.textWidth(it.head, { size: 11 }) + 8 : 23 + g.textWidth(it.text, { size: 11, weight: 600 }) + 14; }
function keyLayout(g, maxW) {
  // Each lead-in starts a new line, so the gauge's key and the cylinders' key never share one; within a group the
  // items flow on as the width allows.
  var items = keyItems(g.c), lines = [], used = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i], w = keyW(g, it), need = it.head && items[i + 1] ? w + keyW(g, items[i + 1]) : w;
    if (!lines.length || it.head || used + need > maxW) { lines.push([]); used = 0; }
    lines[lines.length - 1].push({ item: it, w: w }); used += w;
  }
  return lines;
}
function drawKey(g, lines, x0, y0) {
  var c = g.c, ctx = g.ctx;
  lines.forEach(function (line, n) {
    var x = x0, y = y0 + n * 16;
    line.forEach(function (e) {
      var it = e.item;
      if (it.head) g.text(it.head, x, y, { color: c.mute, size: 11 });
      else {
        if (it.sw === "band") g.line(x, y - 4, x + 18, y - 4, { color: it.col, width: 4, cap: "butt" });
        else if (it.sw === "line") g.line(x, y - 4, x + 18, y - 4, { color: it.col, width: 3 });
        else if (it.sw === "dash") g.line(x, y - 4, x + 18, y - 4, { color: it.col, width: 1.5, dash: [4, 3] });
        else if (it.sw === "exh") exhaust(g, x + 9, y - 13);
        else { ctx.globalAlpha = 0.45; g.rect(x, y - 10, 18, 9, { fill: it.col, stroke: null }); ctx.globalAlpha = 1; g.rect(x, y - 10, 18, 9, { stroke: c.partLine, width: 1 }); }
        g.text(it.text, x + 23, y, { color: it.tc || c.text2, size: 11, weight: 600 });
      }
      x += e.w;
    });
  });
}
function fmtIn(x) { return String(Math.round(x * 10000) / 10000); }
// Tank pressure at match time T.
function pAt(pts, T) { var P = pts[0][1]; for (var i = 0; i < pts.length; i++) { if (pts[i][0] > T) { var a = pts[i - 1], b = pts[i]; return b[0] > a[0] ? a[1] + (b[1] - a[1]) * (T - a[0]) / (b[0] - a[0]) : a[1]; } P = pts[i][1]; } return P; }
/* Where cylinder j is at match time T: ext 0..1, which way it is pushing, whether it is moving, the pressure of its
   latest stroke, and how many cycles have started. */
/* Where cylinder j is at match time T, from the slowed drawing times (e.from, e.to): how far out (0..1), which way
   it went last, whether it is moving, the pressure its last stroke got, how many cycles have started, and that last
   stroke itself (its air and the tanks before and after), which the drawing keeps on show until the next one. */
function state(r, j, T) {
  var out = { ext: 0, dir: "out", moving: false, p: r.o.work, done: 0, started: false, last: null }, last = null;
  r.ev.forEach(function (e) { if (e.i === j && e.from <= T) last = e; });
  if (!last) return out;
  var u = ease((T - last.from) / Math.max(1e-9, last.to - last.from));
  out.started = true; out.p = last.p; out.done = last.k + 1; out.last = last; out.dir = last.dir;
  out.ext = last.dir === "out" ? u : 1 - u; out.moving = T < last.to;
  return out;
}
function ease(u) { u = F.clamp(u, 0, 1); return u * u * (3 - 2 * u); }
// A pressure gauge: 0 at the lower left round to the top of the scale at the lower right.
function gauge(g, x, y, R, P, o, full, key) {
  var c = g.c, top = Math.ceil(full * 1.15 / 20) * 20, a0 = Math.PI * 0.75, sweep = Math.PI * 1.5;
  function ang(p) { return a0 + sweep * F.clamp(p / top, 0, 1); }
  g.circle(x, y, R, { fill: c.sheet, stroke: c.partLine, width: 1.5 });
  g.arc(x, y, R - 5, ang(0), ang(o.work), { color: c.bad, width: 4, cap: "butt" });
  g.arc(x, y, R - 5, ang(o.work), ang(o.stored), { color: c.ok, width: 4, cap: "butt" });
  for (var p = 0; p <= top + 1e-9; p += 20) { var a = ang(p); g.line(x + Math.cos(a) * (R - 10), y + Math.sin(a) * (R - 10), x + Math.cos(a) * (R - 2), y + Math.sin(a) * (R - 2), { color: c.text2, width: 1 }); }
  // Numbers at 0, the working pressure and the stored pressure (the two typed in), each on a heavier tick.
  var close = Math.abs(ang(o.stored) - ang(o.work)) < 0.35;
  (close ? [[0, "0"], [o.stored, String(o.stored)]] : [[0, "0"], [o.work, String(o.work)], [o.stored, String(o.stored)]]).forEach(function (m) {
    var a = ang(m[0]), cs = Math.cos(a), sn = Math.sin(a);
    g.line(x + cs * (R - 7), y + sn * (R - 7), x + cs * (R + 3), y + sn * (R + 3), { color: c.text, width: 2 });
    g.text(m[1], x + cs * (R + 11), y + sn * (R + 11) + (sn > 0.5 ? 4 : sn < -0.5 ? -1 : 0), { size: 11, color: c.text, weight: 700, align: cs < -0.25 ? "right" : cs > 0.25 ? "left" : "center", base: sn < -0.5 ? "alphabetic" : sn > 0.5 ? "top" : "middle" });
  });
  // A key for the two bands, in their own colours, where the caller has room for it.
  if (key) {
    var items = [["above working: usable", c.ok], ["below working: no full force", c.bad]], ky = key.y;
    items.forEach(function (it) {
      var words = it[0].split(" "), line = "", lines = [];
      words.forEach(function (w) { var t = line ? line + " " + w : w; if (line && g.textWidth(t, { size: 10, weight: 600 }) > key.w) { lines.push(line); line = w; } else line = t; });
      lines.push(line);
      lines.forEach(function (t) { g.text(t, key.align === "right" ? key.x + key.w : key.x, ky, { size: 10, weight: 600, color: it[1], align: key.align || "left", base: "middle" }); ky += 12; });
      ky += 3;
    });
  }
  var an = ang(P), low = P < o.work - 1e-6;
  g.line(x, y, x + Math.cos(an) * (R - 9), y + Math.sin(an) * (R - 9), { color: low ? c.bad : c.text, width: 2.5 });
  g.circle(x, y, 3.5, { fill: c.text, stroke: null });
  // The reading, in the empty bottom of the dial (the scale's gap), clear of the needle's hub and the ticks.
  g.text(K.n(P, 0), x, y + R * 0.38, { align: "center", base: "middle", weight: 700, size: 13, color: low ? c.bad : c.text });
  g.text("psi", x, y + R * 0.38 + 12, { align: "center", base: "middle", size: 10, color: c.mute });
}
})(typeof window !== "undefined" ? window : this);
