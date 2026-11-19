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
/* o: { drive (F.drive), V (battery volts), rollerR (m), contact: "over" | "plate" | "both", driveV (m/s), travel (m),
   pieceR (m, for "over") }.
   The roller runs near free speed (it carries almost no load until it grips a piece). Every speed is in the robot's
   frame, where the floor comes at the robot at the drive speed. A piece that rolls without slipping between two
   surfaces moves at the average of their speeds:
     "plate"  between the roller and a fixed plate: (surface + 0) / 2, half the surface speed.
     "both"   between two driven surfaces at the same speed: (surface + surface) / 2, the full speed.
     "over"   one roller in front of the bumper. First the piece is pinched between the roller and the floor, which comes
              in at the drive speed: (surface + drive) / 2. Then it rolls up the bumper's face, which is fixed: half the
              surface speed, as against a plate. For this mode "piece" is the floor part and "pieceB" the bumper part. */
M.factor = function (contact) { return contact === "both" ? 1 : 0.5; };
// How far the piece moves while pinched against the floor, "over" mode (m): see M.geomOver.
M.floorLen = function (rollerR, pieceR) { return Math.SQRT2 * (rollerR + pieceR); };
M.speeds = function (o) {
  var w = o.drive.freeSpeed(o.V), surface = w * o.rollerR, over = o.contact === "over", k = M.factor(o.contact);
  var piece = over ? (surface + o.driveV) / 2 : surface * k;
  var out = { w: w, rpm: w / F.RPM, surface: surface, piece: piece, over: over };
  out.surfRatio = o.driveV > 0 ? surface / o.driveV : Infinity;
  out.pieceRatio = o.driveV > 0 ? piece / o.driveV : Infinity;
  if (over) {
    // The bumper part: half the surface speed, whatever the drive speed. Time: the floor part, then the rest at that.
    out.pieceB = surface / 2;
    var Lf = M.floorLen(o.rollerR, o.pieceR || 0), tr = o.travel;
    out.floorLen = Lf;
    out.time = piece > 0 && out.pieceB > 0 ? Math.min(tr, Lf) / piece + Math.max(0, tr - Lf) / out.pieceB : Infinity;
  } else out.time = piece > 0 ? o.travel / piece : Infinity;
  out.push = o.driveV - piece;                                    // + : the robot shoves the piece along the floor
  out.force = o.drive.at(0, o.V, 1).torque / o.rollerR;             // N at the roller surface, at the current limit
  // The surface speed (times the drive speed) the page calls good: the rule of thumb, and enough for the piece itself
  // to come in 10% faster than the floor brings it. Against a plate that is 2.2, between two belts 2.
  /* Over the bumper the test is the floor part, where the floor still brings the piece in: the piece at 10% over the
     drive speed, (surface + drive) / 2 = 1.1 x drive, so a surface of 1.2 x drive. The rule of thumb of 2 is not used:
     it is there for a plate, where the piece gets only half the surface speed against the floor. */
  out.target = over ? 2 * M.MARGIN - 1 : Math.max(M.RULE, M.MARGIN / k);
  // The piece speed the pass line stands for (m/s): what the piece reaches at the target surface speed.
  out.pass = over ? M.MARGIN * o.driveV : out.target * k * o.driveV;
  var free = o.drive.motor.free * o.V / 12;
  out.ratioGood = o.driveV > 0 ? free / (out.target * o.driveV / o.rollerR) : Infinity;
  out.state = M.state(out.surfRatio, out.pieceRatio, o.driveV, o.contact);
  return out;
};
/* The verdict's state. "bad": the piece comes in slower than the floor brings it (against a plate, any surface speed
   under 2 times the drive speed). "warn": it comes in faster, but under the rule of thumb or with under 10% to spare.
   "ok": both met. */
M.state = function (surfRatio, pieceRatio, driveV, contact) {
  if (!(driveV > 0.05)) return "ok";
  if (pieceRatio < 1 - 1e-9) return "bad";
  // Over the bumper: "bad" when the surface is slower than the floor (the roller pushes the piece out at first touch).
  if (contact === "over") return pieceRatio >= M.MARGIN - 1e-9 ? "ok" : "warn";
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

/* "Over the bumper": the drawing's geometry in inches, x forward from the bumper face, y up from the floor. One roller
   sits in front of the bumper. The piece, on the floor, first touches the roller when its centre is Rc = (piece + roller
   radius) from the roller's centre; it is pinched against the floor, rolls in to the bumper's face, and at the corner it
   touches floor, bumper and roller together (the roller's centre is at 45 degrees above and ahead of the piece's). Then
   it rolls up the face, over the top front corner and on over the bumper. A rigid ball cannot touch the roller both under
   it and against the bumper: the drawing squeezes the piece by up to Rc (1 - 1/sqrt 2) on the way, as a foam ball does.
   The floor part runs from first touch to the corner: 2 Rc / sqrt 2 = sqrt 2 Rc (M.floorLen). */
M.geomOver = function (s) {
  var Rb = s.piece / 2, Rr = s.roller / 2, bTop = 6.5, Rc = Rb + Rr, a = Rc / Math.SQRT2;
  // Where the floor part ends: touching the bumper's face, or (a piece taller than the bumper) its top corner.
  var xq = Rb <= bTop ? Rb : Math.sqrt(Math.max(0, Rb * Rb - (Rb - bTop) * (Rb - bTop)));
  var C = [xq + a, Rb + a], x1 = xq + 2 * a, Lf = 2 * a, Lc = Rb <= bTop ? bTop - Rb : 0;
  var th0 = Rb <= bTop ? 0 : Math.asin(Math.min(1, (Rb - bTop) / Rb)), La = Rb * (Math.PI / 2 - th0);
  function at(d) {                    // piece centre, its direction of travel and its phase after d inches
    d = Math.max(0, Math.min(d, s.travel));
    if (d <= Lf) return { p: [x1 - d, Rb], dir: [-1, 0], phase: "floor" };
    d -= Lf;
    if (d <= Lc) return { p: [xq, Rb + d], dir: [0, 1], phase: "bumper" };
    d -= Lc;
    if (d <= La) { var th = th0 + d / Rb; return { p: [Rb * Math.cos(th), bTop + Rb * Math.sin(th)], dir: [-Math.sin(th), Math.cos(th)], phase: "bumper" }; }
    d -= La;
    return { p: [-d, bTop + Rb], dir: [-1, 0], phase: "over" };
  }
  return { Rb: Rb, Rr: Rr, Rc: Rc, bTop: bTop, C: C, E: [x1, Rb], Q: [xq, Rb], Lf: Lf, Lc: Lc, La: La, th0: th0, at: at };
};

/* A level line's name on a chart, at whichever end (above or below the line) no curve passes through, clear of the dot
   that marks yours and of names already placed (boxes, in chart units). The kit's chart is 480 by 190 units with the
   plot from x = 46 to 466 and from y = 24 to 156; a name is 11 units tall and at most about 6.2 units a letter. */
function place(label, yv, xr, ymax, lines, avoid) {
  var w = label.length * 6.2 + 6, X = function (x) { return 46 + (x - xr[0]) / (xr[1] - xr[0]) * 420; }, Yy = function (v) { return 156 - v / ymax * 132; }, yl = Yy(yv);
  var tries = [{ side: "right", below: false }, { side: "left", below: false }, { side: "right", below: true }, { side: "left", below: true }];
  function box(o) { var x0 = o.side === "left" ? 49 : 464 - w; return [x0, o.below ? yl + 1 : yl - 15, x0 + w, o.below ? yl + 15 : yl - 1]; }
  function clear(o) {
    var b = box(o);
    if (avoid.some(function (q) { return b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]; })) return false;
    return !lines.some(function (pts) { for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], c = pts[i]; if (!isFinite(a[1]) || !isFinite(c[1])) continue;
      for (var k = 0; k <= 4; k++) { var px = X(a[0] + (c[0] - a[0]) * k / 4), py = Yy(a[1] + (c[1] - a[1]) * k / 4); if (px >= b[0] - 3 && px <= b[2] + 3 && py >= b[1] - 5 && py <= b[3] + 5) return true; } } return false; });
  }
  var pick = tries.filter(clear)[0] || tries[0];
  avoid.push(box(pick));
  return { y: yv, label: label, side: pick.side === "left" ? "left" : undefined, below: pick.below };
}
M.place = place;
if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- The page ---------- */
var K = D.calc, ID = "tool-intake", FT = F.FT, IN = F.IN;
function fts(v) { return K.fix(v / FT, 1); }

