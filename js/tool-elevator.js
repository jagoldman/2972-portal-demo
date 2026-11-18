/* Tools: Elevator (#tool-elevator). A lift with one to three moving stages and a carriage, rigged cascade or
   continuous, on a spool. The maths (M) runs in Node for tests/tool-elevator.test.js; the page part draws the
   elevator from the front, to scale, and plays the simulated lift up and back down so the rigging shows. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");

/* ---------- The maths: SI units, no page code ---------- */
var M = {};
/* The rigging as functions of rope travel x (m). o: { n (moving stages), rig ("cascade" | "continuous"),
   mc (carriage with its load, kg), ms (each moving stage, kg), travel (carriage travel, m),
   g (gravity along the lift, m/s^2), spring (constant-force spring pulling the carriage up, N) }.
   Returns { rope (rope travel to the top, m), gain (carriage metres per rope metre), seg (travel of each part, m),
   mass(x) (the mass the motor feels at the rope, kg), load(x) (rope tension that holds still, N),
   heights(x) ([stage 1, ..., stage n, carriage] heights above rest, m), section(x) (continuous: how many stages
   ride with the carriage) }. */
M.model = function (o) {
  var n = o.n, wc = o.mc * o.g - (o.spring || 0), ws = o.ms * o.g, seg = o.travel / (n + 1), k;
  if (o.rig !== "continuous") {
    // Virtual work: part k moves k times the rope, the carriage n + 1 times.
    var sk = 0, sk2 = 0; for (k = 1; k <= n; k++) { sk += k; sk2 += k * k; }
    var load = (n + 1) * wc + sk * ws, mass = (n + 1) * (n + 1) * o.mc + sk2 * o.ms;
    return { rope: seg, gain: n + 1, seg: seg, mass: function () { return mass; }, load: function () { return load; }, section: function () { return n; },
      heights: function (x) { var h = []; for (var i = 1; i <= n; i++) h.push(i * x); h.push((n + 1) * x); return h; } };
  }
  // Continuous: the carriage rises first, then picks up stage n on its hard stop, then stage n - 1, and so on.
  function sec(x) { return F.clamp(Math.floor(x / seg + 1e-9), 0, n); }
  return { rope: o.travel, gain: 1, seg: seg, section: sec,
    mass: function (x) { return o.mc + sec(x) * o.ms; },
    load: function (x) { return wc + sec(x) * ws; },
    heights: function (x) { var h = []; for (var i = 1; i <= n; i++) h.push(F.clamp(x - (n - i + 1) * seg, 0, i * seg)); h.push(x); return h; } };
};
/* When a simulated move switches to full reverse to stop on its goal: the start of the last stretch where the speed
   only falls. (In continuous rigging a stage joining can slow the lift too, but under full power it speeds up again
   after, so the last falling stretch is the stop.) */
// Work done lifting from the bottom to the top (J): the integral of rope tension over rope travel.
M.work = function (mod) { var N = 2000, dx = mod.rope / N, w = 0; for (var i = 0; i < N; i++) w += mod.load((i + 0.5) * dx) * dx; return w; };
M.driveOf = function (s, ratio) { return F.drive({ motor: s.motor, n: Math.max(1, Math.round(s.motors)), ratio: ratio == null ? s.ratio : ratio, eff: s.eff / 100, statorA: s.statorA }); };
function setup(s) {
  var n = F.clamp(Math.round(s.stages) || 1, 1, 3), g = F.G * Math.cos(F.clamp(s.tilt, 0, 89) * Math.PI / 180);
  var mod = M.model({ n: n, rig: s.rig, mc: Math.max(0.01, s.carLb) * F.LB, ms: Math.max(0, s.stageLb) * F.LB, travel: Math.max(0.01, s.travel) * F.IN, g: g, spring: s.spring * F.LBF });
  return { n: n, g: g, mod: mod, r: Math.max(0.05, s.spool) / 2 * F.IN };
}
// The lift's real mass at the rope: F.move picks a fine enough time step for a light load behind a big reduction, and
// retries a short move with finer steps by itself. The feedforward kA below uses the same mass.
function lift(st, dr, s, x0, goal, dt) {
  var mod = st.mod;
  return F.moveLinear({ drive: dr, m: mod.mass, r: st.r, x0: x0, goal: goal, force: function (x) { return -mod.load(x); }, V: s.vbat, Rbat: s.rbat, tmax: 20, dt: dt });
}
// Keep about n points of a long simulation for a chart.
function thin(T, Y, n) { var out = [], k = Math.max(1, Math.ceil(T.length / n)); for (var i = 0; i < T.length; i += k) out.push([T[i], Y[i]]); var L = T.length - 1; if (L >= 0 && out[out.length - 1][0] !== T[L]) out.push([T[L], Y[L]]); return out; }

M.compute = function (s) {
  var st = setup(s), mod = st.mod, n = st.n, dr = M.driveOf(s), rS = st.r, top = mod.rope, V0 = s.vbat;
  var r = { n: n, rig: s.rig === "continuous" ? "continuous" : "cascade", mod: mod, gain: mod.gain, rS: rS };
  // What the gearbox can give with the motors held still at the current limit, against what the load needs.
  r.avail = dr.at(0, V0, 1).torque;
  var need = 0, i; for (i = 0; i <= 200; i++) need = Math.max(need, Math.abs(mod.load(top * i / 200)));
  r.needTorque = need * rS; r.needRatio = r.avail > 0 ? r.needTorque / r.avail : Infinity;
  r.up = lift(st, dr, s, 0, top);
  r.reached = r.up.reached;
  r.down = r.reached ? lift(st, dr, s, top, 0) : null;
  r.downOk = !r.down || r.down.reached;
  // Holding at the top (the heaviest place for continuous rigging).
  r.holdLoad = mod.load(top); r.hold = dr.hold(r.holdLoad * rS);
  r.holdSupply = Math.max(1, s.motors) * r.hold.statorA * r.hold.volts / V0;
  // The heaviest carriage (with its load) the gearbox holds at the current limit, at the top.
  var Favail = r.avail / rS, gl = st.g, ws = Math.max(0, s.stageLb) * F.LB * gl, sp = s.spring * F.LBF, sumK = 0;
  if (r.rig === "cascade") { for (i = 1; i <= n; i++) sumK += i; r.maxCarLb = ((Favail - sumK * ws) / (n + 1) + sp) / (gl * F.LB); }
  else r.maxCarLb = (Favail - n * ws + sp) / (gl * F.LB);
  // The timeline the stage plays: up, half a second at the top, down. Rope position x, rope speed v.
  var T = [], X = [], Vv = [], A = [], B = [], AS = [];
  var segs = [], hSign = r.holdLoad < 0 ? -1 : 1;
  function add(sim, t0, endA, endV, up) {
    var a = T.length, L = sim.t.length - 1, sg = M.signed(sim, dr, rS, up);
    for (var k = 0; k <= L; k++) { T.push(t0 + sim.t[k]); X.push(sim.x[k]); Vv.push(sim.v[k]); A.push(k === L && endA != null ? endA : sim.statorA[k]); AS.push(k === L && endA != null ? hSign * endA : sg[k]); B.push(k === L && endV != null ? endV : sim.volts[k]); }
    segs.push([a, T.length]);
  }
  var tEnd = r.up.t[r.up.t.length - 1], vHold = V0 - s.rbat * r.holdSupply;
  add(r.up, 0, r.reached ? r.hold.statorA : s.statorA, r.reached ? vHold : null, 1);
  if (r.reached) {
    r.tUp = r.up.time; r.tHold = r.tUp + 0.5;
    segs.push([T.length, T.length + 2]); T.push(r.tUp + 1e-4, r.tHold); X.push(top, top); Vv.push(0, 0); A.push(r.hold.statorA, r.hold.statorA); AS.push(hSign * r.hold.statorA, hSign * r.hold.statorA); B.push(vHold, vHold);
    if (r.down) add(r.down, r.tHold + 1e-4, null, null, -1);
    r.duration = T[T.length - 1];
  } else {
    // Stalled: it stays where it stopped, the motors pushing at the limit.
    r.tUp = tEnd; r.tHold = tEnd;
    // The battery sags under the stalled motors' current, as it would on the robot.
    var vStall = V0 - s.rbat * dr.at(0, V0, 1).supplyA;
    var xs = X[X.length - 1]; segs.push([T.length, T.length + 2]); T.push(tEnd + 1e-4, tEnd + 1.2); X.push(xs, xs); Vv.push(0, 0); A.push(s.statorA, s.statorA); AS.push(s.statorA, s.statorA); B.push(vStall, vStall);
    r.duration = tEnd + 1.2; r.stallX = xs;
  }
  r.T = T; r.X = X; r.V = Vv; r.A = A; r.B = B; r.AS = AS;
  // When full reverse starts on each move (absolute times), for the phase marks on the current chart.
  if (r.reached) { r.tRev1 = M.reverseAt(r.up, dr, rS, 1); if (r.down && r.down.reached) r.tRev2 = r.tHold + 1e-4 + M.reverseAt(r.down, dr, rS, -1); }
  // Continuous: when each stage joins on the way up (stage n first, the one the carriage rides in, then n - 1 ...).
  r.joins = [];
  if (r.rig === "continuous") for (i = 1; i <= n; i++) { var xj = i * mod.seg, tj = null; for (var q = 0; q < r.up.x.length; q++) if (r.up.x[q] >= xj - 1e-9) { tj = r.up.t[q]; break; } if (tj != null && tj < r.up.time - 1e-6) r.joins.push({ t: tj, stage: n - i + 1 }); }
  var sims = [r.up].concat(r.down ? [r.down] : []);
  r.peakA = Math.max.apply(null, sims.map(function (m) { return m.peakA; }));
  r.minV = Math.min.apply(null, sims.map(function (m) { return m.minV; }).concat(r.reached ? [] : [B[B.length - 1]]));
  // The carriage's top speed going up (m/s), never above the motors' no-load speed. Coming down, gravity helps, so it
  // can run a little faster; that is given on its own.
  r.topV = r.up.maxV * mod.gain;
  r.topVDown = r.down ? r.down.maxV * mod.gain : 0;
  r.freeV = dr.freeSpeed(V0) * rS * mod.gain;
  r.timeUp = r.up.time; r.timeDown = r.down ? r.down.time : Infinity;
  /* Feedforward for the carriage, in metres: volts = kS sign(v) + kG + kV v + kA a. kG balances gravity alone; kS is
     the motor's own friction (its free current times its resistance). The holding current above is the two together. */
  r.kG = (r.holdLoad < 0 ? -1 : 1) * dr.kG(r.holdLoad * rS);
  r.kS = dr.kS; r.freeA = dr.motor.freeA;
  r.kV = dr.kV / (rS * mod.gain);
  // Continuous rigging: kG and kA change as each stage joins, so both are given per section (the carriage alone, then
  // with each stage). The single kG and kA are the last section's, with every stage moving.
  r.kA = dr.kA(mod.mass(top) * rS * rS) / (rS * mod.gain);
  r.mPerRot = 2 * Math.PI * rS * mod.gain / dr.ratio;
  if (r.rig === "continuous") {
    r.kGs = []; r.kAs = [];
    for (i = 0; i <= n; i++) { var xm = (i + 0.5) * mod.seg; r.kGs.push((mod.load(xm) < 0 ? -1 : 1) * dr.kG(mod.load(xm) * rS)); r.kAs.push(dr.kA(mod.mass(xm) * rS * rS) / (rS * mod.gain)); }
  }
  // Charts, in inches.
  var gain = mod.gain;
  // Thinned a stretch at a time, so the jump from moving to holding stays sharp.
  function chart(Y) { var out = []; segs.forEach(function (g) { out = out.concat(thin(T.slice(g[0], g[1]), Y.slice(g[0], g[1]), 90)); }); return out; }
  r.chH = chart(X.map(function (x) { return mod.heights(x)[n] / F.IN; }));
  r.chV = chart(Vv.map(function (v) { return v * gain / F.IN; }));
  r.chA = chart(A); r.chAS = chart(AS);
  if (s.noSweep) return r;
  // The same inputs with the other rigging, for the comparison card.
  var o2 = Object.assign({}, s, { rig: r.rig === "cascade" ? "continuous" : "cascade", noSweep: true }), q2 = M.compute(o2);
  r.other = { rig: o2.rig, reached: q2.reached, timeUp: q2.timeUp, holdA: q2.hold.statorA, pullLb: q2.holdLoad / F.LBF };
  r.pullLb = r.holdLoad / F.LBF;
  // Time to top for other reductions.
  var lo = Math.min(2, s.ratio), hi = Math.max(40, s.ratio), N = 60, best = null;
  /* A very light lift behind a big reduction needs F.move's finer steps (as small as 0.02 ms), which costs time on
     every keystroke. Estimate the steps the sweep would take and, past a budget, use fewer reductions (never under 15). */
  var Jr = Math.min(mod.mass(0), mod.mass(top)) * rS * rS, cost = 0;
  for (i = 0; i <= N; i++) { var dG = M.driveOf(s, lo + (hi - lo) * i / N), sl = dG.n * dG.ratio * dG.ratio * dG.eff * dG.motor.kt * dG.motor.ke / dG.motor.R; cost += sl > 0 ? Math.max(1, 0.003 / Math.max(Jr / sl / 3, 2e-5)) : 1; }
  if (cost > 4 * (N + 1)) N = Math.max(15, Math.floor(N * 4 * (N + 1) / cost));
  r.sweep = [];
  for (i = 0; i <= N; i++) {
    var G = lo + (hi - lo) * i / N, sim = lift(st, M.driveOf(s, G), s, 0, top, 0.003);
    r.sweep.push([G, sim.reached ? sim.time : NaN]);
    if (sim.reached && (!best || sim.time < best[1])) best = [G, sim.time];
  }
  r.best = best; r.sweepLo = lo; r.sweepHi = hi;
  // The best at either end of the sweep may not be the best there is: a smaller or larger reduction might beat it.
  r.bestEnd = best ? (Math.abs(best[0] - lo) < 1e-9 ? "lo" : Math.abs(best[0] - hi) < 1e-9 ? "hi" : null) : null;
  return r;
};

