/* Tools: Units and code constants (#tool-units). Two parts: convert one number into every unit of its kind at once,
   and turn a mechanism's gearing and size into the conversion constants robot code needs, with a still drawing of the
   mechanism (gearbox, then the wheel or spool to scale, or the arm's angle).
   The maths (M) runs in Node for tests/tool-units.test.js. Every factor is exact or from exact definitions. */
(function (root) {
"use strict";
var M = {};
var LBF = 4.4482216152605, IN = 0.0254, FT = 0.3048, LB = 0.45359237;
// Each kind: [unit id, label, size of one unit in the base unit]. Base units: m, kg, N, N m, m/s, rad/s, kg m^2, Pa.
M.KINDS = [
  { id: "length", name: "Length", units: [["in", "in", IN, "Inches"], ["ft", "ft", FT, "Feet"], ["mm", "mm", 0.001, "Millimetres"], ["m", "m", 1, "Metres"]] },
  { id: "mass", name: "Mass", units: [["lb", "lb", LB, "Pounds"], ["oz", "oz", LB / 16, "Ounces"], ["kg", "kg", 1, "Kilograms"], ["g", "g", 0.001, "Grams"]] },
  { id: "force", name: "Force", units: [["lbf", "lbf", LBF, "Pounds of force"], ["N", "N", 1, "Newtons"]] },
  { id: "torque", name: "Torque", units: [["Nm", "N m", 1, "Newton metres"], ["lbin", "lb in", LBF * IN, "Pound inches"], ["lbft", "lb ft", LBF * FT, "Pound feet"], ["ozin", "oz in", LBF / 16 * IN, "Ounce inches"]] },
  { id: "speed", name: "Speed", units: [["fps", "ft/s", FT, "Feet a second"], ["mps", "m/s", 1, "Metres a second"], ["mph", "mph", 1609.344 / 3600, "Miles an hour"]] },
  { id: "turn", name: "Turning speed", units: [["rpm", "rpm", 2 * Math.PI / 60, "Turns a minute"], ["rads", "rad/s", 1, "Radians a second"], ["degs", "deg/s", Math.PI / 180, "Degrees a second"], ["rps", "rotations/s", 2 * Math.PI, "Turns a second"]] },
  { id: "moi", name: "Moment of inertia", units: [["lbin2", "lb in²", LB * IN * IN, "Pound square inches"], ["kgm2", "kg m²", 1, "Kilogram square metres"]] },
  { id: "pressure", name: "Pressure", units: [["psi", "psi", LBF / (IN * IN), "Pounds a square inch"], ["kPa", "kPa", 1000, "Kilopascals"], ["bar", "bar", 100000, "Bar"]] }
];
M.kind = function (id) { return M.KINDS.filter(function (k) { return k.id === id; })[0] || M.KINDS[0]; };
// x in unit `from` of kind -> { unitId: value } for every unit of the kind.
M.convert = function (kindId, x, from) {
  var k = M.kind(kindId), f = k.units.filter(function (u) { return u[0] === from; })[0] || k.units[0], base = x * f[2], out = {};
  k.units.forEach(function (u) { out[u[0]] = base / u[2]; });
  return out;
};
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

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- Page ---------- */
var K = D.calc, esc = D.esc, ID = "tool-units", F = root.FRC, IN_M = 0.0254;
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
// The constants' names follow the mechanism: a wheel is a drive, a spool an elevator, an arm an arm.
function prefix(kind) { return kind === "wheel" ? "Drive" : kind === "spool" ? "Elevator" : "Arm"; }
function what(kind) { return kind === "wheel" ? "wheel" : kind === "spool" ? "spool" : "arm"; }
function unitOf(s) { var k = M.kind(s.kind); return k.units.filter(function (u) { return u[0] === s.unit; })[0] || k.units[0]; }

// The mechanism's answers, the worked steps and the Java constants, in one place so outs and more agree.
function mechOf(s, r) {
  var m = r.m, P = prefix(s.mk), o = {};
  if (s.mk !== "arm") {
    o.sent = "One motor turn moves the " + (s.mk === "wheel" ? "wheel's surface" : "carriage") + " " + sig(m.perRot) + " m (" + sig(m.perRot / IN_M) + " in). At the " + K.n(s.rpm, 0) + " rpm you entered that is " + sig(m.max) + " m/s (" + sig(m.maxFt) + " ft/s).";
    o.items = [
      { k: "Per motor rotation", v: sig(m.perRot), u: "m", sub: sig(m.perRot / IN_M) + " in" },
      { k: "Per " + what(s.mk) + " turn", v: sig(m.perOut), u: "m", sub: sig(m.perOut / IN_M) + " in" + (m.rig > 1 ? ", with " + m.rig + "× rigging" : "") },
      { k: "Speed per motor rpm", v: sig(m.perRpm), u: "(m/s) per rpm", sub: sig(m.perRpm / 0.3048) + " (ft/s) per rpm" },
      { k: "Speed at the motor speed you entered", v: sig(m.max), u: "m/s", sub: sig(m.maxFt) + " ft/s at " + K.n(s.rpm, 0) + " rpm" }];
    o.work = [[cap(what(s.mk)) + " turn", "π × " + num(s.dia) + " in × 0.0254" + (m.rig > 1 ? " × " + m.rig + " (rigging)" : ""), sig(m.perOut) + " m"],
      ["Per motor rotation", sig(m.perOut) + " m ÷ " + num(s.ratio), sig(m.perRot) + " m"],
      ["Per motor rpm", sig(m.perRot) + " m ÷ 60 s", sig(m.perRpm) + " (m/s) per rpm"],
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
      { k: "Per motor rotation", v: sig(m.perRotDeg), u: "°", sub: sig(m.perRot) + " rad" },
      { k: "Speed per motor rpm", v: sig(m.perRpm), u: "(rad/s) per rpm", sub: sig(m.perRpm * 180 / Math.PI) + " (deg/s) per rpm" },
      { k: "Speed at the motor speed you entered", v: sig(m.maxDeg), u: "deg/s", sub: sig(m.max) + " rad/s at " + K.n(s.rpm, 0) + " rpm" },
      { k: "Arm turns", v: sig(m.outRpm), u: "rpm", sub: "at that motor speed" }];
    o.work = [["Per motor rotation", "360° ÷ " + num(s.ratio), sig(m.perRotDeg) + "°"],
      ["In radians", "2π ÷ " + num(s.ratio), sig(m.perRot) + " rad"],
      ["Per motor rpm", sig(m.perRot) + " rad ÷ 60 s", sig(m.perRpm) + " (rad/s) per rpm"],
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
function hintsOf(s, r) {
  var from = unitOf(s), out = { "un-h": sig(s.x) + " " + from[1] + " equals" };
  if (r && r.conv) r.k.units.forEach(function (u) { out["un-v-" + u[0]] = sig(r.conv[u[0]]); });
  return out;
}
function cap(x) { return x.charAt(0).toUpperCase() + x.slice(1); }

K.tool({
  id: ID,
  defaults: { x: 1, kind: "length", unit: "in", mk: "spool", ratio: 12, dia: 1.5, rig: 1, rpm: 6000, part: "conv" },
  stage: { ratio: 2.6, narrow: 1.15, label: "The mechanism: the motor and its gearbox, then the wheel, spool or arm to scale, with how far it moves for one turn." },
  onPick: function (key, v, s) { if (key === "kind") s.unit = M.kind(v).units[0][0]; },

  compute: function (s) {
    var k = M.kind(s.kind), conv = M.convert(s.kind, s.x, s.unit);
    return { k: k, conv: conv, m: M.mech({ kind: s.mk, ratio: s.ratio, dia: s.dia, rig: s.rig, rpm: s.rpm }) };
  },

  /* The inputs, and the converter's answers with them (they are short, and a phone then reads Convert's inputs, its
     answers, Code constants' inputs and its answers in that order). The answers update through hints. */
  controls: function (s, r) {
    var k = M.kind(s.kind), from = unitOf(s), h = hintsOf(s, r);
    var part = s.part === "mech" ? "mech" : "conv";
    var jump = '<div class="t-units-jump"><span class="seg" role="group" aria-label="Show">' + [["conv", "Convert"], ["mech", "Code constants"]].map(function (o) { return '<button data-act="unitspart" data-v="' + o[0] + '" aria-pressed="' + (part === o[0]) + '">' + o[1] + "</button>"; }).join("") + "</span></div>";
    var conv = K.pick(ID, "kind", "Kind", M.KINDS.map(function (q) { return [q.id, q.name]; })) +
      K.num(ID, "x", "Number", { step: "any" }) +
      K.pick(ID, "unit", "In", k.units.map(function (u) { return [u[0], u[1]]; })) +
      '<div class="t-units-conv" aria-live="polite"><h3 id="un-h">' + esc(h["un-h"]) + "</h3><dl>" +
      k.units.filter(function (u) { return u[0] !== from[0]; }).map(function (u) { return '<div><dd><b class="num" id="un-v-' + u[0] + '">' + esc(h["un-v-" + u[0]]) + "</b> " + esc(u[1]) + "</dd><dt>" + esc(u[3]) + "</dt></div>"; }).join("") + "</dl></div>";
    var kraken = F ? F.motor("kraken60").freeRpm : 6065;
    var mech = K.seg(ID, "mk", "Mechanism", MECH) +
      K.num(ID, "ratio", "Reduction", { unit: ": 1", min: 0.01, max: 2000, step: "any", tip: "Motor turns for one turn of the wheel, spool or arm. 12 means the motor turns twelve times for one output turn." }) +
      (s.mk === "arm" ? "" : K.num(ID, "dia", s.mk === "wheel" ? "Wheel diameter" : "Spool or pinion diameter", { unit: "in", min: 0.05, max: 24, step: "any", tip: s.mk === "spool" ? "Where the rope or belt runs, or the pinion's pitch diameter." : "The tread's outside diameter. Worn tread is a little smaller." })) +
      (s.mk === "spool" ? K.num(ID, "rig", "Rigging", { unit: "×", min: 1, max: 4, step: 1, slider: true, hint: "Carriage travel for each inch of rope: 1 for continuous rigging or a single carriage, 3 for a cascade with two moving stages, 2 with one.", tip: "As the Elevator tool counts it: in a cascade every stage has its own rope, so the carriage moves (moving stages + 1) times the rope. Continuous rigging, or a carriage on its own, moves once." }) : "") +
      K.num(ID, "rpm", "Motor speed", { unit: "rpm", min: 1, max: 30000, step: 1, hint: "The speed answers use this. A Kraken X60's free speed is " + kraken.toLocaleString("en-US") + " rpm; under load it turns slower." });
    return jump + '<div id="units-conv" class="t-units-a">' + K.group(ID, "conv", "Convert", conv) + '</div><div id="units-mech" class="t-units-a">' + K.group(ID, "mech", "Code constants", mech) + "</div>";
  },
  hints: function (s, r) { return hintsOf(s, r); },

  outs: function (s, r) {
    var o = mechOf(s, r);
    return '<h2 class="t-units-h">Code constants for the ' + what(s.mk) + "</h2>" + K.verdict("info", o.sent) + K.outs(o.items);
  },

  more: function (s, r) {
    var m = r.m, lin = s.mk !== "arm", o = mechOf(s, r);
    var table = '<section class="ctab"><h2>Worked out</h2><div class="scroll"><table><thead><tr><th>Step</th><th>Working</th><th class="r">Result</th></tr></thead><tbody>' +
      o.work.map(function (w) { return "<tr><td>" + esc(w[0]) + '</td><td class="num">' + esc(w[1]) + '</td><td class="r num">' + esc(w[2]) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    var vendors = '<section class="ctab t-units-v"><h2>Vendor settings</h2>' +
      "<p><b>CTRE Phoenix 6, SensorToMechanismRatio: " + esc(java(s.ratio)) + ".</b> It wants sensor rotations per mechanism rotation; with the motor's own encoder that is the reduction. Position then reads in " + (lin ? what(s.mk) + " rotations; multiply by " + esc(sig(m.perOut)) + " m for metres." : "arm rotations; multiply by 360 for degrees.") + "</p>" +
      "<p><b>REV position conversion factor: " + esc(java(m.perRot)) + ".</b> It multiplies the motor's rotations, so this value makes position read in " + (lin ? "metres" : "radians") + ".</p>" +
      "<p><b>REV velocity conversion factor: " + esc(java(m.perRpm)) + ".</b> It multiplies the motor's rpm, so this value makes velocity read in " + (lin ? "metres per second" : "radians per second") + ".</p>" +
      '<p class="t-units-m">Check your vendor library\'s documentation for the exact call; the numbers above are what each setting means.</p></section>';
    return table + '<section class="ctab"><h2>Java constants</h2>' + K.code("units-java", o.code, "Copy the constants") + "</section>" + vendors +
      K.notes("<p>Conversions use exact definitions: 1 in = 25.4 mm, 1 lb = 0.45359237 kg, 1 lbf = 4.4482216152605 N (a pound of mass under standard gravity), 1 mile = 1609.344 m. Pressure units are gauge or absolute alike; this page does not add atmospheric pressure.</p>" +
        '<p class="eq">travel per motor rotation = π × diameter × rigging ÷ reduction</p>' +
        '<p class="eq">speed = travel per motor rotation × motor rpm ÷ 60</p>' +
        '<p class="eq">arm angle per motor rotation = 360° ÷ reduction = 2π ÷ reduction rad</p>' +
        "<p>A wheel's travel assumes it does not slip and its tread is the diameter you typed. An elevator's rigging multiplies how far the carriage moves for each inch of rope, counted as the Elevator tool counts it: in a cascade every stage has its own rope, so with two moving stages the carriage moves 3 times the rope and with one, 2 times; continuous rigging, or a carriage on its own, moves once. The speeds are at the motor speed you entered. A motor that carries a load turns slower than that; use the Elevator, Arm and Drivetrain tools for speed under load.</p>" +
        "<p>The answers show five significant figures. The Java constants and the vendor settings carry ten, so copy those into code.</p>" +
        "<p>The drawing shows the motor and gearbox as a block diagram, then the wheel or spool to scale on its grid with how far it moves for one of its turns. An arm's length does not change these numbers, so it is drawn at no particular scale.</p>");
  },

  draw: function (g, s, r) { drawUnits(g, s, r); }
});
/* On a phone the page shows one part at a time: Convert, or Code constants (its inputs, the drawing and the answers).
   The choice is kept in the state (a link can carry it); switching only changes classes, so nothing is redrawn. */
D.acts.unitspart = function (b) { K.state(ID).part = b.dataset.v === "mech" ? "mech" : "conv"; showPart(); var t = document.querySelector(".t-units-jump"); if (t && t.getBoundingClientRect().top < 0) t.scrollIntoView({ block: "start" }); };
function showPart() {
  var b = document.querySelector('.bench[data-calc="' + ID + '"]'), part = K.state(ID).part === "mech" ? "mech" : "conv"; if (!b) return;
  b.classList.add("t-units-bench"); b.classList.toggle("t-units-show-conv", part === "conv"); b.classList.toggle("t-units-show-mech", part === "mech");
  document.querySelectorAll('[data-act="unitspart"]').forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.v === part)); });
}
// The page's own order on a phone: inputs first, then the drawing and the answers (see the style below).
D.after.push(function () { if (D.S.route === ID) showPart(); });
(function () {
  var st = document.createElement("style");
  st.textContent = ".t-units-h { font-size: .95rem; margin: 0; }" +
    ".t-units-conv { display: grid; gap: 6px; padding-top: 4px; } .t-units-conv h3 { font-size: .9rem; margin: 0; }" +
    ".t-units-conv dl { display: grid; gap: 0; margin: 0; } .t-units-conv dl > div { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--line); }" +
    ".t-units-conv dt { color: var(--mute); font-size: .82rem; text-align: right; } .t-units-conv dd { margin: 0; color: var(--text-2); font-size: .9rem; } .t-units-conv dd b { color: var(--text); font-size: 1.3rem; }" +
    ".t-units-jump { display: none; } .t-units-a { scroll-margin-top: calc(var(--bar) + 8px); }" +
    ".t-units-v p { font-size: .9rem; color: var(--text-2); margin: 0; max-width: 72ch; } .t-units-v p b { color: var(--text); overflow-wrap: anywhere; } .t-units-v .t-units-m { font-size: .8rem; color: var(--mute); }" +
    "@media (max-width: 900px) { .t-units-bench.content.bench { grid-template-areas: \"side\" \"stage\" \"outs\" \"more\"; }" +
    " .t-units-bench > [data-area=\"stage\"] { position: static; box-shadow: none; }" +
    " .t-units-jump { display: block; padding: 12px 16px 0; } .t-units-jump .seg { display: flex; } .t-units-jump .seg button { flex: 1; min-height: 44px; }" +
    " .t-units-show-conv #units-mech, .t-units-show-conv > [data-area=\"stage\"], .t-units-show-conv > [data-area=\"outs\"], .t-units-show-conv > [data-area=\"more\"], .t-units-show-mech #units-conv { display: none; } }";
  document.head.appendChild(st);
})();

/* ---------- The drawing ---------- */
/* Left (or across the top on a phone): the motor and gearbox as a block diagram. Right (or below): the wheel or spool
   to scale on a grid, with how far one of its turns moves things; an arm with the angle one motor turn gives it. */
function drawUnits(g, s, r) {
  var c = g.c, W = g.w, H = g.h, narrow = W < 520, m = r.m, G = s.ratio;
  var band = narrow ? { x: 0, y: 0, w: W, h: 114 } : { x: 0, y: 0, w: F_clamp(W * 0.34, 210, 270), h: H };
  var reg = narrow ? { x: 0, y: band.h, w: W, h: H - band.h } : { x: band.w, y: 0, w: W - band.w, h: H };
  // The block diagram.
  var word = what(s.mk), yb = narrow ? 72 : H / 2, mx = 14, mw = 52, mh = 34, gx = mx + mw + 16, gw = 70, gh = 52;
  g.text("Motor and gearbox", 12, 18, { weight: 600 });
  g.text("block diagram", 12, 33, { color: c.mute, size: 11 });
  g.line(mx + mw, yb, gx, yb, { color: c.text2, width: 3 });
  var outEnd = narrow ? Math.min(W - 16, gx + gw + 120) : band.w - 6;
  g.line(gx + gw, yb, outEnd, yb, { color: c.text2, width: 4 });
  g.rect(mx, yb - mh / 2, mw, mh, { fill: c.part2, stroke: c.partLine, width: 1.25, radius: 5 });
  g.text("Motor", mx + mw / 2, yb, { align: "center", base: "middle", weight: 700, size: 12, halo: false });
  g.rect(gx, yb - gh / 2, gw, gh, { fill: c.part, stroke: c.partLine, width: 1.25, radius: 5 });
  g.text("Gearbox", gx + gw / 2, yb - 9, { align: "center", base: "middle", size: 11, color: c.text2, halo: false });
  g.text(sig(G) + " : 1", gx + gw / 2, yb + 9, { align: "center", base: "middle", weight: 700, size: 13, halo: false });
  g.text(sig(G) + " turn" + (G === 1 ? "" : "s"), mx + mw / 2, yb + mh / 2 + 16, { align: "center", weight: 700, color: c.accent, size: 12 });
  var oc = narrow ? (gx + gw + outEnd) / 2 : (gx + gw + outEnd) / 2;
  g.text("1 turn", oc, yb - 10, { align: "center", weight: 700, color: c.accent, size: 12 });
  g.text("of the " + word, oc, yb + 18, { align: "center", color: c.text2, size: 11 });
  if (narrow) g.line(0, band.h, W, band.h, { color: c.line, width: 1 }); else g.line(band.w, 0, band.w, H, { color: c.line, width: 1 });
  if (s.mk === "arm") { drawArm(g, s, r, reg); return; }
  // The wheel or spool, to scale.
  var d = s.dia, C = Math.PI * d, rig = s.mk === "spool" ? m.rig : 1, Cr = C * rig, two = rig > 1;
  var box = s.mk === "wheel" ? { x0: -0.62 * d, x1: C + 0.62 * d, y0: 0, y1: d } : { x0: -0.62 * d, x1: Cr + 0.25 * d, y0: -d / 2, y1: d / 2 };
  var pad = s.mk === "wheel" ? { l: reg.x + 56, r: 16, t: reg.y + 50, b: 42 } : { l: reg.x + 56, r: 22, t: reg.y + (two ? (narrow ? 116 : 108) : 80), b: 24 };
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
    g.line(cxw, y0 - 2, Math.min(cxw + V.L(C / G), V.X(box.x1)), y0 - 2, { color: c.s2, width: 6, cap: "butt" });
    g.circle(V.X(C), V.Y(d / 2), R, { stroke: c.ghost, width: 1.25, dash: [5, 4] });
    g.circle(V.X(C), y0, 2.5, { fill: c.ghost, stroke: null });
    g.wheel(cxw, V.Y(d / 2), R, -Math.PI / 2, { spokes: 5 });
    g.dim(cxw, y0 + 20, V.X(C), y0 + 20, "one " + word + " turn rolls " + sig(C) + " in", 0, { side: "below", color: c.s1, textColor: c.text });
    dimX = cxw - R - 12; g.dim(dimX, y0, dimX, V.Y(d), sig(d) + " in", 0, { side: "left" });
    g.text("dashed: the wheel after one turn", V.X(C) + Math.min(R, 40), V.Y(d) - 8, { align: "right", color: c.mute, size: 11 });
  } else {
    var cy = V.Y(0), Rs = V.L(d / 2), cxs = V.X(0), ry = cy - Rs;
    g.circle(cxs, cy, Rs + 2, { fill: c.part2, stroke: c.partLine, width: 1.25 });
    g.circle(cxs, cy, Rs, { fill: c.part, stroke: c.partLine, width: 1 });
    g.circle(cxs, cy, Math.max(2.5, Rs * 0.22), { fill: c.text2, stroke: null });
    // The rope leaves the top of the spool; one turn winds in a circumference of it.
    g.line(cxs, ry, V.X(C) + (two ? 0 : 0), ry, { color: c.text, width: 2 });
    var ya = ry - 16, yc = ry - 54;
    g.arrow(cxs, ya, V.X(C), ya, { color: c.s1, width: 2.5, head: 8 });

    labelAt(g, (two ? "rope: " : narrow ? "rope and carriage (1× rigging): " : "rope, and the carriage at 1× rigging: ") + sig(C) + " in per " + word + " turn", cxs, ya - 8, c.text);
    if (two) {
      g.arrow(cxs, yc, V.X(Cr), yc, { color: c.s3, width: 2.5, head: 8 });
      labelAt(g, "carriage: " + sig(Cr) + " in, " + rig + "× the rope", cxs, yc - 8, c.text);
    }
    // The thick stretch: how far the carriage moves for one motor turn (the same as the rope when there is no rigging).
    g.line(cxs, two ? yc : ya, Math.min(cxs + V.L(Cr / G), V.X(box.x1)), two ? yc : ya, { color: c.s2, width: 5, cap: "butt" });
    var cb = V.X(two ? Cr : C);
    g.rect(cb, (two ? yc : ry) - 9, 16, 18, { fill: c.part2, stroke: c.partLine, width: 1, radius: 2 });
    dimX = cxs - Rs - 12; g.dim(dimX, cy + Rs, dimX, cy - Rs, sig(d) + " in", 0, { side: "left" });
  }
  // Key for the short thick stretch: one motor turn.
  g.text("thick: one motor turn", reg.x + reg.w - 10, H - 8, { align: "right", color: c.mute, size: 11 });
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
