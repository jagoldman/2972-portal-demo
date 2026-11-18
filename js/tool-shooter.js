/* Tools: Shooter (#tool-shooter). One model, four ways to look at it:
     One shot        the wheel, the ball leaving it, the flight through air, the target, and how much the wheel
                     speed may be off before the shot misses
     Rapid fire      the wheel sagging through a burst, and which shots still go in
     Every distance  the wheel speed (and hood angle) each distance needs, as a table robot code can use
     While driving   where to aim when the robot is moving
   The maths is in js/frc.js (F.shot, F.fly, F.meet, F.aim, F.burst, F.moving); M below ties it to this page's
   inputs and runs in Node for tests/tool-shooter.test.js. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");
var IN = F.IN, FT = F.FT, RPM = F.RPM;

/* ---------- The model ---------- */
var M = {};
M.PIECES = {
  fuel26: { name: "2026 Fuel, 5.91 in foam", bd: 5.91, bw: 0.474, bshape: "solid" },
  cargo22: { name: "2022 Cargo, 9.5 in inflated", bd: 9.5, bw: 0.595, bshape: "shell" },
  cell20: { name: "2020 Power Cell, 7 in foam", bd: 7, bw: 0.31, bshape: "solid" },
  custom: { name: "Another ball" }
};
M.TARGETS = {
  hub26: { name: "2026 Hub, opening on top", tkind: "top", th: 72, tw: 41.7 },
  port20: { name: "2020 outer port, in a wall", tkind: "front", th: 98.25, tw: 30 },
  custom: { name: "Another target" }
};
M.setup = function (s) {
  var mb = s.bw * F.LB, rb = s.bd * IN / 2, Ib = F.ballMoi(s.bshape, mb, rb), rw = s.wd * IN / 2, dual = s.type === "dual";
  var rw2 = dual ? s.wd2 * IN / 2 : rw, G = dual ? s.g2 : 0;
  var I1 = 0.5 * s.ww * F.LB * rw * rw + 0.5 * s.fw * F.LB * Math.pow(s.fd * IN / 2, 2);
  var Iw = dual ? I1 + G * G * 0.5 * s.ww * F.LB * rw2 * rw2 : I1;       // the second shaft carries the same wheels
  var sp = { type: dual ? "dual" : "hood", Iw: Iw, rw: rw, rw2: rw2, G: G, mb: mb, rb: rb, Ib: Ib, keep: s.keep / 100, vIn: s.vin * FT };
  var one = F.shot(Object.assign({}, sp, { w: 1, vIn: 0 })), zero = F.shot(Object.assign({}, sp, { w: 0 }));
  return { mb: mb, rb: rb, Ib: Ib, rw: rw, rw2: rw2, G: G, dual: dual, Iw: Iw, sp: sp,
    a: one.v, b: zero.v, spinPer: one.v ? one.spin / one.v : 0,          // exit speed = a w + b; spin = spinPer v
    fb: { deg: s.deg, h0: s.h0 * IN, m: mb, r: rb, cd: s.cd, rho: F.air(s.alt), lift: !!s.lift, dt: 0.003, floor: rb },
    target: { kind: s.tkind, d: s.dist * FT, h: s.th * IN, w: s.tw * IN, r: rb },
    drive: F.drive({ motor: s.motor, n: s.motors, ratio: s.ratio, eff: s.eff / 100, statorA: s.statorA }) };
};
// The fastest exit speed worth searching: a quarter more than the motor can reach on a rested battery.
M.vmax = function (U) { return F.clamp((U.a * U.drive.freeSpeed(M.VBAT) + U.b) * 1.25, 8, 45); };
M.VBAT = 12.3;
M.rpmFor = function (U, v) { return (v - U.b) / U.a / RPM; };
M.flight = function (U, v, extra) { return F.fly(Object.assign({}, U.fb, { v: v, spin: U.spinPer * v }, extra || {})); };
// The part of a flight worth drawing: up to where it goes into the target, hits it, or lands.
M.cut = function (pts, tg, meet) {
  var out = [], outer = tg.w * 0.565;
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    if (meet && (meet.hit || meet.wall) && p[0] > meet.t) { out.push([meet.t, meet.x, meet.y, p[3], p[4]]); break; }
    if (tg.kind === "front") { if (p[1] > tg.d && !(meet && meet.hit)) { out.push([p[0], tg.d, p[2], 0, 0]); break; } }
    else if (p[1] > tg.d - outer && p[1] < tg.d + outer && p[2] < tg.h && !(meet && meet.hit && Math.abs(p[1] - tg.d) < tg.w / 2)) { out.push(p); break; }
    out.push(p);
  }
  return out;
};
function cols(pts) { return { t: pts.map(function (p) { return p[0]; }), x: pts.map(function (p) { return p[1]; }), y: pts.map(function (p) { return p[2]; }) }; }
M.one = function (s) {
  var U = M.setup(s), w = s.rpm * RPM, shot = F.shot(Object.assign({}, U.sp, { w: w })), tg = U.target;
  var fl = M.flight(U, shot.v), meet = F.meet(fl.pts, tg), path = M.cut(fl.pts, tg, meet);
  var aim = F.aim(Object.assign({}, U.fb, { spinPer: U.spinPer }), tg, M.vmax(U), 22);
  var r = { U: U, shot: shot, fl: fl, meet: meet, path: path, pc: cols(path), aim: aim, target: tg, w: w };
  r.vac = M.cut(M.flight(U, shot.v, { cd: 0, lift: false }).pts, tg, null);
  if (aim) {
    r.rpmMid = M.rpmFor(U, aim.v); r.rpmLo = M.rpmFor(U, aim.lo); r.rpmHi = M.rpmFor(U, aim.hi);
    var lo = M.flight(U, aim.lo), hi = M.flight(U, aim.hi);
    r.fanLo = M.cut(lo.pts, tg, F.meet(lo.pts, tg)); r.fanHi = M.cut(hi.pts, tg, F.meet(hi.pts, tg));
  }
  r.free = U.drive.freeSpeed(M.VBAT) / RPM;
  r.spinup = F.spin({ drive: U.drive, J: U.Iw, w0: 0, target: w, tmax: 8 });
  r.recov = F.spin({ drive: U.drive, J: U.Iw, w0: shot.wAfter, target: w, tmax: 8 });
  // Time in contact: the ball speeds up steadily over about a quarter turn round the wheel.
  var arc = U.dual ? 2.4 * U.rb : (U.rw + U.rb) * 1.3;
  r.tc = shot.v > 0.1 ? arc / (shot.v / 2) : 0.2;
  r.duration = r.tc + path[path.length - 1][0] + 0.5;
  return r;
};
M.burst = function (s, r) {
  var U = r.U, b = F.burst({ drive: U.drive, target: r.w, n: Math.round(s.bn), rate: s.brate, shot: U.sp }), hits = 0;
  b.shots.forEach(function (sh) {
    var fl = M.flight(U, sh.v, { dt: 0.004 }); sh.meet = F.meet(fl.pts, r.target); sh.path = M.cut(fl.pts, r.target, sh.meet); sh.pc = cols(sh.path);
    sh.hit = !!(sh.meet && sh.meet.hit); if (sh.hit) hits++;
  });
  b.hits = hits; b.duration = b.shots[b.shots.length - 1].t + r.tc + 1.6;
  // The fastest rate at which every shot still goes in (only worth asking when the first one does).
  if (b.shots[0].hit && r.aim) {
    var vmin = r.aim.lo, allIn = function (rate) { var q = F.burst({ drive: U.drive, target: r.w, n: Math.round(s.bn), rate: rate, shot: U.sp }); return q.shots.every(function (x) { return x.v >= vmin; }); };
    if (allIn(20)) b.best = 20; else if (!allIn(0.5)) b.best = 0; else { var lo = 0.5, hi = 20; for (var i = 0; i < 12; i++) { var mid = (lo + hi) / 2; if (allIn(mid)) lo = mid; else hi = mid; } b.best = lo; }
  }
  return b;
};
/* Every distance: for each one, the angle (fixed, or the most forgiving in the hood's range) and the wheel speed. */
M.map = function (s, r) {
  var adj = s.hood === "adj", U = r.U, vmx = M.vmax(U), rows = [], near = Math.min(s.dnear, s.dfar - 1), n = adj ? 10 : 16, fb = Object.assign({}, U.fb, { spinPer: U.spinPer, dt: adj ? 0.008 : 0.005 });
  for (var i = 0; i <= n; i++) {
    var d = near + (s.dfar - near) * i / n, tg = Object.assign({}, r.target, { d: d * FT }), deg = s.deg, a = null;
    if (s.hood === "adj") {
      // Only angles that keep the wheel under 85% of its top speed count; among those, the one that forgives the
      // most speed error. For an opening that faces up that is the steepest such angle, so try from the top down.
      var best = null, dlo = Math.min(s.degLo, s.degHi), dhi = Math.max(s.degLo, s.degHi), reach = r.free * 0.85, dg, q;
      if (tg.kind !== "front") { for (dg = dhi; dg >= dlo - 1e-9 && !best; dg -= 2) { q = F.aim(Object.assign({}, fb, { deg: dg }), tg, vmx, 10); if (q && q.meet && M.rpmFor(U, q.v) <= reach) best = { deg: dg, a: q }; } }
      else for (var k = 0; k <= 5; k++) { dg = dlo + (dhi - dlo) * k / 5; q = F.aim(Object.assign({}, fb, { deg: dg }), tg, vmx, 10); if (q && q.meet && M.rpmFor(U, q.v) <= reach && (!best || q.window / q.v > best.a.window / best.a.v)) best = { deg: dg, a: q }; }
      if (best) { deg = best.deg; a = best.a; }
    } else a = F.aim(fb, tg, vmx, 14);
    if (!a || !a.meet) { rows.push({ d: d, ok: false }); continue; }
    var rpm = M.rpmFor(U, a.v);
    rows.push({ d: d, ok: rpm <= r.free * 0.97, deg: deg, v: a.v, rpm: rpm, lo: M.rpmFor(U, a.lo), hi: M.rpmFor(U, a.hi), time: a.meet.t, entry: a.meet.entryDeg, tooFast: rpm > r.free * 0.97 });
  }
  var good = rows.filter(function (x) { return x.ok; });
  return { rows: rows, good: good, sweet: good.slice().sort(function (x, y) { return (y.hi - y.lo) / y.rpm - (x.hi - x.lo) / x.rpm; })[0] || null };
};
M.move = function (s, r, map) {
  var g = map.good; if (g.length < 2) return null;
  var ds = g.map(function (x) { return x.d * FT; }), vs = g.map(function (x) { return x.v; }), ts = g.map(function (x) { return x.time; }), dg = g.map(function (x) { return x.deg; });
  function sf(d) { if (d < ds[0] - 1e-6 || d > ds[ds.length - 1] + 1e-6) return null; return { v: F.interp(ds, vs, d), time: F.interp(ds, ts, d) }; }
  var d = r.target.d, still = sf(d); if (!still) return null;
  var m = F.moving(d, s.vtoward * FT, s.vacross * FT, sf); if (!m) return { still: still, out: true };
  // The corrected shot seen from the side, in the launcher's own frame: the distance it is shot for, and its arc.
  var degL = F.interp(ds, dg, m.d), tgL = Object.assign({}, r.target, { d: m.d }), flL = F.fly(Object.assign({}, r.U.fb, { deg: degL, v: m.v, spin: r.U.spinPer * m.v })), meetL = F.meet(flL.pts, tgL);
  return { still: still, lead: m, rpm: M.rpmFor(r.U, m.v), rpmStill: M.rpmFor(r.U, still.v), deg: degL, side: { pts: M.cut(flL.pts, tgL, meetL), meet: meetL, target: tgL, apex: flL.apex },
    missNoLead: Math.hypot(s.vtoward * FT, s.vacross * FT) * still.time };
};
// The "speed kept" that makes this page's shot land on open floor where a real one did (feet from the shooter).
M.keepFor = function (s, landedFt) {
  function range(keep) { var q = Object.assign({}, s, { keep: keep }), U = M.setup(q), v = F.shot(Object.assign({}, U.sp, { w: s.rpm * RPM })).v; return M.flight(U, v).range / FT - landedFt; }
  var k = F.bisect(range, 20, 100, 30);
  return k == null ? null : Math.round(k * 10) / 10;
};
if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The page ---------- */
var K = D.calc, esc = D.esc, ID = "tool-shooter", mapCache = { key: "", val: null }, hold = null;
function ftin(m) { return K.fix(m / FT, 1) + " ft"; }
function inch(m) { return K.n(Math.abs(m) / IN, 0) + " in"; }
function rpmTxt(x) { return K.n(Math.round(x / 10) * 10, 0); }

