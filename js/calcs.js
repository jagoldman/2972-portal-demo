/* Tools: the calculators (GROUND_UP.md section 6, GROUND_UP_BUILD.md section T).
   Nine small FRC calculators: Gearbox, Drivetrain, Belt, Chain, Arm, Elevator, Flywheel, Drill and tap chart, Motors.
   They are new in the 8.3 proposal, so they show in Baseline and Ground up and not in Live (D.visibleTools hides any
   tool with calc: true in Live).
   The pure maths is in D.calcMath, with no page code in it, so a node script can test it.
   Typing never redraws the page: an input updates the state and repaints only the answer, the results and the
   drawing (paint). D.render runs only when the inputs themselves change (a gear stage, a unit, a quick pick).
   Nothing is saved. Copy link puts the inputs in the address (?in=...) so a teammate opens the same setup. */
(function () {
"use strict";
var esc = D.esc;

/* ---------- The maths (no DOM) ---------- */
// Makers' published figures at 12 V: free speed rpm, stall torque N·m, stall current A, free current A.
var MOTORS = [
  { id: "x60", name: "Kraken X60", free: 6000, ts: 7.09, is: 366, i0: 2 },
  { id: "x44", name: "Kraken X44", free: 7530, ts: 4.05, is: 275, i0: 2 },
  { id: "falcon", name: "Falcon 500", free: 6380, ts: 4.69, is: 257, i0: 1.5 },
  { id: "vortex", name: "NEO Vortex", free: 6784, ts: 3.6, is: 211, i0: 3.6 },
  { id: "neo", name: "NEO", free: 5676, ts: 2.6, is: 105, i0: 1.8 },
  { id: "neo550", name: "NEO 550", free: 11000, ts: 0.97, is: 100, i0: 1.4 },
  { id: "cim", name: "CIM", free: 5330, ts: 2.41, is: 131, i0: 2.7 }
];
// g is 9.81 m/s², the value students use in school, so a hand check gives the same digits.
var IN = 0.0254, FT = 0.3048, LB = 0.45359237, G = 9.81, LBF = LB * G;
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function rad(rpm) { return rpm * 2 * Math.PI / 60; }

var M = D.calcMath = {
  MOTORS: MOTORS, IN: IN, FT: FT, LB: LB, G: G, LBF: LBF,
  motor: function (id) { return MOTORS.filter(function (m) { return m.id === id; })[0] || null; },
  rad: rad,
  // Torque constant: newton-metres per amp above the free current.
  kt: function (m) { return m.ts / (m.is - m.i0); },
  // The most torque one motor gives under a current limit (no limit: stall torque).
  limTorque: function (m, lim) { return lim > 0 ? clamp(M.kt(m) * (lim - m.i0), 0, m.ts) : m.ts; },
  // One motor at shaft speed w (rad/s): torque falls in a straight line from stall to free speed, capped by the limit.
  torque: function (m, w, lim) { var t = m.ts * clamp(1 - w / rad(m.free), 0, 1); return lim > 0 ? Math.min(t, M.limTorque(m, lim)) : t; },
  current: function (m, w, lim) { var i = m.i0 + (m.is - m.i0) * clamp(1 - w / rad(m.free), 0, 1); return lim > 0 ? Math.min(i, Math.max(lim, m.i0)) : i; },
  // Peak power: a quarter of stall torque times free speed (rad/s), in watts.
  power: function (m) { return 0.25 * m.ts * rad(m.free); },

  /* Gearbox. stages: [[driving, driven], ...]; eff 0..1; lim in amps or 0 for none. */
  ratio: function (stages) { return stages.reduce(function (r, s) { return r * s[1] / s[0]; }, 1); },
  gearbox: function (m, n, stages, eff, lim) {
    var ratio = M.ratio(stages), wf = rad(m.free), curve = [];
    for (var k = 0; k <= 60; k++) {
      var w = wf * k / 60;
      curve.push([m.free / ratio * k / 60, n * M.torque(m, w, lim) * ratio * eff, M.current(m, w, lim)]);
    }
    return { ratio: ratio, freeRpm: m.free / ratio, stall: n * m.ts * ratio * eff, limited: lim > 0 ? n * M.limTorque(m, lim) * ratio * eff : null, curve: curve };
  },

  /* Drivetrain: wheel in inches, weight in pounds, distance in feet. Steps a simulation at 5 ms. */
  drive: function (m, n, ratio, wheelIn, weightLb, lim, mu, distFt, eff) {
    var r = wheelIn / 2 * IN, mass = weightLb * LB, grip = mu * mass * G, dist = distFt * FT;
    var push = n * M.torque(m, 0, lim) * ratio * eff / r;
    var free = m.free / 60 / ratio * Math.PI * wheelIn / 12;
    // atFree: the distance (ft) where the speed first comes within 0.05 ft/s of free speed, or null if it never does.
    var x = 0, v = 0, t = 0, dt = 0.005, trace = [[0, 0]], k = 0, atFree = null;
    while (t < 10 - 1e-9 && x < dist) {
      var f = Math.min(n * M.torque(m, v / r * ratio, lim) * ratio * eff / r, grip);
      v += f / mass * dt; x += v * dt; t += dt; k++;
      if (atFree === null && free - v / FT < 0.05) atFree = x / FT;
      if (k % 10 === 0) trace.push([t, v / FT]);
    }
    if (k % 10) trace.push([t, v / FT]);
    return { free: free, slip: push > grip, push: push, grip: grip, reached: x >= dist, time: x >= dist ? t : null, speed: v / FT, atFree: atFree, trace: trace };
  },

  /* Belts and chain. Straight spans use the pitch radii; each pulley or sprocket adds its wrapped share of teeth
     times the pitch. For a belt this is exactly 2·sqrt(C² − (R2 − R1)²) + π(R1 + R2) + 2(R2 − R1)·asin((R2 − R1)/C).
     A chain wraps as a polygon, so counting pitches is the exact form (and gives 60 links at 5.500 in for 16T to 16T). */
  beltR: function (p, teeth) { return p * teeth / (2 * Math.PI); },
  chainR: function (p, teeth) { return p / (2 * Math.sin(Math.PI / teeth)); },
  length: function (C, p, n1, n2, r1, r2) {
    if (r1 > r2) { var a = r1; r1 = r2; r2 = a; a = n1; n1 = n2; n2 = a; }
    var d = r2 - r1; if (!(C > d)) return NaN;
    var phi = Math.asin(d / C);
    return 2 * Math.sqrt(C * C - d * d) + p * (n1 * (Math.PI - 2 * phi) + n2 * (Math.PI + 2 * phi)) / (2 * Math.PI);
  },
  // The centre distance that gives this length, by bisection. null when even touching centres would be too long.
  solveC: function (L, p, n1, n2, r1, r2) {
    var lo = Math.abs(r2 - r1) + 1e-9, hi = L / 2 + 1;
    if (!(M.length(lo, p, n1, n2, r1, r2) < L)) return null;
    for (var i = 0; i < 100; i++) { var mid = (lo + hi) / 2; if (M.length(mid, p, n1, n2, r1, r2) < L) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  },
  // Teeth in mesh on the smaller pulley: its wrap angle over a full turn, times its teeth.
  mesh: function (C, n1, n2, r1, r2) {
    var small = r1 <= r2 ? n1 : n2, d = Math.abs(r2 - r1), wrap = 180 - 2 * Math.asin(Math.min(1, d / C)) * 180 / Math.PI;
    return { wrap: wrap, teeth: wrap / 360 * small };
  },
  /* Belt: p in mm, wantC in mm, step 5 (whole fives) or 1. The nearest belt and one size either side. */
  belt: function (p, n1, n2, wantC, step) {
    var r1 = M.beltR(p, n1), r2 = M.beltR(p, n2), minC = r1 + r2;
    var exact = M.length(wantC, p, n1, n2, r1, r2) / p, near = Math.max(step, Math.round(exact / step) * step);
    var opts = [near - step, near, near + step].filter(function (t) { return t > 0; }).map(function (t) {
      var C = M.solveC(t * p, p, n1, n2, r1, r2);
      return { teeth: t, len: t * p, C: C, ok: C != null && C > minC, best: t === near };
    });
    var best = opts.filter(function (o) { return o.best; })[0];
    return { r1: r1, r2: r2, minC: minC, exact: exact, opts: opts, best: best, mesh: best && best.ok ? M.mesh(best.C, n1, n2, r1, r2) : null };
  },
  /* Chain: p in inches, wantC in inches. Chain needs an even number of links (an odd count needs a half link). */
  chain: function (p, n1, n2, wantC) {
    var r1 = M.chainR(p, n1), r2 = M.chainR(p, n2), minC = r1 + r2;
    var exact = M.length(wantC, p, n1, n2, r1, r2) / p, lo = Math.floor(exact / 2 + 1e-9) * 2;
    var opts = [lo, lo + 2].filter(function (t) { return t > 0; }).map(function (t) {
      var C = M.solveC(t * p, p, n1, n2, r1, r2);
      return { links: t, C: C, ok: C != null && C > minC };
    });
    var good = opts.filter(function (o) { return o.ok; }), best = null;
    good.forEach(function (o) { if (!best || Math.abs(o.links - exact) < Math.abs(best.links - exact)) best = o; });
    opts.forEach(function (o) { o.best = o === best; });
    return { r1: r1, r2: r2, minC: minC, exact: exact, opts: opts, best: best, mesh: best ? M.mesh(best.C, n1, n2, r1, r2) : null };
  },

  /* Arm: weight in pounds, distance to its centre of mass in inches. Quarter turn simulated at 2 ms, up to 5 s. */
  arm: function (m, n, ratio, weightLb, distIn, lim, eff) {
    var W = weightLb * LBF, d = distIn * IN, hold = W * d, per = hold / (ratio * n);
    var reserve = n * M.limTorque(m, lim) * ratio * eff / hold;
    var I = weightLb * LB * d * d, th = 0, w = 0, t = 0, dt = 0.002, time = null;
    if (reserve > 1) {
      while (t < 5) {
        var a = (n * M.torque(m, w * ratio, lim) * ratio * eff - W * d * Math.cos(th)) / I;
        w += a * dt; th += w * dt; t += dt;
        if (th < 0) { th = 0; w = Math.max(0, w); }
        if (th >= Math.PI / 2) { time = t; break; }
      }
    }
    return { hold: hold, perMotor: per, current: m.i0 + per / M.kt(m), reserve: reserve, time: time };
  },

  /* Elevator: spool diameter, load and travel in inches and pounds. Lift simulated at 2 ms, up to 5 s. */
  elevator: function (m, n, ratio, spoolIn, loadLb, travelIn, lim, eff) {
    var r = spoolIn / 2 * IN, mass = loadLb * LB, F = loadLb * LBF, per = F * r / (ratio * n);
    var stallLb = n * M.limTorque(m, lim) * ratio * eff / r / LBF;
    var x = 0, v = 0, t = 0, dt = 0.002, top = 0, time = null, goal = travelIn * IN;
    if (stallLb > loadLb) {
      while (t < 5) {
        var a = (n * M.torque(m, v / r * ratio, lim) * ratio * eff / r - mass * G) / mass;
        v += a * dt; if (v < 0 && x <= 0) v = 0; x += v * dt; t += dt; top = Math.max(top, v);
        if (x >= goal) { time = t; break; }
      }
    }
    return { force: F, perMotor: per, current: m.i0 + per / M.kt(m), stallLb: stallLb, time: time, top: top / FT, free: m.free / 60 / ratio * Math.PI * spoolIn / 12 };
  },

  /* Flywheel: wheel diameter in inches, wheel weight in pounds (0: skip the spin-up time). A ratio under 1 speeds up. */
  flywheel: function (m, n, ratio, diaIn, wheels, massLb, eff) {
    var rpm = m.free / ratio, edge = Math.PI * diaIn / 12 * rpm / 60, time = null;
    if (massLb > 0) {
      var r = diaIn / 2 * IN, I = 0.5 * massLb * LB * r * r, goal = 0.9 * rad(rpm), w = 0, t = 0, dt = 0.001;
      while (t < 10) { w += n * M.torque(m, w * ratio, 0) * ratio * eff / I * dt; t += dt; if (w >= goal) { time = t; break; } }
    }
    return { rpm: rpm, edge: edge, exit: wheels === 2 ? edge : edge / 2, time: time };
  }
};

/* ---------- Formatting ---------- */
var DASH = "—";
function ok(x) { return typeof x === "number" && isFinite(x); }
function fx(x, d) { return ok(x) ? x.toFixed(d) : DASH; }
function sig(x) { if (!ok(x)) return DASH; var a = Math.abs(x); return x.toFixed(a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3); }
// A ratio as a student writes it: up to two decimals, no trailing zeros (12.5, 50, 10.71).
function ratioText(x) { return ok(x) ? String(+x.toFixed(2)) : DASH; }
function rpm(x) { return ok(x) ? Math.round(x).toLocaleString("en-US") : DASH; }
function num(v) { var s = String(v == null ? "" : v).trim(); return s === "" ? NaN : Number(s); }
function inRange(x, lo, hi) { return ok(x) && x >= lo && x <= hi; }
function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
// One results row: name, value, unit. The unit is left off when the value is a dash.
function row(name, value, unit, cls) { return '<div' + (cls ? ' class="' + cls + '"' : "") + "><dt>" + name + '</dt><dd><span class="num">' + value + "</span>" + (unit && value !== DASH ? " " + unit : "") + "</dd></div>"; }
function results(rows, label) { return '<dl class="calcres" aria-label="' + esc(label || "Results") + '">' + rows.join("") + "</dl>"; }

/* ---------- Charts and drawings (inline SVG, colours from the tokens) ---------- */
function niceTicks(max) {
  if (!(max > 0)) max = 1;
  var raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag, top = Math.ceil(max / step - 1e-9) * step, out = [];
  for (var v = 0; v <= top + step / 2; v += step) out.push(+v.toFixed(6));
  return out;
}
function tickText(v) { return v >= 10000 ? (v / 1000) + "k" : String(+v.toFixed(3)); }
/* o: title, xlab, ylab, xmax, ymax, series [{ pts, label, lab: [x, y, anchor] }] (at most two; the second is dashed),
   short: true for the smaller top chart of a pair. Text is 13 units in a 400-unit box, so at least 11 px at 390 px. */
function chart(o) {
  var W = 400, H = o.short ? 190 : 230, L = 46, R = 16, T = 30, B = 44, pw = W - L - R, ph = H - T - B;
  // The speed or time axis ends where the data ends; the value axis ends on a round tick above the data.
  var xm = o.xmax > 0 ? o.xmax : 1, xt = niceTicks(xm).filter(function (v) { return v <= xm * 1.0001; }), yt = niceTicks(o.ymax), ym = yt[yt.length - 1];
  function X(x) { return (L + clamp(x, 0, xm) / xm * pw).toFixed(1); }
  function Y(y) { return (T + ph - clamp(y, 0, ym) / ym * ph).toFixed(1); }
  var s = '<svg class="calcchart" viewBox="0 0 ' + W + " " + H + '" role="img"><title>' + esc(o.title) + "</title>";
  s += yt.map(function (v) { return '<path class="cgrid" d="M' + L + " " + Y(v) + "H" + (W - R) + '"/><text class="ctick" x="' + (L - 6) + '" y="' + Y(v) + '" dy="4" text-anchor="end">' + tickText(v) + "</text>"; }).join("");
  s += xt.map(function (v) { return '<text class="ctick" x="' + X(v) + '" y="' + (T + ph + 18) + '" text-anchor="middle">' + tickText(v) + "</text>"; }).join("");
  s += '<path class="caxis" d="M' + L + " " + T + "V" + (T + ph) + "H" + (W - R) + '"/>';
  s += '<text class="ctitle" x="' + 4 + '" y="' + 14 + '">' + esc(o.ylab) + '</text><text class="ctitle" x="' + (L + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(o.xlab) + "</text>";
  o.series.forEach(function (se, i) {
    if (!se.pts.length) return;
    s += '<path class="cline' + (i ? " two" : "") + '" d="M' + se.pts.map(function (p) { return X(p[0]) + " " + Y(p[1]); }).join("L") + '"/>';
    if (se.lab) s += '<text class="clabel" x="' + X(se.lab[0]) + '" y="' + Y(se.lab[1]) + '" dx="' + (se.lab[2] === "end" ? -6 : 6) + '" dy="' + (se.lab[3] || -8) + '" text-anchor="' + (se.lab[2] || "start") + '">' + esc(se.label) + "</text>";
  });
  return s + "</svg>";
}
/* Two pulleys or sprockets and the belt or chain round them, to scale, with the centre distance dimensioned.
   r1, r2 and C share one unit; cLabel is the dimension's text; pitch (same unit) draws chain as links. */
function pairDrawing(r1, r2, C, n1, n2, cLabel, pitch, what) {
  if (r1 > r2) { var a = r1; r1 = r2; r2 = a; a = n1; n1 = n2; n2 = a; }
  var W = 400, total = r1 + C + r2, s = Math.min((W - 32) / total, 200 / (2 * r2)), R1 = r1 * s, R2 = r2 * s, top = 26;
  var cy = top + R2, x1 = (W - total * s) / 2 + R1, x2 = x1 + C * s, dy = cy + R2 + 20, H = dy + 30;
  var phi = Math.asin((r2 - r1) / C), ux = -Math.sin(phi), uy = Math.cos(phi);
  function P(x, R, sy) { return (x + R * ux).toFixed(1) + " " + (cy + sy * R * uy).toFixed(1); }
  var path = "M" + P(x1, R1, -1) + "L" + P(x2, R2, -1) + "A" + R2.toFixed(1) + " " + R2.toFixed(1) + " 0 1 1 " + P(x2, R2, 1) + "L" + P(x1, R1, 1) + "A" + R1.toFixed(1) + " " + R1.toFixed(1) + " 0 0 1 " + P(x1, R1, -1) + "Z";
  var dash = pitch && pitch * s >= 3 ? ' stroke-dasharray="' + (pitch * s * 0.6).toFixed(2) + " " + (pitch * s * 0.4).toFixed(2) + '"' : "";
  // A wheel's tooth count sits inside it; a small wheel's goes beside its centre line, just above the dimension,
  // where neither belt run passes.
  function teeth(x, R, n) { var cx = Math.max(34, Math.min(366, x)); return '<text class="clabel" x="' + cx.toFixed(1) + '" y="' + (dy - 6) + '" text-anchor="middle">' + n + " teeth</text>"; }
  return '<svg class="calcdraw" viewBox="0 0 ' + W + " " + H.toFixed(0) + '" role="img"><title>' + esc(what + ": " + n1 + " and " + n2 + " teeth, " + cLabel + " apart, drawn to scale") + "</title>" +
    '<circle class="cwheel" cx="' + x1.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + R1.toFixed(1) + '"/><circle class="cwheel" cx="' + x2.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + R2.toFixed(1) + '"/>' +
    '<path class="cbelt' + (pitch ? " chain" : "") + '" d="' + path + '"' + dash + "/>" +
    '<path class="cext" d="M' + x1.toFixed(1) + " " + (cy + R1 + 4).toFixed(1) + "V" + (dy + 6) + "M" + x2.toFixed(1) + " " + (cy + R2 + 4).toFixed(1) + "V" + (dy + 6) + '"/>' +
    '<path class="cdim" d="M' + x1.toFixed(1) + " " + dy + "H" + x2.toFixed(1) + '"/>' +
    '<circle class="chub" cx="' + x1.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.5"/><circle class="chub" cx="' + x2.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.5"/>' +
    teeth(x1, R1, n1) + teeth(x2, R2, n2) +
    '<text class="clabel" x="' + ((x1 + x2) / 2).toFixed(1) + '" y="' + (dy + 22) + '" text-anchor="middle">' + esc(cLabel) + "</text></svg>";
}

/* ---------- Shared pieces of a calculator page ---------- */
var MOTOR_LINE = "These are the makers' published motor figures at 12 V. A real mechanism loses more, so leave room.";
function ST(key) { return D.S.tools.calc[key]; }
function motorOpts(cur) { return MOTORS.map(function (m) { return '<option value="' + m.id + '"' + (m.id === cur ? " selected" : "") + ">" + esc(m.name) + "</option>"; }).join(""); }
function selField(k, label, val) { return '<div class="field calcf"><label for="calc-' + k + '">' + esc(label) + '</label><select id="calc-' + k + '" data-change="calcin" data-k="' + k + '">' + motorOpts(val) + "</select></div>"; }
// A number field: a real label, the box, the unit after it, and an optional hint under it.
function numField(k, label, val, unit, o) {
  o = o || {};
  return '<div class="field calcf"><label for="calc-' + k + '">' + esc(label) + '</label><div class="calcbox"><input id="calc-' + k + '" type="number" inputmode="' + (o.whole ? "numeric" : "decimal") + '"' +
    (o.min != null ? ' min="' + o.min + '"' : "") + (o.max != null ? ' max="' + o.max + '"' : "") + ' step="' + (o.step || "any") + '" data-input="calcin" data-k="' + k + '" value="' + esc(val) + '"' + (o.hint ? ' aria-describedby="calc-' + k + '-hint"' : "") + ">" +
    (unit ? '<span class="calcunit">' + esc(unit) + "</span>" : "") + "</div>" + (o.hint ? '<span class="calchint" id="calc-' + k + '-hint">' + esc(o.hint) + "</span>" : "") + "</div>";
}
// A small switch (unit, belt type, chain size). Changing it changes the inputs, so it redraws the page.
function segField(k, label, val, opts) {
  return '<div class="field calcf"><span class="flabel" id="calc-' + k + '-l">' + esc(label) + '</span><span class="seg calcseg" role="group" aria-labelledby="calc-' + k + '-l">' +
    opts.map(function (o) { return '<button type="button" id="calc-' + k + "-" + o[0] + '" data-act="calcset" data-k="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (val === o[0]) + '">' + esc(o[1]) + "</button>"; }).join("") + "</span></div>";
}
function motorFields(st, lim) {
  return selField("motor", "Motor", st.motor) + numField("n", "How many motors", st.n, "", { min: 1, max: 8, step: 1, whole: true }) +
    (lim ? numField("lim", "Current limit per motor", st.lim, "A", { min: 0, max: 400, step: 1, hint: "Leave it empty for no limit." }) : "");
}
function effField(st) { return numField("eff", "Efficiency", st.eff, "%", { min: 1, max: 100, step: 1, hint: "90% is a fair guess for one or two stages." }); }
function how(lines) { return '<details class="calchow"><summary>How this is worked out</summary><div class="calchowbody">' + lines.map(function (l) { return "<p>" + l + "</p>"; }).join("") + "</div></details>"; }
function bad(text) { return { bad: true, ans: text }; }
// The common motor inputs, read and checked. Returns an error sentence in .err when something cannot work.
function readMotor(st, lim) {
  var m = M.motor(st.motor), n = num(st.n), eff = num(st.eff), l = st.lim === "" || st.lim == null ? 0 : num(st.lim);
  if (!m) return { err: "Pick a motor." };
  if (!(inRange(n, 1, 8) && Math.round(n) === n)) return { err: "Type how many motors, a whole number from 1 to 8." };
  if (st.eff != null && !inRange(eff, 1, 100)) return { err: "Type an efficiency between 1 and 100%." };
  if (lim && !(l === 0 || inRange(l, 0, 400))) return { err: "Type a current limit in amps, or leave it empty." };
  if (lim && l > 0 && l <= m.i0) return { err: "A " + l + " A limit is below the motor's free current. Raise it above " + m.i0 + " A." };
  return { m: m, n: n, eff: st.eff != null ? eff / 100 : 1, lim: lim ? l : 0 };
}

/* ---------- The nine calculators ---------- */
var C = {};
var ORDER = [];
function def(c) { C[c.id] = c; ORDER.push(c); }

/* Gearbox */
def({ id: "calc-gearbox", key: "gearbox", name: "Gearbox", icon: "cgearbox", line: "What ratio you have, and how fast and strong the output is.", tip: "Up to four stages of gears: overall ratio, output speed and torque, with a chart.",
  defaults: { motor: "x60", n: "1", stages: [["12", "60"], ["20", "50"]], eff: "90", lim: "40" }, motorLine: true, link: true,
  inputs: function (st) {
    var stages = st.stages.map(function (s, i) {
      return '<fieldset class="calcstage"><legend>Stage ' + (i + 1) + "</legend>" +
        numField("s" + i + "a", "Driving gear", s[0], "teeth", { min: 6, max: 200, step: 1, whole: true }) + numField("s" + i + "b", "Driven gear", s[1], "teeth", { min: 6, max: 200, step: 1, whole: true }) +
        (st.stages.length > 1 ? '<button type="button" class="btn sm calcx" data-act="calcstage" data-v="del" data-i="' + i + '" aria-label="Remove stage ' + (i + 1) + '">Remove stage ' + (i + 1) + "</button>" : "") + "</fieldset>";
    }).join("");
    return motorFields(st, true) + effField(st) + '<div class="calcstages">' + stages + "</div>" +
      (st.stages.length < 4 ? '<button type="button" class="btn calcadd" id="calc-addstage" data-act="calcstage" data-v="add">' + D.ic("plus", 16) + " Add a stage</button>" : "");
  },
  out: function (st) {
    var r = readMotor(st, true), stages = [], err = r.err;
    if (!err) st.stages.forEach(function (s, i) { var a = num(s[0]), b = num(s[1]); if (!err && !(inRange(a, 6, 200) && inRange(b, 6, 200))) err = "Stage " + (i + 1) + " needs both tooth counts, from 6 to 200."; stages.push([a, b]); });
    var g = err ? null : M.gearbox(r.m, r.n, stages, r.eff, r.lim), lim = r.lim;
    var rows = [row("Overall ratio", g ? ratioText(g.ratio) : DASH, "to 1"), row("Output free speed", g ? rpm(g.freeRpm) : DASH, "rpm"), row(lim ? "Stall torque with no current limit" : "Output stall torque", g ? sig(g.stall) : DASH, "N·m"),
      row(lim ? "Torque at the " + lim + " A limit" : "Output torque with no limit", g ? sig(lim ? g.limited : g.stall) : DASH, "N·m")];
    // With a current limit, the torque the gearbox can use comes before the stall figure, so it is the one read first.
    if (lim) rows.splice(2, 0, rows.pop());
    var html = results(rows);
    if (g) {
      var c = g.curve, tmax = c[0][1], imax = c[0][2], mid = c[Math.round(c.length * 0.55)];
      html += '<div class="calcpair">' + chart({ short: true, title: "Output torque against output speed, from stall to " + rpm(g.freeRpm) + " rpm", ylab: lim ? "Torque at the " + lim + " A limit, N·m" : "Output torque, N·m", xlab: "Output speed, rpm", xmax: g.freeRpm, ymax: tmax * 1.05,
        series: [{ pts: c.map(function (p) { return [p[0], p[1]]; }), label: "Torque", lab: [mid[0], mid[1], "start"] }] }) +
        chart({ title: "Current per motor against output speed", ylab: "Current per motor, A", xlab: "Output speed, rpm", xmax: g.freeRpm, ymax: imax * 1.05,
          series: [{ pts: [], label: "" }, { pts: c.map(function (p) { return [p[0], p[2]]; }), label: "Current", lab: [mid[0], mid[2], "start"] }] }) + "</div>";
    }
    return { ans: err || "A " + ratioText(g.ratio) + " to 1 gearbox. The output spins at " + rpm(g.freeRpm) + " rpm with no load and makes up to " + sig(lim ? g.limited : g.stall) + " N·m of torque" + (lim ? " at the " + lim + " A limit." : "."), bad: !!err, html: html };
  },
  how: function () { return how(["<b>Ratio.</b> Each stage is driven teeth ÷ driving teeth. Multiply the stages: 60/12 × 50/20 = 12.5 to 1.",
    "<b>Free speed.</b> Output rpm = motor free speed ÷ ratio.",
    "<b>Stall torque.</b> Output torque = motors × motor stall torque × ratio × efficiency.",
    "<b>Current limit.</b> A limit caps each motor's torque at k<sub>t</sub> × (limit − free current), where k<sub>t</sub> = stall torque ÷ (stall current − free current).",
    "<b>The curves.</b> A motor's torque falls in a straight line from stall torque at 0 rpm to 0 at free speed. Its current falls the same way, from stall current to free current."]); }
});

/* Drivetrain */
var SWERVE = ["8.14", "6.75", "6.12"];
def({ id: "calc-drive", key: "drive", name: "Drivetrain", icon: "cdrive", line: "How fast the robot goes, and how soon it gets there.", tip: "Free speed, time to cover a distance and whether the wheels slip, with a speed chart.",
  defaults: { motor: "x60", n: "4", ratio: "6.75", wheel: "4", weight: "125", lim: "60", mu: "1.1", dist: "15", eff: "90" }, motorLine: true, link: true,
  inputs: function (st) {
    var picks = '<div class="calcpicks" role="group" aria-label="Common swerve ratios"><span class="calchint">Common swerve ratios:</span>' + SWERVE.map(function (r) { return '<button type="button" class="chip" id="calc-pick-' + r.replace(".", "") + '" data-act="calcpick" data-v="' + r + '" aria-pressed="' + (st.ratio === r) + '">' + r + "</button>"; }).join("") + "</div>";
    return motorFields(st, true) + '<div class="calcwith">' + numField("ratio", "Gear ratio", st.ratio, "to 1", { min: 1, max: 30, step: 0.01 }) + picks + "</div>" +
      numField("wheel", "Wheel diameter", st.wheel, "in", { min: 1, max: 12, step: 0.25 }) + numField("weight", "Robot weight", st.weight, "lb", { min: 20, max: 200, step: 1, hint: "With battery and bumpers." }) +
      numField("dist", "Distance to cover", st.dist, "ft", { min: 1, max: 60, step: 1 }) + numField("mu", "Wheel grip (friction)", st.mu, "", { min: 0.1, max: 2, step: 0.05, hint: "About 1.1 for tread on carpet." }) + effField(st);
  },
  out: function (st) {
    var r = readMotor(st, true), ratio = num(st.ratio), wheel = num(st.wheel), wt = num(st.weight), mu = num(st.mu), dist = num(st.dist), err = r.err;
    if (!err && !inRange(ratio, 0.5, 50)) err = "Type a gear ratio between 0.5 and 50 to 1.";
    if (!err && !inRange(wheel, 0.5, 12)) err = "Type a wheel diameter between 0.5 and 12 in.";
    if (!err && !inRange(wt, 5, 300)) err = "Type the robot's weight, between 5 and 300 lb.";
    if (!err && !inRange(dist, 0.5, 100)) err = "Type a distance between 0.5 and 100 ft.";
    if (!err && !inRange(mu, 0.05, 3)) err = "Type a wheel grip between 0.05 and 3.";
    var d = err ? null : M.drive(r.m, r.n, ratio, wheel, wt, r.lim, mu, dist, r.eff);
    /* When the robot is at free speed before the distance is up, "speed after 15 ft" would only repeat the free
       speed, so the row says where free speed was reached instead (hill climb r3). */
    var atFree = d && d.reached && d.atFree !== null;
    var rows = [row("Free speed", d ? fx(d.free, 1) : DASH, "ft/s"), atFree ? row("Free speed reached", "after " + fx(d.atFree, 1), "ft") : row("Speed after " + (ok(dist) ? dist : DASH) + " ft", d && d.reached ? fx(d.speed, 1) : DASH, "ft/s"), row("Time to cover it", d && d.reached ? fx(d.time, 2) : DASH, "s"),
      '<div><dt>Grip at launch</dt><dd>' + (d ? (d.slip ? '<span class="pill warn">Wheels slip</span>' : '<span class="pill ok">Grip holds</span>') : DASH) + "</dd></div>"];
    var html = results(rows);
    if (d) {
      var tr = d.trace, last = tr[tr.length - 1], ymax = Math.max(d.free, last[1]) * 1.08;
      html += chart({ title: "Robot speed against time, up to " + (d.reached ? dist + " ft" : "10 s"), ylab: "Speed, ft/s", xlab: "Time, s", xmax: last[0], ymax: ymax,
        series: [{ pts: tr, label: "Speed", lab: [last[0], last[1], "end", 18] }, { pts: [[0, d.free], [last[0], d.free]], label: "Free speed " + fx(d.free, 1) + " ft/s", lab: [0, d.free, "start"] }] });
    }
    var ans = err || (d.reached ? "The robot's free speed is " + fx(d.free, 1) + " ft/s. It covers " + dist + " ft in " + fx(d.time, 2) + " s and is going " + fx(d.speed, 1) + " ft/s by then." : "The robot does not cover " + dist + " ft in 10 s. Check the ratio and the weight.") +
      (d && d.slip ? " The wheels slip at the start, so " + (r.lim ? "a lower current limit" : "a current limit") + " would lose nothing." : "");
    return { ans: ans, bad: !!err, html: html };
  },
  how: function () { return how(["<b>Free speed.</b> Wheel turns per second = motor free speed ÷ 60 ÷ ratio. Speed = that × π × wheel diameter.",
    "<b>Push.</b> Force at the floor = motors × motor torque × ratio × efficiency ÷ wheel radius. The motor torque falls as the robot speeds up, and the current limit caps it.",
    "<b>Grip.</b> The floor can only take grip × robot weight. More push than that and the wheels slip, so the force is capped there.",
    "<b>Time.</b> Every 5 ms: acceleration = force ÷ mass, then the new speed and distance. It stops at the distance or at 10 s."]); }
});

/* Belt */
var BELTS = [["5", "HTD 5 mm"], ["3", "GT2 3 mm"]];
function lenText(mm, unit) { return unit === "mm" ? fx(mm, 1) + " mm" : fx(mm / 25.4, 3) + " in"; }
function lenOther(mm, unit) { return unit === "mm" ? fx(mm / 25.4, 3) + " in" : fx(mm, 1) + " mm"; }
function minText(x, unit) { return unit === "mm" ? (Math.ceil(x * 10) / 10).toFixed(1) + " mm" : (Math.ceil(x * 10) / 10).toFixed(1) + " in"; }
def({ id: "calc-belt", key: "belt", name: "Belt", icon: "cbelt", line: "Which belt fits, and how far apart the pulleys go.", tip: "The nearest timing belts for two pulleys, with the exact centre distance and a drawing to scale.",
  defaults: { type: "5", t1: "18", t2: "36", dist: "8", unit: "in", step: "5" }, link: true, part: true,
  inputs: function (st) {
    return segField("type", "Belt", st.type, BELTS) + '<div class="calcgrid">' + numField("t1", "Pulley 1", st.t1, "teeth", { min: 8, max: 120, step: 1, whole: true }) + numField("t2", "Pulley 2", st.t2, "teeth", { min: 8, max: 120, step: 1, whole: true }) + "</div>" +
      '<div class="calcgrid">' + numField("dist", "Distance wanted", st.dist, st.unit, { min: 0, step: st.unit === "mm" ? 1 : 0.125 }) + segField("unit", "Units", st.unit, [["in", "in"], ["mm", "mm"]]) + "</div>" +
      segField("step", "Belt sizes", st.step, [["5", "Every 5 teeth"], ["1", "Any"]]);
  },
  out: function (st) {
    var p = +st.type, n1 = num(st.t1), n2 = num(st.t2), want = num(st.dist), u = st.unit, mm = u === "mm" ? want : want * 25.4, err = null, b = null;
    if (!(inRange(n1, 8, 120) && inRange(n2, 8, 120) && Math.round(n1) === n1 && Math.round(n2) === n2)) err = "Type the teeth on each pulley, whole numbers from 8 to 120.";
    else if (!(want > 0)) err = "Type the distance you want between the pulley centres.";
    else {
      b = M.belt(p, n1, n2, mm, +st.step);
      if (mm <= b.minC) err = "The pulleys overlap. Make the distance more than " + minText(u === "mm" ? b.minC : b.minC / 25.4, u) + ".";
    }
    if (err) b = null;
    var best = b && b.best && b.best.ok ? b.best : null, name = BELTS.filter(function (x) { return x[0] === st.type; })[0][1];
    var opts = b ? b.opts.map(function (o) {
      return '<li class="calcopt' + (o.best ? " best" : "") + '"><span class="calcoptn"><b>' + o.teeth + " teeth</b>" + (o.best ? ' <span class="calcnear">Nearest</span>' : "") + '<small>' + fx(o.len, 0) + " mm long</small></span>" +
        (o.ok ? '<span class="num">' + lenText(o.C, u) + '<small>' + lenOther(o.C, u) + "</small></span>" : '<span class="mute">Too short</span>') + "</li>";
    }).join("") : "";
    var mesh = b && b.mesh;
    var html = '<h3 class="calch">Belts that fit</h3>' + (b ? '<ul class="calcopts" aria-label="Belts that fit, with the centre distance for each">' + opts + "</ul>" : '<p class="mute">' + DASH + "</p>") +
      results([row("Pitch diameters", b ? (u === "mm" ? fx(b.r1 * 2, 1) + " and " + fx(b.r2 * 2, 1) : fx(b.r1 * 2 / 25.4, 3) + " and " + fx(b.r2 * 2 / 25.4, 3)) : DASH, u === "mm" ? "mm" : "in"), row("Teeth in mesh on the small pulley", mesh ? fx(mesh.teeth, 1) : DASH, "")]) +
      (mesh && mesh.teeth < 6 ? '<p class="calcwarn"><span class="pill warn">Few teeth</span> Under 6 teeth in mesh can skip under load. Use a bigger small pulley or a longer distance.</p>' : "");
    if (best) html += pairDrawing(b.r1, b.r2, best.C, n1, n2, "C = " + lenText(best.C, u), 0, "Belt drawing");
    if (best) html += '<div class="row"><button type="button" class="btn" data-act="calcparts" data-v="' + esc(name + " belt, " + best.teeth + "T") + '">' + D.ic("search", 16) + " Find it in Parts</button></div>";
    var ans = err || (best ? "Use a " + best.teeth + "-tooth " + name + " belt. Put the pulleys " + lenText(best.C, u) + " apart." : "No belt fits that distance. Make the distance longer.");
    return { ans: ans, bad: !best, html: html };
  },
  how: function () { return how(["<b>Pitch diameter.</b> D = pitch × teeth ÷ π. A 36-tooth HTD 5 mm pulley: 5 × 36 ÷ π = 57.3 mm.",
    "<b>Belt length.</b> With radii R<sub>1</sub> ≤ R<sub>2</sub> and centre distance C: L = 2√(C² − (R<sub>2</sub> − R<sub>1</sub>)²) + π(R<sub>1</sub> + R<sub>2</sub>) + 2(R<sub>2</sub> − R<sub>1</sub>) × asin((R<sub>2</sub> − R<sub>1</sub>) ÷ C).",
    "<b>Which belt.</b> Belts come in whole teeth, so the tooth count is L ÷ pitch rounded to a size that is sold. For each belt, C is found by trying distances until L(C) = pitch × teeth.",
    "<b>Teeth in mesh.</b> The small pulley's wrap = 180° − 2 × asin((R<sub>2</sub> − R<sub>1</sub>) ÷ C). Teeth in mesh = wrap ÷ 360 × its teeth."]); }
});

/* Chain */
var CHAINS = [["25", "#25"], ["35", "#35"]];
function inText(x, unit) { return unit === "mm" ? fx(x * 25.4, 1) + " mm" : fx(x, 3) + " in"; }
function inOther(x, unit) { return unit === "mm" ? fx(x, 3) + " in" : fx(x * 25.4, 1) + " mm"; }
def({ id: "calc-chain", key: "chain", name: "Chain", icon: "cchain", line: "How many links, and how far apart the sprockets go.", tip: "Even link counts for two sprockets, with the exact centre distance and a drawing to scale.",
  defaults: { size: "25", t1: "16", t2: "22", dist: "6", unit: "in" }, link: true, part: true,
  inputs: function (st) {
    return segField("size", "Chain", st.size, CHAINS) + '<div class="calcgrid">' + numField("t1", "Sprocket 1", st.t1, "teeth", { min: 8, max: 120, step: 1, whole: true }) + numField("t2", "Sprocket 2", st.t2, "teeth", { min: 8, max: 120, step: 1, whole: true }) + "</div>" +
      '<div class="calcgrid">' + numField("dist", "Distance wanted", st.dist, st.unit, { min: 0, step: st.unit === "mm" ? 1 : 0.125 }) + segField("unit", "Units", st.unit, [["in", "in"], ["mm", "mm"]]) + "</div>";
  },
  out: function (st) {
    var p = st.size === "35" ? 0.375 : 0.25, n1 = num(st.t1), n2 = num(st.t2), want = num(st.dist), u = st.unit, w = u === "mm" ? want / 25.4 : want, err = null, c = null;
    if (!(inRange(n1, 8, 120) && inRange(n2, 8, 120) && Math.round(n1) === n1 && Math.round(n2) === n2)) err = "Type the teeth on each sprocket, whole numbers from 8 to 120.";
    else if (!(want > 0)) err = "Type the distance you want between the sprocket centres.";
    else {
      c = M.chain(p, n1, n2, w);
      if (w <= c.minC) err = "The sprockets overlap. Make the distance more than " + minText(u === "mm" ? c.minC * 25.4 : c.minC, u) + ".";
    }
    if (err) c = null;
    var best = c && c.best, opts = c ? c.opts.map(function (o) {
      return '<li class="calcopt' + (o.best ? " best" : "") + '"><span class="calcoptn"><b>' + o.links + " links</b>" + (o.best ? ' <span class="calcnear">Nearest</span>' : "") + "</span>" +
        (o.ok ? '<span class="num">' + inText(o.C, u) + "<small>" + inOther(o.C, u) + "</small></span>" : '<span class="mute">Too short</span>') + "</li>";
    }).join("") : "", mesh = c && c.mesh;
    var html = '<h3 class="calch">Even link counts</h3>' + (c ? '<ul class="calcopts" aria-label="Even link counts, with the centre distance for each">' + opts + "</ul>" : '<p class="mute">' + DASH + "</p>") +
      results([row("Links for the distance wanted", c ? fx(c.exact, 1) : DASH, ""), row("Pitch diameters", c ? inText(c.r1 * 2, u).replace(/ (in|mm)$/, "") + " and " + inText(c.r2 * 2, u) : DASH, ""), row("Teeth in mesh on the small sprocket", mesh ? fx(mesh.teeth, 1) : DASH, "")]) +
      (mesh && mesh.teeth < 6 ? '<p class="calcwarn"><span class="pill warn">Few teeth</span> Under 6 teeth in mesh can skip under load. Use a bigger small sprocket or a longer distance.</p>' : "");
    if (best) html += pairDrawing(c.r1, c.r2, best.C, n1, n2, "C = " + inText(best.C, u), p, "Chain drawing");
    if (best) html += '<div class="row"><button type="button" class="btn" data-act="calcparts" data-v="#' + st.size + ' roller chain">' + D.ic("search", 16) + " Find it in Parts</button></div>";
    var ans = err || (best ? "Use " + best.links + " links of #" + st.size + " chain. Put the sprockets " + inText(best.C, u) + " apart." : "No even link count fits that distance. Make the distance longer.");
    return { ans: ans, bad: !best, html: html };
  },
  how: function () { return how(["<b>Pitch diameter.</b> D = pitch ÷ sin(180° ÷ teeth). #25 chain has a 0.25 in pitch, #35 a 0.375 in pitch.",
    "<b>Chain length.</b> The two straight runs: 2√(C² − (R<sub>2</sub> − R<sub>1</sub>)²). Around each sprocket, chain bends link by link, so each one adds its wrapped share of teeth × pitch. Links = length ÷ pitch.",
    "<b>Even links.</b> A chain closes with an even number of links (an odd count needs a half link). Take the even counts just under and over, and find C for each by trying distances until the length matches.",
    "<b>Check.</b> Two 16-tooth sprockets and 60 links of #25: 2C ÷ 0.25 + 16 = 60, so C = 5.500 in."]); }
});

/* Arm */
def({ id: "calc-arm", key: "arm", name: "Arm", icon: "carm", line: "Whether the motor can hold the arm up, and how hard it works.", tip: "Torque and current to hold an arm level, how much is in reserve, and the time for a quarter turn.",
  defaults: { motor: "x60", n: "1", ratio: "100", weight: "10", dist: "20", lim: "40", eff: "90" }, motorLine: true, link: true,
  inputs: function (st) {
    return motorFields(st, true) + numField("ratio", "Gear ratio", st.ratio, "to 1", { min: 1, max: 500, step: 1 }) +
      numField("weight", "Arm weight", st.weight, "lb", { min: 0.1, max: 60, step: 0.5 }) + numField("dist", "Pivot to the arm's centre of mass", st.dist, "in", { min: 0.5, max: 80, step: 0.5 }) + effField(st);
  },
  out: function (st) {
    var r = readMotor(st, true), ratio = num(st.ratio), wt = num(st.weight), dist = num(st.dist), err = r.err;
    if (!err && !inRange(ratio, 1, 2000)) err = "Type a gear ratio between 1 and 2000 to 1.";
    if (!err && !inRange(wt, 0.05, 200)) err = "Type the arm's weight, between 0.05 and 200 lb.";
    if (!err && !inRange(dist, 0.1, 200)) err = "Type the distance from the pivot to the arm's centre of mass.";
    var a = err ? null : M.arm(r.m, r.n, ratio, wt, dist, r.lim, r.eff);
    var rv = a ? a.reserve : NaN, pill = !a ? DASH : rv < 1 ? '<span class="pill bad">Cannot hold</span>' : rv < 2 ? '<span class="pill warn">Tight</span>' : '<span class="pill ok">Enough</span>';
    var rows = [row("Torque to hold it level", a ? sig(a.hold) : DASH, "N·m"), row("Torque per motor", a ? sig(a.perMotor) : DASH, "N·m"), row("Current per motor to hold", a ? fx(a.current, 1) : DASH, "A"),
      '<div><dt>Reserve</dt><dd><span class="num">' + (a ? fx(rv, 1) + " times" : "") + "</span> " + pill + "</dd></div>", row("Quarter turn, level to straight up", a && a.time ? fx(a.time, 2) : DASH, "s")];
    var ans;
    if (err) ans = err;
    else if (rv < 1) ans = "It cannot hold the arm level: it has " + fx(rv, 2) + " times the torque it needs. Raise the ratio" + (r.lim ? ", the current limit" : "") + " or add a motor.";
    else ans = "It holds the arm level with " + fx(rv, 1) + " times what it needs" + (rv < 2 ? ", which is tight: aim for 2." : ".") + (a.time ? " A quarter turn up takes " + fx(a.time, 2) + " s." : " It does not get to straight up in 5 s.");
    return { ans: ans, bad: !!err || rv < 1, html: results(rows) };
  },
  how: function () { return how(["<b>Holding torque.</b> Torque = arm weight × distance from the pivot to its centre of mass. 10 lb is 44.5 N, 20 in is 0.508 m, so 22.6 N·m.",
    "<b>Per motor.</b> Torque ÷ (ratio × motors). <b>Current</b> = free current + that ÷ k<sub>t</sub>, where k<sub>t</sub> = stall torque ÷ (stall current − free current).",
    "<b>Reserve.</b> (Motors × torque at the current limit × ratio × efficiency) ÷ holding torque. Under 2 is tight; under 1 cannot hold.",
    "<b>Quarter turn.</b> Every 2 ms: (motor torque − weight × distance × cos(angle)) ÷ (mass × distance²) gives the angular acceleration. It counts the time from level to straight up."]); }
});

/* Elevator */
def({ id: "calc-elevator", key: "elevator", name: "Elevator", icon: "celevator", line: "Whether it lifts the load, and how fast.", tip: "Time for the travel, current to hold and the load that stalls it.",
  defaults: { motor: "x60", n: "2", ratio: "10", spool: "1.5", load: "20", travel: "40", lim: "40", eff: "90" }, motorLine: true, link: true,
  inputs: function (st) {
    return motorFields(st, true) + numField("ratio", "Gear ratio", st.ratio, "to 1", { min: 1, max: 100, step: 0.5 }) +
      numField("spool", "Spool or sprocket diameter", st.spool, "in", { min: 0.25, max: 6, step: 0.125 }) + numField("load", "Load it lifts", st.load, "lb", { min: 0.5, max: 200, step: 1 }) +
      numField("travel", "Travel", st.travel, "in", { min: 1, max: 120, step: 1 }) + effField(st);
  },
  out: function (st) {
    var r = readMotor(st, true), ratio = num(st.ratio), sp = num(st.spool), load = num(st.load), trav = num(st.travel), err = r.err;
    if (!err && !inRange(ratio, 0.5, 500)) err = "Type a gear ratio between 0.5 and 500 to 1.";
    if (!err && !inRange(sp, 0.1, 12)) err = "Type the spool diameter, between 0.1 and 12 in.";
    if (!err && !inRange(load, 0.1, 500)) err = "Type the load the elevator lifts, between 0.1 and 500 lb.";
    if (!err && !inRange(trav, 0.5, 200)) err = "Type the travel, between 0.5 and 200 in.";
    var e = err ? null : M.elevator(r.m, r.n, ratio, sp, load, trav, r.lim, r.eff), lifts = e && e.stallLb > load;
    var rows = [row("Time for the travel", e && e.time ? fx(e.time, 2) : DASH, "s"), row("Top speed on the way", e && lifts ? fx(e.top, 1) : DASH, "ft/s"), row("Torque per motor to hold", e ? sig(e.perMotor) : DASH, "N·m"),
      row("Current per motor to hold", e ? fx(e.current, 1) : DASH, "A"), row(r.lim ? "Load that stalls it at " + r.lim + " A" : "Load that stalls it", e ? fx(e.stallLb, 1) : DASH, "lb")];
    var ans = err || (!lifts ? "It cannot lift " + load + " lb: it stalls at " + fx(e.stallLb, 1) + " lb. Raise the ratio, use a smaller spool or add a motor." :
      "It lifts " + load + " lb the " + trav + " in in " + (e.time ? fx(e.time, 2) + " s" : "more than 5 s") + ". It stalls at " + fx(e.stallLb, 1) + " lb" + (e.stallLb < 2 * load ? ", which is close: aim for twice the load." : "."));
    return { ans: ans, bad: !!err || !lifts, html: results(rows) };
  },
  how: function () { return how(["<b>Holding.</b> Force = load weight. Torque per motor = force × spool radius ÷ (ratio × motors). Current = free current + that ÷ k<sub>t</sub>.",
    "<b>Stall load.</b> Motors × torque at the current limit × ratio × efficiency ÷ spool radius, as a weight.",
    "<b>Lift.</b> Every 2 ms: (motor force − load weight) ÷ load mass gives the acceleration, upward against gravity, until it has gone the travel. It gives up at 5 s.",
    "<b>Not counted.</b> The carriage's own weight and friction in the rails. Add the carriage to the load to count it."]); }
});

/* Flywheel */
def({ id: "calc-flywheel", key: "flywheel", name: "Flywheel", icon: "cflywheel", line: "How fast the wheel's edge moves, and how soon it spins up.", tip: "Wheel speed, edge speed, a rough exit speed and the time to spin up.",
  defaults: { motor: "x60", n: "1", ratio: "1", dia: "4", wheels: "1", mass: "1", eff: "90" }, motorLine: true, link: true,
  inputs: function (st) {
    return motorFields(st, false) + numField("ratio", "Gear ratio", st.ratio, "to 1", { min: 0.2, max: 10, step: 0.05, hint: "Under 1 speeds the wheel up: 0.5 is a 1 to 2 step-up." }) +
      numField("dia", "Wheel diameter", st.dia, "in", { min: 1, max: 12, step: 0.25 }) + segField("wheels", "Shooter", st.wheels, [["1", "One wheel and a hood"], ["2", "Two wheels"]]) +
      numField("mass", "Weight of the spinning wheels", st.mass, "lb", { min: 0, max: 20, step: 0.1, hint: "Leave it empty to skip the spin-up time." }) + effField(st);
  },
  out: function (st) {
    var r = readMotor(st, false), ratio = num(st.ratio), dia = num(st.dia), mass = st.mass === "" ? 0 : num(st.mass), err = r.err;
    if (!err && !inRange(ratio, 0.1, 50)) err = "Type a gear ratio between 0.1 and 50 to 1.";
    if (!err && !inRange(dia, 0.5, 24)) err = "Type the wheel diameter, between 0.5 and 24 in.";
    if (!err && !inRange(mass, 0, 100)) err = "Type the wheels' weight in pounds, or leave it empty.";
    var f = err ? null : M.flywheel(r.m, r.n, ratio, dia, +st.wheels, mass, r.eff);
    var rows = [row("Wheel free speed", f ? rpm(f.rpm) : DASH, "rpm"), row("Edge speed", f ? fx(f.edge, 1) : DASH, "ft/s"), row("Exit speed, rough", f ? fx(f.exit, 1) : DASH, "ft/s"), row("Time to 90% of free speed", f && f.time ? fx(f.time, 2) : DASH, "s")];
    var ans = err || ("The wheel spins at " + rpm(f.rpm) + " rpm and its edge moves at " + fx(f.edge, 1) + " ft/s. A game piece leaves at roughly " + fx(f.exit, 1) + " ft/s." + (f.time ? " It spins up in " + fx(f.time, 2) + " s." : ""));
    return { ans: ans, bad: !!err, html: results(rows) };
  },
  how: function () { return how(["<b>Wheel speed.</b> Motor free speed ÷ ratio. A ratio under 1 is a step-up, so the wheel spins faster than the motor.",
    "<b>Edge speed.</b> π × diameter × turns per second.",
    "<b>Exit speed, rough.</b> With one wheel and a fixed hood the piece rolls along the hood, so it leaves at about half the edge speed. Between two wheels it leaves at about the edge speed. Compression, grip and the piece change this a lot; test it.",
    "<b>Spin-up.</b> The wheels' inertia = ½ × mass × radius². Every 1 ms: motor torque × ratio × efficiency ÷ inertia gives the angular acceleration, until the wheel reaches 90% of its free speed."]); }
});

/* Drill and tap chart */
// [thread, tap drill, close clearance, free clearance]; a drill is [name, inches] or [mm].
var DRILLS = [
  ["#4-40", ["#43", "0.089"], ["#32", "0.116"], ["#30", "0.1285"]],
  ["#6-32", ["#36", "0.1065"], ["#27", "0.144"], ["#25", "0.1495"]],
  ["#8-32", ["#29", "0.136"], ["#18", "0.1695"], ["#16", "0.177"]],
  ["#10-24", ["#25", "0.1495"], ["#9", "0.196"], ["#7", "0.201"]],
  ["#10-32", ["#21", "0.159"], ["#9", "0.196"], ["#7", "0.201"]],
  ["1/4-20", ["#7", "0.201"], ["F", "0.257"], ["H", "0.266"]],
  ["1/4-28", ["#3", "0.213"], ["F", "0.257"], ["H", "0.266"]],
  ["5/16-18", ["F", "0.257"], ["P", "0.323"], ["Q", "0.332"]],
  ["3/8-16", ["5/16", "0.3125"], ["W", "0.386"], ["X", "0.397"]],
  ["M3 x 0.5", ["2.5"], ["3.2"], ["3.4"]],
  ["M4 x 0.7", ["3.3"], ["4.3"], ["4.5"]],
  ["M5 x 0.8", ["4.2"], ["5.3"], ["5.5"]],
  ["M6 x 1.0", ["5.0"], ["6.4"], ["6.6"]]
];
var MOST = { "#10-32": 1, "1/4-20": 1 };
M.DRILLS = DRILLS;
function drillName(d) { return d.length === 1 ? d[0] + " mm (" + (d[0] / 25.4).toFixed(3) + " in)" : d[0] + " (" + d[1] + " in)"; }
// Drill sizes are converted to 2 decimals in mm and 3 in inches (drills come in 0.05 mm steps, so 1 decimal would mislead).
function drillCell(d, l) {
  var main = d.length === 1 ? d[0] + " mm" : d[0], sizes = d.length === 1 ? (d[0] / 25.4).toFixed(3) + " in" : d[1] + " in, " + (d[1] * 25.4).toFixed(2) + " mm";
  return '<td data-l="' + l + '"><b>' + esc(main) + '</b><span class="num calcsz">' + esc(sizes) + "</span></td>";
}
function norm(s) { return String(s).toLowerCase().replace(/[\s#]/g, ""); }
M.drillFind = function (q) { var k = norm(q); return DRILLS.filter(function (r) { return !k || norm(r[0]).indexOf(k) >= 0; }); };
def({ id: "calc-drill", key: "drill", name: "Drill and tap chart", icon: "cdrill", line: "The drill for a tap, and for a bolt to pass through.", tip: "Tap drills and close and free clearance drills, in inch and metric sizes.",
  defaults: { q: "" }, single: true,
  inputs: function (st) {
    return '<div class="field calcf calcsearch"><label for="calc-q">Find a thread</label><div class="calcbox"><input id="calc-q" type="search" data-input="calcin" data-k="q" value="' + esc(st.q) + '" placeholder="#10-32, 1/4-20 or M5" autocomplete="off" spellcheck="false"></div></div>';
  },
  out: function (st) {
    var rows = M.drillFind(st.q), first = rows[0];
    var body = rows.map(function (r) {
      return "<tr" + (MOST[r[0]] ? ' class="most"' : "") + '><th scope="row" data-l="Thread"><b>' + esc(r[0]) + "</b>" + (MOST[r[0]] ? '<span class="calctag">Most used on the robot</span>' : "") + "</th>" +
        drillCell(r[1], "Tap drill") + drillCell(r[2], "Close clearance") + drillCell(r[3], "Free clearance") + "</tr>";
    }).join("");
    var html = rows.length ? '<p class="small mute calcnote">Tap drill is the hole you drill before cutting threads. Close clearance is a snug bolt hole. Free clearance is a looser one. A single letter, such as F or H, is a drill size.</p><table class="calctable"><caption class="vh">Drills for each thread</caption><thead><tr><th scope="col">Thread</th><th scope="col">Tap drill</th><th scope="col">Close clearance</th><th scope="col">Free clearance</th></tr></thead><tbody>' + body + "</tbody></table>" :
      '<p class="empty">No thread matches "' + esc(st.q) + '". Try #10-32, 1/4-20 or M5.</p>';
    var ans = !String(st.q).trim() ? "Type a thread, like #10-32 or M5, to see its drills. The two most used on the robot are marked." :
      !first ? "No thread matches that. Try #10-32, 1/4-20 or M5." :
      "For a " + first[0] + " tap, drill " + drillName(first[1]) + ". For a " + first[0] + " bolt to pass through, drill " + drillName(first[2]) + " for a close fit or " + drillName(first[3]) + " for a free fit.";
    // With nothing typed the sentence is an instruction, not an answer, so it is not drawn in the answer box.
    return { ans: esc(ans), bad: !!String(st.q).trim() && !first, plain: !String(st.q).trim(), html: html };
  },
  how: function () { return how(["<b>Tap drill.</b> The hole you drill before tapping. It leaves enough metal for about 75% of a full thread, which is strong and easy to tap.",
    "<b>Close clearance.</b> A hole the bolt just passes through, for parts that must line up well.",
    "<b>Free clearance.</b> A looser hole, for when the holes in two parts may not line up exactly.",
    "<b>Sizes.</b> Number drills (#43) and letter drills (F) are inch sizes. The mm and inch columns are the same drill, converted."]); }
});

/* Motors */
function motorCurve(m) { var pts = []; for (var k = 0; k <= 20; k++) pts.push([m.free * k / 20, m.ts * (1 - k / 20)]); return pts; }
def({ id: "calc-motors", key: "motors", name: "Motors", icon: "cmotor", line: "Which motor: the published figures side by side.", tip: "Free speed, stall torque, currents and peak power of the common FRC motors, with two torque curves.",
  defaults: { a: "x60", b: "neo" }, motorLine: true, reset: true,
  inputs: function (st) { return selField("a", "First motor", st.a) + selField("b", "Second motor", st.b); },
  out: function (st) {
    var a = M.motor(st.a), b = M.motor(st.b), same = a === b, pa = M.power(a), pb = M.power(b);
    var html = results([row(esc(a.name) + ", peak power", rpm(pa), "W")].concat(same ? [] : [row(esc(b.name) + ", peak power", rpm(pb), "W")]), "Peak power of the two motors");
    var top = a.ts >= b.ts ? a : b, other = top === a ? b : a;
    html += chart({ title: same ? "Torque against speed for the " + a.name : "Torque against speed for the " + top.name + " and the " + other.name, ylab: "Torque, N·m", xlab: "Speed, rpm", xmax: Math.max(a.free, b.free), ymax: top.ts * 1.05,
      series: [{ pts: motorCurve(top), label: top.name, lab: [top.free * 0.12, top.ts * 0.88, "start"] }].concat(same ? [] : [{ pts: motorCurve(other), label: other.name, lab: [other.free * 0.5, other.ts * 0.5, "end", 20] }]) });
    var ans = same ? "Pick two different motors to compare them." :
      "The " + (pa >= pb ? a : b).name + " has " + fx(Math.max(pa, pb) / Math.min(pa, pb), 1) + " times the peak power of the " + (pa >= pb ? b : a).name + " (" + rpm(Math.max(pa, pb)) + " W against " + rpm(Math.min(pa, pb)) + " W).";
    return { ans: esc(ans), bad: false, html: html, wide: motorTable(st) };
  },
  how: function () { return how(["<b>Torque curve.</b> Torque falls in a straight line from stall torque at 0 rpm to 0 at free speed: τ = τ<sub>stall</sub> × (1 − speed ÷ free speed).",
    "<b>Peak power.</b> Power = torque × speed is largest at half the free speed, where it is ¼ × stall torque × free speed (in radians per second: rpm × 2π ÷ 60)."]); }
});
function motorTable(st) {
  return '<h2 class="calch2">All motors</h2><table class="calctable motors"><caption class="vh">Published motor figures at 12 V</caption><thead><tr><th scope="col">Motor</th><th scope="col">Free speed</th><th scope="col">Stall torque</th><th scope="col">Stall current</th><th scope="col">Free current</th><th scope="col">Peak power</th></tr></thead><tbody>' +
    MOTORS.map(function (m) {
      var pick = m.id === st.a || m.id === st.b;
      return "<tr" + (pick ? ' class="pick"' : "") + '><th scope="row" data-l="Motor"><b>' + esc(m.name) + "</b>" + (pick ? '<span class="vh"> (picked)</span>' : "") + '</th><td data-l="Free speed" class="num">' + rpm(m.free) + ' rpm</td><td data-l="Stall torque" class="num">' + m.ts + ' N·m</td><td data-l="Stall current" class="num">' + m.is + ' A</td><td data-l="Free current" class="num">' + m.i0 + ' A</td><td data-l="Peak power" class="num">' + rpm(M.power(m)) + " W</td></tr>";
    }).join("") + "</tbody></table>";
}

/* ---------- Registering: tools, names, icons, state ---------- */
var ICONS = {
  cgearbox: "M8 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM17 21a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM8 10h.01M17 17.5h.01",
  cdrive: "M15 19a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM15 14h.01M2 9h6M3 13h4M2 17h5",
  cbelt: "M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM5.5 9.1L16 6.1M5.5 14.9L16 17.9",
  cchain: "M10 8H7a4 4 0 0 0 0 8h3M14 8h3a4 4 0 0 1 0 8h-3M8 12h8",
  carm: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7.4 15.6L18 5M16 3l4 4M3 21h6",
  celevator: "M5 3v18M19 3v18M8 10h8v6H8zM12 10V3",
  cflywheel: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 12h.01M3 12a9 9 0 0 1 9-9M21 12a9 9 0 0 1-9 9",
  cdrill: "M3 21l4-4M7 17l9-9 3 3-9 9zM10 14l3 3M13 11l3 3M16 8l2-5 3 3-5 2",
  cmotor: "M3 7h12v10H3zM15 11h6M15 13h6M6 7V5h6v2M6 17v2M12 17v2"
};
Object.keys(ICONS).forEach(function (k) { D.ICON[k] = ICONS[k]; });
ORDER.forEach(function (c) {
  D.TOOLS.push({ id: c.id, name: c.name, icon: c.icon, line: c.line, tip: c.tip, modes: ["build", "competition"], groups: ["admin", "mentor", "student"], calc: true });
  D.APPNAME[c.id] = "Tools";
});
function copy(v) { return JSON.parse(JSON.stringify(v)); }
function defaults() { var o = {}; ORDER.forEach(function (c) { o[c.key] = copy(c.defaults); }); return o; }

/* Inputs in the address: "k:v~k:v", with gear stages as "12x60_20x50". Read once, when the page opens on a calculator. */
function encode(c, st) {
  return Object.keys(c.defaults).map(function (k) { var v = st[k]; return k + ":" + (Array.isArray(v) ? v.map(function (s) { return s.join("x"); }).join("_") : v); }).join("~");
}
function decode(c, text) {
  var st = copy(c.defaults);
  String(text).split("~").forEach(function (part) {
    var i = part.indexOf(":"); if (i < 1) return;
    var k = part.slice(0, i), v = part.slice(i + 1);
    if (!Object.prototype.hasOwnProperty.call(c.defaults, k) || !/^[\w.\-]*$/.test(v)) return;
    if (Array.isArray(c.defaults[k])) {
      var stages = v.split("_").map(function (s) { return s.split("x"); }).filter(function (s) { return s.length === 2; }).slice(0, 4);
      if (stages.length) st[k] = stages;
    } else st[k] = v;
  });
  return st;
}
var readLink = false;
D.inits.push(function (S) {
  S.tools = S.tools || {};
  S.tools.calc = defaults();
  if (readLink || typeof location === "undefined") return;
  readLink = true;
  try {
    var c = C[location.hash.slice(1)], q = new URLSearchParams(location.search).get("in");
    if (c && q && c.link) S.tools.calc[c.key] = decode(c, q);
  } catch (e) {}
});

/* ---------- The page ---------- */
function allowed(id) { return D.visibleTools().some(function (t) { return t.id === id; }); }
function head(name) {
  return '<div class="pagehead toolhead calchead"><a class="backlink" href="#tools" data-act="go" data-v="tools"><span aria-hidden="true">‹</span> All tools</a><h1>' + esc(name) + "</h1></div>";
}
function view(c) {
  if (!allowed(c.id)) return D.denied("Tools");
  var st = ST(c.key), o = c.out(st);
  var acts = c.link ? '<button type="button" class="btn" id="calc-copy" data-act="calccopy">Copy link</button>' : "";
  if (c.link || c.reset) acts += '<button type="button" class="btn ghost" id="calc-reset" data-act="calcreset">Reset</button>';
  return head(c.name) + '<div class="content calcpage">' +
    '<p class="calcans' + (o.bad ? " bad" : "") + (o.plain ? " plain" : "") + '" id="calc-ans" aria-live="polite">' + o.ans + "</p>" +
    '<div class="calccols' + (c.single ? " one" : "") + '"><form class="calcin" onsubmit="return false" aria-label="Inputs">' + c.inputs(st) + '</form><div class="calcout" id="calc-out">' + o.html + "</div></div>" +
    (o.wide != null ? '<div class="calcwide" id="calc-wide">' + o.wide + "</div>" : "") +
    '<div class="calcfoot">' + c.how() + (acts ? '<div class="row calcacts">' + acts + "</div>" : "") + (c.motorLine ? '<p class="calcnote">' + esc(MOTOR_LINE) + "</p>" : "") + "</div></div>";
}
ORDER.forEach(function (c) { D.views[c.id] = function () { return view(c); }; });

// Repaint only what the inputs feed: the answer, the results and the drawing. The fields are never redrawn.
function paint() {
  var c = C[D.S.route]; if (!c) return;
  var o = c.out(ST(c.key)), ans = document.getElementById("calc-ans"), out = document.getElementById("calc-out"), wide = document.getElementById("calc-wide");
  if (D.hideTip) D.hideTip();
  if (ans) { ans.innerHTML = o.ans; ans.className = "calcans" + (o.bad ? " bad" : "") + (o.plain ? " plain" : ""); }
  if (out) out.innerHTML = o.html;
  if (wide && o.wide != null) wide.innerHTML = o.wide;
}
function refocus(id) { var el = document.getElementById(id); if (el) el.focus(); }
function cur() { return C[D.S.route]; }

/* ---------- Actions ---------- */
var A = D.acts;
D.inputs.calcin = function (el) {
  var c = cur(); if (!c) return;
  var st = ST(c.key), k = el.dataset.k, m = /^s(\d)([ab])$/.exec(k);
  if (m && st.stages[+m[1]]) st.stages[+m[1]][m[2] === "a" ? 0 : 1] = el.value; else st[k] = el.value;
  paint();
};
D.changes.calcin = D.inputs.calcin;
A.calcset = function (b) {
  var c = cur(); if (!c) return;
  var st = ST(c.key), k = b.dataset.k, v = b.dataset.v;
  // Switching units keeps the same real distance.
  if (k === "unit" && v !== st.unit) { var d = num(st.dist); if (d > 0) st.dist = v === "mm" ? (d * 25.4).toFixed(1) : String(+(d / 25.4).toFixed(3)); }
  st[k] = v; D.render(); refocus(b.id);
};
A.calcpick = function (b) { var c = cur(); if (!c) return; ST(c.key).ratio = b.dataset.v; D.render(); refocus(b.id); };
A.calcstage = function (b) {
  var st = ST("gearbox");
  if (b.dataset.v === "add" && st.stages.length < 4) { st.stages.push(["12", "36"]); D.render(); refocus("calc-s" + (st.stages.length - 1) + "a"); }
  else if (b.dataset.v === "del" && st.stages.length > 1) { st.stages.splice(+b.dataset.i, 1); D.render(); refocus("calc-addstage"); }
};
A.calcreset = function () { var c = cur(); if (!c) return; D.S.tools.calc[c.key] = copy(c.defaults); D.render(); refocus("calc-reset"); };
A.calccopy = function () {
  var c = cur(); if (!c) return;
  var url = new URL(location.href); url.searchParams.set("in", encode(c, ST(c.key))); url.hash = c.id;
  function done() { D.toast("Link copied."); D.render(); refocus("calc-copy"); }
  function fallback() {
    var t = document.createElement("textarea"); t.value = url.href; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (e) {} t.remove(); done();
  }
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url.href).then(done, fallback); else fallback(); } catch (e) { fallback(); }
};
// The door into Parts & Inventory: its own inventory search, filled in (as the Gear finder does).
A.calcparts = function (b) { var name = b.dataset.v; if (!name || !D.S.parts) return; D.S.parts.invq = name; D.S.parts.loc = "all"; D.S.parts.low = false; D.S.tabs.parts = "inventory"; D.go("parts"); };
})();
