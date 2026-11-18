/* Tools: Gear ratio (#tool-ratio). Build a reduction stage by stage (gears, belts, chain, planetary) and see the speed
   and torque on every shaft, or find a train of stock parts that reaches a wanted reduction. The drawing is the train
   to scale, every part turning at its true relative speed and in its true direction. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");

/* ---------- Maths (no page code; tests/tool-ratio.test.js runs it in Node) ---------- */
var M = {};
M.DP = 20;                        // gears: 20 diametral pitch
M.HTD = 5;                        // belts: HTD 5 mm
M.CHAIN = 0.25;                   // chain: #25
M.RING = 2.25;                    // a planetary stage is drawn with a ring of this pitch diameter (in), about VersaPlanetary size
M.PLANETS = [3, 4, 5, 7, 9, 10];
M.NM_LBIN = 1 / (F.LBF * F.IN);   // lb in per N m
M.KINDS = ["gear", "belt", "chain", "planet"];
M.ratioOf = function (st) { return st.kind === "planet" ? st.p : st.b / st.a; };
M.flips = function (st) { return st.kind === "gear"; };          // a gear mesh turns the next shaft the other way
M.pd = function (kind, n) { return kind === "gear" ? n / M.DP : kind === "belt" ? F.beltPd(M.HTD, n) : F.sprocketPd(M.CHAIN, n); };
M.od = function (kind, n) { return kind === "gear" ? (n + 2) / M.DP : kind === "belt" ? M.pd(kind, n) - 2 * 0.5715 / 25.4 : M.pd(kind, n) + M.CHAIN * 0.6; };
// The tooth counts a planetary stage is drawn with: a 12-tooth sun, ring = 12 (R - 1), planets in between. Three
// evenly spaced planets fit because ring + sun = 12 R is a multiple of three.
M.planetTeeth = function (R) { var zs = 12, zr = 12 * (R - 1); return { sun: zs, ring: zr, planet: (zr - zs) / 2 }; };

/* Clean a list of stages (from a link or a form) in place: known kinds, whole tooth counts, one to four stages. */
M.clean = function (stages) {
  if (!Array.isArray(stages)) stages = [];
  var out = stages.filter(function (st) { return st && typeof st === "object"; }).slice(0, 4).map(function (st) {
    var a = Math.round(+st.a), b = Math.round(+st.b), p = +st.p;
    return { kind: M.KINDS.indexOf(st.kind) >= 0 ? st.kind : "gear", a: a >= 6 && a <= 200 ? a : 12, b: b >= 6 && b <= 200 ? b : 60, p: M.PLANETS.indexOf(p) >= 0 ? p : 4 };
  });
  return out.length ? out : [{ kind: "gear", a: 12, b: 60, p: 4 }];
};

/* The speed and torque on every shaft. o: { motor (id), n (motors), V (battery), statorA (limit per motor, 0 = none),
   effGear, effPlanet (0..1; gear, belt and chain stages use effGear) }.
   Returns { total, eff, shafts: [{ rpm (no load), torque (N m at the limit, stalled), dir (+1 = as the motor) }],
   stages: [{ ratio, eff }], freeOut (rpm), torqueOut (N m), dirOut }. */
M.train = function (stages, o) {
  var m = F.motor(o.motor), n = o.n || 1, V = o.V == null ? 12 : o.V;
  var t0 = F.drive({ motor: m, n: n, ratio: 1, eff: 1, statorA: o.statorA || 0 }).at(0, V, 1).torque;
  var sh = [{ rpm: m.freeRpm * V / 12, torque: t0, dir: 1 }], total = 1, eff = 1, st = [];
  stages.forEach(function (s) {
    var R = M.ratioOf(s), e = s.kind === "planet" ? o.effPlanet : o.effGear, p = sh[sh.length - 1];
    if (e == null) e = 1;
    total *= R; eff *= e; st.push({ ratio: R, eff: e });
    sh.push({ rpm: p.rpm / R, torque: p.torque * R * e, dir: M.flips(s) ? -p.dir : p.dir });
  });
  var last = sh[sh.length - 1];
  return { total: total, eff: eff, shafts: sh, stages: st, freeOut: last.rpm, torqueOut: last.torque, dirOut: last.dir };
};

/* Stock parts the search may use (common sizes, not a stock check). */
M.STOCK = {
  pinion: range(8, 16, 1),                       // on the motor
  gear: range(14, 84, 2),                        // 20 DP
  pulley: [12, 14, 16, 18, 20, 22, 24, 28, 30, 32, 36, 40, 42, 48, 60, 72],   // HTD 5 mm
  sprocketIn: range(12, 26, 2), sprocket: range(12, 72, 2),                    // #25
  planet: [3, 4, 5]
};
function range(a, b, s) { var o = []; for (var i = a; i <= b; i += s) o.push(i); return o; }
function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
/* A gear under this many teeth is a "small pinion": often cut with a shifted profile, so it needs its maker's own
   centre distance. The search prefers trains without one. */
M.SMALL = 14;
/* Every stage one kind of part can make: for each ratio and kind, the smallest, and for gears also the smallest with
   no small pinion (so the search can offer one). first: on the motor. sm: the stage's smallest gear (Infinity if none). */
M.options = function (kind, first, lo, hi) {
  var best = {}, ok = function (t) { return t >= lo && t <= hi; }, add = function (st, d, big) {
    var sm = st.kind === "gear" ? Math.min(st.a, st.b) : Infinity;
    var R = M.ratioOf(st), key = (st.kind === "planet" ? "p" + st.p : (st.b / gcd(st.a, st.b)) + "/" + (st.a / gcd(st.a, st.b))) + (sm < M.SMALL ? "s" : ""), cur = best[key];
    if (!cur || d < cur.d - 1e-9 || (Math.abs(d - cur.d) < 1e-9 && st.a > cur.st.a)) best[key] = { st: st, r: R, d: d, t: big, sm: sm };
  };
  if (kind === "planet") M.STOCK.planet.forEach(function (p) { add({ kind: "planet", a: 12, b: 60, p: p }, M.RING, 0); });
  else {
    var drv = kind === "gear" ? (first ? M.STOCK.pinion : M.STOCK.gear) : kind === "belt" ? M.STOCK.pulley : M.STOCK.sprocketIn,
      dvn = kind === "gear" ? M.STOCK.gear : kind === "belt" ? M.STOCK.pulley : M.STOCK.sprocket;
    drv.filter(ok).forEach(function (a) { dvn.filter(ok).forEach(function (b) { add({ kind: kind, a: a, b: b, p: 4 }, Math.max(M.pd(kind, a), M.pd(kind, b)), Math.max(a, b)); }); });
  }
  return Object.keys(best).map(function (k) { return best[k]; });
};
/* Find trains near a wanted reduction. o: { target, tol (fraction), maxStages (1..3), kinds: { gear, belt, chain,
   planet }, minT, maxT, limit (default 12) }. Returns [{ stages, ratio, err (fraction, + = more reduction),
   d (largest pitch diameter, in), t (most teeth) }], fewest stages first, then smallest error, then smallest. */
