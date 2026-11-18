/* Tools: Arm (#tool-arm). An arm on a pivot, driven through a reduction, swinging from a start angle to an end angle
   and back. The maths (M) runs in Node for tests/tool-arm.test.js; the page part draws the arm from the side, to
   scale, with gravity's torque and the motor's torque at the pivot, and plays the simulated swing. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");
var DEG = Math.PI / 180;

/* ---------- The maths: SI units, no page code ---------- */
var M = {};
/* The arm. o: { L (pivot to end, m), ma (arm, kg), rc (pivot to the arm's own centre of mass, m), ml (load at the end, kg),
   cb (counterbalance torque at level, N m, falls off with cos like gravity) }.
   Returns { tau0 (gravity torque at level, less the counterbalance, N m), torque(th) (gravity torque at angle th rad,
   + pulls the arm down), J (kg m^2 about the pivot), com (pivot to the combined centre of mass, m) }. */
M.arm = function (o) {
  var tau0 = F.G * (o.ma * o.rc + o.ml * o.L) - (o.cb || 0);
  return { tau0: tau0, torque: function (th) { return tau0 * Math.cos(th); },
    J: o.ma * 4 / 3 * o.rc * o.rc + o.ml * o.L * o.L,
    com: o.ma + o.ml > 0 ? (o.ma * o.rc + o.ml * o.L) / (o.ma + o.ml) : 0 };
};
// The angle in [lo, hi] (rad) where gravity's torque is largest: level if the range crosses it.
M.worst = function (lo, hi) {
  var best = lo, c = [lo, hi, 0, Math.PI, -Math.PI];
  c.forEach(function (a) { if (a >= lo - 1e-12 && a <= hi + 1e-12 && Math.abs(Math.cos(a)) > Math.abs(Math.cos(best))) best = a; });
  return best;
};
// Moving from a0 toward a1 (rad), the first angle where gravity needs more than the gearbox has (avail, N m), or null.
M.stallAngle = function (arm, a0, a1, avail) {
  var dir = a1 >= a0 ? 1 : -1, N = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (0.25 * DEG)));
  for (var i = 0; i <= N; i++) { var a = a0 + (a1 - a0) * i / N; if (dir * arm.torque(a) > avail) return a; }
  return null;
};
M.driveOf = function (s) { return F.drive({ motor: s.motor, n: Math.max(1, Math.round(s.motors)), ratio: s.ratio, eff: s.eff / 100, statorA: s.statorA }); };
function setup(s) {
  var L = Math.max(0.5, s.len) * F.IN;
  return M.arm({ L: L, ma: Math.max(0, s.armLb) * F.LB, rc: F.clamp(s.comPct, 0, 100) / 100 * L, ml: Math.max(0, s.loadLb) * F.LB, cb: s.cb * F.LBF * F.IN });
}
// The arm's real inertia: F.move picks a fine enough time step for a light arm behind a big reduction, and retries a
// short move with finer steps by itself. The feedforward kA below uses the same inertia.
function swing(arm, dr, s, a0, a1) {
  return F.move({ drive: dr, J: arm.J, x0: a0, goal: a1, ext: function (th) { return -arm.torque(th); }, V: s.vbat, Rbat: s.rbat, tmax: 12 });
}
function thin(T, Y, n) { var out = [], k = Math.max(1, Math.ceil(T.length / n)); for (var i = 0; i < T.length; i += k) out.push([T[i], Y[i]]); var L = T.length - 1; if (L >= 0 && out[out.length - 1][0] !== T[L]) out.push([T[L], Y[L]]); return out; }

