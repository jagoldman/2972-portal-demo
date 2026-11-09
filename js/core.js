/* Shared shell: state, rail, routing, drawers, toasts and the event wiring every app uses. */
(function () {
"use strict";
var D = window.D = { views: {}, acts: {}, inits: [], drawers: {}, modals: {}, changes: {}, inputs: {}, after: [] };

var ICON = {
  apps: "M5 5h.01M12 5h.01M19 5h.01M5 12h.01M12 12h.01M19 12h.01M5 19h.01M12 19h.01M19 19h.01",
  home: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  calendar: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4",
  here: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  snacks: "M5 11h14l-1.5 9h-11zM8 11V8a4 4 0 0 1 8 0v3",
  parts: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  skills: "M6 3v6M6 15v6M18 9v6M6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 12h6",
  kickoff: "M5 21V4M5 4h11l-2 4 2 4H5",
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
  collapse: "M15 6l-6 6 6 6",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  plus: "M12 5v14M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  folder: "M3 6h6l2 2h10v11H3z",
  robot: "M5 9h14v10H5zM9 9V5h6v4M9 14h.01M15 14h.01M3 13v3M21 13v3",
  history: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2",
  undo: "M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"
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
  { id: "calendar", name: "Calendar", icon: "calendar", svc: "calendar.", desc: "Practices, build days and competitions.", modes: ["build", "competition"], groups: ALL },
  { id: "here", name: "Attendance", icon: "here", svc: "calendar./here", desc: "Sign in at the door, mentor plans, hours.", modes: ["build", "competition"], groups: BUILDERS },
  { id: "snacks", name: "Snacks", icon: "snacks", svc: "calendar./snacks", desc: "Sign up to bring snacks to practice.", modes: ["build"], groups: ["admin", "mentor", "parent"] },
  { id: "parts", name: "Parts & Inventory", icon: "parts", svc: "parts.", desc: "Request parts, check orders in, find spares.", modes: ["build", "competition"], groups: BUILDERS },
  { id: "skills", name: "Skills", icon: "skills", svc: "skills.", desc: "Training trees that unlock step by step.", modes: ["build"], groups: BUILDERS },
  { id: "kickoff", name: "Kickoff", icon: "kickoff", svc: "kickoff.", desc: "Game analysis and strategy for the season.", modes: ["build"], groups: BUILDERS },
  { id: "schedule", name: "Schedule", icon: "schedule", svc: "compete./schedule", desc: "Who does which role at the event.", modes: ["competition"], groups: BUILDERS },
  { id: "pit", name: "Pit", icon: "pit", svc: "compete./pit", desc: "Match checklists, issues and batteries.", modes: ["competition"], groups: BUILDERS },
  { id: "scouting", name: "Scouting", icon: "scouting", svc: "compete./scouting", desc: "Match forms, assignments, stats and pick list.", modes: ["competition"], groups: BUILDERS },
  { id: "onshape", name: "Onshape", icon: "onshape", svc: "link", desc: "Robot CAD.", modes: ["build"], groups: BUILDERS, more: true, ext: true },
  { id: "github", name: "GitHub", icon: "github", svc: "link", desc: "Robot code for every season.", modes: ["build"], groups: BUILDERS, more: true, ext: true },
  { id: "drive", name: "Team Drive", icon: "drive", svc: "link", desc: "Shared files.", modes: ["build"], groups: BUILDERS, more: true, ext: true },
  { id: "admin", name: "Admin", icon: "admin", svc: "admin.", desc: "Approve accounts and manage groups.", modes: ["build"], groups: ["admin"], more: true, ext: true },
  { id: "handbook", name: "Team Handbook", icon: "handbook", svc: "link", desc: "Student, family and mentor handbook.", modes: ["build"], groups: ALL, more: true, ext: true }
];
D.APPNAME = { portal: "Portal", account: "Account", kiosk: "Door QR", monitor: "Pit monitor", projector: "Projector", kproj: "Kickoff projector" };
D.TILES.forEach(function (t) { D.APPNAME[t.id] = t.name; });
D.DISPLAY_ROUTES = { kiosk: 1, monitor: 1, projector: 1, kproj: 1 };

D.reset = function () {
  var prev = D.S || {};
  var S = D.S = {
    role: prev.role || "student", mode: "build", eventDay: false, route: prev.route || "portal", collapsed: false, open: false, bell: false,
    toast: null, drawer: null, modal: null, tabs: {}, ui: {},
    notices: [], activity: []
  };
  D.inits.forEach(function (f) { f(S); });
};
D.me = function () { return D.ROLES[D.S.role]; };
D.isStaff = function () { return D.S.role === "mentor" || D.S.role === "admin"; };
D.tile = function (id) { return D.TILES.filter(function (t) { return t.id === id; })[0]; };
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
  var S = D.S; S.route = route; S.open = false; S.bell = false; S.appsOpen = false; S.drawer = null; S.modal = null;
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
  return list.map(function (t) { return '<button class="tab" data-act="tab" data-app="' + app + '" data-v="' + t[0] + '" aria-pressed="' + (cur === t[0]) + '">' + esc(t[1]) + (t[2] ? ' <span class="tcount">' + esc(t[2]) + "</span>" : "") + (t[3] ? ' <span class="tcount warn">' + esc(t[3]) + "</span>" : "") + "</button>"; }).join("");
};
D.topbar = function (title, host, tabs, right) {
  return '<header class="topbar">' + (D.topbarLead || "") + "<div><h1>" + esc(title) + '</h1><div class="host">' + esc(host) + "</div></div>" +
    (tabs ? '<div class="tabs" role="group">' + tabs + "</div>" : "") + (right ? '<div class="right">' + right + "</div>" : "") + "</header>";
};
D.denied = function (name) {
  return D.topbar(name, "", "", "") + '<div class="content"><div class="card"><h2>You don\'t have access</h2><p class="mute">' + esc(D.me().label) + "s don't have " + esc(name) + '. If you think you need it, ask a team admin.</p><div><button class="btn" data-act="go" data-v="portal">Back to Home</button></div></div></div>';
};
D.openDrawer = function (type, data) { D.S.drawer = { type: type, data: data || {} }; D.render(); };
D.openModal = function (type, data) { D.S.modal = { type: type, data: data || {} }; D.render(); };
D.val = function (id) { var el = document.getElementById(id); return el ? el.value : ""; };
D.drawerHead = function (eyebrow, title) {
  return '<div class="row between nowrap"><div style="min-width:0"><p class="eyebrow">' + esc(eyebrow) + "</p><h2>" + esc(title) + '</h2></div><button class="xbtn" data-act="closedrawer" aria-label="Close">×</button></div>';
};
D.modalHead = function (title) { return '<div class="row between nowrap"><h2>' + esc(title) + '</h2><button class="xbtn" data-act="closemodal" aria-label="Close">×</button></div>'; };

/* ---------- Shell pieces ---------- */
function demobar() {
  var S = D.S;
  var roles = ["student", "mentor", "admin", "parent", "display"].map(function (r) {
    return '<button data-act="role" data-v="' + r + '" aria-pressed="' + (S.role === r) + '">' + D.ROLES[r].label + "</button>";
  }).join("");
  return '<div class="demobar"><b>2972 demo</b><span class="small">Sample data. Nothing is saved.</span>' +
    '<span class="seg" role="group" aria-label="View as">' + roles + "</span>" +
    '<label><input type="checkbox" id="evday" data-change="eventday"' + (S.eventDay ? " checked" : "") + "> Event day</label>" +
    '<span class="spacer"></span><button class="linkbtn" data-act="reset">Reset demo</button></div>';
}
/* One app bar across the top of every app: Apps menu, where you are, mode, bell, account. The left side stays free for each app's own navigation. */
function appbar() {
  var S = D.S, unread = D.myNotices().filter(function (n) { return !n.read; }).length;
  var cur = D.tile(S.route), here = S.route === "account" ? "Account" : cur ? cur.name : "";
  return '<header class="appbar"><button class="appsbtn" data-act="apps" aria-expanded="' + !!S.appsOpen + '" aria-label="All apps">' + D.ic("apps", 18) + '<span class="hide-sm">Apps</span><span aria-hidden="true">▾</span></button>' +
    '<a class="brand" href="' + D.appHref("portal") + '" target="_blank" rel="noopener noreferrer" aria-label="Portal home (opens in a new tab)"><span class="badge-2972">2972</span><span class="hide-sm">Gears &amp; Buccaneers</span></a>' +
    (here ? '<span class="crumb">/ ' + esc(here) + "</span>" : "") + '<span class="grow"></span>' +
    (S.mode === "competition" ? '<button class="leadchip" style="border:0" data-act="go" data-v="account" title="Change in Account settings">Competition mode</button>' : "") +
    '<button class="iconbtn" data-act="bell" aria-expanded="' + S.bell + '" aria-label="Notifications">' + D.ic("bell") + (unread ? '<span class="count">' + unread + "</span>" : "") + "</button>" +
    '<a class="iconbtn acct" href="' + D.appHref("account") + '" target="_blank" rel="noopener noreferrer" aria-label="Account (opens in a new tab)">' + esc(D.me().name.replace(/^(Ms|Mr|Dr)\. /, "").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2)) + "</a></header>";
}
function appsMenu() {
  var S = D.S, tiles = D.visibleTiles();
  function item(t) { return '<a class="appitem" href="' + D.appHref(t.id) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t.name) + ' (opens in a new tab)"' + (S.route === t.id ? ' aria-current="page"' : "") + '><span class="ic">' + D.ic(t.icon, 20) + "</span><span><b>" + esc(t.name) + (t.ext ? " ↗" : "") + "</b><small>" + esc(t.desc) + "</small></span></a>"; }
  return '<div class="appsmenu" role="dialog" aria-label="All apps"><div class="row between" style="align-items:flex-start"><div class="modeswitch" role="group" aria-label="App mode"><button data-act="mode" data-v="build" aria-pressed="' + (S.mode === "build") + '">Build</button><button data-act="mode" data-v="competition" aria-pressed="' + (S.mode === "competition") + '">Competition</button></div><span class="row nowrap"><button class="btn ghost sm" data-act="go" data-v="portal">Portal home</button><button class="xbtn" data-act="apps" aria-label="Close">×</button></span></div><div class="appgrid">' + tiles.filter(function (t) { return !t.more; }).map(item).join("") + "</div>" +
    (tiles.some(function (t) { return t.more; }) ? '<details class="apps-more"><summary>More</summary><div class="appgrid">' + tiles.filter(function (t) { return t.more; }).map(item).join("") + "</div></details>" : "") + "</div>";
}
function rail() {
  var S = D.S, tiles = D.visibleTiles();
  var main = tiles.filter(function (t) { return !t.more; }), more = tiles.filter(function (t) { return t.more; });
  var unread = D.myNotices().filter(function (n) { return !n.read; }).length;
  function item(t) {
    return '<button class="ritem" data-act="go" data-v="' + t.id + '"' + (S.route === t.id ? ' aria-current="page"' : "") + ' title="' + esc(t.name) + '">' + D.ic(t.icon) + '<span class="label">' + esc(t.name) + "</span>" + (t.ext ? '<span class="svc">↗</span>' : "") + "</button>";
  }
  return '<nav class="rail" aria-label="Apps">' +
    '<button class="brand" data-act="go" data-v="portal"><span class="badge-2972">2972</span><span>Gears &amp; Buccaneers<small>Team portal</small></span></button>' +
    '<button class="ritem" data-act="go" data-v="portal"' + (S.route === "portal" ? ' aria-current="page"' : "") + ">" + D.ic("home") + '<span class="label">Home</span></button>' +
    '<div class="rsect">' + (S.mode === "competition" ? "Competition mode" : "Build mode") + "</div>" + main.map(item).join("") +
    (more.length ? '<div class="rsect">More</div>' + more.map(item).join("") : "") +
    '<div class="grow"></div>' +
    '<button class="ritem" data-act="bell" aria-expanded="' + S.bell + '">' + D.ic("bell") + '<span class="label">Notifications</span>' + (unread ? '<span class="count">' + unread + "</span>" : "") + "</button>" +
    '<div class="modeswitch" role="group" aria-label="Mode"><button data-act="mode" data-v="build" aria-pressed="' + (S.mode === "build") + '">Build</button><button data-act="mode" data-v="competition" aria-pressed="' + (S.mode === "competition") + '">Competition</button></div>' +
    '<button class="ritem" data-act="go" data-v="account"' + (S.route === "account" ? ' aria-current="page"' : "") + ">" + D.ic("user") + '<span class="label">' + esc(D.me().name) + "</span></button>" +
    '<button class="ritem collapsetoggle" data-act="collapse" title="Collapse"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="transform:rotate(' + (S.collapsed ? 180 : 0) + 'deg)"><path d="' + ICON.collapse + '"/></svg><span class="label">Collapse</span></button></nav>';
}
function bellPanel() {
  var list = D.myNotices();
  return '<div class="panel' + (D.S.collapsed ? " narrow" : "") + '" role="dialog" aria-label="Notifications"><div class="row between"><h3>Notifications</h3><span class="row nowrap"><button class="btn ghost sm" data-act="readall">Mark all read</button><button class="xbtn" data-act="bell" aria-label="Close">×</button></span></div><div class="list">' +
    (list.length ? list.map(function (n) { return '<div class="li nli' + (n.read ? "" : " unread") + '"><span class="pill ' + (n.read ? "" : "gold") + '">' + esc(D.APPNAME[n.app]) + '</span><span class="grow">' + esc(n.text) + '</span><span class="who">' + esc(n.when) + "</span></div>"; }).join("") : '<p class="mute">Nothing yet.</p>') +
    '</div><p class="small mute">One bell for every app. Choose Discord and email per kind on your <button class="linkbtn" style="color:var(--accent)" data-act="go" data-v="account">Account</button> page.</p></div>';
}
function banner() {
  var S = D.S; if (!S.eventDay) return "";
  return '<div class="banner"><b>Colorado Regional</b><span>Day 2 of 4 · Pit 42 · Rank 9 of 48</span><a href="https://www.thebluealliance.com" target="_blank" rel="noopener noreferrer">The Blue Alliance ↗</a><a href="https://www.twitch.tv/firstinspires" target="_blank" rel="noopener noreferrer">Livestream ↗</a>' +
    (S.mode !== "competition" ? '<button class="btn sm primary" data-act="mode" data-v="competition">Switch to Competition</button>' : "") + "</div>";
}

