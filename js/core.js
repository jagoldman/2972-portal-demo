/* Shared shell: state, app bar, routing, drawers, toasts and the event wiring every app uses. */
(function () {
"use strict";
var D = window.D = { views: {}, acts: {}, inits: [], drawers: {}, modals: {}, changes: {}, inputs: {}, after: [] };

var ICON = {
  apps: "M5 5h.01M12 5h.01M19 5h.01M5 12h.01M12 12h.01M19 12h.01M5 19h.01M12 19h.01M19 19h.01",
  home: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  calendar: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4",
  snacks: "M12 3a9 9 0 1 0 9 9 4 4 0 0 1-4-4 4 4 0 0 1-5-5zM8.5 9h.01M10 14.5h.01M15 15h.01",
  parts: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  skills: "M6 3v6M6 15v6M18 9v6M6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 12h6",
  schedule: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  pit: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  scouting: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  onshape: "M12 2l9 5v10l-9 5-9-5V7zM12 12l9-5M12 12v10M12 12L3 7",
  github: "M9 19c-4 1.5-4-2-6-2m12 4v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.8 1.8 5.8 2.1 5.8 2.1a4.2 4.2 0 0 0-.1 3.2 4.6 4.6 0 0 0-1.3 3.2c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21",
  drive: "M8 3h8l6 11-4 7H6l-4-7zM2 14h20M8 3l6 11",
  handbook: "M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  admin: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  projector: "M3 5h18v11H3zM8 21h8M12 16v5",
  menu: "M4 6h16M4 12h16M4 18h16",
  check: "M5 12l5 5 9-10",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  plus: "M12 5v14M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  folder: "M3 6h6l2 2h10v11H3z",
  robot: "M5 9h14v10H5zM9 9V5h6v4M9 14h.01M15 14h.01M3 13v3M21 13v3",
  history: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2",
  undo: "M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  chevron: "M9 6l6 6-6 6",
  trace: "M12 19l7-7 3 3-7 7zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18zM2 2l7.6 7.6M11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM10.3 3h3.4l.5 2.4 1.7.7 2-1.4 2.4 2.4-1.4 2 .7 1.7 2.4.5v3.4l-2.4.5-.7 1.7 1.4 2-2.4 2.4-2-1.4-1.7.7-.5 2.4h-3.4l-.5-2.4-1.7-.7-2 1.4-2.4-2.4 1.4-2-.7-1.7L3 13.7v-3.4l2.4-.5.7-1.7-1.4-2 2.4-2.4 2 1.4 1.7-.7z",
  camera: "M3 8h4l2-3h6l2 3h4v11H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  editor: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  calc: "M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"
};
D.ICON = ICON;
D.ic = function (name, size) { size = size || 20; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (ICON[name] || ICON.more) + '"/></svg>'; };
D.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
D.money = function (c) { var neg = c < 0; c = Math.abs(Math.round(c)); var s = "$" + Math.floor(c / 100).toLocaleString("en-US") + "." + ("0" + (c % 100)).slice(-2); return neg ? "−" + s : s; };
D.pct = function (a, b) { return b ? Math.round(100 * a / b) : 0; };
var esc = D.esc;

D.ROLES = {
  student: { name: "Sam Ortiz", short: "Sam", groups: ["student"], label: "Student" },
  mentor: { name: "Ms. Rivera", short: "Ms. Rivera", groups: ["mentor"], label: "Mentor" },
  admin: { name: "Mr. Okafor", short: "Mr. Okafor", groups: ["admin"], label: "Admin" },
  parent: { name: "Pat Ortiz", short: "Pat", groups: ["parent"], label: "Parent" },
  display: { name: "Shop screen", short: "Shop screen", groups: ["display"], label: "Display" }
};
var ALL = ["admin", "mentor", "student", "parent"], BUILDERS = ["admin", "mentor", "student"];
D.TILES = [
  { id: "tasks", name: "Tasks", icon: "tasks", svc: "tasks.", desc: "Your next task, projects and the build plan.", modes: ["build", "competition"], groups: ALL },
  { id: "calendar", name: "Calendar", icon: "calendar", svc: "calendar.", desc: "Practices, attendance and snacks.", modes: ["build", "competition"], groups: ALL },
  { id: "parts", name: "Parts & Inventory", icon: "parts", svc: "parts.", desc: "Request parts, check orders in, find spares.", modes: ["build", "competition"], groups: BUILDERS },
  { id: "skills", name: "Skills", icon: "skills", svc: "skills.", desc: "Training trees that unlock step by step.", modes: ["build"], groups: BUILDERS },
  { id: "schedule", name: "Schedule", icon: "schedule", svc: "compete./schedule", desc: "Who does which role at the event.", modes: ["competition"], groups: BUILDERS },
  { id: "pit", name: "Pit", icon: "pit", svc: "compete./pit", desc: "Match checklists, issues and batteries.", modes: ["competition"], groups: BUILDERS },
  { id: "scouting", name: "Scouting", icon: "scouting", svc: "compete./scouting", desc: "Match forms, assignments, stats and pick list.", modes: ["competition"], groups: BUILDERS },
  { id: "onshape", name: "Onshape", icon: "onshape", svc: "link", desc: "Robot CAD.", modes: ["build"], groups: BUILDERS, more: true, ext: true },
  { id: "github", name: "GitHub", icon: "github", svc: "link", desc: "Robot code for every season.", modes: ["build"], groups: BUILDERS, more: true, ext: true },
  { id: "drive", name: "Team Drive", icon: "drive", svc: "link", desc: "Shared files.", modes: ["build"], groups: BUILDERS, more: true, ext: true },
  { id: "admin", name: "Admin", icon: "admin", svc: "admin.", desc: "Approve accounts and manage groups.", modes: ["build", "competition"], groups: ["admin"], adm: true, ext: true },
  { id: "editor", name: "Website editor", icon: "editor", svc: "editor.", desc: "Edit the public website, preview, then publish.", modes: ["build", "competition"], groups: ["admin", "mentor"], adm: true, ext: true },
  { id: "handbook", name: "Team Handbook", icon: "handbook", svc: "link", desc: "Student, family and mentor handbook.", modes: ["build"], groups: ALL, more: true, ext: true }
];
/* Tools: small helpers that open inside the site, in the same tab. They are not apps and not link-outs, so they get
   their own closed group under Apps. Adding a tool adds one row here and one page in js/tools.js, never a new tile. */
D.TOOLS = [
  { id: "tool-trace", name: "Drawing to vector", icon: "trace", line: "A photo of a drawing becomes a laser or CAD file.", tip: "Make an SVG for the laser and a DXF for Onshape, at true size.", modes: ["build", "competition"], groups: BUILDERS },
  { id: "tool-gear", name: "Gear and sprocket finder", icon: "gear", line: "A photo and one measurement name the part.", tip: "Work out gear pitch, chain size or belt profile, then find it in Parts.", modes: ["build", "competition"], groups: BUILDERS }
];
/* ---------- Ground up helpers (GROUND_UP.md §5), shared by every app file ---------- */
// How many practices are left from today up to and including a date ("2026-11-14"). null when it cannot be known
// (no calendar, or the date is past). Rule 4: count in practices beside the date.
D.practicesLeft = function (date) {
  var api = D.calApi; if (!api || !api.meetDays || !date || date < api.TODAYS) return null;
  return api.meetDays(api.TODAYS, date).length;
};
D.practicesText = function (date) { var n = D.practicesLeft(date); return n == null ? "" : n === 0 ? "no practice before then" : n === 1 ? "1 practice left" : n + " practices left"; };
// A row of steps: the ones before `cur` are done, `cur` is where it is now. steps: [label] or [[label, small line]].
// Rule 2 goes with it: say whose move it is with D.move().
D.stages = function (steps, cur, label) {
  return '<ol class="stages" aria-label="' + esc(label || "Progress") + '">' + steps.map(function (st, i) {
    var name = Array.isArray(st) ? st[0] : st, sub = Array.isArray(st) ? st[1] : "";
    return '<li class="' + (i < cur ? "done" : i === cur ? "now" : "todo") + '"' + (i === cur ? ' aria-current="step"' : "") + "><b>" + esc(name) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</li>";
  }).join("") + "</ol>";
};
// "Waiting on Ms. Rivera" or "Your move". who: a name or a role ("a mentor"); mine: true when it is this person.
D.move = function (who, mine) { return '<span class="move' + (mine ? " mine" : "") + '">' + (mine ? "Your move" : "Waiting on " + esc(who)) + "</span>"; };
D.tool = function (id) { return D.TOOLS.filter(function (t) { return t.id === id; })[0]; };
D.isToolRoute = function (r) { return r === "tools" || !!D.tool(r); };
// Calculators (t.calc, js/calcs.js) are new in the 8.3 proposal, so the Live version does not list them.
D.visibleTools = function () { return D.TOOLS.filter(function (t) { return D.inGroup(t) && t.modes.indexOf(D.S.mode) >= 0 && !(t.calc && D.design() === "live"); }); };
/* The Calendar app has three tabs. Who sees each one is what the Attendance and Snacks tiles used to say. */
D.CALTABS = [
  { id: "calendar", name: "Calendar", modes: ["build", "competition"], groups: ALL },
  { id: "here", name: "Attendance", modes: ["build", "competition"], groups: BUILDERS },
  { id: "snacks", name: "Snacks", modes: ["build"], groups: ["admin", "mentor", "parent"] }
];
/* Old routes for the tabs. The tab ids are also the old tile ids, so #here and #snacks still work. */
D.ROUTE_TAB = { here: "calendar", snacks: "calendar" };
D.APPNAME = { portal: "Portal", account: "Account", kiosk: "Door QR", monitor: "Pit monitor", projector: "Projector", tools: "Tools" };
D.TILES.forEach(function (t) { D.APPNAME[t.id] = t.name; });
D.TOOLS.forEach(function (t) { D.APPNAME[t.id] = "Tools"; });
D.DISPLAY_ROUTES = { kiosk: 1, monitor: 1, projector: 1 };

/* Choices a person makes about the page itself, not sample data: which groups are open, how far they are in the
   guide, whether they hid it. The demo keeps them in this browser, per role; Reset in the demo strip clears them too,
   so a presenter starts clean. The real site keeps them the way it keeps theme and mode. */
var SAVE_KEY = "demo2972.saved.v1";
D.saved = (function () { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } })();
D.pref = function (k, def) { var r = D.saved[D.S.role] || {}; return Object.prototype.hasOwnProperty.call(r, k) ? r[k] : def; };
D.setPref = function (k, v) { (D.saved[D.S.role] = D.saved[D.S.role] || {})[k] = v; try { localStorage.setItem(SAVE_KEY, JSON.stringify(D.saved)); } catch (e) {} };
D.reset = function () {
  var prev = D.S || {};
  var S = D.S = {
    role: prev.role || "student", mode: "build", eventDay: false, route: prev.route || "portal", bell: false, appsOpen: false,
    toast: null, drawer: null, modal: null, tabs: {}, ui: {},
    notices: [], activity: []
  };
  D.inits.forEach(function (f) { f(S); });
};
D.me = function () { return D.ROLES[D.S.role]; };
D.isStaff = function () { return D.S.role === "mentor" || D.S.role === "admin"; };
D.tile = function (id) { return D.TILES.filter(function (t) { return t.id === id; })[0]; };
D.calTabs = function () { return D.CALTABS.filter(function (t) { return t.groups.some(function (g) { return D.me().groups.indexOf(g) >= 0; }) && t.modes.indexOf(D.S.mode) >= 0; }); };
D.calTab = function (id) { return D.calTabs().some(function (t) { return t.id === id; }); };
// Pick the screen for a route. A tab id (here, snacks) or "calendar" lands on that Calendar tab.
D.landing = function (route) {
  var app = D.ROUTE_TAB[route] || (route === "calendar" ? "calendar" : null);
  if (app) D.S.tabs.calapp = route;
  return app || route;
};
D.inGroup = function (t) { if (typeof t === "string") t = D.tile(t); return t.groups.some(function (g) { return D.me().groups.indexOf(g) >= 0; }); };
D.visibleTiles = function () { return D.TILES.filter(function (t) { return D.inGroup(t) && t.modes.indexOf(D.S.mode) >= 0; }); };
D.myNotices = function () { return D.S.notices.filter(function (n) { return n.to === D.S.role; }); };
D.notify = function (to, app, text) { (Array.isArray(to) ? to : [to]).forEach(function (r) { D.S.notices.unshift({ to: r, app: app, text: text, when: "Just now", read: false }); }); };
D.log = function (what, app) { D.S.activity.unshift({ who: D.me().name, what: what, app: app, when: "Just now" }); };
var toastTimer, undoFn = null;
D.toast = function (text, undo) {
  D.S.toast = { text: text, undo: !!undo }; undoFn = undo || null;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { D.S.toast = null; undoFn = null; D.render(); }, 7000);
};
D.withUndo = function (text, doIt, undo) { doIt(); D.toast(text, undo); D.render(); };
D.go = function (route) {
  var S = D.S; route = D.landing(route); S.route = route; S.bell = false; S.appsOpen = false; S.accountOpen = false; S.drawer = null; S.modal = null;
  try { if (location.hash !== "#" + route) history.replaceState(null, "", "#" + route); } catch (e) {}
  D.render(); window.scrollTo(0, 0);
};
D.appHref = function (route) {
  var url = new URL(location.href);
  url.hash = route;
  url.searchParams.set("role", D.S.role);
  url.searchParams.set("mode", D.S.mode);
  return esc(url.href);
};
D.tab = function (app, def) { return D.S.tabs[app] || def; };
D.tabsFor = function (app, list, def) {
  var cur = D.tab(app, def || list[0][0]);
  return list.map(function (t) { return '<button class="tab" data-act="tab" data-app="' + app + '" data-v="' + t[0] + '" aria-pressed="' + (cur === t[0]) + '"' + (D.tabTip ? D.tabTip(app, t[0]) : "") + ">" + esc(t[1]) + (t[2] ? ' <span class="tcount">' + esc(t[2]) + "</span>" : "") + (t[3] ? ' <span class="tcount warn">' + esc(t[3]) + "</span>" : "") + "</button>"; }).join("");
};
/* Tab row. With tabs: a sticky row under the app bar (the bar already names the app, so no title; host is ignored).
   Without tabs: the title is an h1 at the top of the content, with no band. */
