/* Team Calendar service, one app with three tabs: Calendar (month, agenda, events, and for admins the practice pattern), Attendance (door sign-in, mentors, hours), Snacks.
   Each answers "what is happening at practice on this day". The Door QR screen is part of it. */
(function () {
"use strict";
var esc = D.esc;
var DAY = 86400000, TODAY = new Date(2026, 10, 10);
function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function fmt(s, o) { return parse(s).toLocaleDateString("en-US", o || { weekday: "short", month: "short", day: "numeric" }); }
var TODAYS = iso(TODAY);
var KIND = { practice: ["Practice", "k-practice"], build: ["Build day", "k-build"], comp: ["Competition", "k-comp"], outreach: ["Outreach", "k-outreach"], meeting: ["Meeting", "k-meeting"], off: ["No practice", "k-off"] };
var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MENTORS = ["Ms. Rivera", "Mr. Chen", "Dr. Patel", "Mr. Okafor"];
var PEOPLE = ["Priya Shah", "Leo Brooks", "Sam Ortiz", "Ava Kim", "Jordan Lee", "Maya Gold", "Nina Park", "Omar Haddad"];

function isOff(s) { return (s >= "2026-11-23" && s <= "2026-11-28") || (s >= "2026-12-21" && s <= "2027-01-03"); }
function practiceFor(d) {
  var s = iso(d), w = d.getDay(), build = s >= "2027-01-09";
  if (isOff(s)) return null;
  if (w === 2 || w === 4) return { start: "15:30", end: "18:00" };
  if (build && w === 1) return { start: "15:30", end: "18:00" };
  if (build && w === 6) return { start: "10:00", end: "14:00" };
  return null;
}
function genEvents() {
  var ev = [], id = 1;
  for (var k = 0; k < 212; k++) {
    var d = new Date(2026, 9, 1 + k), p = practiceFor(d);
    if (p) ev.push({ id: id++, date: iso(d), kind: d.getDay() === 6 ? "build" : "practice", name: d.getDay() === 6 ? "Build day" : "Practice", start: p.start, end: p.end, where: "Dawson shop", auto: true });
  }
  var extra = [
    { date: "2026-11-14", kind: "build", name: "Build day: intake prototype", start: "10:00", end: "14:00", where: "Dawson shop" },
    { date: "2026-11-19", kind: "outreach", name: "Library robot demo", start: "18:00", end: "20:00", where: "Lafayette Public Library" },
    { date: "2026-11-24", kind: "off", name: "No practice: Thanksgiving week", start: "", end: "" },
    { date: "2026-12-05", kind: "outreach", name: "FLL qualifier volunteers", start: "08:00", end: "16:00", where: "Boulder Valley" },
    { date: "2026-12-12", kind: "meeting", name: "Parent meeting and season preview", start: "10:00", end: "11:30", where: "Dawson library" },
    { date: "2027-01-09", kind: "meeting", name: "Season kickoff", start: "09:00", end: "13:00", where: "Dawson shop", note: "Game reveal, then strategy" },
    { date: "2027-02-27", kind: "comp", name: "Week 0 scrimmage", start: "08:00", end: "17:00", where: "Denver", tba: "", nexus: "", stream: "" },
    { date: "2027-03-03", end2: "2027-03-06", kind: "comp", name: "Colorado Regional", start: "08:00", end: "18:00", where: "Denver, Pit 42", tba: "2027code", nexus: "2027code", stream: "twitch.tv/firstinspires" }
  ];
  extra.forEach(function (e) { e.id = id++; ev.push(e); });
  return ev;
}
function seedHours(name, i) { var x = (name.length * 7 + i * 13) % 10; return x < 2 ? 0 : x < 4 ? 1.5 : x < 8 ? 2.5 : 3; }
function meetingDays() { var out = []; for (var k = 0; out.length < 12 && k < 200; k++) { var d = new Date(2026, 10, 10 - k); if (practiceFor(d)) out.unshift(iso(d)); } return out; }

D.inits.push(function (S) {
  var days = meetingDays();
  var att = {};
  PEOPLE.concat(MENTORS).forEach(function (n, pi) { att[n] = {}; days.forEach(function (d, i) { var h = seedHours(n, i + pi); if (d === TODAYS) return; if (MENTORS.indexOf(n) >= 0 && h < 2) h = 0; att[n][d] = h; }); });
  att["Jordan Lee"][days[days.length - 2]] = -1;
  S.cal = {
    events: genEvents(), month: [2026, 10], view: "month",
    here: [ { name: "Mr. Chen", at: "3:22 pm" }, { name: "Leo Brooks", at: "3:31 pm" }, { name: "Priya Shah", at: "3:33 pm" }, { name: "Ava Kim", at: "3:40 pm" }, { name: "Nina Park", at: "3:41 pm" } ],
    days: days, att: att, studentsOnly: true, sort: "hours",
    avail: {
      "Ms. Rivera": { usual: [2, 4], ut: {}, one: { "2026-11-14": "coming", "2026-11-17": "cant" }, t: { "2026-11-14": { start: "10:00", end: "13:00" } } },
      "Mr. Chen": { usual: [2, 4], ut: { 2: { start: "16:00", end: "18:00" } }, one: {}, t: {} },
      "Dr. Patel": { usual: [], ut: {}, one: {}, t: {} },
      "Mr. Okafor": { usual: [4], ut: {}, one: { "2026-11-12": "coming" }, t: {} }
    },
    mview: "list", mmonth: [2026, 10], pop: null, medit: null, udraft: null,
    adjust: [ { who: "Jordan Lee", hours: 2.5, why: "Forgot to scan out on Nov 5", by: "Ms. Rivera", when: "Nov 6" } ],
    snacks: {}, slots: 2,
    sync: { last: "2 min ago", count: 148 }
  };
  S.cal.snacks["2026-11-10"] = ["Kim family", "Shah family"];
  S.cal.snacks["2026-11-12"] = [null, null];
  S.cal.snacks["2026-11-17"] = ["Brooks family", null];
  S.notices.push({ to: "admin", app: "calendar", text: "Dr. Patel hasn't answered for this week's practices.", when: "Sun", read: false });
  S.notices.push({ to: "mentor", app: "calendar", text: "Are you coming Tue Nov 17? Your usual week says yes, but you marked Can't.", when: "Sun", read: true });
  S.notices.push({ to: "parent", app: "calendar", text: "Thu Nov 12 still needs snacks for 2.", when: "Today", read: false });
  S.activity.push({ who: "Ava Kim", what: "signed in at the door", app: "calendar", when: "3:40 pm" });
});
function C() { return D.S.cal; }
function upcoming(n, kinds) { return C().events.filter(function (e) { return e.date >= TODAYS && (!kinds || kinds.indexOf(e.kind) >= 0); }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).slice(0, n); }
function t12(s) { if (!s) return ""; var p = s.split(":"), h = +p[0], m = p[1]; return (h % 12 || 12) + (m === "00" ? "" : ":" + m) + (h < 12 ? " am" : " pm"); }
function span(e) { return e.start ? t12(e.start) + "–" + t12(e.end) : "All day"; }
function availOf(m, date) { var a = C().avail[m]; if (a.one[date]) return a.one[date]; return a.usual.indexOf(parse(date).getDay()) >= 0 ? "usual" : "none"; }
function practiceDays(n) { return upcoming(40, ["practice", "build"]).filter(function (e) { return e.auto || e.kind === "build"; }).filter(function (e, i, arr) { return !arr.slice(0, i).some(function (x) { return x.date === e.date; }); }).slice(0, n); }
D.calApi = { practiceDays: practiceDays, upcoming: upcoming, fmt: fmt, span: span, TODAYS: TODAYS, currentEvent: function () { return C().events.filter(function (e) { return e.kind === "comp" && e.tba; })[0]; } };

/* ---------- The app: three tabs, each with its own small switch ---------- */
function snackName() { return D.S.role === "parent" ? "Ortiz family" : D.me().name; }
function subnav(app, list, def) {
  var cur = D.tab(app, def);
  if (!list.some(function (t) { return t[0] === cur; })) cur = def;
  return '<div class="subnav"><span class="seg" role="group" aria-label="View">' + list.map(function (t) { return '<button data-act="tab" data-app="' + app + '" data-v="' + t[0] + '" aria-pressed="' + (cur === t[0]) + '"' + D.tabTip(app, t[0]) + ">" + esc(t[1]) + "</button>"; }).join("") + "</span></div>";
}
D.views.calendar = function () {
  var tabs = D.calTabs(), top = D.tab("calapp", "calendar"), staff = D.isStaff(), body, right = "";
  if (!D.calTab(top)) top = D.S.tabs.calapp = "calendar";
  if (top === "here") {
    body = attendance();
    if (staff) right = '<button class="btn sm" data-act="go" data-v="kiosk" aria-label="Door QR screen" data-tip="Show the sign-in code on the shop door screen">' + D.ic("qr", 16) + '<span class="hide-sm">Door QR screen</span></button>';
  } else if (top === "snacks") body = snacks();
  else {
    body = calendarTab();
    right = staff ? '<button class="btn primary sm" data-act="calnew" aria-label="New event">' + D.ic("plus", 16) + '<span>New<span class="hide-sm"> event</span></span></button>' : '<button class="btn sm" data-act="calical">Subscribe<span class="hide-sm"> on my phone</span></button>';
  }
  var row = tabs.length > 1 ? D.tabsFor("calapp", tabs.map(function (t) { return [t.id, t.name]; }), "calendar") : "";
  return D.topbar("Calendar", "", row, right) + '<div class="content">' + body + "</div>";
};

/* ---------- Calendar tab ---------- */
function calendarTab() {
  var staff = D.isStaff(), list = [["month", "Month"], ["agenda", "Agenda"]];
  if (D.S.role === "admin") list.push(["setup", "Practice pattern and sync"]); // admin only: mentors cannot edit practice patterns
  var def = window.matchMedia && window.matchMedia("(max-width: 640px)").matches ? "agenda" : "month";
  var t = D.tab("calendar", def);
  if (!list.some(function (x) { return x[0] === t; })) t = def;
  return subnav("calendar", list, def) + (t === "agenda" ? agenda() : t === "setup" ? setup() : month());
}
function evBtn(e) { return '<button class="ev ' + KIND[e.kind][1] + '" data-act="calev" data-v="' + e.id + '" data-tip="' + esc(e.name + " · " + span(e)) + '" aria-label="' + esc(e.name) + '"><span class="et">' + (e.start ? t12(e.start).replace(" pm", "p").replace(" am", "a") + " " : "") + esc(e.name) + "</span></button>"; }
function month() {
  var c = C(), y = c.month[0], m = c.month[1], first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
  var cells = "";
  for (var i = 0; i < 42; i++) {
    var d = new Date(y, m, 1 - first.getDay() + i), s = iso(d);
    var evs = c.events.filter(function (e) { return e.date === s || (e.end2 && s >= e.date && s <= e.end2); });
    var hideAuto = evs.some(function (e) { return !e.auto && (e.kind === "build" || e.kind === "off" || e.kind === "comp"); });
    evs = evs.filter(function (e) { return !(hideAuto && e.auto); });
    cells += '<div class="day' + (d.getMonth() !== m ? " other" : "") + (s === TODAYS ? " today" : "") + '"><span class="d">' + d.getDate() + "</span>" + evs.slice(0, 3).map(evBtn).join("") + (evs.length > 3 ? '<span class="who">+' + (evs.length - 3) + " more</span>" : "") + "</div>";
  }
  var title = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return '<div class="card"><div class="row mnav"><button class="btn sm" data-act="calmonth" data-v="-1" aria-label="Previous month" data-tip="Go back one month">←</button><h2>' + title + '</h2><button class="btn sm" data-act="calmonth" data-v="1" aria-label="Next month" data-tip="Go forward one month">→</button><button class="btn ghost sm" data-act="caltoday">Today</button></div>' +
    '<div class="month">' + WD.map(function (x) { return '<div class="dh">' + x + "</div>"; }).join("") + cells + "</div>" +
    '<div class="legend">' + Object.keys(KIND).map(function (k) { return '<span class="' + KIND[k][1] + '"><i class="kd"></i>' + KIND[k][0] + "</span>"; }).join("") + "</div></div>";
}
function isPractice(e) { return e.kind === "practice" || e.kind === "build"; }
/* A practice day's two short lines. They are doors to the Attendance and Snacks tabs, not controls. */
function door(tab, sub, date, icon, text, label) {
  return '<button class="doorln" data-act="caldoor" data-v="' + tab + '" data-tab="' + sub + '" data-d="' + date + '" aria-label="' + esc(text + ". Open " + label + " for " + fmt(date)) + '">' + D.ic(icon, 16) + '<span class="dtxt">' + esc(text) + '</span><span class="chev" aria-hidden="true">›</span></button>';
}
function hereLine(e, brief) {
  var c = C(), me = D.me().name;
  if (e.date === TODAYS) return D.isStaff() ? c.here.length + " signed in" : c.here.some(function (h) { return h.name === me; }) ? "You are signed in" : "Sign in";
  var ms = MENTORS.filter(function (m) { var a = availOf(m, e.date); return a === "coming" || a === "usual"; });
  return !ms.length ? "No mentors yet" : brief ? ms.length + (ms.length === 1 ? " mentor" : " mentors") + " coming" : "Mentors: " + ms.join(", ");
}
function snackLine(date) {
  var c = C(), names = (c.snacks[date] || []).filter(Boolean), open = c.slots - names.length, mine = names.indexOf(snackName()) >= 0;
  if (!names.length) return "Needs snacks";
  var who = mine ? "You are" : names.join(" and ") + (names.length > 1 ? " are" : " is");
  return who + " bringing snacks" + (open > 0 ? " · " + open + " more needed" : "");
}
function dayDoors(e, brief) {
  var out = "";
  if (D.calTab("here")) out += door("here", e.date === TODAYS ? "today" : "mentors", e.date, "user", hereLine(e, brief), "Attendance");
  if (D.calTab("snacks")) out += door("snacks", "", e.date, "snacks", snackLine(e.date), "Snacks");
  return out ? '<div class="agdoors">' + out + "</div>" : "";
}
function agenda() {
  var items = upcoming(18);
  return '<div class="card"><h2>Coming up</h2><div class="list">' + items.map(function (e) {
    return '<div class="agitem"><button class="li agrow" data-act="calev" data-v="' + e.id + '"><b class="num agdate">' + fmt(e.date) + (e.end2 ? "–" + fmt(e.end2, { month: "short", day: "numeric" }) : "") + '</b><span class="grow"><b>' + esc(e.name) + '</b><span class="who agmore">' + span(e) + (e.where ? " · " + esc(e.where) : "") + '</span></span><span class="kind ' + KIND[e.kind][1] + '"><i class="kd"></i>' + KIND[e.kind][0] + "</span></button>" + (isPractice(e) ? dayDoors(e) : "") + "</div>";
  }).join("") + "</div></div>";
}
function setup() {
  var c = C();
  return '<div class="grid2"><div class="card"><h2>Practice pattern</h2><p class="small mute">Practices fill in from this. Change a single day on its event.</p><div class="tablewrap"><table><thead><tr><th>Season</th><th>Dates</th><th>Days and times</th></tr></thead><tbody>' +
    '<tr><td><b>Fall</b></td><td>Sep 1 – Jan 8</td><td class="wrap">Tue, Thu 3:30–6:00 pm</td></tr><tr><td><b>Build season</b></td><td>Jan 9 – Apr 30</td><td class="wrap">Mon, Tue, Thu 3:30–6:00 pm · Sat 10 am–2 pm</td></tr><tr><td><b>Summer</b></td><td>Jun 1 – Aug 15</td><td class="wrap">Off-season projects, Wed 4–6 pm</td></tr></tbody></table></div>' +
    '<p class="flabel">Days off</p><div class="list"><div class="li"><b class="grow">Thanksgiving week</b><span class="who">Nov 23–28</span></div><div class="li"><b class="grow">Winter break</b><span class="who">Dec 21 – Jan 3</span></div></div><div class="row"><button class="btn sm">Edit pattern</button><button class="btn sm">Add a day off</button></div></div>' +
    '<div class="card"><h2>Google Calendar</h2><div class="row"><span class="pill ok">Up to date</span><span class="who">Last copied ' + esc(c.sync.last) + " · " + c.sync.count + " events</span></div>" +
    '<p class="flabel">Subscribe links</p><div class="list">' + [["Team (students and mentors)", "team"], ["Parents (practices, events, snacks)", "parents"], ["Mentors (plus availability)", "mentors"]].map(function (x) { return '<div class="li"><span class="grow">' + x[0] + '</span><button class="btn sm" data-act="calical">Copy link</button></div>'; }).join("") +
    '</div></div></div>';
}
D.drawers.calev = function (d) {
  var e = C().events.filter(function (x) { return x.id === +d.id; })[0], staff = D.isStaff(), html = "";
  html += D.drawerHead(KIND[e.kind][0], e.name) + '<p><b>' + fmt(e.date, { weekday: "long", month: "long", day: "numeric" }) + (e.end2 ? " – " + fmt(e.end2, { weekday: "long", month: "long", day: "numeric" }) : "") + "</b><br>" + span(e) + (e.where ? " · " + esc(e.where) : "") + "</p>" + (e.note ? '<p class="mute">' + esc(e.note) + "</p>" : "");
  if (isPractice(e)) {
    var ms = MENTORS.map(function (m) { var a = availOf(m, e.date), here = e.date === TODAYS && C().here.some(function (h) { return h.name === m; }); return '<div class="li"><b class="grow">' + esc(m) + "</b>" + (here ? '<span class="pill ok">Here</span>' : a === "coming" || a === "usual" ? '<span class="pill info">Coming' + (a === "usual" ? " (usual)" : "") + "</span>" : a === "cant" ? '<span class="pill bad">Can\'t</span>' : '<span class="pill">No answer</span>') + "</div>"; }).join("");
    html += (D.S.role !== "parent" ? '<div><p class="flabel">Mentors</p><div class="list">' + ms + "</div></div>" : "") + (function (d) { return d ? '<div><p class="flabel">At this practice</p>' + d + "</div>" : ""; })(dayDoors(e, true));
  }
  if (e.kind === "comp") {
    html += '<div class="tablewrap"><table><tbody><tr><th>TBA event code</th><td class="mono">' + esc(e.tba || "not set") + '</td></tr><tr><th>Nexus event code</th><td class="mono">' + esc(e.nexus || "not set") + "</td></tr><tr><th>Livestream</th><td>" + esc(e.stream || "not set") + '</td></tr></tbody></table></div>';
  }
  if (staff) html += '<div class="row"><button class="btn sm">Edit</button>' + (e.auto ? '<button class="btn sm danger" data-act="calcancel" data-v="' + e.id + '">Cancel this practice</button>' : '<button class="btn sm danger" data-act="caldelete" data-v="' + e.id + '">Delete</button>') + "</div>";
  return html;
};
D.modals.calnew = function (d) {
  var comp = (d.kind || "comp") === "comp";
  return D.modalHead("New event") + '<div class="formgrid"><div class="field wide"><label for="ce-name">Name</label><input id="ce-name" value="' + esc(d.name || "Denver district event") + '"></div>' +
    '<div class="field"><label for="ce-kind">Kind</label><select id="ce-kind" data-change="calkind">' + Object.keys(KIND).map(function (k) { return '<option value="' + k + '"' + (k === (d.kind || "comp") ? " selected" : "") + ">" + KIND[k][0] + "</option>"; }).join("") + "</select></div>" +
    '<div class="field"><label for="ce-date">Starts</label><input id="ce-date" type="date" value="2027-03-18"></div><div class="field"><label for="ce-end2">Ends</label><input id="ce-end2" type="date" value="' + (comp ? "2027-03-20" : "") + '"></div>' +
    '<div class="field"><label for="ce-repeat">Repeats</label><select id="ce-repeat"><option>Does not repeat</option><option>Weekly on this day</option></select></div>' +
    (comp ? '<div class="field"><label for="ce-tba">TBA event code</label><input id="ce-tba" value="2027codn"></div><div class="field"><label for="ce-nexus">Nexus event code</label><input id="ce-nexus" value="2027codn"></div><div class="field wide"><label for="ce-stream">Livestream link</label><input id="ce-stream" value="twitch.tv/firstinspires"></div>' : "") +
    '</div>' +     '<div class="row mfoot"><button class="btn primary" data-act="calsave">Save</button><button class="btn" data-act="closemodal">Cancel</button></div>';
};

/* ---------- Attendance tab ---------- */
function attendance() {
  var staff = D.isStaff();
  // Mentors and admins book their days first, so that view leads and is the one Attendance opens on. Students start on Today.
  // The id stays "mentors" so old links and Home rows still work; only the label changes with who is looking.
  var book = ["mentors", D.S.role === "admin" ? "Mentor days" : staff ? "My days" : "Mentors coming"];
  var rest = [["today", "Today"], ["board", "Leaderboard"], ["me", "My attendance"]];
  var list = staff ? [book].concat(rest, [["admin", "Corrections"]]) : rest.concat([book]), def = list[0][0];
  var t = D.tab("here", def), body;
  if (!list.some(function (x) { return x[0] === t; })) t = def;
  if (t === "board") body = board(); else if (t === "me") body = mine(); else if (t === "mentors") body = mentorsView(); else if (t === "admin") body = corrections(); else body = today();
  return subnav("here", list, def) + body;
}
function today() {
  var c = C(), me = D.me().name, mine = c.here.filter(function (h) { return h.name === me; })[0], staff = D.isStaff();
  var ms = MENTORS.map(function (m) { var here = c.here.some(function (h) { return h.name === m; }), a = availOf(m, TODAYS); return '<div class="li"><b class="grow">' + esc(m) + "</b>" + (here ? '<span class="pill ok">Here</span>' : a === "coming" || a === "usual" ? '<span class="pill info">Planned</span>' : a === "cant" ? '<span class="pill bad">Can\'t come</span>' : '<span class="pill">No answer</span>') + "</div>"; }).join("");
  return '<div class="card hero statuscard"><div class="grow"><h2>' + (mine ? "Signed in since " + esc(mine.at) : "You are not signed in") + '</h2><p class="small mute">Practice today, ' + span({ start: "15:30", end: "18:00" }) + "</p></div>" +
    (mine ? '<button class="btn" data-act="hereout">Sign out</button>' : '<button class="btn primary" data-act="herescan">' + D.ic("qr", 16) + " Scan the door code</button>") + "</div>" +
    '<div class="grid2"><div class="card"><div class="row between"><h2>Here now · ' + c.here.length + '</h2>' + (staff ? '<button class="btn sm" data-act="hereall">Sign everyone out</button>' : "") + '</div><div class="list">' +
    (c.here.length ? c.here.map(function (h, i) { return '<div class="li"><span class="ring"></span><b class="grow">' + esc(h.name) + '</b><span class="who">since ' + esc(h.at) + "</span>" + (staff ? '<button class="btn ghost sm" data-act="hereone" data-i="' + i + '">Sign out</button>' : "") + "</div>"; }).join("") : '<div class="empty">Nobody is signed in yet.</div>') + '</div></div>' +
    '<div class="card"><h2>Mentors</h2><div class="list">' + ms + "</div></div></div>";
}
function hoursOf(n) { var a = C().att[n], s = 0; Object.keys(a).forEach(function (d) { if (a[d] > 0) s += a[d]; }); C().adjust.forEach(function (x) { if (x.who === n) s += x.hours; }); return s + 24 + (n.charCodeAt(0) * 7 + n.length * 3) % 23 * .75; }
function meetingsOf(n) { var a = C().att[n]; return Object.keys(a).filter(function (d) { return a[d] > 0; }).length + 14; }
function streakOf(n) { var a = C().att[n], days = C().days, s = 0; for (var i = days.length - 1; i >= 0; i--) { if (days[i] === TODAYS) continue; if (a[days[i]] > 0) s++; else break; } return s; }
function board() {
  var c = C(), names = PEOPLE.concat(c.studentsOnly ? [] : MENTORS);
  names.sort(function (a, b) { return c.sort === "name" ? a.localeCompare(b) : c.sort === "meetings" ? meetingsOf(b) - meetingsOf(a) : hoursOf(b) - hoursOf(a); });
  var cols = "minmax(110px,170px) repeat(" + c.days.length + ", minmax(26px,1fr)) 64px 64px";
  var grid = '<div class="heat" style="grid-template-columns:' + cols + '"><span></span>' + c.days.map(function (d) { return '<span class="hh">' + fmt(d, { month: "numeric", day: "numeric" }) + "</span>"; }).join("") + '<span class="hh">Hours</span><span class="hh">Streak</span>' +
    names.map(function (n) {
      var here = c.here.some(function (h) { return h.name === n; });
      return '<span class="hn">' + (here ? '<span class="ring" data-tip="In the shop now"></span>' : "") + esc(n) + (n === "Sam Ortiz" && D.S.role === "student" ? ' <span class="who">you</span>' : "") + "</span>" +
        c.days.map(function (d) { var h = d === TODAYS ? (here ? 1.5 : 0) : c.att[n][d]; var cls = h < 0 ? "miss" : h >= 3 ? "h3" : h >= 2.5 ? "h2" : h > 0 ? "h1" : ""; return '<span class="hc ' + cls + '" data-tip="' + esc(n) + ", " + fmt(d) + ": " + (h < 0 ? "missed sign-out" : h + " h") + '"></span>'; }).join("") +
        '<span class="num small hr">' + hoursOf(n).toFixed(1) + '</span><span class="num small hr">' + (streakOf(n) || "—") + "</span>";
    }).join("") + "</div>";
  return '<div class="card"><div class="row between"><div><h2>Hours this school year</h2><span class="who">Since Aug 1 · the last 12 practices</span></div><div class="row"><label class="row small togglab"><button class="toggle" data-act="herestud" aria-pressed="' + c.studentsOnly + '" aria-label="Students only"></button> Students only</label>' +
    '<select class="chipsel" data-change="heresort" aria-label="Sort"><option value="hours"' + (c.sort === "hours" ? " selected" : "") + '>Most hours</option><option value="meetings"' + (c.sort === "meetings" ? " selected" : "") + '>Most meetings</option><option value="name"' + (c.sort === "name" ? " selected" : "") + ">Name</option></select>" + (D.isStaff() ? '<button class="btn sm" data-act="herecsv">Download CSV</button>' : "") + "</div></div>" +
    '<div class="tablewrap heatwrap">' + grid + '</div><div class="legend"><span><i class="dotc" style="background:var(--heat-1)"></i>Under 2.5 h</span><span><i class="dotc" style="background:var(--heat-2)"></i>2.5 h</span><span><i class="dotc" style="background:var(--heat-3)"></i>3 h or more</span><span><span class="ring"></span>In the shop now</span><span><i class="dotc missdot"></i>Missed sign-out</span></div></div>';
}
function mine() {
  var n = D.S.role === "student" ? "Sam Ortiz" : D.S.role === "parent" ? "Sam Ortiz" : D.me().name; if (!C().att[n]) n = "Sam Ortiz";
  var all = PEOPLE.map(hoursOf), avg = all.reduce(function (a, b) { return a + b; }, 0) / all.length, sorted = all.slice().sort(function (a, b) { return b - a; }), place = sorted.indexOf(hoursOf(n)) + 1;
  var a = C().att[n];
  return '<div class="grid4"><div class="card tight kpi"><b>' + hoursOf(n).toFixed(1) + '</b><span>Your hours · team average ' + avg.toFixed(1) + '</span></div><div class="card tight kpi"><b>' + place + " of " + PEOPLE.length + '</b><span>Place on the leaderboard</span></div><div class="card tight kpi"><b>' + meetingsOf(n) + '</b><span>Meetings this year</span></div><div class="card tight kpi"><b>' + (streakOf(n) || 0) + "</b><span>Meeting streak</span></div></div>" +
    '<div class="card"><h2>Recent visits</h2><div class="list">' + C().days.slice().reverse().filter(function (d) { return d !== TODAYS; }).map(function (d) { var h = a[d]; return '<div class="li"><b class="num vdate">' + fmt(d) + '</b><span class="grow">' + (h > 0 ? "3:3" + (d.charCodeAt(9) % 9) + " pm – " + (h >= 2.5 ? "6:00" : "5:00") + " pm" : h < 0 ? '<span class="pill bad">Missed sign-out</span> <span class="who">Ask a mentor to fix it.</span>' : '<span class="mute">Not there</span>') + '</span><span class="num">' + (h > 0 ? h.toFixed(1) + " h" : "") + "</span></div>"; }).join("") +
    C().adjust.filter(function (x) { return x.who === n; }).map(function (x) { return '<div class="li"><span class="pill info">Adjusted</span><span class="grow">+' + x.hours + " h · " + esc(x.why) + '</span><span class="who">' + esc(x.by) + " · " + esc(x.when) + "</span></div>"; }).join("") + "</div></div>";
}
/* Mentor availability, laid out like the Task App's: your usual week, then Who's coming as a List
   (practice days × mentors) or a Calendar. Your own days open a small editor when clicked. */
function shortT(s) { return t12(s).replace(" ", ""); }
function range(a) { return a && a.start && a.end ? shortT(a.start) + "–" + shortT(a.end) : null; }
function ans(m, date) {
  var a = C().avail[m], o = a.one[date], wd = parse(date).getDay(), t;
  if (o) { t = a.t[date] || {}; return { st: o, start: t.start || "", end: t.end || "", usual: false }; }
  if (a.usual.indexOf(wd) >= 0) { t = a.ut[wd] || {}; return { st: "coming", start: t.start || "", end: t.end || "", usual: true }; }
  return null;
}
function horizonDays() { var end = iso(new Date(TODAY.getTime() + 56 * DAY)); return practiceDays(40).filter(function (e) { return e.date < end; }); }
function practiceWeekdays(days) { var out = []; days.forEach(function (e) { var w = parse(e.date).getDay(); if (e.auto && out.indexOf(w) < 0) out.push(w); }); return out; }
function editorName() { if (!D.isStaff()) return null; var c = C(); if (D.S.role === "admin" && c.medit) return c.medit; return C().avail[D.me().name] ? D.me().name : "Ms. Rivera"; }
function savedUsual(m) { var a = C().avail[m], out = {}; a.usual.slice().sort().forEach(function (w) { var t = a.ut[w] || {}; out[w] = { start: t.start || "", end: t.end || "" }; }); return out; }
function draft(m) { var c = C(); if (!c.udraft || c.udraft.m !== m) c.udraft = { m: m, days: savedUsual(m) }; return c.udraft.days; }
function comingCount(d) { return MENTORS.filter(function (m) { var a = ans(m, d); return a && a.st === "coming"; }).length; }
function timeInputs(id, act, attrs, start, end) {
  return '<span class="row nowrap tpair"><input type="time" step="900" class="inp tinp" id="' + id + '-s" data-change="' + act + '" ' + attrs + ' data-f="start" value="' + start + '" aria-label="Arrive"><span class="mute">to</span>' +
    '<input type="time" step="900" class="inp tinp" id="' + id + '-e" data-change="' + act + '" ' + attrs + ' data-f="end" value="' + end + '" aria-label="Leave"></span>';
}

function mentorsView() {
  var ed = editorName(), me = D.me().name, days = horizonDays();
  var picker = D.S.role === "admin" ? '<label class="row small"><span class="mute">Editing</span><select class="chipsel" data-change="hereedit" aria-label="Editing">' +
    MENTORS.map(function (m) { return '<option value="' + esc(m) + '"' + (m === ed ? " selected" : "") + ">" + esc(m) + (m === me ? " (you)" : "") + "</option>"; }).join("") + "</select></label>" : "";
  return '<div class="row between mhead"><p class="mute">' + (ed ? "Set your usual week once, then tap a day to change just that day." : "Which mentors are coming to each practice.") + "</p>" + picker + "</div>" +
    '<div class="mavail' + (ed ? "" : " solo") + '">' + (ed ? usualWeek(ed, days) : "") + whosComing(ed, days) + "</div>";
}
function usualWeek(m, days) {
  var dr = draft(m), pw = practiceWeekdays(days), dirty = JSON.stringify(dr) !== JSON.stringify(savedUsual(m));
  return '<div class="card usual"><h2>' + (m === D.me().name ? "My usual week" : esc(m) + "'s usual week") + '</h2><p class="small mute">Pick the days you normally come.</p><div class="row chips">' +
    WD.map(function (d, w) { var on = !!dr[w], ok = pw.indexOf(w) >= 0; return '<button class="chip" data-act="hereusual" data-v="' + w + '" aria-pressed="' + on + '"' + (!ok && !on ? " disabled" : "") + ' data-tip="' + (ok ? "Come every " + d : "The team doesn't practice on " + d) + '">' + d + "</button>"; }).join("") + "</div>" +
    Object.keys(dr).map(function (w) { return '<div class="row small utrow"><b>' + WD[w] + "</b>" + timeInputs("ut" + w, "hereutime", 'data-w="' + w + '"', dr[w].start, dr[w].end) + "</div>"; }).join("") +
    '<div><button class="btn primary" data-act="heresaveusual"' + (dirty ? "" : " disabled") + ">Save usual week</button></div></div>";
}
function whosComing(ed, days) {
  var c = C(), v = c.mview || "list";
  return '<div class="card"><div class="row between"><h2>Who\'s coming</h2><span class="seg" role="group" aria-label="View">' + [["list", "List", "Mentors and practice days in a table"], ["calendar", "Calendar", "Mentors coming, shown on a month"]].map(function (x) { return '<button data-act="hereview" data-v="' + x[0] + '" aria-pressed="' + (v === x[0]) + '" data-tip="' + x[2] + '">' + x[1] + "</button>"; }).join("") + "</span></div>" +
    (v === "calendar" ? mentorMonth(ed, days) : days.length ? teamList(ed, days) : '<p class="small mute">No practice days in the next 8 weeks.</p>') +
    (ed && c.pop ? dayPop(ed, c.pop.d, days) : "") + "</div>";
}
function answerLabel(a, student) {
  if (a && a.st === "coming") return '<span class="ans-ok">' + D.ic("check", 13) + " " + (range(a) || "Coming") + "</span>";
  if (a && a.st === "cant" && !student) return '<span class="mute">✕ Not coming</span>';
  return '<span class="mute" aria-label="No answer">–</span>';
}
function teamList(ed, days) {
  var c = C(), me = D.me().name, student = !D.isStaff(), admin = D.S.role === "admin", others = MENTORS.filter(function (m) { return m !== ed; });
  var sub = 'class="who subline"';
  return '<div class="tablewrap" data-keepscroll="mtable"><table class="mtab"><thead><tr><th>Practice</th>' +
    (ed ? '<th class="mine">' + (ed === me ? "You" : esc(ed)) + '<span ' + sub + ">Tap a day to change it</span></th>" : "") +
    others.map(function (m) { return "<th>" + (admin ? '<button class="linkbtn" data-act="hereeditm" data-v="' + esc(m) + '" data-tip="Edit ' + esc(m) + '\'s days">' + esc(m) + "</button>" : esc(m)) + "</th>"; }).join("") + "</tr></thead><tbody>" +
    days.map(function (e) {
      var d = e.date, n = comingCount(d), mine = ed && ans(ed, d), open = c.pop && c.pop.d === d;
      return '<tr' + (c.focus === d ? ' class="focusrow"' : "") + '><td><b>' + fmt(d) + '</b><span class="subline ' + (n ? "who" : "nobody") + '">' + (n ? n + " coming" : "Nobody yet") + "</span></td>" +
        (ed ? '<td class="mine"><button class="dbtn" data-act="herepop" data-d="' + d + '"' + (open ? " data-pop-anchor" : "") + ' aria-expanded="' + !!open + '" data-tip="' + (ed === me ? "Change your answer for this day" : "Change " + esc(ed) + "'s answer for this day") + '">' + (mine ? answerLabel(mine) : '<span class="small" style="color:var(--accent)">Answer…</span>') + "</button></td>" : "") +
        others.map(function (m) { var here = d === TODAYS && c.here.some(function (h) { return h.name === m; }); return "<td>" + (here ? '<span class="pill ok">Here</span>' : answerLabel(ans(m, d), student)) + "</td>"; }).join("") + "</tr>";
    }).join("") + "</tbody></table></div>";
}
function mentorMonth(ed, days) {
  var c = C(), y = c.mmonth[0], m = c.mmonth[1], first = new Date(y, m, 1), me = D.me().name, student = !D.isStaff();
  var practice = {}; days.forEach(function (e) { practice[e.date] = true; });
  var cells = "";
  for (var i = 0; i < 42; i++) {
    var d = new Date(y, m, 1 - first.getDay() + i), s = iso(d), beside = "", below = "";
    var evs = c.events.filter(function (e) { return e.date === s || (e.end2 && s >= e.date && s <= e.end2); });
    var hideAuto = evs.some(function (e) { return !e.auto && (e.kind === "build" || e.kind === "off" || e.kind === "comp"); });
    evs = evs.filter(function (e) { return !(hideAuto && e.auto); });
    if (practice[s]) {
      var n = comingCount(s);
      if (ed) {
        var a = ans(ed, s), r = range(a), said = a && a.st === "coming" ? "coming" + (r ? " " + r : "") : a && a.st === "cant" ? "can't come" : "not answered";
        beside = '<button class="dchip ' + (a && a.st === "coming" ? "ok" : a && a.st === "cant" ? "cant" : "ask") + '" data-act="herepop" data-d="' + s + '"' + (c.pop && c.pop.d === s ? " data-pop-anchor" : "") + ' data-tip="' + (ed === me ? "You" : esc(ed)) + ": " + said + '. Click to change.">' +
          (a && a.st === "coming" ? D.ic("check", 11) + " " + (r || "Coming") : a && a.st === "cant" ? "✕ Can't" : "Coming?") + "</button>";
      }
      below = n ? (student ? '<span class="who">' + n + " mentor" + (n > 1 ? "s" : "") + "</span>" : "") : '<span class="nobody">⚠ Nobody yet</span>';
    }
    cells += '<div class="day' + (d.getMonth() !== m ? " other" : "") + (s === TODAYS ? " today" : "") + '"><div class="dtop"><span class="d">' + d.getDate() + "</span>" + beside + "</div>" + evs.slice(0, 2).map(evBtn).join("") + (evs.length > 2 ? '<span class="who">+' + (evs.length - 2) + " more</span>" : "") + below + "</div>";
  }
  return '<div class="row mnav"><button class="btn sm" data-act="heremonth" data-v="-1" aria-label="Previous month" data-tip="Go back one month">←</button><h3 class="mtitle">' + first.toLocaleDateString("en-US", { month: "long", year: "numeric" }) + '</h3><button class="btn sm" data-act="heremonth" data-v="1" aria-label="Next month" data-tip="Go forward one month">→</button><button class="btn ghost sm" data-act="heremonth" data-v="0">Today</button></div>' +
    '<div class="tablewrap" data-keepscroll="mmonth"><div class="month wide">' + WD.map(function (x) { return '<div class="dh">' + x + "</div>"; }).join("") + cells + "</div></div>";
}
function dayPop(m, d, days) {
  var a = ans(m, d), au = C().avail[m], pe = days.filter(function (e) { return e.date === d; })[0], st = a ? a.st : null;
  return '<div class="dpop" role="dialog" aria-label="Answer for ' + fmt(d) + '"><div class="row between nowrap"><b>' + (m === D.me().name ? fmt(d) : esc(m) + " · " + fmt(d)) + '</b><button class="xbtn sm" data-act="herepop" aria-label="Close" data-tip="Close without changing this day">×</button></div>' +
    '<div class="row chips"><button class="btn sm' + (st === "coming" ? " primary" : "") + '" data-act="hereday" data-d="' + d + '" data-v="coming" aria-pressed="' + (st === "coming") + '">' + D.ic("check", 14) + ' Coming</button><button class="btn sm' + (st === "cant" ? " on" : "") + '" data-act="hereday" data-d="' + d + '" data-v="cant" aria-pressed="' + (st === "cant") + '">✕ Can\'t</button></div>' +
    (st === "coming" ? '<div class="dgrid"><span class="who">Arrive and leave (optional)</span>' + timeInputs("dt", "heredtime", 'data-d="' + d + '"', a.start, a.end) + "</div>" : "") +
    '<div class="row who">' + (!a ? "<span>Not answered</span>" : "") + (pe && pe.start ? "<span>Practice " + shortT(pe.start) + "–" + shortT(pe.end) + "</span>" : "") + (a && a.usual ? "<span>From the usual week</span>" : "") +
    (a && !a.usual && au.usual.length ? '<button class="btn ghost sm push" data-act="hereuseusual" data-d="' + d + '" >Use usual</button>' : "") + "</div></div>";
}
function placePop() {
  var p = document.querySelector(".dpop"), t = document.querySelector("[data-pop-anchor]"); if (!p) return;
  if (!t) { p.style.visibility = "hidden"; return; }
  var r = t.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight, top = r.bottom + 6;
  if (top + h > innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
  p.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px"; p.style.top = top + "px"; p.style.visibility = "";
}
D.after.push(placePop);
window.addEventListener("scroll", placePop, true);
window.addEventListener("resize", placePop);
// A click outside the day editor, or Escape, closes it.
document.addEventListener("click", function (e) { var c = D.S && D.S.cal; if (!c || !c.pop || e.target.closest(".dpop, [data-act=herepop]")) return; c.pop = null; D.render(); });
document.addEventListener("keydown", function (e) { var c = D.S && D.S.cal; if (e.key === "Escape" && c && c.pop) { c.pop = null; D.render(); } });
function corrections() {
  var c = C();
  var missed = []; Object.keys(c.att).forEach(function (n) { Object.keys(c.att[n]).forEach(function (d) { if (c.att[n][d] < 0) missed.push({ n: n, d: d }); }); });
  return '<div class="grid2"><div class="card"><h2>Missed sign-outs</h2><div class="list">' + (missed.length ? missed.map(function (x) { return '<div class="li"><b class="grow">' + esc(x.n) + '</b><span class="who">' + fmt(x.d) + '</span><button class="btn sm" data-act="herefix" data-n="' + esc(x.n) + '" data-d="' + x.d + '">Give 2.5 h</button></div>'; }).join("") : '<div class="empty">None.</div>') + "</div></div>" +
    '<div class="card"><h2>Add or remove hours</h2><div class="formgrid"><div class="field"><label for="ha-who">Member</label><select id="ha-who">' + PEOPLE.map(function (p) { return "<option>" + esc(p) + "</option>"; }).join("") + '</select></div><div class="field"><label for="ha-h">Hours (+ or −)</label><input id="ha-h" value="2"></div><div class="field wide"><label for="ha-why">Why</label><input id="ha-why" value="Outreach at the library"></div></div><div class="row"><button class="btn primary" data-act="hereadd">Save</button></div>' +
    '<div class="list">' + c.adjust.map(function (x) { return '<div class="li"><span class="grow"><b>' + esc(x.who) + "</b> " + (x.hours > 0 ? "+" : "") + x.hours + " h · " + esc(x.why) + '</span><span class="who">' + esc(x.by) + " · " + esc(x.when) + "</span></div>"; }).join("") + '</div></div></div></div>';
}

/* ---------- Door QR display ---------- */
var qrTimer = null, qrLeft = 30, qrWin = 1;
D.views.kiosk = function () {
  if (!(D.isStaff() || D.S.role === "display")) return D.denied("Door QR");
  return '<div class="display kiosk"><h1>Scan to sign in or out</h1>' +
    '<div class="qrbox"><canvas id="qr" width="29" height="29" aria-label="Sign-in code"></canvas></div>' +
    '<div class="qrtime"><div class="bar"><i id="qrbar" style="width:100%"></i></div><p class="dmute" id="qrtxt">New code in 30 s</p></div>' +
    '<p class="dmute">' + C().here.length + " in the shop · practice until 6:00 pm</p>" + (D.S.role !== "display" ? '<button class="btn" data-act="go" data-v="here">Exit display</button>' : "") + "</div>";
};
function drawQR() {
  var c = document.getElementById("qr"); if (!c) return;
  var x = c.getContext("2d"), n = 29, seed = qrWin * 9301 + 49297;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  x.fillStyle = "#fff"; x.fillRect(0, 0, n, n); x.fillStyle = "#000";
  for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) if (rnd() > .52) x.fillRect(i, j, 1, 1);
  [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (p) { x.fillStyle = "#fff"; x.fillRect(Math.max(0, p[0] - 1), Math.max(0, p[1] - 1), 9, 9); x.fillStyle = "#000"; x.fillRect(p[0], p[1], 7, 7); x.fillStyle = "#fff"; x.fillRect(p[0] + 1, p[1] + 1, 5, 5); x.fillStyle = "#000"; x.fillRect(p[0] + 2, p[1] + 2, 3, 3); });
}
D.after.push(function () {
  if (!document.getElementById("qr")) { if (qrTimer) { clearInterval(qrTimer); qrTimer = null; } return; }
  drawQR();
  if (!qrTimer) qrTimer = setInterval(function () {
    qrLeft -= 1; if (qrLeft <= 0) { qrLeft = 30; qrWin += 1; drawQR(); }
    var b = document.getElementById("qrbar"), t = document.getElementById("qrtxt");
    if (!b) { clearInterval(qrTimer); qrTimer = null; return; }
    b.style.width = (qrLeft / 30 * 100) + "%"; t.textContent = "New code in " + qrLeft + " s";
  }, 1000);
});

/* ---------- Snacks tab ---------- */
function snacks() {
  var c = C(), nm = snackName();
  var days = practiceDays(14), flagged = false;
  var mine = days.filter(function (e) { return (c.snacks[e.date] || []).indexOf(nm) >= 0; });
  return (mine.length ? '<div class="card hero"><h2>You\'re bringing snacks on ' + mine.map(function (e) { return fmt(e.date); }).join(", ") + '</h2><p class="small mute">We\'ll remind you the day before.</p></div>' : "") +
    '<div class="card"><div class="row between"><h2>Coming practices</h2><span class="who">' + c.slots + ' families per practice · nut-free please</span></div><div class="list">' +
    days.map(function (e) {
      var s = c.snacks[e.date] || (c.snacks[e.date] = new Array(c.slots).fill(null));
      var names = s.filter(Boolean), open = s.indexOf(null), has = s.indexOf(nm), act;
      if (has >= 0) act = '<button class="btn ghost sm" data-act="snackfree" data-d="' + e.date + '" data-k="' + has + '">Cancel</button>';
      else if (open >= 0) { act = '<button class="btn sm' + (flagged ? "" : " primary") + '" data-act="snack" data-d="' + e.date + '" data-k="' + open + '">I\'ll bring snacks</button>'; flagged = true; }
      else act = '<span class="pill ok">Covered</span>';
      return '<div class="li snrow' + (c.focus === e.date ? " focusrow" : "") + '"><span class="grow"><b>' + fmt(e.date) + '</b><span class="who agmore">' + span(e) + " · " + (names.length ? esc(names.join(", ")) + (open >= 0 ? " · needs " + (s.length - names.length) + " more" : "") : "Nobody yet") + "</span></span>" + act + "</div>";
    }).join("") + "</div></div>";
}

/* ---------- Actions ---------- */
var A = D.acts;
A.calmonth = function (b) { var c = C(), m = c.month[1] + (+b.dataset.v), y = c.month[0]; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } c.month = [y, m]; D.render(); };
A.caltoday = function () { C().month = [2026, 10]; D.render(); };
A.calev = function (b) { D.openDrawer("calev", { id: b.dataset.v }); };
// A door on a practice day: open that tab (and its view) and show the day.
A.caldoor = function (b) { if (b.dataset.tab) D.S.tabs[b.dataset.v] = b.dataset.tab; C().focus = b.dataset.d || null; D.go(b.dataset.v); };
D.after.push(function () {
  var c = D.S && D.S.cal; if (!c || !c.focus) return;
  var el = document.querySelector(".focusrow"); c.focus = null;
  if (el) setTimeout(function () { el.scrollIntoView({ block: "center" }); }, 0);
});
A.calnew = function () { D.openModal("calnew", { kind: "comp" }); };
D.changes.calkind = function (el) { D.S.modal.data.kind = el.value; D.S.modal.data.name = D.val("ce-name"); D.render(); };
A.calsave = function () {
  var c = C(), e = { id: 9000 + c.events.length, name: D.val("ce-name"), kind: D.val("ce-kind"), date: D.val("ce-date"), end2: D.val("ce-end2") || null, start: "08:00", end: "17:00", where: "", tba: D.val("ce-tba"), nexus: D.val("ce-nexus"), stream: D.val("ce-stream") };
  c.events.push(e); D.S.modal = null; c.month = [parse(e.date).getFullYear(), parse(e.date).getMonth()]; D.S.tabs.calendar = "month";
  D.log("added " + e.name + " to the calendar", "calendar"); D.notify(["student", "mentor", "parent"], "calendar", "New on the calendar: " + e.name + ", " + fmt(e.date) + ".");
  D.toast("Saved. Google Calendar gets a copy within a minute."); D.render();
};
A.calcancel = function (b) { var c = C(), e = c.events.filter(function (x) { return x.id === +b.dataset.v; })[0]; c.events.push({ id: 9500 + c.events.length, date: e.date, kind: "off", name: "No practice", start: "", end: "" }); c.events.splice(c.events.indexOf(e), 1); D.S.drawer = null; D.notify(["student", "mentor", "parent"], "calendar", "Practice on " + fmt(e.date) + " is cancelled."); D.toast("Cancelled. Everyone was told."); D.render(); };
A.caldelete = function (b) { var c = C(); c.events = c.events.filter(function (x) { return x.id !== +b.dataset.v; }); D.S.drawer = null; D.render(); };
A.calical = function () { D.toast("Subscribe link copied. Paste it into your phone's calendar app."); D.render(); };
A.herescan = function () { var c = C(), me = D.me().name; D.withUndo("Signed in at 3:44 pm", function () { c.here.push({ name: me, at: "3:44 pm" }); D.log("signed in at the door", "calendar"); }, function () { c.here.pop(); D.S.activity.shift(); }); };
A.hereout = function () { var c = C(), me = D.me().name; c.here = c.here.filter(function (h) { return h.name !== me; }); D.toast("Signed out. 2.3 hours added."); D.render(); };
A.hereone = function (b) { var c = C(), h = c.here.splice(+b.dataset.i, 1)[0]; D.toast("Signed out " + h.name + "."); D.render(); };
A.hereall = function () { var c = C(), n = c.here.length; c.here = []; D.log("signed everyone out at the end of practice", "calendar"); D.toast("Signed out " + n + " people. Each got their time so far."); D.render(); };
A.herestud = function () { C().studentsOnly = !C().studentsOnly; D.render(); };
D.changes.heresort = function (el) { C().sort = el.value; D.render(); };
A.herecsv = function () { D.toast("Downloaded attendance-2026-27.csv (mentors only)."); D.render(); };
function edAvail() { return C().avail[editorName()]; }
A.hereview = function (b) { var c = C(); c.mview = b.dataset.v; c.pop = null; D.render(); };
A.heremonth = function (b) { var c = C(), v = +b.dataset.v, m = c.mmonth[1] + v, y = c.mmonth[0]; if (!v) { c.mmonth = [2026, 10]; D.render(); return; } if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } c.mmonth = [y, m]; c.pop = null; D.render(); };
A.herepop = function (b) { var c = C(), d = b.dataset.d; c.pop = d && !(c.pop && c.pop.d === d) ? { d: d } : null; D.render(); };
A.hereday = function (b) {
  var a = edAvail(), d = b.dataset.d, v = b.dataset.v, w = parse(d).getDay(), pe = horizonDays().filter(function (e) { return e.date === d; })[0];
  a.one[d] = v; delete a.t[d];
  if (v === "coming") a.t[d] = pe && pe.start ? { start: pe.start, end: pe.end } : { start: (a.ut[w] || {}).start || "", end: (a.ut[w] || {}).end || "" };
  D.log("answered " + (v === "coming" ? "Coming" : "Can't come") + " for " + fmt(d), "calendar"); D.render();
};
D.changes.heredtime = function (el) { var a = edAvail(), d = el.dataset.d, cur = ans(editorName(), d); a.one[d] = "coming"; a.t[d] = { start: cur.start, end: cur.end }; a.t[d][el.dataset.f] = el.value; D.render(); };
A.hereuseusual = function (b) { var a = edAvail(); delete a.one[b.dataset.d]; delete a.t[b.dataset.d]; D.render(); };
A.hereusual = function (b) { var dr = draft(editorName()), w = b.dataset.v; if (dr[w]) delete dr[w]; else dr[w] = { start: "", end: "" }; D.render(); };
D.changes.hereutime = function (el) { draft(editorName())[el.dataset.w][el.dataset.f] = el.value; D.render(); };
A.heresaveusual = function () { var c = C(), a = edAvail(), dr = draft(editorName()); a.usual = Object.keys(dr).map(Number); a.ut = {}; a.usual.forEach(function (w) { a.ut[w] = { start: dr[w].start, end: dr[w].end }; }); c.udraft = null; D.toast("Usual week saved"); D.render(); };
D.changes.hereedit = function (el) { var c = C(); c.medit = el.value; c.pop = null; c.udraft = null; D.render(); };
A.hereeditm = function (b) { var c = C(); c.medit = b.dataset.v; c.pop = null; c.udraft = null; D.render(); };
A.herefix = function (b) { var c = C(); c.att[b.dataset.n][b.dataset.d] = 2.5; c.adjust.push({ who: b.dataset.n, hours: 0, why: "Fixed missed sign-out on " + fmt(b.dataset.d) + " (2.5 h)", by: D.me().name, when: "Just now" }); D.toast("Fixed. " + b.dataset.n + " gets 2.5 hours."); D.render(); };
A.hereadd = function () { var c = C(); c.adjust.unshift({ who: D.val("ha-who"), hours: parseFloat(D.val("ha-h")) || 0, why: D.val("ha-why"), by: D.me().name, when: "Just now" }); D.toast("Saved. It shows in their history."); D.render(); };
A.snack = function (b) { var c = C(), nm = snackName(); c.snacks[b.dataset.d][+b.dataset.k] = nm; D.toast("Thanks. You'll get a reminder the day before."); D.render(); };
A.snackfree = function (b) { C().snacks[b.dataset.d][+b.dataset.k] = null; D.render(); };
})();