/* ---------- Portal and display home ---------- */
D.views.portal = function () {
  var S = D.S, tiles = D.visibleTiles();
  var main = tiles.filter(function (t) { return !t.more; }), more = tiles.filter(function (t) { return t.more; });
  function tile(t) { return '<a class="tile" href="' + D.appHref(t.id) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t.name) + ' (opens in a new tab)"><span class="ic">' + D.ic(t.icon, 22) + "</span><b>" + esc(t.name) + (t.ext ? " ↗" : "") + '</b><p class="hide-sm">' + esc(t.desc) + "</p>" + (SHORT[t.id] ? '<p class="tshort">' + esc(SHORT[t.id]) + "</p>" : "") + "</a>"; }
  // Phone tiles have room for a few words only.
  var SHORT = { tasks: "Your tasks", calendar: "Practices and events", here: "Attendance and hours", snacks: "Snack sign-up", parts: "Request and find parts", skills: "Training and sign-offs", kickoff: "Game strategy", schedule: "Your event roles", pit: "Checklists and batteries", scouting: "Match forms", onshape: "Robot CAD", github: "Robot code", drive: "Shared files", admin: "Accounts and groups", handbook: "Team rules and info" };
  var greet = (D.greetings && D.greetings[S.role]) || "Welcome back.";
  var act = S.role === "parent" ? "" : '<div class="card"><div class="row between"><h2>Recent activity</h2><span class="small mute">Everyone sees who did what</span></div><div class="list">' +
    S.activity.slice(0, 7).map(function (a) { return '<div class="li actli"><span class="pill">' + esc(D.APPNAME[a.app]) + '</span><span class="grow"><b>' + esc(a.who) + "</b> " + esc(a.what) + '</span><span class="who">' + esc(a.when) + "</span></div>"; }).join("") + "</div></div>";
  return D.topbar("Home", "portal.2972robotics.com", "", S.mode === "competition" ? "" : '<span class="pill gold">Build mode</span>') +
    '<div class="content"><div><p class="eyebrow">' + esc(D.me().label) + ' view</p><h2 style="font-size:1.5rem">' + esc(greet) + "</h2></div>" +
    (S.role === "student" && S.eventDay && D.myShiftCard ? D.myShiftCard() : "") +
    (S.role === "student" && D.nextUpCard ? (S.eventDay ? '<div class="evcompact">' + D.nextUpCard() + "</div>" : D.nextUpCard()) : "") +
    '<div class="tiles">' + main.map(tile).join("") + "</div>" +
    (more.length ? '<div><p class="eyebrow" style="margin-bottom:8px">More</p><div class="tiles">' + more.map(tile).join("") + "</div></div>" : "") + act +
    '<p class="flowhint">Switch roles in the yellow bar, choose <b>Competition</b> mode on your Account page, or tick <b>Event day</b>. The <b>Apps</b> menu at the top left reaches every tool from anywhere. Behind the tiles run five services: Account, Calendar, Parts, Competition and Skills.</p></div>';
};
D.greetings = { student: "Hi Sam.", mentor: "Hi Ms. Rivera. 2 sign-offs and 4 parts are waiting.", admin: "Hi Mr. Okafor. One request needs your OK and Dr. Patel hasn't answered for this week.", parent: "Hi Pat. Thursday still needs snacks." };
function displayHome(blocked) {
  return '<div class="display">' + (blocked ? '<div class="dcard" style="border-color:var(--gold)">' + esc(blocked) + " isn't available on a display. Pick one of these instead.</div>" : "") + '<p class="dmute">Signed in as a display account · read-only · set up once per screen by an admin</p><h1>Pick what this screen shows</h1><div class="grid3">' +
    [["kiosk", "Door QR", "Sign in and out at the shop door"], ["monitor", "Pit monitor", "Next match, batteries, issues, pit duty"], ["projector", "Projector", "The build plan on the shop TV"], ["kproj", "Kickoff projector", "Strategy points and the live vote"]].map(function (d) {
      return '<button class="dcard" style="text-align:left;cursor:pointer" data-act="go" data-v="' + d[0] + '"><b style="font-family:var(--display);font-size:1.3rem">' + d[1] + '</b><span class="dmute">' + d[2] + "</span></button>";
    }).join("") + '</div><p class="dmute">A display can open only these pages. Everything else answers “not allowed”.</p></div>';
}
function extTile(t) {
  return D.topbar(t.name, t.svc === "link" ? "external link" : t.svc + "2972robotics.com", "", "") + '<div class="content"><div class="card"><h2>' + esc(t.name) + '</h2><p class="mute">' + esc(t.desc) + " This tool already exists and stays as it is. In the real portal the tile opens it, and it gets the same rail.</p></div></div>";
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
    html += appbar() + '<div class="main">' + banner() + content + "</div>" + (S.bell ? '<button class="drawer-scrim" style="background:transparent;z-index:49" data-act="bell" aria-label="Close notifications"></button>' + bellPanel() : "") + (S.appsOpen ? '<button class="drawer-scrim" style="background:transparent;z-index:49" data-act="apps" aria-label="Close apps"></button>' + appsMenu() : "");
  }
  if (S.drawer && D.drawers[S.drawer.type]) html += '<button class="drawer-scrim" data-act="closedrawer" aria-label="Close panel"></button><aside class="drawer" role="dialog" aria-modal="true">' + D.drawers[S.drawer.type](S.drawer.data) + "</aside>";
  if (S.modal && D.modals[S.modal.type]) html += '<button class="modal-scrim" data-act="closemodal" aria-label="Close dialog"></button><div class="modal" role="dialog" aria-modal="true">' + D.modals[S.modal.type](S.modal.data) + "</div>";
  if (S.toast) html += '<div class="toast" role="status"><span>' + esc(S.toast.text) + "</span>" + (S.toast.undo ? '<button data-act="undo">Undo</button>' : "") + "</div>";
  root.innerHTML = html;
  Object.keys(scrollers).forEach(function (k) { var el = document.querySelector('[data-keepscroll="' + k + '"]'); if (el) { el.scrollLeft = scrollers[k][0]; el.scrollTop = scrollers[k][1]; } });
  D.after.forEach(function (f) { try { f(); } catch (e) { if (window.console) console.error(e); } });
  if (activeId) { var el = document.getElementById(activeId); if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) { el.focus(); try { if (selStart != null) el.setSelectionRange(selStart, selStart); } catch (e) {} } }
};
// On phones the tabs wrap into an even grid: one row up to four tabs, otherwise two rows.
D.after.push(function () { var row = document.querySelector(".topbar .tabs"); if (!row) return; var n = [].filter.call(row.children, function (t) { return getComputedStyle(t).display !== "none"; }).length; row.style.setProperty("--cols", n <= 4 ? n : Math.ceil(n / 2)); });

