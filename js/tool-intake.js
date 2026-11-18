/* Tools: Intake (#tool-intake). Roller surface speed against the speed the robot drives onto a game piece. The
   drawing is a side view to scale: the robot drives onto a ball, the roller takes it from the top, and the piece is
   carried between the roller's belt (above) and a plate or a second belt (below) up over the bumper. */
(function (root) {
"use strict";
var F = root.FRC || require("./frc.js");

/* ---------- The maths (SI units, no page code) ---------- */
var M = {};
// The piece must come in at least this much faster than the floor brings it, and the roller's surface must run at
// least twice the drive speed (the rule of thumb), for the page to call the intake good.
M.MARGIN = 1.1; M.RULE = 2;
/* o: { drive (F.drive), V (battery volts), rollerR (m), contact: "plate" | "both", driveV (m/s), travel (m) }.
   The roller runs near free speed (it carries almost no load until it grips a piece). A piece pinched between a
   roller and a fixed plate rolls on the plate, so its centre moves at half the roller's surface speed; between two
   moving surfaces it moves at the full speed. */
M.factor = function (contact) { return contact === "both" ? 1 : 0.5; };
M.speeds = function (o) {
  var w = o.drive.freeSpeed(o.V), surface = w * o.rollerR, k = M.factor(o.contact), piece = surface * k;
  var out = { w: w, rpm: w / F.RPM, surface: surface, piece: piece };
  out.surfRatio = o.driveV > 0 ? surface / o.driveV : Infinity;
  out.pieceRatio = o.driveV > 0 ? piece / o.driveV : Infinity;
  out.time = piece > 0 ? o.travel / piece : Infinity;
  out.push = o.driveV - piece;                                    // + : the robot shoves the piece along the floor
  out.force = o.drive.at(0, o.V, 1).torque / o.rollerR;             // N at the roller surface, at the current limit
  // The surface speed (times the drive speed) the page calls good: the rule of thumb, and enough for the piece itself
  // to come in 10% faster than the floor brings it. Against a plate that is 2.2, between two belts 2.
  out.target = Math.max(M.RULE, M.MARGIN / k);
  var free = o.drive.motor.free * o.V / 12;
  out.ratioGood = o.driveV > 0 ? free / (out.target * o.driveV / o.rollerR) : Infinity;
  out.state = M.state(out.surfRatio, out.pieceRatio, o.driveV);
  return out;
};
/* The verdict's state. "bad": the piece comes in slower than the floor brings it (against a plate, any surface speed
   under 2 times the drive speed). "warn": it comes in faster, but under the rule of thumb or with under 10% to spare.
   "ok": both met. */
M.state = function (surfRatio, pieceRatio, driveV) {
  if (!(driveV > 0.05)) return "ok";
  if (pieceRatio < 1 - 1e-9) return "bad";
  return surfRatio >= M.RULE - 1e-9 && pieceRatio >= M.MARGIN - 1e-9 ? "ok" : "warn";
};

/* The drawing's geometry in inches, in the robot's frame: x forward from the bumper face, y up from the floor.
   The roller sits right above the spot where it first touches the piece. The piece then rolls round the roller on a
   curved lip (an arc about the roller's centre), and on up a straight ramp under a belt that runs from the roller to
   a pulley of the same size, so it touches the roller (or its belt) on top and the plate underneath the whole way. */
M.TH = 35 * Math.PI / 180;
M.geom = function (s) {
  var TH = M.TH, Rb = s.piece / 2, Rr = s.roller / 2, bTop = 6.5, Rc = Rb + Rr, Rp = Rr + 2 * Rb;
  var p1 = -Math.PI / 2 - TH, r1 = [Math.cos(p1), Math.sin(p1)], u = [-Math.cos(TH), Math.sin(TH)];
  var Cy = 2 * Rb + Rr, P1y = Cy + Rp * r1[1];
  // The lip touches the floor under the roller; the ramp clears the bumper by half an inch at its face.
  var P1x = Math.max(0.5, (bTop + 0.5 - P1y) / Math.tan(TH)), xe = P1x - Rp * r1[0];
  var C = [xe, Cy], A = [C[0] + Rc * r1[0], C[1] + Rc * r1[1]], Larc = Rc * TH;
  var straight = Math.max(0, s.travel - Larc);
  var run = Math.max(straight + Rr + 0.6 * Rb, 2 * Rr + Rb);
  var Cr = [C[0] + u[0] * run, C[1] + u[1] * run];
  var P1 = [C[0] + Rp * r1[0], C[1] + Rp * r1[1]];
  var plate = Math.max(straight + 0.9, (P1[0] + 3) / Math.cos(TH));
  function at(d) {                     // ball centre and its direction of travel after d inches into the intake
    d = Math.max(0, Math.min(d, s.travel));
    if (d <= Larc) { var ph = -Math.PI / 2 - d / Rc; return { p: [C[0] + Rc * Math.cos(ph), C[1] + Rc * Math.sin(ph)], dir: [Math.sin(ph), -Math.cos(ph)] }; }
    return { p: [A[0] + u[0] * (d - Larc), A[1] + u[1] * (d - Larc)], dir: u };
  }
  return { Rb: Rb, Rr: Rr, Rc: Rc, Rp: Rp, bTop: bTop, TH: TH, p1: p1, r1: r1, u: u, C: C, E: [xe, Rb], A: A, P1: P1, Larc: Larc, straight: straight, run: run, Cr: Cr, plate: plate, at: at };
};

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The page ---------- */
var K = D.calc, ID = "tool-intake", FT = F.FT, IN = F.IN;
function fts(v) { return K.fix(v / FT, 1); }

K.tool({
  id: ID,
  // Reduction 2.5 (the lead's choice, 2026-11-18): the page opens on an intake that works; 3:1 at 12 ft/s does not.
  defaults: { roller: 2, motor: "kraken44", motors: 1, ratio: 2.5, statorA: 30, eff: 90, drive: 12, piece: 5.91, travel: 14, contact: "plate", V: 12, pieceLb: 0.47 },
  stage: { ratio: 2.1, narrow: 1.05, label: "Side view to scale: the front of the robot driving onto a ball. The roller takes the ball from the top and carries it between its belt and a plate, up over the bumper." },
  // The whole pick-up takes a tenth of a second or so, so it plays in slow motion.
  autoplay: true, speed: 0.05,

  compute: function (s) {
    var dr = K.driveOf(s), vd = s.drive * FT;
    var r = M.speeds({ drive: dr, V: s.V, rollerR: s.roller * IN / 2, contact: s.contact, driveV: vd, travel: s.travel * IN });
    r.vd = vd; r.G = M.geom(s);
    // The animation: the robot closes a short gap, the roller touches the ball, the ball goes through.
    r.gap = vd > 0.05 ? F.clamp(vd / IN * 0.06, 3, 10) : 0;
    r.tc = vd > 0.05 ? r.gap * IN / vd : 0;
    // Too slow: the piece stays at the mouth and the robot shoves it along the floor, so show a little longer.
    r.dur = Math.min(8, r.tc + (r.state === "bad" ? 0.3 : (isFinite(r.time) ? r.time : 4) + 0.12));
    return r;
  },

  controls: function (s) {
    return K.group(ID, "roll", "Roller", K.num(ID, "roller", "Roller diameter", { unit: "in", min: 0.5, max: 6, step: 0.125, tip: "Outside diameter where it touches the piece, with any compliant wheels or tubing on it." }) +
        K.seg(ID, "contact", "The piece is pinched between", [["plate", "Roller against a plate"], ["both", "Rollers on both sides"]], { hint: s.contact === "both" ? "Both sides driven: the piece moves at the roller's full surface speed." : "Against a fixed plate the piece rolls, so it moves at half the roller's surface speed.", tip: "Against a fixed plate the piece rolls, so it moves at half the roller's surface speed. Between two driven rollers, or a roller and a moving belt, it moves at the full speed." })) +
      K.group(ID, "motor", "Motor", K.motorFields(ID, { slider: true, ratioMax: 20 })) +
      K.group(ID, "drive", "Driving onto it", K.num(ID, "drive", "Robot speed toward the piece", { unit: "ft/s", min: 0, max: 20, step: 0.5, slider: true, tip: "How fast the driver comes onto a piece. Full speed for most swerve robots is 14 to 17 ft/s." })) +
      K.group(ID, "piece", "Game piece", K.num(ID, "piece", "Piece diameter", { unit: "in", min: 2, max: 16, step: 0.01, tip: "5.91 in is the 2026 ball." }) +
        K.num(ID, "pieceLb", "Piece weight", { unit: "lb", min: 0.05, max: 20, step: 0.01, tip: "0.47 lb is the 2026 ball. Used only to compare with the pull." }) +
        K.num(ID, "travel", "Travel through the intake", { unit: "in", min: 2, max: 60, step: 0.5, tip: "From where the roller first touches the piece to where the robot holds it." })) +
      K.group(ID, "adv", "Fine tuning", K.num(ID, "V", "Battery voltage", { unit: "V", min: 8, max: 13, step: 0.1, tip: "The roller's free speed is in proportion to it. Mid-match, 11 to 12 V." }), true);
  },

  outs: function (s, r) {
    var vd = r.vd, text, sr = K.fix(r.surfRatio, 2), tg = K.fix(r.target, 1), rg = K.fix(r.ratioGood, 2);
    var plate = s.contact !== "both";
    if (vd <= 0.05) text = "The robot is standing still, so the piece comes in at " + fts(r.piece) + " ft/s.";
    else if (r.state === "bad") text = "The robot drives onto the piece faster than the roller pulls it in (" + fts(r.piece) + " against " + fts(vd) + " ft/s), so it shoves the piece along the floor before the roller has it. Change the reduction from " + K.fix(s.ratio, 2) + ":1 to " + rg + ":1 or less, for a surface speed of " + tg + " times the drive speed.";
    else if (r.state === "ok") text = "The roller's surface runs " + sr + " times the drive speed, so the piece comes in at " + fts(r.piece) + " ft/s, " + K.fix(r.pieceRatio, 2) + " times as fast as the robot drives onto it.";
    else text = "The piece comes in only a little faster than the robot drives (" + fts(r.piece) + " against " + fts(vd) + " ft/s): the roller's surface runs " + sr + " times the drive speed" + (plate ? ", and against a plate the piece moves at half that." : ".") + " Change the reduction from " + K.fix(s.ratio, 2) + ":1 to " + rg + ":1 or less for " + tg + " times.";
    var more = "These speeds come from the motor's free speed and the current limit only. Whether the roller really grips depends on how hard it squeezes the piece and on friction, which this page does not know: test it with a real piece.";
    var pr = isFinite(r.pieceRatio) ? K.fix(r.pieceRatio, 2) + " times the drive speed" : "robot standing still";
    return K.verdict(r.state, text, more) + K.outs([
      { k: "Roller surface speed", v: fts(r.surface), u: "ft/s", sub: K.fix(r.surface, 2) + " m/s, " + K.n(r.rpm, 0) + " rpm, at free speed", tip: "Roller radius times roller speed. The roller turns at about free speed until it grips a piece." },
      { k: "Piece speed", v: fts(r.piece), u: "ft/s", sub: pr + (plate ? ", half the surface speed" : "") + ". Along its path; at first touch that is along the floor, where it is compared with the drive speed", tip: "The piece's speed along its path. It first touches the roller on the floor, moving straight along it, so there its speed and the robot's are along the same line and are compared as they are. Once it is on the plate it is inside the robot and the floor no longer matters.", state: r.state === "bad" ? "bad" : r.state === "warn" ? "warn" : "" },
      { k: "Surface to drive speed", v: isFinite(r.surfRatio) ? sr : "–", u: "×", sub: "good from " + tg + " (a rule of thumb)", state: r.state, tip: "Roller surface speed divided by the robot's speed toward the piece. Against a plate, 2 only lets the piece match the drive speed, so this page asks for 2.2." },
      { k: "Time to pass through", v: K.fix(r.time, 2), u: "s", sub: "ideal: " + s.travel + " in at the piece speed" },
      { k: "Most the motor can pull", v: K.n(r.force / F.LBF, 1), u: "lbf", sub: "theoretical: torque at the " + s.statorA + " A limit ÷ roller radius. The piece weighs about " + K.fix(s.pieceLb, 2) + " lb. Grip needs squeeze too", tip: "The most the roller can pull on the piece before the current limit stops it. Whether the piece follows depends on the squeeze and the friction." },
      { k: "Reduction for a good margin", v: isFinite(r.ratioGood) ? rg : "–", u: ": 1", sub: "or less: surface " + tg + " times the drive speed" }
    ]);
  },

  more: function (s, r) {
    var vd = r.vd, hi = Math.max(10, s.ratio * 1.5, isFinite(r.ratioGood) ? r.ratioGood * 1.3 : 0), lo = 1;
    var ymax = Math.max(2.6 * vd / FT, r.surface / FT * 1.15, 5);
    function cut(v) { return v <= ymax ? v : NaN; }      // points above the chart's top are left out, not drawn outside it
    function at(G, dia) { return M.speeds({ drive: F.drive({ motor: s.motor, n: s.motors, ratio: G, eff: s.eff / 100, statorA: s.statorA }), V: s.V, rollerR: dia * IN / 2, contact: s.contact, driveV: vd, travel: s.travel * IN }); }
    var pts = [], surf = [], dp = [], ds = [], i, q;
    for (i = 0; i <= 80; i++) { var G = lo + (hi - lo) * i / 80; q = at(G, s.roller); pts.push([G, cut(q.piece / FT)]); surf.push([G, cut(q.surface / FT)]); }
    for (i = 0; i <= 60; i++) { var dia = 0.5 + 3.5 * i / 60; q = at(s.ratio, dia); dp.push([dia, cut(q.piece / FT)]); ds.push([dia, cut(q.surface / FT)]); }
    var y = { label: "ft/s", unit: "ft/s", min: 0, max: ymax };
    function hl(xr, lines) { return vd > 0.05 ? [place("drive speed", vd / FT, xr, ymax, lines), place("2 × drive speed", 2 * vd / FT, xr, ymax, lines)] : []; }
    var chart = '<div class="chartrow">' +
      K.chart({ id: "int-r", title: "Speeds for other reductions", x: { label: "reduction (: 1)", name: "Reduction", min: lo, max: hi }, y: y,
        series: [{ name: "Piece", pts: pts, color: 1 }, { name: "Roller surface", pts: surf, color: 2, dash: true }], hlines: hl([lo, hi], [pts, surf]), dots: [{ x: s.ratio, y: r.piece / FT, label: "now" }] }) +
      K.chart({ id: "int-d", title: "Speeds for other roller diameters", x: { label: "roller diameter (in)", name: "Diameter", unit: "in", min: 0.5, max: 4 }, y: y,
        series: [{ name: "Piece", pts: dp, color: 1 }, { name: "Roller surface", pts: ds, color: 2, dash: true }], hlines: hl([0.5, 4], [dp, ds]), dots: s.roller <= 4 ? [{ x: s.roller, y: r.piece / FT, label: "now" }] : [] }) + "</div>";
    return chart + K.notes(
      "<p>The roller turns at about its free speed until it grips a piece, so its surface moves at:</p>" +
      '<p class="eq">surface speed = roller radius × motor free speed × (battery ÷ 12 V) ÷ reduction</p>' +
      "<p>A piece pinched between the roller and a fixed plate rolls along the plate. Its bottom stays still on the plate and its top moves with the roller, so its centre moves at half the surface speed. Between two moving surfaces (two rollers, or a roller and a belt) it moves at the full surface speed.</p>" +
      '<p class="eq">piece speed = surface speed × ½ (against a plate) or × 1 (rollers on both sides)</p>' +
      '<p class="eq">time to pass through = travel ÷ piece speed</p>' +
      '<p class="eq">most the motor can pull = output torque at the current limit ÷ roller radius</p>' +
      "<p>In the robot's frame, the floor brings the piece toward the intake at the driving speed. If the roller takes it in slower than that, the piece cannot get out of the way: the robot shoves it along the floor until it bounces off or wedges.</p>" +
      "<p>Which speeds are compared: the piece's speed is along its own path. Where the roller first touches it (directly under the roller, still on the floor), that path runs straight along the floor, the same line the robot drives on, so the two speeds are compared as they are. That is the moment that matters: once the piece is up on the plate it is inside the robot and the floor no longer pushes it. Up the ramp the piece keeps its speed along the ramp; only part of that is along the floor, and it does not need to be more.</p>" +
      "<p>Many teams aim for a roller surface speed of about twice the drive speed. That is a rule of thumb from experience, not a law, and against a plate it has no margin at all: the piece moves at half the surface speed, so at exactly 2 times it only matches the drive speed. This page calls an intake good when the surface runs at least 2 times the drive speed and the piece itself comes in at least 10% faster than the floor brings it. Against a plate that is a surface speed of 2.2 times the drive speed; between two driven surfaces, 2 times. Under that it says Check, and when the piece is slower than the floor it says Problem.</p>" +
      "<p>The pull figure is what the motor could give at its current limit. Whether the piece follows depends on the squeeze (how far the gap is smaller than the piece) and on the friction between them, which this page does not know. Test it with a real piece.</p>" +
      "<p>Left out: the roller slowing under load, slip between roller and piece, the squeeze, and the piece bouncing. The drawing shows the piece just touching; a real pinch squeezes it a little. Its shape (a curved lip under the roller, a 35° ramp, a belt from the roller to a second pulley) is a sketch of a common over-the-bumper intake; only the sizes and speeds come from your numbers.</p>");
  },

  duration: function (s, r) { return r && r.dur || 2; },
  // At rest: the piece part way through, held between the roller's belt and the plate.
  rest: function (s, r) {
    if (!r || r.vd <= 0.05 && !isFinite(r.time)) return null;
    if (r.state === "bad") return r.tc + 0.15;
    return isFinite(r.time) ? r.tc + Math.min(r.time * 0.45, Math.max(0.01, (r.G.Larc + 0.35 * r.G.straight) * IN / r.piece)) : null;
  },

  draw: draw
});

/* A level line's name on a chart, at whichever end (above or below the line) no curve passes through. The kit's chart
   is 480 by 190 units with the plot from x = 46 to 466 and from y = 24 to 156; a name is 11 units tall and about 6.2
   units a letter. */
function place(label, yv, xr, ymax, lines) {
  var w = label.length * 6.2 + 6, X = function (x) { return 46 + (x - xr[0]) / (xr[1] - xr[0]) * 420; }, Yy = function (v) { return 156 - v / ymax * 132; }, yl = Yy(yv);
  var tries = [{ side: "right", below: false }, { side: "left", below: false }, { side: "right", below: true }, { side: "left", below: true }];
  function clear(o) {
    var x0 = o.side === "left" ? 49 : 464 - w, x1 = x0 + w, y0 = o.below ? yl + 1 : yl - 15, y1 = o.below ? yl + 15 : yl - 1;
    return !lines.some(function (pts) { for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i]; if (!isFinite(a[1]) || !isFinite(b[1])) continue;
      for (var k = 0; k <= 4; k++) { var px = X(a[0] + (b[0] - a[0]) * k / 4), py = Yy(a[1] + (b[1] - a[1]) * k / 4); if (px >= x0 - 2 && px <= x1 + 2 && py >= y0 - 2 && py <= y1 + 2) return true; } } return false; });
  }
  var pick = tries.filter(clear)[0] || tries[0];
  return { y: yv, label: label, side: pick.side === "left" ? "left" : undefined, below: pick.below };
}

