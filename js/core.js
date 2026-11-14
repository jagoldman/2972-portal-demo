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
  download: "M12 3v12M7 10l5 5 5-5M5 21h14"
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
  { id: "admin", name: "Admin", icon: "admin", svc: "admin.", desc: "Approve accounts and manage groups.", modes: ["build"], groups: ["admin"], more: true, ext: true },
  { id: "handbook", name: "Team Handbook", icon: "handbook", svc: "link", desc: "Student, family and mentor handbook.", modes: ["build"], groups: ALL, more: true, ext: true }
];
/* Tools: small helpers that open inside the site, in the same tab. They are not apps and not link-outs, so they get
   their own closed group under Apps. Adding a tool adds one row here and one page in js/tools.js, never a new tile. */
D.TOOLS = [
  { id: "tool-trace", name: "Drawing to vector", icon: "trace", line: "A photo of a drawing becomes a laser or CAD file.", tip: "Makes an SVG for the laser and a DXF for Onshape, at true size.", modes: ["build", "competition"], groups: BUILDERS },
  { id: "tool-gear", name: "Gear and sprocket finder", icon: "gear", line: "A photo and one measurement name the part.", tip: "Works out gear pitch, chain size or belt profile, then finds it in Parts.", modes: ["build", "competition"], groups: BUILDERS }
];
D.tool = function (id) { return D.TOOLS.filter(function (t) { return t.id === id; })[0]; };
D.isToolRoute = function (r) { return r === "tools" || !!D.tool(r); };
D.visibleTools = function () { return D.TOOLS.filter(function (t) { return D.inGroup(t) && t.modes.indexOf(D.S.mode) >= 0; }); };
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
  return '<div class="row between nowrap"><div style="min-width:0">' + (eyebrow ? '<p class="eyebrow">' + esc(eyebrow) + "</p>" : "") + "<h2>" + esc(title) + '</h2></div><button class="xbtn" data-act="closedrawer" aria-label="Close" data-tip="Close this panel">×</button></div>';
};
D.modalHead = function (title) { return '<div class="row between nowrap"><h2>' + esc(title) + '</h2><button class="xbtn" data-act="closemodal" aria-label="Close" data-tip="Close without saving">×</button></div>'; };

/* ---------- Shell pieces ---------- */
// Short descriptions for the Home tiles and the Apps menu.
// What each tile is for, as its hover description (never the same words as the short line under its name).
var TILETIP = { tasks: "Your next task, projects and the build plan.", calendar: "See practices, sign in at the door and sign up for snacks.", parts: "Ask for a part, follow orders and find spares on the shelves.", skills: "Training trees that unlock step by step, with mentor sign-offs.", schedule: "Who does which role at the event, and when.", pit: "Match checklists, robot issues and battery charge.", scouting: "Match forms, assignments, team stats and the pick list.", onshape: "The team's robot CAD. Opens in a new tab.", github: "Robot code for every season. Opens in a new tab.", drive: "The team's shared files. Opens in a new tab.", admin: "Approve new accounts and set people's groups.", handbook: "Rules and info for students, families and mentors." };
D.tileTip = function (id) { return TILETIP[id] ? ' data-tip="' + esc(TILETIP[id]) + '"' : ""; };
var SHORT = { tasks: "Your tasks", calendar: "Practices, attendance and snacks", parts: "Request and find parts", skills: "Training and sign-offs", schedule: "Your event roles", pit: "Checklists and batteries", scouting: "Match forms", onshape: "Robot CAD", github: "Robot code", drive: "Shared files", admin: "Accounts and groups", handbook: "Team rules and info" };
function demobar() {
  var S = D.S;
  var roles = ["student", "mentor", "admin", "parent", "display"].map(function (r) {
    return '<button data-act="role" data-v="' + r + '" aria-pressed="' + (S.role === r) + '">' + D.ROLES[r].label + "</button>";
  }).join("");
  return '<div class="demobar"><b>Demo</b><span>sample data</span>' +
    '<span class="seg" role="group" aria-label="View as">' + roles + "</span>" +
    '<label><input type="checkbox" id="evday" data-change="eventday"' + (S.eventDay ? " checked" : "") + "> Event day</label>" +
    '<span class="spacer"></span><button class="linkbtn" data-act="reset">Reset</button></div>';
}
/* One navy app bar on every app: Apps button, 2972 badge, the app's name; Competition chip, bell and account at the right.
   The apps menu and the bell panel hang from the bar so they stay under it while the page scrolls. */
