/* Tools: Tip-over (#tool-tip). Where the robot's weight sits with a raised mechanism, how hard it can brake before
   it tips forward, and what happens in a hard stop. The drawing is a side view to scale on 6 in squares. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");

/* ---------- The maths (inches, pounds and g inside; only ratios matter, so no SI needed) ---------- */
var M = {}, D2R = Math.PI / 180;
/* o: { m1, x1, h1 (chassis: lb, in forward of the middle, in high), m2, x2, h2 (mechanism), wb (wheelbase, in),
   mu (wheel grip), ramp (deg, + = the robot points down the slope) }. */
M.cg = function (o) { var m = o.m1 + o.m2; return { m: m, x: (o.m1 * o.x1 + o.m2 * o.x2) / m, h: (o.m1 * o.h1 + o.m2 * o.h2) / m }; };
/* Tipping and sliding, in g. On a slope of angle b the weight has a part g sin b along the slope and g cos b into it.
   Braking at a: the robot tips forward when (a + g sin b) h > g cos b d_front, and the tread holds while
   (a + g sin b) < mu g cos b. Accelerating: the same toward the rear with sin b the other way. */
M.limits = function (o) {
  var c = M.cg(o), b = (o.ramp || 0) * D2R, cb = Math.cos(b), sb = Math.sin(b), df = o.wb / 2 - c.x, dr = o.wb / 2 + c.x;
  return { cg: c, df: df, dr: dr,
    tipBrake: df / c.h * cb - sb, tipAccel: dr / c.h * cb + sb,
    gripBrake: o.mu * cb - sb, gripAccel: o.mu * cb + sb,
    staticF: Math.atan2(df, c.h) / D2R, staticR: Math.atan2(dr, c.h) / D2R,
    slidesFirstBrake: o.mu < df / c.h, slidesFirstAccel: o.mu < dr / c.h };
};
// The mechanism height (in) above which braking at a (g) tips the robot forward. Can be below or above the travel.
M.heightFor = function (o, a) {
  var c = M.cg(o), b = (o.ramp || 0) * D2R, df = o.wb / 2 - c.x;
  if (df <= 0) return -Infinity;
  var hc = df * Math.cos(b) / (a + Math.sin(b));                // combined height that tips at exactly a
  if (!(hc > 0)) return Infinity;
  return (hc * c.m - o.m1 * o.h1) / o.m2;
};
/* What happens at a braking rate `want` (g): the tread caps it, then the resultant (weight plus braking) is tested against
   both contact points. Standing still (no braking) it must land between the wheels, or the robot tips over on its own:
   forward past the front wheels, or backward behind the rear ones. Braking only moves the line forward, so a robot that
   stands is never tipped backward by braking. kind: "back", "front" (tips standing still), "tips" (tips forward at this
   braking), "slides" (the tread lets go before it could tip), "holds" (stays down, but harder braking could tip it). */
M.judge = function (o, want) {
  var L = M.limits(o), a = Math.max(0, Math.min(want, L.gripBrake));
  var j = { L: L, brake: a, capped: want > L.gripBrake + 1e-9 };
  if (L.tipAccel <= 1e-9) j.kind = "back";
  else if (L.tipBrake <= 1e-9) j.kind = "front";
  else if (a >= L.tipBrake - 1e-9) j.kind = "tips";
  else if (L.gripBrake < L.tipBrake) j.kind = "slides";
  else j.kind = "holds";
  return j;
};
/* The hand-over when another point of the robot hits the floor, for a perfectly plastic hit (no bounce, no slip): the
   floor's impulse acts at the new point Q, so angular momentum about Q is kept. Before, the robot turns at w about P,
   so its centre of gravity G moves at w x (G - P); about Q that is I w + m (G - Q) . (G - P) w. After, it turns about Q
   with I_Q = I + m |G - Q|^2. If that would turn it back the other way, the old point is pressed into the floor and it
   stops turning. I is about G; G, P, Q are points in the robot's own frame (the dot product does not depend on tilt). */
M.handover = function (w, I, m, G, P, Q) {
  var gq = [G[0] - Q[0], G[1] - Q[1]], gp = [G[0] - P[0], G[1] - P[1]];
  var w1 = w * (I + m * (gq[0] * gp[0] + gq[1] * gp[1])) / (I + m * (gq[0] * gq[0] + gq[1] * gq[1]));
  return w1 * w < 0 ? 0 : w1;
};
/* Accelerating forward at `want` g (the tread caps it): does the front lift? The robot tips backward about its rear
   wheels when acceleration ÷ g > (distance to the rear wheel ÷ height) cos b + sin b. Returns { acc, tips, capped }. */
M.judgeAccel = function (o, want) {
  var L = M.limits(o), a = Math.max(0, Math.min(want, L.gripAccel));
  return { acc: a, tips: L.tipAccel > 1e-9 && L.tipBrake > 1e-9 && a >= L.tipAccel - 1e-9, capped: want > L.gripAccel + 1e-9 };
};
// The mechanism height (in) above which accelerating at a (g) lifts the front wheels.
M.heightForAccel = function (o, a) {
  var c = M.cg(o), b = (o.ramp || 0) * D2R, dr = o.wb / 2 + c.x;
  if (dr <= 0) return -Infinity;
  var den = a - Math.sin(b); if (!(den > 0)) return Infinity;
  return (dr * Math.cos(b) / den * c.m - o.m1 * o.h1) / o.m2;
};
/* "just over" when a figure passes a limit by less than 5%, so a near miss does not read like a clear failure. */
M.overWords = function (fig, lim) { return fig < lim * 1.05 ? "just over" : "over"; };
/* The moments to mark on the tilt chart from a stop (M.stop): the peak, when the bumper first touches, and when the
   robot is back on its wheels after lifting. Times in s, the peak in degrees; null where it does not happen. */
