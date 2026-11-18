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
  var T = [], X = [], Vv = [], A = [], B = [];
  var segs = [];
  function add(sim, t0, endA, endV) {
    var a = T.length, L = sim.t.length - 1;
    for (var k = 0; k <= L; k++) { T.push(t0 + sim.t[k]); X.push(sim.x[k]); Vv.push(sim.v[k]); A.push(k === L && endA != null ? endA : sim.statorA[k]); B.push(k === L && endV != null ? endV : sim.volts[k]); }
    segs.push([a, T.length]);
  }
  var tEnd = r.up.t[r.up.t.length - 1], vHold = V0 - s.rbat * r.holdSupply;
  add(r.up, 0, r.reached ? r.hold.statorA : s.statorA, r.reached ? vHold : null);
  if (r.reached) {
    r.tUp = r.up.time; r.tHold = r.tUp + 0.5;
    segs.push([T.length, T.length + 2]); T.push(r.tUp + 1e-4, r.tHold); X.push(top, top); Vv.push(0, 0); A.push(r.hold.statorA, r.hold.statorA); B.push(vHold, vHold);
    if (r.down) add(r.down, r.tHold + 1e-4);
    r.duration = T[T.length - 1];
  } else {
    // Stalled: it stays where it stopped, the motors pushing at the limit.
    r.tUp = tEnd; r.tHold = tEnd;
    // The battery sags under the stalled motors' current, as it would on the robot.
    var vStall = V0 - s.rbat * dr.at(0, V0, 1).supplyA;
    var xs = X[X.length - 1]; segs.push([T.length, T.length + 2]); T.push(tEnd + 1e-4, tEnd + 1.2); X.push(xs, xs); Vv.push(0, 0); A.push(s.statorA, s.statorA); B.push(vStall, vStall);
    r.duration = tEnd + 1.2; r.stallX = xs;
  }
  r.T = T; r.X = X; r.V = Vv; r.A = A; r.B = B;
  var sims = [r.up].concat(r.down ? [r.down] : []);
  r.peakA = Math.max.apply(null, sims.map(function (m) { return m.peakA; }));
  r.minV = Math.min.apply(null, sims.map(function (m) { return m.minV; }).concat(r.reached ? [] : [B[B.length - 1]]));
  r.topV = Math.max.apply(null, sims.map(function (m) { return m.maxV; })) * mod.gain;       // carriage m/s
  r.timeUp = r.up.time; r.timeDown = r.down ? r.down.time : Infinity;
  // Feedforward for the carriage, in metres: volts = kS + kG + kV v + kA a.
  r.kG = (r.holdLoad < 0 ? -1 : 1) * r.hold.volts;
  r.kV = dr.kV / (rS * mod.gain);
  // Continuous rigging: kG and kA change as each stage joins, so both are given per section (the carriage alone, then
  // with each stage). The single kG and kA are the last section's, with every stage moving.
  r.kA = dr.kA(mod.mass(top) * rS * rS) / (rS * mod.gain);
  r.mPerRot = 2 * Math.PI * rS * mod.gain / dr.ratio;
  if (r.rig === "continuous") {
    r.kGs = []; r.kAs = [];
    for (i = 0; i <= n; i++) { var xm = (i + 0.5) * mod.seg; r.kGs.push((mod.load(xm) < 0 ? -1 : 1) * dr.hold(mod.load(xm) * rS).volts); r.kAs.push(dr.kA(mod.mass(xm) * rS * rS) / (rS * mod.gain)); }
  }
  // Charts, in inches.
  var gain = mod.gain;
  // Thinned a stretch at a time, so the jump from moving to holding stays sharp.
  function chart(Y) { var out = []; segs.forEach(function (g) { out = out.concat(thin(T.slice(g[0], g[1]), Y.slice(g[0], g[1]), 90)); }); return out; }
  r.chH = chart(X.map(function (x) { return mod.heights(x)[n] / F.IN; }));
  r.chV = chart(Vv.map(function (v) { return v * gain / F.IN; }));
  r.chA = chart(A);
  // Time to top for other reductions.
  var lo = Math.min(3, s.ratio), hi = Math.max(40, s.ratio), N = 60, best = null;
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
  r.best = best;
  return r;
};

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The page ---------- */
var K = D.calc, ID = "tool-elevator", IN = F.IN;
function lbs(x) { return K.n(x, Math.abs(x) >= 100 || Math.abs(x - Math.round(x)) < 0.05 ? 0 : 1); }
function secs(x) { return isFinite(x) ? K.fix(x, 2) : "–"; }