D.topbar = function (title, host, tabs, right) {
  var r = right ? '<div class="right">' + right + "</div>" : "";
  if (tabs) return '<header class="topbar">' + (D.topbarLead || "") + '<div class="tabs" role="group" data-keepscroll="tabs">' + tabs + "</div>" + r + "</header>";
  return '<div class="pagehead">' + (D.topbarLead || "") + "<h1>" + esc(title) + "</h1>" + r + "</div>";
};
D.denied = function (name) {
  return '<div class="content"><div class="card"><h2>You can\'t open ' + esc(name) + '</h2><p class="mute">Ask a team admin if you need it.</p><div><button class="btn" data-act="go" data-v="portal">Back to Home</button></div></div></div>';
};
D.openDrawer = function (type, data) { D.S.drawer = { type: type, data: data || {} }; D.render(); };
D.openModal = function (type, data) { D.S.modal = { type: type, data: data || {} }; D.render(); };
D.val = function (id) { var el = document.getElementById(id); return el ? el.value : ""; };
D.drawerHead = function (eyebrow, title) {
  return '<div class="row between nowrap"><div style="min-width:0">' + (eyebrow ? '<p class="eyebrow">' + esc(eyebrow) + "</p>" : "") + "<h2>" + esc(title) + '</h2></div><button class="xbtn" data-act="closedrawer" aria-label="Close" data-tip="Close this panel.">×</button></div>';
};
D.modalHead = function (title) { return '<div class="row between nowrap"><h2>' + esc(title) + '</h2><button class="xbtn" data-act="closemodal" aria-label="Close" data-tip="Close without saving.">×</button></div>'; };

/* ---------- Shell pieces ---------- */
// Short descriptions for the Home tiles and the Apps menu.
// What each tile is for, as its hover description (never the same words as the short line under its name).
var TILETIP = { tasks: "Your next task, projects and the build plan.", calendar: "See practices, sign in at the door and sign up for snacks.", parts: "Ask for a part, follow orders and find spares on the shelves.", skills: "Training trees that unlock step by step, with mentor sign-offs.", schedule: "Who does which role at the event, and when.", pit: "Match checklists, robot issues and battery charge.", scouting: "Match forms, assignments, team stats and the pick list.", onshape: "The team's robot CAD, in a new tab.", github: "Robot code for every season, in a new tab.", drive: "The team's shared files, in a new tab.", admin: "Approve new accounts and set people's groups.", editor: "Change the team's public pages and check them before they go live.", handbook: "Rules and info for students, families and mentors." };
D.tileTip = function (id) { return TILETIP[id] ? ' data-tip="' + esc(TILETIP[id]) + '"' : ""; };
var SHORT = { tasks: "Your tasks", calendar: "Practices, attendance and snacks", parts: "Request and find parts", skills: "Training and sign-offs", schedule: "Your event roles", pit: "Checklists and batteries", scouting: "Match forms", onshape: "Robot CAD", github: "Robot code", drive: "Shared files", admin: "Accounts and groups", editor: "The public website", handbook: "Team rules and info" };
function demobar() {
  var S = D.S;
  var roles = ["student", "mentor", "admin", "parent", "display"].map(function (r) {
    return '<button data-act="role" data-v="' + r + '" aria-pressed="' + (S.role === r) + '">' + D.ROLES[r].label + "</button>";
  }).join("");
  return '<div class="demobar"><b>Demo</b><span>sample data</span>' +
    '<span class="seg" role="group" aria-label="View as">' + roles + "</span>" +
    '<label><input type="checkbox" id="evday" data-change="eventday"' + (S.eventDay ? " checked" : "") + "> Event day</label>" +
    '<span class="seg" role="group" aria-label="Design">' + [["live", "Live"], ["b", "Baseline"], ["c", "Ground up"]].map(function (v) { return '<button data-act="design" data-v="' + v[0] + '" aria-pressed="' + (D.design() === v[0]) + '">' + v[1] + "</button>"; }).join("") + "</span>" +
    '<span class="spacer"></span><button class="linkbtn" data-act="reset">Reset</button></div>';
}
/* One navy app bar on every app: Apps button, 2972 badge, the app's name; Competition chip, bell and account at the right.
   The apps menu and the bell panel hang from the bar so they stay under it while the page scrolls. */