K.tool({
  id: ID,
  defaults: { view: "shot", piece: "fuel26", bd: 5.91, bw: 0.474, bshape: "solid", cd: 0.47,
    type: "hood", wd: 4, rpm: 3300, deg: 62, h0: 22, wd2: 4, g2: 0.6, ww: 1, fw: 2, fd: 4, keep: 90, vin: 0,
    motor: "kraken60", motors: 2, ratio: 1, eff: 95, statorA: 60,
    tpreset: "hub26", tkind: "top", th: 72, tw: 41.7, dist: 10, alt: 5200, lift: true,
    brate: 5, bn: 8, hood: "fixed", degLo: 48, degHi: 76, dnear: 6, dfar: 22, vtoward: 0, vacross: 6, meas: 0 },
  stage: { ratio: 2, narrow: 0.98, label: "The robot, the ball's flight and the target from the side, to scale, with a close-up of the shooter wheel." },
  tabs: [["shot", "One shot"], ["burst", "Rapid fire"], ["map", "Every distance"], ["move", "While driving"]],
  speed: 0.25, autoplay: true,
  playLabel: function (s) { return s.view === "map" ? "Drive back" : s.view === "burst" ? "Fire the burst" : "Fire"; },

  onPick: function (key, v, s) {
    if (key === "piece" && M.PIECES[v].bd) { s.bd = M.PIECES[v].bd; s.bw = M.PIECES[v].bw; s.bshape = M.PIECES[v].bshape; }
    if (key === "tpreset" && M.TARGETS[v].tkind) { s.tkind = M.TARGETS[v].tkind; s.th = M.TARGETS[v].th; s.tw = M.TARGETS[v].tw; }
    if (key === "view") K.rewind(ID);
  },

  compute: function (s) {
    var r = M.one(s);
    if (s.view === "burst") r.burst = M.burst(s, r);
    if (s.view === "map" || s.view === "move") {
      var key = JSON.stringify([s.bd, s.bw, s.bshape, s.cd, s.type, s.wd, s.wd2, s.g2, s.ww, s.fw, s.fd, s.keep, s.vin, s.deg, s.h0, s.tkind, s.th, s.tw, s.alt, s.lift, s.hood, s.degLo, s.degHi, s.dnear, s.dfar, s.motor, s.ratio]);
      var now = Date.now();
      if (mapCache.key !== key) {
        if (mapCache.val && now - mapCache.at < 220) { clearTimeout(mapCache.timer); mapCache.timer = setTimeout(function () { mapCache.at = 0; K.refresh(ID); }, 240); r.settling = true; }
        else { mapCache.key = key; mapCache.val = M.map(s, r); }
        mapCache.at = now;
      }
      r.map = mapCache.val;
      if (s.view === "move") r.move = M.move(s, r, r.map);
    }
    r.view = s.view;
    return r;
  },

  duration: function (s, r) { return s.view === "burst" && r.burst ? r.burst.duration : s.view === "map" ? 7 : s.view === "move" && r.move && r.move.lead ? Math.max(r.move.lead.time, r.move.still.time) + 0.15 : r.duration; },

  controls: function (s) {
    var top = "";
    if (s.view === "burst") top = K.group(ID, "burst", "The burst", K.num(ID, "brate", "Balls a second", { min: 0.5, max: 15, step: 0.5, slider: true }) + K.num(ID, "bn", "Balls", { min: 2, max: 20, step: 1, slider: true }));
    if (s.view === "map") top = K.group(ID, "map", "Distances", '<p class="cfh">This view works out the wheel speed each distance needs, so there is no wheel speed to set here.</p>' + K.num(ID, "dnear", "Nearest", { unit: "ft", min: 2, max: 30, step: 0.5 }) + K.num(ID, "dfar", "Farthest", { unit: "ft", min: 4, max: 54, step: 0.5 }) +
      K.seg(ID, "hood", "Hood", [["fixed", "Fixed angle"], ["adj", "Adjustable"]], { hint: s.hood === "adj" ? "For each distance it picks the angle that forgives the most wheel-speed error while keeping the wheel under 85% of its top speed." : "" }) +
      (s.hood === "adj" ? K.num(ID, "degLo", "Lowest angle", { unit: "°", min: 15, max: 80, step: 1 }) + K.num(ID, "degHi", "Highest angle", { unit: "°", min: 25, max: 88, step: 1 }) : ""));
    if (s.view === "move") top = K.group(ID, "move", "The robot is driving", '<p class="cfh">This view works out the wheel speed the moving shot needs, so there is no wheel speed to set here. The drawing shows that shot.</p>' + K.num(ID, "vtoward", "Toward the target", { unit: "ft/s", min: -14, max: 14, step: 0.5, slider: true, hint: "Minus is backing away.", tip: "Negative means backing away." }) + K.num(ID, "vacross", "Across", { unit: "ft/s", min: -14, max: 14, step: 0.5, slider: true, hint: "Plus is to the right as the robot faces the target; minus is to the left.", tip: "Sideways past the target. Positive is to the right as the robot faces it." }));
    var shooter = K.seg(ID, "type", "Kind", [["hood", "Wheel and hood"], ["dual", "Two wheels"]]) +
      (s.view === "map" || s.view === "move" ? "" : K.num(ID, "rpm", "Wheel speed", { unit: "rpm", min: 500, max: 7000, step: 10, slider: true })) +
      (s.view === "map" && s.hood === "adj" ? "" : K.num(ID, "deg", "Launch angle", { unit: "°", min: 15, max: 88, step: 0.5, slider: true, tip: "Above level, as the ball leaves." })) +
      K.num(ID, "wd", s.type === "dual" ? "Lower wheel diameter" : "Wheel diameter", { unit: "in", min: 2, max: 8, step: 0.125 }) +
      (s.type === "dual" ? K.num(ID, "wd2", "Upper wheel diameter", { unit: "in", min: 1, max: 8, step: 0.125 }) + K.num(ID, "g2", "Upper wheel speed", { unit: "× lower", min: 0, max: 2, step: 0.05, slider: true, tip: "1 with equal wheels gives no spin. Less than 1 gives backspin; more gives topspin." }) : "") +
      K.num(ID, "h0", "Release height", { unit: "in", min: 4, max: 60, step: 0.5, tip: "The ball's centre above the carpet as it leaves the wheel." });
    var target = K.pick(ID, "tpreset", "Target", Object.keys(M.TARGETS).map(function (k) { return [k, M.TARGETS[k].name]; })) +
      (s.tpreset === "custom" ? K.seg(ID, "tkind", "The opening faces", [["top", "Up"], ["front", "The robot"]]) + K.num(ID, "th", s.tkind === "top" ? "Rim height" : "Middle of the opening", { unit: "in", min: 6, max: 140, step: 0.25 }) + K.num(ID, "tw", s.tkind === "top" ? "Opening, front to back" : "Opening height", { unit: "in", min: 6, max: 80, step: 0.1 }) : "") +
      (s.view === "map" ? "" : K.num(ID, "dist", "Distance", { unit: "ft", min: 2, max: 40, step: 0.25, slider: true, tip: "Along the floor, from where the ball leaves the shooter to the middle of the opening. You can also drag the target in the drawing." }));
    var ball = K.pick(ID, "piece", "Ball", Object.keys(M.PIECES).map(function (k) { return [k, M.PIECES[k].name]; })) +
      (s.piece === "custom" ? K.num(ID, "bd", "Diameter", { unit: "in", min: 2, max: 14, step: 0.01 }) + K.num(ID, "bw", "Weight", { unit: "lb", min: 0.05, max: 2, step: 0.005 }) + K.seg(ID, "bshape", "Built", [["solid", "Solid foam"], ["shell", "Hollow"]]) : "");
    var spinning = K.num(ID, "ww", "Wheels", { unit: "lb", min: 0.1, max: 8, step: 0.05, tip: "Everything on the wheel shaft: wheels and hubs, counted as solid discs of the wheel's diameter." }) +
      K.num(ID, "fw", "Added flywheel", { unit: "lb", min: 0, max: 10, step: 0.1, slider: true, tip: "Extra weight that stores energy so the wheel slows less with each ball. 0 for none." }) +
      K.num(ID, "fd", "Flywheel diameter", { unit: "in", min: 1, max: 8, step: 0.125, hintId: "sh-moi" });
    var fine = K.num(ID, "keep", "Speed kept", { unit: "%", min: 20, max: 100, step: 0.1, tip: "The share of the ideal exit speed a real, squashy ball keeps. Measure one shot with a tape and set this so the page lands where the ball did.", hintId: "sh-floor" }) +
      K.num(ID, "meas", "A real shot landed at", { unit: "ft", min: 0, max: 80, step: 0.1, tip: "Shoot across open floor at this wheel speed and angle, and measure along the floor from the shooter to where the ball first lands. Leave 0 until you have." }) +
      '<div class="cf stack"><button class="btn sm" data-act="shmatch">Set Speed kept to match it</button></div>' +
      K.num(ID, "alt", "Altitude", { unit: "ft", min: 0, max: 9000, step: 100, hintId: "sh-air" }) +
      K.check(ID, "lift", "Spin lifts the ball") +
      K.num(ID, "cd", "Drag coefficient", { min: 0, max: 1.2, step: 0.01, tip: "About 0.47 for a smooth ball at these speeds; a fuzzy or dimpled ball differs." }) +
      K.num(ID, "vin", "Speed going in", { unit: "ft/s", min: 0, max: 30, step: 0.5, tip: "How fast the feeder pushes the ball into the wheel. It adds little speed but saves the wheel energy." });
    return top + K.group(ID, "shooter", "Shooter", shooter) + K.group(ID, "target", "Target", target) + K.group(ID, "ball", "Ball", ball) +
      K.group(ID, "spin", "Spinning weight", spinning) + K.group(ID, "drive", "Motor", K.motorFields(ID, { ratioLabel: "Reduction to the wheel", ratioMax: 6 }), true) + K.group(ID, "fine", "Fine tuning", fine, true);
  },

  hints: function (s, r) {
    var rho = F.air(s.alt);
    return { "sh-floor": "On open floor this shot would first land " + K.fix(r.fl.range / FT, 1) + " ft from the shooter.", "sh-moi": "Moment of inertia " + K.n(r.U.Iw / F.LBIN2, 1) + " lb in² in all.",
      "sh-air": s.alt > 300 ? "Air here is " + Math.round((1 - rho / 1.225) * 100) + "% thinner than at sea level, so the ball carries further. Dawson's shop is near 5,200 ft." : "Sea-level air." };
  },

  outs: function (s, r) {
    var sh = r.shot, m = r.meet, v = [], state, text, cannot = r.spinup.time === Infinity, tg0 = r.target;
    if (s.view === "burst") return burstOuts(s, r);
    if (s.view === "map") return mapOuts(s, r);
    if (s.view === "move") return moveOuts(s, r);
    if (cannot) { state = "bad"; text = "The motor cannot reach " + rpmTxt(s.rpm) + " rpm through this gearing: on a rested battery it tops out near " + K.n(r.free, 0) + " rpm with nothing to push."; }
    else if (m && m.wall) { state = "bad"; text = "The ball hits the front of the target on its way up, " + inch(tg0.h - m.y) + " below the rim. Move back, or raise the angle." + (r.aim ? " From here it scores between " + rpmTxt(r.rpmLo) + " and " + rpmTxt(r.rpmHi) + " rpm." : ""); }
    else if (!m) { state = "bad"; text = s.tkind === "top" ? "The ball never gets as high as the rim." + (r.aim ? " At this angle it needs about " + rpmTxt(r.rpmMid) + " rpm." : " No speed scores at this angle from here: raise the angle.") : "The ball lands before it reaches the target."; }
    else if (m.hit) { state = "ok"; text = "Goes in with " + inch(m.room) + " to spare." + (r.aim ? " It scores from " + rpmTxt(r.rpmLo) + " to " + rpmTxt(r.rpmHi) + " rpm, " + K.fix((r.rpmHi - r.rpmLo) / 2 / r.rpmMid * 100, 1) + "% either side of " + rpmTxt(r.rpmMid) + "." : ""); }
    else { state = "warn"; text = "Misses: " + inch(m.miss) + (s.tkind === "top" ? (m.miss < 0 ? " short" : " long") : (m.miss < 0 ? " low" : " high")) + " of the middle." + (r.aim ? " At this angle it scores between " + rpmTxt(r.rpmLo) + " and " + rpmTxt(r.rpmHi) + " rpm." : " No speed scores at this angle from here."); }
    v.push({ k: "Leaves at", v: K.fix(sh.v / FT, 1), u: "ft/s", sub: K.fix(sh.v, 2) + " m/s", tip: "The ball's speed as it leaves the shooter." });
    v.push({ k: "Wheel rim", v: K.fix(sh.surface / FT, 1), u: "ft/s", sub: K.fix(sh.surface, 1) + " m/s; ball gets " + Math.round(+K.fix(sh.v / FT, 1) / (+K.fix(sh.surface / FT, 1) || 1) * 100) + "% of it", tip: "How fast the wheel's surface moves. A ball rolling between a wheel and a still hood leaves at about half of this." });
    v.push({ k: "Spin", v: K.n(Math.abs(sh.spin) / RPM, 0), u: "rpm", sub: Math.abs(sh.spin) < 1 ? "none" : sh.spin > 0 ? "backspin" : "topspin" });
    v.push({ k: "Highest point", v: K.fix(r.fl.apex[1] / FT, 1), u: "ft", sub: K.fix(r.fl.apex[1], 2) + " m" });
    if (m && !m.wall) v.push({ k: m.entryDeg < 0 ? "Still rising at" : "Enters at", v: K.fix(Math.abs(m.entryDeg), 0), u: "°", sub: "after " + K.fix(m.t, 2) + " s in the air", tip: "How steeply the ball is falling as it reaches the opening. Steeper leaves more room front to back on an opening that faces up." });
    var w2 = [{ k: "Wheel after the shot", v: rpmTxt(sh.wAfter / RPM), u: "rpm", sub: "down " + rpmTxt(Math.round(s.rpm / 10) * 10 - Math.round(sh.wAfter / RPM / 10) * 10) + " (" + K.fix(sh.drop / (r.w || 1) * 100, 1) + "%)" + (r.aim && sh.wAfter / RPM < r.rpmLo && m && m.hit ? "; the next ball waits for it (Rapid fire)" : ": a normal dip") },
      { k: "Back to speed in", v: r.recov.time === Infinity ? "never" : K.fix(r.recov.time, 2), u: r.recov.time === Infinity ? "" : "s", sub: r.recov.time < Infinity && r.recov.time > 0 ? Math.max(1, s.motors) + " motor" + (s.motors > 1 ? "s" : "") + " at " + s.statorA + " A, no ball" : "", state: r.recov.time === Infinity ? "bad" : "" },
      { k: "Spin-up from rest", v: cannot ? "never" : K.fix(r.spinup.time, 2), u: cannot ? "" : "s", state: cannot ? "bad" : "" },
      { k: "Energy into the ball", v: K.fix(sh.eBall, 1), u: "J", sub: Math.round(sh.eff * 100) + "% of what the wheel gave up", tip: "A wheel-and-hood shooter fed a ball at rest can pass on at most half of the energy the wheel loses. The rest goes into heat and squashing the ball. A feeder that pushes the ball in raises the share." }];
    var caveat = (s.meas > 0 ? "Speed kept was set from your measured shot." : "Speed kept (" + K.fix(s.keep, 0) + "%) is a guess until you measure one shot: see Fine tuning.") + (s.lift ? " The lift from spin is an estimate for a foam ball." : "");
    return K.verdict(state, text, caveat) + K.outs(v) + K.outs(w2);
  },

  more: function (s, r) {
    if (s.view === "burst") return burstMore(s, r) + notes(s, r);
    if (s.view === "map") return mapMore(s, r) + notes(s, r);
    if (s.view === "move") return notes(s, r);
    var U = r.U, w = [[-0.15, s.rpm], [0, s.rpm], [r.tc, r.shot.wAfter / RPM]];
    r.recov.t.forEach(function (t, i) { if (i % 4 === 0 || i === r.recov.t.length - 1) w.push([r.tc + t, r.recov.w[i] / RPM]); });
    var end = Math.max(0.5, r.tc + (r.recov.time < Infinity ? r.recov.time : 1) + 0.25); w.push([end, w[w.length - 1][1]]);
    var sens = [], half = r.target.w / 2 - r.target.r;
    if (r.meet) half = r.meet.half;
    for (var i = 0; i <= 20; i++) { var rp = s.rpm * (0.85 + 0.3 * i / 20), sv = F.shot(Object.assign({}, U.sp, { w: rp * RPM })).v, mm = F.meet(M.flight(U, sv, { dt: 0.005 }).pts, r.target); sens.push([rp, mm ? mm.miss / IN : NaN]); }
    var charts = '<div class="chartrow">' +
      K.chart({ id: "sh-w", title: "Wheel speed through one shot (rpm)", x: { label: "seconds", name: "At", unit: "s" }, y: { min: Math.min(r.shot.wAfter / RPM, r.aim ? r.rpmLo : 1e9) * 0.96, max: s.rpm * 1.02, unit: "rpm" }, series: [{ name: "Wheel speed", pts: w, color: 1 }], note: "The ball leaves at the dot, at full speed; the dip comes after.", dots: [{ x: 0, y: s.rpm, label: "ball leaves" }], hlines: r.aim && r.rpmLo > r.shot.wAfter / RPM * 0.9 ? [{ y: r.rpmLo, label: "slowest that scores, as the ball leaves" }] : [] }) +
      K.chart({ id: "sh-s", title: (s.tkind === "top" ? "Long or short" : "High or low") + " of the middle as wheel speed changes (in)", x: { label: "wheel rpm", name: "At", unit: "rpm" }, y: { unit: "in", min: -Math.max(half / IN * 1.8, 20), max: Math.max(half / IN * 1.8, 20) }, series: [{ name: "Where it arrives", pts: sens, color: 2 }], hlines: [{ y: half / IN, side: "left", label: "over " + K.fix(half / IN, 0) + " in: too " + (s.tkind === "top" ? "long" : "high") }, { y: -half / IN, below: true, label: "under −" + K.fix(half / IN, 0) + " in: too " + (s.tkind === "top" ? "short" : "low") }], marks: [{ x: s.rpm, label: r.meet && isFinite(r.meet.miss) ? "now, " + K.fix(Math.abs(r.meet.miss) / IN, 0) + " in " + (r.meet.miss >= 0 ? (s.tkind === "top" ? "long" : "high") : (s.tkind === "top" ? "short" : "low")) : "now" }] }) + "</div>";
    return charts + notes(s, r);
  },

  draw: function (g, s, r, t) {
    if (s.view === "move") return drawMove(g, s, r, t);
    if (s.view === "map") return drawMap(g, s, r, t);
    drawSide(g, s, r, t);
  },

  /* Drag the target to change the distance, or the aim handle to change the angle. */
  hover: function (x, y, s) { var h = hit(x, y, s); return h === "target" ? "ew-resize" : h === "aim" ? "grab" : h === "vel" ? "grab" : ""; },
  pointer: function (kind, x, y, s) {
    if (kind === "down") { var h = hit(x, y, s); if (!h) return false; hold = { what: h, V: last.V, box: last.box }; K.pause(ID); return true; }
    if (kind === "up") { hold = null; return true; }
    if (!hold) return false;
    if (hold.what === "target") s.dist = F.clamp(Math.round(hold.V.ux(x) / FT * 4) / 4, 2, 40);
    else if (hold.what === "aim") s.deg = F.clamp(Math.round(Math.atan2(hold.V.uy(y) - s.h0 * IN, hold.V.ux(x)) * 180 / Math.PI * 2) / 2, 15, 88);
    else if (hold.what === "vel") { s.vacross = F.clamp(Math.round((hold.V.ux(x) - 0) / FT / 0.35 * 2) / 2, -14, 14); s.vtoward = F.clamp(Math.round((hold.V.uy(y) + s.dist * FT) / FT / 0.35 * 2) / 2, -14, 14); }
    return true;
  }
});