M.compute = function (s) {
  var arm = setup(s), dr = M.driveOf(s), a0 = s.start * DEG, a1 = s.end * DEG, V0 = s.vbat, L = Math.max(0.5, s.len) * F.IN;
  var r = { arm: arm, L: L, a0: a0, a1: a1, empty: !(arm.J > 0) };   // no weight at all: nothing to simulate
  r.avail = dr.at(0, V0, 1).torque;
  var lo = Math.min(a0, a1), hi = Math.max(a0, a1);
  r.worstAngle = M.worst(lo, hi); r.worstTorque = Math.abs(arm.torque(r.worstAngle));
  r.margin = r.worstTorque > 1e-9 ? r.avail / r.worstTorque : Infinity;
  r.holdWorst = dr.hold(r.worstTorque); r.holdEnd = dr.hold(arm.torque(a1)); r.holdLevel = dr.hold(arm.tau0);
  r.go = swing(arm, dr, s, a0, a1);
  r.reached = r.go.reached;
  r.back = r.reached ? swing(arm, dr, s, a1, a0) : null;
  r.backOk = !r.back || r.back.reached;
  r.stallGo = r.reached ? null : M.stallAngle(arm, a0, a1, r.avail);
  r.stallBack = r.backOk ? null : M.stallAngle(arm, a1, a0, r.avail);
  /* What stops a failed move: the torque that pushes against it ("gravity" or "counterbalance": the counterbalance
     only wins where it is stronger than the weight, tau0 < 0), full reverse not stopping it at the goal ("overshoot"),
     or the time running out ("slow"). */
  function why(stall, sim) { return stall != null ? (arm.tau0 >= 0 ? "gravity" : "counterbalance") : sim && sim.cannotStop ? "overshoot" : "slow"; }
  r.goWhy = r.reached ? null : why(r.stallGo, r.go);
  r.backWhy = r.backOk ? null : why(r.stallBack, r.back);
  if (r.stallGo != null) { r.peakAngle = M.worst(Math.min(r.stallGo, a1), Math.max(r.stallGo, a1)); r.peakNeed = Math.abs(arm.torque(r.peakAngle)); }
  // Timeline: out, half a second holding at the end, back.
  var T = [], X = [], W = [], A = [], B = [], Q = [], segs = [];
  function add(sim, t0, endA) {
    var a = T.length, N = sim.t.length - 1;
    for (var k = 0; k <= N; k++) {
      T.push(t0 + sim.t[k]); X.push(sim.x[k]); W.push(sim.w[k]); A.push(k === N && endA != null ? endA : sim.statorA[k]); B.push(sim.volts[k]);
      // The motor's torque: what speeds the arm up plus what holds it against gravity.
      Q.push(k === N ? arm.torque(sim.x[k]) : arm.J * sim.a[k] + arm.torque(sim.x[k]));
    }
    segs.push([a, T.length]);
  }
  var tEnd = r.go.t[r.go.t.length - 1];
  add(r.go, 0, r.reached ? r.holdEnd.statorA : s.statorA);
  if (r.reached) {
    r.tGo = r.go.time; r.tHold = r.tGo + 0.5;
    segs.push([T.length, T.length + 2]); T.push(r.tGo + 1e-4, r.tHold); X.push(a1, a1); W.push(0, 0); A.push(r.holdEnd.statorA, r.holdEnd.statorA); B.push(V0, V0); Q.push(arm.torque(a1), arm.torque(a1));
    add(r.back, r.tHold + 1e-4);
    r.duration = T[T.length - 1];
  } else {
    r.tGo = tEnd; r.tHold = tEnd;
    // It stops where it stalled; never drawn sagging back past the start.
    var xs = a1 >= a0 ? Math.max(X[X.length - 1], a0) : Math.min(X[X.length - 1], a0); r.stuckAt = xs;
    for (var j = 0; j < X.length; j++) X[j] = a1 >= a0 ? Math.max(X[j], a0) : Math.min(X[j], a0);
    segs.push([T.length, T.length + 2]); T.push(tEnd + 1e-4, tEnd + 1.2); X.push(xs, xs); W.push(0, 0); A.push(s.statorA, s.statorA); B.push(V0, V0); Q.push(r.avail * (a1 >= a0 ? 1 : -1), r.avail * (a1 >= a0 ? 1 : -1));
    r.duration = tEnd + 1.2;
  }
  r.T = T; r.X = X; r.W = W; r.A = A; r.B = B; r.Q = Q;
  var sims = [r.go].concat(r.back ? [r.back] : []);
  r.peakA = Math.max.apply(null, sims.map(function (m) { return m.peakA; }));
  r.minV = Math.min.apply(null, sims.map(function (m) { return m.minV; }));
  r.maxW = Math.max.apply(null, sims.map(function (m) { return m.maxW; }));
  r.tipSpeed = r.maxW * L;                                                   // m/s
  r.timeGo = r.go.time; r.timeBack = r.back ? r.back.time : Infinity;
  // Feedforward at the output shaft, in radians.
  r.kG = (arm.tau0 < 0 ? -1 : 1) * r.holdLevel.volts; r.kV = dr.kV; r.kA = dr.kA(arm.J);
  // Charts.
  function chart(Y) { var out = []; segs.forEach(function (g) { out = out.concat(thin(T.slice(g[0], g[1]), Y.slice(g[0], g[1]), 90)); }); return out; }
  r.chAng = chart(X.map(function (x) { return x / DEG; }));
  r.chA = chart(A);
  var NM_LBIN = 1 / (F.LBF * F.IN), tq = [], N = 90, pad = Math.max(5 * DEG, (hi - lo) * 0.08), x0 = Math.max(-Math.PI / 2, lo - pad), x1 = Math.min(Math.PI, hi + pad);
  if (x1 - x0 < 10 * DEG) { x0 -= 5 * DEG; x1 += 5 * DEG; }
  for (var i = 0; i <= N; i++) { var a = x0 + (x1 - x0) * i / N; tq.push([a / DEG, arm.torque(a) * NM_LBIN]); }
  r.chTq = tq; r.chAvail = [[x0 / DEG, r.avail * NM_LBIN], [x1 / DEG, r.avail * NM_LBIN]]; r.tqRange = [x0 / DEG, x1 / DEG];
  return r;
};

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The page ---------- */
var K = D.calc, ID = "tool-arm", NM_LBIN = 1 / (F.LBF * F.IN);
function deg(a) { return K.fix(a / DEG, 0) + "°"; }
function secs(x) { return isFinite(x) ? K.fix(x, 2) : "–"; }
var drag = null, lastView = null, tipPx = null, endPx = null;
// The end of the arm, and the end of its outline at the end angle: either can be dragged.
function near(x, y, r) { return [tipPx, endPx].some(function (p) { return p && Math.hypot(x - p[0], y - p[1]) < r; }); }

