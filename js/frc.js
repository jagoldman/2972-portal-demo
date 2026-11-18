/* FRC maths for the calculators in Tools. Pure functions, SI units inside, no page code: the same file runs in the
   browser (window.FRC) and in Node (tests/frc.test.js).

   Where the models come from:
   - Motor figures: free speed, stall torque, stall and free current at 12 V, as listed on ReCalc's motor page
     (reca.lc/motors), read 2026-11-17 and again 2026-11-18. ReCalc marks most rows "data from CTRE" (CTRE's bench
     tests, which include other makers' motors) and the NEO 550 "data from REV". CTRE's figures for REV's motors
     differ from REV's own sheet: REV lists the NEO Vortex at 6,784 rpm, 3.6 N m, 211 A and 3.6 A free
     (docs.revrobotics.com). Under a current limit what matters is torque per amp: 0.0155 N m/A by CTRE's figures
     and 0.0174 by REV's, a 12% difference. Both are offered ("NEO Vortex" and "NEO Vortex, REV's own figures").
   - Flywheel shot: "Flywheel Shot Analysis: Correction and Extension", Rafi Pedersen, FRC Team 449, May 2026, which
     builds on Dean Brettle's 2023 analysis (FRC Team 199). No slip at exit, rigid ball. The older model most
     calculators use (Team 846, 2012) gives the wheel too little speed loss.
   - Flight: gravity, drag (0.5 rho Cd A v^2) and lift from spin. The lift coefficient is Nathan's fit for a spinning
     ball, CL = 1 / (2.32 + 0.4 / S), S = r w / v (A. Nathan, Am. J. Phys. 76, 2008). Measured on baseballs, so for
     a foam ball it is an estimate.
   - Belts: the exact length of a loop round two circles. Chains: the same straight runs, with the wrapped part
     counted in links (a sprocket holds a polygon of chain, not a circle).
   Everything here is an estimate to design with, not a promise of what the robot will do. */
