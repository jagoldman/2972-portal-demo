/* Team Calendar service: Calendar (month, agenda, events, competitions, practice pattern), Attendance (door sign-in, mentors, hours), Snacks. */
(function () {
"use strict";
var esc = D.esc;
var DAY = 86400000, TODAY = new Date(2026, 10, 10);
function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function fmt(s, o) { return parse(s).toLocaleDateString("en-US", o || { weekday: "short", month: "short", day: "numeric" }); }
var TODAYS = iso(TODAY);
var KIND = { practice: ["Practice", "k-practice"], build: ["Build day", "k-build"], comp: ["Competition", "k-comp"], outreach: ["Outreach", "k-outreach"], meeting: ["Meeting", "k-meeting"], off: ["No practice", "k-off"] };
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
    { date: "2027-01-09", kind: "meeting", name: "Season kickoff", start: "09:00", end: "13:00", where: "Dawson shop", note: "Game reveal, then strategy in Kickoff" },
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
      "Ms. Rivera": { usual: [2, 4], one: { "2026-11-14": "coming", "2026-11-17": "cant" } },
      "Mr. Chen": { usual: [2, 4, 6], one: {} },
      "Dr. Patel": { usual: [], one: {} },
      "Mr. Okafor": { usual: [4], one: { "2026-11-12": "coming" } }
    },
    adjust: [ { who: "Jordan Lee", hours: 2.5, why: "Forgot to scan out on Nov 5", by: "Ms. Rivera", when: "Nov 6" } ],
    snacks: {}, slots: 2,
    sync: { last: "2 min ago", count: 148 }
  };
  S.cal.snacks["2026-11-10"] = ["Kim family", "Shah family"];
  S.cal.snacks["2026-11-12"] = [null, null];
  S.cal.snacks["2026-11-17"] = ["Brooks family", null];
  S.notices.push({ to: "admin", app: "here", text: "Dr. Patel hasn't answered for this week's practices.", when: "Sun", read: false });
  S.notices.push({ to: "mentor", app: "here", text: "Are you coming Tue Nov 17? Your usual week says yes, but you marked Can't.", when: "Sun", read: true });
  S.notices.push({ to: "parent", app: "snacks", text: "Thu Nov 12 still needs snacks for 2.", when: "Today", read: false });
  S.activity.push({ who: "Ava Kim", what: "signed in at the door", app: "here", when: "3:40 pm" });
});
function C() { return D.S.cal; }
function upcoming(n, kinds) { return C().events.filter(function (e) { return e.date >= TODAYS && (!kinds || kinds.indexOf(e.kind) >= 0); }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).slice(0, n); }
function t12(s) { if (!s) return ""; var p = s.split(":"), h = +p[0], m = p[1]; return (h % 12 || 12) + (m === "00" ? "" : ":" + m) + (h < 12 ? " am" : " pm"); }
function span(e) { return e.start ? t12(e.start) + "–" + t12(e.end) : "All day"; }
function availOf(m, date) { var a = C().avail[m]; if (a.one[date]) return a.one[date]; return a.usual.indexOf(parse(date).getDay()) >= 0 ? "usual" : "none"; }
function practiceDays(n) { return upcoming(40, ["practice", "build"]).filter(function (e) { return e.auto || e.kind === "build"; }).filter(function (e, i, arr) { return !arr.slice(0, i).some(function (x) { return x.date === e.date; }); }).slice(0, n); }
D.calApi = { practiceDays: practiceDays, upcoming: upcoming, fmt: fmt, span: span, TODAYS: TODAYS, currentEvent: function () { return C().events.filter(function (e) { return e.kind === "comp" && e.tba; })[0]; } };

