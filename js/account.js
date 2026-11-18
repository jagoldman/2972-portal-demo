/* Account service: profile, theme, mode, tour, then notification settings per app and per kind (one dropdown each). */
(function () {
"use strict";
var esc = D.esc;
var APPS = ["tasks", "calendar", "parts", "skills", "schedule", "pit", "scouting"];
var KINDS = [["done", "Something you asked for happened", "Your part arrived, you were signed off, your request was approved"], ["act", "You need to do something", "A sign-off is waiting, are you coming Thursday?, your shift starts in 10 minutes"], ["fyi", "News for many people", "A new schedule is published, an event was added"]];
D.inits.push(function (S) {
  var dflt = { done: { discord: true, email: false }, act: { discord: true, email: true }, fyi: { discord: false, email: false } }, prefs = {};
  APPS.forEach(function (id) { prefs[id] = {}; KINDS.forEach(function (k) { prefs[id][k[0]] = { discord: dflt[k[0]].discord, email: dflt[k[0]].email }; }); });
  S.account = { prefs: prefs, open: {}, discord: false, quiet: true };
});
/* One choice per kind; the bell is always on. Values map onto the stored {discord, email}. */
var CHOICES = [["bell", "Bell only", false, false], ["email", "Bell and email", false, true], ["discord", "Bell and Discord", true, false], ["both", "Bell, Discord and email", true, true]];
function choiceOf(p, linked) { var d = p.discord && linked; return CHOICES.filter(function (c) { return c[2] === d && c[3] === p.email; })[0]; }
function appSummary(ap, linked) { var names = KINDS.map(function (k) { return choiceOf(ap[k[0]], linked)[1]; }); if (names.every(function (n) { return n === names[0]; })) return names[0]; if (!D.ground()) return "Mixed";
  /* Ground up counts the kinds that also go to Discord and to email (hill climb r3: a sentence that named the
     channels repeated on every row and said little). The bell is always on, so it is not counted. A channel that
     every kind uses comes first, as "for all". */
  var n = KINDS.length, d = 0, e = 0;
  KINDS.forEach(function (k) { var c = choiceOf(ap[k[0]], linked); if (c[2]) d++; if (c[3]) e++; });
  var parts = [["Discord", d], ["email", e]].filter(function (x) { return x[1] > 0; }).sort(function (a, b) { return (b[1] === n) - (a[1] === n); });
  // When exactly one kind also goes to a channel, the summary names that kind; a count alone said too little.
  var SHORT = { done: "what you asked for", act: "when you need to act", fyi: "news for everyone" };
  var one = [["Discord", 2], ["Email", 3]].map(function (ch) { var ks = KINDS.filter(function (k) { return choiceOf(ap[k[0]], linked)[ch[1]]; }); return ks.length === 1 ? ch[0] + ": " + SHORT[ks[0][0]] : ks.length === n ? ch[0] + ": everything" : ks.length ? ch[0] + ": " + ks.length + " of " + n + " kinds" : ""; }).filter(Boolean);
  if (one.length) return one.join(", ");
  var text = parts.map(function (x, i) { return x[0] + " for " + (x[1] === n ? "all" : x[1] + (i === parts.length - 1 ? " of " + n + " kinds" : "")); }).join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1); }
function Acc() { return D.S.account; }
D.views.account = function () {
  var a = Acc(), apps = APPS.filter(function (id) { return D.inGroup(id); });
  var me = D.me(), theme = document.documentElement.getAttribute("data-theme") || "";
  var sw = function (act, attrs, label, on) { return '<button class="toggle" data-act="' + act + '"' + attrs + ' aria-pressed="' + on + '" aria-label="' + esc(label) + '"></button>'; };
  var profile = '<section class="card"><h2>Profile</h2><div class="row nowrap"><span class="badge-2972 accav">' + esc(me.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2)) + '</span><div><b>' + esc(me.name) + '</b><p class="who">' + esc(me.label) + "</p></div></div>" +
    '<div class="list"><div class="li"><span class="grow"><b>Discord</b><br><span class="who">' + (a.discord ? "Linked as @sam.builds" : "Not linked") + '</span></span><button class="btn sm" data-act="acdiscord">' + (a.discord ? "Unlink" : "Link Discord") + "</button></div>" +
    '<div class="li"><span class="grow"><b>Email</b><br><span class="who">Notices go to the email on your account.</span></span></div>' +
    '<div class="li"><span class="grow"><b>Quiet hours</b><br><span class="who">No Discord or email from 9 pm to 7 am.</span></span>' + sw("acquiet", "", "Quiet hours", a.quiet) + "</div></div></section>";
  // Ground up: when every app has the same setting, it is said once under the heading and not on every row.
  var sums = D.ground() ? apps.map(function (id) { return appSummary(a.prefs[id], a.discord); }) : [], same = sums.length && sums.every(function (x) { return x === sums[0]; }) ? sums[0] : "";
  var notes = '<section class="card"><h2>Notifications</h2><p class="small mute">The bell always shows everything. Choose what also goes to Discord and email.</p>' + (same ? '<p class="nsame">Every app is set the same: ' + esc(same.charAt(0).toLowerCase() + same.slice(1).replace(": ", " ")) + ". Open one to change it.</p>" : "") + '<div class="napps' + (same ? " allsame" : "") + '">' +
    apps.map(function (id) {
      var ap = a.prefs[id], name = D.APPNAME[id];
      return '<details class="napp" data-app="' + id + '"' + (a.open[id] ? " open" : "") + '><summary><b>' + esc(name) + '</b><span class="who">' + appSummary(ap, a.discord) + '</span><span class="nchev" aria-hidden="true">' + D.ic("chevron", 16) + "</span></summary><div class=\"nlist\">" +
        KINDS.map(function (k) {
          var cur = choiceOf(ap[k[0]], a.discord)[0], sid = "n-" + id + "-" + k[0];
          return '<div class="nkind"><div><label for="' + sid + '"><b>' + k[1] + '</b></label><p class="who">' + k[2] + '</p></div><select id="' + sid + '" class="inp nsel" data-change="acnote" data-app="' + id + '" data-k="' + k[0] + '" aria-label="' + esc(k[1] + " in " + name) + '">' +
            CHOICES.map(function (c) { var off = c[2] && !a.discord; return '<option value="' + c[0] + '"' + (c[0] === cur ? " selected" : "") + (off ? " disabled" : "") + ">" + c[1] + (off ? " (Discord not linked)" : "") + "</option>"; }).join("") + "</select></div>";
        }).join("") + "</div></details>";
    }).join("") + "</div></section>";
  var look = '<section class="card"><h2>Appearance</h2><span class="seg" role="group" aria-label="Theme">' + [["light", "Light"], ["dark", "Dark"], ["", "Match my device"]].map(function (t) { return '<button data-act="actheme" data-v="' + t[0] + '" aria-pressed="' + (theme === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</span></section>";
  var mode = '<section class="card"><h2>Build or Competition mode</h2><p class="small mute">Changes which apps show on Home and in the Apps menu.</p><div class="choice"><button data-act="mode" data-v="build" aria-pressed="' + (D.S.mode === "build") + '">' + (D.ground() ? "Build" : "Build mode") + '</button><button data-act="mode" data-v="competition" aria-pressed="' + (D.S.mode === "competition") + '">' + (D.ground() ? "Competition" : "Competition mode") + "</button></div></section>";
  var guide = D.GUIDE && D.GUIDE[D.S.role] ? '<section class="card"><h2>Guided tour</h2><p class="mute">A few short steps on Home that show where to start.</p><div><button class="btn" data-act="guidereplay">Start the tour again</button></div></section>' : "";
  var signin = '<section class="card"><h2>Sign-in</h2><p class="mute">You sign in with the team sign-in. Change your password there.</p></section>';
  return '<div class="content"><div class="acc"><h1>Account</h1>' + profile + look + mode + guide + notes + signin + "</div></div>";
};
var A = D.acts;
A.acdiscord = function () { var a = Acc(); a.discord = !a.discord; D.toast(a.discord ? "Discord linked." : "Discord unlinked."); D.render(); };
A.acquiet = function () { Acc().quiet = !Acc().quiet; D.render(); };
D.changes.acnote = function (el) { var c = CHOICES.filter(function (x) { return x[0] === el.value; })[0], p = Acc().prefs[el.dataset.app][el.dataset.k]; p.discord = c[2]; p.email = c[3]; D.render(); var n = document.getElementById(el.id); if (n) n.focus(); };
/* Remember which app sections are open so a re-render keeps them open ("toggle" does not bubble, so listen in capture). */
document.addEventListener("toggle", function (e) { var t = e.target; if (t.classList && t.classList.contains("napp") && D.S.account) D.S.account.open[t.dataset.app] = t.open; }, true);
A.actheme = function (b) { if (b.dataset.v) document.documentElement.setAttribute("data-theme", b.dataset.v); else document.documentElement.removeAttribute("data-theme"); D.render(); };
})();
