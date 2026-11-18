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
  ".t-power-fill{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.t-power-fb{display:inline-grid;justify-items:start;line-height:1.2;padding-top:5px;padding-bottom:5px}.t-power-fb small{font-weight:500;color:var(--text-2);font-size:.75rem}.t-power-done{color:var(--text)}.t-power-ph{display:none}" +
  ".t-power-bad{color:var(--bad);font-weight:700;font-style:normal}" +
  "@media (max-width:640px){.t-power-empty{display:none !important}.t-power-row .inp{min-height:44px}.t-power-ph{display:block}}";
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
  stage: { ratio: 2, narrow: 0.95, label: "A one-line power diagram: the battery, the main breaker and one branch per row, each wire as thick as its current, over a gauge of the voltage at the robot." },

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
    return K.group(ID, "fill", "Fill from another calculator", fill) + K.group(ID, "rows", "Drawing current at the same moment", '<p class="cfh">Battery amps per motor, for what runs at once. A current limit caps motor amps; the battery sees less while slow.</p><div>' + rows + "</div>" + add) +
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
    return (K.verdict(bs, text, more) + (tryA ? '<div class="row"><button class="btn sm" data-act="powtry" data-i="' + r.worst + '" data-v="' + tryA + '">Try ' + tryA + " A</button></div>" : "") + K.outs([
      { k: "Total current", v: K.n(r.I, 0), u: "A", sub: r.rows.length + (r.rows.length === 1 ? " row" : " rows") },
      { k: "Voltage at the robot", v: K.fix(Math.max(0, r.V), 1), u: "V", state: bs === "ok" ? "" : bs, sub: "worn battery " + vTxt(r.tired.V) + (r.tired.V < s.brown ? "\u0001" : "") },
      { k: "Margin to brown\u2011out", v: (r.margin < 0 ? "−" : "") + K.fix(Math.abs(Math.max(0, r.V) - s.brown), 1), u: "V", state: r.margin < 0 ? "bad" : r.margin < 1 ? "warn" : "", sub: "nominal: measure under load", tip: (r.marginA >= 0 ? K.n(r.marginA, 0) + " A to spare" : K.n(-r.marginA, 0) + " A too many") + " of the " + K.n(r.Imax, 0) + " A this battery gives before brown-out; a worn one gives " + K.n(r.tired.Imax, 0) + " A. Most current before brown-out = (rest volts − brown-out volts) ÷ (battery + wiring resistance). A model: read the battery's voltage under load to know." },
      { k: "Main breaker", v: K.n(r.share * 100, 0), u: "%", state: r.share >= 2 ? "bad" : r.share > 1 ? "warn" : "", sub: r.share >= 2 ? "may trip if held for seconds" : r.share > 1 ? "above its rating" : "of its rating", tip: "Here: " + breakerNote(r.share) + ". A rough guide, not a trip curve. A thermal breaker's timing varies with how hot it is and what it carried just before; read the maker's trip curve." },
      { k: "Lost as heat", v: K.n(r.heat, 0), u: "W", sub: "worn battery " + K.n(r.tired.heat, 0) + "\u00a0W", tip: "Current² × resistance: " + K.n(r.heatBat, 0) + " W in the battery and " + K.n(r.heatWire, 0) + " W in the wiring." }
    ])).replace(/worn battery ([0-9.]+ V)\u0001/, 'worn battery <em class="t-power-bad">$1</em>');
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
      "<p>Amps here are battery-side (supply) amps. A motor under a stator limit draws less from the battery than through its windings while it is slow, so use the supply current from the motor's own calculator, or set a supply limit and use that.</p>" +
      "<p>Breakers are thermal: they heat up with current and open when hot. As a rough guide, the 120 A main breaker and the 40 A branch breakers carry their rating for a long time and can trip within seconds at about twice it. That is a rule of thumb, not the maker's trip curve: the real timing varies from breaker to breaker and with how warm it already is.</p>" +
      "<p>What the model leaves out: the battery's voltage also falls as it empties and when it is cold, and its resistance rises as it ages. The roboRIO's brown-out cuts outputs first, then the radio can reboot near 4.5 V. The default rows add up a moment when everything runs at once, which real matches rarely hold for long.</p>");
    return out;
  },

  draw: function (g, s, r) { drawPower(g, s, r); }
});

