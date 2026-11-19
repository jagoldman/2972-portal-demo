/* Tools: Code constants (#tool-code). Turns a mechanism's gearing and size into the conversion constants robot code
   needs (Java, and the CTRE and REV settings), with a still drawing of the mechanism: the motor and gearbox, then the
   wheel or spool to scale, or the arm's angle. Split from Unit conversion (#tool-units), which it used to share a page
   with. The maths (M) runs in Node for tests/tool-code.test.js. Every factor is exact or from exact definitions. */
(function (root) {
"use strict";
var M = {};
var IN = 0.0254, FT = 0.3048;
/* A mechanism's constants. o: { kind: "wheel" | "spool" | "arm", ratio (motor turns per output turn), dia (in), rig
   (1 to 4, spool only: how far the carriage moves per length of rope or belt), rpm (a motor speed) }.
   Linear kinds: perRot (m of travel per motor rotation), perRpm (m/s per motor rpm), max (m/s at rpm).
   Arm: perRot (rad per motor rotation), perRotDeg, perRpm (rad/s per motor rpm), max (rad/s and deg/s at rpm). */
M.mech = function (o) {
  var G = o.ratio, r = { kind: o.kind, ratio: G };
  if (o.kind === "arm") {
    r.perRot = 2 * Math.PI / G; r.perRotDeg = 360 / G; r.perRpm = r.perRot / 60; r.max = r.perRpm * o.rpm; r.maxDeg = r.max * 180 / Math.PI; r.outRpm = o.rpm / G;
    return r;
  }
  var rig = o.kind === "spool" ? (o.rig || 1) : 1, circ = Math.PI * o.dia * IN;
  r.circ = circ; r.rig = rig; r.perOut = circ * rig;                       // m per output (wheel, spool) turn
  r.perRot = r.perOut / G; r.perRpm = r.perRot / 60; r.max = r.perRpm * o.rpm; r.maxFt = r.max / FT; r.outRpm = o.rpm / G;
  return r;
};

// The Java names follow the mechanism chosen: kWheel..., kSpool..., kArm...
M.prefix = function (kind) { return kind === "wheel" ? "Wheel" : kind === "spool" ? "Spool" : "Arm"; };
// One rpm of the motor as a plain speed: the figure under "Speed per motor rpm", to three significant figures.
M.plain3 = function (x) { if (!isFinite(x) || x === 0) return "0"; return String(Number(x.toPrecision(3))); };

// The Java names follow the mechanism chosen: kWheel..., kSpool..., kArm...
M.prefix = function (kind) { return kind === "wheel" ? "Wheel" : kind === "spool" ? "Spool" : "Arm"; };
// One rpm of the motor as a plain speed: the figure under "Speed per motor rpm", to three significant figures.
M.plain3 = function (x) { if (!isFinite(x) || x === 0) return "0"; return String(Number(x.toPrecision(3))); };

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- Page ---------- */
var K = D.calc, esc = D.esc, ID = "tool-code", F = root.FRC, IN_M = 0.0254;
var MECH = [["wheel", "Wheel or roller"], ["spool", "Spool or pinion"], ["arm", "Arm or turret"]];
// For the answers: five significant figures at most, commas in big numbers, e-notation for the very large and small.
// The code block and the vendor settings carry the full figure (num, java).
function sig(x) {
  if (!isFinite(x)) return "–"; if (x === 0) return "0";
  var a = Math.abs(x); if (a >= 1e9 || a < 1e-4) return x.toExponential(4).replace(/\.?0+e/, "e").replace("e+", "e");
  var dp = Math.max(0, 4 - Math.floor(Math.log10(a)));
  return x.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: Math.min(dp, 9) });
}
// For code: plenty of digits, no commas.
function num(x) { return isFinite(x) ? String(Number(x.toPrecision(10))) : "0"; }
function java(x) { var s = num(x); return /[.e]/.test(s) ? s : s + ".0"; }
// The constants' names follow the mechanism: kWheel..., kSpool..., kArm...
function prefix(kind) { return M.prefix(kind); }
function what(kind) { return kind === "wheel" ? "wheel" : kind === "spool" ? "spool" : "arm"; }

