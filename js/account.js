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
  var a = Acc(), apps = ["tasks", "calendar", "here", "parts", "skills", "schedule", "pit", "scouting"].filter(function (id) { return D.inGroup(id); });
  if (D.S.role === "parent") apps = ["tasks", "calendar", "snacks"];
  return D.topbar("Account", "account.2972robotics.com", "", "") + '<div class="content"><div class="grid2"><div class="card"><div class="row nowrap"><span class="badge-2972" style="width:48px;height:48px;font-size:1rem">' + esc(D.me().name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2)) + '</span><div><h2>' + esc(D.me().name) + '</h2><p class="who">' + esc(D.me().label) + " · signed in with Authentik</p></div></div>" +
    '<div class="li"><span class="grow"><b>Discord</b><br><span class="who">' + (a.discord ? "Linked as @sam.builds. Direct messages come from Gearbot 2972." : "Not linked. Link it to get direct messages.") + '</span></span><button class="btn sm" data-act="acdiscord">' + (a.discord ? "Unlink" : "Link Discord") + "</button></div>" +
    '<div class="li"><span class="grow"><b>Email</b><br><span class="who">Sent to the address on your account. The apps never store it.</span></span></div>' +
    '<div class="li"><span class="grow"><b>Quiet hours</b><br><span class="who">No Discord or email 9 pm – 7 am. The bell still collects them.</span></span><button class="toggle" data-act="acquiet" aria-pressed="' + a.quiet + '" aria-label="Quiet hours"></button></div></div>' +
    '<div class="card"><h2>Portal mode</h2><p class="small mute">Which apps your Apps menu and portal home show. It only changes what you see; it never changes who can open what.</p><div class="choice"><button data-act="mode" data-v="build" aria-pressed="' + (D.S.mode === "build") + '">Build season</button><button data-act="mode" data-v="competition" aria-pressed="' + (D.S.mode === "competition") + '">Competition</button></div><p class="small mute">' + (D.S.mode === "competition" ? "Showing Schedule, Pit, Scouting, Calendar, Who's in, Parts and Task App." : "Showing the build-season apps. On event days the portal offers a one-tap switch.") + '</p><h2>Theme</h2><p class="small mute">Shared across every 2972 app.</p><span class="seg" role="group" aria-label="Theme" style="justify-self:start">' + [["light", "Light"], ["dark", "Dark"], ["", "Match my device"]].map(function (t) { return '<button data-act="actheme" data-v="' + t[0] + '" aria-pressed="' + ((document.documentElement.getAttribute("data-theme") || "") === t[0]) + '">' + t[1] + "</button>"; }).join("") + '</span><h3>Password and sign-in</h3><p class="small mute">Managed by the team sign-in (Authentik). Change your password there.</p></div></div>' +
    '<div class="card"><h2>Notifications</h2><p class="small mute">One setting for every app. The bell always shows everything.</p><div class="tablewrap"><table class="ntable"><thead><tr><th>Kind</th><th>Bell</th><th>Discord</th><th>Email</th></tr></thead><tbody>' +
    KINDS.map(function (k) { var p = a.prefs[k[0]]; return '<tr><td class="wrap"><b>' + k[1] + '</b><br><span class="who">' + k[2] + '</span></td><td class="who" data-l="Bell">Always</td>' + ["discord", "email"].map(function (c) { var l = c === "discord" ? "Discord" : "Email"; return c === "discord" && !a.discord ? '<td class="who" data-l="' + l + '">Not linked</td>' : '<td data-l="' + l + '"><button class="toggle" data-act="acpref" data-k="' + k[0] + '" data-c="' + c + '" aria-pressed="' + p[c] + '" aria-label="' + c + " for " + k[1] + '"></button></td>'; }).join("") + "</tr>"; }).join("") +
    '</tbody></table></div><p class="small mute">At most one Discord message and one email per app every 10 minutes; extras are bundled into one.</p></div>' +
    '<div class="card"><h2>Per app</h2><p class="small mute">Mute an app to keep its notices in the bell only.</p><div class="list">' + apps.map(function (id) { var muted = !!a.muted[id]; return '<div class="li"><span class="grow"><b>' + esc(D.APPNAME[id]) + '</b></span><span class="who">' + (muted ? "Bell only" : "Follows the settings above") + '</span><button class="toggle" data-act="acmute" data-v="' + id + '" aria-pressed="' + !muted + '" aria-label="Send ' + esc(D.APPNAME[id]) + ' notices to Discord and email"></button></div>'; }).join("") + "</div></div></div>";
};
var A = D.acts;
A.acdiscord = function () { var a = Acc(); a.discord = !a.discord; D.toast(a.discord ? "Discord linked." : "Discord unlinked."); D.render(); };
A.acquiet = function () { Acc().quiet = !Acc().quiet; D.render(); };
A.acpref = function (b) { var p = Acc().prefs[b.dataset.k]; p[b.dataset.c] = !p[b.dataset.c]; D.render(); };
A.acmute = function (b) { var m = Acc().muted; m[b.dataset.v] = !m[b.dataset.v]; D.render(); };
A.actheme = function (b) { if (b.dataset.v) document.documentElement.setAttribute("data-theme", b.dataset.v); else document.documentElement.removeAttribute("data-theme"); D.render(); };
})();