/* Time to top against reduction, with its y axis scaled to the curve near yours (from a third of your reduction to
   three times it), so the shape shows there; the rest of the curve runs off the top and is left out. */
M.sweepRange = function (sweep, ratio) {
  var lo = Infinity, hi = 0;
  sweep.forEach(function (p) { if (isFinite(p[1]) && p[0] >= ratio / 3 - 1e-9 && p[0] <= ratio * 3 + 1e-9) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } });
  if (!isFinite(lo)) { sweep.forEach(function (p) { if (isFinite(p[1])) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } }); }
  if (!isFinite(lo)) return [0, 1];
  var pad = Math.max((hi - lo) * 0.12, hi * 0.03);
  return [Math.max(0, lo - pad), hi + pad];
};

// The ropes, for the rope diagram under the drawing (see ropeDiagram).
M.ropes = function (n, rig) {
  var cols = [], k;
  if (rig !== "continuous") {
    cols.push({ name: "drive rope", col: "gold", num: 1, end: "its end on the spool", pulley: "the frame, at its top", lifts: "stage 1", mult: 1 });
    for (k = 1; k <= n; k++) cols.push({ name: "stage " + k + " rope", col: k % 2 ? "s3" : "accent", dash: !(k % 2), num: k + 1, end: "tied to " + (k === 1 ? "the frame" : "stage " + (k - 1)), pulley: "stage " + k + ", at its top", lifts: k < n ? "stage " + (k + 1) : "the carriage", mult: k + 1 });
    return cols;
  }
  var pul = ["the frame, at its top"]; for (k = 1; k <= n; k++) pul.push("stage " + k + ", at its bottom", "stage " + k + ", at its top");
  var lifts = [{ part: "c", name: "the carriage" }]; for (k = n; k >= 1; k--) lifts.push({ part: String(k), name: "stage " + k });
  return [{ name: "the laced rope, one rope", col: "s3", end: "its end on the spool", pulleys: pul, tied: "tied to the carriage", lifts: lifts }];
};
// The current in each motor with its sign (plus pushes the positive way: up, or to a larger angle).
/* Which way the motor was commanded at each recorded step of a move: +1 toward the goal (full power), -1 reverse (to
   stop). F.move records only the size of the current, so each step's current is worked out again both ways from the
   recorded speed toward the goal u (output rad/s) and battery voltage, I = (command x V - back-EMF) / R held to the
   limit, and compared with the record. A step only one command fits is certain. The switch to reverse comes after the
   last step that is certainly full power, if a step that is certainly reverse follows; steps where both fit (both at
   the limit) take the side of the switch they are on. Returns { cmd: [], at: [I toward the goal], k: first reverse
   index or -1 }. */
function commands(u, V, rec, dr, ag) {
  var m = dr.motor, Ls = dr.statorA || Infinity, n = u.length, ip = [], im = [], fOk = [], rOk = [], k, tol = 0.05;
  for (k = 0; k < n; k++) {
    var e = m.ke * u[k] * dr.ratio;
    ip.push(Math.max(-Ls, Math.min(Ls, (V[k] - e) / m.R))); im.push(Math.max(-Ls, Math.min(Ls, (-V[k] - e) / m.R)));
    fOk.push(Math.abs(Math.abs(ip[k]) - rec[k]) <= tol); rOk.push(Math.abs(Math.abs(im[k]) - rec[k]) <= tol);
  }
  var lastF = -1, firstR = -1;
  for (k = 0; k < n; k++) if (fOk[k] && !rOk[k]) lastF = k;
  for (k = lastF + 1; k < n; k++) if (rOk[k] && !fOk[k] && rec[k] > 0) { firstR = k; break; }
  /* Where every step between is at the limit both ways (a big reduction can hold the limit the whole move), the switch
     is the sharp drop in acceleration toward the goal: full power one step, full reverse the next. */
  var lo = lastF + 1, hi = firstR >= 0 ? firstR : n - 1, best = -1, drop = 0, amax = 0;
  for (k = 0; k < n; k++) amax = Math.max(amax, Math.abs(ag[k]));
  for (k = Math.max(1, lo); k <= hi; k++) if (ag[k - 1] - ag[k] > drop) { drop = ag[k - 1] - ag[k]; best = k; }
  var sw = firstR >= 0 ? (best >= 0 && drop > 0.3 * amax ? best : lastF >= 0 ? lastF + 1 : firstR) : best >= 0 && drop > 0.3 * amax && rec[n - 1] === 0 ? best : -1, cmd = [], at = [];
  for (k = 0; k < n; k++) { var c = sw >= 0 && k >= sw ? -1 : 1; cmd.push(c); at.push(rec[k] === 0 ? 0 : c > 0 ? ip[k] : im[k]); }
  return { cmd: cmd, at: at, k: sw };
}
M.signed = function (sim, dr, r, up) {
  var u = sim.t.map(function (t, k) { return (sim.v[k] / r) * up; }), c = commands(u, sim.volts, sim.statorA, dr, sim.acc.map(function (a) { return a / r * up; }));
  return c.at.map(function (I) { return up * I; });
};
// When a move switches to full reverse to stop (its own time), or its end if it never does.
M.reverseAt = function (sim, dr, r, up) { var u = sim.t.map(function (t, k) { return (sim.v[k] / r) * up; }), c = commands(u, sim.volts, sim.statorA, dr, sim.acc.map(function (a) { return a / r * up; })); return c.k >= 0 ? sim.t[c.k] : sim.t[sim.t.length - 1]; };
M.commands = commands;
if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The page ---------- */
var K = D.calc, ID = "tool-elevator", IN = F.IN;
function lbs(x) { return K.n(x, Math.abs(x) >= 100 || Math.abs(x - Math.round(x)) < 0.05 ? 0 : 1); }
// What a "section" is, for the continuous cards' tips.
var SECTION = " A section is a stretch of travel with the same parts moving: the carriage alone, then the carriage with each stage that has joined. This card is the last section, with every stage moving; the code box gives every section's value, and a continuous elevator should switch between them.";
function secs(x) { return isFinite(x) ? K.fix(x, 2) : "–"; }