// The mechanism's answers, the worked steps and the Java constants, in one place so outs and more agree.
function mechOf(s, r) {
  var m = r.m, P = prefix(s.mk), o = {};
  if (s.mk !== "arm") {
    o.sent = "One motor turn moves the " + (s.mk === "wheel" ? "wheel's surface" : "carriage") + " " + sig(m.perRot) + " m (" + sig(m.perRot / IN_M) + " in). At the " + K.n(s.rpm, 0) + " rpm you entered that is " + sig(m.max) + " m/s (" + sig(m.maxFt) + " ft/s).";
    o.items = [
      { k: "Per motor rotation", v: sig(m.perRot), u: "m", sub: sig(m.perRot / IN_M) + " in", kc: "k" + P + "MetersPerMotorRotation" },
      { k: (s.mk === "spool" ? "Carriage travel" : "Travel") + " per " + what(s.mk) + " turn", v: sig(m.perOut), u: "m", sub: sig(m.perOut / IN_M) + " in" + (s.mk === "spool" ? ", " + m.rig + "× rigging" : "") },
      { k: "Speed per motor rpm", v: sig(m.perRpm), u: "m/s per rpm", sub: "1,000 rpm = " + M.plain3(m.perRpm * 1000) + " m/s", kc: "k" + P + "MetersPerSecondPerMotorRpm" },
      { k: "Speed at the motor speed you entered", v: sig(m.max), u: "m/s", sub: sig(m.maxFt) + " ft/s at " + K.n(s.rpm, 0) + " rpm", kc: "k" + P + "SpeedAtEnteredRpmMetersPerSecond" }];
    o.work = [[cap(what(s.mk)) + " turn", "π × " + num(s.dia) + " in × 0.0254 m per in" + (s.mk === "spool" ? " × " + m.rig + " (rigging)" : ""), sig(m.perOut) + " m"],
      ["Per motor rotation", sig(m.perOut) + " m ÷ " + num(s.ratio), sig(m.perRot) + " m"],
      ["Per motor rpm", sig(m.perRot) + " m ÷ 60 s per min", sig(m.perRpm) + " m/s per rpm"],
      ["At the motor speed you entered", sig(m.perRpm) + " per rpm × " + num(s.rpm) + " rpm", sig(m.max) + " m/s"]];
    o.code = "// " + MECH.filter(function (x) { return x[0] === s.mk; })[0][1] + ": " + num(s.ratio) + ":1 reduction, " + num(s.dia) + " in diameter" + (s.mk === "spool" ? ", " + s.rig + "x rigging" : "") + "\n" +
      "// Motor rotations per " + what(s.mk) + " rotation\n" +
      "public static final double k" + P + "GearRatio = " + java(s.ratio) + ";\n" +
      "public static final double k" + P + "DiameterMeters = " + java(s.dia * IN_M) + ";\n" +
      (s.mk === "spool" ? "public static final double k" + P + "RiggingMultiplier = " + java(s.rig) + ";\n" : "") +
      "public static final double k" + P + "MetersPerMotorRotation = " + java(m.perRot) + ";\n" +
      "public static final double k" + P + "MetersPerSecondPerMotorRpm = " + java(m.perRpm) + ";\n" +
      "// At " + num(s.rpm) + " motor rpm, the speed entered on the page\n" +
      "public static final double k" + P + "SpeedAtEnteredRpmMetersPerSecond = " + java(m.max) + ";";
  } else {
    o.sent = "One motor turn swings the arm " + sig(m.perRotDeg) + "°. At the " + K.n(s.rpm, 0) + " rpm you entered it turns " + sig(m.maxDeg) + "° per second (" + sig(m.outRpm) + " rpm).";
    o.items = [
      { k: "Per motor rotation", v: sig(m.perRotDeg), u: "°", sub: sig(m.perRot) + " rad", kc: "kArmDegreesPerMotorRotation" },
      { k: "Speed per motor rpm", v: sig(m.perRpm), u: "rad/s per rpm", sub: "1,000 rpm = " + M.plain3(m.perRpm * 1000 * 180 / Math.PI) + "°/s", kc: "kArmRadiansPerSecondPerMotorRpm" },
      { k: "Speed at the motor speed you entered", v: sig(m.maxDeg), u: "°/s", sub: sig(m.max) + " rad/s at " + K.n(s.rpm, 0) + " rpm", kc: "kArmSpeedAtEnteredRpmRadiansPerSecond" },
      { k: "Arm turns", v: sig(m.outRpm), u: "rpm", sub: "at that motor speed" }];
    o.work = [["Per motor rotation", "360° ÷ " + num(s.ratio), sig(m.perRotDeg) + "°"],
      ["In radians", "2π ÷ " + num(s.ratio), sig(m.perRot) + " rad"],
      ["Per motor rpm", sig(m.perRot) + " rad ÷ 60 s per min", sig(m.perRpm) + " (rad/s) per rpm"],
      ["At the motor speed you entered", sig(m.perRpm) + " per rpm × " + num(s.rpm) + " rpm", sig(m.max) + " rad/s"]];
    o.code = "// Arm or turret: " + num(s.ratio) + ":1 reduction\n" +
      "// Motor rotations per arm rotation\n" +
      "public static final double kArmGearRatio = " + java(s.ratio) + ";\n" +
      "public static final double kArmRadiansPerMotorRotation = " + java(m.perRot) + ";\n" +
      "public static final double kArmDegreesPerMotorRotation = " + java(m.perRotDeg) + ";\n" +
      "public static final double kArmRadiansPerSecondPerMotorRpm = " + java(m.perRpm) + ";\n" +
      "// At " + num(s.rpm) + " motor rpm, the speed entered on the page\n" +
      "public static final double kArmSpeedAtEnteredRpmRadiansPerSecond = " + java(m.max) + ";";
  }
  return o;
}
// The rigging slider's numbers, 1 to 4, right under its track.
function rigTicks(html) { return html.replace('<small class="cfh">', '<div class="t-code-ticks" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span></div><small class="cfh">'); }
function cap(x) { return x.charAt(0).toUpperCase() + x.slice(1); }

