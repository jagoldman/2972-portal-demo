/* Tools: one place for small helpers that open inside the site (#tools), and two tools.
   Drawing to vector (#tool-trace): a photo of a drawing becomes an SVG for the laser or a DXF for Onshape.
   Gear and sprocket finder (#tool-gear): a photo plus one caliper measurement names the part.
   The demo has no real tracer or tooth counter: it ships one sample drawing with its outline already made and two
   sample parts with their teeth already counted, and says so for a person's own photo. The gear maths is real.
   Nothing is saved; a person's photo stays in this browser and is dropped on reload. */
(function () {
"use strict";
var esc = D.esc;

D.inits.push(function (S) {
  S.tools = {
    trace: { src: null, photo: null, detail: "normal", pts: [], cur: null, dist: "", unit: "in" },
    gear: { src: null, photo: null, kind: "gear", teeth: "", od: "", unit: "in", bore: "hex12" }
  };
});
// A person's photo lives only as a blob URL in this page. It is released on Reset, on a new photo, and when the
// person leaves the tool.
var liveUrls = [];
D.inits.push(function () { liveUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); liveUrls = []; });
function dropPhoto(st) { if (!st.photo) return; try { URL.revokeObjectURL(st.photo); } catch (e) {} liveUrls = liveUrls.filter(function (u) { return u !== st.photo; }); st.photo = null; if (st.src === "own") st.src = null; }
D.after.push(function () { var T = D.S.tools; if (!T) return; if (D.S.route !== "tool-trace") dropPhoto(T.trace); if (D.S.route !== "tool-gear") dropPhoto(T.gear); });
function TR() { return D.S.tools.trace; }
function GR() { return D.S.tools.gear; }
function allowed() { return D.visibleTools().length > 0; }

/* ---------- Shared pieces ---------- */
function head(name) {
  return '<div class="pagehead toolhead"><a class="backlink" href="#tools" data-act="go" data-v="tools"><span aria-hidden="true">‹</span> All tools</a><h1>' + esc(name) + "</h1></div>";
}
function step(n, title, body) { return '<section class="card toolstep"><h2><span class="stepn" aria-hidden="true">' + n + "</span>" + esc(title) + "</h2>" + body + "</section>"; }
function photoPicker(id, samples) {
  return '<div class="row photopick"><label class="btn filebtn">' + D.ic("camera", 16) + ' Take or choose a photo<input type="file" accept="image/*" id="' + id + '" class="vh" data-change="' + id + '"></label>' +
    samples.map(function (s) { return '<button class="btn" data-act="' + s[0] + '" data-v="' + s[1] + '">' + esc(s[2]) + "</button>"; }).join("") + "</div>";
}
function readPhoto(el, st) {
  var f = el.files && el.files[0]; if (!f) return false;
  dropPhoto(st);
  st.photo = URL.createObjectURL(f); liveUrls.push(st.photo); st.src = "own"; return true;
}
function download(name, type, text) {
  var url = URL.createObjectURL(new Blob([text], { type: type })), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}
function n3(x) { return (Math.round(x * 1000) / 1000).toFixed(3); }

/* ---------- The Tools page ---------- */
D.views.tools = function () {
  if (!allowed()) return D.denied("Tools");
  return D.topbar("Tools", "", "", "") + '<div class="content toolspage"><div class="card"><div class="toollist">' + D.visibleTools().map(D.toolRow).join("") + "</div></div></div>";
};

/* ---------- Drawing to vector ---------- */
var W = 400, H = 260;
// The sample: a bracket drawn on paper, with a 4 in dimension line under it. Its outline, at three levels of detail.
var OUTER = [[40, 40], [360, 40], [360, 130], [220, 220], [40, 220]];
var HOLES = [[85, 85, 14], [315, 85, 14], [85, 175, 14]];
var SLOT = [[150, 90], [250, 90], 10];
function roundPoly(pts, r, segs) {
  if (!segs) return pts.slice();
  var out = [];
  pts.forEach(function (v, i) {
    var a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
    function toward(p) { var dx = p[0] - v[0], dy = p[1] - v[1], l = Math.hypot(dx, dy); return [v[0] + dx / l * r, v[1] + dy / l * r]; }
    var p1 = toward(a), p2 = toward(b);
    for (var k = 0; k <= segs; k++) { var t = k / segs, u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * v[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * v[1] + t * t * p2[1]]); }
  });
  return out;
}
function slotPoly(n) {
  var a = SLOT[0], b = SLOT[1], r = SLOT[2], out = [], k;
  for (k = 0; k <= n; k++) { var t = Math.PI / 2 + Math.PI * k / n; out.push([a[0] + r * Math.cos(t), a[1] - r * Math.sin(t)]); }
  for (k = 0; k <= n; k++) { var s = -Math.PI / 2 + Math.PI * k / n; out.push([b[0] + r * Math.cos(s), b[1] - r * Math.sin(s)]); }
  return out;
}
// What the tracer found at each detail level: closed outlines (lists of points) and round holes.
function outline(detail) {
  if (detail === "less") return { polys: [roundPoly(OUTER, 0, 0)], circles: [] };
  if (detail === "more") return { polys: [roundPoly(OUTER, 14, 6), slotPoly(8)], circles: HOLES };
  return { polys: [roundPoly(OUTER, 12, 3)], circles: HOLES };
}
function polyD(p) { return "M" + p.map(function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); }).join("L") + "Z"; }
function sampleDrawing() {
  // Pencil lines, a little off the true outline, on paper.
  var j = function (p, k) { return [p[0] + ((k * 37) % 5 - 2) * .8, p[1] + ((k * 53) % 5 - 2) * .8]; };
  var pencil = roundPoly(OUTER, 14, 4).map(j);
  return '<rect width="' + W + '" height="' + H + '" fill="#f3efe4"/><path d="M0 30H400M0 90H400M0 150H400M0 210H400" stroke="#d9e3ef" stroke-width="1"/>' +
    '<path d="' + polyD(pencil) + '" fill="none" stroke="#4a4a4a" stroke-width="2.4" stroke-linejoin="round"/>' +
    HOLES.map(function (h) { return '<circle cx="' + (h[0] + .6) + '" cy="' + (h[1] - .5) + '" r="' + h[2] + '" fill="none" stroke="#4a4a4a" stroke-width="2.2"/>'; }).join("") +
    '<path d="' + polyD(slotPoly(8).map(j)) + '" fill="none" stroke="#4a4a4a" stroke-width="2"/>' +
    '<path d="M40 236V250M360 236V250M40 243H360" stroke="#7a6a50" stroke-width="1.4"/><text x="200" y="239" text-anchor="middle" font-size="12" fill="#5b4d36" font-family="Inter, sans-serif">4 in</text>';
}
function scale() {
  // Units per drawing pixel, once two points and a real distance are given.
  var t = TR(), d = parseFloat(t.dist);
  if (t.pts.length < 2 || !(d > 0)) return null;
  var px = Math.hypot(t.pts[1][0] - t.pts[0][0], t.pts[1][1] - t.pts[0][1]);
  return px > 2 ? d / px : null;
}
function bbox(o) {
  var xs = [], ys = [];
  o.polys.forEach(function (p) { p.forEach(function (q) { xs.push(q[0]); ys.push(q[1]); }); });
  o.circles.forEach(function (c) { xs.push(c[0] - c[2], c[0] + c[2]); ys.push(c[1] - c[2], c[1] + c[2]); });
  return { x: Math.min.apply(null, xs), y: Math.min.apply(null, ys), w: Math.max.apply(null, xs) - Math.min.apply(null, xs), h: Math.max.apply(null, ys) - Math.min.apply(null, ys) };
}
function svgFile() {
  var o = outline(TR().detail), b = bbox(o), s = scale(), u = TR().unit;
  var size = s ? ' width="' + (b.w * s).toFixed(3) + u + '" height="' + (b.h * s).toFixed(3) + u + '"' : ' width="' + b.w.toFixed(1) + '" height="' + b.h.toFixed(1) + '"';
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"' + size + ' viewBox="' + [b.x, b.y, b.w, b.h].map(function (v) { return v.toFixed(2); }).join(" ") + '">\n' +
    '<g fill="none" stroke="#000" stroke-width="0.5" vector-effect="non-scaling-stroke">\n' +
    o.polys.map(function (p) { return '<path d="' + polyD(p) + '"/>'; }).join("\n") + "\n" +
    o.circles.map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>'; }).join("\n") + "\n</g>\n</svg>\n";
}
function dxfFile() {
  // Plain R12 DXF: lines and circles, y up, in inches or mm once the size is set.
  var o = outline(TR().detail), b = bbox(o), s = scale() || 1, out = ["0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", scale() ? (TR().unit === "mm" ? "4" : "1") : "0", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"];
  function X(x) { return n3((x - b.x) * s); } function Y(y) { return n3((b.y + b.h - y) * s); }
  o.polys.forEach(function (p) { p.forEach(function (q, i) { var r = p[(i + 1) % p.length]; out.push("0", "LINE", "8", "0", "10", X(q[0]), "20", Y(q[1]), "30", "0", "11", X(r[0]), "21", Y(r[1]), "31", "0"); }); });
  o.circles.forEach(function (c) { out.push("0", "CIRCLE", "8", "0", "10", X(c[0]), "20", Y(c[1]), "30", "0", "40", n3(c[2] * s)); });
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}
// The size line under the distance field. Typing in the field updates only this line, so the caret stays put.
function sizeLine() {
  var t = TR(), sc = scale(), b = bbox(outline(t.detail));
  return '<p class="small ' + (sc ? "" : "warnline") + '" id="tr-size" role="status">' + (sc ? "Size set: the part comes out " + (b.w * sc).toFixed(2) + " × " + (b.h * sc).toFixed(2) + " " + t.unit + "." : "Size not set: the file will need scaling.") + "</p>";
}
D.views["tool-trace"] = function () {
  if (!allowed()) return D.denied("Tools");
  var t = TR(), sample = t.src === "sample", o = outline(t.detail);
  var shot = "";
  if (sample) {
    var marks = t.pts.map(function (p, i) { return '<circle class="tpt" cx="' + p[0] + '" cy="' + p[1] + '" r="5"/><text class="tptl" x="' + (p[0] + 8) + '" y="' + (p[1] - 8) + '">' + (i + 1) + "</text>"; }).join("") +
      (t.pts.length === 2 ? '<path class="trline" d="M' + t.pts[0].join(" ") + "L" + t.pts[1].join(" ") + '"/>' : "") +
      (t.cur ? '<path class="tcur" d="M' + (t.cur[0] - 10) + " " + t.cur[1] + "H" + (t.cur[0] + 10) + "M" + t.cur[0] + " " + (t.cur[1] - 10) + "V" + (t.cur[1] + 10) + '"/>' : "");
    shot = '<svg class="traceimg" viewBox="0 0 ' + W + " " + H + '" data-act="trtap" tabindex="0" role="group" aria-label="The sample drawing with its traced outline. Tap two points to set the real size. With a keyboard, move with the arrow keys and press Enter.">' +
      sampleDrawing() + '<g class="traced">' + o.polys.map(function (p) { return '<path d="' + polyD(p) + '"/>'; }).join("") + o.circles.map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>'; }).join("") + "</g>" + marks + "</svg>";
  } else if (t.src === "own") shot = '<img class="ownphoto" src="' + esc(t.photo) + '" alt="Your photo">';
  var s1 = step(1, "Photo", photoPicker("trphoto", [["trsample", "", "Use the sample drawing"]]) + shot);
  var s2 = "", s3 = "";
  if (sample) {
    s2 = step(2, "Trace", '<p class="small mute">The traced outline is drawn over the photo.</p>' +
      '<div class="field"><span class="flabel">Detail</span><span class="seg" role="group" aria-label="Detail">' + [["less", "Less"], ["normal", "Normal"], ["more", "More"]].map(function (d) { return '<button data-act="trdetail" data-v="' + d[0] + '" aria-pressed="' + (t.detail === d[0]) + '">' + d[1] + "</button>"; }).join("") + "</span></div>" +
      '<div class="field"><span class="flabel">Real size</span><p class="small">' + (t.pts.length === 0 ? "Tap two points on the drawing, then type the real distance between them." : t.pts.length === 1 ? "Point 1 is set. Tap the second point." : "Both points are set. Tap again to start over.") +
      (t.pts.length ? ' <button class="linkbtn" data-act="trclear">Clear points</button>' : "") + '</p><div class="row nowrap trdist"><input id="tr-dist" class="inp" type="number" inputmode="decimal" min="0" step="any" data-input="trdist" value="' + esc(t.dist) + '" aria-label="Real distance between the two points" placeholder="Distance">' +
      '<select class="inp" data-change="trunit" aria-label="Unit"><option value="in"' + (t.unit === "in" ? " selected" : "") + '>in</option><option value="mm"' + (t.unit === "mm" ? " selected" : "") + ">mm</option></select></div>" +
      sizeLine() + "</div>");
  } else if (t.src === "own") s2 = step(2, "Trace", '<p class="warnline">The demo only traces the sample drawing.</p><p class="small mute">Your photo is shown above so you can see the flow. The real tool draws its outline here.</p>');
  if (t.src) s3 = step(3, "Save", '<div class="row"><button class="btn primary" data-act="trsave" data-v="svg">' + D.ic("download", 16) + ' Download SVG</button><button class="btn" data-act="trsave" data-v="dxf">' + D.ic("download", 16) + " Download DXF</button></div>" +
    '<p class="small mute">SVG is for the laser, DXF for Onshape. The photo is not kept after the file is made.</p>');
  return head("Drawing to vector") + '<div class="content tool">' + s1 + s2 + s3 + "</div>";
};

/* ---------- Gear and sprocket finder: the maths ---------- */
var GEARS = [{ name: "20 DP", dp: 20 }, { name: "32 DP", dp: 32 }, { name: "Module 1", m: 1 }, { name: "Module 1.5", m: 1.5 }, { name: "Module 2", m: 2 }];
var CHAINS = [{ name: "#25", p: 0.25 }, { name: "#35", p: 0.375 }];
// Timing pulleys: pitch in mm and the pitch line offset, so the outside diameter can be turned into a pitch.
var BELTS = [{ name: "HTD 5 mm", p: 5, pld: 0.5715 }, { name: "GT2 3 mm", p: 3, pld: 0.381 }, { name: "GT2 2 mm", p: 2, pld: 0.254 }];
var FIT = 0.03;
/* kind: gear | sprocket | pulley; teeth: count; odIn: outside diameter in inches. Returns the nearest common size,
   how far off it is, and the pitch diameter, or match null when nothing is within 3%. */
D.gearMath = function (kind, teeth, odIn) {
  var N = Math.round(teeth), odMm = odIn * 25.4, best = null;
  if (!(N >= 6) || !(odIn > 0)) return null;
  function take(c, err, pdIn, measured) { if (!best || err < best.err) best = { size: c.name, err: err, pdIn: pdIn, measured: measured }; }
  if (kind === "gear") {
    var dp = (N + 2) / odIn, mod = odMm / (N + 2);
    var both = dp.toFixed(2) + " DP (module " + mod.toFixed(2) + ")";
    GEARS.forEach(function (g) { if (g.dp) take(g, Math.abs(dp - g.dp) / g.dp, N / g.dp, both); else take(g, Math.abs(mod - g.m) / g.m, N * g.m / 25.4, both); });
  } else if (kind === "sprocket") {
    var pitch = odIn / (0.6 + 1 / Math.tan(Math.PI / N));
    CHAINS.forEach(function (c) { take(c, Math.abs(pitch - c.p) / c.p, c.p / Math.sin(Math.PI / N), pitch.toFixed(3) + " in pitch"); });
  } else {
    BELTS.forEach(function (b) { var p = Math.PI * (odMm + 2 * b.pld) / N; take(b, Math.abs(p - b.p) / b.p, N * b.p / Math.PI / 25.4, p.toFixed(2) + " mm pitch"); });
  }
  return best.err <= FIT ? { kind: kind, teeth: N, size: best.size, err: best.err, pdIn: best.pdIn, pdMm: best.pdIn * 25.4, measured: best.measured, match: true } : { kind: kind, teeth: N, match: null, measured: best.measured };
};
var KINDS = [["gear", "Gear"], ["sprocket", "Chain sprocket"], ["pulley", "Timing pulley"]];
var BORES = [["hex12", "1/2 in hex", '1/2" hex'], ["hex38", "3/8 in hex", '3/8" hex'], ["r8", "8 mm round", "8 mm round"], ["other", "Other", ""]];
// The part's name in the Parts catalog's form, without the bore (for example "Sprocket #25, 22T"), so a search finds
// it whatever bore the shop's copy has. The bore goes in the request's note instead.
function partName(r) {
  var base = r.kind === "gear" ? "Gear " + (/^Module/.test(r.size) ? r.size.toLowerCase() : r.size) : r.kind === "sprocket" ? "Sprocket " + r.size : "Pulley " + r.size;
  return base + ", " + r.teeth + "T";
}
function boreLabel() { return BORES.filter(function (b) { return b[0] === GR().bore; })[0][1]; }
function gearResult() {
  var g = GR(), od = parseFloat(g.od), teeth = parseFloat(g.teeth);
  if (!(od > 0) || !(teeth > 0)) return null;
  return D.gearMath(g.kind, teeth, g.unit === "mm" ? od / 25.4 : od);
}
D.gearApi = { result: gearResult, name: function () { var r = gearResult(); return r && r.match ? partName(r) : ""; } };

/* ---------- Gear and sprocket finder: the screen ---------- */
function partSvg(n, sprocket) {
  var cx = 150, cy = 150, ro = 120, rr = sprocket ? 97 : 107, p = 2 * Math.PI / n, pts = [], dots = "";
  function at(r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  for (var i = 0; i < n; i++) {
    var a = i * p - Math.PI / 2;
    if (sprocket) { for (var k = 0; k <= 4; k++) pts.push(at(rr, a - .3 * p + .6 * p * k / 4)); pts.push(at(ro - 3, a + .44 * p), at(ro, a + .5 * p), at(ro - 3, a + .56 * p)); }
    else pts.push(at(rr, a), at(rr, a + .16 * p), at(ro, a + .34 * p), at(ro, a + .66 * p), at(rr, a + .84 * p));
    var t = at(ro - 8, a + .5 * p); dots += '<circle cx="' + t[0].toFixed(1) + '" cy="' + t[1].toFixed(1) + '" r="3"/>';
  }
  var hex = [0, 1, 2, 3, 4, 5].map(function (k) { return at(17, k * Math.PI / 3).map(function (v) { return v.toFixed(1); }).join(" "); }).join("L");
  return '<svg class="partimg" viewBox="0 0 300 300" role="img" aria-label="Sample ' + (sprocket ? "sprocket" : "gear") + ", " + n + ' teeth, each marked with a dot"><defs><radialGradient id="bench" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#4a5059"/><stop offset="1" stop-color="#2a2e35"/></radialGradient></defs>' +
    '<rect width="300" height="300" fill="url(#bench)"/><path d="M' + pts.map(function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); }).join("L") + 'Z" fill="' + (sprocket ? "#9aa0a8" : "#c3c8cf") + '" stroke="#5d636c" stroke-width="1.2"/>' +
    '<circle cx="150" cy="150" r="' + (sprocket ? 58 : 46) + '" fill="none" stroke="#7d838c" stroke-width="2"/><circle cx="150" cy="150" r="30" fill="#a9afb7"/><path d="M' + hex + 'Z" fill="#1d2026"/>' +
    '<g class="toothdots" fill="#f2c94f" stroke="#07090f" stroke-width="1">' + dots + "</g></svg>";
}
var SAMPLES = { gear: { kind: "gear", teeth: 40, od: "2.100", n: 40 }, sprocket: { kind: "sprocket", teeth: 22, od: "1.900", n: 22 } };
D.views["tool-gear"] = function () {
  if (!allowed()) return D.denied("Tools");
  var g = GR(), smp = SAMPLES[g.src], r = gearResult();
  var shot = smp ? partSvg(smp.n, g.src === "sprocket") : g.src === "own" ? '<img class="ownphoto" src="' + esc(g.photo) + '" alt="Your photo">' : "";
  var s1 = step(1, "Photo", photoPicker("grphoto", [["grsample", "gear", "Use the sample gear"], ["grsample", "sprocket", "Use the sample sprocket"]]) + shot);
  if (!g.src) return head("Gear and sprocket finder") + '<div class="content tool">' + s1 + "</div>";
  var s2 = step(2, "What it found", '<div class="field"><span class="flabel">Kind</span><div class="choice three" role="group" aria-label="Kind">' + KINDS.map(function (k) { return '<button data-act="grkind" data-v="' + k[0] + '" aria-pressed="' + (g.kind === k[0]) + '">' + k[1] + "</button>"; }).join("") + "</div></div>" +
    '<div class="field"><label for="gr-teeth">Teeth</label><input id="gr-teeth" class="inp narrow" type="number" inputmode="numeric" min="6" step="1" data-input="grteeth" value="' + esc(g.teeth) + '">' +
    '<span class="who">' + (smp ? "Counted from the photo. Each tooth has a dot, so you can check." : "The demo can't count teeth in your photo. Count them and type the number.") + "</span></div>");
  var s3 = step(3, "One measurement", '<div class="field"><label for="gr-od">Outside diameter, measured with calipers</label><div class="row nowrap"><input id="gr-od" class="inp narrow" type="number" inputmode="decimal" min="0" step="any" data-input="grod" value="' + esc(g.od) + '">' +
    '<select class="inp unit" data-change="grunit" aria-label="Unit"><option value="in"' + (g.unit === "in" ? " selected" : "") + '>in</option><option value="mm"' + (g.unit === "mm" ? " selected" : "") + ">mm</option></select></div>" +
    '<span class="who">A photo can\'t show true size; this one number does.' + (smp ? " Filled in for the sample." : "") + "</span></div>" +
    '<div class="field"><label for="gr-bore">Bore</label><select id="gr-bore" class="inp narrow" data-change="grbore">' + BORES.map(function (b) { return '<option value="' + b[0] + '"' + (g.bore === b[0] ? " selected" : "") + ">" + b[1] + "</option>"; }).join("") + '</select><span class="who">Set it yourself; the photo doesn\'t show it.</span></div>');
  return head("Gear and sprocket finder") + '<div class="content tool">' + s1 + s2 + s3 + gearCard(r) + "</div>";
};
// The result card. Typing in Teeth or Outside diameter redraws only this card, so the caret stays where the person types.
function gearCard(r) {
  var card;
  if (!r) card = '<section class="card gresult" id="gr-result" aria-live="polite"><h2>Result</h2><p class="mute">Type the tooth count and the outside diameter to see the size.</p></section>';
  else if (!r.match) card = '<section class="card gresult" id="gr-result" aria-live="polite"><h2>Result</h2><p class="warnline">No common size matches. Check the tooth count and the measurement.</p><p class="small mute">Measured: ' + esc(r.measured) + ".</p></section>";
  else {
    var name = partName(r), pct = Math.max(1, Math.ceil(r.err * 100));
    var sizeTip = r.kind === "gear" ? (/DP/.test(r.size) ? "Diametral pitch: teeth per inch of pitch diameter." : "Module: millimetres of pitch diameter per tooth.") : r.kind === "sprocket" ? "Chain size; the number is the pitch in eighths of an inch." : "Belt profile and the distance from tooth to tooth.";
    card = '<section class="card gresult" id="gr-result" aria-live="polite"><p class="eyebrow">Result</p><h2 id="gr-name">' + esc(name) + "</h2>" +
      '<dl class="gfacts"><div><dt>Size</dt><dd><span data-tip="' + esc(sizeTip) + '" tabindex="0" class="abbr">' + esc(r.size) + "</span></dd></div><div><dt>Teeth</dt><dd>" + r.teeth + "</dd></div><div><dt>Bore</dt><dd>" + esc(boreLabel()) + "</dd></div>" +
      '<div><dt><span data-tip="The circle where teeth meet; it sets the spacing between two parts." tabindex="0" class="abbr">Pitch diameter</span></dt><dd class="num" id="gr-pd">' + r.pdIn.toFixed(3) + " in (" + r.pdMm.toFixed(1) + " mm)</dd></div>" +
      '<div><dt>Fit</dt><dd><span class="pill ' + (r.err <= .01 ? "ok" : "warn") + '" id="gr-fit" data-tip="How close your numbers are to this common size.">Matches ' + esc(r.size) + " within " + pct + "%</span></dd></div></dl>" +
      '<div class="row"><button class="btn primary" data-act="grfind">' + D.ic("search", 16) + ' Find it in inventory</button><button class="btn" data-act="grrequest">Request this part</button></div></section>';
  }
  return card;
}

