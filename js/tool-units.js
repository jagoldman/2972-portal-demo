/* Tools: Unit conversion (#tool-units). Converts one number into the other units of its kind at once, or into one
   unit asked for, with a row of common conversions. The code constants that used to share this page are their own
   tool now (#tool-code). The maths (M) runs in Node for tests/tool-units.test.js. Every factor is exact or from exact
   definitions. */
(function (root) {
"use strict";
var M = {};
var LBF = 4.4482216152605, IN = 0.0254, FT = 0.3048, LB = 0.45359237;
// Each kind: [unit id, label, size of one unit in the base unit]. Base units: m, kg, N, N m, m/s, rad/s, kg m^2, Pa.
M.KINDS = [
  { id: "length", name: "Length", units: [["in", "in", IN, "Inches"], ["ft", "ft", FT, "Feet"], ["mm", "mm", 0.001, "Millimetres"], ["m", "m", 1, "Metres"]] },
  { id: "mass", name: "Mass", units: [["lb", "lb", LB, "Pounds"], ["oz", "oz", LB / 16, "Ounces"], ["kg", "kg", 1, "Kilograms"], ["g", "g", 0.001, "Grams"]] },
  { id: "force", name: "Force", units: [["lbf", "lbf", LBF, "Pounds of force"], ["N", "N", 1, "Newtons"]] },
  { id: "torque", name: "Torque", units: [["Nm", "N m", 1, "Newton metres"], ["lbin", "lb in", LBF * IN, "Pound inches"], ["lbft", "lb ft", LBF * FT, "Pound feet"], ["ozin", "oz in", LBF / 16 * IN, "Ounce inches"]] },
  { id: "speed", name: "Speed", units: [["fps", "ft/s", FT, "Feet a second"], ["mps", "m/s", 1, "Metres a second"], ["mph", "mph", 1609.344 / 3600, "Miles an hour"]] },
  { id: "turn", name: "Turning speed", units: [["rpm", "rpm", 2 * Math.PI / 60, "Turns a minute"], ["rads", "rad/s", 1, "Radians a second"], ["degs", "deg/s", Math.PI / 180, "Degrees a second"], ["rps", "rotations/s", 2 * Math.PI, "Turns a second"]] },
  { id: "moi", name: "Moment of inertia", units: [["lbin2", "lb in²", LB * IN * IN, "Pound square inches"], ["kgm2", "kg m²", 1, "Kilogram square metres"]] },
  { id: "pressure", name: "Pressure", units: [["psi", "psi", LBF / (IN * IN), "Pounds a square inch"], ["kPa", "kPa", 1000, "Kilopascals"], ["bar", "bar", 100000, "Bar"]] }
];
M.kind = function (id) { return M.KINDS.filter(function (k) { return k.id === id; })[0] || M.KINDS[0]; };
// x in unit `from` of kind -> { unitId: value } for every unit of the kind.
M.convert = function (kindId, x, from) {
  var k = M.kind(kindId), f = k.units.filter(function (u) { return u[0] === from; })[0] || k.units[0], base = x * f[2], out = {};
  k.units.forEach(function (u) { out[u[0]] = base / u[2]; });
  return out;
};
if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- Page ---------- */
var K = D.calc, esc = D.esc, ID = "tool-units";
// Five significant figures at most, commas in big numbers, e-notation for the very large and small.
function sig(x) {
  if (!isFinite(x)) return "–"; if (x === 0) return "0";
  var a = Math.abs(x); if (a >= 1e9 || a < 1e-4) return x.toExponential(4).replace(/\.?0+e/, "e").replace("e+", "e");
  var dp = Math.max(0, 4 - Math.floor(Math.log10(a)));
  return x.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: Math.min(dp, 9) });
}
function unitOf(s) { var k = M.kind(s.kind); return k.units.filter(function (u) { return u[0] === s.unit; })[0] || k.units[0]; }
// The common conversions under the converter: [kind, from, to, label].
var QUICK = [["length", "in", "mm", "in to mm"], ["force", "lbf", "N", "lbf to N"], ["torque", "lbin", "Nm", "lb in to N m"], ["speed", "fps", "mps", "ft/s to m/s"]];
D.acts.unitsquick = function (b) { var q = b.dataset.v.split(","), s = K.state(ID); s.kind = q[0]; s.unit = q[1]; s.to = q[2]; D.render(); };
function toOf(s) { var k = M.kind(s.kind); return s.to && s.to !== "all" && s.to !== s.unit && k.units.some(function (u) { return u[0] === s.to; }) ? s.to : null; }