/* ---------- Calendar ---------- */
D.views.calendar = function () {
  var staff = D.isStaff(), list = [["month", "Month"], ["agenda", "Agenda"]];
  if (staff) list.push(["setup", "Practice pattern and sync"]);
  var t = D.tab("calendar", "month"), body = t === "agenda" ? agenda() : t === "setup" && staff ? setup() : month();
  var right = staff ? '<button class="btn primary sm" data-act="calnew">' + D.ic("plus", 16) + " New event</button>" : '<button class="btn sm" data-act="calical">Subscribe on my phone</button>';
  return D.topbar("Calendar", "calendar.2972robotics.com", D.tabsFor("calendar", list, "month"), right) + '<div class="content">' + body + "</div>";
};
function evBtn(e) { return '<button class="ev ' + KIND[e.kind][1] + '" data-act="calev" data-v="' + e.id + '" title="' + esc(e.name) + '">' + (e.start ? t12(e.start).replace(" pm", "p").replace(" am", "a") + " " : "") + esc(e.name) + "</button>"; }
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
  return '<div class="card"><div class="row between"><div class="row"><button class="btn sm" data-act="calmonth" data-v="-1" aria-label="Previous month">←</button><h2 style="min-width:170px;text-align:center">' + title + '</h2><button class="btn sm" data-act="calmonth" data-v="1" aria-label="Next month">→</button><button class="btn ghost sm" data-act="caltoday">Today</button></div>' +
    '<div class="legend">' + Object.keys(KIND).map(function (k) { return '<span class="ev ' + KIND[k][1] + '" style="width:auto;display:inline-block">' + KIND[k][0] + "</span>"; }).join("") + "</div></div>" +
    '<div class="tablewrap"><div class="month" style="min-width:560px">' + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(function (x) { return '<div class="dh">' + x + "</div>"; }).join("") + cells + "</div></div>" +
    '<p class="small mute">This app is the source. The Google Calendar and iCal links get a copy. Times are Mountain Time.</p></div>';
}
function agenda() {
  var items = upcoming(18);
  return '<div class="card"><h2>Coming up</h2><div class="list">' + items.map(function (e) {
    var mentors = (e.kind === "practice" || e.kind === "build") ? MENTORS.filter(function (m) { var a = availOf(m, e.date); return a === "coming" || a === "usual"; }) : [];
    var sn = C().snacks[e.date];
    return '<button class="li click" data-act="calev" data-v="' + e.id + '"><b class="num" style="min-width:120px">' + fmt(e.date) + (e.end2 ? "–" + fmt(e.end2, { month: "short", day: "numeric" }) : "") + '</b><span class="pill">' + KIND[e.kind][0] + '</span><span class="grow"><b>' + esc(e.name) + '</b> <span class="mute">' + span(e) + (e.where ? " · " + esc(e.where) : "") + "</span>" +
      (mentors.length && D.S.role !== "parent" ? '<br><span class="who">Mentors: ' + esc(mentors.join(", ")) + "</span>" : "") + (sn && D.S.role !== "student" ? '<br><span class="who">Snacks: ' + sn.filter(Boolean).length + " of " + C().slots + "</span>" : "") + "</span></button>";
  }).join("") + "</div></div>";
}
function setup() {
  var c = C();
  return '<div class="grid2"><div class="card"><h2>Practice pattern</h2><p class="small mute">Practices fill themselves in from these. One-off changes go on the event.</p><div class="tablewrap"><table><thead><tr><th>Season</th><th>Dates</th><th>Days and times</th></tr></thead><tbody>' +
    '<tr><td><b>Fall</b></td><td>Sep 1 – Jan 8</td><td class="wrap">Tue, Thu 3:30–6:00 pm</td></tr><tr><td><b>Build season</b></td><td>Jan 9 – Apr 30</td><td class="wrap">Mon, Tue, Thu 3:30–6:00 pm · Sat 10 am–2 pm</td></tr><tr><td><b>Summer</b></td><td>Jun 1 – Aug 15</td><td class="wrap">Off-season projects, Wed 4–6 pm</td></tr></tbody></table></div>' +
    '<p class="flabel">Days off</p><div class="list"><div class="li"><b class="grow">Thanksgiving week</b><span class="who">Nov 23–28</span></div><div class="li"><b class="grow">Winter break</b><span class="who">Dec 21 – Jan 3</span></div></div><div class="row"><button class="btn sm">Edit pattern</button><button class="btn sm">+ Day off</button></div></div>' +
    '<div class="card"><h2>Google Calendar copy</h2><div class="row"><span class="pill ok">Up to date</span><span class="who">Last copied ' + esc(c.sync.last) + " · " + c.sync.count + " events</span></div><p class=\"small mute\">One-way: edits made in Google are overwritten. Edit here.</p>" +
    '<p class="flabel">Subscribe links</p><div class="list">' + [["Team (students and mentors)", "team"], ["Parents (practices, events, snacks)", "parents"], ["Mentors (plus availability)", "mentors"]].map(function (x) { return '<div class="li"><span class="grow">' + x[0] + '<br><span class="mono who">calendar.2972robotics.com/ical/' + x[1] + '-••••.ics</span></span><button class="btn sm" data-act="calical">Copy</button></div>'; }).join("") +
    '</div><p class="small mute">Time zone: America/Denver. Task App, Who\'s in, Snacks and Competition read practice days and events from here.</p></div></div>';
}
D.drawers.calev = function (d) {
  var e = C().events.filter(function (x) { return x.id === +d.id; })[0], staff = D.isStaff(), html = "";
  html += D.drawerHead(KIND[e.kind][0], e.name) + '<p><b>' + fmt(e.date, { weekday: "long", month: "long", day: "numeric" }) + (e.end2 ? " – " + fmt(e.end2, { weekday: "long", month: "long", day: "numeric" }) : "") + "</b><br>" + span(e) + (e.where ? " · " + esc(e.where) : "") + "</p>" + (e.note ? '<p class="hint">' + esc(e.note) + "</p>" : "");
  if (e.kind === "practice" || e.kind === "build") {
    var ms = MENTORS.map(function (m) { var a = availOf(m, e.date), here = e.date === TODAYS && C().here.some(function (h) { return h.name === m; }); return '<div class="li"><b class="grow">' + esc(m) + "</b>" + (here ? '<span class="pill ok">Here</span>' : a === "coming" || a === "usual" ? '<span class="pill info">Coming' + (a === "usual" ? " (usual)" : "") + "</span>" : a === "cant" ? '<span class="pill bad">Can\'t</span>' : '<span class="pill">No answer</span>') + "</div>"; }).join("");
    var sn = C().snacks[e.date] || [null, null];
    html += (D.S.role !== "parent" ? '<div><p class="flabel">Mentors</p><div class="list">' + ms + "</div></div>" : "") +
      (e.date === TODAYS ? '<p class="who">' + C().here.length + ' people signed in right now.</p><div><button class="btn" data-act="go" data-v="here">Open Who\'s in</button></div>' : "") +
      '<div><p class="flabel">Snacks</p><p>' + sn.map(function (x) { return x ? esc(x) : "<span class=\"mute\">open</span>"; }).join(" · ") + '</p></div>';
  }
  if (e.kind === "comp") {
    html += '<div class="tablewrap"><table><tbody><tr><th>TBA event code</th><td class="mono">' + esc(e.tba || "not set") + '</td></tr><tr><th>Nexus event code</th><td class="mono">' + esc(e.nexus || "not set") + "</td></tr><tr><th>Livestream</th><td>" + esc(e.stream || "not set") + '</td></tr></tbody></table></div><p class="flowhint">On these days the portal shows the event banner, and Schedule, Pit and Scouting use this event. Attendance at the event counts toward hours.</p>';
  }
  if (staff) html += '<div class="row"><button class="btn sm">Edit</button>' + (e.auto ? '<button class="btn sm danger" data-act="calcancel" data-v="' + e.id + '">Cancel this practice</button>' : '<button class="btn sm danger" data-act="caldelete" data-v="' + e.id + '">Delete</button>') + "</div>";
  return html;
};
D.modals.calnew = function (d) {
  var comp = (d.kind || "comp") === "comp";
  return D.modalHead("New event") + '<div class="formgrid"><div class="field" style="grid-column:1/-1"><label for="ce-name">Name</label><input id="ce-name" value="' + esc(d.name || "Denver district event") + '"></div>' +
    '<div class="field"><label for="ce-kind">Kind</label><select id="ce-kind" data-change="calkind">' + Object.keys(KIND).map(function (k) { return '<option value="' + k + '"' + (k === (d.kind || "comp") ? " selected" : "") + ">" + KIND[k][0] + "</option>"; }).join("") + "</select></div>" +
    '<div class="field"><label for="ce-date">Starts</label><input id="ce-date" type="date" value="2027-03-18"></div><div class="field"><label for="ce-end2">Ends</label><input id="ce-end2" type="date" value="' + (comp ? "2027-03-20" : "") + '"></div>' +
    '<div class="field"><label for="ce-repeat">Repeats</label><select id="ce-repeat"><option>Does not repeat</option><option>Weekly on this day</option></select></div>' +
    (comp ? '<div class="field"><label for="ce-tba">TBA event code</label><input id="ce-tba" value="2027codn"></div><div class="field"><label for="ce-nexus">Nexus event code</label><input id="ce-nexus" value="2027codn"></div><div class="field" style="grid-column:1/-1"><label for="ce-stream">Livestream link</label><input id="ce-stream" value="twitch.tv/firstinspires"></div>' : "") +
    '</div>' + (comp ? '<p class="flowhint">A competition drives the portal banner and the event in Pit, Scouting and Schedule. No config file to edit.</p>' : "") +
    '<div class="row"><button class="btn primary" data-act="calsave">Save</button><button class="btn" data-act="closemodal">Cancel</button></div>';
};