K.tool({
  id: ID,
  defaults: { stages: 2, rig: "cascade", travel: 55, carLb: 14, stageLb: 5, motor: "kraken60", motors: 2, ratio: 9, statorA: 60, eff: 90, spool: 1.75, tilt: 0, spring: 0, vbat: 12.3, rbat: 0.02 },
  stage: { ratio: 1.3, narrow: 0.62, tall: true, label: "The elevator from the front, to scale, with its stages, ropes and carriage, rising and coming back down as simulated." },
  autoplay: true, speed: 0.25,
  compute: M.compute,
  duration: function (s, r) { return r && isFinite(r.duration) ? r.duration : 1; },
  /* At rest, cascade shows the lift holding at the top, the pose the answers are about. Continuous shows it part way
     up, just after the first stage has joined the carriage, so the still picture shows the stages going one at a time. */
  rest: function (s, r) {
    if (!r || !r.reached || !isFinite(r.tUp)) return null;
    if (r.rig !== "continuous") return r.tUp + 0.25;
    var x = 1.3 * r.mod.seg, i; for (i = 0; i < r.up.x.length; i++) if (r.up.x[i] >= x) return r.up.t[i];
    return r.tUp + 0.25;
  },
  hints: function (s, r) {
    var seg = s.travel / r.n, txt;
    var n1 = r.n + 1, sumK = 0, kk; for (kk = 1; kk <= r.n; kk++) sumK += kk;
    var pullCas = n1 * s.carLb + sumK * s.stageLb, pullCon = s.carLb + r.n * s.stageLb;     // lb of rope pull to hold it at the top
    if (r.rig === "cascade") txt = "Carriage moves " + n1 + "× the rope; rope pull " + K.n(pullCas, 0) + " lb when holding.";
    else txt = "One rope lifts one part at a time, carriage first. Rope pull " + K.n(s.carLb, 0) + " lb, " + K.n(pullCon, 0) + " lb at the top (cascade " + K.n(pullCas, 0) + " lb).";
    return { "h-el-travel": txt.trim() };
  },

  controls: function (s) {
    var lift = K.seg(ID, "stages", "Moving stages", [[1, "1"], [2, "2"], [3, "3"]], { tip: "Stages that slide, not counting the fixed frame. The carriage rides in the last one." }) +
      K.seg(ID, "rig", "Rigging", [["cascade", "Cascade"], ["continuous", "Continuous"]], { tip: "Cascade: each stage has its own rope, so every stage moves at once. Continuous: one rope laced through every stage, so the carriage goes first and the stages follow one at a time." }) +
      K.num(ID, "travel", "Carriage travel", { unit: "in", min: 6, max: 100, step: 0.5, slider: true, hintId: "h-el-travel", tip: "How far the carriage rises from its lowest to its highest place." }) +
      K.num(ID, "carLb", "Carriage with its load", { unit: "lb", min: 0.5, max: 60, step: 0.5, slider: true, tip: "The carriage, everything on it (the end effector) and the game piece it carries." }) +
      K.num(ID, "stageLb", "Each moving stage", { unit: "lb", min: 0, max: 25, step: 0.25, tip: "One stage's tubes, bearings and pulleys." });
    var drive = K.motorFields(ID, { slider: true, ratioMax: 50 }) +
      K.num(ID, "spool", "Spool diameter", { unit: "in", min: 0.25, max: 4, step: 0.05, tip: "The drum the rope winds on. For a belt or chain drive, use the pulley's or sprocket's pitch diameter." });
    var adv = K.num(ID, "tilt", "Tilt from upright", { unit: "deg", min: 0, max: 80, step: 1, tip: "An elevator leaning back only lifts against the part of gravity along it: cos(tilt)." }) +
      K.num(ID, "spring", "Constant-force spring help", { unit: "lbf", min: 0, max: 80, step: 0.5, tip: "A constant-force spring pulling the carriage up. It counts like taking that much weight off the carriage." }) +
      K.num(ID, "vbat", "Battery at rest", { unit: "V", min: 10, max: 13.5, step: 0.1 }) +
      K.num(ID, "rbat", "Battery and wiring resistance", { unit: "ohm", min: 0, max: 0.1, step: 0.001, tip: "Makes the battery voltage sag while the motors draw current. 0.015 to 0.025 for a good battery and wiring." });
    return K.group(ID, "lift", "Lift", lift) + K.group(ID, "drive", "Drive", drive) + K.group(ID, "adv", "Fine tuning", adv, true);
  },

  outs: function (s, r) {
    var lim = s.statorA, holdA = r.hold.statorA, v;
    if (r.minV < 7) v = K.verdict("bad", "Browns out: the battery " + (r.minV > 0 ? "drops to " + K.fix(r.minV, 1) + " V" : "collapses") + " on the move, below the 6.8 V where the roboRIO starts shedding power. Lower the current limit or use a bigger reduction.");
    else if (!r.reached) {
      var h = r.mod.heights(r.stallX || 0)[r.n] / IN;
      v = K.verdict("bad", (h > 0.5 ? "Stalls " + K.fix(h, 1) + " in up: " : "Cannot lift: ") + "the load needs " + K.fix(r.needRatio, 2) + " times the torque this gearbox has at " + lim + " A. Use a bigger reduction, more motors or a higher current limit.");
    } else if (!r.downOk) v = K.verdict("bad", "Cannot pull it back down: the spring is stronger than the carriage is heavy and the gearbox cannot overcome it.");
    else {
      var ideal = "The time is ideal: full power, then full reverse, with no controller. A real motion profile, with limits on speed and acceleration, often takes about twice the ideal time." + (r.rig === "continuous" ? " Each stage also joins with a jolt that the model ignores." : "");
      if (holdA > 0.6 * lim) v = K.verdict("warn", "Holds with little to spare: holding at the top takes " + K.fix(holdA, 1) + " A of the " + lim + " A limit, so the motors heat up. Use a bigger reduction than " + K.fix(s.ratio, 2) + ":1 or add a constant-force spring.", ideal);
      else v = K.verdict("ok", "Reaches the top in " + secs(r.timeUp) + " s at best and holds there with " + K.fix(holdA, 1) + " A of the " + lim + " A limit.", ideal);
    }
    var vin = r.topV / IN;
    return v + K.outs([
      { k: "Time to top", v: secs(r.timeUp), u: "s", sub: "ideal, at best", state: r.reached ? "" : "bad" },
      { k: "Time down", v: secs(r.timeDown), u: "s", sub: "ideal, at best" },
      { k: "Top speed going up", v: K.n(vin, 0), u: "in/s", sub: r.rig === "continuous" ? "with the carriage alone, before a stage joins; " + K.fix(r.topV, 2) + " m/s" : K.fix(r.topV, 2) + " m/s" + (r.topVDown > 0 ? ". Coming down, gravity helps: " + K.n(r.topVDown / IN, 0) + " in/s" : ""), tip: "The carriage's fastest on the way up. " + (r.mod.load(0) < 0 ? "Here the spring is stronger than the weight it carries, so it can pass the motors' no-load speed, " + K.n(r.freeV / IN, 0) + " in/s." : "It cannot pass the motors' no-load speed, " + K.n(r.freeV / IN, 0) + " in/s here.") },
      r.other ? { k: "With " + r.other.rig + " rigging", v: r.other.reached ? secs(r.other.timeUp) : "stalls", u: r.other.reached ? "s" : "", sub: (r.other.reached ? "to the top; " : "") + "holds with " + K.fix(r.other.holdA, 1) + " A, rope pull " + K.n(r.other.pullLb, 0) + " lb", tip: "The same lift, motors and reduction rigged the other way. Rope pull is the rope's tension holding at the top. Yours: " + secs(r.timeUp) + " s, " + K.fix(holdA, 1) + " A, " + K.n(r.pullLb, 0) + " lb." } : null
    ]) + K.outs([
      { k: "Lowest battery", v: K.fix(Math.max(0, r.minV), 1), u: "V", state: r.minV < 7 ? "bad" : r.minV < 8 ? "warn" : "", sub: s.rbat > 0 && s.vbat - r.minV > 0.2 ? "at the worst moment, " + K.n((s.vbat - r.minV) / s.rbat, 0) + "\u00a0A drawn" : "", tip: "The battery voltage at its lowest during the move, with the resistance in Fine tuning. The worst moment is when the motors reach the speed where the current limit stops holding them back: only then does each take its full limit from the battery. Slower than that the battery gives less than the current in the motors." },
      { k: "Holding at the top", v: K.fix(holdA, 1), u: "A", sub: "per motor, with " + K.fix(r.freeA, 1) + "\u00a0A of free current", state: holdA > 0.6 * lim ? "warn" : "", tip: "The current that holds the carriage still at the top, and just starts it rising. " + K.fix(r.freeA, 1) + " A of it is the motor's free current (its own friction); the rest, " + K.fix(holdA - r.freeA, 1) + " A, holds the weight. Continuous rigging is heaviest at the top, with every stage on the rope." },
      { k: "Heaviest carriage it could hold", v: r.maxCarLb > 0 ? lbs(r.maxCarLb) : "none", u: r.maxCarLb > 0 ? "lb" : "", sub: "in theory, held still at " + lim + "\u00a0A", tip: "The heaviest carriage this gearbox holds still at the top with the motors at the current limit: a limit in theory, not a working load. " + (r.rig === "cascade" ? "In cascade the rope feels the carriage " + (r.n + 1) + " times over." : "In continuous rigging the rope feels the carriage once.") + " As with the holding current, the motor's free current (" + K.fix(r.freeA, 1) + " A) goes on its own friction, so " + K.fix(lim - r.freeA, 1) + " A of the " + lim + " A holds weight." }
    ]) + K.outs([
      { k: r.rig === "continuous" ? "kG, last section" : "kG", v: K.fix(r.kG, 3), u: "V", sub: r.rig === "continuous" ? "With every stage moving. The code box has one value per section." : "volts to hold against gravity", tip: "Volts that hold the carriage against gravity." + (r.rig === "continuous" ? SECTION : "") },
      { k: "kS", v: K.fix(r.kS, 3), u: "V", sub: "the motor's friction only; measure the real one",  tip: "The motor's free current times its resistance: the volts it takes to turn the motor itself." },
      { k: "kV", v: K.fix(r.kV, 3), u: "V s/m", sub: "volts for each m/s of speed", tip: "Volts per metre per second of carriage speed." },
      { k: r.rig === "continuous" ? "kA, last section" : "kA", v: K.fix(r.kA, 4), u: "V s²/m", sub: r.rig === "continuous" ? "With every stage moving. The code box has one value per section." : "volts for each m/s² of speeding up", tip: "Volts per metre per second squared of carriage acceleration." + (r.rig === "continuous" ? SECTION : "") }
    ]) + ropeDiagram(r);
  },

  more: function (s, r) {
    var out = '<div class="chartrow">' +
      K.chart({ id: "el-h", title: "Carriage height", x: { label: "time (s)", unit: "s", name: "Time" }, y: { label: "in", unit: "in", min: 0 }, series: [{ name: "Height", pts: r.chH }] }) +
      (r.joins.length ? timeChart("el-v", "Carriage speed", "in/s", "in/s", r.chV, 3, null, r.joins.map(function (j) { return { x: j.t, label: "stage " + j.stage + " joins" }; }), r.duration) :
        K.chart({ id: "el-v", title: "Carriage speed", x: { label: "time (s)", unit: "s", name: "Time" }, y: { label: "in/s", unit: "in/s" }, series: [{ name: "Speed", pts: r.chV, color: 3 }] })) + "</div>";
    out += timeChart("el-a", "Current in each motor", "A", "A", r.chAS, 2, s.statorA * 1.12, phases(r), r.duration, [{ y: s.statorA }, { y: -s.statorA }], "Above zero the motors pull the carriage up; below zero they push it down. Stop: full reverse to stop at the end of a move. Dashed: the " + s.statorA + " A limit, either way.", { min: -s.statorA * 1.12, ticks: [-s.statorA, 0, s.statorA] }) +
      (r.reached ? '<p class="t-elevator-cap">' + (r.rig === "continuous" ? "The tall spikes are the stops at each end, where the motors reverse; a stage joining adds only a small step." : "The limit caps the current while the motors are slow, as they start and as they reverse to stop; faster, it falls under the limit.") + "</p>" : "");
    var range = K.fix(r.sweepLo, 2) + " to " + K.fix(r.sweepHi, 2) + ":1", bestTxt;
    if (!r.best) bestTxt = "No reduction from " + range + " lifts this load with these motors.";
    else if (r.reached && r.timeUp <= r.best[1] + 0.015) bestTxt = "Yours, " + K.fix(s.ratio, 2) + ":1, is as fast as any reduction tried (" + range + "): " + K.fix(r.timeUp, 2) + " s to the top.";
    else {
      bestTxt = r.bestEnd ? (r.rig === "continuous" && r.bestEnd === "lo" ? "Continuous rigging wants a low reduction: it lifts one part at a time, so the pull is small and speed matters more. " : "") + "The fastest tried (" + range + ") is the " + (r.bestEnd === "lo" ? "lowest" : "highest") + ", " + K.fix(r.best[0], 2) + ":1, at " + K.fix(r.best[1], 2) + " s to the top; a " + (r.bestEnd === "lo" ? "lower" : "higher") + " one might be faster still." :
        "Fastest at about " + K.fix(r.best[0], 2) + ":1 of the reductions tried (" + range + "), " + K.fix(r.best[1], 2) + " s to the top.";
      bestTxt += r.reached ? " Yours, " + K.fix(s.ratio, 2) + ":1, takes " + K.fix(r.timeUp, 2) + " s." : " Yours, " + K.fix(s.ratio, 2) + ":1, cannot lift it.";
    }
    var dots = r.reached ? [{ x: s.ratio, y: r.timeUp }] : [], sweepHtml;
    if (r.bestEnd) {
      // The fastest is at an end of the range tried: say so on the chart, at that end, in a row above the data.
      var endItems = [{ x: r.best[0], label: r.bestEnd === "lo" ? "fastest tried; lower may be faster" : "fastest tried; higher may be faster" }, { x: s.ratio, label: "yours, " + K.fix(s.ratio, 2) + ":1" }];
      sweepHtml = sweepChart(r, s, dots, endItems);
    } else sweepHtml = sweepChart(r, s, dots, [{ x: s.ratio, label: "yours, " + K.fix(s.ratio, 2) + ":1" }]);
    out += '<div class="t-elevator-sweep"><p>' + D.esc(bestTxt) + (r.rig === "continuous" ? "" : " A bigger reduction holds with less current but is slower; a smaller one is quicker until the current limit caps the torque.") + "</p>" + sweepHtml + "</div>";
    var code = "// Elevator feedforward, carriage position in metres (" + r.n + " moving " + (r.n > 1 ? "stages" : "stage") + ", " + r.rig + ")\n" +
      "public static final double kS = " + K.fix(r.kS, 3) + "; // V: the motor's own friction; measure the real one\n" +
      "public static final double kG = " + K.fix(r.kG, 3) + "; // volts" + (r.kGs ? ", last section" : "") + "\n" +
      "public static final double kV = " + K.fix(r.kV, 3) + "; // V per m/s\n" +
      "public static final double kA = " + K.fix(r.kA, 4) + "; // V per m/s^2" + (r.kAs ? ", last section" : "") + "\n" +
      "public static final double kMetersPerMotorRotation = " + K.fix(r.mPerRot, 5) + ";" +
      (r.kGs ? "\n// Continuous rigging: each section, the carriage alone first, then as each stage joins\n" +
        "public static final double[] kGBySection = { " + r.kGs.map(function (x) { return K.fix(x, 3); }).join(", ") + " }; // V\n" +
        "public static final double[] kABySection = { " + r.kAs.map(function (x) { return K.fix(x, 4); }).join(", ") + " }; // V per m/s^2" : "");
    out += '<section class="ctab"><h2>For robot code</h2>' + K.code("el-ff", code, "Copy the constants") + "</section>";
    var n = r.n, sk = "", sk2 = "";
    for (var k = 1; k <= n; k++) { var mk = "m<sub>" + k + "</sub>"; sk += (k > 1 ? " + " : "") + (k > 1 ? k + " " : "") + mk; sk2 += (k > 1 ? " + " : "") + (k > 1 ? k * k + " " : "") + mk; }
    out += K.notes(
      "<p>The motor turns a spool, the spool winds in rope, and the rope lifts the stages. Everything here is about what the motor feels at the rope: how hard it has to pull, and how much mass it has to speed up.</p>" +
      "<p>The stages are numbered from the outside in: stage 1 is the one nearest the fixed frame, and stage " + n + (n > 1 ? " is the innermost, the one the carriage rides in" : " carries the carriage") + ". The formulas below are written out for the " + n + " moving " + (n > 1 ? "stages" : "stage") + " now selected; change the count and they change.</p>" +
      "<p><b>Cascade.</b> Each stage carries its own short rope from the stage below it, over a pulley at its top, to the bottom of the stage above. So every stage moves at once: with " + n + " moving " + (n > 1 ? "stages" : "stage") + ", stage k moves k times as far as the drive rope and the carriage " + (n + 1) + " times. By virtual work (force times distance is the same at the rope as at the parts):</p>" +
      '<p class="eq">rope force = g × (' + (n + 1) + " m<sub>c</sub> + " + sk + ")</p>" +
      '<p class="eq">mass at the rope = ' + (n + 1) * (n + 1) + " m<sub>c</sub> + " + sk2 + "</p>" +
      "<p>m<sub>c</sub> is the carriage with its load and m<sub>k</sub> each stage. The rope pulls " + (n + 1) + " times the carriage's weight but moves only 1/" + (n + 1) + " as far.</p>" +
      "<p><b>Continuous.</b> One rope is laced over the top of every stage and under the bottom of the next. The rope only lifts the carriage; the carriage picks up the stage it rides in when it reaches that stage's hard stop, and so on down. So the carriage moves first, then each stage joins, and the load on the rope steps up each time:</p>" +
      '<p class="eq">rope force = g × (m<sub>c</sub> + the stages already moving), rope travel = carriage travel</p>' +
      "<p>Both riggings end with every part at the same height, so the total work to reach the top is the same. Cascade pulls harder over a shorter rope; continuous pulls more gently at first over a longer one.</p>" +
      "<p><b>Motion.</b> The simulation drives the motors at full voltage up to the current limit, then reverses them to stop exactly at the top, in steps of 2 ms (finer for a light lift behind a big reduction). Each step uses the motor's torque at its speed (from the motor's stall torque, free speed and resistance), the battery's sag (its resistance times the current drawn), gravity and the mass above. It does the same on the way down.</p>" +
      '<p class="eq">rope tension = motor torque × reduction × motors × efficiency ÷ spool radius</p>' +
      "<p>Tilt multiplies gravity by cos(tilt). A constant-force spring counts as taking that much weight off the carriage.</p>" +
      "<p><b>Holding current.</b> The current that holds the carriage still at the top is two parts: the current whose torque balances the weight, and the motor's free current, which only turns the motor against its own friction. The holding current, the heaviest carriage it holds and the feedforward all use the same split, so they agree when you check one against another.</p>" +
      '<p class="eq">holding current = rope force × spool radius ÷ (reduction × motors × efficiency × torque per amp) + free current</p>' +
      "<p><b>Feedforward.</b> kG is the voltage that balances gravity alone: the current above the free current times the motor's resistance. kS is the free current times the resistance: the motor's own friction only. A real mechanism's kS is larger (bearings, belts, the carriage's slides), so measure it on the robot. kV comes from the motor's back-EMF and kA from the mass the motor feels, both turned into metres of carriage travel. With continuous rigging the load and the mass step up as each stage joins, so kG and kA are given for each section; the single figures are the last section's.</p>" +
      "<p><b>Left out.</b> Friction in the bearings beyond the efficiency figure, rope stretch, the time a motor controller takes to respond, and the jolt as each continuous stage hits its hard stop. A real robot is a little slower than this. The top speed is given going up; coming down, gravity helps, so the carriage can pass the motors' no-load speed a little.</p>");
    return out;
  },

  draw: draw
});