D.acts.shrate = function (b) { K.state(ID).brate = +b.dataset.v; K.rewind(ID); D.render(); if (!K.reduced()) K.play(ID); };
D.acts.shmatch = function () {
  var s = K.state(ID); if (!(s.meas > 0)) { D.toast("Type where the real shot landed first."); D.render(); return; }
  var k = M.keepFor(s, s.meas);
  if (k == null) D.toast("No setting lands there. Check the wheel speed and angle match the real shot."); else { s.keep = k; D.toast("Speed kept is now " + k + "%."); }
  D.render();
};

/* ---------- Answers for the other three views ---------- */
function burstOuts(s, r) {
  var b = r.burst, n = b.shots.length, last = b.shots[n - 1], state = b.hits === n ? "ok" : b.hits * 2 < n ? "bad" : "warn", firstMiss = -1;
  b.shots.forEach(function (x, i) { if (!x.hit && firstMiss < 0) firstMiss = i; });
  var text = b.hits === n ? "All " + n + " go in at " + K.fix(s.brate, 1) + " a second." + (b.best >= 20 ? " In this model it still scores every ball at 20 a second, the fastest rate tried." : b.best ? " It would still score every ball up to about " + K.fix(b.best, 1) + " a second." : "") :
    !b.shots[0].hit ? "The first ball misses, so fix the single shot first (One shot)." :
    b.hits + " of " + n + (b.hits === 1 ? " goes in" : " go in") + ". Ball " + (firstMiss + 1) + " is the first to miss: the wheel has not recovered when it arrives." + (b.best ? " For these " + n + " balls, feed no faster than " + K.fix(Math.floor(b.best * 10) / 10, 1) + " a second, or add flywheel weight or motor." : " Add flywheel weight or motor.");
  var tryRate = b.best && b.best < s.brate && b.shots[0].hit ? Math.max(0.5, Math.floor(b.best * 10) / 10) : 0;
  return K.verdict(state, text) + (tryRate ? '<div class="row"><button class="btn sm" data-act="shrate" data-v="' + tryRate + '">Try ' + K.fix(tryRate, 1) + " a second</button></div>" : "") + K.outs([
    { k: "Balls that score", v: b.hits + " of " + n, state: state === "ok" ? "" : state },
    { k: "Wheel as the last ball reaches it", v: rpmTxt(last.wBefore / RPM), u: "rpm", sub: (1 - last.wBefore / r.w < 0.0005 ? "back to full speed" : K.fix((1 - Math.round(last.wBefore / RPM / 10) * 10 / (Math.round(r.w / RPM / 10) * 10)) * 100, 1) + "% under the set speed") + "; that ball drops it to " + rpmTxt(last.wAfter / RPM) },
    { k: "Last ball leaves at", v: K.fix(last.v / FT, 1), u: "ft/s", sub: "first: " + K.fix(b.shots[0].v / FT, 1) + " ft/s" },
    { k: "Fastest rate that scores them all", v: b.best == null ? "–" : b.best >= 20 ? "20+" : K.fix(Math.floor(b.best * 10) / 10, 1), u: "a second", sub: b.best >= 20 ? "the feeder is the limit, not the wheel" : "set by how fast the wheel recovers" },
    { k: "One ball costs the wheel", v: K.fix(r.shot.drop / (r.w || 1) * 100, 1), u: "%", sub: "and takes " + (r.recov.time === Infinity ? "forever" : K.fix(r.recov.time, 2) + " s") + " to win back" }]);
}
function burstMore(s, r) {
  var b = r.burst, pts = b.t.map(function (t, i) { return [t, b.w[i] / RPM]; }), half = r.meet ? r.meet.half : r.target.w / 2 - r.target.r;
  var worst = Math.min.apply(null, b.shots.map(function (x) { return x.meet ? x.meet.miss / IN : 0; }).concat([-half / IN * 1.6])), short = 0;
  var never = [], land = b.shots.map(function (x, i) { if (!x.meet) { short++; never.push({ x: i + 1, y: worst * 1.12, label: "" }); } return [i + 1, x.meet ? x.meet.miss / IN : NaN]; });
  return '<div class="chartrow">' +
    K.chart({ id: "sh-bw", title: "Wheel speed through the burst (rpm)", note: r.aim ? "Each dot is a ball leaving. One that leaves under the dashed line misses." : "Each dot is a ball leaving.", x: { label: "seconds", name: "At", unit: "s" }, y: { min: Math.min(Math.min.apply(null, b.w) / RPM, r.aim ? r.rpmLo : 1e9) * 0.97, max: s.rpm * 1.02, unit: "rpm" }, series: [{ name: "Wheel speed", pts: pts, color: 1 }], dots: b.shots.map(function (x, i) { return { x: x.t, y: x.wBefore / RPM, label: "" }; }), hlines: r.aim ? [{ y: r.rpmLo }] : [] }) +
    K.chart({ id: "sh-bl", title: "Where each ball arrives, from the middle (in)", note: short ? short + (short === 1 ? " ball never reaches" : " balls never reach") + " the rim: marked at the bottom, off the scale. Measured where a ball comes down through rim height." : (b.hits === b.shots.length ? "All " + b.shots.length + " arrive between the dashed lines" + (function () { var mm = land.map(function (q) { return q[1]; }), lo = Math.min.apply(null, mm), hi = Math.max.apply(null, mm); return Math.round(lo) === Math.round(hi) && Math.round(lo) !== 0 ? ", " + Math.abs(Math.round(lo)) + " in " + (lo > 0 ? "long" : "short") : ""; })() + ", so all go in." : "A ball outside the dashed lines misses.") + " Measured where the ball comes down through rim height.", x: { label: "ball", name: "Ball", min: 1, max: b.shots.length }, y: { unit: "in", min: Math.min(-half / IN * 1.6, Math.min.apply(null, land.map(function (p) { return isFinite(p[1]) ? p[1] : 0; })) * 1.15), max: Math.max(half / IN * 1.6, Math.max.apply(null, land.map(function (p) { return isFinite(p[1]) ? p[1] : 0; })) * 1.15) }, series: [{ name: "Arrives", pts: land, color: 2 }], dots: land.filter(function (p) { return isFinite(p[1]); }).map(function (p) { return { x: p[0], y: p[1] }; }).concat(never), hlines: [{ y: -half / IN, label: "below this: short", below: true }, { y: half / IN, label: "above this: long" }] }) + "</div>";
}
function mapOuts(s, r) {
  var mp = r.map, g = mp.good;
  if (!g.length) return K.verdict("bad", "No distance in this range can be scored from with this shooter. Check the angle, the wheel size and the motor's top speed.");
  var near = g[0], far = g[g.length - 1], gaps = mp.rows.length - g.length, fast = mp.rows.filter(function (x) { return x.tooFast; }).length;
  var missed = mp.rows.filter(function (x) { return !x.ok; }).map(function (x) { return K.fix(x.d, 1) + " ft"; });
  var stepFt = String(+((s.dfar - Math.min(s.dnear, s.dfar - 1)) / (mp.rows.length - 1)).toFixed(2));
  var text = (gaps ? "Scores from " + K.fix(near.d, 1) + " to " + K.fix(far.d, 1) + " ft at every distance tested, and misses at " + (missed.length <= 3 ? missed.join(" and ") : gaps + " others") + (fast ? " (" + fast + " need more speed than the motor has)" : "") + "." : "Scores at all " + mp.rows.length + " distances tested, " + stepFt + " ft apart, from " + K.fix(near.d, 1) + " to " + K.fix(far.d, 1) + " ft.") +
    " Most forgiving at " + K.fix(mp.sweet.d, 1) + " ft, where the wheel may be " + K.fix((mp.sweet.hi - mp.sweet.lo) / 2 / mp.sweet.rpm * 100, 1) + "% off either way.";
  var nearOnly = gaps > 0 && mp.rows.slice(gaps).every(function (x) { return x.ok; }) && gaps <= 3;
  // Any distance in the range typed that misses makes this a Check, not the green word.
  return K.verdict(!gaps ? "ok" : "warn", text, nearOnly ? "At " + missed.join(" and ") + " the ball meets the front of the target at this angle. The true limit lies between " + K.fix(mp.rows[gaps - 1].d, 1) + " and " + K.fix(near.d, 1) + " ft." : "") + K.outs([
    { k: "Nearest shot", v: K.fix(near.d, 1), u: "ft", sub: rpmTxt(near.rpm) + " rpm" + (s.hood === "adj" ? " at " + K.fix(near.deg, 0) + "°" : "") },
    { k: "Farthest shot", v: K.fix(far.d, 1), u: "ft", sub: rpmTxt(far.rpm) + " rpm" + (s.hood === "adj" ? " at " + K.fix(far.deg, 0) + "°" : "") },
    { k: "Most forgiving", v: K.fix(mp.sweet.d, 1), u: "ft", sub: "±" + K.fix((mp.sweet.hi - mp.sweet.lo) / 2 / mp.sweet.rpm * 100, 1) + "% wheel speed" },
    { k: "Motor's top speed", v: rpmTxt(r.free), u: "rpm", sub: K.fix(far.d, 0) + " ft needs " + K.fix(far.rpm / r.free * 100, 0) + "% of it (12.3 V, no load)", state: far.rpm > r.free * 0.9 ? "warn" : "" }]);
}
function mapMore(s, r) {
  var g = r.map.good; if (!g.length) return "";
  var mid = g.map(function (x) { return [x.d, x.rpm]; }), lo = g.map(function (x) { return [x.d, x.lo]; }), hi = g.map(function (x) { return [x.d, x.hi]; });
  var charts = '<div class="chartrow">' + K.chart({ id: "sh-m", title: "Wheel speed for each distance (rpm)", note: "The upright line is the distance being drawn.", x: { label: "feet from the target", name: "From", unit: "ft" }, y: { unit: "rpm", min: Math.min.apply(null, lo.map(function (p) { return p[1]; })) * 0.95 }, series: [{ name: "Fastest that scores", pts: hi, color: 3, dash: true }, { name: "Middle of the opening", pts: mid, color: 1 }, { name: "Slowest that scores", pts: lo, color: 2, dash: true }], hlines: r.free < Math.max.apply(null, hi.map(function (p) { return p[1]; })) * 1.1 ? [{ y: r.free, label: "motor's top speed" }] : [] }) +
    (s.hood === "adj" ? K.chart({ id: "sh-a", title: "Hood angle for each distance (°)", x: { label: "feet from the target", name: "From", unit: "ft" }, y: { unit: "°", min: s.degLo - 2, max: s.degHi + 2 }, series: [{ name: "Launch angle", pts: g.map(function (x) { return [x.d, x.deg]; }), color: 1 }] }) :
      K.chart({ id: "sh-e", title: "How steeply it arrives (° below level)", x: { label: "feet from the target", name: "From", unit: "ft" }, y: { unit: "°" }, series: [{ name: "Entry angle", pts: g.map(function (x) { return [x.d, x.entry]; }), color: 1 }] })) + "</div>";
  var rows = g.filter(function (x, i) { return i % 2 === 0 || i === g.length - 1; });
  var table = '<section class="ctab"><h2>The table (' + rows.length + " of " + r.map.rows.length + ' distances shown)</h2><p class="small mute">' + "The table and the code show every other distance tested, " + String(+((s.dfar - Math.min(s.dnear, s.dfar - 1)) / (r.map.rows.length - 1) * 2).toFixed(2)) + " ft apart.</p>" + '<div class="scroll"><table><thead><tr><th class="r">Distance</th>' + (s.hood === "adj" ? '<th class="r">Angle</th>' : "") + '<th class="r">Wheel speed</th><th class="r">May be off by</th><th class="r">In the air</th><th class="r">Arrives at</th></tr></thead><tbody>' +
    rows.map(function (x) { return '<tr class="' + (x === r.map.sweet ? "pick" : "") + '"><td class="r num">' + K.fix(x.d, 1) + " ft</td>" + (s.hood === "adj" ? '<td class="r num">' + K.fix(x.deg, 0) + "°</td>" : "") + '<td class="r num">' + rpmTxt(x.rpm) + ' rpm</td><td class="r num">±' + K.fix((x.hi - x.lo) / 2 / x.rpm * 100, 1) + '%</td><td class="r num">' + K.fix(x.time, 2) + ' s</td><td class="r num">' + K.fix(x.entry, 0) + "°</td></tr>"; }).join("") + "</tbody></table></div></section>";
  var code = "// Distance to the middle of the target (metres) -> wheel speed (rpm)" + (s.hood === "adj" ? " and hood angle (degrees)" : "") + ".\n// These are calculated, not measured. Shoot from each distance, then replace each line with what scored.\n" +
    "// Every other tested distance, " + K.fix((s.dfar - Math.min(s.dnear, s.dfar - 1)) / (r.map.rows.length - 1) * 2 * FT, 2) + " m apart" + (g.length % 2 === 0 ? " (the last row is the farthest tested, half a step on)" : "") + ". The map fills in between.\n" +
    "// Good from " + K.fix(g[0].d * FT, 2) + " to " + K.fix(g[g.length - 1].d * FT, 2) + " m. Outside that the map holds its end value: do not shoot from there.\n" +
    "private static final InterpolatingDoubleTreeMap kShooterRpm = new InterpolatingDoubleTreeMap();\n" + (s.hood === "adj" ? "private static final InterpolatingDoubleTreeMap kHoodDegrees = new InterpolatingDoubleTreeMap();\n" : "") + "static {\n" +
    rows.map(function (x) { return "  kShooterRpm.put(" + K.fix(x.d * FT, 2) + ", " + (Math.round(x.rpm / 10) * 10).toFixed(1) + ");" + (s.hood === "adj" ? "  kHoodDegrees.put(" + K.fix(x.d * FT, 2) + ", " + K.fix(x.deg, 1) + ");" : ""); }).join("\n") + "\n}";
  return charts + table + '<section class="ctab"><h2>For robot code</h2>' + K.code("sh-code", code, "Copy the code") + "</section>";
}
function moveOuts(s, r) {
  var mv = r.move;
  if (!mv) return K.verdict("bad", "This distance is outside the range that can be scored from. Open Every distance to see the range.");
  if (mv.out) return K.verdict("bad", "At this speed the shot would have to come from a distance this shooter cannot score from. Slow down or move.");
  var L = mv.lead, side = L.leadDeg < -0.05 ? "left" : L.leadDeg > 0.05 ? "right" : "", still = Math.abs(s.vtoward) < 0.01 && Math.abs(s.vacross) < 0.01;
  var text = still ? "Standing still, aim straight at the target." : "Aim " + (side ? K.fix(Math.abs(L.leadDeg), 1) + "° " + side + " of the target, as the robot faces it" : "straight at it") + ". Set the wheel to " + rpmTxt(mv.rpm) + " rpm, as for a standing shot from " + K.fix(L.d / FT, 1) + " ft.";
  return K.verdict(still ? "info" : "ok", text, still ? "" : "Exact without air and at a steady speed: tune it on the field.") + K.outs([
    { k: "Turn the aim", v: K.fix(Math.abs(L.leadDeg), 1), u: "°", sub: side ? "to the " + side : "none" },
    { k: "Shoot as if from", v: K.fix(L.d / FT, 1), u: "ft", sub: "really " + K.fix(s.dist, 1) + " ft" },
    { k: "Wheel speed", v: rpmTxt(mv.rpm), u: "rpm", sub: "standing still: " + rpmTxt(mv.rpmStill) },
    { k: "In the air", v: K.fix(L.time, 2), u: "s", sub: "the robot moves " + K.fix(Math.hypot(s.vtoward, s.vacross) * Math.round(L.time * 100) / 100, 1) + " ft meanwhile, at a steady speed" },
    { k: "Miss without the lead", v: K.fix(mv.missNoLead / FT, 1), u: "ft", sub: "a straight shot flies " + K.fix(mv.still.time, 2) + " s: " + K.fix(Math.hypot(s.vtoward, s.vacross), 1) + " ft/s × " + K.fix(mv.still.time, 2) + " s", state: mv.missNoLead > r.target.w / 2 ? "warn" : "" }]);
}
function notes(s, r) {
  // The paragraph about the view on screen comes first.
  var key = s.view === "burst" ? "Rapid fire." : s.view === "move" ? "While driving." : "", h = notesText(r), i = key ? h.indexOf("<p><b>" + key) : -1, j = i < 0 ? -1 : h.indexOf("<p><b>", i + 10);
  if (i > 0 && j > i) h = h.slice(i, j) + h.slice(0, i) + h.slice(j);
  return K.notes(h);
}
function notesText(r) {
  return (
    "<p><b>The wheel and the ball.</b> The ball is squeezed between a spinning wheel and a hood that does not move. If it stops slipping before it leaves, the side on the wheel moves at the wheel's rim speed and the side on the hood is still, so its middle moves at half the rim speed and it leaves spinning backward. A light wheel also slows down as it hands energy to the ball. Both effects are in one equation:</p>" +
    '<p class="eq">exit speed = (2 × I ÷ R) × ω ÷ (4 × I ÷ R² + I_ball ÷ r² + m)</p>' +
    "<p>I is the moment of inertia of everything that spins (kg m²), R the wheel's radius and ω its speed in radians a second; I_ball, r and m are the ball's moment of inertia, radius and mass. With two driven wheels the ball leaves at the average of the two rim speeds, and its spin is the difference of the two rim speeds divided by the ball's diameter (in radians a second). Both rim speeds are counted in the direction the ball travels, so two wheels at the same speed give no spin and a faster top wheel gives topspin. This is the corrected model from Team 449's 2026 paper (Rafi Pedersen), built on Dean Brettle's 2023 analysis for Team 199. The older formula most calculators use counts only half the wheel's inertia and assumes no energy is wasted, so it predicts too little speed loss and too fast a recovery.</p>" +
    "<p>The energy bar splits what the wheel gave up into the ball's flight, the ball's spin and a part marked wasted. Wasted is what is left over in this model: it goes into rubbing against the hood and squashing the ball, and ends as heat and sound. It is worked out, not measured. The spinning weight is the wheels and the added flywheel, " + K.n(r.U.Iw / F.LBIN2, 1) + " lb in² here; the motor's own rotor is left out.</p>" +
    "<p><b>Speed kept.</b> A real ball squashes and slips, so it leaves slower than the equation says. Nobody can calculate that well. Shoot once, measure where it lands, and set Speed kept until the page agrees.</p>" +
    "<p><b>The flight.</b> Gravity, air drag and lift from spin, stepped forward a few hundred times a second:</p>" +
    '<p class="eq">drag = ½ × ρ × Cd × A × v²    lift = ½ × ρ × CL × A × v²,  CL = 1 ÷ (2.32 + 0.4 × v ÷ (r × spin))</p>' +
    "<p>Here v is the ball's speed, A the area of its outline (π × its radius²), r its radius and spin how fast it turns in radians a second. Cd is the drag coefficient (Fine tuning) and CL the lift coefficient, which grows with spin. ρ is the air's density in kg/m³, which falls with altitude. Forces are in newtons. The lift figure was measured on baseballs (Alan Nathan, 2008), so for a foam ball it is an estimate. The dashed line is the same shot with no air.</p>" +
    "<p><b>Rapid fire.</b> Each ball takes the same share of the wheel's speed. Between balls the motors push at full voltage, up to the current limit and never past the set speed, and the next ball leaves at whatever speed the wheel has reached. The fastest rate that scores every ball is found by trying rates between 0.5 and 20 a second. A real feeder, belt slip and the motor's own inertia are left out, so test the rate on the robot.</p>" +
    "<p><b>Goes in or not.</b> The ball must pass between the edges of the opening without touching either. A ball that comes in at a slant needs more room than one that drops straight down, so a flat shot has a smaller opening to hit. The shaded fan is every wheel speed that does that. Its width is how much error the shot forgives, and it is the number to design for.</p>" +
    "<p><b>While driving.</b> The ball keeps the robot's speed when it leaves, so the launcher aims at where the target seems to be after the flight time:</p>" +
    '<p class="eq">aim point = target − robot velocity × time in the air</p>' +
    "<p>The time in the air depends on how far away the aim point is, so the sum is run a few times over until it settles. The robot is taken to hold a steady speed. This is exact only without air. With drag the true lead differs, by how much this page cannot say, so treat it as a first setting and check it on the field.</p>" +
    "<p><b>Left out.</b> The ball's squash in the shooter, spin slowing in flight, wind, a ball that clips the rim and bounces in, the motor's own rotor inertia, and belt slip. The lift figure is used at more spin than the baseball tests covered.</p>");
}