function appbar() {
  var S = D.S, unread = D.myNotices().filter(function (n) { return !n.read; }).length;
  var cur = D.tile(S.route), here = S.route === "account" ? "Account" : D.isToolRoute(S.route) ? "Tools" : cur ? cur.name : "Gears & Buccaneers";
  return '<header class="appbar"><button class="appsbtn" data-act="apps" aria-expanded="' + !!S.appsOpen + '" aria-label="All apps" data-tip="Every app, tool and team link">' + D.ic("apps", 20) + "</button>" +
    '<a class="brand" href="' + D.appHref("portal") + '" target="_blank" rel="noopener noreferrer" aria-label="Portal home" data-act="go" data-v="portal"><span class="badge-2972">2972</span></a>' +
    '<span class="appname">' + esc(here) + '</span><span class="grow"></span>' +
    (S.mode === "competition" ? '<button class="modechip" data-act="go" data-v="account" aria-label="Competition mode" data-tip="Event apps are showing. Change it on your Account page.">Comp<span class="hide-sm">etition mode</span></button>' : "") +
    '<button class="iconbtn" data-act="bell" aria-expanded="' + !!S.bell + '" aria-label="Notifications" data-tip="What is new for you in every app">' + D.ic("bell") + (unread ? '<span class="count">' + unread + "</span>" : "") + "</button>" +
    (S.role !== "display" ? '<button class="iconbtn acct" data-act="accountmenu" aria-controls="account-menu" aria-expanded="' + !!S.accountOpen + '" aria-label="Account: ' + esc(D.me().name) + '" data-tip="Your theme, notices and account settings">' + esc(D.me().name.replace(/^(Ms|Mr|Dr)\. /, "").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2)) + "</button>" : "") +
    (S.appsOpen ? appsMenu() : "") + (S.bell ? bellPanel() : "") + (S.accountOpen && S.role !== "display" ? accountMenu() : "") + "</header>" +
    (S.appsOpen ? '<button class="menu-scrim" data-act="apps" aria-label="Close apps"></button>' : S.bell ? '<button class="menu-scrim" data-act="bell" aria-label="Close notifications"></button>' : S.accountOpen ? '<button class="menu-scrim" data-act="accountmenu" aria-label="Close account"></button>' : "");
}
function accountMenu() {
  var theme = document.documentElement.getAttribute("data-theme") || "";
  return '<div class="accountmenu" id="account-menu" aria-label="Account" data-keepscroll="accountmenu"><div><b>' + esc(D.me().name) + '</b><small class="mute">' + esc(D.me().groups.join(" · ")) + '</small></div><div role="group" aria-label="Theme"><h3>Theme</h3>' +
    [["", "Match my device"], ["light", "Light"], ["dark", "Dark"]].map(function (t) { return '<button class="accountchoice" data-act="menutheme" data-v="' + t[0] + '" aria-pressed="' + (theme === t[0]) + '">' + t[1] + '</button>'; }).join("") +
    '</div><a class="accountchoice" href="#account" data-act="accountnotifications">Notification settings</a><a class="accountchoice" href="#account" data-act="go" data-v="account">All account settings</a><button class="accountchoice" data-act="demosignout">Sign out</button></div>';

}
/* Tools and More: one quiet row each, closed by default, that opens a short list. The row is a real button with
   aria-expanded and its chevron turns. A group with nothing in it for this person is not shown. */
