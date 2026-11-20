/* Team Calendar service, one app with four tabs: Calendar (month, agenda, events, and for admins the practice pattern), Attendance (door sign-in, mentors, hours), Snacks, Volunteer.
   The first three answer "what is happening at practice on this day". Volunteer (proposal, 2026-11-18; not in Live) is the
   other days the team needs adults: an admin adds an event with a date and a number of spots, and parents and mentors
   sign up. The Door QR screen is part of the app. */
(function () {
"use strict";
var esc = D.esc;
var DAY = 86400000, TODAY = new Date(2026, 10, 10);
function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function fmt(s, o) { return parse(s).toLocaleDateString("en-US", o || { weekday: "short", month: "short", day: "numeric" }); }
var TODAYS = iso(TODAY);
var KIND = { practice: ["Practice", "k-practice"], build: ["Build day", "k-build"], comp: ["Competition", "k-comp"], outreach: ["Outreach", "k-outreach"], meeting: ["Meeting", "k-meeting"], off: ["No practice", "k-off"] };
// A volunteer event on the Calendar tab is not one of the kinds above: it lives in the Volunteer tab's list (D184)
// and only shows to the people who have that tab. Its mark is a ring, so it differs from every dot by shape.
var VOLKIND = ["Volunteer", "k-vol"];
function kindOf(e) { return e.vol ? VOLKIND : KIND[e.kind]; }
var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Only the mentor group makes someone a mentor (D166). An admin-only account is an app admin: never listed, counted or picked here.
var MENTORS = ["Ms. Rivera", "Mr. Chen", "Dr. Patel", "Ms. Nakamura"];
var PEOPLE = ["Priya Shah", "Leo Brooks", "Sam Ortiz", "Ava Kim", "Jordan Lee", "Maya Gold", "Nina Park", "Omar Haddad"];

// The team's days off: one list for the weekly pattern, the "Practice pattern and sync" view and other apps (daysOff).
var DAYS_OFF = [
  { name: "Thanksgiving week", from: "2026-11-23", to: "2026-11-28", shown: "Nov 23–28" },
  { name: "Winter break", from: "2026-12-21", to: "2027-01-03", shown: "Dec 21 – Jan 3" }
];
function isOff(s) { return DAYS_OFF.some(function (r) { return s >= r.from && s <= r.to; }); }
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
    { date: "2027-01-09", kind: "meeting", kickoff: true, name: "Season kickoff", start: "09:00", end: "13:00", where: "Dawson shop", note: "Game reveal, then strategy" },
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
      "Ms. Nakamura": { usual: [4], ut: {}, one: { "2026-11-12": "coming" }, t: {} }
    },
    mview: "list", mmonth: [2026, 10], pop: null, medit: null, udraft: null,
    adjust: [ { who: "Jordan Lee", hours: 2.5, why: "Forgot to scan out on Nov 5", by: "Ms. Rivera", when: "Nov 6" } ],
    snacks: {}, slots: 2,
    // Volunteer events: need = how many adults, who = the people signed up (one spot per adult).
    vol: [
      { id: 1, name: "Set up the library demo", date: "2026-11-19", start: "17:30", end: "18:15", where: "Lafayette Public Library", need: 2, note: "Carry the robot in and set up the table before the doors open.", who: ["Dana Kim"] },
      { id: 2, name: "Run tables at the FLL qualifier", date: "2026-12-05", start: "08:00", end: "16:00", where: "Boulder Valley", need: 8, note: "Line up the teams, reset the tables and run the snack table. You don't need to know robots.", who: ["Raj Shah", "Chris Brooks", "Mr. Chen"] },
      { id: 3, name: "Kickoff breakfast", date: "2027-01-09", start: "08:00", end: "09:30", where: "Dawson shop", need: 3, note: "Set out breakfast before the game reveal.", who: ["Dana Kim", "Raj Shah", "Chris Brooks"] },
      { id: 4, name: "Field build", date: "2027-01-16", start: "09:00", end: "13:00", where: "Dawson shop", need: 6, note: "Build the practice field pieces from the game drawings. Bring a drill if you have one.", who: ["Chris Brooks", "Mr. Chen"] },
      { id: 5, name: "Regional: lunch for the pit", date: "2027-03-04", start: "11:00", end: "13:00", where: "Denver", need: 4, note: "Bring lunch to the pit for 30 people.", who: [] }
    ],
    sync: { last: "2 min ago", count: 148 }
  };
  S.cal.snacks["2026-11-10"] = ["Kim family", "Shah family"];
  S.cal.snacks["2026-11-12"] = [null, null];
  S.cal.snacks["2026-11-17"] = ["Brooks family", null];
  S.notices.push({ to: "admin", app: "calendar", text: "Dr. Patel hasn't answered for this week's practices.", when: "Sun", read: false });
  S.notices.push({ to: "mentor", app: "calendar", text: "Are you coming Tue Nov 17? Your usual week says yes, but you marked Can't.", when: "Sun", read: true });
  S.notices.push({ to: "parent", app: "calendar", text: "Thu Nov 12 still needs snacks for 2.", when: "Today", read: false, date: "2026-11-12" });
  S.activity.push({ who: "Ava Kim", what: "signed in at the door", app: "calendar", when: "3:40 pm" });
});
function C() { return D.S.cal; }
function upcoming(n, kinds) { return C().events.filter(function (e) { return e.date >= TODAYS && (!kinds || kinds.indexOf(e.kind) >= 0); }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).slice(0, n); }
function t12(s) { if (!s) return ""; var p = s.split(":"), h = +p[0], m = p[1]; return (h % 12 || 12) + (m === "00" ? "" : ":" + m) + (h < 12 ? " am" : " pm"); }
function span(e) { return e.start ? t12(e.start) + "–" + t12(e.end) : "All day"; }
function availOf(m, date) { var a = C().avail[m]; if (a.one[date]) return a.one[date]; return a.usual.indexOf(parse(date).getDay()) >= 0 ? "usual" : "none"; }
function practiceDays(n) { return upcoming(40, ["practice", "build"]).filter(function (e) { return e.auto || e.kind === "build"; }).filter(function (e, i, arr) { return !arr.slice(0, i).some(function (x) { return x.date === e.date; }); }).slice(0, n); }
/* The days the team meets between two dates, read from the events list, so they follow the Calendar: the weekly pattern
   (minus days off), plus any practice or build day added there, minus a cancelled practice (cancelling adds an "off"
   event on that date), plus every day of a competition, which replaces a practice on its days.
   Each: { date, kind: "practice" | "build" | "comp", name }. Other apps call this; they never copy the pattern. */