function appbar() {
  var S = D.S, unread = D.myNotices().filter(function (n) { return !n.read; }).length;
  var cur = D.tile(S.route), here = S.route === "account" ? "Account" : D.isToolRoute(S.route) ? "Tools" : cur ? cur.name : "Gears & Buccaneers";
  return '<header class="appbar"><button class="appsbtn" data-act="apps" aria-expanded="' + !!S.appsOpen + '" aria-label="All apps" data-tip="Every app, tool and team link.">' + D.ic("apps", 20) + "</button>" +
    '<a class="brand" href="' + D.appHref("portal") + '" target="_blank" rel="noopener noreferrer" aria-label="Portal home" data-act="go" data-v="portal"><span class="badge-2972">2972</span></a>' +
    '<span class="appname">' + (D.ground() && !cur && S.route === "portal" ? '<span class="hide-sm">' + esc(here) + '</span><span class="show-sm-inline">Home</span>' : esc(here)) + '</span><span class="grow"></span>' +
    (S.mode === "competition" ? '<button class="modechip" data-act="go" data-v="account" aria-label="Competition mode" data-tip="Event apps are showing; change it on your Account page.">' + (D.ground() ? "Competition" : 'Comp<span class="hide-sm">etition mode</span>') + "</button>" : "") +
    '<button class="iconbtn" data-act="bell" aria-expanded="' + !!S.bell + '" aria-label="Notifications" data-tip="What is new for you in every app.">' + D.ic("bell") + (unread ? '<span class="count">' + unread + "</span>" : "") + "</button>" +
    (S.role !== "display" ? '<button class="iconbtn acct" data-act="accountmenu" aria-controls="account-menu" aria-expanded="' + !!S.accountOpen + '" aria-label="Account: ' + esc(D.me().name) + '" data-tip="Your theme, notices and account settings.">' + esc(D.me().name.replace(/^(Ms|Mr|Dr)\. /, "").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2)) + "</button>" : "") +
    (S.appsOpen ? appsMenu() : "") + (S.bell ? bellPanel() : "") + (S.accountOpen && S.role !== "display" ? accountMenu() : "") + "</header>" +
    (S.appsOpen ? '<button class="menu-scrim" data-act="apps" aria-label="Close apps"></button>' : S.bell ? '<button class="menu-scrim" data-act="bell" aria-label="Close notifications"></button>' : S.accountOpen ? '<button class="menu-scrim" data-act="accountmenu" aria-label="Close account"></button>' : "");
}
function accountMenu() {
  var theme = document.documentElement.getAttribute("data-theme") || "";
  return '<div class="accountmenu" id="account-menu" aria-label="Account" data-keepscroll="accountmenu"><div><b>' + esc(D.me().name) + '</b><small class="mute">' + esc(D.ground() ? D.me().label : D.me().groups.join(" · ")) + '</small></div><div role="group" aria-label="Theme"><h3>Theme</h3>' +
    [["", "Match my device"], ["light", "Light"], ["dark", "Dark"]].map(function (t) { return '<button class="accountchoice" data-act="menutheme" data-v="' + t[0] + '" aria-pressed="' + (theme === t[0]) + '">' + t[1] + '</button>'; }).join("") +
    '</div><a class="accountchoice" href="#account" data-act="accountnotifications">Notification settings</a><a class="accountchoice" href="#account" data-act="go" data-v="account">All account settings</a><button class="accountchoice" data-act="demosignout">Sign out</button></div>';

}
/* Tools, Admin apps and More (in that order): one quiet row each, closed by default, that opens a short list. The row is a real button with
   aria-expanded and its chevron turns. A group with nothing in it for this person is not shown. */
// The guide may open a group for one stop (D.S.guideOpen) without changing the saved choice.
D.groupOpen = function (id) { return !!D.pref("open-" + id, false) || !!(D.S.guideOpen && D.S.guideOpen[id]); };
function groupRow(id, label, count, place, body, tip) {
  var open = D.groupOpen(id), bid = "grp-" + place + "-" + id;
  return '<div class="grp" data-grp="' + id + '"><button class="grphead" id="' + bid + '-btn" data-act="grp" data-v="' + id + '" data-place="' + place + '" aria-expanded="' + open + '" aria-controls="' + bid + '"' + (tip ? ' data-tip="' + esc(tip) + '"' : "") + ">" +
    '<span class="grpname">' + esc(label) + '</span><span class="tcount">' + count + '</span><span class="grpchev" aria-hidden="true">' + D.ic("chevron", 16) + "</span></button>" +
    '<div class="grpbody" id="' + bid + '"' + (open ? "" : " hidden") + ">" + body + "</div></div>";
}
D.toolRow = function (t) { return '<a class="toolrow" href="#' + t.id + '" data-act="go" data-v="' + t.id + '" data-tip="' + esc(t.tip) + '"><span class="ic">' + D.ic(t.icon, 18) + "</span><span><b>" + esc(t.name) + "</b><small>" + esc(t.line) + "</small></span>" + (D.ground() ? '<span class="chev" aria-hidden="true">›</span>' : "") + "</a>"; };
function toolsGroup(place) {
  var tools = D.visibleTools(); if (!tools.length) return "";
  // Menus are doors: the calculators get one row that opens the Tools page, not a row each.
  var calcs = tools.filter(function (t) { return t.calc; });
  var calcRow = calcs.length ? '<a class="toolrow" href="#tools" data-act="go" data-v="tools" data-tip="Gearbox, drivetrain, belt, chain, arm, elevator and more."><span class="ic">' + D.ic("calc", 18) + "</span><span><b>Calculators</b><small>" + calcs.length + " for gears, belts, chain and mechanisms.</small></span></a>" : "";
  return groupRow("tools", "Tools", tools.length, place, tools.filter(function (t) { return !t.calc; }).map(D.toolRow).join("") + calcRow + '<a class="toolrow all" href="#tools" data-act="go" data-v="tools"><span>All tools</span><span class="chev" aria-hidden="true">›</span></a>');
}
/* Admin apps: the link-out apps for the people who run the site (Admin, Website editor). The group shows only when
   this person may open at least one of them, and lists only those. */
var ADMTIP = "Apps for the people who run the team's accounts and its public website.";
function isCore(t) { return !t.more && !t.adm; }
function adminGroup(place, tiles, draw) {
  var adm = tiles.filter(function (t) { return t.adm; }); if (!adm.length) return "";
  return groupRow("adminapps", "Admin apps", adm.length, place, draw(adm), ADMTIP);
}
function appsMenu() {
  var S = D.S, tiles = D.visibleTiles();
  // Name only, two columns at every width (as the real bar's kit 0.2.3): the description is the tile's tip.
  function item(t) { return '<a class="appitem" href="' + D.appHref(t.id) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t.name) + ' (opens in a new tab)"' + D.tileTip(t.id) + (S.route === t.id ? ' aria-current="page"' : "") + '><span class="ic">' + D.ic(t.icon, 20) + "</span><b>" + esc(t.name) + (t.ext ? " ↗" : "") + "</b></a>"; }
  var more = tiles.filter(function (t) { return t.more; });
  return '<div class="appsmenu" role="dialog" aria-label="All apps" data-keepscroll="appsmenu"><div class="menuhead"><div class="seg" role="group" aria-label="Mode"><button data-act="mode" data-v="build" aria-pressed="' + (S.mode === "build") + '" data-tip="Show the apps for build season.">Build</button><button data-act="mode" data-v="competition" aria-pressed="' + (S.mode === "competition") + '" data-tip="Show the event apps: schedule, pit and scouting.">Competition</button></div><button class="xbtn" data-act="apps" aria-label="Close" data-tip="Close the apps menu.">×</button></div>' +
    '<div class="appgrid">' + tiles.filter(isCore).map(item).join("") + "</div>" +
    '<div class="menugroups">' + toolsGroup("menu") + adminGroup("menu", tiles, function (l) { return '<div class="appgrid">' + l.map(item).join("") + "</div>"; }) + (more.length ? groupRow("more", D.ground() ? "Team links" : "More", more.length, "menu", '<div class="appgrid">' + more.map(item).join("") + "</div>") : "") + "</div></div>";
}
/* One notice row. Click: mark read, then open its app. Right-click, long-press, Shift+F10 or the context-menu key:
   a one-item menu to mark it read or unread (D.noticeMenu below). Unread = dot + bold + "Unread:" for screen readers. */
function noticeRow(n) {
  var i = D.S.notices.indexOf(n), app = D.APPNAME[n.app] || "";
  return '<button class="li nli' + (n.read ? "" : " unread") + '" data-act="notice" data-i="' + i + '" data-tip="Open it. Right-click or press and hold to mark it ' + (n.read ? "unread" : "read") + '.">' +
    (n.read ? "" : '<span class="srt">Unread: </span>') + (D.ground() ? '<span class="grow"><span class="app">' + esc(app + (app && n.when ? ", " : "") + n.when) + "</span> " + esc(n.text) + "</span>" : '<span class="grow"><span class="app">' + esc(app) + "</span> " + esc(n.text) + '</span><span class="who">' + esc(n.when) + "</span>") + "</button>";
}
function bellPanel() {
  var list = D.myNotices();
  return '<div class="bellpanel" role="dialog" aria-label="Notifications" data-keepscroll="bellpanel"><div class="menuhead"><h3>Notifications</h3><span class="row nowrap"><button class="btn ghost sm" data-act="readall">Mark all read</button><button class="xbtn" data-act="bell" aria-label="Close" data-tip="Close notifications.">×</button></span></div><div class="list">' +
    (list.length ? list.map(noticeRow).join("") : '<p class="empty">Nothing yet.</p>') +
    '</div><button class="btn ghost sm" style="justify-self:start" data-act="go" data-v="account">Notification settings</button></div>';
}
function banner() {
  var S = D.S; if (!S.eventDay) return "";
  return '<div class="banner"><b>Colorado Regional</b><span>Day 2 of 4 · Pit 42 · Rank 9 of 48</span><a href="https://www.thebluealliance.com" target="_blank" rel="noopener noreferrer">The Blue Alliance ↗</a><a href="https://www.twitch.tv/firstinspires" target="_blank" rel="noopener noreferrer">Livestream ↗</a>' +
    (S.mode !== "competition" ? '<button class="btn sm primary" data-act="mode" data-v="competition">Switch to Competition</button>' : "") + "</div>";
}

