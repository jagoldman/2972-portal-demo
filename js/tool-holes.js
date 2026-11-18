/* Tools: Holes and fasteners (#tool-holes). A lookup, not a calculator: the drill for a tapped hole, a clearance hole,
   a blind rivet, a bearing or hex bore, or a 3D-printed hole, with a to-scale section through the plate and the whole
   table under it as a wall chart. Only the values in M.TAPS, M.CLEAR, M.RIVETS, M.PRESS and M.PRINT_ADD_MM are used;
   nothing else is looked up. The tables (M) run in Node for tests/tool-holes.test.js. */
(function (root) {
"use strict";
var M = {};
// Taps: thread, tap drill name, size. Inch sizes are decimal inches; metric drills are millimetres (mm: true).
M.TAPS = [
  ["#4-40", "#43", 0.0890], ["#6-32", "#36", 0.1065], ["#8-32", "#29", 0.1360], ["#10-24", "#25", 0.1495],
  ["#10-32", "#21", 0.1590], ["1/4-20", "#7", 0.2010], ["1/4-28", "#3", 0.2130], ["5/16-18", "F", 0.2570],
  ["3/8-16", "5/16", 0.3125],
  ["M3x0.5", "2.5 mm", 2.5, true], ["M4x0.7", "3.3 mm", 3.3, true], ["M5x0.8", "4.2 mm", 4.2, true],
  ["M6x1.0", "5.0 mm", 5.0, true], ["M8x1.25", "6.8 mm", 6.8, true]
];
// Clearance: screw, close fit (drill, size), free fit (drill, size). Metric in millimetres.
M.CLEAR = [
  ["#4", "#32", 0.1160, "#30", 0.1285], ["#6", "#27", 0.1440, "#25", 0.1495], ["#8", "#18", 0.1695, "#16", 0.1770],
  ["#10", "#9", 0.1960, "#7", 0.2010], ["1/4", "F", 0.2570, "H", 0.2660], ["5/16", "P", 0.3230, "Q", 0.3320],
  ["3/8", "W", 0.3860, "X", 0.3970],
  ["M3", "3.2 mm", 3.2, "3.4 mm", 3.4, true], ["M4", "4.3 mm", 4.3, "4.5 mm", 4.5, true], ["M5", "5.3 mm", 5.3, "5.5 mm", 5.5, true],
  ["M6", "6.4 mm", 6.4, "6.6 mm", 6.6, true], ["M8", "8.4 mm", 8.4, "9.0 mm", 9.0, true]
];
// Blind rivets: rivet, drill, size (in).
M.RIVETS = [["1/8", "#30", 0.1285], ["5/32", "#20", 0.1610], ["3/16", "#11", 0.1910]];
// Press and slip fits, rules of thumb to test on scrap: part, slip fit hole, light press hole (in). null: the part's own bore.
M.PRESS = [["1.125 in bearing", 1.125, 1.124, 1.125], ["0.875 in bearing", 0.875, 0.874, 0.875], ["1/2 in hex shaft", null, null, 0.5]];
M.PRINT_ADD_MM = 0.2;                               // add to a printed clearance hole, a starting point
M.KINDS = [["tap", "Tapped hole"], ["clear", "Clearance hole"], ["rivet", "Rivet"], ["press", "Press fit"], ["print", "3D-printed hole"]];

// The screw's nominal (major) diameter in inches, from its name: #N is 0.060 + 0.013 N in (the screw-number rule),
// fractions are themselves, M sizes are millimetres.
M.major = function (name) {
  var m = /^#(\d+)/.exec(name); if (m) return 0.060 + 0.013 * +m[1];
  m = /^M(\d+(\.\d+)?)/.exec(name); if (m) return +m[1] / 25.4;
  m = /^(\d+)\/(\d+)/.exec(name); if (m) return +m[1] / +m[2];
  return NaN;
};
// Thread pitch in inches from the name: "-40" is 40 threads per inch, "x0.5" is 0.5 mm.
M.pitch = function (name) { var m = /-(\d+)$/.exec(name); if (m) return 1 / +m[1]; m = /x(\d+(\.\d+)?)$/.exec(name); return m ? +m[1] / 25.4 : NaN; };
M.inch = function (v, mm) { return mm ? v / 25.4 : v; };
// Nearest fractional drill in 1/64 in steps, and nearest drill in 0.1 mm steps.
M.nearFrac = function (inch) { var n = Math.round(inch * 64), d = 64; while (n % 2 === 0 && d > 1) { n /= 2; d /= 2; } return { name: (d === 1 ? String(n) : n + "/" + d) + " in", in: n / d }; };
M.nearMm = function (inch) { var mm = Math.round(inch * 254) / 10; return { name: mm.toFixed(1) + " mm", in: mm / 25.4, mm: mm }; };
/* Is the nearest drill a fair stand-in? Within about 0.004 in of the named size it is (a rule of thumb for these
   hole sizes); further off it changes the thread or the fit too much. Returns { off (in, always positive), bigger, ok }. */
M.NEAR_OK = 0.004;
M.nearVerdict = function (nearIn, holeIn) { var d = nearIn - holeIn; return { off: Math.abs(d), bigger: d > 0, ok: Math.abs(d) <= M.NEAR_OK + 1e-9 }; };
// Number and letter drills are named "#7" or "F"; fractional and metric drills say their own size.
M.isNumLetter = function (name) { return /^#\d+$/.test(name) || /^[A-Z]$/.test(name); };

if (typeof module !== "undefined" && module.exports) { module.exports = M; return; }

/* ---------- Page ---------- */
var K = D.calc, esc = D.esc, ID = "tool-holes";
function sizes(kind) {
  if (kind === "tap") return M.TAPS.map(function (r, i) { return [i, r[0]]; });
  if (kind === "clear") return M.CLEAR.map(function (r, i) { return [i, r[0] + " screw"]; });
  if (kind === "rivet") return M.RIVETS.map(function (r, i) { return [i, r[0] + " in rivet"]; });
  if (kind === "press") return M.PRESS.map(function (r, i) { return [i, r[0]]; });
  return M.CLEAR.map(function (r, i) { return [i, r[0] + " screw"]; }).concat([[M.CLEAR.length, "Heat-set insert"]]);
}
function nearText(v, drill) {
  var name = drill + " drill";
  if (v.off < 0.00005) return "the same size: use it if you have no " + name;
  return v.off.toFixed(4) + " in " + (v.bigger ? "bigger" : "smaller") + (v.ok ? ": fine if you have no " + name : ": too far off; get a " + name);
}
function in4(x) { return x.toFixed(4) + " in"; }
function mm2(x) { return (x * 25.4).toFixed(2) + " mm"; }

var def = {
  id: ID,
  defaults: { kind: "tap", size: 5, fit: "close", press: "slip" },
  stage: { ratio: 2.2, narrow: 1.2, label: "A section through the plate, enlarged and to scale: the hole as drilled, and the same hole with its screw, rivet or part in it." },
  onPick: function (key, v, s) { if (key === "kind") s.size = v === "tap" ? 5 : v === "clear" || v === "print" ? 3 : 0; },

  compute: function (s) {
    var r = { kind: s.kind }, row, list = sizes(s.kind), i = F_clamp(s.size, 0, list.length - 1);
    r.i = i; r.label = list[i][1];
    if (s.kind === "tap") {
      row = M.TAPS[i]; r.screw = row[0]; r.drill = row[1]; r.hole = M.inch(row[2], row[3]); r.mm = !!row[3]; r.major = M.major(row[0]); r.pitch = M.pitch(row[0]);
    } else if (s.kind === "clear") {
      row = M.CLEAR[i]; var free = s.fit === "free"; r.screw = row[0]; r.mm = !!row[5]; r.drill = free ? row[3] : row[1]; r.hole = M.inch(free ? row[4] : row[2], r.mm);
      r.other = { name: free ? "Close fit" : "Free fit", drill: free ? row[1] : row[3], hole: M.inch(free ? row[2] : row[4], r.mm) }; r.major = M.major(row[0]);
    } else if (s.kind === "rivet") {
      row = M.RIVETS[i]; r.screw = row[0]; r.drill = row[1]; r.hole = row[2]; r.major = M.major(row[0]);
    } else if (s.kind === "press") {
      row = M.PRESS[i]; r.part = row[0]; r.major = row[3]; r.hex = row[1] == null;
      if (!r.hex) { r.hole = s.press === "press" ? row[2] : row[1]; r.drill = r.hole.toFixed(3) + " in"; r.other = { name: s.press === "press" ? "Slip fit" : "Light press", hole: s.press === "press" ? row[1] : row[2] }; }
    } else {
      r.insert = i >= M.CLEAR.length;
      if (!r.insert) { row = M.CLEAR[i]; r.screw = row[0]; r.mm = !!row[5]; r.want = M.inch(row[2], r.mm); r.hole = r.want + M.PRINT_ADD_MM / 25.4; r.major = M.major(row[0]); r.drill = (r.hole * 25.4).toFixed(1) + " mm"; }
    }
    if (r.hole && r.drill && M.isNumLetter(r.drill)) { r.frac = M.nearFrac(r.hole); r.metric = M.nearMm(r.hole); }
    else if (r.hole && r.mm && s.kind !== "print") r.frac = M.nearFrac(r.hole);
    return r;
  },

  controls: function (s, r) {
    var html = K.seg(ID, "kind", "What you are making", M.KINDS) + K.pick(ID, "size", s.kind === "press" ? "Part" : "Size", sizes(s.kind));
    if (s.kind === "clear") html += K.seg(ID, "fit", "Fit", [["close", "Close fit"], ["free", "Free fit"]], { tip: "Close fit lines parts up well. Free fit forgives holes that are a little out of place." });
    if (s.kind === "press" && !r.hex) html += K.seg(ID, "press", "Fit", [["slip", "Slip fit"], ["press", "Light press"]], { tip: "Slip: the bearing slides in by hand. Light press: it needs a vice or an arbor press, and stays put." });
    // On a phone the answer sits right under the pickers, above the drawing (the page's own order there puts the
    // pickers first); on a laptop it stays with the answers.
    if (r && r.head == null) def.outs(s, r);
    if (r && r.head) html += '<p class="t-holes-ans">' + esc(r.head) + "</p>";
    return K.group(ID, "what", "Hole", html) + K.group(ID, "find", "Find in the table", findBox(s, "holes-find", "t-holes-find t-holes-find-l"));
  },

  outs: function (s, r) {
    var h = '<div class="t-holes">', items = [], head, tip;
    if (s.kind === "press" && r.hex) {
      head = "Use the hex bore the part comes with: broached hex parts are made to fit 1/2 in hex shaft.";
      tip = "Rule of thumb: measure your shaft and slide the part on before you build round it. A tight part can be eased with a file on the flats.";
      items = [{ k: "Shaft", v: "1/2", u: "in hex", sub: "across the flats" }, { k: "Bore", v: "Part's own", sub: "no drill to choose" }];
    } else if (s.kind === "print" && r.insert) {
      head = "Use the hole size the insert maker gives for your insert, and print a test piece first.";
      tip = "Starting point: heat-set inserts need the maker's hole, not a screw clearance hole. Push them in with a soldering iron at the maker's temperature.";
      items = [{ k: "Hole", v: "Maker's size", sub: "from the insert's page" }];
    } else {
      var what = s.kind === "tap" ? "then tap " + r.screw : s.kind === "clear" ? "for a " + r.screw + " screw, " + (s.fit === "free" ? "free" : "close") + " fit" : s.kind === "rivet" ? "for a " + r.screw + " in blind rivet" : s.kind === "press" ? "for a " + r.part + ", " + (s.press === "press" ? "light press" : "slip fit") : "for a " + r.screw + " screw";
      head = s.kind === "print" ? "Model the hole at " + (r.hole * 25.4).toFixed(1) + " mm (" + in4(r.hole) + ") " + what + ", then print a test piece." :
        s.kind === "press" ? "Cut a " + r.hole.toFixed(3) + " in hole " + what + ", in scrap first." :
        "Drill " + r.drill + " (" + in4(r.hole) + (/ mm$/.test(r.drill) ? "" : ", " + mm2(r.hole)) + ") " + what + ".";
      if (s.kind === "print") items.push({ k: "Model it at", v: (r.hole * 25.4).toFixed(1), u: "mm", sub: in4(r.hole) + ": the hole you want plus 0.2 mm" });
      else if (s.kind === "press") items.push({ k: "Hole", v: r.hole.toFixed(4), u: "in", sub: mm2(r.hole) });
      else {
        // The drill and its size in one card: the name is what to pick up, the size is what it cuts.
        var kindD = M.isNumLetter(r.drill) ? (/^#/.test(r.drill) ? "number drill" : "letter drill") : / mm$/.test(r.drill) ? "metric drill" : "fractional drill";
        items.push({ k: "Drill", v: r.drill.replace(/ (mm|in)$/, ""), u: / mm$/.test(r.drill) ? "mm" : / in$/.test(r.drill) ? "in" : "", sub: r.hole.toFixed(4) + " in" + (/ mm$/.test(r.drill) ? "" : ", " + mm2(r.hole)) + ", " + kindD });
      }
      var nf = r.frac && M.nearVerdict(r.frac.in, r.hole), nm = r.metric && M.nearVerdict(r.metric.in, r.hole);
      if (r.frac) items.push({ k: "Nearest fractional", v: r.frac.name.replace(" in", ""), u: "in", sub: nearText(nf, r.drill), state: nf.ok ? "" : "warn", tip: "The nearest drill in 1/64 in steps, if you do not have the named one. Check that the difference is all right for this hole." });
      if (r.metric) items.push({ k: "Nearest metric", v: r.metric.mm.toFixed(1), u: "mm", sub: nearText(nm, r.drill), state: nm.ok ? "" : "warn", tip: "The nearest drill in 0.1 mm steps. A nearest size is not always a good swap: for a tap, bigger means weaker threads." });
      if (r.other) items.push({ k: r.other.name, v: r.other.drill ? r.other.drill.replace(/ mm$/, "") : r.other.hole.toFixed(3), u: r.other.drill ? (/ mm$/.test(r.other.drill) ? "mm" : "") : "in", sub: in4(r.other.hole) });
      if (s.kind === "print") items.push({ k: "Hole you want", v: (r.want * 25.4).toFixed(1), u: "mm", sub: r.screw + " close fit" });
      if (r.major && items.length < 5) items.push({ k: s.kind === "press" ? "Part size" : s.kind === "rivet" ? "Rivet" : "Screw", v: r.major.toFixed(3), u: "in", sub: s.kind === "press" ? "outside diameter" : "nominal (major) diameter, " + mm2(r.major) });
      tip = s.kind === "tap" ? "Rule of thumb: thread at least 1.5 diameters deep in aluminium, about " + (1.5 * r.major).toFixed(2) + " in for this screw. That needs a plate that thick; in a thinner one, put a nut or a threaded insert behind it. Use cutting fluid and back the tap off every turn or so." :
        s.kind === "clear" ? "Rule of thumb: close fit when the holes must line up exactly; free fit when several holes share one part and may be a little off." :
        s.kind === "rivet" ? "Rule of thumb: keep the hole at least two rivet diameters from an edge, and pick a rivet whose grip covers the total thickness (it says on the box)." :
        s.kind === "press" ? "Rule of thumb only: measure your bearing and cut a test hole in scrap first. Machines, tools and bearings differ by more than 0.001 in." :
        "Starting point: printed holes come out small. Add 0.2 mm (0.008 in) to the diameter, print a test piece and adjust for your printer.";
    }
    var swap = !(r.frac || r.metric) ? "" : s.kind === "tap" ? "Use the named drill when you can: a bigger drill gives weaker threads, and a smaller one risks a broken tap." :
      s.kind === "rivet" ? "Use the named drill when you can: a bigger drill lets the rivet work loose, and a smaller one will not take it." :
      "Use the named drill when you can: a bigger drill gives a looser fit, and a smaller one may not let the screw through.";
    r.head = head;
    return h + K.verdict("info", head, tip) + K.outs(items) + (swap ? '<p class="t-holes-tip">' + esc(swap) + "</p>" : "") + "</div>";
  },

  more: function (s, r) {
    var head, rows, i, out = "";
    function use(k) { return '<button class="btn sm" data-act="holesuse" data-v="' + k + '">Draw it</button>'; }
    var list = [];                                  // the same rows as one line each, for a phone: name, drill, size
    function line0(l) { return l ? l.join(" ") : ""; }
    var grp = null, ncol = 0;
    // A thin heading row (and a list heading on a phone) where the rows change from inch sizes to metric ones.
    function head2(metric) { var t = metric ? "Metric" : "Inch"; list.push('<p class="t-holes-grp" data-grp="1">' + t + "</p>"); return '<tr class="t-holes-grp" data-grp="1"><th colspan="' + ncol + '">' + t + "</th></tr>"; }
    function tr(k, cells, line, metric) {
      var pre = "";
      if (metric != null && metric !== grp) { grp = metric; pre = head2(metric); }
      line = line || [cells[0], cells[1], cells[2]];
      var on = k === r.i, raw = findKey(cells.join(" ") + " " + line0(line)), key = esc(raw), hid = FIND && raw.indexOf(findKey(FIND)) < 0 ? " hidden" : "";
      list.push('<button class="t-holes-row' + (on ? " on" : "") + '" data-act="holesuse" data-v="' + k + '" data-find="' + key + '"' + hid + (on ? ' aria-current="true"' : "") + '><b>' + esc(line[0]) + '</b><span>' + esc(line[1]) + '</span><span class="num">' + esc(line[2]) + "</span>" + (on ? '<span class="pill ok">Drawn</span>' : '<span class="t-holes-go" aria-hidden="true">Draw</span>') + "</button>");
      return pre + '<tr data-find="' + key + '"' + hid + ' class="' + (on ? "pick" : "") + '">' + cells.map(function (c, j) { return "<td" + (j ? ' class="r num"' : "") + ">" + esc(c) + "</td>"; }).join("") + '<td class="r">' + (on ? '<span class="pill ok">Drawn</span>' : use(k)) + "</td></tr>";
    }
    if (s.kind === "tap") {
      head = ["Thread", "Tap drill", "Inches", "mm"]; ncol = 5;
      rows = M.TAPS.map(function (t, k) { var x = M.inch(t[2], t[3]); return tr(k, [t[0], t[1], x.toFixed(4), (x * 25.4).toFixed(2)], [t[0], t[1], x.toFixed(4) + " in"], !!t[3]); });
    } else if (s.kind === "clear" || s.kind === "print") {
      if (s.kind === "clear") {
        head = ["Screw", "Close fit", "Inches", "Free fit", "Inches"]; ncol = 6;
        rows = M.CLEAR.map(function (t, k) { var free = s.fit === "free"; return tr(k, [t[0], t[1], M.inch(t[2], t[5]).toFixed(4), t[3], M.inch(t[4], t[5]).toFixed(4)], [t[0] + " screw", (free ? "free " : "close ") + (free ? t[3] : t[1]), M.inch(free ? t[4] : t[2], t[5]).toFixed(4) + " in"], !!t[5]); });
      } else {
        head = ["Screw", "Close-fit hole", "Model it at", "Inches"]; ncol = 5;
        rows = M.CLEAR.map(function (t, k) { var w = M.inch(t[2], t[5]) * 25.4; return tr(k, [t[0], w.toFixed(1) + " mm", (w + M.PRINT_ADD_MM).toFixed(1) + " mm", ((w + M.PRINT_ADD_MM) / 25.4).toFixed(4)], [t[0] + " screw", "model " + (w + M.PRINT_ADD_MM).toFixed(1) + " mm", ((w + M.PRINT_ADD_MM) / 25.4).toFixed(4) + " in"], !!t[5]); });
        rows.push(tr(M.CLEAR.length, ["Heat-set insert", "Maker's size", "Maker's size", ""], ["Heat-set insert", "maker's size", ""]));
      }
    } else if (s.kind === "rivet") {
      head = ["Rivet", "Drill", "Inches", "mm"];
      rows = M.RIVETS.map(function (t, k) { return tr(k, [t[0] + " in", t[1], t[2].toFixed(4), (t[2] * 25.4).toFixed(2)], [t[0] + " in rivet", t[1], t[2].toFixed(4) + " in"]); });
    } else {
      head = ["Part", "Slip fit", "Light press"];
      rows = M.PRESS.map(function (t, k) { return tr(k, [t[0], t[1] == null ? "Part's own bore" : t[1].toFixed(3) + " in", t[2] == null ? "Part's own bore" : t[2].toFixed(3) + " in"], [t[0], t[1] == null ? "part's own bore" : "slip " + t[1].toFixed(3), t[2] == null ? "" : "press " + t[2].toFixed(3)]); });
    }
    var title = { tap: "Tap drills", clear: "Clearance holes", rivet: "Blind rivets", press: "Press and slip fits (rules of thumb)", print: "3D-printed holes (starting points)" }[s.kind];
    out += '<section class="ctab t-holes-tab"><h2>' + title + "</h2>" + findBox(s, "holes-find2", "t-holes-find t-holes-find-p") +
      '<p class="t-holes-none" id="holes-none" hidden></p><p class="t-holes-cue">Tap a row to draw it.</p><div class="t-holes-list" id="holes-list">' + list.join("") + '</div><div class="scroll"><table><thead><tr>' + head.map(function (x, j) { return "<th" + (j ? ' class="r"' : "") + ">" + x + "</th>"; }).join("") + "<th></th></tr></thead><tbody>" + rows.join("") + "</tbody></table></div></section>";
    out += K.notes(
      "<p>A tapped hole is drilled smaller than the screw, so the tap can cut the thread into the wall. The tap drill leaves about three quarters of a full thread, which is nearly as strong as a full one and much easier to tap. A clearance hole is drilled a little larger than the screw so it passes through.</p>" +
      '<p class="eq">screw number #N: nominal diameter = 0.060 in + 0.013 in × N  (a #10 is 0.190 in)</p>' +
      "<p>Number drills (#1 to #80) and letter drills (A to Z) fill the gaps between fractional sizes. If the named drill is missing, the nearest fractional (1/64 in steps) and metric (0.1 mm steps) sizes are listed with their difference, so you can judge whether it is close enough.</p>" +
      "<p>Press fits and printed holes are starting points, not answers: they depend on the machine, the material and the part. Cut or print a test hole first.</p>" +
      "<p>The drawing is a section through the plate, to scale and enlarged. The left half is the hole as drilled; the right half has the screw, rivet or part in it. Screw heads and rivet heads are drawn to a typical shape, not a particular part. The tables are the team's shop list; this page adds nothing to them.</p>");
    return out;
  },

  draw: function (g, s, r) { drawHoles(g, s, r); }
};
K.tool(def);
D.acts.holesuse = function (b) { K.state(ID).size = +b.dataset.v; D.render(); };
/* The find box: hides the rows (in the table and in the phone's list) whose thread, screw or drill does not contain
   what was typed. Only the rows change, so the box keeps its caret. The words are kept while the page is open. */
var FIND = "";
function findBox(s, id, cls) {
  var lab = s.kind === "tap" ? "Find a thread or drill" : s.kind === "press" ? "Find a part" : s.kind === "rivet" ? "Find a rivet or drill" : "Find a screw or drill";
  return '<label class="' + cls + '"><span>' + lab + '</span><input class="inp" type="search" id="' + id + '" autocomplete="off" spellcheck="false" placeholder="' + (s.kind === "tap" ? "1/4-20, M5 or #7" : s.kind === "press" ? "bearing or hex" : "#10, M4 or #30") + '" value="' + esc(FIND) + '" data-input="holesfind"></label>';
}
function findKey(x) { return String(x).toLowerCase().replace(/×/g, "x").replace(/\s+/g, ""); }
function applyFind() {
  var q = findKey(FIND), shown = 0, none = document.getElementById("holes-none");
  document.querySelectorAll(".t-holes-tab [data-find]").forEach(function (el) { var hit = !q || el.getAttribute("data-find").indexOf(q) >= 0; el.hidden = !hit; if (hit && el.tagName === "TR") shown++; });
  // A group's heading shows only while a row under it does.
  document.querySelectorAll(".t-holes-tab [data-grp]").forEach(function (h) { var n = h.nextElementSibling, any = false; while (n && !n.hasAttribute("data-grp")) { if (!n.hidden) any = true; n = n.nextElementSibling; } h.hidden = !any; });
  // The two find boxes (inputs column, table) say the same.
  document.querySelectorAll('input[data-input="holesfind"]').forEach(function (i) { if (document.activeElement !== i && i.value !== FIND) i.value = FIND; });
  if (none) { none.hidden = !!shown || !q; none.textContent = shown || !q ? "" : "Nothing in this table matches \u201c" + FIND + "\u201d. Try part of a size, such as 1/4 or M5."; }
}
D.inputs.holesfind = function (el) { FIND = el.value.slice(0, 40); applyFind(); };
D.after.push(function () {
  if (D.S.route !== ID) return;
  applyFind();
  // The page's own order on a phone: what you are making and its size first, then the drawing and the answers.
  var b = document.querySelector('.bench[data-calc="' + ID + '"]'); if (b) b.classList.add("t-holes-bench");
});
function F_clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

(function () {
  var st = document.createElement("style");
  st.textContent = ".t-holes { display: grid; gap: 10px; } .t-holes .t-holes-tip { font-size: .88rem; color: var(--text-2); max-width: 70ch; margin: 0; }" +
    ".t-holes-find { display: grid; gap: 4px; font-size: .85rem; color: var(--text-2); max-width: 340px; } .t-holes-find .inp { min-height: 40px; }" +
    ".t-holes-none { margin: 0; font-size: .9rem; color: var(--text-2); } .t-holes-tab tr[hidden], .t-holes-row[hidden], .t-holes-none[hidden] { display: none; }" +
    ".t-holes-ans { display: none; margin: 4px 0 0; padding: 10px 12px; border-left: 3px solid var(--accent); background: var(--tint); font-weight: 700; font-size: 1rem; line-height: 1.35; }" +
    "@media (max-width: 900px) { .t-holes-ans { display: block; } .t-holes > .verdict { display: none; } .t-holes > .vmore { margin-top: 0; } }" +
    ".t-holes-tab tr.t-holes-grp th { padding: 10px 0 4px; font-size: .78rem; font-weight: 700; color: var(--mute); text-align: left; border-bottom: 1px solid var(--line); background: none; }" +
    ".t-holes-grp[hidden], tr.t-holes-grp[hidden] { display: none; } p.t-holes-grp { margin: 8px 0 0; font-size: .78rem; font-weight: 700; color: var(--mute); }" +
    ".t-holes-find-p { display: none !important; } @media (max-width: 900px) { .t-holes-find-p { display: grid !important; } .bench[data-calc=\"tool-holes\"] .benchside details.cg[data-open=\"g-find\"], .bench[data-calc=\"tool-holes\"] .benchside section.cg:has(.t-holes-find-l) { display: none; } }" +
    ".t-holes-list, .t-holes-cue { display: none; } .t-holes-cue { margin: 0; font-size: .85rem; color: var(--text-2); }" +
    ".t-holes-go { margin-left: 2px; padding: 3px 10px; border: 1px solid var(--line-2); border-radius: 999px; font-size: .8rem; font-weight: 600; color: var(--accent) !important; }" +
    ".t-holes-row { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px; padding: 6px 4px; border: 0; border-bottom: 1px solid var(--line); background: none; color: var(--text); font: inherit; text-align: left; cursor: pointer; }" +
    ".t-holes-row b { flex: 1 1 auto; min-width: 0; } .t-holes-row span { color: var(--text-2); white-space: nowrap; } .t-holes-row .num { min-width: 7ch; text-align: right; }" +
    ".t-holes-row.on { background: var(--tint); box-shadow: inset 3px 0 0 var(--accent); padding-left: 10px; } .t-holes-row .pill { margin-left: 2px; }" +
    "@media (max-width: 900px) { .t-holes-bench.content.bench { grid-template-areas: \"side\" \"stage\" \"outs\" \"more\"; } }" +
    "@media (max-width: 640px) { .t-holes-list { display: grid; } .t-holes-cue { display: block; } .t-holes-tab .scroll { display: none; } .t-holes-find .inp { min-height: 44px; } .t-holes-find { max-width: none; } }";
  st.textContent += "@media (max-width: 640px) { .bench[data-calc=\"tool-holes\"] .outs > .out:last-child:nth-child(odd) { grid-column: 1 / -1; } }";   // no card alone beside an empty cell
  document.head.appendChild(st);
})();

/* ---------- The drawing ---------- */
function drawHoles(g, s, r) {
  var c = g.c, narrow = g.w < 560;
  var kind = s.kind, hex = kind === "press" && r.hex, insert = kind === "print" && r.insert;
  var D0 = insert ? 0.2 : hex ? 0.5 : r.hole, Dm = insert ? 0.16 : r.major || D0;            // hole and part sizes, in
  var big = Math.max(D0, Dm);
  // Plates (in): thickness, and how many.
  var T = kind === "tap" ? Math.max(0.25, Math.ceil(1.5 * Dm * 16) / 16) : kind === "rivet" ? 0.25 : kind === "press" ? 0.3125 : 0.25;
  var half = Math.max(big * 1.7, 0.32);              // half the plate width shown in each view
  var head = kind === "press" ? 0.03 : 0.75 * Dm, below = kind === "tap" || kind === "clear" || kind === "print" ? 0.35 * Dm + 0.05 : kind === "rivet" ? 0.6 * Dm : 0.03;
  var gap = big * 1.2, W = 4 * half + gap, Hh = head + T + below;
  var V = g.view({ x0: -half, x1: W - half, y0: -T - below, y1: head }, { l: 20, r: kind === "tap" ? (narrow ? 70 : 110) : 20, t: 112, b: kind === "tap" ? 64 : 56 }, "middle");
  var step = [0.05, 0.1, 0.25, 0.5].filter(function (q) { return V.L(q) >= 14; })[0] || 0.5;
  g.grid(V, step, "");
  var xL = 0, xR = 2 * half + gap, y0 = V.Y(0), y1 = V.Y(-T);
  // Two views of the plate: left the hole alone, right with the part in it.
  [xL, xR].forEach(function (cx, view) { plate(g, V, cx, half, T, D0, kind, hex, view === 1 ? r : null); });
  // Left: the hole, with the drill size dimensioned above.
  var dl = V.X(xL - D0 / 2), dr = V.X(xL + D0 / 2);
  if (kind === "print" && !insert) {
    var wpx = V.L(r.want / 2), cxL = V.X(xL);
    g.line(cxL - wpx, y0, cxL - wpx, y1, { color: c.text2, width: 1, dash: [3, 3] }); g.line(cxL + wpx, y0, cxL + wpx, y1, { color: c.text2, width: 1, dash: [3, 3] });
  }
  var lab = insert ? "Insert maker's hole" : hex ? "1/2 in hex, across the flats" : (r.drill && !/ (in|mm)$/.test(r.drill) ? r.drill + ": " : "") + r.hole.toFixed(4) + " in";
  var lsz = narrow ? 11 : 12;
  function label(str, x, y, col) { var tw = g.textWidth(str, { size: lsz, weight: 700 }); g.text(str, Math.max(tw / 2 + 6, Math.min(g.w - tw / 2 - 6, x)), y, { align: "center", weight: 700, color: col || c.text, size: lsz }); }
  // A tapped hole is two steps: the left half is the plain hole the drill leaves; the right half is the thread the tap
  // cuts, out to the screw's size, with the screw in it.
  if (kind === "tap") lab = r.drill + " drill: " + r.hole.toFixed(4) + " in";
  g.dim(dl, y0, dr, y0, "", 22);
  label(lab, (dl + dr) / 2, y0 - 32);
  var capY = 62;
  caption(g, V.X(xL), capY, kind === "tap" ? ["1. Drill", "a plain hole, before tapping"] : insert ? ["The hole", "size from the insert maker"] : kind === "print" ? ["As modelled", "dashed: as it prints"] : hex ? ["The part's hex bore", "broached by the maker"] : ["Drilled", ""]);
  // Right: the part in it, with its own size dimensioned.
  var cx = V.X(xR);
  if (kind === "tap" || kind === "clear" || (kind === "print" && !insert)) screw(g, V, xR, T, Dm, kind === "tap" ? r.pitch : M.pitch(nameWithPitch(r.screw)), kind === "tap" || kind === "clear" || kind === "print", head, below);
  else if (kind === "rivet") rivet(g, V, xR, T, Dm, head, below);
  else if (kind === "press") { if (hex) hexShaft(g, V, xR, T); else bearing(g, V, xR, T, r.hole, Dm); }
  else insertPart(g, V, xR, T);
  var ml = V.X(xR - Dm / 2), mr = V.X(xR + Dm / 2), yb = V.Y(-T - below);
  if (!insert) {
    if (kind === "press") { g.dim(ml, y0, mr, y0, "", 22); g.text((hex ? "0.500 in shaft" : r.part.replace(" bearing", "") + " bearing"), cx, y0 - 32, { align: "center", weight: 700, size: 12 }); }
    else { g.dim(ml, yb, mr, yb, "", -18); label((kind === "rivet" ? "Rivet " : kind === "tap" ? "Nominal (major) diameter " : "Screw ") + Dm.toFixed(3) + " in", cx, yb + 34); }
  }
  // The thread depth the rule of thumb asks for (1.5 diameters), dimensioned beside the tapped half.
  if (kind === "tap") {
    var dep = 1.5 * Dm, dx = V.X(xR + half) + 12, dTop = V.Y(0), dBot = V.Y(-dep);
    g.dim(dx, dTop, dx, dBot, "", 0, { color: c.text2 });
    g.text(narrow ? "depth" : "thread", dx + 8, (dTop + dBot) / 2 - 8, { size: narrow ? 11 : 12, weight: 600, color: c.text2, base: "middle" });
    g.text((narrow ? "" : "depth ") + dep.toFixed(2) + " in", dx + 8, (dTop + dBot) / 2 + 8, { size: narrow ? 11 : 12, weight: 700, color: c.text, base: "middle" });
  }
  caption(g, cx, capY, kind === "tap" ? ["2. Tap, then the screw", narrow ? "thread cut, screw in it" : "the tap cuts the thread; the screw fills it"] : kind === "clear" ? ["With the screw", ((r.hole - Dm) / 2).toFixed(4) + " in gap each side"] : kind === "rivet" ? ["With the rivet", "before it is set"] : kind === "press" ? (hex ? ["With the hex shaft", ""] : s.press === "press" ? ["Pressed in", "0.001 in under the bearing"] : ["Slides in", "hole the bearing's own size"]) : insert ? ["With the insert", "melted in"] : ["With the screw", ""]);
  g.text(r.label, 12, 18, { weight: 600 });
  g.text("Section through the plate, to scale. " + (step >= 0.1 ? step + " in" : step + " in") + " squares", 12, 34, { color: c.mute, size: 11 });
}
// Two centred lines, kept inside the drawing: a line too wide to sit centred at x moves in from the edge.
function caption(g, x, y, two) {
  [[two[0], { size: 12, weight: 700, color: g.c.text }], [two[1], { size: 11, color: g.c.text2 }]].forEach(function (l, i) {
    if (!l[0]) return; var w = g.textWidth(l[0], l[1]), cx = Math.max(w / 2 + 6, Math.min(g.w - w / 2 - 6, x));
    g.text(l[0], cx, y + i * 15, Object.assign({ align: "center" }, l[1]));
  });
}
function nameWithPitch(screw) { for (var i = 0; i < M.TAPS.length; i++) if (M.TAPS[i][0].indexOf(screw + "-") === 0 || M.TAPS[i][0].indexOf(screw + "x") === 0) return M.TAPS[i][0]; return ""; }
// A plate seen in section, cut through the hole: hatched solid both sides of the hole.
function plate(g, V, cx, half, T, D0, kind, hex, withPart) {
  var c = g.c, ctx = g.ctx, top = V.Y(0), bot = V.Y(-T), layers = kind === "rivet" ? 2 : 1;
  [[cx - half, cx - D0 / 2], [cx + D0 / 2, cx + half]].forEach(function (p) {
    var a = V.X(p[0]), b = V.X(p[1]);
    g.rect(a, top, b - a, bot - top, { fill: c.part, stroke: null });
    ctx.save(); ctx.beginPath(); ctx.rect(a, top, b - a, bot - top); ctx.clip();
    if (kind === "print") for (var y = top + 3; y < bot; y += 4) g.line(a, y, b, y, { color: c.partLine, width: 0.6 });
    else for (var x = a - (bot - top); x < b; x += 7) g.line(x, bot, x + (bot - top), top, { color: c.partLine, width: 0.8 });
    ctx.restore();
    g.rect(a, top, b - a, bot - top, { stroke: c.partLine, width: 1.25 });
    if (layers === 2) g.line(a, (top + bot) / 2, b, (top + bot) / 2, { color: c.partLine, width: 1.5 });
  });
  // The centre line.
  g.line(V.X(cx), top - 14, V.X(cx), bot + 14, { color: c.accent, width: 1, dash: [10, 3, 2, 3] });
}
// The cut thread in the hole wall: a saw-tooth from the drill size out to the screw's size.
function threads(g, V, cx, T, rIn, rOut, pitch, onScrew) {
  var c = g.c; if (!(pitch > 0) || V.L(pitch) < 3) return;
  [-1, 1].forEach(function (sg) {
    var pts = [], y = 0, n = 0;
    while (y > -T) { var yy = Math.max(-T, y - pitch / 2); pts.push([V.X(cx + sg * rIn), V.Y(y)], [V.X(cx + sg * rOut), V.Y(yy)]); y -= pitch; n++; if (n > 400) break; }
    pts.push([V.X(cx + sg * rIn), V.Y(-T)]);
    var poly = pts.concat([[V.X(cx + sg * rIn), V.Y(-T)], [V.X(cx + sg * rIn), V.Y(0)]]);
    g.poly(poly, { fill: onScrew ? c.part2 : c.sheet, stroke: null, close: true });
    g.path(pts, { color: c.partLine, width: 1 });
  });
}
// A socket-head screw: head above the plate, threaded shank through it and out the bottom.
function screw(g, V, cx, T, Dm, pitch, threaded, head, below) {
  var c = g.c, r = Dm / 2, hr = 0.75 * Dm, top = V.Y(head), y0 = V.Y(0), tip = V.Y(-T - below);
  g.rect(V.X(cx - r), y0, V.L(Dm), tip - y0, { fill: c.part2, stroke: c.partLine, width: 1.25 });
  if (threaded && pitch > 0 && V.L(pitch) >= 3) {
    [-1, 1].forEach(function (sg) {
      var pts = [], y = 0, n = 0, rIn = r - 0.6 * pitch;
      while (y > -T - below + 1e-9 && n++ < 400) { pts.push([V.X(cx + sg * r), V.Y(y)], [V.X(cx + sg * rIn), V.Y(Math.max(-T - below, y - pitch / 2))]); y -= pitch; }
      g.path(pts, { color: c.partLine, width: 1 });
    });
  }
  g.rect(V.X(cx - hr), top, V.L(2 * hr), y0 - top, { fill: c.part2, stroke: c.partLine, width: 1.25, radius: 2 });
  g.rect(V.X(cx - 0.3 * Dm), top, V.L(0.6 * Dm), V.L(0.4 * Dm), { fill: c.sheet, stroke: c.partLine, width: 1 });
}
// A blind rivet before it is set: flange head, hollow body, the mandrel up through it.
function rivet(g, V, cx, T, Dm, head, below) {
  var c = g.c, r = Dm / 2, y0 = V.Y(0), tip = V.Y(-T - below), hh = 0.3 * Dm;
  g.rect(V.X(cx - r), y0, V.L(Dm), tip - y0, { fill: c.part2, stroke: c.partLine, width: 1.25 });
  g.rect(V.X(cx - Dm), V.Y(hh), V.L(2 * Dm), V.L(hh), { fill: c.part2, stroke: c.partLine, width: 1.25, radius: 3 });
  var mr = 0.22 * Dm;
  g.rect(V.X(cx - mr), V.Y(head), V.L(2 * mr), tip - V.Y(head) - V.L(0.08), { fill: c.text2, stroke: null });
  g.circle(V.X(cx), tip - V.L(0.1), V.L(0.3 * Dm), { fill: c.text2, stroke: null });
}
// A ball bearing in its bore, cut through: outer ring, balls, inner ring.
function bearing(g, V, cx, T, hole, Dm) {
  var c = g.c, R = Dm / 2, ring = 0.14 * Dm, ball = 0.13 * Dm, inner = R - 2 * ring - ball * 0.9, y0 = V.Y(0), y1 = V.Y(-T);
  [-1, 1].forEach(function (sg) {
    var o0 = cx + sg * R, o1 = cx + sg * (R - ring), i0 = cx + sg * (inner + ring), i1 = cx + sg * inner;
    g.rect(Math.min(V.X(o0), V.X(o1)), y0, Math.abs(V.X(o0) - V.X(o1)), y1 - y0, { fill: c.part2, stroke: c.partLine, width: 1.25 });
    g.rect(Math.min(V.X(i0), V.X(i1)), y0, Math.abs(V.X(i0) - V.X(i1)), y1 - y0, { fill: c.part2, stroke: c.partLine, width: 1.25 });
    g.circle(V.X(cx + sg * (R - ring - ball * 0.45)), (y0 + y1) / 2, V.L(ball * 0.62), { fill: c.text2, stroke: null });
  });
  g.rect(V.X(cx - inner), y0, V.L(2 * inner), y1 - y0, { fill: c.sheet, stroke: null });
}
function hexShaft(g, V, cx, T) {
  var c = g.c, y0 = V.Y(0.12), y1 = V.Y(-T - 0.12);
  g.rect(V.X(cx - 0.25), y0, V.L(0.5), y1 - y0, { fill: c.part2, stroke: c.partLine, width: 1.25 });
  g.line(V.X(cx - 0.125), y0, V.X(cx - 0.125), y1, { color: c.partLine, width: 1 }); g.line(V.X(cx + 0.125), y0, V.X(cx + 0.125), y1, { color: c.partLine, width: 1 });
}
function insertPart(g, V, cx, T) {
  var c = g.c, y0 = V.Y(0), y1 = V.Y(-T * 0.7), r = 0.1;
  g.rect(V.X(cx - r), y0, V.L(2 * r), y1 - y0, { fill: c.gold, stroke: c.partLine, width: 1.25 });
  for (var y = y0 + 4; y < y1 - 2; y += 5) { g.line(V.X(cx - r), y, V.X(cx - r) + 4, y + 2.5, { color: c.partLine, width: 1 }); g.line(V.X(cx + r), y, V.X(cx + r) - 4, y + 2.5, { color: c.partLine, width: 1 }); }
  g.rect(V.X(cx - 0.06), y0, V.L(0.12), y1 - y0 - 4, { fill: c.sheet, stroke: c.partLine, width: 1 });
}
})(typeof window !== "undefined" ? window : this);