/* ---------- Drawing: from the side ---------- */
var last = { V: null, box: null };
function spinK(w) { var perFrame = Math.abs(w) * K.speed(ID) / 60; return perFrame > 0.4 ? 0.4 / perFrame : 1; }
function colW(g) { return g.w < 520 ? Math.round(g.w * 0.3) : Math.round(Math.min(210, g.w * 0.24)); }
/* Where the close-up goes. On a laptop it is a column at the left of the scene. On a phone it is a strip across the
   top, so the flight below it gets the full width. l: where the scene starts; top: pixels the strip takes. */
function lay(g) { return g.w < 520 ? { strip: true, l: 12, x0: 0, top: Math.round(Math.min(g.h * 0.36, 132)) } : { strip: false, l: colW(g) + 14, x0: colW(g) + 2, top: 0 }; }
function sideView(g, s, r, extraX, extraY) {
  var tg = r.target, x1 = Math.max(tg.d + tg.w * 0.6 + 0.45, extraX || 0), top = tg.kind === "front" ? tg.h + tg.w / 2 + 0.3 : tg.h;
  var y1 = Math.max(r.fl.apex[1], top, 1.4, extraY || 0) + 0.45, box = hold && hold.box ? hold.box : { x0: -0.95, x1: x1, y0: 0, y1: y1 };
  // On a phone the key sits above the arc, so the top of the arc and its label need room under it.
  var La = lay(g), V = g.view(box, { l: La.l, r: 12, t: (La.strip ? 60 : 24) + La.top, b: 42 });
  last.V = V; last.box = box;
  var step = V.k * FT >= 13 ? FT : 5 * FT;
  g.grid(V, step, g.w > 560 ? (step === FT ? "1 ft squares" : "5 ft squares") : "");
  if (g.w <= 560) g.text(step === FT ? "1 ft squares" : "5 ft squares", 8, g.h - 8, { color: g.c.mute, size: 10.5 });
  g.ground(V.Y(0), La.x0, g.w);
  return V;
}
function drawRobot(g, V, s, r, ox, quiet) {
  var c = g.c, U = r.U, th = s.deg * Math.PI / 180, h0 = s.h0 * IN, X = function (x) { return V.X(ox + x); }, Y = V.Y;
  var wc = [(U.rb + U.rw) * Math.sin(th), h0 - (U.rb + U.rw) * Math.cos(th)], top = 0.165, b0 = Math.min(-0.62, wc[0] - 0.7), b1 = Math.max(0.16, wc[0] + U.rw + 0.06);
  function up(y) { return Math.max(top, y); }
  // Drive wheels, the side plate that carries the shooter, then the bumper across the front of it all.
  g.circle(X(b0 + 0.13), Y(0.05), V.L(0.05), { fill: c.text2, stroke: null }); g.circle(X(b1 - 0.13), Y(0.05), V.L(0.05), { fill: c.text2, stroke: null });
  var plate = [[X(b0 + 0.07), Y(top)]], i;
  if (U.dual) {
    var w2 = [-(U.rb + U.rw2) * Math.sin(th), h0 + (U.rb + U.rw2) * Math.cos(th)];
    plate.push([X(w2[0] - U.rw2 - 0.02), Y(up(w2[1]))], [X(w2[0]), Y(w2[1] + U.rw2 + 0.02)], [X(wc[0] + U.rw + 0.02), Y(up(wc[1] + 0.02))]);
    g.poly(plate.concat([[X(b1 - 0.05), Y(top)]]), { fill: c.part, stroke: c.partLine, width: 1 });
    g.circle(X(w2[0]), Y(w2[1]), V.L(U.rw2), { fill: c.part2, stroke: c.partLine, width: 1 });
  } else {
    var Rh = U.rw + 2 * U.rb + 0.012, f0 = th + Math.PI / 2 + 1.3, f1 = th + Math.PI / 2;
    for (i = 0; i <= 10; i++) { var f = f0 + (f1 - f0) * i / 10; plate.push([X(wc[0] + Rh * Math.cos(f)), Y(up(wc[1] + Rh * Math.sin(f)))]); }
    plate.push([X(wc[0] + U.rw + 0.02), Y(up(wc[1] + U.rw * 0.4))], [X(wc[0] + U.rw + 0.02), Y(up(wc[1] - U.rw))], [X(b1 - 0.05), Y(top)]);
    g.poly(plate, { fill: c.part, stroke: c.partLine, width: 1 });
    g.arc(X(wc[0]), Y(wc[1]), V.L(U.rw + 2 * U.rb), -f0, -f1, { color: c.partLine, width: Math.max(2, V.L(0.014)), cap: "butt" });
  }
  g.circle(X(wc[0]), Y(wc[1]), V.L(U.rw), { fill: c.part2, stroke: c.partLine, width: 1 }); g.circle(X(wc[0]), Y(wc[1]), Math.max(1.5, V.L(U.rw * 0.22)), { fill: c.partLine, stroke: null });
  g.rect(X(b0), Y(top), V.L(b1 - b0), V.L(0.127), { fill: quiet ? c.part2 : c.accent, stroke: null, radius: 2 });
}
function drawTarget(g, V, r, state, name) {
  var c = g.c, tg = r.target, col = state === "ok" ? c.ok : state === "miss" ? c.warn : c.text2, lw = Math.max(2.5, V.L(0.03));
  if (tg.kind === "front") {
    var lo = tg.h - tg.w / 2, hi = tg.h + tg.w / 2;
    g.rect(V.X(tg.d), V.Y(lo), V.L(0.1), V.L(lo), { fill: c.part, stroke: c.partLine, width: 1 });
    g.rect(V.X(tg.d), V.Y(hi + 0.3), V.L(0.1), V.L(0.3), { fill: c.part, stroke: c.partLine, width: 1 });
    g.line(V.X(tg.d), V.Y(lo), V.X(tg.d), V.Y(hi), { color: col, width: lw, dash: [3, 4], cap: "butt" });
    return;
  }
  var out = tg.w * 0.565;
  g.poly([[V.X(tg.d - out), V.Y(0)], [V.X(tg.d - out), V.Y(tg.h)], [V.X(tg.d - tg.w / 2), V.Y(tg.h)], [V.X(tg.d - tg.w * 0.3), V.Y(tg.h * 0.72)], [V.X(tg.d + tg.w * 0.3), V.Y(tg.h * 0.72)], [V.X(tg.d + tg.w / 2), V.Y(tg.h)], [V.X(tg.d + out), V.Y(tg.h)], [V.X(tg.d + out), V.Y(0)]], { fill: c.part, stroke: c.partLine, width: 1 });
  g.line(V.X(tg.d - tg.w / 2), V.Y(tg.h), V.X(tg.d + tg.w / 2), V.Y(tg.h), { color: col, width: lw, dash: [3, 4], cap: "butt" });
  if (name) g.text(name, V.X(tg.d), V.Y(tg.h * 0.36), { align: "center", color: c.text2, weight: 600, halo: false });
}
function pathLine(g, V, pts, o, ox) { if (pts.length < 2) return; g.path(pts.map(function (p) { return [V.X(p[1] + (ox || 0)), V.Y(p[2])]; }), o); }
/* The close-up column at the left: the wheel, the hood and the ball in the shooter, the numbers that matter, and
   where the energy the wheel gave up went. phase: 0 as the ball touches the wheel, 1 as it leaves. */