M.find = function (o) {
  var limit = o.limit || 12, kinds = M.KINDS.filter(function (k) { return o.kinds[k]; }), out = [];
  if (!kinds.length || !(o.target > 0)) return out;
  var cat = function (first) { var l = []; kinds.forEach(function (k) { l = l.concat(M.options(k, first, o.minT, o.maxT)); }); return l.sort(function (a, b) { return a.r - b.r; }); };
  var L1 = cat(true), L2 = cat(false), lo = o.target * (1 - o.tol), hi = o.target * (1 + o.tol);
  // Closest first; then trains with no small pinion; then the smallest largest part.
  function better(a, b) {
    var ea = Math.abs(a.err), eb = Math.abs(b.err); if (Math.abs(ea - eb) > 1e-9) return ea < eb;
    var pa = a.small >= M.SMALL, pb = b.small >= M.SMALL; if (pa !== pb) return pa;
    if (Math.abs(a.d - b.d) > 1e-9) return a.d < b.d; return a.t < b.t;
  }
  function keep(list, parts) {
    var r = 1, d = 0, t = 0, sm = Infinity; parts.forEach(function (p) { r *= p.r; d = Math.max(d, p.d); t = Math.max(t, p.t); sm = Math.min(sm, p.sm); });
    var c = { stages: parts.map(function (p) { return Object.assign({}, p.st); }), ratio: r, err: r / o.target - 1, d: d, t: t, small: sm };
    if (list.length >= limit && !better(c, list[list.length - 1])) return;
    var i = list.length; while (i > 0 && better(c, list[i - 1])) i--;
    list.splice(i, 0, c); if (list.length > limit) list.pop();
  }
  function first(L, x) { var a = 0, b = L.length; while (a < b) { var m = (a + b) >> 1; if (L[m].r < x) a = m + 1; else b = m; } return a; }
  // Stages that reach [want / (1 + tol), want / (1 - tol)], nearest first, while they can still beat the worst kept.
  function each(L, want, list, fn) {
    var i = first(L, want), j = i - 1, worst = function () { return list.length >= limit ? Math.abs(list[list.length - 1].err) + 1e-9 : o.tol; };
    while (i < L.length || j >= 0) {
      var ei = i < L.length ? Math.abs(L[i].r / want - 1) : Infinity, ej = j >= 0 ? Math.abs(L[j].r / want - 1) : Infinity;
      var pick = ei <= ej ? i++ : j--, e = Math.min(ei, ej);
      if (e > Math.min(o.tol, worst()) * 1.0001 + 1e-12) break;
      fn(L[pick]);
    }
  }
  for (var n = 1; n <= Math.min(3, o.maxStages || 1) && out.length < limit; n++) {
    var list = [];
    if (n === 1) each(L1, o.target, list, function (a) { keep(list, [a]); });
    else if (n === 2) L1.forEach(function (a) { each(L2, o.target / a.r, list, function (b) { keep(list, [a, b]); }); });
    else {
      var r2lo = L2[0] ? L2[0].r : 1, r2hi = L2.length ? L2[L2.length - 1].r : 1;
      L1.forEach(function (a) {
        // Only middle stages that leave a last stage the stock can make.
        var bLo = lo / (a.r * r2hi), bHi = hi / (a.r * r2lo);
        for (var k = first(L2, bLo); k < L2.length && L2[k].r <= bHi; k++) {
          var b = L2[k]; each(L2, o.target / (a.r * b.r), list, function (c) { keep(list, [a, b, c]); });
        }
      });
    }
    list = list.filter(function (c) { return c.ratio >= lo - 1e-9 && c.ratio <= hi + 1e-9; });
    out = out.concat(list.slice(0, limit - out.length));
  }
  return out;
};
/* How many trains of these parts come within the tolerance, one to maxStages stages: the whole set M.find takes its
   best few from. Same options and the same order of stages as M.find, counted by binary search, not listed. */
M.count = function (o) {
  var kinds = M.KINDS.filter(function (k) { return o.kinds[k]; }); if (!kinds.length || !(o.target > 0)) return 0;
  var cat = function (first) { var l = []; kinds.forEach(function (k) { l = l.concat(M.options(k, first, o.minT, o.maxT)); }); return l.map(function (p) { return p.r; }).sort(function (a, b) { return a - b; }); };
  var L1 = cat(true), L2 = cat(false), lo = o.target * (1 - o.tol) - 1e-9, hi = o.target * (1 + o.tol) + 1e-9, n = 0;
  function at(L, x) { var a = 0, b = L.length; while (a < b) { var m = (a + b) >> 1; if (L[m] < x) a = m + 1; else b = m; } return a; }
  function inRange(L, a, b) { return Math.max(0, at(L, b * (1 + 1e-12)) - at(L, a * (1 - 1e-12))); }
  var most = Math.min(3, o.maxStages || 1), r2lo = L2[0] || 1, r2hi = L2[L2.length - 1] || 1;
  if (most >= 1) n += inRange(L1, lo, hi);
  L1.forEach(function (a) {
    if (most >= 2) n += inRange(L2, lo / a, hi / a);
    if (most >= 3) for (var k = at(L2, lo / (a * r2hi)); k < L2.length && L2[k] <= hi / (a * r2lo); k++) n += inRange(L2, lo / (a * L2[k]), hi / (a * L2[k]));
  });
  return n;
};
/* The parts in a train: two gears, pulleys or sprockets a stage, plus the belt or chain; a planetary stage counts as one. */
M.parts = function (stages) { return stages.reduce(function (t, st) { return t + (st.kind === "planet" ? 1 : st.kind === "gear" ? 2 : 3); }, 0); };
/* A stage's centre distance (in): gears at half the sum of their pitch diameters; a belt or chain on the stock loop
   nearest a 0.75 in gap between the wheels; a planetary on its own axis (0). Returns { C, count (belt teeth or links) }. */
M.centre = function (st) {
  if (st.kind === "planet") return { C: 0 };
  var pa = M.pd(st.kind, st.a), pb = M.pd(st.kind, st.b);
  if (st.kind === "gear") return { C: (pa + pb) / 2 };
  var want = (M.od(st.kind, st.a) + M.od(st.kind, st.b)) / 2 + 0.75, res = st.kind === "belt" ? F.belt({ pitch: M.HTD, pld: 0.5715, n1: st.a, n2: st.b, target: want, step: 5, min: 35, max: 400 }) : F.chain({ pitch: M.CHAIN, n1: st.a, n2: st.b, target: want });
  var o = res.options[0], C = o ? o.center : want;
  return { C: C, count: o ? (o.teeth || o.links) : Math.round(F.loopLength(pa, pb, C) / (st.kind === "belt" ? M.HTD / 25.4 : M.CHAIN)) };
};
// The train's overall length: the sum of its shaft centre distances (in).
M.length = function (stages) { return stages.reduce(function (t, st) { return t + M.centre(st).C; }, 0); };
// The smallest gear (teeth) in the train's gear stages, or Infinity.
M.smallGear = function (stages) { return stages.reduce(function (t, st) { return st.kind === "gear" ? Math.min(t, st.a, st.b) : t; }, Infinity); };
/* The output speed (rpm) at which a stator limit L (A) stops holding torque flat: where the motor's own current,
   (V - ke w) / R, falls to L. null when there is no limit or the motor never reaches it. */
M.kneeRpm = function (motor, V, L, ratio) { var m = F.motor(motor); if (!(L > 0) || L * m.R >= V) return null; return (V - L * m.R) / m.ke / F.RPM / ratio; };
M.label = function (st) { return st.kind === "planet" ? "planetary " + st.p + ":1" : st.a + ":" + st.b + (st.kind === "gear" ? "" : " " + st.kind); };
M.trainLabel = function (stages) { return stages.map(M.label).join(", "); };

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The calculator ---------- */
var K = D.calc, ID = "tool-ratio", esc = D.esc;
var KIND_NAMES = { gear: "Gears", belt: "Belt", chain: "Chain", planet: "Planetary" };
var SHOW_RPS = 0.5;               // the motor turns half a turn a second in the drawing at 1x

var css = document.createElement("style");
css.textContent =
  ".t-ratio-st{display:grid;gap:6px;padding:10px 0 12px;border-top:1px solid var(--line)}" +
  ".t-ratio-st:first-of-type{border-top:0;padding-top:2px}" +
  ".t-ratio-sth{display:flex;align-items:center;gap:8px}.t-ratio-sth b{font-size:.85rem;min-width:4.4em}" +
  ".t-ratio-sth select.inp{flex:1;min-width:0;min-height:36px;padding:4px 8px}.t-ratio-sth .btn{flex:none}" +
  ".t-ratio-stt{display:flex;align-items:end;gap:8px;flex-wrap:wrap}" +
  ".t-ratio-stt label{display:grid;gap:2px;font-size:.78rem;color:var(--mute);font-weight:600}" +
  ".t-ratio-stt .inp{width:76px;min-height:36px;padding:4px 8px;text-align:right}.t-ratio-stt select.inp{width:110px;text-align:left}" +
  ".t-ratio-stt .inp.bad{border-color:var(--bad);background:var(--bad-bg)}" +
  ".t-ratio-stt .t-ratio-x{padding-bottom:9px;color:var(--mute)}.t-ratio-stt output{padding-bottom:9px;margin-left:auto;font-size:.85rem;color:var(--text-2);font-weight:600}" +
  ".t-ratio-add{padding-top:4px}.t-ratio-warn{color:var(--warn);font-weight:600;white-space:normal;display:inline-block;max-width:34ch}" +
  ".t-ratio-badge{display:inline-block;font-size:.72rem;font-weight:700;color:var(--warn);border:1px solid currentColor;border-radius:999px;padding:0 7px;margin-left:4px;white-space:nowrap;vertical-align:1px}" +
  ".t-ratio-plist{display:none;list-style:none;margin:0;padding:0}.t-ratio-plist li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}" +
  ".t-ratio-plist li:first-child{border-top:0}.t-ratio-plist li.pick{background:var(--tint);box-shadow:inset 3px 0 0 var(--accent);padding-left:8px}.t-ratio-plist small{color:var(--text-2)}" +
  ".t-ratio-ends{margin-top:-4px}" +
  "@media (max-width:640px){.t-ratio-stt .inp,.t-ratio-sth select.inp{min-height:44px}.t-ratio-ftab .scroll{display:none}.t-ratio-plist{display:block}}";
document.head.appendChild(css);

