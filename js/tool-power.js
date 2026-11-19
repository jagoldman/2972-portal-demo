/* Tools: Battery and breakers (#tool-power). Add up what the robot draws at the worst moment of a match and see the
   battery voltage sag toward the roboRIO's brown-out, the share of the main breaker and the heat. The drawing is a
   one-line power diagram whose wires are as thick as their current, over a voltage gauge. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");

/* ---------- Maths (no page code; tests/tool-power.test.js runs it in Node) ---------- */
var M = {};
M.TIRED = 0.025;     // ohms: a tired battery
M.BRANCH = 40;       // A: a branch breaker's rating
/* rows: [{ name, n, a (supply amps each) }]. o: { rest (V), rbat, rwire (ohm), brown (V), main (A) }.
   Returns the totals, the voltage at the robot, margins, heat, and the same with a tired battery. */
M.power = function (rows, o) {
  var list = rows.map(function (r) { return { name: r.name, n: r.n, a: r.a, I: r.n * r.a }; });
  var I = list.reduce(function (t, r) { return t + r.I; }, 0);
  function at(rbat) {
    var R = rbat + o.rwire, V = o.rest - I * R, Imax = (o.rest - o.brown) / R;
    return { R: R, V: V, margin: V - o.brown, Imax: Imax, marginA: Imax - I, dropBat: I * rbat, dropWire: I * o.rwire, heatBat: I * I * rbat, heatWire: I * I * o.rwire, heat: I * I * R };
  }
  var now = at(o.rbat), tired = at(M.TIRED), worst = -1;
  list.forEach(function (r, i) { r.share = I > 0 ? r.I / I : 0; if (worst < 0 || r.I > list[worst].I) worst = i; });
  return Object.assign(now, { I: I, rows: list, share: I / o.main, worst: worst, cut: Math.max(0, I - now.Imax), tired: tired });
};
/* What a share of a breaker's rating (1 = its rating) means, in words. A thermal breaker's trip time depends on its
   own curve and how warm it is, so up to 150% this only says it is above its rating; the firm words about tripping
   are kept for twice the rating and more. */
M.breakerNote = function (share) {
  return share <= 1 ? "of its rating: it carries this all match" : share <= 1.5 ? "above its rating: check the breaker's trip curve for how long it holds this" :
    share < 2 ? "a short peak is normal; held for a long time it can trip" : "a short peak is normal; held for a few seconds it may trip";
};
// The same for a branch breaker, as a short tail to its row in the table ("" at or under its rating).
M.branchNote = function (b) { return b > 2 ? ", can trip in seconds" : b > 1.5 ? ", can trip if held" : b > 1 ? ", above its rating" : ""; };
/* The action sentence for the largest row: what it draws of the total and which number to lower. */
M.lever = function (row, I) {
  var name = row.name || "The biggest row";
  return name + " draws " + Math.round(row.I) + " of " + Math.round(I) + " A; lowering its supply current limit helps most. Set a supply current limit (for example " + M.supplySuggest(row.a) + " A) on the " + (row.name ? row.name.toLowerCase() + " " : "") + "motors.";
};
// Amps as written on the page: whole amps without ".0", a tenth when there is one.
M.amps = function (a) { var t = Math.round(a * 10) / 10; return t % 1 ? t.toFixed(1) : String(t); };
// A supply limit to try: three quarters of what each motor draws now, to the 5 A below.
M.supplySuggest = function (a) { return Math.max(5, Math.floor(a * 0.75 / 5) * 5); };
/* A row that lumps several small loads together ("Everything else") is not one motor on one branch breaker, so it
   gets no breaker percentage. A row is such a lump when it says so (agg) or its name reads like one. */
M.isAggregate = function (row) { return !!(row && (row.agg || /^\s*(everything|all) else|^\s*(other|misc|the rest)/i.test(row.name || ""))); };
/* A row filled from another calculator: its motor count and current limit (the most each motor can draw). st: that
   tool's state; name: the row's name. Returns { name, n, a } or null when the state has no motor count. */
M.fromTool = function (st, name) {
  if (!st || !(st.motors > 0)) return null;
  return { name: name, n: Math.round(st.motors), a: st.statorA > 0 ? st.statorA : 0 };
};
/* The voltage steps the drawing shows, to 0.1 V, worked so that they add up as shown: at rest, less the loss in the
   wiring (rounded), less the loss inside the battery, equals what the robot gets (rounded). The battery's step takes up
   the rounding. Past 0 V the battery cannot push more, so the two losses are shared out of what it has. */