/* ---------- Home ---------- */
function hasTile(id) { return D.visibleTiles().some(function (t) { return t.id === id; }); }
function todayRow(o) {
  return '<div class="li todayrow"><button class="rowlink" data-act="goapp" data-app="' + o.app + '"' + (o.tab ? ' data-tab="' + o.tab + '"' : "") + '><span class="rt">' + esc(o.title) + "</span>" + (o.line ? '<span class="rl">' + esc(o.line) + "</span>" : "") + (o.count && !(D.ideal() && /^\d/.test(o.title)) ? '<span class="tcount warn">' + o.count + "</span>" : "") + '<span class="chev" aria-hidden="true">›</span></button>' + (o.btn || "") + "</div>";
}
function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
// What waits on a mentor or admin. Counts come from the sample data in D.S; a missing piece just hides its row.
function waitingRows() {
  var S = D.S, rows = [], c = S.cal, P = S.parts, K = S.sk;
  if (P && P.requests && hasTile("parts")) {
    var ok = P.requests.filter(function (r) { return r.status === "needsok"; }).length, ord = P.requests.filter(function (r) { return r.status === "toorder"; }).length;
    if (ok) rows.push({ app: "parts", tab: "toorder", title: plural(ok, "part request needs", "part requests need") + " an OK", count: ok });
    if (ord) rows.push({ app: "parts", tab: "toorder", title: plural(ord, "part is", "parts are") + " ready to order", count: ord });
  }
  if (K && K.requests && K.requests.length && hasTile("skills")) rows.push({ app: "skills", tab: "signoff", title: plural(K.requests.length, "sign-off request", "sign-off requests"), line: K.requests.slice(0, 3).map(function (r) { return r.st; }).join(", "), count: K.requests.length });
  if (c && c.avail && D.calTab("here")) {
    var silent = (D.calApi && D.calApi.mentors ? D.calApi.mentors() : Object.keys(c.avail)).filter(function (n) { var a = c.avail[n]; return !a.usual.length && !Object.keys(a.one).length; });
    if (S.role === "admin" && silent.length) rows.push({ app: "here", tab: "mentors", title: plural(silent.length, "mentor hasn't", "mentors haven't") + " answered for this week", line: silent.join(", "), count: silent.length });
    else if (S.role === "mentor" && silent.indexOf(D.me().name) >= 0) rows.push({ app: "here", tab: "mentors", title: "Tell us if you're coming this week", count: 1 });
  }
  return rows;
}
function practiceRows() {
  var S = D.S, rows = [], c = S.cal, api = D.calApi; if (!api || !c) return rows;
  var role = S.role;
  if (role === "parent") {
    var p = api.practiceDays(1)[0], ev = api.upcoming(10, ["comp", "outreach", "meeting"])[0];
    if (p) rows.push({ app: "calendar", title: "Next practice: " + api.fmt(p.date), line: api.span(p) });
    if (ev) rows.push({ app: "calendar", title: "Next event: " + ev.name, line: api.fmt(ev.date) });
    if (D.calTab("snacks")) {
      var nm = "Ortiz family", need = api.practiceDays(8).filter(function (e) {
        var sn = c.snacks[e.date] || (c.snacks[e.date] = new Array(c.slots).fill(null));
        return sn.indexOf(nm) < 0 && sn.indexOf(null) >= 0;
      })[0];
      if (need) { var sn = c.snacks[need.date], k = sn.indexOf(null), open = sn.filter(function (x) { return !x; }).length; rows.push({ app: "snacks", title: api.fmt(need.date) + " needs snacks", line: plural(open, "family", "families") + " needed", btn: '<button class="btn" data-act="snack" data-d="' + need.date + '" data-k="' + k + '">Sign up</button>' }); }
    }
    return rows;
  }
  if (S.eventDay) return rows;
  var pd = api.practiceDays(1)[0]; if (!pd) return rows;
  var today = pd.date === api.TODAYS, here = c.here || [], me = D.me().name, signed = here.some(function (h) { return h.name === me; });
  if (D.isStaff()) rows.push({ app: "here", tab: "today", title: (today ? "Practice today, " : "Next practice " + api.fmt(pd.date) + ", ") + api.span(pd), line: today ? plural(here.length, "person is", "people are") + " signed in" : "" });
  else rows.push({ app: "here", tab: "today", title: (today ? "Practice today, " : "Next practice " + api.fmt(pd.date) + ", ") + api.span(pd), line: today ? (signed ? "You are signed in" : "You are not signed in") : "", btn: today && !signed ? '<button class="btn" data-act="herescan">Sign in</button>' : "" });
  return rows;
}
/* ---------- Home, Ground up (GROUND_UP.md §4, Home) ---------- */
function isoAdd(s, n) { var q = s.split("-"), d = new Date(+q[0], +q[1] - 1, +q[2] + n); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function daysTo(s, from) { var a = s.split("-"), b = from.split("-"); return Math.round((new Date(+a[0], +a[1] - 1, +a[2]) - new Date(+b[0], +b[1] - 1, +b[2])) / 86400000); }
/* The season line: the next date that matters (kickoff, then the next competition), counted in days and in practices,
   with one mark for every practice between now and then. A mark with a milestone due on it is a diamond. It is the one
   bold element of this version: it makes "count in practices" (rule 4) something you can see. */
function seasonLine(simple) {
  var api = D.calApi; if (!api || !api.meetDays) return "";
  var today = api.TODAYS, k = api.kickoff && api.kickoff(), target = k && k.date > today ? { date: k.date, name: "kickoff", title: "Kickoff" } : null;
  if (!target) { var comp = api.upcoming(1, ["comp"])[0]; if (comp) target = { date: comp.date, name: comp.name, title: comp.name }; }
  if (!target) return "";
  var meets = api.meetDays(today, isoAdd(target.date, -1)), n = meets.length, days = daysTo(target.date, today);
  // A parent does not count in practices: their line is the date and the days to it, with no marks.
  if (simple) {
    var np = api.practiceDays(1)[0], npt = np ? (np.date === today ? "Practice today" : "Next practice " + api.fmt(np.date)) + ", " + api.span(np) : "";
    return '<section class="season simple" aria-label="The season"><p class="snhead"><b class="snnum num">' + days + "</b><span><b>" + (days === 1 ? "day" : "days") + " to " + esc(target.name) + '</b><span class="mute num">' + esc(api.fmt(target.date)) + "</span></span></p>" + (npt ? '<p class="snpractice">' + esc(npt) + "</p>" : "") + "</section>";
  }
  var ms = D.tasksApi ? D.tasksApi.milestones(12).filter(function (m) { return m.date >= today && m.date < target.date; }) : [];
  var due = {}; ms.forEach(function (m) { (due[m.date] = due[m.date] || []).push(m); });
  var marks = meets.map(function (d) {
    var cls = "pm" + (d.date === today ? " today" : "") + (d === meets[0] && d.date !== today ? " next" : "") + (d.kind === "build" ? " build" : "") + (due[d.date] ? " due" : "");
    return '<i class="' + cls + '"></i>';
  }).join("");
  var next = ms.slice(0, 3).map(function (m) {
    return '<button class="snms" data-act="homeproject" data-v="' + esc(m.pid) + '" data-tip="Open the ' + esc(m.project) + ' project in Tasks."><i class="snd" style="background:' + esc(m.color) + '"></i><b>' + esc(m.name) + '</b><span class="num">' + esc(api.fmt(m.date)) + (D.practicesText(m.date) ? ", " + D.practicesText(m.date) : "") + "</span></button>";
  }).join("");
  return '<section class="season" aria-label="The season">' +
    '<p class="snhead"><b class="snnum num">' + n + "</b><span><b>" + (n === 1 ? "practice" : "practices") + " to " + esc(target.name) + '</b><span class="mute num">' + esc(api.fmt(target.date)) + ", " + plural(days, "day", "days") + "</span></span></p>" +
    '<div class="sntrack" aria-hidden="true">' + marks + '<span class="snend">' + esc(target.title) + "</span></div>" +
    (next ? '<div class="snnext">' + next + "</div>" : "") + "</section>";
}
// An app's api, or null unless it has every function Home is about to call (an app file may be absent or older).
function apiWith(api, fns) { return api && fns.every(function (f) { return typeof api[f] === "function"; }) ? api : null; }
// One row of the Now list: a title and one muted line that open the owning screen, then at most one action.
function nowRow(o) {
  return '<div class="li nowrow' + (o.first ? " nowfirst" : "") + '"><button class="rowlink" data-act="' + (o.act || "goapp") + '"' + (o.v != null ? ' data-v="' + esc(o.v) + '"' : "") + (o.app ? ' data-app="' + o.app + '"' : "") + (o.tab ? ' data-tab="' + o.tab + '"' : "") + '><span class="rt">' + esc(o.title) + "</span>" + (o.line || o.mark ? '<span class="rl">' + (o.mark ? o.mark + " " : "") + (o.line || "") + "</span>" : "") + "</button>" +
    (o.btn || '<span class="chev" aria-hidden="true">›</span>') + "</div>";
}
/* Now: everything that needs this person, most urgent first, each with its own action (rule 3). The actions call the
   owning app's own function (D.partsApi.approve, D.skillsApi.signOff), so they are not a second way of doing it. */
function nowRows() {
  var S = D.S, rows = [], api = D.calApi, c = S.cal, staff = D.isStaff(), P = apiWith(D.partsApi, ["needsOk", "approve", "open"]), K = apiWith(D.skillsApi, ["requests", "signOff"]);
  // At an event, Now holds only what the event needs (hill climb r4): the pit's own rows, from the Competition app.
  if (S.eventDay && S.role !== "parent") return (D.eventRows ? D.eventRows() : []).map(function (r) { return { app: r.app, tab: r.tab, title: r.title, line: esc(r.line || "") }; });
  practiceRows().forEach(function (r) {
    // A parent's first question is the next practice. When that is today, the row says "today", not the date.
    // A parent's practices are the "This week" list, which leads their page, so Now holds only what they can do.
    if (S.role === "parent" && /^Next (event|practice): /.test(r.title)) return;
    if (S.role === "parent" && api && /^Next practice: /.test(r.title) && api.practiceDays(1)[0] && api.practiceDays(1)[0].date === api.TODAYS) r.title = "Practice today";
    // Signing in is the first job at practice, so until it is done it is the page's one main button (hill climb r2).
    var signin = /data-act="herescan"/.test(r.btn || "");
    rows.push({ app: r.app, tab: r.tab, title: r.title, line: r.line ? esc(r.line) : "", first: signin, btn: (r.btn || "").replace('class="btn" data-act="herescan"', 'class="btn primary" data-act="herescan"') }); });
  // A parent can settle every practice this week that still needs snacks, each from its own row (hill climb r3).
  if (S.role === "parent" && api && c && D.calTab("snacks")) {
    rows = rows.filter(function (r) { return !/needs snacks$/.test(r.title); });
    var mine = "Ortiz family", n = 0;
    api.practiceDays(8).forEach(function (e) {
      if (daysTo(e.date, api.TODAYS) > 6) return;
      var sn = c.snacks[e.date] || (c.snacks[e.date] = new Array(c.slots).fill(null)), k = sn.indexOf(null);
      if (k < 0 || sn.indexOf(mine) >= 0) return;
      var open = sn.filter(function (x) { return !x; }).length;
      rows.push({ app: "snacks", title: "Snacks needed " + api.fmt(e.date), line: esc(plural(open, "family", "families") + " needed"), btn: '<button class="btn primary" data-act="snack" data-d="' + e.date + '" data-k="' + k + '">Sign up</button>' });
    });
  }
  if (staff) {
    if (P && hasTile("parts")) P.needsOk().forEach(function (r) {
      rows.push({ group: "Needs your OK", act: "homereq", v: r.id, title: r.name, line: esc(D.money(r.total) + ", asked by " + r.by) + (r.orderBy ? (api && r.orderBy < api.TODAYS ? ', <b class="nowdue">the order was due ' + esc(api.fmt(r.orderBy)) + "</b>" : ", order by " + esc(api ? api.fmt(r.orderBy) : r.orderBy)) : ""),
        mark: r.pri === "blocking" ? '<span class="pill pri bad">Blocking</span>' : r.pri === "high" ? '<span class="pill pri warn">High</span>' : "",
        btn: '<button class="btn' + (r.pri === "blocking" ? " primary" : "") + '" data-act="homeapprove" data-v="' + r.id + '">Approve</button>' });
    });
    if (K && hasTile("skills")) K.requests().forEach(function (q) {
      rows.push({ group: "Sign-off requests", app: "skills", tab: "signoff", title: q.skill, line: esc(q.student + " asks for a sign-off"), btn: '<button class="btn" data-act="homesignoff" data-v="' + esc(q.key) + '">Sign off</button>' });
    });
    // Stuck work comes to the mentors as a row, not only as a notice: nothing waits silently (GROUND_UP.md §1).
    if (apiWith(D.tasksApi, ["stuck", "openTask"]) && hasTile("tasks")) D.tasksApi.stuck().forEach(function (x) {
      rows.push({ group: "Stuck", act: "hometask", v: x.id, title: x.title, line: esc((x.who.length ? x.who.join(", ") : "Nobody has it") + ", " + x.project + (x.waitsOn.length ? ". Waits on " + x.waitsOn.join(" and ") : "")), mark: '<span class="pill bad">Blocked</span>' });
    });
    // What cannot be settled in one tap stays a door, as it was.
    waitingRows().forEach(function (r) {
      if (P && r.app === "parts" && /needs? an OK/.test(r.title)) return;
      if (K && r.app === "skills") return;
      rows.push({ app: r.app, tab: r.tab, title: r.title, line: r.line ? esc(r.line) : "" });
    });
  }
  // For a mentor the practice row is information, not a decision, so it follows the rows that need one.
  var isPractice = function (r) { return /^(Practice today|Next practice)/.test(r.title); };
  if (staff) rows = rows.filter(function (r) { return r.group; }).concat(rows.filter(function (r) { return !r.group && !isPractice(r); }), rows.filter(function (r) { return !r.group && isPractice(r); }));
  return rows;
}
// Waiting on others (a student's own open requests and sign-offs), each with who has the next move (rule 2).
function waitingOnOthers() {
  var rows = [], P = apiWith(D.partsApi, ["mine", "open"]), K = apiWith(D.skillsApi, ["mine"]);
  if (P && hasTile("parts")) P.mine().forEach(function (r) {
    rows.push('<div class="li nowrow"><button class="rowlink" data-act="homereq" data-v="' + r.id + '"><span class="rt">' + esc(r.name) + '</span><span class="rl"><span class="pill ' + esc(r.kind || "") + '">' + esc(r.statusText) + "</span> " + (r.waitingOn ? D.move(r.waitingOn) : r.eta ? '<span class="move">' + esc(r.eta) + "</span>" : "") + '</span></button><span class="chev" aria-hidden="true">›</span></div>');
  });
  if (K && hasTile("skills")) { var m = K.mine(); ((m && m.waiting) || []).forEach(function (w) {
    rows.push('<div class="li nowrow"><button class="rowlink" data-act="goapp" data-app="skills" data-tab="overview"><span class="rt">Sign-off: ' + esc(w.skill) + '</span><span class="rl">' + D.move("a mentor") + (w.since ? " since " + esc(w.since) : "") + '</span></button><span class="chev" aria-hidden="true">›</span></div>');
  }); }
  return rows;
}
/* This week: the next seven days on which the team meets or has an event. Each row is a door to the Calendar. The
   facts under a day are the two things people ask about a practice (which adults, which food) and what is due. */
function weekRows() {
  var api = D.calApi; if (!api || !api.meetDays) return "";
  var S = D.S, today = api.TODAYS, end = isoAdd(today, 6), role = S.role, days = {}, order = [];
  function day(d) { if (!days[d]) { days[d] = { what: [], facts: [] }; order.push(d); } return days[d]; }
  api.meetDays(today, end).forEach(function (m) {
    var p = api.practiceOn(m.date), o = day(m.date);
    o.what.push((m.kind === "build" ? "Build day" : m.kind === "comp" ? m.name : "Practice") + (p ? ", " + api.span(p) : ""));
    if (m.kind === "comp") return;
    if (role !== "parent") { var mn = api.mentorsOn(m.date).length; o.facts.push(mn ? '<span>' + plural(mn, "mentor", "mentors") + " coming</span>" : '<span class="pill warn">No mentors yet</span>'); }
    var sn = api.snacksFor(m.date);
    if (sn && D.calTab("snacks") && (sn.filled || role !== "parent")) o.facts.push(sn.filled ? "<span>Snacks: " + esc(sn.names.join(" and ")) + "</span>" : '<span class="pill warn">Needs snacks</span>');
  });
  api.eventsIn(today, end, ["outreach", "meeting"]).forEach(function (e) { day(e.date).what.push(e.name); });
  if (role !== "parent" && D.tasksApi) D.tasksApi.milestones(12).forEach(function (m) { if (m.date >= today && m.date <= end) day(m.date).facts.push('<span class="wkdue"><i class="snd" style="background:' + esc(m.color) + '"></i>Due: ' + esc(m.name) + "</span>"); });
  order.sort();
  if (!order.length) return '<p class="mute">Nothing in the next seven days.</p>';
  return '<div class="list week">' + order.map(function (d) {
    var q = d.split("-"), dt = new Date(+q[0], +q[1] - 1, +q[2]), o = days[d];
    return '<button class="li wkrow' + (d === today ? " today" : "") + '" data-act="goapp" data-app="calendar" aria-label="' + esc(api.fmt(d) + ": " + o.what.join(", ") + ". Open the Calendar") + '"><span class="wkd"><b>' + (d === today ? "Today" : dt.toLocaleDateString("en-US", { weekday: "short" })) + '</b><span class="num">' + dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + '</span></span><span class="grow"><b>' + esc(o.what.join(", ")) + "</b>" + (o.facts.length ? '<span class="wkfacts">' + o.facts.join("") + "</span>" : "") + "</span></button>";
  }).join("") + "</div>";
}
function homeGround() {
  var S = D.S, tiles = D.visibleTiles(), staff = D.isStaff(), role = S.role;
  var main = tiles.filter(isCore), more = tiles.filter(function (t) { return t.more; });
  function link(t) { return '<li><a href="' + D.appHref(t.id) + '" target="_blank" rel="noopener noreferrer"' + D.tileTip(t.id) + '>' + D.ic(t.icon, 16) + esc(t.name) + (t.ext ? " ↗" : "") + "</a></li>"; }
  var SHORTER = { calendar: "Practices, attendance, snacks" };
  if (role === "parent") { SHORTER.tasks = "This week and due dates"; SHORTER.calendar = "Practices, events, snacks"; }
  function approw(t) { return '<a class="approw" href="' + D.appHref(t.id) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t.name) + ' (opens in a new tab)"' + D.tileTip(t.id) + '><span class="ic">' + D.ic(t.icon, 18) + "</span><b>" + esc(t.name) + (t.ext ? " ↗" : "") + "</b><small>" + esc(SHORTER[t.id] || SHORT[t.id] || t.desc) + "</small></a>"; }
  var d = new Date(2026, 10, 10); try { if (D.calApi && D.calApi.TODAYS) { var q = D.calApi.TODAYS.split("-"); d = new Date(+q[0], +q[1] - 1, +q[2]); } } catch (e) {}
  var date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  var now = nowRows(), others = role === "student" && !S.eventDay ? waitingOnOthers() : [];
  var mainCol = "", shift = role === "student" && S.eventDay && !!D.myShiftCard;
  // On an event day a student's shift is what needs them now, so it leads and no "nothing needs you" sits above it.
  if (shift) mainCol += '<div class="shiftcard">' + D.myShiftCard() + "</div>";
  var week = S.eventDay ? "" : '<section class="card wkcard"><h2>This week</h2>' + weekRows() + "</section>";
  if (role === "parent") { mainCol += week; if (now.length) mainCol += '<section class="card nowcard"><h2>Can you help?</h2><div class="list">' + now.map(nowRow).join("") + "</div></section>"; }
  else if (now.length || !shift) mainCol += '<section class="card nowcard"><h2>Now</h2>' + (now.length ? '<div class="list">' + now.map(function (r, i) {
    // A short label starts each kind of decision, so a mentor's list reads in groups (hill climb r4).
    var g = r.group || (i && now[i - 1].group ? "Also" : "");
    return (g && (!i || (now[i - 1].group || "") !== (r.group || "")) ? '<h3 class="nowgroup">' + esc(g) + "</h3>" : "") + nowRow(r);
  }).join("") + "</div>" : '<p class="mute">Nothing needs you right now.</p>') + "</section>";
  // At an event the shop task waits: a student in the pit is not sent back to the shop (hill climb r3).
  if (role === "student" && D.nextUpCard && !S.eventDay) mainCol += D.nextUpCard();
  // A parent's two questions are the next practice and the next event. The events get their own short list, so the
  // page is not mostly empty on a laptop and "Next event" is not one lonely row (hill climb r2).
  if (role === "parent" && D.calApi) {
    var evs = D.calApi.upcoming(40, ["comp", "outreach", "meeting"]).slice(0, 4);
    if (evs.length) mainCol += '<section class="card comingcard"><h2>Coming up</h2><div class="list week">' + evs.map(function (e) {
      var q = e.date.split("-"), dt = new Date(+q[0], +q[1] - 1, +q[2]);
      return '<button class="li wkrow" data-act="goapp" data-app="calendar" aria-label="' + esc(D.calApi.fmt(e.date) + ": " + e.name + ". Open the Calendar") + '"><span class="wkd"><b>' + dt.toLocaleDateString("en-US", { weekday: "short" }) + '</b><span class="num">' + dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + '</span></span><span class="grow"><b>' + esc(e.name) + '</b><span class="wkfacts"><span>' + esc(D.calApi.span(e) + (e.where ? ", " + e.where : "")) + "</span></span></span></button>";
    }).join("") + "</div></section>";
  }
  if (others.length) mainCol += '<section class="card"><h2>Waiting on others</h2><div class="list">' + others.join("") + "</div></section>";
  var act = role === "parent" || S.eventDay ? "" : '<section class="card actcard"><h2>Recent activity</h2><div class="list">' +
    S.activity.slice(0, 4).map(function (a) { return '<div class="li actli"><span class="actapp">' + esc(D.APPNAME[a.app] || "") + '</span><span class="grow"><b>' + esc(a.who) + "</b> " + esc(a.what) + '</span><span class="who">' + esc(a.when) + "</span></div>"; }).join("") + "</div></section>";
  // On an event day the event line takes the season line's place. A student's shift card below already says "you
  // now", so the line leaves that part out for them.
  var top = S.eventDay && D.eventLine && role !== "parent" ? D.eventLine(shift ? "schedule" : "") : seasonLine(role === "parent");
  return '<div class="content home homeb homec' + (S.eventDay ? " evday" : "") + (role === "parent" ? " parent" : "") + '"><div class="homehead"><h1>Hi ' + esc(D.me().short) + '.</h1>' + (S.eventDay ? "" : '<p class="homedate">' + esc(date) + "</p>") + "</div>" + top +
    '<div class="homecols"><div class="homemain">' + mainCol + act + '</div><aside class="homeside">' +
    (role === "parent" ? "" : week) +
    '<section class="card appscard"><h2>Apps</h2><div class="applist">' + main.map(approw).join("") + "</div>" +
    '<div class="homegroups">' + toolsGroup("home") + adminGroup("home", tiles, function (l) { return '<ul class="morelinks">' + l.map(link).join("") + "</ul>"; }) + (more.length ? groupRow("more", "Team links", more.length, "home", '<ul class="morelinks">' + more.map(link).join("") + "</ul>") : "") + "</div></section>" +
    (D.guideCard && !S.eventDay ? D.guideCard() : "") + "</aside></div></div>";
}
D.views.portal = function () {
  var S = D.S, tiles = D.visibleTiles(), staff = D.isStaff();
  function link(t) { return '<li><a href="' + D.appHref(t.id) + '" target="_blank" rel="noopener noreferrer"' + D.tileTip(t.id) + '>' + D.ic(t.icon, 16) + esc(t.name) + (t.ext ? " ↗" : "") + "</a></li>"; }
  var main = tiles.filter(isCore), more = tiles.filter(function (t) { return t.more; });
  function tile(t) { return '<a class="apptile" href="' + D.appHref(t.id) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t.name) + ' (opens in a new tab)"' + D.tileTip(t.id) + '><span class="ic">' + D.ic(t.icon, 20) + "</span><b>" + esc(t.name) + (t.ext ? " ↗" : "") + "</b><small>" + esc(SHORT[t.id] || t.desc) + "</small></a>"; }
  var d = new Date(2026, 10, 10); try { if (D.calApi && D.calApi.TODAYS) { var q = D.calApi.TODAYS.split("-"); d = new Date(+q[0], +q[1] - 1, +q[2]); } } catch (e) {}
  var date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  var waiting = staff ? waitingRows() : [], today = practiceRows();
  var cards = "";
  if (S.role === "student" && S.eventDay && D.myShiftCard) cards += D.myShiftCard();
  if (staff) cards += '<section class="card"><h2>Waiting on you</h2>' + (waiting.length ? '<div class="list">' + waiting.map(todayRow).join("") + "</div>" : '<p class="mute">Nothing is waiting on you.</p>') + "</section>";
  if (today.length) cards += '<section class="card"><h2>Today</h2><div class="list">' + today.map(todayRow).join("") + "</div></section>";
  if (S.role === "student" && D.nextUpCard) cards += S.eventDay ? '<div class="evcompact">' + D.nextUpCard() + "</div>" : D.nextUpCard();
  var act = S.role === "parent" ? "" : '<section class="card"><h2>Recent activity</h2><div class="list">' +
    S.activity.slice(0, 5).map(function (a) { return '<div class="li actli"><span class="actapp">' + esc(D.APPNAME[a.app] || "") + '</span><span class="grow"><b>' + esc(a.who) + "</b> " + esc(a.what) + '</span><span class="who">' + esc(a.when) + "</span></div>"; }).join("") + "</div></section>";
  /* Version B: what needs you is the wide left column; the apps and the activity are a narrow right column, so both
     are on screen without scrolling. Apps are one-line rows (name, then what it is for), not tiles. */
  if (D.ground()) return homeGround();
  if (D.ideal()) {
    var approw = function (t) { return '<a class="approw" href="' + D.appHref(t.id) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t.name) + ' (opens in a new tab)"' + D.tileTip(t.id) + '><span class="ic">' + D.ic(t.icon, 18) + "</span><b>" + esc(t.name) + (t.ext ? " ↗" : "") + "</b><small>" + esc(SHORT[t.id] || t.desc) + "</small></a>"; };
    return '<div class="content home homeb"><div class="homehead"><h1>Hi ' + esc(D.me().short) + '.</h1><p class="homedate">' + esc(date) + "</p></div>" + (D.guideCard ? D.guideCard() : "") +
      '<div class="homecols"><div class="homemain">' + (cards || '<section class="card"><h2>Today</h2><p class="mute">Nothing needs you today.</p></section>') + '</div><aside class="homeside">' +
      '<section class="card"><h2>Apps</h2><div class="applist">' + main.map(approw).join("") + "</div>" +
      '<div class="homegroups">' + toolsGroup("home") + adminGroup("home", tiles, function (l) { return '<ul class="morelinks">' + l.map(link).join("") + "</ul>"; }) + (more.length ? groupRow("more", "More", more.length, "home", '<ul class="morelinks">' + more.map(link).join("") + "</ul>") : "") + "</div></section>" +
      act + "</aside></div></div>";
  }
  return '<div class="content home"><div class="homehead"><p class="homedate">' + esc(date) + "</p><h1>Hi " + esc(D.me().short) + ".</h1></div>" + (D.guideCard ? D.guideCard() : "") + cards +
    '<section class="stack"><h2 style="margin-bottom:10px">Apps</h2><div class="apptiles">' + main.map(tile).join("") + "</div>" +
    '<div class="homegroups">' + toolsGroup("home") +
    adminGroup("home", tiles, function (l) { return '<ul class="morelinks">' + l.map(link).join("") + "</ul>"; }) +
    (more.length ? groupRow("more", "More", more.length, "home", '<ul class="morelinks">' + more.map(link).join("") + "</ul>") : "") +
    "</div></section>" + act + "</div>";
};
function displayHome(blocked) {
  return '<div class="display">' + (blocked ? '<div class="dcard" style="border-color:var(--gold)">' + esc(blocked) + " isn't available on a display. Pick one of these instead.</div>" : "") + '<h1>Pick what this screen shows</h1><div class="grid3">' +
    [["kiosk", "Door QR", "Sign in and out at the shop door"], ["monitor", "Pit monitor", "Next match, batteries, issues, pit duty"], ["projector", "Projector", "The practice screen, the meeting lists or the build plan on the shop TV"]].map(function (d) {
      return '<button class="dcard" style="text-align:left;cursor:pointer" data-act="go" data-v="' + d[0] + '"><b style="font-size:1.3rem">' + d[1] + '</b><span class="dmute">' + d[2] + "</span></button>";
    }).join("") + '</div></div>';
}
function extTile(t) {
  return D.topbar(t.name, "", "", "") + '<div class="content"><div class="card"><p class="mute">' + esc(t.desc) + ' It opens in its own tab.</p><div><button class="btn" data-act="go" data-v="portal">Back to Home</button></div></div></div>';
}