function meetDays(from, to) {
  var off = {}, by = {}, names = {};
  C().events.forEach(function (e) { if (e.kind === "off" && e.date >= from && e.date <= to) off[e.date] = true; });
  C().events.forEach(function (e) {
    if ((e.kind !== "practice" && e.kind !== "build") || e.date < from || e.date > to || off[e.date]) return;
    if (by[e.date] !== "build") { by[e.date] = e.kind; names[e.date] = e.name; }
  });
  C().events.forEach(function (e) {
    if (e.kind !== "comp") return;
    for (var d = e.date; d <= (e.end2 || e.date); d = iso(new Date(parse(d).getTime() + DAY + 3600000))) { if (d >= from && d <= to) { by[d] = "comp"; names[d] = e.name; } }
  });
  return Object.keys(by).sort().map(function (d) { return { date: d, kind: by[d], name: names[d] }; });
}
// Events between two dates, optionally of some kinds (for example competitions), as plain copies.
function eventsIn(from, to, kinds) {
  return C().events.filter(function (e) { return e.date >= from && e.date <= to && (!kinds || kinds.indexOf(e.kind) >= 0); })
    .map(function (e) { return { date: e.date, end2: e.end2 || "", kind: e.kind, name: e.name }; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
}
/* Days off that touch two dates: the named ranges, plus any single practice cancelled in the Calendar (an "off" event
   outside those ranges). Each: { name, from, to }. */
function daysOff(from, to) {
  var out = DAYS_OFF.filter(function (r) { return r.to >= from && r.from <= to; }).map(function (r) { return { name: r.name, from: r.from, to: r.to }; });
  C().events.forEach(function (e) { if (e.kind === "off" && e.date >= from && e.date <= to && !isOff(e.date)) out.push({ name: e.name, from: e.date, to: e.date }); });
  return out.sort(function (a, b) { return a.from < b.from ? -1 : a.from > b.from ? 1 : 0; });
}
/* Small read-only answers for other apps (the Projector's countdown and "Today at a glance"). */
// The season's kickoff: the Calendar's own kickoff event (the one place its date lives).
function kickoff() { var e = C().events.filter(function (x) { return x.kickoff; })[0]; return e ? { date: e.date, name: e.name } : null; }
// The practice or build day on a date, with its times, unless it was cancelled; null when the team does not meet.
function practiceOn(date) {
  if (C().events.some(function (e) { return e.kind === "off" && e.date === date; })) return null;
  var on = C().events.filter(function (e) { return e.date === date && (e.kind === "practice" || e.kind === "build") && e.start; });
  var e = on.filter(function (x) { return x.kind === "build"; })[0] || on[0];
  return e ? { date: e.date, kind: e.kind, name: e.name, start: e.start, end: e.end } : null;
}
// Mentors who plan to be there on a date (their usual days, or a one-off "coming"), from the mentor plans.
function mentorsOn(date) { return MENTORS.filter(function (m) { var a = availOf(m, date); return a === "usual" || a === "coming"; }); }
/* Snacks on a date, from Snacks: the families bringing them (empty spots left out) and how many spots are open. The
   Projector shows the families on the shop screen (the owner, 2026-11-14). null when the day has no snack sign-up. */
function snacksFor(date) { var s = C().snacks[date]; if (!s || !s.length) return null; var names = s.filter(Boolean); return { names: names, filled: names.length, open: s.length - names.length }; }
/* Ground up (the owner, 2026-11-19): a practice or build day from today on that still has an open snack spot. A day
   with no sign-up list yet has every spot open. */
function needsSnacks(date) {
  if (date < TODAYS) return false;
  var p = practiceOn(date); if (!p) return false;
  var s = C().snacks[date]; return !s || s.indexOf(null) >= 0;
}
/* Every "needs snacks" line in Ground up (Home, the bell, the Calendar tab) opens the Snacks tab on that date: the
   tab scrolls to the day's row, marks it for a moment and puts the focus on it (see snacks() and the hook below). */
function openSnacks(date) { C().focus = date || null; D.go("snacks"); }
/* Volunteer events that still need people and that this person has not joined, soonest first (Home's "Can you help?"). */
function volName() { return D.me().name; }
function volList() { return C().vol.filter(function (v) { return v.date >= TODAYS; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); }
/* Volunteer events as the Calendar tab draws them: the month, the agenda and "Coming up". Each is a door to its row
   in the Volunteer tab, where the sign-up is. Other apps' lists (Home, Tasks) do not get them. */
function volEvents() { return D.calTab("volunteer") ? C().vol.map(function (v) { return { id: "v" + v.id, vol: v.id, date: v.date, kind: "vol", name: v.name, start: v.start, end: v.end, where: v.where }; }) : []; }
function calUpcoming(n) { return upcoming(400).concat(volEvents().filter(function (e) { return e.date >= TODAYS; })).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).slice(0, n); }
function evAct(e) { return e.vol ? 'data-act="caldoor" data-v="volunteer" data-d="' + e.date + '"' : 'data-act="calev" data-v="' + e.id + '"'; }
function volOpen() { var me = volName(); return volList().filter(function (v) { return v.who.length < v.need && v.who.indexOf(me) < 0; }).map(function (v) { return { id: v.id, name: v.name, date: v.date, when: span(v), open: v.need - v.who.length }; }); }
D.calApi = { needsSnacks: needsSnacks, openSnacks: openSnacks, volOpen: volOpen, kickoff: kickoff, practiceOn: practiceOn, mentorsOn: mentorsOn, mentors: function () { return MENTORS.slice(); }, snacksFor: snacksFor, practiceDays: practiceDays, upcoming: upcoming, fmt: fmt, span: span, TODAYS: TODAYS, meetDays: meetDays, eventsIn: eventsIn, daysOff: daysOff, currentEvent: function () { return C().events.filter(function (e) { return e.kind === "comp" && e.tba; })[0]; } };

/* ---------- The app: four tabs; the first two have their own small switch ---------- */
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
    if (staff) right = '<button class="btn sm" data-act="go" data-v="kiosk" aria-label="Door QR screen" data-tip="Show the sign-in code on the shop door screen.">' + D.ic("qr", 16) + '<span class="hide-sm">Door QR screen</span></button>';
  } else if (top === "snacks") body = snacks();
  else if (top === "volunteer") {
    body = volunteer();
    if (D.S.role === "admin") right = '<button class="btn primary sm" data-act="volnew" aria-label="New volunteer event">' + D.ic("plus", 16) + '<span>New<span class="hide-sm"> volunteer event</span></span></button>';
  }
  else {
    body = calendarTab();
    right = staff ? '<button class="btn primary sm" data-act="calnew" aria-label="New event">' + D.ic("plus", 16) + '<span>New<span class="hide-sm"> event</span></span></button>' : '<button class="btn sm" data-act="calical"><span>Subscribe' + (D.ground() ? "" : '<span class="hide-sm"> on my phone</span>') + "</span></button>";
  }
  var row = tabs.length > 1 ? D.tabsFor("calapp", tabs.map(function (t) { return [t.id, D.ground() && t.id === "calendar" ? "Events" : t.name]; }), "calendar") : "";
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
function evBtn(e) { return '<button class="ev ' + kindOf(e)[1] + '" ' + evAct(e) + ' data-tip="' + esc(e.name + " · " + span(e)) + '" aria-label="' + esc(e.name) + '"><span class="et">' + (e.start && !D.ground() ? t12(e.start).replace(" pm", "p").replace(" am", "a") + " " : "") + esc(D.ground() ? e.name.split(":")[0] : e.name) + "</span></button>"; }
/* Ground up (the owner, 2026-11-19): a practice or build day with an open snack spot says so on the month, for the
   people who have the Snacks tab. A dot and the words on a wide screen; on a phone the words do not fit a cell, so it
   is the snacks mark under the day's events, named for a screen reader and explained in the key. A door to the Snacks
   tab on that date. */
function snackMark(s) {
  if (!D.ground() || !D.calTab("snacks") || !needsSnacks(s)) return "";
  return '<button class="evsn" data-act="snackday" data-d="' + s + '" aria-label="' + esc(fmt(s) + " needs snacks. Open Snacks for this day") + '"><span class="snico" aria-hidden="true">' + D.ic("snacks", 14) + '</span><span class="sntx">Needs snacks</span></button>';
}
function month() {
  var c = C(), y = c.month[0], m = c.month[1], first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
  var cells = "";
  for (var i = 0; i < 42; i++) {
    var d = new Date(y, m, 1 - first.getDay() + i), s = iso(d);
    if (D.ground() && i % 7 === 0 && i >= 28 && d.getMonth() !== m) break;
    var evs = c.events.filter(function (e) { return e.date === s || (e.end2 && s >= e.date && s <= e.end2); }).concat(volEvents().filter(function (e) { return e.date === s; }));
    var hideAuto = evs.some(function (e) { return !e.auto && (e.kind === "build" || e.kind === "off" || e.kind === "comp"); });
    evs = evs.filter(function (e) { return !(hideAuto && e.auto); });
    cells += '<div class="day' + (d.getMonth() !== m ? " other" : "") + (s === TODAYS ? " today" : "") + '"><span class="d">' + (D.ground() && d.getDate() === 1 && d.getMonth() !== m ? d.toLocaleDateString("en-US", { month: "short" }) + " " : "") + d.getDate() + "</span>" + evs.slice(0, 3).map(evBtn).join("") + (evs.length > 3 ? '<span class="who">+' + (evs.length - 3) + " more</span>" : "") + snackMark(s) + "</div>";
  }
  var title = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  /* Version B: on a wide screen the next events are listed beside the month, so the two views do not need a switch. */
  var next = D.ideal() ? '<div class="card calnext"><h2>Coming up</h2><div class="list">' + calUpcoming(7).map(function (e) {
    return '<button class="li cnrow" ' + evAct(e) + '><span class="num cnd">' + fmt(e.date, { weekday: "short", month: "short", day: "numeric" }) + '</span><span class="grow"><b>' + esc(e.name) + '</b><span class="who">' + span(e) + "</span></span></button>";
  }).join("") + "</div></div>" : "";
  return (next ? '<div class="calsplit">' : "") + '<div class="card"><div class="row mnav"><button class="btn sm" data-act="calmonth" data-v="-1" aria-label="Previous month" data-tip="Go back one month.">←</button><h2>' + title + '</h2><button class="btn sm" data-act="calmonth" data-v="1" aria-label="Next month" data-tip="Go forward one month.">→</button><button class="btn ghost sm" data-act="caltoday">Today</button></div>' +
    '<div class="month">' + WD.map(function (x) { return '<div class="dh">' + x + "</div>"; }).join("") + cells + "</div>" +
    '<div class="legend">' + Object.keys(KIND).map(function (k) { return KIND[k]; }).concat(D.calTab("volunteer") ? [VOLKIND] : []).map(function (k) { return '<span class="' + k[1] + '"><i class="kd"></i>' + k[0] + "</span>"; }).join("") + (D.ground() && D.calTab("snacks") ? '<span class="snkey">' + D.ic("snacks", 14) + "Needs snacks</span>" : "") + "</div></div>" + (next ? next + "</div>" : "");
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
  // Ground up: where a family can settle it in one tap, the row has the same Sign up button Home has (hill climb r2).
  var sn = C().snacks[e.date] || (D.ground() && isPractice(e) ? (C().snacks[e.date] = new Array(C().slots).fill(null)) : null), k = sn ? sn.indexOf(null) : -1;
  if (D.calTab("snacks") && D.ground() && D.S.role === "parent" && sn && k >= 0 && sn.indexOf(snackName()) < 0) out += '<div class="doorln doorask"><span class="dtxt"><button class="pill warn snpill" data-act="snackday" data-d="' + e.date + '" aria-label="' + esc(snackLine(e.date).replace(" · ", ", ") + ". Open Snacks for " + fmt(e.date)) + '">' + esc(snackLine(e.date).replace(" · ", ", ")) + '</button></span><button class="btn sm primary" data-act="snack" data-d="' + e.date + '" data-k="' + k + '">Sign up</button></div>';
  else if (D.calTab("snacks") && D.ground() && needsSnacks(e.date)) out += door("snacks", "", e.date, "snacks", snackLine(e.date).replace(" · ", ", "), "Snacks").replace('<span class="dtxt">', '<span class="dtxt"><span class="pill warn">').replace("</span><span class=\"chev\"", "</span></span><span class=\"chev\"");
  else if (D.calTab("snacks")) out += door("snacks", "", e.date, "snacks", snackLine(e.date), "Snacks");
  return out ? '<div class="agdoors">' + out + "</div>" : "";
}
// A volunteer event's line on the agenda: how full it is, and Sign up where one tap settles it (as the snack line does).
function volDoors(e) {
  var v = volBy(e.vol), me = volName(), open = v.need - v.who.length, has = v.who.indexOf(me) >= 0;
  var text = has ? "You are signed up" + (open > 0 ? ", " + open + " more needed" : "") : open > 0 ? open + " more " + (open === 1 ? "person" : "people") + " needed" : "All " + v.need + " spots are taken";
  if (D.ground() && D.S.role !== "admin" && open > 0 && !has) return '<div class="agdoors"><div class="doorln doorask"><span class="dtxt"><span class="pill warn">' + esc(text) + '</span></span><button class="btn sm" data-act="volyes" data-v="' + v.id + '" aria-label="Sign up for ' + esc(v.name) + '">Sign up</button></div></div>';
  return '<div class="agdoors">' + door("volunteer", "", e.date, "user", text, "Volunteer") + "</div>";
}
function agenda() {
  var items = calUpcoming(18);
  return '<div class="card"><h2>Coming up</h2><div class="list">' + items.map(function (e) {
    return '<div class="agitem"><button class="li agrow" ' + evAct(e) + '><b class="num agdate">' + fmt(e.date) + (e.end2 ? "–" + fmt(e.end2, { month: "short", day: "numeric" }) : "") + '</b><span class="grow"><b>' + esc(e.name) + '</b><span class="who agmore">' + span(e) + (e.where ? " · " + esc(e.where) : "") + '</span></span><span class="kind ' + kindOf(e)[1] + (D.ground() && e.name.indexOf(kindOf(e)[0]) === 0 ? " ksame" : "") + '"><i class="kd"></i><span class="kname">' + kindOf(e)[0] + "</span></span></button>" + (e.vol ? volDoors(e) : isPractice(e) ? dayDoors(e) : "") + "</div>";
  }).join("") + "</div></div>";
}
function setup() {
  var c = C();
  return '<div class="grid2"><div class="card"><h2>Practice pattern</h2><p class="small mute">Practices fill in from this. Change a single day on its event.</p><div class="tablewrap" data-keepscroll="calsetup"><table><thead><tr><th>Season</th><th>Dates</th><th>Days and times</th></tr></thead><tbody>' +
    '<tr><td><b>Fall</b></td><td>Sep 1 – Jan 8</td><td class="wrap">Tue, Thu 3:30–6:00 pm</td></tr><tr><td><b>Build season</b></td><td>Jan 9 – Apr 30</td><td class="wrap">Mon, Tue, Thu 3:30–6:00 pm · Sat 10 am–2 pm</td></tr><tr><td><b>Summer</b></td><td>Jun 1 – Aug 15</td><td class="wrap">Off-season projects, Wed 4–6 pm</td></tr></tbody></table></div>' +
    '<p class="flabel">Days off</p><div class="list">' + DAYS_OFF.map(function (r) { return '<div class="li"><b class="grow">' + esc(r.name) + '</b><span class="who">' + esc(r.shown) + "</span></div>"; }).join("") + '</div><div class="row"><button class="btn sm">Edit pattern</button><button class="btn sm">Add a day off</button></div></div>' +
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
    html += '<div class="tablewrap" data-keepscroll="calevent"><table><tbody><tr><th>TBA event code</th><td class="mono">' + esc(e.tba || "not set") + '</td></tr><tr><th>Nexus event code</th><td class="mono">' + esc(e.nexus || "not set") + "</td></tr><tr><th>Livestream</th><td>" + esc(e.stream || "not set") + '</td></tr></tbody></table></div>';
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
  // An admin-only account is not an attendee (D166), so it has no My attendance.
  var rest = [["today", "Today"], ["board", "Leaderboard"]].concat(D.S.role === "admin" ? [] : [["me", "My attendance"]]);
  var list = staff ? [book].concat(rest, [["admin", "Corrections"]]) : rest.concat([book]), def = list[0][0];
  var t = D.tab("here", def), body;
  if (!list.some(function (x) { return x[0] === t; })) t = def;
  if (t === "board") body = board(); else if (t === "me") body = mine(); else if (t === "mentors") body = mentorsView(); else if (t === "admin") body = corrections(); else body = today();
  return subnav("here", list, def) + body;
}
function today() {
  var c = C(), me = D.me().name, mine = c.here.filter(function (h) { return h.name === me; })[0], staff = D.isStaff();
  var ms = MENTORS.map(function (m) { var here = c.here.some(function (h) { return h.name === m; }), a = availOf(m, TODAYS); return '<div class="li"><b class="grow">' + esc(m) + "</b>" + (here ? '<span class="pill ok">Here</span>' : a === "coming" || a === "usual" ? '<span class="pill info">Planned</span>' : a === "cant" ? '<span class="pill bad">Can\'t come</span>' : '<span class="pill">No answer</span>') + "</div>"; }).join("");
  return '<div class="card hero statuscard"><div class="grow"><h2>' + (mine ? "Signed in since " + esc(mine.at) : "You are not signed in") + '</h2><p class="small mute">Practice today, ' + span({ start: "15:30", end: "18:00" }) + (D.ground() && !mine ? ". Tap Sign in to scan the code at the door." : "") + "</p></div>" +
    (mine ? '<button class="btn" data-act="hereout">Sign out</button>' : '<button class="btn primary" data-act="herescan">' + D.ic("qr", 16) + (D.ground() ? " Sign in" : " Scan the door code") + "</button>") + "</div>" +
    '<div class="grid2"><div class="card"><div class="row between"><h2>' + (D.ground() ? 'Here now <span class="tcount">' + c.here.length + "</span>" : "Here now · " + c.here.length) + "</h2>" + (staff ? '<button class="btn sm" data-act="hereall">Sign everyone out</button>' : "") + '</div><div class="list">' +
    (c.here.length ? c.here.map(function (h, i) { return '<div class="li"><span class="ring"></span><b class="grow">' + esc(h.name) + '</b><span class="who">' + (D.ground() ? "Here since " : "since ") + esc(h.at) + "</span>" + (staff ? '<button class="btn ghost sm" data-act="hereone" data-i="' + i + '">Sign out</button>' : "") + "</div>"; }).join("") : '<div class="empty">Nobody is signed in yet.</div>') + '</div></div>' +
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
      return '<span class="hn">' + (here ? '<span class="ring" data-tip="In the shop now."></span>' : "") + esc(n) + (n === "Sam Ortiz" && D.S.role === "student" ? ' <span class="who">you</span>' : "") + "</span>" +
        c.days.map(function (d) { var h = d === TODAYS ? (here ? 1.5 : 0) : c.att[n][d]; var cls = h < 0 ? "miss" : h >= 3 ? "h3" : h >= 2.5 ? "h2" : h > 0 ? "h1" : ""; return '<span class="hc ' + cls + '" data-tip="' + esc(n) + ", " + fmt(d) + ": " + (h < 0 ? "missed sign-out" : h + " h") + '"></span>'; }).join("") +
        '<span class="num small hr">' + hoursOf(n).toFixed(1) + '</span><span class="num small hr">' + (streakOf(n) || "—") + "</span>";
    }).join("") + "</div>";
  return '<div class="card"><div class="row between"><div><h2>Hours this school year</h2><span class="who">Since Aug 1 · the last 12 practices</span></div><div class="row"><label class="row small togglab"><button class="toggle" data-act="herestud" aria-pressed="' + c.studentsOnly + '" aria-label="Students only"></button> Students only</label>' +
    '<select class="chipsel" data-change="heresort" aria-label="Sort"><option value="hours"' + (c.sort === "hours" ? " selected" : "") + '>Most hours</option><option value="meetings"' + (c.sort === "meetings" ? " selected" : "") + '>Most meetings</option><option value="name"' + (c.sort === "name" ? " selected" : "") + ">Name</option></select>" + (D.isStaff() ? '<button class="btn sm" data-act="herecsv">Download CSV</button>' : "") + "</div></div>" +
    '<div class="tablewrap heatwrap" data-keepscroll="heatboard">' + grid + '</div><div class="legend"><span><i class="dotc" style="background:var(--heat-1)"></i>Under 2.5 h</span><span><i class="dotc" style="background:var(--heat-2)"></i>2.5 h</span><span><i class="dotc" style="background:var(--heat-3)"></i>3 h or more</span><span><span class="ring"></span>In the shop now</span><span><i class="dotc missdot"></i>Missed sign-out</span></div></div>';
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
// Ground up writes times one way everywhere: "4 pm–6 pm".
function range(a) { return a && a.start && a.end ? (D.ground() ? t12(a.start) + "–" + t12(a.end) : shortT(a.start) + "–" + shortT(a.end)) : null; }
function ans(m, date) {
  var a = C().avail[m], o = a.one[date], wd = parse(date).getDay(), t;
  if (o) { t = a.t[date] || {}; return { st: o, start: t.start || "", end: t.end || "", usual: false }; }
  if (a.usual.indexOf(wd) >= 0) { t = a.ut[wd] || {}; return { st: "coming", start: t.start || "", end: t.end || "", usual: true }; }
  return null;
}
function horizonDays() { var end = iso(new Date(TODAY.getTime() + 56 * DAY)); return practiceDays(40).filter(function (e) { return e.date < end; }); }
function practiceWeekdays(days) { var out = []; days.forEach(function (e) { var w = parse(e.date).getDay(); if (e.auto && out.indexOf(w) < 0) out.push(w); }); return out; }
// A mentor edits their own days. The admin is not a mentor (D166): he edits the mentor picked in "Editing", the first by default.
function editorName() { if (!D.isStaff()) return null; var c = C(); if (D.S.role === "admin") return c.medit && MENTORS.indexOf(c.medit) >= 0 ? c.medit : MENTORS[0]; return C().avail[D.me().name] ? D.me().name : MENTORS[0]; }
function savedUsual(m) { var a = C().avail[m], out = {}; a.usual.slice().sort().forEach(function (w) { var t = a.ut[w] || {}, p = weekdayTimes(w); out[w] = { start: t.start || p.start, end: t.end || p.end }; }); return out; }
function draft(m) { var c = C(); if (!c.udraft || c.udraft.m !== m) c.udraft = { m: m, days: savedUsual(m) }; return c.udraft.days; }
function comingCount(d) { return MENTORS.filter(function (m) { var a = ans(m, d); return a && a.st === "coming"; }).length; }
/* One select per time, every 15 minutes from 6:00 am to 11:00 pm; the shown time is the saved time.
   A stored time off the grid is kept as an extra option so it still shows. */