M.waterfall = function (rest, dropBat, dropWire) {
  var V = rest - dropBat - dropWire, over = V < 0 ? rest / (dropBat + dropWire) : 1;
  var r1 = Math.round(rest * 10), rw = Math.round(dropWire * over * 10), rv = Math.round(Math.max(0, V) * 10), rb = r1 - rw - rv;
  return { rest: r1 / 10, bat: rb / 10, wire: rw / 10, robot: rv / 10, afterBat: (r1 - rb) / 10 };
};
// The voltage at the robot for a total current I (A) through resistance R (ohm).
M.volts = function (rest, R, I) { return rest - I * R; };

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The calculator ---------- */
var K = D.calc, ID = "tool-power", esc = D.esc, MAXROWS = 10;
// The calculators a row can be filled from: [tool id, button name, row name].
var FILL = [["tool-drive", "Drivetrain", "Drive"], ["tool-elevator", "Elevator", "Elevator"], ["tool-arm", "Arm", "Arm"], ["tool-shooter", "Shooter", "Shooter"], ["tool-intake", "Intake", "Intake"]];
var css = document.createElement("style");
css.textContent =
  ".t-power-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 8px;padding:10px 0 12px;border-top:1px solid var(--line)}" +
  ".t-power-row:first-child{border-top:0;padding-top:2px}" +
  ".t-power-row .inp{min-height:36px;padding:4px 8px}.t-power-row .t-power-name{min-width:0}" +
  ".t-power-nums{grid-column:1/-1;display:flex;align-items:end;gap:8px}" +
  ".t-power-nums label{display:grid;gap:2px;font-size:.78rem;color:var(--mute);font-weight:600}" +
  ".t-power-nums .inp{width:76px;text-align:right}.t-power-nums .inp.bad,.t-power-row .inp.bad{border-color:var(--bad);background:var(--bad-bg)}" +
  ".t-power-nums span{padding-bottom:9px;color:var(--mute)}.t-power-nums output{padding-bottom:9px;margin-left:auto;font-size:.85rem;font-weight:600;color:var(--text-2)}" +
  ".t-power-fill{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.t-power-fb{display:inline-grid;justify-items:start;line-height:1.2;padding-top:5px;padding-bottom:5px}.t-power-fb small{font-weight:500;color:var(--text-2);font-size:.75rem}.t-power-done{color:var(--text)}" +
  ".t-power-bad{color:var(--bad);font-weight:700;font-style:normal}" +
  "@media (max-width:640px){.t-power-empty{display:none !important}.t-power-row .inp{min-height:44px}}";
document.head.appendChild(css);

function opts(s) { return { rest: s.rest, rbat: s.rbat, rwire: s.rwire, brown: s.brown, main: s.main }; }
function clean(rows) {
  if (!Array.isArray(rows)) rows = [];
  return rows.filter(function (r) { return r && typeof r === "object"; }).slice(0, MAXROWS).map(function (r) {
    var o = { name: String(r.name == null ? "" : r.name).slice(0, 40), n: isFinite(+r.n) && +r.n >= 0 ? Math.round(+r.n) : 1, a: isFinite(+r.a) && +r.a >= 0 ? +r.a : 0 };
    if (r.agg) o.agg = true;
    return o;
  });
}
function vTxt(v) { return K.fix(Math.max(0, v), 1) + " V"; }
var breakerNote = M.breakerNote;

