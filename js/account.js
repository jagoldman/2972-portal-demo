/* Account service: profile, linked chat, theme, one notification setting for every app, per-app mutes. */
(function () {
"use strict";
var esc = D.esc;
var KINDS = [["done", "Something you asked for happened", "Your part arrived, you were signed off, your request was approved"], ["act", "You need to do something", "A sign-off is waiting, are you coming Thursday?, your shift starts in 10 minutes"], ["fyi", "News for many people", "A new schedule is published, an event was added"]];
D.inits.push(function (S) {
  S.account = { prefs: { done: { discord: true, email: false }, act: { discord: true, email: true }, fyi: { discord: false, email: false } }, discord: false, muted: {}, quiet: true };
});
function Acc() { return D.S.account; }
D.views.account = function () {
  var a = Acc(), apps = ["tasks", "calendar", "parts", "skills", "schedule", "pit", "scouting"].filter(function (id) { return D.inGroup(id); });
  var me = D.me(), theme = document.documentElement.getAttribute("data-theme") || "";
  var sw = function (act, attrs, label, on) { return '<button class="toggle" data-act="' + act + '"' + attrs + ' aria-pressed="' + on + '" aria-label="' + esc(label) + '"></button>'; };
  var profile = '<section class="card"><h2>Profile</h2><div class="row nowrap"><span class="badge-2972 accav">' + esc(me.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2)) + '</span><div><b>' + esc(me.name) + '</b><p class="who">' + esc(me.label) + "</p></div></div>" +
    '<div class="list"><div class="li"><span class="grow"><b>Discord</b><br><span class="who">' + (a.discord ? "Linked as @sam.builds" : "Not linked") + '</span></span><button class="btn sm" data-act="acdiscord">' + (a.discord ? "Unlink" : "Link Discord") + "</button></div>" +
    '<div class="li"><span class="grow"><b>Email</b><br><span class="who">Notices go to the email on your account.</span></span></div>' +
    '<div class="li"><span class="grow"><b>Quiet hours</b><br><span class="who">No Discord or email from 9 pm to 7 am.</span></span>' + sw("acquiet", "", "Quiet hours", a.quiet) + "</div></div></section>";
  var notes = '<section class="card"><h2>Notifications</h2><p class="small mute">The bell always shows everything. Choose what also goes to Discord and email.</p><div class="nlist">' +
    KINDS.map(function (k) {
      var p = a.prefs[k[0]];
      return '<div class="nkind"><div><b>' + k[1] + '</b><p class="who">' + k[2] + '</p></div><div class="nsw"><span class="nsw1"><span>Bell</span><span class="who">Always</span></span>' +
        ["discord", "email"].map(function (c) { var l = c === "discord" ? "Discord" : "Email"; return c === "discord" && !a.discord ? '<span class="nsw1"><span>' + l + '</span><span class="who">Not linked</span></span>' : '<span class="nsw1"><span>' + l + "</span>" + sw("acpref", ' data-k="' + k[0] + '" data-c="' + c + '"', l + " for " + k[1], p[c]) + "</span>"; }).join("") + "</div></div>";
    }).join("") + '</div><h3>By app</h3><div class="list">' + apps.map(function (id) { var muted = !!a.muted[id]; return '<div class="li"><span class="grow"><b>' + esc(D.APPNAME[id]) + '</b><br><span class="who">' + (muted ? "Bell only" : (a.discord ? "Bell, Discord and email" : "Bell and email")) + "</span></span>" + sw("acmute", ' data-v="' + id + '"', "Send " + D.APPNAME[id] + " notices to Discord and email", !muted) + "</div>"; }).join("") + "</div></section>";
  var look = '<section class="card"><h2>Appearance</h2><span class="seg" role="group" aria-label="Theme">' + [["light", "Light"], ["dark", "Dark"], ["", "Match my device"]].map(function (t) { return '<button data-act="actheme" data-v="' + t[0] + '" aria-pressed="' + (theme === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</span></section>";
  var mode = '<section class="card"><h2>Build or Competition mode</h2><p class="small mute">Changes which apps show on Home and in the Apps menu.</p><div class="choice"><button data-act="mode" data-v="build" aria-pressed="' + (D.S.mode === "build") + '">Build mode</button><button data-act="mode" data-v="competition" aria-pressed="' + (D.S.mode === "competition") + '">Competition mode</button></div></section>';
  var guide = D.GUIDE && D.GUIDE[D.S.role] ? '<section class="card"><h2>Guided tour</h2><p class="mute">A few short steps on Home that show where to start.</p><div><button class="btn" data-act="guidereplay">Start the tour again</button></div></section>' : "";
  var signin = '<section class="card"><h2>Sign-in</h2><p class="mute">You sign in with the team sign-in. Change your password there.</p></section>';
  return '<div class="content"><div class="acc"><h1>Account</h1>' + profile + notes + look + mode + guide + signin + "</div></div>";
};
var A = D.acts;
A.acdiscord = function () { var a = Acc(); a.discord = !a.discord; D.toast(a.discord ? "Discord linked." : "Discord unlinked."); D.render(); };
A.acquiet = function () { Acc().quiet = !Acc().quiet; D.render(); };
A.acpref = function (b) { var p = Acc().prefs[b.dataset.k]; p[b.dataset.c] = !p[b.dataset.c]; D.render(); };
A.acmute = function (b) { var m = Acc().muted; m[b.dataset.v] = !m[b.dataset.v]; D.render(); };
A.actheme = function (b) { if (b.dataset.v) document.documentElement.setAttribute("data-theme", b.dataset.v); else document.documentElement.removeAttribute("data-theme"); D.render(); };
})();