function closeUp(g, s, r, phase, rpmNow, tShow) {
  var c = g.c, U = r.U, La = lay(g), cw = La.strip ? g.w - 2 : colW(g), th = s.deg * Math.PI / 180, size = La.strip ? La.top - 12 : Math.min(cw - 10, g.h * 0.5), x0 = 6, y0 = 6;
  if (La.strip) { g.rect(0, 0, g.w, La.top, { fill: c.surface, stroke: null }); g.line(0, La.top, g.w, La.top, { color: c.line2, width: 1 }); }
  else { g.rect(0, 0, cw + 2, g.h, { fill: c.surface, stroke: null }); g.line(cw + 2, 0, cw + 2, g.h, { color: c.line2, width: 1 }); }
  var u = [Math.cos(th), -Math.sin(th)], kk = spinK(r.w), ang = kk * r.w * tShow, p2 = Math.min(1, phase) * Math.min(1, phase);
  // Lay the parts out in metres with the lower wheel at the origin (screen axes), then fit them in the square.
  var a1 = -(th + Math.PI / 2), a0 = a1 - 1.3, Rp = U.rw + U.rb, Rh = U.rw + 2 * U.rb, ex = [Rp * Math.cos(a1), Rp * Math.sin(a1)], pts = [[-U.rw, -U.rw], [U.rw, U.rw]], i;
  var w2 = U.dual ? [ex[0] + (U.rb + U.rw2) * Math.cos(a1), ex[1] + (U.rb + U.rw2) * Math.sin(a1)] : null, back = U.rb * 2.2;
  if (U.dual) { pts.push([w2[0] - U.rw2, w2[1] - U.rw2], [w2[0] + U.rw2, w2[1] + U.rw2], [ex[0] - u[0] * back - U.rb, ex[1] - u[1] * back - U.rb], [ex[0] - u[0] * back + U.rb, ex[1] - u[1] * back + U.rb]); }
  else for (i = 0; i <= 12; i++) { var aa = a0 - 0.12 + (a1 + 0.02 - a0 + 0.12) * i / 12; pts.push([Rh * Math.cos(aa), Rh * Math.sin(aa)]); }
  pts.push([ex[0] - U.rb, ex[1] - U.rb], [ex[0] + U.rb + u[0] * U.rb * 1.6, ex[1] + U.rb], [ex[0] + u[0] * U.rb * 2.2, ex[1] + u[1] * U.rb * 2.2]);
  var bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9; pts.forEach(function (p) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); by1 = Math.max(by1, p[1]); });
  var k = (size - 22) / Math.max(bx1 - bx0, by1 - by0), ox = x0 + size / 2 - (bx0 + bx1) / 2 * k, oy = y0 + size / 2 - (by0 + by1) / 2 * k;
  function P(p) { return [ox + p[0] * k, oy + p[1] * k]; }
  g.ctx.save(); g.ctx.beginPath(); g.ctx.rect(x0, y0, size, size); g.ctx.clip();
  var W = P([0, 0]), E = P(ex), ball;
  if (U.dual) { var W2 = P(w2); g.wheel(W2[0], W2[1], U.rw2 * k, -ang * U.G, {}); ball = P([ex[0] - u[0] * back * (1 - p2), ex[1] - u[1] * back * (1 - p2)]); }
  else { g.arc(W[0], W[1], Rh * k + 3, a0 - 0.12, a1 + 0.02, { color: c.partLine, width: 6, cap: "butt" }); var a = a0 + (a1 - a0) * p2; ball = P([Rp * Math.cos(a), Rp * Math.sin(a)]); }
  g.wheel(W[0], W[1], U.rw * k, ang, {});
  if (phase <= 1) g.ball(ball[0], ball[1], U.rb * k, -kk * r.shot.spin * tShow * p2, {});
  else g.circle(E[0], E[1], U.rb * k, { stroke: c.pieceLine, width: 1.25, dash: [4, 4], fill: null });
  if (La.strip) {
    if (!U.dual) g.text("hood", x0 + size * 0.5, y0 + size - 6, { size: 10, color: c.mute, halo: false });
    g.text(U.dual ? "wheels" : "wheel", W[0] + U.rw * k + 4, W[1] + 4, { size: 10, color: c.mute, halo: false });
  }
  if (!La.strip && size > 150) {
    if (!U.dual) g.text("fixed hood", x0 + size * 0.46, y0 + size - 7, { size: 10.5, color: c.mute, halo: false });
    g.text(phase <= 1 ? "ball" : "ball left here", x0 + 5, y0 + 13, { size: 10.5, color: c.mute, halo: false });
    g.text(U.dual ? "wheels" : "wheel", W[0], W[1] + U.rw * k + 12 < y0 + size - 16 ? W[1] + U.rw * k + 12 : W[1] - U.rw * k - 5, { size: 10.5, color: c.mute, align: "center", halo: false });
  }
  // Two arrows to the same scale: the rim's speed where it touches the ball, and the ball's own speed.
  var rim = (r.wThen || rpmNow * RPM) * U.rw, al = size * 0.42, ct = P([U.rw * Math.cos(a1), U.rw * Math.sin(a1)]), bl = r.shot.v / (rim || 1) * al;
  g.arrow(ct[0], ct[1], ct[0] + u[0] * al, ct[1] + u[1] * al, { color: c.s2, width: 2.5, head: 8 });
  g.arrow(E[0], E[1], E[0] + u[0] * bl, E[1] + u[1] * bl, { color: c.s1, width: 2.5, head: 8 });
  g.ctx.restore();
  g.rect(x0, y0, size, size, { stroke: c.line2, width: 1, fill: null });
  var rx = La.strip ? x0 + size + 12 : x0, ty = La.strip ? y0 + 12 : y0 + size + 18, small = La.strip || cw < 170, sz = small ? 11 : 12, lh = small ? 15 : 17, yEnd = La.strip ? La.top : g.h;
  function row(label, val, key, col) { if (ty > yEnd - 4) return; var lx = rx + 2; if (key) { g.line(lx, ty - 4, lx + 10, ty - 4, { color: key, width: 2.5, cap: "butt" }); lx += 15; } g.text(label, lx, ty, { size: sz, color: c.mute, halo: false }); g.text(val, cw - 6, ty, { size: sz, weight: 700, align: "right", color: col || c.text, halo: false }); ty += lh; }
  row(small ? "Wheel" : r.afterBall ? "Wheel now" : r.ballLabel ? "Wheel, at " + K.fix(tShow, 2) + " s" : "Wheel, now", rpmTxt(rpmNow) + " rpm", null, !r.noWarn && rpmNow < s.rpm * 0.995 ? c.warn : null);
  row(r.afterBall ? "Rim, ball " + r.afterBall : small ? "Rim" : "Rim speed", K.fix(rim / FT, 1) + " ft/s", c.s2);
  row(r.ballLabel ? r.ballLabel[1] : small ? "Ball" : "Ball leaves at", K.fix(r.shot.v / FT, 1) + " ft/s", c.s1);
  row("Spin", K.n(Math.abs(r.shot.spin) / RPM, 0) + " rpm");
  // Where the energy the wheel lost went: into the ball's flight, into its spin, and wasted.
  var vin0 = U.sp.vIn || 0, lin = 0.5 * U.mb * (r.shot.v * r.shot.v - vin0 * vin0), rot = 0.5 * U.Ib * r.shot.spin * r.shot.spin, tot = Math.max(r.shot.eWheel, lin + rot, 1e-9), lost = Math.max(0, tot - lin - rot);
  if (La.strip) {
    // On a phone: the bar and one line under it.
    var bwS = cw - rx - 6, xs = rx + 2, sg = [[lin, c.s1], [rot, c.s3], [lost, c.surface3]]; ty += 2;
    sg.forEach(function (q, n) { var wseg = q[0] / tot * bwS; g.rect(xs, ty, Math.max(0, wseg - (n < 2 ? 2 : 0)), 8, { fill: q[1], stroke: null }); xs += wseg; });
    if (ty + 24 < yEnd) g.text("wheel's " + K.fix(tot, 1) + " J: flight " + K.fix(lin, 1) + ", spin " + K.fix(rot, 1) + ", wasted " + K.fix(lost, 1), rx + 2, ty + 22, { size: 10.5, color: c.mute, halo: false });
  } else if (ty + lh * 4 + 16 < g.h) {
    ty += 6; g.text("The wheel gave up " + K.fix(tot, 1) + " J", x0 + 2, ty, { size: sz, color: c.text2, weight: 600, halo: false }); ty += 8;
    var bw = cw - 12, xx = x0 + 2, segs = [[lin, c.s1, "flight"], [rot, c.s3, "spin"], [lost, c.surface3, "wasted"]];
    segs.forEach(function (q, n) { var wseg = q[0] / tot * bw; g.rect(xx, ty, Math.max(0, wseg - (n < 2 ? 2 : 0)), 10, { fill: q[1], stroke: null }); xx += wseg; });
    ty += 26;
    segs.forEach(function (q) { if (ty > g.h - 4) return; g.rect(x0 + 2, ty - 9, 10, 10, { fill: q[1], stroke: null }); g.text(q[2], x0 + 17, ty, { size: sz, color: c.mute, halo: false }); g.text(K.fix(q[0], 1) + " J", cw - 6, ty, { size: sz, weight: 700, align: "right", halo: false }); ty += lh; });
  }
}
function wheelAt(r, s, t) {     // rpm of the wheel t seconds after the ball touches it
  if (t <= 0) return s.rpm; if (t < r.tc) return s.rpm + (r.shot.wAfter / RPM - s.rpm) * (t / r.tc);
  var rc = r.recov; return Math.min(s.rpm, F.interp(rc.t, rc.w, t - r.tc) / RPM);
}
function drawSide(g, s, r, t) {
  var c = g.c, tg = r.target, burst = s.view === "burst" && r.burst, V = sideView(g, s, r);
  var m = r.meet, hitState = burst ? (r.burst.hits === r.burst.shots.length ? "ok" : "miss") : m && m.hit ? "ok" : "miss";
  // The fan of every flight that scores, then the flight without air, behind everything else.
  if (!burst && r.aim && r.fanLo && r.fanHi) {
    var poly = r.fanLo.map(function (p) { return [V.X(p[1]), V.Y(p[2])]; }).concat(r.fanHi.slice().reverse().map(function (p) { return [V.X(p[1]), V.Y(p[2])]; }));
    g.ctx.globalAlpha = 0.16; g.poly(poly, { fill: c.ok, stroke: null }); g.ctx.globalAlpha = 1;
    var kx = lay(g).l, kyy = 33 + lay(g).top; g.ctx.globalAlpha = 0.3; g.rect(kx, kyy - 9, 14, 10, { fill: c.ok, stroke: null }); g.ctx.globalAlpha = 1;
    g.text(g.w > 520 ? "every wheel speed that scores, " + rpmTxt(r.rpmLo) + " to " + rpmTxt(r.rpmHi) + " rpm" : "scores from " + rpmTxt(r.rpmLo) + " to " + rpmTxt(r.rpmHi) + " rpm", kx + 19, kyy, { size: 11, color: c.text2 });
    g.circle(kx + 7, kyy + 11, 2.2, { fill: c.sheet, stroke: c.text, width: 1.25 }); g.text(g.w > 520 ? "a dot every tenth of a second" : "a dot each 0.1 s", kx + 19, kyy + 15, { size: 11, color: c.text2 });
  }
  if (!burst && s.cd > 0 && !(m && m.wall)) { pathLine(g, V, r.vac, { color: c.ghost, width: 1.25, dash: [5, 5] }); var ve = r.vac[Math.floor(r.vac.length * 0.78)]; if (ve && V.X(ve[1]) + (g.w > 520 ? 76 : 44) < g.w) g.text(g.w > 520 ? "with no air" : "no air", V.X(ve[1]) + 8, V.Y(ve[2]) - 4, { color: c.mute, size: 11 }); }
  drawTarget(g, V, r, hitState, s.tpreset === "hub26" && V.L(tg.w) > 50 && !burst ? "Hub" : "");
  drawRobot(g, V, s, r, 0);
  var tNow = t, rpmNow, phase;
  if (burst) {
    var B = r.burst, tB = B.t[B.t.length - 1]; phase = 1.01;
    if (t <= tB) rpmNow = F.interp(B.t, B.w, t) / RPM;
    else { if (!B.rec) B.rec = F.spin({ drive: r.U.drive, J: r.U.Iw, w0: B.w[B.w.length - 1], target: r.w, tmax: 8 }); rpmNow = Math.min(s.rpm, (t - tB >= B.rec.t[B.rec.t.length - 1] ? r.w : F.interp(B.rec.t, B.rec.w, t - tB)) / RPM); }
    var firstMissI = -1; B.shots.forEach(function (sh, i) { if (!sh.hit && firstMissI < 0) firstMissI = i; });
    var allDone = B.shots.every(function (sh) { return t - sh.t - r.tc > sh.pc.t[sh.pc.t.length - 1]; });
    B.shots.forEach(function (sh, i) {
      var tf = t - sh.t - r.tc; if (t - sh.t >= 0 && t - sh.t < r.tc) phase = (t - sh.t) / r.tc;
      if (tf < 0) return;
      var endT = sh.pc.t[sh.pc.t.length - 1], shown = sh.path.filter(function (p) { return p[0] <= tf; });
      pathLine(g, V, shown, { color: sh.hit ? c.ok : c.bad, width: tf > endT ? (sh.hit ? 2.25 : 1.25) : 2 });
      if (tf <= endT) { var bxN = V.X(F.interp(sh.pc.t, sh.pc.x, tf)), byN = V.Y(F.interp(sh.pc.t, sh.pc.y, tf)), brN = Math.max(3, V.L(tg.r)); g.ball(bxN, byN, brN, -spinK(r.w) * sh.spin * tf, {}); if (tf > 0.06) g.text(String(i + 1), bxN + brN + 3, byN - brN + 2, { size: 10.5, weight: 700, color: sh.hit ? c.ok : c.bad }); }
      else if (!sh.hit) { var e = sh.path[sh.path.length - 1]; g.circle(V.X(e[1]), V.Y(e[2]), 3.5, { fill: c.bad, stroke: null }); if (allDone && (g.w > 520 || i === firstMissI || i === B.shots.length - 1 || i === Math.round((firstMissI + B.shots.length - 1) / 2))) { var onFloor = e[2] < tg.r * 1.2, ny = V.Y(e[2]) + 4; if (Math.abs(ny - 4 - V.Y(tg.h)) < 9) ny = V.Y(tg.h) + 14; g.text(String(i + 1), V.X(e[1]) + (onFloor ? -8 : 8), onFloor ? V.Y(0) - 6 : ny, { align: onFloor ? "right" : "left", size: 10.5, weight: 700, color: c.bad, halo: !onFloor ? false : true }); } }
    });
    // While balls are in the air the count is of those that have arrived; a dot marks each one that went in.
    var inSoFar = 0; B.shots.forEach(function (sh) { var tfx = t - sh.t - r.tc, eT = sh.pc.t[sh.pc.t.length - 1]; if (sh.hit && tfx > eT) { inSoFar++; var e2 = sh.path[sh.path.length - 1]; g.circle(V.X(e2[1]), V.Y(e2[2]), 3, { fill: c.ok, stroke: null }); } });
    var bl = allDone ? r.burst.hits + " of " + r.burst.shots.length + (r.burst.hits === 1 ? " goes in" : " go in") : inSoFar + " of " + r.burst.shots.length + " in so far", blCol = !allDone ? c.text2 : hitState === "ok" ? c.ok : r.burst.hits * 2 < r.burst.shots.length ? c.bad : c.warn, inHub = tg.kind !== "front" && V.L(tg.w * 1.13) > g.textWidth(bl, { weight: 700 }) + 10 && V.L(tg.h) > 90;
    if (inHub) g.text(bl, V.X(tg.d), V.Y(tg.h * 0.34), { align: "center", weight: 700, color: blCol, halo: false });
    else if (g.w < 520 && tg.kind !== "front") g.text(bl, g.w - 10, V.Y(0) + 26, { align: "right", weight: 700, color: blCol });
    else g.text(bl, V.X(tg.d), V.Y(Math.max(tg.h, tg.kind === "front" ? tg.h + tg.w / 2 : 0)) - 12, { align: "center", weight: 700, color: blCol });
    K.chartNow("sh-bw", t);
  } else {
    var tf2 = t - r.tc, endT2 = r.pc.t[r.pc.t.length - 1]; phase = r.tc ? F.clamp(t / r.tc, 0, 1.01) : 1.01; rpmNow = wheelAt(r, s, t);
    pathLine(g, V, r.path, { color: c.text, width: 2 });
    // A dot every tenth of a second: close together where the ball is slow.
    for (var q = 0.1; q < endT2; q += 0.1) g.circle(V.X(F.interp(r.pc.t, r.pc.x, q)), V.Y(F.interp(r.pc.t, r.pc.y, q)), 2.2, { fill: c.sheet, stroke: c.text, width: 1.25 });
    var bt = F.clamp(tf2, 0, endT2), landed = tf2 >= endT2;
    var bxs = V.X(F.interp(r.pc.t, r.pc.x, bt)), bys = V.Y(F.interp(r.pc.t, r.pc.y, bt));
    // While the ball is in the air its speed rides along with it: it slows toward the top and picks up again.
    var flying = tf2 > 0 && !landed;
    if (flying && g.w > 420) { var pi = 0; while (pi < r.path.length - 1 && r.path[pi + 1][0] <= bt) pi++; g.text("ball now " + K.fix(Math.hypot(r.path[pi][3], r.path[pi][4]) / FT, 1) + " ft/s", lay(g).l, 17 + lay(g).top, { size: 12, weight: 700 }); }
    if (!(landed && m && m.hit)) g.ball(bxs, bys, Math.max(3.5, V.L(tg.r)), -spinK(r.w) * r.shot.spin * bt, {});
    // Aim handle and angle.
    var th = s.deg * Math.PI / 180, hx = V.X(0) + 46 * Math.cos(th), hy = V.Y(s.h0 * IN) - 46 * Math.sin(th);
    g.arc(V.X(0), V.Y(s.h0 * IN), 26, -th, 0, { color: c.mute, width: 1 }); g.line(V.X(0), V.Y(s.h0 * IN), V.X(0) + 34, V.Y(s.h0 * IN), { color: c.mute, width: 1 });
    g.text(K.fix(s.deg, 0) + "°", V.X(0) + 32, V.Y(s.h0 * IN) - 9, { color: c.text2, size: 11, weight: 600 });
    g.circle(hx, hy, 5, { fill: c.surface, stroke: c.accent, width: 2 });
    if (g.w > 520 && !K.playing(ID)) g.text("drag to aim", hx - 10, hy + 3, { align: "right", size: 10.5, color: c.accent });
    // Apex, entry and the verdict at the target.
    var ap = r.fl.apex, apOn = m && m.wall ? false : !m || !m.hit || ap[0] < m.x;
    if (apOn && !(flying && Math.hypot(bxs - V.X(ap[0]), bys - V.Y(ap[1])) < 46)) { g.line(V.X(ap[0]), V.Y(ap[1]) - 4, V.X(ap[0]), V.Y(ap[1]) - 16, { color: c.mute, width: 1 }); g.text((g.w > 520 ? "top of the arc, " : "top, ") + K.fix(ap[1] / FT, 1) + " ft up", V.X(ap[0]), V.Y(ap[1]) - 20, { align: "center", color: c.text2, size: 11, weight: 600 }); }
    var tyv = V.Y(tg.kind === "front" ? tg.h + tg.w / 2 + 0.3 : tg.h) - 12, label = flying ? "" : !m ? "does not reach" : m.wall ? "hits the front, " + inch(tg.h - m.y) + " under the rim" : m.hit ? "in, " + inch(m.room) + " to spare" : inch(m.miss) + (tg.kind === "top" ? (m.miss < 0 ? " short" : " long") : (m.miss < 0 ? " low" : " high"));
    var lw2 = g.textWidth(label, { weight: 700 });
    if (tg.kind !== "front" && V.L(tg.w * 1.13) > lw2 + 10 && V.L(tg.h) > 90) g.text(label, V.X(tg.d), V.Y(tg.h * 0.56), { align: "center", weight: 700, color: m && m.hit ? c.ok : c.warn, halo: false });
    else if (g.w < 520 && tg.kind !== "front") { if (m && m.hit && !flying) label = "in, " + inch(m.room) + " spare"; g.text(label, g.w - 10, V.Y(0) + 26, { align: "right", weight: 700, color: m && m.hit ? c.ok : c.warn }); }
    else g.text(label, Math.min(V.X(tg.d), g.w - 8 - lw2 / 2), Math.max(14, tyv), { align: "center", weight: 700, color: m && m.hit ? c.ok : c.warn });
    K.chartNow("sh-w", t <= r.tc + (r.recov.time < Infinity ? r.recov.time : 1) + 0.25 ? t : null);
  }
  // Distance along the floor.
  g.dim(V.X(0), V.Y(0) + 20, V.X(tg.d), V.Y(0) + 20, K.fix(s.dist, 1) + " ft", 0, { side: "below" });
  // In a burst the close-up follows the ball that left most recently, so its numbers go with the wheel speed shown.
  var rC = r;
  if (burst) { var curI = -1; r.burst.shots.forEach(function (sh, i) { if (t >= sh.t) curI = i; }); if (curI >= 0) { var cs = r.burst.shots[curI]; rC = Object.assign({}, r, { ballLabel: ["Ball " + (curI + 1), "Ball " + (curI + 1) + " left at"], afterBall: curI + 1, wThen: cs.wBefore, shot: Object.assign({}, r.shot, { v: cs.v, spin: cs.spin, eWheel: 0.5 * r.U.Iw * (cs.wBefore * cs.wBefore - cs.wAfter * cs.wAfter) }) }); } }
  closeUp(g, s, rC, phase, rpmNow, tNow);
}
function hit(x, y, s) {
  var V = last.V; if (!V) return "";
  if (s.view === "move") { var vx = V.X(s.vacross * FT * 0.35), vy = V.Y(-s.dist * FT + s.vtoward * FT * 0.35); return Math.hypot(x - vx, y - vy) < 22 ? "vel" : ""; }
  if (s.view === "map") return "";
  var th = s.deg * Math.PI / 180, hx = V.X(0) + 46 * Math.cos(th), hy = V.Y(s.h0 * IN) - 46 * Math.sin(th);
  if (s.view === "shot" && Math.hypot(x - hx, y - hy) < 20) return "aim";
  var tg = { d: s.dist * FT, w: s.tw * IN, h: s.th * IN };
  if (Math.abs(x - V.X(tg.d)) < Math.max(24, V.L(tg.w * 0.6)) && y > V.Y(tg.h + tg.w) - 10) return "target";
  return "";
}