/* ---------- Attendance ---------- */
D.views.here = function () {
  var staff = D.isStaff(), list = [["today", "Today"], ["board", "Leaderboard"], ["me", "My attendance"], ["mentors", "Mentors"]];
  if (staff) list.push(["mydays", "My days"], ["admin", "Corrections"]);
  var t = D.tab("here", "today"), body;
  if (t === "board") body = board(); else if (t === "me") body = mine(); else if (t === "mentors") body = mentorsView(); else if (t === "mydays" && staff) body = myDays(); else if (t === "admin" && staff) body = corrections(); else body = today();
  return D.topbar("Attendance", "calendar.2972robotics.com/here", D.tabsFor("here", list, "today"), staff ? '<button class="btn sm" data-act="go" data-v="kiosk">' + D.ic("qr", 16) + " Door QR screen</button>" : "") + '<div class="content">' + body + "</div>";
};
function today() {
  var c = C(), me = D.me().name, signed = c.here.some(function (h) { return h.name === me; }), staff = D.isStaff();
  var ms = MENTORS.map(function (m) { var here = c.here.some(function (h) { return h.name === m; }), a = availOf(m, TODAYS); return '<div class="li"><b class="grow">' + esc(m) + "</b>" + (here ? '<span class="pill ok">Here</span>' : a === "coming" || a === "usual" ? '<span class="pill info">Planned</span>' : a === "cant" ? '<span class="pill bad">Can\'t come</span>' : '<span class="pill">No answer</span>') + "</div>"; }).join("");
  return '<div class="card hero"><div class="row between"><div><p class="eyebrow">Today · ' + fmt(TODAYS) + ' · practice 3:30–6:00 pm</p><h2 style="font-size:1.5rem">' + c.here.length + " in the shop</h2></div>" +
    (signed ? '<button class="btn" data-act="hereout">Sign out</button>' : '<button class="btn primary" data-act="herescan">' + D.ic("qr", 16) + " Scan the door code</button>") + "</div>" +
    (signed ? "" : '<p class="flowhint">Your phone camera opens <span class="mono">calendar.2972robotics.com/here?w=…</span> from the QR. The code changes every 30 seconds and is signed, so a photo of it is useless later.</p>') + "</div>" +
    '<div class="grid2"><div class="card"><h2>Mentors</h2><p class="small mute">Planned comes from mentor availability. Here comes from the door scan.</p><div class="list">' + ms + '</div></div><div class="card"><div class="row between"><h2>Signed in now</h2>' + (staff ? '<button class="btn sm" data-act="hereall">Sign everyone out</button>' : "") + '</div><div class="list">' +
    c.here.map(function (h, i) { return '<div class="li"><span class="ring"></span><b class="grow">' + esc(h.name) + '</b><span class="who">since ' + esc(h.at) + "</span>" + (staff ? '<button class="btn ghost sm" data-act="hereone" data-i="' + i + '">Sign out</button>' : "") + "</div>"; }).join("") + "</div></div></div>";
}
function hoursOf(n) { var a = C().att[n], s = 0; Object.keys(a).forEach(function (d) { if (a[d] > 0) s += a[d]; }); C().adjust.forEach(function (x) { if (x.who === n) s += x.hours; }); return s + 24 + (n.charCodeAt(0) * 7 + n.length * 3) % 23 * .75; }
function meetingsOf(n) { var a = C().att[n]; return Object.keys(a).filter(function (d) { return a[d] > 0; }).length + 14; }
function streakOf(n) { var a = C().att[n], days = C().days, s = 0; for (var i = days.length - 1; i >= 0; i--) { if (days[i] === TODAYS) continue; if (a[days[i]] > 0) s++; else break; } return s; }
function board() {
  var c = C(), names = PEOPLE.concat(c.studentsOnly ? [] : MENTORS);
  names.sort(function (a, b) { return c.sort === "name" ? a.localeCompare(b) : c.sort === "meetings" ? meetingsOf(b) - meetingsOf(a) : hoursOf(b) - hoursOf(a); });
  var cols = "minmax(110px,170px) repeat(" + c.days.length + ", minmax(20px,1fr)) 64px 64px";
  var grid = '<div class="heat" style="grid-template-columns:' + cols + ';min-width:640px"><span></span>' + c.days.map(function (d) { return '<span class="hh">' + fmt(d, { month: "numeric", day: "numeric" }) + "</span>"; }).join("") + '<span class="hh">Hours</span><span class="hh">Streak</span>' +
    names.map(function (n) {
      var here = c.here.some(function (h) { return h.name === n; });
      return '<span class="hn">' + (here ? '<span class="ring" title="In the shop now"></span>' : "") + esc(n) + (n === "Sam Ortiz" && D.S.role === "student" ? ' <span class="who">you</span>' : "") + "</span>" +
        c.days.map(function (d) { var h = d === TODAYS ? (here ? 1.5 : 0) : c.att[n][d]; var cls = h < 0 ? "miss" : h >= 3 ? "h3" : h >= 2.5 ? "h2" : h > 0 ? "h1" : ""; return '<span class="hc ' + cls + '" title="' + esc(n) + ", " + fmt(d) + ": " + (h < 0 ? "missed sign-out" : h + " h") + '"></span>'; }).join("") +
        '<span class="num small" style="text-align:right">' + hoursOf(n).toFixed(1) + '</span><span class="num small" style="text-align:right">' + (streakOf(n) || "—") + "</span>";
    }).join("") + "</div>";
  return '<div class="card"><div class="row between"><div><h2>Hours this school year</h2><span class="who">Since Aug 1 · last 12 meeting days shown · everyone sees this</span></div><div class="row"><label class="row small" style="font-weight:600"><button class="toggle" data-act="herestud" aria-pressed="' + c.studentsOnly + '" aria-label="Students only"></button> Students only</label>' +
    '<select class="chipsel" data-change="heresort" aria-label="Sort"><option value="hours"' + (c.sort === "hours" ? " selected" : "") + '>Most hours</option><option value="meetings"' + (c.sort === "meetings" ? " selected" : "") + '>Most meetings</option><option value="name"' + (c.sort === "name" ? " selected" : "") + ">Name</option></select>" + (D.isStaff() ? '<button class="btn sm" data-act="herecsv">Download CSV</button>' : "") + "</div></div>" +
    '<div class="tablewrap">' + grid + '</div><div class="legend"><span><i class="dotc" style="background:var(--heat-1)"></i>Under 2.5 h</span><span><i class="dotc" style="background:var(--heat-2)"></i>2.5 h</span><span><i class="dotc" style="background:var(--heat-3)"></i>3 h or more</span><span><span class="ring"></span>In the shop now</span><span><i class="dotc" style="box-shadow:inset 0 0 0 2px var(--bad)"></i>Missed sign-out (no hours)</span></div></div>';
}
function mine() {
  var n = D.S.role === "student" ? "Sam Ortiz" : D.S.role === "parent" ? "Sam Ortiz" : D.me().name; if (!C().att[n]) n = "Sam Ortiz";
  var all = PEOPLE.map(hoursOf), avg = all.reduce(function (a, b) { return a + b; }, 0) / all.length, sorted = all.slice().sort(function (a, b) { return b - a; }), place = sorted.indexOf(hoursOf(n)) + 1;
  var a = C().att[n];
  return '<div class="grid4"><div class="card tight kpi"><b>' + hoursOf(n).toFixed(1) + '</b><span>Your hours · team average ' + avg.toFixed(1) + '</span></div><div class="card tight kpi"><b>' + place + " of " + PEOPLE.length + '</b><span>Place on the leaderboard</span></div><div class="card tight kpi"><b>' + meetingsOf(n) + '</b><span>Meetings this year</span></div><div class="card tight kpi"><b>' + (streakOf(n) || 0) + "</b><span>Meeting streak</span></div></div>" +
    '<div class="card"><h2>' + esc(n) + ': recent visits</h2><div class="list">' + C().days.slice().reverse().filter(function (d) { return d !== TODAYS; }).map(function (d) { var h = a[d]; return '<div class="li"><b class="num" style="min-width:110px">' + fmt(d) + '</b><span class="grow">' + (h > 0 ? "3:3" + (d.charCodeAt(9) % 9) + " pm – " + (h >= 2.5 ? "6:00" : "5:00") + " pm" : h < 0 ? '<span class="pill bad">Missed sign-out</span> <span class="who">Closed with no hours. Ask a mentor to fix it.</span>' : '<span class="mute">Not there</span>') + '</span><span class="num">' + (h > 0 ? h.toFixed(1) + " h" : "") + "</span></div>"; }).join("") +
    C().adjust.filter(function (x) { return x.who === n; }).map(function (x) { return '<div class="li"><span class="pill info">Adjusted</span><span class="grow">+' + x.hours + " h · " + esc(x.why) + '</span><span class="who">' + esc(x.by) + " · " + esc(x.when) + "</span></div>"; }).join("") + "</div></div>";
}
function mentorsView() {
  var days = practiceDays(8), student = !D.isStaff();
  return '<div class="card"><div class="row between"><h2>Mentors at practice</h2><span class="who">' + (student ? "Names only for students" : "From each mentor's usual week and answers") + '</span></div><div class="tablewrap"><table><thead><tr><th>Mentor</th>' + days.map(function (e) { return "<th>" + fmt(e.date, { weekday: "short", month: "numeric", day: "numeric" }) + "</th>"; }).join("") + "</tr></thead><tbody>" +
    MENTORS.map(function (m) { return "<tr><td><b>" + esc(m) + "</b></td>" + days.map(function (e) { var a = availOf(m, e.date), here = e.date === TODAYS && C().here.some(function (h) { return h.name === m; }); return "<td>" + (here ? '<span class="pill ok">Here</span>' : a === "coming" || a === "usual" ? '<span class="pill info">' + (student ? "Yes" : "Coming") + "</span>" : a === "cant" ? (student ? "" : '<span class="pill bad">Can\'t</span>') : '<span class="mute">—</span>') + "</td>"; }).join("") + "</tr>"; }).join("") +
    '</tbody></table></div><p class="small mute">At least two mentors are needed for power tools. Days with fewer show in the bell for admins.</p></div>';
}
function myDays() {
  var m = C().avail[D.me().name] ? D.me().name : "Ms. Rivera", a = C().avail[m];
  var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return '<div class="card"><h2>My usual week</h2><div class="row">' + wd.map(function (d, i) { return '<button class="chip" data-act="hereusual" data-v="' + i + '" aria-pressed="' + (a.usual.indexOf(i) >= 0) + '">' + d + "</button>"; }).join("") +
    '</div><p class="small mute">Your usual days fill in the next 8 weeks. A one-off answer below wins. “Coming” uses the practice time.</p></div><div class="card"><h2>Next practices</h2><div class="list">' +
    practiceDays(8).map(function (e) { var v = availOf(m, e.date); return '<div class="li"><b class="num" style="min-width:120px">' + fmt(e.date) + '</b><span class="grow mute">' + span(e) + (v === "usual" ? " · usual week" : "") + '</span><span class="seg"><button data-act="hereavail" data-d="' + e.date + '" data-v="coming" aria-pressed="' + (v === "coming" || v === "usual") + '">Coming</button><button data-act="hereavail" data-d="' + e.date + '" data-v="cant" aria-pressed="' + (v === "cant") + '">Can\'t</button></span></div>'; }).join("") +
    '</div><div class="row"><button class="btn sm" data-act="hereextra">+ Coming on an extra day</button></div></div>';
}
function corrections() {
  var c = C();
  var missed = []; Object.keys(c.att).forEach(function (n) { Object.keys(c.att[n]).forEach(function (d) { if (c.att[n][d] < 0) missed.push({ n: n, d: d }); }); });
  return '<div class="grid2"><div class="card"><h2>Missed sign-outs</h2><p class="small mute">A sign-in still open after 12 hours closes with no hours.</p><div class="list">' + (missed.length ? missed.map(function (x) { return '<div class="li"><b class="grow">' + esc(x.n) + '</b><span class="who">' + fmt(x.d) + '</span><button class="btn sm" data-act="herefix" data-n="' + esc(x.n) + '" data-d="' + x.d + '">Give 2.5 h</button></div>'; }).join("") : '<div class="empty">None.</div>') + "</div></div>" +
    '<div class="card"><h2>Add or remove hours</h2><div class="formgrid"><div class="field"><label for="ha-who">Member</label><select id="ha-who">' + PEOPLE.map(function (p) { return "<option>" + esc(p) + "</option>"; }).join("") + '</select></div><div class="field"><label for="ha-h">Hours (+ or −)</label><input id="ha-h" value="2"></div><div class="field" style="grid-column:1/-1"><label for="ha-why">Why</label><input id="ha-why" value="Outreach at the library"></div></div><div class="row"><button class="btn primary" data-act="hereadd">Save</button></div>' +
    '<div class="list">' + c.adjust.map(function (x) { return '<div class="li"><span class="grow"><b>' + esc(x.who) + "</b> " + (x.hours > 0 ? "+" : "") + x.hours + " h · " + esc(x.why) + '</span><span class="who">' + esc(x.by) + " · " + esc(x.when) + "</span></div>"; }).join("") + '</div></div></div><div class="card tight"><h3>Settings</h3><p class="small mute">School year starts Aug 1 · sign-ins close after 12 hours · time zone America/Denver · mentors appear on the leaderboard when “Students only” is off</p></div>';
}

