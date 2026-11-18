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
/* The stage: one motor's torque against speed, annotated. t (0..4 s) sweeps a dot from standstill to free speed. */
function drawCurve(g, s, r, t) {
  var c = g.c, q = r.list[0]; if (!q) { g.text("Pick a motor.", 16, 28, { color: c.mute }); return; }
  var mc = c["s" + (q.i + 1)] || c.s1;     // the motor's own colour, as in the charts below
  var phone = g.w < 520, V = s.volts, L = s.statorA, n = q.n, free = Math.max.apply(null, r.list.map(function (o) { return o.free; })), wf = q.free * F.RPM;
  var Tlim = q.limT * n, Tst = q.stallT * n, limited = L > 0 && Tst > Tlim * 1.001, others = r.list.slice(1);
  var tops = r.list.map(function (o) { return o.limT * o.n; }), ymax = limited ? Math.max(Math.min(Tst, Tlim * 1.75), Math.max.apply(null, tops) * 1.3) * 1.08 : Math.max(Tst, Math.max.apply(null, r.list.map(function (o) { return o.stallT * o.n; }))) * 1.1;
  var pl = phone ? 40 : 54, pr = phone ? 16 : 24, pt = phone && r.list.length > 1 ? 90 : 72, pb = 34, x0 = pl, x1 = g.w - pr, y0 = g.h - pb, y1 = pt;
  function X(rpm) { return x0 + (x1 - x0) * rpm / free; } function Y(T) { return y0 - (y0 - y1) * Math.min(T, ymax) / ymax; }
  // Grid and axes.
  var step = ymax > 6 ? 2 : ymax > 3 ? 1 : ymax > 1.2 ? 0.5 : 0.2;
  for (var v = 0; v <= ymax + 1e-9; v += step) { g.line(x0, Y(v), x1, Y(v), { color: c.sheetLine, width: 1, cap: "butt" }); g.text(K.fix(v, step < 1 ? 1 : 0), x0 - 6, Y(v), { align: "right", base: "middle", size: 10, color: c.mute }); }
  var rs = free > 8000 ? 2000 : 1000;
  for (var x = 0; x <= free; x += rs) { g.line(X(x), y0, X(x), y0 + 4, { color: c.mute, width: 1 }); if (x1 - X(x) > 72) g.text(K.n(x, 0), X(x), y0 + 16, { align: "center", size: 10, color: c.mute }); }
  g.line(x0, y0, x1, y0, { color: c.text2, width: 1.5 }); g.line(x0, y0, x0, y1 - 6, { color: c.text2, width: 1.5 });
  g.text("torque (N m)", x0 - (phone ? 34 : 46), y1 - 14, { size: 11, color: c.mute });
  g.text("speed (rpm)", x1, y0 + 30, { align: "right", size: 11, color: c.mute });
  // The power hump, shaded under the axis at its own scale (its peak reaches 60% of the height).
  var N = 120, pts = [], Pk = q.peak.power * n, hump = [[X(0), y0]];
  for (var i = 0; i <= N; i++) { var w = wf * i / N, a = M.at(q.id, V, L, w); pts.push([X(w / F.RPM), Y(a.torque * n)]); hump.push([X(w / F.RPM), y0 - (y0 - y1) * 0.6 * Math.max(0, a.power * n) / Pk]); }
  hump.push([X(q.free), y0]);
  g.ctx.globalAlpha = 0.12; g.poly(hump, { fill: mc, stroke: null, close: true }); g.ctx.globalAlpha = 1;
  // Named inside the shaded hump, low down where no line runs; its peak marked with its value.
  if (phone) { g.text("shaded: power, own scale:", x0 + 8, y0 - 26, { size: 11, weight: 700, color: c.text2 }); g.text("read only its shape and peak", x0 + 8, y0 - 12, { size: 11, weight: 700, color: c.text2 }); }
  else g.text("shaded: power, drawn to its own scale: read only its shape and peak", x0 + 8, y0 - 12, { size: 11, weight: 700, color: c.text2 });
  var hpx = X(q.peak.rpm), hpy = y0 - (y0 - y1) * 0.6;
  g.circle(hpx, hpy, 4, { fill: mc, stroke: c.sheet, width: 1.5 });
  // End the label left of the dashed no-limit line where it crosses the label's height.
  var pend = hpx - 9;
  if (limited) { var lyT = (y0 - (hpy - 13)) / (y0 - y1) * ymax, lx = X(q.free * (1 - lyT / Tst)); pend = Math.min(pend, lx - 16); }
  g.text("power peak " + K.n(Pk, 0) + " W", pend, hpy - 9, { align: "right", size: 11, weight: 700, color: mc });
  // With no limit: the straight line from stall torque, dashed, cut where it leaves the top.
  if (limited) {
    var xs = q.free * (1 - ymax / Tst);
    g.line(X(Math.max(0, xs)), Y(ymax), X(q.free), Y(0), { color: c.mute, width: 1.5, dash: [5, 4] });
    g.text(phone ? "no limit: " + K.fix(Tst, 2) + " N m at standstill" : "with no limit: " + K.fix(Tst, 2) + " N m at standstill, off the top", X(Math.max(0, xs)) - 8, Y(ymax) + 2, { align: "right", size: 11, color: c.mute, base: "top" });
  }
  // The other motors: thin lines in their own colours, each named where it falls, right of the line.
  var nameYs = [], nameX = 0, lines = others.map(function (o) {
    var op = [], ow = o.free * F.RPM; for (var j = 0; j <= N; j++) { var w2 = ow * j / N; op.push([X(w2 / F.RPM), Y(M.at(o.id, V, L, w2).torque * o.n)]); }
    return op;
  });
  // A line whose flat part lies within 3 px of a later one is hidden under it: draw it again dashed on top.
  var hid = others.map(function (o, k) { return others.some(function (p2, j) { return j > k && Math.abs(Y(o.limT * o.n) - Y(p2.limT * p2.n)) < 3; }); });
  others.forEach(function (o, k) { g.path(lines[k], { color: c["s" + (o.i + 1)] || c.s2, width: 1.75 }); });
  others.forEach(function (o, k) { if (hid[k]) g.path(lines[k], { color: c["s" + (o.i + 1)] || c.s2, width: 1.75, dash: [6, 5] }); });
  // Where two lines overlap, one label names both ("Vortex (CTRE) dashed and X44 overlap"); the partner gets none.
  var partner = others.map(function (o, k) { if (!hid[k]) return -1; for (var j = k + 1; j < others.length; j++) if (Math.abs(Y(o.limT * o.n) - Y(others[j].limT * others[j].n)) < 3) return j; return -1; });
  var named = {};
  others.forEach(function (o, k) {
    if (named[k]) return;
    var oc = c["s" + (o.i + 1)] || c.s2, Tm = o.limT * o.n;
    if (partner[k] >= 0) {
      var p2 = others[partner[k]], pc = c["s" + (p2.i + 1)] || c.s2; named[partner[k]] = true;
      var t1 = shortOf(o) + " dashed", t2 = " and ", t3 = shortOf(p2), t4 = " overlap", yy = phone ? 58 : Y(Tm) + 14, xx = phone ? 12 + nameX : x0 + 10 + nameX;
      [[t1, oc], [t2, c.text2], [t3, pc], [t4, c.text2]].forEach(function (q) { g.text(q[0], xx, yy, { base: phone ? "alphabetic" : "middle", size: 11, weight: 700, color: q[1] }); xx += g.textWidth(q[0], { size: 11, weight: 700 }); });
      nameX = xx - (phone ? 12 : x0 + 10) + 14; nameYs.push(yy);
      return;
    }
    // Named on its flat part near the left: above the line where nothing else is within a label's height, else below.
    var on = shortOf(o) + (hid[k] ? ", dashed (overlaps)" : ""), oy = Y(Tm), flats = r.list.filter(function (p2) { return p2 !== o; }).map(function (p2) { return Y(p2.limT * p2.n); });
    var above = !flats.some(function (fy) { return fy < oy && fy > oy - 18; }) && !nameYs.some(function (ny) { return Math.abs(ny - (oy - 8)) < 14; });
    var ny2 = above ? oy - 8 : oy + 14; nameYs.push(ny2);
    // Phone: the names go in a key line under the read-out, where nothing else is.
    if (phone) { g.text(shortOf(o) + (hid[k] ? ", dashed" : ""), 12 + nameX, 58, { size: 11, weight: 700, color: oc }); nameX += g.textWidth(shortOf(o) + (hid[k] ? ", dashed" : ""), { size: 11, weight: 700 }) + 14; return; }
    g.text(on, x0 + 10 + nameX, ny2, { base: "middle", size: 11, weight: 700, color: oc }); nameX += g.textWidth(on, { size: 11, weight: 700 }) + 14;
  });
  // The first motor's line, with the limit.
  g.path(pts, { color: mc, width: 3 });
  if (limited) {
    var kr = q.peak.knee / F.RPM, kx = X(kr), ky = Y(Tlim);
    g.text("the current limit holds torque here", x0 + (kx - x0) * 0.4, ky - 9, { align: "center", size: 11, weight: 700, color: mc });
    g.line(kx, ky, kx, y0, { color: c.mute, width: 1, dash: [3, 3] });
    g.circle(kx, ky, 5, { fill: c.sheet, stroke: mc, width: 2.5 });
    // The knee's words in two lines, left of its drop line and well below the flat part.
    var k1 = "knee, " + K.n(kr, 0) + " rpm", k2 = "above this the limit no longer matters", kb = ky;
    others.forEach(function (o) { var fy = Y(o.limT * o.n); if (fy > kb && fy < ky + 60) kb = fy + (phone ? 0 : 0); });
    g.text(k1, kx - 10, kb + 22, { align: "right", size: 11, weight: 700, color: c.text2 });
    g.text(k2, kx - 10, kb + 37, { align: "right", size: 11, weight: 600, color: c.text2 });
  }
  if (!others.length) g.text("free " + K.n(q.free, 0), X(q.free), y0 + 16, { align: X(q.free) > x1 - 30 ? "right" : "center", size: 10, weight: 700, color: c.text2 });
  // The dots: all at the same speed, sweeping from standstill to the fastest free speed. The read-out is the first motor.
  var rpmNow = free * F.clamp(t / 4, 0, 1), wt = Math.min(rpmNow, q.free) * F.RPM, at = M.at(q.id, V, L, wt), dx = X(wt / F.RPM), dy = Y(at.torque * n);
  others.forEach(function (o) { var w3 = Math.min(rpmNow, o.free) * F.RPM; g.circle(X(w3 / F.RPM), Y(M.at(o.id, V, L, w3).torque * o.n), 4.5, { fill: c["s" + (o.i + 1)] || c.s2, stroke: c.sheet, width: 1.5 }); });
  g.line(dx, dy, dx, y0, { color: c.accent, width: 1 });
  g.circle(dx, dy, 6, { fill: c.accent, stroke: c.sheet, width: 2 });
  g.text(q.name + " at " + K.fix(V, 1) + " V, " + (L > 0 ? L + " A limit" : "no limit"), 12, 18, { weight: 700 });
  g.text(phone ? K.n(wt / F.RPM, 0) + " rpm: " + K.fix(at.torque * n, 2) + " N m, " + K.n(at.statorA, 0) + " A motor, " + K.n(at.supplyA, 0) + " A battery, " + K.n(at.power * n, 0) + " W" : "At the dot: " + K.n(wt / F.RPM, 0) + " rpm, " + K.fix(at.torque * n, 2) + " N m, " + K.n(at.statorA, 0) + " A in the motor, " + K.n(at.supplyA, 0) + " A from the battery, " + K.n(at.power * n, 0) + " W", 12, 38, { size: phone ? 11 : 12, weight: 600, color: c.accent });
}
// A ring where each battery-current line ends, at its free current, with the value beside it, in the motor's colour.
function endRings(html, o, L) {
  var W = 480, H = 190, pl = 46, pr = 14, pt = 24, pb = 34, out = "", taken = [], pts = [];
  function X(x) { return pl + (x - o.x.min) / (o.x.max - o.x.min) * (W - pl - pr); } function Y(y) { return H - pb - (y - o.y.min) / (o.y.max - o.y.min) * (H - pt - pb); }
  // Every line as points in the chart's pixels, and every ring as taken space; then each label tries spots in turn.
  L.forEach(function (q) { q.amp.forEach(function (p, i) { var n = q.amp[i + 1]; pts.push([X(p[0]), Y(p[1])]); if (n) for (var k = 1; k < 6; k++) pts.push([X(p[0] + (n[0] - p[0]) * k / 6), Y(p[1] + (n[1] - p[1]) * k / 6)]); });
    var e = q.amp[q.amp.length - 1]; taken.push([X(e[0]) - 6, Y(e[1]) - 6, X(e[0]) + 6, Y(e[1]) + 6]); });
  L.forEach(function (q) {
    var e = q.amp[q.amp.length - 1], x = X(e[0]), y = Y(e[1]), txt = K.fix(e[1], 1) + " A", w = txt.length * 6.8;
    out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" style="fill:var(--surface);stroke:var(--s' + (q.i + 1) + ');stroke-width:2"/>';
    // Score each spot: a line point inside counts 1, a ring or another label 20; the lowest score wins.
    // Right of the ring, or just left of the motor's own falling line a little higher up (its colour ties it there).
    var spots = [[x + 7, y + 4], [x + 7, y - 6]], fall = q.amp.filter(function (p) { return p[0] > q.peak.rpm * 0.9; });
    [8, 12, 16, 21, 27].forEach(function (h) {
      for (var m = fall.length - 1; m > 0; m--) if (fall[m - 1][1] >= h && fall[m][1] <= h) { var u = (fall[m - 1][1] - h) / (fall[m - 1][1] - fall[m][1]), xr = fall[m - 1][0] + (fall[m][0] - fall[m - 1][0]) * u; spots.push([X(xr) - 8 - w, Y(h) + 4]); break; }
    });
    var pick = spots[0], best = Infinity;
    spots.forEach(function (sp) {
      var box = [sp[0] - 2, sp[1] - 11, sp[0] + w + 2, sp[1] + 2];
      if (box[0] < pl || box[2] > W) return;
      var sc = 3 * pts.filter(function (p) { return p[0] >= box[0] - 2 && p[0] <= box[2] + 2 && p[1] >= box[1] - 2 && p[1] <= box[3] + 2; }).length +
        20 * taken.filter(function (t) { return t[0] < box[2] && t[2] > box[0] && t[1] < box[3] && t[3] > box[1]; }).length;
      if (sc < best) { best = sc; pick = sp; }
    });
    taken.push([pick[0] - 2, pick[1] - 11, pick[0] + w + 2, pick[1] + 2]);
    // In the motor's colour, so each value reads with its own ring even when two sit close.
    // The value is in the legend ("X60, ends at 2.8 A"); text beside the rings met the other lines.
  });
  return html.replace("</svg>", out + "</svg>");
}
// A ring at each motor's knee, in that motor's colour, drawn into the torque chart's SVG (the kit's coordinates:
// 480 by 190, 46 px left, 14 right, 24 top, 34 bottom). The first is named.
function kneeRings(html, o, L, s) {
  if (!(s.statorA > 0)) return html;
  var W = 480, H = 190, pl = 46, pr = 14, pt = 24, pb = 34, out = "";
  function X(x) { return pl + (x - o.x.min) / (o.x.max - o.x.min) * (W - pl - pr); } function Y(y) { return H - pb - (y - o.y.min) / (o.y.max - o.y.min) * (H - pt - pb); }
  L.forEach(function (q, k) {
    if (q.peak.knee == null || q.peak.knee / F.RPM >= q.free) return;
    var x = X(q.peak.knee / F.RPM), y = Y(q.limT * q.n);
    out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.5" style="fill:var(--surface);stroke:var(--s' + (q.i + 1) + ');stroke-width:2.5"/>';
    if (k === 0) out += '<text class="cnote" x="' + (x > W - 120 ? x - 8 : x + 8).toFixed(1) + '" y="' + (y - 8).toFixed(1) + '"' + (x > W - 120 ? ' text-anchor="end"' : "") + ">limit stops here</text>";
  });
  return html.replace("</svg>", out + "</svg>");
}