(function (root) {
"use strict";
var F = {};

/* ---------- Units ---------- */
F.IN = 0.0254; F.FT = 0.3048; F.LB = 0.45359237; F.G = 9.80665;
F.RPM = Math.PI / 30;                 // rad/s per rpm
F.LBIN2 = F.LB * F.IN * F.IN;         // kg m^2 per lb in^2
F.LBF = F.LB * F.G;                   // newtons per pound-force
F.clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
F.lerp = function (a, b, t) { return a + (b - a) * t; };
// Value of a sampled curve y(x) at x; xs must rise.
F.interp = function (xs, ys, x) {
  var n = xs.length; if (!n) return NaN; if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
  var lo = 0, hi = n - 1; while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
  var t = (x - xs[lo]) / ((xs[hi] - xs[lo]) || 1); return ys[lo] + (ys[hi] - ys[lo]) * t;
};
// Root of a rising function between lo and hi, or null when the signs do not differ.
F.bisect = function (f, lo, hi, n) {
  var a = f(lo), b = f(hi); if (!(a <= 0 && b >= 0)) return null;
  for (var i = 0; i < (n || 48); i++) { var m = (lo + hi) / 2; if (f(m) <= 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
};

/* ---------- Motors ---------- */
// id, name, free speed (rpm), stall torque (N m), stall current (A), free current (A), weight (lb)
var MOTORS = [
  ["kraken60", "Kraken X60", 6065, 7.16, 374, 2.8, 1.20],
  ["kraken60foc", "Kraken X60 (FOC)", 5784, 9.36, 476, 3.5, 1.20],
  ["kraken44", "Kraken X44", 7757, 4.11, 279, 3.2, 0.75],
  ["kraken44foc", "Kraken X44 (FOC)", 7367, 5.01, 329, 3.2, 0.75],
  ["vortex", "NEO Vortex", 6825, 5.96, 391, 5.4, 1.29],
  ["vortexrev", "NEO Vortex, REV's own figures", 6784, 3.6, 211, 3.6, 1.29],
  ["neo", "NEO", 5906, 4.20, 216, 1.8, 1.19],
  ["neo550", "NEO 550", 11710, 1.08, 111, 1.1, 0.56],
  ["falcon", "Falcon 500", 6380, 4.69, 257, 1.5, 1.25],
  ["minion", "Minion", 7703, 3.17, 212, 2.2, 0.95],
  ["pulsar", "Thrifty Pulsar", 7500, 3.10, 189, 2.7, 0.86],
  ["cim", "CIM", 5330, 2.41, 131, 2.7, 3.05],
  ["775pro", "775pro", 18730, 0.71, 134, 0.7, 1.05]
];
F.MOTORS = MOTORS.map(function (m) {
  var R = 12 / m[4], wf = m[2] * F.RPM;
  return { id: m[0], name: m[1], freeRpm: m[2], free: wf, stall: m[3], stallA: m[4], freeA: m[5], lb: m[6],
    R: R,                               // winding resistance, ohms
    kt: m[3] / (m[4] - m[5]),           // N m per amp above the free current
    ke: (12 - m[5] * R) / wf };         // volts per rad/s (back-EMF)
});
F.motor = function (id) { for (var i = 0; i < F.MOTORS.length; i++) if (F.MOTORS[i].id === id) return F.MOTORS[i]; return F.MOTORS[0]; };

/* A gearbox: n motors through a reduction. spec: { motor, n, ratio (motor turns per output turn), eff (0..1),
   statorA (limit per motor, 0 = none), supplyA (limit per motor, 0 = none) }.
   at(w, V, cmd): the output torque at output speed w (rad/s), battery voltage V, command +1 (full ahead) or
   -1 (full reverse, used to brake) or a fraction of full voltage. Returns { torque, statorA (per motor), supplyA (total) }. */
F.drive = function (spec) {
  var m = typeof spec.motor === "string" ? F.motor(spec.motor) : spec.motor, n = spec.n || 1, G = spec.ratio || 1,
    eff = spec.eff == null ? 0.9 : spec.eff, Ls = spec.statorA || 0, Lp = spec.supplyA || 0;
  var d = { motor: m, n: n, ratio: G, eff: eff, statorA: Ls, supplyA: Lp };
  d.at = function (w, V, cmd) {
    var wm = w * G, e = m.ke * wm, I = ((cmd == null ? 1 : cmd) * V - e) / m.R;
    if (Ls && I > Ls) I = Ls; if (Ls && I < -Ls) I = -Ls;
    var sup = I * (I * m.R + e) / V;
    // The supply limit caps what the battery gives while driving. Braking (I < 0) takes nothing from it.
    if (Lp && I > 0 && sup > Lp) { I = (-e + Math.sqrt(e * e + 4 * m.R * Lp * V)) / (2 * m.R); sup = Lp; }
    // The free current stands for friction, which always works against the motion: it takes from a driving torque
    // and adds to a braking one. At rest it only stops a current smaller than itself from moving anything.
    var tm, a;
    if (wm > 1e-9) tm = m.kt * (I - m.freeA); else if (wm < -1e-9) tm = m.kt * (I + m.freeA);
    else { a = Math.abs(I) - m.freeA; tm = a > 0 ? m.kt * a * (I < 0 ? -1 : 1) : 0; }
    return { torque: tm * n * G * eff, statorA: I, supplyA: (I > 0 ? Math.max(0, sup) : 0) * n };
  };
  /* The battery's voltage while this gearbox pulls on it. Voltage and current depend on each other (more current
     sags the battery, a sagged battery pushes less current), so this solves the pair exactly: a straight formula
     while the motor takes all it can, and a quadratic once the controller is holding the stator limit.
     V0: battery at rest. Rb: battery and wiring resistance. Braking (cmd < 0) is taken to draw nothing. */
  d.volts = function (w, V0, Rb, cmd) {
    var e = m.ke * w * G; if (!Rb || (cmd != null && cmd <= 0) || e >= V0) return V0;
    var k = Rb * n / m.R, V = (V0 + k * e) / (1 + k), I = (V - e) / m.R;
    if (Ls && I > Ls) { var c = Rb * n * Ls * (Ls * m.R + e), disc = V0 * V0 - 4 * c; V = disc > 0 ? (V0 + Math.sqrt(disc)) / 2 : V0 / 2; I = Ls; }
    if (Lp && I * (I * m.R + e) / V > Lp) V = V0 - Rb * n * Lp;
    return V;
  };
  d.freeSpeed = function (V) { return (V == null ? 12 : V) / 12 * m.free / G; };       // rad/s at the output, no load
  d.stallTorque = function (V) { return d.at(0, V == null ? 12 : V, 1).torque; };       // N m at the output, with limits
  // Amps per motor and volts needed to hold a steady output torque.
  d.hold = function (torque) { var I = Math.abs(torque) / (n * G * eff * m.kt) + m.freeA; return { statorA: I, volts: I * m.R }; };
  // Feedforward estimates for an output inertia J (kg m^2): volts per rad/s and per rad/s^2 at the output.
  d.kV = m.ke * G;
  d.kA = function (J) { return m.R * J / (n * G * eff * m.kt); };
  return d;
};

/* Move an inertia from rest at x0 to rest at goal, as fast as the gearbox allows: full ahead, then full reverse to
   stop on the goal. o: { drive, J (kg m^2 at the output), x0, goal (rad), ext(x, w) (other torque on the output, N m;
   gravity is negative when it resists a rising x), V (battery at rest, default 12.3), Rbat (ohms, default 0.02),
   dt (default 0.002), tmax (default 8),
   J may be a function of x (a load that changes on the way, like a continuous-rigged elevator),
   maxTorque (N m, a number or a function of x: the most the output can pass on, like wheel grip),
   stop: false (run through the goal at speed instead of stopping on it, like a sprint) }.
   Returns { t[], x[], w[], a[], statorA[], supplyA[], volts[], time, reached, peakA, peakSupplyA, minV, maxW }. */
F.move = function (o) {
  // A short, quick move can end a few steps short of the goal at the usual step size: try again with finer steps.
  var res = moveOnce(o), dt = o.dt || 0.002, tries = 0;
  while (!res.reached && res.nearly && tries++ < 4) { dt /= 4; res = moveOnce(Object.assign({}, o, { dt: dt })); }
  return res;
};
function moveOnce(o) {
  var dr = o.drive, dir = o.goal >= o.x0 ? 1 : -1, dist = Math.abs(o.goal - o.x0);
  function Jat(s) { return typeof o.J === "function" ? o.J(o.x0 + dir * s) : o.J; }
  function cap(tq, s) { if (o.maxTorque == null) return tq; var m = typeof o.maxTorque === "function" ? o.maxTorque(o.x0 + dir * s) : o.maxTorque; return tq > m ? m : tq < -m ? -m : tq; }
  var V0 = o.V == null ? 12.3 : o.V, Rb = o.Rbat == null ? 0.02 : o.Rbat, dt = o.dt || 0.002, tmax = o.tmax || 8;
  var ext = o.ext || function () { return 0; };
  // Work in s = distance travelled toward the goal, u = speed toward the goal.
  function extS(s, u) { return dir * ext(o.x0 + dir * s, dir * u); }
  // Braking curve: integrate backward in time from rest at the goal with full reverse.
  var bs = [dist], bu = [0], s = dist, u = 0, k = 0, vb = V0;   // braking draws nothing, so the battery is at rest
  while (o.stop !== false && s > 0 && k++ < 40000) {
    var q = dr.at(u, vb, -1), acc = (cap(q.torque, s) + extS(s, u)) / Jat(s);
    if (acc >= 0) break;                 // cannot slow down here: stop building the curve
    u -= acc * dt; s -= u * dt; bs.push(s); bu.push(u);
    if (u > 1e5) break;
  }
  bs.reverse(); bu.reverse();
  var canBrake = bs.length > 1 || dist === 0;      // false: full reverse cannot slow it at the goal (the load wins)
  var out = { t: [], x: [], w: [], a: [], statorA: [], supplyA: [], volts: [], reached: false };
  var t = 0, vbat = V0, braking = false; s = 0; u = 0;
  var peakA = 0, peakS = 0, minV = V0, maxW = 0;
  while (t < tmax) {
    vbat = dr.volts(u, V0, Rb, braking ? -1 : 1);
    var r = dr.at(u, vbat, braking ? -1 : 1), a = (cap(r.torque, s) + extS(s, u)) / Jat(s);
    // Brake one step early rather than one step late: look at where the next step would land.
    if (!braking && bs.length > 1 && s + u * dt >= bs[0] && u + a * dt >= F.interp(bs, bu, s + (u + a * dt) * dt)) { braking = true; vbat = V0; r = dr.at(u, vbat, -1); a = (cap(r.torque, s) + extS(s, u)) / Jat(s); }
    out.t.push(t); out.x.push(o.x0 + dir * s); out.w.push(dir * u); out.a.push(dir * a);
    out.statorA.push(Math.abs(r.statorA)); out.supplyA.push(r.supplyA); out.volts.push(vbat);
    peakA = Math.max(peakA, Math.abs(r.statorA)); peakS = Math.max(peakS, r.supplyA); minV = Math.min(minV, vbat); maxW = Math.max(maxW, u);
    u += a * dt; s += u * dt; t += dt;
    if (braking && u <= 0) { out.reached = Math.abs(dist - s) < Math.max(0.03 * dist, 1e-4); out.nearly = !out.reached; break; }
    if (s >= (braking ? 1.05 : 1) * dist) { out.reached = o.stop === false || braking || canBrake; out.cannotStop = !out.reached; break; }
    if (!braking && u <= 0 && t > 0.05 && a <= 0) break;   // stalled: the load is more than the gearbox can move
  }
  out.endW = o.stop === false && out.reached ? dir * u : 0;
  out.t.push(t); out.x.push(out.reached ? o.goal : o.x0 + dir * s); out.w.push(out.endW); out.a.push(0); out.statorA.push(0); out.supplyA.push(0); out.volts.push(V0);
  out.time = out.reached ? t : Infinity; out.peakA = peakA; out.peakSupplyA = peakS; out.minV = minV; out.maxW = maxW;
  return out;
}

/* Spin an inertia up from w0 with full voltage. Returns the time to reach target (rad/s), or Infinity, and the curve.
   o: { drive, J, w0, target, V, Rbat, drag (N m lost per rad/s, default 0), dt, tmax } */
F.spin = function (o) {
  var dr = o.drive, w = o.w0 || 0, V0 = o.V == null ? 12.3 : o.V, Rb = o.Rbat == null ? 0.02 : o.Rbat, dt = o.dt || 0.002, tmax = o.tmax || 10;
  var t = 0, vbat = V0, out = { t: [], w: [], supplyA: [], statorA: [], time: Infinity, peakSupplyA: 0 }, mark = w, k = 0;
  while (t <= tmax) {
    vbat = dr.volts(w, V0, Rb, 1);
    var r = dr.at(w, vbat, 1);
    out.t.push(t); out.w.push(w); out.supplyA.push(r.supplyA); out.statorA.push(r.statorA);
    out.peakSupplyA = Math.max(out.peakSupplyA, r.supplyA);
    if (w >= o.target) { out.time = t; break; }
    var a = (r.torque - (o.drag || 0) * w) / o.J;
    if (a > 0) w += a * dt;
    t += dt;
    // Give up when a quarter second passes with almost no gain: this is as fast as it goes.
    if (++k % 125 === 0) { if (w - mark < 1e-3 * Math.max(1, o.target)) break; mark = w; }
  }
  return out;
};

/* ---------- Flywheel shot (Team 449, 2026) ---------- */
F.ballMoi = function (shape, m, r) { return (shape === "shell" ? 2 / 3 : shape === "ring" ? 1 : shape === "disc" ? 1 / 2 : 2 / 5) * m * r * r; };
/* One ball through the shooter. o: { type: "hood" | "dual", Iw (kg m^2 of everything that spins, seen at wheel 1),
   rw (wheel 1 radius, m), rw2 and G (second wheel radius and its speed as a multiple of wheel 1; "dual" only),
   mb, rb, Ib (ball), w (wheel 1 speed before the shot, rad/s), vIn (ball speed going in, m/s), wIn (ball spin going in),
   keep (0..1, the share of the no-slip exit speed a real, squashy ball keeps; default 1) }.
   Returns { v (exit speed, m/s), spin (rad/s, + = backspin off wheel 1), wAfter, drop (rad/s), surface (wheel 1 rim
   speed before, m/s), eBall, eWheel (joules into the ball, out of the wheel), eff, perRad (exit m/s per wheel rad/s) }. */
F.shot = function (o) {
  var Iw = o.Iw, r1 = o.rw, mb = o.mb, rb = o.rb, Ib = o.Ib == null ? F.ballMoi("solid", mb, rb) : o.Ib;
  var w = o.w, vIn = o.vIn || 0, wIn = o.wIn || 0, keep = o.keep == null ? 1 : o.keep, wf, v, spin;
  if (o.type === "dual") {
    var G = o.G == null ? 1 : o.G, r2 = o.rw2 == null ? r1 : o.rw2, sum = r1 + G * r2, dif = r1 - G * r2;
    wf = (4 * Iw * w + 2 * dif * Ib / rb * wIn + 2 * sum * mb * vIn) / (4 * Iw + dif * dif * Ib / (rb * rb) + sum * sum * mb);
    v = sum / 2 * wf; spin = dif / (2 * rb) * wf;
  } else {
    var den = 4 * Iw / (r1 * r1) + Ib / (rb * rb) + mb;
    v = (2 * Iw / r1 * w + Ib / rb * wIn + mb * vIn) / den;
    wf = 2 * v / r1; spin = v / rb;
  }
  var eWheel = 0.5 * Iw * (w * w - wf * wf);
  v *= keep; spin *= keep;
  var eBall = 0.5 * mb * v * v + 0.5 * Ib * spin * spin - (0.5 * mb * vIn * vIn + 0.5 * Ib * wIn * wIn);
  return { v: v, spin: spin, wAfter: wf, drop: w - wf, surface: w * r1, eBall: eBall, eWheel: eWheel, eff: eWheel > 0 ? eBall / eWheel : 0, perRad: w ? v / w : 0 };
};
// The wheel speed (rad/s) that gives an exit speed v, for a ball fed in at rest (exit speed is then proportional).
F.wheelFor = function (o, v) { var p = Object.assign({}, o, { w: 1, vIn: 0, wIn: 0 }); return v / F.shot(p).v; };
/* A burst: n balls, `rate` per second, the wheel driven at full voltage between shots but never above the target.
   Returns [{ t, wBefore, v, spin, wAfter }] and the speed curve { t[], w[] } for a chart. */
F.burst = function (o) {
  var rate = Math.max(0.2, o.rate || 0), count = Math.max(1, Math.round(o.n) || 1);
  var dr = o.drive, J = o.shot.Iw, w = o.target, gap = 1 / rate, dt = 0.002, shots = [], ct = [0], cw = [w], t = 0;
  var V0 = o.V == null ? 12.3 : o.V, Rb = o.Rbat == null ? 0.02 : o.Rbat, vbat = V0;
  for (var i = 0; i < count; i++) {
    var s = F.shot(Object.assign({}, o.shot, { w: w }));
    shots.push({ t: t, wBefore: w, v: s.v, spin: s.spin, wAfter: s.wAfter });
    ct.push(t); cw.push(s.wAfter); w = s.wAfter;
    var end = t + gap;
    while (t < end - 1e-9) {
      if (w < o.target) { vbat = dr.volts(w, V0, Rb, 1); var r = dr.at(w, vbat, 1); w = Math.min(o.target, w + Math.max(0, r.torque) / J * dt); }
      t += dt; if (Math.round(t / dt) % 5 === 0) { ct.push(t); cw.push(w); }
    }
    ct.push(t); cw.push(w);
  }
  return { shots: shots, t: ct, w: cw };
};

/* ---------- Flight ---------- */
// Air density (kg/m^3) at an altitude in feet, standard atmosphere, 15 C at sea level.
F.air = function (altFt) { return 1.225 * Math.pow(1 - 2.25577e-5 * (altFt || 0) * F.FT, 4.25588); };
F.liftCoef = function (S) { S = Math.abs(S); return S > 1e-6 ? 1 / (2.32 + 0.4 / S) : 0; };
/* Fly a ball. o: { v (m/s), deg (above level), h0 (m), spin (rad/s, + = backspin), m, r, cd (default 0.47),
   rho (default sea level), lift (false to leave spin out), vr (launcher's own speed toward the target, m/s),
   floor (stop height, default 0), dt (default 0.002), tmax (default 6) }.
   Returns { pts: [[t, x, y, vx, vy]], apex: [x, y], range, time }. With cd 0 and no spin it is the textbook parabola. */
F.fly = function (o) {
  var th = o.deg * Math.PI / 180, cd = o.cd == null ? 0.47 : o.cd, rho = o.rho == null ? 1.225 : o.rho, A = Math.PI * o.r * o.r;
  var kd = 0.5 * rho * cd * A / o.m, kl0 = 0.5 * rho * A / o.m, spin = o.lift === false ? 0 : (o.spin || 0), sg = spin < 0 ? -1 : 1;
  var dt = o.dt || 0.002, tmax = o.tmax || 6, floor = o.floor || 0;
  function acc(vx, vy) {
    var v = Math.hypot(vx, vy) || 1e-9, cl = spin ? F.liftCoef(o.r * spin / v) * sg : 0;
    return [-kd * v * vx - kl0 * cl * v * vy, -F.G - kd * v * vy + kl0 * cl * v * vx];
  }
  var x = 0, y = o.h0 || 0, vx = o.v * Math.cos(th) + (o.vr || 0), vy = o.v * Math.sin(th), t = 0;
  var pts = [[0, x, y, vx, vy]], apex = [x, y];
  while (t < tmax) {
    var a1 = acc(vx, vy), a2 = acc(vx + a1[0] * dt / 2, vy + a1[1] * dt / 2), a3 = acc(vx + a2[0] * dt / 2, vy + a2[1] * dt / 2), a4 = acc(vx + a3[0] * dt, vy + a3[1] * dt);
    var nvx = vx + dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]), nvy = vy + dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
    var nx = x + dt * (vx + nvx) / 2, ny = y + dt * (vy + nvy) / 2;
    t += dt;
    if (ny < floor && nvy < 0) { var f = (y - floor) / ((y - ny) || 1e-9); pts.push([t - dt + f * dt, x + (nx - x) * f, floor, nvx, nvy]); x = x + (nx - x) * f; y = floor; break; }
    x = nx; y = ny; vx = nvx; vy = nvy; pts.push([t, x, y, vx, vy]);
    if (y > apex[1]) apex = [x, y];
  }
  return { pts: pts, apex: apex, range: x, time: pts[pts.length - 1][0] };
};
/* Where a flight meets a target. target: { kind: "top" (an opening that faces up; the ball drops in) or "front"
   (an opening that faces the robot; the ball flies in), d (m, launch point to the middle of the opening),
   h (m: the rim's height for "top", the middle of the opening for "front"), w (m: the opening's width along the
   shot for "top", its height for "front"), r (ball radius) }.
   Returns null when the ball never gets there, else { hit, miss (m: + long or high, - short or low), room (m of
   clearance to the nearer edge; negative = it clips or misses), half (m: how far from the middle the ball's centre
   may cross), entryDeg (below level), t, x, y, speed }.
   For an opening that faces up, a ball that reaches the near edge below the rim, or brushes the rim on its way,
   has hit the target's wall: wall is true, and miss counts it as short.
   A ball that comes in at a slant needs more room than its radius: its edge reaches the rim before its centre
   crosses the opening. So the centre must cross r / sin(entry) inside each edge of an opening that faces up, and
   r / cos(entry) inside each edge of one that faces the robot. */
F.meet = function (pts, target) {
  var rr = target.r || 0, half, i, a, b, f, sp;
  if (target.kind === "front") {
    for (i = 1; i < pts.length; i++) {
      a = pts[i - 1]; b = pts[i];
      if (a[1] < target.d && b[1] >= target.d) {
        f = (target.d - a[1]) / (b[1] - a[1]); var y = a[2] + (b[2] - a[2]) * f, miss = y - target.h;
        sp = Math.hypot(b[3], b[4]) || 1e-9; half = target.w / 2 - rr / Math.max(0.05, Math.abs(b[3]) / sp);
        return { hit: Math.abs(miss) <= half, miss: miss, room: half - Math.abs(miss), half: half, entryDeg: Math.atan2(-b[4], b[3]) * 180 / Math.PI, t: a[0] + (b[0] - a[0]) * f, x: target.d, y: y, speed: Math.hypot(b[3], b[4]) };
      }
    }
    return null;
  }
  var nx = target.d - target.w / 2, wall = null;
  for (i = 1; i < pts.length; i++) {
    a = pts[i - 1]; b = pts[i];
    // On the way: reaching the near edge below the rim is a hit on the wall, and so is brushing the rim itself.
    if (!wall && a[1] < nx && b[1] >= nx) { f = (nx - a[1]) / ((b[1] - a[1]) || 1e-9); var yw = a[2] + (b[2] - a[2]) * f; if (yw < target.h) wall = { t: a[0] + (b[0] - a[0]) * f, y: yw }; }
    if (!wall && rr && Math.hypot(b[1] - nx, b[2] - target.h) < rr * 0.98 && b[1] < nx + rr * 0.5 && !(a[2] >= target.h && b[2] < target.h)) wall = { t: b[0], y: b[2] };
    if (wall) return { hit: false, wall: true, miss: -(target.w / 2 + 0.02 + Math.max(0, target.h - wall.y)), room: -(0.02 + Math.max(0, target.h - wall.y)), half: 0, entryDeg: Math.atan2(-b[4], b[3]) * 180 / Math.PI, t: wall.t, x: nx, y: wall.y, speed: Math.hypot(b[3], b[4]) };
    if (a[2] >= target.h && b[2] < target.h && b[4] < 0) {
      f = (a[2] - target.h) / ((a[2] - b[2]) || 1e-9); var x = a[1] + (b[1] - a[1]) * f, m2 = x - target.d;
      sp = Math.hypot(b[3], b[4]) || 1e-9; half = target.w / 2 - rr / Math.max(0.05, Math.abs(b[4]) / sp);
      return { hit: Math.abs(m2) <= half, miss: m2, room: half - Math.abs(m2), half: half, entryDeg: Math.atan2(-b[4], b[3]) * 180 / Math.PI, t: a[0] + (b[0] - a[0]) * f, x: x, y: target.h, speed: Math.hypot(b[3], b[4]) };
    }
  }
  return null;
};
/* For one launch angle, the exit speed that puts the ball through the middle of the target, and the slowest and
   fastest speeds that still go in. shot: the fields of F.fly except v, plus spinPer (rad/s of spin per m/s of exit
   speed, so spin follows speed). vmax: the fastest speed tried (default 45 m/s). n: bisection steps (default 30).
   Returns null when no speed works, else { v, lo, hi, meet, window (hi - lo) }. */
F.aim = function (shot, target, vmax, n) {
  vmax = vmax || 45; n = n || 30;
  function at(v) { return F.meet(F.fly(Object.assign({}, shot, { v: v, spin: shot.spinPer != null ? shot.spinPer * v : shot.spin })).pts, target); }
  // side 0: the middle. side -1: just clearing the near (or lower) edge. side +1: just clearing the far (or upper) edge.
  // Below the slowest speed that reaches the target at all it counts as far short.
  function val(m, side) { if (!m) return -1e3; return side === 0 ? m.miss : side < 0 ? m.miss + m.half : m.miss - m.half; }
  /* More speed does not always carry a spinning ball further: a fast, steep, back-spun ball climbs and falls back.
     So walk up through the speeds in steps, take the FIRST speed at which the ball reaches the middle, and close
     in on it. Along the way remember the roomiest scoring speed, in case the ball scores without ever crossing
     the middle (very close to a wide opening). */
  var step = Math.max(0.25, vmax / 48), prev = null, prevV = 0, v = null, best = null, grid = [], g, m;
  for (g = step; g <= vmax + 1e-9; g += step) {
    m = at(g); grid.push([g, m]);
    if (m && m.hit && (!best || m.room > best[1].room)) best = [g, m];
    if (v == null && val(m, 0) >= 0 && val(prev, 0) < 0) { v = F.bisect(function (q) { return val(at(q), 0); }, prevV || step / 2, g, n); if (v != null) { var mv = at(v); if (!mv || Math.abs(mv.miss) > 0.03 || mv.half <= 0) v = null; } if (v != null) break; }
    prev = m; prevV = g;
  }
  if (v == null) { if (!best) return null; v = best[0]; }
  var mm = at(v); if (!mm || !mm.hit) return null;
  // The edges of the window: walk down, then up, from that speed to the first speed that no longer scores.
  function edge(dir) {
    var a = v, b = v, k;
    for (k = 0; k < 400; k++) { b = a + dir * step; if (b <= 0.05 || b > vmax) return dir < 0 ? Math.max(0.05, b) : vmax; var q = at(b); if (!q || !q.hit) break; a = b; }
    for (k = 0; k < n; k++) { var mid = (a + b) / 2, r = at(mid); if (r && r.hit) a = mid; else b = mid; }
    return a;
  }
  var lo = edge(-1), hi = edge(1);
  return { v: v, lo: lo, hi: hi, window: hi - lo, meet: mm };
};
/* The launch angle that forgives the most speed error at one distance (widest window as a share of the speed),
   among angles from degLo to degHi. minEntry: the steepest-enough entry for a top opening, degrees below level. */
F.bestAngle = function (shot, target, degLo, degHi, minEntry) {
  var best = null;
  for (var deg = degLo; deg <= degHi + 1e-9; deg += 1) {
    var a = F.aim(Object.assign({}, shot, { deg: deg }), target);
    if (!a || !a.meet) continue;
    if (minEntry && target.kind !== "front" && a.meet.entryDeg < minEntry) continue;
    var score = a.window / a.v;
    if (!best || score > best.score) best = { deg: deg, score: score, aim: a };
  }
  return best;
};
/* Shooting while driving. The ball keeps the robot's velocity, so aim at where the target seems to be after the
   flight time: target minus robot velocity times time, worked out a few times over. vx: robot speed toward the
   target (m/s), vy: speed across. speedFor(d): { v, time } for a standing shot at distance d (null when out of reach).
   Returns { d (the distance to shoot for), leadDeg (turn the launcher this far against the sideways motion), time, v }. */
F.moving = function (d, vx, vy, speedFor) {
  var s = speedFor(d); if (!s) return null;
  var t = s.time, ex = d, ey = 0, dd = d;
  for (var i = 0; i < 8; i++) {
    ex = d - vx * t; ey = -vy * t; dd = Math.hypot(ex, ey);
    s = speedFor(dd); if (!s) return null; t = s.time;
  }
  return { d: dd, leadDeg: Math.atan2(ey, ex) * 180 / Math.PI, time: t, v: s.v };
};

/* ---------- Belts, chains and gears ---------- */
// Length of a loop round two circles of diameter d1 and d2, centres c apart (same units).
F.loopLength = function (d1, d2, c) {
  var big = Math.max(d1, d2), small = Math.min(d1, d2), al = Math.asin(F.clamp((big - small) / (2 * c), -1, 1));
  return 2 * c * Math.cos(al) + Math.PI * (big + small) / 2 + al * (big - small);
};
// The centre distance that a loop of length L needs.
F.loopCenter = function (d1, d2, L) {
  var lo = Math.abs(d1 - d2) / 2 + 1e-9, hi = L;
  if (F.loopLength(d1, d2, lo) > L) return null;
  return F.bisect(function (c) { return F.loopLength(d1, d2, c) - L; }, lo, hi, 60);
};
// Arc of wrap (radians) on each circle: [on d1, on d2].
F.wrap = function (d1, d2, c) { var al = Math.asin(F.clamp((d1 - d2) / (2 * c), -1, 1)); return [Math.PI + 2 * al, Math.PI - 2 * al]; };
F.BELTS = [
  { id: "htd5", name: "HTD 5 mm", pitch: 5, pld: 0.5715, step: 5, min: 35, max: 400 },
  { id: "gt2", name: "GT2 3 mm", pitch: 3, pld: 0.381, step: 5, min: 45, max: 400 },
  { id: "rt25", name: "RT25 (0.25 in)", pitch: 6.35, pld: 0.381, step: 2, min: 30, max: 200 }
];
F.CHAINS = [{ id: "25", name: "#25", pitch: 0.25, roller: 0.130 }, { id: "35", name: "#35", pitch: 0.375, roller: 0.200 }];
F.beltPd = function (pitchMm, n) { return n * pitchMm / Math.PI / 25.4; };                 // inches
F.sprocketPd = function (pitchIn, n) { return pitchIn / Math.sin(Math.PI / n); };          // inches
/* Belts for two pulleys near a wanted centre distance. o: { pitch (mm), pld (mm), n1, n2, target (in), extra (in added
   to every centre distance), step (belts come in this tooth step), min, max (belt teeth) }.
   Returns { pd1, pd2, od1, od2 (in), options: [{ teeth, length (in), center (in), err (in, + = longer than wanted),
   mesh1, mesh2 (teeth gripped), gap (in between the pulleys) }] } with the belts nearest the target first. */
F.belt = function (o) {
  var pd1 = F.beltPd(o.pitch, o.n1), pd2 = F.beltPd(o.pitch, o.n2), od1 = pd1 - 2 * o.pld / 25.4, od2 = pd2 - 2 * o.pld / 25.4;
  var step = o.step || 5, out = [], want = F.loopLength(pd1, pd2, Math.max(o.target, Math.abs(pd1 - pd2) / 2 + 0.01)) / (o.pitch / 25.4);
  var lo = Math.max(o.min || step, Math.floor(want / step) * step - 2 * step), hi = Math.min(o.max || 1e4, lo + 5 * step);
  for (var t = lo; t <= hi; t += step) {
    var c = F.loopCenter(pd1, pd2, t * o.pitch / 25.4); if (c == null || c < (od1 + od2) / 2) continue;
    var wr = F.wrap(pd1, pd2, c);
    out.push({ teeth: t, length: t * o.pitch / 25.4, center: c + (o.extra || 0), err: c + (o.extra || 0) - o.target, mesh1: Math.floor(o.n1 * wr[0] / (2 * Math.PI)), mesh2: Math.floor(o.n2 * wr[1] / (2 * Math.PI)), gap: c - (od1 + od2) / 2 });
  }
  out.sort(function (a, b) { return Math.abs(a.err) - Math.abs(b.err); });
  return { pd1: pd1, pd2: pd2, od1: od1, od2: od2, options: out };
};
/* The length of chain, in links, round two sprockets c apart. The straight runs follow the pitch circles' common
   tangents, but on a sprocket the chain sits link by link: a full turn takes n links, which is a little less than
   the pitch circle's circumference. (Two 16-tooth sprockets and 64 links sit exactly 24 pitches apart.) */
F.chainLinks = function (pitch, n1, n2, c) {
  var pd1 = F.sprocketPd(pitch, n1), pd2 = F.sprocketPd(pitch, n2), al = Math.asin(F.clamp((pd1 - pd2) / (2 * c), -1, 1));
  return 2 * c * Math.cos(al) / pitch + n1 * (Math.PI + 2 * al) / (2 * Math.PI) + n2 * (Math.PI - 2 * al) / (2 * Math.PI);
};
F.chainCenter = function (pitch, n1, n2, links) {
  var pd1 = F.sprocketPd(pitch, n1), pd2 = F.sprocketPd(pitch, n2), lo = Math.abs(pd1 - pd2) / 2 + 1e-9;
  if (F.chainLinks(pitch, n1, n2, lo) > links) return null;
  return F.bisect(function (c) { return F.chainLinks(pitch, n1, n2, c) - links; }, lo, links * pitch, 60);
};
/* Chains for two sprockets. o: { pitch (in), n1, n2, target (in), extra (in) }. Chains have an even number of links. */
F.chain = function (o) {
  var pd1 = F.sprocketPd(o.pitch, o.n1), pd2 = F.sprocketPd(o.pitch, o.n2), out = [];
  var want = F.chainLinks(o.pitch, o.n1, o.n2, Math.max(o.target, Math.abs(pd1 - pd2) / 2 + 0.01)), lo = Math.max(4, Math.floor(want / 2) * 2 - 4);
  for (var n = lo; n <= lo + 10; n += 2) {
    var c = F.chainCenter(o.pitch, o.n1, o.n2, n); if (c == null || c < (pd1 + pd2) / 2) continue;
    var wr = F.wrap(pd1, pd2, c);
    out.push({ links: n, length: n * o.pitch, center: c + (o.extra || 0), err: c + (o.extra || 0) - o.target, mesh1: Math.floor(o.n1 * wr[0] / (2 * Math.PI)), mesh2: Math.floor(o.n2 * wr[1] / (2 * Math.PI)), gap: c - (pd1 + pd2) / 2 - o.pitch * 0.6 });
  }
  out.sort(function (a, b) { return Math.abs(a.err) - Math.abs(b.err); });
  return { pd1: pd1, pd2: pd2, options: out };
};
// Two spur gears: pitch diameters and centre distance (in). size: { dp } or { module }.
F.gearPair = function (n1, n2, size, extra) {
  var pd1 = size.dp ? n1 / size.dp : n1 * size.module / 25.4, pd2 = size.dp ? n2 / size.dp : n2 * size.module / 25.4;
  var add = size.dp ? 1 / size.dp : size.module / 25.4;
  return { pd1: pd1, pd2: pd2, od1: pd1 + 2 * add, od2: pd2 + 2 * add, center: (pd1 + pd2) / 2 + (extra || 0) };
};

/* ---------- Small helpers the mechanism tools share ---------- */
// A linear mechanism on a spool or pinion: mass m (kg) moved by a drum of radius r (m). Returns the same shapes as
// F.move with x in metres. o: { drive, m (kg, or a function of x), r, x0, goal (m), force(x, v) (other force, N,
// + helps a rising x), maxForce (N, e.g. wheel grip), stop, V, Rbat }.
F.moveLinear = function (o) {
  var r = o.r, res = F.move({ drive: o.drive, J: typeof o.m === "function" ? function (th) { return o.m(th * r) * r * r; } : o.m * r * r, x0: o.x0 / r, goal: o.goal / r, V: o.V, Rbat: o.Rbat, dt: o.dt, tmax: o.tmax, stop: o.stop,
    maxTorque: o.maxForce == null ? null : (typeof o.maxForce === "function" ? function (th) { return o.maxForce(th * r) * r; } : o.maxForce * r),
    ext: function (th, w) { return (o.force ? o.force(th * r, w * r) : 0) * r; } });
  res.x = res.x.map(function (v) { return v * r; }); res.v = res.w.map(function (v) { return v * r; }); res.acc = res.a.map(function (v) { return v * r; });
  res.maxV = res.maxW * r; res.endV = res.endW * r;
  return res;
};
F.round = function (x, n) { var p = Math.pow(10, n == null ? 2 : n); return Math.round(x * p) / p; };

if (typeof module !== "undefined" && module.exports) module.exports = F; else root.FRC = F;
})(typeof window !== "undefined" ? window : this);