function timeOpts(v) {
  var out = [], h, m;
  for (h = 6; h <= 23; h++) for (m = 0; m < 60; m += 15) { if (h === 23 && m) break; out.push(("0" + h).slice(-2) + ":" + ("0" + m).slice(-2)); }
  if (v && out.indexOf(v) < 0) { out.push(v); out.sort(); }
  return out.map(function (t) { return '<option value="' + t + '"' + (t === v ? " selected" : "") + ">" + t12(t).replace(/^(\d+) /, "$1:00 ") + "</option>"; }).join("");
}
function timeInputs(id, act, attrs, start, end, lab) {
  return '<span class="tpair"><select class="inp tinp" id="' + id + '-s" data-change="' + act + '" ' + attrs + ' data-f="start" aria-label="' + lab + ' arrive">' + timeOpts(start) + '</select><span class="mute" aria-hidden="true">–</span>' +
    '<select class="inp tinp" id="' + id + '-e" data-change="' + act + '" ' + attrs + ' data-f="end" aria-label="' + lab + ' leave">' + timeOpts(end) + "</select></span>";
}
/* The team's practice time on a weekday (first upcoming practice that weekday), and on a date. */
function weekdayTimes(w) {
  var e = horizonDays().filter(function (x) { return x.auto && parse(x.date).getDay() === +w; })[0], d = new Date(TODAY.getTime() + ((+w - TODAY.getDay() + 7) % 7) * DAY), p = practiceFor(d);
  return e ? { start: e.start, end: e.end } : p ? { start: p.start, end: p.end } : { start: "15:30", end: "18:00" };
}
function dayTimes(d) { var pe = horizonDays().filter(function (e) { return e.date === d; })[0]; return pe && pe.start ? { start: pe.start, end: pe.end } : weekdayTimes(parse(d).getDay()); }