K.tool({
  id: ID,
  defaults: { stages: 2, rig: "cascade", travel: 55, carLb: 14, stageLb: 5, motor: "kraken60", motors: 2, ratio: 9, statorA: 60, eff: 90, spool: 1.75, tilt: 0, spring: 0, vbat: 12.3, rbat: 0.02 },
  stage: { ratio: 1.3, narrow: 1.0, label: "The elevator from the front, to scale, with its stages, ropes and carriage, rising and coming back down as simulated." },
  autoplay: true, speed: 0.25,
  compute: M.compute,
  duration: function (s, r) { return r && isFinite(r.duration) ? r.duration : 1; },
  // At rest the drawing shows the lift holding at the top, the pose the answers are about.
  rest: function (s, r) { return r && r.reached && isFinite(r.tUp) ? r.tUp + 0.25 : null; },
  hints: function (s, r) {
    var seg = s.travel / r.n, txt;
    var n1 = r.n + 1, sumK = 0, kk; for (kk = 1; kk <= r.n; kk++) sumK += kk;
    var pullCas = n1 * s.carLb + sumK * s.stageLb, pullCon = s.carLb + r.n * s.stageLb;     // lb of rope pull to hold it at the top
    if (r.rig === "cascade") txt = "Cascade: all " + n1 + " parts rise at once, so " + K.fix(s.travel / n1, 1) + " in of rope lifts the carriage " + K.fix(s.travel, 1) + " in. The price is pull: the rope holds " + K.n(pullCas, 0) + " lb (the carriage " + n1 + " times over, plus the stages). Continuous would hold " + K.n(pullCon, 0) + " lb.";
    else txt = "Continuous: one rope lifts one part at a time, the lightest first, so " + K.fix(s.travel, 1) + " in of rope lifts the carriage " + K.fix(s.travel, 1) + " in. The pull is small: " + K.n(s.carLb, 0) + " lb while only the carriage moves, " + K.n(pullCon, 0) + " lb at the top with every stage hanging on it. Cascade would hold " + K.n(pullCas, 0) + " lb.";
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
    else if (holdA > 0.6 * lim) v = K.verdict("warn", "Holds with little to spare: holding at the top takes " + K.fix(holdA, 0) + " A of the " + lim + " A limit, so the motors heat up. Use a bigger reduction or a constant-force spring.");
    else v = K.verdict("ok", "Reaches the top in " + secs(r.timeUp) + " s and holds there with " + K.fix(holdA, 0) + " A of the " + lim + " A limit.");
    var vin = r.topV / IN;
    return v + K.outs([
      { k: "Time to top", v: secs(r.timeUp), u: "s", state: r.reached ? "" : "bad" },
      { k: "Time down", v: secs(r.timeDown), u: "s" },
      { k: "Top speed", v: K.n(vin, 0), u: "in/s", sub: K.fix(r.topV, 2) + " m/s", tip: "The carriage's fastest, up or down." },
      { k: "Peak current", v: K.fix(r.peakA, 0), u: "A", sub: "per motor, briefly, while it speeds up", tip: "The stator current in each motor. It sits at the limit while the motors are working hardest." },
      { k: "Lowest battery", v: K.fix(Math.max(0, r.minV), 1), u: "V", state: r.minV < 7 ? "bad" : r.minV < 8 ? "warn" : "", tip: "The battery voltage at its lowest during the move, with the resistance in Fine tuning." },
      { k: "Holding at the top", v: K.fix(holdA, 1), u: "A", sub: "per motor, " + K.fix(r.hold.volts, 2) + " V", state: holdA > 0.6 * lim ? "warn" : "", tip: "The current that holds the carriage still at the top. Continuous rigging is heaviest there, with every stage on the rope." },
      { k: "Heaviest it holds", v: r.maxCarLb > 0 ? lbs(r.maxCarLb) : "none", u: r.maxCarLb > 0 ? "lb" : "", sub: "carriage with its load, at " + lim + " A. " + (r.rig === "cascade" ? "Cascade: the rope feels it " + (r.n + 1) + " times over" : "Continuous: the rope feels it once"), tip: "The heaviest carriage this gearbox holds at the top with the motors at the current limit." }
    ]) + K.outs([
      { k: r.rig === "continuous" ? "kG, last section" : "kG", v: K.fix(r.kG, 3), u: "V", tip: "Volts that hold the carriage against gravity." + (r.rig === "continuous" ? " With continuous rigging it grows as each stage joins; this is the last section, with every stage moving. The code below gives every section's." : "") },
      { k: "kV", v: K.fix(r.kV, 3), u: "V s/m", tip: "Volts per metre per second of carriage speed." },
      { k: r.rig === "continuous" ? "kA, last section" : "kA", v: K.fix(r.kA, 4), u: "V s²/m", tip: "Volts per metre per second squared of carriage acceleration." + (r.rig === "continuous" ? " With continuous rigging it grows as each stage joins; this is the last section, with every stage moving. The code below gives every section's." : "") }
    ]);
  },

  more: function (s, r) {
    var out = '<div class="chartrow">' +
      K.chart({ id: "el-h", title: "Carriage height", x: { label: "time (s)", unit: "s", name: "Time" }, y: { label: "in", unit: "in", min: 0 }, series: [{ name: "Height", pts: r.chH }] }) +
      K.chart({ id: "el-v", title: "Carriage speed", x: { label: "time (s)", unit: "s", name: "Time" }, y: { label: "in/s", unit: "in/s" }, series: [{ name: "Speed", pts: r.chV, color: 3 }] }) + "</div>";
    out += K.chart({ id: "el-a", title: "Current in each motor", x: { label: "time (s)", unit: "s", name: "Time" }, y: { label: "A", unit: "A", min: 0, max: Math.max(s.statorA * 1.15, r.peakA * 1.05, 10) }, series: [{ name: "Current", pts: r.chA, color: 2 }], hlines: [{ y: s.statorA, label: "Limit " + s.statorA + " A" }] });
    var bestTxt = r.best ? (r.reached && r.timeUp <= r.best[1] + 0.015 ? "Yours, " + K.fix(s.ratio, 1) + ":1, is as fast as any reduction here: " + K.fix(r.timeUp, 2) + " s to the top." : "Fastest at about " + K.fix(r.best[0], 1) + ":1, " + K.fix(r.best[1], 2) + " s to the top." + (r.reached ? " Yours, " + K.fix(s.ratio, 1) + ":1, takes " + K.fix(r.timeUp, 2) + " s." : " Yours, " + K.fix(s.ratio, 1) + ":1, cannot lift it.")) : "No reduction from 3:1 to 40:1 lifts this load with these motors.";
    var dots = r.reached ? [{ x: s.ratio, y: r.timeUp, label: "yours" }] : [];
    out += '<div class="t-elevator-sweep"><p>' + D.esc(bestTxt) + " A bigger reduction holds with less current but is slower; a smaller one is quicker until the current limit caps the torque.</p>" +
      K.chart({ id: "el-sweep", title: "Time to top for other reductions", x: { label: "reduction (:1)", unit: ": 1", name: "Reduction" }, y: { label: "s", unit: "s", min: 0 }, series: [{ name: "Time to top", pts: r.sweep }], marks: [{ x: s.ratio, label: K.fix(s.ratio, 1) + ":1" }], dots: dots }) + "</div>";
    var code = "// Elevator feedforward, carriage position in metres (" + r.n + " moving " + (r.n > 1 ? "stages" : "stage") + ", " + r.rig + ")\n" +
      "public static final double kG = " + K.fix(r.kG, 3) + "; // volts" + (r.kGs ? ", last section" : "") + "\n" +
      "public static final double kV = " + K.fix(r.kV, 3) + "; // volts per (m/s)\n" +
      "public static final double kA = " + K.fix(r.kA, 4) + "; // volts per (m/s^2)" + (r.kAs ? ", last section" : "") + "\n" +
      "public static final double kMetersPerMotorRotation = " + K.fix(r.mPerRot, 5) + ";" +
      (r.kGs ? "\n// Continuous rigging: each section, the carriage alone first, then as each stage joins\n" +
        "public static final double[] kGBySection = { " + r.kGs.map(function (x) { return K.fix(x, 3); }).join(", ") + " }; // volts\n" +
        "public static final double[] kABySection = { " + r.kAs.map(function (x) { return K.fix(x, 4); }).join(", ") + " }; // volts per (m/s^2)" : "");
    out += '<section class="ctab"><h2>For robot code</h2>' + K.code("el-ff", code, "Copy the constants") + "</section>";
    var n = r.n, sk = "", sk2 = "";
    for (var k = 1; k <= n; k++) { var mk = "m<sub>" + k + "</sub>"; sk += (k > 1 ? " + " : "") + (k > 1 ? k + " " : "") + mk; sk2 += (k > 1 ? " + " : "") + (k > 1 ? k * k + " " : "") + mk; }
    out += K.notes(
      "<p>The motor turns a spool, the spool winds in rope, and the rope lifts the stages. Everything here is about what the motor feels at the rope: how hard it has to pull, and how much mass it has to speed up.</p>" +
      "<p><b>Cascade.</b> Each stage carries its own short rope from the stage below it, over a pulley at its top, to the bottom of the stage above. So every stage moves at once: with " + n + " moving " + (n > 1 ? "stages" : "stage") + ", stage k moves k times as far as the drive rope and the carriage " + (n + 1) + " times. By virtual work (force times distance is the same at the rope as at the parts):</p>" +
      '<p class="eq">rope force = g × (' + (n + 1) + " m<sub>c</sub> + " + sk + ")</p>" +
      '<p class="eq">mass at the rope = ' + (n + 1) * (n + 1) + " m<sub>c</sub> + " + sk2 + "</p>" +
      "<p>m<sub>c</sub> is the carriage with its load and m<sub>k</sub> each stage. The rope pulls " + (n + 1) + " times the carriage's weight but moves only 1/" + (n + 1) + " as far.</p>" +
      "<p><b>Continuous.</b> One rope is laced over the top of every stage and under the bottom of the next. The rope only lifts the carriage; the carriage picks up the stage it rides in when it reaches that stage's hard stop, and so on down. So the carriage moves first, then each stage joins, and the load on the rope steps up each time:</p>" +
      '<p class="eq">rope force = g × (m<sub>c</sub> + the stages already moving), rope travel = carriage travel</p>' +
      "<p>The total work to reach the top is the same for both riggings. Cascade pulls harder over a shorter rope; continuous pulls more gently at first over a longer one.</p>" +
      "<p><b>Motion.</b> The simulation drives the motors at full voltage up to the current limit, then reverses them to stop exactly at the top, in steps of 2 ms (finer for a light lift behind a big reduction). Each step uses the motor's torque at its speed (from the motor's stall torque, free speed and resistance), the battery's sag (its resistance times the current drawn), gravity and the mass above. It does the same on the way down.</p>" +
      '<p class="eq">rope tension = motor torque × reduction × motors × efficiency ÷ spool radius</p>' +
      "<p>Tilt multiplies gravity by cos(tilt). A constant-force spring counts as taking that much weight off the carriage.</p>" +
      "<p><b>Feedforward.</b> kG is the voltage that holds still against gravity: the holding current times the motor's resistance. kV comes from the motor's back-EMF and kA from the mass the motor feels, both turned into metres of carriage travel. With continuous rigging the load and the mass step up as each stage joins, so kG and kA are given for each section; the single figures are the last section's. Tune them on the robot: friction (kS) is not modelled.</p>" +
      "<p><b>Left out.</b> Friction in the bearings beyond the efficiency figure, rope stretch, the time a motor controller takes to respond, and the jolt as each continuous stage hits its hard stop. A real robot is a little slower than this.</p>");
    return out;
  },

  draw: draw
});