/* ---------- The calculator ---------- */
var K = D.calc, ID = "tool-motors";
// On a phone the side-by-side table comes before the four charts: it answers the question the charts explain.
if (!document.getElementById("t-motors-css")) {
  var st = document.createElement("style"); st.id = "t-motors-css";
  st.textContent = ".t-motors-row3>figure:first-child{grid-column:1/-1}.t-motors-cap{margin:2px 0 4px;max-width:60ch}.t-motors-play{margin:-6px 0 6px}.t-motors-charts{display:grid;gap:16px}@media (max-width:640px){.t-motors-tab{order:-1}}";
  document.head.appendChild(st);
}
var LIST = F.MOTORS.map(function (m) { return [m.id, m.name]; });

function slots(s) {
  return [[s.m1, s.n1], [s.m2, s.n2], [s.m3, s.n3]].map(function (q, i) { return { i: i, id: q[0], n: Math.max(1, Math.round(q[1]) || 1) }; })
    .filter(function (q) { return q.id !== "none" && F.MOTORS.some(function (m) { return m.id === q.id; }); });
}
function nameOf(q) { return (q.n > 1 ? q.n + " × " : "") + F.motor(q.id).name; }
// A short name for chart legends, so a legend fits on one line ("X60", "Vortex (CTRE)"); the table keeps full names.
var SHORT = { kraken60: "X60", kraken60foc: "X60 FOC", kraken44: "X44", kraken44foc: "X44 FOC", vortex: "Vortex (CTRE)", vortexrev: "Vortex (REV)", neo: "NEO", neo550: "NEO 550", falcon: "Falcon", minion: "Minion", pulsar: "Pulsar", cim: "CIM", "775pro": "775pro" };
function shortOf(q) { return (q.n > 1 ? q.n + " × " : "") + (SHORT[q.id] || F.motor(q.id).name); }
/* Put each level line's label where no curve, dot or other label is: right end above the line, then the left end,
   then below. Works in the kit's chart coordinates (480 by 190; 46 px left, 14 right, 24 top, 34 bottom). */