/* ---------- The drawing ---------- */
// A curved arrow on a circle's rim (canvas angles, + is clockwise on screen) showing which way the surface moves.
function rimArrow(g, x, y, rad, a0, a1, color) {
  g.arc(x, y, rad, Math.min(a0, a1), Math.max(a0, a1), { color: color, width: 2.25 });
  var cw = a1 > a0, ex = x + rad * Math.cos(a1), ey = y + rad * Math.sin(a1), tx = -Math.sin(a1) * (cw ? 1 : -1), ty = Math.cos(a1) * (cw ? 1 : -1);
  g.arrow(ex - tx * 7, ey - ty * 7, ex + tx * 2, ey + ty * 2, { color: color, width: 2.25, head: 8 });
}
function draw(g, s, r, t) {
  var c = g.c, G = r.G, Rb = G.Rb, Rr = G.Rr, vd = r.vd / IN, vp = r.piece / IN, phone = g.w < 520;   // inches per second
  var jam = r.state === "bad" && vd > 0.05;
  var end = G.at(s.travel).p, ballX0 = G.E[0] + r.gap;
  var mountX = Math.min(end[0] - Rb, G.P1[0] + G.u[0] * G.plate) - 1.2;
  var top = Math.max(G.Cr[1], G.C[1]) + Rr + 1.5;
  // The whole front of the robot fits (its frame ends at x = -12), on a phone too.
  var x0b = Math.min(-12.6, mountX - 1, end[0] - Rb - 1.5);
  var box = phone ? { x0: x0b, x1: G.E[0] + Rb + 2.5, y0: -1, y1: top + 6.5 } :
    { x0: x0b, x1: ballX0 + Rb + 2, y0: -1.5, y1: top + 4.5 };
  var V = g.view(box, phone ? { l: 6, r: 6, t: 8, b: 6 } : { l: 8, r: 8, t: 30, b: 8 }, "middle");
  var step = V.k >= 9 ? 1 : 6;
  g.grid(V, step, phone ? "" : (step === 1 ? "1 in squares" : "6 in squares"));
  function P(p) { return [V.X(p[0]), V.Y(p[1])]; }
  var fy = V.Y(0), shift = vd * t;                   // the floor moves back under the robot
  // Floor, with marks every 3 in that move, and the spot where the piece started.
  g.line(0, fy, g.w, fy, { color: c.text2, width: 1.5 });
  var x0w = V.ux(0), x1w = V.ux(g.w);
  for (var m = Math.floor((x0w + shift) / 3) * 3; m - shift < x1w + 3; m += 3) { var mx = V.X(m - shift); g.line(mx, fy, mx - 6, fy + 7, { color: c.line2, width: 1 }); }
  // Where the ball is: on the floor at rest until the roller touches it, then along the path at the piece speed.
  var d = t <= r.tc ? -1 : jam ? 0 : Math.min(s.travel, (t - r.tc) * vp);
  var pos = d < 0 ? { p: [ballX0 - vd * t, Rb], dir: [-1, 0] } : G.at(d), bp = pos.p, inside = d >= s.travel - 1e-9;
  // The robot: frame rail, wheel, the post that carries the intake, bumper.
  var wa = vd * t / 2;
  g.rect(V.X(-12), V.Y(4), V.L(8.5), V.L(2), { fill: c.part, stroke: c.partLine, width: 1, radius: 2 });
  g.wheel(V.X(-8), V.Y(2), V.L(2), wa, { spokes: 5 });
  var post = Math.max(0.6, Rr * 0.5), pw = V.L(post);
  g.rect(V.X(mountX - post / 2), V.Y(G.Cr[1] + post / 2), pw, V.Y(4) - V.Y(G.Cr[1] + post / 2), { fill: c.part2, stroke: c.partLine, width: 1 });
  g.rect(V.X(mountX - post / 2), V.Y(G.Cr[1] + post / 2), V.X(G.Cr[0]) - V.X(mountX - post / 2), pw, { fill: c.part2, stroke: c.partLine, width: 1 });
  g.rect(V.X(-3.5), V.Y(G.bTop), V.L(3.5), V.L(G.bTop - 1.5), { fill: c.s1, stroke: null, radius: V.L(0.8) });
  if (!phone) g.text("bumper", V.X(-1.75), V.Y(1.5) + 14, { align: "center", color: c.mute, size: 11 });
  // The plate: a curved lip about the roller's centre, then the straight ramp. With both sides driven it is a belt.
  var pl = [], i, a, Cp = P(G.C);
  for (i = 0; i <= 16; i++) { a = -Math.PI / 2 - G.TH * i / 16; pl.push(P([G.C[0] + G.Rp * Math.cos(a), G.C[1] + G.Rp * Math.sin(a)])); }
  var pEnd = [G.P1[0] + G.u[0] * G.plate, G.P1[1] + G.u[1] * G.plate]; pl.push(P(pEnd));
  var both = s.contact === "both", pwid = Math.max(3, V.L(0.3));
  g.path(pl, { color: both ? c.text2 : c.partLine, width: pwid });
  if (both) {
    // Dots on the lower belt, moving into the robot at the surface speed.
    var sp = Math.max(8, V.L(1)), lenS = Math.hypot(V.L(G.plate * G.u[0]), V.L(G.plate * G.u[1])), off = ((V.L(r.surface / IN * t)) % sp + sp) % sp, P1p = P(G.P1), Pe = P(pEnd);
    for (var k = off; k < lenS; k += sp) { var f = k / lenS; g.circle(P1p[0] + (Pe[0] - P1p[0]) * f, P1p[1] + (Pe[1] - P1p[1]) * f, 1.3, { fill: c.sheet, stroke: null }); }
  }
  // Where the piece ends up.
  var ep = P(end);
  g.circle(ep[0], ep[1], V.L(Rb) + 3, { stroke: c.mute, width: 1, dash: [4, 4] });
  // The arm that carries the roller and the pulley: a bar between their axles, above the belt, clear of the piece.
  var Crp = P(G.Cr), bt = Math.max(2, V.L(Math.min(0.14, Rr * 0.25)));
  g.line(Cp[0], Cp[1], Crp[0], Crp[1], { color: c.part2, width: Math.max(4, V.L(Math.min(Rr * 0.9, 0.9))) });
  g.line(Cp[0], Cp[1], Crp[0], Crp[1], { color: c.partLine, width: 1 });
  // The piece. Against a plate it rolls; between two belts it slides along without turning.
  var ang = d < 0 ? 0 : jam ? (t - r.tc) * vd / Rb : both ? 0 : -d / Rb;
  g.ball(V.X(bp[0]), V.Y(bp[1]), V.L(Rb), ang + 0.6, {});
  // The roller and the pulley, and the belt round both. Belt dots move at the surface speed.
  var spin = r.w * t;
  g.wheel(Cp[0], Cp[1], V.L(Rr) - bt, spin, { spokes: 4, tread: Math.max(1.5, V.L(Rr) * 0.12) });
  g.wheel(Crp[0], Crp[1], V.L(Rr) - bt, spin, { spokes: 4, tread: Math.max(1.5, V.L(Rr) * 0.12) });
  var loop = [], rb = Rr - bt / 2 / V.k;
  for (i = 0; i <= 24; i++) { a = (G.p1 + Math.PI) - Math.PI * i / 24; loop.push([G.C[0] + rb * Math.cos(a), G.C[1] + rb * Math.sin(a)]); }
  for (i = 0; i <= 24; i++) { a = G.p1 - Math.PI * i / 24; loop.push([G.Cr[0] + rb * Math.cos(a), G.Cr[1] + rb * Math.sin(a)]); }
  g.poly(loop.map(P), { stroke: c.text, width: bt, close: true });
  // Arrow on the roller's rim: which way its surface moves (clockwise here, so its underside moves into the robot).
  var rimR = V.L(Rr) + 6;
  rimArrow(g, Cp[0], Cp[1], rimR, -1.25, -0.1, c.accent);
  // The robot's speed, top left.
  var vmax = Math.max(vd, vp, 1), aL = function (v) { return (phone ? 10 : 14) + (phone ? 46 : 66) * v / vmax; };
  var hx = 10, hy = phone ? 18 : 18;
  var status = t < r.tc ? "driving onto the piece" : jam ? "the piece is shoved before it is taken in" : inside ? "in, " + K.fix(r.time, 2) + " s after the roller touched it" : "in the pinch: belt on top, " + (both ? "belt" : "plate") + " underneath";
  g.text(K.fix(t, 3) + " s", hx, hy, { weight: 700, size: 13 });
  // While it plays slowed down, say so beside the clock (the clock is the real time of the pick-up).
  var slow = K.playing(ID) && K.speed(ID) < 1 ? "slowed " + Math.round(1 / K.speed(ID)) + "×" : "", sw = slow ? g.textWidth(slow, { size: 11, weight: 600 }) + 10 : 0;
  if (slow) g.text(slow, hx + 62, hy, { size: 11, weight: 600, color: c.mute });
  g.text(status, hx + 62 + sw, hy, { color: jam && t >= r.tc ? c.bad : inside ? c.ok : c.text2, weight: 600, size: phone ? 11 : 12 });
  /* The key: each arrow points the way its thing moves. The robot's runs along the floor (it drives to the right here);
     the piece's runs up the ramp, into the robot. Their lengths are to one scale. */
  var ry = hy + 20, ks = phone ? 11 : 12, keyEnd = ry;
  if (vd > 0.5) { g.arrow(hx, ry, hx + aL(vd), ry, { color: c.s1, width: 2 }); g.text("robot, over the floor " + K.fix(vd / 12, 1) + " ft/s", hx + aL(vd) + 6, ry, { base: "middle", weight: 600, color: c.text, size: ks }); }
  if (!jam && vp > 0) {
    var pc = r.state === "warn" ? c.warn : c.ok, pl2 = aL(vp), pdx = pl2 * Math.cos(G.TH), pdy = pl2 * Math.sin(G.TH), pyb = ry + 12 + pdy;
    g.arrow(hx + pdx, pyb, hx, pyb - pdy, { color: pc, width: 2.5 });
    g.text("piece, into the robot " + K.fix(vp / 12, 1) + " ft/s" + (phone ? "" : both ? ": the roller's full surface speed" : ": half the roller's surface speed"), hx + pdx + 8, pyb - pdy / 2, { base: "middle", weight: 600, color: pc, size: ks });
    keyEnd = pyb;
  }
  // The piece's speed: an arrow ahead of it, along its path, and its label.
  var bx = V.X(bp[0]), by = V.Y(bp[1]), Rpx = V.L(Rb), col = r.state === "bad" ? c.bad : r.state === "warn" ? c.warn : c.ok;
  if (d < 0) {
    if (vd > 0.05) g.text("piece, still on the floor", bx, by - Rpx - 8, { align: "center", color: c.text2, weight: 600, size: phone ? 11 : 12 });
  } else if (jam) {
    var gl0 = aL(vd), sm = "shoved along the floor at " + K.fix(vd / 12, 1) + " ft/s", smw = g.textWidth(sm, { weight: 600 });
    g.arrow(bx + Rpx + 3, by, bx + Rpx + 3 + gl0, by, { color: c.bad, width: 2.5 });
    g.text(sm, Math.min(bx + Rpx + 3, g.w - smw - 6), by + Rpx + 16 > fy - 2 ? fy + 20 : by + Rpx + 16, { color: c.bad, weight: 600 });
  } else if (!inside) {
    // Along the path just ahead (the chord to where the piece will be a little later), so the arrow stays in the channel.
    var ahead = G.at(Math.min(s.travel, d + Rb)).p, cl = Math.hypot(ahead[0] - bp[0], ahead[1] - bp[1]);
    var dir = cl > 1e-6 ? [(ahead[0] - bp[0]) / cl, (ahead[1] - bp[1]) / cl] : pos.dir, L1 = aL(vp), sx = bx + dir[0] * (Rpx + 3), sy = by - dir[1] * (Rpx + 3);
    g.arrow(sx, sy, sx + dir[0] * L1, sy - dir[1] * L1, { color: col, width: 2.5 });
  }
  // The dashed circle, named in the key (inside it the piece's arrow would run through the words).
  var kc = (keyEnd || hy + 40) + 18, rlKey = !(Cp[0] + V.L(Rr) + 16 + g.textWidth("roller surface " + K.fix(r.surface / FT, 1) + " ft/s", { size: 12, weight: 600 }) < g.w - 6);
  if (rlKey) kc += 18;
  g.circle(hx + 7, kc, 6, { stroke: c.mute, width: 1, dash: [3, 3] });
  g.text("where the piece ends up", hx + 20, kc, { size: 11, weight: 600, color: c.text2, base: "middle" });
  // The roller's surface speed, and what is above and below the piece.
  // Beside the rim arrow when there is room; else (a phone) as a line of the key at the top left.
  var rl = "roller surface " + K.fix(r.surface / FT, 1) + " ft/s", rlw = g.textWidth(rl, { size: 12, weight: 600 });
  if (Cp[0] + rimR + 10 + rlw < g.w - 6) g.text(rl, Cp[0] + rimR + 10, Cp[1] - rimR - 4, { size: 12, weight: 600, color: c.accent });
  else g.text(rl + ", its arrow on the roller", hx, (keyEnd || hy + 40) + 18, { size: 11, weight: 600, color: c.accent, base: "middle" });
  if (!phone) {
    var mid = [(G.C[0] + G.Cr[0]) / 2 - G.r1[0] * (Rr + 0.6), (G.C[1] + G.Cr[1]) / 2 - G.r1[1] * (Rr + 0.6)], mp = P(mid);
    g.text("belt, same surface speed as the roller", mp[0] + 4, mp[1] - 4, { size: 11, color: c.text2 });
  }
  // The plate's name sits in front of its lip, on the open floor side.
  var la = -Math.PI / 2, lp = P([G.C[0] + G.Rp * Math.cos(la), G.C[1] + G.Rp * Math.sin(la)]);
  // Just under the floor line at the lip's end, where the piece never goes, so it never sits on the piece.
  g.text(both ? "lower belt, from here" : "plate, from here", lp[0], fy + 20, { size: 11, color: c.text2, weight: 600, align: "center" });
}
})(typeof window !== "undefined" ? window : this);