// A line cut where it leaves the top of a chart: the crossing point is kept, everything above is left out.
function clipTop(pts, top) {
  var out = [];
  pts.forEach(function (p, i) {
    var q = pts[i - 1];
    if (q && (q[1] > top) !== (p[1] > top)) { var u = (top - q[1]) / (p[1] - q[1]); out.push([q[0] + (p[0] - q[0]) * u, top]); }
    out.push(p[1] > top ? [p[0], NaN] : p);
  });
  return out;
}
// Find one on a phone: each train in two lines (the train and its ratio; error, parts and length) beside its button.
function phoneList(found) {
  return '<ol class="t-ratio-plist">' + found.map(function (c, i) {
    var err = Math.abs(c.err) < 1e-9 ? "exact" : (c.err > 0 ? "+" : "−") + K.fix(Math.abs(c.err) * 100, 2) + "%";
    return '<li' + (i === 0 ? ' class="pick"' : "") + '><div><b>' + esc(M.trainLabel(c.stages)) + "</b> " + K.n(c.ratio, 3) + " : 1" + (c.small < M.SMALL ? ' <span class="t-ratio-badge">small pinion</span>' : "") +
      "<br><small>" + err + ", " + c.parts + " parts, " + K.fix(c.len, 2) + ' in long</small></div><button class="btn sm" data-act="ratiouse" data-v="' + i + '">Use this one</button></li>';
  }).join("") + "</ol>";
}
// The stock list in the notes, held to the smallest and largest gear set in the controls.
function stockList(s) {
  function within(l) { return l.filter(function (t) { return t >= s.minT && t <= s.maxT; }); }
  function span(l, step) { return !l.length ? "none in your range" : l.length === 1 ? l[0] + " teeth" : l[0] + " to " + l[l.length - 1] + " teeth" + (step ? " in steps of " + step : ""); }
  var pin = within(M.STOCK.pinion), gear = within(M.STOCK.gear), pul = within(M.STOCK.pulley), spi = within(M.STOCK.sprocketIn), sp = within(M.STOCK.sprocket);
  return "<li>Motor pinions, 20 DP: " + span(pin) + ".</li><li>20 DP gears: " + span(gear, 2) + ".</li><li>HTD 5 mm pulleys: " + (pul.length ? pul.join(", ") + " teeth" : "none in your range") + ".</li><li>#25 sprockets: " + span(sp, 2) + (spi.length ? " (driving sprockets " + spi[0] + " to " + spi[spi.length - 1] + ")" : "") + ".</li><li>Planetary stages of 3, 4 and 5 to 1.</li>";
}
function opts(s) { return { motor: s.motor, n: s.motors, V: s.volts, statorA: s.statorA, effGear: s.effGear / 100, effPlanet: s.effPlanet / 100 }; }
function rpmTxt(x) { return K.n(x, x >= 100 ? 0 : x >= 10 ? 1 : 2) + " rpm"; }
function ftTxt(v) { return K.fix(v, v < 1 ? 2 : 1); }
function ratioTxt(R) { return K.n(R, R >= 1000 ? 0 : R >= 100 ? 1 : R >= 10 ? 2 : 3) + " : 1"; }

