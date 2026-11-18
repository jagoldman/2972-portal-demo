/* Tools: Motors (#tool-motors). Up to three motors side by side under one battery voltage and one current limit:
   torque, current, power and efficiency against speed, and where each one's peak power is. No drawing. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");

/* ---------- Maths (no page code; tests/tool-motors.test.js runs it in Node) ---------- */
var M = {};
/* One motor at battery voltage V with a stator limit L (A, 0 = none), at motor speed w (rad/s).
   Returns { torque (N m), statorA, supplyA, power (W out), eff (0..1) }. */
M.at = function (id, V, L, w) {
  var q = F.drive({ motor: id, n: 1, ratio: 1, eff: 1, statorA: L }).at(w, V, 1), P = q.torque * w, Pin = V * q.supplyA;
  return { torque: q.torque, statorA: q.statorA, supplyA: q.supplyA, power: P, eff: Pin > 0 && P > 0 ? P / Pin : 0 };
};
/* Peak mechanical power of one motor, worked out exactly. Without a limit, power T w is largest at
   w* = (V - I_free R) / (2 ke). A stator limit L holds torque flat up to the knee, w_k = (V - L R) / ke, where the
   natural line takes over. If the knee comes before w*, the peak is still w*; if after, power rises all the way
   to the knee and the peak is there. Returns { w (rad/s), rpm, power (W), torque (N m), knee (rad/s or null) }. */
M.peak = function (id, V, L) {
  var m = F.motor(id), ws = (V - m.freeA * m.R) / (2 * m.ke), knee = L > 0 && L < V / m.R ? (V - L * m.R) / m.ke : null;
  var w = knee != null && knee > ws ? knee : ws, T = M.at(id, V, L, w).torque;
  return { w: w, rpm: w / F.RPM, power: T * w, torque: T, knee: knee };
};
M.free = function (id, V) { return F.motor(id).freeRpm * V / 12; };      // rpm with no load

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The calculator ---------- */
var K = D.calc, ID = "tool-motors";
var LIST = F.MOTORS.map(function (m) { return [m.id, m.name]; });

function slots(s) {
  return [[s.m1, s.n1], [s.m2, s.n2], [s.m3, s.n3]].map(function (q, i) { return { i: i, id: q[0], n: Math.max(1, Math.round(q[1]) || 1) }; })
    .filter(function (q) { return q.id !== "none" && F.MOTORS.some(function (m) { return m.id === q.id; }); });
}
function nameOf(q) { return (q.n > 1 ? q.n + " × " : "") + F.motor(q.id).name; }