/* Names along a chart, each over a dashed mark where its phase starts. The names sit in a band above the plot, outside
   its y range (the chart's picture is made taller upward for them), so no name can be read as part of the trace. Each
   name takes the first row of the band where it touches no other name, crosses no line coming down from a row above,
   and whose own line passes no name in a row below. The kit's chart is 480 by H units with the plot from x = 46 to 466
   and from y = 24 (10 without a y label) to H - 34; a name is at most about 6.6 units a letter. items: [{ x, label }]. */
function annotate(html, items, x0, x1, H) {
  H = H || 190;
  // On a phone the chart is drawn small: there each name takes its own row, in larger type.
  var ph = typeof window !== "undefined" && window.matchMedia && matchMedia("(max-width: 640px)").matches, fs = ph ? 16 : 0, rh = ph ? 21 : 16, cw = ph ? 9.6 : 7.2;
  var X = function (x) { return 46 + (x - x0) / ((x1 - x0) || 1) * 420; }, rows = [], placed = [];
  items.forEach(function (it) {
    if (!(it.x >= x0 - 1e-9 && it.x <= x1 + 1e-9)) return;
    var w = it.label.length * cw + 6, px = X(it.x), right = px + 3 + w > 470, a = right ? px - 3 - w : px + 3, b = a + w, row = 0;
    function ok(k) {
      return !placed.some(function (q) {
        if (q.row === k && a < q.b + 10 && b > q.a - 10) return true;
        if (q.row < k && q.px > a - 3 && q.px < b + 3) return true;
        return q.row > k && px > q.a - 3 && px < q.b + 3;
      });
    }
    if (ph) row = placed.length;
    while (!ok(row) && row < 8) row++;
    rows[row] = true;
    placed.push({ px: px, a: a, b: b, right: right, row: row, label: it.label });
  });
  var nr = rows.length, B = nr ? rh * nr + 8 : 0, g = "";
  placed.forEach(function (p) {
    var ty = -B + rh * p.row + rh - 4;
    g += '<line class="cmark" x1="' + p.px.toFixed(1) + '" x2="' + p.px.toFixed(1) + '" y1="' + (ty + 3) + '" y2="' + (H - 34) + '"/>';
    g += '<text class="cnote" x="' + (p.right ? p.px - 3 : p.px + 3).toFixed(1) + '" y="' + ty + '"' + (p.right ? ' text-anchor="end"' : "") + (fs ? ' style="font-size:' + fs + 'px"' : "") + ">" + D.esc(p.label) + "</text>";
  });
  html = html.replace('viewBox="0 0 480 ' + H + '"', 'viewBox="0 ' + (-B) + " 480 " + (H + B) + '"');
  return { html: html.replace("</svg>", g + "</svg>"), rows: nr };
}
/* The rope diagram, under the drawing and not to scale: one column for each rope, top to bottom. A filled square is
   where the rope's end is fixed, a circle the pulley it turns over (with the part that carries it), an arrow what it
   lifts, and the last line how far that part moves for an inch of drive rope. Colours match the ropes in the drawing.
   Continuous rigging has one laced rope; the part it is lifting now is marked as the drawing plays. */