/* ---------- The drawing ---------- */
function drawPower(g, s, r) {
  var c = g.c, W = g.w, H = g.h, phone = W < 560, rows = r.rows, n = rows.length;
  var col = { ok: c.ok, warn: c.warn, bad: c.bad }[r.state] || c.text;
  // Title.
  var head = K.n(r.I, 0) + " A with all of these running", hw = g.textWidth(head, { weight: 700 });
  g.text(head, 12, 18, { weight: 700 });
  g.text(", " + vTxt(r.V) + " at the robot", 12 + hw, 18, { color: col, weight: 600 });

  // Voltage gauge: the whole scale on a main bar, and under it the part round brown-out magnified, so the margin
  // between "now" and brown-out reads even when it is a fraction of a volt. Worn and at-rest are named on the main bar,
  // now, brown-out and the margin on the magnified strip.
  var gx0 = 16, gx1 = W - 16, zy = H - (phone ? 52 : 44), zh = 12, gy = zy - 82, gh = 10, vmax = Math.ceil(Math.max(13, s.rest + 0.5)), GX = function (v) { return gx0 + F.clamp(v, 0, vmax) / vmax * (gx1 - gx0); };
  var lo6 = Math.min(Math.max(0, r.V), s.brown), hi6 = Math.max(Math.max(0, r.V), s.brown), padZ = Math.max(0.5, (hi6 - lo6) * 0.8);
  var z0 = Math.max(0, Math.floor((lo6 - padZ) * 2) / 2), z1 = Math.min(vmax, Math.ceil((hi6 + padZ) * 2) / 2); if (z1 - z0 < 1.5) z1 = Math.min(vmax, z0 + 1.5);
  var ZX = function (v) { return gx0 + (F.clamp(v, z0, z1) - z0) / (z1 - z0) * (gx1 - gx0); };
  function bar(y, h, X, x0v) {
    g.rect(gx0, y, gx1 - gx0, h, { fill: c.sheet, stroke: c.line, width: 1 });
    if (r.V > x0v) g.rect(gx0, y, Math.max(0, X(r.V) - gx0), h, { fill: col, stroke: null });
    g.ctx.save(); g.ctx.beginPath(); g.ctx.rect(gx0, y + h + 1, Math.max(0, X(s.brown) - gx0), 5); g.ctx.clip();
    for (var hx = gx0 - 6; hx < X(s.brown) + 6; hx += 4) g.line(hx, y + h + 6, hx + 5, y + h + 1, { color: c.bad, width: 1 });
    g.ctx.restore();
    g.rect(gx0, y, gx1 - gx0, h, { stroke: c.line2 || c.line, width: 1 });
    g.line(X(s.brown), y - 3, X(s.brown), y + h + 3, { color: c.bad, width: 1.5, dash: [3, 2] });
  }
  // The main bar, its scale, and the window that is magnified below.
  bar(gy, gh, GX, 0);
  // The scale's numbers, but none inside the magnified window, whose edges carry the leader lines.
  for (var v = 0; v <= vmax; v += 2) { g.line(GX(v), gy + gh, GX(v), gy + gh + 4, { color: c.mute, width: 1 }); if (GX(v) < GX(z0) - 12 || GX(v) > GX(z1) + 12) g.text(v + (v === vmax ? " V" : ""), GX(v), gy + gh + 16, { size: 11, color: c.mute, align: "center" }); }
  if (r.I > 0) g.poly([[GX(r.V), gy - 1], [GX(r.V) - 4, gy - 7], [GX(r.V) + 4, gy - 7]], { fill: col, stroke: null });
  g.rect(GX(z0), gy - 4, GX(z1) - GX(z0), gh + 8, { stroke: c.text2, width: 1.25 });
  // Leaders from the window down to the strip: straight down past the numbers, then out to the strip's ends.
  var ly = gy + gh + 20;
  [[GX(z0), gx0], [GX(z1), gx1]].forEach(function (q) { g.path([[q[0], gy + gh + 4], [q[0], ly], [q[1], zy - 32]], { color: c.mute, width: 1 }); });
  var marks = [
    { v: s.rest, txt: K.fix(s.rest, 1) + " V at rest", color: c.text2 },
    { v: r.tired.V, txt: "worn battery " + vTxt(r.tired.V), color: c.mute }
  ].filter(function (m) { return r.I > 0 || m.txt.indexOf("at rest") > 0; });
  marks.forEach(function (m) { m.w = g.textWidth(m.txt, { size: 11, weight: 600 }); m.x = F.clamp(GX(m.v) - m.w / 2, 8, W - m.w - 10); });
  marks.sort(function (a, b) { return a.x - b.x; });
  var ends = [];
  marks.forEach(function (m) { var k = 0; while (k < ends.length && m.x < ends[k] + 8) k++; m.row = k; ends[k] = m.x + m.w; });
  var markRows = Math.max(1, ends.length);
  marks.forEach(function (m) { var x = GX(m.v), ty = gy - 10 - m.row * 13; g.line(x, ty + 3, x, gy + gh + 3, { color: m.color, width: 1.5 }); g.text(m.txt, m.x + m.w / 2, ty, { size: 11, weight: 600, color: m.color, align: "center" }); });

  // The magnified strip: its own scale every half volt, brown-out under it, now and the margin over it.
  bar(zy, zh, ZX, z0);
  var bxz = ZX(s.brown), bTxt = "brown-out " + K.fix(s.brown, 1) + " V", bw6 = g.textWidth(bTxt, { size: 11, weight: 700 }), bl = F.clamp(bxz - bw6 / 2, 4, W - bw6 - 4);
  for (var zv = Math.ceil(z0 * 2) / 2; zv <= z1 + 1e-9; zv += 0.5) { g.line(ZX(zv), zy + zh, ZX(zv), zy + zh + 4, { color: c.mute, width: 1 }); g.text(K.fix(zv, 1), ZX(zv), zy + zh + 15, { size: 11, color: c.mute, align: "center" }); }
  g.line(bxz, zy + zh + 3, bxz, zy + zh + 18, { color: c.bad, width: 1.5, dash: [3, 2] });
  g.text(bTxt, bl + bw6 / 2, zy + zh + 30, { size: 11, weight: 700, color: c.bad, align: "center" });
  g.text("magnified", gx0 + 2, zy - 14, { size: 10, color: c.mute });
  if (r.I > 0) {
    var nx = ZX(r.V), short = r.V < s.brown, my = zy - 16;
    g.poly([[nx, zy - 1], [nx - 5, zy - 8], [nx + 5, zy - 8]], { fill: col, stroke: null });
    var nTxt = "now " + vTxt(r.V), nw = g.textWidth(nTxt, { size: 11, weight: 700 });
    g.text(nTxt, F.clamp(nx, nw / 2 + 4, W - nw / 2 - 60), zy - 29, { size: 11, weight: 700, color: col, align: "center" });
    // The margin: the largest words on the gauge, on a bracket from brown-out to now.
    var ml = Math.min(nx, bxz), mr = Math.max(nx, bxz), mcol = short ? c.bad : r.margin < 1 ? c.warn : c.ok;
    var mTxt = K.fix(Math.abs(r.V - s.brown), 1) + " V " + (short ? "short" : "to spare"), mw = g.textWidth(mTxt, { size: 15, weight: 700 });
    g.line(ml, my, mr, my, { color: mcol, width: 2.5, cap: "butt" }); g.line(ml, my - 5, ml, my + 5, { color: mcol, width: 2, cap: "butt" }); g.line(mr, my - 5, mr, my + 5, { color: mcol, width: 2, cap: "butt" });
    var mx = mr + 12 + mw < W - 8 ? mr + 12 : ml - 12 - mw;
    g.text(mTxt, mx, my - 1, { size: 15, weight: 700, color: mcol, base: "middle" });
  }

  // The one-line diagram above the gauge.
  var top = 34, bot = gy - 22 - markRows * 13, mid = (top + bot) / 2;
  if (!n) { g.text("Add a row to see where the current goes.", 16, mid, { color: c.mute }); return; }
  var kA = 22 / Math.max(r.I, 150), thick = function (I) { return F.clamp(I * kA, 1.5, 24); };
  var bw = phone ? 36 : 46, bh = phone ? 52 : 64, bx = 14, by = mid - bh / 2;
  // Battery.
  g.rect(bx + bw * 0.18, by - 6, bw * 0.2, 6, { fill: c.text2, stroke: null }); g.rect(bx + bw * 0.62, by - 6, bw * 0.2, 6, { fill: c.text2, stroke: null });
  g.rect(bx, by, bw, bh, { fill: c.part, stroke: c.partLine, width: 1.5, radius: 4 });
  g.text("+", bx + bw * 0.28, by + 14, { size: 12, weight: 700, color: c.text, align: "center", halo: false });
  g.text("−", bx + bw * 0.72, by + 14, { size: 12, weight: 700, color: c.text, align: "center", halo: false });
  g.text("Battery", bx + bw / 2, by + bh + 14, { size: 11, weight: 700, align: "center" });
  var over = r.V < 0 ? s.rest / (r.dropBat + r.dropWire) : 1;     // past 0 V the battery cannot push more: share out what it has
  g.text("−" + K.fix(r.dropBat * over, 1) + " V inside", Math.max(bx + bw / 2, 4 + g.textWidth("−" + K.fix(r.dropBat * over, 1) + " V inside", { size: 11, weight: 600 }) / 2), by + bh + (phone ? 44 : 28), { size: 11, weight: 600, color: c.force, align: "center" });
  // Main wire, main breaker, distribution.
  var labW = phone ? 104 : 150, busX = phone ? bx + bw + 100 : bx + bw + 160, endX = W - labW - 10, brX = (bx + bw + busX) / 2;
  g.line(bx + bw, mid, busX, mid, { color: c.text2, width: thick(r.I), cap: "butt" });
  var mc = r.share >= 2 ? c.bad : r.share > 1 ? c.warn : c.text2;
  g.rect(brX - 11, mid - 11, 22, 22, { fill: c.sheet, stroke: mc, width: 2, radius: 3 });
  g.line(brX - 6, mid + 5, brX + 6, mid - 5, { color: mc, width: 2 });
  // The breaker's name and load under it; the wiring's drop above the wire; the battery's own under the battery.
  g.text("Main " + K.n(s.main, 0) + " A", brX, mid + 27, { size: 11, weight: 700, align: "center" });
  g.text(K.n(r.share * 100, 0) + (phone ? "%" : "% of its rating"), brX, mid + 41, { size: 11, weight: 700, color: mc, align: "center" });
  if (phone) g.text("of its rating", brX, mid + 55, { size: 11, weight: 700, color: mc, align: "center" });
  g.text("−" + K.fix(r.dropWire * over, 1) + (phone ? " V wiring" : " V in wiring"), (bx + bw + busX) / 2, mid - thick(r.I) / 2 - 8, { size: 11, weight: 600, color: c.force, align: "center" });
  // One branch per row, as thick as its current.
  var gap = (bot - top) / n, y0 = top + gap / 2;
  g.line(busX, Math.min(mid, y0) - 4, busX, Math.max(mid, y0 + gap * (n - 1)) + 4, { color: c.text, width: 5, cap: "butt" });
  var named = false;
  rows.forEach(function (q, i) {
    var y = y0 + gap * i, hot = i === r.worst && r.state !== "ok", lc = hot ? c.force : c.s1, sx = busX + 16;
    g.line(busX, y, endX, y, { color: lc, width: thick(q.I), cap: "butt" });
    var b = q.a / M.BRANCH, bc = b > 2 ? c.bad : b > 1 ? c.warn : c.text2, agg = M.isAggregate(q);
    if (!agg) g.rect(sx, y - 7, 14, 14, { fill: c.sheet, stroke: bc, width: 1.5, radius: 2 });
    // Name the small boxes once, under the first branch that has one, between it and the next line.
    if (!agg && !named) { named = true; g.text(phone ? "40 A breaker each" : "40 A branch breaker (one per motor)", sx - 2, y + Math.max(thick(q.I) / 2, 7) + 13, { size: 11, weight: 600, color: c.text2 }); }
    var one = gap < 30, full = q.name || "Row " + (i + 1), amps = (one || M.isAggregate(q) ? "" : q.n + " × " + K.n(q.a, 0) + " A = ") + K.n(q.I, 0) + " A", tag = hot ? ", largest draw" : "";
    if (one) { g.text(fit(g, full, labW - 50, 11) + "  " + amps, endX + 8, y, { size: 11, weight: 600, base: "middle", color: hot ? c.force : c.text }); return; }
    // A long name wraps onto a second line rather than being cut off; only a name too long for two lines is shortened.
    // On a phone "largest draw" takes its own line rather than leaving one word alone.
    var lines = phone && hot ? [fit(g, full, labW, 12), "largest draw"] : wrap(g, full + tag, labW, 12), lh = 14, y1 = y - 3 - (lines.length - 1) * lh / 2;
    lines.forEach(function (ln, k) { g.text(ln, endX + 8, y1 + k * lh, { size: 12, weight: 700, color: hot ? c.force : c.text }); });
    g.text(amps, endX + 8, y1 + (lines.length - 1) * lh + 14, { size: 11, weight: 600, color: c.text2 });
  });
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
