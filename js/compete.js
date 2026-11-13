/* Competition service: Schedule (paint roles in 15-minute slots), Pit (checklists, editor, archives, issues, batteries, monitor), Scouting (match form, drawing, assignments, coverage, stats, pick list, forms). */
(function () {
"use strict";
var esc = D.esc;
var TEAMS = [2972, 1619, 4499, 1410, 3200, 2036, 4068, 2945, 1157, 3374, 159, 4388, 3729, 5493, 6763, 7457, 8334, 9033];
var ROLES = {
  pit: { label: "Pit", color: "var(--role-pit)", type: "pit" }, scout: { label: "Scouting", color: "var(--role-scout)", type: "scouting" },
  drive: { label: "Drive team", color: "var(--role-drive)", type: "other" }, media: { label: "Media", color: "var(--role-media)", type: "other" },
  lead: { label: "Lead mentor", color: "var(--role-lead)", type: "other" }, brk: { label: "Break", color: "var(--role-break)", type: "other" }
};
var PEOPLE = ["Sam Ortiz", "Leo Brooks", "Priya Shah", "Ava Kim", "Jordan Lee", "Maya Gold", "Nina Park", "Omar Haddad", "Ms. Rivera", "Mr. Chen"];
var START = 8 * 60, SLOTS = 36;
function slotLabel(i) { var m = START + i * 15, h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + ":" + (mm < 10 ? "0" : "") + mm; }
function rnd(seed) { var x = Math.sin(seed) * 10000; return x - Math.floor(x); }

function makeDay(shift) {
  var rows = {};
  var pattern = { "Sam Ortiz": "bbbbssssssssbbbbppppppppbbbbssssssss", "Leo Brooks": "ppppppppppppbbbbssssssssbbbbpppppppp", "Priya Shah": "ddddddddddddddddbbbbddddddddddddbbbb", "Ava Kim": "ssssssssbbbbppppppppssssssssbbbbpppp",
    "Jordan Lee": "ddddddddddddddddbbbbddddddddddddbbbb", "Maya Gold": "bbbbmmmmmmmmssssssssbbbbssssssssmmmm", "Nina Park": "ssssssssssssbbbbmmmmmmmmssssssssbbbb", "Omar Haddad": "ppppbbbbssssssssppppppppbbbbssssssss",
    "Ms. Rivera": "llllllllllllllllllllllllllllllllllll", "Mr. Chen": "ppppppppppppppppbbbbpppppppppppppppp" };
  var map = { s: "scout", p: "pit", d: "drive", b: "brk", m: "media", l: "lead" };
  PEOPLE.forEach(function (p) { var s = pattern[p]; if (shift) s = s.slice(shift) + s.slice(0, shift); rows[p] = s.split("").map(function (c) { return map[c]; }); });
  return rows;
}
function makeMatches() {
  var ms = [];
  for (var q = 1; q <= 30; q++) {
    var pool = TEAMS.slice().sort(function (a, b) { return rnd(q * 31 + a) - rnd(q * 31 + b); }).slice(0, 6);
    if ([6, 14, 22, 30].indexOf(q) >= 0 && pool.indexOf(2972) < 0) pool[q === 14 ? 0 : 3] = 2972;
    if (q === 14) pool = [1619, 2972, 4068, 4499, 1410, 3200];
    ms.push({ q: q, red: pool.slice(0, 3), blue: pool.slice(3, 6), time: slotLabel(Math.min(35, 2 + Math.floor(q * 1.05))) });
  }
  return ms;
}
function makeReports(matches) {
  var reps = [], scouts = ["Sam Ortiz", "Ava Kim", "Maya Gold", "Nina Park", "Omar Haddad", "Leo Brooks"];
  matches.slice(0, 13).forEach(function (m) {
    m.red.concat(m.blue).forEach(function (t, i) {
      if (rnd(m.q * 7 + i) < .08) return;
      var base = (t % 7) / 7;
      reps.push({ q: m.q, team: t, scout: scouts[(m.q + i) % scouts.length], auto: Math.round(base * 3 + rnd(t + m.q) * 2), tele: Math.round(3 + base * 7 + rnd(t * 3 + m.q) * 4), end: ["None", "Park", "Shallow climb", "Deep climb"][Math.min(3, Math.floor(base * 3 + rnd(t + m.q * 5) * 1.6))], defense: Math.floor(rnd(t * m.q) * 4), late: rnd(m.q * 13 + i) < .07, notes: "" });
    });
  });
  return reps;
}
D.inits.push(function (S) {
  var matches = makeMatches();
  S.comp = {
    day: 1, days: ["Fri Mar 5", "Sat Mar 6"], sched: [makeDay(0), makeDay(4)], periods: [[["Load in", 0, 4], ["Practice matches", 4, 16], ["Lunch", 16, 20], ["Practice matches", 20, 36]], [["Quals", 0, 16], ["Lunch", 16, 20], ["Quals", 20, 32], ["Alliance selection", 32, 36]]],
    nowSlot: 5, published: true, editing: false, paint: "pit", friends: ["Leo Brooks", "Ava Kim"], showFriends: false, remind: 10,
    lists: [
      { name: "Before queuing", items: [ { n: "Battery in, strapped, latched", c: true, by: "Priya", at: "10:31" }, { n: "Bumpers on, numbers facing out", c: true, by: "Leo", at: "10:31" }, { n: "Radio light solid, robot enabled once in the pit", c: false } ] },
      { name: "Mechanical", items: [ { n: "Intake rollers spin freely", c: false }, { n: "Elevator chain tension", c: false }, { n: "All swerve module bolts torqued", c: true, by: "Omar", at: "10:28" } ] },
      { name: "Electrical", items: [ { n: "Main breaker on, RSL blinking", c: false }, { n: "No loose CAN connectors", c: false }, { n: "Battery voltage above 12.8 V", c: true, by: "Priya", at: "10:30" } ] },
      { name: "Software", items: [ { n: "Correct auto selected on the dashboard", c: false }, { n: "Logs from last match downloaded", c: true, by: "Priya", at: "10:22" } ] }
    ],
    issues: [ { n: "Cracked 22T sprocket on the intake", by: "Leo", at: "10:20", part: "Sprocket", spare: null, since: 12 }, { n: "Left elevator bearing squeaks", by: "Omar", at: "9:55", part: "Bearing", spare: null, since: 11 } ],
    archives: [], last: 13,
    batteries: [ { id: "B1", s: "In robot", v: "12.9", uses: 14, mins: 6 }, { id: "B2", s: "Next up", v: "13.1", uses: 11, mins: 42 }, { id: "B3", s: "Charging", v: "", uses: 16, mins: 25 }, { id: "B4", s: "Charging", v: "", uses: 9, mins: 61 }, { id: "B5", s: "Idle", v: "", uses: 3, mins: 120 }, { id: "B6", s: "Broken", v: "", uses: 31, mins: 900 } ],
    paused: false,
    matches: matches, current: 14, reports: makeReports(matches),
    form: { leave: null, auto: 0, tele: 0, end: null, defense: 1, notes: "", path: [], secs: 120, ext: 0, team: 1619, slot: "Red 1", q: 14 },
    sort: "tele", open: null,
    tiers: { first: [1410, 1619], second: [4499, 3200, 2036], maybe: [4068, 2945], dnp: [3374] },
    fields: [ { label: "Left the starting zone", type: "Multiple choice", opts: "Yes, No" }, { label: "Auto path", type: "Field drawing", opts: "" }, { label: "Game pieces in auto", type: "Counter", opts: "steps 1" }, { label: "Game pieces in teleop", type: "Counter", opts: "steps 1" }, { label: "Defense played", type: "Slider", opts: "0–4" }, { label: "Endgame", type: "Multiple choice", opts: "None, Park, Shallow climb, Deep climb" }, { label: "Notes", type: "Long text", opts: "" } ],
    leads: ["Priya Shah"]
  };
  for (var a = 12; a >= 10; a--) S.comp.archives.push({ label: "Qual " + (a === 12 ? 6 : a === 11 ? 3 : 1), when: ["9:12", "9:48", "10:05"][12 - a], by: "Priya Shah", ticked: 11, total: 13, issues: [{ n: "Left elevator bearing squeaks", s: a === 12 ? "open" : "new" }] });
  S.notices.push({ to: "student", app: "schedule", text: "At 10:00 you're on Scouting until 11:00.", when: "9:50", read: false });
});
function C() { return D.S.comp; }
function scheduleRows() { return C().sched[C().day]; }
function nowRole(p) { return scheduleRows()[p][C().nowSlot]; }
function onDuty(type) { return PEOPLE.filter(function (p) { return ROLES[nowRole(p)].type === type; }); }
D.compApi = { onDuty: onDuty };

/* ---------- Schedule ---------- */
D.views.schedule = function () {
  var staff = D.isStaff(), list = [["mine", "My schedule"], ["all", "Everyone"]];
  if (staff) list.push(["roles", "Roles"], ["settings", "Settings"]);
  var t = D.tab("schedule", "mine"), c = C(), body;
  var ev = D.calApi && D.calApi.currentEvent();
  var dayTabs = '<span class="seg">' + c.days.map(function (d, i) { return '<button data-act="sday" data-v="' + i + '" aria-pressed="' + (c.day === i) + '">' + d + "</button>"; }).join("") + "</span>";
  if (t === "all") body = everyone(dayTabs); else if (t === "roles" && staff) body = rolesView(); else if (t === "settings" && staff) body = settingsView(); else body = mySchedule(dayTabs);
  var meta = '<div class="row evmeta"><span class="mute">' + esc(ev ? ev.name : "Colorado Regional") + '</span><span class="pill ' + (c.published ? "ok" : "warn") + '">' + (c.published ? "Published" : "Draft") + "</span></div>";
  return D.topbar("Schedule", "", D.tabsFor("schedule", list, "mine"), "") + '<div class="content cmp">' + meta + body + "</div>";
};
function runsOf(row) { var runs = []; row.forEach(function (r, i) { if (!runs.length || runs[runs.length - 1].r !== r) runs.push({ r: r, from: i, to: i }); else runs[runs.length - 1].to = i; }); return runs; }
D.myShiftCard = function () { return mySchedule("", true); };
function mySchedule(dayTabs, heroOnly) {
  var c = C(), who = D.S.role === "student" ? "Sam Ortiz" : PEOPLE.indexOf(D.me().name) >= 0 ? D.me().name : "Ms. Rivera";
  var row = scheduleRows()[who], runs = runsOf(row), cur = runs.filter(function (r) { return r.from <= c.nowSlot && c.nowSlot <= r.to; })[0], nxt = runs[runs.indexOf(cur) + 1];
  return '<div class="card hero"><div class="row between"><div><p class="eyebrow">' + c.days[c.day] + " · now " + slotLabel(c.nowSlot) + '</p><h2 class="herotitle">' + esc(ROLES[cur.r].label) + " until " + slotLabel(cur.to + 1) + "</h2>" + (nxt ? '<p class="mute">Then ' + esc(ROLES[nxt.r].label) + " at " + slotLabel(nxt.from) + ".</p>" : "") + "</div>" + dayTabs + "</div>" +
    (cur.r === "scout" ? '<div><button class="btn primary" data-act="go" data-v="scouting">Open my scouting match</button></div>' : cur.r === "pit" ? '<div><button class="btn primary" data-act="go" data-v="pit">Open Pit checklists</button></div>' : "") + "</div>" +
    (heroOnly ? "" : '<div class="card"><h2>' + esc(who) + '</h2><div class="timeline">' + runs.map(function (r) { return '<div class="tlrow"><span class="num small">' + slotLabel(r.from) + "–" + slotLabel(r.to + 1) + '</span><div class="tlbar' + (r === cur ? " now" : "") + '" style="--rc:' + ROLES[r.r].color + '"><span>' + esc(ROLES[r.r].label) + "</span>" + (r === cur ? '<b class="nowtag">Now</b>' : "") + "</div></div>"; }).join("") + "</div></div>");
}
function everyone(dayTabs) {
  var c = C(), rows = scheduleRows(), staff = D.isStaff();
  var people = c.showFriends ? PEOPLE.filter(function (p) { return c.friends.indexOf(p) >= 0 || p === "Sam Ortiz"; }) : PEOPLE;
  var cols = "150px repeat(" + SLOTS + ", 22px)";
  var periods = '<span class="h">Periods</span>' + c.periods[c.day].map(function (p) { return '<span class="period" style="grid-column:' + (p[1] + 2) + " / " + (p[2] + 2) + '">' + esc(p[0]) + "</span>"; }).join("");
  var hdr = '<span></span>' + Array.apply(null, { length: SLOTS }).map(function (_, i) { return '<span class="h">' + (i % 4 === 0 ? slotLabel(i) : "") + "</span>"; }).join("");
  var body = people.map(function (p) {
    var fr = c.friends.indexOf(p) >= 0;
    return '<span class="name"><button class="linkbtn star' + (fr ? " on" : "") + '" data-act="sfriend" data-v="' + esc(p) + '" aria-label="Friend" data-tip="Star someone to follow their shifts">' + (fr ? "★" : "☆") + "</button>" + esc(p) + "</span>" +
      rows[p].map(function (r, i) { return '<button class="cell' + (i === c.nowSlot ? " now" : "") + '" style="background:' + ROLES[r].color + '" data-cell="1" data-p="' + esc(p) + '" data-i="' + i + '" data-tip="' + esc(p) + " · " + slotLabel(i) + " · " + ROLES[r].label + '"' + (c.editing ? "" : ' tabindex="-1"') + "></button>"; }).join("");
  }).join("");
  return '<div class="card"><div class="row between">' + dayTabs + '<div class="row">' + (staff ? '<label class="row small tgl"><button class="toggle" data-act="sedit" aria-pressed="' + c.editing + '" aria-label="Editing"></button> Editing</label>' : "") + '<button class="chip" data-act="sfriends" aria-pressed="' + c.showFriends + '">★ Friends only</button></div></div>' +
    (c.editing ? '<div class="row"><span class="small">Paint with:</span>' + Object.keys(ROLES).map(function (k) { return '<button class="sw" data-act="spaint" data-v="' + k + '" aria-pressed="' + (c.paint === k) + '"><i style="background:' + ROLES[k].color + '"></i>' + ROLES[k].label + "</button>"; }).join("") + '</div><p class="small mute">Drag across cells to paint.</p>' : "") +
    '<div class="tablewrap" data-keepscroll="sgrid"><div class="sgrid" style="grid-template-columns:' + cols + '">' + periods + hdr + body + "</div></div>" +
    '<div class="row">' + Object.keys(ROLES).map(function (k) { var n = people.filter(function (p) { return rows[p][c.nowSlot] === k; }).length; return '<span class="sw"><i style="background:' + ROLES[k].color + '"></i>' + ROLES[k].label + " · " + n + " now</span>"; }).join("") + "</div>" +
    (staff && !c.published ? '<div class="row"><button class="btn primary" data-act="spublish">Publish schedule</button></div>' : "") + "</div>";
}
function rolesView() {
  return '<div class="card"><div class="row between"><h2>Roles</h2><button class="btn sm" data-act="saddrole">+ Add role</button></div><div class="list">' + Object.keys(ROLES).map(function (k) { var r = ROLES[k]; return '<div class="li"><span class="sw"><i style="background:' + r.color + '"></i>' + esc(r.label) + '</span><span class="grow who">' + (r.type === "pit" ? "Shows on the pit monitor" : r.type === "scouting" ? "Gets scouting assignments" : "") + '</span><button class="btn ghost sm">Edit</button></div>'; }).join("") + '</div></div>';
}
function settingsView() {
  var c = C();
  return '<div class="card"><h2>Schedule settings</h2><div class="formgrid"><div class="field"><label>Event</label><input value="Colorado Regional" readonly></div><div class="field"><label for="s-rem">Remind people</label><select id="s-rem" data-change="sremind"><option value="5"' + (c.remind === 5 ? " selected" : "") + '>5 minutes before</option><option value="10"' + (c.remind === 10 ? " selected" : "") + '>10 minutes before</option><option value="15"' + (c.remind === 15 ? " selected" : "") + '>15 minutes before</option></select></div><div class="field"><label>Days and hours</label><input value="Fri and Sat, 8:00 am – 5:00 pm" readonly></div></div>' +
    '<div class="row"><label class="row small tgl"><button class="toggle" data-act="spubtoggle" aria-pressed="' + c.published + '" aria-label="Published"></button> Published</label></div><p class="flabel">Editors besides mentors</p><div class="row"><span class="pill">Priya Shah</span><button class="btn sm">+ Add</button></div></div>';
}

/* Painting by drag */
var painting = false, painted = [];
document.addEventListener("pointerdown", function (e) {
  var cell = e.target.closest && e.target.closest("[data-cell]"); if (!cell || !D.S.comp || !C().editing) return;
  painting = true; painted = []; paintCell(cell); e.preventDefault();
});
document.addEventListener("pointermove", function (e) {
  if (!painting) return; var el = document.elementFromPoint(e.clientX, e.clientY); var cell = el && el.closest && el.closest("[data-cell]"); if (cell) paintCell(cell);
});
document.addEventListener("pointerup", function () {
  if (!painting) return; painting = false;
  if (painted.length) { var c = C(); painted.forEach(function (x) { scheduleRows()[x[0]][x[1]] = c.paint; }); c.published = false; D.toast("Painted " + painted.length + " slots as " + ROLES[c.paint].label + ". Publish when ready."); D.render(); }
});
function paintCell(cell) { var p = cell.dataset.p, i = +cell.dataset.i; if (painted.some(function (x) { return x[0] === p && x[1] === i; })) return; painted.push([p, i]); cell.style.background = ROLES[C().paint].color; }

/* ---------- Pit ---------- */
D.views.pit = function () {
  var staff = D.isStaff(), list = [["check", "Checklists"], ["batt", "Batteries"], ["archives", "Archives"]];
  if (staff) list.push(["edit", "Edit lists"]);
  var t = D.tab("pit", "check"), body = t === "batt" ? batteries() : t === "archives" ? archives() : t === "edit" && staff ? editLists() : checklists();
  return D.topbar("Pit", "", D.tabsFor("pit", list, "check"), '<button class="btn sm" data-act="go" data-v="monitor">' + D.ic("projector", 16) + '<span class="hide-sm"> Pit monitor</span><span class="show-sm-inline">Monitor</span></button>') + '<div class="content cmp">' + body + "</div>";
};
function nextOurs() { var c = C(); return c.matches.filter(function (m) { return m.q >= c.current && (m.red.indexOf(2972) >= 0 || m.blue.indexOf(2972) >= 0); })[0]; }
function checklists() {
  var c = C(), total = 0, ticked = 0, m = nextOurs(), red = m.red.indexOf(2972) >= 0;
  c.lists.forEach(function (l) { l.items.forEach(function (i) { total++; if (i.c) ticked++; }); });
  return '<div class="card hero"><div class="row between"><div><p class="eyebrow">Next match · ' + (m.q === c.current ? "on the field now" : (m.q - c.current) + " matches away") + " · scheduled " + m.time + '</p><h2 class="herotitle">Qual ' + m.q + " · " + (red ? "Red" : "Blue") + '</h2><p class="mute">With ' + (red ? m.red : m.blue).filter(function (t) { return t !== 2972; }).join(" and ") + " · against " + (red ? m.blue : m.red).join(", ") + '</p></div><span class="pill ' + (ticked === total ? "ok" : "warn") + '">' + ticked + " of " + total + " checked</span></div>" + '<div class="bar"><i class="ok" style="width:' + D.pct(ticked, total) + '%"></i></div>' +
    '<div class="row"><button class="btn" data-act="pitarchive">Archive as Qual ' + c.last + '</button><button class="btn" data-act="pitreset">Reset</button></div></div>' +
    '<div class="grid2">' + c.lists.map(function (l, li) {
      return '<div class="card"><h2>' + esc(l.name) + "</h2><div>" + l.items.map(function (it, ii) { return '<div class="checkrow"><button class="bigcheck" data-act="pittick" data-l="' + li + '" data-i="' + ii + '" aria-pressed="' + it.c + '" aria-label="' + esc(it.n) + '">' + D.ic("check", 28) + "</button><div><b>" + esc(it.n) + "</b>" + (it.c ? '<div class="who">' + esc(it.by) + " · " + esc(it.at) + "</div>" : "") + '</div><button class="btn sm" data-act="pitissue" data-l="' + li + '" data-i="' + ii + '">Problem</button></div>'; }).join("") + "</div></div>";
    }).join("") + "</div>" + issuesCard();
}
function issuesCard() {
  var c = C();
  return '<div class="card"><h2>Open issues</h2><div class="list">' + (c.issues.length ? c.issues.map(function (is, k) {
    return '<div class="li"><span class="grow"><b>' + esc(is.n) + '</b><br><span class="who">' + esc(is.by) + " · " + esc(is.at) + " · open since Qual " + is.since + "</span>" + (is.spare ? '<br><span class="pill ' + (is.spare.ok ? "ok" : "warn") + '">' + esc(is.spare.text) + "</span>" : "") + '</span><button class="btn sm" data-act="pitspare" data-v="' + k + '">Do we have a spare?</button><button class="btn sm" data-act="pitpart" data-v="' + k + '">Request a part</button><button class="btn ghost sm" data-act="pitresolve" data-v="' + k + '">Resolved</button></div>';
  }).join("") : '<div class="empty">No open issues.</div>') + '</div><div class="row nowrap"><input id="pit-new" class="inp" placeholder="Describe a problem…" aria-label="New issue"><button class="btn" data-act="pitadd">Add issue</button></div></div>';
}
function batteries() {
  var c = C(), states = ["Charging", "Next up", "In robot", "Idle", "Broken"];
  return '<div class="row"><button class="btn sm" data-act="pitpause">' + (c.paused ? "Unpause all timers" : "Pause all timers") + '</button></div><div class="grid3">' + c.batteries.map(function (b, i) {
    var cls = b.s === "Broken" ? "bad" : b.s === "In robot" ? "ok" : b.s === "Next up" ? "info" : b.s === "Charging" ? "warn" : "";
    return '<div class="card tight"><div class="row between"><h2 class="num">' + b.id + '</h2><span class="pill ' + cls + '">' + b.s + '</span></div><div class="row small"><span>Used ' + b.uses + ' times</span><span class="mute">· ' + (b.mins >= 120 ? Math.round(b.mins / 60) + " h" : b.mins + " min") + " in this state" + (c.paused ? " (paused)" : "") + '</span></div><div class="row nowrap"><select class="chipsel" data-change="pitbstate" data-i="' + i + '" aria-label="State of ' + b.id + '">' + states.map(function (s) { return "<option" + (s === b.s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>" + (b.s === "Next up" || b.s === "In robot" ? '<input class="inp volt" data-input="pitbv" data-i="' + i + '" value="' + esc(b.v) + '" aria-label="Voltage"><span class="small">V</span>' : "") + "</div></div>";
  }).join("") + "</div>";
}
function archives() {
  var c = C();
  return '<div class="card"><h2>Archives</h2><div class="list">' + (c.archives.length ? "" : '<div class="empty">Nothing archived yet.</div>') + c.archives.map(function (a, i) { return '<button class="li click" data-act="pitarch" data-i="' + i + '"><b class="archlbl">' + esc(a.label) + '</b><span class="grow who">' + a.ticked + " of " + a.total + " checked · " + a.issues.length + " issue" + (a.issues.length === 1 ? "" : "s") + '</span><span class="who">' + esc(a.by) + " · " + esc(a.when) + "</span></button>"; }).join("") + "</div></div>";
}
D.drawers.pitarch = function (d) {
  var a = C().archives[d.i];
  return D.drawerHead("Archive", a.label) + '<p class="who">Archived by ' + esc(a.by) + " at " + esc(a.when) + "</p>" + (a.lists ? a.lists.map(function (l) { return '<div><p class="flabel">' + esc(l.name) + '</p><div class="list">' + l.items.map(function (it) { return '<div class="li"><span class="pill ' + (it.c ? "ok" : "") + '">' + (it.c ? "Checked" : "Not checked") + '</span><span class="grow">' + esc(it.n) + "</span>" + (it.c ? '<span class="who">' + esc(it.by) + "</span>" : "") + "</div>"; }).join("") + "</div></div>"; }).join("") : '<p class="small">' + a.ticked + " of " + a.total + " items were checked.</p>") +
    '<div><p class="flabel">Issues</p><div class="list">' + a.issues.map(function (is) { return '<div class="li"><span class="pill ' + (is.s === "resolved" ? "ok" : is.s === "new" ? "warn" : "") + '">' + is.s + "</span>" + esc(is.n) + "</div>"; }).join("") + "</div></div>";
};
function editLists() {
  var c = C();
  return c.lists.map(function (l, li) { return '<div class="card"><div class="row between"><input class="inp listname" value="' + esc(l.name) + '" aria-label="List name"><button class="btn ghost sm danger" data-act="pitdellist" data-l="' + li + '">Delete list</button></div><div class="list">' + l.items.map(function (it, ii) { return '<div class="li"><span class="grow">' + esc(it.n) + '</span><button class="btn ghost sm" data-act="pitmove" data-l="' + li + '" data-i="' + ii + '" data-v="-1" aria-label="Move up" data-tip="Move this item up the list">↑</button><button class="btn ghost sm" data-act="pitmove" data-l="' + li + '" data-i="' + ii + '" data-v="1" aria-label="Move down" data-tip="Move this item down the list">↓</button><button class="btn ghost sm danger" data-act="pitdel" data-l="' + li + '" data-i="' + ii + '">Remove</button></div>'; }).join("") + '</div><div class="row nowrap"><input id="pit-add-' + li + '" class="inp" placeholder="New item" aria-label="New item"><button class="btn sm" data-act="pitadditem" data-l="' + li + '">Add</button></div></div>'; }).join("") + '<div><button class="btn" data-act="pitnewlist">+ New list</button></div>';
}

D.views.monitor = function () {
  if (!(D.inGroup("pit") || D.S.role === "display")) return D.denied("Pit monitor");
  var c = C(), ticked = 0, total = 0; c.lists.forEach(function (l) { l.items.forEach(function (i) { total++; if (i.c) ticked++; }); });
  var ours = c.matches.filter(function (m) { return m.q >= c.current && (m.red.indexOf(2972) >= 0 || m.blue.indexOf(2972) >= 0); }).slice(0, 3), m = ours[0], red = m.red.indexOf(2972) >= 0;
  var inR = c.batteries.filter(function (b) { return b.s === "In robot"; })[0], nx = c.batteries.filter(function (b) { return b.s === "Next up"; })[0];
  return '<div class="display"><div class="row between"><div><h1>Colorado Regional · Team 2972</h1></div><p style="font-size:1.3rem">Rank <b>9</b> of 48 · 4–2–0 · Now on field: Qual ' + c.current + "</p></div>" +
    '<div class="grid3"><div class="dcard" style="border-color:' + (red ? "#c0392b" : "#2f6fd6") + '"><p class="dmute">Our next match</p><span class="big">Qual ' + m.q + '</span><p style="font-size:1.2rem">' + (red ? "Red" : "Blue") + " · queue 20 min before · on field " + m.time + "</p></div>" +
    '<div class="dcard"><p class="dmute">Checklist</p><span class="big num">' + ticked + "/" + total + '</span><p style="font-size:1.1rem">' + c.issues.length + " open issue" + (c.issues.length === 1 ? "" : "s") + ": " + esc(c.issues.map(function (x) { return x.n; }).join("; ")) + "</p></div>" +
    '<div class="dcard"><p class="dmute">Batteries</p><p style="font-size:1.5rem"><b>In robot</b> ' + (inR ? inR.id + " · " + esc(inR.v) + " V" : "—") + "<br><b>Next up</b> " + (nx ? nx.id + " · " + esc(nx.v) + " V" : "—") + "</p></div></div>" +
    '<div class="grid2"><div class="dcard"><p class="dmute">On pit duty now</p><p style="font-size:1.5rem">' + esc(onDuty("pit").join(", ")) + '</p></div><div class="dcard"><p class="dmute">Our upcoming matches</p><table class="dtable"><tbody>' + ours.map(function (x) { var r = x.red.indexOf(2972) >= 0; return "<tr><td><b>Qual " + x.q + "</b></td><td>" + x.time + '</td><td style="color:' + (r ? "#ff8a80" : "#8ab4ff") + '">' + (r ? "Red" : "Blue") + "</td><td>" + (r ? x.red : x.blue).filter(function (t) { return t !== 2972; }).join(", ") + "</td></tr>"; }).join("") + "</tbody></table></div></div>" +
    (D.S.role !== "display" ? '<div><button class="btn" data-act="go" data-v="pit">Exit monitor</button></div>' : "") + "</div>";
};

/* ---------- Scouting ---------- */
D.views.scouting = function () {
  var staff = D.isStaff(), lead = staff || C().leads.indexOf(D.me().name) >= 0;
  var list = [["form", "My match"], ["stats", "Stats"], ["picks", "Pick list"]];
  if (lead) list.push(["assign", "Assignments"], ["coverage", "Coverage"]);
  if (staff) list.push(["forms", "Forms"]);
  var t = D.tab("scouting", "form"), body = t === "stats" ? stats() : t === "picks" ? picks() : t === "assign" && lead ? assignments() : t === "coverage" && lead ? coverage() : t === "forms" && staff ? forms() : matchForm();
  var isForm = !(t === "stats" || t === "picks" || (t === "assign" && lead) || (t === "coverage" && lead) || (t === "forms" && staff));
  return D.topbar("Scouting", "", D.tabsFor("scouting", list, "form"), "") + '<div class="content cmp">' + (isForm && onShiftNow() ? "" : '<p class="mute">Current match: <span class="abbr" tabindex="0" data-tip="Qualification match; the matches before the playoffs">Qual ' + C().current + "</span></p>") + body + "</div>";
};
function onShiftNow() { return D.S.role !== "student" || nowRole("Sam Ortiz") === "scout"; }
function matchForm() {
  var c = C(), f = c.form, onShift = onShiftNow();
  if (!onShift) return '<div class="card"><h2>You\'re not scouting right now</h2><p class="mute">Your schedule has you on ' + esc(ROLES[nowRole("Sam Ortiz")].label) + '. Your assignment shows here when your scouting shift starts.</p></div>';
  var ch = function (k, opts) { return '<div class="choice">' + opts.map(function (o) { return '<button data-act="sc" data-k="' + k + '" data-v="' + esc(o) + '" aria-pressed="' + (f[k] === o) + '">' + esc(o) + "</button>"; }).join("") + "</div>"; };
  var ct = function (k, label) { return '<div class="field"><span class="flabel">' + label + '</span><div class="counter"><button data-act="scnt" data-k="' + k + '" data-v="-1" aria-label="Minus one" data-tip="Take one off the count">−</button><output class="num">' + f[k] + '</output><button data-act="scnt" data-k="' + k + '" data-v="1" aria-label="Plus one" data-tip="Add one to the count">+</button></div></div>'; };
  var mm = Math.floor(f.secs / 60), ss = f.secs % 60;
  return '<div class="card hero"><div class="row between"><div><p class="eyebrow">Your assignment</p><h2 class="herotitle">Qual ' + f.q + " · " + f.slot + " · Team " + f.team + '</h2></div><div class="timer"><p class="eyebrow">Send within</p><p class="big num" id="sc-clock">' + mm + ":" + (ss < 10 ? "0" : "") + ss + '</p><button class="btn sm" data-act="scext"' + (f.ext >= 3 ? " disabled" : "") + ">+30 s (" + (3 - f.ext) + " left)</button></div></div></div>" +
    '<div class="card"><h2>Auto</h2><div class="field"><span class="flabel">Left the starting zone</span>' + ch("leave", ["Yes", "No"]) + '</div><div class="field"><span class="flabel">Auto path (draw it)</span><canvas id="sc-field" class="fieldcanvas" width="640" height="320"></canvas><div class="row"><button class="btn sm" data-act="scundo">Undo</button><button class="btn sm" data-act="scclear">Clear</button><button class="btn sm" data-act="scnomove">No movement</button></div></div>' + ct("auto", "Game pieces scored in auto") + "</div>" +
    '<div class="card"><h2>Teleop</h2>' + ct("tele", "Game pieces scored in teleop") + '<div class="field"><label for="sc-def">Defense played: ' + ["none", "a little", "some", "a lot", "all match"][f.defense] + '</label><input id="sc-def" type="range" min="0" max="4" value="' + f.defense + '" data-change="scdef"></div></div>' +
    '<div class="card"><h2>Endgame</h2>' + ch("end", ["None", "Park", "Shallow climb", "Deep climb"]) + '<div class="field"><label for="sc-notes">Notes</label><textarea id="sc-notes" class="inp" rows="2" data-input="scnotes" placeholder="Anything the strategy lead should know">' + esc(f.notes) + '</textarea></div><div class="row sendbar"><button class="btn primary" data-act="scsend">Send report</button><span class="small mute">' + D.S.comp.reports.filter(function (r) { return r.scout === "Sam Ortiz"; }).length + " sent by you at this event</span></div></div>";
}
var clock = null;
D.after.push(function () {
  var cv = document.getElementById("sc-field");
  if (cv) drawField(cv);
  var el = document.getElementById("sc-clock");
  if (!el) { if (clock) { clearInterval(clock); clock = null; } return; }
  if (!clock) clock = setInterval(function () { var f = C().form, e = document.getElementById("sc-clock"); if (!e) { clearInterval(clock); clock = null; return; } if (f.secs > 0) f.secs--; var mm = Math.floor(f.secs / 60), ss = f.secs % 60; e.textContent = mm + ":" + (ss < 10 ? "0" : "") + ss; e.style.color = f.secs < 30 ? "var(--bad)" : ""; }, 1000);
});
function drawField(cv) {
  var x = cv.getContext("2d"), w = cv.width, h = cv.height, f = C().form;
  x.fillStyle = "#1d2a1f"; x.fillRect(0, 0, w, h);
  x.strokeStyle = "rgba(255,255,255,.5)"; x.lineWidth = 2; x.strokeRect(6, 6, w - 12, h - 12); x.beginPath(); x.moveTo(w / 2, 6); x.lineTo(w / 2, h - 6); x.stroke();
  x.fillStyle = "rgba(220,60,50,.35)"; x.fillRect(6, 6, 70, h - 12); x.fillStyle = "rgba(60,110,220,.35)"; x.fillRect(w - 76, 6, 70, h - 12);
  x.fillStyle = "rgba(255,255,255,.7)"; x.font = "12px sans-serif"; x.fillText("Red start", 14, 22); x.fillText("Blue start", w - 70, 22);
  [[180, 90], [180, 230], [w - 180, 90], [w - 180, 230]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 18, 0, 7); x.strokeStyle = "rgba(232,185,49,.8)"; x.stroke(); });
  x.strokeStyle = "#e8b931"; x.lineWidth = 4; x.lineCap = "round";
  f.path.forEach(function (stroke) { x.beginPath(); stroke.forEach(function (p, i) { if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); }); x.stroke(); });
}
var drawing = null;
document.addEventListener("pointerdown", function (e) { if (e.target.id !== "sc-field") return; var r = e.target.getBoundingClientRect(), sx = e.target.width / r.width; drawing = [[(e.clientX - r.left) * sx, (e.clientY - r.top) * sx]]; C().form.path.push(drawing); e.target.setPointerCapture(e.pointerId); e.preventDefault(); });
document.addEventListener("pointermove", function (e) { if (!drawing || e.target.id !== "sc-field") return; var r = e.target.getBoundingClientRect(), sx = e.target.width / r.width; drawing.push([(e.clientX - r.left) * sx, (e.clientY - r.top) * sx]); drawField(e.target); });
document.addEventListener("pointerup", function () { drawing = null; });

function teamStats() {
  var by = {};
  C().reports.forEach(function (r) { var s = by[r.team] = by[r.team] || { team: r.team, n: 0, auto: 0, tele: 0, ends: {}, late: 0 }; s.n++; s.auto += r.auto; s.tele += r.tele; s.ends[r.end] = (s.ends[r.end] || 0) + 1; if (r.late) s.late++; });
  return Object.keys(by).map(function (k) { var s = by[k]; s.auto /= s.n; s.tele /= s.n; var top = Object.keys(s.ends).sort(function (a, b) { return s.ends[b] - s.ends[a]; })[0]; s.endTxt = top + " " + s.ends[top] + "/" + s.n; s.deep = (s.ends["Deep climb"] || 0) / s.n; return s; });
}
function stats() {
  var c = C(), rows = teamStats(), key = c.sort;
  rows.sort(function (a, b) { return key === "team" ? a.team - b.team : b[key] - a[key]; });
  var th = function (k, label) { return '<th><button class="linkbtn sorth' + (c.sort === k ? " on" : "") + '" data-act="ssort" data-v="' + k + '">' + label + (c.sort === k ? " ↓" : "") + "</button></th>"; };
  return '<div class="card"><div class="row between"><div><h2>Teams at Colorado Regional</h2><span class="who">' + c.reports.length + " reports from Quals 1–13 · tap a team for its reports</span></div>" + (D.isStaff() ? '<button class="btn sm">Download CSV</button>' : "") + '</div><div class="tablewrap"><table><thead><tr>' + th("team", "Team") + th("n", "Reports") + th("auto", "Auto") + th("tele", "Teleop") + th("deep", "Endgame") + "<th>Late</th></tr></thead><tbody>" +
    rows.map(function (s) {
      var open = c.open === s.team;
      return '<tr data-act="sopen" data-v="' + s.team + '"' + (s.team === 2972 ? ' class="click mine"' : ' class="click"') + "><td><b>" + s.team + "</b></td><td>" + s.n + "</td><td>" + s.auto.toFixed(1) + "</td><td>" + s.tele.toFixed(1) + "</td><td>" + esc(s.endTxt) + "</td><td>" + (s.late || "") + "</td></tr>" +
        (open ? '<tr><td colspan="6" class="openrep"><div class="list">' + c.reports.filter(function (r) { return r.team === s.team; }).map(function (r) { return '<div class="li"><b class="archlbl">Qual ' + r.q + '</b><span class="grow small">Auto ' + r.auto + " · Teleop " + r.tele + " · " + esc(r.end) + " · defense " + r.defense + (r.notes ? " · “" + esc(r.notes) + "”" : "") + '</span><span class="who">' + esc(r.scout) + "</span>" + (r.late ? '<span class="pill warn">Late</span>' : "") + "</div>"; }).join("") + "</div></td></tr>" : "");
    }).join("") + "</tbody></table></div></div>";
}
var TIERS = [["first", "First pick"], ["second", "Second pick"], ["maybe", "Maybe"], ["dnp", "Do not pick"]];
function picks() {
  var c = C(), st = {}; teamStats().forEach(function (s) { st[s.team] = s; });
  var placed = []; TIERS.forEach(function (t) { placed = placed.concat(c.tiers[t[0]]); });
  var rest = TEAMS.filter(function (t) { return t !== 2972 && placed.indexOf(t) < 0; });
  function card(t) { var s = st[t]; return '<div class="pcard" draggable="true" data-team="' + t + '"><b>' + t + '</b><span class="who grow">' + (s ? s.tele.toFixed(1) + " tele · " + esc(s.endTxt) : "no reports") + '</span><select class="chipsel" data-change="spick" data-v="' + t + '" aria-label="Move ' + t + '"><option value="">Move…</option>' + TIERS.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + "</option>"; }).join("") + '<option value="none">Unsorted</option></select></div>'; }
  return '<div class="card"><div class="row between"><h2>Pick list</h2><span class="who">Drag teams between tiers, or use Move.</span></div><div class="tiers">' +
    TIERS.map(function (t) { return '<div class="tier" data-tier="' + t[0] + '"><p class="eyebrow">' + t[1] + " · " + c.tiers[t[0]].length + "</p>" + c.tiers[t[0]].map(card).join("") + "</div>"; }).join("") + '</div><p class="flabel">Unsorted</p><div class="tier unsorted" data-tier="none">' + rest.map(card).join("") + "</div></div>";
}
var dragTeam = null;
document.addEventListener("dragstart", function (e) { var c = e.target.closest && e.target.closest("[data-team]"); if (!c) return; dragTeam = +c.dataset.team; try { e.dataTransfer.setData("text/plain", String(dragTeam)); } catch (x) {} });
document.addEventListener("dragover", function (e) { var t = e.target.closest && e.target.closest("[data-tier]"); if (t && dragTeam) { e.preventDefault(); t.classList.add("over"); } });
document.addEventListener("dragleave", function (e) { var t = e.target.closest && e.target.closest("[data-tier]"); if (t) t.classList.remove("over"); });
document.addEventListener("drop", function (e) { var t = e.target.closest && e.target.closest("[data-tier]"); if (!t || !dragTeam) return; e.preventDefault(); moveTeam(dragTeam, t.dataset.tier); dragTeam = null; });
function moveTeam(team, tier) { var c = C(); TIERS.forEach(function (t) { c.tiers[t[0]] = c.tiers[t[0]].filter(function (x) { return x !== team; }); }); if (tier !== "none") c.tiers[tier].push(team); D.log("moved " + team + " to " + (tier === "none" ? "Unsorted" : TIERS.filter(function (x) { return x[0] === tier; })[0][1]), "scouting"); D.render(); }
function assignments() {
  var c = C(), scouts = PEOPLE.filter(function (p) { return ROLES[scheduleRows()[p][c.nowSlot]].type === "scouting"; });
  var ms = c.matches.filter(function (m) { return m.q >= c.current; }).slice(0, 6);
  return '<div class="card"><div class="row between"><div><h2>Assignments</h2><span class="who">' + scouts.length + " on scouting now: " + esc(scouts.join(", ")) + '</span></div><div class="row"><span class="small">Current match</span><button class="btn sm" data-act="snext">Qual ' + c.current + " → " + (c.current + 1) + '</button></div></div><div class="tablewrap"><table><thead><tr><th>Match</th><th>Red 1</th><th>Red 2</th><th>Red 3</th><th>Blue 1</th><th>Blue 2</th><th>Blue 3</th></tr></thead><tbody>' +
    ms.map(function (m) { var all = m.red.concat(m.blue); return "<tr><td><b>Qual " + m.q + '</b><br><span class="who">' + m.time + "</span></td>" + all.map(function (t, i) { var s = scouts.length ? scouts[(m.q + i) % scouts.length] : "—"; return '<td><b class="' + (i < 3 ? "redt" : "bluet") + '">' + t + '</b><br><span class="who">' + esc(i < scouts.length ? s : "no scout") + "</span></td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div></div>";
}
function coverage() {
  var c = C(), ms = c.matches.filter(function (m) { return m.q < c.current; });
  return '<div class="card"><h2>Coverage</h2><div class="tablewrap"><table><thead><tr><th>Match</th><th colspan="3">Red</th><th colspan="3">Blue</th><th>Done</th></tr></thead><tbody>' +
    ms.map(function (m) { var all = m.red.concat(m.blue), n = 0; var cells = all.map(function (t) { var has = c.reports.some(function (r) { return r.q === m.q && r.team === t; }); if (has) n++; return '<td><span class="pill ' + (has ? "ok" : "bad") + '">' + t + "</span></td>"; }).join(""); return "<tr><td><b>Qual " + m.q + "</b></td>" + cells + "<td>" + n + "/6</td></tr>"; }).join("") + "</tbody></table></div></div>";
}
function forms() {
  var c = C();
  return '<div class="grid2"><div class="card"><div class="row between"><h2>Match form</h2><span class="pill ok">In use</span></div><div class="list">' + c.fields.map(function (f, i) { return '<div class="li"><span class="grow"><b>' + esc(f.label) + '</b><br><span class="who">' + esc(f.type) + (f.opts ? " · " + esc(f.opts) : "") + '</span></span><button class="btn ghost sm" data-act="sfmove" data-i="' + i + '" data-v="-1" aria-label="Move up" data-tip="Move this item up the list">↑</button><button class="btn ghost sm danger" data-act="sfdel" data-i="' + i + '">Remove</button></div>'; }).join("") +
    '</div><div class="formgrid"><div class="field"><label for="sf-l">New question</label><input id="sf-l" value="Robot tipped over"></div><div class="field"><label for="sf-t">Type</label><select id="sf-t"><option>Multiple choice</option><option>Counter</option><option>Slider</option><option>Short text</option><option>Long text</option><option>Multi-select</option><option>Field drawing</option></select></div></div><div class="row"><button class="btn sm" data-act="sfadd">Add question</button></div></div>' +
    '<div class="card"><h2>Other forms</h2><div class="list"><div class="li"><b class="grow">Pit scouting</b><span class="pill ok">In use</span><span class="who">9 questions</span></div><div class="li"><b class="grow">Practice-match form</b><span class="pill">Hidden</span><span class="who">5 questions</span></div></div><h3>Deadlines</h3><p class="small mute">Reports are due 2 minutes after a match. Scouts can add up to three 30-second extensions.</p><h3>Strategy leads</h3><div class="row"><span class="pill">Priya Shah</span><button class="btn sm">+ Add</button></div></div></div>';
}

/* ---------- Actions ---------- */
var A = D.acts;
A.sday = function (b) { C().day = +b.dataset.v; D.render(); };
A.sedit = function () { C().editing = !C().editing; D.render(); };
A.spaint = function (b) { C().paint = b.dataset.v; D.render(); };
A.sfriend = function (b) { var f = C().friends, i = f.indexOf(b.dataset.v); if (i >= 0) f.splice(i, 1); else f.push(b.dataset.v); D.render(); };
A.sfriends = function () { C().showFriends = !C().showFriends; D.render(); };
A.spublish = function () { C().published = true; D.notify(["student", "mentor"], "schedule", "The Saturday schedule changed. Check My schedule."); D.log("published the event schedule", "schedule"); D.toast("Published. People whose shifts changed were told."); D.render(); };
A.spubtoggle = function () { C().published = !C().published; D.render(); };
D.changes.sremind = function (el) { C().remind = +el.value; };
A.saddrole = function () { ROLES.safety = { label: "Safety captain", color: "#6aa6a0", type: "other" }; D.toast("Added Safety captain."); D.render(); };
A.pittick = function (b) { var it = C().lists[+b.dataset.l].items[+b.dataset.i]; it.c = !it.c; it.by = D.me().short; it.at = "10:4" + (+b.dataset.i + 1); if (it.c) D.log("checked “" + it.n + "”", "pit"); D.render(); };
A.pitissue = function (b) { var it = C().lists[+b.dataset.l].items[+b.dataset.i]; var el = document.getElementById("pit-new"); C().issues.push({ n: "Problem: " + it.n, by: D.me().short, at: "10:45", part: "", spare: null, since: C().last }); D.toast("Issue added. It stays open until someone resolves it."); D.render(); };
A.pitarchive = function () {
  var c = C(), snap = JSON.parse(JSON.stringify(c.lists)), ticked = 0, total = 0;
  snap.forEach(function (l) { l.items.forEach(function (i) { total++; if (i.c) ticked++; }); });
  c.archives.unshift({ label: "Qual " + c.last, when: "10:46", by: D.me().name, ticked: ticked, total: total, lists: snap, issues: c.issues.map(function (x) { return { n: x.n, s: x.since === c.last ? "new" : "open" }; }) });
  c.lists.forEach(function (l) { l.items.forEach(function (i) { i.c = false; i.by = null; }); }); c.last++;
  D.log("archived the checklists after Qual " + (c.last - 1), "pit"); D.toast("Saved as Qual " + (c.last - 1) + ". Lists reset; open issues stay."); D.render();
};
A.pitreset = function () { C().lists.forEach(function (l) { l.items.forEach(function (i) { i.c = false; }); }); D.render(); };
A.pitspare = function (b) { var is = C().issues[+b.dataset.v], s = D.partsApi.stockFor(is.part || is.n.split(" ").slice(-2).join(" ")); is.spare = s ? { ok: s.store > 0, text: s.store ? "Yes: " + s.store + " × " + s.name + " in " + s.where + " (Parts & Inventory)" : "None left in the shop" } : { ok: false, text: "Not in inventory" }; D.render(); };
A.pitpart = function (b) { var is = C().issues[+b.dataset.v]; D.partsApi.startRequest({ catalogName: is.part, task: "Pit issue: " + is.n, from: "Pit", sub: "Pit", pri: "blocking", need: "2027-03-05" }); };
A.pitresolve = function (b) { var is = C().issues.splice(+b.dataset.v, 1)[0]; D.log("resolved “" + is.n + "”", "pit"); D.render(); };
A.pitadd = function () { var v = D.val("pit-new").trim(); if (!v) return; C().issues.push({ n: v, by: D.me().short, at: "10:45", part: v.split(" ").slice(-1)[0], spare: null, since: C().last }); D.render(); };
A.pitpause = function () { C().paused = !C().paused; D.render(); };
D.changes.pitbstate = function (el) { var b = C().batteries[+el.dataset.i]; if (el.value === "In robot" && b.s !== "In robot") { b.uses++; C().batteries.forEach(function (x) { if (x !== b && x.s === "In robot") x.s = "Charging"; }); } b.s = el.value; b.mins = 0; D.log("moved battery " + b.id + " to " + el.value, "pit"); D.render(); };
D.inputs.pitbv = function (el) { C().batteries[+el.dataset.i].v = el.value; };
A.pitarch = function (b) { D.openDrawer("pitarch", { i: +b.dataset.i }); };
A.pitdel = function (b) { C().lists[+b.dataset.l].items.splice(+b.dataset.i, 1); D.render(); };
A.pitmove = function (b) { var l = C().lists[+b.dataset.l].items, i = +b.dataset.i, j = i + (+b.dataset.v); if (j < 0 || j >= l.length) return; var t = l[i]; l[i] = l[j]; l[j] = t; D.render(); };
A.pitadditem = function (b) { var v = D.val("pit-add-" + b.dataset.l).trim(); if (!v) return; C().lists[+b.dataset.l].items.push({ n: v, c: false }); D.render(); };
A.pitdellist = function (b) { C().lists.splice(+b.dataset.l, 1); D.render(); };
A.pitnewlist = function () { C().lists.push({ name: "New list", items: [] }); D.render(); };
A.sc = function (b) { C().form[b.dataset.k] = b.dataset.v; D.render(); };
A.scnt = function (b) { var f = C().form; f[b.dataset.k] = Math.max(0, f[b.dataset.k] + (+b.dataset.v)); D.render(); };
D.changes.scdef = function (el) { C().form.defense = +el.value; D.render(); };
D.inputs.scnotes = function (el) { C().form.notes = el.value; };
A.scundo = function () { C().form.path.pop(); D.render(); };
A.scclear = function () { C().form.path = []; D.render(); };
A.scnomove = function () { C().form.path = []; C().form.leave = "No"; D.render(); };
A.scext = function () { var f = C().form; if (f.ext < 3) { f.ext++; f.secs += 30; } D.render(); };
A.scsend = function () {
  var c = C(), f = c.form;
  c.reports.push({ q: f.q, team: f.team, scout: D.S.role === "student" ? "Sam Ortiz" : D.me().name, auto: f.auto, tele: f.tele, end: f.end || "None", defense: f.defense, late: f.secs <= 0, notes: f.notes });
  D.log("scouted Team " + f.team + " in Qual " + f.q, "scouting");
  var next = c.matches.filter(function (m) { return m.q === f.q + 1; })[0];
  D.toast("Report sent for " + f.team + ". Next: Qual " + next.q + ", Blue 2, Team " + next.blue[1] + ".");
  c.form = { leave: null, auto: 0, tele: 0, end: null, defense: 1, notes: "", path: [], secs: 120, ext: 0, team: next.blue[1], slot: "Blue 2", q: next.q };
  D.render();
};
A.ssort = function (b) { C().sort = b.dataset.v; D.render(); };
A.sopen = function (b) { var c = C(); c.open = c.open === +b.dataset.v ? null : +b.dataset.v; D.render(); };
D.changes.spick = function (el) { if (el.value) moveTeam(+el.dataset.v, el.value); };
A.snext = function () { C().current++; D.toast("Current match is now Qual " + C().current + ". Scouts got their next assignment."); D.render(); };
A.sfmove = function (b) { var l = C().fields, i = +b.dataset.i, j = i - 1; if (j < 0) return; var t = l[i]; l[i] = l[j]; l[j] = t; D.render(); };
A.sfdel = function (b) { C().fields.splice(+b.dataset.i, 1); D.render(); };
A.sfadd = function () { C().fields.push({ label: D.val("sf-l"), type: D.val("sf-t"), opts: "" }); D.render(); };
})();