function mentorsView() {
  var ed = editorName(), me = D.me().name, days = horizonDays();
  var picker = D.S.role === "admin" ? '<label class="row small"><span class="mute">Editing</span><select class="chipsel" data-change="hereedit" aria-label="Editing">' +
    MENTORS.map(function (m) { return '<option value="' + esc(m) + '"' + (m === ed ? " selected" : "") + ">" + esc(m) + "</option>"; }).join("") + "</select></label>" : "";
  return '<div class="row between mhead"><p class="mute">' + (!ed ? "Which mentors are coming to each practice." : ed === me ? "Set your usual week once, then tap a day to change just that day." : "Pick a mentor to change their days: their usual week, or tap a day to change just that day.") + "</p>" + picker + "</div>" +
    '<div class="mavail' + (ed ? "" : " solo") + '">' + (ed ? usualWeek(ed, days) : "") + whosComing(ed, days) + "</div>";
}
function usualWeek(m, days) {
  var dr = draft(m), pw = practiceWeekdays(days), dirty = JSON.stringify(dr) !== JSON.stringify(savedUsual(m));
  return '<div class="card usual"><h2>' + (m === D.me().name ? "My usual week" : esc(m) + "'s usual week") + '</h2><p class="small mute">' + (m === D.me().name ? "Pick the days you normally come." : "Pick the days they normally come.") + '</p><div class="row chips">' +
    WD.map(function (d, w) { var on = !!dr[w], ok = pw.indexOf(w) >= 0; return '<button class="chip" data-act="hereusual" data-v="' + w + '" aria-pressed="' + on + '"' + (!ok && !on ? " disabled" : "") + ' data-tip="' + (ok ? "Come every " + d + "." : "The team doesn't practice on " + d + ".") + '">' + d + "</button>"; }).join("") + "</div>" +
    Object.keys(dr).map(function (w) { return '<div class="small utrow"><b>' + WD[w] + "</b>" + timeInputs("ut" + w, "hereutime", 'data-w="' + w + '"', dr[w].start, dr[w].end, WD[w]) + "</div>"; }).join("") +
    '<div><button class="btn primary" data-act="heresaveusual"' + (dirty ? "" : " disabled") + ">Save usual week</button></div></div>";
}
function whosComing(ed, days) {
  var c = C(), v = c.mview || "list";
  return '<div class="card"><div class="row between"><h2>Who\'s coming</h2><span class="seg" role="group" aria-label="View">' + [["list", "List", "Mentors and practice days in a table."], ["calendar", "Calendar", "Mentors coming, shown on a month."]].map(function (x) { return '<button data-act="hereview" data-v="' + x[0] + '" aria-pressed="' + (v === x[0]) + '" data-tip="' + x[2] + '">' + x[1] + "</button>"; }).join("") + "</span></div>" +
    (v === "calendar" ? mentorMonth(ed, days) : days.length ? teamList(ed, days) : '<p class="small mute">No practice days in the next 8 weeks.</p>') +
    (ed && c.pop ? dayPop(ed, c.pop.d, days) : "") + "</div>";
}
function answerLabel(a, student) {
  // Ground up: one style for every answer, a dot and a word.
  if (D.ground() && a && a.st === "coming") return '<span class="pill info anscoming">Coming</span>' + (range(a) ? '<span class="anshours num">' + range(a) + "</span>" : "");
  if (D.ground() && a && a.st === "cant" && !student) return '<span class="pill ansno">Not coming</span>';
  if (a && a.st === "coming") return '<span class="ans-ok">' + D.ic("check", 13) + " " + (range(a) || "Coming") + "</span>";
  if (a && a.st === "cant" && !student) return '<span class="mute">✕ Not coming</span>';
  return D.ground() ? '<span class="pill noreply">No reply</span>' : '<span class="mute" aria-label="No answer">–</span>';
}
function teamList(ed, days) {
  var c = C(), me = D.me().name, student = !D.isStaff(), admin = D.S.role === "admin", others = MENTORS.filter(function (m) { return m !== ed; });
  var sub = 'class="who subline"';
  return '<div class="tablewrap" data-keepscroll="mtable"><table class="mtab"><thead><tr><th>Practice</th>' +
    (ed ? '<th class="mine">' + (ed === me ? "You" : esc(ed)) + '<span ' + sub + ">" + (D.ground() ? "Tap your reply to change that day" : "Tap a day to change it") + "</span></th>" : "") +
    others.map(function (m) { return "<th>" + (admin ? '<button class="linkbtn" data-act="hereeditm" data-v="' + esc(m) + '" data-tip="Edit ' + esc(m) + '\'s days.">' + esc(m) + "</button>" : esc(m)) + "</th>"; }).join("") + "</tr></thead><tbody>" +
    days.map(function (e) {
      var d = e.date, n = comingCount(d), mine = ed && ans(ed, d), open = c.pop && c.pop.d === d;
      return '<tr' + (c.focus === d ? ' class="focusrow"' : "") + '><td><b>' + fmt(d) + '</b><span class="subline ' + (n ? "who" : "nobody") + '">' + (n ? n + " coming" : "Nobody yet") + "</span></td>" +
        (ed ? '<td class="mine"><button class="dbtn" data-act="herepop" data-d="' + d + '"' + (open ? " data-pop-anchor" : "") + ' aria-expanded="' + !!open + '" data-tip="' + (ed === me ? "Change your answer for this day." : "Change " + esc(ed) + "'s answer for this day.") + '">' + (mine ? answerLabel(mine) : '<span class="small" style="color:var(--accent)">Answer…</span>') + "</button></td>" : "") +
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
        beside = '<button class="dchip ' + (a && a.st === "coming" ? "ok" : a && a.st === "cant" ? "cant" : "ask") + '" data-act="herepop" data-d="' + s + '"' + (c.pop && c.pop.d === s ? " data-pop-anchor" : "") + ' data-tip="' + (ed === me ? "Change your answer for this day" : "Change " + esc(ed) + "'s answer for this day") + " (now: " + said + ').">' +
          (a && a.st === "coming" ? D.ic("check", 11) + " " + (r || "Coming") : a && a.st === "cant" ? "✕ Can't" : "Coming?") + "</button>";
      }
      below = n ? (student ? '<span class="who">' + n + " mentor" + (n > 1 ? "s" : "") + "</span>" : "") : '<span class="nobody">⚠ Nobody yet</span>';
    }
    cells += '<div class="day' + (d.getMonth() !== m ? " other" : "") + (s === TODAYS ? " today" : "") + '"><div class="dtop"><span class="d">' + (D.ground() && d.getDate() === 1 && d.getMonth() !== m ? d.toLocaleDateString("en-US", { month: "short" }) + " " : "") + d.getDate() + "</span>" + beside + "</div>" + evs.slice(0, 2).map(evBtn).join("") + (evs.length > 2 ? '<span class="who">+' + (evs.length - 2) + " more</span>" : "") + below + "</div>";
  }
  return '<div class="row mnav"><button class="btn sm" data-act="heremonth" data-v="-1" aria-label="Previous month" data-tip="Go back one month.">←</button><h3 class="mtitle">' + first.toLocaleDateString("en-US", { month: "long", year: "numeric" }) + '</h3><button class="btn sm" data-act="heremonth" data-v="1" aria-label="Next month" data-tip="Go forward one month.">→</button><button class="btn ghost sm" data-act="heremonth" data-v="0">Today</button></div>' +
    '<div class="tablewrap" data-keepscroll="mmonth"><div class="month wide">' + WD.map(function (x) { return '<div class="dh">' + x + "</div>"; }).join("") + cells + "</div></div>";
}
function dayPop(m, d, days) {
  var a = ans(m, d), au = C().avail[m], pe = days.filter(function (e) { return e.date === d; })[0], st = a ? a.st : null;
  return '<div class="dpop" role="dialog" aria-label="Answer for ' + fmt(d) + '"><div class="row between nowrap"><b>' + (m === D.me().name ? fmt(d) : esc(m) + " · " + fmt(d)) + '</b><button class="xbtn sm" data-act="herepop" aria-label="Close" data-tip="Close without changing this day.">×</button></div>' +
    '<div class="row chips"><button class="btn sm' + (st === "coming" ? " primary" : "") + '" data-act="hereday" data-d="' + d + '" data-v="coming" aria-pressed="' + (st === "coming") + '">' + D.ic("check", 14) + ' Coming</button><button class="btn sm' + (st === "cant" ? " on" : "") + '" data-act="hereday" data-d="' + d + '" data-v="cant" aria-pressed="' + (st === "cant") + '">✕ Can\'t</button></div>' +
    (st === "coming" ? '<div class="dgrid"><span class="who">Arrive and leave</span>' + timeInputs("dt", "heredtime", 'data-d="' + d + '"', a.start || dayTimes(d).start, a.end || dayTimes(d).end, WD[parse(d).getDay()]) + "</div>" : "") +
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
    '<p class="dmute">' + C().here.length + " in the shop · practice until 6:00 pm</p>" + (D.S.role !== "display" ? '<button class="btn" data-act="goapp" data-app="here" data-tab="today">Exit display</button>' : "") + "</div>";
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
/* Every coming practice or build day up to a date, listed as practiceDays lists them (for a date further off than
   the tab's usual fourteen). */
function practicesTo(date) { return upcoming(1000, ["practice", "build"]).filter(function (e) { return (e.auto || e.kind === "build") && e.date <= date; }).filter(function (e, i, arr) { return !arr.slice(0, i).some(function (x) { return x.date === e.date; }); }); }
function snacks() {
  var c = C(), nm = snackName();
  var days = practiceDays(14), flagged = false;
  /* Ground up: opened on a date (openSnacks, or a door on the Calendar tab). That day's row is marked; a day further
     off than the list reaches makes the list longer; a past or settled day opens the tab at the top with a line. */
  var f = D.ground() ? c.focus : null, mark = D.ground() ? f || c.mark : null, note = "";
  if (f) {
    if (days.length && f > days[days.length - 1].date && practiceOn(f)) days = practicesTo(f);
    if (f < TODAYS) note = fmt(f) + " is past. These are the practices coming up.";
    else if (!days.some(function (e) { return e.date === f; })) note = "There is no practice on " + fmt(f) + " any more.";
    else if (!needsSnacks(f)) note = fmt(f) + " has all its snacks now.";
    if (note) mark = null;
    c.mark = mark;
  }
  var mine = days.filter(function (e) { return (c.snacks[e.date] || []).indexOf(nm) >= 0; });
  var bk = D.ground() && c.bulk && days.some(function (e) { return e.date === c.bulk.from; }) ? c.bulk : null;
  if (bk) flagged = true; // the bulk choice holds the screen's one filled button while it is open
  return (note ? '<p class="snnote" role="status" tabindex="-1">' + esc(note) + "</p>" : "") + (mine.length ? '<div class="card hero"><h2>You\'re bringing snacks on ' + mine.map(function (e) { return fmt(e.date); }).join(", ") + '</h2><p class="small mute">We\'ll remind you the day before.</p></div>' : "") +
    '<div class="card"><div class="row between"><h2>Coming practices</h2><span class="who">' + c.slots + ' families per practice · nut-free please</span></div>' + (D.ground() ? '<p class="snhint">Bringing snacks in bulk? Sign up for one practice, then add the practices after it in one go.</p>' : "") + '<div class="list">' +
    days.map(function (e) {
      var s = c.snacks[e.date] || (c.snacks[e.date] = new Array(c.slots).fill(null));
      var names = s.filter(Boolean), open = s.indexOf(null), has = s.indexOf(nm), act;
      if (has >= 0) act = '<button class="btn ghost sm" data-act="snackfree" data-d="' + e.date + '" data-k="' + has + '">Cancel</button>';
      else if (open >= 0) { act = '<button class="btn sm' + (flagged ? "" : " primary") + '" data-act="snack" data-d="' + e.date + '" data-k="' + open + '"' + (D.ground() ? ' data-bulk="1"' : "") + '>I\'ll bring snacks</button>'; flagged = true; }
      else act = '<span class="pill ok">Covered</span>';
      return '<div class="li snrow' + (D.ground() ? (mark === e.date ? " snmark" : "") : c.focus === e.date ? " focusrow" : "") + '"' + (D.ground() ? ' data-d="' + e.date + '"' : "") + '><span class="grow"><b>' + fmt(e.date) + '</b><span class="who agmore">' + span(e) + " · " + (names.length ? esc(names.join(", ")) + (open >= 0 ? " · needs " + (s.length - names.length) + " more" : "") : "Nobody yet") + "</span></span>" + act + "</div>" + (bk && bk.from === e.date ? bulkBlock(bk, days) : "");
    }).join("") + "</div></div>";
}
/* Ground up (the owner, 2026-11-19): "if parents bring bulk snacks, they can mark multiple consecutive days". After a
   family signs up for a practice on this tab, the row offers the practices after it that still need snacks (up to
   four, by date), to tick and sign up for in one press. The one-press sign-up for a single day is unchanged. */
function bulkNext(from, days) { var nm = snackName(); return (days || practiceDays(14)).filter(function (e) { return e.date > from && needsSnacks(e.date) && (C().snacks[e.date] || []).indexOf(nm) < 0; }).slice(0, 4); }
function bulkBlock(bk, days) {
  var c = C(), next = bulkNext(bk.from, days);
  if (!next.length) return "";
  return '<fieldset class="snbulk" tabindex="-1"><legend>Bringing enough for more practices?</legend><p class="snbsub">Tick the practices after ' + esc(fmt(bk.from)) + ' that you will bring snacks to as well.</p><div class="snbopts">' +
    next.map(function (e) {
      var names = (c.snacks[e.date] || []).filter(Boolean), id = "snb-" + e.date;
      return '<label class="snbopt" for="' + id + '"><input type="checkbox" id="' + id + '" data-change="snbulkpick" data-d="' + e.date + '"' + (bk.picked[e.date] ? " checked" : "") + '><span class="grow"><b>' + fmt(e.date) + '</b><span class="who">' + esc(span(e)) + ", " + (names.length ? esc(names.join(" and ")) + " is bringing some" : "nobody yet") + "</span></span></label>";
    }).join("") + "</div>" + (bk.err ? '<p class="snberr" role="alert">Tick the practices you will bring snacks to, or press No thanks.</p>' : "") +
    '<div class="row snbacts"><button class="btn primary sm" data-act="snbulk">Sign up for these</button><button class="btn ghost sm" data-act="snbulkno">No thanks</button></div></fieldset>';
}
function shortDates(list) { var t = list.map(function (d) { return fmt(d, { month: "short", day: "numeric" }); }); return t.length > 1 ? t.slice(0, -1).join(", ") + " and " + t[t.length - 1] : t[0]; }
D.changes.snbulkpick = function (el) { var bk = C().bulk; if (!bk) return; bk.picked[el.dataset.d] = el.checked; if (bk.err) { bk.err = false; D.render(); } };
D.acts.snbulk = function () {
  var c = C(), bk = c.bulk, nm = snackName(); if (!bk) return;
  var dates = Object.keys(bk.picked).filter(function (d) { return bk.picked[d]; }).sort();
  if (!dates.length) { bk.err = true; bk.focusPick = true; D.render(); return; }
  var all = [bk.from].concat(dates), before = {};
  all.forEach(function (d) { var s = c.snacks[d] || (c.snacks[d] = new Array(c.slots).fill(null)); before[d] = d === bk.from ? s.map(function (x) { return x === nm ? null : x; }) : s.slice(); });
  c.bulk = null; c.bulkDone = bk.from;
  D.withUndo("Signed up for " + shortDates(all) + ".", function () {
    dates.forEach(function (d) { var s = c.snacks[d], k = s.indexOf(null); if (k >= 0 && s.indexOf(nm) < 0) s[k] = nm; });
  }, function () { all.forEach(function (d) { c.snacks[d] = before[d]; }); c.bulkDone = null; });
};
D.acts.snbulkno = function () { var c = C(), from = c.bulk && c.bulk.from; c.bulk = null; c.bulkDone = from; D.render(); };
D.after.push(function () {
  var c = D.S && D.S.cal; if (!c || !D.ground()) return;
  var blk = document.querySelector(".snbulk");
  if (c.bulk && !blk) { c.bulk = null; return; } // left the tab, or nothing left to add: the offer is over
  if (c.bulk && c.bulk.focusPick) { c.bulk.focusPick = false; var x = blk.querySelector("input"); if (x) { x.focus({ preventScroll: true }); scrollBelowBars(blk); } return; }
  if (c.bulk && c.bulk.focusBlock) { c.bulk.focusBlock = false; blk.focus({ preventScroll: true }); return; }
  if (c.bulkDone) { var r = document.querySelector('.snrow[data-d="' + c.bulkDone + '"]'); c.bulkDone = null; if (r) { r.setAttribute("tabindex", "-1"); r.focus({ preventScroll: true }); } }
});

/* ---------- Volunteer tab ---------- */
/* Like Snacks, but the days are events an admin adds, each with its own number of spots. Parents and mentors sign up
   from the row; an admin sees how many are still needed and edits the event (and who is on it) in a dialog. */
function people(n) { return n + (n === 1 ? " person" : " people"); }
function volWhen(v) { return fmt(v.date) + ", " + span(v) + (v.where ? ", " + v.where : ""); }
function volunteer() {
  var me = volName(), admin = D.S.role === "admin", list = volList(), flagged = false;
  var mine = list.filter(function (v) { return v.who.indexOf(me) >= 0; }).map(function (v) { return v.name + " on " + fmt(v.date); });
  var hero = mine.length ? '<div class="card hero"><h2>You\'re helping at ' + esc(mine.length > 1 ? mine.slice(0, -1).join(", ") + " and " + mine[mine.length - 1] : mine[0]) + '</h2><p class="small mute">We\'ll remind you two days before.</p></div>' : "";
  var rows = list.map(function (v) {
    var open = v.need - v.who.length, has = v.who.indexOf(me) >= 0, act;
    var names = v.who.map(function (n) { return n === me ? "You" : n; }).sort(function (a, b) { return a === "You" ? -1 : b === "You" ? 1 : 0; });
    if (admin) act = (open > 0 ? '<span class="pill warn">' + open + " more needed</span>" : '<span class="pill ok">Full</span>') + '<button class="btn sm" data-act="voledit" data-v="' + v.id + '" aria-label="Edit ' + esc(v.name) + '">Edit</button>';
    else if (has) act = '<button class="btn ghost sm" data-act="volno" data-v="' + v.id + '">Cancel sign-up</button>';
    else if (open > 0) { act = '<button class="btn sm' + (flagged ? "" : " primary") + '" data-act="volyes" data-v="' + v.id + '" aria-label="Sign up for ' + esc(v.name) + '">Sign up</button>'; flagged = true; }
    else act = '<span class="pill ok">Full</span>';
    return '<div class="li vrow' + (admin ? " vadm" : "") + (C().focus === v.date ? " focusrow" : "") + '"><span class="grow"><b>' + esc(v.name) + '</b><span class="who agmore">' + esc(volWhen(v)) + "</span>" + (v.note ? '<span class="vnote">' + esc(v.note) + "</span>" : "") +
      '<span class="who vwho">' + (names.length ? names.length + " of " + v.need + " signed up: " + esc(names.join(", ")) : "Nobody yet, " + people(v.need) + " needed") + "</span></span>" + act + "</div>";
  }).join("");
  return hero + '<div class="card"><div class="row between"><h2>Volunteer events</h2><span class="who">' + (admin ? "Parents and mentors sign up here" : "One spot is one adult") + "</span></div>" +
    (rows ? '<div class="list">' + rows + "</div>" : '<p class="mute">' + (admin ? "No volunteer events yet. Add the first with New volunteer event." : "Nothing needs volunteers right now. You'll get a notice when something does.") + "</p>") + "</div>";
}
/* New and Edit are one dialog. It works on a copy (the draft), so removing a person or closing changes nothing until Save. */
D.modals.vol = function (d) {
  var edit = d.id != null;
  return D.modalHead(edit ? "Edit volunteer event" : "New volunteer event") + '<div class="formgrid"><div class="field wide"><label for="ve-name">What</label><input id="ve-name" value="' + esc(d.name) + '"></div>' +
    '<div class="field"><label for="ve-date">Date</label><input id="ve-date" type="date" value="' + esc(d.date) + '"></div><div class="field"><label for="ve-need">People needed</label><input id="ve-need" type="number" min="1" max="60" inputmode="numeric" value="' + esc(d.need) + '"></div>' +
    '<div class="field"><label for="ve-start">From</label><input id="ve-start" type="time" value="' + esc(d.start) + '"></div><div class="field"><label for="ve-end">To</label><input id="ve-end" type="time" value="' + esc(d.end) + '"></div>' +
    '<div class="field wide"><label for="ve-where">Where</label><input id="ve-where" value="' + esc(d.where) + '"></div>' +
    '<div class="field wide"><label for="ve-note">What to know</label><textarea id="ve-note" rows="2">' + esc(d.note) + "</textarea></div></div>" +
    (edit ? '<div><p class="flabel">Signed up, ' + d.who.length + " of " + esc(d.need) + '</p><div class="list">' + (d.who.map(function (n, i) { return '<div class="li"><b class="grow">' + esc(n) + '</b><button class="btn ghost sm" data-act="volrm" data-i="' + i + '" aria-label="Remove ' + esc(n) + '">Remove</button></div>'; }).join("") || '<div class="li"><span class="mute">Nobody yet</span></div>') +
      '</div><div class="row nowrap vadd"><input class="inp" id="ve-add" placeholder="Name" aria-label="Add someone by name"><button class="btn" data-act="voladd">Add</button></div></div>' : "") +
    '<div class="row mfoot"><button class="btn primary" data-act="volsave">Save</button><button class="btn" data-act="closemodal">Cancel</button>' + (edit ? '<button class="btn danger vdel" data-act="voldel">Delete event</button>' : "") + "</div>";
};

/* ---------- Actions ---------- */
var A = D.acts;
A.calmonth = function (b) { var c = C(), m = c.month[1] + (+b.dataset.v), y = c.month[0]; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } c.month = [y, m]; D.render(); };
A.caltoday = function () { C().month = [2026, 10]; D.render(); };
A.calev = function (b) { D.openDrawer("calev", { id: b.dataset.v }); };
// A door on a practice day: open that tab (and its view) and show the day.
A.caldoor = function (b) { if (b.dataset.tab) D.S.tabs[b.dataset.v] = b.dataset.tab; C().focus = b.dataset.d || null; D.go(b.dataset.v); };
/* Ground up, the Snacks tab opened on a date: scroll its row into view below the app bar and the tab row, put the
   focus on its sign-up button (or the row), and mark it. With motion the mark fades by itself; with reduced motion it
   stays until the next press. A past or settled date: the focus goes to the line that says so. */