M.tiltMarks = function (sim) {
  if (!sim.lifted) return null;
  var k = 0, i; for (i = 1; i < sim.phi.length; i++) if (sim.phi[i] > sim.phi[k]) k = i;
  var bump = null; for (i = 0; i < sim.piv.length; i++) if (sim.piv[i] === 2) { bump = sim.t[i]; break; }
  var back = null; for (i = k; i < sim.phi.length; i++) if (sim.phi[i] <= 1e-6) { back = sim.t[i]; break; }
  return { peakT: sim.t[k], peakDeg: sim.phi[k] / D2R, bumpT: bump, backT: back };
};
/* Where the line of the resultant (weight plus the braking force) meets the floor, in forward of the middle. */
M.landing = function (o, a) { var c = M.cg(o), b = (o.ramp || 0) * D2R; return c.x + c.h * (a + Math.sin(b)) / Math.cos(b); };
/* A hard stop. The robot brakes at a (g; already no more than the tread allows) from v0 (in/s) until it stops, then lets
   go. If the rear lifts, the robot turns as one rigid body about whichever point is on the floor: the front wheels
   first, then the bottom edge of the front bumper once it reaches the floor, until it either drops back onto its rear
   wheels or comes to rest on the bumper's face or the mast (fallen over). o adds L, H (chassis body, for its inertia),
   bumpX, bBot, bTop (front bumper face and its bottom and top heights), mastX, mastTop.
   Returns { t[], phi[] (radians, nose down), piv[], qx[], qy[] (the turning point and where it is), P (the points),
   maxPhi, lifted, bumper (it leant on the bumper), fell, stopT }. */
M.stop = function (o, a, v0, T) {
  var c = M.cg(o), b = (o.ramp || 0) * D2R, g = 386.09, cb = Math.cos(b), sb = Math.sin(b);
  // Inertia about the combined centre of gravity: the chassis as a box, the mechanism as a point.
  var I = o.m1 * ((o.L * o.L + o.H * o.H) / 12 + sq(o.x1 - c.x) + sq(o.h1 - c.h)) + o.m2 * (sq(o.x2 - c.x) + sq(o.h2 - c.h));
  var P = [[-o.wb / 2, 0], [o.wb / 2, 0], [o.bumpX, o.bBot], [o.bumpX, o.bTop], [o.mastX, o.mastTop]];
  function Ipiv(k) { return I + c.m * (sq(c.x - P[k][0]) + sq(c.h - P[k][1])); }
  function world(p, k, q, f) { var dx = p[0] - P[k][0], dy = p[1] - P[k][1], cf = Math.cos(f), sf = Math.sin(f); return [q[0] + dx * cf + dy * sf, q[1] - dx * sf + dy * cf]; }
  var stopT = a > 0 ? v0 / (a * g) : 0, dt = 0.0005, phi = 0, w = 0, piv = 1, q = [P[1][0], 0], rest = false;
  var out = { t: [], phi: [], piv: [], qx: [], qy: [], P: P, maxPhi: 0, lifted: false, bumper: false, fell: false, stopT: stopT, hand: [] };
  for (var i = 0, t = 0; t <= T + 1e-9; i++, t = i * dt) {
    if (i % 20 === 0) { out.t.push(t); out.phi.push(phi); out.piv.push(piv); out.qx.push(q[0]); out.qy.push(q[1]); }
    if (rest) continue;
    var fx = (t < stopT ? a * g : 0) + g * sb, fy = -g * cb, r = world([c.x, c.h], piv, [0, 0], phi);
    var tq = c.m * (r[1] * fx - r[0] * fy);                       // clockwise (nose down) moment about the turning point
    if (piv === 1 && phi <= 0 && tq <= 0) { phi = 0; w = 0; continue; }
    w += tq / Ipiv(piv) * dt; phi += w * dt;
    // Has another point reached the floor? Then the robot turns about that one from here.
    var low = 0, hit = -1;
    for (var k = 0; k < P.length; k++) { if (k === piv) continue; var y = world(P[k], piv, q, phi)[1]; if (y < low - 1e-9) { low = y; hit = k; } }
    if (hit === 0) { var qf = world(P[1], piv, q, phi); q = [qf[0], 0]; piv = 1; phi = 0; w = 0; }   // back on all wheels
    else if (hit > 0) {
      var qn = world(P[hit], piv, q, phi), w0 = w;
      w = M.handover(w, I, c.m, [c.x, c.h], P[piv], P[hit]);          // plastic hit: angular momentum about the new point
      out.hand.push({ t: t, from: piv, to: hit, w0: w0, w1: w });
      piv = hit; q = [qn[0], 0];
      if (hit === 2) out.bumper = true;
      if (hit >= 3) out.fell = true;                                    // past the bumper's edge: it has gone over
      if (hit === 4 || phi > 2.6) { rest = true; w = 0; }              // lying on the mast
    }
    if (phi > 1e-4) out.lifted = true;
    out.maxPhi = Math.max(out.maxPhi, phi);
  }
  return out;
};
function sq(x) { return x * x; }
/* The time (s) of the greatest tilt in a stop from M.stop, or null when the rear never lifts. */
M.worstT = function (sim) { if (!sim.lifted) return null; var k = 0; for (var i = 1; i < sim.phi.length; i++) if (sim.phi[i] > sim.phi[k] + 1e-12) k = i; return sim.t[k]; };

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The page ---------- */
var K = D.calc, ID = "tool-tip", BUMP = 3.5, BTOP = 7;
function spec(s) {
  var h2 = s.kdown + (s.kup - s.kdown) * F.clamp(s.raised, 0, 100) / 100;
  return { m1: s.mlb, x1: s.mx, h1: s.mh, m2: s.klb, x2: s.kx, h2: h2, wb: s.wb, mu: s.grip, ramp: s.ramp,
    L: s.wb + 5 + 2 * BUMP, H: Math.max(4, 2 * s.mh - 2), bumpX: s.wb / 2 + 2.5 + BUMP, bBot: 2, bTop: BTOP,
    mastX: s.kx + 4.5, mastTop: Math.max(s.kup, s.kdown) + 5 };
}
function g2(x) { return K.fix(x, 2); }