/* ---------- Shell actions ---------- */
var A = D.acts;
A.role = function (b) {
  var S = D.S; S.role = b.dataset.v; S.bell = false; S.appsOpen = false; S.drawer = null; S.modal = null;
  (D.onRole || []).forEach(function (f) { f(S.role); });
  if (S.role === "display") { S.route = D.DISPLAY_ROUTES[S.route] ? S.route : "portal"; }
  else if (!(S.route === "portal" || S.route === "account" || (D.tile(S.route) && D.inGroup(S.route)) || (D.DISPLAY_ROUTES[S.route] && (D.isStaff() || (S.route === "kproj" && D.inGroup("kickoff")))))) S.route = "portal";
  D.render();
};
D.changes.eventday = function (el) { D.S.eventDay = el.checked; D.render(); };
A.reset = function () { D.reset(); D.toast("Demo reset to its sample data."); D.render(); };
A.go = function (b) { D.go(b.dataset.v); };
A.tab = function (b) { D.S.tabs[b.dataset.app] = b.dataset.v; D.S.drawer = null; D.render(); };
A.mode = function (b) { var S = D.S; S.mode = b.dataset.v; if (S.route !== "portal" && S.route !== "account" && D.tile(S.route) && D.visibleTiles().indexOf(D.tile(S.route)) < 0) S.route = "portal"; D.render(); };
A.bell = function () { D.S.bell = !D.S.bell; D.S.appsOpen = false; D.render(); };
A.apps = function () { D.S.appsOpen = !D.S.appsOpen; D.S.bell = false; D.render(); };
A.readall = function () { D.myNotices().forEach(function (n) { n.read = true; }); D.render(); };
A.collapse = function () { D.S.collapsed = !D.S.collapsed; D.render(); };
A.drawernav = function () { D.S.open = !D.S.open; D.render(); };
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
  var S = D.S; if (S.modal) S.modal = null; else if (S.drawer) S.drawer = null; else if (S.bell || S.open || S.appsOpen) { S.bell = false; S.open = false; S.appsOpen = false; } else return;
  D.render();
});
function routeFromHash() { var h = location.hash.slice(1); return h && (D.views[h] || D.tile(h)) ? h : null; }
window.addEventListener("hashchange", function () { var h = routeFromHash(); if (h && h !== D.S.route) { D.S.route = h; D.S.drawer = null; D.S.modal = null; D.render(); } });
D.boot = function () { D.reset(); var params = new URLSearchParams(location.search); if (Object.prototype.hasOwnProperty.call(D.ROLES, params.get("role"))) D.S.role = params.get("role"); if (params.get("mode") === "competition") D.S.mode = "competition"; var h = routeFromHash(); if (h) D.S.route = h; D.render(); };
})();
