/* Tools: Intake (#tool-intake). Roller surface speed against the speed the robot drives onto a game piece. The
   drawing is a side view to scale: the robot drives onto a ball, and the roller pulls it in (or the robot pushes it
   along the floor when the roller is too slow). */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");

/* ---------- The maths (SI units, no page code) ---------- */
var M = {};
/* o: { drive (F.drive), V (battery volts), rollerR (m), contact: "plate" | "both", driveV (m/s), travel (m) }.
   The roller runs near free speed (it carries almost no load until it grips a piece). A piece pinched between a
   roller and a fixed plate rolls on the plate, so its centre moves at half the roller's surface speed; between two
   moving surfaces it moves at the full speed. */
M.speeds = function (o) {
  var w = o.drive.freeSpeed(o.V), surface = w * o.rollerR, piece = surface * (o.contact === "both" ? 1 : 0.5);
  var out = { w: w, rpm: w / F.RPM, surface: surface, piece: piece };
  out.surfRatio = o.driveV > 0 ? surface / o.driveV : Infinity;
  out.pieceRatio = o.driveV > 0 ? piece / o.driveV : Infinity;
  out.time = piece > 0 ? o.travel / piece : Infinity;
  out.push = o.driveV - piece;                                    // + : the robot shoves the piece along the floor
  out.force = o.drive.at(0, o.V, 1).torque / o.rollerR;             // N at the roller surface, at the current limit
  // The reduction that gives a surface speed of exactly twice the driving speed.
  var m = o.drive.motor, free = m.free * o.V / 12;
  out.ratio2x = o.driveV > 0 ? free / (2 * o.driveV / o.rollerR) : Infinity;
  return out;
};

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The page ---------- */
var K = D.calc, ID = "tool-intake", FT = F.FT, IN = F.IN;
var TH = 35 * Math.PI / 180;             // the ramp's slope in the drawing
function fts(v) { return K.fix(v / FT, 1); }

/* The drawing's geometry in inches, in the robot's frame: x forward from the bumper face, y up from the floor.
   The ball's centre runs along a path: along the floor from where the roller first touches it, then up the ramp. */
function geom(s) {
  var Rb = s.piece / 2, Rr = s.roller / 2, sq = Math.min(0.5, Rb * 0.2), bTop = 6.5;
  var ux = -Math.cos(TH), uy = Math.sin(TH), nx = Math.sin(TH), ny = Math.cos(TH);
  var lipY = Rb * (1 - Math.cos(TH)), xLip = (bTop + 1 - lipY) / Math.tan(TH);
  var P0 = [xLip + Rb * nx, Rb];
  var C = [P0[0] + (Rb + Rr - sq) * nx, P0[1] + (Rb + Rr - sq) * ny];
  var dy = C[1] - Rb, xc = C[0] + Math.sqrt(Math.max(0, (Rb + Rr) * (Rb + Rr) - dy * dy));   // ball centre at first touch
  var floorSeg = xc - P0[0], ramp = Math.max(0, s.travel - floorSeg);
  return { Rb: Rb, Rr: Rr, bTop: bTop, u: [ux, uy], n: [nx, ny], lip: [xLip, lipY], P0: P0, C: C, xc: xc, floorSeg: floorSeg, ramp: ramp,
    at: function (d) {                     // ball centre after travelling d inches into the intake
      if (d <= floorSeg) return [xc - d, Rb];
      var k = Math.min(d - floorSeg, ramp); return [P0[0] + ux * k, P0[1] + uy * k];
    } };
}