K.tool({
  id: ID,
  // Reduction 2.5 (the lead's choice, 2026-11-18): the page opens on an intake that works; 3:1 at 12 ft/s does not.
  defaults: { roller: 2, motor: "kraken44", motors: 1, ratio: 2.5, statorA: 30, eff: 90, drive: 12, piece: 5.91, travel: 14, contact: "over", V: 12, pieceLb: 0.47 },
  stage: { ratio: 2.1, narrow: 1.05, label: "Side view to scale: the front of the robot driving onto a ball, and the roller taking it in over the bumper." },
  // The whole pick-up takes a tenth of a second or so, so it plays in slow motion.
  autoplay: true, speed: 0.05,

  compute: function (s) {
    var dr = K.driveOf(s), vd = s.drive * FT;
    var r = M.speeds({ drive: dr, V: s.V, rollerR: s.roller * IN / 2, contact: s.contact, driveV: vd, travel: s.travel * IN, pieceR: s.piece * IN / 2 });
    r.vd = vd; r.G = M.geom(s); if (r.over) r.GO = M.geomOver(s);
    // The animation: the robot closes a short gap, the roller touches the ball, the ball goes through.
    r.gap = vd > 0.05 ? F.clamp(vd / IN * 0.06, 3, 10) : 0;
    r.tc = vd > 0.05 ? r.gap * IN / vd : 0;
    // Too slow: the piece stays at the mouth and the robot shoves it along the floor, so show a little longer.
    r.dur = Math.min(8, r.tc + (r.state === "bad" ? 0.3 : (isFinite(r.time) ? r.time : 4) + 0.12));
    return r;
  },

  controls: function (s) {
    return K.group(ID, "roll", "Roller or belt", K.num(ID, "roller", "Roller diameter", { unit: "in", min: 0.5, max: 6, step: 0.125, hint: s.contact === "over" ? "Where it touches the piece." : "A belt runs at its roller's surface speed.", tip: "Outside diameter where it touches the piece, with any compliant wheels or tubing on it. With a belt, the diameter of the roller it runs on, plus the belt's thickness." }) +
        K.seg(ID, "contact", "The piece is taken", [["over", "Over the bumper"], ["plate", "Against a plate"], ["both", "Rollers on both sides"]], { hint: s.contact === "over" ? "On the floor it comes in at (roller + floor) ÷ 2, then up the bumper at half the roller's speed: fabric grips so it rolls; on a slick face it slides, faster than half." : s.contact === "both" ? "Both sides driven: the piece moves at the full surface speed." : "Against a fixed plate the piece rolls, so it moves at half the surface speed.", tip: "Over the bumper: one roller in front of the bumper pins the piece against the floor, then rolls it up the bumper's face and over. Against a plate: the piece rolls on a fixed plate under a roller or belt. Rollers on both sides: two driven surfaces carry it at their full speed." })) +
      K.group(ID, "motor", "Motor", K.motorFields(ID, { slider: true, ratioMax: 20 })) +
      K.group(ID, "drive", "Driving onto it", K.num(ID, "drive", "Robot speed toward the piece", { unit: "ft/s", min: 0, max: 20, step: 0.5, slider: true, tip: "How fast the driver comes onto a piece. Full speed for most swerve robots is 14 to 17 ft/s." })) +
      K.group(ID, "piece", "Game piece", K.num(ID, "piece", "Piece diameter", { unit: "in", min: 2, max: 16, step: 0.01, tip: "5.91 in is the 2026 ball." }) +
        K.num(ID, "pieceLb", "Piece weight", { unit: "lb", min: 0.05, max: 20, step: 0.01, tip: "0.47 lb is the 2026 ball. Used only to compare with the pull." }) +
        K.num(ID, "travel", "Travel through the intake", { unit: "in", min: 2, max: 60, step: 0.5, tip: "From where the roller first touches the piece to where the robot holds it." })) +
      K.group(ID, "adv", "Fine tuning", K.num(ID, "V", "Battery voltage", { unit: "V", min: 8, max: 13, step: 0.1, tip: "The roller's free speed is in proportion to it. Mid-match, 11 to 12 V." }), true);
  },

  outs: function (s, r) {
    var vd = r.vd, text, sr = K.fix(r.surfRatio, 2), tg = K.fix(r.target, 1), rg = K.fix(r.ratioGood, 2);
    var plate = s.contact === "plate", over = r.over;
    /* One sentence, yours first: how much faster than the floor the piece comes in at no-load speed, and the reduction
       that gives the margin this page asks for. The caution goes in the second line. Over the bumper the comparison is
       the floor part, the only part where the floor still brings the piece in. */
    var pct = Math.round((r.pieceRatio - 1) * 100), mine = "Yours, " + K.fix(s.ratio, 2) + ":1, ", where = over ? " on the floor" : "";
    if (vd <= 0.05) text = "The robot is standing still, so the piece comes in at " + fts(r.piece) + " ft/s at the roller's no-load speed.";
    else if (r.state === "ok") text = mine + "pulls the piece in" + where + " " + pct + "% faster than the floor brings it at no-load speed; " + rg + ":1 or lower (rounded down) keeps a 10% margin.";
    else if (pct >= 0) text = mine + "pulls the piece in" + where + " only " + pct + "% faster than the floor brings it at no-load speed; " + rg + ":1 or lower gives a 10% margin.";
    else text = over ? mine + "turns the roller's surface slower than the floor comes in, so at first touch it pushes the piece ahead instead of taking it; " + rg + ":1 or lower gives a 10% margin." : mine + "pulls the piece in " + (-pct) + "% slower than the floor brings it, so the robot shoves it along; " + rg + ":1 or lower gives a 10% margin.";
    var more = over ? "Up the bumper it rolls at half the roller's speed, " + fts(r.pieceB) + " ft/s, as against a plate, and the drive speed no longer matters there. The roller slows once it grips, by an amount this page cannot know: test with a real piece how hard it must squeeze." :
      "Once it grips, the roller slows by an amount this page cannot know, which can use up the margin. Test with a real piece how hard it must be squeezed.";
    var surfName = over ? "Roller surface speed" : "Belt surface speed";
    if (over) return K.verdict(r.state, text, more) + K.outs([
      { k: surfName, v: fts(r.surface), u: "ft/s", sub: "at " + K.fix(s.V, 1) + " V, no load: " + K.fix(r.surface, 2) + " m/s", tip: "Roller radius times roller speed, at the battery voltage in Fine tuning with no load: the roller turns at " + K.n(r.rpm, 0) + " rpm. It slows as it grips a piece." },
      { k: "Piece on the floor", v: fts(r.piece), u: "ft/s", sub: "(roller + floor) ÷ 2, " + K.fix(r.pieceRatio, 2) + "× the floor", state: r.state === "bad" ? "bad" : r.state === "warn" ? "warn" : "", tip: "Pinched between the roller and the floor, which comes at the robot at the drive speed, the piece rolls between two moving surfaces, so its centre moves at their average. This is where the page's rule is tested." },
      { k: "Piece up the bumper", v: fts(r.pieceB), u: "ft/s", sub: "half the roller's, as against a plate", tip: "Against the bumper's face, which does not move, the piece rolls, so its centre moves at half the roller's surface speed whatever the drive speed. Bumper fabric grips; a slick face lets it slide, and then it moves faster than half." },
      { k: "Surface to drive speed", v: isFinite(r.surfRatio) ? sr : "–", u: "×", sub: "good from " + tg + ": this page's rule", state: r.state, tip: "Roller surface speed divided by the robot's speed toward the piece. This page's rule, not an input: on the floor the piece should come in at least 10% faster than the floor brings it, so (surface + drive) ÷ 2 at least 1.1 × drive: a surface of 1.2 × drive. Below 1 the roller pushes the piece ahead at first touch." },
      { k: "Time to pass through", v: K.fix(r.time, 2), u: "s", sub: "ideal; the first " + K.fix(r.floorLen / IN, 1) + " in on the floor", tip: "The first " + K.fix(r.floorLen / IN, 1) + " in at the floor speed, the rest of the " + s.travel + " in at the bumper speed, with no slowing." },
      { k: "Pull at the " + s.statorA + " A limit", v: K.n(r.force / F.LBF, 1), u: "lbf", sub: "at low speed; the piece weighs " + K.fix(s.pieceLb, 2) + "\u00a0lb", tip: "Torque at the current limit divided by the roller's radius: what the roller can pull while it is turning slowly. Faster, the motor has less torque; at free speed it has none. Lifting the piece up the bumper takes grip as well as pull." }
    ]);
    return K.verdict(r.state, text, more) + K.outs([
      { k: "Belt surface speed", v: fts(r.surface), u: "ft/s", sub: "at " + K.fix(s.V, 1) + " V, no load: " + K.fix(r.surface, 2) + " m/s", tip: "Roller radius times roller speed, at the battery voltage in Fine tuning with no load: the roller turns at " + K.n(r.rpm, 0) + " rpm. It slows as it grips a piece." },
      { k: "Piece speed", v: fts(r.piece), u: "ft/s", sub: plate ? "half the belt's surface speed, against a plate" : "the belt's full surface speed, driven both sides", tip: "How fast the piece moves along its path. How this is worked out says which speeds are compared.", state: r.state === "bad" ? "bad" : r.state === "warn" ? "warn" : "" },
      { k: "Surface to drive speed", v: isFinite(r.surfRatio) ? sr : "–", u: "×", sub: "good from " + tg + ": this page's rule", state: r.state, tip: "Belt surface speed divided by the robot's speed toward the piece. This page's rule, not an input: the piece should come in at least 10% faster than the floor brings it, and the surface should run at least twice the drive speed (a common rule of thumb). Against a plate the piece moves at half the surface speed, so that takes 2.2." },
      { k: "Time to pass through", v: K.fix(r.time, 2), u: "s", sub: "ideal: " + s.travel + " in at the piece speed" },
      { k: "Pull at the " + s.statorA + " A limit", v: K.n(r.force / F.LBF, 1), u: "lbf", sub: "most at low speed; the piece weighs " + K.fix(s.pieceLb, 2) + "\u00a0lb", tip: "Torque at the current limit divided by the roller's radius: what the roller can pull while it is turning slowly. Faster, the motor has less torque; at free speed it has none. Whether the piece follows also depends on the squeeze and the friction." }
    ]);
  },

  more: function (s, r) {
    var vd = r.vd, hi = Math.max(10, s.ratio * 1.5, isFinite(r.ratioGood) ? r.ratioGood * 1.3 : 0), lo = 1;
    var ymax = Math.max(2.6 * vd / FT, r.surface / FT * 1.15, 5);
    // Curves stop below the top of the chart, where the upright mark's name sits.
    function cut(v) { return v <= ymax * 0.86 ? v : NaN; }      // points above the chart's top are left out, not drawn outside it
    function at(G, dia) { return M.speeds({ drive: F.drive({ motor: s.motor, n: s.motors, ratio: G, eff: s.eff / 100, statorA: s.statorA }), V: s.V, rollerR: dia * IN / 2, contact: s.contact, driveV: vd, travel: s.travel * IN, pieceR: s.piece * IN / 2 }); }
    var pts = [], surf = [], dp = [], ds = [], pb = [], db = [], i, q, over = r.over;
    for (i = 0; i <= 80; i++) { var G = lo + (hi - lo) * i / 80; q = at(G, s.roller); pts.push([G, cut(q.piece / FT)]); surf.push([G, cut(q.surface / FT)]); if (over) pb.push([G, cut(q.pieceB / FT)]); }
    for (i = 0; i <= 60; i++) { var dia = 0.5 + 3.5 * i / 60; q = at(s.ratio, dia); dp.push([dia, cut(q.piece / FT)]); ds.push([dia, cut(q.surface / FT)]); if (over) db.push([dia, cut(q.pieceB / FT)]); }
    var y = { label: "ft/s", unit: "ft/s", min: 0, max: ymax };
    /* The level lines: the drive speed, and the pass line, the piece speed this page asks for (10% over the drive
       speed against a plate; twice the drive speed between two driven surfaces). An upright mark where the piece's
       curve crosses the pass line: the largest reduction, or the smallest roller, that passes. Level lines are drawn
       dotted (the belt's curve is dashed). */
    // The pass line is the piece speed this page asks for; over the bumper it is the piece on the floor.
    var passV = r.pass, passName = over ? "pass line, " + K.fix(passV / FT, 1) + " ft/s" : "pass line: " + K.fix(passV / vd, 1) + "× drive, " + K.fix(passV / FT, 1) + " ft/s";
    // The roller that passes at your reduction: the surface speed goes as the diameter, so the diameter that gives the
    // target surface speed.
    var dGood = r.surface > 0 ? s.roller * r.target * vd / r.surface : NaN;
    function hl(xr, lines, dx, dy, mx) {
      if (!(vd > 0.05)) return [];
      var X = function (x) { return 46 + (x - xr[0]) / (xr[1] - xr[0]) * 420; }, Yd = 156 - dy / ymax * 132, avoid = [[X(dx) - 8, Yd - 8, X(dx) + 8, Yd + 8]];
      if (isFinite(mx) && mx >= xr[0] && mx <= xr[1]) avoid.push([X(mx) - 4, 24, X(mx) + 4, 156], [X(mx), 24, X(mx) + 60, 40]);
      return [place(passName, passV / FT, xr, ymax, lines, avoid)];
    }
    function dotted(html) { return html.replace(/<line class="cmark" x1="46" x2="466"/g, '<line class="cmark" style="stroke-dasharray:1.5 3" x1="46" x2="466"'); }
    var note = vd > 0.05 ? (over ? "The dot is yours. Dotted: the pass line, the piece on the floor at 1.1× the drive speed. The upright mark is where it meets it." : "The dot is yours. Dotted: the pass line, the piece speed this page asks for. The upright mark is where the piece meets it.") : "The dot is yours.";
    var sName = over ? "Roller surface" : "Belt surface";
    function ser(pc, pbump, sf) { return over ? [{ name: "Piece on the floor", pts: pc, color: 3 }, { name: "Piece up the bumper", pts: pbump, color: 3, dash: true }, { name: sName, pts: sf, color: 1, dash: true }] : [{ name: "Piece", pts: pc, color: 3 }, { name: sName, pts: sf, color: 1, dash: true }]; }
    var rMark = isFinite(r.ratioGood) && r.ratioGood >= lo && r.ratioGood <= hi && vd > 0.05 ? [{ x: r.ratioGood, label: K.fix(r.ratioGood, 2) + ":1" }] : [];
    var dMark = isFinite(dGood) && dGood >= 0.5 && dGood <= 4 && vd > 0.05 ? [{ x: dGood, label: K.fix(dGood, 2) + " in" }] : [];
    var chart = '<div class="chartrow">' +
      dotted(K.chart({ id: "int-r", title: "Speeds for other reductions", note: note, x: { label: "reduction, to 1", name: "Reduction", min: lo, max: hi }, y: y,
        series: ser(pts, pb, surf), hlines: hl([lo, hi], [pts, surf].concat(over ? [pb] : []), s.ratio, r.piece / FT, r.ratioGood), marks: rMark, dots: [{ x: s.ratio, y: r.piece / FT }] })) +
      dotted(K.chart({ id: "int-d", title: "Speeds for other roller diameters", note: note, x: { label: "roller diameter (in)", name: "Diameter", unit: "in", min: 0.5, max: 4 }, y: y,
        series: ser(dp, db, ds), hlines: hl([0.5, 4], [dp, ds].concat(over ? [db] : []), s.roller, r.piece / FT, dGood), marks: dMark, dots: s.roller <= 4 ? [{ x: s.roller, y: r.piece / FT }] : [] })) + "</div>";
    return chart + K.notes(
      "<p>The roller turns at about its free speed until it grips a piece, so its surface moves at:</p>" +
      "<p>The free speed here is at the battery voltage in Fine tuning, 12 V unless you change it, with no load. Other tools on this site use a rested 12.3 V battery; at 12.3 V the roller would run 2.5% faster. The roller slows as soon as it grips a piece, so every speed on this page is the most it could be.</p>" +
      '<p class="eq">surface speed = roller radius × motor free speed × (battery ÷ 12 V) ÷ reduction</p>' +
      "<p>A piece pinched between the roller and a fixed plate rolls along the plate. Its bottom stays still on the plate and its top moves with the roller, so its centre moves at half the surface speed. Between two moving surfaces (two rollers, or a roller and a belt) it moves at the full surface speed.</p>" +
      '<p class="eq">piece speed = surface speed × ½ (against a plate) or × 1 (rollers on both sides)</p>' +
      "<p><b>Over the bumper.</b> One roller in front of the bumper takes the piece in two parts. First it pins the piece against the floor. In the robot's frame the floor is not still: it comes at the robot at the drive speed. So the piece rolls between two surfaces moving the same way, and its centre moves at their average. Then the piece reaches the bumper's face and rolls up it and over. The bumper does not move, so this part is the plate case: half the surface speed, whatever the drive speed.</p>" +
      '<p class="eq">on the floor: piece = (surface + drive) ÷ 2; up the bumper: piece = surface ÷ 2</p>' +
      "<p>So the answer to whether a bumper changes things: against the bumper it is the plate case, half the surface speed. What differs is the first touch, on the floor, which is easier: the floor helps carry the piece in. The piece comes in faster than the floor brings it whenever the roller's surface is faster than the drive speed. If it is slower, the roller's surface at first touch moves into the robot more slowly than the piece does, so its friction pushes the piece back out ahead of the robot instead of drawing it under.</p>" +
      "<p>That is where this page tests over-the-bumper intakes: the piece on the floor at least 10% faster than the floor brings it, which is a surface speed of 1.2 × the drive speed. Up the bumper the piece is slower, half the surface speed, but the floor no longer pushes it there, so speed is not the limit: grip is. The roller has to lift the piece while the bottom of it still rubs the floor. Bumper fabric grips, so the piece rolls; on a slick face it slides instead, and then it moves faster than half. This page does not know the friction, so it does not model the slide. Many teams still run about twice the drive speed, for margin as the roller slows when it grips.</p>" +
      '<p class="eq">time to pass through = travel ÷ piece speed</p>' +
      '<p class="eq">pull at the current limit = output torque at the limit ÷ roller radius</p>' +
      "<p>That pull is the most there is, while the roller turns slowly. As it speeds up, the motor's torque falls, to nothing at free speed.</p>" +
      "<p>In the robot's frame, the floor brings the piece toward the intake at the driving speed. If the roller takes it in slower than that, the piece cannot get out of the way: the robot shoves it along the floor until it bounces off or wedges.</p>" +
      "<p>Which speeds are compared: the piece's speed is along its own path. Where the roller first touches it (directly under the roller, still on the floor), that path runs straight along the floor, the same line the robot drives on, so the two speeds are compared as they are. That is the moment that matters: once the piece is up on the plate it is inside the robot and the floor no longer pushes it. Up the ramp the piece keeps its speed along the ramp; only part of that is along the floor, and it does not need to be more.</p>" +
      "<p>Many teams aim for a surface speed (roller or belt) of about twice the drive speed. That is a rule of thumb from experience, not a law, and against a plate it has no margin at all: the piece moves at half the surface speed, so at exactly 2 times it only matches the drive speed. This page calls an intake good when the surface runs at least 2 times the drive speed and the piece itself comes in at least 10% faster than the floor brings it. Against a plate that is a surface speed of 2.2 times the drive speed; between two driven surfaces, 2 times. Under that it says Check, and when the piece is slower than the floor it says Problem.</p>" +
      "<p>The pull is what the motor could give at its current limit. Whether the piece follows depends on the squeeze (how far the gap is smaller than the piece) and on the friction between them, which this page does not know. Test it with a real piece.</p>" +
      "<p>Left out: the roller slowing under load, slip between roller and piece, the squeeze, and the piece bouncing. The drawing shows the piece just touching; a real pinch squeezes it a little. Its shape (a curved lip under the roller, a 35° ramp, a belt from the roller to a second pulley) is a sketch of a common over-the-bumper intake; only the sizes and speeds come from your numbers. Over the bumper, the drawing puts the roller where it touches the piece on the floor and again in the corner against the bumper; a rigid ball cannot do both, so the drawing squeezes it by up to " + K.fix((s.piece / 2 + s.roller / 2) * (1 - Math.SQRT1_2), 1) + " in on the way, as a foam ball does. The floor part is " + K.fix(Math.SQRT2 * (s.piece / 2 + s.roller / 2), 1) + " in long in that drawing; the time uses the same length.</p>");
  },

  duration: function (s, r) { return r && r.dur || 2; },
  // At rest: the first touch.
  rest: function (s, r) {
    if (!r || r.vd <= 0.05 && !isFinite(r.time)) return null;
    // The moment of first touch: the piece on the floor under the roller, where the two speeds are compared.
    return r.tc + 1e-4;
  },

  draw: function (g, s, r, t) { return r.over ? drawOver(g, s, r, t) : draw(g, s, r, t); }
});


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
  // Room under the floor for the first-touch label, and over the top for the clock.
  var box = phone ? { x0: x0b, x1: G.E[0] + Rb + 2.5, y0: -3.6, y1: top + 4 } :
    { x0: x0b, x1: ballX0 + Rb + 2, y0: -3.4, y1: top + 3.5 };
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
  g.text("bumper", V.X(-1.75), V.Y(1.5) + 14, { align: "center", color: c.mute, size: 11 });
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
  // A ghost of the piece where the roller first touches it, on the floor under the roller: where the speeds are compared.
  var Ep = P(G.E), firstShown = d < 0 || d > Rb * 0.6 || jam;
  // A plain light disc, not an outline, so the piece's speed can sit over it without crossing a line.
  if (firstShown) g.circle(Ep[0], Ep[1], V.L(Rb), { fill: c.line, stroke: null });
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
  rimArrow(g, Cp[0], Cp[1], rimR, -1.25, -0.1, c.s1);
  // The clock and what is happening, at the top left. (The speed buttons say when it plays slowed.)
  // Every speed arrow is to one scale (length in proportion to speed), so the belt's is exactly twice the piece's.
  var sv = r.surface / IN, vmax = Math.max(vd, vp, sv, 1), aL = function (v) { return Math.max(12, (phone ? 80 : 92) * v / vmax); };
  var hx = 10, hy = 18;
  var status = t < r.tc ? "driving onto the piece" : jam ? "the piece is shoved before it is taken in" : inside ? "in, " + K.fix(r.time, 2) + " s after the roller touched it" : d < Rb * 0.6 ? "first touch: the roller has it" : "in the pinch: belt on top, " + (both ? "belt" : "plate") + " underneath";
  g.text(K.fix(t, 3) + " s", hx, hy, { weight: 700, size: 13 });
  g.text(status, hx + 62, hy, { color: jam && t >= r.tc ? c.bad : inside ? c.ok : c.text2, weight: 600, size: phone ? 11 : 12 });
  // The one caption: what the speeds are measured against.
  if (vd > 0.05) g.text(phone ? "Speeds relative to the robot; the floor comes at " + K.fix(vd / 12, 1) + " ft/s" : "Speeds are relative to the robot. The floor comes at the robot at the drive speed, " + K.fix(vd / 12, 1) + " ft/s.", hx, hy + 22, { size: 11, weight: 600, color: c.text2, base: "middle" });
  var ks = phone ? 11 : 12, used = [], pieceArrow = null, beltArrow = null;
  function free(x0, y0, x1, y1) { return !used.some(function (b) { return x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]; }); }
  function put(str, x, y, o) { var w = g.textWidth(str, o), x0 = o.align === "right" ? x - w : x; used.push([x0 - 3, y - 9, x0 + w + 3, y + 9]); g.text(str, x, y, Object.assign({ base: "middle" }, o)); }
  // The piece's speed: an arrow ahead of it, along its path, and its number beside the piece.
  // One colour for each speed, the same as in the charts: the piece green, the belt blue.
  var bx = V.X(bp[0]), by = V.Y(bp[1]), Rpx = V.L(Rb), col = c.s3, BLUE = c.s1;
  if (d < 0) {
    if (vd > 0.05) put("piece, still on the floor", bx, by - Rpx - 10, { align: "center", color: c.text2, weight: 600, size: phone ? 11 : 12 });
  } else if (jam) {
    var gl0 = aL(vd), sm = (phone ? "shoved " : "shoved along the floor at ") + K.fix(vd / 12, 1) + " ft/s", smw = g.textWidth(sm, { weight: 600 });
    g.arrow(bx + Rpx + 3, by, bx + Rpx + 3 + gl0, by, { color: c.bad, width: 2.5 });
    put(sm, Math.min(bx + Rpx + 3, g.w - smw - 6), Math.min(by + Rpx + 14, fy - 10), { color: c.bad, weight: 600, size: ks });
  } else if (!inside) {
    // Along the path just ahead (the chord to where the piece will be a little later), so the arrow stays in the channel.
    var ahead = G.at(Math.min(s.travel, d + Rb)).p, cl = Math.hypot(ahead[0] - bp[0], ahead[1] - bp[1]);
    var dir = cl > 1e-6 ? [(ahead[0] - bp[0]) / cl, (ahead[1] - bp[1]) / cl] : pos.dir, L1 = aL(vp), sx = bx + dir[0] * (Rpx + 3), sy = by - dir[1] * (Rpx + 3);
    // Kept clear of the post that carries the intake (the arrow points at it when the piece is fast).
    var postR = V.X(mountX + post / 2) + 10; if (dir[0] < -0.1) L1 = Math.max(12, Math.min(L1, (sx - postR) / -dir[0]));
    g.arrow(sx, sy, sx + dir[0] * L1, sy - dir[1] * L1, { color: col, width: 3, head: 10 });
    pieceArrow = [sx, sy, sx + dir[0] * L1, sy - dir[1] * L1];
    /* The pinch, on the ramp: the belt's surface above the piece moves at the roller's surface speed (an arrow just
       under the belt, ahead of the piece, twice as long as the piece's), and the plate under it does not move. */
    if (d > G.Larc) {
      var nT = [-G.r1[0], G.r1[1]], bsx = bx + nT[0] * (Rpx - 4) + dir[0] * (Rpx * 0.5), bsy = by + nT[1] * (Rpx - 4) - dir[1] * (Rpx * 0.5), BL = aL(sv);
      g.arrow(bsx, bsy, bsx + dir[0] * BL, bsy - dir[1] * BL, { color: BLUE, width: 3, head: 10 });
      beltArrow = [bsx, bsy, bsx + dir[0] * BL, bsy - dir[1] * BL];
      // Its number above the belt, over the pinch, joined to the arrow by a thin line.
      var up = (Rpx + V.L(2 * Rr) + (phone ? 34 : 16)), lx = bx + nT[0] * up, ly = by + nT[1] * up, bt2 = (phone ? "belt " : "belt surface ") + K.fix(sv / 12, 1) + " ft/s";
      // The leader runs from the label to the belt's outer edge, not across the belt.
      var edge = Rpx + V.L(2 * Rr) + 2, ex = bx + nT[0] * edge + dir[0] * BL * 0.5, ey = by + nT[1] * edge - dir[1] * BL * 0.5;
      // On a phone the name sits up and to the left of its leader, clear of the roller at the belt's end.
      var bw2 = g.textWidth(bt2, { size: ks, weight: 700 }), blx = Math.min(lx, g.w - bw2 - 6), bly = ly;
      g.line(ex, ey, blx + 4, bly + 6, { color: BLUE, width: 1 });
      put(bt2, blx, bly, { size: ks, weight: 700, color: BLUE });
    }
  }
  // The roller's surface speed by its rim arrow, while the pinch is not shown (before the piece is on the ramp).
  if (!(d > G.Larc && !inside && !jam)) {
    var rl = (phone ? "belt " : "belt surface ") + K.fix(r.surface / FT, 1) + " ft/s", rlw = g.textWidth(rl, { size: 12, weight: 600 });
    var rlx = Math.min(Cp[0] + rimR + 10, g.w - rlw - 6), rly = Cp[1] - rimR - 4;
    // Beside the rim arrow; on a phone, where the roller is near the edge, on two short lines.
    if (phone && rlx < Cp[0] + rimR + 6) { put("belt", Cp[0] + rimR + 6, rly - 13, { size: 11, weight: 700, color: BLUE }); put(K.fix(r.surface / FT, 1) + " ft/s", Cp[0] + rimR + 6, rly, { size: 11, weight: 700, color: BLUE }); }
    else if (free(rlx - 3, rly - 9, rlx + rlw + 3, rly + 9)) put(rl, rlx, rly, { size: 12, weight: 600, color: BLUE });
  }
  /* Level labels. Each is a box that must clear the ball, the arrows, the belt, the plate and every label already
     placed. A box of width w, height h, its top-left corner at (x, y), is tried at a list of places; the first clear
     one is used. */
  // The plate's height at screen x: the straight ramp, then the curved lip about the roller's centre, then the floor.
  function plateY(x) { var xw = V.ux(x); if (xw <= G.P1[0]) return V.Y(G.P1[1] + Math.tan(G.TH) * (G.P1[0] - xw)); var dx = xw - G.C[0]; return Math.abs(dx) < G.Rp ? V.Y(G.C[1] - Math.sqrt(G.Rp * G.Rp - dx * dx)) : V.Y(0); }
  function beltY(x) { var bxw = V.ux(x), k = (G.C[0] + G.r1[0] * Rr - bxw) / Math.cos(G.TH); return V.Y(G.C[1] + G.r1[1] * Rr + Math.sin(G.TH) * k); }
  function segHit(sg, x0, y0, x1, y1) { if (!sg) return false; for (var q = 0; q <= 10; q++) { var px = sg[0] + (sg[2] - sg[0]) * q / 10, py = sg[1] + (sg[3] - sg[1]) * q / 10; if (px > x0 - 5 && px < x1 + 5 && py > y0 - 5 && py < y1 + 5) return true; } return false; }
  function clear(x0, y0, w, h) {
    var x1 = x0 + w, y1 = y0 + h;
    if (x0 < 4 || x1 > g.w - 4 || y0 < 30 || y1 > fy - 2) return false;
    if (!free(x0, y0, x1, y1)) return false;
    var cx = Math.max(x0, Math.min(bx, x1)), cy = Math.max(y0, Math.min(by, y1)); if (Math.hypot(cx - bx, cy - by) < Rpx + 4) return false;
    if (segHit(pieceArrow, x0, y0, x1, y1) || segHit(beltArrow, x0, y0, x1, y1)) return false;
    // Above the plate and below the belt's lower run (the channel), or below the plate: not across either line.
    var pl = Math.min(plateY(x0), plateY(x1)), ph = Math.max(plateY(x0), plateY(x1)), bl = Math.max(beltY(x0), beltY(x1));
    var inChannel = y0 > bl + 3 && y1 < pl - 3, under = y0 > ph + 2;
    // Clear of the ghost of the first touch too.
    if (firstShown) { var gx = Math.max(x0, Math.min(Ep[0], x1)), gy = Math.max(y0, Math.min(Ep[1], y1)); if (Math.hypot(gx - Ep[0], gy - Ep[1]) < V.L(Rb) + 3) return false; }
    if (x0 < V.X(mountX + post / 2) + 4) return false;
    return inChannel || under && x0 > V.X(0) + 4;
  }
  function label(lines, color, places) {
    var o = { size: 11, weight: 700 }, w = Math.max.apply(null, lines.map(function (t) { return g.textWidth(t, o); })) + 4, h = 12 * lines.length + 1;
    for (var q = 0; q < places.length; q++) {
      /* A place is [x, y, how x is read: "c" centre or "l" left, how y is read]: y "chan" puts the box in the middle of
         the channel between the belt and the plate at that x; "under" puts it just under the plate. */
      var x0 = places[q][0] - (places[q][2] === "c" ? w / 2 : places[q][2] === "r" ? w : 0), y0;
      if (places[q][3] === "chan") y0 = (Math.max(beltY(x0), beltY(x0 + w)) + Math.min(plateY(x0), plateY(x0 + w))) / 2 - h / 2;
      else if (places[q][3] === "under") y0 = Math.max(plateY(x0), plateY(x0 + w)) + 3;
      else if (places[q][3] === "high") y0 = Math.max(beltY(x0), beltY(x0 + w)) + 4;
      else if (places[q][3] === "low" && pieceArrow) { var sl = (pieceArrow[3] - pieceArrow[1]) / ((pieceArrow[2] - pieceArrow[0]) || 1e-9), ay = function (x) { return pieceArrow[1] + (x - pieceArrow[0]) * sl; }; y0 = Math.max(ay(x0), ay(x0 + w)) + 4; }
      else y0 = places[q][1] - (places[q][3] === "c" ? h / 2 : 0);
      if (clear(x0, y0, w, h)) { lines.forEach(function (t, j) { g.text(t, x0 + 2, y0 + 6 + 12 * j, Object.assign({ color: color, base: "middle" }, o)); }); used.push([x0 - 2, y0 - 2, x0 + w + 2, y0 + h + 2]); return [x0, y0, w, h]; }
    }
    return null;
  }
  // The piece's speed, level, in the channel ahead of its arrow (or behind the piece, or under the ramp).
  if (pieceArrow) {
    var ux = -Math.cos(G.TH), uy = -Math.sin(G.TH), pl2 = ["piece " + K.fix(vp / 12, 1) + " ft/s"].concat(both ? [] : ["half the belt"]), cands = [];
    for (var kq = 0; kq < 24; kq++) cands.push([pieceArrow[2] + ux * (10 + 8 * kq), 0, "c", "chan"]);
    // Under the arrow, between it and the plate, beside the piece.
    for (kq = 0; kq < 24; kq++) cands.push([pieceArrow[0] + ux * (8 * kq) - 60, 0, "l", "low"]);
    // Between the arrow and the belt above it.
    for (kq = 0; kq < 24; kq++) cands.push([pieceArrow[0] + ux * (8 * kq) - 30, 0, "l", "high"]);
    for (kq = 0; kq < 12; kq++) cands.push([bx - ux * (Rpx + 30 + 9 * kq), 0, "c", "chan"]);
    // If the full words find no clear place (the channel is short on a wide drawing), the same in fewer letters.
    if (!label(pl2, col, cands)) label(both ? ["piece", K.fix(vp / 12, 1) + " ft/s"] : ["piece, half:", K.fix(vp / 12, 1) + " ft/s"], col, cands);
  }
  /* The plate, named in every frame (still or playing): under the ramp, level, in the open space right of the bumper,
     with a short leader up to the plate. */
  if (!jam) {
    var pt2 = both ? ["lower belt,", K.fix(sv / 12, 1) + " ft/s"] : ["fixed plate,", "0 ft/s"], pc = [], xq;
    for (xq = V.X(0) + 6; xq < Ep[0]; xq += 5) pc.push([xq, 0, "l", "under"]);
    var bxp = label(pt2, c.text2, pc);
    if (bxp) { var lxp = bxp[0] + 6; g.line(lxp, bxp[1] - 1, lxp, plateY(lxp) + 2, { color: c.text2, width: 1 }); }
    else {
      // The piece is passing over that spot: the name goes just under the floor, with its leader up to the plate.
      var fx0 = V.X(0) + 10, ft2 = pt2.join(" ");
      g.text(ft2, fx0, fy + 16, { size: 11, weight: 700, color: c.text2 });
      g.line(fx0 + 6, fy + 5, fx0 + 6, plateY(fx0 + 6) + 2, { color: c.text2, width: 1 });
    }
  }
  // The first touch: under the floor beneath the ghost, the two speeds compared there.
  if (vd > 0.05 && d >= -1e-9 || firstShown && vd > 0.05) {
    var ft = "first touch", fo = { size: 11, weight: 700, color: c.text2, align: "center" };
    g.text(ft, Ep[0], fy + 16, fo);
  }
  /* The floor, as the robot sees it: it comes at the robot at the drive speed. One arrow along the floor, under the
     first touch, pointing at the robot, with its speed. */
  if (vd > 0.05) {
    var flab = "floor " + K.fix(vd / 12, 1) + " ft/s", fL = aL(vd), fyy = fy + 32, fx = Math.min(Ep[0], g.w - 16 - g.textWidth(flab, { size: ks, weight: 700 }));
    g.arrow(fx + 2, fyy, fx + 2 - fL, fyy, { color: c.text2, width: 3, head: 10 });
    g.text(flab, fx + 10, fyy, { size: ks, weight: 700, color: c.text2, base: "middle" });
  }
}