function placeLabels(o) {
  var W = 480, H = 190, pl = 46, pr = 14, pt = 24, pb = 34, x0 = o.x.min, x1 = o.x.max, y0 = o.y.min, y1 = o.y.max, taken = [];
  function X(x) { return pl + (x - x0) / (x1 - x0) * (W - pl - pr); } function Y(y) { return H - pb - (y - y0) / (y1 - y0) * (H - pt - pb); }
  var pts = []; o.series.forEach(function (sr) { for (var i = 0; i < sr.pts.length; i++) { var p = sr.pts[i], q = sr.pts[i + 1]; if (!isFinite(p[1])) continue; pts.push([X(p[0]), Y(p[1])]); if (q && isFinite(q[1])) for (var k = 1; k < 4; k++) pts.push([X(p[0] + (q[0] - p[0]) * k / 4), Y(p[1] + (q[1] - p[1]) * k / 4)]); } });
  (o.dots || []).forEach(function (d) { var dx = X(d.x), dy = Y(d.y); taken.push([dx - 6, dy - 6, dx + 6, dy + 6]); if (d.label) taken.push([dx + 5, dy - 18, dx + 9 + d.label.length * 6.6, dy - 2]); });
  (o.hlines || []).forEach(function (h) {
    if (!h.label || h.y < y0 || h.y > y1) return;
    var w = h.label.length * 6.6 + 4, yl = Y(h.y), best = null;
    [["right", false], ["left", false], ["right", true], ["left", true]].some(function (cand) {
      var bx = cand[0] === "left" ? [pl + 1, pl + 3 + w] : [W - pr - w - 2, W - pr], by = cand[1] ? [yl - 2, yl + 15] : [yl - 15, yl + 2];   // a curve touching the line counts too
      var box = [bx[0] - 2, by[0] - 1, bx[1] + 2, by[1] + 1];
      var hit = pts.some(function (p) { return p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3]; }) ||
        taken.some(function (b) { return b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1]; });
      if (!hit) { best = { side: cand[0], below: cand[1], box: box }; return true; }
      return false;
    });
    if (best) { h.side = best.side; h.below = best.below; taken.push(best.box); }
  });
  return o;
}