var ropesOpen = null;
document.addEventListener("toggle", function (e) { if (e.target && e.target.id === "el-ropes") ropesOpen = e.target.open; }, true);
function ropeDiagram(r) {
  var cols = M.ropes(r.n, r.rig), out = "", T = function (x, y, str, cls) { return '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + D.esc(str) + "</text>"; };
  function sq(y, col) { return '<rect x="11" y="' + (y - 5) + '" width="10" height="10" style="fill:var(--' + col + ')"/>'; }
  // A pulley: a circle with its number, the same number as beside it in the drawing.
  function ci(y, num) { return '<circle cx="16" cy="' + y + '" r="7.5" class="pul"/><text x="16" y="' + (y + 3.5) + '" class="pn">' + num + "</text>"; }
  function up(y, col) { return '<path d="M16 ' + (y + 8) + "V" + (y - 3) + '" style="stroke:var(--' + col + ')" class="ar"/><path d="M11 ' + (y - 1) + "L16 " + (y - 8) + "L21 " + (y - 1) + 'Z" style="fill:var(--' + col + ')"/>'; }
  function rope(y0, y1, col, dash) { return '<path d="M16 ' + y0 + "V" + y1 + '" class="rp" style="stroke:var(--' + col + ')' + (dash ? ";stroke-dasharray:6 4" : "") + '"/>'; }
  cols.forEach(function (cl) {
    var g = "", y = 34, W = 200, H, after = "";
    g += T(4, 14, cl.name, "hd") + '<path d="M' + (W - 34) + " 10H" + (W - 6) + '" class="rp" style="stroke:var(--' + cl.col + ')' + (cl.dash ? ";stroke-dasharray:6 4" : "") + '"/>';
    if (!cl.pulleys) {
      g += rope(34, 86, cl.col, cl.dash) + sq(34, cl.col) + T(30, 38, cl.end) + ci(60, cl.num) + T(30, 64, "over pulleys " + cl.num + " on " + cl.pulley.split(",")[0]) + up(86, cl.col) + T(30, 90, "lifts " + cl.lifts);
      g += T(30, 112, (cl.lifts === "the carriage" ? "The carriage" : cl.lifts.charAt(0).toUpperCase() + cl.lifts.slice(1)) + " moves " + cl.mult + "× the drive rope", "mx");
      H = 122;
    } else {
      var step = 24, yEnd = 34 + step * (cl.pulleys.length + 1);
      g += '<path d="M16 34V' + (34 + step) + '" class="rp" style="stroke:var(--gold)"/>' + rope(34 + step, yEnd, cl.col) + sq(34, "gold") + T(30, 38, cl.end);
      cl.pulleys.forEach(function (pn, i) { var yy = 34 + step * (i + 1); g += ci(yy, i + 1) + T(30, yy + 4, "over " + (i ? "pulley " : "pulleys ") + (i + 1) + ", " + pn); });
      g += sq(yEnd, cl.col) + T(30, yEnd + 4, cl.tied);
      H = yEnd + 12;
      // What it lifts, in turn: a second column beside the first.
      var g2 = T(4, 14, "What it lifts, in turn", "hd"), W2 = 230;
      cl.lifts.forEach(function (lf, i) { var yy = 38 + 24 * i; g2 += '<g class="lift" data-part="' + lf.part + '">' + up(yy, cl.col) + T(30, yy + 4, (i ? "then " : "first ") + lf.name) + T(W2 - 4, yy + 4, "lifting now", "nowtag") + "</g>"; });
      var H2 = 38 + 24 * cl.lifts.length + 8;
      g2 += T(4, H2, "Each moves 1× the rope while it lifts.", "mx"); H2 += 8;
      after = '<svg viewBox="0 0 ' + W2 + " " + H2 + '" width="' + W2 + '" height="' + H2 + '" role="img" aria-label="What it lifts, in turn">' + g2 + "</svg>";
    }
    out += '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + D.esc(cl.name) + '">' + g + "</svg>" + after;
  });
  // Open on a laptop; shut on a phone until opened (and kept as the person left it while the page is open).
  var open = ropesOpen != null ? ropesOpen : !(window.matchMedia && matchMedia("(max-width: 640px)").matches);
  return '<details class="t-elevator-ropes" id="el-ropes" data-now=""' + (open ? " open" : "") + '><summary>How the ropes run</summary><p class="sub">Not to scale. The numbers match the pulleys in the drawing.' + (r.rig === "continuous" ? " In the drawing the rope is thicker where it is lifting now." : "") + '</p><div class="cols">' + out + "</div></details>";
}
// Time to top against reduction, drawn with the y range from M.sweepRange.
function sweepChart(r, s, dots, items) {
  var yr = M.sweepRange(r.sweep, s.ratio), pts = r.sweep.map(function (p) { return [p[0], p[1] >= yr[0] - 1e-9 && p[1] <= yr[1] + 1e-9 ? p[1] : NaN]; });
  var html = K.chart({ id: "el-sweep", title: "Time to top for other reductions", note: "The time axis is drawn for reductions near yours; times off its top are left out.", x: { label: "reduction, to 1", unit: ": 1", name: "Reduction", min: r.sweepLo, max: r.sweepHi }, y: { label: "s", unit: "s", min: yr[0], max: yr[1] }, series: [{ name: "Time to top", pts: pts }], dots: dots.filter(function (d) { return d.y >= yr[0] && d.y <= yr[1]; }) });
  return annotate(html, items, r.sweepLo, r.sweepHi).html;
}
// The phases of the move, for the current chart; continuous rigging adds where each stage joins.
function phases(r) {
  if (!r.reached) return [{ x: 0, label: "full power" }];
  var ph = [{ x: 0, label: "full power up" }];
  r.joins.forEach(function (j) { ph.push({ x: j.t, label: "stage " + j.stage + " joins" }); });
  // A stop too short to name on its own is joined to the hold that follows it.
  if (r.tUp - r.tRev1 < 0.04 * r.duration) ph.push({ x: r.tRev1, label: "stop, then hold" }); else ph.push({ x: r.tRev1, label: "stop" }, { x: r.tUp, label: "holding" });
  if (r.down) { ph.push({ x: r.tHold, label: "full power down" }); if (r.tRev2 != null && r.tRev2 < r.duration - 1e-3) ph.push({ x: r.tRev2, label: "stop" }); }
  return ph;
}
/* A chart against time with named marks in a band above the plot. ymax: where the y axis ends (null: just above the
   data). A y range below zero (the speed coming down) keeps its own bottom. */
function timeChart(id, title, ylab, yunit, pts, color, ymax, items, dur, hlines, note, yo) {
  var lo = 0, hi = 0; pts.forEach(function (p) { if (isFinite(p[1])) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } });
  var top = ymax != null ? ymax : hi * 1.08;
  var y = Object.assign({ label: ylab, unit: yunit, min: lo < 0 ? lo * 1.08 : 0, max: top }, yo || {});
  var html = K.chart({ id: id, title: title, x: { label: "time (s)", unit: "s", name: "Time", min: 0, max: dur }, y: y, series: [{ name: title, pts: pts, color: color }], hlines: hlines, note: note });
  return annotate(html, items, 0, dur).html;
}