/* ---------- Render ---------- */
// While something is being dragged (the Tasks timeline sets D.holdRender), a redraw would pull the element out from
// under the pointer, so it waits: the drop draws once with everything that changed meanwhile (a toast expiring, say).
D.render = function () {
  if (D.holdRender && D.holdRender()) { D.renderHeld = true; return; }
  D.renderHeld = false;
  var S = D.S, root = document.getElementById("root");
  var active = document.activeElement, activeId = active && active.id, selStart = null;
  try { if (active && active.selectionStart != null) selStart = active.selectionStart; } catch (e) {}
  var scrollers = {}; document.querySelectorAll("[data-keepscroll]").forEach(function (el) { scrollers[el.getAttribute("data-keepscroll")] = [el.scrollLeft, el.scrollTop]; });
  var html = demobar();
  if (S.role === "display") {
    html += D.DISPLAY_ROUTES[S.route] ? '<div style="position:relative"><div class="dispctl"><button class="btn sm" data-act="go" data-v="portal">Change screen</button></div>' + D.views[S.route]() + "</div>" : displayHome(S.route !== "portal" && D.APPNAME[S.route] ? D.APPNAME[S.route] : "");
  } else if (D.DISPLAY_ROUTES[S.route]) {
    html += D.views[S.route]();
  } else {
    var t = D.tile(S.route), content;
    if (t && !D.inGroup(t)) content = D.denied(t.name);
    else if (t && t.ext) content = extTile(t);
    else content = (D.views[S.route] || D.views.portal)();
    html += appbar() + '<div class="main">' + banner() + content + "</div>";
  }
  if (S.drawer && D.drawers[S.drawer.type]) html += '<button class="drawer-scrim" data-act="closedrawer" aria-label="Close panel"></button><aside class="drawer" role="dialog" aria-modal="true" data-keepscroll="' + esc("drawer-" + S.drawer.type + "-" + (S.drawer.data.id != null ? S.drawer.data.id : "")) + '">' + D.drawers[S.drawer.type](S.drawer.data) + "</aside>";
  if (S.modal && D.modals[S.modal.type]) html += '<button class="modal-scrim" data-act="closemodal" aria-label="Close dialog"></button><div class="modal" role="dialog" aria-modal="true" data-keepscroll="' + esc("modal-" + S.modal.type) + '">' + D.modals[S.modal.type](S.modal.data) + "</div>";
  if (S.toast) html += '<div class="toast" role="status"><span>' + esc(S.toast.text) + "</span>" + (S.toast.undo ? '<button data-act="undo">Undo</button>' : "") + "</div>";
  root.innerHTML = html;
  Object.keys(scrollers).forEach(function (k) { var el = document.querySelector('[data-keepscroll="' + k + '"]'); if (el) { el.scrollLeft = scrollers[k][0]; el.scrollTop = scrollers[k][1]; } });
  D.after.forEach(function (f) { try { f(); } catch (e) { if (window.console) console.error(e); } });
  if (activeId) { var el = document.getElementById(activeId); if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) { el.focus(); try { if (selStart != null) el.setSelectionRange(selStart, selStart); } catch (e) {} } }
};
/* Version B, wide screens: the app's tab row is drawn inside the black app bar (css/ideal.css pulls it up). The row
   must start after the app's name and stop before the bell, and both of those change width, so they are measured here
   and handed to the stylesheet as --bar-l and --bar-r. Nothing in the page's structure moves. */