/* ---------- Actions ---------- */
var A = D.acts;
A.trsample = function () { var t = TR(); t.src = "sample"; t.pts = []; t.cur = null; D.render(); };
D.changes.trphoto = function (el) { var t = TR(); if (readPhoto(el, t)) { t.pts = []; t.cur = null; D.render(); } };
A.trdetail = function (b) { TR().detail = b.dataset.v; D.render(); };
A.trclear = function () { TR().pts = []; D.render(); };
function placePoint(p) { var t = TR(); if (t.pts.length >= 2) t.pts = []; t.pts.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]); D.render(); }
A.trtap = function (svg, e) {
  if (!e || e.detail === 0) return; // keyboard activation is handled below
  var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  var q = pt.matrixTransform(svg.getScreenCTM().inverse());
  placePoint([Math.max(0, Math.min(W, q.x)), Math.max(0, Math.min(H, q.y))]);
};
// Keyboard: arrows move a cross on the drawing (Shift moves further), Enter or Space places a point.
document.addEventListener("keydown", function (e) {
  var el = document.activeElement; if (!el || !el.classList || !el.classList.contains("traceimg")) return;
  var t = TR(), c = t.cur || [W / 2, H / 2], step = e.shiftKey ? 20 : 4, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (mv) { e.preventDefault(); t.cur = [Math.max(0, Math.min(W, c[0] + mv[0])), Math.max(0, Math.min(H, c[1] + mv[1]))]; }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t.cur = c; placePoint(c); }
  else return;
  D.render(); var s = document.querySelector(".traceimg"); if (s) s.focus();
});
// Number fields: keep the state and redraw only what depends on it, never the field itself (a full redraw loses the caret).
// The live region stays the same element (its contents change), so screen readers announce the new result.
function swap(id, html) {
  var el = document.getElementById(id); if (!el) return;
  var tmp = document.createElement("div"); tmp.innerHTML = html; var n = tmp.firstElementChild;
  D.hideTip && D.hideTip(); el.className = n.className; el.innerHTML = n.innerHTML;
}
D.inputs.trdist = function (el) { TR().dist = el.value; swap("tr-size", sizeLine()); };
D.changes.trunit = function (el) { TR().unit = el.value; D.render(); };
A.trsave = function (b) {
  var t = TR(), svg = b.dataset.v === "svg";
  if (svg) download("drawing-outline.svg", "image/svg+xml", svgFile()); else download("drawing-outline.dxf", "application/dxf", dxfFile());
  var what = svg ? "SVG" : "DXF";
  D.toast(t.src === "own" ? "Saved the sample drawing's " + what + ". The demo can't trace your photo." : "Saved drawing-outline." + what.toLowerCase() + (scale() ? "." : ". Size not set: scale it before cutting."));
  D.render();
};
A.grsample = function (b) { var g = GR(), s = SAMPLES[b.dataset.v]; g.src = b.dataset.v; g.kind = s.kind; g.teeth = String(s.teeth); g.od = s.od; g.unit = "in"; D.render(); };
D.changes.grphoto = function (el) { var g = GR(); if (readPhoto(el, g)) { g.teeth = ""; g.od = ""; D.render(); } };
A.grkind = function (b) { GR().kind = b.dataset.v; D.render(); };
D.inputs.grteeth = function (el) { GR().teeth = el.value; swap("gr-result", gearCard(gearResult())); };
D.inputs.grod = function (el) { GR().od = el.value; swap("gr-result", gearCard(gearResult())); };
D.changes.grunit = function (el) { var g = GR(), v = parseFloat(g.od); if (v > 0 && el.value !== g.unit) g.od = el.value === "mm" ? (v * 25.4).toFixed(2) : (v / 25.4).toFixed(3); g.unit = el.value; D.render(); };
D.changes.grbore = function (el) { GR().bore = el.value; D.render(); };
// Doors from the result into Parts & Inventory: its own inventory search and its own prefilled request form.
A.grfind = function () { var name = D.gearApi.name(); if (!name) return; D.S.parts.invq = name; D.S.parts.loc = "all"; D.S.parts.low = false; D.S.tabs.parts = "inventory"; D.go("parts"); };
A.grrequest = function () { var name = D.gearApi.name(); if (!name) return; D.partsApi.startRequest({ name: name, why: "Bore: " + boreLabel() + ".", from: "Gear and sprocket finder", task: name }); };
})();