K.tool({
  id: ID,
  defaults: { mk: "spool", ratio: 12, dia: 1.5, rig: 1, rpm: (F ? F.motor("kraken60").freeRpm : 6065) },
  stage: { ratio: 2.3, narrow: 1.15, label: "The mechanism: the motor and its gearbox, then the wheel, spool or arm to scale, with how far it moves for one turn." },

  compute: function (s) { return { m: M.mech({ kind: s.mk, ratio: s.ratio, dia: s.dia, rig: s.rig, rpm: s.rpm }) }; },

  controls: function (s) {
    var kraken = F ? F.motor("kraken60").freeRpm : 6065;
    var mech = K.seg(ID, "mk", "Mechanism", MECH) +
      K.num(ID, "ratio", "Reduction", { unit: ":1", min: 0.01, max: 2000, step: "any", tip: "Motor turns for one turn of the wheel, spool or arm. 12 means the motor turns twelve times for one output turn." }) +
      (s.mk === "arm" ? "" : K.num(ID, "dia", s.mk === "wheel" ? "Wheel diameter" : "Spool or pinion diameter", { unit: "in", min: 0.05, max: 24, step: "any", tip: s.mk === "spool" ? "Where the rope or belt runs, or the pinion's pitch diameter." : "The tread's outside diameter. Worn tread is a little smaller." })) +
      (s.mk === "spool" ? rigTicks(K.num(ID, "rig", "Rigging", { unit: "×", min: 1, max: 4, step: 1, slider: true, hint: "Carriage travel for each inch of rope: 1 for continuous rigging or a single carriage, 3 for a cascade with two moving stages, 2 with one.", tip: "As the Elevator tool counts it: in a cascade every stage has its own rope, so the carriage moves (moving stages + 1) times the rope. Continuous rigging, or a carriage on its own, moves once." }) ): "") +
      K.num(ID, "rpm", "Motor speed", { unit: "rpm", min: 1, max: 30000, step: 1, hint: "The speed answers use this. It starts at a Kraken X60's free speed, " + kraken.toLocaleString("en-US") + " rpm, the most it turns with no load; under load it turns slower." });
    return K.group(ID, "mech", "Gearing and size", mech);
  },

  outs: function (s, r) {
    var o = mechOf(s, r);
    // Each card that is a constant in the Java names it, on a line of its own under the card's figures.
    var cards = K.outs(o.items), i = 0;
    cards = cards.replace(/<\/dd><\/div>/g, function (m0) { var it = o.items[i++]; return (it && it.kc ? '<code class="t-code-kc">' + esc(it.kc) + "</code>" : "") + m0; });
    return '<h2 class="t-code-h">Code constants for the ' + what(s.mk) + "</h2>" + K.verdict("info", o.sent) + cards;
  },

  more: function (s, r) {
    var m = r.m, lin = s.mk !== "arm", o = mechOf(s, r);
    var table = '<section class="ctab"><h2>Worked out</h2><div class="scroll"><table><thead><tr><th>Step</th><th>Working</th><th class="r">Result</th></tr></thead><tbody>' +
      o.work.map(function (w) { return "<tr><td>" + esc(w[0]) + '</td><td class="num">' + esc(w[1]) + '</td><td class="r num">' + esc(w[2]) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    // One line each: the setting, its value, and what it makes the reading come out in. The caution once, at the end.
    var vendors = '<section class="ctab t-code-v"><h2>Vendor settings</h2>' +
      "<p><b>CTRE Phoenix 6 SensorToMechanismRatio: " + esc(java(s.ratio)) + "</b>, so position reads in " + (lin ? what(s.mk) + " turns" : "arm turns") + ".</p>" +
      "<p><b>REV position conversion factor: " + esc(java(m.perRot)) + "</b>, so position reads in " + (lin ? "metres" : "radians") + ".</p>" +
      "<p><b>REV velocity conversion factor: " + esc(java(m.perRpm)) + "</b>, so velocity reads in " + (lin ? "metres per second" : "radians per second") + ".</p>" +
      '<p class="t-code-m">These assume the motor\'s own encoder. Check your vendor library\'s documentation for the exact call.</p></section>';
    return table + '<section class="ctab"><h2>Java constants</h2>' + K.code("code-java", o.code, "Copy the constants") + "</section>" + vendors +
      K.notes("<p>Lengths use the exact inch: 1 in = 25.4 mm. For other conversions, see Unit conversion.</p>" +
        '<p class="eq">travel per motor rotation = π × diameter × rigging ÷ reduction</p>' +
        '<p class="eq">speed = travel per motor rotation × motor rpm ÷ 60</p>' +
        '<p class="eq">arm angle per motor rotation = 360° ÷ reduction = 2π ÷ reduction rad</p>' +
        "<p>A wheel's travel assumes it does not slip and its tread is the diameter you typed. An elevator's rigging multiplies how far the carriage moves for each inch of rope, counted as the Elevator tool counts it: in a cascade every stage has its own rope, so with two moving stages the carriage moves 3 times the rope and with one, 2 times; continuous rigging, or a carriage on its own, moves once. The speeds are at the motor speed you entered. A motor that carries a load turns slower than that; use the Elevator, Arm and Drivetrain tools for speed under load.</p>" +
        "<p>The answers show five significant figures. The Java constants and the vendor settings carry ten, so copy those into code. The extra digits only keep rounding out of the arithmetic; they do not make a measured diameter any more exact than you measured it.</p>" +
        "<p>The drawing shows the motor and gearbox as a block diagram, then the wheel or spool to scale on its grid with how far it moves for one of its turns. An arm's length does not change these numbers, so it is drawn at no particular scale.</p>");
  },

  draw: function (g, s, r) { drawCode(g, s, r); }
});
(function () {
  var st = document.createElement("style");
  st.textContent = ".t-code-h { font-size: .95rem; margin: 0; }" +
    ".t-code-ticks { grid-column: 1 / -1; display: flex; justify-content: space-between; margin: -6px 0 2px; padding: 0 4px; font-size: .78rem; font-weight: 600; color: var(--text-2); }" +
    // The Java block wraps at the spaces between words on a phone, never inside a name.
    ".bench[data-calc=\"tool-code\"] .codeout { white-space: pre-wrap; overflow-wrap: normal; word-break: normal; }" +
    // Each card that is a constant names it; a name too long for its card scrolls sideways inside it.
    ".t-code-kc { display: block; margin-top: 4px; font-size: .72rem; color: var(--text-2); white-space: nowrap; overflow-x: auto; scrollbar-width: thin; max-width: 100%; }" +
    "@media (min-width: 901px) { .bench[data-calc=\"tool-code\"] .outs { grid-template-columns: repeat(2, minmax(0, 1fr)); } }" +
    ".bench[data-calc=\"tool-code\"] .outs > .out, .bench[data-calc=\"tool-code\"] .outs dd { min-width: 0; }" +
    "@media (min-width: 641px) { .bench[data-calc=\"tool-code\"] .outs dd > span { white-space: nowrap; } } @media (max-width: 640px) { .bench[data-calc=\"tool-code\"] .outs { grid-template-columns: minmax(0, 1fr); } }" +
    ".t-code-v p { font-size: .9rem; color: var(--text-2); margin: 0; max-width: 72ch; } .t-code-v p b { color: var(--text); overflow-wrap: anywhere; } .t-code-v .t-code-m { font-size: .8rem; color: var(--mute); }";
  document.head.appendChild(st);
})();

/* ---------- The drawing ---------- */
/* Left (or across the top on a phone): the motor and gearbox as a block diagram. Right (or below): the wheel or spool
   to scale on a grid, with how far one of its turns moves things; an arm with the angle one motor turn gives it. */
function drawCode(g, s, r) {
  var c = g.c, W = g.w, H = g.h, narrow = W < 520, m = r.m, G = s.ratio;
  var band = narrow ? { x: 0, y: 0, w: W, h: 128 } : { x: 0, y: 0, w: F_clamp(W * 0.34, 210, 270), h: H };
  var reg = narrow ? { x: 0, y: band.h, w: W, h: H - band.h } : { x: band.w, y: 0, w: W - band.w, h: H };
  // The block diagram: across the top on a phone; on a laptop, down the left, as tall as the picture beside it.
  var word = what(s.mk), turns = sig(G) + " turn" + (G === 1 ? "" : "s");
  g.text("Motor and gearbox", 12, 18, { weight: 600 });
  g.text("block diagram", 12, 33, { color: c.mute, size: 11 });
  if (narrow) {
    // Motor, gearbox and the wheel, spool or arm in a row, joined by their shafts, with room round each.
    var yb = 74, mx = 14, mw = 58, mh = 38, gx = mx + mw + 26, gw = 78, gh = 54, sr = 21, sx = W - 20 - sr, outEnd = sx - sr - 4, oc = (gx + gw + outEnd) / 2;
    g.arrow(mx + mw, yb, gx - 1, yb, { color: c.text2, width: 3, head: 7 });
    g.arrow(gx + gw, yb, outEnd, yb, { color: c.text2, width: 4, head: 8 });
    if (s.mk === "arm") { g.line(sx - sr * 0.4, yb, sx + sr, yb - sr * 0.6, { color: c.partLine, width: 7 }); g.line(sx - sr * 0.4, yb, sx + sr, yb - sr * 0.6, { color: c.part, width: 4 }); g.circle(sx - sr * 0.4, yb, 5, { fill: c.text2, stroke: null }); }
    else { g.circle(sx, yb, sr, { fill: c.part, stroke: c.partLine, width: 1.25 }); g.circle(sx, yb, 4, { fill: c.text2, stroke: null }); }
    g.text(cap(word), sx, yb + sr + 16, { align: "center", weight: 700, size: 13 });
    g.rect(mx, yb - mh / 2, mw, mh, { fill: c.part2, stroke: c.partLine, width: 1.25, radius: 5 });
    g.text("Motor", mx + mw / 2, yb, { align: "center", base: "middle", weight: 700, size: 13, halo: false });
    g.rect(gx, yb - gh / 2, gw, gh, { fill: c.part, stroke: c.partLine, width: 1.25, radius: 5 });
    g.text("Gearbox", gx + gw / 2, yb - 10, { align: "center", base: "middle", size: 11, color: c.text2, halo: false });
    g.text(K.fix(G, 2) + ":1", gx + gw / 2, yb + 10, { align: "center", base: "middle", weight: 700, size: 14, halo: false });
    g.text(turns, mx + mw / 2, yb + mh / 2 + 18, { align: "center", weight: 700, color: c.accent, size: 14 });
    g.text("1 turn", oc, yb - 12, { align: "center", weight: 700, color: c.accent, size: 14 });
    g.text("of the " + word, oc, yb + 22, { align: "center", color: c.text2, size: 13 });
  } else {
    var bx = 70, top = 52, bot = H - 14, mh2 = 44, gh2 = 70, mw2 = 92, gw2 = 112, span = bot - top;
    var my = top, gy = top + mh2 + Math.max(26, (span - mh2 - gh2 - 54) / 2), oy = bot - 22;
    g.line(bx, my + mh2, bx, gy, { color: c.text2, width: 3 });
    g.line(bx, gy + gh2, bx, oy - 4, { color: c.text2, width: 5 });
    g.line(bx - 16, oy - 4, bx + 16, oy - 4, { color: c.text2, width: 5 });
    g.rect(bx - mw2 / 2, my, mw2, mh2, { fill: c.part2, stroke: c.partLine, width: 1.25, radius: 6 });
    g.text("Motor", bx, my + mh2 / 2, { align: "center", base: "middle", weight: 700, size: 15, halo: false });
    g.rect(bx - gw2 / 2, gy, gw2, gh2, { fill: c.part, stroke: c.partLine, width: 1.25, radius: 6 });
    g.text("Gearbox", bx, gy + gh2 / 2 - 13, { align: "center", base: "middle", size: 13, color: c.text2, halo: false });
    g.text(K.fix(G, 2) + ":1", bx, gy + gh2 / 2 + 12, { align: "center", base: "middle", weight: 700, size: 18, halo: false });
    // Beside the motor's shaft: its turns. Under the output shaft: the one turn they make.
    var lx = bx + gw2 / 2 + 12;
    g.text(turns, lx, my + mh2 / 2 - 8, { weight: 700, color: c.accent, size: 16, base: "middle" });
    g.text("of the motor", lx, my + mh2 / 2 + 11, { color: c.text2, size: 13, base: "middle" });
    g.text("1 turn", lx, oy - 30, { weight: 700, color: c.accent, size: 16, base: "middle" });
    g.text("of the " + word, lx, oy - 11, { color: c.text2, size: 13, base: "middle" });
  }
  if (narrow) g.line(0, band.h, W, band.h, { color: c.line, width: 1 }); else g.line(band.w, 0, band.w, H, { color: c.line, width: 1 });
  if (s.mk === "arm") { drawArm(g, s, r, reg); return; }
  // The wheel or spool, to scale.
  var d = s.dia, C = Math.PI * d, rig = s.mk === "spool" ? m.rig : 1, Cr = C * rig, two = rig > 1;
  var box = s.mk === "wheel" ? { x0: -0.62 * d, x1: C + 0.62 * d, y0: 0, y1: d } : { x0: -0.62 * d, x1: Cr + 0.25 * d, y0: -d / 2, y1: d / 2 };
  var pad = s.mk === "wheel" ? { l: reg.x + 56, r: 16, t: reg.y + 50, b: 42 } : { l: reg.x + 56, r: 22, t: reg.y + (two ? (narrow ? 132 : 126) : 80), b: 24 };
  var V = g.view(box, pad, "middle");
  var step = [0.25, 0.5, 1, 2, 6, 12, 24].filter(function (q) { return V.L(q) >= 12; })[0] || 24;
  g.ctx.save(); g.ctx.beginPath(); g.ctx.rect(reg.x + 1, reg.y + 1, reg.w - 1, reg.h - 1); g.ctx.clip(); g.grid(V, step, ""); g.ctx.restore();
  g.text(cap(word) + ", to scale", reg.x + 12, reg.y + 18, { weight: 600 });
  g.text((step < 1 ? step : step) + " in squares", reg.x + reg.w - 10, reg.y + 18, { align: "right", color: c.mute, size: 11 });
  var perMotor = Cr / G;
  g.text("One motor turn: " + sig(perMotor) + " in" + (s.mk === "wheel" ? " of travel" : " of carriage travel"), reg.x + 12, reg.y + 34, { color: c.text2, size: 11 });
  var dimX;
  if (s.mk === "wheel") {
    var y0 = V.Y(0), R = V.L(d / 2), cxw = V.X(0);
    g.ground(y0, V.X(box.x0), V.X(box.x1));
    // The tread laid flat: one turn of the wheel rolls its whole circumference along the floor.
    g.line(cxw, y0 - 2, V.X(C), y0 - 2, { color: c.s1, width: 4, cap: "butt" });
    var wEnd = Math.min(cxw + V.L(C / G), V.X(box.x1));
    g.line(cxw, y0 - 2, wEnd, y0 - 2, { color: c.s2, width: 6, cap: "butt" });
    g.circle(V.X(C), V.Y(d / 2), R, { stroke: c.ghost, width: 1.25, dash: [5, 4] });
    g.circle(V.X(C), y0, 2.5, { fill: c.ghost, stroke: null });
    g.wheel(cxw, V.Y(d / 2), R, -Math.PI / 2, { spokes: 5 });
    motorTurnLabel(g, cxw, wEnd, y0 - 2, C / G);
    g.dim(cxw, y0 + 30, V.X(C), y0 + 30, "one " + word + " turn rolls " + sig(C) + " in", 0, { side: "below", color: c.s1, textColor: c.text });
    dimX = cxw - R - 12; g.dim(dimX, y0, dimX, V.Y(d), sig(d) + " in", 0, { side: "left" });
    g.text("dashed: the wheel after one turn", V.X(C) + Math.min(R, 40), V.Y(d) - 8, { align: "right", color: c.mute, size: 11 });
  } else {
    var cy = V.Y(0), Rs = V.L(d / 2), cxs = V.X(0), ry = cy - Rs;
    g.circle(cxs, cy, Rs + 2, { fill: c.part2, stroke: c.partLine, width: 1.25 });
    g.circle(cxs, cy, Rs, { fill: c.part, stroke: c.partLine, width: 1 });
    g.circle(cxs, cy, Math.max(2.5, Rs * 0.22), { fill: c.text2, stroke: null });
    // The rope leaves the top of the spool; one turn winds in a circumference of it.
    g.line(cxs, ry, V.X(C) + (two ? 0 : 0), ry, { color: c.text, width: 2 });
    var ya = ry - 16, yc = ry - 72;
    g.arrow(cxs, ya, V.X(C), ya, { color: c.s1, width: 2.5, head: 8 });

    // Without rigging: the orange piece's own label above the arrow at its start, and the turn's travel under the rope,
    // right of the spool, so no leader crosses the rope. With rigging: the rope's travel above its arrow.
    if (two) labelAt(g, "rope, 1 " + word + " turn: " + K.fix(C, 2) + " in", cxs, ya - 8, c.text);
    else g.text("1 " + word + " turn: " + K.fix(C, 2) + " in, rope and carriage", Math.min(cxs + Rs + 12, g.w - 8 - g.textWidth("1 " + word + " turn: " + K.fix(C, 2) + " in, rope and carriage", { size: 11, weight: 600 })), ry + 18, { size: 11, weight: 600, color: c.text });
    if (two) {
      g.arrow(cxs, yc, V.X(Cr), yc, { color: c.s3, width: 2.5, head: 8 });
      labelAt(g, "carriage: " + K.fix(Cr, 2) + " in, " + rig + "× the rope", cxs, yc - 8, c.text);
    }
    // The thick stretch: how far the carriage moves for one motor turn (the same as the rope when there is no rigging).
    var sEnd = Math.min(cxs + V.L(Cr / G), V.X(box.x1));
    g.line(cxs, two ? yc : ya, sEnd, two ? yc : ya, { color: c.s2, width: 5, cap: "butt" });
    if (two) motorTurnLabel(g, cxs, sEnd, yc, Cr / G);
    var cb = V.X(two ? Cr : C);
    g.rect(cb, (two ? yc : ry) - 9, 16, 18, { fill: c.part2, stroke: c.partLine, width: 1, radius: 2 });
    // Without rigging the orange piece sits on the rope's arrow, with the rope's label above and the rope just below:
    // its own label goes under the rope, right of the spool, on a short leader.
    if (!two) g.text("one motor turn, " + K.fix(Cr / G, 2) + " in", cxs, ya - 8, { size: 11, weight: 700, color: c.s2 });
    dimX = cxs - Rs - 12; g.dim(dimX, cy + Rs, dimX, cy - Rs, sig(d) + " in", 0, { side: "left" });
  }
}
// The orange piece: one motor turn's worth of travel, named where it is, under its line (with a short leader when it is tiny).
function motorTurnLabel(g, x0, x1, y, inch) {
  var c = g.c, t = "one motor turn, " + K.fix(inch, 2) + " in", w = g.textWidth(t, { size: 11, weight: 700 }), tx = Math.max(x0, Math.min(x0 + (x1 - x0) / 2 - w / 2, g.w - 8 - w));
  if (x1 - x0 < 10) g.line((x0 + x1) / 2, y + 4, (x0 + x1) / 2, y + 10, { color: c.s2, width: 1.5 });
  g.text(t, tx, y + 21, { size: 11, weight: 700, color: c.s2 });
}
function labelAt(g, str, x, y, col) { var w = g.textWidth(str, { size: 11, weight: 600 }); g.text(str, Math.min(x, g.w - 8 - w), y, { size: 11, weight: 600, color: col }); }
// An arm: its length does not change the numbers, so it is drawn at a size that fits; the angle is true.
function drawArm(g, s, r, reg) {
  var c = g.c, m = r.m, deg = m.perRotDeg, len = Math.max(30, Math.min(reg.w * 0.36, (reg.h - 66) / 2)), px = reg.x + reg.w * 0.42, py = reg.y + 46 + (reg.h - 46) / 2;
  g.text("Arm, angle to scale", reg.x + 12, reg.y + 18, { weight: 600 });
  g.text("One motor turn: " + sig(deg) + "°. One arm turn: " + sig(s.ratio) + " motor turns", reg.x + 12, reg.y + 34, { color: c.text2, size: 11 });
  var a0 = -0.18, a1 = a0 - Math.min(deg, 359) * Math.PI / 180;
  g.arc(px, py, len, -Math.PI, Math.PI, { color: c.ghost, width: 1, dash: [4, 4] });
  var ctx = g.ctx; ctx.save(); ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, len * 0.92, a0, a1, true); ctx.closePath(); ctx.fillStyle = c.s2; ctx.fill(); ctx.restore();
  g.line(px, py, px + len * Math.cos(a1), py + len * Math.sin(a1), { color: c.ghost, width: 6 });
  g.line(px, py, px + len * Math.cos(a0), py + len * Math.sin(a0), { color: c.partLine, width: 8 });
  g.line(px, py, px + len * Math.cos(a0), py + len * Math.sin(a0), { color: c.part, width: 5 });
  g.circle(px, py, 6, { fill: c.text2, stroke: null });
  var am = (a0 + a1) / 2, lx = px + (len + 10) * Math.cos(am), ly = py + (len + 10) * Math.sin(am);
  g.text(sig(deg) + "° per motor turn", Math.min(lx, g.w - 8 - g.textWidth(sig(deg) + "° per motor turn", { size: 12, weight: 700 })), ly - 4, { weight: 700, size: 12, color: c.text });
  g.text("dashed circle: one arm turn", reg.x + reg.w - 10, g.h - 8, { align: "right", color: c.mute, size: 11 });
}
function F_clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
})(typeof window !== "undefined" ? window : this);