function belowBars() {
  var h = 0;
  document.querySelectorAll(".appbar, .topbar").forEach(function (b) { var cs = getComputedStyle(b); if (cs.position === "sticky" || cs.position === "fixed") h = Math.max(h, (parseFloat(cs.top) || 0) + b.getBoundingClientRect().height); });
  return h;
}
function scrollBelowBars(el) {
  var top = belowBars(), r = el.getBoundingClientRect(), room = window.innerHeight - top;
  window.scrollTo(0, Math.max(0, r.top + window.scrollY - top - Math.max(16, (room - r.height) / 3)));
}
function showRow(el) {
  scrollBelowBars(el);
  var b = el.querySelector('[data-act="snack"]');
  if (!b) { el.setAttribute("tabindex", "-1"); b = el; }
  b.focus({ preventScroll: true });
}
function reduced() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
D.after.push(function () {
  var c = D.S && D.S.cal; if (!c || !c.focus || !D.ground() || D.S.route !== "calendar" || D.tab("calapp", "calendar") !== "snacks") return;
  c.focus = null;
  if (!reduced()) c.mark = null; // the class stays on the row until the next redraw, long enough for the fade
  var n = document.querySelector(".snnote"), m = document.querySelector(".snrow.snmark");
  setTimeout(function () { if (n) n.focus({ preventScroll: true }); else if (m) showRow(m); }, 0);
});
// The next press anywhere clears a steady mark (reduced motion).
document.addEventListener("click", function () {
  var c = D.S && D.S.cal; if (!c || !c.mark) return;
  c.mark = null; document.querySelectorAll(".snmark").forEach(function (el) { el.classList.remove("snmark"); });
}, true);
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
  if (v === "coming") a.t[d] = pe && pe.start ? { start: pe.start, end: pe.end } : { start: (a.ut[w] || {}).start || dayTimes(d).start, end: (a.ut[w] || {}).end || dayTimes(d).end };
  D.log("answered " + (v === "coming" ? "Coming" : "Can't come") + " for " + fmt(d), "calendar"); D.render();
};
D.changes.heredtime = function (el) { var a = edAvail(), d = el.dataset.d, cur = ans(editorName(), d) || {}, p = dayTimes(d); a.one[d] = "coming"; a.t[d] = { start: cur.start || p.start, end: cur.end || p.end }; a.t[d][el.dataset.f] = el.value; D.render(); };
A.hereuseusual = function (b) { var a = edAvail(); delete a.one[b.dataset.d]; delete a.t[b.dataset.d]; D.render(); };
A.hereusual = function (b) { var dr = draft(editorName()), w = b.dataset.v; if (dr[w]) delete dr[w]; else dr[w] = weekdayTimes(w); D.render(); };
D.changes.hereutime = function (el) { draft(editorName())[el.dataset.w][el.dataset.f] = el.value; D.render(); };
A.heresaveusual = function () { var c = C(), a = edAvail(), dr = draft(editorName()); a.usual = Object.keys(dr).map(Number); a.ut = {}; a.usual.forEach(function (w) { a.ut[w] = { start: dr[w].start, end: dr[w].end }; }); c.udraft = null; D.toast("Usual week saved"); D.render(); };
D.changes.hereedit = function (el) { var c = C(); c.medit = el.value; c.pop = null; c.udraft = null; D.render(); };
A.hereeditm = function (b) { var c = C(); c.medit = b.dataset.v; c.pop = null; c.udraft = null; D.render(); };
A.herefix = function (b) { var c = C(); c.att[b.dataset.n][b.dataset.d] = 2.5; c.adjust.push({ who: b.dataset.n, hours: 0, why: "Fixed missed sign-out on " + fmt(b.dataset.d) + " (2.5 h)", by: D.me().name, when: "Just now" }); D.toast("Fixed. " + b.dataset.n + " gets 2.5 hours."); D.render(); };
A.hereadd = function () { var c = C(); c.adjust.unshift({ who: D.val("ha-who"), hours: parseFloat(D.val("ha-h")) || 0, why: D.val("ha-why"), by: D.me().name, when: "Just now" }); D.toast("Saved. It shows in their history."); D.render(); };
A.snack = function (b) { var c = C(), nm = snackName(); c.snacks[b.dataset.d][+b.dataset.k] = nm; if (b.dataset.bulk) c.bulk = bulkNext(b.dataset.d).length ? { from: b.dataset.d, picked: {}, err: false, focusBlock: true } : null; D.toast("Thanks. You'll get a reminder the day before."); D.render(); };
A.snackday = function (b) { openSnacks(b.dataset.d || b.dataset.v); };
A.snackfree = function (b) { if (C().bulk && C().bulk.from === b.dataset.d) C().bulk = null; C().snacks[b.dataset.d][+b.dataset.k] = null; D.render(); };
function volBy(id) { return C().vol.filter(function (v) { return v.id === +id; })[0]; }
A.volyes = function (b) {
  var v = volBy(b.dataset.v), me = volName(); if (!v || v.who.indexOf(me) >= 0 || v.who.length >= v.need) return;
  v.who.push(me); D.log("signed up to help at " + v.name, "calendar");
  if (v.who.length === v.need) D.notify("admin", "calendar", v.name + " on " + fmt(v.date) + " has all " + people(v.need) + ".");
  D.toast("Signed up for " + v.name + ", " + fmt(v.date) + ". We'll remind you two days before."); D.render();
};
A.volno = function (b) {
  var v = volBy(b.dataset.v), me = volName(); if (!v) return;
  v.who = v.who.filter(function (n) { return n !== me; });
  D.notify("admin", "calendar", me + " can no longer help at " + v.name + " on " + fmt(v.date) + ".");
  D.toast("Sign-up cancelled. Your spot at " + v.name + " is open again."); D.render();
};
// The dialog's fields, read back into the draft before anything redraws it.
function volDraft() { var d = D.S.modal.data; ["name", "date", "need", "start", "end", "where", "note"].forEach(function (k) { d[k] = D.val("ve-" + k); }); return d; }
A.volnew = function () { D.openModal("vol", { id: null, name: "Field build, day 2", date: "2027-01-23", start: "09:00", end: "13:00", where: "Dawson shop", need: 6, note: "Finish the field pieces and paint them.", who: [] }); };
A.voledit = function (b) { var v = volBy(b.dataset.v); if (v) D.openModal("vol", { id: v.id, name: v.name, date: v.date, start: v.start, end: v.end, where: v.where, need: v.need, note: v.note, who: v.who.slice() }); };
A.volrm = function (b) { volDraft().who.splice(+b.dataset.i, 1); D.render(); };
A.voladd = function () { var d = volDraft(), n = D.val("ve-add").trim(); if (n && d.who.indexOf(n) < 0) d.who.push(n); D.render(); };
A.volsave = function () {
  var c = C(), d = volDraft(), name = d.name.trim(), need = Math.max(parseInt(d.need, 10) || 0, d.who.length);
  if (!name || !d.date || need < 1) { D.toast("Give it a name, a date and how many people it needs."); D.render(); return; }
  var v = d.id != null ? volBy(d.id) : null, moved = v && (v.date !== d.date || v.start !== d.start) && d.who.length;
  if (!v) { v = { id: 1 + c.vol.reduce(function (m, x) { return Math.max(m, x.id); }, 0) }; c.vol.push(v); }
  v.name = name; v.date = d.date; v.start = d.start; v.end = d.end; v.where = d.where.trim(); v.need = need; v.note = d.note.trim(); v.who = d.who.slice();
  D.S.modal = null;
  if (d.id == null) { D.log("asked for volunteers for " + v.name, "calendar"); D.notify(["parent", "mentor"], "calendar", "Volunteers needed: " + v.name + ", " + fmt(v.date) + ". " + people(v.need) + "."); D.toast("Saved. Parents and mentors were told."); }
  else D.toast(moved ? "Saved. The " + people(d.who.length) + " signed up " + (d.who.length === 1 ? "was" : "were") + " told the new time." : "Saved.");
  D.render();
};
A.voldel = function () {
  var c = C(), v = volBy(D.S.modal.data.id), at = c.vol.indexOf(v); if (!v) return;
  D.S.modal = null;
  D.withUndo("Deleted " + v.name + "." + (v.who.length ? " The " + people(v.who.length) + " signed up " + (v.who.length === 1 ? "was" : "were") + " told." : ""), function () { c.vol.splice(at, 1); }, function () { c.vol.splice(at, 0, v); });
};
})();