/* "Over the bumper": the robot's front from the side, to scale. One roller on an arm in front of the bumper; the piece
   on the floor is pinched under it, rolls in to the bumper's face, up it and over. Everything is drawn as the robot sees
   it: the floor moves toward the robot at the drive speed. */
function drawOver(g, s, r, t) {
  var c = g.c, G = r.GO, Rb = G.Rb, Rr = G.Rr, bTop = G.bTop, phone = g.w < 520;
  var vd = r.vd / IN, vf = r.piece / IN, vb = r.pieceB / IN, sv = r.surface / IN;            // inches per second
  var jam = r.state === "bad" && vd > 0.05, ballX0 = G.E[0] + r.gap;
  // How far along its path the piece is (inches): the floor part at the floor speed, the rest at the bumper speed.
  var d;
  if (t <= r.tc) d = -1;
  else if (jam) d = 0;
  else { var tt = t - r.tc, tf = G.Lf / Math.max(vf, 1e-9); d = Math.min(s.travel, tt <= tf ? tt * vf : G.Lf + (tt - tf) * vb); }
  var pos = d < 0 ? { p: [ballX0 - vd * t, Rb], dir: [-1, 0], phase: "before" } : G.at(d), bp = pos.p, inside = d >= s.travel - 1e-9;
  var endP = G.at(s.travel).p;
  // The arm: a post behind the bumper, across above the piece's path, and down to the roller's axle.
  var armTop = Math.max(G.C[1] + Rr + 2.2, bTop + 2 * Rb + 1.6), postX = Math.min(-6.5, endP[0] - Rb - 1.4), aw = 0.8;
  var x0b = Math.min(-12.6, postX - 1.5);
  var box = phone ? { x0: x0b, x1: G.E[0] + Rb + 3, y0: -3.8, y1: armTop + 1 } : { x0: x0b, x1: ballX0 + Rb + 2, y0: -3.6, y1: armTop + 1 };
  var V = g.view(box, phone ? { l: 6, r: 6, t: 50, b: 6 } : { l: 8, r: 8, t: 50, b: 8 }, "middle");
  var step = V.k >= 9 ? 1 : 6;
  var gnote = step === 1 ? "1 in squares" : "6 in squares";
  // On a phone the header needs the top line's width, so the grid's note goes under the floor at the left.
  g.grid(V, step, phone ? "" : gnote);
  function P(p) { return [V.X(p[0]), V.Y(p[1])]; }
  var fy = V.Y(0), shift = vd * t;
  if (phone) g.text(gnote, 10, fy + 20, { size: 11, color: c.mute });
  // The floor, its marks moving toward the robot.
  g.line(0, fy, g.w, fy, { color: c.text2, width: 1.5 });
  var x0w = V.ux(0), x1w = V.ux(g.w);
  for (var m = Math.floor((x0w + shift) / 3) * 3; m - shift < x1w + 3; m += 3) { var mx = V.X(m - shift); g.line(mx, fy, mx - 6, fy + 7, { color: c.line2, width: 1 }); }
  // The robot: frame rail, wheel, bumper, and the arm's post (behind the piece: it is the far side's).
  var railX = Math.min(-12, postX - 1);
  g.rect(V.X(railX), V.Y(4), V.L(-3.5 - railX), V.L(2), { fill: c.part, stroke: c.partLine, width: 1, radius: 2 });
  g.wheel(V.X(-8), V.Y(2), V.L(2), vd * t / 2, { spokes: 5 });
  g.rect(V.X(postX - aw / 2), V.Y(armTop + aw / 2), V.L(aw), V.Y(4) - V.Y(armTop + aw / 2), { fill: c.part2, stroke: c.partLine, width: 1 });
  var Cp = P(G.C), elbow = [G.C[0] + 1.8, armTop];
  g.rect(V.X(postX - aw / 2), V.Y(armTop + aw / 2), V.X(elbow[0]) - V.X(postX - aw / 2), V.L(aw), { fill: c.part2, stroke: c.partLine, width: 1 });
  g.line(V.X(elbow[0]), V.Y(armTop), Cp[0], Cp[1], { color: c.part2, width: V.L(aw) });
  g.line(V.X(elbow[0]), V.Y(armTop), Cp[0], Cp[1], { color: c.partLine, width: 1 });
  g.rect(V.X(-3.5), V.Y(bTop), V.L(3.5), V.L(bTop - 1.5), { fill: c.s1, stroke: null, radius: V.L(0.8) });
  g.text("bumper", V.X(-1.75), V.Y(1.5) + 14, { align: "center", color: c.mute, size: 11 });
  // A ghost of the piece at first touch, where the floor part starts and the speeds are compared.
  var Ep = P(G.E), firstShown = d < 0 || d > Rb * 0.6 || jam;
  if (firstShown) g.circle(Ep[0], Ep[1], V.L(Rb), { fill: c.line, stroke: null });
  // The piece (it rolls, so it turns as it goes), then the roller over it: where they overlap the piece is squeezed.
  var ang = d < 0 ? 0 : -d / Rb;
  g.ball(V.X(bp[0]), V.Y(bp[1]), V.L(Rb), ang + 0.6, {});
  g.wheel(Cp[0], Cp[1], V.L(Rr), r.w * t, { spokes: 4, tread: Math.max(1.5, V.L(Rr) * 0.14) });
  // Which way the roller's surface moves: clockwise, so its underside moves into the robot.
  var rimR = V.L(Rr) + 6, BLUE = c.s1, GREEN = c.s3;
  rimArrow(g, Cp[0], Cp[1], rimR, -1.25, -0.1, BLUE);
  // Speed arrows, all to one scale.
  var vmax = Math.max(vd, vf, sv, 1), aL = function (v) { return Math.max(12, (phone ? 70 : 92) * v / vmax); };
  var bx = V.X(bp[0]), by = V.Y(bp[1]), Rpx = V.L(Rb), ph = pos.phase, vNow = ph === "floor" || ph === "before" ? vf : vb;
  var boxes = [], circles = [[bx, by, Rpx + 4], [Cp[0], Cp[1], rimR + 4], [Ep[0], Ep[1], firstShown ? V.L(Rb) + 3 : 0]];
  // The bumper, the post, the arm and the rail, as boxes a label must not touch.
  boxes.push([V.X(-3.5) - 3, V.Y(bTop) - 3, V.X(0) + 3, V.Y(1.5) + 3], [V.X(postX - aw / 2) - 3, V.Y(armTop + aw / 2) - 3, V.X(postX + aw / 2) + 3, V.Y(4)],
    [V.X(postX), V.Y(armTop + aw / 2) - 3, V.X(elbow[0]) + 3, V.Y(armTop - aw / 2) + 3], [V.X(railX), V.Y(4), V.X(-3.5), V.Y(2)]);
  var armSeg = [V.X(elbow[0]), V.Y(armTop), Cp[0], Cp[1]];
  function segNear(sg, x0, y0, x1, y1, pad) { for (var q = 0; q <= 12; q++) { var px = sg[0] + (sg[2] - sg[0]) * q / 12, py = sg[1] + (sg[3] - sg[1]) * q / 12; if (px > x0 - pad && px < x1 + pad && py > y0 - pad && py < y1 + pad) return true; } return false; }
  var arrows = [armSeg];
  function clearBox(x0, y0, x1, y1) {
    if (x0 < 4 || x1 > g.w - 4 || y0 < 46 || y1 > fy - 3) return false;
    if (boxes.some(function (b) { return x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]; })) return false;
    if (circles.some(function (q) { var cx = Math.max(x0, Math.min(q[0], x1)), cy = Math.max(y0, Math.min(q[1], y1)); return Math.hypot(cx - q[0], cy - q[1]) < q[2]; })) return false;
    return !arrows.some(function (sg) { return segNear(sg, x0, y0, x1, y1, 4); });
  }
  // A level label (one or two lines) at the first clear place in a list of [x, y, "l" | "r" | "c"] (y is its middle).
  function label(lines, color, places) {
    var o = { size: 11, weight: 700 }, w = Math.max.apply(null, lines.map(function (tx) { return g.textWidth(tx, o); })), h = 12 * lines.length;
    for (var q = 0; q < places.length; q++) {
      var x0 = places[q][0] - (places[q][2] === "r" ? w : places[q][2] === "c" ? w / 2 : 0), y0 = places[q][1] - h / 2;
      if (clearBox(x0 - 2, y0 - 2, x0 + w + 2, y0 + h + 2)) {
        lines.forEach(function (tx, j) { g.text(tx, x0, y0 + 6 + 12 * j, Object.assign({ color: color, base: "middle" }, o)); });
        boxes.push([x0 - 2, y0 - 2, x0 + w + 2, y0 + h + 2]); return true;
      }
    }
    return false;
  }
  if (d >= 0 && !inside && !jam) {
    var dir = pos.dir, Lp = aL(vNow), sx = bx + dir[0] * (Rpx + 3), sy = by - dir[1] * (Rpx + 3);
    g.arrow(sx, sy, sx + dir[0] * Lp, sy - dir[1] * Lp, { color: GREEN, width: 3, head: 10 });
    arrows.push([sx, sy, sx + dir[0] * Lp, sy - dir[1] * Lp]);
    var ex = sx + dir[0] * Lp, ey = sy - dir[1] * Lp, pl = ["piece " + K.fix(vNow / 12, 1) + " ft/s"], cand = [];
    for (var kq = 0; kq < 8; kq++) cand.push([ex - 6 - 6 * kq, ey - 16 - 4 * kq, "r"], [ex + 8, ey - 14 - 5 * kq, "l"], [bx + Rpx + 8 + 4 * kq, by - Rpx * 0.4 - 6 * kq, "l"], [bx - Rpx - 8, by - Rpx - 10 - 6 * kq, "r"]);
    label(pl, GREEN, cand);
  } else if (jam && d >= 0) {
    var jl = aL(vd);
    g.arrow(bx + Rpx + 3, by, bx + Rpx + 3 + jl, by, { color: c.bad, width: 2.5 });
    arrows.push([bx + Rpx + 3, by, bx + Rpx + 3 + jl, by]);
    label(["pushed ahead"], c.bad, [[bx + Rpx + 3, by - 16, "l"], [bx + Rpx + 3, by + 16, "l"], [bx - Rpx - 6, by - Rpx - 10, "r"]]);
  } else if (d < 0 && vd > 0.05) label(["piece, still on the floor"], c.text2, [[bx, by - Rpx - 12, "c"], [bx - Rpx - 6, by - Rpx - 12, "r"]]);
  // The roller's surface speed, beside its rim arrow.
  var rl = "roller surface " + K.fix(sv / 12, 1) + " ft/s", rx = Cp[0] + rimR + 6, ry = Cp[1] - rimR - 4;
  if (!label([rl], BLUE, [[rx, ry, "l"], [rx, ry - 14, "l"], [Cp[0], Cp[1] - rimR - 16, "c"], [Cp[0] - rimR - 6, ry, "r"]])) label(["roller", K.fix(sv / 12, 1) + " ft/s"], BLUE, [[rx, ry, "l"], [rx, ry - 14, "l"], [Cp[0] + rimR + 4, Cp[1] + rimR + 8, "l"]]);
  // The header: the time, then which part the piece is in, with its speed in that part.
  var hx = 10, hy = 18, status, scol = c.text2;
  if (t < r.tc) status = "driving onto the piece";
  else if (jam) { status = "the roller's surface is slower than the floor: it pushes the piece ahead"; scol = c.bad; }
  else if (inside) { status = "over the bumper and in, " + K.fix(r.time, 2) + " s after first touch"; scol = c.ok; }
  else if (ph === "floor") status = (d < Rb * 0.6 ? "first touch: " : "") + "pinched against the floor, piece " + K.fix(vf / 12, 1) + " ft/s";
  else status = (ph === "over" ? "over the top, " : "rolling up the bumper, ") + "piece " + K.fix(vb / 12, 1) + " ft/s";
  g.text(K.fix(t, 3) + " s", hx, hy, { weight: 700, size: 13 });
  var sw = wrapText(g, status, g.w - hx - 72, { size: phone ? 11 : 12, weight: 600 });
  sw.forEach(function (ln, j) { g.text(ln, hx + 62, hy + 15 * j, { color: scol, weight: 600, size: phone ? 11 : 12 }); });
  if (vd > 0.05) g.text(phone ? "Speeds relative to the robot; the floor comes at " + K.fix(vd / 12, 1) + " ft/s" : "Speeds are relative to the robot. The floor comes at the robot at the drive speed, " + K.fix(vd / 12, 1) + " ft/s.", hx, hy + 15 * (sw.length - 1) + 20, { size: 11, weight: 600, color: c.text2, base: "middle" });
  // Under the floor: the first touch, and the floor's own speed pointing at the robot.
  if (vd > 0.05) {
    g.text("first touch", Ep[0], fy + 16, { size: 11, weight: 700, color: c.text2, align: "center" });
    var flab = "floor " + K.fix(vd / 12, 1) + " ft/s", fL = aL(vd), fyy = fy + 32, fx = Math.min(Ep[0], g.w - 16 - g.textWidth(flab, { size: phone ? 11 : 12, weight: 700 }));
    g.arrow(fx + 2, fyy, fx + 2 - fL, fyy, { color: c.text2, width: 3, head: 10 });
    g.text(flab, fx + 10, fyy, { size: phone ? 11 : 12, weight: 700, color: c.text2, base: "middle" });
  }
}
function wrapText(g, str, maxW, o) { var words = str.split(" "), lines = [], cur = ""; words.forEach(function (w) { var tx = cur ? cur + " " + w : w; if (cur && g.textWidth(tx, o) > maxW) { lines.push(cur); cur = w; } else cur = tx; }); if (cur) lines.push(cur); return lines; }
})(typeof window !== "undefined" ? window : this);