K.tool({
  id: ID,
  // Reduction 2.5 (the lead's choice, 2026-11-18): the page opens on an intake that works; 3:1 at 12 ft/s does not.
  defaults: { roller: 2, motor: "kraken44", motors: 1, ratio: 2.5, statorA: 30, eff: 90, drive: 12, piece: 5.91, travel: 14, contact: "plate", V: 12 },
  stage: { ratio: 2.6, narrow: 1.6, label: "Side view to scale: the front of the robot with its intake roller, driving onto a ball on the floor." },
  autoplay: true, speed: 0.25,

  compute: function (s) {
    var dr = K.driveOf(s), vd = s.drive * FT;
    var r = M.speeds({ drive: dr, V: s.V, rollerR: s.roller * IN / 2, contact: s.contact, driveV: vd, travel: s.travel * IN });
    r.vd = vd; r.G = geom(s);
    // The animation: the robot closes a gap, the roller touches the ball, the ball goes through.
    r.gap = vd > 0.05 ? F.clamp(vd / IN * 0.2, 4, 28) : 0;
    r.tc = vd > 0.05 ? r.gap * IN / vd : 0;
    var state = vd <= 0.05 ? "ok" : r.piece < vd ? "bad" : r.surfRatio >= 2 - 1e-9 ? "ok" : "warn";
    r.state = state;
    // Too slow: the piece stays at the mouth and the robot shoves it along the floor, so show a little longer.
    r.dur = Math.min(8, r.tc + (state === "bad" ? 0.45 : (isFinite(r.time) ? r.time : 4) + 0.35));
    return r;
  },

  controls: function (s) {
    return K.group(ID, "roll", "Roller", K.num(ID, "roller", "Roller diameter", { unit: "in", min: 0.5, max: 6, step: 0.125, tip: "Outside diameter where it touches the piece, with any compliant wheels or tubing on it." }) +
        K.seg(ID, "contact", "The piece is pinched between", [["plate", "Roller against a plate"], ["both", "Rollers on both sides"]], { tip: "Against a fixed plate the piece rolls, so it moves at half the roller's surface speed. Between two driven rollers, or a roller and a moving belt, it moves at the full speed." })) +
      K.group(ID, "motor", "Motor", K.motorFields(ID, { slider: true, ratioMax: 20 })) +
      K.group(ID, "drive", "Driving onto it", K.num(ID, "drive", "Robot speed toward the piece", { unit: "ft/s", min: 0, max: 20, step: 0.5, slider: true, tip: "How fast the driver comes onto a piece. Full speed for most swerve robots is 14 to 17 ft/s." })) +
      K.group(ID, "piece", "Game piece", K.num(ID, "piece", "Piece diameter", { unit: "in", min: 2, max: 16, step: 0.01, tip: "5.91 in is the 2026 ball." }) +
        K.num(ID, "travel", "Travel through the intake", { unit: "in", min: 2, max: 60, step: 0.5, tip: "From where the roller first touches the piece to where the robot holds it." })) +
      K.group(ID, "adv", "Fine tuning", K.num(ID, "V", "Battery voltage", { unit: "V", min: 8, max: 13, step: 0.1, tip: "The roller's free speed is in proportion to it. Mid-match, 11 to 12 V." }), true);
  },

  outs: function (s, r) {
    var vd = r.vd, text;
    if (r.state === "ok" && vd <= 0.05) text = "The robot is standing still, so the piece comes in at " + fts(r.piece) + " ft/s.";
    else if (r.state === "bad") text = "The robot drives onto the piece faster than the roller pulls it in (" + fts(r.piece) + " against " + fts(vd) + " ft/s), so it shoves the piece along the floor before the roller has it. Expect the piece to bounce away or come in late and hard. A reduction of " + K.fix(r.ratio2x, 2) + ":1 gives twice the drive speed.";
    else if (r.state === "ok") text = "The roller runs " + K.fix(r.surfRatio, 1) + " times the drive speed, so the piece comes in at " + fts(r.piece) + " ft/s, faster than the robot drives onto it.";
    else text = "The piece comes in a little faster than the robot drives (" + fts(r.piece) + " against " + fts(vd) + " ft/s), but the roller runs only " + K.fix(r.surfRatio, 1) + " times the drive speed. Teams aim for about 2 (a rule of thumb): " + K.fix(r.ratio2x, 2) + ":1 would do it.";
    var pr = isFinite(r.pieceRatio) ? K.fix(r.pieceRatio, 2) + " times the drive speed" : "robot standing still";
    return K.verdict(r.state, text) + K.outs([
      { k: "Roller surface speed", v: fts(r.surface), u: "ft/s", sub: K.fix(r.surface, 2) + " m/s, " + K.n(r.rpm, 0) + " rpm", tip: "Roller radius times roller speed. The roller turns at about free speed until it grips a piece." },
      { k: "Piece speed", v: fts(r.piece), u: "ft/s", sub: pr, state: r.state === "bad" ? "bad" : "" },
      { k: "Surface to drive speed", v: isFinite(r.surfRatio) ? K.fix(r.surfRatio, 2) : "–", u: "×", sub: "aim for about 2 (rule of thumb)", state: r.state === "ok" ? "ok" : r.state, tip: "Roller surface speed divided by the robot's speed toward the piece." },
      { k: "Time to pass through", v: K.fix(r.time, 2), u: "s", sub: s.travel + " in at the piece speed" },
      { k: "Grip force", v: K.n(r.force / F.LBF, 1), u: "lbf", sub: "at the roller surface, at " + s.statorA + " A", tip: "The most the roller can pull on the piece before the current limit stops it. The pinch also needs enough squeeze for the roller not to slip." },
      { k: "Reduction for 2×", v: isFinite(r.ratio2x) ? K.fix(r.ratio2x, 2) : "–", u: ": 1", sub: "surface speed twice the drive speed" }
    ]);
  },

  more: function (s, r) {
    var vd = r.vd, hi = Math.max(10, s.ratio * 1.5, isFinite(r.ratio2x) ? r.ratio2x * 1.3 : 0), lo = 1;
    var ymax = Math.max(2.6 * vd / FT, r.surface / FT * 1.15, 5);
    function cut(v) { return v <= ymax ? v : NaN; }      // points above the chart's top are left out, not drawn outside it
    function at(G, dia) { return M.speeds({ drive: F.drive({ motor: s.motor, n: s.motors, ratio: G, eff: s.eff / 100, statorA: s.statorA }), V: s.V, rollerR: dia * IN / 2, contact: s.contact, driveV: vd, travel: s.travel * IN }); }
    var pts = [], surf = [], dp = [], ds = [], i, q;
    for (i = 0; i <= 80; i++) { var G = lo + (hi - lo) * i / 80; q = at(G, s.roller); pts.push([G, cut(q.piece / FT)]); surf.push([G, cut(q.surface / FT)]); }
    for (i = 0; i <= 60; i++) { var dia = 0.5 + 3.5 * i / 60; q = at(s.ratio, dia); dp.push([dia, cut(q.piece / FT)]); ds.push([dia, cut(q.surface / FT)]); }
    var hl = vd > 0.05 ? [{ y: vd / FT, label: "drive speed" }, { y: 2 * vd / FT, label: "2 × drive speed" }] : [];
    var y = { label: "ft/s", unit: "ft/s", min: 0, max: ymax };
    var chart = '<div class="chartrow">' +
      K.chart({ id: "int-r", title: "Speeds for other reductions", x: { label: "reduction (: 1)", name: "Reduction", min: lo, max: hi }, y: y,
        series: [{ name: "Piece", pts: pts, color: 1 }, { name: "Roller surface", pts: surf, color: 2, dash: true }], hlines: hl, dots: [{ x: s.ratio, y: r.piece / FT, label: "now" }] }) +
      K.chart({ id: "int-d", title: "Speeds for other roller diameters", x: { label: "roller diameter (in)", name: "Diameter", unit: "in", min: 0.5, max: 4 }, y: y,
        series: [{ name: "Piece", pts: dp, color: 1 }, { name: "Roller surface", pts: ds, color: 2, dash: true }], hlines: hl, dots: s.roller <= 4 ? [{ x: s.roller, y: r.piece / FT, label: "now" }] : [] }) + "</div>";
    return chart + K.notes(
      "<p>The roller turns at about its free speed until it grips a piece, so its surface moves at:</p>" +
      '<p class="eq">surface speed = roller radius × motor free speed × (battery ÷ 12 V) ÷ reduction</p>' +
      "<p>A piece pinched between the roller and a fixed plate rolls along the plate. Its bottom stays still on the plate and its top moves with the roller, so its centre moves at half the surface speed. Between two moving surfaces (two rollers, or a roller and a belt) it moves at the full surface speed.</p>" +
      '<p class="eq">piece speed = surface speed × ½ (against a plate) or × 1 (rollers on both sides)</p>' +
      '<p class="eq">time to pass through = travel ÷ piece speed</p>' +
      '<p class="eq">grip force = output torque at the current limit ÷ roller radius</p>' +
      "<p>In the robot's frame, the floor brings the piece toward the intake at the driving speed. If the roller takes it in slower than that, the piece cannot get out of the way: the robot shoves it along the floor until it bounces off or wedges. The rule of thumb many teams use is a roller surface speed of about twice the drive speed. That is a rule of thumb from experience, not a law: it leaves margin for the roller slowing when it grips, for the piece slipping on the roller, and for a driver coming in fast.</p>" +
      "<p>When the piece comes in slower than the floor brings it, the drawing shows it shoved along the floor at the robot's speed. Real pieces do a mix of things then: bounce off, wedge, or come in late and hard.</p>" +
      "<p>Left out: the roller slowing under load, slip between roller and piece, the squeeze the piece needs, and the piece bouncing. The drawing's ramp angle (35°) and roller position are a sketch of a typical over-the-bumper intake; only the sizes and speeds come from your numbers.</p>");
  },

  duration: function (s, r) { return r && r.dur || 2; },

  draw: function (g, s, r, t) {
    var c = g.c, G = r.G, Rb = G.Rb, Rr = G.Rr, vd = r.vd / IN, vp = r.piece / IN;   // inches per second
    var ballX0 = G.xc + r.gap;                         // where the ball sits at first, in the robot's frame
    var end = G.at(s.travel), top = Math.max(G.C[1] + Rr, end[1] + Rb, 12) + 3;
    var V = g.view({ x0: -15, x1: ballX0 + Rb + 3, y0: -2, y1: top }, { l: 8, r: 8, t: 26, b: 8 }, "middle");
    var step = V.k >= 7 ? 1 : 6;
    g.grid(V, step, g.w > 520 ? (step === 1 ? "1 in squares" : "6 in squares") : "");
    function P(p) { return [V.X(p[0]), V.Y(p[1])]; }
    var fy = V.Y(0), shift = vd * t;                   // the floor moves back under the robot
    // Floor, with marks every 6 in that move, and the spot where the piece started.
    g.line(0, fy, g.w, fy, { color: c.text2, width: 1.5 });
    var x0w = V.ux(0), x1w = V.ux(g.w);
    for (var m = Math.floor((x0w + shift) / 6) * 6; m - shift < x1w; m += 6) { var mx = V.X(m - shift); g.line(mx, fy, mx - 6, fy + 7, { color: c.line2, width: 1 }); }
    var spot = V.X(ballX0 - shift); g.line(spot, fy - 4, spot, fy + 6, { color: c.mute, width: 1.5 });
    if (spot > 30 && spot < g.w - 30) g.text("start spot", spot, fy + 18, { align: "center", color: c.mute, size: 11 });
    // Where the ball is: on the floor at rest until the roller touches it, then along the path at the piece speed.
    var jam = r.state === "bad";
    var d = t <= r.tc ? -1 : jam ? 0 : Math.min(s.travel, (t - r.tc) * vp), bp = d < 0 ? [ballX0 - vd * t, Rb] : G.at(d), inside = d >= s.travel;
    // The robot: frame rail, wheel, bumper, side plate of the intake.
    var wa = vd * t / 2;
    g.rect(V.X(-40), V.Y(4), V.L(36.5), V.L(2), { fill: c.part, stroke: c.partLine, width: 1 });
    g.wheel(V.X(-8), V.Y(2), V.L(2), wa, { spokes: 5 });
    g.rect(V.X(-3.5), V.Y(G.bTop), V.L(3.5), V.L(G.bTop - 1.5), { fill: c.s1, stroke: null, radius: V.L(0.8) });
    g.text("bumper", V.X(-1.75), V.Y(G.bTop) - 6, { align: "center", color: c.mute, size: 11 });
    // A dashed outline for where the piece ends up.
    g.rect(V.X(end[0] - Rb - 2), V.Y(end[1] + Rb + 2), V.L(2 * Rb + 4), V.L(2 * Rb + 3), { stroke: c.mute, width: 1, dash: [4, 4] });
    // The ramp: a plate, or a moving belt when both sides are driven.
    var a0 = [G.lip[0], G.lip[1]], ramp = G.ramp, pe = [G.P0[0] + G.u[0] * ramp - Rb * G.n[0], G.P0[1] + G.u[1] * ramp - Rb * G.n[1]];
    var A0 = P(a0), A1 = P(pe);
    if (s.contact === "both") {
      var bw = Math.max(3, V.L(0.35));
      g.line(A0[0], A0[1], A1[0], A1[1], { color: c.text2, width: bw });
      var len = Math.hypot(A1[0] - A0[0], A1[1] - A0[1]), off = ((t * r.surface / IN * V.k) % 10 + 10) % 10;
      for (var k = off; k < len; k += 10) { var f = 1 - k / len; g.circle(A1[0] + (A0[0] - A1[0]) * f, A1[1] + (A0[1] - A1[1]) * f, 1.2, { fill: c.sheet, stroke: null }); }
      g.circle(A0[0], A0[1], bw / 2 + 1.5, { fill: c.part2, stroke: c.partLine, width: 1 });
    } else {
      g.line(A0[0], A0[1], A1[0], A1[1], { color: c.partLine, width: Math.max(2.5, V.L(0.25)) });
    }
    // The arm that carries the roller, then the roller itself, turning so its near side moves into the robot.
    var pivot = [-2, G.bTop + 5.5], Cp = P(G.C);
    g.line(V.X(pivot[0]), V.Y(pivot[1]), Cp[0], Cp[1], { color: c.part2, width: Math.max(4, V.L(1)) });
    g.circle(V.X(pivot[0]), V.Y(pivot[1]), Math.max(2.5, V.L(0.4)), { fill: c.partLine, stroke: null });
    // The piece (drawn before the roller when it is past it, so the roller sits on top).
    // A rolling piece turns as it moves; shoved along, it rolls forward on the carpet.
    var ang = d < 0 ? 0 : jam ? (t - r.tc) * vd / Rb : s.contact === "both" ? 0 : -d / Rb;
    g.ball(V.X(bp[0]), V.Y(bp[1]), V.L(Rb), ang + 0.6, {});
    g.wheel(Cp[0], Cp[1], V.L(Rr), r.w * t, { spokes: 4, tread: Math.max(2, V.L(0.25)) });
    // Arrows: the robot's speed, and the piece's.
    var vmax = Math.max(vd, vp, 1), aL = function (v) { return 12 + 70 * v / vmax; };
    var ry = V.Y(G.bTop + 9.5), rx = V.X(-13);
    if (vd > 0.5) { g.arrow(rx, ry, rx + aL(vd), ry, { color: c.s1, width: 2 }); g.text("robot " + K.fix(vd / 12, 1) + " ft/s", rx + aL(vd) + 6, ry, { base: "middle", weight: 600, color: c.text }); }
    var bx = V.X(bp[0]), by = V.Y(bp[1]), lab, col = r.state === "bad" ? c.bad : c.ok;
    if (d < 0) { lab = "piece at rest"; g.text(lab, bx, V.Y(bp[1] + Rb) - 8, { align: "center", color: c.text2, weight: 600 }); }
    else if (jam) {
      var gl0 = aL(vd);
      g.arrow(bx + V.L(Rb) + 2, by, bx + V.L(Rb) + 2 + gl0, by, { color: c.bad, width: 2.5 });
      var sm = (g.w > 640 ? "shoved along the floor at " : "shoved ahead ") + K.fix(vd / 12, 1) + " ft/s", smw = g.textWidth(sm, { weight: 600 }), smx = bx + V.L(Rb) + 2 + gl0 + 6;
      if (smx + smw > g.w - 6) g.text(sm, F.clamp(bx, smw / 2 + 6, g.w - smw / 2 - 6), V.Y(bp[1] + Rb) - 10, { align: "center", color: c.bad, weight: 600 });
      else g.text(sm, smx, by, { base: "middle", color: c.bad, weight: 600 });
    }
    else if (!inside) {
      var onFloor = d <= G.floorSeg, dir = onFloor ? [-1, 0] : G.u, L1 = aL(vp);
      g.arrow(bx, by, bx + dir[0] * L1, by - dir[1] * L1, { color: col, width: 2.5 });
      g.text("pulled in " + K.fix(vp / 12, 1) + " ft/s", bx + dir[0] * L1 - 4, by - dir[1] * L1 - 4, { align: "right", color: col, weight: 600 });
      // Seen from the floor: is the piece shoved forward?
      var ground = vd - vp * (onFloor ? 1 : -G.u[0]);
      if (onFloor && ground > 0.5) {
        var gl = aL(ground);
        g.arrow(bx, V.Y(Rb * 0.2), bx + gl, V.Y(Rb * 0.2), { color: c.bad, width: 2 });
        g.text("shoved along the floor " + K.fix(ground / 12, 1) + " ft/s", bx + gl + 6, V.Y(Rb * 0.2), { base: "middle", color: c.bad, weight: 600 });
      }
    }
    // Roller label and clock.
    g.callout("roller " + K.fix(r.surface / FT, 1) + " ft/s at its surface", Cp[0] + V.L(Rr) * 0.7, Cp[1] - V.L(Rr) * 0.7, Cp[0] + V.L(Rr) + 26, Cp[1] - V.L(Rr) - 30, { size: 11 });
    g.text(K.fix(t, 2) + " s", 10, 18, { weight: 700, size: 13 });
    var jamMsg = "the piece is shoved before it is taken in" + (g.w > 640 ? ": the roller takes it at " + K.fix(vp / 12, 1) + " ft/s, the floor brings it at " + K.fix(vd / 12, 1) + " ft/s" : "");
    var inMsg = "in, " + K.fix(r.time, 2) + " s after the roller touched it";
    g.text(t < r.tc ? "driving onto the piece" : jam ? jamMsg : inside ? inMsg : "roller has it", 62, 18, { color: jam && t >= r.tc ? c.bad : inside ? c.ok : c.text2, weight: 600 });
  }
});
})(typeof window !== "undefined" ? window : this);
