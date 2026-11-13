/* One shared hover description for every app. Any element with data-tip="…" gets it:
   - on mouse hover after half a second, at once on keyboard focus; never from touch;
   - gone on leave, blur, Escape, scroll or click;
   - above the element (below when there is no room), always inside the window, above every other layer;
   - announced with aria-describedby while it shows.
   A tip is one short sentence (about 80 characters at most) on what the thing is or does, never a repeat of its
   visible label. Nothing a person must know lives only in a tip: phones have no hover.
   Tabs, view switches and status words get their descriptions from the tables below, so every app says them the same way. */
(function () {
"use strict";

/* ---------- What tabs and view switches lead to, by app and id ---------- */
D.TABTIP = {
  parts: { requests: "Every part request and where it stands.", toorder: "Approve requests, then order them by vendor.", arriving: "Orders on the way; check them in when they come.", inventory: "What the team has and where it is kept.", budget: "What each budget has spent and has left.", vendors: "Shipping, cutoffs and how each vendor is paid." },
  skills: { signoff: "Students waiting for you to sign off a skill.", overview: "What you can start next and how far you are.", trees: "Every skill tree, step by step.", permits: "Which shop tools each person may use.", edit: "Add or change skills in a tree." },
  calapp: { calendar: "Practices, events and days off.", here: "Sign in at the door and see hours.", snacks: "Families sign up to bring snacks to practice." },
  calendar: { month: "The whole month at a glance.", agenda: "The coming days as a list.", setup: "When the team practices, days off and phone links." },
  here: { today: "Sign in and see who is in the shop now.", board: "Hours and meetings for everyone this season.", me: "Your hours, meetings and streak.", mentors: "Which mentors come on which practice days.", admin: "Fix missed sign-outs and adjust hours." },
  schedule: { mine: "Your roles and times at the event.", all: "Who does what, hour by hour.", roles: "The event roles and their colours.", settings: "Reminders, publishing and who may edit." },
  pit: { check: "Before-match checklists for the robot.", batt: "Charge and use of every battery.", archives: "Checklists from earlier matches.", edit: "Change the checklist items." },
  scouting: { form: "Scout the match you are assigned to.", stats: "Averages for every team so far.", picks: "Our ranked list for alliance selection.", assign: "Who scouts which robot in each match.", coverage: "Matches and teams nobody has scouted yet.", forms: "Change the questions on the scouting form." },
  tasks: { my: "Tasks assigned to you, soonest first.", week: "What is due and planned in the next 7 days.", dash: "Blocked and late work across the team.", calendar: "Due dates and milestones by month.", timeline: "Projects and milestones over time." }
};
D.tabTip = function (app, id) { var t = D.TABTIP[app] && D.TABTIP[app][id]; return t ? ' data-tip="' + D.esc(t) + '"' : ""; };

/* ---------- What each status word means, by app (then shared) ---------- */
var STATUS = {
  tasks: { "To do": "Nobody has started it yet.", "In progress": "Someone is working on it now.", "Blocked": "Stuck; it needs help or a decision.", "Done": "Finished.", "Waiting on": "It can't start until this other task is done.", "Changes": "Something here was changed.", "Kept": "Left as it was." },
  parts: { "Needs mentor OK": "Over the limit or new; a mentor must approve it.", "To order": "Approved; a mentor will order it with its vendor.", "Ordered": "On its way from the vendor.", "Arrived": "Here; it still needs a place on a shelf.", "Put away": "Here and on its shelf.", "Denied": "A mentor said no; the request shows why.", "Cancelled": "Withdrawn before it was ordered.", "Low": "At or under its minimum; time to reorder.", "Place today": "Order today to have it by the date needed.", "Blocking": "Work is stopped until this part comes.", "High": "Needed soon.", "Exempt": "The vendor doesn't charge us sales tax.", "Taxed": "The vendor charges sales tax." },
  calendar: { "Here": "Signed in at the door now.", "Planned": "Said they are coming today.", "Can't come": "Said they can't come.", "No answer": "Hasn't said yet whether they are coming.", "Covered": "Enough families are bringing snacks.", "Missed sign-out": "Didn't sign out; hours need a fix.", "Adjusted": "A mentor changed these hours.", "Up to date": "Phone calendars have the latest changes." },
  skills: { "Ready": "You can start this skill now.", "Available": "Open to start.", "In progress": "Started but not signed off yet.", "Waiting for a mentor": "You asked for a sign-off; a mentor will check it.", "Waiting for sign-off": "Asked for a sign-off; a mentor will check it.", "Complete": "Signed off.", "Done": "Signed off.", "Locked": "Finish the level before it first.", "Needed": "Must be done before this one.", "Add": "Will be added when you save.", "Edit": "Will be changed when you save." },
  compete: { "Published": "Everyone can see this schedule.", "Draft": "Only mentors can see it until it is published.", "Late": "Came in after the match started.", "In use": "Shown to scouts now.", "Hidden": "Not shown to scouts.", "Checked": "Done for this match.", "Not checked": "Still to do before the match.", "new": "Just reported; nobody is on it yet.", "resolved": "Fixed.", "open": "Someone is working on it." }
};
STATUS.schedule = STATUS.pit = STATUS.scouting = STATUS.monitor = STATUS.compete;
var PATTERNS = [[/^\d+ of \d+ checked$/, "How much of this match's checklist is done."], [/^\d+ of \d+ checked in$/, "Lines of this order checked in so far."], [/^Matches .* within \d+%$/, "How close your numbers are to this common size."]];
function statusTip(route, word) {
  var app = route === "here" || route === "snacks" ? "calendar" : route;
  if (STATUS[app] && STATUS[app][word]) return STATUS[app][word];
  for (var k in STATUS) if (STATUS[k][word]) return STATUS[k][word];
  for (var i = 0; i < PATTERNS.length; i++) if (PATTERNS[i][0].test(word)) return PATTERNS[i][1];
  return "";
}
D.after.push(function () {
  document.querySelectorAll(".pill:not([data-tip])").forEach(function (p) { var t = statusTip(D.S.route, p.textContent.trim()); if (t) p.setAttribute("data-tip", t); });
});

/* ---------- The tip itself ---------- */
var tip = null, anchor = null, timer = null, oldDesc = null, pointerAt = 0;
function box() {
  if (!tip) { tip = document.createElement("div"); tip.id = "dtip"; tip.className = "tip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
  return tip;
}
function place() {
  var r = anchor.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight, w = tip.offsetWidth, h = tip.offsetHeight, gap = 6;
  var top = r.top - h - gap; if (top < 4) top = r.bottom + gap; if (top + h > vh - 4) top = Math.max(4, vh - h - 4);
  var left = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
  tip.style.top = Math.round(top) + "px"; tip.style.left = Math.round(left) + "px";
}
function show(a) {
  var text = a.getAttribute("data-tip"); if (!text || !document.contains(a)) return;
  hide(); anchor = a; shownAt = Date.now(); var t = box(); t.textContent = text; t.classList.add("on"); place();
  oldDesc = a.getAttribute("aria-describedby"); a.setAttribute("aria-describedby", (oldDesc ? oldDesc + " " : "") + "dtip");
}
function hide() {
  clearTimeout(timer); timer = null;
  if (anchor) { if (oldDesc) anchor.setAttribute("aria-describedby", oldDesc); else anchor.removeAttribute("aria-describedby"); }
  anchor = null; oldDesc = null; if (tip) tip.classList.remove("on");
}
D.hideTip = hide;
document.addEventListener("pointerover", function (e) {
  if (e.pointerType !== "mouse") return; // never from touch or a pen
  var a = e.target.closest && e.target.closest("[data-tip]"); if (!a || a === anchor) return;
  hide(); timer = setTimeout(function () { show(a); }, 500);
});
document.addEventListener("pointerout", function (e) {
  var a = e.target.closest && e.target.closest("[data-tip]"); if (!a) return;
  if (e.relatedTarget && a.contains(e.relatedTarget)) return;
  hide();
});
document.addEventListener("pointerdown", function () { pointerAt = Date.now(); hide(); }, true);
document.addEventListener("click", hide, true);
document.addEventListener("focusin", function (e) {
  var a = e.target; if (!a.getAttribute || !a.getAttribute("data-tip")) return;
  // At once on keyboard focus only: not when a tap or a click put the focus there.
  if (Date.now() - pointerAt < 800) return;
  try { if (!a.matches(":focus-visible")) return; } catch (err) {}
  show(a);
});
document.addEventListener("focusout", function (e) { if (e.target === anchor) hide(); });
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && anchor) { hide(); e.stopImmediatePropagation(); e.preventDefault(); }
}, true);
var shownAt = 0;
// Focusing something off screen scrolls it into view just after the tip shows; keep the tip with it then.
window.addEventListener("scroll", function () { if (anchor && Date.now() - shownAt < 300) place(); else hide(); }, true);
window.addEventListener("resize", hide);
D.after.push(function () { if (anchor && !document.contains(anchor)) hide(); });
})();
