/* The calculator kit: everything the FRC calculators in Tools share. A calculator is one D.calc.tool({...}) call in
   its own js/tool-<name>.js file; this file draws the page round it.

   A calculator page ("bench") has four parts:
     stage     a drawing of the mechanism on a canvas, to scale, that can play
     outs      the answers, as a short row of numbers and one plain verdict
     controls  the inputs, grouped, in a column at the right (under the answers on a phone)
     more      charts and "How this is worked out"
   Typing or dragging never redraws the whole page: only the answers, the charts and the canvas change, so the field
   keeps its caret and a slider keeps its thumb. Choosing from a dropdown or a segment does a full redraw, because it
   may change which fields exist.

   See new-apps/briefs/TOOLS_CALC_KIT.md for the contract a calculator follows. Maths lives in js/frc.js. */
(function () {
"use strict";
var esc = D.esc, K = D.calc = {}, TOOLS = {}, RT = {}, CACHE = {}, CHARTS = {};
function S(id) { return D.S.calc[id]; }
function T(id) { return TOOLS[id]; }
function rt(id) { return RT[id] || (RT[id] = { t: 0, playing: false, speed: (TOOLS[id] && TOOLS[id].speed) || 1, open: {}, played: false }); }
K.state = S;
K.result = function (id) { return CACHE[id]; };

/* ---------- Registering a calculator ---------- */
/* def: { id (its route and its row in D.TOOLS), defaults: {key: value}, compute(s) -> r,
     stage: { ratio (width / height, default 16/9), narrow (the same on a phone, default at most 1.5),
              label (what the drawing shows, for screen readers) } or null,
     controls(s, r) -> html, outs(s, r) -> html, more(s, r) -> html (optional),
     draw(g, s, r, t) (optional; t = seconds into the animation),
     duration(s, r) -> seconds (optional; with it the stage gets Play, a speed switch and a scrubber),
     loop: true (the drawing runs until paused: t just keeps counting, and there is no scrubber),
     autoplay: true (starts playing when the page opens, unless the person asked for reduced motion),
     speed: 0.25 (the playback speed it starts at: 1, 0.25 or 0.05),
     tabs: [[value, label], ...] (a row of views above the drawing; the choice is the state key "view"),
     playLabel: "Fire" (or a function of s), hints(s, r) -> { elementId: text } (small derived lines inside the controls),
     pointer(kind, x, y, s, r) -> true when it changed s (kind: "down" | "move" | "up"; x, y in canvas CSS pixels),
     onPick(key, value, s) (after a dropdown or segment changes; use it to apply a preset) } */
K.tool = function (def) {
  TOOLS[def.id] = def;
  D.views[def.id] = function () { return page(def); };
};
D.inits.push(function (St) {
  St.calc = {};
  Object.keys(TOOLS).forEach(function (id) { St.calc[id] = JSON.parse(JSON.stringify(TOOLS[id].defaults || {})); });
  Object.keys(RT).forEach(function (id) { stop(id); }); RT = {}; CACHE = {};
  if (!K.urlDone) { K.urlDone = true; readLink(St); }
});
function compute(id) { var r; try { r = T(id).compute(S(id)); } catch (e) { if (window.console) console.error(e); r = { error: String(e && e.message || e) }; } CACHE[id] = r; return r; }

/* ---------- The page ---------- */
function page(def) {
  if (!D.visibleTools().length) return D.denied("Tools");
  var id = def.id, s = S(id), r = compute(id), tool = D.tool(id), R = rt(id);
  var head = '<div class="pagehead toolhead benchhead"><a class="backlink" href="#tools" data-act="go" data-v="tools"><span aria-hidden="true">‹</span> All tools</a>' +
    '<div class="row between"><h1>' + esc(tool ? tool.name : id) + '</h1><span class="row"><button class="btn sm" data-act="calclink" data-tool="' + id + '" data-tip="Copy a link that opens this calculator with these numbers.">Copy link</button>' +
    '<button class="btn sm ghost" data-act="calcreset" data-tool="' + id + '" data-tip="Put every number back to where it started.">Start over</button></span></div></div>';
  var stage = "";
  if (def.stage) {
    var dur = def.duration && !def.loop ? def.duration(s, r) : 0, moves = def.duration || def.loop;
    stage = '<div class="stagewrap" data-area="stage">' + (def.tabs ? '<div class="benchtabs"><span class="seg" role="group" aria-label="View">' + def.tabs.map(function (o) { return '<button data-act="calcseg"' + attr(id, "view") + ' data-v="' + esc(o[0]) + '" aria-pressed="' + (String(s.view) === String(o[0])) + '">' + esc(o[1]) + "</button>"; }).join("") + "</span></div>" : "") + '<div class="stage" style="--ar:' + (def.stage.ratio || 16 / 9) + ";--arn:" + (def.stage.narrow || Math.min(def.stage.ratio || 16 / 9, 1.5)) + '"><canvas id="calc-cv" data-tool="' + id + '" role="img" aria-label="' + esc(def.stage.label || "Drawing") + '"></canvas></div>' +
      (moves ? '<div class="transport"><button class="btn sm' + (def.loop ? "" : " primary") + '" id="calc-play" data-act="calcplay" data-tool="' + id + '">' + playLabel(def, R) + "</button>" +
        (def.loop ? "" : '<input type="range" id="calc-scrub" class="scrub" min="0" max="' + dur.toFixed(3) + '" step="0.001" value="' + Math.min(R.t, dur).toFixed(3) + '" data-input="calcscrub" data-tool="' + id + '" aria-label="Move through the animation">' +
        '<output id="calc-time" class="num ttime">' + R.t.toFixed(2) + ' s</output>') +
        '<span class="seg" role="group" aria-label="Playback speed">' + [[1, "1×"], [0.25, "¼×"], [0.05, "1/20×"]].map(function (o) { return '<button data-act="calcspeed" data-tool="' + id + '" data-v="' + o[0] + '" aria-pressed="' + (R.speed === o[0]) + '">' + o[1] + "</button>"; }).join("") + "</span></div>" : "") + "</div>";
  }
  return head + '<div class="content bench' + (def.stage ? "" : " nostage") + '" data-calc="' + id + '">' + stage +
    '<div class="benchouts" data-area="outs" id="calc-outs" aria-live="polite">' + safe(def.outs, s, r) + "</div>" +
    '<div class="benchside" data-area="side" data-keepscroll="calcside">' + safe(def.controls, s, r) + "</div>" +
    '<div class="benchmore" data-area="more" id="calc-more">' + (def.more ? safe(def.more, s, r) : "") + "</div></div>";
}
function safe(fn, s, r) { if (r && r.error) return '<p class="warnline">This calculator hit a problem: ' + esc(r.error) + "</p>"; try { return fn(s, r) || ""; } catch (e) { if (window.console) console.error(e); return '<p class="warnline">This part could not be drawn.</p>'; } }
function label(def) { var l = def.playLabel; return (typeof l === "function" ? l(S(def.id)) : l) || "Play"; }
function playLabel(def, R) { return R.playing ? "Pause" : esc(label(def)); }

/* Redraw what depends on the numbers, and nothing else. */
K.refresh = function (id) {
  var def = T(id); if (!def || D.S.route !== id) return;
  var s = S(id), r = compute(id);
  swap("calc-outs", safe(def.outs, s, r));
  if (def.more) swapMore(safe(def.more, s, r));
  if (def.hints && !(r && r.error)) { var h = def.hints(s, r) || {}; Object.keys(h).forEach(function (k) { var el = document.getElementById(k); if (el) el.textContent = h[k]; }); }
  if (def.duration && !def.loop) { var sc = document.getElementById("calc-scrub"), dur = def.duration(s, r); if (sc) sc.max = dur.toFixed(3); if (rt(id).t > dur) rt(id).t = dur; }
  markScroll();
  K.redraw(id);
};
function swap(elId, html) { var el = document.getElementById(elId); if (el) { D.hideTip && D.hideTip(); el.innerHTML = html; } }
/* A table or code block wider than a phone scrolls sideways inside its own box. Say so: the box fades at the edge
   that has more, and a line under it tells the person to swipe. Runs after every draw and on scroll and resize. */
function edges(el) { el.classList.toggle("more-r", el.scrollLeft + el.clientWidth < el.scrollWidth - 3); el.classList.toggle("more-l", el.scrollLeft > 3); }
/* On a phone a table becomes a list: each row is a block, and each cell carries its column's name in front of it.
   The names are copied from the table's own header here; css/calc.css does the rest under 640 px. */
function labelTables() {
  document.querySelectorAll(".bench table").forEach(function (t) {
    var heads = Array.prototype.map.call(t.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
    if (!heads.length) return; t.classList.add("stk");
    t.querySelectorAll("tbody tr").forEach(function (tr) { Array.prototype.forEach.call(tr.children, function (td, i) { if (heads[i]) td.setAttribute("data-l", heads[i]); else td.removeAttribute("data-l"); }); });
  });
}
function markScroll() { labelTables(); document.querySelectorAll(".bench .scroll, .bench .codeout, .bench .ctable").forEach(function (el) { var wide = el.scrollWidth > el.clientWidth + 3; el.classList.toggle("canscroll", wide); if (wide) edges(el); else el.classList.remove("more-r", "more-l"); }); }
D.after.push(markScroll);
window.addEventListener("resize", markScroll);
document.addEventListener("scroll", function (e) { var t = e.target; if (t && t.classList && t.classList.contains("canscroll")) edges(t); }, true);
// The charts and notes: keep any open <details> open across a swap.
function swapMore(html) { var el = document.getElementById("calc-more"); if (!el) return; D.hideTip && D.hideTip(); el.innerHTML = html; restoreOpen(); }
function restoreOpen() { var R = rt(D.S.route); document.querySelectorAll("details[data-open]").forEach(function (d) { if (R.open[d.getAttribute("data-open")]) d.open = true; }); }
document.addEventListener("toggle", function (e) { var d = e.target; if (d && d.getAttribute && d.getAttribute("data-open") && TOOLS[D.S.route]) rt(D.S.route).open[d.getAttribute("data-open")] = d.open; }, true);

/* ---------- Controls ---------- */
function attr(id, key) { return ' data-tool="' + id + '" data-k="' + esc(key) + '"'; }
function tipAttr(o) { return o && o.tip ? ' data-tip="' + esc(o.tip) + '"' : ""; }
function fmtIn(v) { return v == null || v === "" || isNaN(v) ? "" : String(Math.round(v * 1e6) / 1e6); }
/* A number field. o: { unit, min, max, step, slider: true (adds a slider from min to max), tip, hint (a small line
   under it), hintId (an id for a line that hints() fills in) } */
K.num = function (id, key, label, o) {
  o = o || {}; var v = S(id)[key], fid = "c-" + key;
  var lim = (o.min != null ? ' min="' + o.min + '"' : "") + (o.max != null ? ' max="' + o.max + '"' : "") + ' step="' + (o.step || "any") + '"';
  return '<div class="cf"><label for="' + fid + '"' + tipAttr(o) + (o.tip ? ' class="abbr"' : "") + ">" + esc(label) + '</label><span class="cfv"><input id="' + fid + '" type="number" inputmode="decimal" class="inp num"' + lim + ' value="' + fmtIn(v) + '" data-input="calc"' + attr(id, key) + ">" +
    (o.unit ? '<span class="cfu">' + esc(o.unit) + "</span>" : "") + "</span>" +
    (o.slider ? '<input type="range" class="cfs" tabindex="-1" aria-hidden="true" min="' + o.min + '" max="' + o.max + '" step="' + (o.step || (o.max - o.min) / 200) + '" value="' + fmtIn(v) + '" data-input="calc" data-slider="1"' + attr(id, key) + ">" : "") +
    (o.hint ? '<small class="cfh">' + esc(o.hint) + "</small>" : "") + (o.hintId ? '<small class="cfh" id="' + o.hintId + '"></small>' : "") + "</div>";
};
// A dropdown. options: [[value, label], ...]
K.pick = function (id, key, label, options, o) {
  var v = String(S(id)[key]), fid = "c-" + key, long = options.some(function (p) { return String(p[1]).length > 19; });
  return '<div class="cf' + (long ? " stack long" : "") + '"><label for="' + fid + '"' + tipAttr(o) + (o && o.tip ? ' class="abbr"' : "") + ">" + esc(label) + '</label><span class="cfv wide"><select id="' + fid + '" class="inp" data-change="calcpick"' + attr(id, key) + ">" +
    options.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (String(p[0]) === v ? " selected" : "") + ">" + esc(p[1]) + "</option>"; }).join("") + "</select></span>" + (o && o.hint ? '<small class="cfh">' + esc(o.hint) + "</small>" : "") + "</div>";
};
// A segmented choice, for two to four short options.
K.seg = function (id, key, label, options, o) {
  var v = String(S(id)[key]);
  return '<div class="cf stack"><span class="cfl' + (o && o.tip ? " abbr" : "") + '"' + tipAttr(o) + (o && o.tip ? ' tabindex="0"' : "") + ">" + esc(label) + '</span><span class="seg" role="group" aria-label="' + esc(label) + '">' +
    options.map(function (p) { return '<button data-act="calcseg"' + attr(id, key) + ' data-v="' + esc(p[0]) + '" aria-pressed="' + (String(p[0]) === v) + '">' + esc(p[1]) + "</button>"; }).join("") + "</span>" + (o && o.hint ? '<small class="cfh">' + esc(o.hint) + "</small>" : "") + "</div>";
};
K.check = function (id, key, label, o) {
  return '<label class="cf check"' + tipAttr(o) + '><input type="checkbox" data-change="calccheck"' + attr(id, key) + (S(id)[key] ? " checked" : "") + "> <span>" + esc(label) + "</span></label>";
};
// A titled group of fields. closed: true starts it folded (for the numbers most people leave alone).
K.group = function (id, gkey, title, html, closed) {
  var R = rt(id), open = R.open["g-" + gkey] == null ? !closed : R.open["g-" + gkey];
  if (!closed) return '<section class="cg"><h2>' + esc(title) + "</h2>" + html + "</section>";
  return '<details class="cg" data-open="g-' + esc(gkey) + '"' + (open ? " open" : "") + "><summary><h2>" + esc(title) + "</h2></summary>" + html + "</details>";
};
// The motor block nearly every mechanism needs: which motor, how many, the reduction, the current limit.
K.MOTOR_DEFAULTS = { motor: "kraken60", motors: 1, ratio: 10, eff: 90, statorA: 60 };
K.motorFields = function (id, o) {
  o = o || {};
  return K.pick(id, "motor", "Motor", FRC.MOTORS.map(function (m) { return [m.id, m.name]; })) +
    K.num(id, "motors", "Motors", { min: 1, max: 8, step: 1 }) +
    (o.noRatio ? "" : K.num(id, "ratio", o.ratioLabel || "Reduction", { unit: ": 1", min: 0.05, max: o.ratioMax || 300, step: "any", slider: !!o.slider, tip: "Motor turns for one turn of the output. 10 means the output turns ten times slower, with ten times the torque." })) +
    K.num(id, "statorA", "Current limit", { unit: "A", min: 5, max: 200, step: 1, tip: "The stator limit set in the motor controller, for each motor. It caps torque, heat and wheel slip." }) +
    K.num(id, "eff", "Efficiency", { unit: "%", min: 30, max: 100, step: 1, tip: "The share of the motor's torque that survives the gears, belts and bearings. 85 to 95 for a good gearbox." });
};
K.driveOf = function (s, extra) { return FRC.drive(Object.assign({ motor: s.motor, n: s.motors, ratio: s.ratio, eff: s.eff / 100, statorA: s.statorA }, extra || {})); };

function parse(el) { var v = parseFloat(el.value); return isFinite(v) ? v : null; }
D.inputs.calc = function (el) {
  var id = el.dataset.tool, key = el.dataset.k, v = parse(el), field = el.closest(".cf");
  var num = field.querySelector('input[type="number"]'), sl = field.querySelector('input[type="range"]');
  var lo = num.min !== "" ? +num.min : -Infinity, hi = num.max !== "" ? +num.max : Infinity, bad = v == null || v < lo || v > hi;
  field.classList.toggle("bad", bad);
  if (bad) return;                                   // keep the last good number until this one makes sense
  S(id)[key] = v;
  if (el.dataset.slider) num.value = fmtIn(v); else if (sl) sl.value = v;
  K.refresh(id);
};
function picked(id, key, v) { var s = S(id), def = T(id); s[key] = v; if (def.onPick) def.onPick(key, v, s); D.render(); }
D.changes.calcpick = function (el) { var v = el.value; picked(el.dataset.tool, el.dataset.k, /^-?\d+(\.\d+)?$/.test(v) && typeof S(el.dataset.tool)[el.dataset.k] === "number" ? +v : v); };
D.acts.calcseg = function (b) { var id = b.dataset.tool, k = b.dataset.k, v = b.dataset.v; picked(id, k, typeof S(id)[k] === "number" ? +v : v); var again = document.querySelector('[data-act="calcseg"][data-k="' + k + '"][data-v="' + v + '"]'); if (again) again.focus(); };
D.changes.calccheck = function (el) { picked(el.dataset.tool, el.dataset.k, el.checked); };
D.acts.calcreset = function (b) { var id = b.dataset.tool; D.S.calc[id] = JSON.parse(JSON.stringify(T(id).defaults || {})); stop(id); RT[id] = null; D.toast("Back to the starting numbers."); D.render(); };

/* ---------- Copy link ---------- */
// Only the numbers that differ from the defaults go in the link.
D.acts.calclink = function (b) {
  var id = b.dataset.tool, s = S(id), d = T(id).defaults || {}, diff = {};
  Object.keys(s).forEach(function (k) { if (JSON.stringify(s[k]) !== JSON.stringify(d[k])) diff[k] = s[k]; });
  var url = new URL(location.href); url.hash = id; url.search = "";
  if (Object.keys(diff).length) url.searchParams.set("calc", btoa(unescape(encodeURIComponent(JSON.stringify(diff)))));
  var done = function () { D.toast("Link copied. It opens this calculator with these numbers."); D.render(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url.href).then(done, function () { D.toast("Could not copy. The address bar has the link."); history.replaceState(null, "", url.href); D.render(); });
  else { history.replaceState(null, "", url.href); D.toast("The address bar has the link."); D.render(); }
};
function readLink(St) {
  try {
    var p = new URLSearchParams(location.search).get("calc"), id = location.hash.slice(1); if (!p || !TOOLS[id]) return;
    var o = JSON.parse(decodeURIComponent(escape(atob(p)))), d = TOOLS[id].defaults || {};
    Object.keys(o).forEach(function (k) { if (Object.prototype.hasOwnProperty.call(d, k) && typeof o[k] === typeof d[k]) St.calc[id][k] = o[k]; });
  } catch (e) {}
}

/* ---------- Answers ---------- */
/* A row of answers. items: [{ k: label, v: value (text), u: unit, sub: a second line, tip, state: "ok" | "warn" | "bad" }] */
K.outs = function (items) {
  return '<dl class="outs">' + items.filter(Boolean).map(function (i) {
    return '<div class="out' + (i.state ? " " + i.state : "") + '"><dt' + (i.tip ? ' class="abbr" tabindex="0" data-tip="' + esc(i.tip) + '"' : "") + ">" + esc(i.k) + '</dt><dd><b class="num">' + esc(i.v) + "</b>" + (i.u ? " <span>" + esc(i.u) + "</span>" : "") + (i.sub ? "<small>" + esc(i.sub) + "</small>" : "") + "</dd></div>";
  }).join("") + "</dl>";
};
// One plain sentence that says whether the design works. state: "ok" | "warn" | "bad" | "info".
K.verdict = function (state, text) { return '<p class="verdict ' + state + '"><span class="pill ' + state + '">' + ({ ok: "Works", warn: "Check", bad: "Problem", info: "Note" }[state] || "") + "</span> " + esc(text) + "</p>"; };
// "How this is worked out": the assumptions, in words a student can check. html is trusted (written in the tool file).
K.notes = function (html, title) { return '<details class="how" data-open="how"><summary>' + esc(title || "How this is worked out") + '</summary><div class="howbody">' + html + "</div></details>"; };
/* A block of text to copy into robot code or a notebook, with a Copy button. key: unique on the page. */
var COPY = {};
K.code = function (key, text, label) { COPY[key] = text; return '<div class="codebox"><pre class="codeout">' + esc(text) + '</pre><button class="btn sm" data-act="calccopy" data-v="' + esc(key) + '">' + esc(label || "Copy") + "</button></div>"; };
D.acts.calccopy = function (b) {
  var text = COPY[b.dataset.v] || "", done = function () { D.toast("Copied."); D.render(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { D.toast("Could not copy. Select the text and copy it by hand."); D.render(); }); else { D.toast("Could not copy. Select the text and copy it by hand."); D.render(); }
};
K.fix = function (x, n) { return isFinite(x) ? x.toFixed(n == null ? 2 : n) : "–"; };
// 1234.5 -> "1,235"; small numbers keep some decimals.
K.n = function (x, dp) { if (!isFinite(x)) return "–"; if (dp == null) dp = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2; return x.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }); };

/* ---------- Charts (SVG) ---------- */
function ticks(lo, hi, want) {
  var span = hi - lo || 1, raw = span / (want || 5), mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag, step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag, out = [];
  for (var v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return { list: out, step: step };
}
function tickFmt(v, step) { var dp = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step) - 1e-9)); return v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
/* A line chart. o: { id (unique on the page), title, x: { label, min, max }, y: { label, min, max },
     series: [{ name, pts: [[x, y], ...], color: 1 | 2 | 3 | "mute", dash: true }],
     (the y label is written above the top of the axis, the x label under its right-hand end)
     marks: [{ x, label }] (upright reference lines), hlines: [{ y, label }] (level reference lines),
     bands: [{ x0, x1, label }] (a shaded range of x), dots: [{ x, y, label }], h (height, default 190), table: false }
   One y axis only: two measures on different scales are two charts. Hover or arrow keys read out every series. */