K.tool({
  id: ID,
  defaults: { len: 28, armLb: 6, comPct: 50, loadLb: 4, start: -60, end: 80, motor: "kraken60", motors: 1, ratio: 80, statorA: 40, eff: 90, cb: 0, vbat: 12.3, rbat: 0.02 },
  stage: { ratio: 1.3, narrow: 1.0, label: "The arm from the side, to scale, swinging from its start angle to its end angle and back as simulated, with the torques at the pivot. Drag the end of the arm to set the end angle." },
  autoplay: true, speed: 0.25,
  compute: M.compute,
  duration: function (s, r) { return r && isFinite(r.duration) ? r.duration : 1; },
  // At rest the drawing shows the arm holding at its end angle.
  rest: function (s, r) { return r && r.reached && isFinite(r.tGo) ? r.tGo + 0.25 : null; },
  hints: function (s, r) { return { "h-arm-com": "The combined centre of mass of arm and load is " + K.fix(r.arm.com / F.IN, 1) + " in from the pivot." }; },

  controls: function () {
    var arm = K.num(ID, "len", "Pivot to end", { unit: "in", min: 4, max: 60, step: 0.5, slider: true, tip: "From the centre of the pivot to the far end, where the load sits." }) +
      K.num(ID, "armLb", "Weight of the arm", { unit: "lb", min: 0, max: 30, step: 0.25, tip: "The arm's own tubes, plates and belts: everything that swings, except the load at the end." }) +
      K.num(ID, "comPct", "Its weight sits at", { unit: "% of length", min: 0, max: 100, step: 1, hintId: "h-arm-com", tip: "Where the arm's own centre of mass is, along it from the pivot. 50 for a plain tube; less if the heavy parts are near the pivot." }) +
      K.num(ID, "loadLb", "Load at the end", { unit: "lb", min: 0, max: 30, step: 0.25, slider: true, tip: "The end effector and the game piece it carries." }) +
      K.num(ID, "start", "Start angle", { unit: "deg", min: -90, max: 180, step: 1, tip: "From level. +90 is straight up, -90 straight down, 180 level the other way." }) +
      K.num(ID, "end", "End angle", { unit: "deg", min: -90, max: 180, step: 1, slider: true, tip: "From level. You can also drag the end of the arm in the drawing." });
    var drive = K.motorFields(ID, { slider: true, ratioMax: 250 });
    var adv = K.num(ID, "cb", "Counterbalance at level", { unit: "lb in", min: 0, max: 2000, step: 1, tip: "Torque from a gas spring or elastic that lifts the arm, at level. It is taken to fall off with cos(angle), as gravity does." }) +
      K.num(ID, "vbat", "Battery at rest", { unit: "V", min: 10, max: 13.5, step: 0.1 }) +
      K.num(ID, "rbat", "Battery and wiring resistance", { unit: "ohm", min: 0, max: 0.1, step: 0.001, tip: "Makes the battery voltage sag while the motors draw current." });
    return K.group(ID, "arm", "Arm", arm) + K.group(ID, "drive", "Drive", drive) + K.group(ID, "adv", "Fine tuning", adv, true);
  },

  outs: function (s, r) {
    var lim = s.statorA, v, hw = r.holdWorst.statorA;
    if (r.empty) v = K.verdict("info", "The arm and its load weigh nothing here, so there is nothing to swing. Give the arm a weight or a load.");
    else if (r.minV < 7) v = K.verdict("bad", "Browns out: the battery " + (r.minV > 0 ? "drops to " + K.fix(r.minV, 1) + " V" : "collapses") + " on the swing, below the 6.8 V where the roboRIO starts shedding power. Lower the current limit or use a bigger reduction.");
    else if (!r.reached) {
      v = K.verdict("bad", stallWords(s, r) + (r.goWhy === "counterbalance" ? " Use a weaker counterbalance, a bigger reduction or a higher limit." : " Use a bigger reduction, more motors, a higher limit or a counterbalance."));
    } else if (!r.backOk) v = K.verdict("bad", backWords(s, r));
    else if (hw > 0.6 * lim) v = K.verdict("warn", "Holds with little to spare: at " + deg(r.worstAngle) + " holding takes " + K.fix(hw, 0) + " A of the " + lim + " A limit, so the motor heats up if it waits there. Use a bigger reduction or a counterbalance.");
    else v = K.verdict("ok", "Swings from " + deg(r.a0) + " to " + deg(r.a1) + " in " + secs(r.timeGo) + " s and holds with " + K.fix(hw, 0) + " A of the " + lim + " A limit at its heaviest angle, " + deg(r.worstAngle) + ".");
    return v + K.outs([
      { k: "Start to end", v: secs(r.timeGo), u: "s", state: r.reached ? "" : "bad" },
      { k: "And back", v: secs(r.timeBack), u: "s" },
      { k: "End speed", v: K.fix(r.tipSpeed / F.FT, 1), u: "ft/s", sub: K.fix(r.tipSpeed, 2) + " m/s", tip: "The fastest the end of the arm moves, either way." },
      { k: "Peak current", v: K.fix(r.peakA, 0), u: "A", sub: "per motor, briefly, while it speeds up" },
      { k: "Holding, worst angle", v: K.n(hw, hw < 100 ? 1 : 0), u: "A", sub: "per motor, at " + deg(r.worstAngle), state: hw > 0.6 * lim ? "warn" : "", tip: "The current that holds the arm still where gravity pulls hardest in its range: level, if it passes level." },
      { k: "Torque margin", v: isFinite(r.margin) ? K.fix(r.margin, 1) : "no load", u: isFinite(r.margin) ? "×" : "", sub: "gives " + K.n(r.avail * NM_LBIN, 0) + ", needs " + K.n(r.worstTorque * NM_LBIN, 0) + " lb in", state: r.margin < 1 ? "bad" : r.margin < 1.5 ? "warn" : "", tip: "Torque the gearbox gives at the current limit divided by the most gravity asks for in the range. Below 1 it cannot hold; aim for 2 or more so it can also speed up." }
    ]) + K.outs([
      { k: "kG at level", v: K.fix(r.kG, 3), u: "V", tip: "Volts that hold the arm level. Use kG × cos(angle) in code." },
      { k: "kV", v: K.fix(r.kV, 3), u: "V s/rad", tip: "Volts per radian per second of arm speed." },
      { k: "kA", v: K.fix(r.kA, 4), u: "V s²/rad", tip: "Volts per radian per second squared of arm acceleration." }
    ]);
  },

  more: function (s, r) {
    var out = K.chart({ id: "arm-tq", title: "Torque against angle", x: { label: "angle (deg)", unit: "°", name: "Angle", min: r.tqRange[0], max: r.tqRange[1] }, y: { label: "lb in", unit: "lb in" },
      series: [{ name: "Gravity needs", pts: r.chTq, color: 2 }, { name: "Gearbox gives at " + s.statorA + " A", pts: r.chAvail, color: 1, dash: true }],
      marks: [{ x: s.start, label: "start" }, { x: s.end, label: "end" }] });
    out += '<div class="chartrow">' +
      K.chart({ id: "arm-ang", title: "Angle", x: { label: "time (s)", unit: "s", name: "Time" }, y: { label: "deg", unit: "°" }, series: [{ name: "Angle", pts: r.chAng }] }) +
      K.chart({ id: "arm-a", title: "Current in each motor", x: { label: "time (s)", unit: "s", name: "Time" }, y: { label: "A", unit: "A", min: 0, max: Math.max(s.statorA * 1.15, r.peakA * 1.05, 10) }, series: [{ name: "Current", pts: r.chA, color: 2 }], hlines: [{ y: s.statorA, label: "Limit " + s.statorA + " A" }] }) + "</div>";
    var code = "// Arm feedforward, angle in radians from level\n" +
      "public static final double kG = " + K.fix(r.kG, 3) + "; // volts at level; use kG * cos(angle)\n" +
      "public static final double kV = " + K.fix(r.kV, 3) + "; // volts per (rad/s)\n" +
      "public static final double kA = " + K.fix(r.kA, 4) + "; // volts per (rad/s^2)\n" +
      "public static final double kMotorRotationsPerArmRotation = " + K.fix(s.ratio, 3) + ";";
    out += '<section class="ctab"><h2>For robot code</h2>' + K.code("arm-ff", code, "Copy the constants") + "</section>";
    out += K.notes(
      "<p>Gravity pulls the arm's weight and the load straight down. How hard that turns the arm about the pivot depends on how far out the weight is, measured level: the most when the arm is level, nothing when it points straight up or down.</p>" +
      '<p class="eq">gravity torque = g × cos(angle) × (m<sub>arm</sub> × r<sub>arm</sub> + m<sub>load</sub> × L) − counterbalance × cos(angle)</p>' +
      "<p>r<sub>arm</sub> is how far out the arm's own weight sits and L the pivot to the end. The curved arrows at the pivot in the drawing show this torque and the motor's, to the same scale.</p>" +
      "<p>To speed the arm up, the motor also has to turn its inertia about the pivot. The arm counts as a plain bar whose middle is at r<sub>arm</sub> (exact when its weight sits half way) and the load as a point at the end:</p>" +
      '<p class="eq">inertia = m<sub>arm</sub> × 4/3 × r<sub>arm</sub>² + m<sub>load</sub> × L²</p>' +
      "<p>The simulation drives the motor at full voltage up to the current limit, then reverses it to stop exactly on the end angle, in steps of 2 ms (finer for a light arm behind a big reduction), using the motor's torque at its speed and the battery's sag. Then it does the same back to the start. The holding current is worst at the angle in the range nearest level.</p>" +
      '<p class="eq">torque at the arm = motor torque × reduction × motors × efficiency</p>' +
      "<p><b>Torque margin</b> is the torque the gearbox gives at the current limit divided by the most gravity asks for. At 1 the arm barely holds and cannot speed up. 2 or more is a common rule of thumb, not a law.</p>" +
      "<p><b>Feedforward.</b> kG is the voltage that holds the arm level (the holding current times the motor's resistance); in code multiply it by cos(angle). kV comes from the motor's back-EMF and kA from the inertia, both at the arm's shaft in radians. Tune them on the robot: friction (kS) is not modelled.</p>" +
      "<p><b>Left out.</b> Friction beyond the efficiency figure, backlash, a belt or chain stretching, a gas spring's force changing with length, and the motor controller's response time.</p>");
    return out;
  },

  draw: draw,
  hover: function (x, y) { return near(x, y, 24) ? "grab" : ""; },
  pointer: function (kind, x, y, s) {
    if (kind === "down") {
      if (!lastView || !near(x, y, 26)) return false;
      drag = lastView; K.pause(ID);
    }
    if (!drag) return false;
    if (kind === "up") {
      drag = null;
      // Show the arm where it now ends: the moment the swing arrives.
      setTimeout(function () {
        var r = K.result(ID); if (!r || !isFinite(r.tGo)) return;
        K.play(ID, r.tGo); K.pause(ID); K.redraw(ID);
        // The kit has no call that moves the scrubber, so set it here.
        var sc = document.getElementById("calc-scrub"), tm = document.getElementById("calc-time");
        if (sc) sc.value = r.tGo.toFixed(3); if (tm) tm.textContent = r.tGo.toFixed(2) + " s";
      }, 0);
      return true;
    }
    var a = Math.atan2(drag.V.uy(y) - drag.py, drag.V.ux(x) - drag.px) / DEG;
    if (a < -90) a = a < -135 ? 180 : -90;
    a = Math.round(a);
    if (a === s.end) return false;
    s.end = a; return true;
  }
});

