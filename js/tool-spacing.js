/* Tools: Belt, chain and gear spacing (#tool-spacing). Two pulleys, sprockets or gears, and the distance between
   their centres that makes the belt, chain or teeth fit. The drawing is to scale and runs, so the ratio shows.
   This file is also the pattern the other calculators follow: state in defaults, maths from js/frc.js in compute,
   then controls, outs, more and draw. */
(function () {
"use strict";
var K = D.calc, F = FRC, esc = D.esc, ID = "tool-spacing";
var GEARS = [["dp20", "20 DP", { dp: 20 }], ["dp32", "32 DP", { dp: 32 }], ["m1", "Module 1", { module: 1 }], ["m15", "Module 1.5", { module: 1.5 }], ["m2", "Module 2", { module: 2 }]];
function beltOf(s) { return F.BELTS.filter(function (b) { return b.id === s.belt; })[0] || F.BELTS[0]; }
function chainOf(s) { return F.CHAINS.filter(function (c) { return c.id === s.chain; })[0] || F.CHAINS[0]; }
function gearOf(s) { return GEARS.filter(function (g) { return g[0] === s.gear; })[0] || GEARS[0]; }
function inmm(x) { return K.fix(x, 3) + " in"; }
/* Gear pairs for a distance you already have. Two gears' centre distance depends only on the SUM of their teeth, so
   find the sums nearest the wanted distance, then list the pairs of common sizes with each sum. Common sizes:
   pinions of 8 to 16 teeth and gears of 14 to 84 teeth in steps of 2 (what vendors stock; not a stock check). */
function common(n) { return (n >= 8 && n <= 16) || (n >= 14 && n <= 84 && n % 2 === 0); }
function fitGears(size, want, extra) {
  var per = size.dp ? 1 / (2 * size.dp) : size.module / 25.4 / 2, exact = (want - extra) / per, out = [];
  [Math.floor(exact), Math.ceil(exact)].filter(function (v, i, a) { return v >= 16 && a.indexOf(v) === i; }).forEach(function (sum) {
    var c = sum * per + extra, pairs = [];
    for (var a = 8; a <= sum / 2; a++) if (common(a) && common(sum - a)) pairs.push([a, sum - a]);
    out.push({ sum: sum, center: c, off: c - want, pairs: pairs });
  });
  out.sort(function (x, y) { return Math.abs(x.off) - Math.abs(y.off); });
  return out;
}

K.tool({
  id: ID,
  defaults: { kind: "belt", belt: "htd5", chain: "25", gear: "dp20", n1: 16, n2: 24, target: 5, extra: 0, gextra: 0.003, cextra: 0.018, pick: -1, gwant: 0 },
  stage: { ratio: 2.1, label: "The two wheels at their centre distance, to scale, with the belt, chain or gear teeth moving." },
  loop: true, autoplay: true,
  onPick: function (key, v, s) { if (key !== "pick") s.pick = -1; },

  compute: function (s) {
    var r = { kind: s.kind, n1: s.n1, n2: s.n2, ratio: s.n2 / s.n1 };
    if (s.kind === "gear") {
      var gp = F.gearPair(s.n1, s.n2, gearOf(s)[2], s.gextra);
      r.pd1 = gp.pd1; r.pd2 = gp.pd2; r.od1 = gp.od1; r.od2 = gp.od2; r.center = gp.center; r.size = gearOf(s)[1];
      if (s.gwant > 0) {
        r.fits = fitGears(gearOf(s)[2], s.gwant, s.gextra);
        // With holes already drilled the allowance does not apply: the pair is drawn on the holes when it fits them,
        // and at its own exact meshing distance (with the hole marked) when it does not.
        r.exact = gp.center - s.gextra; r.slack = s.gwant - r.exact; r.fitsNow = r.slack >= 0.0015 && r.slack <= 0.008;
        r.center = r.fitsNow ? s.gwant : r.exact;
      }
      return r;
    }
    var res, b;
    if (s.kind === "belt") { b = beltOf(s); res = F.belt({ pitch: b.pitch, pld: b.pld, n1: s.n1, n2: s.n2, target: s.target, extra: s.extra, step: b.step, min: b.min, max: b.max }); r.pitchIn = b.pitch / 25.4; r.size = b.name; r.od1 = res.od1; r.od2 = res.od2; }
    else { b = chainOf(s); res = F.chain({ pitch: b.pitch, n1: s.n1, n2: s.n2, target: s.target, extra: s.cextra }); r.pitchIn = b.pitch; r.size = b.name + " chain"; r.od1 = res.pd1 + b.pitch * 0.6; r.od2 = res.pd2 + b.pitch * 0.6; r.roller = b.roller; }
    r.pd1 = res.pd1; r.pd2 = res.pd2; r.options = res.options.slice().sort(function (a, c) { return a.center - c.center; });
    // The chosen loop: the one the person picked from the table, else the nearest to the wanted distance.
    var chosen = null; if (s.pick > 0) chosen = r.options.filter(function (o) { return (o.teeth || o.links) === s.pick; })[0];
    r.sel = chosen || res.options[0] || null;
    if (r.sel) { r.center = r.sel.center; r.count = r.sel.teeth || r.sel.links; }
    return r;
  },

  controls: function (s) {
    var kind = K.seg(ID, "kind", "They are joined by", [["belt", "Belt"], ["chain", "Chain"], ["gear", "Gears"]]);
    var size = s.kind === "belt" ? K.pick(ID, "belt", "Belt", F.BELTS.map(function (b) { return [b.id, b.name]; })) :
      s.kind === "chain" ? K.pick(ID, "chain", "Chain", F.CHAINS.map(function (c) { return [c.id, c.name]; })) :
      K.pick(ID, "gear", "Tooth size", GEARS.map(function (g) { return [g[0], g[1]]; }), { hint: "DP: teeth per inch of pitch diameter. Module: mm of pitch diameter per tooth.", tip: "DP is teeth per inch of pitch diameter. Module is millimetres of pitch diameter per tooth." });
    var word = s.kind === "belt" ? "pulley" : s.kind === "chain" ? "sprocket" : "gear";
    var teeth = K.num(ID, "n1", "Driving " + word, { unit: "teeth", min: 8, max: 120, step: 1, slider: true, tip: "The one the motor turns." }) + K.num(ID, "n2", "Driven " + word, { unit: "teeth", min: 8, max: 120, step: 1, slider: true });
    var space = s.kind === "gear" ?
      K.num(ID, "gwant", "Distance you already have", { unit: "in", min: 0, max: 12, step: 0.001, hint: "Holes already drilled? Type their spacing to see which gear pairs mesh there, and how much slack each has. Leave 0 otherwise.", tip: "The table under the answers lists pairs of common gears whose centre distance is nearest this." }) +
      K.num(ID, "gextra", "Extra spacing", { unit: "in", min: 0, max: 0.02, step: 0.001, hint: "Added so the teeth do not bind (backlash). Not used when you give a distance above: the slack is then whatever your holes leave.", tip: "Added to the exact distance so the teeth do not bind. 0.003 in is a common choice for 20 DP gears in a plate cut on a router." }) :
      K.num(ID, "target", "Wanted centre distance", { unit: "in", min: 1, max: 40, step: 0.001, slider: true, tip: "Roughly where you want the two shafts. The calculator finds the real distances a stock belt or a whole number of links gives." }) +
      (s.kind === "belt" ? K.num(ID, "extra", "Extra spacing", { unit: "in", min: -0.02, max: 0.05, step: 0.001, hint: "Added to the exact distance. 0 suits most belts.", tip: "Added to the exact distance. Leave at 0 for a belt on fixed centres unless your pulleys run tight." }) :
        K.num(ID, "cextra", "Extra spacing", { unit: "in", min: 0, max: 0.06, step: 0.001, hint: "Added so the chain goes on.", tip: "Added to the exact distance so the chain goes on. 0.018 in is a common choice for #25 chain." }));
    return K.group(ID, "kind", "Parts", kind + size) + K.group(ID, "teeth", "Teeth", teeth) + K.group(ID, "space", "Spacing", space);
  },

  outs: function (s, r) {
    var faster = r.ratio < 1, rtxt = (faster ? K.fix(1 / r.ratio, 2) + "× faster" : r.ratio === 1 ? "same speed" : K.fix(r.ratio, 2) + "× slower");
    if (s.kind === "gear") {
      if (s.gwant > 0) {
        var perG = gearOf(s)[2].dp ? 1 / (2 * gearOf(s)[2].dp) : gearOf(s)[2].module / 25.4 / 2, slk = s.gwant - (s.n1 + s.n2) * perG, fitsNow = slk >= 0.0015 && slk <= 0.008;
        var want2 = Math.round((s.gwant - 0.004) / perG), sug = null, bestD = 1e9;
        (r.fits || []).forEach(function (f) { if (f.sum === want2) f.pairs.forEach(function (p) { if (p[0] >= 14 && Math.abs(p[1] / p[0] - r.ratio) < bestD) { bestD = Math.abs(p[1] / p[0] - r.ratio); sug = p; } }); });
        var smallP = Math.min(s.n1, s.n2) < 14;
        return K.verdict(fitsNow ? (smallP ? "warn" : "ok") : "bad", fitsNow ? (smallP ? s.n1 + ":" + s.n2 + " fits your holes " + K.fix(s.gwant, 3) + " in apart by the standard sum, with " + K.fix(slk, 3) + " in of slack, but a " + Math.min(s.n1, s.n2) + "-tooth pinion is often cut for a different spacing: check the maker's page before you rely on it." : s.n1 + ":" + s.n2 + " fits your holes " + K.fix(s.gwant, 3) + " in apart, with " + K.fix(slk, 3) + " in of slack.") : s.n1 + ":" + s.n2 + " does not fit holes " + K.fix(s.gwant, 3) + " in apart: it meshes at " + K.fix((s.n1 + s.n2) * perG, 3) + " in." + (sug ? " " + sug[0] + ":" + sug[1] + " (" + K.fix(sug[1] / sug[0], 2) + ":1) does, as does any pair in the table marked fits." : " See the table for what does."), "Pinions of 14 teeth or more are standard. Smaller ones are often cut to mesh at a larger gear's spacing: check the maker's page.") +
          K.outs([{ k: "Your holes", v: K.fix(s.gwant, 3), u: "in" }, { k: "This pair meshes at", v: K.fix((s.n1 + s.n2) * perG, 3), u: "in", sub: "exact, no slack" }, { k: "Slack at your holes", v: (slk < 0 ? "−" : "") + K.fix(Math.abs(slk), 3), u: "in", state: fitsNow ? "ok" : "bad", sub: "0.002 to 0.008 in is right for 20 DP" }, { k: "Ratio", v: K.fix(r.ratio, 3), u: ": 1", sub: rtxt }]);
      }
      return K.verdict("ok", "Put the shaft centres " + K.fix(r.center, 3) + " in apart" + (s.gextra > 0 ? " (the exact " + K.fix(r.center - s.gextra, 3) + " in plus " + K.fix(s.gextra, 3) + " in, an allowance you can change)" : "") + ". The driven gear turns the other way, " + rtxt + ".", "Pinions of 14 teeth or more are standard. Smaller ones are often cut to mesh at a larger gear's spacing: check the maker's page.") +
        K.outs([{ k: "Centre distance", v: K.fix(r.center, 3), u: "in", sub: K.fix(r.center * 25.4, 2) + " mm" },
          { k: "Ratio", v: K.fix(r.ratio, 3), u: ": 1", sub: rtxt, tip: "Driven teeth divided by driving teeth." },
          { k: "Pitch diameters", v: K.fix(r.pd1, 3) + " / " + K.fix(r.pd2, 3), u: "in", tip: "The circles that roll on each other. Their radii add up to the exact centre distance." },
          { k: "Outside diameters", v: K.fix(r.od1, 3) + " / " + K.fix(r.od2, 3), u: "in", sub: "for checking clearance" }]);
    }
    if (!r.sel) return K.verdict("bad", "No " + (s.kind === "belt" ? "belt" : "chain") + " fits these two at that distance. Move them further apart.");
    var o = r.sel, word = s.kind === "belt" ? o.teeth + "-tooth belt" : o.links + "-link chain", off = o.err, small = Math.min(o.mesh1, o.mesh2);
    var state = small < 6 && s.kind === "belt" ? "warn" : "ok";
    var text = "A " + word + " fits at " + K.fix(o.center, 3) + " in" + (Math.abs(off) < 0.0005 ? ", exactly what you wanted." : ", " + K.fix(Math.abs(off), 3) + " in " + (off > 0 ? "more" : "less") + " than you wanted.") +
      (state === "warn" ? " Only " + small + " teeth grip the small pulley. A common rule of thumb is six or more; fewer can skip under load." : "");
    return K.verdict(state, text, Math.abs(off) < 0.0005 ? "" : "With fixed holes, drill them " + K.fix(o.center, 3) + " in apart, not " + K.fix(s.target, 3) + "." + (off < 0 ? " This loop is too short to reach " + K.fix(s.target, 3) + " in. To keep that distance, take the next longer one in the table and use a tensioner to take up its slack." : " To keep " + K.fix(s.target, 3) + " in with this loop, add a tensioner to take up the slack.")) + K.outs([
      { k: "Centre distance", v: K.fix(o.center, 3), u: "in", sub: K.fix(o.center * 25.4, 2) + " mm" },
      { k: s.kind === "belt" ? "Belt" : "Chain", v: String(r.count), u: s.kind === "belt" ? "teeth" : "links", sub: K.fix(o.length, 2) + " in long" },
      { k: "Ratio", v: K.fix(r.ratio, 3), u: ": 1", sub: rtxt, tip: "Driven teeth divided by driving teeth." },
      { k: "Teeth gripped", v: o.mesh1 + " and " + o.mesh2, sub: "on the " + s.n1 + "T driving " + (s.kind === "belt" ? "pulley" : "sprocket") + " and the " + s.n2 + "T driven one" + (s.kind === "belt" ? ". Six or more is a rule of thumb; the belt maker rates the load" : ""), state: state === "warn" ? "warn" : "", tip: "How many teeth the belt or chain wraps on each wheel. Few teeth on a small pulley is where belts skip." },
      { k: "Gap between them", v: K.fix(o.gap, 3), u: "in", sub: "between their outer edges, about: flanges and hubs vary by maker", state: o.gap < 0.05 ? "warn" : "", tip: "Clear space between the two wheels' outer edges." }]);
  },

  more: function (s, r) {
    var out = "";
    if (s.kind !== "gear" && r.options && r.options.length) {
      var unit = s.kind === "belt" ? "teeth" : "links";
      out += '<section class="ctab"><h2>' + (s.kind === "belt" ? "Belts" : "Chains") + ' near that distance</h2><div class="scroll"><table><thead><tr><th>' + (s.kind === "belt" ? "Belt" : "Chain") + '</th><th class="r">Centre distance</th><th class="r">Against wanted</th><th class="r">Teeth gripped</th><th></th></tr></thead><tbody>' +
        r.options.map(function (o) {
          var n = o.teeth || o.links, on = r.sel === o;
          return '<tr class="' + (on ? "pick" : "") + '"><td>' + n + " " + unit + '</td><td class="r num">' + K.fix(o.center, 3) + ' in</td><td class="r num">' + (o.err >= 0 ? "+" : "−") + K.fix(Math.abs(o.err), 3) + ' in</td><td class="r num">' + o.mesh1 + " / " + o.mesh2 + '</td><td class="r">' + (on ? '<span class="pill ok">In the drawing</span>' : '<button class="btn sm" data-act="spuse" data-v="' + n + '">Use this one</button>') + "</td></tr>";
        }).join("") + "</tbody></table></div>" +
        '<div class="row"><button class="btn sm" data-act="spfind">' + D.ic("search", 16) + " Find it in inventory</button></div></section>";
    }
    if (s.kind === "gear" && r.fits) {
      // With holes already drilled the question is how each total sits AT that spacing: its slack is the hole
      // spacing minus the exact meshing distance. A few thousandths is right; none may bind; too much rattles.
      var per = gearOf(s)[2].dp ? 1 / (2 * gearOf(s)[2].dp) : gearOf(s)[2].module / 25.4 / 2;
      function slackOf(f) { return s.gwant - f.sum * per; }
      function how(sl) { return sl < -0.0005 ? ["bad", "will not go on"] : sl < 0.0015 ? ["warn", "no slack: may bind"] : sl <= 0.008 ? ["ok", "fits"] : sl <= 0.03 ? ["warn", "loose"] : ["bad", "too far apart to mesh"]; }
      var okSum = r.fits.filter(function (f) { return how(slackOf(f))[0] === "ok"; })[0];
      out += '<section class="ctab"><h2>Gear pairs for holes ' + K.fix(s.gwant, 3) + ' in apart</h2>' +
        (r.fits.length ? '<p class="small mute">A pair\'s exact meshing distance depends only on its teeth added together. The slack is your hole spacing minus that distance: about 0.002 to 0.008 in is right for 20 DP. ' + (okSum ? "A total of " + okSum.sum + " teeth fits." : "No total of whole teeth fits these holes well: " + r.fits.map(function (f) { return f.sum + " teeth leaves " + K.fix(slackOf(f), 3) + " in"; }).join(", ") + ". Move a hole, or use slots.") + ' Pairs with a pinion under 14 teeth need the maker\'s own spacing.</p><div class="scroll"><table><thead><tr><th>Pair</th><th class="r">Ratio</th><th class="r">Exact meshing distance</th><th class="r">Slack at your holes</th><th>At your holes</th><th></th></tr></thead><tbody>' +
          (r.fits.some(function (f) { return f.sum === s.n1 + s.n2; }) ? "" : (function () { var sl = s.gwant - (s.n1 + s.n2) * per, hw = how(sl); return '<tr class="pick"><td>' + s.n1 + " : " + s.n2 + (Math.min(s.n1, s.n2) < 14 ? " (small pinion)" : "") + '</td><td class="r num">' + K.fix(s.n2 / s.n1, 2) + ' : 1</td><td class="r num">' + K.fix((s.n1 + s.n2) * per, 3) + ' in</td><td class="r num">' + (sl < 0 ? "−" : "") + K.fix(Math.abs(sl), 3) + ' in</td><td><span class="pill ' + hw[0] + '">' + hw[1] + '</span></td><td class="r">In the drawing</td></tr>'; })()) +
          r.fits.map(function (f) { var sl = slackOf(f), hw = how(sl); return f.pairs.filter(function (p) { return p[0] >= 10; }).sort(function (x, y) { return Math.abs(x[1] / x[0] - r.ratio) - Math.abs(y[1] / y[0] - r.ratio); }).slice(0, 6).map(function (p) { var on = p[0] === s.n1 && p[1] === s.n2, hp = p[0] < 14 && hw[0] === "ok" ? ["warn", "check the maker's spacing"] : hw; return '<tr class="' + (on ? "pick" : "") + '"><td>' + p[0] + " : " + p[1] + (p[0] < 14 ? " (small pinion)" : "") + '</td><td class="r num">' + K.fix(p[1] / p[0], 2) + ' : 1</td><td class="r num">' + K.fix(f.sum * per, 3) + ' in</td><td class="r num">' + (sl < 0 ? "−" : "") + K.fix(Math.abs(sl), 3) + ' in</td><td><span class="pill ' + hp[0] + '">' + hp[1] + '</span></td><td class="r">' + (on ? "In the drawing" : '<button class="btn sm" data-act="spgear" data-a="' + p[0] + '" data-b="' + p[1] + '">Draw this pair</button>') + "</td></tr>"; }).join(""); }).join("") +
          "</tbody></table></div>" : '<p class="warnline">That is too close together for two gears of this tooth size.</p>') + "</section>";
    }
    out += K.notes(s.kind === "gear" ?
      "<p>Two gears run on their pitch circles. A gear's pitch diameter is its tooth count divided by the DP (or its tooth count times the module, in millimetres), and the centre distance is half the sum of the two pitch diameters.</p>" +
      '<p class="eq">centre = (teeth₁ + teeth₂) ÷ (2 × DP) + extra</p>' +
      "<p>The extra spacing keeps the teeth from binding when the holes are a little off. Small pinions are sometimes cut with a shifted profile and need the spacing of a larger gear; check the part's page.</p>" :
      "<p>A belt is a loop of fixed length round two circles. Its length is the two straight runs plus the arc it wraps on each pulley:</p>" +
      '<p class="eq">length = 2 × C × cos α + π × (D₁ + D₂) ÷ 2 + α × (D₁ − D₂),  sin α = (D₁ − D₂) ÷ (2 × C)</p>' +
      "<p>C is the centre distance and D the pitch diameters. Belts only come in certain tooth counts and a chain has a whole, even number of links, so only certain distances work. The calculator solves this equation for C for each loop near the distance you asked for.</p>" +
      (s.kind === "belt" ? "<p>A pulley's pitch diameter is its tooth count times the belt pitch, divided by π. The belt's pitch line runs just outside the pulley's teeth.</p>" : "<p>A chain is nearly the same, with one difference: on a sprocket it sits as a polygon, link by link, so a full turn takes exactly as many links as the sprocket has teeth, a little less than the circle's length. The straight runs are worked out as for a belt, from pitch diameters of chain pitch ÷ sin(180° ÷ teeth). Two 16-tooth #25 sprockets with 64 links sit exactly 6 in apart.</p>") +
      "<p>Checked against ReCalc: 16 and 24 teeth on HTD 5 mm give 4.915 in with a 70-tooth belt and 5.408 in with 75.</p>");
    return out;
  },

  draw: function (g, s, r, t) {
    var c = g.c, C = r.center; if (!(C > 0)) { g.text("Nothing to draw yet.", 16, 28, { color: c.mute }); return; }
    var R1 = r.od1 / 2, R2 = r.od2 / 2, big = Math.max(R1, R2), m = big * 0.12 + 0.15;
    var V = g.view({ x0: -R1 - m, x1: C + R2 + m, y0: -big - m, y1: big + m }, { l: 14, r: 14, t: s.kind === "gear" && s.gwant > 0 ? (g.w > 520 ? 46 : 62) : 28, b: 52 }, "middle");
    g.grid(V, 1, g.w > 520 ? "1 in squares" : "");
    var x1 = V.X(0), x2 = V.X(C), y = V.Y(0), p1 = V.L(r.pd1 / 2), p2 = V.L(r.pd2 / 2);
    var speed = 0.9, a1 = t * speed, a2;               // the driving wheel's angle (radians, clockwise on screen)
    if (s.kind === "gear") {
      a2 = Math.PI - Math.PI / s.n2 - a1 * s.n1 / s.n2;
      g.gear(x1, y, p1, s.n1, a1, { fill: c.part }); g.gear(x2, y, p2, s.n2, a2, { fill: c.part2 });
      g.circle(x1, y, p1, { stroke: c.accent, width: 1, dash: [4, 4] }); g.circle(x2, y, p2, { stroke: c.accent, width: 1, dash: [4, 4] });
      if (g.w > 520) g.text("dashed: pitch circles, which roll on each other", g.w - 12, g.h - 10, { align: "right", color: c.mute, size: 11 });
    } else {
      var al = Math.asin(F.clamp((p1 - p2) / (x2 - x1), -1, 1)), sn = Math.sin(al), cs = Math.cos(al), Tn = (x2 - x1) * cs;
      var arc2 = p2 * (Math.PI - 2 * al), arc1 = p1 * (Math.PI + 2 * al), L = 2 * Tn + arc1 + arc2;
      var pos = function (d) {                           // a point d pixels along the loop, and the way "in" from it
        d = ((d % L) + L) % L;
        if (d < Tn) return [x1 + p1 * sn + cs * d, y - p1 * cs + sn * d, -sn, cs];
        d -= Tn; var a;
        if (d < arc2) { a = -(Math.PI / 2 - al) + d / p2; return [x2 + p2 * Math.cos(a), y + p2 * Math.sin(a), -Math.cos(a), -Math.sin(a)]; }
        d -= arc2;
        if (d < Tn) return [x2 + p2 * sn - cs * d, y + p2 * cs + sn * d, -sn, -cs];
        d -= Tn; a = Math.PI / 2 - al + d / p1; return [x1 + p1 * Math.cos(a), y + p1 * Math.sin(a), -Math.cos(a), -Math.sin(a)];
      };
      var travel = a1 * p1, n = r.count, pitch = L / n, i, q;
      if (s.kind === "belt") {
        var tooth = Math.max(3, pitch * 0.36), o1 = p1 + tooth * 0.15, o2 = p2 + tooth * 0.15;   // the rim reaches the belt's inner face
        g.circle(x1, y, o1, { fill: c.part, stroke: c.partLine, width: 1 }); g.circle(x2, y, o2, { fill: c.part, stroke: c.partLine, width: 1 });
        [[x1, p1, s.n1, a1], [x2, p2, s.n2, a1 * s.n1 / s.n2]].forEach(function (w) {
          // Three lightening holes show the pulley turning; the belt's teeth show the rest.
          if (w[1] > 16) for (var k = 0; k < 3; k++) { var a = w[3] + k * 2 * Math.PI / 3; g.circle(w[0] + w[1] * 0.55 * Math.cos(a), y + w[1] * 0.55 * Math.sin(a), w[1] * 0.2, { fill: c.sheet, stroke: c.partLine, width: 1 }); }
          hub(g, w[0], y, w[1], w[3]);
        });
        var body;
        // The belt's back is a band outside the pitch line; its teeth point inward and sit in the pulley's rim.
        var bandW = Math.max(3, V.L(0.07)); body = []; for (i = 0; i <= 240; i++) { q = pos(L * i / 240); body.push([q[0] - q[2] * bandW * 0.5, q[1] - q[3] * bandW * 0.5]); }
        g.poly(body, { stroke: c.text, width: bandW, close: true });
        for (i = 0; i < n; i++) { q = pos(travel + i * pitch); g.line(q[0], q[1], q[0] + q[2] * tooth, q[1] + q[3] * tooth, { color: c.text, width: Math.max(1.5, pitch * 0.42), cap: "butt" }); }
      } else {
        g.gear(x1, y, p1, s.n1, a1 + Math.PI / s.n1, { fill: c.part }); g.gear(x2, y, p2, s.n2, a1 * s.n1 / s.n2 + Math.PI / s.n2 - (Tn / p2) * 0, { fill: c.part2 });
        var prev = pos(travel - pitch), rr = Math.max(1.6, V.L(r.roller / 2));
        for (i = 0; i < n; i++) { q = pos(travel + i * pitch); g.line(prev[0], prev[1], q[0], q[1], { color: i % 2 ? c.text : c.text2, width: Math.max(2.5, rr * 1.7) }); prev = q; }
        for (i = 0; i < n; i++) { q = pos(travel + i * pitch); g.circle(q[0], q[1], rr * 0.55, { fill: c.sheet, stroke: null }); }
      }
    }
    // Dimensions and names, as on a drawing.
    var by = Math.min(V.Y(-big) + 4, g.h - 48);
    g.line(x1, y, x1, by + 30, { color: c.mute, width: 1, dash: [6, 3, 1, 3] }); g.line(x2, y, x2, by + 30, { color: c.mute, width: 1, dash: [6, 3, 1, 3] });
    var have = s.kind === "gear" && s.gwant > 0;
    g.dim(x1, by + 30, x2, by + 30, K.fix(C, 3) + " in" + (!have ? " centre to centre" : r.fitsNow ? ", your holes" : ", where this pair meshes"), 0, { side: "below" });
    // The note about the holes is a key line under the heading, clear of the gears; the cross marks the hole itself.
    if (have && r.fitsNow) g.text("On your holes, with " + K.fix(r.slack, 3) + " in of slack", 12, 36, { color: c.ok, size: 11, weight: 700 });
    if (have && !r.fitsNow) {
      var hx = V.X(s.gwant), far = r.slack > 0, cross = function (x, yy, k) { g.line(x, yy - k, x, yy + k, { color: c.bad, width: 2 }); g.line(x - k, yy, x + k, yy, { color: c.bad, width: 2 }); };
      cross(hx, y, 10); cross(18, 36, 5);
      var l1 = "your second hole, " + K.fix(s.gwant, 3) + " in:", l2 = K.fix(Math.abs(r.slack), 3) + " in " + (far ? "further out than this pair reaches" : "closer in than this pair needs");
      if (g.w > 520) g.text(l1 + " " + l2, 30, 36, { color: c.bad, size: 11, weight: 700 });
      else { g.text(l1, 30, 36, { color: c.bad, size: 11, weight: 700 }); g.text(l2, 30, 50, { color: c.bad, size: 11, weight: 700 }); }
    }
    // Name each wheel and show which way it turns.
    [[x1, "driving", 1], [x2, "driven", s.kind === "gear" ? -1 : 1]].forEach(function (q) {
      var rr = Math.max(9, Math.min(V.L(big) * 0.5, 20)), a0 = -2.5, a1 = -0.9, tip = q[2] > 0 ? a1 : a0, tx = q[0] + rr * Math.cos(tip), ty2 = y + rr * Math.sin(tip), tang = tip + q[2] * Math.PI / 2;
      g.arc(q[0], y, rr, a0, a1, { color: c.accent, width: 2 });
      g.poly([[tx + 6 * Math.cos(tang), ty2 + 6 * Math.sin(tang)], [tx + 4 * Math.cos(tang + 2.4), ty2 + 4 * Math.sin(tang + 2.4)], [tx + 4 * Math.cos(tang - 2.4), ty2 + 4 * Math.sin(tang - 2.4)]], { fill: c.accent, stroke: null });
      if (g.h > 150) g.text(q[1], q[0] + 6, by + 6, { align: "left", color: c.text2, size: 11, weight: 600, base: "top" });
    });
    g.text("Driving " + s.n1 + "T, driven " + s.n2 + "T: " + (r.ratio === 1 ? "same speed" : r.ratio > 1 ? K.fix(r.ratio, 2) + "× slower" : K.fix(1 / r.ratio, 2) + "× faster") + (s.kind === "gear" ? ", the other way round" : ""), 12, 18, { weight: 600 });
  }
});
function hub(g, x, y, rp, ang) {
  var b = Math.max(3, Math.min(rp * 0.3, 9)), hex = [];
  for (var k = 0; k < 6; k++) hex.push([x + b * Math.cos(ang + k * Math.PI / 3), y + b * Math.sin(ang + k * Math.PI / 3)]);
  g.poly(hex, { fill: g.c.sheet, stroke: g.c.partLine, width: 1 });
}
D.acts.spgear = function (b) { var s = K.state(ID); s.n1 = +b.dataset.a; s.n2 = +b.dataset.b; D.render(); };
D.acts.spuse = function (b) { K.state(ID).pick = +b.dataset.v; D.render(); };
// A door into Parts: its own inventory search, as the Gear and sprocket finder does.
D.acts.spfind = function () {
  var s = K.state(ID), r = K.result(ID); if (!r || !r.sel) return;
  D.S.parts.invq = s.kind === "belt" ? "belt " + r.count : "#" + s.chain + " roller chain"; D.S.parts.loc = "all"; D.S.parts.low = false; D.S.tabs.parts = "inventory"; D.go("parts");
};
})();