K.tool({
  id: ID,
  defaults: { mode: "build", stages: [{ kind: "gear", a: 12, b: 60, p: 4 }, { kind: "gear", a: 18, b: 54, p: 4 }], motor: "kraken60", motors: 1, statorA: 60,
    out: "none", wheelD: 4, spoolD: 1.5, volts: 12, effGear: 97, effPlanet: 93,
    want: 15, tol: 2, maxStages: 2, kGear: true, kBelt: false, kChain: false, kPlanet: false, minT: 10, maxT: 72 },
  stage: { ratio: 2.2, narrow: 0.95, label: "The gear train to scale, every part turning at its real speed relative to the motor, with each shaft's speed." },
  loop: true, autoplay: true,

  compute: function (s) {
    s.stages = M.clean(s.stages);
    var r = { mode: s.mode };
    if (s.mode === "find") {
      var t0 = Date.now();
      var fo = { target: s.want, tol: s.tol / 100, maxStages: s.maxStages, kinds: { gear: s.kGear, belt: s.kBelt, chain: s.kChain, planet: s.kPlanet }, minT: s.minT, maxT: s.maxT };
      r.found = M.find(fo); r.total = Math.max(r.found.length, M.count(fo));
      r.found.forEach(function (c) { c.parts = M.parts(c.stages); c.len = M.length(c.stages); c.small = M.smallGear(c.stages); });
      r.ms = Date.now() - t0;
    }
    r.stages = s.mode === "find" ? (r.found[0] ? r.found[0].stages : []) : s.stages;
    if (!r.stages.length) return r;
    r.t = M.train(r.stages, opts(s));
    var open = M.train(r.stages, Object.assign(opts(s), { statorA: 0 }));
    r.stallOut = open.torqueOut;
    r.layout = layout(r.stages);
    if (s.out !== "none") {
      var D_ = s.out === "wheel" ? s.wheelD : s.spoolD;
      r.dia = D_; r.surf = r.t.freeOut * Math.PI * D_ / 12 / 60;          // ft/s
      r.force = r.t.torqueOut * M.NM_LBIN / (D_ / 2);                     // lbf
    }
    // The output's torque against its speed, with and without the limit.
    var m = F.motor(s.motor), dr = F.drive({ motor: m, n: s.motors, ratio: r.t.total, eff: r.t.eff, statorA: s.statorA }), dr0 = F.drive({ motor: m, n: s.motors, ratio: r.t.total, eff: r.t.eff });
    var wf = dr.freeSpeed(s.volts); r.curve = []; r.curve0 = []; r.knee = M.kneeRpm(s.motor, s.volts, s.statorA, r.t.total);
    for (var i = 0; i <= 120; i++) { var w = wf * i / 120; r.curve.push([w / F.RPM, dr.at(w, s.volts, 1).torque * M.NM_LBIN]); r.curve0.push([w / F.RPM, dr0.at(w, s.volts, 1).torque * M.NM_LBIN]); }
    return r;
  },

  hints: function (s, r) {
    var h = {}; if (s.mode !== "build") return h;
    s.stages.forEach(function (st, i) { h["t-ratio-r" + i] = ratioTxt(M.ratioOf(st)); });
    return h;
  },

  controls: function (s) {
    var mode = K.seg(ID, "mode", "I want to", [["build", "Build one"], ["find", "Find one"]]);
    if (s.mode === "find") {
      return K.group(ID, "mode", "Gear ratio", mode) +
        K.group(ID, "want", "What you need", K.num(ID, "want", "Wanted reduction", { unit: ": 1", min: 1, max: 400, step: "any", slider: true, tip: "Motor turns for one turn of the output." }) +
          K.num(ID, "tol", "Allowed error", { unit: "%", min: 0, max: 10, step: 0.1, tip: "How far from the wanted reduction a train may be." }) +
          K.seg(ID, "maxStages", "Most stages", [[1, "1"], [2, "2"], [3, "3"]])) +
        K.group(ID, "parts", "Parts it may use", K.check(ID, "kGear", "Gears (20 DP)") + K.check(ID, "kBelt", "Belts (HTD 5 mm)") + K.check(ID, "kChain", "Chain (#25)") + K.check(ID, "kPlanet", "Planetary stages (3, 4 and 5 to 1)") +
          (s.kGear && !s.kBelt && !s.kChain && !s.kPlanet ? '<p class="cfh">Gears only. Tick belts, chain or planetary to see more.</p>' : "") +
          K.num(ID, "minT", "Smallest gear", { unit: "teeth", min: 8, max: 84, step: 1, tip: "The fewest teeth on any gear, pulley or sprocket, motor pinions included." }) +
          K.num(ID, "maxT", "Largest gear", { unit: "teeth", min: 8, max: 84, step: 1, tip: "The most teeth on any gear, pulley or sprocket. This sets how big the gearbox gets." }));
    }
    var rows = s.stages.map(function (st, i) {
      var kind = '<select class="inp" data-change="ratiokind" data-i="' + i + '" aria-label="Stage ' + (i + 1) + ' parts">' + M.KINDS.map(function (k) { return '<option value="' + k + '"' + (k === st.kind ? " selected" : "") + ">" + KIND_NAMES[k] + "</option>"; }).join("") + "</select>";
      var word = st.kind === "belt" ? "pulley" : st.kind === "chain" ? "sprocket" : "gear";
      var teeth = st.kind === "planet" ?
        '<label>Ratio<select class="inp" data-change="ratioplanet" data-i="' + i + '" aria-label="Stage ' + (i + 1) + ' planetary ratio">' + M.PLANETS.map(function (p) { return '<option value="' + p + '"' + (p === st.p ? " selected" : "") + ">" + p + " : 1</option>"; }).join("") + "</select></label>" :
        '<label>Driving ' + word + '<input type="number" inputmode="numeric" class="inp num" min="6" max="200" step="1" value="' + st.a + '" data-input="ratioteeth" data-i="' + i + '" data-k="a" aria-label="Stage ' + (i + 1) + " driving " + word + ' teeth"></label><span class="t-ratio-x" aria-hidden="true">:</span>' +
        '<label>Driven ' + word + '<input type="number" inputmode="numeric" class="inp num" min="6" max="200" step="1" value="' + st.b + '" data-input="ratioteeth" data-i="' + i + '" data-k="b" aria-label="Stage ' + (i + 1) + " driven " + word + ' teeth"></label>';
      return '<div class="t-ratio-st"><div class="t-ratio-sth"><b>Stage ' + (i + 1) + "</b>" + kind + (s.stages.length > 1 ? '<button class="btn sm ghost" data-act="ratiodel" data-v="' + i + '" aria-label="Remove stage ' + (i + 1) + '">Remove</button>' : "") + "</div>" +
        '<div class="t-ratio-stt">' + teeth + '<output id="t-ratio-r' + i + '">' + ratioTxt(M.ratioOf(st)) + "</output></div></div>";
    }).join("");
    var add = s.stages.length < 4 ? '<div class="t-ratio-add"><button class="btn sm" data-act="ratioadd">' + D.ic("plus", 16) + " Add a stage</button></div>" : "";
    var outField = s.out === "wheel" ? K.num(ID, "wheelD", "Wheel or roller diameter", { unit: "in", min: 0.5, max: 12, step: 0.125, slider: true }) :
      s.out === "spool" ? K.num(ID, "spoolD", "Spool diameter", { unit: "in", min: 0.25, max: 6, step: 0.125, slider: true, tip: "Where the rope or belt wraps. It grows as rope piles up on it." }) : "";
    return K.group(ID, "mode", "Gear ratio", mode) +
      K.group(ID, "stages", "Stages, from the motor out", '<div class="t-ratio-list">' + rows + "</div>" + add) +
      K.group(ID, "motor", "Motor", K.pick(ID, "motor", "Motor", F.MOTORS.map(function (m) { return [m.id, m.name]; })) +
        K.num(ID, "motors", "Motors", { min: 1, max: 4, step: 1, tip: "Motors driving the first stage together." }) +
        K.num(ID, "statorA", "Current limit", { unit: "A", min: 0, max: 200, step: 1, tip: "The stator limit set in the motor controller, for each motor. 0 means no limit." })) +
      K.group(ID, "out", "On the output", K.seg(ID, "out", "What it turns", [["none", "Nothing"], ["wheel", "Wheel or roller"], ["spool", "Spool"]]) + outField) +
      K.group(ID, "adv", "Fine tuning", K.num(ID, "volts", "Battery", { unit: "V", min: 6, max: 13.5, step: 0.1, tip: "Voltage at the motor. Free speed is in proportion to it." }) +
        K.num(ID, "effGear", "Each gear, belt or chain stage", { unit: "%", min: 50, max: 100, step: 1, tip: "Share of torque that gets through one stage. 97 is a common figure for spur gears and belts; chain is close." }) +
        K.num(ID, "effPlanet", "Each planetary stage", { unit: "%", min: 50, max: 100, step: 1, tip: "Planetary stages lose a little more. 90 to 95 is typical." }), true);
  },

  outs: function (s, r) {
    if (s.mode === "find") {
      if (!r.found.length) return K.verdict("warn", "No train of these parts comes within " + K.n(s.tol, 1) + "% of " + ratioTxt(s.want) + ". Allow more stages, more kinds of part or a bigger error.");
      var b = r.found[0], exact = Math.abs(b.err) < 1e-9;
      // "Note", not "Works on paper": the search has done the arithmetic, not checked that the parts carry the load.
      return K.verdict("info", "Start with the first row, " + M.trainLabel(b.stages) + " (" + (exact ? "exactly " + ratioTxt(b.ratio) : ratioTxt(b.ratio) + ", " + (b.err > 0 ? "+" : "−") + K.fix(Math.abs(b.err) * 100, 2) + "%") + "), drawn above: it has the fewest stages, then " + (exact ? "an exact ratio" : "the closest ratio") + (b.small >= M.SMALL ? ", no small pinion" : "") + ", then the smallest largest gear. These are sizes vendors commonly make, not a check of what is in stock.",
        "These are the best " + r.found.length + " of " + K.n(r.total, 0) + " trains within " + K.n(s.tol, 1) + "%." + (b.small < M.SMALL ? " Every train this close has a small pinion: its " + b.small + "-tooth gear is likely cut with a shifted profile, so use the maker's centre distance." : "") + " Check each gear's and shaft's torque rating, and that the centres fit your plates.") +
        K.outs([{ k: "Best reduction", v: K.n(b.ratio, 3), u: ": 1", sub: M.trainLabel(b.stages) },
          { k: "Error", v: Math.abs(b.err) < 1e-9 ? "0" : (b.err > 0 ? "+" : "−") + K.fix(Math.abs(b.err) * 100, 2), u: "%", sub: (Math.abs(b.err) < 1e-9 ? "exactly " : "against ") + ratioTxt(s.want) },
          { k: "Stages", v: String(b.stages.length), sub: b.parts + " parts, " + K.fix(b.len, 2) + " in long", tip: "Parts: gears, pulleys, sprockets, belts and chains, with a planetary stage counted as one. Long: the sum of the shaft centre distances." },
          { k: "Largest part", v: K.fix(b.d, 2), u: "in", sub: b.t ? "pitch diameter, " + b.t + " teeth" : "the planetary ring", tip: "Pitch diameter of the biggest gear, pulley, sprocket or planetary ring in the train." },
          { k: "Output speed", v: K.n(r.t.freeOut, 0), u: "rpm", sub: "with no load" }]);
    }
    var t = r.t, lb = t.torqueOut * M.NM_LBIN, dirTxt = t.dirOut > 0 ? "the same way as the motor" : "the other way to the motor";
    var limited = s.statorA > 0 && r.stallOut > t.torqueOut * 1.001;
    var text = "The motor turns " + K.n(t.total, t.total >= 100 ? 0 : 2) + " times for each turn of the output, which spins at " + rpmTxt(t.freeOut) + " with no load and stalls at " + K.n(lb, lb >= 100 ? 0 : 1) + " lb in" + (limited ? " under the " + s.statorA + " A limit" : "") + ", turning " + dirTxt + ".";
    var items = [
      { k: "Reduction", v: K.n(t.total, t.total >= 1000 ? 0 : t.total >= 100 ? 1 : 3), u: ": 1", sub: "motor turns per output turn", tip: "Every stage's driven teeth over driving teeth, multiplied together." },
      { k: "Output speed", v: K.n(t.freeOut, t.freeOut >= 100 ? 0 : 1), u: "rpm", sub: "no load, " + K.n(t.freeOut * F.RPM, 1) + " rad/s" },
      { k: "Output torque, stalled", v: K.n(lb, lb >= 100 ? 0 : 1), u: "lb in", sub: K.n(t.torqueOut, 1) + " N m " + (limited ? "at the " + s.statorA + " A limit" : "at stall"), tip: "The most the output can push, with the motor held still at the current limit, after the losses in each stage." },
      r.dia ? { k: s.out === "wheel" ? "Surface speed" : "Line speed", v: ftTxt(r.surf), u: "ft/s", sub: K.fix(r.surf * F.FT, 2) + " m/s with no load", tip: "How fast the edge of the " + (s.out === "wheel" ? "wheel" : "spool") + " moves when nothing holds it back. Under load it runs slower." } : null,
      r.dia ? { k: s.out === "wheel" ? "Push at the edge" : "Pull on the line", v: K.n(r.force, r.force >= 100 ? 0 : 1), u: "lbf", sub: K.n(r.force * F.LBF, 0) + " N" + (limited ? " at the limit" : " at stall"), tip: "Output torque divided by the radius." } : null,
      r.dia ? null : { k: "Output turns", v: t.dirOut > 0 ? "Same way" : "Other way", sub: "as the motor", tip: "Each pair of meshing gears reverses the direction. Belts, chain and planetary stages keep it." }
    ];
    var big = r.stages.filter(function (st) { return st.kind !== "planet" && st.b / st.a > 7; })[0];
    var tiny = r.stages.filter(function (st) { return st.kind === "gear" && Math.min(st.a, st.b) < 9; })[0];
    var state = big || tiny ? "warn" : "info";
    if (big) text += " One " + (big.kind === "gear" ? "gear" : big.kind) + " stage is " + K.fix(big.b / big.a, 1) + " : 1; above about 7 : 1 the driven part gets large, and two stages are often smaller.";
    else if (tiny) text += " A " + Math.min(tiny.a, tiny.b) + "-tooth gear is very small for 20 DP; check that the part exists.";
    return K.verdict(state, text, "This is the arithmetic of the train. Check each gear's and shaft's torque rating against the stalled torque here, and that the centre distances fit your plates.") + K.outs(items) +
      '<p class="mute small t-ratio-ends">Stalled torque and no-load speed are the two ends of the torque curve below: the output never has both at once. Under load it runs somewhere between them.</p>';
  },

  more: function (s, r) {
    var out = "";
    if (s.mode === "find") {
      var title = r.found.length < r.total ? "The best " + r.found.length + " of " + K.n(r.total, 0) + " trains within " : (r.total === 1 ? "The one train within " : "All " + r.total + " trains within ");
      out += '<section class="ctab t-ratio-ftab"><h2>' + title + K.n(s.tol, 1) + "% of " + esc(ratioTxt(s.want)) + "</h2>" + (r.found.length ? '<p class="mute small">In order: fewest stages first, then closest to the ratio you asked for, then trains with no small pinion, then the smallest largest part.</p><div class="scroll"><table><thead><tr><th>Stages</th><th class="r">Reduction</th><th class="r">Error</th><th class="r">Largest part</th><th class="r">Parts</th><th class="r">Length</th><th></th></tr></thead><tbody>' +
        r.found.map(function (c, i) {
          var small = c.small < M.SMALL ? ' <span class="t-ratio-badge">small pinion</span>' : "";
          return "<tr" + (i === 0 ? ' class="pick"' : "") + "><td>" + esc(M.trainLabel(c.stages)) + small + '</td><td class="r num">' + K.n(c.ratio, 3) + ' : 1</td><td class="r num">' + (Math.abs(c.err) < 1e-9 ? "exact" : (c.err > 0 ? "+" : "−") + K.fix(Math.abs(c.err) * 100, 2) + "%") + '</td><td class="r num">' + K.fix(c.d, 2) + " in" + (c.t ? ", " + c.t + "T" : "") + '</td><td class="r num">' + c.parts + '</td><td class="r num">' + K.fix(c.len, 2) + ' in</td><td class="r"><button class="btn sm" data-act="ratiouse" data-v="' + i + '">Use this one</button></td></tr>';
        }).join("") + "</tbody></table></div>" + phoneList(r.found) : '<p class="mute small">Nothing found. Allow more stages, more kinds of part or a bigger error.</p>') +
        '<p class="mute small">' + (r.found.some(function (c) { return c.small < M.SMALL; }) ? "Small pinion: a gear under 14 teeth. Such gears are often cut with a shifted profile, so they need the centre distance their maker gives, not the standard one. Among trains equally close, those without one come first. " : "") + "Parts counts gears, pulleys, sprockets, belts and chains, with a planetary stage as one. Length is the sum of the shaft centre distances. Searched in " + Math.max(1, r.ms) + " ms. The top row is drawn above.</p></section>";
      out += K.notes("<p>The search tries every stage the listed parts can make and multiplies them, one, two or three stages deep, and counts every train within the error you allow. It lists the best of them: fewest stages first, then the closest to what you asked for, then trains with no gear under 14 teeth, then the one whose largest part is smallest. A smaller train is cheaper, lighter and easier to fit.</p>" +
        "<p>The parts it may use, within your smallest and largest gear (" + s.minT + " to " + s.maxT + " teeth):</p><ul>" + stockList(s) + "</ul>" +
        "<p>These are common sizes that vendors make, not a check of what the team has on the shelf. Pinions under 14 teeth are often cut with a shifted profile and need the maker's centre distance, not the standard one. Use this one puts the train into Build one, where you can see its speeds and torques.</p>");
      return out;
    }
    var t = r.t, rows = [];
    t.shafts.forEach(function (sh, i) {
      var st = i ? r.stages[i - 1] : null, L = i ? r.layout.stages[i - 1] : null;
      var what = !st ? s.motors + " × " + F.motor(s.motor).name : (st.kind === "planet" ? "Planetary " + st.p + " : 1" : st.a + " : " + st.b + " " + (st.kind === "gear" ? "gears" : st.kind));
      var where = !st ? "" : st.kind === "planet" ? "same axis" : K.fix(L.C, 3) + " in" + (st.kind === "gear" ? "" : ", " + L.count + (st.kind === "belt" ? "T belt" : " links"));
      rows.push("<tr><td>" + (i === 0 ? "Motor" : i === t.shafts.length - 1 ? "Output" : "Shaft " + (i + 1)) + "</td><td>" + esc(what) + "</td><td>" + esc(where) + '</td><td class="r num">' + (st ? K.fix(t.stages[i - 1].ratio, 3) : "") + '</td><td class="r num">' + K.n(sh.rpm, sh.rpm >= 100 ? 0 : 1) + '</td><td class="r num">' + K.n(sh.torque * M.NM_LBIN, 1) + '</td><td class="r num">' + K.n(sh.torque, 2) + "</td><td>" + (sh.dir > 0 ? "as motor" : "reversed") + "</td></tr>");
    });
    out += '<section class="ctab"><h2>Speed and torque after each stage</h2><div class="scroll"><table><thead><tr><th>Shaft</th><th>Parts</th><th>Centres</th><th class="r">Ratio</th><th class="r">rpm at ' + K.n(s.volts, s.volts % 1 ? 1 : 0) + ' V, no load</th><th class="r">lb in, stalled</th><th class="r">N m, stalled</th><th>Turns</th></tr></thead><tbody>' + rows.join("") + "</tbody></table></div>" +
      '<p class="mute small">Speed is with no load. Torque is with the motor stalled at the ' + (s.statorA > 0 ? s.statorA + " A limit" : "full stall current") + ", after each stage's losses." +
      (r.stages.some(function (st) { return st.kind === "belt" || st.kind === "chain"; }) ? " Belt and chain centres are for the stock loop nearest a 0.75 in gap between the wheels; Belt and chain spacing finds the others." : "") + "</p>" +
      (M.smallGear(r.stages) < 14 ? '<p class="mute small">A ' + M.smallGear(r.stages) + "-tooth gear is small: small pinions are often cut with a shifted profile and need the maker's centre distance, not the one shown here.</p>" : "") + "</section>";
    var limTxt = s.statorA > 0 ? "With the " + s.statorA + " A limit" : "No limit";
    var kneeDot = r.knee != null && r.knee < r.t.freeOut ? [{ x: r.knee, y: r.curve[0][1], label: "limit stops here" }] : [];
    // With a limit, scale to the limited curve (1.3 times its stall torque) so it is not a stripe at the bottom; the
    // no-limit line is cut at the top and its stall value goes in the title.
    var lim0 = r.curve[0][1], free0 = r.curve0[0][1], cutTop = s.statorA > 0 && free0 > lim0 * 1.3 + 1e-9 ? lim0 * 1.3 : null;
    var title = "Output torque against output speed" + (cutTop ? " (with no limit it would stall at " + K.n(free0, free0 >= 100 ? 0 : 1) + " lb in, off the top)" : "");
    var c1 = K.chart({ id: "ratio-tq", title: title, x: { label: "output speed (rpm)", name: "Speed", unit: "rpm", min: 0 }, y: { label: "torque (lb in)", unit: "lb in", min: 0, max: cutTop || undefined },
      series: [{ name: limTxt, pts: r.curve, color: 1 }].concat(s.statorA > 0 ? [{ name: "No limit", pts: cutTop ? clipTop(r.curve0, cutTop) : r.curve0, color: "mute", dash: true }] : []), dots: kneeDot });
    var c2 = "";
    if (r.dia) {
      var k = Math.PI * r.dia / 12 / 60, f = 1 / (r.dia / 2);
      var c0f = r.curve0.map(function (p) { return [p[0] * k, p[1] * f]; });
      c2 = K.chart({ id: "ratio-f", title: (s.out === "wheel" ? "Push at the edge" : "Pull on the line") + " against " + (s.out === "wheel" ? "surface" : "line") + " speed", x: { label: "speed (ft/s)", name: "Speed", unit: "ft/s", min: 0 }, y: { label: "force (lbf)", unit: "lbf", min: 0, max: cutTop ? cutTop * f : undefined },
        series: [{ name: limTxt, pts: r.curve.map(function (p) { return [p[0] * k, p[1] * f]; }), color: 1 }].concat(s.statorA > 0 ? [{ name: "No limit", pts: cutTop ? clipTop(c0f, cutTop * f) : c0f, color: "mute", dash: true }] : []), dots: kneeDot.map(function (d) { return { x: d.x * k, y: d.y * f, label: d.label }; }) });
    }
    out += c2 ? '<div class="chartrow">' + c1 + c2 + "</div>" : c1;
    out += K.notes("<p>Each stage multiplies the reduction. A stage's ratio is its driven teeth divided by its driving teeth; a planetary stage with a fixed ring, the sun driven and the carrier as the output gives 1 + ring teeth ÷ sun teeth.</p>" +
      '<p class="eq">reduction = (driven₁ ÷ driving₁) × (driven₂ ÷ driving₂) × …</p>' +
      '<p class="eq">output speed = motor free speed × (battery ÷ 12 V) ÷ reduction</p>' +
      '<p class="eq">output torque = motor torque × number of motors × reduction × efficiency of each stage</p>' +
      '<p class="eq">surface speed = rpm × π × diameter ÷ 60,  force = torque ÷ radius</p>' +
      "<p>Motor torque at the limit is the motor's torque per amp times the current above its free current, worked out from the motor figures as ReCalc lists them, from CTRE's and REV's test data. A stator limit caps the current, so it caps torque at low speed; the chart shows the flat part it makes. Free speed is with no load at all; a real mechanism runs slower.</p>" +
      "<p>Each pair of meshing gears turns the next shaft the other way. A belt, a chain and a planetary stage keep the direction. Gears are 20 DP: a gear's pitch diameter is its teeth ÷ 20 inches, and two gears sit half the sum of their pitch diameters apart.</p>" +
      "<p>The drawing is to scale and every part turns at its true speed relative to the motor, slowed down so the motor's pinion can be followed. A planetary stage is drawn with a 12-tooth sun; real ones differ inside but give the same ratio. Efficiencies are rules of thumb; bearings, belt tension and grease change them.</p>");
    return out;
  },

  draw: function (g, s, r, t) { drawTrain(g, s, r, t); }
});