K.tool({
  id: ID,
  saves: false,   // a converter: nothing worth keeping under a name
  defaults: { x: 1, kind: "length", unit: "in", to: "all" },
  stage: null,
  onPick: function (key, v, s) { if (key === "kind") { s.unit = M.kind(v).units[0][0]; s.to = "all"; } if (key === "unit" && s.to === v) s.to = "all"; },

  compute: function (s) { return { k: M.kind(s.kind), conv: M.convert(s.kind, s.x, s.unit) }; },

  // The four inputs, one width, in a column of their own.
  controls: function (s) {
    var k = M.kind(s.kind), from = unitOf(s), others = k.units.filter(function (u) { return u[0] !== from[0]; });
    return K.group(ID, "conv", "Convert",
      K.pick(ID, "kind", "Kind", M.KINDS.map(function (q) { return [q.id, q.name]; })) +
      K.num(ID, "x", "Number", { step: "any" }) +
      K.pick(ID, "unit", "From", k.units.map(function (u) { return [u[0], u[1] + " (" + u[3].toLowerCase() + ")"]; })) +
      K.pick(ID, "to", "To", [["all", others.map(function (u) { return u[1]; }).join(", ").replace(/, ([^,]*)$/, others.length > 2 ? ", and $1" : " and $1")]].concat(others.map(function (u) { return [u[0], u[1] + " (" + u[3].toLowerCase() + ")"]; }))));
  },

  /* The answer: with a "To" unit chosen, that one figure large and the other units in a short table under it; with all
     of them, each large on its own line. Then the common conversions, each a button that sets the converter. */
  outs: function (s, r) {
    var from = unitOf(s), others = r.k.units.filter(function (u) { return u[0] !== from[0]; }), to = toOf(s), one = to ? others.filter(function (u) { return u[0] === to; })[0] : null;
    function v(u) { return esc(sig(r.conv[u[0]])); }
    var ans = '<div class="t-units-conv" aria-live="polite"><h2 class="t-units-eq">' + esc(sig(s.x) + " " + from[1]) + " equals</h2>" +
      (one ? '<p class="t-units-one"><b class="num">' + v(one) + "</b> " + esc(one[1]) + "<span>" + esc(one[3]) + "</span></p>" +
        (others.length > 1 ? '<table class="t-units-rest"><caption>In the other units</caption><tbody>' + others.filter(function (u) { return u !== one; }).map(function (u) { return '<tr><td class="num"><b>' + v(u) + "</b> " + esc(u[1]) + "</td><td>" + esc(u[3]) + "</td></tr>"; }).join("") + "</tbody></table>" : "")
        : "<dl>" + others.map(function (u) { return "<div><dd><b class=\"num\">" + v(u) + "</b> " + esc(u[1]) + "</dd><dt>" + esc(u[3]) + "</dt></div>"; }).join("") + "</dl>") + "</div>";
    return ans + '<div class="t-units-quick" role="group" aria-label="Common conversions"><span>Common conversions</span>' + QUICK.map(function (q) { var on = s.kind === q[0] && s.unit === q[1] && s.to === q[2]; return '<button class="btn sm' + (on ? " on" : "") + '" data-act="unitsquick" data-v="' + q.join(",") + '" aria-pressed="' + on + '">' + esc(q[3]) + "</button>"; }).join("") + "</div>";
  },

  more: function () {
    return K.notes("<p>Conversions use exact definitions: 1 in = 25.4 mm, 1 lb = 0.45359237 kg, 1 lbf = 4.4482216152605 N (a pound of mass under standard gravity), 1 mile = 1609.344 m. Pressure units are gauge or absolute alike; this page does not add atmospheric pressure.</p>" +
      "<p>The answers show five significant figures. For the conversion factors robot code needs from a gearbox and a wheel or spool, see Code constants.</p>");
  }
});
// On a phone the inputs come first, then the answer.
D.after.push(function () { if (D.S.route !== ID) return; var b = document.querySelector('.bench[data-calc="' + ID + '"]'); if (b) b.classList.add("t-units-bench"); });
(function () {
  var st = document.createElement("style");
  // The four inputs at one width, under one label column.
  st.textContent = ".bench[data-calc=\"tool-units\"] .benchside .cf { grid-template-columns: 76px minmax(0, 1fr); } .bench[data-calc=\"tool-units\"] .benchside .cfv, .bench[data-calc=\"tool-units\"] .benchside .cfv.wide { display: flex; width: 100%; } .bench[data-calc=\"tool-units\"] .benchside .cfv .inp { width: 100%; text-align: left; }" +
    ".t-units-conv { display: grid; gap: 6px; align-content: start; } .t-units-eq { font-size: 1rem; margin: 0; }" +
    ".t-units-one { margin: 2px 0 6px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 1.1rem; color: var(--text-2); } .t-units-one b { font-size: 2.6rem; color: var(--text); line-height: 1.1; } .t-units-one span { flex-basis: 100%; font-size: .85rem; color: var(--mute); }" +
    ".t-units-rest { border-collapse: collapse; width: 100%; max-width: 560px; font-size: .95rem; } .t-units-rest caption { text-align: left; font-size: .82rem; font-weight: 600; color: var(--mute); padding-bottom: 2px; } .t-units-rest td { padding: 6px 0; border-top: 1px solid var(--line); color: var(--text-2); } .t-units-rest td + td { text-align: right; color: var(--mute); font-size: .85rem; } .t-units-rest b { color: var(--text); }" +
    ".t-units-conv dl { display: grid; gap: 0; margin: 0; max-width: 560px; } .t-units-conv dl > div { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line); }" +
    ".t-units-conv dt { color: var(--mute); font-size: .85rem; text-align: right; } .t-units-conv dd { margin: 0; color: var(--text-2); font-size: 1rem; } .t-units-conv dd b { color: var(--text); font-size: 1.6rem; }" +
    ".t-units-quick { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--line); } .t-units-quick span { font-size: .85rem; font-weight: 600; color: var(--text-2); margin-right: 4px; } .t-units-quick .btn { min-height: 40px; } .t-units-quick .btn.on { border-color: var(--accent); color: var(--accent); }" +
    "@media (max-width: 900px) { .t-units-bench.content.bench.nostage { grid-template-areas: \"side\" \"outs\" \"more\"; } .t-units-quick .btn { min-height: 44px; } }";
  document.head.appendChild(st);
})();
})(typeof window !== "undefined" ? window : this);
