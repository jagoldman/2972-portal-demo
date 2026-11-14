/* Tasks at working depth: its own left sidebar (views and the Division > Project > Subteam tree), list and board per subteam, milestone grid per project,
   My tasks, This week, Dashboard, Calendar, Timeline, a full task panel (subtasks, dependencies, labels, links, comments, history), lead and simple modes, the assistant, and the projector. */
(function () {
"use strict";
var esc = D.esc;
var TODAYS = "2026-11-10";
var NOW = "15:42"; // The demo's time of day (the Projector's clock and "Updated 3:42 pm").
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
    var x = { id: ++id, title: title, p: p, sub: sub, ms: ms || null, who: who || [], due: due || "", st: st || "todo", doneOn: null, parent: null, labels: [], est: null, by: [], rel: [], links: [], desc: "", check: [], comments: [], hist: [] };
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
  t("Intake CAD for design review", "intake", "CAD", "m3", ["Jordan Lee"], "2026-11-05", "done", { labels: ["design"], doneOn: "2026-11-05" });
  t("Intake v2: wider mouth", "intake", "CAD", "m5", ["Jordan Lee"], "2026-11-28", "todo", { labels: ["design"] });
  t("Tune swerve PID on carpet", "drive", "Programming", "m2", ["Priya Shah"], "2026-11-12", "doing", { labels: ["code", "test"] });
  t("Wire swerve CAN loop", "drive", "Electrical", "m2", ["Ava Kim"], "2026-11-10", "doing", { labels: ["wiring"] });
  t("Build 4 swerve modules", "drive", "Mechanical", "m1", ["Leo Brooks", "Omar Haddad"], "2026-10-30", "done", { labels: ["build"], doneOn: "2026-10-29" });
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
  // Work that was due at the last practice (Thu Nov 5): the Projector's Meeting view shows how each one ended.
  // Added at the end so the tasks above keep their ids.
  t("Design review slides", "intake", "CAD", "m3", ["Maya Gold"], "2026-11-05", "done", { labels: ["design"], doneOn: "2026-11-05" });
  t("Swerve encoder offsets", "drive", "Programming", "m2", ["Priya Shah"], "2026-11-05", "done", { labels: ["code"], doneOn: "2026-11-05" });
  t("Drivetrain wiring diagram", "drive", "Electrical", "m2", ["Ava Kim"], "2026-11-05", "doing", { labels: ["wiring"] });
  t("List this year's sponsors", "sponsors", "Business", null, ["Nina Park"], "2026-11-05", "todo");
  return { divs: divs, list: list, nextId: id + 1 };
}
D.inits.push(function (S) {
  var d = seed();
  S.tasks = { divs: d.divs, list: d.list, nextId: d.nextId, at: { v: "my" }, mode: "list", group: "milestone", q: "", who: "all", label: "", expanded: { intake: true }, lead: false, simple: null, side: true, mopen: false, cal: "project",
    cols: ["todo", "doing", "blocked", "done"], openSubs: {},
    // One line for today's team meeting, typed by a mentor or admin on the Projector's Meeting view.
    note: "Safety glasses check. Outreach forms due Friday.",
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
function avs(who) { return '<span class="avatars">' + who.slice(0, 3).map(function (w) { return '<span class="av" data-tip="' + esc(w) + '">' + esc(initials(w)) + "</span>"; }).join("") + "</span>"; }
function stPill(s) { return '<span class="pill ' + ST[s][1] + '">' + ST[s][0] + "</span>"; }
function labs(x) { return simple() ? "" : x.labels.map(function (l) { return '<span class="lab"><i class="dotc" style="background:' + LABELS[l][1] + '"></i>' + LABELS[l][0] + "</span>"; }).join(" "); }
// What a row shows as its status: a task that waits on something unfinished reads as Waiting, otherwise its own state.
function stOf(x) { return x.st !== "done" && x.st !== "blocked" && !simple() && blockedBy(x).length ? '<span class="pill bad" data-tip="Waiting on ' + esc(blockedBy(x).map(function (b) { return b.title; }).join(", ")) + '">Waiting</span>' : stPill(x.st); }
function names(who) { return who.length ? who.map(esc).join(", ") : "Nobody yet"; }
function check(x) { return '<button class="tcheck" data-act="tdone" data-v="' + x.id + '" aria-pressed="' + (x.st === "done") + '" aria-label="Done: ' + esc(x.title) + '" data-tip="' + (x.st === "done" ? "Mark this task not done" : "Mark this task done") + '">' + D.ic("check", 14) + "</button>"; }
// Row-only versions (My tasks, Dashboard, a subteam's list). A row shows a status word only when the task needs attention:
// Blocked or Waiting (held up by another task). "In progress" lives in the check button's ring, "Done" in its green
// tick, and "To do" shows nothing.
function rowSt(x) {
  var waiting = x.st !== "done" && x.st !== "blocked" && !simple() && blockedBy(x).length;
  return (x.st === "todo" || x.st === "doing" || x.st === "done") && !waiting ? "" : '<span class="tst">' + stOf(x) + "</span>";
}
function rowCheck(x) {
  var doing = x.st === "doing";
  return '<button class="tcheck' + (doing ? " doing" : "") + '" data-act="tdone" data-v="' + x.id + '" aria-pressed="' + (x.st === "done") + '" aria-label="' + (doing ? "In progress. Mark done: " : "Done: ") + esc(x.title) + '" data-tip="' + (x.st === "done" ? "Mark this task not done" : doing ? "In progress (the ring). Tap when it is done" : "Mark this task done") + '">' + D.ic("check", 14) + "</button>";
}
function dueTxt(x) { if (!x.due) return '<span class="who due">No date</span>'; var n = days(x.due); return '<span class="who num due' + (n < 0 && x.st !== "done" ? " late" : "") + '">' + (n === 0 ? "Today" : n === 1 ? "Tomorrow" : n < 0 && x.st !== "done" ? Math.abs(n) + "d late" : fmt(x.due, { month: "short", day: "numeric" })) + "</span>"; }
function blockedBy(x) { return x.by.map(task).filter(function (b) { return b && b.st !== "done"; }); }
function subsOf(x) { return T().list.filter(function (y) { return y.parent === x.id; }); }

/* ---------- Sidebar ---------- */
function sidebar() {
  var tt = T(), at = tt.at, staff = lead(), mine = tt.list.filter(function (x) { return x.who.indexOf(me()) >= 0 && x.st !== "done"; }).length;
  function nav(v, label, icon, n) { var cur = at.v === v; return '<button class="tnav" data-act="tgo" data-v="' + v + '"' + (cur ? ' aria-current="page"' : "") + D.tabTip("tasks", v) + ">" + D.ic(icon, 17) + '<span class="lbl">' + label + "</span>" + (n != null ? '<span class="n">' + n + "</span>" : "") + "</button>"; }
  var tree = tt.divs.map(function (d) {
    var open = d.open;
    return '<div class="trow"><button class="tnav tdivb" data-act="tdiv" data-v="' + d.id + '" aria-expanded="' + open + '"><span class="car">' + (open ? "▾" : "▸") + '</span><span class="lbl">' + esc(d.name) + "</span></button>" + (staff ? '<button class="more" data-act="tmenu" data-k="div" data-v="' + d.id + '" aria-label="Division actions" data-tip="Add, rename or remove in this division">⋯</button>' : "") + "</div>" +
      (open ? d.projects.map(function (p) {
        var pe = !!tt.expanded[p.id], n = tt.list.filter(function (x) { return x.p === p.id && x.st !== "done" && !x.parent; }).length;
        return '<div class="trow l1"><button class="tnav" data-act="tproj" data-v="' + p.id + '"' + (at.v === "project" && at.p === p.id ? ' aria-current="page"' : "") + '><span class="car" data-act="texp" data-v="' + p.id + '">' + (pe ? "▾" : "▸") + '</span><span class="sw2" style="background:' + p.color + '"></span><span class="lbl">' + esc(p.name) + '</span><span class="n">' + n + "</span></button>" + (staff ? '<button class="more" data-act="tmenu" data-k="proj" data-v="' + p.id + '" aria-label="Project actions" data-tip="Add a subteam or milestone, or rename the project">⋯</button>' : "") + "</div>" +
          (pe ? p.subs.map(function (s) { var c = tt.list.filter(function (x) { return x.p === p.id && x.sub === s && x.st !== "done" && !x.parent; }).length; return '<div class="trow l2"><button class="tnav" data-act="tlist" data-p="' + p.id + '" data-v="' + esc(s) + '"' + (at.v === "list" && at.p === p.id && at.l === s ? ' aria-current="page"' : "") + '><span class="lbl">' + esc(s) + '</span><span class="n">' + c + "</span></button></div>"; }).join("") : "");
      }).join("") + (staff ? '<button class="tnav tadd l1" data-act="tnewproj" data-v="' + d.id + '">+ New project</button>' : "") : "");
  }).join("");
  var close = '<button class="xbtn tclose" data-act="tside" aria-label="Close menu" data-tip="Close the task menu">×</button>';
  if (D.S.role === "parent") return "";
  return '<nav class="tside" aria-label="Tasks" data-keepscroll="tside">' + close + '<button class="btn tnew" data-act="tnew">' + D.ic("plus", 16) + " New task</button>" +
    // Everyone but parents sees the Timeline (students read it; leads also move bars). For students it follows This week.
    nav("my", "My tasks", "user", mine) + nav("week", "This week", "calendar") + (staff ? nav("dash", "Dashboard", "home") : nav("timeline", "Timeline", "schedule")) + nav("calendar", "Calendar", "calendar") + (staff ? nav("timeline", "Timeline", "schedule") : "") +
    (staff ? '<button class="tnav" data-act="go" data-v="projector" data-tip="Show the practice screen, the meeting lists or the build plan on the shop TV">' + D.ic("projector", 17) + '<span class="lbl">Projector</span></button>' : "") +
    '<div class="sect"><span>Divisions</span>' + (D.S.role === "admin" ? '<button class="btn ghost sm" data-act="tnewdiv">+ New</button>' : "") + "</div>" + tree +
    '<div class="sect"><span>Options</span></div>' +
    (D.S.role === "student" ? '<div class="tnav tsw"><span class="lbl">Lead mode' + (tt.lead ? " · until 6 pm" : "") + '</span><button class="toggle" data-act="tlead" aria-pressed="' + tt.lead + '" aria-label="Lead mode" data-tip="Lets a student lead plan and assign tasks until 6 pm"></button></div>' : "") +
    '<div class="tnav tsw"><span class="lbl">Simple mode</span><button class="toggle" data-act="tsimple" aria-pressed="' + simple() + '" aria-label="Simple mode" data-tip="Hides labels and waiting links for a calmer list"></button></div>' +
    '<button class="tnav" data-act="tchat">' + D.ic("more", 17) + '<span class="lbl">Ask the assistant</span></button>' +
    '<button class="tnav" data-act="thelp">' + D.ic("more", 17) + '<span class="lbl">Help</span></button></nav>';
}
// The page frame: left menu, then a bar with the menu button, the page title and its tools. Parents have no menu, just two tabs.
function frame(title, crumbs, tools, body) {
  var tt = T(), parent = D.S.role === "parent";
  var head = parent ?
    '<header class="topbar"><div class="tabs" role="group"><button class="tab" data-act="tgo" data-v="week" aria-pressed="' + (tt.at.v === "week") + '"' + D.tabTip("tasks", "week") + '>This week</button><button class="tab" data-act="tgo" data-v="calendar" aria-pressed="' + (tt.at.v === "calendar") + '"' + D.tabTip("tasks", "calendar") + '>Calendar</button></div><div class="right">' + (tt.at.v === "calendar" ? tools : "") + "</div></header>" :
    '<header class="topbar"><button class="btn sm tmenu" data-act="tside" aria-label="Show or hide the task menu" data-tip="Your views, projects and subteams">' + D.ic("menu", 18) + '</button><div class="ttl">' + (crumbs ? '<p class="who">' + crumbs + "</p>" : "") + "<h1>" + esc(title) + '</h1></div><div class="right">' + (tools || "") + (tt.lead ? '<span class="leadchip">Lead mode</span>' : "") + "</div></header>";
  return '<div class="tsk' + (parent || !tt.side ? " collapsed" : "") + (tt.mopen ? " mopen" : "") + '">' + sidebar() + (tt.mopen && !parent ? '<button class="drawer-scrim tscrim" data-act="tside" aria-label="Close menu"></button>' : "") +
    '<div class="tmain">' + head + '<div class="content">' + body + "</div></div></div>";
}

/* ---------- Views ---------- */
D.views.tasks = function () {
  var at = T().at;
  if (D.S.role === "parent" && ["week", "calendar"].indexOf(at.v) < 0) T().at = at = { v: "week" };
  if (!lead() && at.v === "dash") T().at = at = { v: "my" };
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
  var st = rowSt(x);
  return '<div class="trowx' + (st ? "" : " nost") + '">' + rowCheck(x) + '<div class="tt"><button class="ttitle" data-act="topen" data-v="' + x.id + '">' + esc(x.title) + '</button><div class="tsub">' + esc(proj(x.p).name) + "</div></div>" +
    st + dueTxt(x) + "</div>";
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
function weekEvent(x) {
  return '<span class="wkev"><span class="wkename">' + esc(x.name) + '</span><span class="wketime">' + esc(D.calApi.span(x)) + "</span></span>";
}
function weekDay(d, e) {
  var open = e.filter(function (x) { return x.kind !== "off"; }).length, off = e.length && !open;
  return '<div class="wkday' + (open ? " prac" : off ? " off" : "") + '"><b class="num">' + fmt(d) + "</b>" + e.map(weekEvent).join("") + "</div>";
}
function week() {
  var evs = D.calApi ? D.calApi.upcoming(10) : [], parent = D.S.role === "parent", out = "";
  for (var i = 0; i < 7; i++) {
    var d = add(TODAYS, i), e = evs.filter(function (x) { return x.date === d; }), due = T().list.filter(function (x) { return x.due === d; }), ms = [];
    T().divs.forEach(function (dv) { dv.projects.forEach(function (p) { p.ms.forEach(function (m) { if (m[2] === d) ms.push(p.name + ": " + m[1]); }); }); });
    if (!e.length && !due.length && !ms.length) continue;
    out += '<div class="li wk">' + weekDay(d, e) + '<span class="grow">' + ms.map(function (m) { return '<span class="wkms"><span class="wkmskind">Milestone</span><span class="wkmsname">' + esc(m) + "</span></span>"; }).join("") +
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
  var seg = '<span class="seg" role="group" aria-label="Color by"><button data-act="tcal" data-v="project" aria-pressed="' + (T().cal === "project") + '" data-tip="Colour each task by its project">By project</button><button data-act="tcal" data-v="sub" aria-pressed="' + (T().cal === "sub") + '" data-tip="Colour each task by its subteam">By subteam</button></span>';
  return '<div class="card"><div class="row between"><h2>November 2026</h2>' + seg + '</div><div class="tablewrap" data-keepscroll="tcalendar"><div class="month tmonth">' + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(function (x) { return '<div class="dh">' + x + "</div>"; }).join("") + cells + '</div></div><p class="who">◆ is a milestone. Practices and events are in the Calendar app.</p></div>';
}
/* ---------- Timeline ----------
   Columns are only the days the team meets, read from the Calendar (D.calApi.meetDays), all the same width. A milestone
   or competition on a day the team does not meet gets a narrow marker column on its date; each of the Calendar's days
   off (D.calApi.daysOff: a break, or one cancelled practice) gets one thin gap column with its own dates. An ordinary
   stretch between practices (Friday to Monday) gets nothing. A task's bar ends on the last practice
   day on or before its due date and is as long as the work it needs (about one practice per 2.5 h of estimate, two
   when there is no estimate). The bar is the task: a click opens it. Leads also move it (see "Moving a bar" below). */
var TL_FROM = "2026-10-26", TL_TO = "2027-01-04", PRACTICE_H = 2.5;
function short(s) { return fmt(s, { month: "short", day: "numeric" }); }
// "Nov 20–30" within one month, "Dec 18–Jan 4" across two.
function spanText(a, b) { return a.slice(0, 7) === b.slice(0, 7) ? short(a) + "–" + parse(b).getDate() : short(a) + "–" + short(b); }
function tlLen(x) { return x.est ? Math.max(1, Math.ceil(x.est / PRACTICE_H)) : 2; }
function tlModel() {
  var api = D.calApi, meet = api && api.meetDays ? api.meetDays(TL_FROM, TL_TO) : [], isMeet = {};
  meet.forEach(function (m) { isMeet[m.date] = m.kind; });
  var divs = T().divs.filter(function (d) { return d.id === "eng" || d.id === "out"; });
  var cols = meet.map(function (m) { return { type: "day", date: m.date, kind: m.kind, name: m.name }; }), marks = {};
  function mark(date, what) { if (date < TL_FROM || date > TL_TO || isMeet[date]) return; (marks[date] = marks[date] || []).push(what); }
  divs.forEach(function (d) { d.projects.forEach(function (p) { p.ms.forEach(function (m) { mark(m[2], "Milestone: " + p.name + ", " + m[1]); }); }); });
  // Competitions are days the team is together: they come from meetDays as columns of their own (kind "comp").
  Object.keys(marks).forEach(function (d) { cols.push({ type: "mark", date: d, items: marks[d] }); });
  // The Calendar's days off, each labelled with its own first and last day.
  // A practice the Calendar holds inside a days-off range keeps its column, and each side of it is labelled with only
  // the days really off.
  if (api && api.daysOff) api.daysOff(TL_FROM, TL_TO).forEach(function (r) {
    var a = r.from;
    meet.filter(function (m) { return m.date >= r.from && m.date <= r.to; }).map(function (m) { return m.date; }).concat([add(r.to, 1)]).forEach(function (d) {
      var b = add(d, -1); if (b >= a) cols.push({ type: "gap", from: a, to: b, name: r.name, date: a + "~" }); a = add(d, 1);
    });
  });
  // By date; a days-off column stands just after anything on its first day.
  cols.sort(function (p, q) { return p.date < q.date ? -1 : p.date > q.date ? 1 : 0; });
  var dayK = []; cols.forEach(function (c, k) { if (c.type === "day") { c.di = dayK.length; dayK.push(k); } });
  return { cols: cols, dayK: dayK, divs: divs, isMeet: isMeet };
}
// The day column (index among practice days) a date lands on: the last practice day on or before it.
function dayFor(M, date) {
  var i = -1; M.dayK.forEach(function (k, di) { if (M.cols[k].date <= date) i = di; });
  return Math.max(0, i);
}
function colOfDate(M, date) { for (var k = 0; k < M.cols.length; k++) if (M.cols[k].date === date) return k; return -1; }
function tlStateWord(x) { return ST[x.st][0]; }
function tlBar(M, x, row, canMove) {
  var end = dayFor(M, x.due), len = tlLen(x), start = Math.max(0, end - len + 1);
  var after = x.due > TL_TO, before = M.dayK.length && x.due < M.cols[M.dayK[0]].date;
  var outside = after || before, label = x.title + ", " + tlStateWord(x) + ", due " + fmt(x.due) + (after ? " (after this chart)" : before ? " (before this chart)" : "");
  var tip = x.title + " · " + tlStateWord(x) + " · " + (x.who.length ? x.who.join(", ") : "nobody yet") + " · due " + fmt(x.due);
  // A task due outside the chart's dates is not moved from the chart (its bar only marks the edge): use the task panel.
  var movable = canMove && x.st !== "done" && !outside;
  if (canMove && outside && x.st !== "done") { label += ". Change its date in the task panel"; tip += " · change the date in the task panel"; }
  // Drawn in the project's colour: lighter for to do, full for in progress or blocked, green when done. The state is
  // also in the bar's name and tip, never in colour alone.
  return '<button class="tkbar st-' + x.st + (x.st === "done" ? " done" : "") + (after ? " after" : "") + (before ? " before" : "") + (movable ? " movable" : "") + '" data-act="topen" data-v="' + x.id + '" data-end="' + end + '" data-len="' + (end - start + 1) + '"' +
    ' style="grid-row:' + row + ";grid-column:" + (M.dayK[start] + 2) + " / " + (M.dayK[end] + 3) + ";--pc:" + proj(x.p).color + '" aria-label="' + esc(label) + (movable ? ". Arrow keys move it one practice day" : "") + '" data-tip="' + esc(tip) + '"></button>';
}
/* Rows that open and close. A caret before each division and project name; a closed project shows only its own row
   (bar and milestones), a closed division only its own row. First visit: divisions open, projects closed except those
   where the person has a task of their own. Kept per person with the other saved choices (Reset clears them). */
function tlRows() {
  var saved = D.pref("tlrows", null) || { div: {}, proj: {} }, out = { div: {}, proj: {} }, mine = me();
  T().divs.forEach(function (d) {
    out.div[d.id] = Object.prototype.hasOwnProperty.call(saved.div, d.id) ? !!saved.div[d.id] : true;
    d.projects.forEach(function (p) { out.proj[p.id] = Object.prototype.hasOwnProperty.call(saved.proj, p.id) ? !!saved.proj[p.id] : T().list.some(function (x) { return x.p === p.id && x.who.indexOf(mine) >= 0; }); });
  });
  return out;
}
function tlShown(M) { return M.divs.map(function (d) { return { d: d, ps: d.projects.filter(function (p) { return T().list.some(function (x) { return x.p === p.id && x.due && !x.parent; }); }) }; }); }
function tlAnyClosed(M, r) { return tlShown(M).some(function (g) { return !r.div[g.d.id] || g.ps.some(function (p) { return !r.proj[p.id]; }); }); }
// A link that points the Timeline at a task (T().at.task) opens that task's project and division first.
function tlReveal(id) { var x = task(id); if (!x) return; var r = tlRows(), dv = divOf(x.p); r.proj[x.p] = true; if (dv) r.div[dv.id] = true; D.setPref("tlrows", r); }
function tlCaret(kind, id, name, open, count) {
  return '<button class="tlcaret" data-act="tlrow" data-k="' + kind + '" data-v="' + id + '" aria-expanded="' + open + '" aria-label="' + esc(name) + '" data-tip="' + esc((open ? "Hide " : "Show ") + (kind === "div" ? "its projects" : "its " + count + (count === 1 ? " task" : " tasks"))) + '">' + D.ic("chevron", 14) + "</button>";
}
function timeline() {
  if (T().at.task) { tlReveal(T().at.task); T().at.revealed = T().at.task; delete T().at.task; }
  var M = tlModel(), cols = M.cols, canMove = lead(), html = "", row = 3, n = cols.length, R = tlRows();
  if (!M.dayK.length) return '<div class="card"><p class="mute">No practices are on the Calendar between Oct 26 and Jan 4.</p></div>';
  var tmpl = "var(--tlname) " + cols.map(function (c) { return c.type === "day" ? "minmax(var(--tlday), 1fr)" : c.type === "mark" ? "var(--tlmark)" : "var(--tlgap)"; }).join(" ");
  // Week labels: one per week, spanning that week's columns (a break column has none).
  var heads = '<div class="tlcorner" style="grid-row:1 / 3"></div>', wk = null, wkStart = 0;
  function monday(s) { var d = parse(s); return add(s, -((d.getDay() + 6) % 7)); }
  // A week that holds only a days-off column gets no label: the column already says what it is.
  var wkDays = false;
  function closeWeek(k) { if (wk && wkDays) heads += '<div class="tlweek" style="grid-row:1;grid-column:' + (wkStart + 2) + " / " + (k + 2) + '">' + esc(short(wk)) + "</div>"; }
  cols.forEach(function (c, k) {
    // A days-off column inside one week belongs to that week (the week keeps one label); a longer one has none.
    var m = c.type !== "gap" ? monday(c.date) : monday(c.from) === monday(c.to) ? monday(c.from) : null;
    if (m !== wk) { closeWeek(k); wk = m; wkStart = k; wkDays = false; }
    if (c.type !== "gap") wkDays = true;
    if (c.type === "day") heads += '<div class="tlday' + (c.date === TODAYS ? " istoday" : "") + '" style="grid-row:2;grid-column:' + (k + 2) + '" data-date="' + c.date + '" data-k="' + k + '" data-tip="' + esc(fmt(c.date) + " · " + (c.kind === "comp" ? "Competition: " + c.name : c.kind === "build" ? "Build day" : "Practice") + (c.date === TODAYS ? " · today" : "")) + '"' + (c.kind === "comp" ? ' data-kind="comp"' : "") + '><span>' + fmt(c.date, { weekday: "short" }) + "</span><b>" + parse(c.date).getDate() + "</b></div>";
    else if (c.type === "mark") { var says = c.items.join("; ") + " · " + fmt(c.date) + ", no practice that day"; heads += '<div class="tlmarkh" tabindex="0" role="img" aria-label="' + esc(says) + '" style="grid-row:2;grid-column:' + (k + 2) + '" data-date="' + c.date + '" data-tip="' + esc(says) + '"><b aria-hidden="true">' + parse(c.date).getDate() + "</b></div>"; }
  });
  closeWeek(n);
  // Body rows: a division heading, then each project with its bar and milestones, then its tasks.
  var body = "";
  M.divs.forEach(function (d) {
    var dOpen = R.div[d.id];
    body += '<div class="tlgrp" style="grid-row:' + row++ + '">' + tlCaret("div", d.id, d.name, dOpen) + "<h3>" + esc(d.name) + "</h3></div>";
    if (!dOpen) return;
    d.projects.forEach(function (p) {
      var xs = T().list.filter(function (x) { return x.p === p.id && x.due && !x.parent; }); if (!xs.length) return;
      var ends = xs.map(function (x) { return dayFor(M, x.due); }), starts = xs.map(function (x, i) { return Math.max(0, ends[i] - tlLen(x) + 1); });
      var lo = Math.min.apply(null, starts), hi = Math.max.apply(null, ends);
      var pOpen = R.proj[p.id];
      body += '<div class="tlp" style="grid-row:' + row + '">' + tlCaret("proj", p.id, p.name, pOpen, xs.length) + '<button class="ttitle tlpname" data-act="tproj" data-v="' + p.id + '"><span class="sw2" style="background:' + p.color + '"></span> ' + esc(p.name) + "</button></div>" +
        '<button class="tlpbar" data-act="tproj" data-v="' + p.id + '" style="grid-row:' + row + ";grid-column:" + (M.dayK[lo] + 2) + " / " + (M.dayK[hi] + 3) + ";--pc:" + p.color + '" aria-label="' + esc(p.name + ", project, " + short(M.cols[M.dayK[lo]].date) + " to " + short(M.cols[M.dayK[hi]].date)) + '" data-tip="' + esc(p.name + " · " + xs.length + (xs.length === 1 ? " task" : " tasks") + " · open the project") + '"></button>' +
        p.ms.map(function (m) { var k = M.isMeet[m[2]] ? M.dayK[dayFor(M, m[2])] : colOfDate(M, m[2]); if (k < 0 || m[2] < TL_FROM || m[2] > TL_TO) return ""; // A milestone is a button: its own name and tip, and a click opens the project.
          return '<button class="tlms' + (m[3] ? " met" : "") + '" data-act="tproj" data-v="' + p.id + '" style="grid-row:' + row + ";grid-column:" + (k + 2) + '" aria-label="' + esc("Milestone: " + m[1] + ", " + fmt(m[2]) + (m[3] ? ", met" : "")) + '" data-tip="' + esc("Milestone: " + m[1] + " · " + fmt(m[2]) + (m[3] ? " · met" : "") + " · open " + p.name) + '"></button>'; }).join("");
      row++;
      if (!pOpen) return;
      xs.forEach(function (x) {
        var bb = x.by.map(task).filter(function (b) { return b && b.due > x.due; });
        body += '<button class="ttitle tlt" data-act="topen" data-v="' + x.id + '" style="grid-row:' + row + '">' + esc(x.title) + (bb.length ? ' <span class="pill bad" data-tip="Due before something it waits on">Out of order</span>' : "") + "</button>" + tlBar(M, x, row, canMove);
        row++;
      });
    });
  });
  // Column backgrounds behind the bars: practice days, marker columns, breaks with their note, and today.
  var rows = row - 3, todayK = colOfDate(M, TODAYS), back = "";
  cols.forEach(function (c, k) {
    var cls = c.type === "day" ? "tlcol" + (c.kind === "build" ? " build" : c.kind === "comp" ? " comp" : "") + (k === todayK ? " today" : "") : c.type === "mark" ? "tlcol mark" : "tlcol gap";
    back += '<div class="' + cls + '" style="grid-row:3 / span ' + rows + ";grid-column:" + (k + 2) + '"' + (c.type === "gap" ? ' data-tip="' + esc(c.name + ": no practice " + (c.from === c.to ? "on " + fmt(c.from) : "from " + fmt(c.from) + " to " + fmt(c.to))) + '"><span>No practice ' + esc(c.from === c.to ? short(c.from) : spanText(c.from, c.to)) + "</span></div>" : "></div>");
  });
  var todayNote = "the gold column is today";
  if (todayK < 0) {
    // Today is not a practice day: a red line on the boundary before the next column after today.
    var next = 0; while (next < n && (cols[next].type === "gap" ? cols[next].from : cols[next].date) <= TODAYS) next++;
    back += '<div class="tltoday' + (next >= n ? " end" : "") + '" style="grid-row:1 / span ' + (rows + 2) + ";grid-column:" + (Math.min(next, n - 1) + 2) + '" data-tip="Today, ' + esc(fmt(TODAYS)) + '"></div>';
    todayNote = "the red line is today";
  }
  var help = "Each column is a practice, build or competition day. Bars end on the due date; a striped bar is blocked, a ✓ is done; ◆ is a milestone, " + todayNote + "." + (canMove ? " Drag a bar, or focus it and use the arrow keys, to move its due date." : "");
  var anyClosed = tlAnyClosed(M, R);
  var all = '<button class="btn ghost sm tlall" data-act="tlall" data-tip="' + (anyClosed ? "Show every division's projects and their tasks" : "Hide every project's tasks") + '">' + (anyClosed ? "Open all" : "Close all") + "</button>";
  return '<div class="card"><div class="tltop"><p class="who tlhelp">' + help + "</p>" + all + '</div><div class="tablewrap tlwrap" data-keepscroll="tl"><div class="tl" style="grid-template-columns:' + tmpl + '">' + heads + back + body + "</div></div></div>";
}
/* ---------- Moving a bar (mentors, admins, and a student in Lead mode) ----------
   Drag a bar sideways with a mouse or pen: it follows the pointer, snaps to practice-day columns and shows the day it
   will land on; dropping it sets the due date to that day and keeps the bar's length. A move under 4 px is a click and
   opens the task. On a touch screen bars never drag (that would fight scrolling the chart); a tap opens the task.
   With a bar focused, Left and Right move it one practice day. A done task's bar does not move. */
// eatClick: the click that ends a drag must not also open the task. It is set when a drag ends and cleared by the next
// pointer press, so a later real click always counts; a keyboard click (detail 0) is never eaten.
var DRAG_PX = 4, tlDrag = null, eatClick = false;
function tlDayCells() { return Array.from(document.querySelectorAll(".tl .tlday")).map(function (c) { var r = c.getBoundingClientRect(); return { date: c.dataset.date, k: +c.dataset.k, mid: r.left + r.width / 2 }; }); }
/* Moves of the same task by the same person within 5 seconds (holding an arrow key, a few drags in a row) are one
   move: one history line with the final date and one Undo back to the date before the first of them. Undo takes back
   that move's own history line, whatever was written after it. */
var TL_MERGE_MS = 5000, tlLast = null;
function tlMove(id, toDate) {
  var x = task(id); if (!x || x.st === "done" || x.due === toDate) return false;
  var who = D.me().name, now = Date.now(), m = tlLast, what = "changed the due date to " + fmt(toDate) + " on the timeline";
  if (m && m.id === String(id) && m.who === who && now - m.at < TL_MERGE_MS && x.hist.indexOf(m.entry) >= 0) { m.entry[1] = what; m.entry[3] = { st: x.st, due: toDate }; }
  else { h(x, what, { st: x.st, due: toDate }); m = tlLast = { id: String(id), who: who, from: x.due, entry: x.hist[x.hist.length - 1] }; }
  m.at = now; x.due = toDate;
  // Back where it started: no change to record, so no history line and nothing to undo.
  if (toDate === m.from) { var j = x.hist.indexOf(m.entry); if (j >= 0) x.hist.splice(j, 1); tlLast = null; D.toast("Moved back to " + fmt(toDate) + "."); D.render(); return true; }
  D.toast("Moved to " + fmt(toDate) + ".", function () { x.due = m.from; var i = x.hist.indexOf(m.entry); if (i >= 0) x.hist.splice(i, 1); if (tlLast === m) tlLast = null; });
  D.render();
  return true;
}
function tlLabel(text, el) {
  var lab = document.querySelector(".tldrag");
  if (!lab) { lab = document.createElement("div"); lab.className = "tldrag"; lab.setAttribute("role", "status"); document.body.appendChild(lab); }
  lab.textContent = text; var r = el.getBoundingClientRect();
  lab.style.left = Math.round(Math.max(8, Math.min(document.documentElement.clientWidth - lab.offsetWidth - 8, r.right - lab.offsetWidth / 2))) + "px";
  lab.style.top = Math.round(Math.max(8, r.top - lab.offsetHeight - 8)) + "px";
}
function tlEndDrag() { var lab = document.querySelector(".tldrag"); if (lab) lab.remove(); if (tlDrag && tlDrag.el) tlDrag.el.classList.remove("dragging"); tlDrag = null; }
// Cancel a drag: the bar goes back where it was and nothing changes; the release that ends the gesture opens nothing.
function tlCancel() { if (!tlDrag) return; tlEndDrag(); eatClick = true; D.render(); }
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && tlDrag) { e.stopImmediatePropagation(); e.preventDefault(); tlCancel(); } }, true);
// No redraw while a bar is held (D.render waits; the drop draws). If one happens anyway, the drag carries on with the
// new bar: lifted, where the pointer has it, with its label and the pointer captured.
D.holdRender = function () { return !!tlDrag; };
D.after.push(function () {
  var d = tlDrag; if (!d) return;
  var el = document.querySelector('.tkbar[data-v="' + d.id + '"]'); if (!el || el === d.el) return;
  d.el = el;
  if (d.moved) { el.classList.add("dragging"); el.style.gridColumn = (d.cells[d.end - d.len + 1].k + 2) + " / " + (d.cells[d.end].k + 3); tlLabel(fmt(d.cells[d.end].date), el); }
  try { el.setPointerCapture(d.pointerId); } catch (err) {}
});
document.addEventListener("pointerdown", function (e) {
  eatClick = false;
  var el = e.target.closest && e.target.closest(".tkbar.movable");
  if (!el || e.button !== 0 || e.pointerType === "touch") return;
  // Positions are kept in the chart's own coordinates (screen x plus its sideways scroll), so a scroll during the
  // drag, by the edge or by a wheel, keeps the bar and its label under the pointer.
  var wrap = el.closest(".tlwrap"), sl = wrap ? wrap.scrollLeft : 0, end = +el.dataset.end, len = +el.dataset.len;
  var cells = tlDayCells().map(function (c) { c.mid += sl; return c; });
  tlDrag = { el: el, id: el.dataset.v, wrap: wrap, x0: e.clientX + sl, cx: e.clientX, cells: cells, end0: end, end: end, len: len, moved: false, pointerId: e.pointerId, speed: 0 };
  try { el.setPointerCapture(e.pointerId); } catch (err) {}
});
// Snap: the practice day whose middle is nearest to where the bar's end has been dragged; never off either end.
function tlUpdate(d) {
  var sl = d.wrap ? d.wrap.scrollLeft : 0, want = d.cells[d.end0].mid + (d.cx + sl - d.x0), best = d.end0;
  d.cells.forEach(function (c, i) { if (Math.abs(c.mid - want) < Math.abs(d.cells[best].mid - want)) best = i; });
  best = Math.max(d.len - 1, Math.min(d.cells.length - 1, best));
  d.end = best;
  if (document.contains(d.el)) { d.el.style.gridColumn = (d.cells[best - d.len + 1].k + 2) + " / " + (d.cells[best].k + 3); tlLabel(fmt(d.cells[best].date), d.el); }
}
// Near the chart's left or right edge the chart scrolls by itself, faster the closer the pointer is.
var TL_EDGE = 48;
function tlEdgeScroll() {
  var d = tlDrag; if (!d || !d.speed || !d.wrap) { if (d) d.scrolling = false; return; }
  var before = d.wrap.scrollLeft; d.wrap.scrollLeft += d.speed;
  if (d.wrap.scrollLeft !== before) tlUpdate(d);
  requestAnimationFrame(tlEdgeScroll);
}
document.addEventListener("pointermove", function (e) {
  var d = tlDrag; if (!d) return;
  // The release was lost (it happened outside the window): no button is held any more, so the drag is cancelled.
  if (e.pointerType !== "touch" && e.buttons === 0) { tlCancel(); return; }
  d.cx = e.clientX;
  var sl = d.wrap ? d.wrap.scrollLeft : 0, dx = e.clientX + sl - d.x0;
  if (!d.moved && Math.abs(dx) < DRAG_PX) return;
  if (!d.moved) { d.moved = true; d.el.classList.add("dragging"); D.hideTip && D.hideTip(); }
  tlUpdate(d);
  if (d.wrap && d.wrap.scrollWidth > d.wrap.clientWidth) {
    var corner = d.wrap.querySelector(".tlcorner"), r = d.wrap.getBoundingClientRect(), left = r.left + (corner ? corner.offsetWidth : 0); // past the pinned names
    d.speed = e.clientX < left + TL_EDGE ? -Math.ceil((left + TL_EDGE - e.clientX) / 4) : e.clientX > r.right - TL_EDGE ? Math.ceil((e.clientX - r.right + TL_EDGE) / 4) : 0;
    d.speed = Math.max(-24, Math.min(24, d.speed));
    if (d.speed && !d.scrolling) { d.scrolling = true; requestAnimationFrame(tlEdgeScroll); }
  }
});
document.addEventListener("scroll", function (e) { var d = tlDrag; if (d && d.moved && e.target === d.wrap) tlUpdate(d); }, true);
document.addEventListener("pointerup", function (e) {
  var d = tlDrag; if (!d) return;
  // Released well above or below the chart (more than 40 px): that is a change of mind, not a move.
  var chart = d.el.closest(".tl"), cr = chart && chart.getBoundingClientRect();
  if (d.moved && cr && (e.clientY < cr.top - 40 || e.clientY > cr.bottom + 40)) { tlCancel(); return; }
  if (d.moved) {
    eatClick = true;
    var to = d.cells[d.end].date; tlEndDrag();
    if (d.end !== d.end0) tlMove(d.id, to); else D.render();
    var b = document.querySelector('.tkbar[data-v="' + d.id + '"]'); if (b) b.focus({ preventScroll: true });
  } else { tlEndDrag(); if (D.renderHeld) D.render(); }
});
document.addEventListener("pointercancel", function () { if (tlDrag) { var moved = tlDrag.moved; tlEndDrag(); if (moved || D.renderHeld) D.render(); } });
document.addEventListener("click", function (e) {
  if (eatClick && e.detail > 0) { eatClick = false; if (e.target.closest && e.target.closest(".tl")) { e.stopImmediatePropagation(); e.preventDefault(); } }
}, true);
document.addEventListener("keydown", function (e) {
  var el = document.activeElement; if (!el || !el.classList || !el.classList.contains("tkbar")) return;
  // A modifier (Alt or Cmd for Back, Shift, Ctrl) means the key is not for the bar. The browser's own use of the key
  // (scrolling the chart) is stopped only when the press really moves the bar.
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
  if (!el.classList.contains("movable")) return;
  var cells = tlDayCells(), len = +el.dataset.len, end = +el.dataset.end + (e.key === "ArrowRight" ? 1 : -1);
  if (end < len - 1 || end > cells.length - 1) return;
  e.preventDefault();
  var id = el.dataset.v;
  if (tlMove(id, cells[end].date)) { var b = document.querySelector('.tkbar[data-v="' + id + '"]'); if (b) b.focus(); }
});
function filtersBar() {
  var tt = T();
  return '<div class="tbar"><input id="t-q" class="inp tq" data-input="tq" placeholder="Filter tasks" value="' + esc(tt.q) + '" aria-label="Filter tasks"><span class="seg" role="group" aria-label="Whose tasks"><button data-act="twho" data-v="all" aria-pressed="' + (tt.who === "all") + '" data-tip="Tasks for the whole subteam">Everyone</button><button data-act="twho" data-v="me" aria-pressed="' + (tt.who === "me") + '" data-tip="Only tasks assigned to you">Mine</button></span>' +
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
  var grid = '<div class="tablewrap" data-keepscroll="tproject"><div class="pgrid" style="grid-template-columns:' + cols + ';min-width:' + (170 + p.subs.length * 180) + 'px"><div class="gh">Milestone</div>' + p.subs.map(function (s) { return '<div class="gh"><button class="linkbtn" data-act="tlist" data-p="' + p.id + '" data-v="' + esc(s) + '">' + esc(s) + " →</button></div>"; }).join("") +
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
  // The grid needs about 180 px per subteam; when the card is narrower (a laptop window), it scrolls sideways in its own box.
  grid = '<div class="hide-sm tablewrap" data-keepscroll="pgrid">' + grid + "</div>" + stack;
  var cross = xs.filter(function (x) { return x.by.some(function (b) { var bt = task(b); return bt && bt.sub !== x.sub; }); });
  var tools = (lead() ? '<button class="btn sm" data-act="tmsadd" data-v="' + p.id + '">+ Milestone</button><button class="btn ghost sm" data-act="tsaves">' + D.ic("history", 16) + " Save points</button>" : "");
  return frame(p.name, esc(d.name), tools, filtersBar() + '<div class="card pgcard">' + grid + "</div>" +
    (cross.length && !simple() ? '<div class="card"><h2>Waiting on other subteams</h2><div class="list">' + cross.map(function (x) { return '<div class="li"><span class="grow"><b>' + esc(x.title) + '</b> <span class="who">(' + esc(x.sub) + ") waits on</span> " + x.by.map(function (b) { var bt = task(b); return "<b>" + esc(bt.title) + '</b> <span class="who">(' + esc(bt.sub) + ", " + ST[bt.st][0] + ")</span>"; }).join(", ") + "</span></div>"; }).join("") + "</div></div>" : ""));
}
function listPage(pid, sub) {
  var p = proj(pid), tt = T(), xs = tt.list.filter(function (x) { return x.p === pid && x.sub === sub && !x.parent && pass(x); });
  var tools = '<span class="seg" role="group" aria-label="View"><button data-act="tmode" data-v="list" aria-pressed="' + (tt.mode === "list") + '" data-tip="Tasks in rows, grouped">List</button><button data-act="tmode" data-v="board" aria-pressed="' + (tt.mode === "board") + '" data-tip="Tasks as cards in columns by status">Board</button></span>';
  var body = filtersBar();
  if (tt.mode === "board") {
    body += '<div class="board" data-keepscroll="tboard">' + tt.cols.map(function (c) { var cs = xs.filter(function (x) { return x.st === c; }); return '<div class="bcol" data-col="' + c + '"><div class="row between"><span class="pill ' + ST[c][1] + '"><b>' + ST[c][0] + '</b></span><span class="who">' + cs.length + "</span></div>" + cs.map(function (x) { var sc = subsOf(x); return '<div class="bcard" draggable="true" data-task="' + x.id + '"><button class="ttitle" data-act="topen" data-v="' + x.id + '">' + esc(x.title) + "</button>" + (labs(x) ? '<div class="who">' + labs(x) + "</div>" : "") + '<div class="row between">' + avs(x.who) + dueTxt(x) + "</div>" + (sc.length ? '<span class="who">' + sc.filter(function (s) { return s.st === "done"; }).length + " of " + sc.length + " subtasks</span>" : "") + (x.ms ? '<span class="who">◆ ' + esc(msName(x.p, x.ms)) + "</span>" : "") + '<select class="chipsel" data-change="tcol" data-v="' + x.id + '" aria-label="Move ' + esc(x.title) + '"><option value="">Move to…</option>' + tt.cols.map(function (k) { return '<option value="' + k + '">' + ST[k][0] + "</option>"; }).join("") + "</select></div>"; }).join("") + '<button class="btn ghost sm" data-act="tnewin" data-p="' + pid + '" data-s="' + esc(sub) + '" data-st="' + c + '">+ Add a task</button></div>'; }).join("") + "</div>";
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
  var st = rowSt(x);
  return '<div class="trowx' + (isSub ? " sub" : "") + (st ? "" : " nost") + '">' + rowCheck(x) + '<div class="tt"><div class="tline">' + (sc.length ? '<button class="tex" data-act="tsubs" data-v="' + x.id + '" aria-label="' + (open ? "Hide" : "Show") + ' subtasks" aria-expanded="' + !!open + '" data-tip="' + (open ? "Hide" : "Show") + ' the steps inside this task">' + (open ? "▾" : "▸") + "</button>" : "") + '<button class="ttitle' + (x.st === "done" ? " isdone" : "") + '" data-act="topen" data-v="' + x.id + '">' + esc(x.title) + '</button></div><div class="tsub">' + sub.join(" · ") + (lb ? " · " + lb : "") + "</div></div>" +
    st + dueTxt(x) + "</div>";
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
    '<div class="psec"><p class="flabel">Who</p><div class="row">' + x.who.map(function (w) { return '<span class="whochip">' + esc(w) + ' <button data-act="tunassign" data-v="' + x.id + '" data-w="' + esc(w) + '" aria-label="Remove ' + esc(w) + '" data-tip="Take ' + esc(w) + ' off this task">×</button></span>'; }).join("") + (x.who.indexOf(me()) < 0 ? '<button class="btn sm" data-act="ttake" data-v="' + x.id + '">+ Me</button>' : "") + '<select class="chipsel" data-change="tassign" data-v="' + x.id + '" aria-label="Assign someone"><option value="">+ Someone</option>' + ["Leo Brooks", "Priya Shah", "Ava Kim", "Jordan Lee", "Maya Gold", "Omar Haddad", "Nina Park", "Ms. Rivera", "Mr. Chen"].filter(function (n) { return x.who.indexOf(n) < 0; }).map(function (n) { return "<option>" + esc(n) + "</option>"; }).join("") + "</select></div></div>" +
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

/* ---------- Projector ----------
   One screen for the shop TV with a switch between its views (Meeting, Practice, Build plan). The choice is a saved
   choice (D.setPref "projview"), so Reset clears it. Staff and the Display role both get the switch. */
var PJ_VIEWS = [["meeting", "Meeting", "Last practice's and today's tasks, for a team meeting"], ["practice", "Practice", "The practice screen: the clock, the countdown and who is working on what"], ["plan", "Build plan", "The build plan chart: projects, milestones and today"]];
var PJ_DEFAULT = "practice";
function pjView() { var v = D.pref("projview", PJ_DEFAULT); return PJ_VIEWS.some(function (x) { return x[0] === v; }) ? v : PJ_DEFAULT; }
// The Projector's own state while it is open: the page, the automatic turns, the rotation's current turn, the note
// being edited (with its draft), and the lists the fitting code lays out. Reset (D.inits) and a role change clear it.
var PJ = { lists: {} };
function pjClear() { PJ.page = 0; PJ.pages = 1; PJ.turned = 0; PJ.manual = -1e12; PJ.input = -1e12; PJ.focus = null; PJ.rot = null; PJ.rotAt = 0; PJ.fade = false; PJ.noteEdit = false; PJ.draft = null; }
pjClear();
D.inits.push(pjClear);
(D.onRole = D.onRole || []).push(pjClear);
// Rotate with the build plan: on for the Display role by default, off for staff (a saved choice).
function rotOn() { return !!D.pref("projrotate", D.S.role === "display"); }
// The view on screen: the saved one, or the build plan / practice view the rotation has turned to.
function pjShown() { var v = pjView(); return PJ.rot && rotOn() && (v === "practice" || v === "plan") ? PJ.rot : v; }
// Only mentors and admins write the note; anyone who can open the Projector but the Display role opens tasks from rows.
function noteEditor() { return D.isStaff(); }
function rowsOpen() { return D.S.role !== "display"; }
function pjSwitch(cur) {
  return '<div class="mtgsw" role="group" aria-label="What the projector shows">' + PJ_VIEWS.map(function (v) {
    return '<button data-act="pjview" data-v="' + v[0] + '" aria-pressed="' + (v[0] === cur) + '" data-tip="' + esc(v[2]) + '">' + esc(v[1]) + "</button>";
  }).join("") + "</div>";
}
// The header every view shares: title and a muted line on the left; page buttons (Meeting, Practice), the switch,
// Rotate (Practice, Build plan) and Exit on the right.
function pjHead(title, cur, sub) {
  var disp = D.S.role === "display";
  var pager = cur === "meeting" || cur === "practice" ? '<div class="mtgpager" hidden><button class="btn mtgpg" data-act="mtgpage" data-v="-1" aria-label="Previous page" data-tip="Show the previous page of tasks (Left arrow)">' + D.ic("chevron", 18) + '</button><span class="mtgpgn num" aria-live="polite">1 / 1</span><button class="btn mtgpg mtgnext" data-act="mtgpage" data-v="1" aria-label="Next page" data-tip="Show the next page of tasks (Right arrow)">' + D.ic("chevron", 18) + "</button></div>" : "";
  return '<div class="mtghead' + (disp ? " mtgdisp" : "") + '"><div class="mtgttl"><h1' + (cur === "practice" ? ' class="mtgclock num"' : "") + ">" + esc(title) + '</h1><p class="dmute">' + (sub || "Updated " + clock(NOW)) + '</p></div><div class="mtgctl">' + pager + pjSwitch(cur) +
    (cur === "practice" || cur === "plan" ? '<button class="mtgrot" data-act="pjrotate" aria-pressed="' + rotOn() + '" data-tip="Take turns with the ' + (cur === "plan" ? "practice screen" : "build plan") + ' every 45 seconds"><span class="mtgrotk" aria-hidden="true"></span>Rotate with the build plan</button>' : "") +
    (disp ? "" : '<button class="btn mtgexit" data-act="go" data-v="tasks" data-tip="Back to Tasks">Exit projector</button>') + "</div></div>";
}
/* Countdown strip (top of Meeting and Practice): the season and the next four milestones not yet met.
   The kickoff date is the Calendar's kickoff event (D.calApi.kickoff). Days are counted. A milestone's due day is a
   working day, so its "practices left" are the days the team meets from today through that day; the kickoff is an
   event, so it counts the practices before it (D.calApi.meetDays), never typed in. */
function meetsBefore(date) { var api = D.calApi; return api && api.meetDays && date > TODAYS ? api.meetDays(TODAYS, add(date, -1)).length : 0; }
function meetsThrough(date) { var api = D.calApi; return api && api.meetDays && date >= TODAYS ? api.meetDays(TODAYS, date).length : 0; }
function plural(n, one, many) { return n + " " + (n === 1 ? one : many || one + "s"); }
function season() { var k = D.calApi && D.calApi.kickoff ? D.calApi.kickoff() : null; return k ? { date: k.date, days: days(k.date), practices: meetsBefore(k.date) } : null; }
function nextMilestones(n) {
  var out = [];
  T().divs.forEach(function (d) { d.projects.forEach(function (p) { p.ms.forEach(function (m) { if (!m[3]) out.push({ p: p, id: m[0], name: m[1], date: m[2] }); }); }); });
  return out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).slice(0, n);
}
// How far away, in the two units that matter: "in 2 days" and "2 practices left"; "today"; "3 days late" in words.
function msWhen(date) {
  var n = days(date);
  if (n === 0) return { days: "", left: "today" };
  if (n < 0) return { days: "", left: plural(-n, "day") + " late" };
  var k = meetsThrough(date);
  return { days: "in " + plural(n, "day"), left: k ? plural(k, "practice") + " left" : "no practice left" };
}
/* A card has three layouts: on a TV (four lines: project and date, name, how far, a bar and the tasks done), on a
   window under 800 px tall (three lines: the "in N days" part and the word "tasks" drop, the bar shares the last
   line), and on a phone (one line: dot, name, date and practices left; no bar). The phone line is its own element. */
function countdown() {
  var s = season(), open = rowsOpen();
  var head = s ? '<div class="mtgseason"><span class="mtgmsp"><span class="mtgkick">Kickoff</span><span class="num">' + esc(fmt(s.date)) + '</span></span><span class="mtgbig num">' + plural(s.days, "day") + '</span><span class="num mtgbefore">' + plural(s.practices, "practice") + " before it</span>" +
    '<span class="mtgmsph"><b>Kickoff</b> · <span class="num">' + esc(fmt(s.date)) + " · " + plural(s.days, "day") + " · " + plural(s.practices, "practice") + " before it</span></span></div>" : "";
  var cards = nextMilestones(4).map(function (m) {
    var xs = T().list.filter(function (x) { return x.p === m.p.id && x.ms === m.id && !x.parent; }), dn = xs.filter(function (x) { return x.st === "done"; }).length, late = days(m.date) < 0, w = msWhen(m.date);
    var dot = '<i class="mtgdot" style="background:' + m.p.color + '"></i>';
    var inner = '<span class="mtgmsp"><span class="mtgmspn">' + dot + '<span class="mtgmspt">' + esc(m.p.name) + '</span></span><span class="num mtgmsdt">' + esc(fmt(m.date)) + '</span></span><span class="mtgmsn">' + esc(m.name) + "</span>" +
      '<span class="mtgmsl"><b class="mtgaway' + (late ? " late" : "") + '">' + (w.days ? '<span class="mtgdays">' + w.days + " · </span>" : "") + esc(w.left) + '</b><span class="mtgmssep" aria-hidden="true"> · </span>' +
      '<span class="mtgmsdone">' + (xs.length ? '<span class="mtgmsbar" aria-hidden="true"><i style="width:' + D.pct(dn, xs.length) + '%"></i></span><span class="mtgmst num">' + dn + " of " + xs.length + '<span class="mtgword"> ' + (xs.length === 1 ? "task" : "tasks") + "</span> done</span>" : '<span class="mtgmst">No tasks yet</span>') + "</span></span>" +
      '<span class="mtgmsph">' + dot + "<b>" + esc(m.name) + '</b> <span class="num">' + esc(fmt(m.date)) + " · " + esc(w.left) + "</span></span>";
    return open ? '<button class="mtgms' + (late ? " late" : "") + '" data-act="mtgproj" data-v="' + m.p.id + '" data-tip="Open the ' + esc(m.p.name) + ' project in Tasks">' + inner + "</button>" : '<div class="mtgms' + (late ? " late" : "") + '">' + inner + "</div>";
  }).join("");
  return '<div class="mtgstrip" role="group" aria-label="Countdown">' + head + cards + "</div>";
}
D.views.projector = function () {
  if (!(lead() || D.S.role === "display")) return D.denied("Projector");
  var v = pjShown(), fade = PJ.fade ? " mtgfade" : ""; PJ.fade = false;
  // Leaving the Meeting view closes a note being edited, without saving it.
  if (v !== "meeting") { PJ.noteEdit = false; PJ.draft = null; }
  PJ.lists = {};
  if (v === "practice") return '<div class="display mtgscreen' + fade + '" data-pv="practice">' + practiceView() + "</div>";
  if (v === "meeting") return '<div class="display mtgscreen' + fade + '" data-pv="meeting">' + pjHead("Team meeting · " + fmt(TODAYS), v) + countdown() + '<div class="mtgtop">' + glance() + noteLine() + "</div>" + meetingLists() + "</div>";
  var s = season();
  return '<div class="display mtgscreen' + fade + '" data-pv="plan">' + pjHead("Build plan" + (s ? " · " + plural(s.days, "day") + " to kickoff" : ""), v) + buildPlan() + "</div>";
};
function buildPlan() {
  var start = "2026-10-26", span = 70; function pos(s) { return Math.max(0, Math.min(100, (days(s) - days(start)) / span * 100)); }
  var ps = ["drive", "intake", "elev", "shoot", "library"].map(proj);
  return '<div class="dcard"><div class="gantt"><span></span><div class="gaxis">' + ["2026-11-01", "2026-12-01", "2027-01-01"].map(function (t) { return '<span style="left:' + pos(t) + '%">' + fmt(t, { month: "short", day: "numeric" }) + "</span>"; }).join("") + '<b style="left:' + pos(TODAYS) + '%">Today</b></div>' + ps.map(function (p) {
    var xs = T().list.filter(function (x) { return x.p === p.id && x.due && !x.parent; }), dn = xs.filter(function (x) { return x.st === "done"; }).length;
    var lo = add(xs.reduce(function (a, x) { return x.due < a ? x.due : a; }, xs[0].due), -7), hi = xs.reduce(function (a, x) { return x.due > a ? x.due : a; }, xs[0].due);
    return "<b>" + esc(p.name) + '</b><div class="gtrack"><i style="left:' + pos(lo) + "%;width:" + (pos(hi) - pos(lo)) + "%;background:" + p.color + ';opacity:.5"></i><i class="done" style="left:' + pos(lo) + "%;width:" + (pos(hi) - pos(lo)) * dn / xs.length + '%"></i>' + p.ms.map(function (m) { return '<i class="ms" style="left:calc(' + pos(m[2]) + '% - 6px)"></i>'; }).join("") + '<span class="todayline" style="left:' + pos(TODAYS) + '%"></span></div>';
  }).join("") + '</div></div><div class="grid3"><div class="dcard"><p class="dmute">Blocked</p><p class="dbig">' + T().list.filter(function (x) { return x.st === "blocked"; }).map(function (x) { return esc(x.title) + " (" + esc(x.who.join(", ")) + ")"; }).join("<br>") + '</p></div><div class="dcard"><p class="dmute">Next milestones</p><p class="dbig mtgnextms">' + (nextMilestones(2).map(function (m) { return esc(m.name) + " · " + esc(fmt(m.date)); }).join("<br>") || "None planned") + '</p></div><div class="dcard"><p class="dmute">In the shop now</p><p class="dbig">' + (D.S.cal ? D.S.cal.here.length : 0) + ' people</p></div></div><p class="dmute">Green is done, colored bars are planned, diamonds are milestones, the white line is today.</p>';
}

/* Meeting view: two lists side by side (stacked on a narrow window).
   Last practice: the last day the team met before today, from the Calendar (D.calApi.meetDays). Every top-level task
     that was due that day (whatever its state now) or was finished that day (doneOn). A row finished on or before
     that day says "Done"; one finished after it says "Done since".
   Today: every top-level task due today, in progress, blocked, overdue and not done, or finished today.
   Rows are grouped by project in the Tasks menu's order; inside a project: blocked, in progress, to do, done; then by
   title. Nothing is cut: when the rows do not fit the TV, they get denser, then the lists split into pages (lmFit). */
function lastPractice() {
  var api = D.calApi; if (!api || !api.meetDays) return null;
  var m = api.meetDays(add(TODAYS, -120), add(TODAYS, -1));
  return m.length ? m[m.length - 1].date : null;
}
var MTG_RANK = { blocked: 0, doing: 1, todo: 2, done: 3 };
function mtgSort(xs) {
  var order = []; T().divs.forEach(function (d) { d.projects.forEach(function (p) { order.push(p.id); }); });
  return order.map(function (pid) {
    return { p: proj(pid), xs: xs.filter(function (x) { return x.p === pid; }).sort(function (a, b) { return MTG_RANK[a.st] - MTG_RANK[b.st] || a.title.localeCompare(b.title, "en", { numeric: true }); }) };
  }).filter(function (g) { return g.xs.length; });
}
function mtgModel() {
  var top = T().list.filter(function (x) { return !x.parent; }), lp = lastPractice();
  var left = lp ? top.filter(function (x) { return x.due === lp || x.doneOn === lp; }) : [];
  var right = top.filter(function (x) { return x.due === TODAYS || x.st === "doing" || x.st === "blocked" || (x.due && x.due < TODAYS && x.st !== "done") || (x.st === "done" && x.doneOn === TODAYS); });
  return { lp: lp, left: left, right: right };
}
// What a task waits on: the unfinished tasks it waits on, then any part requested for it that has not arrived.
function partsFor(x) { return D.S.parts ? D.S.parts.requests.filter(function (r) { return r.task === x.title && ["needsok", "toorder", "ordered"].indexOf(r.status) >= 0; }) : []; }
function waitsOn(x) { return blockedBy(x).map(function (b) { return "“" + b.title + "”"; }).concat(partsFor(x).map(function (r) { return "the part " + r.name; })); }
function steps(x) {
  var sc = subsOf(x);
  if (sc.length) return sc.filter(function (s) { return s.st === "done"; }).length + " of " + sc.length + " steps";
  if (x.check.length) return x.check.filter(function (c) { return c[1]; }).length + " of " + x.check.length + " steps";
  return "";
}
// The state mark, as in the rest of Tasks: an empty ring (to do), a thick ring (in progress), a green tick (done), and
// for blocked a square with "!" (never colour alone; the row also says "Blocked"). A state the row does not say in
// words is read out to a screen reader (.vh).
function mtgMark(x) {
  return '<span class="mtgmark st-' + x.st + '" aria-hidden="true">' + (x.st === "done" ? D.ic("check", 14) : x.st === "blocked" ? "!" : "") + "</span>";
}
function srState(x) { return x.st === "doing" || x.st === "todo" ? '<span class="vh">' + ST[x.st][0] + ", </span>" : ""; }
function rowWrap(x, inner) {
  return rowsOpen() ? '<button class="mtgrow" data-act="mtgopen" data-v="' + x.id + '" data-tip="Open this task">' + inner + "</button>" : '<div class="mtgrow" data-v="' + x.id + '">' + inner + "</div>";
}
function mtgRow(x, side, lp) {
  var bits = [], st = "";
  if (side === "left") st = x.st === "done" ? '<b class="mtgout ok">' + (x.doneOn && x.doneOn > lp ? "Done since" : "Done") + "</b>" : '<b class="mtgout">Not finished · ' + ST[x.st][0] + "</b>";
  else if (x.st === "blocked") st = '<b class="mtgout bad">Blocked</b>';
  else if (x.st === "done") st = '<b class="mtgout ok">Done</b>';
  if (x.st === "blocked") { var w = waitsOn(x); if (w.length) bits.push('<span class="mtgwait">waits on ' + esc(w.join(", ")) + "</span>"); }
  bits.push('<span class="mtgwho">' + names(x.who) + "</span>");
  bits.push('<span class="mtgsub">' + esc(x.sub) + "</span>");
  var sp = steps(x); if (sp) bits.push('<span class="mtgsteps">' + sp + "</span>");
  var carried = side === "right" && x.due && x.due < TODAYS && x.st !== "done" ? '<span class="mtgfrom">from ' + esc(fmt(x.due)) + "</span>" : "";
  return rowWrap(x, mtgMark(x) + '<span class="mtgbody"><span class="mtgtitle">' + esc(x.title) + '</span><span class="mtgmeta">' + carried + (side === "left" ? "" : srState(x)) + (st ? st + '<span class="mtgsep"> · </span>' : "") + bits.join('<span class="mtgsep"> · </span>') + "</span></span>");
}
// A group heading, and its "(continued)" twin for a column or page that goes on with the same project.
function grpHead(p, cont) { return '<h3 class="mtgph"><i class="mtgdot" style="background:' + p.color + '"></i><span class="mtgphn">' + esc(p.name) + "</span>" + (cont ? '<span class="mtgcont"> (continued)</span>' : "") + "</h3>"; }
// Register a list for the fitting code and return its (empty) place on the page; lmFit fills it after the redraw.
function lmList(key, groups, opts) { PJ.lists[key] = { groups: groups, max: opts && opts.max || 0 }; return '<div class="mtgview" data-list="' + key + '"></div>'; }
function byProject(xs, row) { return mtgSort(xs).map(function (g) { return { head: grpHead(g.p, false), cont: grpHead(g.p, true), rows: g.xs.map(function (x) { return { id: x.id, html: row(x) }; }) }; }); }
function mtgSection(id, title, count, xs, side, empty, lp) {
  return '<section class="mtgsec" aria-labelledby="' + id + '"><div class="mtgsh"><h2 id="' + id + '">' + esc(title) + '</h2><span class="mtgcount num">' + esc(count) + "</span></div>" +
    (xs.length ? lmList(id, byProject(xs, function (x) { return mtgRow(x, side, lp); })) + '<p class="mtgelse dmute" hidden></p>' : '<p class="mtgempty">' + esc(empty) + "</p>") + "</section>";
}
// "h:mm am/pm" from "15:30"; minutes always shown ("6:00 pm").
function clock(hm) { var p = hm.split(":"), h = +p[0]; return (h % 12 || 12) + ":" + p[1] + (h < 12 ? " am" : " pm"); }
function clockSpan(a, b) { var A = clock(a), B = clock(b); return A.slice(-2) === B.slice(-2) ? A.slice(0, -3) + " to " + B : A + " to " + B; }
// The next day the team meets after today, with its times when it is a practice or build day.
function nextPractice() {
  var api = D.calApi, next = api && api.meetDays ? api.meetDays(add(TODAYS, 1), add(TODAYS, 90))[0] : null, np = next && api.practiceOn(next.date);
  return next ? "Next practice: " + fmt(next.date) + ", " + (np ? clockSpan(np.start, np.end) : next.name) : "No practice is planned";
}
// Today at a glance: short facts, each read from the app that owns it, each shown only when there is something to say.
// On a day without practice: "No practice today", the next one, and no mentors or snacks. Snacks are counts only (D151).
function glance() {
  var api = D.calApi, out = [], lp = lastPractice();
  var pr = api && api.practiceOn ? api.practiceOn(TODAYS) : null;
  if (pr) {
    out.push(["Practice", clockSpan(pr.start, pr.end)]);
    var ms = api.mentorsOn ? api.mentorsOn(TODAYS) : [];
    if (ms.length) out.push(["Mentors", ms.join(", ")]);
    // Snacks: numbers only, never a name, for every role (D151; the Calendar only tells the Task App the counts).
    var sc = api.snackCount ? api.snackCount(TODAYS) : null, tot = sc ? sc.filled + sc.open : 0;
    var spots = function (n) { return n + (n === 1 ? " spot" : " spots") + " open"; };
    if (tot) out.push(["Snacks", !sc.filled ? spots(sc.open) : sc.filled + " of " + tot + " covered" + (sc.open ? " · " + spots(sc.open) : "")]);
  } else out.push(["No practice today", "· " + nextPractice()]);
  var arr = lp && D.partsApi && D.partsApi.arrivedSince ? D.partsApi.arrivedSince(lp) : [], seen = {}, nm = [];
  arr.forEach(function (a) { if (!seen[a.name]) { seen[a.name] = 1; nm.push(a.name); } });
  if (nm.length) out.push(["Parts in since " + fmt(lp, { weekday: "short" }) + ":", nm.slice(0, 3).join(", ") + (nm.length > 3 ? ", and " + (nm.length - 3) + " more" : "")]);
  return '<ul class="mtgglance" aria-label="Today at a glance">' + out.map(function (f) { return '<li><span class="mtggl">' + esc(f[0]) + "</span> " + esc(f[1]) + "</li>"; }).join("") + "</ul>";
}
// Note for today: mentors and admins edit it in place (Enter saves, Escape cancels; the draft survives redraws while
// the Meeting view stays open); everyone else only reads it; empty is absent.
var NOTE_MAX = 140;
function noteLine() {
  var note = T().note || "", ed = noteEditor();
  if (ed && PJ.noteEdit) {
    var v = PJ.draft != null ? PJ.draft : note;
    return '<div class="mtgnote mtgnoteed"><label class="mtggl" for="mtg-note">Note for today</label><input id="mtg-note" class="mtgnotein" data-input="mtgnote" value="' + esc(v) + '" maxlength="' + NOTE_MAX + '" placeholder="One line for the meeting" aria-describedby="mtg-note-help mtg-note-count"><span id="mtg-note-count" class="dmute mtgnotec num">' + v.length + " / " + NOTE_MAX + '</span><span id="mtg-note-help" class="dmute mtgnoteh">Enter saves · Escape cancels</span><button class="btn mtgnotebtn" data-act="mtgnotesave" data-tip="Save the note">Save</button><button class="btn mtgnotebtn" data-act="mtgnotecancel" data-tip="Keep the note as it was">Cancel</button></div>';
  }
  if (!note) return ed ? '<div class="mtgnote"><button class="btn mtgnotebtn" data-act="mtgnoteedit" data-tip="Write one line for today\'s meeting; it shows on the shop screen too">Add a note for today</button></div>' : "";
  return '<div class="mtgnote"><span class="mtggl">Note</span><span class="mtgnotet">' + esc(note) + "</span>" + (ed ? '<button class="btn mtgnotebtn" data-act="mtgnoteedit" data-tip="Change the note for today\'s meeting">Edit note</button>' : "") + "</div>";
}
function meetingLists() {
  var M = mtgModel(), dn = M.left.filter(function (x) { return x.st === "done"; }).length;
  return '<div class="mtglists">' +
    mtgSection("mtg-last", "Last practice" + (M.lp ? " · " + fmt(M.lp) : ""), M.left.length ? dn + " of " + M.left.length + " done" : "", M.left, "left", "No tasks were due last practice.", M.lp) +
    mtgSection("mtg-today", "Today · " + fmt(TODAYS), M.right.length + (M.right.length === 1 ? " task" : " tasks"), M.right, "right", "Nothing is due today.", M.lp) + "</div>";
}
/* Practice view: the general display, unattended, read from across the shop. The clock and practice time (from the
   Calendar), the countdown strip, then Working on now (in progress), Needs help (blocked, and what each waits on) and
   Ready to pick up: top-level to-do tasks with nobody assigned, nothing unfinished they wait on and no part still to
   arrive; dated ones first by date, then undated. Working on now and Needs help always show every task (denser, two
   columns, then pages); Ready to pick up shows at most 6 rows (down to 3 when room is short), then "and 4 more". */
function hm(s) { var p = s.split(":"); return +p[0] * 60 + +p[1]; }
function dur(min) { var h = Math.floor(min / 60), m = min % 60; return (h ? h + " h" : "") + (h && m ? " " : "") + (m || !h ? m + " min" : ""); }
function practiceLine() {
  var api = D.calApi, pr = api && api.practiceOn ? api.practiceOn(TODAYS) : null, now = hm(NOW);
  var here = D.S.cal ? D.S.cal.here.length : 0, shop = plural(here, "person", "people") + " in the shop now";
  if (pr && now < hm(pr.end)) {
    if (now < hm(pr.start)) return "Practice " + clockSpan(pr.start, pr.end) + " · starts in " + dur(hm(pr.start) - now) + " · " + shop;
    var clean = hm(pr.end) - 15, ch = Math.floor(clean / 60), cm = ("0" + clean % 60).slice(-2);
    return "Practice until " + clock(pr.end) + " · " + dur(hm(pr.end) - now) + " left · Clean-up starts at " + clock(ch + ":" + cm) + " · " + shop;
  }
  return (pr ? "Practice is over · " : "No practice today · ") + nextPractice() + " · " + shop;
}
var READY_MAX = 6, READY_MIN = 3;
function readyList() {
  return T().list.filter(function (x) { return !x.parent && x.st === "todo" && !x.who.length && !blockedBy(x).length && !partsFor(x).length; })
    .sort(function (a, b) { return a.due && b.due ? (a.due < b.due ? -1 : a.due > b.due ? 1 : a.title.localeCompare(b.title)) : a.due ? -1 : b.due ? 1 : a.title.localeCompare(b.title); });
}
function pracRow(x, flat) {
  var bits = [];
  if (x.st === "blocked") { bits.push('<b class="mtgout bad">Blocked</b>'); var w = waitsOn(x); bits.push(w.length ? '<span class="mtgwait">waits on ' + esc(w.join(", ")) + "</span>" : '<span class="mtgwait">needs a hand</span>'); }
  if (flat) bits.push('<span class="mtgwho">' + esc(proj(x.p).name) + "</span>");
  if (x.st !== "todo") bits.push('<span class="mtgwho">' + names(x.who) + "</span>");
  bits.push('<span class="mtgsub">' + esc(x.sub) + "</span>");
  if (x.st === "todo") bits.push('<span class="mtgsub">' + (x.due ? "due " + esc(fmt(x.due)) : "no date") + "</span>");
  return rowWrap(x, mtgMark(x) + '<span class="mtgbody"><span class="mtgtitle">' + esc(x.title) + '</span><span class="mtgmeta">' + srState(x) + bits.join('<span class="mtgsep"> · </span>') + "</span></span>");
}
function pracPanel(id, title, sub, body, empty, extra) {
  return '<section class="mtgsec mtgpsec" aria-labelledby="' + id + '"><div class="mtgsh"><h2 id="' + id + '">' + esc(title) + '</h2><span class="mtgcount">' + esc(sub) + "</span></div>" + (body || '<p class="mtgempty">' + esc(empty) + "</p>") + (extra || "") + "</section>";
}
function practiceView() {
  var top = T().list.filter(function (x) { return !x.parent; });
  var doing = top.filter(function (x) { return x.st === "doing"; }), blocked = mtgSort(top.filter(function (x) { return x.st === "blocked"; })).reduce(function (a, g) { return a.concat(g.xs); }, []), R = readyList();
  var flat = function (xs) { return [{ head: "", cont: "", rows: xs.map(function (x) { return { id: x.id, html: pracRow(x, true) }; }) }]; };
  return pjHead(clock(NOW), "practice", esc(practiceLine())) + countdown() + '<div class="mtgp3">' +
    pracPanel("pr-now", "Working on now", plural(doing.length, "task"), doing.length ? lmList("pr-now", byProject(doing, function (x) { return pracRow(x, false); })) + '<p class="mtgelse dmute" hidden></p>' : "", "Nothing is in progress.") +
    pracPanel("pr-help", "Needs help", plural(blocked.length, "task"), blocked.length ? lmList("pr-help", flat(blocked)) + '<p class="mtgelse dmute" hidden></p>' : "", "Nothing is blocked.") +
    pracPanel("pr-ready", "Ready to pick up", R.length ? plural(R.length, "task") + ", nobody on them" : "", R.length ? lmList("pr-ready", flat(R), { max: READY_MAX }) : "", "Nothing is waiting for a person. Ask a mentor what is next.", R.length ? '<p class="mtgelse dmute mtgmore" hidden></p>' : "") + "</div>";
}

/* ---------- Fitting the lists to the window (both views) ----------
   A list is a set of groups (a project heading and its rows; Needs help and Ready have no headings). On a wide window
   (1024 px and up) the lists must end above the bottom of the window. Each density step is tried in turn (0: as large
   as the Projector's body text; 1: smaller; 2: two columns; 3 and 4: smaller still). A list is packed into columns and
   pages by rows: a group that goes on in the next column or on the next page repeats its heading with "(continued)";
   a group is kept whole in one column when that costs no extra page; the last two pages are balanced so no page holds a
   lone row when that can be avoided. If even step 4 needs more than one page, the view turns pages ("1 / 3", the
   arrow keys, two buttons; the Display role every 20 s). On a narrow window the lists stack and the page scrolls. */
var MTG_WIDE = "(min-width: 1024px)", MTG_STEPS = 5, LM_GAP = 6, LM_COLGAP = 24, LM_PADTOP = 6, LM_MINCOL = 240;
function lmEl(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
function lmMeasure(view, L, ncols) {
  var W = view.clientWidth, colW = (W - LM_COLGAP * (ncols - 1)) / ncols;
  view.innerHTML = ""; view.style.gridTemplateColumns = colW + "px";
  var col = document.createElement("div"); col.className = "mtgcol"; view.appendChild(col);
  var h = function (html) { var e = lmEl(html); col.appendChild(e); return e.getBoundingClientRect().height; };
  var M = L.groups.map(function (g) { return { hh: g.head ? h(g.head) : 0, ch: g.head ? h(g.cont) : 0, rh: g.rows.map(function (r) { return h(r.html); }) }; });
  view.innerHTML = "";
  return M;
}
// Pack the rows into pages of ncols columns, each at most capH tall. limits: optional { pageIndex: most rows }.
function lmPack(L, M, capH, ncols, whole, limits) {
  var pages = [], page, col, used;
  function newPage() { page = { cols: [], rows: 0 }; pages.push(page); newCol(true); }
  function newCol(fresh) { if (!fresh && page.cols.length >= ncols) { newPage(); return; } col = { items: [], g: -1 }; page.cols.push(col); used = 0; }
  newPage();
  L.groups.forEach(function (g, gi) {
    var m = M[gi], total = m.hh + m.rh.reduce(function (a, b) { return a + b; }, 0);
    if (whole && g.head && col.items.length && used + LM_GAP + total > capH && total <= capH) newCol(false);
    g.rows.forEach(function (r, ri) {
      var lim = limits && limits[pages.length - 1];
      if (lim != null && page.rows >= lim) newPage();
      var head = !!g.head && col.g !== gi, need = m.rh[ri] + (head ? (ri ? m.ch : m.hh) + (col.items.length ? LM_GAP : 0) : 0);
      if (col.items.length && used + need > capH) { newCol(false); head = !!g.head; need = m.rh[ri] + (head ? (ri ? m.ch : m.hh) : 0); }
      if (head) { col.items.push({ h: gi, cont: ri > 0 }); col.g = gi; }
      col.items.push({ r: [gi, ri] }); used += need; page.rows++;
    });
  });
  return pages;
}
function lmLayout(L, M, capH, ncols) {
  var byRows = lmPack(L, M, capH, ncols, false), whole = lmPack(L, M, capH, ncols, true), useWhole = whole.length <= byRows.length, pages = useWhole ? whole : byRows, n = pages.length;
  if (n > 1 && pages[n - 1].rows < 2) {
    var R = pages[n - 2].rows + pages[n - 1].rows, lim = {};
    if (R >= 3) { lim[n - 2] = Math.ceil(R / 2); var p2 = lmPack(L, M, capH, ncols, useWhole, lim); if (p2.length === n) pages = p2; }
  }
  return pages;
}
function lmAll(L) { var items = []; L.groups.forEach(function (g, gi) { g.rows.forEach(function (r, ri) { if (!ri && g.head) items.push({ h: gi, cont: false }); items.push({ r: [gi, ri] }); }); }); return { cols: [{ items: items }], rows: items.length }; }
function lmRender(view, L, page, ncols) {
  view.innerHTML = ""; view.style.gridTemplateColumns = "repeat(" + ncols + ", minmax(0, 1fr))";
  if (!page) return;
  page.cols.forEach(function (c) {
    var col = document.createElement("div"); col.className = "mtgcol";
    c.items.forEach(function (it) { var g = L.groups["h" in it ? it.h : it.r[0]]; col.appendChild(lmEl("h" in it ? (it.cont ? g.cont : g.head) : g.rows[it.r[1]].html)); });
    view.appendChild(col);
  });
}
// The bottom a section's content must stay above, and the room its list has.
function lmLimit(scr, sec) { var cs = getComputedStyle(sec); return window.innerHeight - (parseFloat(getComputedStyle(scr).paddingBottom) || 0) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth); }
function lmCap(scr, view, below) { return lmLimit(scr, view.closest(".mtgsec")) - view.getBoundingClientRect().top - LM_PADTOP - (below || 0) - 2; }
function lmOver(scr, view) { var sec = view.closest(".mtgsec"), last = sec.lastElementChild; while (last && last.hidden) last = last.previousElementSibling; var b = Math.max(view.getBoundingClientRect().bottom, last ? last.getBoundingClientRect().bottom : 0); return b - lmLimit(scr, sec); }
// A plan for one list at the current density: its pages. Re-measured and repacked if the drawn page runs over.
function lmPlan(scr, view, ncols, below) { var L = PJ.lists[view.dataset.list], M = lmMeasure(view, L, ncols); return { view: view, L: L, M: M, ncols: ncols, cap: lmCap(scr, view, below), pages: null }; }
function lmPages(p) { p.pages = lmLayout(p.L, p.M, p.cap, p.ncols); return p.pages.length; }
function lmShow(p, i) {
  var e = p.view.parentNode.querySelector(".mtgelse");
  lmRender(p.view, p.L, p.pages[i], p.ncols);
  if (e) { e.hidden = i < p.pages.length; e.textContent = "All shown on " + (p.pages.length === 1 ? "page 1." : "pages 1 to " + p.pages.length + "."); }
}
function lmViews(scr, sel) { return Array.prototype.slice.call(scr.querySelectorAll(sel)).filter(function (v) { return PJ.lists[v.dataset.list]; }); }
function pjFit() {
  var scr = document.querySelector(".mtgscreen"); if (!scr) return;
  // The screen fills the window below the demo strip, so a TV shows no strip of page colour and no scroll bar.
  scr.style.minHeight = Math.max(0, window.innerHeight - (scr.getBoundingClientRect().top + window.scrollY)) + "px";
  var pv = scr.dataset.pv; if (pv !== "meeting" && pv !== "practice") return;
  var pager = scr.querySelector(".mtgpager"), before = PJ.pages;
  pager.hidden = true;
  scr.querySelectorAll(".mtgelse").forEach(function (e) { e.hidden = true; });
  var ready = pv === "practice" ? lmViews(scr, '.mtgview[data-list="pr-ready"]')[0] : null, more = scr.querySelector(".mtgmore");
  var main = lmViews(scr, pv === "meeting" ? ".mtglists .mtgview" : '.mtgview[data-list="pr-now"], .mtgview[data-list="pr-help"]');
  var R = ready ? PJ.lists["pr-ready"] : null;
  function showReady(n) {
    if (!ready) return;
    var L = { groups: [{ head: "", cont: "", rows: R.groups[0].rows.slice(0, n) }] }, rest = R.groups[0].rows.length - n;
    lmRender(ready, L, lmAll(L), 1); more.hidden = rest <= 0; more.textContent = rest > 0 ? "and " + rest + " more" : "";
  }
  function done(pages) {
    PJ.pages = pages; if (PJ.page >= pages) PJ.page = 0;
    if (pages > 1 && before < 2) PJ.turned = Date.now();
    pager.querySelector(".mtgpgn").textContent = (PJ.page + 1) + " / " + pages;
  }
  if (!window.matchMedia(MTG_WIDE).matches) {
    scr.dataset.dense = "0";
    main.forEach(function (v) { var L = PJ.lists[v.dataset.list]; lmRender(v, L, lmAll(L), 1); });
    showReady(READY_MAX); done(1); return;
  }
  // Two columns from step 2 (in Practice, only Working on now), when each column is still at least 240 px wide.
  var ncolsFor = function (v, d) { return d >= 2 && (pv === "meeting" || v.dataset.list === "pr-now") && (v.clientWidth - LM_COLGAP) / 2 >= LM_MINCOL ? 2 : 1; };
  for (var d = 0; d < MTG_STEPS; d++) {
    scr.dataset.dense = String(d);
    var plans = main.map(function (v) { return lmPlan(scr, v, ncolsFor(v, d)); });
    if (!plans.every(function (p) { return lmPages(p) === 1; })) continue;
    plans.forEach(function (p) { lmShow(p, 0); });
    if (plans.some(function (p) { return lmOver(scr, p.view) > 0.5; })) continue;
    if (ready) {
      var n = Math.min(READY_MAX, R.groups[0].rows.length), lo = Math.min(READY_MIN, n);
      for (; n >= lo; n--) { showReady(n); if (lmOver(scr, ready) <= 0.5) break; }
      if (n < lo) { if (d < MTG_STEPS - 1) continue; showReady(lo); }
    }
    done(1); return;
  }
  // Pages, at the densest step. The pager shows first, since it can make the header taller.
  pager.hidden = false;
  if (ready) showReady(Math.min(READY_MIN, R.groups[0].rows.length));
  // One packing for all pages: every page is drawn and checked against the window; if any runs over (a measuring
  // difference), the room is cut and everything is packed again, so no row can fall between two pages.
  var cut = 0, all, n2;
  for (var tries = 0; tries < 4; tries++) {
    all = main.map(function (v) { var p = lmPlan(scr, v, ncolsFor(v, MTG_STEPS - 1)); p.cap -= cut; lmPages(p); return p; });
    n2 = Math.max.apply(null, all.map(function (p) { return p.pages.length; }).concat([1]));
    var over = 0;
    for (var i = 0; i < n2; i++) { all.forEach(function (p) { lmShow(p, i); }); over = Math.max.apply(null, [over].concat(all.map(function (p) { return lmOver(scr, p.view); }))); }
    if (over <= 0.5) break;
    cut += over + 4;
  }
  if (PJ.page >= n2) PJ.page = 0;
  all.forEach(function (p) { lmShow(p, PJ.page); });
  done(Math.max.apply(null, all.map(function (p) { return p.pages.length; }).concat([1])));
}
/* Focus: the Projector redraws itself (page turns, rotation, the clock); the control that had the focus gets it back.
   A row that left the screen with its page hands the focus to the Next page button. */
function pjKey(el) {
  if (!el || !el.closest || !el.closest(".mtgscreen")) return null;
  if (el.id) return { id: el.id };
  var a = el.getAttribute("data-act"); return a ? { act: a, v: el.getAttribute("data-v") } : null;
}
function pjRefocus(k) {
  if (!k || D.S.route !== "projector" || D.S.drawer || D.S.modal) return;
  var a = document.activeElement; if (a && a !== document.body && a !== document.documentElement) return;
  var el = k.id ? document.getElementById(k.id) : document.querySelector('.mtgscreen [data-act="' + k.act + '"]' + (k.v != null ? '[data-v="' + k.v + '"]' : ""));
  if ((!el || !el.getClientRects().length) && k.act === "mtgopen") el = document.querySelector(".mtgpager:not([hidden]) .mtgnext");
  if (el && el.getClientRects().length) el.focus({ preventScroll: true });
}
var coreRender = D.render;
D.render = function () { var k = pjKey(document.activeElement), r = coreRender.apply(this, arguments); pjRefocus(k); return r; };
D.after.push(function () {
  if (D.S.route !== "projector") { PJ.noteEdit = false; PJ.draft = null; return; }
  pjFit();
  // Back from a task panel opened on a row: the focus returns to that row.
  if (PJ.focus != null && !D.S.drawer) { var r = document.querySelector('.mtgrow[data-v="' + PJ.focus + '"]'); PJ.focus = null; if (r) r.focus(); }
});
// A new window size (F11 on the TV, a resized window) refits at once, without a redraw.
var pjResize = 0;
window.addEventListener("resize", function () {
  if (!D.S || D.S.route !== "projector" || pjResize) return;
  pjResize = requestAnimationFrame(function () { pjResize = 0; var k = pjKey(document.activeElement); pjFit(); pjRefocus(k); });
});
function mtgTurn(dir, byHand) {
  if (PJ.pages < 2) return;
  PJ.page = (PJ.page + dir + PJ.pages) % PJ.pages; PJ.turned = Date.now(); if (byHand) PJ.manual = Date.now();
  D.render();
}
function mtgOn() { var v = pjShown(); return D.S.route === "projector" && (v === "meeting" || v === "practice") && (lead() || D.S.role === "display"); }
D.acts.mtgpage = function (b) { mtgTurn(+b.dataset.v, true); };
D.acts.mtgnoteedit = function () { PJ.noteEdit = true; PJ.draft = T().note || ""; D.render(); var i = document.getElementById("mtg-note"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
D.inputs.mtgnote = function (el) { PJ.draft = el.value; var c = document.getElementById("mtg-note-count"); if (c) c.textContent = el.value.length + " / " + NOTE_MAX; };
function noteDone(save) { if (save && PJ.draft != null) T().note = PJ.draft.trim(); PJ.noteEdit = false; PJ.draft = null; D.render(); var b = document.querySelector('[data-act="mtgnoteedit"]'); if (b) b.focus(); }
D.acts.mtgnotesave = function () { noteDone(true); };
D.acts.mtgnotecancel = function () { noteDone(false); };
document.addEventListener("keydown", function (e) { if (e.target && e.target.id === "mtg-note") { if (e.key === "Enter") { e.preventDefault(); noteDone(true); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); noteDone(false); } } }, true);
D.acts.mtgproj = function (b) { var tt = T(); tt.expanded[b.dataset.v] = true; tt.at = { v: "project", p: b.dataset.v }; tt.mopen = false; D.go("tasks"); };
D.acts.mtgopen = function (b) { PJ.focus = b.dataset.v; D.openDrawer("task", { id: b.dataset.v }); };
D.acts.pjview = function (b) { var v = b.dataset.v; PJ.rotAt = Date.now(); if (pjShown() === v) return; D.setPref("projview", v); PJ.rot = null; PJ.page = 0; D.render(); };
// Left and Right arrows turn the page (not while typing, or while a panel or dialog is open).
document.addEventListener("keydown", function (e) {
  if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || !mtgOn() || D.S.drawer || D.S.modal || PJ.pages < 2) return;
  var t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
  e.preventDefault(); mtgTurn(e.key === "ArrowLeft" ? -1 : 1, true);
});
D.acts.pjrotate = function () {
  var on = !rotOn(); if (!on) D.setPref("projview", pjShown());
  D.setPref("projrotate", on); PJ.rot = null; PJ.rotAt = Date.now(); D.render();
};
// A key press or a pointer move anywhere holds the rotation and the automatic page turn for a minute.
["keydown", "pointermove", "pointerdown", "wheel", "touchstart"].forEach(function (k) { document.addEventListener(k, function () { PJ.input = Date.now(); }, { capture: true, passive: true }); });
setInterval(function () {
  if (!D.S || D.S.route !== "projector") return;
  var now = Date.now(), quiet = now - Math.max(PJ.manual, PJ.input) >= 60000;
  // The Display role turns the page by itself every 20 seconds, after a minute with no key press or pointer move.
  if (D.S.role === "display" && mtgOn() && PJ.pages > 1 && !D.S.drawer && quiet && now - PJ.turned >= 20000) { mtgTurn(1, false); return; }
  // Rotation: the Practice view and the Build plan take turns every 45 s, unless someone pressed a key or moved the
  // pointer in the last 60 s, or a panel or dialog is open. With reduced motion the change has no fade.
  var v = pjView();
  if (!rotOn() || (v !== "practice" && v !== "plan") || D.S.drawer || D.S.modal || !(lead() || D.S.role === "display")) { PJ.rotAt = 0; return; }
  if (!PJ.rotAt) { PJ.rotAt = now; return; }
  if (now - PJ.rotAt >= 45000 && now - PJ.input >= 60000) {
    PJ.rot = pjShown() === "practice" ? "plan" : "practice"; PJ.rotAt = now; PJ.page = 0;
    PJ.fade = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    D.render();
  }
}, 1000);

/* ---------- Actions ---------- */
var A = D.acts;
// Every change of state goes through here, so a task marked done anywhere gets the day it was finished (doneOn), and
// a task taken out of Done loses it. The Projector's Meeting view reads it.
function setSt(x, s) { if (s === "done" && x.st !== "done") x.doneOn = TODAYS; else if (s !== "done") x.doneOn = null; x.st = s; }
function h(x, what, snap) { x.hist.push([D.me().name, what, "Just now", snap || { st: x.st, due: x.due }]); }
function at(v) { T().at = v; T().mopen = false; D.S.drawer = null; D.render(); }
A.tgo = function (b) { at({ v: b.dataset.v }); };
// Open or close a division or project row; focus stays on its caret, and the chart keeps its sideways scroll.
A.tlrow = function (b) { var r = tlRows(), k = b.dataset.k, v = b.dataset.v; r[k][v] = !r[k][v]; D.setPref("tlrows", r); D.render(); var c = document.querySelector('.tlcaret[data-k="' + k + '"][data-v="' + v + '"]'); if (c) c.focus({ preventScroll: true }); };
// Open all: every division and project. Close all: every project (the divisions stay open, so the projects show).
A.tlall = function () { var M = tlModel(), r = tlRows(), open = tlAnyClosed(M, r); Object.keys(r.proj).forEach(function (p) { r.proj[p] = open; }); Object.keys(r.div).forEach(function (d) { r.div[d] = true; }); D.setPref("tlrows", r); D.render(); var c = document.querySelector(".tlall"); if (c) c.focus({ preventScroll: true }); };
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
A.tdone = function (b) { var x = task(b.dataset.v), prev = x.st, prevOn = x.doneOn; if (x.st === "done") { setSt(x, "todo"); h(x, "reopened it"); D.render(); return; } D.withUndo("Done: " + x.title, function () { setSt(x, "done"); h(x, "marked it done"); D.log("finished “" + x.title + "”", "tasks"); }, function () { x.st = prev; x.doneOn = prevOn; x.hist.pop(); D.S.activity.shift(); }); };
A.tstuck = function (b) { var x = task(b.dataset.v); setSt(x, "blocked"); h(x, "said they're stuck"); x.comments.push([D.me().name, "I'm stuck and need a hand.", "Just now"]); D.notify("mentor", "tasks", D.me().name + " is stuck on “" + x.title + "”."); D.toast("Ms. Rivera (" + proj(x.p).name + " mentor) was told. Your note is on the task."); D.render(); };
A.tpart = function (b) { var x = task(b.dataset.v); D.partsApi.startRequest({ task: x.title, sub: proj(x.p).name, need: x.due, catalogName: /bearing/i.test(x.title) ? "Bearing" : /polycarb/i.test(x.title) ? "Polycarbonate" : /CAN|crimp/i.test(x.title) ? "Andersen" : /shaft/i.test(x.title) ? "MAXSpline" : "", from: "Tasks" }); };
A.ttake = function (b) { var x = task(b.dataset.v); x.who.push(me()); h(x, "took it"); D.log("took “" + x.title + "”", "tasks"); D.render(); };
D.changes.tassign = function (el) { if (!el.value) return; var x = task(el.dataset.v); x.who.push(el.value); h(x, "assigned " + el.value); if (el.value === ME_STUDENT) D.notify("student", "tasks", D.me().name + " assigned you “" + x.title + "”."); D.render(); };
A.tunassign = function (b) { var x = task(b.dataset.v); x.who = x.who.filter(function (w) { return w !== b.dataset.w; }); h(x, "removed " + b.dataset.w); D.render(); };
A.tset = function (b) { var x = task(b.dataset.v), s = b.dataset.s; if (x.st === s) return; h(x, "moved it to " + ST[s][0], { st: s, due: x.due }); setSt(x, s); D.render(); };
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
A.tback = function (b) { var x = task(b.dataset.v), snap = x.hist[+b.dataset.i][3], prev = { st: x.st, due: x.due }; setSt(x, snap.st); x.due = snap.due; x.hist.push([D.me().name, "went back to " + x.hist[+b.dataset.i][2], "Just now", prev]); D.toast("Put back to how it was then. That's in the history too."); D.render(); };
A.tarchive = function (b) { var x = task(b.dataset.v), tt = T(), i = tt.list.indexOf(x); D.S.drawer = null; D.withUndo("Archived “" + x.title + "”", function () { tt.list.splice(i, 1); }, function () { tt.list.splice(i, 0, x); }); };
A.tnew = function () { D.openModal("tnew", {}); };
A.tnewin = function (b) { D.openModal("tnew", { p: b.dataset.p, s: b.dataset.s, m: b.dataset.m || null, st: b.dataset.st }); };
D.changes.tnewp = function (el) { D.S.modal.data.p = el.value; D.S.modal.data.s = null; D.render(); };
A.tnewgo = function (b) { var tt = T(), p = D.val("tn-p"), x = { id: tt.nextId++, title: D.val("tn-title"), p: p, sub: D.val("tn-sub"), ms: D.val("tn-ms") || null, who: D.val("tn-who") === "Me" ? [me()] : [], due: D.val("tn-due"), st: b.dataset.st || "todo", doneOn: b.dataset.st === "done" ? TODAYS : null, parent: null, labels: [], est: null, by: [], rel: [], links: [], desc: "", check: [], comments: [], hist: [[D.me().name, "created it", "Just now", { st: "todo", due: D.val("tn-due") }]] }; tt.list.push(x); D.S.modal = null; D.log("added “" + x.title + "”", "tasks"); D.toast("Added to " + proj(p).name + " › " + x.sub + "."); D.render(); };
D.inputs.taddtxt = function () {};
A.tquick = function (b) { var v = D.val("t-add").trim(); if (!v) return; var tt = T(); tt.list.push({ id: tt.nextId++, title: v, p: b.dataset.p, sub: b.dataset.s, ms: null, who: [], due: "", st: "todo", parent: null, labels: [], est: null, by: [], rel: [], links: [], desc: "", check: [], comments: [], hist: [[D.me().name, "created it", "Just now", { st: "todo", due: "" }]] }); D.render(); };
document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.id === "t-add") { var b = document.querySelector('[data-act="tquick"]'); if (b) A.tquick(b); } if (e.key === "Enter" && e.target.id === "tc-in") A.tsend(); });
A.tsaves = function () { D.openDrawer("tsaves"); };
A.tsavenow = function () { T().saves.unshift({ name: "Saved by " + D.me().short, when: "Nov 10, 3:50 pm", by: D.me().name }); D.render(); };
A.trestore = function (b) { D.openModal("trestore", { i: +b.dataset.i }); };
A.trestorego = function () { var x = task(1), y = T().list.filter(function (t) { return t.title === "Intake roller shafts"; })[0]; x.due = "2026-11-14"; setSt(y, "todo"); T().saves.unshift({ name: "Before restoring", when: "Nov 10, 3:51 pm", by: "automatic" }); D.S.modal = null; D.S.drawer = null; D.log("restored Intake to a save point", "tasks"); D.toast("Restored. A save point from just before is there if you change your mind."); D.render(); };
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
D.changes.tcol = function (el) { if (!el.value) return; var x = task(el.dataset.v); h(x, "moved it to " + ST[el.value][0], { st: el.value, due: x.due }); setSt(x, el.value); D.render(); };
var dragTask = null;
document.addEventListener("dragstart", function (e) { var c = e.target.closest && e.target.closest("[data-task]"); if (!c) return; dragTask = +c.dataset.task; try { e.dataTransfer.setData("text/plain", String(dragTask)); } catch (x) {} });
document.addEventListener("dragover", function (e) { var c = e.target.closest && e.target.closest("[data-col]"); if (c && dragTask) { e.preventDefault(); c.classList.add("over"); } });
document.addEventListener("dragleave", function (e) { var c = e.target.closest && e.target.closest("[data-col]"); if (c) c.classList.remove("over"); });
document.addEventListener("drop", function (e) { var c = e.target.closest && e.target.closest("[data-col]"); if (!c || !dragTask) return; e.preventDefault(); var x = task(dragTask); if (x.st !== c.dataset.col) { h(x, "moved it to " + ST[c.dataset.col][0], { st: c.dataset.col, due: x.due }); setSt(x, c.dataset.col); } dragTask = null; D.render(); });
})();