K.tool({
  id: ID,
  defaults: {
    // The lead's choice of rows (2026-11-18): a hard moment that lands just above brown-out, so the page opens on a
    // close call to look into, not on a failure.
    rows: [{ name: "Drive", n: 4, a: 40 }, { name: "Shooter", n: 2, a: 25 }, { name: "Intake", n: 1, a: 20 }, { name: "Elevator hold", n: 2, a: 10 }, { name: "Other 12 V loads", n: 1, a: 8, agg: true }],
    // 12.3 V at rest, as in every other calculator: a charged battery under a light load.
    rest: 12.3, filled: "", rbat: 0.015, rwire: 0.005, brown: 6.8, main: 120
  },
  stage: { ratio: 2.1, narrow: 0.8, label: "Two pictures: one bar of the current, cut into what draws it, and the battery's voltage stepping down from at rest, through the losses in the battery and the wiring, to what the robot gets, against the brown-out line." },

  compute: function (s) {
    s.rows = clean(s.rows);
    var r = M.power(s.rows, opts(s));
    r.state = r.V < s.brown ? "bad" : (r.margin < 1 || r.tired.V < s.brown) ? "warn" : "ok";
    // The voltage line for the chart: this battery and a worn one.
    var xmax = Math.max(50, r.I * 1.3, Math.min(r.Imax * 1.15, 1000)); r.xmax = xmax;
    r.line = []; r.lineT = [];
    for (var i = 0; i <= 60; i++) { var I = xmax * i / 60; r.line.push([I, Math.max(0, M.volts(s.rest, r.R, I))]); r.lineT.push([I, Math.max(0, M.volts(s.rest, r.tired.R, I))]); }
    return r;
  },

  hints: function (s, r) { var h = { "t-power-rall": "With the wiring: " + K.fix(s.rbat + s.rwire, 3) + " Ω in all (the Drivetrain starts from 0.020 Ω)." }; r.rows.forEach(function (q, i) { h["t-power-t" + i] = "= " + M.amps(q.I) + " A"; }); return h; },

  controls: function (s, r) {
    var rows = s.rows.map(function (q, i) {
      return '<div class="t-power-row"><input type="text" class="inp t-power-name" maxlength="40" value="' + esc(q.name) + '" data-input="powname" data-i="' + i + '" aria-label="Row ' + (i + 1) + ' name" placeholder="What it is">' +
        '<button class="btn sm ghost" data-act="powdel" data-v="' + i + '" aria-label="Remove ' + esc(q.name || "row " + (i + 1)) + '">Remove</button>' +
        '<div class="t-power-nums"><label>Motors<input type="number" inputmode="numeric" class="inp num" min="0" max="20" step="1" value="' + q.n + '" data-input="pownum" data-i="' + i + '" data-k="n" aria-label="' + esc(q.name || "Row " + (i + 1)) + ' motors"></label><span aria-hidden="true">×</span>' +
        '<label>Amps each<input type="number" inputmode="decimal" class="inp num" min="0" max="400" step="any" value="' + q.a + '" data-input="pownum" data-i="' + i + '" data-k="a" aria-label="' + esc(q.name || "Row " + (i + 1)) + ' amps each"></label><output id="t-power-t' + i + '">= ' + K.n(q.I != null ? q.I : q.n * q.a, 0) + " A</output></div></div>";
    }).join("");
    var add = s.rows.length < MAXROWS ? '<div><button class="btn sm" data-act="powadd">' + D.ic("plus", 16) + " Add a row</button></div>" : "";
    // Fill a row from another calculator's present numbers (its motor count and current limit).
    // At the top of the column, where it is seen: fill a row from another calculator's present numbers.
    var fill = '<p class="cfh">Each button copies that calculator\'s motor count and current limit into the row of the same name, or adds one.</p><div class="t-power-fill">' +
      FILL.map(function (f) {
        // What the row would read, from that calculator's numbers as they are now.
        var q = M.fromTool(K.state(f[0]), f[2]), now = q ? q.n + " × " + q.a + " A = " + (q.n * q.a) + " A" : "no motors set";
        return '<button class="btn sm t-power-fb" data-act="powfill" data-v="' + f[0] + '">' + (f[0] === "tool-drive" ? "Fill from " : "") + esc(f[1]) + "<small>" + esc(now) + "</small></button>";
      }).join("") + "</div>" +
      (s.filled ? '<p class="cfh t-power-done">' + esc(s.filled) + "</p>" : "");
    return K.group(ID, "rows", "Drawing current at the same moment", '<p class="cfh">Battery amps per motor, for what runs at once; a motor under a current limit takes less from the battery while it is slow.</p><div>' + rows + "</div>" + add) +
      K.group(ID, "fill", "Fill from another calculator", fill, true) +
      K.group(ID, "bat", "Battery", K.num(ID, "rest", "At rest", { unit: "V", min: 10, max: 13.5, step: 0.1, slider: true, hint: "Starts at 12.3 V, as in the other calculators.", tip: "What the battery reads with nothing running. A charged battery reads 12.6 to 13 V; 12.3 V allows for one that has run a little." }) +
        K.num(ID, "rbat", "Inside the battery", { unit: "Ω", min: 0.005, max: 0.05, step: 0.001, slider: true, hintId: "t-power-rall", tip: "The battery's own resistance. A fresh battery is near 0.012 Ω, a worn one 0.025 Ω or more. A battery tester reads it." })) +
      K.group(ID, "adv", "Fine tuning", K.num(ID, "rwire", "Wiring and connections", { unit: "Ω", min: 0, max: 0.03, step: 0.001, tip: "Main wire, Anderson connector, main breaker and distribution. 0.005 Ω is a tidy robot with 6 AWG." }) +
        K.num(ID, "brown", "Brown-out", { unit: "V", min: 4, max: 10, step: 0.1, tip: "The roboRIO cuts the motor outputs near 6.8 V (roboRIO 1) or a level you set (roboRIO 2)." }) +
        K.num(ID, "main", "Main breaker", { unit: "A", min: 40, max: 200, step: 1, tip: "120 A is the rule for FRC." }), true);
  },

  outs: function (s, r) {
    var worst = r.rows[r.worst], text;
    if (!r.rows.length || r.I <= 0) return K.verdict("info", "Add what draws current to see the battery sag.");
    // One finding and one action. The how of the action, and anything else, go in the quieter second line.
    var lv = M.lever(worst, r.I), cut = lv.indexOf(" Set a supply"), act = cut > 0 ? lv.slice(0, cut) : lv, how = cut > 0 ? lv.slice(cut + 1) : "", more = "";
    var wornOut = r.tired.V < s.brown;
    if (r.state === "bad") { text = "Browns out: " + vTxt(r.V) + " at the robot, " + K.n(r.cut, 0) + " A more than this battery can give. " + act; more = how; }
    else if (r.state === "warn") { text = (r.margin < 1 ? "Close to brown-out: " + vTxt(r.V) + ", only " + K.fix(r.margin, 1) + " V to spare" + (wornOut ? ", and a worn battery browns out (" + vTxt(r.tired.V) + ")." : ".") : "Fine on this battery at " + vTxt(r.V) + ", but a worn one browns out (" + vTxt(r.tired.V) + ").") + " " + act; more = how; }
    else text = "Holds " + vTxt(r.V) + " with " + K.n(r.I, 0) + " A drawn, " + K.fix(r.margin, 1) + " V above brown-out; a worn battery still holds " + vTxt(r.tired.V) + ".";
    if (r.V <= 0) more += (more ? " " : "") + "No battery can give this: it is more than the battery's short-circuit current, " + K.n(s.rest / r.R, 0) + " A, so the numbers past 0 V are not real.";
    var bs = r.state;
    var tryA = r.state !== "ok" && !M.isAggregate(worst) && M.supplySuggest(worst.a) < worst.a ? M.supplySuggest(worst.a) : 0;
    var mTxt = (r.margin < 0 ? K.fix(-r.margin, 1) + " V below" : K.fix(r.margin, 1) + " V above") + " brown-out", wm = r.tired.V - s.brown;
    return (K.verdict(bs, text, more) + (tryA ? '<div class="row"><button class="btn sm" data-act="powtry" data-i="' + r.worst + '" data-v="' + tryA + '">Try ' + tryA + " A</button></div>" : "") + K.outs([
      { k: "Total current", v: K.n(r.I, 0), u: "A", sub: r.rows.length + (r.rows.length === 1 ? " row" : " rows") + ", largest " + (worst.name || "row " + (r.worst + 1)) },
      { k: "Voltage at the robot", v: K.fix(Math.max(0, r.V), 1), u: "V", state: bs === "ok" ? "" : bs, sub: mTxt, tip: (r.marginA >= 0 ? K.n(r.marginA, 0) + " A to spare" : K.n(-r.marginA, 0) + " A too many") + " of the " + K.n(r.Imax, 0) + " A this battery gives before brown-out. A model: read the battery's voltage under load to know." },
      { k: "Main breaker", v: K.n(r.share * 100, 0), u: "%", state: r.share >= 2 ? "bad" : r.share > 1 ? "warn" : "", sub: r.share >= 2 ? "may trip if held for seconds" : r.share > 1 ? "above its rating" : "of its rating", tip: "Here: " + breakerNote(r.share) + ". A rough guide, not a trip curve. A thermal breaker's timing varies with how hot it is and what it carried just before; read the maker's trip curve." },
      { k: "Worn battery", v: K.fix(Math.max(0, r.tired.V), 1), u: "V", state: wm < 0 ? "bad" : wm < 1 ? "warn" : "", sub: (wm < 0 ? K.fix(-wm, 1) + " V below" : K.fix(wm, 1) + " V above") + " brown-out", tip: "The same current from a worn battery (" + M.TIRED + " Ω inside, " + K.n(r.tired.Imax, 0) + " A before brown-out)." }
    ]));
  },

  more: function (s, r) {
    var out = K.chart({ id: "power-v", title: "Voltage at the robot against total current", x: { label: "total current (A)", name: "Current", unit: "A", min: 0, max: r.xmax }, y: { label: "volts at the robot (V)", unit: "V", min: 0, max: Math.ceil(s.rest + 0.5) },
      series: [{ name: "This battery (" + K.fix(s.rbat, 3) + " Ω) and wiring", pts: r.line, color: 1 }, { name: "Worn battery (" + M.TIRED + " Ω) and wiring", pts: r.lineT, color: 2, dash: true }],
      hlines: [{ y: s.brown, label: "Brown-out " + K.fix(s.brown, 1) + " V", side: "left", below: true }], marks: r.I > 0 ? [{ x: Math.min(r.I, r.xmax), label: "Now " + K.n(r.I, 0) + " A" }] : [] });
    if (r.rows.length) out += '<section class="ctab"><h2>Where the current goes</h2><div class="scroll"><table><thead><tr><th>Row</th><th class="r">Motors</th><th class="r">Amps each</th><th class="r">Total</th><th class="r">Share</th><th class="r">Of its 40 A branch breaker</th></tr></thead><tbody>' +
      r.rows.map(function (q, i) { var b = q.a / M.BRANCH; return "<tr" + (i === r.worst && r.state !== "ok" ? ' class="pick"' : "") + "><td>" + esc(q.name || "Row " + (i + 1)) + '</td><td class="r num' + (M.isAggregate(q) ? " t-power-empty" : "") + '">' + (M.isAggregate(q) ? "" : q.n) + '</td><td class="r num' + (M.isAggregate(q) ? " t-power-empty" : "") + '">' + (M.isAggregate(q) ? "" : M.amps(q.a) + " A") + '</td><td class="r num">' + K.n(q.I, 0) + ' A</td><td class="r num">' + K.n(q.share * 100, 0) + '%</td><td class="r num">' + (M.isAggregate(q) ? "several loads, not one breaker" : K.n(b * 100, 0) + "%" + M.branchNote(b)) + "</td></tr>"; }).join("") +
      "</tbody></table></div><p class=\"mute small\">Each motor has its own 40 A branch breaker. As a rough guide, a breaker carries its rating for a long time and can trip within seconds at about twice it, so a short peak over 40 A is normal. These are not trip times: a thermal breaker's timing varies with how hot it already is and what it carried just before, so read the maker's trip curve.</p></section>";
    out += K.notes("<p>A battery behaves like a perfect voltage source with a small resistor inside it. Everything the robot draws flows through that resistor and through the wiring, and each ohm costs volts:</p>" +
      '<p class="eq">volts at the robot = rest volts − total current × (battery + wiring resistance)</p>' +
      '<p class="eq">most current before brown-out = (rest volts − brown-out volts) ÷ (battery + wiring resistance)</p>' +
      '<p class="eq">heat = current² × resistance</p>' +
      "<p>Here that is " + K.n(r.heat, 0) + " W lost as heat (" + K.n(r.heatBat, 0) + " W in the battery, " + K.n(r.heatWire, 0) + " W in the wiring), and " + K.n(r.tired.heat, 0) + " W with a worn battery.</p>" +
      "<p>Amps here are battery-side (supply) amps. A motor under a stator limit draws less from the battery than through its windings while it is slow, so use the supply current from the motor's own calculator, or set a supply limit and use that.</p>" +
      "<p>Breakers are thermal: they heat up with current and open when hot. As a rough guide, the 120 A main breaker and the 40 A branch breakers carry their rating for a long time and can trip within seconds at about twice it. That is a rule of thumb, not the maker's trip curve: the real timing varies from breaker to breaker and with how warm it already is.</p>" +
      "<p>What the model leaves out: the battery's voltage also falls as it empties and when it is cold, and its resistance rises as it ages. The roboRIO's brown-out cuts outputs first, then the radio can reboot near 4.5 V. The default rows add up a moment when everything runs at once, which real matches rarely hold for long.</p>");
    return out;
  },

  draw: function (g, s, r) { drawPower(g, s, r); }
});