/* ---------- The drawing ---------- */
var STEP = 2.2, TUBE = 0.75;
// Where everything sits at rest, in inches. y = 0 is the floor, x = 0 the elevator's centre line.
function geo(s, n) {
  var seg = s.travel / (n + 1), hw = [], bot = [], len = [], i;
  for (i = 0; i <= n; i++) hw.push(11.5 - STEP * i);
  var yb = 4.25, Hf = Math.max(20, seg + 9 + 1.5 * n);
  for (i = 0; i <= n; i++) { bot.push(yb + 0.75 * i); len.push(Hf - 1.5 * i); }
  var Rs = Math.max(0.05, s.spool) / 2, spX = -(hw[0] + 0.72) - Rs;
  return { seg: seg, hw: hw, hwc: hw[n] - STEP, yb: yb, Hf: Hf, bot: bot, len: len, carBot: bot[n] + TUBE + 0.25, carH: 7, Rs: Rs, spX: spX, spY: yb + Rs + 0.5, motX: spX - Rs - 0.4 };
}
function phaseAt(r, t) {
  if (!r.reached) return t < r.tUp - 0.02 ? "up" : "stall";
  if (t < r.tUp) return "up"; if (t < r.tHold) return "hold"; if (t < r.duration - 1e-3) return "down"; return "end";
}
function wrap(g, str, maxW, o) { var words = str.split(" "), lines = [], cur = ""; words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (cur && g.textWidth(t, o) > maxW) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines; }
// A small meter: label, value, and a bar that fills. state "bad" | "warn" colours it.
function meter(g, x, y, w, label, value, frac, state) {
  var c = g.c;
  // A narrow drawing gets the short label, so the two never run into each other.
  if (g.textWidth(label, { size: 11, weight: 600 }) + g.textWidth(value, { size: 11, weight: 700 }) + 10 > w) label = label.split(" ")[0];
  g.text(label, x, y, { size: 11, color: c.text2, weight: 600 }); g.text(value, x + w, y, { size: 11, color: state === "bad" ? c.bad : state === "warn" ? c.warn : c.text, weight: 700, align: "right" });
  g.rect(x, y + 5, w, 6, { fill: c.line, stroke: null, radius: 3 });
  g.rect(x, y + 5, Math.max(0, Math.min(1, frac)) * w, 6, { fill: state === "bad" ? c.bad : state === "warn" ? c.warn : c.s1, stroke: null, radius: 3 });
}