/* ---------- Drawing: every distance ---------- */
function drawMap(g, s, r, t) {
  var c = g.c, mp = r.map, good = mp ? mp.good : [];
  if (!good.length) { g.text("No distance in this range can be scored from.", 16, 28, { color: c.mute }); return; }
  var U = r.U, far = good[good.length - 1], near = good[0], dnow = near.d + (far.d - near.d) * F.clamp(t / 6, 0, 1);
  var ds = good.map(function (x) { return x.d; }), degNow = F.interp(ds, good.map(function (x) { return x.deg; }), dnow), vNow = F.interp(ds, good.map(function (x) { return x.v; }), dnow), rpmNow = M.rpmFor(U, vNow);
  var apex = 0, flights = good.filter(function (x, i) { return i % 3 === 0 || i === good.length - 1; }).map(function (x) { var f = F.fly(Object.assign({}, U.fb, { deg: x.deg, v: x.v, spin: U.spinPer * x.v, dt: 0.006 })); apex = Math.max(apex, f.apex[1]); var tg = Object.assign({}, r.target, { d: x.d * FT }); return { row: x, pts: M.cut(f.pts, tg, F.meet(f.pts, tg)) }; });
  var tgNow = Object.assign({}, r.target, { d: dnow * FT }), fNow = F.fly(Object.assign({}, U.fb, { deg: degNow, v: vNow, spin: U.spinPer * vNow, dt: 0.004 })), ptsNow = M.cut(fNow.pts, tgNow, F.meet(fNow.pts, tgNow));
  // The target stays put at the right; the robot backs away from it.
  var box = { x0: -far.d * FT - 0.95, x1: r.target.w * 0.6 + 0.45, y0: 0, y1: Math.max(apex, fNow.apex[1], r.target.h) + 0.45 };
  var La = lay(g), V = g.view(box, { l: La.l, r: 12, t: 24 + La.top, b: 50 }); last.V = V; last.box = box;
  var step = V.k * FT >= 13 ? FT : 5 * FT; g.grid(V, step, g.w > 560 ? (step === FT ? "1 ft squares" : "5 ft squares") : ""); g.ground(V.Y(0), La.x0, g.w);
  if (g.w <= 560) g.text((step === FT ? "1 ft squares" : "5 ft squares") + "; closer to the target on the right", 8, g.h - 8, { color: c.mute, size: 10.5 });
  var R0 = Object.assign({}, r, { target: Object.assign({}, r.target, { d: 0 }) });
  drawTarget(g, V, R0, "ok", s.tpreset === "hub26" && V.L(r.target.w) > 30 ? "Hub" : "");
  flights.slice().reverse().forEach(function (f) { pathLine(g, V, f.pts, { color: c.ghost, width: 1.25 }, -f.row.d * FT); });
  // An even scale of the robot's distance from the target, counted from the target's middle.
  var tstep = [1, 2, 5, 10].filter(function (q) { return V.L(q * FT) >= (g.w > 520 ? 46 : 38); })[0] || 10;
  for (var td = tstep; td <= far.d + 0.01; td += tstep) { var tx = V.X(-td * FT); g.line(tx, V.Y(0), tx, V.Y(0) + 6, { color: c.mute, width: 1 }); g.text(td + " ft", tx, V.Y(0) + 24, { align: "center", color: c.mute, size: 11 }); }
  if (g.w > 520) g.text("the robot's distance from the target: closer to the right", V.X(0) - 4, V.Y(0) + 38, { align: "right", color: c.mute, size: 11 });
  var sNow = Object.assign({}, s, { deg: degNow });
  drawRobot(g, V, sNow, r, -dnow * FT);
  pathLine(g, V, ptsNow, { color: c.text, width: 2 }, -dnow * FT);
  var lab = K.fix(dnow, 1) + " ft: " + rpmTxt(rpmNow) + " rpm" + (s.hood === "adj" ? ", " + K.fix(degNow, 0) + "°" : "");
  // Between two tested distances the sweep shows filled-in speeds: say so, since the table has no such row.
  var between = Math.min.apply(null, good.map(function (x) { return Math.abs(x.d - dnow); })) > 0.05;
  var labX = F.clamp(V.X(-dnow * FT + fNow.apex[0]), La.l + g.textWidth(lab, { weight: 700 }) / 2, g.w - 8 - g.textWidth(lab, { weight: 700 }) / 2), labY = Math.max(14 + La.top + (between ? 14 : 0), V.Y(fNow.apex[1]) - 10);
  var lab2 = "filled in between tested distances", lw = Math.max(g.textWidth(lab, { weight: 700 }), between ? g.textWidth(lab2, { size: 10.5 }) : 0) + 12, lx2 = between ? F.clamp(labX, La.l + lw / 2, g.w - 8 - lw / 2) : labX;
  g.rect(lx2 - lw / 2, labY - (between ? 27 : 13), lw, between ? 33 : 18, { fill: c.sheet, stroke: null });
  g.text(lab, lx2, labY - (between ? 14 : 0), { align: "center", weight: 700, halo: false });
  if (between) g.text(lab2, lx2, labY, { align: "center", color: c.mute, size: 10.5, halo: false });
  K.chartNow("sh-m", dnow); K.chartNow("sh-a", dnow); K.chartNow("sh-e", dnow);
  // The wheel gives up the same share of its speed at any speed, so the energy it gives up goes with speed squared.
  var wN = rpmNow * RPM, keepW = r.w > 0 ? r.shot.wAfter / r.w : 1;
  var rNow = Object.assign({}, r, { noWarn: true, shot: Object.assign({}, r.shot, { v: vNow, spin: U.spinPer * vNow, eWheel: 0.5 * U.Iw * wN * wN * (1 - keepW * keepW) }), w: wN });
  closeUp(g, sNow, rNow, 1.01, rpmNow, t);
}