K.tool({
  id: ID,
  defaults: { m1: "kraken60", n1: 1, m2: "vortex", n2: 1, m3: "kraken44", n3: 1, volts: 12, statorA: 60 },
  stage: null,

  compute: function (s) {
    var V = s.volts, L = s.statorA, list = slots(s);
    list.forEach(function (q) {
      var m = F.motor(q.id), wf = M.free(q.id, V) * F.RPM, N = 150;
      q.m = m; q.name = nameOf(q); q.peak = M.peak(q.id, V, L); q.free = wf / F.RPM;
      q.stallT = m.stall * V / 12; q.stallA = V / m.R;
      q.limT = M.at(q.id, V, L, 0).torque;
      q.tq = []; q.amp = []; q.pw = []; q.eff = [];
      for (var k = 0; k <= N; k++) {
        var w = wf * k / N, a = M.at(q.id, V, L, w), rpm = w / F.RPM;
        q.tq.push([rpm, a.torque * q.n]); q.amp.push([rpm, a.supplyA]); q.pw.push([rpm, a.power * q.n]); q.eff.push([rpm, a.eff * 100]);
      }
      // The most efficient point, for the table and the chart.
      var best = q.eff.reduce(function (b, p) { return p[1] > b[1] ? p : b; }, [0, 0]); q.bestEff = best;
    });
    return { list: list };
  },

  controls: function (s) {
    var none = [["none", "None"]].concat(LIST);
    return K.group(ID, "motors", "Motors to compare",
        K.pick(ID, "m1", "First", LIST) + K.num(ID, "n1", "How many", { min: 1, max: 8, step: 1 }) +
        K.pick(ID, "m2", "Second", LIST) + K.num(ID, "n2", "How many", { min: 1, max: 8, step: 1 }) +
        K.pick(ID, "m3", "Third", none) + (s.m3 !== "none" ? K.num(ID, "n3", "How many", { min: 1, max: 8, step: 1 }) : "")) +
      K.group(ID, "power", "Battery and limit",
        K.num(ID, "statorA", "Current limit", { unit: "A", min: 0, max: 200, step: 1, slider: true, tip: "The stator limit set in the motor controller, for each motor. 0 means no limit. 40 to 80 A is usual on a mechanism." }) +
        K.num(ID, "volts", "Battery", { unit: "V", min: 6, max: 13, step: 0.1, slider: true, tip: "Voltage at the motor under load. A full battery reads about 12.5 V at rest and sags under load." }));
  },

  outs: function (s, r) {
    var L = r.list; if (!L.length) return K.verdict("info", "Pick at least one motor.");
    var lim = s.statorA > 0 ? "under a " + s.statorA + " A limit" : "with no current limit";
    var by = L.slice().sort(function (a, b) { return b.peak.power * b.n - a.peak.power * a.n; }), top = by[0], next = by[1];
    var text = top.name + " gives the most power " + lim + ": " + K.n(top.peak.power * top.n, 0) + " W at " + K.n(top.peak.rpm, 0) + " rpm";
    if (next) { var more = top.peak.power * top.n / (next.peak.power * next.n) - 1; text += more < 0.005 ? ", the same as " + next.name + "." : ", " + K.n(more * 100, 0) + "% more than " + next.name + "."; }
    else text += ".";
    var perLb = L.slice().sort(function (a, b) { return b.peak.power / b.m.lb - a.peak.power / a.m.lb; })[0];
    if (L.length > 1 && perLb !== top) text += " Per pound, " + perLb.m.name + " leads.";
    return K.verdict("info", text) +
      K.outs(L.map(function (q) { return { k: q.name, v: K.n(q.peak.power * q.n, 0), u: "W", sub: "peak at " + K.n(q.peak.rpm, 0) + " rpm", tip: "The most mechanical power " + (q.n > 1 ? "these motors give" : "this motor gives") + " " + lim + " at " + K.fix(s.volts, 1) + " V." }; })) +
      K.outs(L.map(function (q) { var T = q.limT * q.n; return { k: "Torque, " + (q.n > 1 ? q.n + " × " : "") + q.m.name, v: K.n(T, 2), u: "N m", sub: K.n(T / (F.LBF * F.IN), 1) + " lb in from a standstill" }; }));
  },

  more: function (s, r) {
    var L = r.list; if (!L.length) return "";
    var xmax = Math.max.apply(null, L.map(function (q) { return q.free; }));
    var X = { label: "speed (rpm)", name: "Speed", unit: "rpm", min: 0, max: xmax };
    function ser(key) { return L.map(function (q) { return { name: q.name, pts: q[key], color: q.i + 1 }; }); }
    var limLine = s.statorA > 0 ? [{ y: s.statorA, label: "Stator limit " + s.statorA + " A" }] : [];
    var out = '<div class="chartrow">' +
      K.chart({ id: "motors-tq", title: "Torque", x: X, y: { label: "torque (N m)", unit: "N m", min: 0 }, series: ser("tq") }) +
      K.chart({ id: "motors-amp", title: "Current from the battery, each motor", x: X, y: { label: "supply current (A)", unit: "A", min: 0 }, series: ser("amp"), hlines: limLine }) + "</div>" +
      '<div class="chartrow">' +
      K.chart({ id: "motors-pw", title: "Power out", x: X, y: { label: "power (W)", unit: "W", min: 0 }, series: ser("pw"), dots: L.map(function (q) { return { x: q.peak.rpm, y: q.peak.power * q.n }; }) }) +
      K.chart({ id: "motors-eff", title: "Efficiency", x: X, y: { label: "efficiency (%)", unit: "%", min: 0, max: 100 }, series: ser("eff") }) + "</div>";
    var rowsT = [
      ["Free speed", function (q) { return K.n(q.free, 0) + " rpm"; }],
      ["Stall torque, no limit", function (q) { return K.n(q.stallT * q.n, 2) + " N m"; }],
      ["Stall current, each", function (q) { return K.n(q.stallA, 0) + " A"; }],
      ["Torque from a standstill", function (q) { return K.n(q.limT * q.n, 2) + " N m"; }],
      ["Peak power", function (q) { return K.n(q.peak.power * q.n, 0) + " W at " + K.n(q.peak.rpm, 0) + " rpm"; }],
      ["Best efficiency", function (q) { return K.n(q.bestEff[1], 0) + "% at " + K.n(q.bestEff[0], 0) + " rpm"; }],
      ["Weight", function (q) { return K.n(q.m.lb * q.n, 2) + " lb"; }],
      ["Peak power per pound", function (q) { return K.n(q.peak.power / q.m.lb, 0) + " W/lb"; }]];
    out += '<section class="ctab"><h2>Side by side at ' + K.fix(s.volts, 1) + " V" + (s.statorA > 0 ? ", " + s.statorA + " A limit" : ", no limit") + '</h2><div class="scroll"><table><thead><tr><th></th>' + L.map(function (q) { return '<th class="r">' + D.esc(q.name) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rowsT.map(function (row) { return "<tr><td>" + row[0] + "</td>" + L.map(function (q) { return '<td class="r num">' + row[1](q) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" +
      '<p class="mute small">Stall torque and stall current are with no limit, scaled to this voltage. Torque, power and weight are for all the motors in a row together; current is for each one.</p></section>';
    out += K.notes("<p>A DC motor's torque falls in a straight line from stall to free speed, and the current it draws falls with it. Power out is torque times speed, so without a limit it peaks at half the free speed. Each motor here is worked out from four figures: free speed, stall torque, stall current and free current at 12 V.</p>" +
      '<p class="eq">current = (volts − speed × kₑ) ÷ R,  torque = kₜ × (current − free current)</p>' +
      '<p class="eq">power = torque × speed,  efficiency = power ÷ (battery volts × battery current)</p>' +
      "<p>A stator limit caps the current in the motor's windings. Below the knee, where the motor would draw more than the limit, torque is held flat; above it, the motor runs on its natural line. Peak power moves to the knee when the knee is past half the free speed, which is why a tighter limit lowers the peak and moves it to a higher speed.</p>" +
      "<p>The current from the battery is lower than the stator current at low speed, because the controller turns the battery's voltage down. With a limit, the battery current curve therefore starts low, rises to the knee and then falls. Power in is battery volts times battery current, and the windings lose current² × R as heat.</p>" +
      "<p>Figures are the makers' test data as listed on ReCalc's motor page (reca.lc/motors), read 2026-11-17, kept in <code>js/frc.js</code>. The model leaves out heating (a hot motor is weaker), friction that changes with speed, and the controller's own losses. It is a guide for choosing, not a dyno.</p>");
    return out;
  }
});
})(typeof window !== "undefined" ? window : this);
