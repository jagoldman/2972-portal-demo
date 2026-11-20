/* Admin, in the demo (Ground up only; owner, 2026-11-19, D215): people waiting to be let in, and join links and QR
   codes that carry a role. Decided by the owner: a link fills in the role, and an admin still lets each person in
   with one press, so a leaked or photographed code gives nobody access. Live and Baseline keep Admin as a link-out
   tile (D.isExt in js/core.js). Two tabs: Requests (the screen an admin opens most) and Join links. */
(function () {
"use strict";
var esc = D.esc, A = D.acts;
// [the group's name, "as a …", the role's name]
var ROLE = { student: ["Students", "a student", "Student"], parent: ["Parents", "a parent", "Parent"], mentor: ["Mentors", "a mentor", "Mentor"] };
var ROLES = ["student", "parent", "mentor"];
var SEASON_END = "2027-04-17"; // made up: the last day of the season, for "Until the season ends"
var HOST = "2972robotics.com/join/";
if (D.TABTIP) D.TABTIP.admin = { requests: "People who asked to join and wait for you to let them in.", links: "Links and QR codes that fill in a role for new people." };
function today() { return (D.calApi && D.calApi.TODAYS) || "2026-11-10"; }
function parse(s) { var q = s.split("-"); return new Date(+q[0], +q[1] - 1, +q[2]); }
function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function short(s) { return parse(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function addDays(s, n) { var d = parse(s); return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }

/* Sample data: made-up people (family of the demo's made-up students) and made-up links. */
D.inits.push(function (S) {
  S.admin = {
    links: [
      { id: "L1", role: "parent", name: "Fall open house", code: "P7K2QX", ends: "2026-12-19", used: 4, on: true },
      { id: "L2", role: "student", name: "Freshman sign-ups", code: "S3M8RA", ends: "2026-12-10", used: 6, on: true },
      { id: "L3", role: "mentor", name: "Engineering night", code: "M5T9WD", ends: "2026-11-24", used: 1, on: false },
      { id: "L4", role: "parent", name: "Summer camp families", code: "P2H6LC", ends: "2026-09-30", used: 9, on: true }
    ],
    // Oldest first, so nobody waits longest.
    reqs: [
      { id: 1, name: "Casey Gold", link: "L3", role: "mentor", when: "Sunday, 6:30 pm" },
      { id: 2, name: "Robin Lee", link: null, role: null, when: "Monday, 4:40 pm" },
      { id: 3, name: "Morgan Park", link: "L1", role: "parent", when: "Yesterday, 7:12 pm" },
      { id: 4, name: "Eli Haddad", link: "L2", role: "student", when: "Today, 8:05 am" }
    ],
    next: 5, menu: null, back: null
  };
});
function AD() { return D.S.admin; }
function link(id) { return AD().links.filter(function (l) { return l.id === id; })[0]; }
function state(l) { return l.ends < today() ? "ended" : l.on ? "on" : "off"; }
function endsText(l) {
  if (state(l) === "ended") return "Ended " + short(l.ends);
  var p = D.practicesText(l.ends);
  return "Ends " + short(l.ends) + (p ? ", " + p : "");
}
function usedText(n) { return n ? n + (n === 1 ? " person has" : " people have") + " used it" : "Nobody has used it yet"; }
function roleTag(r) { return '<span class="adrole"><i class="addot r-' + r + '" aria-hidden="true"></i>' + ROLE[r][0] + "</span>"; }

/* ---------- The screen ---------- */
D.views.admin = function () {
  var tab = D.tab("admin", "requests"), n = AD().reqs.length;
  var right = tab === "links" ? '<button class="btn primary" data-act="adnew" data-tip="Make a link and a code that fill in a role.">' + D.ic("plus", 16) + "<span>New join link</span></button>" : "";
  return D.topbar("Admin", "", D.tabsFor("admin", [["requests", "Requests", n ? String(n) : ""], ["links", "Join links"]]), right) +
    '<div class="content adm">' + (tab === "links" ? linksTab() : reqsTab()) + "</div>";
};
function reqsTab() {
  var rs = AD().reqs;
  if (!rs.length) return '<section class="adsec"><h1 class="adh">Requests</h1><p class="mute">Nobody is waiting to be let in.</p></section>';
  // One filled button on the screen: the first request's "Let in". The others are plain buttons with the same words.
  var firstReady = rs.filter(function (r) { return r.role; })[0];
  return '<section class="adsec"><h1 class="adh">Waiting to be let in</h1><p class="adlede">Each person signed in with Google and asked to join. Nobody gets in until you let them in.</p><div class="adlist">' + rs.map(function (r) {
    var l = r.link ? link(r.link) : null, menuOpen = AD().menu === r.id;
    var line = l ? "Asked with the " + ROLE[l.role][0] + " link, " + l.name + "." : "Asked without a link.";
    var acts = r.role ?
      '<button class="btn' + (r === firstReady ? " primary" : "") + '" id="ad-in-' + r.id + '" data-act="adin" data-v="' + r.id + '">Let in as ' + ROLE[r.role][1] + "</button>" + roleMenu(r, "Change role", menuOpen) :
      roleMenu(r, "Choose a role", menuOpen);
    return '<div class="adreq"><div class="adr-main"><b>' + esc(r.name) + '</b><span class="adr-line">' + esc(line) + " " + esc(r.when) + ".</span>" +
      (r.role === "mentor" ? '<span class="adr-line adr-warn">Mentors can see students\' information.</span>' : "") + "</div>" +
      '<div class="adr-acts">' + acts + '<button class="btn ghost" data-act="addeny" data-v="' + r.id + '">Turn down</button></div></div>';
  }).join("") + "</div></section>";
}
// "Change role" (or "Choose a role"): a small menu of the three roles, under its button.
function roleMenu(r, label, open) {
  return '<span class="admwrap"><button class="btn" id="ad-role-' + r.id + '" data-act="admenu" data-v="' + r.id + '" aria-haspopup="menu" aria-expanded="' + open + '">' + label + D.ic("chevron", 14) + "</button>" +
    (open ? '<span class="admenu" role="menu" aria-label="' + label + '">' + ROLES.map(function (k) { return '<button role="menuitemradio" aria-checked="' + (r.role === k) + '" data-act="adrole" data-v="' + r.id + '" data-r="' + k + '"><span class="adchk" aria-hidden="true">' + (r.role === k ? D.ic("check", 14) : "") + "</span>" + ROLE[k][2] + "</button>"; }).join("") + "</span>" : "") + "</span>";
}
function linksTab() {
  var ls = AD().links;
  return '<section class="adsec"><h1 class="adh">Join links</h1><p class="adlede">A join link, or its QR code, fills in the role. You still let each person in, so a code that gets passed around lets nobody in by itself.</p><div class="adlist">' + ls.map(function (l) {
    var st = state(l);
    var acts = st === "ended" ? '<button class="btn" data-act="adagain" data-v="' + l.id + '">Make a new one like it</button><button class="linkbtn adsee" data-act="adjoin" data-v="' + l.id + '">See what a new person sees</button>' :
      '<button class="btn" data-act="adcode" data-v="' + l.id + '">Show code</button><button class="btn ghost" data-act="adflip" data-v="' + l.id + '">' + (l.on ? "Switch off" : "Switch on") + "</button>";
    return '<div class="adlink' + (st !== "on" ? " dim" : "") + '"><div class="adl-main"><div class="adl-top">' + roleTag(l.role) + '<b class="adl-name">' + esc(l.name) + "</b></div>" +
      '<span class="adl-meta">' + esc(endsText(l)) + ". " + esc(usedText(l.used)) + ".</span></div>" +
      '<span class="adstate s-' + st + '"><i aria-hidden="true"></i>' + (st === "on" ? "On" : st === "off" ? "Off" : "Ended") + "</span>" +
      '<div class="adl-acts">' + acts + "</div></div>";
  }).join("") + "</div></section>";
}

/* ---------- Requests: let in, change the role, turn down. Each acts at once, with Undo. ---------- */
function focusSoon(sel) { var el = document.querySelector(sel); if (el) el.focus(); }
function req(id) { return AD().reqs.filter(function (r) { return r.id === +id; })[0]; }
A.adin = function (b) {
  var rs = AD().reqs, r = req(b.dataset.v), i = rs.indexOf(r); if (!r || !r.role) return;
  AD().menu = null;
  D.withUndo(r.name + " is in, as " + ROLE[r.role][1] + ".", function () { rs.splice(i, 1); D.log("let in " + r.name + " as " + ROLE[r.role][1], "admin"); }, function () { rs.splice(i, 0, r); D.S.activity.shift(); });
  focusSoon(".adreq .btn.primary, .adreq .btn");
};
A.addeny = function (b) {
  var rs = AD().reqs, r = req(b.dataset.v), i = rs.indexOf(r); if (!r) return;
  AD().menu = null;
  D.withUndo("Turned down " + r.name + ".", function () { rs.splice(i, 1); }, function () { rs.splice(i, 0, r); });
  focusSoon(".adreq .btn.primary, .adreq .btn");
};
A.admenu = function (b) { var ad = AD(), id = +b.dataset.v; ad.menu = ad.menu === id ? null : id; D.render(); focusSoon(ad.menu ? '.admenu [aria-checked="true"], .admenu button' : "#ad-role-" + id); };
A.adrole = function (b) { var r = req(b.dataset.v); r.role = b.dataset.r; AD().menu = null; D.render(); focusSoon("#ad-in-" + r.id); };
function closeMenu(back) { var id = AD().menu; AD().menu = null; D.render(); if (back) focusSoon("#ad-role-" + id); }
document.addEventListener("keydown", function (e) {
  var ad = D.S && D.S.admin; if (!ad || ad.menu == null || D.S.route !== "admin") return;
  if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeMenu(true); return; }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    var items = Array.prototype.slice.call(document.querySelectorAll(".admenu button")), i = items.indexOf(document.activeElement);
    if (!items.length) return; e.preventDefault();
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
  }
}, true);
document.addEventListener("click", function (e) { var ad = D.S && D.S.admin; if (!ad || ad.menu == null || !e.target.isConnected || e.target.closest(".admwrap")) return; closeMenu(false); });

/* ---------- Join links ---------- */
A.adflip = function (b) {
  var l = link(b.dataset.v), was = l.on;
  D.withUndo(was ? "Switched off. Anyone who opens it is told it no longer works." : "Switched on. The link and its code work again.", function () { l.on = !was; }, function () { l.on = was; });
  focusSoon('[data-act="adflip"][data-v="' + l.id + '"]');
};
function remember(b) { AD().back = b.getAttribute("data-act") ? '[data-act="' + b.getAttribute("data-act") + '"][data-v="' + b.dataset.v + '"]' : null; }
A.adcode = function (b) { remember(b); D.openModal("adcode", { id: b.dataset.v, focus: true }); };
A.adjoin = function (b) { if (!(D.S.modal && D.S.modal.type === "adcode")) remember(b); D.openModal("adjoin", { id: b.dataset.v, done: false, focus: true }); };
A.adnew = function (b) { remember(b); D.openModal("adnew", { role: null, name: "", last: "30", focus: true }); };
A.adagain = function (b) { remember(b); var l = link(b.dataset.v); D.openModal("adnew", { role: l.role, name: l.name, last: "30", focus: true }); };
// A dialog takes the focus when it opens; when it closes, the focus goes back to the button that opened it.
D.after.push(function () {
  var ad = D.S && D.S.admin; if (!ad || D.S.route !== "admin") return;
  var m = D.S.modal;
  if (m && /^ad/.test(m.type)) { if (m.data.focus) { m.data.focus = false; var f = document.querySelector(m.type === "adnew" ? ".modal #adn-role-student" : ".modal"); if (f) { if (f.classList.contains("modal")) f.setAttribute("tabindex", "-1"); f.focus(); } } return; }
  if (!m && ad.back) { var sel = ad.back; ad.back = null; focusSoon(sel); }
});

/* New join link: the role (required), a name, how long it lasts (30 days chosen). One link per press. */
var LASTS = [["7", "7 days"], ["30", "30 days"], ["season", "Until the season ends"]];
D.modals.adnew = function (d) {
  return D.modalHead("New join link") + '<div class="adform">' +
    '<fieldset class="adfs"><legend>Who it is for</legend><div class="adchoice" role="radiogroup"' + (d.err ? ' aria-describedby="adn-err"' : "") + ">" + ROLES.map(function (k) {
      return '<label class="adopt' + (d.role === k ? " on" : "") + '" for="adn-role-' + k + '"><input type="radio" name="adn-role" id="adn-role-' + k + '" data-change="adnrole" value="' + k + '"' + (d.role === k ? " checked" : "") + (d.err ? ' aria-invalid="true"' : "") + "><i class=\"addot r-" + k + '" aria-hidden="true"></i>' + ROLE[k][0] + "</label>";
    }).join("") + "</div>" + (d.err ? '<p class="ferr" id="adn-err">' + esc(d.err) + "</p>" : "") +
    (d.role === "mentor" ? '<p class="adwarn">Mentors can see students\' information: share this link only with people you know.</p>' : "") + "</fieldset>" +
    '<div class="field"><label for="adn-name">Name</label><input id="adn-name" data-input="adnname" placeholder="Fall open house" value="' + esc(d.name) + '" aria-describedby="adn-name-help"><p class="small mute" id="adn-name-help">Only admins see the name. It says where you shared the link.</p></div>' +
    '<fieldset class="adfs"><legend>How long it lasts</legend><div class="adchoice">' + LASTS.map(function (o) {
      return '<label class="adopt' + (d.last === o[0] ? " on" : "") + '" for="adn-last-' + o[0] + '"><input type="radio" name="adn-last" id="adn-last-' + o[0] + '" data-change="adnlast" value="' + o[0] + '"' + (d.last === o[0] ? " checked" : "") + ">" + o[1] + "</label>";
    }).join("") + "</div></fieldset></div>" +
    '<div class="row adacts"><button class="btn primary" data-act="adcreate">Create</button><button class="btn" data-act="closemodal">Cancel</button></div>';
};
D.changes.adnrole = function (el) { var d = D.S.modal.data; d.role = el.value; d.err = null; D.render(); focusSoon("#adn-role-" + el.value); };
D.changes.adnlast = function (el) { D.S.modal.data.last = el.value; D.render(); focusSoon("#adn-last-" + el.value); };
D.inputs.adnname = function (el) { D.S.modal.data.name = el.value; };
A.adcreate = function () {
  var d = D.S.modal.data, ad = AD();
  if (!d.role) { d.err = "Choose who the link is for."; D.render(); focusSoon("#adn-role-student"); return; }
  var ends = d.last === "7" ? addDays(today(), 7) : d.last === "season" ? SEASON_END : addDays(today(), 30);
  var abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", code = ROLE[d.role][2].charAt(0);
  for (var i = 0; i < 5; i++) code += abc.charAt((ad.next * 7 + i * 13 + d.role.length) % abc.length);
  var l = { id: "L" + ad.next++, role: d.role, name: (d.name || "").trim() || ROLE[d.role][0] + " link, " + short(today()), code: code, ends: ends, used: 0, on: true };
  ad.links.unshift(l); D.S.modal = null; ad.back = '[data-act="adcode"][data-v="' + l.id + '"]';
  D.log("made the " + ROLE[l.role][0] + " join link “" + l.name + "”", "admin");
  D.toast("Made the " + ROLE[l.role][0] + " link “" + l.name + "”.", null, { label: "Show code", go: function () { D.openModal("adcode", { id: l.id, focus: true }); } });
  D.render();
};

/* Show code: a sheet made to be shown on a screen or printed. */
/* The QR code here is a DRAWN SAMPLE PATTERN, not a real code: a phone camera will not read it. It has what makes a QR
   code look like one at a glance (the three corner squares, the timing lines, one small alignment square and a field
   of modules, 29 x 29 like a version 3 code), drawn from the link's short code so each link looks different. The real
   Admin app makes a real QR code of the link. It is one SVG path with crisp edges, so it stays sharp when printed. */
function qrSample(seed) {
  var N = 29, m = [], i, j, h = 2166136261;
  for (i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  function rnd() { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; }
  for (i = 0; i < N; i++) { m.push([]); for (j = 0; j < N; j++) m[i].push(null); }
  function finder(r, c) { for (var y = -1; y <= 7; y++) for (var x = -1; x <= 7; x++) { var rr = r + y, cc = c + x; if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue; var edge = y === 0 || y === 6 || x === 0 || x === 6, core = y >= 2 && y <= 4 && x >= 2 && x <= 4; m[rr][cc] = y >= 0 && y <= 6 && x >= 0 && x <= 6 && (edge || core); } }
  finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
  for (i = 8; i < N - 8; i++) { m[6][i] = i % 2 === 0; m[i][6] = i % 2 === 0; }
  for (var y = -2; y <= 2; y++) for (var x = -2; x <= 2; x++) m[22 + y][22 + x] = Math.max(Math.abs(x), Math.abs(y)) !== 1;
  m[N - 8][8] = true;
  for (i = 0; i < N; i++) for (j = 0; j < N; j++) if (m[i][j] === null) m[i][j] = rnd() < 0.5;
  var d = "";
  for (i = 0; i < N; i++) for (j = 0; j < N; j++) if (m[i][j]) d += "M" + (j + 4) + " " + (i + 4) + "h1v1h-1z";
  return '<svg class="adqr" viewBox="0 0 37 37" shape-rendering="crispEdges" role="img" aria-label="QR code for the join link (a drawn sample in this demo)"><rect width="37" height="37" fill="#fff"/><path fill="#000" d="' + d + '"/></svg>';
}
D.modals.adcode = function (d) {
  var l = link(d.id), st = state(l);
  return D.modalHead("Join code") + '<div class="adsheet">' + qrSample(l.code) +
    '<h2 class="adjtitle">Join Team 2972 as ' + ROLE[l.role][1] + "</h2>" +
    '<p class="adaddr">' + HOST + esc(l.code) + "</p>" +
    '<p class="adrule">This fills in the role. An admin still lets each person in.</p>' +
    (l.role === "mentor" ? '<p class="adwarn">Mentors can see students\' information: share this link only with people you know.</p>' : "") +
    (st === "off" ? '<p class="adwarn">This link is switched off. Anyone who opens it is told it no longer works.</p>' : "") +
    '<p class="adfor small mute">' + esc(ROLE[l.role][0] + " link, " + l.name + ". " + endsText(l) + ".") + "</p>" +
    '<div class="row adsheetacts"><button class="btn" data-act="adcopy" data-v="' + l.id + '">Copy link</button><button class="btn" data-act="adprint">Print</button></div>' +
    '<button class="linkbtn adsee" data-act="adjoin" data-v="' + l.id + '">See what a new person sees</button></div>';
};
A.adcopy = function (b) {
  var l = link(b.dataset.v), url = "https://" + HOST + l.code;
  try { if (navigator.clipboard) navigator.clipboard.writeText(url).catch(function () {}); } catch (e) {}
  D.toast("Link copied: " + HOST + l.code); D.render(); focusSoon('[data-act="adcopy"]');
};
A.adprint = function () { try { window.print(); } catch (e) {} };

/* What a new person sees when they open the link: the role in words and one button. No name or email is typed in the
   demo. A switched-off or ended link says it no longer works and how to ask for a new one. */
D.modals.adjoin = function (d) {
  var l = link(d.id), works = state(l) === "on";
  var body = !works ? '<h1>This join link no longer works</h1><p>Ask the person who gave it to you for a new one, or ask a mentor at the next practice.</p>' :
    d.done ? '<h1>Thanks.</h1><p>An admin will let you in, usually by the next practice.</p>' :
    '<h1>Join Team 2972 as ' + ROLE[l.role][1] + '</h1><p>Sign in with your Google account to ask to join. ' + (l.role === "student" ? "Use your school account if you have one." : "") + '</p><button class="btn primary adgoogle" data-act="adgoogle">Continue with Google</button>';
  return '<div class="adjoinpg"><div class="adjbar"><span>Preview: what a new person sees at ' + HOST + esc(l.code) + '</span><button class="btn sm xbtn adjclose" data-act="closemodal" aria-label="Close the preview" data-tip="Close the preview.">×</button></div>' +
    '<div class="adjbody"><span class="badge-2972">2972</span><p class="adjteam">Gears &amp; Buccaneers</p>' + body + "</div></div>";
};
A.adgoogle = function () { D.S.modal.data.done = true; D.render(); var m = document.querySelector(".modal"); if (m) { m.setAttribute("tabindex", "-1"); m.focus(); } };
})();