/* ---------- Door QR display ---------- */
var qrTimer = null, qrLeft = 30, qrWin = 1;
D.views.kiosk = function () {
  if (!(D.isStaff() || D.S.role === "display")) return D.denied("Door QR");
  return '<div class="display" style="justify-items:center;text-align:center"><p class="dmute">calendar.2972robotics.com/here/kiosk · display account · read-only</p><h1>Scan to sign in or out</h1>' +
    '<div class="qrbox"><canvas id="qr" width="29" height="29" aria-label="Demo sign-in code"></canvas></div>' +
    '<div style="width:min(78vw,360px)"><div class="bar" style="background:#111829"><i id="qrbar" style="width:100%"></i></div><p class="dmute" id="qrtxt">New code in 30 s</p></div>' +
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

/* ---------- Snacks ---------- */
D.views.snacks = function () {
  var c = C(), nm = D.S.role === "parent" ? "Ortiz family" : D.me().name;
  var days = practiceDays(8);
  var mine = days.filter(function (e) { return (c.snacks[e.date] || []).indexOf(nm) >= 0; });
  return D.topbar("Snacks", "calendar.2972robotics.com/snacks", "", "") + '<div class="content">' +
    (mine.length ? '<div class="card hero"><p class="eyebrow">You\'re bringing snacks</p><h2>' + mine.map(function (e) { return fmt(e.date); }).join(", ") + '</h2><p class="small mute">About 30 people. You get a reminder the day before and an hour before.</p></div>' : "") +
    '<div class="card"><div class="row between"><h2>Next practices</h2><span class="who">' + c.slots + ' families per practice · nut-free please</span></div><div class="list">' +
    days.map(function (e) {
      var s = c.snacks[e.date] || (c.snacks[e.date] = new Array(c.slots).fill(null));
      return '<div class="li"><b class="num" style="min-width:120px">' + fmt(e.date) + '</b><span class="who" style="min-width:110px">' + span(e) + '</span><span class="grow row">' + s.map(function (x, k) {
        if (x) return '<span class="pill ' + (x === nm ? "gold" : "ok") + '">' + esc(x) + "</span>" + (x === nm ? '<button class="btn ghost sm" data-act="snackfree" data-d="' + e.date + '" data-k="' + k + '">Cancel</button>' : "");
        return '<button class="btn sm" data-act="snack" data-d="' + e.date + '" data-k="' + k + '">I\'ll bring them</button>';
      }).join("") + "</span></div>";
    }).join("") + "</div></div>" +
    (D.isStaff() ? '<div class="card tight"><h3>Snack settings</h3><p class="small mute">2 families per practice · snacks at 4:30 pm · reminders the day before and an hour before · parents opt in to reminders on their Account page</p></div>' : "") + "</div>";
};

/* ---------- Actions ---------- */
var A = D.acts;
A.calmonth = function (b) { var c = C(), m = c.month[1] + (+b.dataset.v), y = c.month[0]; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } c.month = [y, m]; D.render(); };
A.caltoday = function () { C().month = [2026, 10]; D.render(); };
A.calev = function (b) { D.openDrawer("calev", { id: b.dataset.v }); };
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
A.herescan = function () { var c = C(), me = D.me().name; D.withUndo("Signed in at 3:44 pm", function () { c.here.push({ name: me, at: "3:44 pm" }); D.log("signed in at the door", "here"); }, function () { c.here.pop(); D.S.activity.shift(); }); };
A.hereout = function () { var c = C(), me = D.me().name; c.here = c.here.filter(function (h) { return h.name !== me; }); D.toast("Signed out. 2.3 hours added."); D.render(); };
A.hereone = function (b) { var c = C(), h = c.here.splice(+b.dataset.i, 1)[0]; D.toast("Signed out " + h.name + "."); D.render(); };
A.hereall = function () { var c = C(), n = c.here.length; c.here = []; D.log("signed everyone out at the end of practice", "here"); D.toast("Signed out " + n + " people. Each got their time so far."); D.render(); };
A.herestud = function () { C().studentsOnly = !C().studentsOnly; D.render(); };
D.changes.heresort = function (el) { C().sort = el.value; D.render(); };
A.herecsv = function () { D.toast("Downloaded attendance-2026-27.csv (mentors only)."); D.render(); };
A.hereusual = function (b) { var m = C().avail[D.me().name] || C().avail["Ms. Rivera"], d = +b.dataset.v, i = m.usual.indexOf(d); if (i >= 0) m.usual.splice(i, 1); else m.usual.push(d); D.render(); };
A.hereavail = function (b) { var m = C().avail[D.me().name] || C().avail["Ms. Rivera"]; m.one[b.dataset.d] = b.dataset.v; D.log("answered " + (b.dataset.v === "coming" ? "Coming" : "Can't come") + " for " + fmt(b.dataset.d), "here"); D.render(); };
A.hereextra = function () { var m = C().avail[D.me().name] || C().avail["Ms. Rivera"]; m.one["2026-11-21"] = "coming"; C().events.push({ id: 9900, date: "2026-11-21", kind: "build", name: "Extra build day (Ms. Rivera)", start: "10:00", end: "13:00", where: "Dawson shop" }); D.toast("Added Sat Nov 21 as an extra day."); D.render(); };
A.herefix = function (b) { var c = C(); c.att[b.dataset.n][b.dataset.d] = 2.5; c.adjust.push({ who: b.dataset.n, hours: 0, why: "Fixed missed sign-out on " + fmt(b.dataset.d) + " (2.5 h)", by: D.me().name, when: "Just now" }); D.toast("Fixed. " + b.dataset.n + " gets 2.5 hours."); D.render(); };
A.hereadd = function () { var c = C(); c.adjust.unshift({ who: D.val("ha-who"), hours: parseFloat(D.val("ha-h")) || 0, why: D.val("ha-why"), by: D.me().name, when: "Just now" }); D.toast("Saved. It shows in their history."); D.render(); };
A.snack = function (b) { var c = C(), nm = D.S.role === "parent" ? "Ortiz family" : D.me().name; c.snacks[b.dataset.d][+b.dataset.k] = nm; D.toast("Thanks. You'll get a reminder the day before."); D.render(); };
A.snackfree = function (b) { C().snacks[b.dataset.d][+b.dataset.k] = null; D.render(); };
})();