K.chart = function (o) {
  var W = 480, H = o.h || 190, pl = 46, pr = 14, pt = o.y && o.y.label ? 24 : 10, pb = o.x && o.x.label ? 34 : 24, series = o.series.filter(function (s) { return s.pts && s.pts.length; });
  var xs = [], ys = [];
  series.forEach(function (s) { s.pts.forEach(function (p) { if (isFinite(p[0]) && isFinite(p[1])) { xs.push(p[0]); ys.push(p[1]); } }); });
  if (!(o.y && o.y.max != null && o.y.min != null)) (o.hlines || []).forEach(function (h) { ys.push(h.y); });
  if (!xs.length) return '<figure class="chart"><figcaption>' + esc(o.title || "") + '</figcaption><p class="mute small">Nothing to plot yet.</p></figure>';
  var x0 = o.x && o.x.min != null ? o.x.min : Math.min.apply(null, xs), x1 = o.x && o.x.max != null ? o.x.max : Math.max.apply(null, xs);
  var y0 = o.y && o.y.min != null ? o.y.min : Math.min(0, Math.min.apply(null, ys)), y1 = o.y && o.y.max != null ? o.y.max : Math.max.apply(null, ys);
  if (x1 <= x0) x1 = x0 + 1; if (y1 <= y0) y1 = y0 + 1;
  var ty = ticks(y0, y1, 4), tx = ticks(x0, x1, 6);
  if (!(o.y && o.y.max != null)) y1 = Math.max(y1, ty.list[ty.list.length - 1] + (ty.list[ty.list.length - 1] < y1 - 1e-9 ? ty.step : 0));
  if (!(o.y && o.y.min != null) && y0 < 0) y0 = Math.min(y0, ty.list[0] - (ty.list[0] > y0 + 1e-9 ? ty.step : 0));
  ty = ticks(y0, y1, 4);
  function X(x) { return pl + (x - x0) / (x1 - x0) * (W - pl - pr); } function Y(y) { return H - pb - (y - y0) / (y1 - y0) * (H - pt - pb); }
  var g = "";
  (o.bands || []).forEach(function (b) { var a = X(Math.max(x0, b.x0)), c = X(Math.min(x1, b.x1)); if (c > a) g += '<rect class="cband" x="' + a.toFixed(1) + '" y="' + pt + '" width="' + (c - a).toFixed(1) + '" height="' + (H - pt - pb) + '"/>' + (b.label ? '<text class="cnote" x="' + ((a + c) / 2).toFixed(1) + '" y="' + (pt + 12) + '" text-anchor="middle">' + esc(b.label) + "</text>" : ""); });
  ty.list.forEach(function (v) { g += '<line class="cgrid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text class="ctick" x="' + (pl - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + tickFmt(v, ty.step) + "</text>"; });
  tx.list.forEach(function (v) { g += '<text class="ctick" x="' + X(v).toFixed(1) + '" y="' + (H - pb + 15) + '" text-anchor="middle">' + tickFmt(v, tx.step) + "</text>"; });
  g += '<line class="caxis" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(Math.max(y0, 0)).toFixed(1) + '" y2="' + Y(Math.max(y0, 0)).toFixed(1) + '"/>';
  if (o.x && o.x.label) g += '<text class="clabel" x="' + (W - pr) + '" y="' + (H - 4) + '" text-anchor="end">' + esc(o.x.label) + "</text>";
  if (o.y && o.y.label) g += '<text class="clabel" x="4" y="11">' + esc(o.y.label) + "</text>";
  (o.hlines || []).forEach(function (h) { if (h.y < y0 || h.y > y1) return; g += '<line class="cmark" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(h.y).toFixed(1) + '" y2="' + Y(h.y).toFixed(1) + '"/>' + (h.label ? '<text class="cnote" x="' + (W - pr - 2) + '" y="' + (Y(h.y) - 4).toFixed(1) + '" text-anchor="end">' + esc(h.label) + "</text>" : ""); });
  (o.marks || []).forEach(function (m) { if (m.x < x0 || m.x > x1) return; g += '<line class="cmark" x1="' + X(m.x).toFixed(1) + '" x2="' + X(m.x).toFixed(1) + '" y1="' + pt + '" y2="' + (H - pb) + '"/>' + (m.label ? '<text class="cnote" x="' + (X(m.x) + (X(m.x) > W - 110 ? -4 : 4)).toFixed(1) + '" y="' + (pt + 10) + '"' + (X(m.x) > W - 110 ? ' text-anchor="end"' : "") + ">" + esc(m.label) + "</text>" : ""); });
  series.forEach(function (s, i) {
    var d = "", pen = false;
    s.pts.forEach(function (p) { if (!isFinite(p[1])) { pen = false; return; } d += (pen ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(F.clamp(p[1], y0 - (y1 - y0), y1 + (y1 - y0))).toFixed(1); pen = true; });
    g += '<path class="cline c' + (s.color || i + 1) + (s.dash ? " dash" : "") + '" d="' + d + '"/>';
  });
  (o.dots || []).forEach(function (p) { if (p.y < y0 || p.y > y1 || p.x < x0 || p.x > x1) return; g += '<circle class="cdot" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="4"/>' + (p.label ? '<text class="cnote" x="' + (X(p.x) + 7).toFixed(1) + '" y="' + (Y(p.y) - 6).toFixed(1) + '">' + esc(p.label) + "</text>" : ""); });
  g += '<line class="cnow" id="' + o.id + '-now" x1="0" x2="0" y1="' + pt + '" y2="' + (H - pb) + '" visibility="hidden"/><line class="ccross" x1="0" x2="0" y1="' + pt + '" y2="' + (H - pb) + '" visibility="hidden"/>';
  CHARTS[o.id] = { x0: x0, x1: x1, pl: pl, pr: pr, W: W, series: series, xl: o.x && o.x.unit || "", yl: o.y && o.y.unit || "", xn: o.x && o.x.name || "" };
  var legend = series.length > 1 ? '<div class="clegend">' + series.map(function (s, i) { return '<span><i class="ckey c' + (s.color || i + 1) + (s.dash ? " dash" : "") + '"></i>' + esc(s.name) + "</span>"; }).join("") + "</div>" : "";
  var table = "";
  if (o.table !== false) {
    var rows = [], n = 8;
    for (var k = 0; k <= n; k++) { var xv = x0 + (x1 - x0) * k / n; rows.push("<tr><td>" + K.n(xv) + "</td>" + series.map(function (s) { return "<td>" + K.n(sample(s.pts, xv)) + "</td>"; }).join("") + "</tr>"); }
    table = '<details class="ctable" data-open="t-' + esc(o.id) + '"><summary>Show as a table</summary><table><thead><tr><th>' + esc(o.x && (o.x.name || o.x.label) || "x") + "</th>" + series.map(function (s) { return "<th>" + esc(s.name) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></details>";
  }
  return '<figure class="chart"><figcaption>' + esc(o.title || "") + "</figcaption>" + legend + '<svg viewBox="0 0 ' + W + " " + H + '" data-chart="' + esc(o.id) + '" tabindex="0" role="img" aria-label="' + esc((o.title || "Chart") + ". Use the left and right arrow keys to read values.") + '">' + g + "</svg>" + table + "</figure>";
};
var F = window.FRC;
function sample(pts, x) { if (!pts.length) return NaN; if (x <= pts[0][0]) return pts[0][1]; for (var i = 1; i < pts.length; i++) if (pts[i][0] >= x) { var a = pts[i - 1], b = pts[i], t = (x - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * t; } return pts[pts.length - 1][1]; }
// The chart's readout: one small box that lists every series at the pointer's x.
var tipEl = null;
function chartTip(svg, x) {
  var c = CHARTS[svg.getAttribute("data-chart")]; if (!c) return;
  var box = svg.getBoundingClientRect(), k = box.width / c.W, px = c.pl + (x - c.x0) / (c.x1 - c.x0) * (c.W - c.pl - c.pr);
  var cross = svg.querySelector(".ccross"); cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.setAttribute("visibility", "visible");
  if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "ctip"; tipEl.setAttribute("role", "status"); document.body.appendChild(tipEl); }
  tipEl.textContent = "";
  var head = document.createElement("div"); head.className = "ctiph"; head.textContent = (c.xn ? c.xn + " " : "") + K.n(x) + (c.xl ? " " + c.xl : ""); tipEl.appendChild(head);
  c.series.forEach(function (s, i) {
    var row = document.createElement("div"), key = document.createElement("i"), val = document.createElement("b"), nm = document.createElement("span");
    key.className = "ckey c" + (s.color || i + 1) + (s.dash ? " dash" : ""); val.textContent = K.n(sample(s.pts, x)) + (c.yl ? " " + c.yl : ""); nm.textContent = s.name;
    row.appendChild(key); row.appendChild(val); row.appendChild(nm); tipEl.appendChild(row);
  });
  tipEl.style.display = "block";
  var tw = tipEl.offsetWidth, left = box.left + px * k + 12; if (left + tw > innerWidth - 8) left = box.left + px * k - tw - 12;
  tipEl.style.left = Math.max(8, left) + "px"; tipEl.style.top = Math.max(8, box.top + 8) + "px";
  svg._x = x;
}
function chartOff(svg) { if (tipEl) tipEl.style.display = "none"; if (svg) { var cross = svg.querySelector(".ccross"); if (cross) cross.setAttribute("visibility", "hidden"); } }
document.addEventListener("pointermove", function (e) {
  var svg = e.target.closest && e.target.closest("svg[data-chart]"); if (!svg) { if (tipEl && tipEl.style.display === "block") chartOff(document.querySelector("svg[data-chart] .ccross[visibility=visible]") && document.querySelector("svg[data-chart] .ccross[visibility=visible]").ownerSVGElement); return; }
  var c = CHARTS[svg.getAttribute("data-chart")]; if (!c) return;
  var box = svg.getBoundingClientRect(), fx = ((e.clientX - box.left) / box.width * c.W - c.pl) / (c.W - c.pl - c.pr);
  chartTip(svg, c.x0 + F.clamp(fx, 0, 1) * (c.x1 - c.x0));
});
document.addEventListener("keydown", function (e) {
  var svg = document.activeElement; if (!svg || !svg.getAttribute || !svg.getAttribute("data-chart")) return;
  var c = CHARTS[svg.getAttribute("data-chart")]; if (!c) return;
  if (e.key === "Escape") { chartOff(svg); return; }
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault(); var step = (c.x1 - c.x0) / 40 * (e.shiftKey ? 5 : 1), x = svg._x == null ? (c.x0 + c.x1) / 2 : svg._x;
  chartTip(svg, F.clamp(x + (e.key === "ArrowRight" ? step : -step), c.x0, c.x1));
});
document.addEventListener("focusout", function (e) { if (e.target && e.target.getAttribute && e.target.getAttribute("data-chart")) chartOff(e.target); });
// Show "now" on a chart while the stage plays. x = null hides it.
K.chartNow = function (chartId, x) {
  var el = document.getElementById(chartId + "-now"), c = CHARTS[chartId]; if (!el || !c) return;
  if (x == null || x < c.x0 || x > c.x1) { el.setAttribute("visibility", "hidden"); return; }
  var px = c.pl + (x - c.x0) / (c.x1 - c.x0) * (c.W - c.pl - c.pr); el.setAttribute("x1", px); el.setAttribute("x2", px); el.setAttribute("visibility", "visible");
};

/* ---------- The stage (canvas) ---------- */
var INK = null;
function ink() {
  if (INK) return INK;
  var cs = getComputedStyle(document.documentElement), o = {};
  ["surface", "surface-2", "surface-3", "line", "line-2", "text", "text-2", "mute", "accent", "gold", "ok", "warn", "bad", "sheet", "sheet-line", "part", "part-2", "part-line", "piece", "piece-line", "s1", "s2", "s3", "force", "ghost"].forEach(function (k) { o[k.replace(/-(\w)/g, function (m, c) { return c.toUpperCase(); })] = cs.getPropertyValue("--" + k).trim(); });
  o.font = getComputedStyle(document.body).fontFamily;
  return (INK = o);
}
D.after.push(function () { INK = null; });
try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { INK = null; if (TOOLS[D.S.route]) K.redraw(D.S.route); }); } catch (e) {}
K.reduced = function () { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

/* The drawing helper handed to draw(). Screen units are CSS pixels; g.view() makes a to-scale world on top.
   Colours: g.c.text, .mute, .line, .accent, .gold, .ok, .warn, .bad, .sheet, .sheetLine, .part (a machined part),
   .part2 (a second part), .partLine, .piece (the game piece), .force, .ghost, .s1 .s2 .s3 (chart series colours). */
function G(ctx, w, h) {
  var c = ink(), g = { ctx: ctx, w: w, h: h, c: c };
  function style(o, dflt) { o = o || {}; ctx.lineWidth = o.width || dflt || 1.5; ctx.setLineDash(o.dash || []); ctx.lineCap = o.cap || "round"; ctx.lineJoin = "round"; return o; }
  function paint(o) { if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke !== null && (o.stroke || !o.fill)) { ctx.strokeStyle = o.stroke || c.text; ctx.stroke(); } ctx.setLineDash([]); }
  g.clear = function () { ctx.clearRect(0, 0, w, h); ctx.fillStyle = c.sheet; ctx.fillRect(0, 0, w, h); };
  g.line = function (x1, y1, x2, y2, o) { o = style(o); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = o.stroke || o.color || c.text; ctx.stroke(); ctx.setLineDash([]); };
  g.poly = function (pts, o) { o = style(o); ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); if (o.close !== false && (o.fill || o.close)) ctx.closePath(); paint(o); };
  g.path = function (pts, o) { g.poly(pts, Object.assign({ close: false }, o, { fill: null, stroke: (o && (o.stroke || o.color)) || c.text })); };
  g.circle = function (x, y, r, o) { o = style(o); ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 2 * Math.PI); paint(o); };
  g.arc = function (x, y, r, a0, a1, o) { o = style(o); ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), a0, a1, !!o.ccw); ctx.strokeStyle = o.stroke || o.color || c.text; ctx.stroke(); ctx.setLineDash([]); };
  g.rect = function (x, y, rw, rh, o) { o = style(o); ctx.beginPath(); if (o.radius && ctx.roundRect) ctx.roundRect(x, y, rw, rh, o.radius); else ctx.rect(x, y, rw, rh); paint(o); };
  /* Text. o: { align: "left" | "center" | "right", base: "alphabetic" | "middle" | "top", color, size (px, default 12),
     weight (default 500), halo: true (a sheet-coloured outline so it reads over lines) } */
  g.text = function (str, x, y, o) {
    o = o || {}; ctx.font = (o.weight || 500) + " " + (o.size || 12) + "px " + c.font; ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "alphabetic";
    if (o.halo !== false) { ctx.lineWidth = 3.5; ctx.strokeStyle = o.haloColor || c.sheet; ctx.lineJoin = "round"; ctx.setLineDash([]); ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || c.text; ctx.fillText(str, x, y);
  };
  g.textWidth = function (str, o) { o = o || {}; ctx.font = (o.weight || 500) + " " + (o.size || 12) + "px " + c.font; return ctx.measureText(str).width; };
  function head(x, y, ang, size, color) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - size * Math.cos(ang - 0.38), y - size * Math.sin(ang - 0.38)); ctx.lineTo(x - size * Math.cos(ang + 0.38), y - size * Math.sin(ang + 0.38)); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); }
  // An arrow for a force or a velocity. o: { color, width, head (px), label, both: true }
  g.arrow = function (x1, y1, x2, y2, o) {
    o = o || {}; var col = o.color || c.force, ang = Math.atan2(y2 - y1, x2 - x1), hs = o.head || 8, len = Math.hypot(x2 - x1, y2 - y1); if (len < 1) return;
    var k = Math.min(hs * 0.8, len) / len;
    g.line(o.both ? x1 + (x2 - x1) * k : x1, o.both ? y1 + (y2 - y1) * k : y1, x2 - (x2 - x1) * k, y2 - (y2 - y1) * k, { color: col, width: o.width || 2, dash: o.dash, cap: "butt" });
    head(x2, y2, ang, hs, col); if (o.both) head(x1, y1, ang + Math.PI, hs, col);
    if (o.label) g.text(o.label, x2 + 6 * Math.cos(ang) + (Math.cos(ang) < -0.3 ? -4 : 4), y2 + 6 * Math.sin(ang), { color: col, weight: 600, align: Math.cos(ang) < -0.3 ? "right" : "left", base: "middle" });
  };
  /* A dimension line, as on a shop drawing: from (x1, y1) to (x2, y2), moved `off` pixels to its left-hand side,
     with witness lines and the label at its middle. o: { color, size, side: "above" | "below" } */
  g.dim = function (x1, y1, x2, y2, label, off, o) {
    o = o || {}; var col = o.color || c.mute, ang = Math.atan2(y2 - y1, x2 - x1), nx = Math.sin(ang), ny = -Math.cos(ang); off = off || 0;
    var ax = x1 + nx * off, ay = y1 + ny * off, bx = x2 + nx * off, by = y2 + ny * off, sg = off < 0 ? -1 : 1;
    if (off) { g.line(x1 + nx * 3 * sg, y1 + ny * 3 * sg, ax + nx * 5 * sg, ay + ny * 5 * sg, { color: col, width: 1 }); g.line(x2 + nx * 3 * sg, y2 + ny * 3 * sg, bx + nx * 5 * sg, by + ny * 5 * sg, { color: col, width: 1 }); }
    var len = Math.hypot(bx - ax, by - ay);
    if (len > 26) g.arrow(ax, ay, bx, by, { color: col, width: 1, head: 6, both: true }); else g.line(ax, ay, bx, by, { color: col, width: 1 });
    var mx = (ax + bx) / 2, my = (ay + by) / 2, flat = Math.abs(Math.sin(ang)) < 0.5;
    g.text(label, mx + (flat ? 0 : (o.side === "left" ? -7 : 7)), my + (flat ? (o.side === "below" ? 14 : -6) : 0), { color: o.textColor || c.text2, size: o.size || 12, weight: 600, align: flat ? "center" : (o.side === "left" ? "right" : "left"), base: flat ? "alphabetic" : "middle" });
  };
  // A note with a leader line from (x, y) to the text at (tx, ty).
  g.callout = function (str, x, y, tx, ty, o) { o = o || {}; g.line(x, y, tx, ty, { color: o.color || c.mute, width: 1 }); g.circle(x, y, 2, { fill: o.color || c.mute, stroke: null }); g.text(str, tx + (tx >= x ? 4 : -4), ty, Object.assign({ align: tx >= x ? "left" : "right", base: "middle", color: c.text2 }, o)); };
  // The floor: a line with hatching under it.
  g.ground = function (y, x0, x1) {
    x0 = x0 == null ? 0 : x0; x1 = x1 == null ? w : x1; ctx.save(); ctx.beginPath(); ctx.rect(x0, y, x1 - x0, 9); ctx.clip();
    for (var x = x0 - 10; x < x1 + 10; x += 8) g.line(x, y + 10, x + 9, y, { color: c.line2, width: 1 });
    ctx.restore(); g.line(x0, y, x1, y, { color: c.text2, width: 1.5 });
  };
  // A wheel or roller seen from the side: rim, hub and spokes that show it turning. o: { fill, stroke, spokes, tread (px), hub }
  g.wheel = function (x, y, r, ang, o) {
    o = o || {}; var tr = o.tread == null ? Math.max(2, r * 0.16) : o.tread;
    g.circle(x, y, r, { fill: o.tire || c.text2, stroke: null });
    g.circle(x, y, Math.max(0, r - tr), { fill: o.fill || c.part, stroke: o.stroke || c.partLine, width: 1 });
    var n = o.spokes || 5;
    for (var i = 0; i < n; i++) { var a = ang + i * 2 * Math.PI / n; g.line(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, x + Math.cos(a) * (r - tr - 1), y + Math.sin(a) * (r - tr - 1), { color: o.stroke || c.partLine, width: Math.max(1.5, r * 0.07) }); }
    g.circle(x, y, Math.max(2, r * (o.hub || 0.2)), { fill: c.text2, stroke: null });
  };
  // A gear seen from the side. rp = pitch radius in pixels. o: { fill, stroke, bore (px) }
  g.gear = function (x, y, rp, teeth, ang, o) {
    o = o || {}; var add = Math.min(rp * 0.35, 2 * Math.PI * rp / teeth / Math.PI), ro = rp + add, rr = rp - add * 1.2, pts = [], p = 2 * Math.PI / teeth;
    for (var i = 0; i < teeth; i++) { var a = ang + i * p; pts.push([x + rr * Math.cos(a - 0.27 * p), y + rr * Math.sin(a - 0.27 * p)], [x + ro * Math.cos(a - 0.12 * p), y + ro * Math.sin(a - 0.12 * p)], [x + ro * Math.cos(a + 0.12 * p), y + ro * Math.sin(a + 0.12 * p)], [x + rr * Math.cos(a + 0.27 * p), y + rr * Math.sin(a + 0.27 * p)]); }
    g.poly(pts, { fill: o.fill || c.part, stroke: o.stroke || c.partLine, width: 1 });
    var b = o.bore || Math.max(3, rp * 0.18), hex = []; for (var k = 0; k < 6; k++) hex.push([x + b * Math.cos(ang + k * Math.PI / 3), y + b * Math.sin(ang + k * Math.PI / 3)]);
    g.poly(hex, { fill: c.sheet, stroke: o.stroke || c.partLine, width: 1 });
    if (rr > b * 2.4) g.circle(x, y, (rr + b) / 2, { stroke: o.stroke || c.partLine, width: 1, dash: [2, 3] });
  };
  // A ball with a stripe, so its spin shows. o: { fill, stroke }
  g.ball = function (x, y, r, ang, o) {
    o = o || {}; g.circle(x, y, r, { fill: o.fill || c.piece, stroke: o.stroke || c.pieceLine, width: 1.25 });
    if (r > 4) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 0.5, 0, 2 * Math.PI); ctx.clip(); g.line(x - r * Math.cos(ang), y - r * Math.sin(ang), x + r * Math.cos(ang), y + r * Math.sin(ang), { color: o.stroke || c.pieceLine, width: Math.max(1.25, r * 0.16), cap: "butt" }); ctx.restore(); }
  };
  /* A to-scale window onto the world. box: { x0, x1, y0, y1 } in any length unit, y up. pad: { l, r, t, b } pixels kept
     clear. Returns { X(x), Y(y), L(length) -> pixels, ux(px), uy(px) -> world, k (pixels per unit) }. The world keeps
     its shape: one unit is as long up as across. align: "bottom" (default) sits the box on the bottom padding. */
  g.view = function (box, pad, align) {
    pad = Object.assign({ l: 16, r: 16, t: 16, b: 16 }, pad || {}); var aw = w - pad.l - pad.r, ah = h - pad.t - pad.b;
    var k = Math.min(aw / (box.x1 - box.x0), ah / (box.y1 - box.y0)), ox = pad.l + (aw - k * (box.x1 - box.x0)) / 2, oy = align === "middle" ? pad.t + (ah + k * (box.y1 - box.y0)) / 2 : h - pad.b;
    if (align === "left") ox = pad.l;
    return { k: k, X: function (x) { return ox + (x - box.x0) * k; }, Y: function (y) { return oy - (y - box.y0) * k; }, L: function (l) { return l * k; }, ux: function (px) { return box.x0 + (px - ox) / k; }, uy: function (py) { return box.y0 + (oy - py) / k; } };
  };
  // A grid of true squares behind a to-scale drawing, with a note of how big one square is.
  g.grid = function (V, step, note) {
    var xa = Math.floor(V.ux(0) / step) * step, ya = Math.floor(V.uy(h) / step) * step, x, y;
    for (x = xa; V.X(x) < w; x += step) g.line(V.X(x), 0, V.X(x), h, { color: c.sheetLine, width: 1, cap: "butt" });
    for (y = ya; V.Y(y) > 0; y += step) g.line(0, V.Y(y), w, V.Y(y), { color: c.sheetLine, width: 1, cap: "butt" });
    if (note) g.text(note, w - 10, 16, { align: "right", color: c.mute, size: 11 });
  };
  return g;
}
var cur = { id: null, cv: null, ro: null, raf: 0, last: 0 };
function mount() {
  var cv = document.getElementById("calc-cv");
  if (cur.ro) { cur.ro.disconnect(); cur.ro = null; }
  if (!cv) { if (cur.id) { stop(cur.id); } cur.id = null; cur.cv = null; chartOff(); return; }
  var id = cv.dataset.tool, def = T(id), R = rt(id);
  cur.id = id; cur.cv = cv;
  size(cv); restoreOpen();
  if (window.ResizeObserver) { cur.ro = new ResizeObserver(function () { if (size(cv)) K.redraw(id); }); cur.ro.observe(cv.parentNode); }
  if (def.hints) { var hh = def.hints(S(id), CACHE[id]) || {}; Object.keys(hh).forEach(function (k) { var el = document.getElementById(k); if (el) el.textContent = hh[k]; }); }
  if (def.autoplay && !R.played && !K.reduced() && (def.duration || def.loop)) { R.played = true; R.t = 0; play(id); }
  else if (def.duration && !def.loop && !R.played) { R.played = true; R.t = def.duration(S(id), CACHE[id]); }
  K.redraw(id);
  if (R.playing && !cur.raf) loop();
  var pb = document.getElementById("calc-play"); if (pb) pb.textContent = R.playing ? "Pause" : label(def);
  transport(id);
}
D.after.push(function () {
  if (TOOLS[D.S.route]) mount(); else { if (cur.id) stop(cur.id); if (cur.ro) { cur.ro.disconnect(); cur.ro = null; } cur.id = null; cur.cv = null; chartOff(); }
  // A calculator without a stage still needs its folded parts and hints restored.
  var def = TOOLS[D.S.route]; if (def && !def.stage) { restoreOpen(); if (def.hints) { var hh = def.hints(S(def.id), CACHE[def.id]) || {}; Object.keys(hh).forEach(function (k) { var el = document.getElementById(k); if (el) el.textContent = hh[k]; }); } }
});
function size(cv) {
  var box = cv.parentNode.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1), w = Math.round(box.width), h = Math.round(box.height);
  if (!w || !h) return false;
  if (cv._w === w && cv._h === h && cv._d === dpr) return false;
  cv._w = w; cv._h = h; cv._d = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + "px"; cv.style.height = h + "px";
  return true;
}
K.redraw = function (id) {
  var def = T(id), cv = cur.cv; if (!def || !def.draw || !cv || cur.id !== id || !cv._w) return;
  var ctx = cv.getContext("2d"), r = CACHE[id]; ctx.setTransform(cv._d, 0, 0, cv._d, 0, 0);
  var g = G(ctx, cv._w, cv._h); g.clear();
  if (r && r.error) { g.text("This drawing could not be made.", 16, 28, { color: g.c.mute }); return; }
  try { def.draw(g, S(id), r, rt(id).t); } catch (e) { if (window.console) console.error(e); }
};
function loop() {
  cur.last = performance.now();
  var step = function (now) {
    var id = cur.id, def = id && T(id), R = id && rt(id); cur.raf = 0;
    if (!def || !R || !R.playing || D.S.route !== id) return;
    var dt = Math.min(0.05, (now - cur.last) / 1000); cur.last = now; R.t += dt * R.speed;
    var dur = def.duration && !def.loop ? def.duration(S(id), CACHE[id]) : Infinity;
    if (R.t >= dur) { R.t = dur; R.playing = false; }
    K.redraw(id); transport(id);
    if (R.playing) cur.raf = requestAnimationFrame(step); else { var b = document.getElementById("calc-play"); if (b) b.textContent = label(def); if (def.onEnd) def.onEnd(S(id), CACHE[id]); }
  };
  cur.raf = requestAnimationFrame(step);
}
function transport(id) { var R = rt(id), sc = document.getElementById("calc-scrub"), tm = document.getElementById("calc-time"); if (sc && document.activeElement !== sc) sc.value = R.t.toFixed(3); if (tm) tm.textContent = R.t.toFixed(2) + " s"; }
function play(id) { var R = rt(id), def = T(id), dur = def.duration && !def.loop ? def.duration(S(id), CACHE[id]) : Infinity; if (R.t >= dur - 1e-6) R.t = 0; R.playing = true; if (!cur.raf) loop(); }
function stop(id) { var R = RT[id]; if (R) R.playing = false; if (cur.raf) { cancelAnimationFrame(cur.raf); cur.raf = 0; } }
K.play = function (id, from) { if (from != null) rt(id).t = from; play(id); var b = document.getElementById("calc-play"); if (b) b.textContent = "Pause"; };
K.pause = function (id) { stop(id); var b = document.getElementById("calc-play"); if (b) b.textContent = label(T(id)); };
K.rewind = function (id) { stop(id); rt(id).t = 0; };
// Jump the animation to a time (seconds) and show it, as dragging the scrubber does.
K.seek = function (id, t) { K.pause(id); rt(id).t = Math.max(0, t); K.redraw(id); transport(id); };
K.speed = function (id) { return rt(id).speed; };
K.time = function (id) { return rt(id).t; };
K.playing = function (id) { return rt(id).playing; };
D.acts.calcplay = function (b) { var id = b.dataset.tool; if (rt(id).playing) K.pause(id); else K.play(id); };
D.acts.calcspeed = function (b) { var id = b.dataset.tool; rt(id).speed = +b.dataset.v; b.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); };
D.inputs.calcscrub = function (el) { var id = el.dataset.tool; K.pause(id); rt(id).t = +el.value; K.redraw(id); transport(id); };
// Dragging on the drawing.
var dragging = false;
function local(e) { var b = cur.cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
document.addEventListener("pointerdown", function (e) {
  if (!cur.cv || e.target !== cur.cv) return; var def = T(cur.id); if (!def.pointer) return;
  var p = local(e); if (def.pointer("down", p[0], p[1], S(cur.id), CACHE[cur.id])) { dragging = true; try { cur.cv.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); syncFields(cur.id); K.refresh(cur.id); }
});
document.addEventListener("pointermove", function (e) {
  if (!cur.cv || (!dragging && e.target !== cur.cv)) return; var def = T(cur.id); if (!def || !def.pointer) return;
  var p = local(e);
  if (dragging) { if (def.pointer("move", p[0], p[1], S(cur.id), CACHE[cur.id])) { syncFields(cur.id); K.refresh(cur.id); } }
  else if (def.hover) cur.cv.style.cursor = def.hover(p[0], p[1], S(cur.id), CACHE[cur.id]) || "";
});
["pointerup", "pointercancel"].forEach(function (ev) { document.addEventListener(ev, function (e) { if (!dragging) return; dragging = false; var def = T(cur.id); if (def && def.pointer) { var p = local(e); def.pointer("up", p[0], p[1], S(cur.id), CACHE[cur.id]); syncFields(cur.id); K.refresh(cur.id); } }); });
// After a drag changed the numbers, show them in their fields.
function syncFields(id) { var s = S(id); document.querySelectorAll('.benchside input[data-input="calc"][data-tool="' + id + '"]').forEach(function (el) { if (document.activeElement !== el) el.value = fmtIn(s[el.dataset.k]); }); }
K.syncFields = syncFields;
})();