function barSlots() {
  var bar = document.querySelector(".appbar"), root = document.documentElement;
  if (!bar || !D.ideal()) { root.style.removeProperty("--bar-l"); root.style.removeProperty("--bar-r"); return; }
  var name = bar.querySelector(".appname"), grow = bar.querySelector(".grow"), b = bar.getBoundingClientRect();
  if (!name || !grow) return;
  root.style.setProperty("--bar-l", Math.round(name.getBoundingClientRect().right - b.left + 14) + "px");
  root.style.setProperty("--bar-r", Math.round(b.right - grow.getBoundingClientRect().right + 6) + "px");
}
D.after.unshift(barSlots);
window.addEventListener("resize", barSlots);
// The app's name gets wider when the typeface arrives, so measure again then.
if (document.fonts) { if (document.fonts.ready) document.fonts.ready.then(barSlots); if (document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", barSlots); }
// Keep the active tab in view when the tab row scrolls sideways, and fade the row at an edge that has more tabs.
function tabFade(row) {
  row.classList.toggle("more-l", row.scrollLeft > 4);
  row.classList.toggle("more-r", row.scrollLeft + row.clientWidth < row.scrollWidth - 4);
}
// The Apps menu never runs past the window: it is as tall as the room below the bar allows, and scrolls inside itself.
D.after.push(function () {
  var m = document.querySelector(".appsmenu"); if (!m) return;
  m.style.maxHeight = Math.max(160, window.innerHeight - m.getBoundingClientRect().top - 8) + "px";
});
D.after.push(function () {
  var row = document.querySelector(".topbar .tabs"); if (!row) return;
  var a = row.querySelector("[aria-pressed='true']");
  if (a) { var ar = a.getBoundingClientRect(), rr = row.getBoundingClientRect();
    if (ar.left < rr.left + 24) row.scrollLeft -= rr.left + 24 - ar.left; else if (ar.right > rr.right - 40) row.scrollLeft += ar.right - rr.right + 40; }
  tabFade(row);
});
document.addEventListener("scroll", function (e) { if (e.target && e.target.classList && e.target.classList.contains("tabs")) tabFade(e.target); }, true);
window.addEventListener("resize", function () { var row = document.querySelector(".topbar .tabs"); if (row) tabFade(row); });

/* ---------- Shell actions ---------- */
var A = D.acts;
A.role = function (b) {
  var S = D.S; S.role = b.dataset.v; S.bell = false; S.appsOpen = false; S.accountOpen = false; S.drawer = null; S.modal = null;
  (D.onRole || []).forEach(function (f) { f(S.role); });
  if (S.role === "display") { S.route = D.DISPLAY_ROUTES[S.route] ? S.route : "portal"; }
  else if (!(S.route === "portal" || S.route === "account" || (D.tile(S.route) && D.inGroup(S.route)) || (D.isToolRoute(S.route) && D.visibleTools().length) || (D.DISPLAY_ROUTES[S.route] && D.isStaff()))) S.route = "portal";
  D.render();
};
D.changes.eventday = function (el) { D.S.eventDay = el.checked; D.render(); };
/* Demo only: the versions of the apps (design 8.3 proposal).
   "live" is the apps as they are today. "b" is the Baseline: the new look (css/look.css) and the tighter layout
   (css/ideal.css, D.ideal()), which the owner chose on 2026-11-17. "c" is Ground up: the Baseline plus the changes in
   GROUND_UP.md (css/ground*.css, D.ground()). "a" (the new look on today's layouts) is kept for comparison and is
   reachable only by ?design=a. The choice is kept in this browser. */
var DESIGNS = { live: 1, a: 1, b: 1, c: 1 };
D.design = function () { var v = document.documentElement.getAttribute("data-design"); return DESIGNS[v] ? v : "live"; };
D.ideal = function () { var v = D.design(); return v === "b" || v === "c"; };
D.ground = function () { return D.design() === "c"; };
D.setDesign = function (v) { if (v === "a" || v === "b" || v === "c") document.documentElement.setAttribute("data-design", v); else document.documentElement.removeAttribute("data-design"); };
A.design = function (b) { D.setDesign(b.dataset.v); try { localStorage.setItem("2972-demo-design83", b.dataset.v); } catch (e) {} D.render(); };
A.reset = function () { D.saved = {}; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} D.reset(); D.toast("Demo reset: sample data and saved choices."); D.render(); };
A.go = function (b) { D.go(b.dataset.v); };
A.tab = function (b) { D.S.tabs[b.dataset.app] = b.dataset.v; D.S.drawer = null; D.render(); };
A.mode = function (b) { var S = D.S; S.mode = b.dataset.v; if (S.route !== "portal" && S.route !== "account" && D.tile(S.route) && D.visibleTiles().indexOf(D.tile(S.route)) < 0) S.route = "portal"; D.render(); };
A.bell = function () { D.S.accountOpen = false; D.S.bell = !D.S.bell; D.S.appsOpen = false; D.render(); };
A.apps = function () { D.S.accountOpen = false; D.S.appsOpen = !D.S.appsOpen; D.S.bell = false; D.render(); };
A.accountmenu = function () { D.S.accountOpen = !D.S.accountOpen; D.S.appsOpen = false; D.S.bell = false; D.render(); document.querySelector(".acct").focus(); };
A.menutheme = function (b) { D.acts.actheme(b); D.S.accountOpen = false; D.render(); document.querySelector(".acct").focus(); };
A.accountnotifications = function () { D.go("account"); var heading = Array.from(document.querySelectorAll(".acc h2")).find(function (h) { return h.textContent === "Notifications"; }); if (heading) { heading.parentElement.style.scrollMarginTop = "64px"; heading.parentElement.scrollIntoView(); } };
A.demosignout = function () { D.S.accountOpen = false; D.toast("Signed out (demo)"); D.render(); };
// Click a notice: it is read now, then follow its link (its app, when this person can open it).
A.notice = function (b) {
  if (D.noticeMenuJustOpened) { D.noticeMenuJustOpened = false; return; }
  var n = D.S.notices[+b.dataset.i]; if (!n) return; n.read = true;
  var t = D.tile(n.app);
  if (t && D.inGroup(t)) D.go(n.app); else { D.render(); focusNotice(b.dataset.i); }
};
function focusNotice(i) { var el = document.querySelector('.nli[data-i="' + i + '"]'); if (el) el.focus(); }
/* The notice menu: built straight into <body> (not part of render) at the pointer, or under the row from the keyboard. */
D.closeNoticeMenu = function (refocus) {
  var m = document.querySelector(".nmenu"); if (!m) return; var i = m.dataset.i; m.remove();
  if (refocus) focusNotice(i);
};
D.noticeMenu = function (row, x, y) {
  D.closeNoticeMenu(false);
  var i = row.dataset.i, n = D.S.notices[+i]; if (!n) return;
  if (x == null) { var r = row.getBoundingClientRect(); x = r.left + 20; y = r.bottom - 4; }
  var m = document.createElement("div");
  m.className = "nmenu"; m.setAttribute("role", "menu"); m.setAttribute("aria-label", "Notice"); m.dataset.i = i;
  m.innerHTML = '<button role="menuitem" data-nmenu="flip">' + (n.read ? "Mark as unread" : "Mark as read") + "</button>";
  document.body.appendChild(m);
  var w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + "px";
  m.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + "px";
  m.querySelector("button").focus();
};
document.addEventListener("click", function (e) {
  var m = document.querySelector(".nmenu"); if (!m) return;
  var it = e.target.closest("[data-nmenu]");
  if (!it && D.noticeMenuJustOpened && e.target.closest(".nli")) { e.preventDefault(); e.stopImmediatePropagation(); return; } // the tap that ends a long-press
  if (it) { var i = m.dataset.i, n = D.S.notices[+i]; if (n) n.read = !n.read; m.remove(); D.render(); focusNotice(i); }
  else m.remove();
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
document.addEventListener("contextmenu", function (e) {
  var row = e.target.closest && e.target.closest(".nli[data-i]");
  if (!row) { D.closeNoticeMenu(false); return; }
  e.preventDefault();
  var kb = !e.clientX && !e.clientY; // the context-menu key fires this with no pointer position
  var open = document.querySelector(".nmenu");
  if (open && open.dataset.i === row.dataset.i && (kb || D.noticeMenuJustOpened)) return; // already open (long-press, Shift+F10)
  D.noticeMenu(row, kb ? null : e.clientX, kb ? null : e.clientY);
});
document.addEventListener("keydown", function (e) {
  var m = document.querySelector(".nmenu");
  if (m && (e.key === "Escape" || e.key === "Tab")) { e.preventDefault(); e.stopImmediatePropagation(); D.closeNoticeMenu(true); return; }
  if (m && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End")) { e.preventDefault(); m.querySelector("button").focus(); return; }
  var row = e.target.closest && e.target.closest(".nli[data-i]");
  if (row && ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu")) { e.preventDefault(); D.noticeMenu(row); }
}, true);
// Long-press (~500 ms) on touch. The click that follows the press is swallowed so the link is not followed.
var pressTimer = null;
document.addEventListener("touchstart", function (e) {
  var row = e.target.closest && e.target.closest(".nli[data-i]"); if (!row || e.touches.length > 1) return;
  var t = e.touches[0], x = t.clientX, y = t.clientY;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(function () { pressTimer = null; D.noticeMenuJustOpened = true; D.noticeMenu(row, x, y); setTimeout(function () { D.noticeMenuJustOpened = false; }, 800); }, 500);
}, { passive: true });
["touchend", "touchmove", "touchcancel"].forEach(function (ev) { document.addEventListener(ev, function () { clearTimeout(pressTimer); pressTimer = null; }, { passive: true }); });
window.addEventListener("resize", function () { D.closeNoticeMenu(false); });
document.addEventListener("scroll", function () { D.closeNoticeMenu(false); }, true);
A.readall = function () { D.myNotices().forEach(function (n) { n.read = true; }); D.render(); };
// Open or close a group (Tools, More) and keep the focus on its row, in the Apps menu or on Home.
A.grp = function (b) { var id = b.dataset.v, place = b.dataset.place; D.setPref("open-" + id, !D.groupOpen(id)); D.render(); var el = document.getElementById("grp-" + place + "-" + id + "-btn"); if (el) el.focus(); };
// Home, Ground up: settle a thing where it is listed. Each calls the owning app's own function.
A.homeapprove = function (b) { if (apiWith(D.partsApi, ["approve"])) D.partsApi.approve(+b.dataset.v); };
A.homereq = function (b) { if (apiWith(D.partsApi, ["open"])) D.partsApi.open(+b.dataset.v); };
A.homesignoff = function (b) { if (apiWith(D.skillsApi, ["signOff"])) D.skillsApi.signOff(b.dataset.v); };
A.hometask = function (b) { if (apiWith(D.tasksApi, ["openTask"])) D.tasksApi.openTask(+b.dataset.v); };
A.homeproject = function (b) { if (D.tasksApi) D.tasksApi.openProject(b.dataset.v); };
A.goapp = function (b) { if (b.dataset.tab) D.S.tabs[b.dataset.app] = b.dataset.tab; D.go(b.dataset.app); };
A.closedrawer = function () { D.S.drawer = null; D.render(); };
A.closemodal = function () { D.S.modal = null; D.render(); };
A.undo = function () { if (undoFn) undoFn(); undoFn = null; D.S.toast = null; D.render(); };

document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-act]"); if (!b) return;
  if ((b.tagName === "SELECT" || b.tagName === "INPUT") && b.type !== "checkbox" && b.type !== "button") return;
  var fn = A[b.dataset.act]; if (fn) { e.preventDefault(); fn(b, e); }
});
document.addEventListener("change", function (e) { var t = e.target, k = t.getAttribute && t.getAttribute("data-change"); if (k && D.changes[k]) D.changes[k](t, e); });
document.addEventListener("input", function (e) { var t = e.target, k = t.getAttribute && t.getAttribute("data-input"); if (k && D.inputs[k]) D.inputs[k](t, e); });
document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  var S = D.S, accountFocus = !!S.accountOpen; if (S.modal) S.modal = null; else if (S.drawer) S.drawer = null; else if (S.bell || S.appsOpen || S.accountOpen) { S.bell = false; S.appsOpen = false; S.accountOpen = false; } else return;
  S.accountOpen = false; D.render(); if (accountFocus) document.querySelector(".acct").focus();
});
document.addEventListener("focusout", function (e) {
  if (!D.S.accountOpen || !e.relatedTarget) return;
  if (!e.relatedTarget.closest(".accountmenu, .acct")) {
    D.S.accountOpen = false;
    var panel = document.querySelector(".accountmenu"), scrim = document.querySelector(".menu-scrim");
    if (panel) panel.remove(); if (scrim) scrim.remove();
    var trigger = document.querySelector(".acct"); if (trigger) trigger.setAttribute("aria-expanded", "false");
  }
});
function routeFromHash() { var h = location.hash.slice(1); return h && (D.views[h] || D.tile(h) || D.ROUTE_TAB[h]) ? h : null; }
window.addEventListener("hashchange", function () { var h = routeFromHash(), was = D.S.tabs.calapp; if (!h) return; h = D.landing(h); if (h !== D.S.route || was !== D.S.tabs.calapp) { D.S.route = h; D.S.drawer = null; D.S.modal = null; D.render(); } });
D.boot = function () { D.reset(); var params = new URLSearchParams(location.search); var dz = params.get("design"); if (!DESIGNS[dz]) { try { dz = localStorage.getItem("2972-demo-design83"); } catch (e) { dz = null; } } D.setDesign(DESIGNS[dz] ? dz : "c"); if (Object.prototype.hasOwnProperty.call(D.ROLES, params.get("role"))) D.S.role = params.get("role"); if (params.get("mode") === "competition") D.S.mode = "competition"; if (params.get("event") === "1") D.S.eventDay = true; var h = routeFromHash(); if (h) { if (params.get("tab")) D.S.tabs[h] = params.get("tab"); D.S.route = D.landing(h); } D.render(); };
})();