/* ---------- Drawing: while driving, from above ---------- */
function drawMove(g, s, r, t) {
  var c = g.c, mv = r.move, d = r.target.d, tw = r.target.w;
  var half = Math.max(d * 0.55, 2.2), box = hold && hold.box ? hold.box : { x0: -half, x1: half, y0: -d - 1.1, y1: tw / 2 + 0.7 };
  var phoneM = g.w < 520, insH = phoneM ? Math.min(170, g.w * 0.46) * 0.56 + 30 : 0;       // on a phone the side view sits under the scene
  var V = g.view(box, { l: 12, r: 12, t: phoneM ? 98 : 22, b: 12 + insH }); last.V = V; last.box = box;
  var step = V.k * FT >= 13 ? FT : 5 * FT; g.grid(V, step, g.w > 520 ? (step === FT ? "1 ft squares, seen from above" : "5 ft squares, seen from above") : "");
  if (g.w <= 520) g.text((step === FT ? "1 ft squares" : "5 ft squares") + ", from above", g.w - 8, 16, { align: "right", color: c.mute, size: 10.5 });
  // The target: a hexagon, as the 2026 hub's opening is.
  var hex = []; for (var k = 0; k < 6; k++) hex.push([V.X(tw / 2 * Math.cos(k * Math.PI / 3)), V.Y(tw / 2 * Math.sin(k * Math.PI / 3))]);
  g.poly(hex, { fill: c.part, stroke: c.partLine, width: 1.5 });
  if (g.w > 520) g.text(s.tpreset === "hub26" ? "Hub" : "target", V.X(tw / 2) + 6, V.Y(-tw * 0.3), { align: "left", color: c.text2, size: 11, weight: 600 });
  else g.text(s.tpreset === "hub26" ? "Hub" : "target", V.X(0), V.Y(tw / 2) - 6, { align: "center", color: c.text2, size: 11, weight: 600 });
  var vx = s.vacross * FT, vy = s.vtoward * FT, start = [0, -d];
  if (!mv || mv.out || !mv.lead) { robotTop(g, V, start[0], start[1], Math.PI / 2, c); g.text(!mv ? "Out of range from here." : "Too fast to score from here.", V.X(0), V.Y(-d / 2), { align: "center", color: c.warn, weight: 700 }); return; }
  var L = mv.lead, tl = F.clamp(t, 0, L.time), ts = F.clamp(t, 0, mv.still.time), tr = F.clamp(t, 0, Math.max(L.time, mv.still.time));
  var lead = L.leadDeg * Math.PI / 180, aim = Math.PI / 2 - lead;                 // the launcher's direction on the field (0 = +x)
  var hv = L.d / L.time, hvS = d / mv.still.time;
  // Aimed straight at it, the ball still carries the robot's motion and misses.
  var noLead = [vx * mv.still.time, -d + hvS * mv.still.time + vy * mv.still.time];
  g.line(V.X(0), V.Y(-d), V.X(noLead[0]), V.Y(noLead[1]), { color: c.warn, width: 1.5, dash: [5, 5] });
  g.line(V.X(noLead[0]) - 5, V.Y(noLead[1]) - 5, V.X(noLead[0]) + 5, V.Y(noLead[1]) + 5, { color: c.warn, width: 2 }); g.line(V.X(noLead[0]) - 5, V.Y(noLead[1]) + 5, V.X(noLead[0]) + 5, V.Y(noLead[1]) - 5, { color: c.warn, width: 2 });
  var nlT = "misses by " + K.fix(mv.missNoLead / FT, 1) + " ft", nlR = V.X(noLead[0]) + 10 + g.textWidth(nlT, { weight: 600, size: 11 }) < g.w - 6;
  g.text(nlT, V.X(noLead[0]) + (nlR ? 10 : -10), V.Y(noLead[1]) + 4, { align: nlR ? "left" : "right", color: c.warn, size: 11, weight: 600 });
  var ky = g.w > 520 ? 40 : 36; (g.w > 520 ? [["where the ball goes", c.ok, null], ["if aimed straight, at the standing shot's speed", c.warn, [5, 5]], ["where the launcher points", c.mute, [2, 4]]] : [["where the ball goes", c.ok, null], ["if aimed straight, at the standing shot's speed", c.warn, [5, 5]], ["where the launcher points", c.mute, [2, 4]]]).forEach(function (q) { g.line(12, ky - 4, 34, ky - 4, { color: q[1], width: 2, dash: q[2], cap: "butt" }); g.text(q[0], 40, ky, { size: 11, color: c.text2 }); ky += 16; });
  // With the lead: the launcher points off to one side and the ball arrives.
  g.line(V.X(0), V.Y(-d), V.X(0), V.Y(0), { color: c.ok, width: 2 });
  g.line(V.X(0), V.Y(-d), V.X(L.d * Math.cos(aim)), V.Y(-d + L.d * Math.sin(aim)), { color: c.mute, width: 1, dash: [2, 4] });
  if (Math.abs(L.leadDeg) > 0.3) { var apx = V.X(L.d * Math.cos(aim)), apy = V.Y(-d + L.d * Math.sin(aim)); g.circle(apx, apy, 4, { fill: c.sheet, stroke: c.mute, width: 1.5 }); g.text("aim point", apx + (lead < 0 ? -8 : 8), apy - 8, { align: lead < 0 ? "right" : "left", color: c.mute, size: 11 }); }
  if (Math.abs(L.leadDeg) > 0.3) { var ar = Math.min(64, V.L(d) * 0.3), a0 = -Math.PI / 2, a1 = -aim; g.arc(V.X(0), V.Y(-d), ar, Math.min(a0, a1), Math.max(a0, a1), { color: c.text2, width: 1.25 }); var am = (a0 + a1) / 2; g.text(K.fix(Math.abs(L.leadDeg), 0) + "°", V.X(0) + (ar + 12) * Math.cos(am), V.Y(-d) + (ar + 12) * Math.sin(am), { align: "center", base: "middle", size: 12, weight: 700 }); }
  // The robot, where it is now, and its speed arrow (drag its tip).
  var rx = vx * tr, ry = -d + vy * tr;
  if (tr > 0.02) { robotTop(g, V, 0, -d, aim, c, true); if (Math.hypot(rx, ry + d) * V.k > 70) g.text("released here", V.X(-0.42) - 8, V.Y(-d - 0.3), { align: "right", color: c.mute, size: 11 }); }
  robotTop(g, V, rx, ry, aim, c);
  g.text(tr > 0.02 ? "robot now" : "robot", V.X(rx), V.Y(ry - 0.42) + 14, { align: "center", color: c.text2, size: 11, weight: 600 });
  g.arrow(V.X(0), V.Y(-d), V.X(vx * 0.35), V.Y(-d + vy * 0.35), { color: c.accent, width: 2.5, head: 9 });
  g.circle(V.X(vx * 0.35), V.Y(-d + vy * 0.35), 5, { fill: c.surface, stroke: c.accent, width: 2 });
  g.text("driving " + K.fix(Math.hypot(s.vtoward, s.vacross), 1) + " ft/s" + [Math.abs(s.vacross) > 0.01 ? (s.vacross > 0 ? " to its right" : " to its left") : "", Math.abs(s.vtoward) > 0.01 ? (s.vtoward > 0 ? " toward the target" : " backing away") : ""].filter(Boolean).join(" and"), V.X(0), V.Y(-d - 0.42) + 30, { color: c.accent, weight: 700, size: 11, align: "center" });
  // The two balls.
  var rb = Math.max(3.5, V.L(r.target.r));
  g.ball(V.X(vx * ts), V.Y(-d + (hvS + vy) * ts), rb, 0, { fill: c.sheet, stroke: c.warn });
  var e = [hv * Math.cos(aim) + vx, hv * Math.sin(aim) + vy];
  if (tl < L.time) g.ball(V.X(e[0] * tl), V.Y(-d + e[1] * tl), rb, 0, {});
  g.text(tl >= L.time ? (mv.side && mv.side.meet && mv.side.meet.hit ? "in, " + inch(mv.side.meet.room) + " to spare" : "arrives") : "", V.X(0), V.Y(tw / 2) - (g.w > 520 ? 8 : 24), { align: "center", color: c.ok, weight: 700 });
  // Inset: the same shot from the side, so it is plain that it still goes in.
  // On a phone the side view is too small to read, so the phone gets its answer as a line of words.
  if (mv.side) {
    var big = g.w > 520, iw = big ? F.clamp(g.w * 0.3, 220, 250) : Math.min(250, g.w - 20), ih = big ? iw * 0.62 : insH - 18, top2 = big ? 46 : 30, ix = 10, iy = g.h - ih - 10, sd = mv.side, tgs = sd.target;
    g.rect(ix, iy, iw, ih, { fill: c.surface, stroke: c.line2, width: 1 });
    var k2 = Math.min((iw - 20) / (tgs.d + tgs.w * 0.7 + 0.6), (ih - top2) / (Math.max(sd.apex[1], tgs.h) + 0.2)), X2 = function (x) { return ix + 12 + (x + 0.3) * k2; }, Y2 = function (y) { return iy + ih - 8 - y * k2; };
    g.line(ix + 4, Y2(0), ix + iw - 4, Y2(0), { color: c.text2, width: 1 });
    var o2 = tgs.w * 0.565; g.poly([[X2(tgs.d - o2), Y2(0)], [X2(tgs.d - o2), Y2(tgs.h)], [X2(tgs.d - tgs.w / 2), Y2(tgs.h)], [X2(tgs.d - tgs.w * 0.3), Y2(tgs.h * 0.72)], [X2(tgs.d + tgs.w * 0.3), Y2(tgs.h * 0.72)], [X2(tgs.d + tgs.w / 2), Y2(tgs.h)], [X2(tgs.d + o2), Y2(tgs.h)], [X2(tgs.d + o2), Y2(0)]], { fill: c.part, stroke: c.partLine, width: 1 });
    g.path(sd.pts.map(function (p) { return [X2(p[1]), Y2(p[2])]; }), { color: sd.meet && sd.meet.hit ? c.ok : c.warn, width: 2 });
    var fr = F.clamp(tl / L.time, 0, 1), pi2 = Math.min(sd.pts.length - 1, Math.round(fr * (sd.pts.length - 1))); if (fr < 1) g.ball(X2(sd.pts[pi2][1]), Y2(sd.pts[pi2][2]), Math.max(3, tgs.r * k2), 0, {});
    // Two short lines on a laptop (one long line ran out of the box); one on a phone.
    var res2 = sd.meet && sd.meet.hit ? "in, " + inch(sd.meet.room) + (big ? " to spare" : " spare") : "misses", col2 = sd.meet && sd.meet.hit ? c.ok : c.warn;
    if (big) { g.text("From the side, as a " + K.fix(L.d / FT, 1) + " ft shot", ix + 8, iy + 15, { size: 11, weight: 700, color: c.text, halo: false }); g.text(rpmTxt(mv.rpm) + " rpm: " + res2, ix + 8, iy + 30, { size: 11, weight: 700, color: col2, halo: false }); }
    else g.text(K.fix(L.d / FT, 1) + " ft standing shot: " + res2.replace(" spare", " to spare"), ix + 8, iy + 15, { size: 11, weight: 700, color: col2, halo: false });
  }
}
function robotTop(g, V, x, y, ang, c, ghost) {
  var h = 0.42, pts = [[-h, -h], [h, -h], [h, h], [-h, h]].map(function (p) { return [V.X(x + p[0]), V.Y(y + p[1])]; });
  if (ghost) { g.poly(pts, { stroke: c.ghost, width: 1, dash: [3, 3], fill: null, close: true }); return; }
  g.poly(pts, { fill: c.part, stroke: c.accent, width: 3 });
  g.arrow(V.X(x), V.Y(y), V.X(x + 0.6 * Math.cos(ang)), V.Y(y + 0.6 * Math.sin(ang)), { color: c.text, width: 2, head: 7 });
}
})(typeof window !== "undefined" ? window : this);