/* ---------- The drawing ---------- */
function wrap(g, str, maxW, o) { var words = str.split(" "), lines = [], cur = ""; words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (cur && g.textWidth(t, o) > maxW) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines; }
function meter(g, x, y, w, label, value, frac, state) {
  var c = g.c;
  // A narrow drawing gets the short label, so the two never run into each other.
  if (g.textWidth(label, { size: 11, weight: 600 }) + g.textWidth(value, { size: 11, weight: 700 }) + 10 > w) label = label.split(" ")[0];
  g.text(label, x, y, { size: 11, color: c.text2, weight: 600 }); g.text(value, x + w, y, { size: 11, color: state === "bad" ? c.bad : state === "warn" ? c.warn : c.text, weight: 700, align: "right" });
  g.rect(x, y + 5, w, 6, { fill: c.line, stroke: null, radius: 3 });
  g.rect(x, y + 5, Math.max(0, Math.min(1, frac)) * w, 6, { fill: state === "bad" ? c.bad : state === "warn" ? c.warn : c.s1, stroke: null, radius: 3 });
}
// A curved arrow round (x, y): from canvas angle a0, sweeping `sweep` radians (+ = clockwise on screen).
function turn(g, x, y, rad, a0, sweep, color, width) {
  if (Math.abs(sweep) < 0.05) return;
  var a1 = a0 + sweep, hs = 8;
  g.arc(x, y, rad, Math.min(a0, a1), Math.max(a0, a1), { color: color, width: width });
  var ex = x + rad * Math.cos(a1), ey = y + rad * Math.sin(a1), tx = -Math.sin(a1) * (sweep > 0 ? 1 : -1), ty = Math.cos(a1) * (sweep > 0 ? 1 : -1);
  g.arrow(ex - tx * hs, ey - ty * hs, ex + tx * 2, ey + ty * 2, { color: color, width: width, head: hs });
}