/* ---------- Layout: shafts left to right, to scale (inches) ---------- */
// A planetary stage sits on the axis of the shaft before it. When that shaft already carries a gear, the planetary
// is drawn beside it (exploded along the axis) with a centre line joining the two, so neither hides the other.
function layout(stages) {
  var x = 0, shafts = [{ x: 0, members: [] }], L = { stages: [] };
  stages.forEach(function (st, i) {
    var info = { kind: st.kind }, prev = shafts[i];
    if (st.kind === "planet") {
      var z = M.planetTeeth(st.p), unit = M.RING / 2 / z.ring;
      info.z = z; info.rRing = M.RING / 2; info.rSun = z.sun * unit; info.rPlanet = z.planet * unit; info.rOut = M.RING / 2 + 0.22; info.C = 0;
      if (prev.members.length) { info.apart = Math.max.apply(null, prev.members); x += info.apart + info.rOut + 0.6; }
      else prev.members.push(info.rOut);
      shafts.push({ x: x, members: [info.rOut] });
    } else {
      var pa = M.pd(st.kind, st.a), pb = M.pd(st.kind, st.b), oa = M.od(st.kind, st.a), ob = M.od(st.kind, st.b), ce = M.centre(st), C = ce.C;
      if (ce.count != null) info.count = ce.count;
      info.pa = pa; info.pb = pb; info.oa = oa; info.ob = ob; info.C = C;
      prev.members.push(oa / 2); x += C; shafts.push({ x: x, members: [ob / 2] });
    }
    L.stages.push(info);
  });
  shafts.forEach(function (sh) { sh.r = Math.max.apply(null, sh.members.concat([0.2])); });
  L.shafts = shafts;
  return L;
}

