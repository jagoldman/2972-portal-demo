/* Tools: Units and code constants (#tool-units). Two parts, no drawing: convert one number into every unit of its
   kind at once, and turn a mechanism's gearing and size into the conversion constants robot code needs.
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
var K = D.calc, esc = D.esc, ID = "tool-units", F = root.FRC;
var MECH = [["wheel", "Wheel or roller"], ["spool", "Spool or pinion"], ["arm", "Arm or turret"]];
// Five significant figures, commas in big numbers, e-notation for the very large and very small.
function sig(x) {
  if (!isFinite(x)) return "–"; if (x === 0) return "0";
  var a = Math.abs(x); if (a >= 1e9 || a < 1e-4) return x.toExponential(4).replace("e+", "e");
  var dp = Math.max(0, 4 - Math.floor(Math.log10(a)));
  return x.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: Math.min(dp, 8) });
}
// For code: plenty of digits, no commas.
function num(x) { return isFinite(x) ? String(Number(x.toPrecision(10))) : "0"; }
function java(x) { var s = num(x); return /[.e]/.test(s) ? s : s + ".0"; }
function prefix(kind) { return kind === "wheel" ? "Wheel" : kind === "spool" ? "Elevator" : "Arm"; }

K.tool({
  id: ID,
  defaults: { x: 1, kind: "length", unit: "in", mk: "spool", ratio: 12, dia: 1.5, rig: 1, rpm: 6000 },
  stage: null,
  onPick: function (key, v, s) { if (key === "kind") s.unit = M.kind(v).units[0][0]; },

  compute: function (s) {
    var k = M.kind(s.kind), conv = M.convert(s.kind, s.x, s.unit);
    return { k: k, conv: conv, m: M.mech({ kind: s.mk, ratio: s.ratio, dia: s.dia, rig: s.rig, rpm: s.rpm }) };
  },

  controls: function (s) {
    var k = M.kind(s.kind);
    var conv = K.pick(ID, "kind", "Kind", M.KINDS.map(function (q) { return [q.id, q.name]; })) +
      K.num(ID, "x", "Number", { step: "any" }) +
      K.pick(ID, "unit", "In", k.units.map(function (u) { return [u[0], u[1]]; }));
    var kraken = F ? F.motor("kraken60").freeRpm : 6065;
    var mech = K.seg(ID, "mk", "Mechanism", MECH) +
      K.num(ID, "ratio", "Reduction", { unit: ": 1", min: 0.01, max: 2000, step: "any", tip: "Motor turns for one turn of the wheel, spool or arm. 12 means the motor turns twelve times for one output turn." }) +
      (s.mk === "arm" ? "" : K.num(ID, "dia", s.mk === "wheel" ? "Wheel diameter" : "Spool or pinion diameter", { unit: "in", min: 0.05, max: 24, step: "any", tip: s.mk === "spool" ? "Where the rope or belt runs, or the pinion's pitch diameter." : "The tread's outside diameter. Worn tread is a little smaller." })) +
      (s.mk === "spool" ? K.num(ID, "rig", "Rigging", { unit: "×", min: 1, max: 4, step: 1, slider: true, tip: "How far the part you care about moves for each inch of rope or belt. 1 for a first stage or a single carriage; 2 for the top of a two-stage cascade rigged for speed, and so on." }) : "") +
      K.num(ID, "rpm", "Motor speed", { unit: "rpm", min: 1, max: 30000, step: 1, hint: "For the largest speed. A Kraken X60 runs free at " + kraken.toLocaleString("en-US") + " rpm; real top speed under load is lower." });
    return K.group(ID, "conv", "Convert", conv) + K.group(ID, "mech", "Code constants", mech);
  },

  outs: function (s, r) {
    var from = r.k.units.filter(function (u) { return u[0] === s.unit; })[0];
    return '<div class="t-units"><h2>' + esc(sig(s.x) + " " + from[1]) + " is</h2>" +
      K.outs(r.k.units.filter(function (u) { return u[0] !== s.unit; }).map(function (u) { return { k: u[3], v: sig(r.conv[u[0]]), u: u[1] }; })) + "</div>";
  },

  more: function (s, r) {
    var m = r.m, P = prefix(s.mk), lin = s.mk !== "arm", code, sent, items, work;
    if (lin) {
      sent = "One motor turn moves the " + (s.mk === "wheel" ? "wheel's surface" : "carriage") + " " + sig(m.perRot) + " m (" + sig(m.perRot / IN) + " in). At " + K.n(s.rpm, 0) + " motor rpm that is " + sig(m.max) + " m/s (" + sig(m.maxFt) + " ft/s).";
      items = [
        { k: "Per motor rotation", v: sig(m.perRot), u: "m", sub: sig(m.perRot / IN) + " in" },
        { k: "Per output turn", v: sig(m.perOut), u: "m", sub: sig(m.perOut / IN) + " in" + (m.rig > 1 ? ", with " + m.rig + "× rigging" : "") },
        { k: "Speed per motor rpm", v: sig(m.perRpm), u: "m/s", sub: sig(m.perRpm / 0.3048) + " ft/s per rpm" },
        { k: "Largest speed", v: sig(m.max), u: "m/s", sub: sig(m.maxFt) + " ft/s at " + K.n(s.rpm, 0) + " rpm with no load; slower under load" }];
      work = [["Output turn", "π × " + num(s.dia) + " in × 0.0254" + (m.rig > 1 ? " × " + m.rig + " (rigging)" : ""), sig(m.perOut) + " m"],
        ["Per motor rotation", sig(m.perOut) + " m ÷ " + num(s.ratio), sig(m.perRot) + " m"],
        ["Per motor rpm", sig(m.perRot) + " m ÷ 60 s", sig(m.perRpm) + " m/s"],
        ["Largest speed", sig(m.perRpm) + " × " + num(s.rpm) + " rpm", sig(m.max) + " m/s"]];
      code = "// " + MECH.filter(function (x) { return x[0] === s.mk; })[0][1] + ": " + num(s.ratio) + ":1 reduction, " + num(s.dia) + " in diameter" + (s.mk === "spool" ? ", " + s.rig + "x rigging" : "") + "\n" +
        "// Motor rotations per " + (s.mk === "wheel" ? "wheel" : "spool") + " rotation\n" +
        "public static final double k" + P + "GearRatio = " + java(s.ratio) + ";\n" +
        "public static final double k" + P + "DiameterMeters = " + java(s.dia * IN) + ";\n" +
        (s.mk === "spool" ? "public static final double k" + P + "RiggingMultiplier = " + java(s.rig) + ";\n" : "") +
        "public static final double k" + P + "MetersPerMotorRotation = " + java(m.perRot) + ";\n" +
        "public static final double k" + P + "MetersPerSecondPerMotorRpm = " + java(m.perRpm) + ";\n" +
        "// At " + num(s.rpm) + " motor rpm, no load\n" +
        "public static final double k" + P + "MaxSpeedMetersPerSecond = " + java(m.max) + ";";
    } else {
      sent = "One motor turn swings the arm " + sig(m.perRotDeg) + "°. At " + K.n(s.rpm, 0) + " motor rpm it turns " + sig(m.maxDeg) + "° per second (" + sig(m.outRpm) + " rpm).";
      items = [
        { k: "Per motor rotation", v: sig(m.perRotDeg), u: "°", sub: sig(m.perRot) + " rad" },
        { k: "Speed per motor rpm", v: sig(m.perRpm), u: "rad/s", sub: sig(m.perRpm * 180 / Math.PI) + " deg/s per rpm" },
        { k: "Largest speed", v: sig(m.maxDeg), u: "deg/s", sub: sig(m.max) + " rad/s at " + K.n(s.rpm, 0) + " rpm with no load; slower under load" },
        { k: "Arm turns", v: sig(m.outRpm), u: "rpm", sub: "at that motor speed" }];
      work = [["Per motor rotation", "360° ÷ " + num(s.ratio), sig(m.perRotDeg) + "°"],
        ["In radians", "2π ÷ " + num(s.ratio), sig(m.perRot) + " rad"],
        ["Per motor rpm", sig(m.perRot) + " rad ÷ 60 s", sig(m.perRpm) + " rad/s"],
        ["Largest speed", sig(m.perRpm) + " × " + num(s.rpm) + " rpm", sig(m.max) + " rad/s"]];
      code = "// Arm or turret: " + num(s.ratio) + ":1 reduction\n" +
        "// Motor rotations per arm rotation\n" +
        "public static final double kArmGearRatio = " + java(s.ratio) + ";\n" +
        "public static final double kArmRadiansPerMotorRotation = " + java(m.perRot) + ";\n" +
        "public static final double kArmDegreesPerMotorRotation = " + java(m.perRotDeg) + ";\n" +
        "public static final double kArmRadiansPerSecondPerMotorRpm = " + java(m.perRpm) + ";\n" +
        "// At " + num(s.rpm) + " motor rpm, no load\n" +
        "public static final double kArmMaxSpeedRadiansPerSecond = " + java(m.max) + ";";
    }
    var table = '<section class="ctab"><h2>Worked out</h2><div class="scroll"><table><thead><tr><th>Step</th><th>Working</th><th class="r">Result</th></tr></thead><tbody>' +
      work.map(function (w) { return "<tr><td>" + esc(w[0]) + '</td><td class="num">' + esc(w[1]) + '</td><td class="r num">' + esc(w[2]) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    var vendors = '<section class="ctab t-units-v"><h2>Vendor settings</h2>' +
      "<p><b>CTRE Phoenix 6, SensorToMechanismRatio: " + esc(java(s.ratio)) + ".</b> It wants sensor rotations per mechanism rotation; with the motor's own encoder that is the reduction. Position then reads in " + (lin ? (s.mk === "wheel" ? "wheel" : "spool") + " rotations; multiply by " + esc(sig(m.perOut)) + " m for metres." : "arm rotations; multiply by 360 for degrees.") + "</p>" +
      "<p><b>REV position conversion factor: " + esc(java(m.perRot)) + ".</b> It multiplies the motor's rotations, so this value makes position read in " + (lin ? "metres" : "radians") + ".</p>" +
      "<p><b>REV velocity conversion factor: " + esc(java(m.perRpm)) + ".</b> It multiplies the motor's rpm, so this value makes velocity read in " + (lin ? "metres per second" : "radians per second") + ".</p>" +
      '<p class="t-units-m">Check your vendor library\'s documentation for the exact call; the numbers above are what each setting means.</p></section>';
    return '<h2 class="t-units-h">Code constants for the mechanism</h2>' + K.verdict("info", sent) + K.outs(items) + table +
      '<section class="ctab"><h2>Java constants</h2>' + K.code("units-java", code, "Copy the constants") + "</section>" + vendors +
      K.notes("<p>Conversions use exact definitions: 1 in = 25.4 mm, 1 lb = 0.45359237 kg, 1 lbf = 4.4482216152605 N (a pound of mass under standard gravity), 1 mile = 1609.344 m. Pressure units are gauge or absolute alike; this page does not add atmospheric pressure.</p>" +
        '<p class="eq">travel per motor rotation = π × diameter × rigging ÷ reduction</p>' +
        '<p class="eq">speed = travel per motor rotation × motor rpm ÷ 60</p>' +
        '<p class="eq">arm angle per motor rotation = 360° ÷ reduction = 2π ÷ reduction rad</p>' +
        "<p>A wheel's travel assumes it does not slip and its tread is the diameter you typed. An elevator's rigging multiplies how far the stage you care about moves; for a cascade, the top stage moves the rigging number times the rope. The largest speed is at the motor speed you typed, which is free speed if you leave it at the motor's free speed; a loaded mechanism runs slower. Use the Elevator, Arm and Drive tools for speed under load.</p>");
  }
});
(function () {
  var st = document.createElement("style");
  st.textContent = ".t-units { display: grid; gap: 8px; } .t-units h2, .t-units-h { font-size: .95rem; }" +
    ".t-units-v p { font-size: .9rem; color: var(--text-2); margin: 0; max-width: 72ch; } .t-units-v p b { color: var(--text); } .t-units-v .t-units-m { font-size: .8rem; color: var(--mute); }";
  document.head.appendChild(st);
})();
})(typeof window !== "undefined" ? window : this);