/* ---------- The drawing ---------- */
/* Two pictures, top to bottom: who draws the current (one bar, to scale, cut into the rows), and what that does to
   the voltage (a waterfall from at rest, down through the losses, to what the robot gets, against brown-out). */
function drawPower(g, s, r) {
  var c = g.c, W = g.w, H = g.h, phone = W < 560, rows = r.rows, n = rows.length;
  var col = { ok: c.ok, warn: c.warn, bad: c.bad }[r.state] || c.text;
  if (!n || r.I <= 0) { g.text("Add a row to see where the current goes.", 16, 28, { color: c.mute }); return; }

  // 1. Who draws the current.
  g.text("Who draws the current", 14, 20, { weight: 700, size: 13 });
  var totT = K.n(r.I, 0) + " A", totW = g.textWidth(totT, { size: 14, weight: 700 });
  var bx0 = 14, bx1 = W - 14 - totW - 10, by = 34, bh = 22, kA = (bx1 - bx0) / r.I, x = bx0, pieces = [];
  // Largest first, so the eye starts on the one to look at and the small ones gather at the end.
  rows.map(function (q, i) { return { q: q, i: i }; }).sort(function (a, b) { return b.q.I - a.q.I || a.i - b.i; }).forEach(function (o, k, arr) {
    var q = o.q, w = q.I * kA, hot = o.i === r.worst, over = !M.isAggregate(q) && q.a > M.BRANCH;
    if (w > 0) g.rect(x, by, Math.max(1, w - (k < arr.length - 1 ? 2 : 0)), bh, { fill: hot ? c.force : c.s1, stroke: null });
    // A row whose motors each draw more than their 40 A branch breaker: a small mark on its piece.
    if (over && w > 8) g.poly([[x + w / 2, by - 2], [x + w / 2 - 5, by - 9], [x + w / 2 + 5, by - 9]], { fill: c.warn, stroke: null, close: true });
    var name = q.name || "Row " + (o.i + 1), amps = K.n(q.I, 0) + " A" + (over ? ", over 40 A each" : "");
    pieces.push({ x: x, w: w, q: q, hot: hot, over: over, name: name, amps: amps, lw: Math.max(g.textWidth(name, { size: 12, weight: 700 }), g.textWidth(amps, { size: 11, weight: 600 })) });
    x += w;
  });
  g.text(totT, bx1 + 10, by + bh / 2, { size: 14, weight: 700, base: "middle" });
  // A piece wide enough is named under itself. From the first one that is not, the rest share one bracket and a list.
  var ly0 = by + bh + 8, cut = pieces.length;
  for (var k = 0; k < pieces.length; k++) if (pieces[k].w < pieces[k].lw + 8) { cut = k; break; }
  pieces.slice(0, cut).forEach(function (p) {
    var lx = p.x + 4;
    g.text(p.name, lx, ly0 + 12, { size: 12, weight: 700, color: p.hot ? c.force : c.text });
    g.text(p.amps, lx, ly0 + 26, { size: 11, weight: 600, color: p.over ? c.warn : c.text2 });
  });
  var used = 32;
  if (cut < pieces.length) {
    var p0 = pieces[cut], sx0 = p0.x + 1, sx1 = bx1 - 1, rest = pieces.slice(cut), bk = ly0 + 4;
    g.line(sx0, bk, sx1, bk, { color: c.mute, width: 1.25 }); g.line(sx0, bk - 4, sx0, bk, { color: c.mute, width: 1.25 }); g.line(sx1, bk - 4, sx1, bk, { color: c.mute, width: 1.25 });
    // The list, in its own line under the named pieces, right-aligned to the bracket, wrapping when it must.
    var parts = rest.map(function (p) { return p.name + " " + p.amps; }), lines = [], cur = "and ";
    parts.forEach(function (t, k2) { var add = t + (k2 < parts.length - 1 ? "," : ""); if (g.textWidth(cur + add, { size: 11, weight: 600 }) > W - 28 && cur !== "and ") { lines.push(cur.trim()); cur = ""; } cur += add + " "; });
    lines.push(cur.trim());
    var ty = ly0 + (cut > 0 ? 44 : 20), mid = (sx0 + sx1) / 2;
    lines.forEach(function (ln, k3) {
      var tw = g.textWidth(ln, { size: 11, weight: 600 }), tx = F.clamp(sx1 - tw, 14, W - 14 - tw);
      g.text(ln, tx, ty + k3 * 15, { size: 11, weight: 600, color: c.text2 });
    });
    var firstW = g.textWidth(lines[0], { size: 11, weight: 600 }), fx0 = F.clamp(sx1 - firstW, 14, W - 14 - firstW);
    g.line(mid, bk, F.clamp(mid, fx0 + 4, fx0 + firstW - 4), ty - 11, { color: c.mute, width: 1 });
    used = ty - ly0 + (lines.length - 1) * 15 + 6;
  }
  var ends = { length: 0 }, lh = 0;
  var sec2 = ly0 + used + 18;
  g.line(14, sec2 - 8, W - 14, sec2 - 8, { color: c.line, width: 1 });

  // 2. What that does to the voltage: a waterfall, to scale from 0 V.
  g.text("What that does to the voltage", 14, sec2 + 12, { weight: 700, size: 13 });
  var key = "brown-out " + K.fix(s.brown, 1) + " V", kw = g.textWidth(key, { size: 11, weight: 600 });
  g.line(W - 14 - kw - 30, sec2 + 8, W - 14 - kw - 8, sec2 + 8, { color: c.bad, width: 1.5, dash: [4, 3] });
  g.text(key, W - 14, sec2 + 12, { size: 11, weight: 600, color: c.bad, align: "right" });
  var wf = M.waterfall(s.rest, r.dropBat, r.dropWire), vtop = Math.ceil(Math.max(s.rest, s.brown) + 0.5);
  var py0 = sec2 + 28, py1 = H - 40, px0 = 14, px1 = W - 14 - (phone ? 0 : 160), cw = (px1 - px0) / 4, bw = cw * (phone ? 0.6 : 0.5);
  function Y(v) { return py1 - (py1 - py0) * F.clamp(v, 0, vtop) / vtop; }
  function CX(k) { return px0 + cw * (k + 0.5); }
  var cols = [
    { top: wf.rest, bot: 0, fill: c.part2, name: "At rest", val: K.fix(wf.rest, 1) + " V", vc: c.text },
    { top: wf.rest, bot: wf.afterBat, fill: c.force, name: phone ? "In the battery" : "Lost in the battery", val: "−" + K.fix(wf.bat, 1) + " V", vc: c.force },
    { top: wf.afterBat, bot: wf.robot, fill: c.force, name: phone ? "In the wiring" : "Lost in the wiring", val: "−" + K.fix(wf.wire, 1) + " V", vc: c.force },
    { top: wf.robot, bot: 0, fill: col, name: "At the robot", val: K.fix(wf.robot, 1) + " V", vc: col }];
  g.line(px0, py1, px1, py1, { color: c.text2, width: 1.5 });
  cols.forEach(function (q, k) {
    var x0 = CX(k) - bw / 2, yt = Y(q.top), yb = Y(q.bot);
    g.rect(x0, yt, bw, Math.max(1.5, yb - yt), { fill: q.fill, stroke: null });
    // The steps join: a thin line from each bar's foot to the next one's top.
    if (k < 3) g.line(x0 + bw, Y(k === 0 ? q.top : q.bot), CX(k + 1) - bw / 2, Y(k === 0 ? q.top : q.bot), { color: c.mute, width: 1, dash: [2, 3] });
    g.text(q.name, CX(k), py1 + 16, { size: 11, weight: 600, color: c.text2, align: "center" });
    g.text(q.val, CX(k), py1 + 31, { size: 12, weight: 700, color: q.vc, align: "center" });
  });
  // Brown-out, across the plot.
  g.line(px0, Y(s.brown), CX(3) + bw / 2 + 2, Y(s.brown), { color: c.bad, width: 1.5, dash: [4, 3] });
  // The answer: the gap between what the robot gets and brown-out, with a bracket and its figure.
  var fx = CX(3) + bw / 2 + 8, ya = Y(Math.max(0, r.V)), yb2 = Y(s.brown), short = r.V < s.brown;
  var mT = K.fix(Math.abs(wf.robot - s.brown), 1) + " V " + (short ? "short" : "to spare"), mc = short ? c.bad : r.margin < 1 ? c.warn : c.ok;
  g.line(fx, ya, fx, yb2, { color: mc, width: 2.5, cap: "butt" }); g.line(fx - 4, ya, fx + 4, ya, { color: mc, width: 2 }); g.line(fx - 4, yb2, fx + 4, yb2, { color: mc, width: 2 });
  if (!phone) g.text(mT, fx + 10, (ya + yb2) / 2, { size: 15, weight: 700, color: mc, base: "middle" });
  else {
    var mw = g.textWidth(mT, { size: 15, weight: 700 }), mx = W - 8 - mw, my = Math.min(ya, yb2) - 34;
    g.line(fx, Math.min(ya, yb2) - 2, F.clamp(fx, mx + 4, mx + mw - 4), my + 4, { color: mc, width: 1 });
    g.text(mT, mx, my, { size: 15, weight: 700, color: mc });
  }
}

