/* Tasks at working depth: its own left sidebar (views and the Division > Project > Subteam tree), list and board per subteam, milestone grid per project,
   My tasks, This week, Dashboard, Calendar, Timeline, a full task panel (subtasks, dependencies, labels, links, comments, history), lead and simple modes, the assistant, and the projector. */
(function () {
"use strict";
var esc = D.esc;
var TODAYS = "2026-11-10";
function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function add(s, n) { var d = parse(s); return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }
function fmt(s, o) { return s ? parse(s).toLocaleDateString("en-US", o || { weekday: "short", month: "short", day: "numeric" }) : "No date"; }
function days(s) { return Math.round((parse(s) - parse(TODAYS)) / 86400000); }
var ST = { todo: ["To do", ""], doing: ["In progress", "info"], blocked: ["Blocked", "bad"], done: ["Done", "ok"] };
var LABELS = { design: ["Design", "#7b61c9"], build: ["Build", "#b8860b"], wiring: ["Wiring", "#c0632b"], code: ["Code", "#2f6fd6"], test: ["Test", "#2e9e6a"], urgent: ["Urgent", "#c0392b"] };
var ME_STUDENT = "Sam Ortiz";

function seed() {
  var divs = [
    { id: "eng", name: "Engineering", open: true, projects: [
      { id: "drive", name: "Drivetrain", color: "#2e9e6a", subs: ["Mechanical", "Electrical", "Programming"], ms: [["m1", "Modules built", "2026-10-30", true], ["m2", "Driving on carpet", "2026-11-12", false]] },
      { id: "intake", name: "Intake", color: "#e8b931", subs: ["CAD", "Mechanical", "Fabrication", "Programming"], ms: [["m3", "Design review", "2026-11-05", true], ["m4", "Prototype intaking", "2026-11-14", false], ["m5", "Comp-ready", "2026-12-12", false]] },
      { id: "elev", name: "Elevator", color: "#4f7fd9", subs: ["CAD", "Mechanical", "Electrical", "Programming"], ms: [["m6", "Design review", "2026-11-19", false], ["m7", "First lift", "2026-12-10", false]] },
      { id: "shoot", name: "Shooter", color: "#d9774f", subs: ["CAD", "Mechanical", "Programming"], ms: [["m8", "Flywheel test", "2026-11-21", false]] },
      { id: "bump", name: "Bumpers", color: "#9b6ad6", subs: ["Fabrication"], ms: [] } ] },
    { id: "comp", name: "Competition", open: false, projects: [
      { id: "drivers", name: "Driver practice", color: "#2e9e6a", subs: ["Drive team"], ms: [] },
      { id: "pitprep", name: "Pit setup", color: "#e8b931", subs: ["Pit crew"], ms: [] } ] },
    { id: "out", name: "Outreach and Fundraising", open: false, projects: [
      { id: "library", name: "Library robot demo", color: "#2e9e6a", subs: ["Outreach"], ms: [["m9", "Demo night", "2026-11-19", false]] },
      { id: "sponsors", name: "Sponsor letters", color: "#4f7fd9", subs: ["Business"], ms: [] } ] },
    { id: "ops", name: "Team Operations", open: false, projects: [ { id: "shop", name: "Shop and tools", color: "#8f98ad", subs: ["Ops"], ms: [] } ] },
    { id: "lead", name: "Leadership", open: false, projects: [ { id: "plan", name: "Season plan", color: "#9b6ad6", subs: ["Captains"], ms: [] } ] }
  ];
  var id = 0, list = [];
  function t(title, p, sub, ms, who, due, st, o) {
    var x = { id: ++id, title: title, p: p, sub: sub, ms: ms || null, who: who || [], due: due || "", st: st || "todo", parent: null, labels: [], est: null, by: [], rel: [], links: [], desc: "", check: [], comments: [], hist: [] };
    Object.keys(o || {}).forEach(function (k) { x[k] = o[k]; });
    x.hist.unshift(["Ms. Rivera", "created it", "Nov 2", { st: "todo", due: x.due }]);
    list.push(x); return x;
  }
  var a = t("Mount intake roller bearings", "intake", "Mechanical", "m4", [ME_STUDENT], "2026-11-12", "doing", { labels: ["build"], est: 3, desc: "Press four flanged 1/2\" hex bearings into the side plates and check the rollers spin freely.",
    check: [["Ream bearing bores", true], ["Press in 4 flanged bearings", false], ["Check rollers spin freely", false]], links: [{ t: "Intake side plate (Onshape)", onshape: true }],
    comments: [["Leo Brooks", "Bearings are on order (#4471), should land Thursday.", "Mon"]] });
  a.hist.push([ME_STUDENT, "moved it to In progress", "Nov 5", { st: "doing", due: "2026-11-14" }], ["Ms. Rivera", "changed the due date to Thu Nov 12", "Nov 7", { st: "doing", due: "2026-11-12" }]);
  var s1 = t("Cut polycarb side plates", "intake", "Fabrication", "m4", [ME_STUDENT, "Ava Kim"], "2026-11-14", "todo", { labels: ["build"], est: 2, check: [["CAM file from Onshape", true], ["Cut on the router", false]] });
  t("Deburr and test-fit plates", "intake", "Fabrication", "m4", ["Ava Kim"], "2026-11-14", "todo", { parent: s1.id });
  var shafts = t("Intake roller shafts", "intake", "Mechanical", "m4", ["Leo Brooks"], "2026-11-09", "blocked", { labels: ["build", "urgent"], comments: [["Leo Brooks", "Waiting on MAXSpline shafts (requested in Parts).", "Sat"]] });
  a.by = [shafts.id];
  t("Write the intake command", "intake", "Programming", "m4", ["Priya Shah"], "2026-11-13", "doing", { labels: ["code"], est: 4 });
  t("Intake beam-break sensor", "intake", "Programming", "m5", ["Priya Shah"], "2026-11-24", "todo", { labels: ["code", "wiring"] });
  t("Intake CAD for design review", "intake", "CAD", "m3", ["Jordan Lee"], "2026-11-05", "done", { labels: ["design"] });
  t("Intake v2: wider mouth", "intake", "CAD", "m5", ["Jordan Lee"], "2026-11-28", "todo", { labels: ["design"] });
  t("Tune swerve PID on carpet", "drive", "Programming", "m2", ["Priya Shah"], "2026-11-12", "doing", { labels: ["code", "test"] });
  t("Wire swerve CAN loop", "drive", "Electrical", "m2", ["Ava Kim"], "2026-11-10", "doing", { labels: ["wiring"] });
  t("Build 4 swerve modules", "drive", "Mechanical", "m1", ["Leo Brooks", "Omar Haddad"], "2026-10-30", "done", { labels: ["build"] });
  t("Belly pan", "drive", "Mechanical", "m2", ["Omar Haddad"], "2026-11-11", "todo", { labels: ["build"] });
  var gb = t("Elevator gearbox CAD", "elev", "CAD", "m6", ["Jordan Lee"], "2026-11-18", "todo", { labels: ["design"] });
  var eb = t("Elevator carriage build", "elev", "Mechanical", "m7", ["Leo Brooks"], "2026-12-08", "todo", { labels: ["build"] }); eb.by = [gb.id];
  t("Crimp CAN harness for the elevator", "elev", "Electrical", "m7", [ME_STUDENT], "2026-11-17", "todo", { labels: ["wiring"], est: 2 });
  t("Elevator PID and soft limits", "elev", "Programming", "m7", ["Priya Shah"], "2026-12-09", "todo", { labels: ["code"] });
  t("Flywheel prototype", "shoot", "Mechanical", "m8", ["Maya Gold"], "2026-11-21", "todo", { labels: ["build", "test"] });
  t("Shooter CAD", "shoot", "CAD", "m8", ["Jordan Lee"], "2026-11-15", "doing", { labels: ["design"] });
  t("Shooter auto path", "shoot", "Programming", null, ["Priya Shah"], "2026-12-01", "todo", { labels: ["code"] });
  t("Bumper frames", "bump", "Fabrication", null, [], "2027-02-10", "todo");
  t("Driver tryouts", "drivers", "Drive team", null, ["Ms. Rivera"], "2027-01-20", "todo");
  t("Pit cart checklist", "pitprep", "Pit crew", null, ["Omar Haddad"], "2027-02-20", "todo");
  t("Robot demo script", "library", "Outreach", "m9", ["Nina Park"], "2026-11-17", "todo");
  t("Bring the 2026 robot and batteries", "library", "Outreach", "m9", ["Mr. Chen"], "2026-11-19", "todo");
  t("Sponsor thank-you letters", "sponsors", "Business", null, ["Omar Haddad"], "2026-11-30", "todo");
  t("Restock bolt bins", "shop", "Ops", null, [], "", "todo");
  t("Write the season plan", "plan", "Captains", null, ["Priya Shah", "Leo Brooks"], "2026-12-15", "doing");
  return { divs: divs, list: list, nextId: id + 1 };
}
D.inits.push(function (S) {
  var d = seed();
  S.tasks = { divs: d.divs, list: d.list, nextId: d.nextId, at: { v: "my" }, mode: "list", group: "milestone", q: "", who: "all", label: "", expanded: { intake: true }, lead: false, simple: null, side: true, mopen: false, cal: "project",
    cols: ["todo", "doing", "blocked", "done"], openSubs: {},
    saves: [ { name: "Before Saturday's re-plan", when: "Nov 7, 9:02 pm", by: "Ms. Rivera" }, { name: "Daily", when: "Nov 10, 2:00 am", by: "automatic" }, { name: "Daily", when: "Nov 9, 2:00 am", by: "automatic" } ],
    chat: [] };
  S.notices.push({ to: "student", app: "tasks", text: "Leo mentioned you on “Cut polycarb side plates”.", when: "2 h ago", read: false });
  S.activity.push({ who: "Priya Shah", what: "moved “Tune swerve PID on carpet” to In progress", app: "tasks", when: "2:10 pm" });
});
function T() { return D.S.tasks; }
(D.onRole = D.onRole || []).push(function (role) { var tt = T(); tt.at = { v: role === "parent" ? "week" : role === "student" ? "my" : "dash" }; tt.mopen = false; if (role !== "student") tt.lead = false; });
function task(id) { return T().list.filter(function (x) { return x.id === +id; })[0]; }
function proj(id) { var out = null; T().divs.forEach(function (d) { d.projects.forEach(function (p) { if (p.id === id) out = p; }); }); return out; }
function divOf(pid) { return T().divs.filter(function (d) { return d.projects.some(function (p) { return p.id === pid; }); })[0]; }
function msName(p, id) { var m = proj(p).ms.filter(function (x) { return x[0] === id; })[0]; return m ? m[1] : ""; }
function me() { return D.S.role === "student" ? ME_STUDENT : D.me().name; }
function lead() { return D.isStaff() || (D.S.role === "student" && T().lead); }
function simple() { var s = T().simple; return s == null ? D.S.role === "student" && !T().lead : s; }
function initials(n) { return n.replace(/^(Ms|Mr|Dr)\. /, "").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2); }
function avs(who) { return '<span class="avatars">' + who.slice(0, 3).map(function (w) { return '<span class="av" title="' + esc(w) + '">' + esc(initials(w)) + "</span>"; }).join("") + "</span>"; }
function stPill(s) { return '<span class="pill ' + ST[s][1] + '">' + ST[s][0] + "</span>"; }
function labs(x) { return simple() ? "" : x.labels.map(function (l) { return '<span class="lab"><i class="dotc" style="background:' + LABELS[l][1] + '"></i>' + LABELS[l][0] + "</span>"; }).join(" "); }
// What a row shows as its status: a task that waits on something unfinished reads as Waiting, otherwise its own state.
function stOf(x) { return x.st !== "done" && x.st !== "blocked" && !simple() && blockedBy(x).length ? '<span class="pill bad" title="Waiting on ' + esc(blockedBy(x).map(function (b) { return b.title; }).join(", ")) + '">Waiting</span>' : stPill(x.st); }
function names(who) { return who.length ? who.map(esc).join(", ") : "Nobody yet"; }
function check(x) { return '<button class="tcheck" data-act="tdone" data-v="' + x.id + '" aria-pressed="' + (x.st === "done") + '" aria-label="Done: ' + esc(x.title) + '">' + D.ic("check", 14) + "</button>"; }
function dueTxt(x) { if (!x.due) return '<span class="who due">No date</span>'; var n = days(x.due); return '<span class="who num due' + (n < 0 && x.st !== "done" ? " late" : "") + '">' + (n === 0 ? "Today" : n === 1 ? "Tomorrow" : n < 0 && x.st !== "done" ? Math.abs(n) + "d late" : fmt(x.due, { month: "short", day: "numeric" })) + "</span>"; }
function blockedBy(x) { return x.by.map(task).filter(function (b) { return b && b.st !== "done"; }); }
function subsOf(x) { return T().list.filter(function (y) { return y.parent === x.id; }); }

/* ---------- Sidebar ---------- */
function sidebar() {
  var tt = T(), at = tt.at, staff = lead(), mine = tt.list.filter(function (x) { return x.who.indexOf(me()) >= 0 && x.st !== "done"; }).length;
  function nav(v, label, icon, n) { var cur = at.v === v; return '<button class="tnav" data-act="tgo" data-v="' + v + '"' + (cur ? ' aria-current="page"' : "") + ">" + D.ic(icon, 17) + '<span class="lbl">' + label + "</span>" + (n != null ? '<span class="n">' + n + "</span>" : "") + "</button>"; }
  var tree = tt.divs.map(function (d) {
    var open = d.open;
    return '<div class="trow"><button class="tnav tdivb" data-act="tdiv" data-v="' + d.id + '" aria-expanded="' + open + '"><span class="car">' + (open ? "▾" : "▸") + '</span><span class="lbl">' + esc(d.name) + "</span></button>" + (staff ? '<button class="more" data-act="tmenu" data-k="div" data-v="' + d.id + '" aria-label="Division actions">⋯</button>' : "") + "</div>" +
      (open ? d.projects.map(function (p) {
        var pe = !!tt.expanded[p.id], n = tt.list.filter(function (x) { return x.p === p.id && x.st !== "done" && !x.parent; }).length;
        return '<div class="trow l1"><button class="tnav" data-act="tproj" data-v="' + p.id + '"' + (at.v === "project" && at.p === p.id ? ' aria-current="page"' : "") + '><span class="car" data-act="texp" data-v="' + p.id + '">' + (pe ? "▾" : "▸") + '</span><span class="sw2" style="background:' + p.color + '"></span><span class="lbl">' + esc(p.name) + '</span><span class="n">' + n + "</span></button>" + (staff ? '<button class="more" data-act="tmenu" data-k="proj" data-v="' + p.id + '" aria-label="Project actions">⋯</button>' : "") + "</div>" +
          (pe ? p.subs.map(function (s) { var c = tt.list.filter(function (x) { return x.p === p.id && x.sub === s && x.st !== "done" && !x.parent; }).length; return '<div class="trow l2"><button class="tnav" data-act="tlist" data-p="' + p.id + '" data-v="' + esc(s) + '"' + (at.v === "list" && at.p === p.id && at.l === s ? ' aria-current="page"' : "") + '><span class="lbl">' + esc(s) + '</span><span class="n">' + c + "</span></button></div>"; }).join("") : "");
      }).join("") + (staff ? '<button class="tnav tadd l1" data-act="tnewproj" data-v="' + d.id + '">+ New project</button>' : "") : "");
  }).join("");
  var close = '<button class="xbtn tclose" data-act="tside" aria-label="Close menu">×</button>';
  if (D.S.role === "parent") return "";
  return '<nav class="tside" aria-label="Tasks">' + close + '<button class="btn tnew" data-act="tnew">' + D.ic("plus", 16) + " New task</button>" +
    nav("my", "My tasks", "user", mine) + nav("week", "This week", "calendar") + (staff ? nav("dash", "Dashboard", "home") : "") + nav("calendar", "Calendar", "calendar") + (staff ? nav("timeline", "Timeline", "schedule") : "") +
    (staff ? '<button class="tnav" data-act="go" data-v="projector">' + D.ic("projector", 17) + '<span class="lbl">Projector</span></button>' : "") +
    '<div class="sect"><span>Divisions</span>' + (D.S.role === "admin" ? '<button class="btn ghost sm" data-act="tnewdiv">+ New</button>' : "") + "</div>" + tree +
    '<div class="sect"><span>Options</span></div>' +
    (D.S.role === "student" ? '<div class="tnav tsw"><span class="lbl">Lead mode' + (tt.lead ? " · until 6 pm" : "") + '</span><button class="toggle" data-act="tlead" aria-pressed="' + tt.lead + '" aria-label="Lead mode"></button></div>' : "") +
    '<div class="tnav tsw"><span class="lbl">Simple mode</span><button class="toggle" data-act="tsimple" aria-pressed="' + simple() + '" aria-label="Simple mode"></button></div>' +
    '<button class="tnav" data-act="tchat">' + D.ic("more", 17) + '<span class="lbl">Ask the assistant</span></button>' +
    '<button class="tnav" data-act="thelp">' + D.ic("more", 17) + '<span class="lbl">Help</span></button></nav>';
}
// The page frame: left menu, then a bar with the menu button, the page title and its tools. Parents have no menu, just two tabs.
function frame(title, crumbs, tools, body) {
  var tt = T(), parent = D.S.role === "parent";
  var head = parent ?
    '<header class="topbar"><div class="tabs" role="group"><button class="tab" data-act="tgo" data-v="week" aria-pressed="' + (tt.at.v === "week") + '">This week</button><button class="tab" data-act="tgo" data-v="calendar" aria-pressed="' + (tt.at.v === "calendar") + '">Calendar</button></div><div class="right">' + (tt.at.v === "calendar" ? tools : "") + "</div></header>" :
    '<header class="topbar"><button class="btn sm tmenu" data-act="tside" aria-label="Show or hide the task menu">' + D.ic("menu", 18) + '</button><div class="ttl">' + (crumbs ? '<p class="who">' + crumbs + "</p>" : "") + "<h1>" + esc(title) + '</h1></div><div class="right">' + (tools || "") + (tt.lead ? '<span class="leadchip">Lead mode</span>' : "") + "</div></header>";
  return '<div class="tsk' + (parent || !tt.side ? " collapsed" : "") + (tt.mopen ? " mopen" : "") + '">' + sidebar() + (tt.mopen && !parent ? '<button class="drawer-scrim tscrim" data-act="tside" aria-label="Close menu"></button>' : "") +
    '<div class="tmain">' + head + '<div class="content">' + body + "</div></div></div>";
}

/* ---------- Views ---------- */
D.views.tasks = function () {
  var at = T().at;
  if (D.S.role === "parent" && ["week", "calendar"].indexOf(at.v) < 0) T().at = at = { v: "week" };
  if (!lead() && (at.v === "dash" || at.v === "timeline")) T().at = at = { v: "my" };
  if (at.v === "week") return frame("This week", "", "", week());
  if (at.v === "dash") return frame("Dashboard", "Team", "", dashboard());
  if (at.v === "calendar") return frame("Calendar", "", "", calendar());
  if (at.v === "timeline") return frame("Timeline", "All divisions", "", timeline());
  if (at.v === "project") return projectPage(at.p);
  if (at.v === "list") return listPage(at.p, at.l);
  return frame("My tasks", "", "", my());
};
// One task row: check, title with one muted line, status, date. Used in My tasks and the Dashboard.
function compactRow(x) {
  return '<div class="trowx">' + check(x) + '<div class="tt"><button class="ttitle" data-act="topen" data-v="' + x.id + '">' + esc(x.title) + '</button><div class="tsub">' + esc(proj(x.p).name) + " › " + esc(x.sub) + (x.ms ? " · ◆ " + esc(msName(x.p, x.ms)) : "") + "</div></div>" +
    '<span class="tst">' + stOf(x) + "</span>" + dueTxt(x) + "</div>";
}
// The Next up card: shared by My tasks and the portal home.
function nextUp() {
  var mine = T().list.filter(function (x) { return x.who.indexOf(me()) >= 0 && x.st !== "done"; }).sort(function (a, b) { return (a.due || "9") < (b.due || "9") ? -1 : 1; });
  // Next up is the first task you can actually work on: not blocked and not waiting on anything.
  var next = mine.filter(function (x) { return x.st !== "blocked" && !blockedBy(x).length; })[0] || mine.filter(function (x) { return x.st !== "blocked"; })[0] || mine[0];
  var skipped = next ? mine.filter(function (x) { return x !== next && (x.due || "9") < (next.due || "9"); })[0] : null;
  if (!next) return '<div class="card hero nextup"><h2>Nothing assigned to you</h2><p class="mute">Take something nobody has yet.</p></div>';
  var bn = blockedBy(next), steps = next.check.filter(function (c) { return c[1]; }).length;
  return '<div class="card hero nextup"><p class="eyebrow">Your next task</p><h2>' + esc(next.title) + '</h2><p class="mute">' + esc(proj(next.p).name) + " › " + esc(next.sub) + (next.ms ? " · for “" + esc(msName(next.p, next.ms)) + "”" : "") + " · due " + fmt(next.due) + "</p>" +
    (skipped && !bn.length ? '<p class="small mute">“' + esc(skipped.title) + "” is on hold" + (blockedBy(skipped).length ? " until “" + esc(blockedBy(skipped)[0].title) + "” is done." : ".") + "</p>" : "") +
    (next.check.length ? '<div class="row"><div class="bar" style="width:160px"><i class="ok" style="width:' + D.pct(steps, next.check.length) + '%"></i></div><span class="small mute">' + steps + " of " + next.check.length + " steps</span></div>" : "") +
    (bn.length ? '<p class="small"><span class="pill bad">Waiting on</span> <button class="linkbtn" data-act="topen" data-v="' + bn[0].id + '">' + esc(bn[0].title) + "</button> (" + esc(bn[0].who.join(", ") || "nobody yet") + ").</p>" : "") +
    '<div class="row heroacts"><button class="btn' + (bn.length ? "" : " primary") + '" data-act="tdone" data-v="' + next.id + '">' + D.ic("check", 16) + ' Done</button><button class="btn" data-act="tstuck" data-v="' + next.id + '">I\'m stuck</button><button class="btn" data-act="tpart" data-v="' + next.id + '">' + D.ic("parts", 16) + ' Request a part</button><button class="btn ghost" data-act="topen" data-v="' + next.id + '">Open</button></div></div>';
}
D.nextUpCard = nextUp;
function my() {
  var mine = T().list.filter(function (x) { return x.who.indexOf(me()) >= 0 && x.st !== "done"; }).sort(function (a, b) { return (a.due || "9") < (b.due || "9") ? -1 : 1; });
  var buckets = [["Overdue", function (x) { return x.due && days(x.due) < 0; }], ["Today", function (x) { return x.due && days(x.due) === 0; }], ["This week", function (x) { return x.due && days(x.due) > 0 && days(x.due) <= 6; }], ["Later", function (x) { return x.due && days(x.due) > 6; }], ["No date", function (x) { return !x.due; }]];
  var open = T().list.filter(function (x) { return !x.who.length && x.st !== "done"; });
  var groups = buckets.map(function (b) { var xs = mine.filter(b[1]); return xs.length ? '<h3 class="tgrp">' + b[0] + ' <span class="who">' + xs.length + "</span></h3><div>" + xs.map(compactRow).join("") + "</div>" : ""; }).join("");
  return nextUp() + '<div class="card"><h2>Assigned to me</h2>' + (groups || '<p class="mute">Nothing assigned to you.</p>') + "</div>" +
    (open.length ? '<div class="card"><h2>Nobody has these yet</h2><div class="list">' + open.map(function (x) { return '<div class="li tkr"><span class="grow"><b>' + esc(x.title) + '</b><br><span class="who">' + esc(proj(x.p).name) + " › " + esc(x.sub) + "</span></span>" + dueTxt(x) + '<button class="btn sm" data-act="ttake" data-v="' + x.id + '">I\'ll take it</button></div>'; }).join("") + "</div></div>" : "");
}
function week() {
  var evs = D.calApi ? D.calApi.upcoming(10) : [], parent = D.S.role === "parent", out = "";
  for (var i = 0; i < 7; i++) {
    var d = add(TODAYS, i), e = evs.filter(function (x) { return x.date === d; }), due = T().list.filter(function (x) { return x.due === d; }), ms = [];
    T().divs.forEach(function (dv) { dv.projects.forEach(function (p) { p.ms.forEach(function (m) { if (m[2] === d) ms.push(p.name + ": " + m[1]); }); }); });
    if (!e.length && !due.length && !ms.length) continue;
    out += '<div class="li wk"><b class="num wkd">' + fmt(d) + '</b><span class="grow">' + e.map(function (x) { return '<span class="wkl"><span class="pill gold">' + esc(x.name) + '</span> <span class="who">' + D.calApi.span(x) + "</span></span>"; }).join("") + ms.map(function (m) { return '<span class="wkl"><span class="pill info">◆ ' + esc(m) + "</span></span>"; }).join("") +
      (parent ? (due.length ? '<span class="wkl who">' + due.length + " robot task" + (due.length > 1 ? "s" : "") + " due</span>" : "") : due.map(function (x) { return '<span class="wkl"><button class="linkbtn tlink" data-act="topen" data-v="' + x.id + '">' + esc(x.title) + "</button></span>"; }).join("")) + "</span></div>";
  }
  return '<div class="card">' + (out ? '<div class="list">' + out + "</div>" : '<p class="mute">Nothing is due in the next 7 days.</p>') + "</div>";
}
function dashboard() {
  var L = T().list, blocked = L.filter(function (x) { return x.st === "blocked"; }), late = L.filter(function (x) { return x.due && days(x.due) < 0 && x.st !== "done"; });
  var evs = D.calApi ? D.calApi.upcoming(5, ["build", "comp", "meeting", "outreach"]) : [];
  var attn = blocked.concat(late.filter(function (x) { return blocked.indexOf(x) < 0; }));
  return '<div class="grid4"><div class="card tight kpi"><b>60</b><span>days to kickoff (Sat Jan 9)</span></div><div class="card tight kpi"><b>' + L.filter(function (x) { return x.st === "done"; }).length + " / " + L.length + '</b><span>tasks done</span></div><div class="card tight kpi"><b class="bad">' + blocked.length + '</b><span>blocked</span></div><div class="card tight kpi"><b>' + late.length + "</b><span>late</span></div></div>" +
    '<div class="grid2"><div class="card"><h2>Needs attention</h2><div>' + (attn.length ? attn.map(compactRow).join("") : '<p class="mute">Nothing is blocked or late.</p>') + '</div></div><div class="card"><h2>Coming up</h2><div class="list">' + evs.map(function (e) { return '<div class="li"><b class="num wkd">' + fmt(e.date) + '</b><span class="grow">' + esc(e.name) + "</span></div>"; }).join("") + "</div></div></div>" +
    '<div class="grid3">' + T().divs.map(function (d) { return '<div class="card tight"><h3>' + esc(d.name) + '</h3><div class="list">' + d.projects.map(function (p) { var xs = L.filter(function (x) { return x.p === p.id; }), dn = xs.filter(function (x) { return x.st === "done"; }).length; return '<button class="li click dprj" data-act="tproj" data-v="' + p.id + '"><span class="sw2" style="background:' + p.color + '"></span><span class="grow">' + esc(p.name) + '</span><span class="bar"><i class="ok" style="width:' + D.pct(dn, xs.length) + '%"></i></span><span class="small num mute">' + dn + "/" + xs.length + "</span></button>"; }).join("") + "</div></div>"; }).join("") + "</div>";
}
function calendar() {
  var first = new Date(2026, 10, 1), cells = "", subColors = {}, palette = ["#2e9e6a", "#e8b931", "#4f7fd9", "#d9774f", "#9b6ad6", "#2a9d8f", "#c0632b"], k = 0;
  for (var i = 0; i < 35; i++) {
    var d = iso(new Date(2026, 10, 1 - first.getDay() + i)), other = parse(d).getMonth() !== 10;
    var due = T().list.filter(function (x) { return x.due === d && !x.parent; }), ms = [];
    T().divs.forEach(function (dv) { dv.projects.forEach(function (p) { p.ms.forEach(function (m) { if (m[2] === d) ms.push([p, m]); }); }); });
    cells += '<div class="day' + (other ? " other" : "") + (d === TODAYS ? " today" : "") + '"><span class="d">' + parse(d).getDate() + "</span>" +
      ms.map(function (x) { return '<span class="tev"><i class="dotc" style="background:' + x[0].color + '"></i>◆ ' + esc(x[1][1]) + "</span>"; }).join("") +
      due.slice(0, 3).map(function (x) { var c = T().cal === "project" ? proj(x.p).color : (subColors[x.sub] = subColors[x.sub] || palette[k++ % palette.length]); return '<button class="tev' + (x.st === "done" ? " done" : "") + '" data-act="topen" data-v="' + x.id + '"><i class="dotc" style="background:' + c + '"></i>' + esc(x.title) + "</button>"; }).join("") + (due.length > 3 ? '<span class="who">+' + (due.length - 3) + "</span>" : "") + "</div>";
  }
  var seg = '<span class="seg" role="group" aria-label="Color by"><button data-act="tcal" data-v="project" aria-pressed="' + (T().cal === "project") + '">By project</button><button data-act="tcal" data-v="sub" aria-pressed="' + (T().cal === "sub") + '">By subteam</button></span>';
  return '<div class="card"><div class="row between"><h2>November 2026</h2>' + seg + '</div><div class="tablewrap"><div class="month tmonth">' + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(function (x) { return '<div class="dh">' + x + "</div>"; }).join("") + cells + '</div></div><p class="who">◆ is a milestone. Practices and events are in the Calendar app.</p></div>';
}
function timeline() {
  var start = "2026-10-26", span = 70;
  function pos(s) { return Math.max(0, Math.min(100, (days(s) - days(start)) / span * 100)); }
  var axis = '<span></span><div class="tlaxis">' + ["2026-11-01", "2026-11-15", "2026-12-01", "2026-12-15", "2027-01-01"].map(function (t) { return '<span style="left:' + pos(t) + '%">' + fmt(t, { month: "short", day: "numeric" }) + "</span>"; }).join("") + '<b style="left:' + pos(TODAYS) + '%">Today</b></div>';
  var html = axis + T().divs.filter(function (d) { return d.id === "eng" || d.id === "out"; }).map(function (d) {
    return '<h3 class="tlgrp">' + esc(d.name) + "</h3>" + d.projects.map(function (p) {
      var xs = T().list.filter(function (x) { return x.p === p.id && x.due && !x.parent; }); if (!xs.length) return "";
      var lo = xs.reduce(function (a, x) { return x.due < a ? x.due : a; }, xs[0].due), hi = xs.reduce(function (a, x) { return x.due > a ? x.due : a; }, xs[0].due); lo = add(lo, -7);
      var row = '<button class="ttitle tlp" data-act="tproj" data-v="' + p.id + '"><span class="sw2" style="background:' + p.color + '"></span> ' + esc(p.name) + '</button><div class="tltrack"><i style="left:' + pos(lo) + "%;width:" + Math.max(1, pos(hi) - pos(lo)) + "%;background:" + p.color + '"></i>' + p.ms.map(function (m) { return '<i class="ms" style="left:calc(' + pos(m[2]) + '% - 5px)" title="' + esc(m[1]) + '"></i>'; }).join("") + '<span class="today" style="left:' + pos(TODAYS) + '%"></span></div>';
      row += xs.map(function (x) { var bb = x.by.map(task).filter(function (b) { return b && b.due > x.due; }); var s0 = add(x.due, -(x.est ? Math.ceil(x.est) + 2 : 4)); return '<button class="ttitle tlt" data-act="topen" data-v="' + x.id + '">' + esc(x.title) + (bb.length ? ' <span class="pill bad" title="Due before something it waits on">Out of order</span>' : "") + '</button><div class="tltrack tltask"><i class="task' + (x.st === "done" ? " done" : "") + '" style="left:' + pos(s0) + "%;width:" + Math.max(1, pos(x.due) - pos(s0)) + '%"></i><span class="today" style="left:' + pos(TODAYS) + '%"></span></div>'; }).join("");
      return row;
    }).join("");
  }).join("");
  return '<div class="card"><p class="who">Oct 26 – Jan 4. Bars run to each due date, ◆ is a milestone, the red line is today.</p><div class="tablewrap"><div class="tl">' + html + "</div></div></div>";
}
function filtersBar() {
  var tt = T();
  return '<div class="tbar"><input id="t-q" class="inp tq" data-input="tq" placeholder="Filter tasks" value="' + esc(tt.q) + '" aria-label="Filter tasks"><span class="seg" role="group" aria-label="Whose tasks"><button data-act="twho" data-v="all" aria-pressed="' + (tt.who === "all") + '">Everyone</button><button data-act="twho" data-v="me" aria-pressed="' + (tt.who === "me") + '">Mine</button></span>' +
    (simple() ? "" : '<select class="chipsel" data-change="tlabel" aria-label="Label"><option value="">All labels</option>' + Object.keys(LABELS).map(function (l) { return '<option value="' + l + '"' + (tt.label === l ? " selected" : "") + ">" + LABELS[l][0] + "</option>"; }).join("") + "</select>") + "</div>";
}
function pass(x) { var tt = T(); return (!tt.q || x.title.toLowerCase().indexOf(tt.q.toLowerCase()) >= 0) && (tt.who === "all" || x.who.indexOf(me()) >= 0) && (!tt.label || x.labels.indexOf(tt.label) >= 0); }
// A task card in the milestone grid: title, who and date, and a status when it is not just waiting its turn.
function gcard(x) {
  var bb = blockedBy(x), st = x.st === "todo" && !(bb.length && !simple()) ? "" : '<div>' + stOf(x) + "</div>";
  return '<button class="gcard ' + x.st + '" data-act="topen" data-v="' + x.id + '"><b>' + esc(x.title) + '</b><span class="gmeta">' + avs(x.who) + dueTxt(x) + "</span>" + st + "</button>";
}
function projectPage(pid) {
  var p = proj(pid), d = divOf(pid), tt = T(), xs = tt.list.filter(function (x) { return x.p === pid && !x.parent && pass(x); });
  var rows = p.ms.concat([[null, "No milestone", "", false]]);
  function msHead(m) { return "<b>◆ " + esc(m[1]) + "</b>" + (m[2] ? '<span class="who">' + fmt(m[2]) + (m[3] ? " · done" : "") + "</span>" : ""); }
  function add1(m, s) { return '<button class="btn ghost sm" data-act="tnewin" data-p="' + p.id + '" data-s="' + esc(s) + '" data-m="' + (m[0] || "") + '">+ Add</button>'; }
  var cols = "minmax(130px,170px) repeat(" + p.subs.length + ", minmax(170px,1fr))";
  var grid = '<div class="tablewrap"><div class="pgrid" style="grid-template-columns:' + cols + ';min-width:' + (170 + p.subs.length * 180) + 'px"><div class="gh">Milestone</div>' + p.subs.map(function (s) { return '<div class="gh"><button class="linkbtn" data-act="tlist" data-p="' + p.id + '" data-v="' + esc(s) + '">' + esc(s) + " →</button></div>"; }).join("") +
    rows.map(function (m) {
      return '<div class="gh gm">' + msHead(m) + "</div>" + p.subs.map(function (s) {
        var cs = xs.filter(function (x) { return x.sub === s && (x.ms || null) === m[0]; });
        return "<div>" + cs.map(gcard).join("") + add1(m, s) + "</div>";
      }).join("");
    }).join("") + "</div></div>";
  // Phones get one milestone at a time, subteams stacked inside it, instead of the wide grid.
  var stack = '<div class="pstack">' + rows.map(function (m) {
    var groups = p.subs.map(function (s) {
      var cs = xs.filter(function (x) { return x.sub === s && (x.ms || null) === m[0]; });
      return cs.length ? '<div class="pstack-sub"><button class="linkbtn" data-act="tlist" data-p="' + p.id + '" data-v="' + esc(s) + '">' + esc(s) + " →</button>" + cs.map(gcard).join("") + "</div>" : "";
    }).join("");
    return '<section class="pstack-ms"><div class="row between">' + msHead(m) + "</div>" + (groups || '<p class="small mute">No tasks yet.</p>') + add1(m, p.subs[0]) + "</section>";
  }).join("") + "</div>";
  grid = '<div class="hide-sm">' + grid + "</div>" + stack;
  var cross = xs.filter(function (x) { return x.by.some(function (b) { var bt = task(b); return bt && bt.sub !== x.sub; }); });
  var tools = (lead() ? '<button class="btn sm" data-act="tmsadd" data-v="' + p.id + '">+ Milestone</button><button class="btn ghost sm" data-act="tsaves">' + D.ic("history", 16) + " Save points</button>" : "");
  return frame(p.name, esc(d.name), tools, filtersBar() + '<div class="card pgcard">' + grid + "</div>" +
    (cross.length && !simple() ? '<div class="card"><h2>Waiting on other subteams</h2><div class="list">' + cross.map(function (x) { return '<div class="li"><span class="grow"><b>' + esc(x.title) + '</b> <span class="who">(' + esc(x.sub) + ") waits on</span> " + x.by.map(function (b) { var bt = task(b); return "<b>" + esc(bt.title) + '</b> <span class="who">(' + esc(bt.sub) + ", " + ST[bt.st][0] + ")</span>"; }).join(", ") + "</span></div>"; }).join("") + "</div></div>" : ""));
}
function listPage(pid, sub) {
  var p = proj(pid), tt = T(), xs = tt.list.filter(function (x) { return x.p === pid && x.sub === sub && !x.parent && pass(x); });
  var tools = '<span class="seg" role="group" aria-label="View"><button data-act="tmode" data-v="list" aria-pressed="' + (tt.mode === "list") + '">List</button><button data-act="tmode" data-v="board" aria-pressed="' + (tt.mode === "board") + '">Board</button></span>';
  var body = filtersBar();
  if (tt.mode === "board") {
    body += '<div class="board">' + tt.cols.map(function (c) { var cs = xs.filter(function (x) { return x.st === c; }); return '<div class="bcol" data-col="' + c + '"><div class="row between"><span class="pill ' + ST[c][1] + '"><b>' + ST[c][0] + '</b></span><span class="who">' + cs.length + "</span></div>" + cs.map(function (x) { var sc = subsOf(x); return '<div class="bcard" draggable="true" data-task="' + x.id + '"><button class="ttitle" data-act="topen" data-v="' + x.id + '">' + esc(x.title) + "</button>" + (labs(x) ? '<div class="who">' + labs(x) + "</div>" : "") + '<div class="row between">' + avs(x.who) + dueTxt(x) + "</div>" + (sc.length ? '<span class="who">' + sc.filter(function (s) { return s.st === "done"; }).length + " of " + sc.length + " subtasks</span>" : "") + (x.ms ? '<span class="who">◆ ' + esc(msName(x.p, x.ms)) + "</span>" : "") + '<select class="chipsel" data-change="tcol" data-v="' + x.id + '" aria-label="Move ' + esc(x.title) + '"><option value="">Move to…</option>' + tt.cols.map(function (k) { return '<option value="' + k + '">' + ST[k][0] + "</option>"; }).join("") + "</select></div>"; }).join("") + '<button class="btn ghost sm" data-act="tnewin" data-p="' + pid + '" data-s="' + esc(sub) + '" data-st="' + c + '">+ Add a task</button></div>'; }).join("") + "</div>";
  } else {
    var groups;
    if (tt.group === "milestone") groups = p.ms.map(function (m) { return [m[1] + " · " + fmt(m[2]), function (x) { return x.ms === m[0]; }]; }).concat([["No milestone", function (x) { return !x.ms; }]]);
    else if (tt.group === "due") groups = [["Late", function (x) { return x.due && days(x.due) < 0 && x.st !== "done"; }], ["This week", function (x) { return x.due && days(x.due) >= 0 && days(x.due) <= 6; }], ["Later", function (x) { return x.due && days(x.due) > 6; }], ["No date", function (x) { return !x.due; }], ["Done", function (x) { return x.st === "done" && x.due && days(x.due) < 0; }]];
    else groups = [["All tasks", function () { return true; }]];
    body += '<div class="card"><div class="row between taddrow"><div class="row nowrap taddin"><input id="t-add" class="inp" placeholder="Add a task to ' + esc(sub) + '" data-input="taddtxt" aria-label="New task title"><button class="btn" data-act="tquick" data-p="' + pid + '" data-s="' + esc(sub) + '">Add</button></div><label class="row small mute">Group by <select class="chipsel" data-change="tgroup" aria-label="Group by"><option value="milestone"' + (tt.group === "milestone" ? " selected" : "") + '>Milestone</option><option value="due"' + (tt.group === "due" ? " selected" : "") + '>Due date</option><option value="none"' + (tt.group === "none" ? " selected" : "") + ">Nothing</option></select></label></div>" +
      (xs.length ? groups.map(function (g) { var gs = xs.filter(g[1]); if (!gs.length) return ""; return '<h3 class="tgrp">' + esc(g[0]) + ' <span class="who">' + gs.length + "</span></h3><div>" + gs.map(function (x) { var sc = subsOf(x), open = tt.openSubs[x.id]; return listRow(x, sc, open) + (open ? sc.map(function (s) { return listRow(s, [], false, true); }).join("") : ""); }).join("") + "</div>"; }).join("") : '<p class="mute">No tasks here yet.</p>') + "</div>";
  }
  return frame(sub, esc(divOf(pid).name) + " › " + esc(p.name), tools, body);
}
function listRow(x, sc, open, isSub) {
  var sub = [names(x.who)];
  if (sc.length) sub.push(sc.filter(function (s) { return s.st === "done"; }).length + " of " + sc.length + " subtasks");
  if (x.est && !simple()) sub.push(x.est + " h");
  var lb = labs(x);
  return '<div class="trowx' + (isSub ? " sub" : "") + '">' + check(x) + '<div class="tt"><div class="tline">' + (sc.length ? '<button class="tex" data-act="tsubs" data-v="' + x.id + '" aria-label="' + (open ? "Hide" : "Show") + ' subtasks" aria-expanded="' + !!open + '">' + (open ? "▾" : "▸") + "</button>" : "") + '<button class="ttitle' + (x.st === "done" ? " isdone" : "") + '" data-act="topen" data-v="' + x.id + '">' + esc(x.title) + '</button></div><div class="tsub">' + sub.join(" · ") + (lb ? " · " + lb : "") + "</div></div>" +
    '<span class="tst">' + stOf(x) + "</span>" + dueTxt(x) + "</div>";
}

/* ---------- Task panel ---------- */
D.drawers.task = function (d) {
  var x = task(d.id), p = proj(x.p), tt = T(), sc = subsOf(x), parent = x.parent ? task(x.parent) : null;
  var allOther = tt.list.filter(function (y) { return y.p === x.p && y.id !== x.id && !y.parent; });
  var parts = D.S.parts ? D.S.parts.requests.filter(function (r) { return r.task === x.title; }) : [];
  return D.drawerHead(p.name + " › " + x.sub + (parent ? " › " + parent.title : ""), x.title) +
    '<div class="seg" role="group" aria-label="Status">' + Object.keys(ST).map(function (k) { return '<button data-act="tset" data-v="' + x.id + '" data-s="' + k + '" aria-pressed="' + (x.st === k) + '">' + ST[k][0] + "</button>"; }).join("") + "</div>" +
    '<div class="row"><button class="btn sm" data-act="tstuck" data-v="' + x.id + '">I\'m stuck</button><button class="btn sm" data-act="tpart" data-v="' + x.id + '">' + D.ic("parts", 16) + ' Request a part</button><button class="btn sm" data-act="tplan" data-v="' + x.id + '">Plan it with me</button>' + (lead() ? '<button class="btn ghost sm danger" data-act="tarchive" data-v="' + x.id + '">Archive</button>' : "") + "</div>" +
    '<div class="field"><label for="td-desc">Notes</label><textarea id="td-desc" class="inp" rows="2" data-input="tdesc" data-v="' + x.id + '" placeholder="What done looks like, links, tips">' + esc(x.desc) + "</textarea></div>" +
    (x.check.length ? '<div class="psec"><p class="flabel">Steps</p>' + x.check.map(function (c, i) { return '<div class="trs"><button class="tcheck" data-act="tcheck" data-v="' + x.id + '" data-i="' + i + '" aria-pressed="' + c[1] + '" aria-label="' + esc(c[0]) + '">' + D.ic("check", 14) + "</button><span>" + esc(c[0]) + "</span></div>"; }).join("") + "</div>" : "") +
    '<div class="formgrid"><div class="field"><label for="td-due">Due</label><input id="td-due" type="date" value="' + esc(x.due) + '" data-change="tdue" data-v="' + x.id + '"></div>' +
    '<div class="field"><label for="td-sub">Subteam</label><select id="td-sub" data-change="tmove" data-v="' + x.id + '">' + p.subs.map(function (s) { return "<option" + (s === x.sub ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("") + "</select></div>" +
    '<div class="field"><label for="td-ms">Milestone</label><select id="td-ms" data-change="tms" data-v="' + x.id + '"><option value="">None</option>' + p.ms.map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === x.ms ? " selected" : "") + ">" + esc(m[1]) + "</option>"; }).join("") + "</select></div>" +
    (simple() ? "" : '<div class="field"><label for="td-est">Estimate (hours)</label><input id="td-est" type="number" min="0" value="' + (x.est || "") + '" data-change="test" data-v="' + x.id + '"></div>') + "</div>" +
    '<div class="psec"><p class="flabel">Who</p><div class="row">' + x.who.map(function (w) { return '<span class="whochip">' + esc(w) + ' <button data-act="tunassign" data-v="' + x.id + '" data-w="' + esc(w) + '" aria-label="Remove ' + esc(w) + '">×</button></span>'; }).join("") + (x.who.indexOf(me()) < 0 ? '<button class="btn sm" data-act="ttake" data-v="' + x.id + '">+ Me</button>' : "") + '<select class="chipsel" data-change="tassign" data-v="' + x.id + '" aria-label="Assign someone"><option value="">+ Someone</option>' + ["Leo Brooks", "Priya Shah", "Ava Kim", "Jordan Lee", "Maya Gold", "Omar Haddad", "Nina Park", "Ms. Rivera", "Mr. Chen"].filter(function (n) { return x.who.indexOf(n) < 0; }).map(function (n) { return "<option>" + esc(n) + "</option>"; }).join("") + "</select></div></div>" +
    (simple() ? "" : '<div class="psec"><p class="flabel">Labels</p><div class="row">' + Object.keys(LABELS).map(function (l) { var on = x.labels.indexOf(l) >= 0; return '<button class="chip" data-act="tlab" data-v="' + x.id + '" data-l="' + l + '" aria-pressed="' + on + '"><i class="dotc" style="background:' + LABELS[l][1] + '"></i>' + LABELS[l][0] + "</button>"; }).join("") + "</div></div>") +
    (!parent ? '<div class="psec"><p class="flabel">Subtasks</p>' + sc.map(function (s) { return '<div class="trs">' + check(s) + '<button class="ttitle" data-act="topen" data-v="' + s.id + '">' + esc(s.title) + "</button>" + avs(s.who) + "</div>"; }).join("") + '<div class="row nowrap"><input id="td-sub-new" class="inp" placeholder="Add a subtask" aria-label="New subtask"><button class="btn sm" data-act="taddsub" data-v="' + x.id + '">Add</button></div></div>' : "") +
    (simple() ? "" : '<div class="psec"><p class="flabel">Waits on</p><div class="list">' + x.by.map(function (b) { var bt = task(b); return '<div class="li"><span class="grow">' + esc(bt.title) + ' <span class="who">' + esc(bt.sub) + "</span></span>" + stPill(bt.st) + '<button class="btn ghost sm" data-act="tundep" data-v="' + x.id + '" data-b="' + b + '">Remove</button></div>'; }).join("") + '</div><select class="chipsel" data-change="tdep" data-v="' + x.id + '" aria-label="Add something this waits on"><option value="">+ Waits on…</option>' + allOther.filter(function (y) { return x.by.indexOf(y.id) < 0; }).map(function (y) { return '<option value="' + y.id + '">' + esc(y.title) + "</option>"; }).join("") + "</select>" +
      (tt.list.filter(function (y) { return y.by.indexOf(x.id) >= 0; }).length ? '<p class="who">Holding up: ' + esc(tt.list.filter(function (y) { return y.by.indexOf(x.id) >= 0; }).map(function (y) { return y.title; }).join(", ")) + "</p>" : "") + "</div>") +
    (x.links.length ? '<div class="psec"><p class="flabel">Links</p>' + x.links.map(function (l) { return '<div class="card flat tight"><div class="row nowrap"><span class="osbadge">OS</span><div><b>' + esc(l.t) + '</b><p class="who">Onshape part studio · v14 · edited by Jordan Lee yesterday</p></div></div></div>'; }).join("") + "</div>" : "") +
    (parts.length ? '<div class="psec"><p class="flabel">Parts for this task</p><div class="list">' + parts.map(function (r) { return '<div class="li"><span class="grow">' + esc(r.name) + '</span><span class="pill">' + esc(r.status) + "</span></div>"; }).join("") + "</div></div>" : "") +
    '<div class="psec"><p class="flabel">Comments</p><div class="list">' + x.comments.map(function (c) { return '<div class="li"><span class="grow"><b>' + esc(c[0]) + "</b> " + esc(c[1]) + '</span><span class="who">' + esc(c[2]) + "</span></div>"; }).join("") + '</div><div class="row nowrap"><input id="td-c" class="inp" placeholder="Write a comment, @ to mention" aria-label="Comment"><button class="btn sm" data-act="tcomment" data-v="' + x.id + '">Send</button></div></div>' +
    '<div class="psec"><p class="flabel">History</p><div class="list">' + x.hist.slice().reverse().map(function (h, i) { var idx = x.hist.length - 1 - i; return '<div class="li"><span class="grow"><b>' + esc(h[0]) + "</b> " + esc(h[1]) + '</span><span class="who">' + esc(h[2]) + "</span>" + (h[3] && idx < x.hist.length - 1 ? '<button class="btn ghost sm" data-act="tback" data-v="' + x.id + '" data-i="' + idx + '">Go back to here</button>' : "") + "</div>"; }).join("") + "</div></div>";
};
D.drawers.tsaves = function () {
  var at = T().at;
  return D.drawerHead("Save points · " + proj(at.p || "intake").name, "Put the project back") + '<p class="small mute">Put the project back to how it was. You see a preview first, and you can undo a restore.</p><div class="row"><button class="btn primary" data-act="tsavenow">Save now</button></div><div class="list">' +
    T().saves.map(function (s, i) { return '<div class="li"><span class="grow"><b>' + esc(s.name) + '</b><br><span class="who">' + esc(s.when) + " · " + esc(s.by) + '</span></span><button class="btn sm" data-act="trestore" data-i="' + i + '">Preview restore</button></div>'; }).join("") + "</div>";
};
D.drawers.tchat = function (d) {
  var c = T().chat;
  if (!c.length) c.push(["ai", "Hi! I can find tasks, add them, or plan a big one with you. What do you need?"]);
  return D.drawerHead("Assistant", d.title || "Ask about the team's work") + '<div class="chat">' + c.map(function (m) { return '<div class="bubble ' + m[0] + '">' + m[1] + "</div>"; }).join("") + "</div>" +
    (T().pending ? '<div class="card hero tight"><b>Add these 4 subtasks to “' + esc(T().pending.title) + '”?</b><div class="list">' + T().pending.items.map(function (s) { return '<div class="li">' + esc(s) + "</div>"; }).join("") + '</div><div class="row"><button class="btn primary sm" data-act="tplanok">Add them</button><button class="btn sm" data-act="tplanno">Not now</button></div></div>' : "") +
    '<div class="row"><button class="chip" data-act="tsay" data-v="What\'s blocking the intake?">What\'s blocking the intake?</button><button class="chip" data-act="tsay" data-v="What should I do next?">What should I do next?</button></div><div class="row nowrap"><input id="tc-in" class="inp" placeholder="Ask anything about tasks" aria-label="Message"><button class="btn sm" data-act="tsend">Send</button></div>';
};
D.drawers.thelp = function () {
  return D.drawerHead("Help", "How this app is organized") + '<div class="list"><div class="li"><b style="min-width:90px">Division</b><span class="grow">A big area of the team: Engineering, Competition, Outreach and Fundraising, Team Operations, Leadership.</span></div><div class="li"><b style="min-width:90px">Project</b><span class="grow">One thing we\'re building or doing: Intake, Library robot demo. It has milestones.</span></div><div class="li"><b style="min-width:90px">Subteam</b><span class="grow">Who does the work inside a project: CAD, Mechanical, Programming. Each has a list and a board.</span></div><div class="li"><b style="min-width:90px">Milestone</b><span class="grow">A checkpoint with a date, like “Prototype intaking”. The project page lines tasks up by milestone.</span></div><div class="li"><b style="min-width:90px">Task</b><span class="grow">One job with a due date. It can have subtasks, steps and things it waits on.</span></div></div><p class="small mute">Simple mode hides labels, estimates and what a task waits on.</p>';
};
D.modals.tnew = function (d) {
  var at = T().at, pid = d.p || at.p || "intake", p = proj(pid);
  return D.modalHead("New task") + '<div class="formgrid"><div class="field" style="grid-column:1/-1"><label for="tn-title">What needs doing</label><input id="tn-title" value="Drill bolt pattern on side plates"></div><div class="field"><label for="tn-p">Project</label><select id="tn-p" data-change="tnewp">' + T().divs.map(function (dv) { return '<optgroup label="' + esc(dv.name) + '">' + dv.projects.map(function (q) { return '<option value="' + q.id + '"' + (q.id === pid ? " selected" : "") + ">" + esc(q.name) + "</option>"; }).join("") + "</optgroup>"; }).join("") + '</select></div><div class="field"><label for="tn-sub">Subteam</label><select id="tn-sub">' + p.subs.map(function (s) { return "<option" + (s === (d.s || at.l) ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("") + '</select></div><div class="field"><label for="tn-ms">Milestone</label><select id="tn-ms"><option value="">None</option>' + p.ms.map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === d.m ? " selected" : "") + ">" + esc(m[1]) + "</option>"; }).join("") + '</select></div><div class="field"><label for="tn-due">Due</label><input id="tn-due" type="date" value="2026-11-14"></div><div class="field"><label for="tn-who">Who</label><select id="tn-who"><option>Me</option><option>Nobody yet</option></select></div></div><div class="row"><button class="btn primary" data-act="tnewgo" data-st="' + (d.st || "todo") + '">Add task</button><button class="btn" data-act="closemodal">Cancel</button></div>';
};
D.modals.trestore = function (d) {
  var s = T().saves[d.i];
  return D.modalHead("Restore “" + s.name + "”?") + "<p>This puts the project back to " + esc(s.when) + '.</p><div class="list"><div class="li"><span class="pill warn">Changes</span><span class="grow">Mount intake roller bearings: due Sat Nov 14 (now Thu Nov 12)</span></div><div class="li"><span class="pill warn">Changes</span><span class="grow">Intake roller shafts: To do (now Blocked)</span></div><div class="li"><span class="pill">Kept</span><span class="grow">Tasks added since stay, marked “added after this save point”.</span></div></div><div class="row"><button class="btn primary" data-act="trestorego">Restore</button><button class="btn" data-act="closemodal">Cancel</button></div>';
};
D.modals.tmenu = function (d) {
  var name = d.k === "div" ? T().divs.filter(function (x) { return x.id === d.v; })[0].name : proj(d.v).name;
  return D.modalHead(name) + '<div class="list">' + (d.k === "proj" ? '<button class="li click" data-act="tmenugo" data-v="sub">+ New subteam</button><button class="li click" data-act="tmenugo" data-v="ms">+ New milestone</button><button class="li click" data-act="tmenugo" data-v="color">Change color</button>' : '<button class="li click" data-act="tmenugo" data-v="proj">+ New project</button>') + '<button class="li click" data-act="tmenugo" data-v="rename">Rename</button><button class="li click" data-act="tmenugo" data-v="archive">Archive</button></div>';
};

/* ---------- Projector ---------- */
D.views.projector = function () {
  if (!(lead() || D.S.role === "display")) return D.denied("Projector");
  var start = "2026-10-26", span = 70; function pos(s) { return Math.max(0, Math.min(100, (days(s) - days(start)) / span * 100)); }
  var ps = ["drive", "intake", "elev", "shoot", "library"].map(proj);
  return '<div class="display"><div class="row between"><div><h1>Build plan · 60 days to kickoff</h1></div><p class="dmute">Updated 3:42 pm</p></div><div class="dcard"><div class="gantt"><span></span><div class="gaxis">' + ["2026-11-01", "2026-12-01", "2027-01-01"].map(function (t) { return '<span style="left:' + pos(t) + '%">' + fmt(t, { month: "short", day: "numeric" }) + "</span>"; }).join("") + '<b style="left:' + pos(TODAYS) + '%">Today</b></div>' + ps.map(function (p) {
    var xs = T().list.filter(function (x) { return x.p === p.id && x.due && !x.parent; }), dn = xs.filter(function (x) { return x.st === "done"; }).length;
    var lo = add(xs.reduce(function (a, x) { return x.due < a ? x.due : a; }, xs[0].due), -7), hi = xs.reduce(function (a, x) { return x.due > a ? x.due : a; }, xs[0].due);
    return "<b>" + esc(p.name) + '</b><div class="gtrack"><i style="left:' + pos(lo) + "%;width:" + (pos(hi) - pos(lo)) + "%;background:" + p.color + ';opacity:.5"></i><i class="done" style="left:' + pos(lo) + "%;width:" + (pos(hi) - pos(lo)) * dn / xs.length + '%"></i>' + p.ms.map(function (m) { return '<i class="ms" style="left:calc(' + pos(m[2]) + '% - 6px)"></i>'; }).join("") + '<span class="todayline" style="left:' + pos(TODAYS) + '%"></span></div>';
  }).join("") + '</div></div><div class="grid3"><div class="dcard"><p class="dmute">Blocked</p><p class="dbig">' + T().list.filter(function (x) { return x.st === "blocked"; }).map(function (x) { return esc(x.title) + " (" + esc(x.who.join(", ")) + ")"; }).join("<br>") + '</p></div><div class="dcard"><p class="dmute">Next milestones</p><p class="dbig">Driving on carpet · Thu Nov 12<br>Prototype intaking · Sat Nov 14</p></div><div class="dcard"><p class="dmute">In the shop now</p><p class="dbig">' + (D.S.cal ? D.S.cal.here.length : 0) + ' people</p></div></div><p class="dmute">Green is done, colored bars are planned, diamonds are milestones, the white line is today.</p>' + (D.S.role !== "display" ? '<div><button class="btn" data-act="go" data-v="tasks">Exit projector</button></div>' : "") + "</div>";
};

/* ---------- Actions ---------- */
var A = D.acts;
function h(x, what, snap) { x.hist.push([D.me().name, what, "Just now", snap || { st: x.st, due: x.due }]); }
function at(v) { T().at = v; T().mopen = false; D.S.drawer = null; D.render(); }
A.tgo = function (b) { at({ v: b.dataset.v }); };
A.tproj = function (b, e) { if (e && e.target.closest("[data-act='texp']")) { A.texp(e.target.closest("[data-act='texp']")); return; } T().expanded[b.dataset.v] = true; at({ v: "project", p: b.dataset.v }); };
A.texp = function (b) { var ex = T().expanded; ex[b.dataset.v] = !ex[b.dataset.v]; D.render(); };
A.tlist = function (b) { at({ v: "list", p: b.dataset.p, l: b.dataset.v }); };
A.tdiv = function (b) { var d = T().divs.filter(function (x) { return x.id === b.dataset.v; })[0]; d.open = !d.open; D.render(); };
A.tside = function () { var tt = T(); if (window.innerWidth <= 860) tt.mopen = !tt.mopen; else tt.side = !tt.side; D.render(); };
A.tmode = function (b) { T().mode = b.dataset.v; D.render(); };
D.changes.tgroup = function (el) { T().group = el.value; D.render(); };
D.inputs.tq = function (el) { T().q = el.value; D.render(); };
A.twho = function (b) { T().who = b.dataset.v; D.render(); };
D.changes.tlabel = function (el) { T().label = el.value; D.render(); };
A.tcal = function (b) { T().cal = b.dataset.v; D.render(); };
A.tsubs = function (b) { var o = T().openSubs; o[b.dataset.v] = !o[b.dataset.v]; D.render(); };
A.topen = function (b) { D.openDrawer("task", { id: b.dataset.v }); };
A.tlead = function () { var tt = T(); tt.lead = !tt.lead; if (tt.lead) { D.log("turned on lead mode", "tasks"); D.toast("Lead mode on until 6 pm. Your changes are marked, and mentors can undo them."); } else D.toast("Lead mode off."); D.render(); };
A.tsimple = function () { T().simple = !simple(); D.render(); };
A.tdone = function (b) { var x = task(b.dataset.v), prev = x.st; if (x.st === "done") { x.st = "todo"; h(x, "reopened it"); D.render(); return; } D.withUndo("Done: " + x.title, function () { x.st = "done"; h(x, "marked it done"); D.log("finished “" + x.title + "”", "tasks"); }, function () { x.st = prev; x.hist.pop(); D.S.activity.shift(); }); };
A.tstuck = function (b) { var x = task(b.dataset.v); x.st = "blocked"; h(x, "said they're stuck"); x.comments.push([D.me().name, "I'm stuck and need a hand.", "Just now"]); D.notify("mentor", "tasks", D.me().name + " is stuck on “" + x.title + "”."); D.toast("Ms. Rivera (" + proj(x.p).name + " mentor) was told. Your note is on the task."); D.render(); };
A.tpart = function (b) { var x = task(b.dataset.v); D.partsApi.startRequest({ task: x.title, sub: proj(x.p).name, need: x.due, catalogName: /bearing/i.test(x.title) ? "Bearing" : /polycarb/i.test(x.title) ? "Polycarbonate" : /CAN|crimp/i.test(x.title) ? "Andersen" : /shaft/i.test(x.title) ? "MAXSpline" : "", from: "Tasks" }); };
A.ttake = function (b) { var x = task(b.dataset.v); x.who.push(me()); h(x, "took it"); D.log("took “" + x.title + "”", "tasks"); D.render(); };
D.changes.tassign = function (el) { if (!el.value) return; var x = task(el.dataset.v); x.who.push(el.value); h(x, "assigned " + el.value); if (el.value === ME_STUDENT) D.notify("student", "tasks", D.me().name + " assigned you “" + x.title + "”."); D.render(); };
A.tunassign = function (b) { var x = task(b.dataset.v); x.who = x.who.filter(function (w) { return w !== b.dataset.w; }); h(x, "removed " + b.dataset.w); D.render(); };
A.tset = function (b) { var x = task(b.dataset.v), s = b.dataset.s; if (x.st === s) return; h(x, "moved it to " + ST[s][0], { st: s, due: x.due }); x.st = s; D.render(); };
D.changes.tdue = function (el) { var x = task(el.dataset.v); x.due = el.value; h(x, "changed the due date to " + fmt(el.value), { st: x.st, due: el.value }); D.render(); };
D.changes.tmove = function (el) { var x = task(el.dataset.v); x.sub = el.value; subsOf(x).forEach(function (s) { s.sub = el.value; }); h(x, "moved it to " + el.value); D.render(); };
D.changes.tms = function (el) { var x = task(el.dataset.v); x.ms = el.value || null; h(x, "set the milestone"); D.render(); };
D.changes.test = function (el) { task(el.dataset.v).est = +el.value || null; };
D.inputs.tdesc = function (el) { task(el.dataset.v).desc = el.value; };
A.tlab = function (b) { var x = task(b.dataset.v), l = b.dataset.l, i = x.labels.indexOf(l); if (i >= 0) x.labels.splice(i, 1); else x.labels.push(l); D.render(); };
A.tcheck = function (b) { var c = task(b.dataset.v).check[+b.dataset.i]; c[1] = !c[1]; D.render(); };
A.taddsub = function (b) { var x = task(b.dataset.v), v = D.val("td-sub-new").trim(); if (!v) return; var tt = T(); tt.list.push({ id: tt.nextId++, title: v, p: x.p, sub: x.sub, ms: x.ms, who: [], due: x.due, st: "todo", parent: x.id, labels: [], est: null, by: [], rel: [], links: [], desc: "", check: [], comments: [], hist: [[D.me().name, "created it", "Just now", { st: "todo", due: x.due }]] }); tt.openSubs[x.id] = true; D.render(); };
D.changes.tdep = function (el) { if (!el.value) return; var x = task(el.dataset.v); x.by.push(+el.value); h(x, "now waits on “" + task(el.value).title + "”"); D.render(); };
A.tundep = function (b) { var x = task(b.dataset.v); x.by = x.by.filter(function (i) { return i !== +b.dataset.b; }); D.render(); };
A.tcomment = function (b) { var x = task(b.dataset.v), v = D.val("td-c").trim(); if (!v) return; x.comments.push([D.me().name, v, "Just now"]); if (/@sam/i.test(v)) D.notify("student", "tasks", D.me().name + " mentioned you on “" + x.title + "”."); D.render(); };
A.tback = function (b) { var x = task(b.dataset.v), snap = x.hist[+b.dataset.i][3], prev = { st: x.st, due: x.due }; x.st = snap.st; x.due = snap.due; x.hist.push([D.me().name, "went back to " + x.hist[+b.dataset.i][2], "Just now", prev]); D.toast("Put back to how it was then. That's in the history too."); D.render(); };
A.tarchive = function (b) { var x = task(b.dataset.v), tt = T(), i = tt.list.indexOf(x); D.S.drawer = null; D.withUndo("Archived “" + x.title + "”", function () { tt.list.splice(i, 1); }, function () { tt.list.splice(i, 0, x); }); };
A.tnew = function () { D.openModal("tnew", {}); };
A.tnewin = function (b) { D.openModal("tnew", { p: b.dataset.p, s: b.dataset.s, m: b.dataset.m || null, st: b.dataset.st }); };
D.changes.tnewp = function (el) { D.S.modal.data.p = el.value; D.S.modal.data.s = null; D.render(); };
A.tnewgo = function (b) { var tt = T(), p = D.val("tn-p"), x = { id: tt.nextId++, title: D.val("tn-title"), p: p, sub: D.val("tn-sub"), ms: D.val("tn-ms") || null, who: D.val("tn-who") === "Me" ? [me()] : [], due: D.val("tn-due"), st: b.dataset.st || "todo", parent: null, labels: [], est: null, by: [], rel: [], links: [], desc: "", check: [], comments: [], hist: [[D.me().name, "created it", "Just now", { st: "todo", due: D.val("tn-due") }]] }; tt.list.push(x); D.S.modal = null; D.log("added “" + x.title + "”", "tasks"); D.toast("Added to " + proj(p).name + " › " + x.sub + "."); D.render(); };
D.inputs.taddtxt = function () {};
A.tquick = function (b) { var v = D.val("t-add").trim(); if (!v) return; var tt = T(); tt.list.push({ id: tt.nextId++, title: v, p: b.dataset.p, sub: b.dataset.s, ms: null, who: [], due: "", st: "todo", parent: null, labels: [], est: null, by: [], rel: [], links: [], desc: "", check: [], comments: [], hist: [[D.me().name, "created it", "Just now", { st: "todo", due: "" }]] }); D.render(); };
document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.id === "t-add") { var b = document.querySelector('[data-act="tquick"]'); if (b) A.tquick(b); } if (e.key === "Enter" && e.target.id === "tc-in") A.tsend(); });
A.tsaves = function () { D.openDrawer("tsaves"); };
A.tsavenow = function () { T().saves.unshift({ name: "Saved by " + D.me().short, when: "Nov 10, 3:50 pm", by: D.me().name }); D.render(); };
A.trestore = function (b) { D.openModal("trestore", { i: +b.dataset.i }); };
A.trestorego = function () { var x = task(1), y = T().list.filter(function (t) { return t.title === "Intake roller shafts"; })[0]; x.due = "2026-11-14"; y.st = "todo"; T().saves.unshift({ name: "Before restoring", when: "Nov 10, 3:51 pm", by: "automatic" }); D.S.modal = null; D.S.drawer = null; D.log("restored Intake to a save point", "tasks"); D.toast("Restored. A save point from just before is there if you change your mind."); D.render(); };
A.tmsadd = function (b) { var p = proj(b.dataset.v); p.ms.push(["m" + Date.now(), "New milestone", "2026-12-19", false]); D.toast("Milestone added. Rename it and set its date from the project menu."); D.render(); };
A.tnewproj = function (b) { var d = T().divs.filter(function (x) { return x.id === b.dataset.v; })[0], id = "p" + Date.now(); d.projects.push({ id: id, name: "New project", color: "#2a9d8f", subs: ["General"], ms: [] }); T().expanded[id] = true; at({ v: "project", p: id }); };
A.tnewdiv = function () { T().divs.push({ id: "d" + Date.now(), name: "New division", open: true, projects: [] }); D.render(); };
A.tmenu = function (b) { D.openModal("tmenu", { k: b.dataset.k, v: b.dataset.v }); };
A.tmenugo = function (b) { var d = D.S.modal.data; if (d.k === "proj" && b.dataset.v === "sub") proj(d.v).subs.push("New subteam"); if (d.k === "proj" && b.dataset.v === "ms") proj(d.v).ms.push(["m" + Date.now(), "New milestone", "2026-12-19", false]); D.S.modal = null; D.toast(b.dataset.v === "archive" ? "Archived. Admins restore it from Settings › Archive." : "Done."); D.render(); };
A.tchat = function () { D.openDrawer("tchat", {}); };
A.thelp = function () { D.openDrawer("thelp", {}); };
function reply(q) {
  var tt = T();
  if (/block/i.test(q)) return "Two things hold up Intake: <b>Intake roller shafts</b> is blocked waiting on MAXSpline shafts (requested in Parts), and <b>Mount intake roller bearings</b> waits on it. The bearings arrive Thursday on order #4471.";
  if (/next/i.test(q)) return "Your next task is <b>Mount intake roller bearings</b> (due Thu). One step is done. It waits on the roller shafts, so in the meantime you could start <b>Crimp CAN harness for the elevator</b> (due Tue Nov 17).";
  return "I found 3 open tasks that match. Want me to add one, or plan a bigger job with you?";
}
A.tsay = function (b) { var tt = T(); tt.chat.push(["me", esc(b.dataset.v)], ["ai", reply(b.dataset.v)]); D.render(); };
A.tsend = function () { var v = D.val("tc-in").trim(); if (!v) return; var tt = T(); tt.chat.push(["me", esc(v)], ["ai", reply(v)]); D.render(); };
A.tplan = function (b) { var x = task(b.dataset.v), tt = T(); tt.chat = [["ai", "Let's plan <b>" + esc(x.title) + "</b>. A few questions first."], ["ai", "1. What does done look like?"], ["me", "Rollers spin freely and the intake grabs a game piece from the floor."], ["ai", "2. What's in the way?"], ["me", "We need the shafts and bearings, and the plates have to be cut first."], ["ai", "Here's a plan with 4 subtasks. I put the cut plates first because the bearings press into them."]]; tt.pending = { id: x.id, title: x.title, items: ["Check the side plates are cut and deburred", "Ream bearing bores to size", "Press in bearings and shafts", "Floor test with a game piece"] }; D.openDrawer("tchat", { title: "Plan it with me" }); };
A.tplanok = function () { var tt = T(), p = tt.pending, x = task(p.id); p.items.forEach(function (s) { tt.list.push({ id: tt.nextId++, title: s, p: x.p, sub: x.sub, ms: x.ms, who: x.who.slice(), due: x.due, st: "todo", parent: x.id, labels: [], est: null, by: [], rel: [], links: [], desc: "", check: [], comments: [], hist: [["Assistant (for " + D.me().name + ")", "created it", "Just now", { st: "todo", due: x.due }]] }); }); tt.openSubs[x.id] = true; tt.pending = null; tt.chat.push(["ai", "Added 4 subtasks. They're marked as made with the assistant, and you can undo them from the task's history."]); D.render(); };
A.tplanno = function () { T().pending = null; D.render(); };
D.changes.tcol = function (el) { if (!el.value) return; var x = task(el.dataset.v); h(x, "moved it to " + ST[el.value][0], { st: el.value, due: x.due }); x.st = el.value; D.render(); };
var dragTask = null;
document.addEventListener("dragstart", function (e) { var c = e.target.closest && e.target.closest("[data-task]"); if (!c) return; dragTask = +c.dataset.task; try { e.dataTransfer.setData("text/plain", String(dragTask)); } catch (x) {} });
document.addEventListener("dragover", function (e) { var c = e.target.closest && e.target.closest("[data-col]"); if (c && dragTask) { e.preventDefault(); c.classList.add("over"); } });
document.addEventListener("dragleave", function (e) { var c = e.target.closest && e.target.closest("[data-col]"); if (c) c.classList.remove("over"); });
document.addEventListener("drop", function (e) { var c = e.target.closest && e.target.closest("[data-col]"); if (!c || !dragTask) return; e.preventDefault(); var x = task(dragTask); if (x.st !== c.dataset.col) { h(x, "moved it to " + ST[c.dataset.col][0], { st: c.dataset.col, due: x.due }); x.st = c.dataset.col; } dragTask = null; D.render(); });
})();