// The guide may open a group for one stop (D.S.guideOpen) without changing the saved choice.
D.groupOpen = function (id) { return !!D.pref("open-" + id, false) || !!(D.S.guideOpen && D.S.guideOpen[id]); };
function groupRow(id, label, count, place, body) {
  var open = D.groupOpen(id), bid = "grp-" + place + "-" + id;
  return '<div class="grp" data-grp="' + id + '"><button class="grphead" id="' + bid + '-btn" data-act="grp" data-v="' + id + '" data-place="' + place + '" aria-expanded="' + open + '" aria-controls="' + bid + '">' +
    '<span class="grpname">' + esc(label) + '</span><span class="tcount">' + count + '</span><span class="grpchev" aria-hidden="true">' + D.ic("chevron", 16) + "</span></button>" +
    '<div class="grpbody" id="' + bid + '"' + (open ? "" : " hidden") + ">" + body + "</div></div>";
}
D.toolRow = function (t) { return '<a class="toolrow" href="#' + t.id + '" data-act="go" data-v="' + t.id + '" data-tip="' + esc(t.tip) + '"><span class="ic">' + D.ic(t.icon, 18) + "</span><span><b>" + esc(t.name) + "</b><small>" + esc(t.line) + "</small></span></a>"; };
function toolsGroup(place) {
  var tools = D.visibleTools(); if (!tools.length) return "";
  return groupRow("tools", "Tools", tools.length, place, tools.map(D.toolRow).join("") + '<a class="toolrow all" href="#tools" data-act="go" data-v="tools"><span>All tools</span><span class="chev" aria-hidden="true">›</span></a>');
}
function appsMenu() {
  var S = D.S, tiles = D.visibleTiles();
  // Name only, two columns at every width (as the real bar's kit 0.2.3): the description is the tile's tip.
  function item(t) { return '<a class="appitem" href="' + D.appHref(t.id) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t.name) + ' (opens in a new tab)"' + D.tileTip(t.id) + (S.route === t.id ? ' aria-current="page"' : "") + '><span class="ic">' + D.ic(t.icon, 20) + "</span><b>" + esc(t.name) + (t.ext ? " ↗" : "") + "</b></a>"; }
  var more = tiles.filter(function (t) { return t.more; });
  return '<div class="appsmenu" role="dialog" aria-label="All apps" data-keepscroll="appsmenu"><div class="menuhead"><div class="seg" role="group" aria-label="Mode"><button data-act="mode" data-v="build" aria-pressed="' + (S.mode === "build") + '" data-tip="Show the apps for build season">Build</button><button data-act="mode" data-v="competition" aria-pressed="' + (S.mode === "competition") + '" data-tip="Show the event apps: schedule, pit and scouting">Competition</button></div><button class="xbtn" data-act="apps" aria-label="Close" data-tip="Close the apps menu">×</button></div>' +
    '<div class="appgrid">' + tiles.filter(function (t) { return !t.more; }).map(item).join("") + "</div>" +
    '<div class="menugroups">' + toolsGroup("menu") + (more.length ? groupRow("more", "More", more.length, "menu", '<div class="appgrid">' + more.map(item).join("") + "</div>") : "") + "</div></div>";
}
function bellPanel() {
  var list = D.myNotices();
  return '<div class="bellpanel" role="dialog" aria-label="Notifications" data-keepscroll="bellpanel"><div class="menuhead"><h3>Notifications</h3><span class="row nowrap"><button class="btn ghost sm" data-act="readall">Mark all read</button><button class="xbtn" data-act="bell" aria-label="Close" data-tip="Close notifications">×</button></span></div><div class="list">' +
    (list.length ? list.map(function (n) { return '<div class="li nli' + (n.read ? "" : " unread") + '"><span class="grow"><span class="app">' + esc(D.APPNAME[n.app] || "") + "</span> " + esc(n.text) + '</span><span class="who">' + esc(n.when) + "</span></div>"; }).join("") : '<p class="empty">Nothing yet.</p>') +
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
  return '<div class="li todayrow"><button class="rowlink" data-act="goapp" data-app="' + o.app + '"' + (o.tab ? ' data-tab="' + o.tab + '"' : "") + '><span class="rt">' + esc(o.title) + "</span>" + (o.line ? '<span class="rl">' + esc(o.line) + "</span>" : "") + (o.count ? '<span class="tcount warn">' + o.count + "</span>" : "") + '<span class="chev" aria-hidden="true">›</span></button>' + (o.btn || "") + "</div>";
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
    var silent = Object.keys(c.avail).filter(function (n) { var a = c.avail[n]; return !a.usual.length && !Object.keys(a.one).length; });
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
D.views.portal = function () {
  var S = D.S, tiles = D.visibleTiles(), staff = D.isStaff();
  var main = tiles.filter(function (t) { return !t.more; }), more = tiles.filter(function (t) { return t.more; });
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
  return '<div class="content home"><div class="homehead"><p class="homedate">' + esc(date) + "</p><h1>Hi " + esc(D.me().short) + ".</h1></div>" + (D.guideCard ? D.guideCard() : "") + cards +
    '<section class="stack"><h2 style="margin-bottom:10px">Apps</h2><div class="apptiles">' + main.map(tile).join("") + "</div>" +
    '<div class="homegroups">' + toolsGroup("home") +
    (more.length ? groupRow("more", "More", more.length, "home", '<ul class="morelinks">' + more.map(function (t) { return '<li><a href="' + D.appHref(t.id) + '" target="_blank" rel="noopener noreferrer"' + D.tileTip(t.id) + '>' + D.ic(t.icon, 16) + esc(t.name) + (t.ext ? " ↗" : "") + "</a></li>"; }).join("") + "</ul>") : "") +
    "</div></section>" + act + "</div>";
};
function displayHome(blocked) {
  return '<div class="display">' + (blocked ? '<div class="dcard" style="border-color:var(--gold)">' + esc(blocked) + " isn't available on a display. Pick one of these instead.</div>" : "") + '<h1>Pick what this screen shows</h1><div class="grid3">' +
    [["kiosk", "Door QR", "Sign in and out at the shop door"], ["monitor", "Pit monitor", "Next match, batteries, issues, pit duty"], ["projector", "Projector", "The build plan on the shop TV"]].map(function (d) {
      return '<button class="dcard" style="text-align:left;cursor:pointer" data-act="go" data-v="' + d[0] + '"><b style="font-size:1.3rem">' + d[1] + '</b><span class="dmute">' + d[2] + "</span></button>";
    }).join("") + '</div></div>';
}
function extTile(t) {
  return D.topbar(t.name, "", "", "") + '<div class="content"><div class="card"><p class="mute">' + esc(t.desc) + ' It opens in its own tab.</p><div><button class="btn" data-act="go" data-v="portal">Back to Home</button></div></div></div>';
}

/* ---------- Render ---------- */
D.render = function () {
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
A.readall = function () { D.myNotices().forEach(function (n) { n.read = true; }); D.render(); };
// Open or close a group (Tools, More) and keep the focus on its row, in the Apps menu or on Home.
A.grp = function (b) { var id = b.dataset.v, place = b.dataset.place; D.setPref("open-" + id, !D.groupOpen(id)); D.render(); var el = document.getElementById("grp-" + place + "-" + id + "-btn"); if (el) el.focus(); };
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
D.boot = function () { D.reset(); var params = new URLSearchParams(location.search); if (Object.prototype.hasOwnProperty.call(D.ROLES, params.get("role"))) D.S.role = params.get("role"); if (params.get("mode") === "competition") D.S.mode = "competition"; var h = routeFromHash(); if (h) { if (params.get("tab")) D.S.tabs[h] = params.get("tab"); D.S.route = D.landing(h); } D.render(); };
})();