// Break a label into at most two lines of w pixels at spaces; a word too long for a line is shortened.
function wrap(g, str, w, size) {
  if (g.textWidth(str, { size: size, weight: 700 }) <= w) return [str];
  var words = str.split(" "), first = words[0], k = 1;
  while (k < words.length && g.textWidth(first + " " + words[k], { size: size, weight: 700 }) <= w) first += " " + words[k++];
  var rest = words.slice(k).join(" ");
  return rest ? [fit(g, first, w, size), fit(g, rest, w, size)] : [fit(g, first, w, size)];
}
// Shorten a label with an ellipsis until it fits w pixels.
function fit(g, str, w, size) {
  if (g.textWidth(str, { size: size, weight: 700 }) <= w) return str;
  while (str.length > 1 && g.textWidth(str + "…", { size: size, weight: 700 }) > w) str = str.slice(0, -1);
  return str.trim() + "…";
}

/* ---------- Rows ---------- */
function S() { return K.state(ID); }
D.inputs.powname = function (el) { var q = S().rows[+el.dataset.i]; if (!q) return; q.name = el.value.slice(0, 40); K.refresh(ID); };
D.inputs.pownum = function (el) {
  var q = S().rows[+el.dataset.i], v = parseFloat(el.value), k = el.dataset.k, hi = k === "n" ? 20 : 400;
  var bad = !q || !isFinite(v) || v < 0 || v > hi || (k === "n" && v !== Math.round(v)); el.classList.toggle("bad", bad);
  if (bad) return; q[k] = v; K.refresh(ID);
};
D.acts.powadd = function () { var s = S(); if (s.rows.length < MAXROWS) s.rows.push({ name: "", n: 1, a: 20 }); D.render(); var el = document.querySelector('[data-input="powname"][data-i="' + (s.rows.length - 1) + '"]'); if (el) el.focus(); };
/* Fill a row from another calculator's present numbers: its motor count and current limit. The row with that name is
   updated (or "Elevator hold" for the elevator), else a row is added. Nothing is changed in the other calculator. */