K.tool({
  id: ID,
  defaults: { mlb: 105, mh: 7, wb: 22, mx: 0, klb: 22, kdown: 14, kup: 52, kx: 4, raised: 100, brake: 0.8, grip: 1.1, ramp: 0, v0: 15 },
  stage: { ratio: 1.35, narrow: 0.82, tall: true, label: "Side view to scale: the chassis on its wheels, the raised mechanism, the centres of gravity, and the line the robot's weight and braking act along." },
  autoplay: true,

  compute: function (s) {
    var o = spec(s), j = M.judge(o, s.brake), L = j.L, r = { o: o, L: L, cg: L.cg, kind: j.kind };
    r.brake = j.brake; r.capped = j.capped;                        // the tread cannot brake harder than its grip
    r.still = j.kind === "back" || j.kind === "front";              // tips over standing still
    r.tips = j.kind === "front" || j.kind === "tips";
    r.hFor = M.heightFor(o, r.brake);
    r.land = M.landing(o, r.brake);
    r.sim = M.stop(o, r.brake, s.v0 * 12, 2);
    // The same figure as an acceleration: it can lift the front wheels too.
    var ja = M.judgeAccel(o, s.brake); r.acc = ja.acc; r.backTips = !r.still && ja.tips; r.hBack = M.heightForAccel(o, r.acc);
    // The braking that tips it, for every mechanism height (and the acceleration that tips it backward).
    var lo = Math.min(s.kdown, s.kup), hi = Math.max(s.kdown, s.kup, lo + 1), curve = [], back = [];
    for (var i = 0; i <= 60; i++) { var h = lo + (hi - lo) * i / 60, q = M.limits(Object.assign({}, o, { h2: h })); curve.push([h, q.tipBrake]); back.push([h, q.tipAccel]); }
    r.curve = curve; r.back = back; r.lo = lo; r.hi = hi;
    return r;
  },

  controls: function (s) {
    return K.group(ID, "mech", "Raised mechanism", K.num(ID, "raised", "Raised", { unit: "%", min: 0, max: 100, step: 1, slider: true, tip: "0 is all the way down, 100 all the way up." }) +
        K.num(ID, "klb", "Weight", { unit: "lb", min: 0, max: 80, step: 0.5, tip: "Only the part that goes up: carriage, stages, the end effector and a game piece." }) +
        K.num(ID, "kdown", "Centre of gravity, down", { unit: "in", min: 0, max: 80, step: 0.5, tip: "Height above the floor of the moving part's centre of gravity when it is all the way down." }) +
        K.num(ID, "kup", "Centre of gravity, up", { unit: "in", min: 0, max: 100, step: 0.5, slider: true }) +
        K.num(ID, "kx", "Forward of the middle", { unit: "in", min: -30, max: 30, step: 0.5, tip: "Where the mechanism sits, front to back, from the middle of the wheelbase. Behind the middle is negative." })) +
      K.group(ID, "drive", "Driving", K.num(ID, "brake", "Braking or accelerating", { unit: "g", min: 0, max: 1.3, step: 0.01, slider: true, tip: "A hard stop on carpet is 0.6 to 1 g. 1 g is 32 ft/s² (9.8 m/s²)." }) +
        K.num(ID, "grip", "Wheel grip", { min: 0.3, max: 2, step: 0.05, tip: "Friction coefficient of the tread on carpet: 1.0 to 1.3 for most tread. The wheels cannot brake harder than this many g." }) +
        K.num(ID, "ramp", "Ramp angle", { unit: "°", min: -30, max: 30, step: 0.5, tip: "Positive: the robot points down the slope. Negative: it points up the slope." })) +
      K.group(ID, "chassis", "Chassis", K.num(ID, "mlb", "Weight without the mechanism", { unit: "lb", min: 10, max: 200, step: 1, tip: "With battery and bumpers." }) +
        K.num(ID, "mh", "Centre of gravity height", { unit: "in", min: 1, max: 40, step: 0.25, tip: "Most drive bases with the battery low sit at 5 to 8 in." }) +
        K.num(ID, "wb", "Wheelbase, front to back", { unit: "in", min: 6, max: 40, step: 0.25, tip: "Between the wheel axles, front to back." }) +
        K.num(ID, "mx", "Centre of gravity forward of the middle", { unit: "in", min: -15, max: 15, step: 0.25 })) +
      K.group(ID, "adv", "Fine tuning", K.num(ID, "v0", "Speed before the stop", { unit: "ft/s", min: 0, max: 25, step: 0.5, tip: "Used only for the animation: how long the stop lasts. The tipping numbers do not depend on it." }), true);
  },

  outs: function (s, r) {
    var L = r.L, c = r.cg, st, text, more = "", sim = r.sim, deg = function (x) { return K.fix(x / D2R, 0); };
    var on = s.ramp ? " on this ramp" : "", off = M.landing(r.o, 0);
    var limit = isFinite(r.hFor) && r.hFor > Math.min(s.kdown, s.kup);
    if (r.kind === "back") { st = "bad"; text = "It tips over backward standing still" + on + ", because its weight acts " + K.fix(-s.wb / 2 - off, 1) + " in behind the rear wheels: move weight forward or lengthen the wheelbase."; }
    else if (r.kind === "front") { st = "bad"; text = "It tips over forward standing still" + on + ", because its weight acts " + K.fix(off - s.wb / 2, 1) + " in ahead of the front wheels: move weight back or lengthen the wheelbase."; }
    else if (r.tips || r.backTips) {
      // One sentence: what happens, both ways when both, and what to change. The detail goes in the quieter line.
      var lo2 = Math.min(s.kdown, s.kup), hs = [];
      if (r.tips && isFinite(r.hFor) && r.hFor > lo2) hs.push(r.hFor);
      if (r.backTips && isFinite(r.hBack) && r.hBack > lo2) hs.push(r.hBack);
      var ways = [];
      if (r.tips) ways.push("braking at " + g2(r.brake) + " g is " + M.overWords(r.brake, L.tipBrake) + " the " + g2(L.tipBrake) + " g that lifts the rear wheels");
      if (r.backTips) ways.push((r.tips ? "" : "accelerating at " + g2(r.acc) + " g ") + (r.tips ? "accelerating at it is " : "is ") + M.overWords(r.acc, L.tipAccel) + " the " + g2(L.tipAccel) + " g that lifts the front");
      var dir = r.tips && r.backTips ? "lower" : r.tips ? "back" : "forward";
      st = "bad"; text = ways.join(" and ") + ": " + (hs.length && hs.length === (r.tips ? 1 : 0) + (r.backTips ? 1 : 0) ? "keep the mechanism's centre of gravity well under " + K.fix(Math.min.apply(null, hs), 0) + " in or move weight " + dir : "move weight " + dir + " or lower it") + ". Test it tethered or against a padded stop, with nobody in its path: do not try to catch a falling robot.";
      text = text.charAt(0).toUpperCase() + text.slice(1);
      more = !r.tips ? "The animation shows a stop, which this robot survives; the front lifts when it speeds up at this rate." : (sim.fell ? "From " + s.v0 + " ft/s this model predicts it falls over onto its front." : sim.bumper ? "From " + s.v0 + " ft/s this model predicts the rear lifts until the front bumper hits the floor (" + deg(sim.maxPhi) + "°), then drops back." : sim.lifted ? "From " + s.v0 + " ft/s the rear lifts to " + deg(sim.maxPhi) + "° and drops back." : "") +
        (sim.lifted ? " A real bumper can bounce or crush, so near the edge it could go either way." : "");
    } else if (r.kind === "slides") { st = "ok"; text = "The wheels slide before it can tip: tipping needs " + g2(L.tipBrake) + " g of braking and the tread gives at most " + g2(Math.max(0, L.gripBrake)) + " g."; }
    else {
      st = "warn"; text = "Holds at " + g2(r.brake) + " g, but a harder stop could tip it: it tips at " + g2(L.tipBrake) + " g and the tread allows " + g2(L.gripBrake) + " g.";
      if (isFinite(r.hFor)) more = "At this braking it tips once the mechanism's centre of gravity is above " + K.fix(r.hFor, 0) + " in, the ideal limit: stay well under it. Test it tethered or against a padded stop, with nobody in its path.";
    }
    if (r.capped && !r.still) more = (more ? more + " " : "") + "The tread cannot brake at " + g2(s.brake) + " g here; the most is " + g2(Math.max(0, L.gripBrake)) + " g, used above.";
    var hTxt = !isFinite(r.hFor) ? (r.hFor > 0 ? "never" : "always") : K.fix(r.hFor, 1);
    return K.verdict(st, text, more) + K.outs([
      { k: "Combined centre of gravity", v: K.fix(c.x, 1) + " / " + K.fix(c.h, 1), u: "in", sub: "forward / high", tip: "The weighted average of the chassis and the mechanism." },
      { k: "Braking that tips it", v: g2(L.tipBrake), u: "g", sub: r.still ? "forward" : L.slidesFirstBrake ? "forward; the wheels slide first" : "forward; it tips before it slides", state: r.tips ? "bad" : r.still ? "" : L.slidesFirstBrake ? "ok" : "warn", tip: "Forward tip when braking ÷ g is more than (distance to the front wheel ÷ height)." },
      { k: "Acceleration that tips it", v: g2(L.tipAccel), u: "g", sub: r.kind === "back" ? "backward; it tips standing still" : r.backTips ? "backward; your " + g2(r.acc) + " g is " + M.overWords(r.acc, L.tipAccel) + " it" : L.slidesFirstAccel ? "backward; the wheels slip first" : "backward; tread allows " + g2(L.gripAccel), state: r.kind === "back" || r.backTips ? "bad" : L.slidesFirstAccel ? "" : "warn" },
      { k: "Static tip angle", v: K.fix(L.staticF, 0) + "° / " + K.fix(L.staticR, 0) + "°", sub: "forward / backward", tip: "The steepest slope it can stand on without tipping, nose down and nose up." },
      { k: "Mechanism height limit", v: hTxt, u: isFinite(r.hFor) ? "in" : "", sub: "its centre of gravity, at " + g2(r.brake) + " g", tip: "The mechanism's centre of gravity height above which braking at this rate tips the robot." },
    ]) + '<p class="mute small">Each static tip angle\'s tangent is its g figure: tan ' + K.fix(L.staticF, 0) + "° = " + g2(Math.tan(L.staticF * D2R)) + ", tan " + K.fix(L.staticR, 0) + "° = " + g2(Math.tan(L.staticR * D2R)) + (s.ramp ? ", on flat ground; this ramp changes the g figures" : "") + ".</p>";
  },

  more: function (s, r) {
    var L = r.L, hl = [{ y: Math.max(0, L.gripBrake), label: "tread limit " + g2(L.gripBrake) + " g" }];
    // Shade the heights where your figure tips it, braking or accelerating.
    var hx = []; if (isFinite(r.hFor) && r.hFor < r.hi) hx.push(Math.max(r.lo, r.hFor)); if (isFinite(r.hBack) && r.hBack < r.hi && L.tipAccel <= L.gripAccel + 1e-9) hx.push(Math.max(r.lo, r.hBack));
    var band = hx.length ? [{ x0: Math.min.apply(null, hx), x1: r.hi }] : [];
    var top = Math.max(1.5, L.gripBrake * 1.25, r.brake * 1.25), cut = function (p) { return [p[0], p[1] <= top && p[1] >= 0 ? p[1] : NaN]; };
    var chOpts = { id: "tip-h", title: "Braking that tips it, by mechanism height", x: { label: "mechanism centre of gravity (in)", name: "Height", unit: "in", min: r.lo, max: r.hi }, y: { label: "g", unit: "g", min: 0, max: top },
      series: [{ name: "Tips forward when braking", pts: r.curve.map(cut), color: 1 }, { name: "Tips backward when accelerating", pts: r.back.map(cut), color: 2, dash: true }, { name: "Your figure, " + g2(r.brake) + " g", pts: [[r.lo, r.brake], [r.hi, r.brake]], color: 3 }], hlines: hl, bands: band,
      dots: [{ x: r.o.h2, y: Math.min(top, Math.max(0, L.tipBrake)) }],
      note: "The ring is your mechanism, at " + K.fix(r.o.h2, 0) + " in." + (band.length ? " Shaded: the heights at which your " + g2(r.brake) + " g tips the robot, braking or accelerating." : "") };
    placeLabels(chOpts);
    var ch = K.chart(chOpts);
    var sim = r.sim, pts = sim.t.map(function (t, i) { return [t, sim.phi[i] / D2R]; });
    // Mark the peak (with the bumper touching, when it does) and the moment it is back on its wheels.
    var tm = M.tiltMarks(sim), tdots = [];
    if (tm) {
      var near = tm.bumpT != null && Math.abs(tm.bumpT - tm.peakT) < 0.03;
      tdots.push({ x: tm.peakT, y: tm.peakDeg, label: (near ? "bumper touches, " : "peak ") + K.fix(tm.peakDeg, 0) + "°" });
      if (tm.bumpT != null && !near) tdots.push({ x: tm.bumpT, y: F.interp(sim.t, sim.phi, tm.bumpT) / D2R, label: "bumper touches" });
      if (tm.backT != null) tdots.push({ x: tm.backT, y: 0, label: "back on its wheels" });
    }
    var tilt = K.chart({ id: "tip-a", title: "Tilt during the stop", x: { label: "time (s)", name: "Time", unit: "s", min: 0, max: 2 }, y: { label: "degrees", unit: "°", min: 0, max: Math.max(10, sim.maxPhi / D2R * 1.3) },
      series: [{ name: "Tilt", pts: pts, color: 3 }], dots: tdots, bands: sim.stopT > 0 ? [{ x0: 0, x1: Math.min(2, sim.stopT), label: "braking" }] : [] });
    return '<div class="chartrow">' + ch + tilt + "</div>" + K.notes(
      "<p>The combined centre of gravity is the weighted average of the chassis's and the mechanism's:</p>" +
      '<p class="eq">x = (m₁ x₁ + m₂ x₂) ÷ (m₁ + m₂),  h = (m₁ h₁ + m₂ h₂) ÷ (m₁ + m₂)</p>' +
      "<p>When the robot brakes, the floor pushes back on the wheels and the robot's mass keeps going: as if a force of mass × braking pushed forward at the centre of gravity. Add it to the weight and you get one force along a slanted line. If that line meets the floor between the wheels, the robot stays down. If it meets the floor ahead of the front wheels, the robot turns about them and the rear lifts.</p>" +
      '<p class="eq">tips forward when braking ÷ g > distance to the front wheel ÷ height</p>' +
      '<p class="eq">static tip angle = atan(distance to the wheel ÷ height)</p>' +
      "<p>The wheels cannot brake harder than grip × g, so if the tipping threshold is above the grip the robot slides first and cannot tip on flat carpet.</p>" +
      "<p>On a ramp, the ramp angle b is positive when the robot points down the slope (its front lower than its back) and negative when it points up the slope. The sums are done along the slope and square to it. The robot's weight splits in two: m g sin b along the slope, pulling it downhill, and m g cos b pressing it into the slope. Braking adds a force of m × braking at the centre of gravity, pointing the way the robot is going. Facing downhill, both the braking and the downhill pull point forward; the slope's push on the wheels, m g cos b, holds the robot down. It tips forward when the forward forces' turning effect about the front wheels beats the holding one:</p>" +
      '<p class="eq">(braking + g sin b) × height > g cos b × distance to the front wheel</p>' +
      '<p class="eq">so it tips at braking ÷ g = (d ÷ h) cos b − sin b</p>' +
      "<p>Here d is the distance from the centre of gravity to the front wheel along the slope and h its height above the slope. Facing uphill b is negative, so the same formula gives (d ÷ h) cos b + sin |b|: the slope helps hold the front down. The tread limit is worked out the same way, (grip × cos b) − sin b.</p>" +
      "<p>The animation brakes at the chosen rate (or the most the tread allows) until the robot stops from the speed in Fine tuning, then lets go. If the rear lifts, the robot turns about its front wheels as one rigid body: the chassis counted as a box, the mechanism as a weight at its centre of gravity. A short, hard stop can lift the rear and drop it back; a longer one can carry it over.</p>" +
      "<p>When the front bumper (or, further over, the top of the bumper or the mast) reaches the floor, the model treats the hit as perfectly plastic: no bounce and no slip. The floor's push then acts at the new point, so the robot's angular momentum about that point is kept, and it carries on turning about that point at the speed that gives.</p>" +
      '<p class="eq">new turning rate = old rate × (I + m (G − Q) · (G − P)) ÷ (I + m |G − Q|²)</p>' +
      "<p>Here I is the robot's inertia about its centre of gravity G, P the old point on the floor and Q the new one. A real bumper squashes and bounces, so near the edge the robot could stay up where this model says it falls, or the other way round: read a near thing as a warning, not a promise.</p>" +
      "<p>Standing still, the weight alone must land between the wheels. If it lands behind the rear wheels (a mechanism hung far back, or pointing up a steep ramp) or ahead of the front ones, the robot tips over on its own and the answer says so before anything about braking.</p>" +
      "<p>Left out: bumpers hitting things, the mechanism swinging or flexing, suspension and tyre squash, and the braking force changing once only the front wheels touch. Weigh and balance your robot to find the real centre of gravity: hang it from two points, or put each end on a scale.</p>");
  },

  duration: function () { return 2; },
  // When the rear lifts, rest on the moment of greatest tilt, the picture the verdict describes. Otherwise the end.
  rest: function (s, r) { return M.worstT(r.sim); },

  draw: function (g, s, r, t) {
    var c = g.c, o = r.o, L = r.L, cg = r.cg, sim = r.sim, wb = s.wb;
    var phi = F.interp(sim.t, sim.phi, t), b = s.ramp * D2R, braking = t < sim.stopT;
    var fi = F.clamp(Math.round(t / (sim.t[1] - sim.t[0] || 0.01)), 0, sim.t.length - 1);
    function rot(p, a, q) { var dx = p[0] - q[0], dy = p[1] - q[1], ca = Math.cos(a), sa = Math.sin(a); return [q[0] + dx * ca + dy * sa, q[1] - dx * sa + dy * ca]; }
    // A point on the robot, tilted about whichever point is on the floor at frame j (now, when j is left out).
    function R(p, j) { var k = j == null ? fi : j, P = sim.P[sim.piv[k]], f = j == null ? phi : sim.phi[k], q = rot(p, f, P); return [q[0] - P[0] + sim.qx[k], q[1] - P[1] + sim.qy[k]]; }
    function W(p) { return rot(p, b, [0, 0]); }                         // slope frame to the world
    // What has to fit: the robot upright and at its largest tilt, the resultant and where it lands.
    var mastTop = Math.max(s.kup, s.kdown, o.h2) + 5, front = wb / 2 + BUMP + 2.5, rear = -front;
    var outline = [[rear, 0], [front, 0], [front, BTOP], [rear, BTOP], [s.kx - 4, mastTop], [s.kx + 4, mastTop]];
    var pts = [];
    for (var j = 0; j < sim.t.length; j += 5) outline.forEach(function (p) { pts.push(W(R(p, j))); });
    var land = r.land, lx = F.clamp(land, rear - 20, front + 30);
    pts.push(W([lx, 0]), W([rear - 6, -2]), W([front + 8, -2]));
    var Lg = 14, fx = r.brake + Math.sin(b), fy = Math.cos(b);
    pts.push(W([cg.x + fx * Lg, cg.h - fy * Lg]));
    var bx0 = Math.min.apply(null, pts.map(function (p) { return p[0]; })) - 4, bx1 = Math.max.apply(null, pts.map(function (p) { return p[0]; })) + 4;
    var by0 = Math.min.apply(null, pts.map(function (p) { return p[1]; })) - 3, by1 = Math.max.apply(null, pts.map(function (p) { return p[1]; })) + 3;
    var V = g.view({ x0: bx0, x1: bx1, y0: by0, y1: by1 }, { l: 12, r: 12, t: 44, b: 52 }, "middle");
    g.grid(V, 6, g.w > 480 ? "6 in squares" : "");
    function S(p) { var w = W(p); return [V.X(w[0]), V.Y(w[1])]; }
    function SR(p) { return S(R(p)); }
    // The floor (along the slope), with hatching that slides back while the robot is moving.
    var moved = 0; if (sim.stopT > 0) { var tt = Math.min(t, sim.stopT); moved = s.v0 * 12 * tt - 0.5 * r.brake * 386.09 * tt * tt; }
    var f0 = S([-400, 0]), f1 = S([400, 0]);
    for (var hx = Math.floor((-200 + moved) / 4) * 4; hx < 200 + moved; hx += 4) { var a1 = S([hx - moved, 0]), a2 = S([hx - moved - 3, -3]); g.line(a1[0], a1[1], a2[0], a2[1], { color: c.line2, width: 1 }); }
    g.line(f0[0], f0[1], f1[0], f1[1], { color: c.text2, width: 1.5 });
    // The wheelbase on the floor: the region the line must land in.
    var inside = r.land < wb / 2 && r.land > -wb / 2 && !r.still;
    var wbA = S([-wb / 2, 0]), wbB = S([wb / 2, 0]);
    g.line(wbA[0], wbA[1], wbB[0], wbB[1], { color: inside ? c.ok : c.bad, width: Math.max(4, V.L(0.6)), cap: "butt" });
    // The chassis: frame, bumpers, wheels.
    function box(x0, y0, x1, y1, o2) { g.poly([SR([x0, y0]), SR([x1, y0]), SR([x1, y1]), SR([x0, y1])], Object.assign({ close: true }, o2)); }
    box(-wb / 2 - 2.5, 2.5, wb / 2 + 2.5, 4.5, { fill: c.part, stroke: c.partLine, width: 1 });
    box(-wb / 2 - 2.5 - BUMP, 2, -wb / 2 - 2.5, BTOP, { fill: c.s1, stroke: null });
    box(wb / 2 + 2.5, 2, wb / 2 + 2.5 + BUMP, BTOP, { fill: c.s1, stroke: null });
    var spin = braking ? moved / 2 : sim.stopT > 0 ? (s.v0 * 12 * sim.stopT - 0.5 * r.brake * 386.09 * sim.stopT * sim.stopT) / 2 : 0;
    [-wb / 2, wb / 2].forEach(function (x) { var p = SR([x, 2]); g.wheel(p[0], p[1], V.L(2), spin - phi, { spokes: 5 }); });
    // The mast and the carriage at its current height.
    var mb = 4.5, mtop = Math.max(s.kup, s.kdown) + 5, h2 = o.h2;
    [s.kx - 3, s.kx + 3].forEach(function (x) { var p0 = SR([x, mb]), p1 = SR([x, mtop]); g.line(p0[0], p0[1], p1[0], p1[1], { color: c.part2, width: Math.max(2.5, V.L(1)), cap: "butt" }); });
    if (s.klb > 0) box(s.kx - 4.5, h2 - 3, s.kx + 4.5, h2 + 3, { fill: c.part, stroke: c.partLine, width: 1 });
    // Contact points.
    [-wb / 2, wb / 2].forEach(function (x) { if ((x < 0 && phi > 0.004) || (x > 0 && sim.piv[fi] !== 1)) return; var p = SR([x, 0]); g.poly([[p[0], p[1]], [p[0] - 5, p[1] + 7], [p[0] + 5, p[1] + 7]], { fill: c.text2, stroke: null, close: true }); });
    // Centres of gravity: chassis, mechanism, then the combined one.
    var rad = F.clamp(V.L(1.1), 5, 9);
    cgMark(g, SR([s.mx, s.mh]), rad * 0.8, c.text, c.sheet);
    if (s.klb > 0) cgMark(g, SR([s.kx, h2]), rad * 0.8, c.text, c.sheet);
    var C = SR([cg.x, cg.h]);
    // The forces at the combined centre of gravity: weight (straight down), braking (forward), and their sum.
    // In the slope frame the weight is (g sin b, -g cos b) and the braking force (a, 0). They do not turn with the robot.
    // Once the robot has stopped, the line for the chosen braking stays as a faint guide, so the lesson stays on screen.
    // On the still picture the forces of the stop are drawn too, so it shows why the robot tips.
    var still = !K.playing(ID) && r.brake > 0.01;
    var k = V.L(Lg), brk = braking || still ? r.brake : 0, level = phi < 0.02, ghost = !braking && level && r.brake > 0.01 && !still;
    var wv = [Math.sin(b), -Math.cos(b)];
    function vec(v) { var w = W(v); return [w[0] * k, -w[1] * k]; }
    function sum(a) { return [wv[0] + a, wv[1]]; }
    var res = sum(brk), shown = ghost ? sum(r.brake) : res, wS = vec(wv), bS = vec([brk, 0]), rS = vec(res);
    // The line of the resultant, carried on to the floor, and where it lands.
    var cgw = R([cg.x, cg.h]), landX = cgw[0] + cgw[1] * shown[0] / -shown[1], landP = S([landX, 0]);
    var out2 = landX > wb / 2 || landX < -wb / 2 || r.still, lcol = ghost ? c.ghost : out2 ? c.bad : c.force;
    if (level || still) {
      g.line(C[0], C[1], landP[0], landP[1], { color: lcol, width: 1.25, dash: [5, 4] });
      g.circle(landP[0], landP[1], 4.5, { fill: ghost ? c.ghost : out2 ? c.bad : c.ok, stroke: c.sheet, width: 1.5 });
    }
    g.arrow(C[0], C[1], C[0] + wS[0], C[1] + wS[1], { color: c.text2, width: 2, head: 8 });
    if (brk > 0.01) {
      g.arrow(C[0], C[1], C[0] + bS[0], C[1] + bS[1], { color: c.text2, width: 2, head: 8 });
      g.arrow(C[0], C[1], C[0] + rS[0], C[1] + rS[1], { color: c.force, width: 2.5, head: 9 });
    }
    cgMark(g, C, rad, c.accent, c.sheet);
    // Labels under the floor, kept apart: the wheelbase in the middle, where the line lands below it.
    var wide = g.w > 520;
    if (level) {
      var dist = landX - wb / 2, back = -wb / 2 - landX, msg = dist > 0 ? K.fix(dist, 1) + " in past the front wheel: it tips" : back > 0 ? K.fix(back, 1) + " in behind the rear wheel: it tips" : K.fix(-dist, 1) + " in inside the front wheel";
      msg = wide ? (ghost ? "While braking at " + g2(r.brake) + " g, the line lands " : "The line lands ") + msg : (ghost ? "While braking, lands " : "Lands ") + msg.replace(": it tips", "");
      var wbm = S([0, 0]), my = Math.max(wbm[1], landP[1]) + 40, tw = g.textWidth(msg, { size: 11 }), tx = F.clamp(landP[0] + 18, 8, g.w - tw - 8);
      g.text("wheelbase " + K.fix(wb, 1) + " in", wbm[0], wbm[1] + 22, { align: "center", color: inside ? c.ok : c.bad, size: 11, weight: 600 });
      g.line(landP[0], landP[1] + 5, F.clamp(landP[0], tx, tx + tw), my - 8, { color: c.mute, width: 1 });
      g.text(msg, tx, my, { color: out2 && !ghost ? c.bad : c.text2, size: 11 });
    }
    // Tilted: name the point it turns about (on the floor) and how high the rear wheels are off it.
    if (phi > 0.004 && sim.piv[fi] < 4) {
      var pv = S([sim.qx[fi], sim.qy[fi]]), pn = ["", "front wheel", "front bumper's edge", "top of the bumper"][sim.piv[fi]] || "";
      g.circle(pv[0], pv[1], 4, { fill: c.bad, stroke: c.sheet, width: 1.5 });
      var ptx = "pivot now: " + pn.replace("front bumper's edge", "bumper's edge"), pw = g.textWidth(ptx, { size: 11, weight: 700 }), pr = pv[0] + 22 + pw < g.w - 6;
      // On a phone the caption at the top names the pivot; there is no room beside it here.
      // Start the words past the front bumper, so they never sit on it.
      var bf = Math.max(SR([wb / 2 + 2.5 + BUMP, 2])[0], SR([wb / 2 + 2.5 + BUMP, BTOP])[0]), lx2 = Math.max(pv[0] + 26, bf + 12);
      pr = lx2 + pw < g.w - 6;
      // High enough to clear the sum arrow's label, which sits at the arrow's tip near the floor.
      if (wide) g.callout(ptx, pv[0] + (pr ? 3 : -3), pv[1] - 3, pr ? lx2 + 14 : pv[0] - 18, pv[1] - 52, { size: 11, weight: 700, color: c.bad });
      var rw = R([-wb / 2, 0]), up = rw[1];
      if (up > 0.3) {
        var r0 = S([rw[0], 0]), r1 = S(rw), ux = Math.min(r0[0], r1[0]) - 14;
        g.line(ux, r0[1], ux, r1[1], { color: c.bad, width: 1.5 }); g.line(ux - 4, r0[1], ux + 4, r0[1], { color: c.bad, width: 1.5 }); g.line(ux - 4, r1[1], ux + 4, r1[1], { color: c.bad, width: 1.5 });
        g.text((wide ? "rear wheels " : "rear ") + K.fix(up, 1) + " in up", ux - 6, (r0[1] + r1[1]) / 2, { align: "right", base: "middle", size: 11, weight: 700, color: c.bad });
      }
    }
    g.callout("combined", C[0] - rad, C[1], C[0] - (wide ? 46 : 30), C[1] - 18, { size: 11 });
    // Name each force where its arrow ends: the weight, the braking as a share of it, and their sum.
    // Each force named at the far end of its arrow: weight to the left of its tip, the sum to the right of its tip,
    // the braking (inertia) beyond its tip. None sits by the centre of gravity, where the arrows start.
    var flY = Math.min(S([-wb / 2, 0])[1], S([wb / 2, 0])[1]);
    g.text("weight", C[0] + wS[0] - 10, Math.min(C[1] + wS[1] - 2, flY - 16), { align: "right", base: "middle", color: c.text2, size: 11, weight: 700 });
    if (brk > 0.01) {
      // Not a push from outside: it is how braking feels to the robot, its inertia carrying it on.
      if (wide) { g.text("what braking feels like to the robot", C[0] + bS[0] + 8, C[1] + bS[1] - 9, { base: "middle", color: c.text2, size: 11, weight: 700 }); g.text("(its inertia), " + g2(brk) + " × weight", C[0] + bS[0] + 8, C[1] + bS[1] + 6, { base: "middle", color: c.text2, size: 11, weight: 700 }); }
      // Phone: after the arrow's tip if it fits, else above the arrow, starting clear of the centre-of-gravity mark.
      else { var inT = "inertia, " + g2(brk) + " × weight", inR = C[0] + bS[0] + 8 + g.textWidth(inT, { size: 11, weight: 700 }) < g.w - 4; g.text(inR ? inT : "inertia, " + g2(brk) + " g", inR ? C[0] + bS[0] + 8 : C[0] + rad + 6, C[1] + bS[1] + (inR ? -2 : -13), { base: "middle", align: "left", color: c.text2, size: 11, weight: 700 }); }
      g.text(wide ? "their sum" : "sum", C[0] + rS[0] + 10, C[1] + rS[1] - 2, { base: "middle", color: c.force, size: 11, weight: 700 });
    }
    var state = r.kind === "back" ? "tips backward standing still" : r.kind === "front" ? "tips forward standing still" : sim.piv[fi] >= 3 ? "fallen over" : sim.piv[fi] === 2 ? "now pivoting on the front bumper's edge, " + K.fix(phi / D2R, 0) + "°" : sim.piv[fi] === 3 ? "now pivoting on the top of the bumper, " + K.fix(phi / D2R, 0) + "°" : phi > 0.004 ? "pivoting on the front wheels, rear up " + K.fix(phi / D2R, 0) + "°" : braking ? "braking " + g2(r.brake) + " g" : sim.stopT > 0 && t >= sim.stopT ? "the robot has stopped" : "standing";
    g.text(K.fix(t, 2) + " s", 10, 19, { weight: 700, size: 13 });
    g.text(state, 60, 19, { weight: 600, color: phi > 0.004 || r.still ? c.bad : c.text2 });
    var after = still && !braking && sim.stopT > 0 && t >= sim.stopT && wide;
    g.text("A stop from " + s.v0 + " ft/s. Model: rigid robot, no bounce.", 10, 37, { size: 11, color: c.mute });
    if (after) g.text("Braking ended at " + K.fix(sim.stopT, 2) + " s; its swing carries the robot on. The arrows are the forces during the stop.", 10, 52, { size: 11, color: c.mute });
    K.chartNow("tip-a", t);
  }
});
/* Put each level line's label where no curve, dot or other label is: right end above the line, then the left end,
   then below. Works in the kit's chart coordinates (480 by 190; 46 px left, 14 right, 24 top, 34 bottom). */