/* ---------- The drawing ---------- */
function ringGear(g, x, y, rp, n, ang, rOut, o) {
  var ctx = g.ctx, p = 2 * Math.PI / n, add = Math.min(rp * 0.35, 2 * rp / n), ri = rp - add, rr = rp + add * 1.2;
  ctx.beginPath(); ctx.arc(x, y, rOut, 0, 2 * Math.PI); ctx.closePath();
  for (var i = 0; i < n; i++) {
    var a = ang + i * p, pts = [[rr, a - 0.5 * p], [rr, a - 0.27 * p], [ri, a - 0.12 * p], [ri, a + 0.12 * p], [rr, a + 0.27 * p]];
    pts.forEach(function (q, k) { var px = x + q[0] * Math.cos(q[1]), py = y + q[0] * Math.sin(q[1]); if (i === 0 && k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
  }
  ctx.closePath(); ctx.fillStyle = o.fill; ctx.fill("evenodd"); ctx.lineWidth = 1; ctx.setLineDash([]); ctx.strokeStyle = o.stroke || g.c.partLine; ctx.stroke();
}
// A small circular arrow: which way a shaft turns (dir > 0 = clockwise on screen, as the motor).
function turnIcon(g, x, y, dir, color) {
  var r = 6, a0 = -Math.PI * 0.9, a1 = Math.PI * 0.5, ctx = g.ctx;
  g.arc(x, y, r, a0, a1, { color: color, width: 1.6, ccw: false });
  var end = dir > 0 ? a1 : a0, tx = -Math.sin(end) * dir, ty = Math.cos(end) * dir, hx = x + r * Math.cos(end), hy = y + r * Math.sin(end);
  ctx.beginPath(); ctx.moveTo(hx + tx * 4.5, hy + ty * 4.5); ctx.lineTo(hx - ty * 3.2 - tx * 0.5, hy + tx * 3.2 - ty * 0.5); ctx.lineTo(hx + ty * 3.2 - tx * 0.5, hy - tx * 3.2 - ty * 0.5); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
function loopPath(x1, x2, y, p1, p2) {
  var al = Math.asin(F.clamp((p1 - p2) / (x2 - x1), -1, 1)), sn = Math.sin(al), cs = Math.cos(al), Tn = (x2 - x1) * cs;
  var arc2 = p2 * (Math.PI - 2 * al), arc1 = p1 * (Math.PI + 2 * al), L = 2 * Tn + arc1 + arc2;
  return { L: L, pos: function (d) {
    d = ((d % L) + L) % L;
    if (d < Tn) return [x1 + p1 * sn + cs * d, y - p1 * cs + sn * d, -sn, cs];
    d -= Tn; var a;
    if (d < arc2) { a = -(Math.PI / 2 - al) + d / p2; return [x2 + p2 * Math.cos(a), y + p2 * Math.sin(a), -Math.cos(a), -Math.sin(a)]; }
    d -= arc2;
    if (d < Tn) return [x2 + p2 * sn - cs * d, y + p2 * cs + sn * d, -sn, -cs];
    d -= Tn; a = Math.PI / 2 - al + d / p1; return [x1 + p1 * Math.cos(a), y + p1 * Math.sin(a), -Math.cos(a), -Math.sin(a)];
  } };
}

function drawTrain(g, s, r, t) {
  var c = g.c;
  if (!r.stages || !r.stages.length) { g.text(s.mode === "find" ? "No train found to draw." : "Add a stage to see the train.", 16, 28, { color: c.mute }); return; }
  var plane = r.stages.length > 1 ? "Stage " + r.stages.length + " is in front, in its own plane." : "";
  var Lo = r.layout, sh = Lo.shafts, tr = r.t, n = sh.length, last = sh[n - 1], i;
  var outR = s.out !== "none" && r.dia ? r.dia / 2 : 0, outFront = outR && outR < last.r;    // a small roller or spool sits in front of the last gear
  var x0 = Infinity, x1 = -Infinity, big = 0;
  sh.forEach(function (q) { x0 = Math.min(x0, q.x - q.r); x1 = Math.max(x1, q.x + q.r); big = Math.max(big, q.r); });
  if (outR) { x0 = Math.min(x0, last.x - outR); x1 = Math.max(x1, last.x + outR); big = Math.max(big, outR); }
  var m = 0.15, phone = g.w < 560, top = 64 + (s.out === "wheel" && outR ? 34 : 0);
  var box = { x0: x0 - m, x1: x1 + m, y0: -big - m, y1: big + m };

  // Shaft labels. Laptop: each name and speed under its shaft, in rows; a label drops a row when it would touch the one
  // before it. Phone: a numbered tag under each shaft and a key of names and speeds below, so nothing collides.
  // The plane note takes its own line at the bottom, so no label can sit on it.
  var names = sh.map(function (q, k) { return (k === 0 ? "Motor" : k === n - 1 ? "Output" : "Shaft " + (k + 1)) + " " + rpmTxt(tr.shafts[k].rpm) + (k === 0 ? " (" + K.n(s.volts, s.volts % 1 ? 1 : 0) + " V, no load)" : ""); });
  var noteH = 16, voltsTxt = K.n(s.volts, s.volts % 1 ? 1 : 0) + " V, no load", voltsInNote = false;
  function place(V) {
    var ends = [], out = [];
    sh.forEach(function (q, k) {
      var w = phone ? 18 : g.textWidth(names[k], { size: 12, weight: 600 }) + 18, x = V.X(q.x), left = F.clamp(x - w / 2, 4, g.w - w - 4), row = 0;
      // Slide the label sideways off any other shaft's centre line, keeping it under its own shaft.
      function slide() {
        sh.forEach(function (o, j) {
          var xo = V.X(o.x); if (j === k || xo < left - 8 || xo > left + w + 8) return;
          var l2 = xo > x ? xo - 10 - w : xo + 10; if (x >= l2 + 4 && x <= l2 + w - 4) left = F.clamp(l2, 4, g.w - w - 4);
        });
        return sh.some(function (o, j) { var xo = V.X(o.x); return j !== k && xo >= left - 8 && xo <= left + w + 8; });
      }
      // The motor's label carries the voltage; if that makes it too long to fit between the shafts, the voltage moves
      // to the note line at the bottom.
      if (slide() && k === 0 && !phone && !voltsInNote) { voltsInNote = true; names[0] = "Motor " + rpmTxt(tr.shafts[0].rpm); w = g.textWidth(names[0], { size: 12, weight: 600 }) + 18; left = F.clamp(x - w / 2, 4, g.w - w - 4); slide(); }
      while (row < ends.length && left < ends[row] + (phone ? 4 : 12)) row++;
      ends[row] = left + w; out.push({ x: x, left: left, w: w, row: row, k: k });
    });
    out.rows = ends.length; return out;
  }
  var keyH = phone ? n * 16 + 6 : 0;
  var fit = function (rows) { return g.view(box, { l: 12, r: 12, t: top, b: rows * (phone ? 20 : 15) + 16 + noteH + keyH }, "middle"); };
  var V = fit(phone ? 1 : 2), lab = place(V);
  if (lab.rows > (phone ? 1 : 2)) { V = fit(lab.rows); lab = place(V); }
  var rows = Math.max(phone ? 1 : 2, lab.rows), rowY = function (k) { return g.h - 10 - noteH - keyH - (rows - 1 - k) * (phone ? 20 : 15); };
  g.grid(V, 1, phone ? "" : "1 in squares");
  var Y = V.Y(0), X = function (q) { return V.X(q.x); }, lx = X(last);

  // Angles. Positive = clockwise on screen; the motor turns clockwise, slowed down so its pinion can be followed.
  var spd = K.speed ? K.speed(ID) : 1, th = [2 * Math.PI * SHOW_RPS * t];
  for (i = 0; i < r.stages.length; i++) {
    var st0 = r.stages[i];
    th.push(st0.kind === "gear" ? Math.PI - Math.PI / st0.b - th[i] * st0.a / st0.b : st0.kind === "planet" ? th[i] / st0.p : th[i] * st0.a / st0.b);
  }
  var outA = th[n - 1];

  // Centre lines joining a planetary drawn beside the shaft it sits on.
  r.stages.forEach(function (st, i) { if (Lo.stages[i].apart) g.line(X(sh[i]), Y, X(sh[i + 1]), Y, { color: c.accent, width: 1, dash: [8, 3, 2, 3] }); });

  function drawOut() {
    var ro = V.L(outR);
    if (s.out === "wheel") { g.wheel(lx, Y, ro, outA, { tire: c.text2, fill: c.part2, spokes: 5, hub: 0.14 }); return; }
    // A flanged drum with rope wound on it; the holes show it turning.
    g.circle(lx, Y, ro + 4, { fill: c.part, stroke: c.partLine, width: 1 });
    g.circle(lx, Y, ro, { stroke: c.text2, width: 3 });
    g.circle(lx, Y, ro - 2, { fill: c.part2, stroke: c.partLine, width: 1 });
    if (ro > 12) for (var k = 0; k < 4; k++) { var a = outA + k * Math.PI / 2; g.circle(lx + Math.cos(a) * ro * 0.6, Y + Math.sin(a) * ro * 0.6, ro * 0.14, { fill: c.sheet, stroke: c.partLine, width: 1 }); }
    hexBore(g, lx, Y, ro * 1.4, outA);
  }
  if (outR && !outFront) drawOut();

  // The stages, from the motor out; each later stage sits on top, in alternating part colours.
  r.stages.forEach(function (st, i) {
    var info = Lo.stages[i], xa = X(sh[i]), xb = X(sh[i + 1]), fill = i % 2 ? c.part2 : c.part, a = th[i];
    if (st.kind === "gear") {
      // A later stage sits in front of the one before it: a flat shadow under its gears shows the layering, so
      // overlapping gears do not read as teeth running through each other.
      if (i > 0) { g.ctx.globalAlpha = 0.2; [[xa, info.pa], [xb, info.pb]].forEach(function (q) { g.circle(q[0] + 3, Y + 4, V.L(q[1] / 2) * 1.06 + 2, { fill: c.text, stroke: null }); }); g.ctx.globalAlpha = 1; }
      g.gear(xa, Y, V.L(info.pa / 2), st.a, a, { fill: fill });
      g.gear(xb, Y, V.L(info.pb / 2), st.b, th[i + 1], { fill: fill });
    } else if (st.kind === "planet") {
      var z = info.z, rr = V.L(info.rRing), rsu = V.L(info.rSun), rp = V.L(info.rPlanet), ro = V.L(info.rOut), carrier = th[i + 1] - Math.PI / 2, k;
      ringGear(g, xb, Y, rr, z.ring, 0, ro, { fill: fill });
      var pang = [];
      for (k = 0; k < 3; k++) { var be = carrier + k * 2 * Math.PI / 3; pang.push([be, be - (2 * Math.PI / z.planet) * (be * z.ring / (2 * Math.PI) - 0.5)]); }
      // The sun's angle follows from the first planet's mesh, so the teeth stay in step.
      var b0 = pang[0][0], as = b0 - (pang[0][1] - b0 - Math.PI + Math.PI / z.planet) * z.planet / z.sun;
      g.gear(xb, Y, rsu, z.sun, as, { fill: i % 2 ? c.part : c.part2 });
      pang.forEach(function (q) { g.gear(xb + (rsu + rp) * Math.cos(q[0]), Y + (rsu + rp) * Math.sin(q[0]), rp, z.planet, q[1], { fill: fill, bore: Math.max(2, rp * 0.2) }); });
      // The carrier is the output: arms out to the planet pins.
      var arm = Math.max(2.5, Math.min(7, rp * 0.35));
      pang.forEach(function (q) { var px = xb + (rsu + rp) * Math.cos(q[0]), py = Y + (rsu + rp) * Math.sin(q[0]); g.line(xb, Y, px, py, { color: c.partLine, width: arm }); g.circle(px, py, arm * 0.6, { fill: c.sheet, stroke: c.partLine, width: 1 }); });
      g.circle(xb, Y, arm * 1.4, { fill: c.partLine, stroke: null });
    } else {
      var p1 = V.L(info.pa / 2), p2 = V.L(info.pb / 2), lp = loopPath(xa, xb, Y, p1, p2), cnt = Math.max(4, info.count), pitch = lp.L / cnt, trv = a * p1, q, j;
      if (st.kind === "belt") {
        [[xa, info.oa, a, p1], [xb, info.ob, th[i + 1], p2]].forEach(function (w) {
          g.circle(w[0], Y, V.L(w[1] / 2), { fill: fill, stroke: c.partLine, width: 1 });
          if (w[3] > 14) for (var h = 0; h < 3; h++) { var ha = w[2] + h * 2 * Math.PI / 3; g.circle(w[0] + w[3] * 0.55 * Math.cos(ha), Y + w[3] * 0.55 * Math.sin(ha), w[3] * 0.18, { fill: c.sheet, stroke: c.partLine, width: 1 }); }
          hexBore(g, w[0], Y, w[3], w[2]);
        });
        var body = []; for (j = 0; j <= 200; j++) { q = lp.pos(lp.L * j / 200); body.push([q[0] - q[2] * 1.5, q[1] - q[3] * 1.5]); }
        g.poly(body, { stroke: c.text, width: Math.max(2.5, V.L(0.07)), close: true });
        for (j = 0; j < cnt; j++) { q = lp.pos(trv + j * pitch); g.line(q[0], q[1], q[0] + q[2] * Math.max(2, pitch * 0.3), q[1] + q[3] * Math.max(2, pitch * 0.3), { color: c.text, width: Math.max(1.2, pitch * 0.4), cap: "butt" }); }
      } else {
        g.gear(xa, Y, p1, st.a, a + Math.PI / st.a, { fill: fill }); g.gear(xb, Y, p2, st.b, th[i + 1] + Math.PI / st.b, { fill: fill });
        var prev = lp.pos(trv - pitch), rr2 = Math.max(1.3, V.L(0.13 / 2));
        for (j = 0; j < cnt; j++) { q = lp.pos(trv + j * pitch); g.line(prev[0], prev[1], q[0], q[1], { color: j % 2 ? c.text : c.text2, width: Math.max(2, rr2 * 1.7) }); prev = q; }
        for (j = 0; j < cnt; j++) { q = lp.pos(trv + j * pitch); g.circle(q[0], q[1], rr2 * 0.55, { fill: c.sheet, stroke: null }); }
      }
    }
  });
  if (outR && outFront) drawOut();

  // What the output does: the edge speed of a wheel, or the rope on a spool and its pull.
  if (s.out === "wheel" && outR) {
    var rw = V.L(outR), ad = tr.dirOut > 0 ? 1 : -1, ay = Y - Math.max(rw, V.L(last.r)) - 9, len = Math.min(60, Math.max(28, rw * 0.8)), lbl = ftTxt(r.surf) + " ft/s at the edge, no load";
    var right = ad > 0 ? lx + len / 2 + 6 + g.textWidth(lbl, { weight: 600 }) < g.w - 4 : lx - len / 2 - 6 - g.textWidth(lbl, { weight: 600 }) < 4;
    g.arrow(lx - ad * len / 2, ay, lx + ad * len / 2, ay, { color: c.force, width: 2.5 });
    if (right) g.text(lbl, lx + ad * (len / 2 + 6), ay, { color: c.force, weight: 600, align: ad > 0 ? "left" : "right", base: "middle" });
    else g.text(lbl, lx, ay - 14, { color: c.force, weight: 600, align: "center", base: "middle" });
  } else if (s.out === "spool" && outR) {
    var rs = V.L(outR), side = tr.dirOut > 0 ? -1 : 1, rx = lx + side * rs, yEnd = rowY(0) - 16, sp = 12;   // the rope hangs from the side that moves up
    g.line(rx, Y, rx, yEnd, { color: c.text2, width: 3, cap: "butt" });
    for (var d = (((side * outA * rs) % sp) + sp) % sp; Y + d < yEnd - 2; d += sp) g.line(rx - 1.5, Y + d, rx + 1.5, Y + d + 4, { color: c.sheet, width: 1 });
    var ay2 = Math.max(Y + rs + 30, yEnd - 4), tx = rx + side * 12;
    g.arrow(tx, ay2, tx, ay2 - 26, { color: c.force, width: 2.5 });
    g.text(K.n(r.force, 0) + " lbf pull", tx + side * 6, ay2 - 22, { color: c.force, weight: 700, align: side < 0 ? "right" : "left", base: "middle" });
    g.text(ftTxt(r.surf) + " ft/s, no load", tx + side * 6, ay2 - 7, { color: c.text2, weight: 600, align: side < 0 ? "right" : "left", base: "middle", size: 11 });
  }

  // Shaft centres, and under each: which way it turns and how fast with no load. A centre line stops short of any label
  // in its way, so no line runs through a name.
  var boxes = lab.map(function (l) { var y = rowY(l.row); return { l: l.left - 8, r: l.left + l.w + 8, t: y - (phone ? 16 : 14), b: y + 5, k: l.k }; });
  lab.forEach(function (l) {
    var y = rowY(l.row), end = boxes[l.k].t - 2;
    boxes.forEach(function (bx) { if (bx.k !== l.k && l.x >= bx.l && l.x <= bx.r && bx.t > Y && bx.t - 3 < end) end = bx.t - 3; });
    g.line(l.x - 4, Y, l.x + 4, Y, { color: c.accent, width: 1.2 }); g.line(l.x, Y - 4, l.x, Y + 4, { color: c.accent, width: 1.2 });
    if (end > Y + 8) g.line(l.x, Y + 6, l.x, end, { color: c.mute, width: 1, dash: [6, 3, 1, 3] });
    if (phone) { tag(g, l.left + 9, y - 6, l.k + 1); return; }
    turnIcon(g, l.left + 7, y - 4, tr.shafts[l.k].dir, c.accent);
    g.text(names[l.k], l.left + 17, y, { size: 12, weight: 600, color: c.text });
  });
  if (phone) sh.forEach(function (q, k) {
    var y = g.h - 10 - noteH - (n - 1 - k) * 16;
    tag(g, 21, y - 4, k + 1); turnIcon(g, 40, y - 4, tr.shafts[k].dir, c.accent);
    g.text(names[k], 52, y, { size: 12, weight: 600, color: c.text });
  });
  var note = (voltsInNote ? "Speeds at " + voltsTxt + ". " : "") + plane;
  if (note) g.text(note, 12, g.h - 8, { color: c.mute, size: 11 });
  r.stages.forEach(function (st, i) {
    var info = Lo.stages[i]; if (!info.apart) return;
    var e0 = X(sh[i]) + V.L(info.apart), e1 = X(sh[i + 1]) - V.L(info.rOut);
    if (e1 - e0 > g.textWidth("same axis", { size: 10 }) + 6) g.text("same axis", (e0 + e1) / 2, Y - 6, { size: 10, color: c.mute, align: "center" });
  });

  // Each stage's name above the train, on a bracket that spans its two shafts, with a short drop to the top of each
  // shaft's parts, so the name is tied to its pair. Neighbouring stages alternate rows so their brackets never meet.
  var ends = [-Infinity, -Infinity];
  r.stages.forEach(function (st, i) {
    var xa = X(sh[i]), xb = X(sh[i + 1]), txt = st.kind === "planet" ? "Planetary " + st.p + " : 1" : st.a + " : " + st.b + (st.kind === "gear" ? "" : " " + st.kind), w = g.textWidth(txt, { size: 11, weight: 600 });
    var planet = st.kind === "planet", a0 = planet ? xb : Math.min(xa, xb) + 4, a1 = planet ? xb : Math.max(xa, xb) - 4, mid = (a0 + a1) / 2;
    var left = F.clamp(mid - w / 2, 4, g.w - w - 4), row = i % 2;
    if (left < ends[row] + 10) return;     // no room: the table below names every stage
    ends[row] = left + w;
    var ty = 40 + row * 14, by = ty + 4;
    g.text(txt, left + w / 2, ty, { size: 11, weight: 600, color: c.text2, align: "center" });
    if (!planet) g.line(a0, by, a1, by, { color: c.mute, width: 1 });
    [[a0, i], [a1, i + 1]].forEach(function (q, j) {
      if (planet && j === 0) return;
      var yTop = Y - V.L(sh[q[1]].r) - 3; if (yTop > by + 2) g.line(q[0], by, q[0], yTop, { color: c.mute, width: 1 });
    });
  });
  var head = ratioTxt(tr.total) + " in " + r.stages.length + (r.stages.length === 1 ? " stage" : " stages"), hw = g.textWidth(head, { weight: 700 });
  g.text(head, 12, 18, { weight: 700 });
  g.text(", slowed " + K.n(tr.shafts[0].rpm / 60 / (SHOW_RPS * spd), 0) + " times so you can watch it turn", 12 + hw, 18, { color: c.mute, size: 12 });
}
// A shaft's number in a small ring, for the phone's key.
function tag(g, x, y, k) { g.circle(x, y, 7.5, { fill: g.c.sheet, stroke: g.c.accent, width: 1.25 }); g.text(String(k), x, y + 0.5, { size: 10, weight: 700, align: "center", base: "middle", color: g.c.accent, halo: false }); }
function hexBore(g, x, y, rp, ang) {
  var b = Math.max(3, Math.min(rp * 0.3, 9)), hex = [];
  for (var k = 0; k < 6; k++) hex.push([x + b * Math.cos(ang + k * Math.PI / 3), y + b * Math.sin(ang + k * Math.PI / 3)]);
  g.poly(hex, { fill: g.c.sheet, stroke: g.c.partLine, width: 1 });
}

/* ---------- Stage rows ---------- */
function S() { return K.state(ID); }
D.inputs.ratioteeth = function (el) {
  var v = parseFloat(el.value), i = +el.dataset.i, st = S().stages[i];
  var bad = !st || !isFinite(v) || v !== Math.round(v) || v < 6 || v > 200; el.classList.toggle("bad", bad);
  if (bad) return;
  st[el.dataset.k] = v; K.refresh(ID);
};
D.changes.ratiokind = function (el) { var st = S().stages[+el.dataset.i]; if (st) st.kind = el.value; D.render(); };
D.changes.ratioplanet = function (el) { var st = S().stages[+el.dataset.i]; if (st) st.p = +el.value; K.refresh(ID); };
D.acts.ratioadd = function () {
  var s = S(); if (s.stages.length >= 4) return;
  var last = s.stages[s.stages.length - 1] || { kind: "gear" };
  s.stages.push({ kind: last.kind === "planet" ? "gear" : last.kind, a: last.kind === "gear" || last.kind === "planet" ? 18 : last.a, b: last.kind === "gear" || last.kind === "planet" ? 54 : last.b, p: 4 });
  D.render();
};
D.acts.ratiodel = function (b) { var s = S(); if (s.stages.length > 1) s.stages.splice(+b.dataset.v, 1); D.render(); };
D.acts.ratiouse = function (b) {
  var s = S(), r = K.result(ID), c = r && r.found && r.found[+b.dataset.v]; if (!c) return;
  s.stages = c.stages.map(function (x) { return Object.assign({}, x); }); s.mode = "build";
  D.toast("Loaded " + M.trainLabel(c.stages) + " into Build one."); D.render();
};
})(typeof window !== "undefined" ? window : this);