/* ---------- The drawing ---------- */
var STEP = 2.2, TUBE = 0.75, ROFF = 1.15;   // ROFF: how far a rope runs outside its stage's rail, inches
// Where everything sits at rest, in inches. y = 0 is the floor, x = 0 the elevator's centre line.
function geo(s, n) {
  var seg = s.travel / (n + 1), hw = [], bot = [], len = [], i;
  for (i = 0; i <= n; i++) hw.push(11.5 - STEP * i);
  var yb = 4.25, Hf = Math.max(20, seg + 9 + 1.5 * n);
  for (i = 0; i <= n; i++) { bot.push(yb + 0.75 * i); len.push(Hf - 1.5 * i); }
  var Rs = Math.max(0.05, s.spool) / 2, spX = -(hw[0] + ROFF) - Rs;
  return { seg: seg, hw: hw, hwc: hw[n] - STEP, yb: yb, Hf: Hf, bot: bot, len: len, carBot: bot[n] + TUBE + 0.25, carH: 7, Rs: Rs, spX: spX, spY: yb + Rs + 0.5, motX: spX - Rs - 0.4 };
}
function phaseAt(r, t) {
  if (!r.reached) return t < r.tUp - 0.02 ? "up" : "stall";
  if (t < r.tUp) return "up"; if (t < r.tHold) return "hold"; if (t < r.duration - 1e-3) return "down"; return "end";
}
function wrap(g, str, maxW, o) { var words = str.split(" "), lines = [], cur = ""; words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (cur && g.textWidth(t, o) > maxW) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines; }
// A small meter: label, value, and a bar that fills. state "bad" | "warn" colours it.
function meter(g, x, y, w, label, value, frac, state, bh) {
  bh = bh || 6;
  var c = g.c;
  // A narrow drawing gets the short label, so the two never run into each other.
  if (g.textWidth(label, { size: 11, weight: 600 }) + g.textWidth(value, { size: 11, weight: 700 }) + 10 > w) label = label.split(" ")[0];
  g.text(label, x, y, { size: 11, color: c.text2, weight: 600 }); g.text(value, x + w, y, { size: 11, color: state === "bad" ? c.bad : state === "warn" ? c.warn : c.text, weight: 700, align: "right" });
  g.rect(x, y + 5, w, bh, { fill: c.line, stroke: null, radius: bh / 2 });
  g.rect(x, y + 5, Math.max(0, Math.min(1, frac)) * w, bh, { fill: state === "bad" ? c.bad : state === "warn" ? c.warn : c.s1, stroke: null, radius: bh / 2 });
}

