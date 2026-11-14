/* The guide (GUIDE_DESIGN.md): a small "Get started" card on Home that offers one real first-week job at a time.
   "Show me" opens the real screen and rings one control that stays live. Using it finishes the stop; "Got it" does
   too. "Later", Escape, a tap elsewhere or leaving the screen closes the stop and keeps what is done. When every stop
   is done the card says so once and is gone; "Start the tour again" on Account is the only way back in.
   The guide writes nothing but its own progress (kept per role with the demo's other saved choices; the real site
   keeps it on the person's account). No timers: a stop is drawn in the same frame as the tap.
   The guide never adds a gold button: its own buttons are plain, so the page's gold control stays the only one. */
(function () {
"use strict";
var esc = D.esc;
function q(sel) { return document.querySelector(sel); }
function rowWith(sel, re) { return Array.from(document.querySelectorAll(sel)).filter(function (r) { return re.test(r.textContent); })[0] || null; }
function cardTitled(text) { var h = Array.from(document.querySelectorAll(".content h2")).filter(function (x) { return x.textContent.trim() === text; })[0]; return h ? h.closest(".card") : null; }
function cal() { return D.S.cal; }
function phone() { return window.matchMedia && window.matchMedia("(max-width: 640px)").matches; }

/* ---------- The stops. A stop is a need, not an app: three to five per role, never more. ----------
   name/line: the Home card row. title/text: the stop card (one sentence, about 20 words, naming the control).
   missing: what the card says when the control is not on the screen. go: open the real screen. target: the control.
   zone (optional): where a tap does not close the stop. snap: what to compare against. done: the person did it. */
var S_DOOR = { id: "door", name: "Sign in at the door", line: "The first thing you do at every practice.", covered: "signing in at the door",
  title: "Sign in at the door", text: "Tap the gold Scan the door code button when you arrive, and you are signed in.",
  missing: "At practice, tap the gold Scan the door code button here when you arrive.",
  go: function () { D.S.tabs.here = "today"; D.go("here"); }, target: function () { return q('.statuscard [data-act="herescan"]'); },
  snap: function () { return cal().here.some(function (h) { return h.name === D.me().name; }); },
  done: function (s) { return !s && cal().here.some(function (h) { return h.name === D.me().name; }); } };
var S_TASK = { id: "task", name: "Find your next task", line: "What to work on when you get to the shop.", covered: "your next task",
  title: "Open your next task", text: "Your next task is always on this card; tap Open to see its steps.",
  missing: "When a task is assigned to you, it shows here as your next task.",
  go: function () { D.S.tasks.at = { v: "my" }; D.go("tasks"); }, target: function () { return q('.nextup .heroacts [data-act="topen"]'); }, // only Open: Done and the rest stay ordinary taps
  done: function (s, g) { return g.clicked && D.S.drawer && D.S.drawer.type === "task"; } };
var S_PART = { id: "part", name: "Ask for a part", line: "When your task needs something the shop doesn't have.", covered: "asking for a part",
  title: "Ask for a part", text: "Tap the gold Request a part button to open the form; you don't have to send it.",
  missing: "Parts & Inventory has a gold Request a part button at the top right.",
  go: function () { D.S.tabs.parts = "requests"; D.go("parts"); }, target: function () { return q('.topbar .right [data-act="tab"][data-v="new"]'); },
  done: function () { return D.S.route === "parts" && D.S.tabs.parts === "new"; } };
var S_SKILL = { id: "skill", name: "See your next skill", line: "Skills unlock shop tools step by step.", covered: "your next skill",
  title: "Open your next skill", text: "This is the first skill you can start; open it to see what it takes.",
  missing: "When a skill is open to you, it shows first under Ready to start.",
  go: function () { D.S.tabs.skills = "overview"; D.go("skills"); }, target: function () { return rowWith('.skills button[data-act="skmine"]', /Ready/); },
  done: function () { return D.S.drawer && D.S.drawer.type === "skill"; } };
var S_DAYS = { id: "days", name: "Say which days you are coming", line: "So students know when a mentor will be there.", covered: "your days",
  title: "Say which days you come", text: "Tap your usual days here and save, or tap one day in Who's coming to change just that day.",
  missing: "Attendance has a My days view where you set the days you usually come.",
  go: function () { D.S.tabs.here = "mentors"; D.go("here"); }, target: function () { return q(".card.usual"); }, zone: ".mavail",
  snap: function () { return JSON.stringify(cal().avail); }, done: function (s) { return JSON.stringify(cal().avail) !== s; } };
var S_WAIT = { id: "wait", name: "See what is waiting on you", line: "Parts to approve, sign-offs, mentor answers.", covered: "what is waiting on you",
  title: "See what is waiting on you", text: "Everything that needs you is listed here; tap a row to go straight to it.",
  missing: "Nothing waits on you now; when something does, it shows here under Waiting on you.",
  go: function () { D.go("portal"); }, target: function () { var c = cardTitled("Waiting on you"); return c && c.querySelector(".todayrow") ? c.querySelector(".list") : null; },
  done: function (s, g) { return g.clicked && D.S.route !== "portal"; } };
var S_OK = { id: "ok", name: "Approve a part request", line: "Requests over the limit wait for a mentor's OK.", covered: "part approvals",
  title: "Open a request that needs an OK", text: "Open this request to see the part, the cost and the budget, then decide.",
  missing: "No request needs an OK now; when one does, it comes first in Requests.",
  go: function () { D.S.tabs.parts = "requests"; D.go("parts"); }, target: function () { return rowWith(".prow", /Needs mentor OK/); },
  done: function () { var d = D.S.drawer; if (!d || d.type !== "preq") return false; var r = D.S.parts.requests.filter(function (x) { return String(x.id) === String(d.data.id); })[0]; return !!r && r.status === "needsok"; } };
var S_SIGN = { id: "sign", name: "Sign off a skill", line: "Students ask; you check their work and sign.", covered: "skill sign-offs",
  title: "Sign off a skill", text: "Check the student's work, then tap Sign off, or Not yet if it needs more practice.",
  missing: "No one is waiting now; sign-off requests show here when students ask.",
  go: function () { D.S.tabs.skills = "signoff"; D.go("skills"); }, target: function () { return q(".skq"); },
  // Finished by a decision (Sign off or Not yet takes the request off the list), not by any tap on the row.
  snap: function () { return D.S.sk.requests.length; }, done: function (s) { return D.S.sk.requests.length !== s; } };
var S_NEXT = { id: "next", name: "See the next practice", line: "Practices and events, in order.", covered: "the next practice",
  title: "See what is coming up", missing: "The Calendar lists every practice and event, soonest first.",
  go: function () { D.go("calendar"); },
  target: function (g) { return g.snap ? q(".agitem:has(.agdoors) .agrow") : q('.subnav [data-app="calendar"][data-v="agenda"]'); },
  textFor: function (g) { return g.snap ? "The next practice is first; tap it to see the time, the place and who brings snacks." : "Tap Agenda to see practices and events as a list, the next one first."; },
  snap: function () { return D.tab("calendar", phone() ? "agenda" : "month") === "agenda"; },
  done: function (s, g) { return s ? g.clicked : D.S.route === "calendar" && D.S.tabs.calapp === "calendar" && D.S.tabs.calendar === "agenda"; } };
var S_SUB = { id: "sub", name: "Put the calendar on your phone", line: "Practices show up in your own calendar app.", covered: "the calendar on your phone",
  title: "Put the calendar on your phone", text: "Tap Subscribe on my phone, then paste the link into your phone's calendar app.",
  missing: "The Calendar has a Subscribe on my phone button at the top right.",
  go: function () { D.go("calendar"); }, target: function () { return q('[data-act="calical"]'); },
  done: function (s, g) { return g.clicked; } };
var S_SNACK = { id: "snack", name: "Sign up for snacks", line: "Families take turns bringing snacks to practice.", covered: "snack sign-up",
  title: "Sign up for snacks", text: "Tap I'll bring snacks on a day that suits you; you get a reminder the day before.",
  missing: "Every practice has snacks covered; a day that needs more gets an I'll bring snacks button.",
  go: function () { D.go("snacks"); }, target: function () { return q('.snrow [data-act="snack"]'); },
  snap: function () { return JSON.stringify(cal().snacks); }, done: function (s, g) { return g.clicked || JSON.stringify(cal().snacks) !== s; } };
var S_ADMIN = { id: "admin", name: "Let new people in", line: "Approve new accounts and set their groups.", covered: "letting new people in",
  title: "Let new people in", text: "Open Admin, under More, to approve new accounts and put people in groups.",
  missing: "In Build mode, Admin is under More on Home; open it to approve new accounts.",
  go: function () { D.S.guideOpen = { more: true }; D.go("portal"); }, target: function () { return q('.homegroups [data-grp="more"] a[href*="#admin"]'); },
  done: function (s, g) { return g.clicked; } };
var S_PATTERN = { id: "pattern", name: "Set when the team practices", line: "The weekly pattern, days off and phone links.", covered: "the practice pattern",
  title: "Set when the team practices", text: "Open Practice pattern and sync to set weekly practices and days off; only admins can change it.",
  missing: "Calendar has a Practice pattern and sync view for admins.",
  go: function () { D.go("calendar"); }, target: function () { return q('.subnav [data-app="calendar"][data-v="setup"]'); },
  done: function () { return D.S.route === "calendar" && D.S.tabs.calapp === "calendar" && D.S.tabs.calendar === "setup"; } };
var S_DAYS_ADMIN = Object.assign({}, S_DAYS, { name: "Check the mentor days", line: "Who is coming, and you can edit any mentor.", title: "Check the mentor days", text: "Set your own usual week here, or pick another mentor above to fix theirs." });
D.GUIDE = {
  student: [S_DOOR, S_TASK, S_PART, S_SKILL],
  mentor: [S_DAYS, S_WAIT, S_OK, S_SIGN],
  parent: [S_NEXT, S_SUB, S_SNACK],
  admin: [S_ADMIN, S_PATTERN, S_WAIT, S_DAYS_ADMIN, S_OK]
};

/* ---------- Progress, kept per role ---------- */
/* What each stop's screen needs. A stop whose app (or Calendar tab) is not in the current mode is left out of the
   list and the count while that mode is on, and comes back with it. */
var NEEDS = { door: "tab:here", task: "tasks", part: "parts", skill: "skills", days: "tab:here", ok: "parts", sign: "skills", next: "calendar", sub: "calendar", snack: "tab:snacks", admin: "admin", pattern: "calendar" };
function available(s) {
  var n = NEEDS[s.id]; if (!n) return true;
  if (n.indexOf("tab:") === 0) return D.calTab(n.slice(4));
  return D.visibleTiles().some(function (t) { return t.id === n; });
}
function allStops() { return D.GUIDE[D.S.role] || []; }
function stops() { return allStops().filter(available); }
function prog() { var p = D.pref("guide", null); return p ? { done: p.done || [], hidden: !!p.hidden, ended: !!p.ended } : { done: [], hidden: false, ended: false }; }
function saveProg(p) { D.setPref("guide", p); }
function isDone(id) { return prog().done.indexOf(id) >= 0; }
function nextStop() { return stops().filter(function (s) { return !isDone(s.id); })[0] || null; }
function stop(id) { return stops().filter(function (s) { return s.id === id; })[0]; }
function finish(id) { var p = prog(); if (p.done.indexOf(id) < 0) p.done.push(id); saveProg(p); }

/* ---------- The Home card ---------- */
D.guideCard = function () {
  var S = D.S, all0 = allStops(), list = stops(); if (!all0.length) return "";
  var p = prog();
  // When every stop (in every mode) is done, Home shows the ending once: it is marked seen as soon as it is drawn.
  if (!p.ended && !p.hidden && !S.guide && all0.every(function (s) { return p.done.indexOf(s.id) >= 0; })) { p.ended = true; saveProg(p); S.guideEnd = true; }
  if (S.guideEnd) {
    var covered = all0.map(function (s) { return s.covered; }), line = covered.length > 1 ? covered.slice(0, -1).join(", ") + " and " + covered[covered.length - 1] : covered[0];
    return '<section class="card guidecard guideend" aria-labelledby="guide-h"><h2 id="guide-h">You\'re set, ' + esc(D.me().short) + ".</h2><p>You covered " + esc(line) + ".</p>" +
      '<p class="small mute">The bell shows what is new. Your initials hold your settings. You can run this again from Account.</p><div><button class="btn" data-act="guideend">Done</button></div></section>';
  }
  if (p.hidden || p.ended) return "";
  var nx = nextStop(); if (!nx) return "";
  var n = list.filter(function (s) { return p.done.indexOf(s.id) >= 0; }).length, all = S.guideAll;
  return '<section class="card guidecard" aria-labelledby="guide-h"><div class="ghead"><h2 id="guide-h">Get started</h2><span class="who num">' + (n + 1) + " of " + list.length + '</span><span class="grow"></span>' +
    '<button class="btn ghost sm" data-act="guideall" aria-expanded="' + !!all + '"' + (all ? ' aria-controls="guide-all"' : "") + ">" + (all ? "Show less" : "See all") + '</button><button class="btn ghost sm" data-act="guidehide" data-tip="Remove this card. Account can bring it back.">Hide</button></div>' +
    '<div class="gbar" aria-hidden="true"><i style="width:' + Math.round(100 * n / list.length) + '%"></i></div>' +
    (all ? '<ol class="glist" id="guide-all">' + list.map(function (s, i) { var d = p.done.indexOf(s.id) >= 0; return '<li class="' + (d ? "gdone" : "") + '"><button class="gitem" data-act="guideshow" data-v="' + s.id + '"><span class="gtick" aria-hidden="true">' + (d ? D.ic("check", 14) : i + 1) + '</span><span class="grow"><b>' + esc(s.name) + "</b>" + (d ? '<span class="vh"> (done)</span>' : "") + '</span><span class="chev" aria-hidden="true">›</span></button></li>'; }).join("") + "</ol>" :
      '<div class="gnext"><div class="grow"><b>' + esc(nx.name) + '</b><span class="who">' + esc(nx.line) + '</span></div><button class="btn" data-act="guideshow" data-v="' + nx.id + '">Show me</button></div>') + "</section>";
};

/* ---------- A stop ---------- */
var layer = null, ringEl = null, cardEl = null, cardKey = "";
function G() { return D.S.guide; }
function openStop(id) {
  var s = stop(id); if (!s) return;
  D.hideTip && D.hideTip();
  D.S.guide = null; D.S.guideOpen = null; D.S.guideAll = false;
  D.S.drawer = null; D.S.modal = null;
  s.go(); // render, at once
  var g = D.S.guide = { id: id, phase: "show", clicked: false, route: D.S.route, fresh: true };
  g.snap = s.snap ? s.snap() : null;
  D.render();
}
// Close the stop at once: the ring, the dim and the card go now, whatever else the tap does.
function removeLayer() { if (layer) { layer.remove(); layer = null; cardKey = ""; } document.documentElement.classList.remove("gdocked"); }
function dismiss() { D.S.guide = null; D.S.guideOpen = null; removeLayer(); }
// Later or Escape: close, then put focus somewhere useful (the control itself, else the Home card, else the page title).
function closeStop() {
  var g = G(); if (!g) return;
  dismiss(); D.render(); // the page is drawn again, so find the control afresh
  var focusable = "button:not([disabled]), a[href], input:not([disabled]), select, textarea";
  var t = g.phase === "show" ? targetEl0(g) : null, f = t && (t.matches(focusable) ? t : t.querySelector(focusable));
  if (!f) f = q('.guidecard [data-act="guideshow"]') || q(".topbar .tab[aria-pressed=true]") || q(".pagehead h1, .content h1");
  if (f) { if (!f.matches(focusable)) f.tabIndex = -1; f.focus(); }
}
function targetEl0(g) { var s = stop(g.id); return s ? s.target(g) : null; }
D.guideOpen = openStop;
function targetEl() { var g = G(), s = g && stop(g.id); return s ? s.target(g) : null; }
function sentence(s, g) { return s.textFor ? s.textFor(g) : s.text; }

function ensureLayer() {
  if (layer) return;
  layer = document.createElement("div"); layer.className = "guidelayer";
  ringEl = document.createElement("div"); ringEl.className = "gring"; ringEl.setAttribute("aria-hidden", "true");
  cardEl = document.createElement("div"); cardEl.className = "gstop"; cardEl.setAttribute("role", "dialog"); cardEl.setAttribute("aria-modal", "false");
  cardEl.setAttribute("aria-labelledby", "gstop-h"); cardEl.setAttribute("aria-describedby", "gstop-t"); cardEl.tabIndex = -1;
  layer.appendChild(ringEl); layer.appendChild(cardEl); document.body.appendChild(layer);
}
function cardHtml(s, g, missing) {
  var list = stops(), i = list.indexOf(s), nx = list.filter(function (x) { return !isDone(x.id) && x.id !== s.id; })[0];
  if (g.phase === "done") return '<p class="gcount who num">' + (i + 1) + " of " + list.length + '</p><h2 id="gstop-h">Done.</h2><p id="gstop-t" aria-live="polite">' + (nx ? "Next: " + esc(nx.name) + "." : "That was the last one.") + "</p>" +
    '<div class="row nowrap gacts"><button class="btn" data-act="guidenext">' + (nx ? "Next" : "Finish") + '</button><button class="btn ghost" data-act="guidelater">Later</button></div>';
  return '<p class="gcount who num">' + (i + 1) + " of " + list.length + '</p><h2 id="gstop-h">' + esc(s.title) + '</h2><p id="gstop-t">' + esc(missing ? s.missing : sentence(s, g)) + "</p>" +
    '<div class="row nowrap gacts"><button class="btn" data-act="guidegot">Got it</button><button class="btn ghost" data-act="guidelater">Later</button></div>';
}
function inView(t) {
  // Scroll the control into view below the sticky bars, and above the docked card on a phone.
  var r = t.getBoundingClientRect(), top = 116, bottom = window.innerHeight - (phone() ? cardEl.offsetHeight + 24 : 16);
  if (r.top < top || r.bottom > bottom) {
    var dy = r.top < top || r.height > bottom - top ? r.top - top : r.bottom - bottom;
    window.scrollBy(0, dy);
  }
}
function place() {
  var g = G(); if (!g || !layer) return;
  var t = g.phase === "show" && !D.S.modal && !D.S.drawer ? targetEl() : null;
  if (t) {
    // Never over the sticky bars: the ring is cut at their lower edge, and hidden while the control is under them.
    var r = t.getBoundingClientRect(), pad = 4, bars = 0;
    document.querySelectorAll(".appbar, .topbar").forEach(function (b) { if (b.contains(t)) return; var br = b.getBoundingClientRect(); if (br.top < r.top) bars = Math.max(bars, br.bottom); });
    var top = Math.max(r.top - pad, bars), bottom = r.bottom + pad;
    if (bottom - top > 8) { Object.assign(ringEl.style, { left: r.left - pad + "px", top: top + "px", width: r.width + 2 * pad + "px", height: bottom - top + "px" }); ringEl.hidden = false; }
    else ringEl.hidden = true;
  } else ringEl.hidden = true;
  layer.classList.toggle("under", !!(D.S.modal || D.S.drawer));
  // On a phone the card is docked at the bottom: toasts move up above it (css: html.gdocked .toast).
  var docked = phone() && !layer.classList.contains("under");
  document.documentElement.classList.toggle("gdocked", docked);
  if (docked) document.documentElement.style.setProperty("--gdock", cardEl.offsetHeight + 8 + "px");
  cardEl.classList.toggle("centred", !t && !phone());
  if (phone()) { cardEl.style.left = cardEl.style.top = ""; return; }
  if (!t) { cardEl.style.left = cardEl.style.top = ""; return; }
  var rr = t.getBoundingClientRect(), w = cardEl.offsetWidth, h = cardEl.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight, gap = 14;
  var top = rr.bottom + gap; if (top + h > vh - 8) top = rr.top - h - gap;
  var left = Math.max(12, Math.min(vw - w - 12, rr.left));
  if (top < 60) { top = Math.max(60, Math.min(vh - h - 8, rr.top)); left = rr.right + gap + w < vw ? rr.right + gap : Math.max(12, rr.left - w - gap); }
  cardEl.style.left = Math.round(left) + "px"; cardEl.style.top = Math.round(top) + "px";
}
D.after.push(function () {
  var g = G();
  if (D.S.route !== "portal" && D.S.guideEnd) D.S.guideEnd = false;
  if (!g) { removeLayer(); return; }
  var s = stop(g.id); if (!s) { dismiss(); return; }
  if (g.phase === "show" && s.done(g.snap, g)) { g.phase = "done"; finish(g.id); }
  else if (g.phase === "show" && D.S.route !== g.route) { dismiss(); return; }
  ensureLayer();
  var t = g.phase === "show" ? targetEl() : null, missing = g.phase === "show" && !t;
  var key = g.id + "|" + g.phase + "|" + missing + "|" + sentence(s, g);
  var first = g.fresh || key !== cardKey;
  if (key !== cardKey) { cardEl.innerHTML = cardHtml(s, g, missing); cardKey = key; }
  layer.classList.toggle("dim", !!t);
  if (g.fresh && t) inView(t);
  place();
  if (first && !D.S.modal && !D.S.drawer) cardEl.focus({ preventScroll: true });
  g.fresh = false;
});
var raf = 0;
function replace() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; place(); }); }
window.addEventListener("scroll", replace, true);
window.addEventListener("resize", replace);