K.tool({
  id: ID,
  defaults: { m1: "kraken60", n1: 1, m2: "vortex", n2: 1, m3: "kraken44", n3: 1, volts: 12, statorA: 60 },
  stage: { ratio: 2.3, narrow: 1.05, label: "The first motor's torque against speed: the flat part the current limit holds, the knee, free speed, and its power shaded underneath. Play moves a dot from standstill to free speed." },
  duration: function () { return 4; },
  // Rest on the moment of peak power, the speed a mechanism should be geared for.
  rest: function (s, r) { var q = r.list[0], fm = Math.max.apply(null, r.list.map(function (o) { return o.free; }).concat([1])); return q ? 4 * Math.min(1, q.peak.rpm / fm) : 0; },
  draw: function (g, s, r, t) { drawCurve(g, s, r, t); },

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
    var lim = "at " + K.fix(s.volts, 1) + " V " + (s.statorA > 0 ? "under a " + s.statorA + " A limit" : "with no current limit");
    var by = L.slice().sort(function (a, b) { return b.peak.power * b.n - a.peak.power * a.n; }), top = by[0], next = by[1];
    var text = top.name + " gives the most power in total " + lim + ": " + K.n(top.peak.power * top.n, 0) + " W at " + K.n(top.peak.rpm, 0) + " rpm";
    if (next) { var more = top.peak.power * top.n / (next.peak.power * next.n) - 1; text += more < 0.005 ? ", the same as " + next.name + "." : ", " + K.n(more * 100, 0) + "% more than " + next.name + "."; }
    else text += ".";
    var perLb = L.slice().sort(function (a, b) { return b.peak.power / b.m.lb - a.peak.power / a.m.lb; })[0];
    if (L.length > 1 && perLb !== top) text += " Per pound, " + perLb.m.name + " leads.";
    text += " A mechanism only gets that power if it is geared so the motor runs near that speed.";
    return '<p class="mute small t-motors-play">Play moves a dot along each motor\'s curve; the read-out above is the first motor.</p>' + K.verdict("info", text) +
      K.outs(L.map(function (q) { return { k: q.name, v: K.n(q.peak.power * q.n, 0), u: "W", sub: "peak at " + K.n(q.peak.rpm, 0) + " rpm", tip: "The most mechanical power " + (q.n > 1 ? "these motors give" : "this motor gives") + " " + lim + " at " + K.fix(s.volts, 1) + " V." }; })) +
      K.outs(L.map(function (q) { var T = q.limT * q.n; return { k: "Torque, " + (q.n > 1 ? q.n + " × " : "") + q.m.name, v: K.n(T, 2), u: "N m", sub: K.n(T / (F.LBF * F.IN), 1) + " lb in from a standstill, " + (s.statorA > 0 ? "at the " + s.statorA + " A limit" : "with no limit") }; }));
  },

  more: function (s, r) {
    var L = r.list; if (!L.length) return "";
    var xmax = Math.max.apply(null, L.map(function (q) { return q.free; }));
    var X = { label: "speed (rpm)", name: "Speed", unit: "rpm", min: 0, max: xmax };
    function ser(key) { return L.map(function (q) { return { name: shortOf(q), pts: q[key], color: q.i + 1 }; }); }
    var limLine = s.statorA > 0 ? [{ y: s.statorA, label: "current limit " + s.statorA + " A (in the motor)" }] : [];
    function top(key, extra) { var m = extra || 0; L.forEach(function (q) { q[key].forEach(function (p) { if (p[1] > m) m = p[1]; }); }); return m; }
    // The knee: where the current limit stops holding torque flat, marked for the first motor.
    var q0 = L[0], knee = q0.peak.knee != null && q0.peak.knee / F.RPM < q0.free ? [{ x: q0.peak.knee / F.RPM, y: q0.limT * q0.n, label: "limit stops here" }] : [];
    // Torque: headroom above the curves for the band's name; the band is the first motor's flat part.
    var tq = { id: "motors-tq", title: "Torque", x: X, y: { label: "torque (N m)", unit: "N m", min: 0, max: top("tq") * 1.4 }, series: ser("tq"),
      bands: knee.length ? [{ x0: 0, x1: knee[0].x, label: "the current limit holds torque flat" + (L.length > 1 ? " (" + shortOf(q0) + ")" : "") }] : [] };
    var Xa = Object.assign({}, X, { max: X.max * 1.02 });
    var amp = placeLabels({ id: "motors-amp", title: "Current from the battery, each motor", x: Xa, y: { label: "supply current (A)", unit: "A", min: 0, max: Math.ceil(top("amp", s.statorA) * 1.15 / 10) * 10 }, series: ser("amp").map(function (sr, k) { return Object.assign(sr, { name: sr.name + ", ends at " + K.fix(L[k].amp[L[k].amp.length - 1][1], 1) + " A" }); }), hlines: limLine });
    amp.note = (s.statorA > 0 ? "Dashed: the current limit, in the motor. " : "") + "Battery current is lower while slow and ends at the free current, not at zero.";
    // The torque chart is the drawing above; the three others share one row.
    var out = '<div class="t-motors-charts"><div class="chartrow t-motors-row3">' +
      endRings(K.chart(amp), amp, L) +
      K.chart({ id: "motors-pw", title: "Power out", x: X, y: { label: "power (W)", unit: "W", min: 0 }, series: ser("pw"), dots: L.map(function (q) { return { x: q.peak.rpm, y: q.peak.power * q.n }; }) }) +
      K.chart({ id: "motors-eff", title: "Efficiency", note: "It falls to nothing at free speed: the motor turns but does no work there.", marks: knee.length ? [{ x: knee[0].x, label: "limit lets go" + (L.length > 1 ? " (" + shortOf(q0) + ")" : "") }] : [], x: X, y: { label: "efficiency (%)", unit: "%", min: 0, max: 100 }, series: ser("eff") }) + "</div></div>";
    var rowsT = [
      ["Free speed", function (q) { return K.n(q.free, 0) + " rpm"; }],
      ["Stall torque, no limit", function (q) { return K.n(q.stallT * q.n, 2) + " N m"; }],
      ["Stall current, each, no limit", function (q) { return K.n(q.stallA, 0) + " A"; }],
      ["Torque from a standstill", function (q) { return K.n(q.limT * q.n, 2) + " N m"; }],
      ["Peak power", function (q) { return K.n(q.peak.power * q.n, 0) + " W at " + K.n(q.peak.rpm, 0) + " rpm"; }],
      ["Best efficiency", function (q) { return K.n(q.bestEff[1], 0) + "% at " + K.n(q.bestEff[0], 0) + " rpm"; }],
      ["Weight", function (q) { return K.n(q.m.lb * q.n, 2) + " lb"; }],
      ["Peak power per pound", function (q) { return K.n(Math.round(q.peak.power * q.n) / (Math.round(q.m.lb * q.n * 100) / 100), 0) + " W/lb"; }]];   // from the two figures as shown above it
    out += '<section class="ctab t-motors-tab"><h2>Side by side at ' + K.fix(s.volts, 1) + " V" + (s.statorA > 0 ? ", " + s.statorA + " A limit" : ", no limit") + '</h2><div class="scroll"><table><thead><tr><th></th>' + L.map(function (q) { return '<th class="r">' + D.esc(q.name) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rowsT.map(function (row) { return "<tr><td>" + row[0] + "</td>" + L.map(function (q) { return '<td class="r num">' + row[1](q) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" +
      '<p class="mute small">Figures as ReCalc lists them. Two rows for the NEO Vortex: <span class="abbr" tabindex="0" data-tip="' + D.esc("\"NEO Vortex (CTRE's test)\" is CTRE's bench test, and \"NEO Vortex (REV's sheet)\" is REV's own data sheet, which gives it less stall torque and more torque per amp. Choose one of each to compare. Stall torque and stall current are with no limit, scaled to this voltage.") + '">CTRE\'s test and REV\'s sheet disagree</span>. Torque, power and weight are for all the motors in a row; current is for each one.</p></section>';
    out += K.notes("<p>A DC motor's torque falls in a straight line from stall to free speed, and the current it draws falls with it. Power out is torque times speed, so without a limit it peaks at half the free speed. Each motor here is worked out from four figures: free speed, stall torque, stall current and free current at 12 V.</p>" +
      '<p class="eq">current = (volts − speed × kₑ) ÷ R,  torque = kₜ × (current − free current)</p>' +
      "<p>Here volts means the voltage the controller puts across the motor, not the battery's. With no limit, or above the knee, the controller passes on the full battery voltage. Below the knee it lowers the voltage until the current equals the limit, which is how a stator limit holds the current, and the torque, flat.</p>" +
      '<p class="eq">power = torque × speed,  efficiency = power ÷ (battery volts × battery current)</p>' +
      "<p>A stator limit caps the current in the motor's windings. Below the knee, where the motor would draw more than the limit, torque is held flat; above it, the motor runs on its natural line. Peak power moves to the knee when the knee is past half the free speed, which is why a tighter limit lowers the peak and moves it to a higher speed.</p>" +
      "<p>The current from the battery is lower than the stator current at low speed, because the controller turns the battery's voltage down. With a limit, the battery current curve therefore starts low, rises to the knee and then falls. Power in is battery volts times battery current, and the windings lose current² × R as heat.</p>" +
      "<p>Motor figures are as ReCalc lists them on its motor page (reca.lc/motors, read 2026-11-17), from CTRE's and REV's test data. The NEO Vortex has two rows because the two sources disagree by about 12% in torque per amp: CTRE's bench test, and REV's own data sheet. Neither is wrong; they were measured differently, so compare the two if a design is close. The model leaves out heating (a hot motor is weaker), friction that changes with speed, and the controller's own losses. It is a guide for choosing, not a dyno.</p>");
    return out;
  }
});
})(typeof window !== "undefined" ? window : this);