function placeLabels(o) {
  var W = 480, H = 190, pl = 46, pr = 14, pt = 24, pb = 34, x0 = o.x.min, x1 = o.x.max, y0 = o.y.min, y1 = o.y.max, taken = [];
  function X(x) { return pl + (x - x0) / (x1 - x0) * (W - pl - pr); } function Y(y) { return H - pb - (y - y0) / (y1 - y0) * (H - pt - pb); }
  var pts = []; o.series.forEach(function (sr) { for (var i = 0; i < sr.pts.length; i++) { var p = sr.pts[i], q = sr.pts[i + 1]; if (!isFinite(p[1])) continue; pts.push([X(p[0]), Y(p[1])]); if (q && isFinite(q[1])) for (var k = 1; k < 4; k++) pts.push([X(p[0] + (q[0] - p[0]) * k / 4), Y(p[1] + (q[1] - p[1]) * k / 4)]); } });
  (o.marks || []).forEach(function (m) { var mx = X(m.x); taken.push([mx - 3, pt, mx + 3, H - pb]); });
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
// The centre-of-gravity mark: a circle in quarters, two filled.
function cgMark(g, p, r, col, bg) {
  var ctx = g.ctx; g.circle(p[0], p[1], r, { fill: bg, stroke: col, width: 1.5 });
  ctx.fillStyle = col;
  [[0, Math.PI / 2], [Math.PI, Math.PI * 1.5]].forEach(function (a) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.arc(p[0], p[1], r, a[0], a[1]); ctx.closePath(); ctx.fill(); });
}
})(typeof window !== "undefined" ? window : this);