function draw(g, s, r, t) {
  var c = g.c, n = r.n, G = geo(s, n), mod = r.mod, i;
  // Where the parts are now.
  var x = F.interp(r.T, r.X, t), v = F.interp(r.T, r.V, t), amps = F.interp(r.T, r.A, t), volts = F.interp(r.T, r.B, t), ph = phaseAt(r, t);
  var hNow = mod.heights(x).map(function (h) { return h / IN; });                 // [stage 1..n, carriage], inches
  var vNow = speeds(mod, x, v, n);                                                  // in/s for the same parts
  var ropeIn = x / IN;
  // The view: the whole elevator at full height, the robot under it, room for the arrows on the right.
  var topY = G.bot[0] + G.len[0];
  for (i = 1; i <= n; i++) topY = Math.max(topY, G.bot[i] + G.len[i] + i * G.seg);
  topY = Math.max(topY, G.carBot + s.travel + G.carH) + 2.5;
  var hudW = Math.min(176, Math.max(132, g.w * 0.3));
  var right = G.hw[0] + 3.2 + 1.5 * (n + 1);
  var V = g.view({ x0: Math.min(-18, G.motX - 3.2), x1: right + 1, y0: -0.5, y1: topY }, { l: hudW + 24, r: 64, t: 26, b: 10 });
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
    rect(-hw, b, -hw + TUBE, tp, { fill: fill, stroke: c.partLine, width: 1 }); rect(hw - TUBE, b, hw, tp, { fill: fill, stroke: c.partLine, width: 1 });
    rect(-hw, tp - TUBE, hw, tp, { fill: fill, stroke: c.partLine, width: 1 }); rect(-hw, b, hw, b + TUBE, { fill: fill, stroke: c.partLine, width: 1 });
  }
  frame(0, 0, c.part2);
  for (i = 1; i <= n; i++) frame(i, hNow[i - 1], c.part);
  // Rope: gold, over small pulleys.
  var rw = Math.max(1.5, L(0.16)), rp = Math.max(2.5, L(0.45));
  function pulley(px, py) { g.circle(X(px), Y(py), rp, { fill: c.sheet, stroke: c.partLine, width: 1 }); }
  function rope(pts) { g.path(pts.map(function (p) { return [X(p[0]), Y(p[1])]; }), { color: c.gold, width: rw }); }
  function stageBot(k) { return k <= n ? G.bot[k] + (k ? hNow[k - 1] : 0) : G.carBot + hNow[n]; }
  function stageTop(k) { return G.bot[k] + (k ? hNow[k - 1] : 0) + G.len[k]; }
  function hwOf(k) { return k <= n ? G.hw[k] : G.hwc; }
  var spoolTop = G.spY;
  if (r.rig === "cascade") {
    for (var k = 0; k <= n; k++) {
      var sg = k % 2 ? 1 : -1, xa = sg * (G.hw[k] + 0.72), xd = sg * (hwOf(k + 1) + 0.72), ya = k ? stageBot(k - 1) + TUBE : spoolTop, tp = stageTop(k) + 0.45, yd = stageBot(k + 1) + 0.4;
      rope([[xa, ya], [xa, tp], [xd, tp], [xd, yd]]);
      g.line(X(xd), Y(yd), X(sg * hwOf(k + 1)), Y(yd), { color: c.gold, width: rw });
      pulley(xa, tp - 0.45); pulley(xd, tp - 0.45);
      if (k) g.circle(X(xa), Y(ya), 2.2, { fill: c.gold, stroke: null });
    }
  } else {
    // Laced: up outside the frame, over the top, down to the bottom of the next stage, across, up its far side...
    var pts = [[-(G.hw[0] + 0.72), spoolTop]], pul = [];
    for (k = 0; k <= n; k++) {
      var sd = k % 2 ? 1 : -1, xUp = sd * (G.hw[k] + 0.72), xDn = -sd * (hwOf(k + 1) + 0.72), tp2 = stageTop(k) + 0.45;
      if (k) { var yb2 = stageBot(k) - 0.45; pts.push([xUp, yb2]); pul.push([xUp, yb2 + 0.45]); }
      pts.push([xUp, tp2], [xDn, tp2]); pul.push([xUp, tp2 - 0.45], [xDn, tp2 - 0.45]);
      if (k < n) { var yb3 = stageBot(k + 1) - 0.45; pts.push([xDn, yb3]); pul.push([xDn, yb3 + 0.45]); }
      else pts.push([xDn, stageBot(n + 1) + G.carH * 0.85]);
    }
    rope(pts); pul.forEach(function (p) { pulley(p[0], p[1]); });
    var last = pts[pts.length - 1]; g.line(X(last[0]), Y(last[1]), X(last[0] < 0 ? -G.hwc : G.hwc), Y(last[1]), { color: c.gold, width: rw });
  }
  // Carriage and its load.
  var cb = G.carBot + hNow[n], stalled = ph === "stall";
  rect(-G.hwc, cb, G.hwc, cb + G.carH, { fill: c.part2, stroke: stalled ? c.bad : c.partLine, width: stalled ? 2 : 1, radius: 2 });
  g.ball(X(0), Y(cb + G.carH / 2), L(Math.min(2.95, G.hwc - 0.4, G.carH / 2 - 0.3)), 0.5, {});
  // Spool and motor at the bottom left: the spool turns as the rope winds on.
  rect(G.motX - 2.4, G.yb, G.motX, G.yb + 4.6, { fill: c.text2, stroke: null, radius: 3 });
  var spa = -ropeIn / G.Rs;
  g.circle(X(G.spX), Y(G.spY), L(G.Rs), { fill: c.part, stroke: c.partLine, width: 1 });
  for (i = 0; i < 3; i++) { var a = spa + i * 2 * Math.PI / 3; g.line(X(G.spX), Y(G.spY), X(G.spX) + Math.cos(a) * L(G.Rs) * 0.85, Y(G.spY) + Math.sin(a) * L(G.Rs) * 0.85, { color: c.partLine, width: 1.25 }); }
  g.line(X(-(G.hw[0] + 0.72)), Y(G.spY), X(-(G.hw[0] + 0.72)), Y(spoolTop), { color: c.gold, width: rw });
  var motorName = F.motor(s.motor).name;
  g.text(Math.round(s.motors) + " × " + motorName + ", " + K.fix(s.ratio, s.ratio < 10 ? 1 : 0) + ":1", X(G.motX - 2.4) - 6, Y(G.yb + 2.3), { size: 11, color: c.text2, align: "right", base: "middle" });
  // Height of the carriage: a dimension from where it starts.
  var dx = G.hw[0] + 1.8;
  if (hNow[n] > 0.6) {
    g.line(X(G.hwc), Y(cb), X(dx + 0.6), Y(cb), { color: c.mute, width: 1, dash: [3, 3] });
    g.dim(X(dx), Y(G.carBot), X(dx), Y(cb), K.fix(hNow[n], 1) + " in", 0, { side: "right" });
  }
  // Weight on the carriage (down) and spring (up).
  var wLb = s.carLb * Math.cos(s.tilt * Math.PI / 180), cx = X(0), cy = Y(cb + G.carH / 2);
  var wLen = Math.max(18, Math.min(70, L(wLb * 0.45), Y(G.yb) - 2 - cy));
  g.arrow(cx - L(G.hwc) * 0.45, cy, cx - L(G.hwc) * 0.45, cy + wLen, { color: c.force, width: 2.5 });
  // Labels go left of their arrows, or right when that would run into the read-out.
  var hudR = 14 + hudW + 8;
  function side(str, ax, ay, color, short) {
    if (ax - 6 - g.textWidth(str, { weight: 700 }) <= hudR && short) str = short;
    var left = ax - 6 - g.textWidth(str, { weight: 700 }) > hudR;
    g.text(str, left ? ax - 6 : ax + 6, ay, { color: color, weight: 700, align: left ? "right" : "left", base: "middle" });
  }
  side(lbs(s.carLb) + " lb", cx - L(G.hwc) * 0.45, cy + wLen * 0.55, c.force);
  if (s.spring > 0) {
    var sx = cx - L(G.hwc) * 0.45, sy = Y(cb + G.carH / 2), sl = Math.max(18, Math.min(70, L(s.spring * 0.45)));
    g.arrow(sx, sy, sx, sy - sl, { color: c.ok, width: 2.5 });
    side("spring " + lbs(s.spring) + " lbf", sx, sy - sl * 0.6, c.ok, lbs(s.spring) + " lbf");
  }
  // Speed of every moving part, side by side on the right, each at its part's top.
  var vmax = Math.max(1e-6, r.topV / IN), lane0 = G.hw[0] + 3.4, moving = Math.abs(v) > 1e-4;
  for (i = 0; i <= n; i++) {
    var lx = X(lane0 + 1.5 * (i + 1) - 1.5 + (i === n ? 0.6 : 0)), ytop = i < n ? stageTop(i + 1) : cb + G.carH, sp = vNow[i];
    if (moving && Math.abs(sp) > 0.5) {
      g.line(i < n ? X(G.hw[i + 1]) : X(G.hwc), Y(ytop), lx, Y(ytop), { color: c.ghost, width: 1, dash: [2, 3] });
      var len = Math.max(8, 64 * Math.abs(sp) / vmax) * (sp > 0 ? -1 : 1);
      g.arrow(lx, Y(ytop), lx, Y(ytop) + len, { color: c.s1, width: i === n ? 3 : 2, head: i === n ? 9 : 7, label: i === n ? K.n(Math.abs(sp), 0) + " in/s" : "" });
    }
  }
  // The read-out at the top left: what is happening, the current and the battery.
  var brown = r.minV < 7, hx = 14, hy = 22, title = { up: "Going up", hold: "Holding at the top", down: "Coming down", end: "Back at the bottom", stall: brown ? "Browns out" : "Stalled" }[ph];
  g.text(title, hx, hy, { size: 14, weight: 700, color: stalled ? c.bad : c.text });
  var line2 = r.rig === "cascade" ? "Cascade: every stage moves at once" : (function () { var sct = mod.section(x); return stalled ? (sct === 0 ? "Continuous: the carriage cannot move" : "Continuous: stalls as stage " + (n - sct + 1) + " joins") : ph === "hold" || ph === "end" ? "Continuous: one stage at a time" : sct === 0 ? "Continuous: the carriage moves first" : "Continuous: stage " + (n - sct + 1) + " has joined"; })();
  wrap(g, line2, hudW, { size: 11 }).forEach(function (ln, j) { g.text(ln, hx, hy + 17 + 14 * j, { size: 11, color: c.text2 }); });
  var my = hy + 17 + 14 * wrap(g, line2, hudW, { size: 11 }).length + 12;
  meter(g, hx, my, hudW, "Current per motor", K.fix(amps, 0) + " of " + s.statorA + " A", amps / s.statorA, amps >= s.statorA - 0.5 ? "warn" : "");
  meter(g, hx, my + 32, hudW, "Battery", K.fix(Math.max(0, volts), 1) + " V", (volts - 6) / (s.vbat - 6), volts < 7 ? "bad" : volts < 8 ? "warn" : "");
  var ny = my + 64;
  if (!r.reached || brown) {
    var msg = brown ? "The motors draw so much current that the battery falls below 7 V and the robot's controller would shut down." : "The load needs " + K.fix(r.needRatio, 2) + " times the torque the gearbox has at " + s.statorA + " A, so the motors push at the limit and nothing moves" + (hNow[n] > 0.6 ? " past here." : ".");
    wrap(g, msg, hudW, { size: 12, weight: 600 }).forEach(function (ln, j) { g.text(ln, hx, ny + 15 * j, { size: 12, weight: 600, color: c.bad }); });
    ny += 15 * wrap(g, msg, hudW, { size: 12, weight: 600 }).length + 6;
  }
  if (s.tilt > 0) wrap(g, "Leaning " + K.fix(s.tilt, 0) + "° back, so it lifts " + K.fix(Math.cos(s.tilt * Math.PI / 180) * 100, 0) + "% of the weight", hudW, { size: 11 }).forEach(function (ln, j) { g.text(ln, hx, ny + 2 + 14 * j, { size: 11, color: c.mute }); });
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
st.textContent = ".t-elevator-sweep { display: grid; gap: 8px; } .t-elevator-sweep > p { max-width: 72ch; color: var(--text-2); font-size: .92rem; }";
document.head.appendChild(st);
})(typeof window !== "undefined" ? window : this);
