/* Kickoff: rules and questions, the scoring table, strategy timelines, criteria matrix and vote, requirements, mechanisms, build-plan export, research assistant and a projector. Mirrors kickoff.2972robotics.com with its made-up "Orbit Orchard" example game. */
(function () {
"use strict";
var esc = D.esc;
var PH = ["auto", "teleop", "endgame"], PHN = { auto: "Auto", teleop: "Teleop", endgame: "Endgame" }, PHC = { auto: "pa", teleop: "pt", endgame: "pe" };
var PRIO = [["must", "Must", "bad"], ["should", "Should", "warn"], ["could", "Could", "info"]];
var MSTAT = { idea: ["Idea", ""], prototyping: ["Prototyping", "info"], chosen: ["Chosen", "ok"], rejected: ["Rejected", "bad"] };
var SSTAT = [["idea", "Ideas"], ["shortlist", "Shortlist"], ["dropped", "Set aside"]];
var SUGKIND = { summary: ["What changed", "info"], section_edit: ["Rule note", "gold"], question_answer: ["Answer", "ok"], requirement_flag: ["Check requirement", "warn"] };
var uid = 0;
function nid(p) { return p + (++uid); }
function r2(n) { return Math.round(n * 100) / 100; }

/* ---------- Sample season (the made-up example game from kickoff's demo seed) ---------- */
function blocks(list) { return list.map(function (x) { return { id: nid("b"), l: x[0], s: x[1], d: x[2], a: x[3] || null, n: x[3] ? (x[4] == null ? 1 : x[4]) : 0 }; }); }
function cyc(from, to, len, score, a) { var out = [], t = from, h = Math.round(len / 2); while (t + len <= to) { out.push(["Load", t, h, null], [score, t + h, len - h, a, 1]); t += len; } return out; }
function teleop(len, score, a) { return cyc(15, 64, len, score, a).concat([["Collect during reset", 64, 6, null]], cyc(70, 130, len, score, a)); }
function sec(title, body, by, when) { return { title: title, body: body, by: by, when: when }; }
function mech(name, desc, pros, cons, status, links) { return { id: nid("m"), name: name, desc: desc, pros: pros, cons: cons, status: status, links: links || [] }; }

function seed(S) {
  var k = S.ko = {
    year: 2026, game: "Orbit Orchard", status: "active", example: true, voteMode: "ranked", view: "cards", draft: null, open: {},
    phases: { auto: 15, teleop: 115, endgame: 20 },
    segments: [
      { name: "Auto", s: 0, e: 15, k: "open" }, { name: "Teleop", s: 15, e: 64, k: "open" }, { name: "Orchard reset: baskets closed", s: 64, e: 70, k: "closed" },
      { name: "Teleop", s: 70, e: 130, k: "open" }, { name: "Endgame: hang or park", s: 130, e: 150, k: "info" }
    ],
    sections: [
      sec("Field", "**Made-up example game, not a real FRC game.**\n\nA 54 ft × 27 ft field with a central *orchard*: three trees, each with a low basket (2 ft) and a high basket (6 ft). Each alliance has a starting zone and a loading station on its own end.", "Ms. Rivera", "Mon"),
      sec("Game pieces", "- **Orbs:** 9 in foam balls, 30 per alliance.\n- Robots may hold at most 2 orbs at a time.\n- Orbs that leave the field are returned at the loading station.", "Sam Ortiz", "Mon"),
      sec("Match flow", "- 15 s autonomous\n- 115 s teleop, with a 6 s orchard reset at 64 s (baskets closed)\n- 20 s endgame (hang from a tree branch or park in the orchard)\n- Scores are final when the buzzer sounds.", "Sam Ortiz", "Mon"),
      sec("Robot limits", "- Frame perimeter at most 120 in\n- Height at most 30 in at the start, 48 in during the match\n- 125 lb without bumpers and battery\n- Extension at most 12 in beyond the frame perimeter", "Mr. Okafor", "Mon"),
      sec("Other", "Penalties: 3 points to the other alliance for a minor foul, 8 for a major foul.\n\nRanking points: win = 2, tie = 1, **Hang RP** when any robot of the alliance hangs at the buzzer.", "Ms. Rivera", "Tue")
    ],
    questions: [
      { text: "Can a robot shoot orbs while touching a tree?", answer: "Yes, but it may not climb the tree before the endgame.", source: "Example Q&A #1", by: "Sam Ortiz" },
      { text: "Does the Hang RP need every robot to hang?", answer: "No. One hanging robot is enough for the Hang RP.", source: "Example Team Update 1", by: "Ms. Rivera" },
      { text: "Does an orb that bounces out of the high basket count?", answer: "", source: "", by: "Sam Ortiz" },
      { text: "May a robot push an opponent's orbs away from the loading station?", answer: "", source: "", by: "Leo Brooks" },
      { text: "How many orbs may a robot hold at once?", answer: "", source: "", by: "Priya Shah" }
    ],
    actions: [
      { id: "leave", name: "Leave starting zone", phase: "auto", points: 3, rp: 0, notes: "" },
      { id: "lowA", name: "Orb in low basket (auto)", phase: "auto", points: 3, rp: 0, notes: "" },
      { id: "highA", name: "Orb in high basket (auto)", phase: "auto", points: 6, rp: 0, notes: "" },
      { id: "low", name: "Orb in low basket", phase: "teleop", points: 2, rp: 0, notes: "" },
      { id: "high", name: "Orb in high basket", phase: "teleop", points: 5, rp: 0, notes: "" },
      { id: "hang", name: "Hang from a branch", phase: "endgame", points: 10, rp: 1, notes: "Hang RP if done at least once" },
      { id: "park", name: "Park in the orchard", phase: "endgame", points: 2, rp: 0, notes: "Only if the robot is not hanging" }
    ],
    strategies: [
      { id: "high", name: "High basket cycler", status: "shortlist", by: "Sam Ortiz", when: "Tue", from: null, links: [{ kind: "video", label: "Cycling footage (made-up link)", url: "https://example.com/video/cycling" }],
        desc: "Fast cycles to the high basket; park at the end. Best raw points, thin on ranking points.", needs: "Shoot into the high basket from the loading lane in under 6 s.",
        blocks: blocks([["Leave zone", 0, 3, "leave"], ["Shoot 2 high", 3, 9, "highA", 2], ["Line up", 12, 3, null]].concat(teleop(12, "High basket", "high"), [["Park", 132, 6, "park"]])),
        comments: [{ who: "Leo Brooks", text: "12 s cycles feel optimistic with the reset in the middle.", when: "Tue" }] },
      { id: "hang", name: "Low basket and hang", status: "shortlist", by: "Ms. Rivera", when: "Tue", from: null, links: [],
        desc: "Safe low-basket cycles and a reliable hang. The hang earns a ranking point.", needs: "Hang from a branch in under 10 s.",
        blocks: blocks([["Leave zone", 0, 3, "leave"], ["Drop 2 low", 3, 8, "lowA", 2]].concat(teleop(8, "Low basket", "low"), [["Drive to tree", 130, 3, null], ["Hang", 133, 10, "hang"]])),
        comments: [] },
      { id: "mix", name: "Balanced scorer", status: "shortlist", by: "Ms. Rivera", when: "Tue", from: null, links: [],
        desc: "One high orb in auto, steady high-basket cycles with the best shooter, then hang.", needs: "Score high from range and hang.",
        blocks: blocks([["Leave zone", 0, 3, "leave"], ["Shoot 1 high", 3, 5, "highA"], ["Drop 1 low", 8, 4, "lowA"]].concat(teleop(16, "High basket", "high"), [["Hang", 132, 10, "hang"]])),
        comments: [{ who: "Priya Shah", text: "This one still works if our shooter is only OK.", when: "Wed" }, { who: "Ms. Rivera", text: "Agreed. It also leaves room for defense in teleop.", when: "Wed" }] },
      { id: "def", name: "Defense first", status: "dropped", by: "Ava Kim", when: "Wed", from: null, links: [],
        desc: "Leave in auto, then block the other alliance's loading lane all match.", needs: "", blocks: blocks([["Leave zone", 0, 3, "leave"], ["Defend loading lane", 15, 115, null], ["Park", 135, 5, "park"]]), comments: [] }
    ],
    criteria: [
      { id: "c1", scope: "strategy", name: "Points", w: 3, inv: false }, { id: "c2", scope: "strategy", name: "Consistency", w: 2, inv: false },
      { id: "c3", scope: "strategy", name: "Alliance value", w: 2, inv: false }, { id: "c4", scope: "strategy", name: "Difficulty", w: 2, inv: true },
      { id: "c5", scope: "strategy", name: "Defense resistance", w: 1, inv: false },
      { id: "c6", scope: "mechanism", name: "Requirement fit", w: 3, inv: false }, { id: "c7", scope: "mechanism", name: "Build difficulty", w: 2, inv: true },
      { id: "c8", scope: "mechanism", name: "Weight", w: 1, inv: true }, { id: "c9", scope: "mechanism", name: "Reliability", w: 3, inv: false },
      { id: "c10", scope: "mechanism", name: "Cost", w: 1, inv: true }
    ],
    ratings: {}, votes: {}, decision: null,
    reqs: [
      { id: "r1", text: "Leave the starting zone and score at least 1 orb in auto", prio: "must", strat: "mix" },
      { id: "r2", text: "Stay under the 30 in starting height limit", prio: "must", strat: null },
      { id: "r3", text: "Score a high orb in auto", prio: "must", strat: "mix" },
      { id: "r4", text: "Hang from a branch in under 10 s", prio: "should", strat: "mix" },
      { id: "r5", text: "Hang reliably (at least 9 of 10 practice attempts)", prio: "should", strat: "mix" },
      { id: "r6", text: "Pick orbs off the floor, not only from the loading station", prio: "could", strat: null },
      { id: "r7", text: "Plan the indexer for at most 2 orbs", prio: "could", strat: null }
    ],
    fns: [
      { id: "drive", name: "Drivetrain", chosen: null, mechs: [
        mech("Swerve (COTS modules)", "Four COTS swerve modules on an aluminium frame.", "Agile; the team has experience", "Cost; more wiring", "chosen", [{ kind: "onshape", label: "Swerve CAD (example link)", url: "https://example.com/onshape/swerve" }, { kind: "doc", label: "Swerve reference design (example link)", url: "https://example.com/docs/swerve-reference" }]),
        mech("6-wheel tank drive", "Six traction-wheel tank drive.", "Simple and very reliable", "Cannot strafe to line up", "rejected"),
        mech("Mecanum", "Four mecanum wheels.", "Strafes on a cheap frame", "Weak pushing; poor traction on the carpet", "idea")] },
      { id: "intake", name: "Intake", chosen: null, mechs: [
        mech("Over-the-bumper roller", "Full-width roller that deploys over the bumper.", "Wide pickup", "Extends the frame perimeter", "prototyping"),
        mech("Under-the-bumper wheels", "Fixed compliant wheels under the bumper.", "Simple and robust", "Narrower pickup", "chosen", [{ kind: "video", label: "Under-bumper intake demo (example link)", url: "https://example.com/video/under-bumper" }]),
        mech("Funnel and belt intake", "A funnel guiding orbs onto a belt.", "Forgiving of driver error", "Taller; more parts", "idea")] },
      { id: "indexer", name: "Indexer", chosen: null, mechs: [
        mech("Belt conveyor", "Short belt that stages two orbs.", "Gentle on the foam", "Belt tension needs checking", "prototyping"),
        mech("Star-wheel stack", "Compliant star wheels in a column.", "Compact", "Jams with a crushed orb", "idea")] },
      { id: "scorer", name: "Scorer", chosen: null, mechs: [
        mech("Single flywheel with an adjustable hood", "One flywheel, hood angle set by a servo.", "Reaches the high basket from range", "Tuning time", "chosen", [{ kind: "tba", label: "Reference robot (example link, not a real team)", url: "https://example.com/tba/reference-robot" }]),
        mech("Dual flywheel", "Two flywheels for backspin control.", "Tight groupings", "Heavier; two motors", "prototyping"),
        mech("Catapult", "Spring-loaded arm.", "No motors in the shot", "Hard to tune over a range", "rejected")] },
      { id: "endgame", name: "Endgame", chosen: null, mechs: [
        mech("Telescoping hook", "Two-stage telescope with a passive hook.", "Light", "Needs good driver alignment", "prototyping", [{ kind: "onshape", label: "Telescope CAD (example link)", url: "https://example.com/onshape/telescope" }]),
        mech("Winch and fixed hook", "Fixed hook raised by a winch.", "Very reliable", "Slower to deploy", "prototyping"),
        mech("Climbing arm", "Powered arm that swings up to the branch.", "Fast", "Heavy; complex", "rejected")] }
    ],
    docs: [
      { title: "Orbit Orchard game manual (made up)", kind: "Manual", versions: [["v2", "20 h ago", 4], ["v1", "Mon", 4]] },
      { title: "Team Update 1 (made up)", kind: "Team Update", versions: [["v1", "Tue", 1]] }
    ],
    sources: [
      { name: "Game manual page", url: "example.com/manual", checked: "20 h ago", note: "New version found: v2" },
      { name: "Team Updates", url: "example.com/updates", checked: "20 h ago", note: "No change" }
    ],
    sugs: [
      { kind: "summary", title: "What changed in the game manual v2", body: "- **G101**: a robot may now hold **three** orbs at a time (was two).\n- Everything else is unchanged.", state: "pending" },
      { kind: "section_edit", title: "Update “Game pieces”", body: "G101 in manual v2 raises the holding limit from two orbs to three.", target: 1, next: "- **Orbs:** 9 in foam balls, 30 per alliance.\n- Robots may hold at most 3 orbs at a time (G101, manual v2).\n- Orbs that leave the field are returned at the loading station.", state: "pending" },
      { kind: "question_answer", title: "Answer: How many orbs may a robot hold at once?", body: "At most three (G101, manual v2).", target: 4, source: "Game manual v2, G101", state: "pending" },
      { kind: "requirement_flag", title: "Check requirement: Plan the indexer for at most 2 orbs", body: "G101 now allows three orbs, so an indexer that stages three could score faster.", target: "r7", state: "pending" }
    ],
    chat: [{ me: false, text: "Ask me about the rules. I answer from the team's rule library and say which rule and page I used.", cite: "" }],
    activity: [
      { who: "Sam Ortiz", what: "added requirement “Hang reliably”", when: "5 h ago" },
      { who: "Research assistant", what: "made 4 suggestions from game manual v2", when: "20 h ago" },
      { who: "Ms. Rivera", what: "chose Single flywheel with an adjustable hood for Scorer", when: "Yesterday" },
      { who: "Ms. Rivera", what: "chose Swerve (COTS modules) for Drivetrain", when: "Yesterday" },
      { who: "Sam Ortiz", what: "added mechanism “Under-the-bumper wheels”", when: "Wed" },
      { who: "Leo Brooks", what: "voted on the strategy", when: "Wed" },
      { who: "Sam Ortiz", what: "scored High basket cycler (5 of 5 criteria)", when: "Wed" },
      { who: "Ms. Rivera", what: "scored Balanced scorer (5 of 5 criteria)", when: "Wed" },
      { who: "Ava Kim", what: "added strategy “Defense first”", when: "Wed" },
      { who: "Ms. Rivera", what: "added strategy “Balanced scorer”", when: "Tue" },
      { who: "Ms. Rivera", what: "answered “Does the Hang RP need every robot to hang?”", when: "Tue" },
      { who: "Sam Ortiz", what: "asked “Does an orb that bounces out of the high basket count?”", when: "Mon" },
      { who: "Ms. Rivera", what: "created the season 2026 Orbit Orchard", when: "Mon" }
    ]
  };
  /* Two raters per target, as in the seed: a mentor and a student who sees things slightly differently. */
  var SR = { high: [[5, 2, 4, 4, 2], [5, 3, 4, 4, 2]], hang: [[3, 5, 3, 2, 4], [3, 4, 3, 2, 5]], mix: [[4, 4, 4, 3, 3], [4, 3, 5, 3, 3]], def: [[1, 3, 2, 2, 5], null] };
  Object.keys(SR).forEach(function (s) { rateAll(s, "strategy", "Ms. Rivera", SR[s][0]); if (SR[s][1]) rateAll(s, "strategy", "Sam Ortiz", SR[s][1]); });
  var MR = [[5, 3, 3, 4, 4], [3, 1, 3, 5, 1], [2, 2, 3, 2, 2], [4, 3, 2, 3, 2], [4, 2, 1, 5, 1], [3, 4, 3, 3, 3], [4, 2, 2, 4, 2], [3, 3, 2, 3, 2], [5, 3, 2, 4, 2], [5, 4, 3, 3, 3], [3, 3, 2, 2, 1], [5, 3, 2, 4, 2], [4, 2, 2, 5, 1], [3, 5, 4, 2, 4]], n = 0;
  k.fns.forEach(function (f) {
    f.mechs.forEach(function (m) {
      var v = MR[n], tw = [[0, 1, 0, -1, 0], [0, 0, 1, 0, -1]][n % 2]; n++;
      rateAll(m.id, "mechanism", "Ms. Rivera", v); rateAll(m.id, "mechanism", "Sam Ortiz", v.map(function (x, i) { return Math.min(5, Math.max(1, x + tw[i])); }));
      if (m.status === "chosen") f.chosen = m.id;
    });
  });
  [["Ms. Rivera", ["mix", "hang", "high"]], ["Mr. Okafor", ["mix", "high", "hang"]], ["Leo Brooks", ["mix", "hang", "high"]], ["Priya Shah", ["high", "mix", "hang"]], ["Ava Kim", ["hang", "mix", "high"]]].forEach(function (v) {
    var b = k.votes[v[0]] = {}; v[1].forEach(function (s, i) { b[s] = i + 1; });
  });
}
function rateAll(target, scope, who, vals) { crit(scope, D.S.ko).forEach(function (c, i) { var key = target + "|" + c.id; (D.S.ko.ratings[key] = D.S.ko.ratings[key] || {})[who] = vals[i]; }); }

/* ---------- Maths (kickoff's src/lib: timeline.ts, matrix.ts, vote.ts) ---------- */
function K() { return D.S.ko; }
function crit(scope, k) { return (k || K()).criteria.filter(function (c) { return c.scope === scope; }); }
function act(id) { return K().actions.filter(function (a) { return a.id === id; })[0]; }
function strat(id) { return K().strategies.filter(function (s) { return s.id === id; })[0]; }
function fn(id) { return K().fns.filter(function (f) { return f.id === id; })[0]; }
function mechOf(f, id) { return f.mechs.filter(function (m) { return m.id === id; })[0]; }
function matchLen() { var p = K().phases; return p.auto + p.teleop + p.endgame; }
function phaseAt(s) { var p = K().phases; return s < p.auto ? "auto" : s < p.auto + p.teleop ? "teleop" : "endgame"; }
/* A block counts in the phase where it starts; ranking points for actions done at least once. */
function points(bl) {
  var o = { auto: 0, teleop: 0, endgame: 0, total: 0, rp: 0, per: {} };
  bl.forEach(function (b) { var a = b.a && act(b.a); if (!a) return; var n = b.n > 0 ? b.n : 0; o[phaseAt(b.s)] = r2(o[phaseAt(b.s)] + n * a.points); o.per[a.id] = (o.per[a.id] || 0) + n; });
  K().actions.forEach(function (a) { if (o.per[a.id] >= 1 && a.rp) o.rp += a.rp; });
  o.total = r2(o.auto + o.teleop + o.endgame);
  return o;
}
function overlap(a1, a2, b1, b2) { return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1)); }
function warnings(bl) {
  var T = matchLen(), out = [];
  bl.forEach(function (b, i) {
    var end = b.s + b.d, name = b.l || "Block " + (i + 1);
    if (end > T) out.push({ id: b.id, text: name + " runs past the end of the match (" + T + " s)." });
    if (b.a) K().segments.forEach(function (g) { if (g.k === "closed" && overlap(b.s, end, g.s, g.e) > 0) out.push({ id: b.id, text: name + " overlaps “" + g.name + "”, where scoring is closed. It still counts; you decide." }); });
    if (bl.some(function (o, j) { return j < i && overlap(b.s, end, o.s, o.s + o.d) > 0; })) out.push({ id: b.id, text: name + " overlaps another block (one robot, two things at once)." });
  });
  return out;
}
function lanes(bl) {
  var ends = [], out = {};
  bl.slice().sort(function (a, b) { return a.s - b.s; }).forEach(function (b) {
    var l = -1; for (var i = 0; i < ends.length; i++) if (ends[i] <= b.s) { l = i; break; }
    if (l < 0) l = ends.length; ends[l] = b.s + b.d; out[b.id] = l;
  });
  return out;
}
function matrix(scope, targets) {
  var cs = crit(scope), R = K().ratings;
  return targets.map(function (t) {
    var sum = 0, w = 0, raters = {};
    var cells = cs.map(function (c) {
      var r = R[t.id + "|" + c.id] || {}, vals = Object.keys(r).map(function (who) { raters[who] = 1; return r[who]; });
      if (!vals.length) return null;
      var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      sum += Math.max(0, c.w) * (c.inv ? 6 - avg : avg); w += Math.max(0, c.w);
      return { avg: r2(avg), n: vals.length };
    });
    return { t: t, cells: cells, weighted: w ? r2(sum / w) : null, raters: Object.keys(raters).length };
  });
}
/* Ranked: a Borda count (rank 1 of n earns n). Approval: one point per approval. Ties broken by first choices. */
function tally() {
  var k = K(), n = k.strategies.length, voters = Object.keys(k.votes);
  var rows = k.strategies.map(function (s, i) {
    var r = { s: s, score: 0, first: 0, voters: 0, i: i };
    voters.forEach(function (who) { var v = k.votes[who][s.id]; if (!v) return; r.voters++; if (k.voteMode === "approval") r.score++; else if (v >= 1 && v <= n) { r.score += n - v + 1; if (v === 1) r.first++; } });
    return r;
  }).sort(function (a, b) { return b.score - a.score || b.first - a.first || a.i - b.i; });
  var top = rows[0];
  return { rows: rows, voters: voters.length, leader: top && top.score > 0 ? top.s.id : null, tie: !!top && top.score > 0 && rows.length > 1 && rows[1].score === top.score && rows[1].first === top.first };
}
function live() { return K().status !== "archived"; }
function canDecide() { return live() && D.isStaff(); }
function log(what) { K().activity.unshift({ who: D.me().name, what: what, when: "Just now" }); D.log(what, "kickoff"); }

