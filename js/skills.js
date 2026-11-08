/* Skills: trees of categories, categories of skills, both drawn as layered graphs; mentor sign-off, requests, bulk sign-off, AI doc import. */
(function () {
"use strict";
var esc = D.esc;
var STUDENTS = ["Sam Ortiz", "Leo Brooks", "Priya Shah", "Ava Kim", "Jordan Lee", "Maya Gold"];

function sk(id, name, sum, req) { return { id: id, name: name, sum: sum, req: req || [] }; }
var TREES = [
  { id: "safety", name: "Safety", tag: "SF", note: "Required. Unlocks every other tree.", req: null, cats: [
    { id: "shop", name: "Shop Safety", req: [], skills: [sk("s1", "Shop rules and PPE", "glasses, closed shoes, hair tied"), sk("s2", "Emergency stops and first aid", "e-stops, eyewash, first-aid kit", ["s1"]), sk("s3", "Clean-up and tool return", "end-of-practice routine", ["s1"])] },
    { id: "batt", name: "Battery and Robot Power", req: ["shop"], skills: [sk("s4", "Battery handling", "carry, charge, inspect leads"), sk("s5", "Power-on checks", "breaker, RSL, radio light", ["s4"]), sk("s6", "Lock out before work", "breaker off, battery out", ["s5"])] },
    { id: "mach", name: "Machine Safety", req: ["shop"], skills: [sk("s7", "Hand tools", "files, hacksaw, deburring"), sk("s8", "Drill press", "clamping, speeds, chips", ["s7"]), sk("s9", "Bandsaw", "blade guard, push stick", ["s7"]), sk("s10", "Belt sander", "direction, small parts", ["s8", "s9"])] }
  ] },
  { id: "mfg", name: "Manufacturing", tag: "MF", note: "Make robot parts accurately.", req: "safety", cats: [
    { id: "meas", name: "Measuring and Layout", req: [], skills: [sk("m1", "Calipers and rules", "read to 0.001 in"), sk("m2", "Layout and center punch", "scribe, square, punch", ["m1"])] },
    { id: "hand", name: "Hand Fabrication", req: ["meas"], skills: [sk("m3", "Cut aluminum tube", "miter box, square ends"), sk("m4", "Rivets", "pop rivets, sizing, removal", ["m3"]), sk("m5", "Deburr and finish", "edges, chamfers", ["m3"])] },
    { id: "drill", name: "Drilling and Tapping", req: ["hand"], skills: [sk("m6", "Drill to a layout", "pilot, step drill"), sk("m7", "Tap threads", "10-32, 1/4-20, cutting fluid", ["m6"]), sk("m8", "Hex broaching", "1/2 in hex in sprockets", ["m6"])] },
    { id: "cnc", name: "CNC Router", req: ["meas"], skills: [sk("m9", "Load stock and zero", "hold-downs, work zero"), sk("m10", "Run a toolpath", "feeds, dust, watch the cut", ["m9"]), sk("m11", "CAM from Onshape", "export, toolpaths, tabs", ["m10"])] },
    { id: "sheet", name: "Polycarb and Sheet", req: ["drill", "cnc"], skills: [sk("m12", "Bend polycarb", "heat, jig, springback"), sk("m13", "Gussets and plates", "pattern drilling, fit-up", ["m12"])] }
  ] },
  { id: "elec", name: "Electrical", tag: "EL", note: "Wire it once, wire it right.", req: "safety", cats: [
    { id: "wire", name: "Wire Prep", req: [], skills: [sk("e1", "Wire gauges and colors", "red/black, 6 to 22 AWG"), sk("e2", "Strip and tin", "clean strip lengths", ["e1"])] },
    { id: "crimp", name: "Crimping and Connectors", req: ["wire"], skills: [sk("e3", "Andersen Powerpole", "crimp, housing, polarity"), sk("e4", "Ferrules", "for WAGO and PDH", ["e3"]), sk("e5", "JST and PWM", "small crimps, latches", ["e3"]), sk("e6", "Large lugs", "6 AWG, hydraulic crimp, pull test", ["e4"])] },
    { id: "ctrl", name: "Control System", req: ["crimp"], skills: [sk("e7", "Lay out the board", "roboRIO, PDH, radio"), sk("e8", "Power distribution", "breakers, fuses, budget", ["e7"]), sk("e9", "Radio and network", "config, power, field test", ["e7"])] },
    { id: "can", name: "CAN and Motor Controllers", req: ["ctrl"], skills: [sk("e10", "CAN bus wiring", "daisy chain, termination"), sk("e11", "Set CAN ids", "Phoenix Tuner, REV Hardware Client", ["e10"])] },
    { id: "pneu", name: "Pneumatics", req: ["wire"], skills: [sk("e12", "Tubing and fittings", "cut square, push-to-connect"), sk("e13", "Solenoids and the hub", "wiring, leak test", ["e12"])] },
    { id: "sens", name: "Sensors", req: ["ctrl"], skills: [sk("e14", "Limit switches and beam breaks", "wiring, polarity"), sk("e15", "Encoders", "absolute vs relative", ["e14"])] }
  ] },
  { id: "prog", name: "Programming", tag: "PR", note: "From Git to autonomous.", req: "safety", cats: [
    { id: "git", name: "Git and Tools", req: [], skills: [sk("p1", "Clone, branch, commit", "GitHub desktop or CLI"), sk("p2", "Pull requests", "review, merge", ["p1"])] },
    { id: "java", name: "Java Basics", req: [], skills: [sk("p3", "Classes and methods", ""), sk("p4", "Units and math", "WPILib units", ["p3"])] },
    { id: "cmd", name: "Command-Based Robots", req: ["git", "java"], skills: [sk("p5", "Subsystems", "hardware in one place"), sk("p6", "Commands and triggers", "bind buttons", ["p5"]), sk("p7", "Simulation", "test without a robot", ["p5"])] },
    { id: "auto", name: "Autonomous Paths", req: ["cmd"], skills: [sk("p8", "Path planning", "waypoints, constraints"), sk("p9", "Auto chooser", "dashboard selection", ["p8"])] },
    { id: "vis", name: "Vision", req: ["cmd"], skills: [sk("p10", "AprilTags", "pose from tags"), sk("p11", "Pose estimation", "fuse with odometry", ["p10"])] },
    { id: "log", name: "Logging and Debugging", req: ["cmd"], skills: [sk("p12", "Read match logs", "AdvantageScope"), sk("p13", "Fix it from the log", "reproduce, patch", ["p12"])] }
  ] },
  { id: "pit", name: "Pit Crew and Drive", tag: "PD", note: "Competition-ready.", req: "safety", cats: [
    { id: "pitb", name: "Pit Basics", req: [], skills: [sk("d1", "Pit setup and layout", "carts, tools, power"), sk("d2", "Run a match checklist", "Pit app checklists", ["d1"])] },
    { id: "brot", name: "Battery Rotation", req: ["pitb"], skills: [sk("d3", "Charge and log batteries", "states, voltages"), sk("d4", "Swap a battery fast", "under 60 seconds", ["d3"])] },
    { id: "drvb", name: "Driving Basics", req: [], skills: [sk("d5", "Robot driving 101", "field-relative swerve"), sk("d6", "Controls map", "every button", ["d5"])] },
    { id: "drvp", name: "Driver Practice", req: ["brot", "drvb"], skills: [sk("d7", "Cycle drills", "score, return, repeat"), sk("d8", "Practice match", "full 2:30 with pit crew", ["d7"])] }
  ] }
];
var BYID = {}; TREES.forEach(function (t) { t.cats.forEach(function (c) { c.tree = t.id; c.skills.forEach(function (s) { s.cat = c.id; s.tree = t.id; BYID[s.id] = s; }); }); });
function tree(id) { return TREES.filter(function (t) { return t.id === id; })[0]; }
function cat(t, id) { return t.cats.filter(function (c) { return c.id === id; })[0]; }

function seed(S) {
  var levels = { "Sam Ortiz": [1, .45, .55, .2, .3], "Leo Brooks": [1, .8, .2, .1, .6], "Priya Shah": [1, .2, .4, .85, .3], "Ava Kim": [1, .35, .75, .3, .2], "Jordan Lee": [.6, 0, 0, 0, 0], "Maya Gold": [1, .15, .1, .5, .1] };
  var prog = {};
  STUDENTS.forEach(function (st) {
    prog[st] = {};
    TREES.forEach(function (t, ti) {
      var all = []; t.cats.forEach(function (c) { c.skills.forEach(function (s) { all.push(s.id); }); });
      var n = Math.round(all.length * levels[st][ti]);
      all.slice(0, n).forEach(function (id) { prog[st][id] = { s: "done", by: ["Mr. Chen", "Ms. Rivera", "Mr. Okafor"][id.length % 3], at: "Oct " + (3 + (id.charCodeAt(1) % 25)) }; });
      if (n < all.length && levels[st][ti] > 0) prog[st][all[n]] = { s: "progress" };
    });
  });
  // keep order sensible: drop "done" marks whose prereqs aren't done
  STUDENTS.forEach(function (st) { Object.keys(prog[st]).forEach(function (id) { if (!skillOpenFor(prog[st], BYID[id]) && prog[st][id].s === "done") delete prog[st][id]; }); });
  S.sk = { prog: prog, student: "Sam Ortiz", tree: "elec", cat: null, requests: [ { st: "Leo Brooks", id: "m11", note: "Cut the intake plates on Saturday" }, { st: "Ava Kim", id: "e11", note: "" } ], bulk: { id: "s9", picks: {} }, ai: null };
}
function skillOpenFor(p, s) { return s.req.every(function (r) { return p[r] && p[r].s === "done"; }); }

/* Status, from one student's progress */
function treeDone(p, t) { return t.cats.every(function (c) { return c.skills.every(function (s) { return p[s.id] && p[s.id].s === "done"; }); }); }
function treeLocked(p, t) { return t.req && !treeDone(p, tree(t.req)); }
function catCounts(p, c) { var d = 0; c.skills.forEach(function (s) { if (p[s.id] && p[s.id].s === "done") d++; }); return d; }
function catStatus(p, t, c) {
  if (treeLocked(p, t)) return "locked";
  if (c.req.some(function (r) { var rc = cat(t, r); return catCounts(p, rc) < rc.skills.length; })) return "locked";
  var d = catCounts(p, c);
  if (d === c.skills.length) return "complete";
  if (d > 0 || c.skills.some(function (s) { return p[s.id] && p[s.id].s === "progress"; })) return "progress";
  return "available";
}
function skillStatus(st, p, t, c, s) {
  if (p[s.id] && p[s.id].s === "done") return "complete";
  if (catStatus(p, t, c) === "locked" || !skillOpenFor(p, s)) return "locked";
  if (D.S.sk.requests.some(function (r) { return r.st === st && r.id === s.id; })) return "requested";
  if (p[s.id] && p[s.id].s === "progress") return "progress";
  return "available";
}
function treePct(p, t) { var all = 0, d = 0; t.cats.forEach(function (c) { all += c.skills.length; d += catCounts(p, c); }); return { pct: D.pct(d, all), d: d, all: all }; }

/* Layered layout: each node one row below its deepest prerequisite; rows ordered by the parents' positions. */
function layout(nodes, W, H, GX, GY) {
  var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
  var layer = {};
  function L(n) { if (layer[n.id] != null) return layer[n.id]; var reqs = n.req.filter(function (r) { return byId[r]; }); layer[n.id] = reqs.length ? 1 + Math.max.apply(null, reqs.map(function (r) { return L(byId[r]); })) : 0; return layer[n.id]; }
  nodes.forEach(L);
  var rows = []; nodes.forEach(function (n) { (rows[layer[n.id]] = rows[layer[n.id]] || []).push(n); });
  var maxRow = Math.max.apply(null, rows.map(function (r) { return r.length; }));
  var width = Math.max(1, maxRow) * (W + GX) - GX + 2 * GX, pos = {};
  rows.forEach(function (row, li) {
    if (li > 0) row.sort(function (a, b) { return bary(a) - bary(b); });
    var rowW = row.length * (W + GX) - GX, x0 = (width - rowW) / 2;
    row.forEach(function (n, i) { pos[n.id] = { x: x0 + i * (W + GX), y: GY / 2 + li * (H + GY) }; });
  });
  function bary(n) { var ps = n.req.filter(function (r) { return pos[r]; }); return ps.length ? ps.reduce(function (a, r) { return a + pos[r].x; }, 0) / ps.length : 0; }
  var height = rows.length * (H + GY);
  var edges = []; nodes.forEach(function (n) { n.req.forEach(function (r) { if (pos[r]) edges.push({ from: r, to: n.id }); }); });
  return { pos: pos, width: width, height: height, edges: edges };
}
function edgePath(a, b, W, H) {
  var x1 = a.x + W / 2, y1 = a.y + H, x2 = b.x + W / 2, y2 = b.y, ym = (y1 + y2) / 2;
  if (Math.abs(x1 - x2) < 1) return "M" + x1 + " " + y1 + " V" + y2;
  var r = Math.min(10, Math.abs(x2 - x1) / 2, (y2 - y1) / 4), dir = x2 > x1 ? 1 : -1;
  return "M" + x1 + " " + y1 + " V" + (ym - r) + " Q" + x1 + " " + ym + " " + (x1 + dir * r) + " " + ym + " H" + (x2 - dir * r) + " Q" + x2 + " " + ym + " " + x2 + " " + (ym + r) + " V" + y2;
}
function graph(nodes, W, H, renderNode, doneEdge) {
  var g = layout(nodes, W, H, 36, 56);
  var svg = '<svg width="' + g.width + '" height="' + g.height + '" aria-hidden="true">' + g.edges.map(function (e) { return '<path class="' + (doneEdge(e.from) ? "done" : "") + '" d="' + edgePath(g.pos[e.from], g.pos[e.to], W, H) + '"/>'; }).join("") + "</svg>";
  return '<div class="graphwrap" data-keepscroll="skillgraph"><div class="graph" style="width:' + g.width + "px;height:" + g.height + 'px">' + svg +
    nodes.map(function (n) { var p = g.pos[n.id]; return renderNode(n, 'style="left:' + p.x + "px;top:" + p.y + "px;width:" + W + "px;height:" + H + 'px"'); }).join("") + "</div></div>";
}
var MARK = { complete: "✓", requested: "…", progress: "●", available: "", locked: "" };
var LEGEND = '<div class="legend"><span><i class="dotc" style="background:var(--mute)"></i>Locked</span><span><i class="dotc" style="background:var(--info)"></i>Available</span><span><i class="dotc" style="background:var(--warn)"></i>In progress</span><span><i class="dotc" style="background:var(--ok)"></i>Complete</span></div>';

/* ---------- Views ---------- */
D.views.skills = function () {
  var S = D.S, staff = D.isStaff();
  var list = [["overview", "Overview"], ["trees", "Skill trees"]];
  if (staff) list.push(["signoff", "Sign off" + (S.sk.requests.length ? " (" + S.sk.requests.length + ")" : "")], ["edit", "Edit trees"]);
  var t = D.tab("skills", "trees"), body;
  if (t === "overview") body = overview();
  else if (t === "signoff" && staff) body = signoffView();
  else if (t === "edit" && staff) body = editView();
  else body = treesView();
  return D.topbar("Skills", "skills.2972robotics.com", D.tabsFor("skills", list, "trees"), "") + '<div class="content">' + body + "</div>";
};
function overview() {
  var S = D.S, P = S.sk.prog;
  var cards = TREES.map(function (t) {
    var avg = Math.round(STUDENTS.reduce(function (a, st) { return a + treePct(P[st], t).pct; }, 0) / STUDENTS.length);
    var fin = STUDENTS.filter(function (st) { return treeDone(P[st], t); }).length, n = t.cats.reduce(function (a, c) { return a + c.skills.length; }, 0);
    return '<button class="card tight" style="text-align:left;cursor:pointer" data-act="sktree" data-v="' + t.id + '"><div class="row nowrap"><span class="badge-2972" style="background:var(--rail);color:var(--gold)">' + t.tag + '</span><div><h3>' + esc(t.name) + '</h3><span class="who">' + n + " skills</span></div></div>" +
      '<div class="bar"><i style="width:' + avg + '%"></i></div><div class="row between small mute"><span>Team average ' + avg + "%</span><span>" + fin + " of " + STUDENTS.length + " finished</span></div></button>";
  }).join("");
  var rows = STUDENTS.map(function (st) {
    var all = 0, d = 0, prog = 0;
    var cells = TREES.map(function (t) { var r = treePct(P[st], t); all += r.all; d += r.d; return '<td class="num" style="color:' + (r.pct === 100 ? "var(--ok)" : r.pct ? "var(--text)" : "var(--mute)") + '">' + r.pct + "%</td>"; }).join("");
    Object.keys(P[st]).forEach(function (k) { if (P[st][k].s === "progress") prog++; });
    return '<tr class="click" data-act="skstudent" data-v="' + esc(st) + '"><td><b>' + esc(st) + "</b>" + (st === "Sam Ortiz" && D.S.role === "student" ? ' <span class="who">(you)</span>' : "") + "</td>" + cells + "<td>" + d + "</td><td>" + prog + '</td><td style="min-width:120px"><div class="row nowrap"><div class="bar" style="flex:1"><i style="width:' + D.pct(d, all) + '%"></i></div><span class="small num">' + D.pct(d, all) + "%</span></div></td></tr>";
  }).join("");
  return '<div class="grid3">' + cards + '</div><div class="card"><div class="row between"><h2>Students</h2><span class="small mute">Everyone sees everyone. Tap a row to open their trees.</span></div><div class="tablewrap"><table><thead><tr><th>Student</th>' + TREES.map(function (t) { return "<th>" + t.tag + "</th>"; }).join("") + "<th>Complete</th><th>In progress</th><th>Overall</th></tr></thead><tbody>" + rows + "</tbody></table></div></div>";
}
function studentPicker() {
  var S = D.S;
  return '<div class="field" style="min-width:200px"><label for="sk-st">Student</label><select id="sk-st" data-change="skstudent">' + STUDENTS.map(function (st) { return "<option" + (st === S.sk.student ? " selected" : "") + ">" + esc(st) + "</option>"; }).join("") + "</select></div>";
}
function treesView() {
  var S = D.S, st = S.sk.student, P = S.sk.prog[st], t = tree(S.sk.tree);
  var chips = '<div class="chips">' + TREES.map(function (x) {
    var r = treePct(P, x);
    return '<button class="chip' + (treeLocked(P, x) ? " locked" : "") + '" data-act="sktree" data-v="' + x.id + '" aria-pressed="' + (x.id === t.id) + '">' + esc(x.name) + ' <span class="small">' + r.pct + "%</span></button>";
  }).join("") + "</div>";
  var head = '<div class="row between">' + chips + studentPicker() + "</div>";
  if (S.sk.cat) return head + catGraph(st, P, t, cat(t, S.sk.cat));
  var r = treePct(P, t), locked = treeLocked(P, t);
  var g = graph(t.cats, 230, 74, function (c, style) {
    var stt = catStatus(P, t, c), d = catCounts(P, c);
    return '<button class="gnode ' + stt + '" ' + style + ' data-act="skcat" data-v="' + c.id + '"' + (stt === "locked" ? ' aria-disabled="true"' : "") + '><span class="mark">' + MARK[stt] + "</span><b>" + esc(c.name) + '</b><span class="sub">' + d + " / " + c.skills.length + ' skills</span><span class="gbar"><i style="width:' + D.pct(d, c.skills.length) + '%"></i></span></button>';
  }, function (id) { var c = cat(t, id); return catCounts(P, c) === c.skills.length; });
  return head + '<div class="card"><div class="row between"><div class="row nowrap"><span class="badge-2972" style="background:var(--rail);color:var(--gold)">' + t.tag + '</span><div><h2>' + esc(t.name) + '</h2><span class="who">' + esc(t.note) + (locked ? " · Locked until " + esc(tree(t.req).name) + " is complete" : "") + '</span></div></div><span class="pill ' + (r.pct === 100 ? "ok" : "") + '">' + r.d + " / " + r.all + " skills</span></div>" + LEGEND + g +
    '<p class="small mute">Categories unlock when the ones above them are complete. Tap one to see its skills.</p></div>';
}
function catGraph(st, P, t, c) {
  var d = catCounts(P, c);
  var g = graph(c.skills, 220, 84, function (s, style) {
    var stt = skillStatus(st, P, t, c, s);
    return '<button class="gnode ' + stt + '" ' + style + ' data-act="skskill" data-v="' + s.id + '"><span class="mark">' + MARK[stt] + "</span><b>" + esc(s.name) + '</b><span class="sub">' + esc(s.sum) + "</span>" + (stt === "requested" ? '<span class="pill info" style="justify-self:start">Sign-off asked</span>' : "") + "</button>";
  }, function (id) { return P[id] && P[id].s === "done"; });
  return '<div class="card"><div class="row between"><div class="row"><button class="btn sm" data-act="skback">← Back to ' + esc(t.name) + '</button><div><p class="eyebrow">' + esc(t.name) + " · " + esc(st) + "</p><h2>" + esc(c.name) + '</h2></div></div><span class="pill ' + (d === c.skills.length ? "ok" : "") + '">' + d + " / " + c.skills.length + " skills</span></div>" + LEGEND + g + '<p class="small mute">Lines show what you need first. Tap a skill to see it, ask for a sign-off, or (mentors) sign it off.</p></div>';
}
D.drawers.skill = function (d) {
  var S = D.S, s = BYID[d.id], t = tree(s.tree), c = cat(t, s.cat), st = S.sk.student, P = S.sk.prog[st], stt = skillStatus(st, P, t, c, s), rec = P[s.id];
  var self = S.role === "student" && st === "Sam Ortiz", staff = D.isStaff();
  var acts = "";
  if (staff && stt !== "complete" && stt !== "locked") acts = '<button class="btn primary" data-act="sksignoff" data-v="' + s.id + '">' + D.ic("check", 16) + " Sign off " + esc(st.split(" ")[0]) + '</button><button class="btn" data-act="skprogress" data-v="' + s.id + '">Mark in progress</button>';
  else if (staff && stt === "complete") acts = '<button class="btn danger" data-act="skunsign" data-v="' + s.id + '">Remove sign-off</button>';
  else if (self && (stt === "available" || stt === "progress")) acts = '<button class="btn primary" data-act="skrequest" data-v="' + s.id + '">Request sign-off</button>' + (stt === "available" ? '<button class="btn" data-act="skprogress" data-v="' + s.id + '">I\'m working on it</button>' : "");
  else if (self && stt === "requested") acts = '<span class="pill info">Waiting for a mentor</span><button class="btn ghost sm" data-act="skcancelreq" data-v="' + s.id + '">Cancel request</button>';
  var reqs = s.req.map(function (r) { var ok = P[r] && P[r].s === "done"; return '<div class="li"><span class="pill ' + (ok ? "ok" : "") + '">' + (ok ? "Done" : "Needed") + "</span>" + esc(BYID[r].name) + "</div>"; }).join("");
  return D.drawerHead(t.name + " › " + c.name, s.name) +
    '<div class="row"><span class="pill ' + ({ complete: "ok", requested: "info", progress: "warn", available: "info", locked: "" })[stt] + '">' + ({ complete: "Complete", requested: "Sign-off asked", progress: "In progress", available: "Available", locked: "Locked" })[stt] + '</span><span class="who">for ' + esc(st) + "</span></div>" +
    '<p>' + esc(s.sum ? s.sum.charAt(0).toUpperCase() + s.sum.slice(1) + "." : "") + " A mentor watches you do it once and signs it off. The Team Handbook and the linked guide have the steps.</p>" +
    (reqs ? '<div><p class="flabel">Needs first</p><div class="list">' + reqs + "</div></div>" : "") +
    (rec && rec.s === "done" ? '<p class="who">Signed off by ' + esc(rec.by) + " · " + esc(rec.at) + "</p>" : "") +
    (acts ? '<div class="row">' + acts + "</div>" : stt === "locked" ? '<p class="hint">Finish what this needs first.</p>' : "");
};
function signoffView() {
  var S = D.S, b = S.sk.bulk, s = BYID[b.id];
  var opts = TREES.map(function (t) { return '<optgroup label="' + esc(t.name) + '">' + t.cats.map(function (c) { return c.skills.map(function (x) { return '<option value="' + x.id + '"' + (x.id === b.id ? " selected" : "") + ">" + esc(c.name + " › " + x.name) + "</option>"; }).join(""); }).join("") + "</optgroup>"; }).join("");
  var people = STUDENTS.map(function (st) {
    var p = S.sk.prog[st], t = tree(s.tree), c = cat(t, s.cat), stt = skillStatus(st, p, t, c, s);
    var can = stt !== "complete" && stt !== "locked";
    return '<div class="checkrow" style="grid-template-columns:44px minmax(0,1fr) auto;min-height:52px"><button class="bigcheck sm" data-act="skbulkpick" data-v="' + esc(st) + '" aria-pressed="' + !!b.picks[st] + '"' + (can ? "" : " disabled") + ' aria-label="Pick ' + esc(st) + '">' + D.ic("check", 22) + "</button><b>" + esc(st) + '</b><span class="pill ' + (stt === "complete" ? "ok" : stt === "locked" ? "" : "info") + '">' + ({ complete: "Done", locked: "Locked", requested: "Asked", progress: "In progress", available: "Available" })[stt] + "</span></div>";
  }).join("");
  var n = Object.keys(b.picks).filter(function (k) { return b.picks[k]; }).length;
  var queue = S.sk.requests.length ? S.sk.requests.map(function (r, i) {
    var x = BYID[r.id];
    return '<div class="li"><span class="grow"><b>' + esc(r.st) + "</b> asks for <b>" + esc(x.name) + '</b><br><span class="who">' + esc(tree(x.tree).name) + " › " + esc(cat(tree(x.tree), x.cat).name) + (r.note ? " · “" + esc(r.note) + "”" : "") + '</span></span><button class="btn primary sm" data-act="skqok" data-i="' + i + '">Sign off</button><button class="btn ghost sm" data-act="skqno" data-i="' + i + '">Not yet</button></div>';
  }).join("") : '<div class="empty">No one is waiting. Requests from students land here and in your bell.</div>';
  return '<div class="grid2"><div class="card"><h2>Waiting for a sign-off</h2><div class="list">' + queue + '</div></div><div class="card"><h2>Sign off a group</h2><p class="small mute">After a training session: pick the skill, tick who did it, sign them all off at once.</p><div class="field"><label for="sk-bulk">Skill</label><select id="sk-bulk" data-change="skbulk">' + opts + "</select></div><div>" + people + '</div><div class="row"><button class="btn primary" data-act="skbulkgo"' + (n ? "" : " disabled") + ">Sign off " + n + " student" + (n === 1 ? "" : "s") + "</button></div></div></div>";
}
function editView() {
  var ai = D.S.sk.ai;
  return '<div class="grid2"><div class="card"><h2>Turn a doc into skills</h2><p class="mute">Upload a team guide (PDF or text). Gemini drafts skills in our import format. Nothing changes until a mentor accepts the preview.</p>' +
    '<div class="row"><button class="btn" data-act="skaipick">Use “Battery wiring guide.pdf” (sample)</button></div>' +
    (ai ? '<div class="card flat"><p class="eyebrow">Draft · Electrical › Control System</p><div class="list">' + ai.map(function (x, i) { return '<div class="li"><span class="pill ' + (x.op === "Add" ? "ok" : "info") + '">' + x.op + '</span><span class="grow"><b>' + esc(x.name) + '</b><br><span class="who">' + esc(x.note) + '</span></span><button class="btn ghost sm" data-act="skaidrop" data-i="' + i + '">Drop</button></div>'; }).join("") + '</div><div class="row"><button class="btn primary" data-act="skaiaccept">Accept ' + ai.length + ' changes</button><button class="btn" data-act="skaidiscard">Discard</button></div><p class="small mute">Keys stay stable, so renamed skills keep everyone\'s progress. The model never sees student progress.</p></div>' : "") +
    '</div><div class="card"><h2>Edit by hand</h2><p class="small mute">Rename, reorder, add or remove trees, categories and skills. Export and import as a file.</p><div class="list">' +
    TREES.map(function (t) { return '<div class="li"><b class="grow">' + esc(t.name) + '</b><span class="who">' + t.cats.length + " categories</span><button class=\"btn ghost sm\">Edit</button></div>"; }).join("") +
    '</div><div class="row"><button class="btn sm">+ New tree</button><button class="btn sm">Export</button><button class="btn sm">Import file</button></div></div></div>';
}

/* ---------- Actions ---------- */
var A = D.acts;
A.sktree = function (b) { var S = D.S; S.sk.tree = b.dataset.v; S.sk.cat = null; S.tabs.skills = "trees"; D.render(); };
A.skstudent = function (b) { var S = D.S; S.sk.student = b.dataset.v; S.sk.cat = null; S.tabs.skills = "trees"; D.render(); };
D.changes.skstudent = function (el) { D.S.sk.student = el.value; D.render(); };
A.skcat = function (b) { if (b.getAttribute("aria-disabled") === "true") { D.toast("Finish the categories above this one first."); D.render(); return; } D.S.sk.cat = b.dataset.v; D.render(); };
A.skback = function () { D.S.sk.cat = null; D.render(); };
A.skskill = function (b) { D.openDrawer("skill", { id: b.dataset.v }); };
function setDone(st, id) { D.S.sk.prog[st][id] = { s: "done", by: D.me().name, at: "Nov 10" }; D.S.sk.requests = D.S.sk.requests.filter(function (r) { return !(r.st === st && r.id === id); }); }
A.sksignoff = function (b) {
  var S = D.S, st = S.sk.student, id = b.dataset.v, prev = S.sk.prog[st][id];
  D.withUndo("Signed off " + st + " on " + BYID[id].name, function () { setDone(st, id); D.log("signed off " + st + " on " + BYID[id].name, "skills"); if (st === "Sam Ortiz") D.notify("student", "skills", D.me().name + " signed you off on " + BYID[id].name + "."); }, function () { if (prev) S.sk.prog[st][id] = prev; else delete S.sk.prog[st][id]; S.activity.shift(); });
};
A.skunsign = function (b) { var S = D.S; delete S.sk.prog[S.sk.student][b.dataset.v]; D.toast("Sign-off removed."); D.render(); };
A.skprogress = function (b) { var S = D.S; S.sk.prog[S.sk.student][b.dataset.v] = { s: "progress" }; D.render(); };
A.skrequest = function (b) {
  var S = D.S, id = b.dataset.v;
  S.sk.requests.push({ st: "Sam Ortiz", id: id, note: "" }); S.sk.prog["Sam Ortiz"][id] = S.sk.prog["Sam Ortiz"][id] || { s: "progress" };
  D.notify(["mentor", "admin"], "skills", "Sam Ortiz asked for a sign-off on " + BYID[id].name + "."); D.log("asked for a sign-off on " + BYID[id].name, "skills");
  D.toast("Asked. Mentors get a notice."); D.render();
};
A.skcancelreq = function (b) { var S = D.S; S.sk.requests = S.sk.requests.filter(function (r) { return !(r.st === "Sam Ortiz" && r.id === b.dataset.v); }); D.render(); };
A.skqok = function (b) { var S = D.S, r = S.sk.requests[+b.dataset.i]; setDone(r.st, r.id); D.log("signed off " + r.st + " on " + BYID[r.id].name, "skills"); if (r.st === "Sam Ortiz") D.notify("student", "skills", D.me().name + " signed you off on " + BYID[r.id].name + "."); D.toast("Signed off " + r.st + "."); D.render(); };
A.skqno = function (b) { var S = D.S, r = S.sk.requests.splice(+b.dataset.i, 1)[0]; if (r.st === "Sam Ortiz") D.notify("student", "skills", D.me().name + " says not yet on " + BYID[r.id].name + ". Ask them what to practice."); D.render(); };
D.changes.skbulk = function (el) { D.S.sk.bulk = { id: el.value, picks: {} }; D.render(); };
A.skbulkpick = function (b) { var p = D.S.sk.bulk.picks; p[b.dataset.v] = !p[b.dataset.v]; D.render(); };
A.skbulkgo = function () { var S = D.S, b = S.sk.bulk, names = Object.keys(b.picks).filter(function (k) { return b.picks[k]; }); names.forEach(function (st) { setDone(st, b.id); }); D.log("signed off " + names.length + " students on " + BYID[b.id].name, "skills"); b.picks = {}; D.toast("Signed off " + names.length + " on " + BYID[b.id].name + "."); D.render(); };
A.skaipick = function () { D.S.sk.ai = [ { op: "Add", name: "Inspect battery leads", note: "Before each match: cracks, loose lugs, heat marks" }, { op: "Add", name: "Torque SB50 terminals", note: "Needs: Large lugs" }, { op: "Add", name: "Label and log a battery", note: "Number, date, first use" }, { op: "Update", name: "Power distribution", note: "Adds “check the main breaker rating” to the description" } ]; D.render(); };
A.skaidrop = function (b) { D.S.sk.ai.splice(+b.dataset.i, 1); D.render(); };
A.skaidiscard = function () { D.S.sk.ai = null; D.render(); };
A.skaiaccept = function () {
  var S = D.S, c = cat(tree("elec"), "ctrl"), n = 0;
  S.sk.ai.forEach(function (x, i) { if (x.op === "Add") { var s = sk("ai" + i + Date.now(), x.name, x.note.toLowerCase(), [c.skills[n % c.skills.length].id]); s.cat = "ctrl"; s.tree = "elec"; c.skills.push(s); BYID[s.id] = s; n++; } });
  D.log("added " + n + " skills to Electrical › Control System", "skills"); S.sk.ai = null; S.sk.tree = "elec"; S.sk.cat = "ctrl"; S.tabs.skills = "trees"; D.toast(n + " skills added. Opened the category so you can see them."); D.render();
};

D.inits.push(function (S) {
  seed(S);
  S.notices.push({ to: "student", app: "skills", text: "Mr. Chen signed you off on Battery handling.", when: "Yesterday", read: false });
  S.notices.push({ to: "mentor", app: "skills", text: "2 students asked for a sign-off.", when: "1 h ago", read: false });
  S.activity.push({ who: "Mr. Chen", what: "signed off Sam Ortiz on Battery handling", app: "skills", when: "Mon" });
});
})();