// A tap inside the ringed control counts as using it; a tap anywhere else (not the card, not a panel the control
// opened) closes the stop and keeps progress.
document.addEventListener("click", function (e) {
  var g = G(); if (!g || !layer) return;
  if (cardEl.contains(e.target)) return;
  var t = g.phase === "show" ? targetEl() : null, s = stop(g.id);
  if (t && t.contains(e.target)) { g.clicked = true; return; }
  if (s && s.zone && e.target.closest(s.zone + ", .dpop")) return;
  if (e.target.closest(".drawer, .modal, .drawer-scrim, .modal-scrim, .toast")) return;
  if (e.target.closest(".demobar") && !e.target.closest('[data-act="role"], [data-act="reset"]')) return;
  // Anything else: plain text, a link to another tab, a tile. Close now; one render follows the tap's own action.
  dismiss(); needRender = true;
}, true);
// After the tap's own action (core's handler runs first): draw once more, so a control that does its work without a
// render of its own (a link that opens a new tab) still finishes its stop, and a closed stop leaves nothing behind.
var needRender = false;
document.addEventListener("click", function () { var g = G(); if (needRender || (g && g.phase === "show" && g.clicked)) { needRender = false; D.render(); } });
// Switching role in the demo strip closes any stop: the other role has its own guide.
(D.onRole = D.onRole || []).push(function () { D.S.guideAll = false; D.S.guideEnd = false; dismiss(); });
// Keyboard: Escape closes the stop; Tab from the card's last button goes to the ringed control.
document.addEventListener("keydown", function (e) {
  var g = G(); if (!g || !layer) return;
  if (e.key === "Escape" && !D.S.modal && !D.S.drawer) { e.stopImmediatePropagation(); e.preventDefault(); closeStop(); return; }
  if (e.key === "Tab" && !e.shiftKey && cardEl.contains(document.activeElement)) {
    var btns = cardEl.querySelectorAll("button"), last = btns[btns.length - 1], t = g.phase === "show" ? targetEl() : null;
    if (t && document.activeElement === last) {
      var focusable = "button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]", f = t.matches(focusable) ? t : t.querySelector(focusable);
      if (f) { e.preventDefault(); f.focus(); }
    }
  }
}, true);

/* ---------- Actions ---------- */
var A = D.acts;
A.guideshow = function (b) { openStop(b.dataset.v); };
A.guidegot = function () { var g = G(); if (!g) return; finish(g.id); g.phase = "done"; D.render(); };
A.guidelater = function () { closeStop(); };
A.guidenext = function () {
  var g = G(), nx = nextStop();
  if (nx) { openStop(nx.id); return; }
  D.S.guide = null; D.S.guideOpen = null; D.go("portal");
};
A.guideall = function () { D.S.guideAll = !D.S.guideAll; D.render(); var b = q('[data-act="guideall"]'); if (b) b.focus(); };
A.guidehide = function () { var p = prog(); p.hidden = true; saveProg(p); D.toast("Guide hidden. Start it again from your Account page."); D.render(); };
A.guideend = function () { D.S.guideEnd = false; D.render(); var h = q(".home h1"); if (h) { h.tabIndex = -1; h.focus(); } };
A.guidereplay = function () { saveProg({ done: [], hidden: false, ended: false }); D.S.guideEnd = false; D.go("portal"); var s = stops()[0]; if (s) openStop(s.id); };
})();