function draw(g, s, r, t) {
  var c = g.c, n = r.n, G = geo(s, n), mod = r.mod, i, k, phone = g.w < 520;
  // Where the parts are now.
  var x = F.interp(r.T, r.X, t), v = F.interp(r.T, r.V, t), amps = F.interp(r.T, r.A, t), volts = F.interp(r.T, r.B, t), ph = phaseAt(r, t);
  var hNow = mod.heights(x).map(function (h) { return h / IN; });                 // [stage 1..n, carriage], inches
  var vNow = speeds(mod, x, v, n);                                                  // in/s for the same parts
  var ropeIn = x / IN, stalled = ph === "stall", brown = r.minV < 7, moving = Math.abs(v) > 1e-4;
  var cont = r.rig === "continuous", sct = mod.section(x);
  // The read-out's words, worked out first: on a phone they sit in a strip above the drawing.
  var title = { up: "Going up", hold: "Holding at the top", down: "Coming down", end: "Back at the bottom", stall: brown ? "Browns out" : "Stalled" }[ph];
  // Continuous: the carriage first, then the stages from the inside out (stage n, the top one, first; stage 1 last).
  function stName(j) { return "stage " + j + (j === n && n > 1 ? " (the top one)" : ""); }
  var joined = n - sct + 1, nextTxt = joined - 1 >= 1 ? "; stage " + (joined - 1) + " is next" : "; every stage is moving";
  var line2 = !cont ? "Cascade: all stages move together" : stalled ? (sct === 0 ? "Continuous: the carriage cannot move" : "Continuous: stalls as " + stName(joined) + " joins") : ph === "hold" || ph === "end" ? "Continuous: one stage at a time" : sct === 0 ? "Continuous: the carriage moves first; " + stName(n) + " is next" : "Continuous: " + stName(joined) + " has joined" + nextTxt;
  // The key is short: the ropes are named where they run. A rope gets a line here only when it has no room for its name.
  // The ropes are explained in the rope diagram under the drawing, so the drawing carries no key and no rope names.
  /* The read-out is a column at the left. On a phone the stage can only be so tall (the kit keeps it under half the
     screen), and the elevator is tall and narrow, so a narrow column beside it leaves it more room than a strip above. */
  /* The read-out: a column at the left on a laptop; on a phone a strip across the top (title, one line, the two meters
     side by side, the load), so the tall elevator gets the whole width under it. */
  var hudW = phone ? g.w - 20 : Math.min(200, Math.max(132, g.w * 0.3)), hx = phone ? 10 : 14, hy = 22, ks = phone ? 10 : 11;
  var l2 = wrap(g, line2, hudW, { size: 11 });
  var badMsg = !r.reached || brown ? (brown ? (phone ? "The battery falls below 7 V: the robot's controller would shut down." : "The motors draw so much current that the battery falls below 7 V and the robot's controller would shut down.") : (phone ? "Needs " + K.fix(r.needRatio, 2) + " times the torque the gearbox has at " + s.statorA + " A." : "The load needs " + K.fix(r.needRatio, 2) + " times the torque the gearbox has at " + s.statorA + " A, so the motors push at the limit and nothing moves" + (hNow[n] > 0.6 ? " past here." : "."))) : "";
  var bl = badMsg ? wrap(g, badMsg, hudW, { size: 12, weight: 600 }) : [];
  var stripH = phone ? hy + 17 + 14 * l2.length + 12 + 26 + 16 + (bl.length ? 15 * bl.length + 4 : 0) + (s.tilt > 0 ? 14 : 0) : 0;

  // The view: the whole elevator at full height, the robot under it, room for the speed labels on the right.
  var topY = G.bot[0] + G.len[0];
  for (i = 1; i <= n; i++) topY = Math.max(topY, G.bot[i] + G.len[i] + i * G.seg);
  topY = Math.max(topY, G.carBot + s.travel + G.carH) + 2.5;
  var right = G.hw[0] + 3.2 + 1.5 * (n + 1);
  var V = g.view({ x0: Math.min(-18, G.motX - 3.2), x1: right + 1, y0: -0.5, y1: topY }, phone ? { l: 8, r: 96, t: stripH + 8, b: 24 } : { l: hudW + 24, r: 128, t: 26, b: 10 });
  g.grid(V, 6, "6 in squares");
  var X = V.X, Y = V.Y, L = V.L;
  function rect(x0, y0, x1, y1, o) { g.rect(X(x0), Y(y1), L(x1 - x0), L(y1 - y0), o); }
  // Floor and robot.
  g.ground(Y(0), X(-18) - 30, X(right) + 40);
  [-14.5, 14.5].forEach(function (wx) { rect(wx - 0.75, 0, wx + 0.75, 4, { fill: c.text2, stroke: null, radius: 2 }); });
  rect(-16.5, 2.25, 16.5, G.yb, { fill: c.part2, stroke: c.partLine, width: 1 });
  // Ghost of the carriage at the top of its travel.
  rect(-G.hwc, G.carBot + s.travel, G.hwc, G.carBot + s.travel + G.carH, { stroke: c.ghost, width: 1, dash: [5, 4] });
  if (s.travel - mod.heights(x)[n] / IN > G.carH + 1) g.text("top", X(G.hwc) + 4, Y(G.carBot + s.travel + G.carH) + 10, { size: 11, color: c.mute });
  // Frames: the fixed one, then each moving stage, nested.
  function frame(k, lift, fill) {
    var hw = G.hw[k], b = G.bot[k] + lift, tp = b + G.len[k];
    // Light rails, so the ropes running beside them read as ropes.
    var ln = { fill: fill, stroke: c.line2, width: 1 };
    rect(-hw, b, -hw + TUBE, tp, ln); rect(hw - TUBE, b, hw, tp, ln);
    rect(-hw, tp - TUBE, hw, tp, ln); rect(-hw, b, hw, b + TUBE, ln);
  }
  frame(0, 0, c.line);
  for (i = 1; i <= n; i++) frame(i, hNow[i - 1], c.part);
  /* Ropes. The drive rope (from the spool) is gold. Cascade: each stage's own rope is green or dashed blue, in turn.
     Continuous: one green rope laced through every stage, thicker where it is lifting now. A small square marks
     each end that is tied to a stage. */
  var rw = Math.max(1.75, L(0.16)), rp = Math.max(2.5, L(0.45));
  function pulley(px, py) { g.circle(X(px), Y(py), rp, { fill: c.sheet, stroke: c.partLine, width: 1 }); }
  function rope(pts, o) { g.path(pts.map(function (p) { return [X(p[0]), Y(p[1])]; }), { color: o.color, width: o.width || rw, dash: o.dash }); }
  function tie(px, py, col) { var q = Math.max(5, rw + 3); g.rect(X(px) - q / 2, Y(py) - q / 2, q, q, { fill: col, stroke: null }); }
  function stageBot(k) { return k <= n ? G.bot[k] + (k ? hNow[k - 1] : 0) : G.carBot + hNow[n]; }
  function stageTop(k) { return G.bot[k] + (k ? hNow[k - 1] : 0) + G.len[k]; }
  function hwOf(k) { return k <= n ? G.hw[k] : G.hwc; }
  var spoolTop = G.spY, ropeSide, ropeLabs = [], tags = [];
  // A rope's name, written up along it on its outer side, where nothing else runs (above the next frame out).
  function vlabel(str, xw, y0w, y1w, sd, col) {
    var o = { size: 10, weight: 600 }, len = Y(y0w) - Y(y1w), w = g.textWidth(str, o); if (!(len > w + 12)) return false;
    g.ctx.save(); g.ctx.translate(X(xw) + sd * 9, (Y(y0w) + Y(y1w)) / 2); g.ctx.rotate(-Math.PI / 2);
    g.text(str, 0, 0, Object.assign({ color: col, align: "center", base: "middle" }, o)); g.ctx.restore(); return true;
  }
  if (!cont) {
    for (k = 0; k <= n; k++) {
      var sg = k % 2 ? 1 : -1, xa = sg * (G.hw[k] + ROFF), xd = sg * (hwOf(k + 1) + ROFF), ya = k ? stageBot(k - 1) + TUBE : spoolTop, tp = stageTop(k) + 0.45, yd = stageBot(k + 1) + 0.4;
      var st = k === 0 ? { color: c.gold } : k % 2 ? { color: c.s3 } : { color: c.accent, dash: [7, 4] };
      rope([[xa, ya], [xa, tp], [xd, tp], [xd, yd], [sg * hwOf(k + 1), yd]], st);
      pulley(xa, tp - 0.45); pulley(xd, tp - 0.45);
      tags.push([xa, tp, sg, k + 1, "top"]);
      if (k) tie(xa, ya, st.color);
      ropeLabs.push({ name: k === 0 ? "drive rope" : "stage " + k + " rope", x: xa, y0: k ? Math.max(ya, stageTop(k - 1)) + 0.6 : G.spY + G.Rs + 1.5, y1: tp - 1, sd: sg, col: k === 0 ? c.text2 : st.color, key: k === 0 ? { col: c.gold, txt: "drive rope" } : { col: st.color, dash: st.dash, txt: "stage " + k + " rope" } });
      tie(sg * hwOf(k + 1), yd, st.color);
      if (k === n) ropeSide = sg;
    }
  } else {
    // Laced: up outside the frame, over the top, down to the bottom of the next stage, across, up its far side...
    var lifting = moving && !stalled ? n - sct : -1, pul = [], segs = [], prev = [-(G.hw[0] + ROFF), spoolTop];
    for (k = 0; k <= n; k++) {
      var sd = k % 2 ? 1 : -1, xUp = sd * (G.hw[k] + ROFF), xDn = -sd * (hwOf(k + 1) + ROFF), tp2 = stageTop(k) + 0.45, pts = [prev];
      if (k) { var yb2 = stageBot(k) - 0.45; pts.push([xUp, yb2]); pul.push([xUp, yb2 + 0.45]); tags.push([xUp, yb2 + 0.45, sd, 2 * k, "side"]); }
      pts.push([xUp, tp2], [xDn, tp2]); pul.push([xUp, tp2 - 0.45], [xDn, tp2 - 0.45]); tags.push([xUp, tp2, sd, 2 * k + 1, "top"]);
      // The rope from the spool to the first pulley is the drive rope.
      if (k === 0) { segs.push({ pts: pts.slice(0, 2), color: c.gold }); segs.push({ pts: pts.slice(1), color: c.s3 }); } else segs.push({ pts: pts, color: c.s3 });
      var down = k < n ? [[xDn, tp2], [xDn, stageBot(k + 1) - 0.45]] : [[xDn, tp2], [xDn, stageBot(n + 1) + G.carH * 0.85], [xDn < 0 ? -G.hwc : G.hwc, stageBot(n + 1) + G.carH * 0.85]];
      segs.push({ pts: down, color: c.s3, width: k === lifting ? rw * 2.4 : rw });
      prev = down[down.length - 1];
      if (k === n) ropeSide = xDn < 0 ? -1 : 1;
    }
    segs.forEach(function (sgm) { rope(sgm.pts, sgm); });
    pul.forEach(function (p) { pulley(p[0], p[1]); });
    tie(prev[0], prev[1], c.s3);
    ropeLabs.push({ name: "drive rope", x: -(G.hw[0] + ROFF), y0: G.spY + G.Rs + 1.5, y1: stageTop(0) - 0.5, sd: -1, col: c.text2, key: { col: c.gold, txt: "drive rope" } });
  }
  // Name each rope where it runs; one with no room goes in the key instead.
  // On a phone the ropes are named in the key, not sideways along them (the drawing is too narrow for both).
  void ropeLabs; void vlabel;
  /* Each pulley's number, in a small circle beside it: the same numbers as in the rope diagram under the answers.
     "top": above the rope where it turns over the pulley, a little outward; "side": out beside the pulley. */
  var tr = phone ? 6 : 7;
  tags.forEach(function (tg) {
    var px = X(tg[0]) + tg[2] * (tg[4] === "top" ? tr + 4 : tr + rp + 4), py = tg[4] === "top" ? Y(tg[1]) - tr - 4 : Y(tg[1]);
    g.circle(px, py, tr, { fill: c.sheet, stroke: c.text2, width: 1.25 });
    g.text(String(tg[3]), px, py + 0.5, { size: phone ? 9 : 10, weight: 700, color: c.text, align: "center", base: "middle", halo: false });
  });
  // Carriage and its load.
  var cb = G.carBot + hNow[n];
  rect(-G.hwc, cb, G.hwc, cb + G.carH, { fill: c.part2, stroke: stalled ? c.bad : c.partLine, width: stalled ? 2 : 1, radius: 2 });
  g.ball(X(0), Y(cb + G.carH / 2), L(Math.min(2.95, G.hwc - 0.4, G.carH / 2 - 0.3)), 0.5, {});
  // Spool and motor at the bottom left: the spool turns as the rope winds on.
  rect(G.motX - 2.4, G.yb, G.motX, G.yb + 4.6, { fill: c.text2, stroke: null, radius: 3 });
  var spa = -ropeIn / G.Rs;
  g.circle(X(G.spX), Y(G.spY), L(G.Rs), { fill: c.part, stroke: c.partLine, width: 1 });
  for (i = 0; i < 3; i++) { var a = spa + i * 2 * Math.PI / 3; g.line(X(G.spX), Y(G.spY), X(G.spX) + Math.cos(a) * L(G.Rs) * 0.85, Y(G.spY) + Math.sin(a) * L(G.Rs) * 0.85, { color: c.partLine, width: 1.25 }); }
  var motorName = F.motor(s.motor).name, cap = Math.round(s.motors) + " × " + motorName + ", " + K.fix(s.ratio, 2) + ":1";
  // The motor's caption: left of it on a laptop, under the floor on a phone, never touching it.
  if (phone) g.text(cap, Math.max(8, X(G.motX - 2.4)), Y(0) + 20, { size: 11, color: c.text2 });
  else g.text(cap, X(G.motX - 2.4) - 10, Y(G.yb + 2.3), { size: 11, color: c.text2, align: "right", base: "middle" });
  // Height of the carriage: a dimension from where it starts.
  var dx = G.hw[0] + 1.8;
  if (hNow[n] > 0.6) {
    g.line(X(G.hwc), Y(cb), X(dx + 0.6), Y(cb), { color: c.mute, width: 1, dash: [3, 3] });
    g.dim(X(dx), Y(G.carBot), X(dx), Y(cb), K.fix(hNow[n], 1) + " in", 0, { side: "right" });
  }
  // Weight on the carriage (down) and spring (up), on the side away from the carriage's rope.
  /* The weight's arrow hangs from the carriage's underside (clear of the piece it carries), on the side away from its
     rope; its label sits beside the arrow, under the carriage, joined to it by a short leader. */
  var away = -(ropeSide || -1), wLb = s.carLb * Math.cos(s.tilt * Math.PI / 180), ax = X(0) + away * L(G.hwc) * 0.55, cy = Y(cb);
  var wLen = Math.max(18, Math.min(60, L(wLb * 0.45), Y(G.yb) - 2 - cy));
  g.arrow(ax, cy, ax, cy + wLen, { color: c.force, width: 2.5 });
  function side(str, py, color, lead) { var tx = ax + away * (lead ? 14 : 6); if (lead) g.line(ax + away * 2, py, tx - away * 3, py, { color: color, width: 1 }); g.text(str, tx, py, { color: color, weight: 700, align: away > 0 ? "left" : "right", base: "middle" }); }
  // The weight's label sits under the arrow's tip, inside the frames, clear of every rope.
  // Beside the arrow, on the side away from the rope, at a height where no frame's cross tube runs (they are lines).
  var tubes = []; for (i = 0; i <= n; i++) { var lift = i ? hNow[i - 1] : 0; tubes.push(Y(G.bot[i] + lift), Y(G.bot[i] + lift + TUBE), Y(G.bot[i] + lift + G.len[i]), Y(G.bot[i] + lift + G.len[i] - TUBE)); }
  tubes.push(Y(cb), Y(cb + G.carH));
  var wy = cy + wLen * 0.55, tries2 = [0, -8, 8, -14, 14];
  for (var tq = 0; tq < tries2.length; tq++) { var yy2 = cy + wLen * 0.55 + tries2[tq]; if (yy2 > cy + 8 && yy2 < cy + wLen && !tubes.some(function (ty) { return Math.abs(ty - yy2) < 9; })) { wy = yy2; break; } }
  // On a phone the tower is too narrow for a label beside the arrow: the read-out names the weight instead.
  // The label goes toward the middle, under the carriage, where no rope runs (the ropes are at the sides).
  if (!phone) { var wtx = ax - away * 12, wt = lbs(s.carLb) + " lb"; g.line(ax - away * 2, wy, wtx + away * 3, wy, { color: c.force, width: 1 }); g.text(wt, wtx, wy, { color: c.force, weight: 700, align: away > 0 ? "right" : "left", base: "middle" }); }
  if (s.spring > 0) {
    var sl = Math.max(18, Math.min(70, L(s.spring * 0.45)));
    var sy0 = Y(cb + G.carH / 2);
    g.arrow(ax, sy0, ax, sy0 - sl, { color: c.ok, width: 2.5 });
    side((phone ? "" : "spring ") + lbs(s.spring) + " lbf", sy0 - sl * 0.6, c.ok);
  }
  // Speed of every moving part, side by side on the right, each at its part's top, each with its own label.
  var vmax = Math.max(1e-6, r.topV / IN, r.topVDown / IN), lane0 = G.hw[0] + 3.4, labs = [];
  var colX = X(lane0 + 1.5 * n + 0.6) + (phone ? 8 : 12);
  for (i = 0; i <= n; i++) {
    var lx = X(lane0 + 1.5 * (i + 1) - 1.5 + (i === n ? 0.6 : 0)), ytop = Y(i < n ? stageTop(i + 1) : cb + G.carH), sp = vNow[i];
    var mv = moving && Math.abs(sp) > 0.5, x0e = i < n ? X(G.hw[i + 1]) : X(G.hwc);
    // Every part is named at its own top, moving or not; a moving one also gets its speed (and an arrow, below).
    labs.push({ y: ytop, x0: mv ? lx : x0e, xe: x0e, lx: lx, name: i === n ? "carriage" : "stage " + (i + 1), sp: mv ? Math.abs(sp) : 0, dn: sp < 0, main: i === n });
  }
  /* Parts that move at the same speed (continuous rigging, once a stage has joined) share one label, "carriage and
     stage 2, moving together, 60 in/s", at the top one of them, so three equal numbers do not read as an error. */
  var groups = [];
  labs.forEach(function (lb) {
    var gp = lb.sp > 0 && groups.filter(function (q) { return q.sp > 0 && Math.abs(q.sp - lb.sp) < 0.5; })[0];
    if (gp && cont) { gp.names.push(lb.name); gp.ys.push(lb.y); gp.xs.push(lb.x0); gp.main = gp.main || lb.main; }
    else groups.push({ names: [lb.name], ys: [lb.y], xs: [lb.x0], sp: lb.sp, main: lb.main });
  });
  // One arrow for each group, at the top part of it: parts moving together get one arrow and one label.
  groups.forEach(function (gp) {
    if (!(gp.sp > 0)) return;
    var j = gp.ys.indexOf(Math.min.apply(null, gp.ys)), lb = labs.filter(function (q) { return q.y === gp.ys[j]; })[0], yt = gp.ys[j];
    var len = Math.max(8, (phone ? 52 : 64) * gp.sp / vmax) * (lb && lb.dn ? 1 : -1);
    g.line(lb ? lb.xe : gp.xs[j], yt, gp.xs[j], yt, { color: c.ghost, width: 1, dash: [2, 3] });
    g.arrow(gp.xs[j], yt, gp.xs[j], yt + len, { color: c.s1, width: gp.main ? 3 : 2, head: gp.main ? 9 : 7 });
    gp.ys = [yt]; gp.xs = [gp.xs[j]];
  });
  var colW = g.w - colX - 4, lo = { size: 11, weight: 600 };
  groups.forEach(function (gp) {
    gp.y = Math.min.apply(null, gp.ys);
    var head = gp.names.length > 1 ? gp.names.slice().reverse().join(" and ") : gp.names[0];
    // A number keeps its unit on its line (a no-break space between them); a phone drops "moving".
    var spd = K.n(gp.sp, 0) + "\u00a0in/s", words = gp.sp > 0 ? (gp.names.length > 1 ? [gp.names.slice().reverse().join(" + ") + ": " + spd] : [head + ": " + spd]) : [head];
    gp.lines = []; words.forEach(function (wd) { gp.lines = gp.lines.concat(wrap(g, wd, colW, lo)); });
  });
  // Each label on its own lines, at its part's height, pushed down (then all up, at the bottom) so no two share a line.
  groups.sort(function (a, b) { return a.y - b.y; });
  for (i = 0; i < groups.length; i++) { groups[i].ty = groups[i].y; if (i) { var prevB = groups[i - 1].ty + 13 * groups[i - 1].lines.length + 4; if (groups[i].ty < prevB) groups[i].ty = prevB; } }
  var last = groups[groups.length - 1], over = last ? last.ty + 13 * (last.lines.length - 1) - (g.h - 8) : 0;
  if (over > 0) groups.forEach(function (gp) { gp.ty -= over; });
  groups.forEach(function (gp) {
    var ink = gp.sp > 0 ? c.s1 : c.text2;
    gp.ys.forEach(function (yy, j) { g.path([[gp.xs[j] + 3, yy], [colX - 8, yy], [colX - 3, gp.ty]], { color: c.ghost, width: 1, dash: [2, 3] }); });
    gp.lines.forEach(function (ln, j) { g.text(ln, colX, gp.ty + 13 * j, { size: 11, weight: gp.main || j ? 700 : 600, color: ink, base: "middle" }); });
  });
  // The read-out: what is happening, the current, the battery, and the key to the ropes.
  g.text(title, hx, hy, { size: 14, weight: 700, color: stalled ? c.bad : c.text });
  l2.forEach(function (ln, j) { g.text(ln, hx, hy + 17 + 14 * j, { size: 11, color: c.text2 }); });
  var my = hy + 17 + 14 * l2.length + 12, ny;
  if (phone) {
    // Thin meters on a phone: the current and the battery, each a word, a number and a bar 3 px high.
    var mw = (hudW - 14) / 2;
    meter(g, hx, my, mw, "Current per motor", K.fix(amps, 0) + " of " + s.statorA + " A", amps / s.statorA, amps >= s.statorA - 0.5 ? "warn" : "", 3);
    meter(g, hx + mw + 14, my, mw, "Battery", K.fix(Math.max(0, volts), 1) + " V", (volts - 6) / (s.vbat - 6), volts < 7 ? "bad" : volts < 8 ? "warn" : "", 3);
    g.arrow(hx + 4, my + 20, hx + 4, my + 32, { color: c.force, width: 2.5, head: 6 });
    g.text("carriage and load, " + lbs(s.carLb) + " lb", hx + 14, my + 26, { size: 11, weight: 700, color: c.force, base: "middle" });
    ny = my + 46;
  } else {
    meter(g, hx, my, hudW, "Current per motor", K.fix(amps, 0) + " of " + s.statorA + " A", amps / s.statorA, amps >= s.statorA - 0.5 ? "warn" : "");
    meter(g, hx, my + 32, hudW, "Battery", K.fix(Math.max(0, volts), 1) + " V", (volts - 6) / (s.vbat - 6), volts < 7 ? "bad" : volts < 8 ? "warn" : ""); ny = my + 64;
  }
  // One line of the key: a sample of the rope (or the square) and its words, wrapped to the column.
  function key(kk, kx, ky) {
    if (kk.sq) g.rect(kx + 5, ky - 3.5, 7, 7, { fill: c.text2, stroke: null });
    else if (kk.col2) { g.line(kx, ky - 3, kx + 16, ky - 3, { color: kk.col, width: 2.5 }); g.line(kx, ky + 3, kx + 16, ky + 3, { color: kk.col2, width: 2.5, dash: [5, 3] }); }
    else g.line(kx, ky, kx + 16, ky, { color: kk.col, width: kk.wide ? 5 : 2.5, dash: kk.dash ? [5, 3] : null });
    var ln = wrap(g, kk.txt, hudW - 22, { size: ks });
    ln.forEach(function (t1, j) { g.text(t1, kx + 22, ky + j * (ks + 3), { size: ks, color: c.text2, base: "middle" }); });
    return ln.length * (ks + 3) + (phone ? 4 : 5);
  }
  {
    if (bl.length) { var bw2 = wrap(g, badMsg, hudW, { size: 12, weight: 600 }); bw2.forEach(function (ln, j) { g.text(ln, hx, ny + 15 * j, { size: 12, weight: 600, color: c.bad }); }); ny += 15 * bw2.length + 6; }
    if (s.tilt > 0) { var tl = wrap(g, "Leaning " + K.fix(s.tilt, 0) + "° back, so it lifts " + K.fix(Math.cos(s.tilt * Math.PI / 180) * 100, 0) + "% of the weight", hudW, { size: 11 }); tl.forEach(function (ln, j) { g.text(ln, hx, ny + 2 + 14 * j, { size: 11, color: c.mute }); }); ny += 14 * tl.length + 8; }
  }
  void key;
  // The rope diagram under the drawing marks the part that is lifting now (continuous rigging).
  var rd = document.getElementById("el-ropes");
  if (rd) { var nowPart = cont && moving && !stalled && ph === "up" ? (sct === 0 ? "c" : String(n - sct + 1)) : ""; if (rd.getAttribute("data-now") !== nowPart) { rd.setAttribute("data-now", nowPart); Array.prototype.forEach.call(rd.querySelectorAll(".lift"), function (q) { q.classList.toggle("now", q.getAttribute("data-part") === nowPart); }); } }
  K.chartNow("el-h", t); K.chartNow("el-v", t); K.chartNow("el-a", t);
}
// Speed of each part (in/s), stage 1..n then the carriage, from the rope's speed.
function speeds(mod, x, v, n) {
  var dx = 1e-5, h0 = mod.heights(x), h1 = mod.heights(x + (v >= 0 ? dx : -dx)), out = [];
  for (var i = 0; i <= n; i++) out.push((h1[i] - h0[i]) / dx * Math.abs(v) / IN);
  return out;
}