D.acts.powfill = function (b) {
  var s = S(), f = FILL.filter(function (x) { return x[0] === b.dataset.v; })[0]; if (!f) return;
  var q = M.fromTool(K.state(f[0]), f[2]);
  if (!q) { s.filled = "The " + f[1] + " calculator has no motors set."; D.render(); return; }
  var i = -1; s.rows.forEach(function (r, k) { if (i < 0 && (r.name || "").toLowerCase().indexOf(f[2].toLowerCase()) === 0) i = k; });
  if (i < 0 && s.rows.length >= MAXROWS) { s.filled = "There is no room for another row: remove one first."; D.render(); return; }
  if (i < 0) { s.rows.push(q); i = s.rows.length - 1; } else { s.rows[i].n = q.n; s.rows[i].a = q.a; q.name = s.rows[i].name; }
  s.filled = "Copied from " + f[1] + ": " + q.n + (q.n === 1 ? " motor" : " motors") + " at its " + q.a + " A current limit, into the row " + q.name + ". That is an upper bound: from the battery each takes less while it is slow.";
  D.render();
};
// Try the verdict's suggested limit: set that row's amps per motor to it.
D.acts.powtry = function (b) { var q = S().rows[+b.dataset.i]; if (!q) return; q.a = +b.dataset.v; S().filled = "Set " + (q.name || "that row") + " to " + b.dataset.v + " A per motor, as a supply current limit would."; D.render(); };
D.acts.powdel = function (b) { var s = S(); s.rows.splice(+b.dataset.v, 1); D.render(); };
})(typeof window !== "undefined" ? window : this);