// How tall the read-out is, so the drawing can sit under it.
// Why it stalls, in one or two sentences: where, what gravity needs, what the gearbox gives.
function stallWords(s, r) {
  if (r.stallGo == null) return "It stops at " + deg(r.stuckAt) + " before reaching " + deg(r.a1) + ".";
  var cb = r.goWhy === "counterbalance", txt = (cb ? "Cannot swing past " : "Cannot lift past ") + deg(r.stallGo) + ": from there " + (cb ? "the counterbalance pushes back with" : "gravity needs") + " more than the " + K.n(r.avail * NM_LBIN, 0) + " lb in the gearbox gives at " + s.statorA + " A, up to " + K.n(r.peakNeed * NM_LBIN, 0) + " lb in at " + deg(r.peakAngle) + ".";
  if (Math.abs(r.stuckAt - r.stallGo) > 3 * DEG) txt += " It coasts on to " + deg(r.stuckAt) + ", then falls back.";
  return txt;
}
// Why the swing back fails, named by the torque that really resists it.
function backWords(s, r) {
  var gives = K.n(r.avail * NM_LBIN, 0) + " lb in the gearbox gives at " + s.statorA + " A";
  if (r.backWhy === "gravity") return "Cannot swing back past " + deg(r.stallBack) + ": from there gravity needs more than the " + gives + ". Use a bigger reduction, more motors, a higher limit or a counterbalance.";
  if (r.backWhy === "counterbalance") return "Cannot swing back past " + deg(r.stallBack) + ": the counterbalance is stronger than the arm is heavy, and from there it pushes harder than the " + gives + ". Use a weaker counterbalance.";
  if (r.backWhy === "overshoot") return "Cannot stop on " + deg(r.a0) + " on the way back: gravity carries it past even with the motor in full reverse. Use a bigger reduction or a lower speed.";
  return "Does not get back to " + deg(r.a0) + " in 12 s. Use a smaller reduction or a higher limit.";
}
// The drawing's shorter version.
function stallMsg(s, r) {
  if (r.stallGo == null) return "Stops at " + deg(r.stuckAt) + ".";
  return "Stalls past " + deg(r.stallGo) + ": " + (r.goWhy === "counterbalance" ? "the counterbalance pushes back with" : "gravity needs") + " up to " + K.n(r.peakNeed * NM_LBIN, 0) + " lb in, the gearbox gives " + K.n(r.avail * NM_LBIN, 0) + ".";
}
function hudHeight(g, s, r, w) { return 22 + 17 + 34 + 44 + (r.reached ? 14 : 15 * wrap(g, stallMsg(s, r), w, { size: 12, weight: 600 }).length); }
function draw(g, s, r, t) {
  var c = g.c, L = Math.max(0.5, s.len), ph;
  // The pivot sits high enough that the arm clears the floor at its lowest angle.
  var lo = Math.min(s.start, s.end) * DEG, hi = Math.max(s.start, s.end) * DEG, i;
  var low = 0; for (i = 0; i <= 40; i++) low = Math.min(low, Math.sin(lo + (hi - lo) * i / 40));
  var blk = F.clamp(2.5 + 0.45 * s.loadLb, 2.5, 9), hudW = Math.min(176, Math.max(132, g.w * 0.3));
  var py = Math.max(16, -low * L + blk + 4), px = 0, view;
  if (drag) view = drag;
  else {
    var xs = [-14, 14], ys = [0, py + 6];
    for (i = 0; i <= 40; i++) { var a = lo + (hi - lo) * i / 40; xs.push(L * Math.cos(a) + blk, L * Math.cos(a) - blk); ys.push(py + L * Math.sin(a) + blk + 3); }
    var box = { x0: Math.min.apply(null, xs) - 4, x1: Math.max.apply(null, xs) + 6, y0: -0.5, y1: Math.max.apply(null, ys) + 3 };
    // The read-out sits at the left of the drawing, or above it when the arm's world is wide (a long swing on a phone).
    var side = g.view(box, { l: hudW + 24, r: 30, t: 26, b: 10 }), above = g.view(box, { l: 14, r: 30, t: hudHeight(g, s, r, hudW) + 16, b: 10 });
    view = { V: above.k > side.k * 1.15 ? above : side, px: px, py: py };
  }
  lastView = view;
  var V = view.V, X = V.X, Y = V.Y, Lp = V.L; py = view.py;
  g.grid(V, 6, "6 in squares");
  // Where the arm is now.
  var th, w = 0, amps, volts, q;
  if (drag) { th = s.end * DEG; amps = r.holdEnd.statorA; volts = s.vbat; q = r.arm.torque(th); ph = "drag"; }
  else {
    th = F.interp(r.T, r.X, t); w = F.interp(r.T, r.W, t); amps = F.interp(r.T, r.A, t); volts = F.interp(r.T, r.B, t); q = F.interp(r.T, r.Q, t);
    ph = !r.reached ? (t < r.tGo - 0.02 ? "go" : "stall") : t < r.tGo ? "go" : t < r.tHold ? "hold" : t < r.duration - 1e-3 ? "back" : "end";
  }
  // Floor and robot, from the side.
  g.ground(Y(0), Math.max(0, X(-16) - 30), g.w);
  rect(-13, 2.25, 13, 4.75, { fill: c.part2, stroke: c.partLine, width: 1 });
  [-9.5, 9.5].forEach(function (wx) { g.wheel(X(wx), Y(2), Lp(2), -(t * 0), { spokes: 5 }); });
  rect(-1, 4.75, 1, py, { fill: c.part2, stroke: c.partLine, width: 1 });
  function rect(x0, y0, x1, y1, o) { g.rect(X(x0), Y(y1), Lp(x1 - x0), Lp(y1 - y0), o); }
  var PX = X(px), PY = Y(py);
  // Level line and the swept arc with its angle.
  g.line(PX - Lp(2.4), PY, X(L + 2), PY, { color: c.mute, width: 1, dash: [4, 4] });
  // "level" goes at the far end of its line, unless an outline lies along it there.
  var near0 = Math.abs(s.start) < 12 || Math.abs(s.end) < 12, near180 = Math.abs(s.start) > 168 || Math.abs(s.end) > 168;
  if (near0 && near180) { /* an outline lies along both ends of the line: leave the word off */ }
  else if (near0) g.text("level", PX - Lp(2.8), PY, { size: 11, color: c.mute, align: "right", base: "middle" });
  else g.text("level", X(L + 2), PY + 13, { size: 11, color: c.mute, align: "right" });
  var aR = Lp(L) * 0.42, ca0 = -s.start * DEG, ca1 = -s.end * DEG;
  if (Math.abs(s.end - s.start) >= 1) {
    g.arc(PX, PY, aR, Math.min(ca0, ca1), Math.max(ca0, ca1), { color: c.mute, width: 1.25, dash: [3, 3] });
    var mid = (ca0 + ca1) / 2, lr = aR + 14;
    g.text(K.fix(Math.abs(s.end - s.start), 0) + "°", PX + lr * Math.cos(mid), PY + lr * Math.sin(mid), { size: 12, weight: 700, color: c.text2, align: Math.cos(mid) < -0.3 ? "right" : Math.cos(mid) > 0.3 ? "left" : "center", base: "middle" });
  }
  // Ghosts at the start and end, each with its angle.
  function bar(a, o) {
    var ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, hw = 1, pts = [[-0.8 * ux + hw * nx, -0.8 * uy + hw * ny], [L * ux + hw * nx, L * uy + hw * ny], [L * ux - hw * nx, L * uy - hw * ny], [-0.8 * ux - hw * nx, -0.8 * uy - hw * ny]];
    g.poly(pts.map(function (p) { return [X(px + p[0]), Y(py + p[1])]; }), Object.assign({ close: true }, o));
    var ex = px + L * ux, ey = py + L * uy, b = blk / 2, sq = [[-b, -b], [b, -b], [b, b], [-b, b]].map(function (p) { return [X(ex + p[0] * ux - p[1] * uy), Y(ey + p[0] * uy + p[1] * ux)]; });
    if (s.loadLb > 0) g.poly(sq, Object.assign({ close: true }, o.load || o));
    return [X(ex), Y(ey)];
  }
  [[s.start, "start"], [s.end, "end"]].forEach(function (p) {
    var a = p[0] * DEG, e = bar(a, { stroke: c.ghost, width: 1, dash: [5, 4] }), off = blk / 2 + 2.5;
    if (p[1] === "end") endPx = e;
    var lx = X(px + (L + off) * Math.cos(a)), ly = Y(py + (L + off) * Math.sin(a)), cs = Math.cos(a);
    // Kept inside the drawing: a long label near an edge slides back in.
    var lab = p[1] + " " + K.fix(p[0], 0) + "°", lw = g.textWidth(lab, { size: 11, weight: 600 }), tx = cs >= -0.2 ? lx + 4 : lx - 4 - lw;
    tx = Math.max(4, Math.min(g.w - 4 - lw, tx));
    g.text(lab, tx, ly, { size: 11, color: c.mute, weight: 600, base: "middle" });
  });
  // The arm itself, its load and the pivot gear that turns with it.
  var stalled = ph === "stall";
  var tip = bar(th, { fill: c.part, stroke: stalled ? c.bad : c.partLine, width: stalled ? 2 : 1, load: { fill: c.piece, stroke: c.pieceLine, width: 1.25 } });
  tipPx = tip;
  for (i = 1; i * 3 < L - 2; i++) { var hx = px + i * 3 * Math.cos(th), hy = py + i * 3 * Math.sin(th); g.circle(X(hx), Y(hy), Lp(0.4), { fill: c.sheet, stroke: c.partLine, width: 1 }); }
  g.gear(PX, PY, Lp(2.2), 36, -th, { fill: c.part2 });
  // Weight at the combined centre of mass.
  var com = r.arm.com / F.IN, wt = s.armLb + s.loadLb, cmx = X(px + com * Math.cos(th)), cmy = Y(py + com * Math.sin(th));
  if (wt > 0) {
    g.circle(cmx, cmy, 4, { fill: c.sheet, stroke: c.force, width: 2 });
    var wl = Math.max(16, Math.min(70, Lp(wt * 0.6), Y(0) - 8 - cmy));
    g.arrow(cmx, cmy + 4, cmx, cmy + 4 + wl, { color: c.force, width: 2.5, label: "arm and load, " + K.fix(wt, wt < 10 ? 1 : 0) + " lb" });
  }
  // Torques at the pivot, to one scale: gravity (turns it down) and the motor.
  var big = Math.max(Math.abs(r.arm.tau0), r.avail, 1e-9), tR = Math.max(20, Lp(4.2)), gq = r.arm.torque(th), full = 1.6 * Math.PI;
  var aCan = -th;
  turn(g, PX, PY, tR, aCan - 0.5 * full * gq / big, full * gq / big, c.force, 2.5);
  if (ph !== "end") turn(g, PX, PY, tR + 8, aCan + 0.5 * full * q / big, -full * q / big, c.s1, 2.5);
  // The read-out at the top left.
  var hx2 = 14, hy2 = 22, title = { go: "Swinging to " + K.fix(s.end, 0) + "°", hold: "Holding at " + K.fix(s.end, 0) + "°", back: "Swinging back", end: "Back at " + K.fix(s.start, 0) + "°", stall: "Stalled", drag: "Setting the end angle" }[ph];
  g.text(title, hx2, hy2, { size: 14, weight: 700, color: stalled ? c.bad : c.text });
  g.text("At " + K.fix(th / DEG, 0) + "°, the end moving " + K.fix(Math.abs(w) * r.L / F.FT, 1) + " ft/s", hx2, hy2 + 17, { size: 11, color: c.text2 });
  var ky = hy2 + 34;
  g.line(hx2, ky, hx2 + 16, ky, { color: c.force, width: 2.5 }); g.text("gravity " + K.n(Math.abs(gq) * NM_LBIN, 0) + " lb in", hx2 + 22, ky, { size: 11, color: c.text2, base: "middle" });
  g.line(hx2, ky + 15, hx2 + 16, ky + 15, { color: c.s1, width: 2.5 }); g.text("motor " + K.n(Math.abs(q) * NM_LBIN, 0) + " lb in", hx2 + 22, ky + 15, { size: 11, color: c.text2, base: "middle" });
  meter(g, hx2, ky + 40, hudW, "Current per motor", K.fix(amps, 0) + " of " + s.statorA + " A", amps / s.statorA, amps >= s.statorA - 0.5 ? "warn" : "");
  var ny = ky + 66;
  if (!r.reached) {
    var msg = stallMsg(s, r);
    wrap(g, msg, hudW, { size: 12, weight: 600 }).forEach(function (ln, j) { g.text(ln, hx2, ny + 15 * j, { size: 12, weight: 600, color: c.bad }); });
  } else if (!drag && ph === "end") g.text("Drag the end of the arm to set the end angle.", hx2, ny, { size: 11, color: c.mute });
  K.chartNow("arm-ang", drag ? null : t); K.chartNow("arm-a", drag ? null : t); K.chartNow("arm-tq", th / DEG);
}
})(typeof window !== "undefined" ? window : this);