/* ---------- Small pieces ---------- */
/* Markdown, the little the rule notes use: paragraphs, "- " lists, **bold**, *italic*. */
function md(src) {
  var out = [], list = null;
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>"); }
  String(src || "").split("\n").forEach(function (line) {
    var m = /^\s*[-*] (.*)$/.exec(line);
    if (m) { (list = list || []).push("<li>" + inline(m[1]) + "</li>"); return; }
    if (list) { out.push("<ul>" + list.join("") + "</ul>"); list = null; }
    if (line.trim()) out.push("<p>" + inline(line) + "</p>");
  });
  if (list) out.push("<ul>" + list.join("") + "</ul>");
  return '<div class="kmd">' + out.join("") + "</div>";
}
/* A show/hide toggle whose state survives re-renders (a <details> would snap shut). */
function fold(key, label) { var o = !!K().open[key]; return '<button class="kfold" data-act="kofold" data-v="' + key + '" aria-expanded="' + o + '"><span aria-hidden="true">' + (o ? "▾" : "▸") + "</span> " + esc(label) + "</button>"; }
function kpi(v, label) { return '<div class="card tight kpi"><b class="num">' + v + "</b><span>" + esc(label) + "</span></div>"; }
function phasePill(ph) { return '<span class="pill"><i class="dotc ' + PHC[ph] + '"></i>' + PHN[ph] + "</span>"; }
function phaseBar(p, max) {
  return '<div class="kstack" title="Auto ' + p.auto + " · Teleop " + p.teleop + " · Endgame " + p.endgame + '">' + PH.map(function (ph) { return p[ph] ? '<i class="' + PHC[ph] + '" style="width:' + (max ? p[ph] / max * 100 : 0) + '%"></i>' : ""; }).join("") + "</div>";
}
var PLEGEND = '<div class="legend">' + PH.map(function (ph) { return '<span><i class="dotc ' + PHC[ph] + '"></i>' + PHN[ph] + "</span>"; }).join("") + "</div>";
/* The timeline: segments along the top, phase lines, and each block on the first free lane. Small on cards; labelled and scrollable when big. */
function strip(bl, big, flagged) {
  var k = K(), T = matchLen(), ln = lanes(bl), n = 1;
  Object.keys(ln).forEach(function (id) { n = Math.max(n, ln[id] + 1); });
  var R = big ? 18 : 0, B = big ? 20 : 10, L = big ? 26 : 9, H = R + B + 4 + n * L + 4, h = "";
  function pc(s) { return (s / T * 100).toFixed(3) + "%"; }
  if (big) for (var t = 0; t < T; t += 10) h += '<span class="ktick" style="left:' + pc(t) + '">' + t + "s</span>";
  k.segments.forEach(function (g) { h += '<i class="kseg ' + g.k + '" style="left:' + pc(g.s) + ";width:" + pc(g.e - g.s) + ";top:" + R + "px;height:" + B + "px;line-height:" + B + 'px" title="' + esc(g.name + ", " + g.s + "–" + g.e + " s") + '">' + (big ? esc(g.name) : "") + "</i>"; });
  [k.phases.auto, k.phases.auto + k.phases.teleop].forEach(function (t) { h += '<b class="kph" style="left:' + pc(t) + ";top:" + R + 'px"></b>'; });
  bl.forEach(function (b) {
    var a = b.a && act(b.a), name = (b.l || (a && a.name) || "Block") + (a && b.n > 1 ? " ×" + b.n : "");
    h += '<span class="kblk' + (a ? " score" : "") + (flagged && flagged[b.id] ? " flag" : "") + '" style="left:' + pc(b.s) + ";width:" + pc(b.d) + ";top:" + (R + B + 4 + ln[b.id] * L) + "px;height:" + (L - (big ? 4 : 2)) + 'px" title="' + esc(name + ", " + b.s + "–" + (b.s + b.d) + " s" + (a ? ", " + r2(b.n * a.points) + " pts" : "")) + '">' + (big ? esc(name) : "") + "</span>";
  });
  var inner = '<div class="ktl' + (big ? " big" : "") + '" style="height:' + H + 'px">' + h + "</div>";
  return big ? '<div class="ktlwrap" data-keepscroll="ktl">' + inner + "</div>" : inner;
}
function scoreForm(scope, id) {
  var me = D.me().name, R = K().ratings;
  return '<div class="kscore">' + crit(scope).map(function (c) {
    var mine = (R[id + "|" + c.id] || {})[me];
    return "<span><b>" + esc(c.name) + "</b>" + (c.inv ? ' <span class="who">5 = hard / heavy / costly</span>' : "") + '</span><span class="seg" role="group" aria-label="' + esc(c.name) + '">' + [1, 2, 3, 4, 5].map(function (v) { return '<button data-act="korate" data-t="' + id + '" data-c="' + c.id + '" data-v="' + v + '" aria-pressed="' + (mine === v) + '">' + v + "</button>"; }).join("") + "</span>";
  }).join("") + "</div>";
}
function matrixTable(scope, targets, open) {
  var cs = crit(scope), rows = matrix(scope, targets), best = Math.max.apply(null, [0].concat(rows.map(function (r) { return r.weighted || 0; })));
  return '<div class="tablewrap"><table><thead><tr><th>' + (scope === "strategy" ? "Strategy" : "Mechanism") + "</th>" + cs.map(function (c) { return '<th title="Weight ' + c.w + (c.inv ? ", lower is better" : "") + '">' + esc(c.name) + ' <span class="who">×' + c.w + (c.inv ? " ↓" : "") + "</span></th>"; }).join("") + "<th>Weighted</th><th>Raters</th></tr></thead><tbody>" +
    rows.map(function (r) {
      var lead = r.weighted != null && r.weighted === best && best > 0;
      return "<tr" + (open ? ' class="click" data-act="' + open + '" data-v="' + r.t.id + '"' : "") + '><td><b>' + esc(r.t.name) + "</b></td>" + r.cells.map(function (c) { return '<td class="num">' + (c ? c.avg.toFixed(1) : '<span class="mute">–</span>') + "</td>"; }).join("") +
        '<td style="min-width:130px"><div class="row nowrap"><div class="bar" style="flex:1"><i' + (lead ? ' class="ok"' : "") + ' style="width:' + ((r.weighted || 0) / 5 * 100) + '%"></i></div><b class="num">' + (r.weighted == null ? "–" : r.weighted.toFixed(2)) + "</b></div></td><td class=\"num\">" + r.raters + "</td></tr>";
    }).join("") + '</tbody></table></div><p class="small mute">Average of everyone\'s 1–5 scores. ↓ means lower is better, so it counts as 6 − the average. Weighted is out of 5.</p>';
}
function linkList(links) {
  return links.map(function (l) { return '<div class="li"><span class="pill">' + esc(l.kind) + '</span><a class="grow" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + " ↗</a></div>"; }).join("");
}

/* ---------- Views ---------- */
var TABS = [["game", "Game"], ["scoring", "Scoring"], ["strategies", "Strategies"], ["decide", "Decide"], ["requirements", "Requirements"], ["mechanisms", "Mechanisms"], ["export", "Export"], ["research", "Research"], ["activity", "Activity"]];
D.views.kickoff = function () {
  var k = K(), list = TABS.slice(), pend = k.sugs.filter(function (s) { return s.state === "pending"; }).length;
  if (D.isStaff()) list.push(["settings", "Settings"]);
  var t = D.tab("kickoff", "game"); if (t === "settings" && !D.isStaff()) t = "game";
  var right = '<button class="btn sm" data-act="tab" data-app="kickoff" data-v="research">Assistant' + (pend ? ' <span class="pill gold">' + pend + "</span>" : "") + '</button><button class="btn sm" data-act="go" data-v="kproj">' + D.ic("projector", 16) + " Projector</button>";
  var head = '<div class="row between"><div class="row"><h2>' + k.year + ": " + esc(k.game) + '</h2><span class="pill ' + ({ active: "ok", draft: "", archived: "warn" })[k.status] + '">' + k.status + "</span>" + (k.example ? '<span class="pill warn">Example game (made up)</span>' : "") + '</div><span class="who">Refreshes every 5 s. What you are typing is kept.</span></div>' +
    (live() ? "" : '<p class="hint">This season is archived and read-only.</p>');
  return D.topbar("Kickoff", "kickoff.2972robotics.com", D.tabsFor("kickoff", list, "game"), right) + '<div class="content">' + head + VIEW[t]() + "</div>";
};
var VIEW = {};

VIEW.game = function () {
  var k = K(), ed = live(), open = k.questions.filter(function (q) { return !q.answer; }).length;
  var secs = k.sections.map(function (s, i) { return '<div class="card"><div class="row between"><h3>' + esc(s.title) + "</h3>" + (ed ? '<button class="btn ghost sm" data-act="kosec" data-i="' + i + '">Edit</button>' : "") + "</div>" + md(s.body) + '<span class="who">' + esc(s.by) + " · " + esc(s.when) + "</span></div>"; }).join("");
  var qs = k.questions.map(function (q, i) {
    return '<div class="li"><span class="pill ' + (q.answer ? "ok" : "warn") + '">' + (q.answer ? "Answered" : "Open") + '</span><span class="grow"><b>' + esc(q.text) + "</b>" + (q.answer ? "<br>" + esc(q.answer) + (q.source ? ' <span class="who">· ' + esc(q.source) + "</span>" : "") : "") + '<br><span class="who">Asked by ' + esc(q.by) + "</span></span>" + (ed ? '<button class="btn sm" data-act="koq" data-i="' + i + '">' + (q.answer ? "Edit answer" : "Answer") + "</button>" : "") + "</div>";
  }).join("");
  return '<p class="flowhint">Kickoff day: split into breakout groups, one per rule section, and write the summary. Put anything unclear in <b>Rule questions</b> and answer it later with the source, such as “Team Update 3” or “Q&amp;A #12”.</p><div class="grid2">' + secs + "</div>" +
    '<div class="card"><div class="row between"><h2>Rule questions</h2><span class="pill ' + (open ? "warn" : "ok") + '">' + open + ' open</span></div><div class="list">' + qs + "</div>" +
    (ed ? '<div class="row nowrap"><input class="inp" id="ko-q" placeholder="Ask a rule question" aria-label="New rule question"><button class="btn primary" data-act="koqadd">Ask</button></div>' : "") + "</div>";
};

VIEW.scoring = function () {
  var k = K(), ed = live(), p = k.phases;
  var rows = k.actions.map(function (a, i) {
    return "<tr" + (ed ? ' class="click" data-act="koact" data-i="' + i + '"' : "") + "><td><b>" + esc(a.name) + "</b></td><td>" + phasePill(a.phase) + '</td><td class="num">' + a.points + '</td><td class="num">' + (a.rp ? a.rp + " RP" : '<span class="mute">–</span>') + '</td><td class="wrap who">' + esc(a.notes) + "</td></tr>";
  }).join("");
  var add = ed ? '<div class="card"><h2>Add a way to score</h2><div class="formgrid"><div class="field"><label for="ko-an">Action</label><input id="ko-an" placeholder="Orb in high basket"></div><div class="field"><label for="ko-aph">Phase</label><select id="ko-aph">' + PH.map(function (ph) { return '<option value="' + ph + '">' + PHN[ph] + "</option>"; }).join("") + '</select></div><div class="field"><label for="ko-apt">Points</label><input id="ko-apt" inputmode="decimal" value="1"></div><div class="field"><label for="ko-arp">Ranking points</label><input id="ko-arp" inputmode="numeric" value="0"></div></div><div class="field"><label for="ko-ano">Notes</label><input id="ko-ano" placeholder="RP if done at least once, limits, …"></div><div class="row"><button class="btn primary" data-act="koactadd">Add</button></div></div>' : "";
  return '<div class="grid4">' + kpi(p.auto + " s", "Auto") + kpi(p.teleop + " s", "Teleop (before the endgame)") + kpi(p.endgame + " s", "Endgame") + kpi(matchLen() + " s", "Whole match") + "</div>" +
    '<div class="card"><div class="row between"><h2>Scoring table</h2><span class="small mute">' + k.actions.length + " ways to score" + (ed ? " · tap a row to edit" : "") + '</span></div><div class="tablewrap"><table><thead><tr><th>Action</th><th>Phase</th><th>Points</th><th>RP</th><th>Notes</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
    '<p class="small mute">RP: ranking points earned if a strategy does the action at least once in a match.</p></div>' + add;
};

VIEW.strategies = function () {
  var k = K(), ed = live(), board = k.view === "board";
  var bar = '<div class="row"><span class="seg" role="group" aria-label="View"><button data-act="koview" data-v="cards" aria-pressed="' + !board + '">Cards</button><button data-act="koview" data-v="board" aria-pressed="' + board + '">Board</button></span>' +
    (ed ? '<button class="btn primary sm" data-act="konew">' + D.ic("plus", 16) + " New strategy</button>" : "") + '<span class="small mute">A strategy is a timeline of what one robot does in a match. The gold blocks score.</span></div>';
  var cmp = k.strategies.length > 1 ? '<div class="card tight">' + fold("cmp", "Compare in a table") + (k.open.cmp ? compareTable() : "") + "</div>" : "";
  var body;
  if (!k.strategies.length) body = '<div class="empty">No strategies yet. Start one with New strategy.</div>';
  else if (board) {
    var best = Math.max.apply(null, k.strategies.map(function (s) { return points(s.blocks).total; }));
    body = '<div class="kcols">' + SSTAT.map(function (c) {
      var xs = k.strategies.filter(function (s) { return s.status === c[0]; }).map(function (s) { return { s: s, p: points(s.blocks) }; }).sort(function (a, b) { return b.p.total - a.p.total; });
      return '<div class="bcol" data-kcol="' + c[0] + '"><div class="row between"><b>' + c[1] + '</b><span class="who">' + xs.length + "</span></div>" + xs.map(function (x) {
        return '<div class="bcard" draggable="' + ed + '" data-kstrat="' + x.s.id + '"><button class="ttitle" data-act="kostrat" data-v="' + x.s.id + '">' + esc(x.s.name) + '</button><div class="row between nowrap"><span class="num" style="font-size:1.15rem;font-weight:700' + (x.p.total === best ? ";color:var(--accent)" : "") + '">' + x.p.total + ' <span class="who">pts</span></span>' + (k.decision && k.decision.chosen === x.s.id ? '<span class="pill ok">✓ Chosen</span>' : "") + "</div>" + phaseBar(x.p, best) + (ed ? statusSelect(x.s) : "") + "</div>";
      }).join("") + "</div>";
    }).join("") + '</div><p class="small mute">Drag a card to another column, or use its menu.</p>';
  } else body = k.strategies.map(stratCard).join("");
  return bar + cmp + body;
};
function statusSelect(s) { return '<select class="chipsel" data-change="kostatus" data-v="' + s.id + '" aria-label="Status of ' + esc(s.name) + '">' + SSTAT.map(function (c) { return '<option value="' + c[0] + '"' + (s.status === c[0] ? " selected" : "") + ">" + c[1] + "</option>"; }).join("") + "</select>"; }
function stratCard(s) {
  var k = K(), ed = live(), p = points(s.blocks), chosen = k.decision && k.decision.chosen === s.id;
  return '<div class="card tight' + (chosen ? " hero" : "") + '"><div class="row between nowrap" style="align-items:flex-start"><div style="min-width:0;display:grid;gap:4px"><div class="row"><button class="ttitle kname" data-act="kostrat" data-v="' + s.id + '">' + esc(s.name) + "</button>" + (chosen ? '<span class="pill ok">✓ Chosen</span>' : "") + (s.status === "dropped" ? '<span class="pill">Set aside</span>' : "") + "</div>" +
    '<p class="small">' + esc(s.desc) + "</p>" + (s.needs ? '<p class="small"><b>Robot must be able to:</b> ' + esc(s.needs) + "</p>" : "") + "</div>" +
    '<div class="num" style="text-align:right;flex:none"><span class="kbig">' + p.total + '</span> <span class="who">pts</span><br><span class="who">Auto ' + p.auto + " · Teleop " + p.teleop + " · End " + p.endgame + (p.rp ? " · " + p.rp + " RP" : "") + "</span></div></div>" + strip(s.blocks) +
    '<div class="row">' + (ed ? statusSelect(s) + '<button class="btn sm" data-act="koedit" data-v="' + s.id + '">Edit</button><button class="btn sm" data-act="kocopy" data-v="' + s.id + '">Copy</button>' : "") +
    '<button class="btn ghost sm" data-act="kostrat" data-v="' + s.id + '">' + s.comments.length + " comment" + (s.comments.length === 1 ? "" : "s") + '</button><span class="who" style="margin-left:auto">' + (s.from ? "Copied from " + esc(s.from) + " · " : "") + esc(s.by) + " · " + esc(s.when) + "</span></div></div>";
}
function compareTable() {
  var k = K(), rows = k.strategies.map(function (s) { return { s: s, p: points(s.blocks) }; }), max = Math.max.apply(null, rows.map(function (r) { return r.p.total; }).concat([1]));
  return '<div class="tablewrap"><table><thead><tr><th>Strategy</th><th>Auto</th><th>Teleop</th><th>Endgame</th><th>Total</th><th>RP</th><th style="min-width:160px"></th></tr></thead><tbody>' + rows.map(function (r) {
    return '<tr class="click" data-act="kostrat" data-v="' + r.s.id + '"><td><b>' + esc(r.s.name) + "</b>" + (k.decision && k.decision.chosen === r.s.id ? ' <span class="pill ok">✓</span>' : "") + '</td><td class="num">' + r.p.auto + '</td><td class="num">' + r.p.teleop + '</td><td class="num">' + r.p.endgame + '</td><td class="num"><b>' + r.p.total + '</b></td><td class="num">' + (r.p.rp || "–") + "</td><td>" + phaseBar(r.p, max) + "</td></tr>";
  }).join("") + "</tbody></table></div>" + PLEGEND;
}
D.drawers.kostrat = function (d) {
  var k = K(), s = strat(d.id); if (!s) return D.drawerHead("Strategy", "Deleted");
  var p = points(s.blocks), ed = live(), row = matrix("strategy", [s])[0];
  var per = k.actions.filter(function (a) { return p.per[a.id]; }).map(function (a) { return "<tr><td>" + esc(a.name) + "</td><td>" + phasePill(a.phase) + '</td><td class="num">' + p.per[a.id] + '</td><td class="num">' + r2(p.per[a.id] * a.points) + "</td></tr>"; }).join("");
  return '<div class="kwide">' + D.drawerHead("Strategy · " + SSTAT.filter(function (c) { return c[0] === s.status; })[0][1], s.name) +
    "<p>" + esc(s.desc) + "</p>" + (s.needs ? "<p><b>Robot must be able to:</b> " + esc(s.needs) + "</p>" : "") +
    '<div class="grid4">' + kpi(p.total, "points per match") + kpi(p.auto, "auto") + kpi(p.teleop, "teleop") + kpi(p.endgame + (p.rp ? " +" + p.rp + " RP" : ""), "endgame") + "</div>" +
    strip(s.blocks, true) + (per ? '<div class="tablewrap"><table><thead><tr><th>Scores</th><th>Phase</th><th>Count</th><th>Points</th></tr></thead><tbody>' + per + "</tbody></table></div>" : "") +
    '<div class="card flat tight"><div class="row between"><b>Criteria score</b><span class="num">' + (row.weighted == null ? "Not scored yet" : row.weighted.toFixed(2) + " of 5 · " + row.raters + " rater" + (row.raters === 1 ? "" : "s")) + '</span></div><button class="btn sm" style="justify-self:start" data-act="kogodecide">Score it on Decide</button></div>' +
    (s.links.length ? '<div><p class="flabel">Links</p><div class="list">' + linkList(s.links) + "</div></div>" : "") +
    '<div><p class="flabel">Comments</p><div class="list">' + (s.comments.length ? s.comments.map(function (c) { return '<div class="li"><span class="grow"><b>' + esc(c.who) + "</b> " + esc(c.text) + '</span><span class="who">' + esc(c.when) + "</span></div>"; }).join("") : '<p class="small mute">No comments yet.</p>') + "</div>" +
    (ed ? '<div class="row nowrap" style="margin-top:8px"><input class="inp" id="ko-cm" placeholder="Add a comment" aria-label="Comment"><button class="btn" data-act="kocomment" data-v="' + s.id + '">Post</button></div>' : "") + "</div>" +
    (ed ? '<div class="row"><button class="btn primary" data-act="koedit" data-v="' + s.id + '">Edit timeline</button><button class="btn" data-act="kocopy" data-v="' + s.id + '">Copy</button>' + (D.isStaff() ? '<button class="btn danger" data-act="kodelstrat" data-v="' + s.id + '">Delete</button>' : "") + "</div>" : "") +
    (s.from ? '<p class="who">Copied from ' + esc(s.from) + "</p>" : "") + "</div>";
};
D.drawers.koedit = function () {
  var k = K(), d = k.draft, p = points(d.blocks), w = warnings(d.blocks), flag = {};
  w.forEach(function (x) { flag[x.id] = 1; });
  var opts = function (b) { return '<option value="">No points (drive, load, defend)</option>' + k.actions.map(function (a) { return '<option value="' + a.id + '"' + (b.a === a.id ? " selected" : "") + ">" + esc(a.name) + " · " + a.points + "</option>"; }).join(""); };
  var rows = d.blocks.map(function (b, i) {
    var id = "kb-" + i + "-";
    return '<div class="kbrow' + (flag[b.id] ? " flag" : "") + '"><input class="inp" id="' + id + 'l" data-input="kobk" data-i="' + i + '" data-f="l" value="' + esc(b.l) + '" placeholder="What the robot does" aria-label="Block ' + (i + 1) + ' label">' +
      '<input class="inp num" id="' + id + 's" inputmode="numeric" data-input="kobk" data-i="' + i + '" data-f="s" value="' + b.s + '" aria-label="Start, seconds">' +
      '<input class="inp num" id="' + id + 'd" inputmode="numeric" data-input="kobk" data-i="' + i + '" data-f="d" value="' + b.d + '" aria-label="Length, seconds">' +
      '<select class="inp" id="' + id + 'a" data-change="kobk" data-i="' + i + '" data-f="a" aria-label="Scores">' + opts(b) + "</select>" +
      '<input class="inp num" id="' + id + 'n" inputmode="numeric" data-input="kobk" data-i="' + i + '" data-f="n" value="' + (b.a ? b.n : "") + '"' + (b.a ? "" : " disabled") + ' aria-label="Count">' +
      '<button class="xbtn" data-act="kobdel" data-i="' + i + '" aria-label="Remove block ' + (i + 1) + '">×</button></div>';
  }).join("");
  return '<div class="kwide">' + D.drawerHead(d.id ? "Edit strategy" : d.from ? "Copy of " + d.from : "New strategy", d.name || "Untitled strategy") +
    '<div class="formgrid"><div class="field"><label for="ko-sn">Name</label><input id="ko-sn" data-input="kodraft" data-f="name" value="' + esc(d.name) + '"></div><div class="field"><label for="ko-sneeds">Robot must be able to</label><input id="ko-sneeds" data-input="kodraft" data-f="needs" value="' + esc(d.needs) + '"></div></div>' +
    '<div class="field"><label for="ko-sd">Description</label><textarea id="ko-sd" rows="2" data-input="kodraft" data-f="desc">' + esc(d.desc) + "</textarea></div>" +
    '<div class="row between"><b>Timeline · ' + matchLen() + ' s match</b><span class="num"><b>' + p.total + '</b> pts <span class="who">Auto ' + p.auto + " · Teleop " + p.teleop + " · End " + p.endgame + (p.rp ? " · " + p.rp + " RP" : "") + "</span></span></div>" + strip(d.blocks, true, flag) +
    (w.length ? '<div class="hint" role="status">' + w.map(function (x) { return esc(x.text); }).join("<br>") + "</div>" : "") +
    '<div class="kbrow head"><span>What</span><span>Start s</span><span>Length s</span><span>Scores</span><span>Count</span><span></span></div>' + rows +
    '<div class="row"><button class="btn sm" data-act="kobadd">' + D.ic("plus", 16) + ' Add block</button><button class="btn sm" data-act="kobsort">Sort by time</button><span class="small mute">A block counts in the phase where it starts.</span></div>' +
    '<div class="row"><button class="btn primary" data-act="kosave">' + (d.id ? "Save" : "Add strategy") + '</button><button class="btn" data-act="closedrawer">Cancel</button></div></div>';
};

VIEW.decide = function () {
  var k = K(), S = k.strategies, closed = !!k.decision, can = live() && !closed, me = D.me().name, t = tally(), n = S.length;
  var dec = closed ? '<div class="card hero"><p class="eyebrow">Decided strategy</p><h2>' + esc((strat(k.decision.chosen) || { name: "(deleted)" }).name) + "</h2>" + (k.decision.note ? "<p>" + esc(k.decision.note) + "</p>" : "") + '<span class="who">Closed by ' + esc(k.decision.by) + " · " + esc(k.decision.when) + ". Scores and votes are locked.</span>" + (canDecide() ? '<div><button class="btn sm" data-act="koreopen">Reopen the vote</button></div>' : "") + "</div>" : "";
  var scores = can && n ? '<div class="card"><div class="row between"><h2>Your scores (1–5)</h2><span class="small mute">Saved as you tap</span></div><div class="grid2">' + S.map(function (s) { return '<div class="card flat tight"><button class="ttitle kname" data-act="kostrat" data-v="' + s.id + '">' + esc(s.name) + "</button>" + scoreForm("strategy", s.id) + "</div>"; }).join("") + "</div></div>" : "";
  var mine = k.votes[me] || {};
  var ballot = can && n ? (k.voteMode === "ranked" ? '<div class="formgrid">' + S.map(function (s) { return '<div class="field"><label for="kv-' + s.id + '">' + esc(s.name) + '</label><select id="kv-' + s.id + '"><option value="">–</option>' + S.map(function (x, i) { return '<option value="' + (i + 1) + '"' + (mine[s.id] === i + 1 ? " selected" : "") + ">" + (i + 1) + (i === 0 ? " (first choice)" : "") + "</option>"; }).join("") + "</select></div>"; }).join("") + "</div>"
    : '<div class="formgrid">' + S.map(function (s) { return '<label class="row nowrap"><input type="checkbox" id="kv-' + s.id + '"' + (mine[s.id] ? " checked" : "") + "> " + esc(s.name) + "</label>"; }).join("") + "</div>") +
    '<div class="row"><button class="btn primary" data-act="kovote">' + (k.votes[me] ? "Update my vote" : "Save my vote") + '</button><span class="small mute">' + (k.voteMode === "ranked" ? "1 is your first choice. Leave a strategy blank to not rank it." : "Tick every strategy you'd be happy with.") + "</span></div>" : "";
  var max = Math.max.apply(null, t.rows.map(function (r) { return r.score; }).concat([1]));
  var tbl = '<div class="tablewrap"><table><thead><tr><th>Strategy</th><th>' + (k.voteMode === "ranked" ? "Points" : "Approvals") + "</th>" + (k.voteMode === "ranked" ? "<th>1st choices</th>" : "") + '<th>Voters</th><th style="min-width:140px"></th></tr></thead><tbody>' + t.rows.map(function (r) {
    return "<tr><td><b>" + esc(r.s.name) + "</b>" + (r.s.id === t.leader ? ' <span class="pill gold">Leading</span>' : "") + '</td><td class="num">' + r.score + "</td>" + (k.voteMode === "ranked" ? '<td class="num">' + r.first + "</td>" : "") + '<td class="num">' + r.voters + '</td><td><div class="bar"><i style="width:' + r.score / max * 100 + '%"></i></div></td></tr>';
  }).join("") + "</tbody></table></div>";
  var close = canDecide() && !closed && n ? '<div class="card flat"><h3>Close the vote (mentors)</h3><div class="field"><label for="ko-chosen">Chosen strategy</label><select id="ko-chosen">' + S.map(function (s) { return '<option value="' + s.id + '"' + (s.id === t.leader ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("") + '</select></div><div class="field"><label for="ko-note">Note</label><textarea id="ko-note" rows="2" placeholder="Why we chose it"></textarea></div><div class="row"><button class="btn primary" data-act="koclose">Close vote and record decision</button><span class="small mute">Locks scores and votes. You can reopen it.</span></div></div>' : "";
  return dec + '<div class="card"><h2>Criteria matrix</h2>' + matrixTable("strategy", S, "kostrat") + "</div>" + scores +
    '<div class="card"><div class="row between"><h2>Vote · ' + (k.voteMode === "ranked" ? "ranked choice" : "approval") + '</h2><span class="small mute">' + t.voters + " voted" + (t.tie ? " · tied at the top" : "") + "</span></div>" + tbl + ballot + close + "</div>";
};

VIEW.requirements = function () {
  var k = K(), ed = live();
  var groups = PRIO.map(function (p) {
    var xs = k.reqs.filter(function (r) { return r.prio === p[0]; });
    return '<div class="card"><div class="row between"><h2>' + p[1] + '</h2><span class="pill ' + p[2] + '">' + xs.length + '</span></div><div class="list">' + (xs.length ? xs.map(function (r) {
      var s = r.strat && strat(r.strat);
      return '<div class="li"><span class="grow">' + esc(r.text) + (s ? '<br><span class="who">For ' + esc(s.name) + "</span>" : "") + (r.flag ? '<br><span class="pill warn">Check: ' + esc(r.flag) + "</span>" : "") + "</span>" + (r.flag && ed ? '<button class="btn ghost sm" data-act="koreqok" data-v="' + r.id + '">Checked</button>' : "") + (ed && D.isStaff() ? '<button class="xbtn" data-act="koreqdel" data-v="' + r.id + '" aria-label="Delete requirement">×</button>' : "") + "</div>";
    }).join("") : '<p class="small mute">None yet.</p>') + "</div></div>";
  }).join("");
  var add = ed ? '<div class="card"><h2>Add a requirement</h2><div class="field"><label for="ko-rt">Requirement</label><input id="ko-rt" placeholder="Climb in under 10 s"></div><div class="formgrid"><div class="field"><label for="ko-rp">Priority</label><select id="ko-rp">' + PRIO.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + "</option>"; }).join("") + '</select></div><div class="field"><label for="ko-rs">For strategy (optional)</label><select id="ko-rs"><option value="">Any strategy</option>' + k.strategies.map(function (s) { return '<option value="' + s.id + '"' + (k.decision && k.decision.chosen === s.id ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("") + '</select></div></div><div class="row"><button class="btn primary" data-act="koreqadd">Add</button></div></div>' : "";
  return '<p class="flowhint">Turn the chosen strategy into things the robot must, should or could do. Mechanisms are scored on how well they fit these.</p><div class="grid3">' + groups + "</div>" + add;
};

VIEW.mechanisms = function () {
  var k = K(), ed = live();
  return '<p class="flowhint">For each robot function, add candidates, prototype them and score them on the mechanism criteria. A mentor presses <b>Choose</b> on the winner.</p>' + k.fns.map(function (f) {
    var ch = f.chosen && mechOf(f, f.chosen), rows = matrix("mechanism", f.mechs), wt = {};
    rows.forEach(function (r) { wt[r.t.id] = r.weighted; });
    return '<div class="card"><div class="row between"><h2>' + esc(f.name) + "</h2>" + (ch ? '<span class="pill ok">Chosen: ' + esc(ch.name) + "</span>" : '<span class="pill">Not chosen yet</span>') + '</div><div class="grid3">' + f.mechs.map(function (m) {
      return '<button class="card flat tight kmech' + (m.status === "rejected" ? " out" : "") + '" data-act="komech" data-f="' + f.id + '" data-v="' + m.id + '"><div class="row between nowrap"><b class="kname">' + esc(m.name) + '</b><span class="pill ' + MSTAT[m.status][1] + '">' + MSTAT[m.status][0] + '</span></div><span class="small">' + esc(m.desc) + '</span><span class="small"><b style="color:var(--ok)">+</b> ' + esc(m.pros) + '</span><span class="small"><b style="color:var(--bad)">−</b> ' + esc(m.cons) + '</span><span class="row between who"><span>' + (m.links.length ? m.links.length + " link" + (m.links.length === 1 ? "" : "s") : "") + '</span><span class="num">' + (wt[m.id] == null ? "Not scored" : wt[m.id].toFixed(2) + " / 5") + "</span></span></button>";
    }).join("") + "</div>" +
      "<div>" + fold(f.id, "Compare scores") + (k.open[f.id] ? matrixTable("mechanism", f.mechs, null) : "") + "</div>" +
      (ed ? '<div><button class="btn sm" data-act="komadd" data-f="' + f.id + '">' + D.ic("plus", 16) + " Add a candidate</button></div>" : "") + "</div>";
  }).join("") + (ed ? '<div class="card"><h2>Add a robot function</h2><div class="row nowrap"><input class="inp" id="ko-fn" placeholder="Indexer, climber, …" aria-label="Function name"><button class="btn primary" data-act="kofnadd">Add</button></div></div>' : "");
};
D.drawers.komech = function (d) {
  var f = fn(d.f), m = mechOf(f, d.v), ed = live(), row = matrix("mechanism", [m])[0], chosen = f.chosen === m.id;
  return D.drawerHead(f.name, m.name) +
    '<div class="row"><span class="pill ' + MSTAT[m.status][1] + '">' + MSTAT[m.status][0] + "</span>" + (ed ? '<select class="chipsel" data-change="komstatus" data-f="' + f.id + '" data-v="' + m.id + '" aria-label="Status">' + ["idea", "prototyping", "rejected"].concat(chosen ? ["chosen"] : []).map(function (s) { return '<option value="' + s + '"' + (m.status === s ? " selected" : "") + ">" + MSTAT[s][0] + "</option>"; }).join("") + "</select>" : "") + '<span class="who">Weighted ' + (row.weighted == null ? "–" : row.weighted.toFixed(2) + " / 5") + " · " + row.raters + " raters</span></div>" +
    "<p>" + esc(m.desc) + '</p><div class="grid2"><div class="card flat tight"><span class="flabel">Pros</span><span>' + esc(m.pros) + '</span></div><div class="card flat tight"><span class="flabel">Cons</span><span>' + esc(m.cons) + "</span></div></div>" +
    '<div><p class="flabel">Links</p><div class="list">' + (linkList(m.links) || '<p class="small mute">Onshape, videos, reference robots on The Blue Alliance.</p>') + "</div>" +
    (ed ? '<div class="formgrid" style="margin-top:8px"><div class="field"><label for="ko-ll">Label</label><input id="ko-ll" placeholder="Intake CAD"></div><div class="field"><label for="ko-lu">Link</label><input id="ko-lu" placeholder="https://cad.onshape.com/…"></div></div><div class="row" style="margin-top:8px"><button class="btn sm" data-act="kolink" data-f="' + f.id + '" data-v="' + m.id + '">Add link</button></div>' : "") + "</div>" +
    (ed ? '<div><p class="flabel">Your scores</p>' + scoreForm("mechanism", m.id) + "</div>" : "") +
    (canDecide() ? '<div class="row">' + (chosen ? '<span class="pill ok">✓ Chosen for ' + esc(f.name) + '</span><button class="btn sm" data-act="kounchoose" data-f="' + f.id + '">Undo choice</button>' : '<button class="btn primary" data-act="kochoose" data-f="' + f.id + '" data-v="' + m.id + '">Choose for ' + esc(f.name) + "</button>") + "</div>" : chosen ? '<span class="pill ok">✓ Chosen for ' + esc(f.name) + "</span>" : '<p class="small mute">Mentors choose the winner.</p>');
};
D.drawers.komadd = function (d) {
  var f = fn(d.f);
  return D.drawerHead(f.name, "Add a candidate") + '<div class="field"><label for="ko-mn">Name</label><input id="ko-mn" placeholder="Over-the-bumper roller"></div><div class="field"><label for="ko-md">Description</label><textarea id="ko-md" rows="3"></textarea></div><div class="grid2"><div class="field"><label for="ko-mp">Pros</label><textarea id="ko-mp" rows="2"></textarea></div><div class="field"><label for="ko-mc">Cons</label><textarea id="ko-mc" rows="2"></textarea></div></div><div class="row"><button class="btn primary" data-act="komsave" data-f="' + f.id + '">Add</button><button class="btn" data-act="closedrawer">Cancel</button></div>';
};

function planMarkdown() {
  var k = K(), out = ["# Build plan: " + k.game + " (" + k.year + ")", ""];
  if (k.example) out.push("> Example game: made up for practice, not a real FRC game.", "");
  out.push("## Strategy", "");
  var s = k.decision && strat(k.decision.chosen);
  if (s) { out.push("Chosen strategy: **" + s.name + "**"); if (k.decision.note) out.push("", k.decision.note); } else out.push("_No strategy decided yet._");
  out.push("", "## Requirements", "");
  PRIO.forEach(function (p) { k.reqs.filter(function (r) { return r.prio === p[0]; }).forEach(function (r) { out.push("- **" + p[0].toUpperCase() + ":** " + r.text); }); });
  out.push("", "## Mechanisms and starter tasks", "");
  k.fns.forEach(function (f) {
    var m = f.chosen && mechOf(f, f.chosen);
    out.push("### " + f.name, "");
    if (!m) { out.push("_No mechanism chosen yet._", ""); return; }
    out.push("Chosen: **" + m.name + "**", "", m.desc);
    m.links.forEach(function (l) { out.push("- [" + l.label + "](" + l.url + ")"); });
    out.push("");
    ["Prototype", "CAD", "Build", "Test"].forEach(function (t) { out.push("- [ ] " + t + ": " + f.name + " (" + m.name + ")"); });
    out.push("");
  });
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
VIEW["export"] = function () {
  var k = K(), done = k.fns.filter(function (f) { return f.chosen; }).length;
  return '<div class="grid4">' + kpi(k.decision ? "✓" : "–", k.decision ? "strategy decided" : "no strategy yet") + kpi(k.reqs.length, "requirements") + kpi(done + " / " + k.fns.length, "mechanisms chosen") + kpi(done * 4, "starter tasks") + "</div>" +
    (k.decision ? "" : '<p class="hint">No strategy decided yet. A mentor closes the vote on <button class="linkbtn" data-act="tab" data-app="kickoff" data-v="decide">Decide</button>.</p>') +
    '<div class="card"><div class="row between"><h2>Build plan</h2><div class="row"><button class="btn sm" data-act="kocopyplan">Copy</button><button class="btn sm" data-act="kodlplan">Download .md</button><button class="btn primary sm" data-act="go" data-v="tasks">Open Task App</button></div></div><pre class="kpre">' + esc(planMarkdown()) + '</pre><p class="small mute">Paste it into the Task App. Each chosen mechanism gets four starter tasks: prototype, CAD, build, test. A direct “Create in Task App” button comes later.</p></div>';
};

VIEW.research = function () {
  var k = K(), ed = live(), pend = k.sugs.filter(function (s) { return s.state === "pending"; }), done = k.sugs.filter(function (s) { return s.state !== "pending"; });
  var chat = '<div class="card"><div class="row between"><h2>Research assistant</h2><span class="pill">Rule library only</span></div><div class="chat">' + k.chat.map(function (m) { return '<div class="bubble ' + (m.me ? "me" : "ai") + '">' + esc(m.text) + (m.cite ? '<br><span class="who">' + esc(m.cite) + "</span>" : "") + "</div>"; }).join("") + "</div>" +
    '<div class="row nowrap"><input class="inp" id="ko-ask" placeholder="How many orbs can a robot hold?" aria-label="Ask the assistant"><button class="btn primary" data-act="koask">Ask</button></div><p class="small mute">In the real app you can also select text on any page and right-click → Ask AI. Answers in this demo are canned.</p></div>';
  var sugs = '<div class="card"><div class="row between"><h2>Suggestions from new rule versions</h2><span class="pill ' + (pend.length ? "gold" : "ok") + '">' + pend.length + ' to review</span></div><p class="small mute">The assistant compares each new manual version with the last one and drafts changes. Nothing changes until someone accepts.</p><div class="list">' +
    (pend.length ? pend.map(function (s) {
      var i = k.sugs.indexOf(s);
      return '<div class="li" style="align-items:flex-start"><span class="pill ' + SUGKIND[s.kind][1] + '">' + SUGKIND[s.kind][0] + '</span><span class="grow"><b>' + esc(s.title) + "</b>" + md(s.body) + (s.next ? '<span class="flabel">New text</span><pre class="kpre">' + esc(s.next) + "</pre>" : "") + "</span>" + (ed ? '<span class="row"><button class="btn primary sm" data-act="kosug" data-i="' + i + '" data-v="accepted">' + (s.kind === "summary" ? "Got it" : "Accept") + '</button><button class="btn ghost sm" data-act="kosug" data-i="' + i + '" data-v="dismissed">Dismiss</button></span>' : "") + "</div>";
    }).join("") : '<div class="empty">All caught up.</div>') + "</div>" +
    (done.length ? '<p class="who">' + done.map(function (s) { return esc(s.title) + " · " + s.state; }).join("<br>") + "</p>" : "") + "</div>";
  var lib = '<div class="card"><div class="row between"><h2>Rule library</h2>' + (ed ? '<button class="btn sm" data-act="koupload">Upload PDF</button>' : "") + '</div><div class="list">' + k.docs.map(function (d) { return '<div class="li"><span class="pill">' + esc(d.kind) + '</span><span class="grow"><b>' + esc(d.title) + '</b><br><span class="who">' + d.versions.map(function (v) { return v[0] + " · " + v[1] + " · " + v[2] + " pages"; }).join(" — ") + "</span></span></div>"; }).join("") + '</div><p class="small mute">The assistant searches only these documents, plus past games for comparison.</p></div>';
  var src = '<div class="card"><h2>Watched sources</h2><div class="list">' + k.sources.map(function (s, i) { return '<div class="li"><span class="grow"><b>' + esc(s.name) + '</b><br><span class="who mono">' + esc(s.url) + "</span><br><span class=\"who\">Checked " + esc(s.checked) + " · " + esc(s.note) + "</span></span>" + (ed ? '<button class="btn sm" data-act="kocheck" data-i="' + i + '">Check now</button>' : "") + "</div>"; }).join("") + "</div></div>";
  return '<div class="grid2">' + chat + sugs + "</div>" + '<div class="grid2">' + lib + src + "</div>";
};

VIEW.activity = function () {
  return '<div class="card"><div class="row between"><h2>Activity</h2><span class="small mute">Who changed what in this season</span></div><div class="list">' + K().activity.map(function (a) { return '<div class="li"><span class="grow"><b>' + esc(a.who) + "</b> " + esc(a.what) + '</span><span class="who">' + esc(a.when) + "</span></div>"; }).join("") + "</div></div>";
};

VIEW.settings = function () {
  var k = K(), p = k.phases;
  function critCard(scope) {
    return '<div class="card"><h2>' + (scope === "strategy" ? "Strategy" : "Mechanism") + ' criteria</h2><div class="tablewrap"><table><thead><tr><th>Criterion</th><th>Weight</th><th>Lower is better</th><th></th></tr></thead><tbody>' + crit(scope).map(function (c) {
      return "<tr><td><b>" + esc(c.name) + '</b></td><td><input class="inp num" style="width:64px" id="kcw-' + c.id + '" inputmode="numeric" data-change="kocw" data-v="' + c.id + '" value="' + c.w + '" aria-label="Weight of ' + esc(c.name) + '"></td><td><button class="toggle" data-act="kocinv" data-v="' + c.id + '" aria-pressed="' + c.inv + '" aria-label="Lower is better for ' + esc(c.name) + '"></button></td><td><button class="xbtn" data-act="kocdel" data-v="' + c.id + '" aria-label="Delete ' + esc(c.name) + '">×</button></td></tr>';
    }).join("") + '</tbody></table></div><div class="row nowrap"><input class="inp" id="kc-' + scope + '" placeholder="New criterion" aria-label="New ' + scope + ' criterion"><button class="btn sm" data-act="kocadd" data-v="' + scope + '">Add</button></div></div>';
  }
  return '<div class="grid2"><div class="card"><h2>Season</h2><div class="formgrid"><div class="field"><label for="ks-year">Year</label><input id="ks-year" inputmode="numeric" data-change="koset" data-f="year" value="' + k.year + '"></div><div class="field"><label for="ks-game">Game name</label><input id="ks-game" data-change="koset" data-f="game" value="' + esc(k.game) + '"></div>' +
    '<div class="field"><label for="ks-status">Status</label><select id="ks-status" data-change="koset" data-f="status">' + ["draft", "active", "archived"].map(function (s) { return "<option" + (k.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + '</select></div><div class="field"><label for="ks-vote">Vote type</label><select id="ks-vote" data-change="koset" data-f="voteMode"><option value="ranked"' + (k.voteMode === "ranked" ? " selected" : "") + '>Ranked choice</option><option value="approval"' + (k.voteMode === "approval" ? " selected" : "") + ">Approval</option></select></div></div>" +
    '<p class="small mute">Archive the season at the end of the year: it becomes read-only. Changing the vote type clears the votes.</p></div>' +
    '<div class="card"><h2>Match</h2><div class="formgrid">' + PH.map(function (ph) { return '<div class="field"><label for="ks-' + ph + '">' + PHN[ph] + ' seconds</label><input id="ks-' + ph + '" inputmode="numeric" data-change="kophase" data-f="' + ph + '" value="' + p[ph] + '"></div>'; }).join("") + "</div>" + strip([], true) +
    '<div class="list">' + k.segments.map(function (g) { return '<div class="li"><span class="pill ' + ({ closed: "bad", info: "info", open: "" })[g.k] + '">' + g.k + '</span><span class="grow">' + esc(g.name) + '</span><span class="who num">' + g.s + "–" + g.e + " s</span></div>"; }).join("") + '</div><p class="small mute">Phases don\'t overlap: teleop is the part before the endgame. Segments mark where scoring is closed; strategies get a warning when a scoring block lands in one.</p></div></div>' +
    '<div class="grid2">' + critCard("strategy") + critCard("mechanism") + "</div>" +
    '<div class="card"><div class="row between"><h2>AI assistant (all seasons)</h2><span class="pill ok">On</span></div><p class="small mute">Model, monthly budget and the watched sources. Students can ask; only the rule library and past games are searched. $3.10 of $20 used this month.</p></div>';
};

/* ---------- Projector ---------- */
D.views.kproj = function () {
  if (D.S.role !== "display" && !D.inGroup("kickoff")) return D.denied("Kickoff projector");
  var k = K(), rows = k.strategies.filter(function (s) { return s.status !== "dropped"; }).map(function (s) { return { s: s, p: points(s.blocks) }; }).sort(function (a, b) { return b.p.total - a.p.total; });
  var max = Math.max.apply(null, rows.map(function (r) { return r.p.total; }).concat([1])), t = tally(), tmax = Math.max.apply(null, t.rows.map(function (r) { return r.score; }).concat([1]));
  return '<div class="display">' + (D.S.role !== "display" ? '<div><button class="btn sm" data-act="go" data-v="kickoff">← Back to Kickoff</button></div>' : "") +
    '<div><p class="dmute">kickoff.2972robotics.com/projector · read-only · refreshes every 5 s</p><h1>' + k.year + ": " + esc(k.game) + (k.example ? ' <span style="font-size:.5em;color:#f0b43c">example game</span>' : "") + "</h1></div>" +
    '<div class="grid2"><div class="dcard"><h2 style="font-size:1.6rem">Expected points per match</h2>' + rows.map(function (r) {
      return '<div style="display:grid;gap:6px"><div class="row between nowrap"><b style="font-size:1.3rem">' + esc(r.s.name) + (k.decision && k.decision.chosen === r.s.id ? " ✓" : "") + '</b><span class="big" style="font-size:2.2rem">' + r.p.total + '</span></div><div class="kstack" style="height:18px">' + PH.map(function (ph) { return r.p[ph] ? '<i class="' + PHC[ph] + '" style="width:' + r.p[ph] / max * 100 + '%"></i>' : ""; }).join("") + '</div><span class="dmute">Auto ' + r.p.auto + " · Teleop " + r.p.teleop + " · Endgame " + r.p.endgame + (r.p.rp ? " · " + r.p.rp + " RP" : "") + "</span></div>";
    }).join("") + "</div>" +
    '<div class="dcard"><h2 style="font-size:1.6rem">Vote ' + (k.decision ? "(closed)" : "(open)") + '</h2><p class="dmute">' + t.voters + " people voted · " + (k.voteMode === "ranked" ? "ranked choice" : "approval") + "</p>" + t.rows.map(function (r) {
      return '<div style="display:grid;gap:6px"><div class="row between nowrap"><b style="font-size:1.3rem">' + esc(r.s.name) + '</b><span style="font-size:1.4rem;font-weight:700">' + r.score + '</span></div><div class="kstack" style="height:14px"><i class="pt" style="width:' + r.score / tmax * 100 + '%"></i></div></div>';
    }).join("") + (k.decision ? '<p style="font-size:1.4rem;margin-top:8px">Decided: <b>' + esc((strat(k.decision.chosen) || {}).name || "") + "</b></p>" : "") + "</div></div></div>";
};

/* ---------- Actions ---------- */
var A = D.acts;
function done(msg) { if (msg) D.toast(msg); D.render(); }
A.kosec = function (b) { D.openDrawer("kosec", { i: +b.dataset.i }); };
D.drawers.kosec = function (d) {
  var s = K().sections[d.i];
  return D.drawerHead("Rules summary", s.title) + '<div class="field"><label for="ko-body">Summary (Markdown)</label><textarea id="ko-body" rows="12">' + esc(s.body) + '</textarea></div><p class="small mute">**bold**, *italic*, and lines starting with “- ” for lists.</p><div class="row"><button class="btn primary" data-act="kosecsave" data-i="' + d.i + '">Save</button><button class="btn" data-act="closedrawer">Cancel</button></div>';
};
A.kosecsave = function (b) { var s = K().sections[+b.dataset.i]; s.body = D.val("ko-body"); s.by = D.me().name; s.when = "Just now"; log("edited rules: " + s.title); D.S.drawer = null; done("Saved."); };
A.koq = function (b) { D.openDrawer("koq", { i: +b.dataset.i }); };
D.drawers.koq = function (d) {
  var q = K().questions[d.i];
  return D.drawerHead("Rule question", q.text) + '<div class="field"><label for="ko-qa">Answer</label><textarea id="ko-qa" rows="4">' + esc(q.answer) + '</textarea></div><div class="field"><label for="ko-qs">Source</label><input id="ko-qs" value="' + esc(q.source) + '" placeholder="Team Update 3, Q&amp;A #12"></div><div class="row"><button class="btn primary" data-act="koqsave" data-i="' + d.i + '">Save</button><button class="btn" data-act="closedrawer">Cancel</button></div>';
};
A.koqsave = function (b) { var q = K().questions[+b.dataset.i]; q.answer = D.val("ko-qa").trim(); q.source = D.val("ko-qs").trim(); if (q.answer) log("answered “" + q.text + "”"); D.S.drawer = null; done("Saved."); };
A.koqadd = function () { var t = D.val("ko-q").trim(); if (!t) return; K().questions.push({ text: t, answer: "", source: "", by: D.me().name }); log("asked “" + t + "”"); done("Question added."); };
A.koact = function (b) { D.openDrawer("koact", { i: +b.dataset.i }); };
D.drawers.koact = function (d) {
  var a = K().actions[d.i];
  return D.drawerHead("Scoring action", a.name) + '<div class="field"><label for="ko-en">Action</label><input id="ko-en" value="' + esc(a.name) + '"></div><div class="formgrid"><div class="field"><label for="ko-eph">Phase</label><select id="ko-eph">' + PH.map(function (ph) { return '<option value="' + ph + '"' + (a.phase === ph ? " selected" : "") + ">" + PHN[ph] + "</option>"; }).join("") + '</select></div><div class="field"><label for="ko-ept">Points</label><input id="ko-ept" inputmode="decimal" value="' + a.points + '"></div><div class="field"><label for="ko-erp">Ranking points</label><input id="ko-erp" inputmode="numeric" value="' + a.rp + '"></div></div><div class="field"><label for="ko-eno">Notes</label><input id="ko-eno" value="' + esc(a.notes) + '"></div>' +
    '<div class="row"><button class="btn primary" data-act="koactsave" data-i="' + d.i + '">Save</button><button class="btn" data-act="closedrawer">Cancel</button>' + (D.isStaff() ? '<button class="btn danger" data-act="koactdel" data-i="' + d.i + '">Delete</button>' : "") + '</div><p class="small mute">Strategies that use it update at once.</p>';
};
function readAction(p) { return { name: D.val(p + "n").trim(), phase: D.val(p + "ph"), points: parseFloat(D.val(p + "pt")) || 0, rp: parseInt(D.val(p + "rp"), 10) || 0, notes: D.val(p + "no").trim() }; }
A.koactadd = function () { var a = readAction("ko-a"); if (!a.name) { done("Name the action first."); return; } a.id = nid("a"); K().actions.push(a); log("added scoring action “" + a.name + "”"); done("Added."); };
A.koactsave = function (b) { var a = K().actions[+b.dataset.i], x = readAction("ko-e"); if (!x.name) return; Object.keys(x).forEach(function (f) { a[f] = x[f]; }); log("edited scoring action “" + a.name + "”"); D.S.drawer = null; done("Saved."); };
A.koactdel = function (b) {
  var k = K(), i = +b.dataset.i, a = k.actions[i];
  D.S.drawer = null;
  D.withUndo("Deleted “" + a.name + "”. Blocks that scored it now score nothing.", function () { k.actions.splice(i, 1); }, function () { k.actions.splice(i, 0, a); });
};
A.kofold = function (b) { var o = K().open; o[b.dataset.v] = !o[b.dataset.v]; D.render(); };
A.koview = function (b) { K().view = b.dataset.v; D.render(); };
D.changes.kostatus = function (el) { var s = strat(el.dataset.v); s.status = el.value; log("moved “" + s.name + "” to " + SSTAT.filter(function (c) { return c[0] === el.value; })[0][1]); D.render(); };
A.kostrat = function (b) { D.openDrawer("kostrat", { id: b.dataset.v }); };
A.kogodecide = function () { D.S.tabs.kickoff = "decide"; D.S.drawer = null; D.render(); };
function draftFrom(s, copy) { return { id: copy ? null : s.id, from: copy ? s.name : s.from, name: copy ? s.name + " (copy)" : s.name, desc: s.desc, needs: s.needs, blocks: s.blocks.map(function (b) { return { id: nid("b"), l: b.l, s: b.s, d: b.d, a: b.a, n: b.n }; }) }; }
A.konew = function () { K().draft = { id: null, from: null, name: "", desc: "", needs: "", blocks: blocks([["Leave zone", 0, 3, "leave"]]) }; D.openDrawer("koedit"); };
A.koedit = function (b) { K().draft = draftFrom(strat(b.dataset.v)); D.openDrawer("koedit"); };
A.kocopy = function (b) { K().draft = draftFrom(strat(b.dataset.v), true); D.openDrawer("koedit"); };
D.inputs.kodraft = function (el) { var d = K().draft; if (d) d[el.dataset.f] = el.value; };
D.inputs.kobk = function (el) {
  var d = K().draft; if (!d) return;
  var b = d.blocks[+el.dataset.i], f = el.dataset.f;
  if (f === "l") { b.l = el.value; return; }
  var v = parseInt(el.value, 10); if (isNaN(v)) return;
  b[f] = f === "d" ? Math.max(1, v) : Math.max(0, v); D.render();
};
D.changes.kobk = function (el) { var b = K().draft.blocks[+el.dataset.i]; b.a = el.value || null; b.n = b.a ? Math.max(1, b.n || 1) : 0; if (b.a && !b.l) b.l = act(b.a).name; D.render(); };
A.kobadd = function () { var d = K().draft, end = d.blocks.reduce(function (m, b) { return Math.max(m, b.s + b.d); }, 0); d.blocks.push({ id: nid("b"), l: "", s: Math.min(end, matchLen() - 5), d: 5, a: null, n: 0 }); D.render(); };
A.kobdel = function (b) { K().draft.blocks.splice(+b.dataset.i, 1); D.render(); };
A.kobsort = function () { K().draft.blocks.sort(function (a, b) { return a.s - b.s; }); D.render(); };
A.kosave = function () {
  var k = K(), d = k.draft; d.name = (d.name || "").trim();
  if (!d.name) { D.toast("Name the strategy first."); D.render(); return; }
  d.blocks.sort(function (a, b) { return a.s - b.s; });
  if (d.id) { var s = strat(d.id); s.name = d.name; s.desc = d.desc; s.needs = d.needs; s.blocks = d.blocks; s.by = D.me().name; s.when = "Just now"; log("edited strategy “" + s.name + "”"); }
  else { k.strategies.push({ id: nid("s"), name: d.name, desc: d.desc, needs: d.needs, blocks: d.blocks, status: "idea", by: D.me().name, when: "Just now", from: d.from, comments: [], links: [] }); log("added strategy “" + d.name + "”"); }
  k.draft = null; D.S.drawer = null; done("Saved. " + points(d.blocks).total + " points per match.");
};
A.kodelstrat = function (b) {
  var k = K(), i = k.strategies.indexOf(strat(b.dataset.v)), s = k.strategies[i];
  D.S.drawer = null;
  D.withUndo("Deleted “" + s.name + "” with its timeline, scores and votes.", function () { k.strategies.splice(i, 1); log("deleted strategy “" + s.name + "”"); }, function () { k.strategies.splice(i, 0, s); });
};
A.kocomment = function (b) { var t = D.val("ko-cm").trim(); if (!t) return; var s = strat(b.dataset.v); s.comments.push({ who: D.me().name, text: t, when: "Just now" }); log("commented on “" + s.name + "”"); D.render(); };
A.korate = function (b) {
  var k = K(), key = b.dataset.t + "|" + b.dataset.c, me = D.me().name, r = k.ratings[key] = k.ratings[key] || {}, v = +b.dataset.v;
  if (r[me] === v) delete r[me]; else r[me] = v;
  D.render();
};
A.kovote = function () {
  var k = K(), me = D.me().name, ballot = {}, used = {}, dup = false;
  k.strategies.forEach(function (s) {
    var el = document.getElementById("kv-" + s.id); if (!el) return;
    if (k.voteMode === "approval") { if (el.checked) ballot[s.id] = true; }
    else if (el.value) { var r = +el.value; if (used[r]) dup = true; used[r] = 1; ballot[s.id] = r; }
  });
  if (dup) { done("Use each rank only once."); return; }
  if (!Object.keys(ballot).length) { delete k.votes[me]; done("Vote cleared."); return; }
  var had = !!k.votes[me]; k.votes[me] = ballot; if (!had) log("voted on the strategy"); done(had ? "Vote updated." : "Vote saved.");
};
A.koclose = function () {
  var k = K(), s = strat(D.val("ko-chosen"));
  k.decision = { chosen: s.id, note: D.val("ko-note").trim(), by: D.me().name, when: "Just now" };
  log("closed the vote: chose " + s.name); D.notify(["student", "mentor", "admin"].filter(function (r) { return r !== D.S.role; }), "kickoff", D.me().name + " closed the strategy vote: " + s.name + ".");
  done("Decision recorded.");
};
A.koreopen = function () { K().decision = null; log("reopened the strategy vote"); done("Vote reopened. Scores and votes unlock."); };
A.koreqadd = function () { var t = D.val("ko-rt").trim(); if (!t) return; K().reqs.push({ id: nid("r"), text: t, prio: D.val("ko-rp"), strat: D.val("ko-rs") || null }); log("added requirement “" + t + "”"); done("Added."); };
A.koreqdel = function (b) { var k = K(), i = k.reqs.map(function (r) { return r.id; }).indexOf(b.dataset.v), r = k.reqs[i]; D.withUndo("Requirement deleted.", function () { k.reqs.splice(i, 1); }, function () { k.reqs.splice(i, 0, r); }); };
A.koreqok = function (b) { K().reqs.filter(function (r) { return r.id === b.dataset.v; })[0].flag = null; D.render(); };
A.komech = function (b) { D.openDrawer("komech", { f: b.dataset.f, v: b.dataset.v }); };
A.komadd = function (b) { D.openDrawer("komadd", { f: b.dataset.f }); };
A.komsave = function (b) { var n = D.val("ko-mn").trim(); if (!n) return; fn(b.dataset.f).mechs.push(mech(n, D.val("ko-md").trim(), D.val("ko-mp").trim(), D.val("ko-mc").trim(), "idea")); log("added mechanism “" + n + "”"); D.S.drawer = null; done("Added."); };
D.changes.komstatus = function (el) { var f = fn(el.dataset.f), m = mechOf(f, el.dataset.v); m.status = el.value; if (f.chosen === m.id && el.value !== "chosen") f.chosen = null; D.render(); };
A.kochoose = function (b) {
  var f = fn(b.dataset.f), m = mechOf(f, b.dataset.v);
  f.mechs.forEach(function (x) { if (x.status === "chosen") x.status = "prototyping"; });
  m.status = "chosen"; f.chosen = m.id; log("chose " + m.name + " for " + f.name); done("Chose " + m.name + ".");
};
A.kounchoose = function (b) { var f = fn(b.dataset.f), m = mechOf(f, f.chosen); if (m) m.status = "prototyping"; f.chosen = null; D.render(); };
A.kolink = function (b) { var u = D.val("ko-lu").trim(); if (!u) return; var kind = /onshape/.test(u) ? "onshape" : /youtu/.test(u) ? "video" : /thebluealliance/.test(u) ? "tba" : "other"; mechOf(fn(b.dataset.f), b.dataset.v).links.push({ kind: kind, label: D.val("ko-ll").trim() || u, url: u }); D.render(); };
A.kofnadd = function () { var n = D.val("ko-fn").trim(); if (!n) return; K().fns.push({ id: nid("f"), name: n, chosen: null, mechs: [] }); log("added robot function “" + n + "”"); done("Added."); };
A.kocopyplan = function () { try { navigator.clipboard.writeText(planMarkdown()); done("Copied. Paste it into the Task App."); } catch (e) { done("Select the text and copy it."); } };
A.kodlplan = function () {
  var k = K(), a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([planMarkdown()], { type: "text/markdown" }));
  a.download = "build-plan-" + k.year + "-" + k.game.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".md";
  document.body.appendChild(a); a.click(); a.remove();
};
A.kosug = function (b) {
  var k = K(), s = k.sugs[+b.dataset.i], ok = b.dataset.v === "accepted";
  s.state = b.dataset.v;
  if (ok && s.kind === "section_edit") { var x = k.sections[s.target]; x.body = s.next; x.by = "Research assistant (accepted by " + D.me().name + ")"; x.when = "Just now"; }
  if (ok && s.kind === "question_answer") { var q = k.questions[s.target]; q.answer = s.body; q.source = s.source; }
  if (ok && s.kind === "requirement_flag") k.reqs.filter(function (r) { return r.id === s.target; })[0].flag = s.body;
  if (s.kind !== "summary") log((ok ? "accepted" : "dismissed") + " a suggestion: " + s.title);
  done(ok ? (s.kind === "summary" ? "" : "Accepted. The change is live.") : "Dismissed.");
};
var REPLIES = [
  [/orb|hold|carry/i, "A robot may hold at most three orbs at a time. Manual v2 raised it from two.", "G101 · Game manual v2, page 2"],
  [/hang|climb|rp|ranking/i, "One hanging robot at the buzzer earns the Hang RP for the alliance. Hanging is only allowed in the endgame.", "Example Team Update 1 · Example Q&A #1"],
  [/height|tall|size|extension|perimeter/i, "30 in at the start, 48 in during the match, and at most 12 in of extension beyond the frame perimeter.", "R101–R103 · Game manual v2, page 3"],
  [/foul|penalt/i, "A minor foul gives the other alliance 3 points; a major foul gives 8.", "G201 · Game manual v2, page 4"]
];
A.koask = function () {
  var q = D.val("ko-ask").trim(); if (!q) return;
  var r = REPLIES.filter(function (x) { return x[0].test(q); })[0];
  K().chat.push({ me: true, text: q, cite: "" }, r ? { me: false, text: r[1], cite: r[2] } : { me: false, text: "I couldn't find that in the rule library. Try other words, or add it to Rule questions on the Game page.", cite: "" });
  D.render(); var el = document.getElementById("ko-ask"); if (el) { el.value = ""; el.focus(); }
};
A.koupload = function () { done("In the real app the PDF is stored, split into passages and searched by the assistant."); };
A.kocheck = function (b) { var s = K().sources[+b.dataset.i]; s.checked = "Just now"; s.note = "No change"; done("Checked " + s.name + ". Nothing new."); };
D.changes.koset = function (el) {
  var k = K(), f = el.dataset.f;
  if (f === "year") { var y = parseInt(el.value, 10); if (y) k.year = y; }
  else if (f === "voteMode") { if (k.voteMode !== el.value) { k.voteMode = el.value; k.votes = {}; D.toast("Vote type changed. Votes cleared."); } }
  else k[f] = f === "game" ? el.value.trim() || k.game : el.value;
  D.render();
};
D.changes.kophase = function (el) { var v = parseInt(el.value, 10); if (v >= 0) K().phases[el.dataset.f] = v; D.render(); };
D.changes.kocw = function (el) { var v = parseFloat(el.value); K().criteria.filter(function (c) { return c.id === el.dataset.v; })[0].w = isNaN(v) ? 0 : Math.max(0, v); D.render(); };
A.kocinv = function (b) { var c = K().criteria.filter(function (c) { return c.id === b.dataset.v; })[0]; c.inv = !c.inv; D.render(); };
A.kocdel = function (b) { var k = K(), i = k.criteria.map(function (c) { return c.id; }).indexOf(b.dataset.v), c = k.criteria[i]; D.withUndo("Deleted “" + c.name + "” and its scores.", function () { k.criteria.splice(i, 1); }, function () { k.criteria.splice(i, 0, c); }); };
A.kocadd = function (b) { var n = D.val("kc-" + b.dataset.v).trim(); if (!n) return; K().criteria.push({ id: nid("c"), scope: b.dataset.v, name: n, w: 1, inv: false }); D.render(); };

var dragStrat = null;
document.addEventListener("dragstart", function (e) { var c = e.target.closest && e.target.closest("[data-kstrat]"); if (!c) return; dragStrat = c.dataset.kstrat; try { e.dataTransfer.setData("text/plain", dragStrat); } catch (x) {} });
document.addEventListener("dragover", function (e) { var c = e.target.closest && e.target.closest("[data-kcol]"); if (c && dragStrat) { e.preventDefault(); c.classList.add("over"); } });
document.addEventListener("dragleave", function (e) { var c = e.target.closest && e.target.closest("[data-kcol]"); if (c) c.classList.remove("over"); });
document.addEventListener("drop", function (e) {
  var c = e.target.closest && e.target.closest("[data-kcol]"); if (!c || !dragStrat) return; e.preventDefault();
  var s = strat(dragStrat); dragStrat = null;
  if (s && s.status !== c.dataset.kcol) { s.status = c.dataset.kcol; log("moved “" + s.name + "” to " + SSTAT.filter(function (x) { return x[0] === s.status; })[0][1]); }
  D.render();
});
document.addEventListener("dragend", function () { dragStrat = null; });

D.inits.push(function (S) {
  seed(S);
  S.notices.push({ to: "student", app: "kickoff", text: "The research assistant has 4 suggestions from game manual v2.", when: "20 h ago", read: false });
  S.notices.push({ to: "mentor", app: "kickoff", text: "5 people voted on the strategy. Close the vote when you're ready.", when: "3 h ago", read: false });
  S.activity.push({ who: "Sam Ortiz", what: "added requirement “Hang reliably”", app: "kickoff", when: "5 h ago" });
});
})();