// The chart above "Time to top" gets a little room; everything else comes from the kit.
var st = document.createElement("style");
st.textContent = ".t-elevator-sweep { display: grid; gap: 8px; } .t-elevator-sweep > p { max-width: 72ch; color: var(--text-2); font-size: .92rem; } .t-elevator-cap { max-width: 72ch; color: var(--text-2); font-size: .88rem; margin: 4px 0 0; }" +
  " .t-elevator-ropes { margin: 12px 0 0; } .t-elevator-ropes summary { font-size: .92rem; font-weight: 700; cursor: pointer; } .t-elevator-ropes .sub { font-size: .82rem; color: var(--text-2); margin: 4px 0 6px; } .t-elevator-ropes .pn { font-size: 9.5px; font-weight: 700; text-anchor: middle; fill: var(--text); }" +
  " .t-elevator-ropes .cols { display: flex; flex-wrap: wrap; gap: 4px 18px; } .t-elevator-ropes svg { display: block; max-width: 100%; height: auto; overflow: visible; }" +
  " .t-elevator-ropes text { font-size: 11.5px; fill: var(--text-2); } .t-elevator-ropes .hd { font-weight: 700; fill: var(--text); } .t-elevator-ropes .mx { font-weight: 700; fill: var(--text); }" +
  " .t-elevator-ropes .rp { fill: none; stroke-width: 3; } .t-elevator-ropes .ar { stroke-width: 2.5; } .t-elevator-ropes .pul { fill: var(--sheet); stroke: var(--part-line); stroke-width: 1.5; }" +
  " .t-elevator-ropes .nowtag { display: none; text-anchor: end; } .t-elevator-ropes .lift.now text { fill: var(--accent); font-weight: 700; } .t-elevator-ropes .lift.now .nowtag { display: inline; }";
document.head.appendChild(st);
})(typeof window !== "undefined" ? window : this);
