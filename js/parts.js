/* Parts & Inventory: requests, catalog, approval over a limit, vendor carts, mark ordered with a cost split, check-off on arrival, inventory by place, budgets, vendors. */
(function () {
"use strict";
var esc = D.esc, money = D.money;
var TODAY = new Date(2026, 10, 10);
var DAY = 86400000;
function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function fmt(s) { if (!s) return "—"; var d = parse(s); return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
function addDays(s, n) { var d = parse(s); return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }
var LIMIT = 25000;
// What a budget has left after spent and approved-but-not-ordered requests.
function budgetLeft(id) { var p = P(), b = BUDGETS.filter(function (x) { return x.id === id; })[0]; if (!b) return null; return b.budget - (p.spent[id] || 0) - p.requests.filter(function (r) { return r.status === "toorder" && r.bud === id; }).reduce(function (a, r) { return a + total(r); }, 0); }
function budgetEffect(r) { var left = budgetLeft(r.bud); return left == null ? "" : esc(bname(r.bud)) + ": " + money(left) + " left → " + money(left - total(r)) + " after this"; }
var VURL = { REV: "https://www.revrobotics.com", WCP: "https://wcproducts.com", AndyMark: "https://www.andymark.com", "McMaster-Carr": "https://www.mcmaster.com", "The Thrifty Bot": "https://www.thethriftybot.com", CTRE: "https://store.ctr-electronics.com", Amazon: "https://www.amazon.com" };
var PRI = { blocking: ["Blocking", "bad"], high: ["High", "warn"], normal: ["Normal", ""], nice: ["Nice to have", ""] };
var STATUS = { needsok: ["Needs mentor OK", "warn"], toorder: ["To order", ""], ordered: ["Ordered", "info"], arrived: ["Arrived", "ok"], putaway: ["Put away", "ok"], denied: ["Denied", "bad"], cancelled: ["Cancelled", ""] };
var BUDGETS = [ { id: "drive", name: "Drivetrain", budget: 300000 }, { id: "mech", name: "Mechanisms", budget: 400000 }, { id: "elec", name: "Electrical", budget: 250000 }, { id: "tools", name: "Tools", budget: 150000 }, { id: "spares", name: "Spares", budget: 120000 }, { id: "comp", name: "Competition", budget: 80000 } ];
function bname(id) { return BUDGETS.filter(function (b) { return b.id === id; })[0].name; }

function init(S) {
  var vendors = [
    { name: "REV", free: 10000, min: null, lead: 1, ship: 4, cutoff: "2 pm CT", pay: "Team card (Mr. Okafor)", taxfree: true, def: "mech", credits: [] },
    { name: "WCP", free: 20000, min: null, lead: 1, ship: 5, cutoff: "1 pm PT", pay: "Team card (Mr. Okafor)", taxfree: true, def: "drive", credits: [ { label: "Sponsor discount", code: "2972-WCP-10", bal: null } ] },
    { name: "The Thrifty Bot", free: 7500, min: null, lead: 2, ship: 5, cutoff: "noon ET", pay: "Team card", taxfree: false, def: "mech", credits: [] },
    { name: "AndyMark", free: 15000, min: null, lead: 1, ship: 4, cutoff: "3 pm ET", pay: "PO from school", taxfree: true, def: "mech", credits: [ { label: "Store credit (2026 return)", code: "", bal: 4210 } ] },
    { name: "CTRE", free: null, min: null, lead: 3, ship: 5, cutoff: "", pay: "Team card", taxfree: true, def: "elec", credits: [] },
    { name: "McMaster-Carr", free: null, min: null, lead: 0, ship: 2, cutoff: "6 pm local", pay: "School account", taxfree: true, def: "spares", credits: [] },
    { name: "Amazon", free: 3500, min: null, lead: 0, ship: 2, cutoff: "", pay: "Team Amazon account", taxfree: false, def: "tools", credits: [] }
  ];
  var catalog = [
    { id: "c1", name: "MAXSpline shaft 1/2\" hex, 8 in", vendor: "REV", sku: "REV-21-2836", price: 899, cat: "Shafts", pack: 1, unit: "", last: 899 },
    { id: "c2", name: "Bearing 1/2\" hex, flanged", vendor: "WCP", sku: "WCP-0213", price: 499, cat: "Bearings", pack: 2, unit: "", last: 499, options: ["Flanged", "Unflanged"] },
    { id: "c3", name: "Sprocket #25, 22T, 1/2\" hex", vendor: "WCP", sku: "WCP-0532", price: 799, cat: "Sprockets & Chain", pack: 1, unit: "", last: 749 },
    { id: "c4", name: "#25 roller chain", vendor: "AndyMark", sku: "am-0371", price: 1600, cat: "Sprockets & Chain", pack: 10, unit: "ft", last: 1600 },
    { id: "c5", name: "Kraken X60 motor", vendor: "WCP", sku: "WCP-0940", price: 19999, cat: "Motors", pack: 1, unit: "", last: 19999 },
    { id: "c6", name: "NEO Vortex", vendor: "REV", sku: "REV-21-1652", price: 9999, cat: "Motors", pack: 1, unit: "", last: 9999 },
    { id: "c7", name: "Andersen SB50 connector, red", vendor: "AndyMark", sku: "am-3149", price: 399, cat: "Wiring", pack: 1, unit: "", last: 399 },
    { id: "c8", name: "6 AWG wire, red", vendor: "AndyMark", sku: "am-4370", price: 2500, cat: "Wiring", pack: 25, unit: "ft", last: 2500 },
    { id: "c9", name: "Thrifty Squeeze crimp tool", vendor: "The Thrifty Bot", sku: "TTB-0151", price: 2499, cat: "Tools", pack: 1, unit: "", last: null },
    { id: "c10", name: "1/4-20 x 1\" button head bolt", vendor: "McMaster-Carr", sku: "92949A542", price: 1102, cat: "Hardware", pack: 50, unit: "", last: 1102 },
    { id: "c11", name: "10-32 x 1/2\" button head bolt", vendor: "McMaster-Carr", sku: "92949A265", price: 689, cat: "Hardware", pack: 100, unit: "", last: 689 },
    { id: "c12", name: "Polycarbonate sheet 12\" x 24\" x 1/8\"", vendor: "McMaster-Carr", sku: "8574K28", price: 2321, cat: "Stock", pack: 1, unit: "", last: 2321 },
    { id: "c13", name: "2x1 aluminum tube, 0.0625 wall, 5 ft", vendor: "WCP", sku: "WCP-0119", price: 2499, cat: "Stock", pack: 1, unit: "", last: 2399 },
    { id: "c14", name: "MK battery 12 V 18 Ah", vendor: "AndyMark", sku: "am-0844", price: 5900, cat: "Electrical", pack: 1, unit: "", last: 5900 },
    { id: "c15", name: "Spark MAX motor controller", vendor: "REV", sku: "REV-11-2158", price: 9000, cat: "Electrical", pack: 1, unit: "", last: 9000 },
    { id: "c16", name: "Swerve wheel tread, 4 in", vendor: "The Thrifty Bot", sku: "TTB-0332", price: 1299, cat: "Wheels", pack: 1, unit: "", last: 1299 }
  ];
  function req(id, c, qty, bud, pri, need, status, by, sub, extra) {
    var it = catalog.filter(function (x) { return x.id === c; })[0];
    var r = { id: id, cid: c, name: it.name, vendor: it.vendor, sku: it.sku, price: it.price, pack: it.pack, unit: it.unit, qty: qty, bud: bud, pri: pri, need: need, status: status, by: by, sub: sub, task: "", why: "", order: null,
      hist: [ { who: by, what: "requested it", when: "Nov " + (id % 7 + 2) } ] };
    Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
    return r;
  }
  S.parts = {
    vendors: vendors, catalog: catalog,
    requests: [
      req(101, "c1", 2, "mech", "high", "2026-11-17", "toorder", "Leo Brooks", "Intake", { task: "Intake roller shafts" }),
      req(102, "c9", 1, "tools", "normal", "2026-11-24", "toorder", "Priya Shah", "Electrical"),
      req(103, "c10", 1, "spares", "nice", "", "toorder", "Ava Kim", "Fabrication"),
      req(104, "c5", 2, "mech", "blocking", "2026-11-14", "needsok", "Mr. Chen", "Shooter", { why: "Shooter flywheel needs two; we have none spare." }),
      req(105, "c6", 1, "drive", "normal", "2026-12-01", "toorder", "Jordan Lee", "Drivetrain"),
      req(106, "c4", 2, "drive", "high", "2026-11-19", "toorder", "Leo Brooks", "Drivetrain"),
      req(107, "c2", 4, "drive", "high", "2026-11-12", "ordered", "Sam Ortiz", "Intake", { order: 4471, task: "Mount intake roller bearings" }),
      req(108, "c12", 2, "mech", "normal", "2026-11-20", "ordered", "Sam Ortiz", "Intake", { order: 4471 }),
      req(109, "c3", 3, "spares", "normal", "", "ordered", "Ava Kim", "Pit", { order: 4471 }),
      req(110, "c7", 10, "elec", "normal", "", "putaway", "Priya Shah", "Electrical", { order: 4402 }),
      req(111, "c16", 8, "drive", "nice", "", "denied", "Maya Gold", "Drivetrain", { denied: "We have 12 in stock. Use those first." })
    ],
    orders: [
      { id: 4471, vendor: "WCP", number: "WCP-118204", tracking: "1Z 999 AA1 0123 4567", placedBy: "Ms. Rivera", placed: "Nov 6", items: 4794, ship: 1195, tax: 0, lines: [
        { rid: 107, got: 0, done: false, loc: "Shelf B · bin B3", problem: null, by: null },
        { rid: 108, got: 0, done: false, loc: "Stock rack", problem: null, by: null },
        { rid: 109, got: 0, done: false, loc: "Shelf B · bin B4", problem: null, by: null } ] }
    ],
    closed: [ { id: 4402, vendor: "AndyMark", placedBy: "Mr. Okafor", items: 3990, ship: 899, tax: 0, placed: "Oct 28", split: { elec: 4889 }, lines: [{ name: "Andersen SB50 connector, red", qty: 10, loc: "Electrical drawer" }, { name: "PWM cable, 12 in", qty: 6, loc: "Electrical drawer" }] } ],
    spent: { drive: 118400, mech: 214350, elec: 96120, tools: 40300, spares: 22800, comp: 0 },
    filter: "open", mine: false, q: "", lq: "",
    draft: null,
    loc: "all", invq: "", low: false
  };
  var L = function (place, qty) { return { place: place, qty: qty }; };
  S.parts.places = [
    { id: "shop", name: "Shop", kids: [ { id: "sa", name: "Shelf A" }, { id: "sb", name: "Shelf B", kids: [ { id: "Shelf B · bin B3", name: "Bin B3" }, { id: "Shelf B · bin B4", name: "Bin B4" }, { id: "Shelf B · bin B7", name: "Bin B7" } ] }, { id: "Electrical drawer", name: "Electrical drawer" }, { id: "Battery cart", name: "Battery cart" }, { id: "Stock rack", name: "Stock rack" } ] },
    { id: "robots", name: "On a robot", kids: [ { id: "Comp bot › Drivetrain", name: "Comp bot › Drivetrain" }, { id: "Comp bot › Intake", name: "Comp bot › Intake" }, { id: "Practice bot", name: "Practice bot" } ] }
  ];
  S.parts.items = [
    { id: "i1", name: "Bearing 1/2\" hex, flanged", cid: "c2", unit: "each", min: 8, stock: [L("Shelf B · bin B3", 14), L("Comp bot › Intake", 6)], hist: [ { who: "Leo Brooks", what: "took 6 for Comp bot › Intake", when: "Nov 4" }, { who: "Ms. Rivera", what: "counted 20 in Bin B3", when: "Oct 30" } ] },
    { id: "i2", name: "#25 roller chain", cid: "c4", unit: "ft", min: 20, stock: [L("Shelf B · bin B7", 12)], hist: [ { who: "Ava Kim", what: "used 8 ft (Drivetrain)", when: "Nov 6" } ] },
    { id: "i3", name: "Sprocket #25, 22T, 1/2\" hex", cid: "c3", unit: "each", min: 2, stock: [L("Shelf B · bin B4", 3), L("Comp bot › Drivetrain", 4)], hist: [] },
    { id: "i4", name: "MK battery 12 V 18 Ah", cid: "c14", unit: "each", min: 6, stock: [L("Battery cart", 8)], hist: [] },
    { id: "i5", name: "Andersen SB50 connector, red", cid: "c7", unit: "each", min: 10, stock: [L("Electrical drawer", 6)], hist: [ { who: "Priya Shah", what: "received 10 (order #4402)", when: "Nov 2" } ] },
    { id: "i6", name: "Polycarbonate sheet 12\" x 24\" x 1/8\"", cid: "c12", unit: "sheet", min: 2, stock: [L("Stock rack", 1)], hist: [] },
    { id: "i7", name: "Spark MAX motor controller", cid: "c15", unit: "each", min: 2, stock: [L("Electrical drawer", 3), L("Practice bot", 4)], hist: [] },
    { id: "i8", name: "10-32 x 1/2\" button head bolt", cid: "c11", unit: "each", min: 50, stock: [L("Shelf A", 230)], hist: [] },
    { id: "i9", name: "Swerve wheel tread, 4 in", cid: "c16", unit: "each", min: 4, stock: [L("Shelf A", 12)], hist: [] },
    { id: "i10", name: "2x1 aluminum tube, 5 ft", cid: "c13", unit: "each", min: 3, stock: [L("Stock rack", 5)], hist: [] }
  ];
  S.notices.push({ to: "mentor", app: "parts", text: "5 parts are waiting to be ordered.", when: "Today", read: false });
  S.notices.push({ to: "admin", app: "parts", text: "Mr. Chen's request for 2 Kraken X60 ($399.98) needs your OK.", when: "Today", read: false });
  S.activity.push({ who: "Priya Shah", what: "requested Thrifty Squeeze crimp tool", app: "parts", when: "Mon" });
}
D.inits.push(init);
function P() { return D.S.parts; }
function vendor(n) { return P().vendors.filter(function (v) { return v.name === n; })[0] || { name: n, free: null, lead: 2, ship: 5, credits: [] }; }
function reqById(id) { return P().requests.filter(function (r) { return r.id === +id; })[0]; }
function item(id) { return P().items.filter(function (i) { return i.id === id; })[0]; }
function total(r) { return r.price * r.qty; }
function orderBy(r) { if (!r.need) return null; var v = vendor(r.vendor); return addDays(r.need, -(v.lead + v.ship)); }
function placeToday(r) { var ob = orderBy(r); return r.pri === "blocking" || (ob && parse(ob) <= TODAY); }
function qtyText(r) { return r.qty + (r.pack > 1 ? " × pack of " + r.pack + (r.unit ? " " + r.unit : "") : ""); }
function stockTotal(i) { return i.stock.reduce(function (a, s) { return a + s.qty; }, 0); }
function inStore(i) { return i.stock.filter(function (s) { return s.place.indexOf("bot") < 0; }).reduce(function (a, s) { return a + s.qty; }, 0); }
function statusPill(s) { return '<span class="pill ' + STATUS[s][1] + '">' + STATUS[s][0] + "</span>"; }
function priPill(p) { return p !== "blocking" && p !== "high" ? "" : '<span class="pill pri ' + PRI[p][1] + '">' + PRI[p][0] + "</span>"; }
function split(totalC, weights) { var sum = weights.reduce(function (a, b) { return a + b; }, 0) || 1; var w = weights.some(function (x) { return x > 0; }) ? weights : weights.map(function () { return 1; }); sum = w.reduce(function (a, b) { return a + b; }, 0); var out = w.map(function (x) { return Math.floor(totalC * x / sum); }); out[out.length - 1] += totalC - out.reduce(function (a, b) { return a + b; }, 0); return out; }

/* ---------- Views ---------- */
D.views.parts = function () {
  var staff = D.isStaff();
  var needOK = P().requests.filter(function (r) { return r.status === "needsok"; }).length;
  var toOrder = P().requests.filter(function (r) { return r.status === "toorder"; }).length;
  var arrN = P().orders.reduce(function (a, o) { return a + o.lines.filter(function (l) { return !l.done; }).length; }, 0);
  var list = [["requests", "Requests"]];
  if (staff) list.push(needOK ? ["toorder", "To order", "", String(toOrder + needOK)] : ["toorder", "To order", toOrder ? String(toOrder) : ""]);
  list.push(["arriving", "Arriving", arrN ? String(arrN) : ""], ["inventory", "Inventory"], ["budget", "Budget"]);
  if (staff) list.push(["vendors", "Vendors"]);
  // "new" is not a tab: the request form is its own screen, opened by the gold button (and by Tasks and Inventory).
  var t = D.tab("parts", "requests"), body;
  if (t === "new") body = newRequest();
  else if (t === "toorder" && staff) body = toOrderView();
  else if (t === "arriving") body = arriving();
  else if (t === "inventory") body = inventory();
  else if (t === "budget") body = budget();
  else if (t === "vendors" && staff) body = vendorsView();
  else body = requests();
  var right = t === "new" ? "" : '<button class="btn primary sm" data-act="tab" data-app="parts" data-v="new" aria-label="Request a part">' + D.ic("plus", 16) + '<span>Request<span class="hide-sm"> a part</span></span></button>';
  return D.topbar("Parts & Inventory", "", D.tabsFor("parts", list, "requests"), right) + '<div class="content">' + body + "</div>";
};
function requests() {
  var p = P(), me = D.me().name;
  var groups = [["open", "Open", ["needsok", "toorder", "ordered"]], ["needsok", "Needs mentor OK", ["needsok"]], ["toorder", "To order", ["toorder"]], ["ordered", "Ordered", ["ordered"]], ["done", "Arrived", ["arrived", "putaway"]], ["closed", "Denied or cancelled", ["denied", "cancelled"]], ["all", "All", Object.keys(STATUS)], ["wish", "Wishlist", []]];
  function gcount(x) { return x[0] === "wish" ? (p.wish || []).length : p.requests.filter(function (r) { return x[2].indexOf(r.status) >= 0; }).length; }
  var g = groups.filter(function (x) { return x[0] === p.filter; })[0];
  var q = p.q.toLowerCase();
  var rows = p.requests.filter(function (r) { return g[2].indexOf(r.status) >= 0 && (!p.mine || r.by === me) && (!q || (r.name + r.sku + r.vendor + r.by + r.sub).toLowerCase().indexOf(q) >= 0); });
  // Most urgent first: blocking, then waiting for a mentor, then high priority; then your own; then soonest need-by.
  function urg(r) { return r.pri === "blocking" ? 0 : r.status === "needsok" ? 1 : r.pri === "high" ? 2 : 3; }
  rows.sort(function (a, b) { return urg(a) - urg(b) || (b.by === me) - (a.by === me) || String(a.need || "9").localeCompare(String(b.need || "9")) || a.id - b.id; });
  var filters = '<div class="pfilters"><label class="pf-show"><span>Show</span><select class="inp" data-change="pfiltersel">' + groups.map(function (x) { return '<option value="' + x[0] + '"' + (p.filter === x[0] ? " selected" : "") + ">" + x[1] + " (" + gcount(x) + ")</option>"; }).join("") + "</select></label>" +
    '<label class="pf-mine"><button class="toggle" data-act="pmine" aria-pressed="' + p.mine + '" aria-label="Only my requests"></button><span>Only mine</span></label>' +
    '<input id="p-q" class="inp pf-q" data-input="pq" placeholder="Search parts" value="' + esc(p.q) + '" aria-label="Search requests"></div>';
  return '<div class="card">' + filters + '<div class="list">' + (p.filter === "wish" ? wishList() : rows.length ? rows.map(function (r) {
    var meta = [r.vendor, "Qty " + qtyText(r), money(total(r)), r.by].concat(r.need ? ["need by " + fmt(r.need)] : []).map(esc).join(" · ");
    return '<button class="li click prow" data-act="preq" data-v="' + r.id + '"><span class="grow"><b>' + esc(r.name) + '</b><span class="pmeta">' + meta + '</span></span><span class="pside">' + statusPill(r.status) + priPill(r.pri) + "</span></button>";
  }).join("") : '<div class="empty">Nothing here.</div>') + "</div></div>";
}
D.drawers.preq = function (d) {
  var r = reqById(d.id), staff = D.isStaff(), mine = r.by === D.me().name, ob = orderBy(r);
  var acts = [];
  if (staff && r.status === "needsok") acts.push('<button class="btn primary" data-act="papprove" data-v="' + r.id + '">Approve</button>', '<button class="btn" data-act="pdeny" data-v="' + r.id + '">Deny…</button>', '<button class="btn" data-act="preplace" data-v="' + r.id + '">Replace item…</button>');
  if (r.status === "ordered") acts.push('<button class="btn" data-act="tab" data-app="parts" data-v="arriving">Check it in on Arriving</button>');
  var cancel = mine && !staff && (r.status === "needsok" || r.status === "toorder") ? '<div><button class="btn ghost danger" data-act="pcancel" data-v="' + r.id + '">Withdraw my request</button></div>' : "";
  var rows = [["Vendor", esc(r.vendor)], ["SKU", '<span class="mono">' + esc(r.sku) + "</span>"], ["Quantity", qtyText(r)], ["Price", money(r.price) + " each · " + money(total(r)) + " total"], ["Budget", r.status === "needsok" ? budgetEffect(r) : esc(bname(r.bud))], ["Priority", PRI[r.pri][0]], ["Need by", fmt(r.need) + (ob ? '<br><b class="pbad">Order by ' + fmt(ob) + "</b>" : "")], ["For", esc(r.sub) + (r.task ? " · task “" + esc(r.task) + "”" : "")], ["Asked by", esc(r.by)]];
  return D.drawerHead("Request #" + r.id, r.name) + '<div class="row">' + statusPill(r.status) + (r.order ? '<span class="who">Order #' + r.order + "</span>" : "") + "</div>" +
    (r.why ? '<p class="mute">“' + esc(r.why) + "”</p>" : "") + (r.denied ? '<p class="pbad">Denied: ' + esc(r.denied) + "</p>" : "") +
    '<dl class="pkv">' + rows.map(function (x) { return "<dt>" + x[0] + "</dt><dd>" + x[1] + "</dd>"; }).join("") + "</dl>" +
    (acts.length ? '<div class="row">' + acts.join("") + "</div>" : "") + cancel +
    '<div><p class="flabel">History</p><div class="list">' + r.hist.slice().reverse().map(function (h) { return '<div class="li"><span class="grow"><b>' + esc(h.who) + "</b> " + esc(h.what) + '</span><span class="who">' + esc(h.when) + "</span></div>"; }).join("") + "</div></div>";
};
D.modals.pdeny = function (d) { var r = reqById(d.id); return D.modalHead("Deny this request?") + "<p><b>" + esc(r.name) + "</b> for " + esc(r.by) + '. They see your reason.</p><div class="field"><label for="p-deny">Why</label><textarea id="p-deny" rows="3">Let\'s use the ones in stock first.</textarea></div><div class="row"><button class="btn primary" data-act="pdenygo" data-v="' + r.id + '">Deny</button><button class="btn" data-act="closemodal">Keep it</button></div>'; };

function newRequest() {
  var p = P(), d = p.draft || blankDraft();
  p.draft = d;
  var q = p.lq.toLowerCase();
  var popular = !q, results = popular ? p.catalog.slice(0, 4) : q.indexOf("http") !== 0 ? p.catalog.filter(function (c) { return (c.name + c.sku + c.vendor + c.cat).toLowerCase().indexOf(q) >= 0; }).slice(0, 6) : [];
  var guessed = d.guess ? '<span class="guess">Guessed from ' + esc(d.guess) + ". Check it's right.</span>" : "";
  var tot = (d.price || 0) * (d.qty || 1), ob = d.need ? addDays(d.need, -((vendor(d.vendor).lead || 0) + (vendor(d.vendor).ship || 0))) : null;
  var ready = !!(d.name && d.vendor && d.price);
  var find = '<div class="card"><h2>Find it</h2><p class="mute">Search the catalog or paste a product link.</p>' +
    '<input id="p-lq" class="inp" data-input="plq" placeholder="bearing, 22T sprocket, am-0371 or https://…" value="' + esc(p.lq) + '" aria-label="Search the catalog or paste a link">' +
    '<div class="row"><span class="who">Try a link</span><button class="btn sm" data-act="plink" data-v="rev">REV</button><button class="btn sm" data-act="plink" data-v="wcp">WCP</button><button class="btn sm" data-act="plink" data-v="amazon">Amazon</button></div>' +
    (d.lookup ? '<p class="plookup' + (d.lookup.ok ? "" : " warn") + '">' + esc(d.lookup.text) + "</p>" : "") +
    (results.length ? (popular ? '<p class="who">Often requested</p>' : "") + '<div class="list">' + results.map(function (c) { return '<button class="li click" data-act="ppick" data-v="' + c.id + '"><span class="grow"><b>' + esc(c.name) + '</b><span class="pmeta">' + esc(c.vendor) + (popular ? "" : " · " + esc(c.sku) + " · " + esc(c.cat)) + (c.last ? " · last paid " + money(c.last) : "") + '</span></span><span class="chev" aria-hidden="true">›</span></button>'; }).join("") + "</div>" : q && q.indexOf("http") !== 0 ? '<div class="empty">Nothing in the catalog. Paste the product link instead.</div>' : "") + "</div>";
  var form = '<div class="card" id="preq-form"><div class="row between"><h2>Request</h2><span class="who">* required</span></div>' + (d.task ? '<p class="mute">' + esc(d.from || "Tasks") + ": <b>" + esc(d.task) + "</b></p>" : "") +
    '<div class="pform"><div class="field wide"><label for="pd-name">Part *</label><input id="pd-name" data-input="pd" value="' + esc(d.name) + '"></div>' +
    '<div class="field"><label for="pd-vendor">Vendor *</label><input id="pd-vendor" data-input="pd" value="' + esc(d.vendor) + '"></div><div class="field"><label for="pd-sku"><span class="abbr" data-tip="The vendor\'s part number, from the product page">SKU</span> (optional)</label><input id="pd-sku" data-input="pd" value="' + esc(d.sku) + '"></div>' +
    (d.options ? '<div class="field wide"><label for="pd-opt">Option</label><select id="pd-opt" data-change="pdopt">' + d.options.map(function (o) { return "<option" + (o === d.opt ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select></div>" : "") +
    '<div class="field"><label for="pd-price">Price per pack ($) *</label><input id="pd-price" data-input="pd" inputmode="decimal" value="' + (d.price ? (d.price / 100).toFixed(2) : "") + '"></div>' +
    '<div class="field"><label for="pd-qty">Number of packs</label><input id="pd-qty" data-input="pd" type="number" min="1" value="' + d.qty + '"></div>' +
    '<div class="field"><label for="pd-pack">Parts per pack</label><input id="pd-pack" data-input="pd" type="number" min="1" value="' + d.pack + '"></div>' +
    '<div class="field"><label for="pd-unit">Unit (each, ft)</label><input id="pd-unit" data-input="pd" value="' + esc(d.unit) + '"></div>' +
    '<p class="who wide">' + d.qty + (d.qty === 1 ? " pack" : " packs") + " × " + d.pack + " = " + (d.qty * d.pack) + " " + (d.unit || (d.qty * d.pack === 1 ? "part" : "parts")) + " when it arrives</p>" +
    '<div class="field"><label for="pd-bud">Budget</label><select id="pd-bud" data-change="pdbud">' + BUDGETS.map(function (b) { return '<option value="' + b.id + '"' + (b.id === d.bud ? " selected" : "") + ">" + b.name + "</option>"; }).join("") + "</select>" + guessed + "</div>" +
    '<div class="field"><label for="pd-need">Need by (optional)</label><input id="pd-need" data-input="pd" type="date" value="' + esc(d.need) + '">' + (ob ? '<span class="who">Order by ' + fmt(ob) + "</span>" : "") + "</div>" +
    '<div class="field wide"><label for="pd-sub">For subteam (optional)</label><input id="pd-sub" data-input="pd" value="' + esc(d.sub) + '"></div>' +
    '<div class="field wide"><span class="flabel">Priority</span><div class="choice four">' + Object.keys(PRI).map(function (k) { return '<button data-act="ppri" data-v="' + k + '" aria-pressed="' + (d.pri === k) + '">' + PRI[k][0] + "</button>"; }).join("") + "</div></div>" +
    '<div class="field wide"><label for="pd-why">Why (optional)</label><input id="pd-why" data-input="pd" value="' + esc(d.why) + '"></div></div>' +
    '<div><b class="num">Total ' + money(tot) + "</b>" + (d.price ? ' <span class="who">' + (d.qty || 1) + " × " + money(d.price) + "</span>" : "") + '<p class="who">' + (tot > LIMIT ? "Over $250: a mentor OKs it first." : "Under $250: goes straight to To order.") + "</p></div>" +
    '<div class="row sendbar"><span id="pd-hint" class="who" style="flex-basis:100%"' + (ready ? " hidden" : "") + '>Fill in Part, Vendor and Price per pack to send.</span><button class="btn primary" data-act="psubmit"' + (ready ? "" : " disabled") + '>Send request</button><button class="btn" data-act="pwish">Save to wishlist</button><button class="btn ghost" data-act="pclear">Clear</button></div></div>';
  return '<div class="pnew"><div><button class="btn ghost" data-act="tab" data-app="parts" data-v="requests">‹ Requests</button></div>' + find + form + "</div>";
}
function blankDraft() { return { name: "", vendor: "", sku: "", price: 0, qty: 1, pack: 1, unit: "", bud: "mech", guess: "", need: "", sub: "", pri: "normal", why: "", task: "", options: null, opt: "", lookup: null, cid: null }; }
function fill(d, c, how) {
  d.cid = c.id; d.name = c.name; d.vendor = c.vendor; d.sku = c.sku; d.price = c.price; d.pack = c.pack; d.unit = c.unit; d.options = c.options || null; d.opt = c.options ? c.options[0] : "";
  var last = P().requests.filter(function (r) { return r.cid === c.id; })[0];
  if (last) { d.bud = last.bud; d.guess = "the last time we bought it"; } else { d.bud = vendor(c.vendor).def || "mech"; d.guess = c.vendor + "'s usual budget"; }
  d.lookup = how ? { ok: true, text: how } : null;
}
function readDraft() {
  var d = P().draft; if (!d) return;
  ["name", "vendor", "sku", "need", "sub", "why", "unit"].forEach(function (k) { var el = document.getElementById("pd-" + k); if (el) d[k] = el.value; });
  var q = document.getElementById("pd-qty"), pk = document.getElementById("pd-pack"), pr = document.getElementById("pd-price");
  if (q) d.qty = Math.max(1, parseInt(q.value, 10) || 1); if (pk) d.pack = Math.max(1, parseInt(pk.value, 10) || 1); if (pr) d.price = Math.round((parseFloat(pr.value) || 0) * 100);
}

function toOrderView() {
  var p = P(), byV = {};
  var waiting = p.requests.filter(function (r) { return r.status === "needsok"; });
  p.requests.filter(function (r) { return r.status === "toorder"; }).forEach(function (r) { (byV[r.vendor] = byV[r.vendor] || []).push(r); });
  var html = waiting.length ? '<div class="card hero"><h2>Needs your OK</h2><div class="list">' + waiting.map(function (r) {
    var ob = orderBy(r);
    return '<div class="li pwait"><span class="grow"><b>' + esc(r.name) + '</b><span class="pmeta">' + [r.vendor, "Qty " + qtyText(r), money(total(r)), r.by].map(esc).join(" · ") + "</span>" +
      '<span class="pmeta">' + budgetEffect(r) + (ob ? ' · <b class="pbad">order by ' + fmt(ob) + "</b>" : "") + "</span>" + (r.why ? '<span class="pmeta">“' + esc(r.why) + "”</span>" : "") + "</span>" + priPill(r.pri) +
      '<span class="row nowrap"><button class="btn" data-act="papprove" data-v="' + r.id + '">Approve</button><button class="btn ghost" data-act="pdeny" data-v="' + r.id + '">Deny…</button></span></div>';
  }).join("") + "</div></div>" : "";
  var vs = Object.keys(byV).sort(function (a, b) { return byV[b].some(placeToday) - byV[a].some(placeToday); });
  if (!vs.length && !waiting.length) return '<div class="card"><p class="mute">Nothing to order. New requests land here, grouped by vendor.</p></div>';
  return html + vs.map(function (vn) {
    var v = vendor(vn), lines = byV[vn], sub = lines.reduce(function (a, r) { return a + total(r); }, 0), today = lines.filter(placeToday);
    var nudge = v.free ? (sub >= v.free ? '<span class="small pok">Free shipping</span>' : '<span class="small"><b>' + money(v.free - sub) + "</b> more for free shipping</span>") : "";
    var tips = [];
    if (v.cutoff) tips.push("Order cutoff " + v.cutoff); if (v.taxfree) tips.push("Tax-exempt here"); v.credits.forEach(function (c) { tips.push(c.label + (c.bal ? ": " + money(c.bal) : "") + (c.code ? " (" + c.code + ")" : "")); }); if (v.pay) tips.push("Pay with " + v.pay);
    return '<div class="card"><div><div class="row between nowrap pvh"><h2>' + esc(vn) + '</h2><div class="row nowrap">' + (today.length ? '<span class="pill bad">Place today</span>' : "") + '<b class="num">' + money(sub) + '</b></div></div><p class="who">' + esc(tips.join(" · ")) + (VURL[vn] ? ' · <a class="vlink" href="' + VURL[vn] + '" target="_blank" rel="noopener noreferrer">Open ' + esc(vn) + " ↗</a>" : "") + "</p></div>" +
      (v.free ? '<div class="bar"><i' + (sub >= v.free ? ' class="ok"' : "") + ' style="width:' + Math.min(100, D.pct(sub, v.free)) + '%"></i></div>' + nudge : "") +
      '<div class="list">' + lines.map(function (r) { var ob = orderBy(r); return '<div class="li pline"><span class="grow"><b>' + esc(r.name) + '</b><span class="pmeta">' + [r.sku, "Qty " + qtyText(r), bname(r.bud), "for " + r.sub, r.by].map(esc).join(" · ") + (ob ? " · order by " + fmt(ob) : "") + '</span></span><span class="pside"><span class="num">' + money(total(r)) + "</span>" + priPill(r.pri) + "</span></div>"; }).join("") + "</div>" +
      '<div class="row"><button class="btn' + (today.length ? " primary" : "") + '" data-act="pmarkordered" data-v="' + esc(vn) + '">Mark ordered…</button><button class="btn" data-act="pcopy" data-v="' + esc(vn) + '">' + (vn === "Amazon" ? "Open Share-A-Cart" : "Copy list") + "</button></div></div>";
  }).join("");
}
D.modals.pcopy = function (d) {
  var lines = P().requests.filter(function (r) { return r.status === "toorder" && r.vendor === d.v; });
  var text = d.v === "McMaster-Carr" ? lines.map(function (r) { return r.sku + "," + r.qty; }).join("\n") : lines.map(function (r) { return r.qty + " × " + r.name + " (" + r.sku + ") " + money(r.price); }).join("\n");
  return D.modalHead("Copy for " + d.v) + '<p class="small mute">' + (d.v === "McMaster-Carr" ? "Paste into “Paste part numbers and quantities” on McMaster's order page." : "Paste wherever you're ordering.") + '</p><textarea class="inp mono" rows="6" readonly id="p-copytext">' + esc(text) + '</textarea><div class="row"><button class="btn primary" data-act="pcopygo">Copy</button><button class="btn" data-act="closemodal">Done</button></div>';
};
D.modals.pordered = function (d) {
  var p = P(), v = vendor(d.v), lines = p.requests.filter(function (r) { return r.status === "toorder" && r.vendor === d.v; });
  var items = lines.reduce(function (a, r) { return a + total(r); }, 0);
  var ship = d.ship != null ? d.ship : (v.free && items >= v.free ? 0 : 1195), tax = d.tax != null ? d.tax : (v.taxfree ? 0 : Math.round(items * .089));
  var byB = {}; lines.forEach(function (r) { byB[r.bud] = (byB[r.bud] || 0) + total(r); });
  var ids = Object.keys(byB), w = ids.map(function (k) { return byB[k]; }), sS = split(ship, w), sT = split(tax, w);
  return D.modalHead("Mark ordered: " + d.v) + '<p class="small mute">Enter what the order cost. Shipping and tax are split across budgets.</p>' +
    '<div class="formgrid"><div class="field"><label for="po-num">Order number</label><input id="po-num" value="' + esc(d.v.slice(0, 3).toUpperCase()) + '-' + (118300 + p.orders.length) + '"></div><div class="field"><label>Items</label><input value="' + money(items) + '" readonly></div>' +
    '<div class="field"><label for="po-ship">Shipping ($)</label><input id="po-ship" data-input="poship" value="' + (ship / 100).toFixed(2) + '"></div><div class="field"><label for="po-tax">Tax ($)</label><input id="po-tax" data-input="potax" value="' + (tax / 100).toFixed(2) + '"></div></div>' +
    '<div class="tablewrap" data-keepscroll="pordered"><table><thead><tr><th>Budget</th><th>Items</th><th>Shipping</th><th>Tax</th><th>Charged</th></tr></thead><tbody>' + ids.map(function (k, i) { return "<tr><td>" + esc(bname(k)) + "</td><td>" + money(byB[k]) + "</td><td>" + money(sS[i]) + "</td><td>" + money(sT[i]) + "</td><td><b>" + money(byB[k] + sS[i] + sT[i]) + "</b></td></tr>"; }).join("") + '<tr><td><b>Total</b></td><td>' + money(items) + "</td><td>" + money(ship) + "</td><td>" + money(tax) + "</td><td><b>" + money(items + ship + tax) + '</b></td></tr></tbody></table></div><div class="row"><button class="btn primary" data-act="porderedgo" data-v="' + esc(d.v) + '">Mark ' + lines.length + " parts ordered</button><button class=\"btn\" data-act=\"closemodal\">Cancel</button></div>";
};

function arriving() {
  var p = P(), staff = D.isStaff();
  var places = []; (function walk(ns) { ns.forEach(function (n) { if (!n.kids) places.push(n.id); else walk(n.kids); }); })(p.places);
  if (!p.orders.length) return '<div class="card"><p class="mute">Nothing on the way. Orders show here once a mentor marks them ordered.</p></div>' + recentClosed();
  return p.orders.map(function (o, oi) {
    var done = o.lines.filter(function (l) { return l.done; }).length;
    return '<div class="card"><div class="row between nowrap"><div style="min-width:0"><h2>' + esc(o.vendor) + " · order #" + o.id + '</h2><p class="who">Placed by ' + esc(o.placedBy) + " " + esc(o.placed) + " · " + esc(o.number || "") + ' · tracking <span class="mono">' + esc(o.tracking || "not added") + '</span></p></div><span class="pill ' + (done === o.lines.length ? "ok" : "info") + '">' + done + " of " + o.lines.length + " checked in</span></div>" +
      (done < o.lines.length ? '<div><button class="btn" data-act="pall" data-o="' + oi + '">' + D.ic("check", 16) + (done ? " Check in the other " + (o.lines.length - done) : " Check in all " + o.lines.length) + "</button></div>" : "") + "<div>" +
      o.lines.map(function (l, li) {
        var r = reqById(l.rid), want = r.qty * r.pack, got = l.done ? l.got : (l.got || want);
        return '<div class="parr"><div><b>' + esc(r.name) + '</b><div class="who">for ' + esc(r.by) + " · " + esc(r.sub) + '</div></div><div class="parr-ctl">' +
          '<div class="field"><span class="flabel">Received</span><span class="stepper"><button data-act="pqty" data-o="' + oi + '" data-l="' + li + '" data-v="-1" aria-label="One fewer" data-tip="One fewer arrived">−</button><span class="num">' + got + " of " + want + (r.unit ? " " + r.unit : "") + '</span><button data-act="pqty" data-o="' + oi + '" data-l="' + li + '" data-v="1" aria-label="One more" data-tip="One more arrived">+</button></span></div>' +
          '<div class="field"><label for="pl-' + oi + "-" + li + '">Put away in</label><select id="pl-' + oi + "-" + li + '" data-change="ploc" data-o="' + oi + '" data-l="' + li + '">' + places.filter(function (x) { return x.indexOf("bot") < 0; }).map(function (x) { return "<option" + (x === l.loc ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select></div></div>" +
          (l.problem ? '<span class="pill bad">' + esc(l.problem) + "</span>" : "") + (l.done ? '<span class="who">Checked in by ' + esc(l.by) + "</span>" : l.got && l.got < want ? '<span class="pill warn">Still waiting for ' + (want - l.got) + "</span>" : "") +
          '<div class="row"><button class="btn ' + (l.done ? "checked" : "tocheck") + '" data-act="ptick" data-o="' + oi + '" data-l="' + li + '" aria-pressed="' + l.done + '">' + D.ic("check", 16) + (l.done ? " Checked in" : " Check in") + '</button><button class="btn ghost" data-act="pproblem" data-o="' + oi + '" data-l="' + li + '">Report a problem</button></div></div>';
      }).join("") + "</div>" + (staff ? '<div><button class="btn" data-act="pclose" data-o="' + oi + '">Close order</button></div>' : "") + "</div>";
  }).join("") + recentClosed();
}
function wishList() { var w = P().wish || []; return w.length ? w.map(function (d, k) { return '<div class="li prow"><span class="grow"><b>' + esc(d.name || "Unnamed part") + '</b><span class="pmeta">' + esc(d.vendor || "No vendor yet") + (d.price ? " · " + money(d.price) + " per pack" : "") + '</span></span><button class="btn" data-act="pwishuse" data-v="' + k + '">Request this</button></div>'; }).join("") : '<div class="empty">Nothing saved yet.</div>'; }
function recentClosed() { return '<div class="card tight"><h2>Arrived in the last two weeks</h2><div class="list">' + P().closed.map(function (c) { return '<div class="pastord"><div class="row between nowrap"><b>' + esc(c.vendor) + " · order #" + c.id + '</b><span class="num">' + money(c.items + c.ship + c.tax) + '</span></div><span class="who">Placed by ' + esc(c.placedBy) + " · " + esc(c.placed) + "</span>" + (c.lines ? c.lines.map(function (l) { return '<span class="small">' + l.qty + " × " + esc(l.name) + " → " + esc(l.loc) + "</span>"; }).join("") : "") + "</div>"; }).join("") + "</div></div>"; }

function inventory() {
  var p = P(), q = p.invq.toLowerCase();
  function placeIs(id, place) { if (id === "shop") return place.indexOf("bot") < 0; if (id === "robots") return place.indexOf("bot") >= 0; if (id === "sb") return place.indexOf("Shelf B") === 0; if (id === "sa") return place === "Shelf A"; return place === id || place.indexOf(id) === 0; }
  function countAt(n) { return p.items.filter(function (i) { return i.stock.some(function (st) { return placeIs(n.id, st.place); }); }).length; }
  function tree(ns, depth) { return ns.map(function (n) { return '<button data-act="ploc2" data-v="' + esc(n.id) + '" aria-pressed="' + (p.loc === n.id) + '" style="padding-left:' + (8 + depth * 14) + 'px">' + D.ic(n.id === "robots" || n.id.indexOf("bot") >= 0 ? "robot" : "folder", 16) + esc(n.name) + '<span class="n">' + (countAt(n) || "") + "</span></button>" + (n.kids ? tree(n.kids, depth + 1) : ""); }).join(""); }
  function under(place) { if (p.loc === "all") return true; if (p.loc === "shop") return place.indexOf("bot") < 0; if (p.loc === "robots") return place.indexOf("bot") >= 0; if (p.loc === "sb") return place.indexOf("Shelf B") === 0; if (p.loc === "sa") return place === "Shelf A"; return place === p.loc; }
  var rows = p.items.filter(function (i) { return i.stock.some(function (s) { return under(s.place); }) && (!q || i.name.toLowerCase().indexOf(q) >= 0) && (!p.low || inStore(i) <= i.min); });
  var lowN = p.items.filter(function (i) { return inStore(i) <= i.min; }).length;
  function nameOf(ns, id) { for (var i = 0; i < ns.length; i++) { if (ns[i].id === id) return ns[i].name; var k = ns[i].kids && nameOf(ns[i].kids, id); if (k) return k; } return ""; }
  var placeTree = '<button data-act="ploc2" data-v="all" aria-pressed="' + (p.loc === "all") + '">' + D.ic("home", 16) + 'Everything<span class="n">' + p.items.length + "</span></button>" + tree(p.places, 0);
  return '<div class="side"><div class="card tight hide-sm"><div class="ltree">' + placeTree + '</div><button class="btn ghost sm">+ Add a place</button></div>' +
    '<div class="card"><div class="pinvbar"><details class="placepick show-sm-block"><summary>Place: <b>' + esc(p.loc === "all" ? "Everything" : nameOf(p.places, p.loc)) + '</b></summary><div class="ltree">' + placeTree + '</div></details><input id="p-invq" class="inp" data-input="pinvq" placeholder="Find a part" value="' + esc(p.invq) + '" aria-label="Find a part"><button class="chip" data-act="plow" aria-pressed="' + p.low + '">Low stock (' + lowN + ")</button></div>" +
    (rows.length ? '<div class="tablewrap" data-keepscroll="inventory"><table class="stacktbl c3"><thead><tr><th>Part</th><th>Where</th><th>In store</th><th>On robots</th><th></th></tr></thead><tbody>' + rows.map(function (i) {
      var low = inStore(i) <= i.min, places = i.stock.filter(function (s) { return under(s.place); });
      var home = places.filter(function (s) { return s.place.indexOf("bot") < 0; });
      var k = i.stock.map(function (st) { return st.place.indexOf("bot") < 0; }).indexOf(true);
      return '<tr class="click" data-act="pitem" data-v="' + i.id + '"><td class="wrap lead"><b>' + esc(i.name) + '</b></td><td class="wrap small" data-l="Where">' + (home.map(function (s) { return esc(s.place) + (home.length > 1 ? " (" + s.qty + ")" : ""); }).join("<br>") || "Only on robots") + '</td><td data-l="In store">' + inStore(i) + " " + (i.unit === "each" ? "" : esc(i.unit)) + (low ? ' <span class="pill warn">Low</span>' : "") + '</td><td data-l="On robots">' + (stockTotal(i) - inStore(i) || "—") + '</td><td class="lead"><span class="row">' + (k >= 0 ? '<button class="btn sm" data-act="ptake" data-v="' + i.id + '" data-k="' + k + '">Take</button>' : "") + (low ? '<button class="btn sm" data-act="pmore" data-v="' + i.id + '">Request more</button>' : "") + "</span></td></tr>";
    }).join("") + "</tbody></table></div>" : '<div class="empty">No parts here.</div>') + "</div></div>";
}
D.drawers.pitem = function (d) {
  var i = item(d.id), c = P().catalog.filter(function (x) { return x.id === i.cid; })[0];
  return D.drawerHead("Inventory", i.name) +
    '<div class="grid2"><div class="kpi"><b>' + inStore(i) + '</b><span>in store (' + esc(i.unit) + ")</span></div><div class=\"kpi\"><b>" + (stockTotal(i) - inStore(i)) + '</b><span>on robots</span></div></div>' +
    (inStore(i) <= i.min ? '<div class="row"><span class="pill warn">At or under the minimum of ' + i.min + '</span><button class="btn sm" data-act="pmore" data-v="' + i.id + '">Request more</button></div>' : '<p class="who">Minimum ' + i.min + "</p>") +
    '<div><p class="flabel">Where it is</p><div class="list">' + i.stock.map(function (s, k) { var bot = s.place.indexOf("bot") >= 0; return '<div class="li"><span class="grow">' + esc(s.place) + '</span><b class="num">' + s.qty + "</b>" + (bot ? '<button class="btn sm" data-act="preturn" data-v="' + i.id + '" data-k="' + k + '">Return</button>' : '<button class="btn sm" data-act="ptake" data-v="' + i.id + '" data-k="' + k + '">Take</button><button class="btn ghost sm" data-act="padjust" data-v="' + i.id + '" data-k="' + k + '">Count</button>') + "</div>"; }).join("") + "</div></div>" +
    (c ? '<div><p class="flabel">Buy it from</p><div class="li"><span class="grow">' + esc(c.vendor) + ' · <span class="mono">' + esc(c.sku) + "</span></span><span>" + money(c.price) + (c.pack > 1 ? " per " + c.pack + (c.unit ? " " + c.unit : "") : "") + "</span></div></div>" : "") +
    '<div><p class="flabel">History</p><div class="list">' + (i.hist.length ? i.hist.map(function (h) { return '<div class="li"><span class="grow"><b>' + esc(h.who) + "</b> " + esc(h.what) + '</span><span class="who">' + esc(h.when) + "</span></div>"; }).join("") : '<p class="who">No changes yet.</p>') + "</div></div>";
};
D.modals.ptake = function (d) {
  var i = item(d.id), s = i.stock[d.k];
  return D.modalHead((d.adjust ? "Count " : "Take ") + i.name) + '<p class="small mute">From ' + esc(s.place) + " · " + s.qty + " there now</p>" +
    (d.adjust ? '<div class="formgrid"><div class="field"><label for="pt-n">Actual count</label><input id="pt-n" type="number" min="0" value="' + s.qty + '"></div><div class="field"><label for="pt-why">Why</label><select id="pt-why"><option>Recount</option><option>Used</option><option>Lost or broken</option></select></div></div>' :
    '<div class="formgrid"><div class="field"><label for="pt-n">How many</label><input id="pt-n" type="number" min="1" max="' + s.qty + '" value="1"></div><div class="field"><label for="pt-to">For</label><select id="pt-to"><option>Comp bot › Intake</option><option>Comp bot › Drivetrain</option><option>Practice bot</option><option>Used up (not coming back)</option></select></div></div>') +
    '<div class="row"><button class="btn primary" data-act="ptakego" data-v="' + i.id + '" data-k="' + d.k + '" data-adj="' + (d.adjust ? 1 : 0) + '">' + (d.adjust ? "Save count" : "Take") + '</button><button class="btn" data-act="closemodal">Cancel</button></div>';
};

function budget() {
  var p = P(), committed = {}, pending = {};
  p.requests.forEach(function (r) { if (r.status === "toorder") committed[r.bud] = (committed[r.bud] || 0) + total(r); if (r.status === "needsok") pending[r.bud] = (pending[r.bud] || 0) + total(r); });
  var tb = 0, ts = 0, tc = 0; BUDGETS.forEach(function (b) { tb += b.budget; ts += p.spent[b.id]; tc += committed[b.id] || 0; });
  function kpi(v, l) { return '<div class="card tight kpi"><b>' + money(v) + "</b><span>" + l + "</span></div>"; }
  return '<div class="grid4 kpi5 pbud">' + kpi(tb, "Season budget") + kpi(ts, "Spent") + kpi(tc, "Committed") + kpi(tb - ts - tc, "Left") + kpi(Object.keys(pending).reduce(function (a, k) { return a + pending[k]; }, 0), "Waiting for an OK") + "</div>" +
    '<div class="card"><div class="row between"><h2>By category</h2>' + (D.isStaff() ? '<div class="row"><button class="btn sm">Import order sheet</button><button class="btn sm" data-act="pexport">Export to Google Sheet</button></div>' : "") + '</div><div class="list">' + BUDGETS.map(function (b) {
      var s = p.spent[b.id], c = committed[b.id] || 0, pe = pending[b.id] || 0;
      return '<div class="pbrow"><div class="row between nowrap"><b>' + b.name + '</b><span class="num"><b>' + money(Math.max(0, b.budget - s - c)) + '</b> left</span></div><div class="bar"><i style="width:' + Math.min(100, D.pct(s, b.budget)) + '%"></i><i class="soft" style="width:' + Math.min(100, D.pct(c, b.budget)) + '%"></i><i class="pend" style="width:' + Math.min(100, D.pct(pe, b.budget)) + '%"></i></div><span class="who">' + money(s) + " spent of " + money(b.budget) + (c ? " · " + money(c) + " committed" : "") + (pe ? " · " + money(pe) + " waiting for an OK" : "") + "</span></div>";
    }).join("") + '</div><div class="legend"><span><i class="pdotc"></i>Spent</span><span><i class="pdotc soft"></i>Committed</span><span><i class="pdotc pend"></i>Waiting for an OK</span></div></div>';
}
function vendorsView() {
  return '<div class="card"><div class="row" style="justify-content:flex-end"><button class="btn sm">+ Add vendor</button></div><div class="tablewrap" data-keepscroll="vendors"><table class="stacktbl"><thead><tr><th>Vendor</th><th>Free shipping</th><th>Processing + shipping</th><th>Cutoff</th><th>Tax</th><th>Pay with</th><th>Credits</th><th></th></tr></thead><tbody>' +
    P().vendors.map(function (v) { return '<tr><td class="lead"><b>' + esc(v.name) + '</b></td><td data-l="Free shipping">' + (v.free ? "over " + money(v.free) : "—") + '</td><td data-l="Processing + shipping">' + (v.lead + v.ship) + " business days (" + v.lead + " + " + v.ship + ')</td><td data-l="Cutoff">' + esc(v.cutoff || "—") + '</td><td data-l="Tax">' + (v.taxfree ? '<span class="pill ok">Exempt</span>' : '<span class="pill">Taxed</span>') + '</td><td data-l="Pay with">' + esc(v.pay) + '</td><td data-l="Credits">' + (v.credits.length ? v.credits.map(function (c) { return esc(c.label) + (c.bal ? " " + money(c.bal) : ""); }).join(", ") : "—") + '</td><td class="lead"><button class="btn sm" data-act="pvedit" data-v="' + esc(v.name) + '">Edit</button></td></tr>'; }).join("") +
    "</tbody></table></div></div>";
}

/* ---------- Actions ---------- */
var A = D.acts;
A.pfilter = function (b) { P().filter = b.dataset.v; D.render(); };
A.pvedit = function (b) { D.toast(b.dataset.v + " terms saved."); };
D.changes.pfiltersel = function (el) { P().filter = el.value; D.render(); };
A.pmine = function () { P().mine = !P().mine; D.render(); };
D.inputs.pq = function (el) { P().q = el.value; D.render(); };
A.preq = function (b) { D.openDrawer("preq", { id: b.dataset.v }); };
function hist(r, what) { r.hist.push({ who: D.me().name, what: what, when: "Just now" }); }
A.papprove = function (b) { var r = reqById(b.dataset.v); r.status = "toorder"; hist(r, "approved it"); D.log("approved " + r.name, "parts"); D.notify("mentor", "parts", D.me().name + " approved " + r.name + " for " + r.by + "."); D.toast("Approved. It's on the To order list."); D.render(); };
A.pdeny = function (b) { D.openModal("pdeny", { id: b.dataset.v }); };
A.pdenygo = function (b) { var r = reqById(b.dataset.v); r.status = "denied"; r.denied = D.val("p-deny"); hist(r, "denied it: " + r.denied); D.S.modal = null; D.toast("Denied. " + r.by + " sees your reason."); D.render(); };
A.preplace = function (b) { var r = reqById(b.dataset.v); var c = P().catalog.filter(function (x) { return x.id === "c6"; })[0]; var old = r.name; r.cid = c.id; r.name = c.name; r.sku = c.sku; r.price = c.price; r.vendor = c.vendor; r.status = "toorder"; hist(r, "replaced " + old + " with " + c.name + " and approved it"); D.toast("Replaced with " + c.name + " (in stock at REV) and approved."); D.render(); };
A.pcancel = function (b) { var r = reqById(b.dataset.v), prev = r.status; D.withUndo("Cancelled " + r.name, function () { r.status = "cancelled"; hist(r, "cancelled it"); }, function () { r.status = prev; r.hist.pop(); }); };
D.inputs.plq = function (el) {
  var p = P(), v = el.value; p.lq = v;
  if (/^https?:\/\//.test(v)) { lookup(v); }
  D.render();
};
function lookup(url) {
  var p = P(), d = p.draft || (p.draft = blankDraft());
  var hit = p.catalog.filter(function (c) { return url.toLowerCase().indexOf(c.sku.toLowerCase()) >= 0; })[0];
  if (/amazon\.|a\.co\//.test(url)) { d.cid = null; d.name = ""; d.vendor = "Amazon"; d.sku = ""; d.price = 0; d.options = null; d.lookup = { ok: false, text: "Amazon isn't filled in without an Edge box. Type the name and price yourself." }; d.bud = "tools"; d.guess = "Amazon's usual budget"; return; }
  if (hit) { fill(d, hit, "Found in the catalog. Last paid " + money(hit.last || hit.price) + "."); return; }
  d.lookup = { ok: false, text: "Couldn't read that page. Type the details in." };
}
A.plink = function (b) {
  var urls = { rev: "https://www.revrobotics.com/rev-21-1652/", wcp: "https://wcproducts.com/products/wcp-0213", amazon: "https://www.amazon.com/dp/B0C1XYZ123" };
  P().lq = urls[b.dataset.v]; lookup(urls[b.dataset.v]); D.render();
};
A.ppick = function (b) { var p = P(), d = p.draft || (p.draft = blankDraft()); fill(d, p.catalog.filter(function (c) { return c.id === b.dataset.v; })[0], "From the catalog."); p.lq = ""; D.render(); };
D.inputs.pd = function () { readDraft(); var d = P().draft, ok = !!(d.name && d.vendor && d.price), b = document.querySelector('[data-act="psubmit"]'), h = document.getElementById("pd-hint"); if (b) b.disabled = !ok; if (h) h.hidden = ok; };
D.changes.pdbud = function (el) { var d = P().draft; d.bud = el.value; d.guess = ""; D.render(); };
D.changes.pdopt = function (el) { P().draft.opt = el.value; };
A.ppri = function (b) { readDraft(); P().draft.pri = b.dataset.v; D.render(); };
A.pclear = function () { P().draft = blankDraft(); P().lq = ""; D.render(); };
A.pwish = function () { readDraft(); var p = P(); (p.wish || (p.wish = [])).push(p.draft); D.toast("Saved to the wishlist. Find it under Wishlist on Requests."); p.draft = blankDraft(); D.render(); };
A.pwishuse = function (b) { var p = P(), d = p.wish.splice(+b.dataset.v, 1)[0]; p.draft = d; D.S.tabs.parts = "new"; D.render(); };
A.psubmit = function () {
  readDraft(); var p = P(), d = p.draft;
  if (!d.name || !d.vendor) { D.toast("Add the part and vendor first (or pick from the catalog)."); D.render(); return; }
  var r = { id: 200 + p.requests.length, cid: d.cid, name: d.name + (d.opt ? " (" + d.opt + ")" : ""), vendor: d.vendor, sku: d.sku, price: d.price, pack: d.pack, unit: d.unit, qty: d.qty, bud: d.bud, pri: d.pri, need: d.need, sub: d.sub || "General", task: d.task, why: d.why, by: D.me().name, order: null, hist: [ { who: D.me().name, what: "requested it", when: "Just now" } ] };
  r.status = total(r) > LIMIT ? "needsok" : "toorder";
  if (!r.cid) p.catalog.push({ id: "n" + r.id, name: r.name, vendor: r.vendor, sku: r.sku, price: r.price, cat: "New", pack: r.pack, unit: r.unit, last: null });
  D.withUndo(r.status === "needsok" ? "Sent. Over $250, so a mentor OKs it first." : "Sent. It's on the To order list.", function () {
    p.requests.push(r); p.draft = null; D.S.tabs.parts = "requests"; p.filter = "open"; p.mine = true;
    D.log("requested " + r.name, "parts"); D.notify(r.status === "needsok" ? ["admin", "mentor"] : "mentor", "parts", r.by + " requested " + r.name + (r.status === "needsok" ? " (" + money(total(r)) + ", needs an OK)." : "."));
  }, function () { p.requests.pop(); D.S.activity.shift(); });
};
A.pcopy = function (b) { if (b.dataset.v === "Amazon") { D.toast("Share-A-Cart link opened (one-click Amazon cart)."); D.render(); return; } D.openModal("pcopy", { v: b.dataset.v }); };
A.pcopygo = function () { var el = document.getElementById("p-copytext"); try { navigator.clipboard.writeText(el.value).then(function () { D.toast("Copied."); D.render(); }, function () { el.select(); }); } catch (e) { el.select(); } };
A.pmarkordered = function (b) { D.openModal("pordered", { v: b.dataset.v }); };
D.inputs.poship = function (el) { D.S.modal.data.ship = Math.round((parseFloat(el.value) || 0) * 100); D.render(); };
D.inputs.potax = function (el) { D.S.modal.data.tax = Math.round((parseFloat(el.value) || 0) * 100); D.render(); };
A.porderedgo = function (b) {
  var p = P(), vn = b.dataset.v, v = vendor(vn), lines = p.requests.filter(function (r) { return r.status === "toorder" && r.vendor === vn; });
  var md = D.S.modal.data, items = lines.reduce(function (a, r) { return a + total(r); }, 0);
  var ship = md.ship != null ? md.ship : (v.free && items >= v.free ? 0 : 1195), tax = md.tax != null ? md.tax : (v.taxfree ? 0 : Math.round(items * .089));
  var byB = {}; lines.forEach(function (r) { byB[r.bud] = (byB[r.bud] || 0) + total(r); });
  var ids = Object.keys(byB), w = ids.map(function (k) { return byB[k]; }), sS = split(ship, w), sT = split(tax, w);
  ids.forEach(function (k, i) { p.spent[k] += byB[k] + sS[i] + sT[i]; });
  var id = 4472 + p.orders.length + p.closed.length;
  lines.forEach(function (r) { r.status = "ordered"; r.order = id; hist(r, "ordered it (order #" + id + ")"); });
  p.orders.unshift({ id: id, vendor: vn, number: D.val("po-num"), tracking: "", placedBy: D.me().name, placed: "Nov 10", items: items, ship: ship, tax: tax, lines: lines.map(function (r) { var last = p.items.filter(function (i) { return i.cid === r.cid; })[0]; return { rid: r.id, got: 0, done: false, loc: last ? last.stock[0].place : "Shelf A", problem: null, by: null }; }) });
  D.S.modal = null; D.log("placed order #" + id + " with " + vn + " (" + money(items + ship + tax) + ")", "parts");
  lines.forEach(function (r) { if (r.by === "Sam Ortiz") D.notify("student", "parts", "Your " + r.name + " was ordered from " + vn + "."); });
  D.toast("Order #" + id + " placed. Anyone can check it in on Arriving."); D.render();
};
function receive(o, l) {
  var p = P(), r = reqById(l.rid), it = p.items.filter(function (i) { return i.cid === r.cid; })[0];
  if (!it) { it = { id: "i" + Date.now(), name: r.name, cid: r.cid, unit: r.unit || "each", min: 0, stock: [], hist: [] }; p.items.push(it); }
  var s = it.stock.filter(function (x) { return x.place === l.loc; })[0]; if (!s) { s = { place: l.loc, qty: 0 }; it.stock.push(s); }
  s.qty += l.got; it.hist.unshift({ who: D.me().name, what: "received " + l.got + " into " + l.loc + " (order #" + o.id + ")", when: "Just now" });
  return function () { s.qty -= l.got; it.hist.shift(); };
}
function closeIfDone(o) {
  var p = P();
  if (!o.lines.every(function (l) { return l.done || l.problem; })) return;
  var byWho = {}; o.lines.forEach(function (l) { var r = reqById(l.rid); if (l.done) { r.status = "putaway"; hist(r, "checked in " + l.got + " to " + l.loc); (byWho[r.by] = byWho[r.by] || []).push(r.name + " (" + l.loc + ")"); } });
  if (byWho["Sam Ortiz"]) D.notify("student", "parts", "Your " + byWho["Sam Ortiz"].join(" and ") + " arrived.");
  D.notify("mentor", "parts", "Order #" + o.id + " from " + o.vendor + " is checked in" + (o.lines.some(function (l) { return l.problem; }) ? " with a problem to resolve." : "."));
  p.orders.splice(p.orders.indexOf(o), 1); p.closed.unshift({ id: o.id, vendor: o.vendor, placedBy: o.placedBy, placed: o.placed, items: o.items, ship: o.ship, tax: o.tax });
}
A.ptick = function (b) {
  var o = P().orders[+b.dataset.o], l = o.lines[+b.dataset.l], r = reqById(l.rid), want = r.qty * r.pack, undoStock = null;
  if (l.done) { l.done = false; D.render(); return; }
  D.withUndo("Checked in " + (l.got || want) + " × " + r.name, function () { l.got = l.got || want; l.done = true; l.by = D.me().name; undoStock = receive(o, l); D.log("checked in " + r.name, "parts"); closeIfDone(o); },
    function () { if (P().orders.indexOf(o) < 0) { P().orders.unshift(o); P().closed.shift(); o.lines.forEach(function (x) { var rr = reqById(x.rid); rr.status = "ordered"; }); } l.done = false; l.by = null; if (undoStock) undoStock(); D.S.activity.shift(); });
};
A.pqty = function (b) { var l = P().orders[+b.dataset.o].lines[+b.dataset.l], r = reqById(l.rid), want = r.qty * r.pack; var cur = l.done ? l.got : (l.got || want); l.got = Math.max(0, cur + (+b.dataset.v)); if (l.got < want) l.done = false; D.render(); };
D.changes.ploc = function (el) { P().orders[+el.dataset.o].lines[+el.dataset.l].loc = el.value; };
A.pproblem = function (b) { var l = P().orders[+b.dataset.o].lines[+b.dataset.l], opts = [null, "Damaged", "Wrong part", "Missing"]; l.problem = opts[(opts.indexOf(l.problem) + 1) % opts.length]; if (l.problem) D.notify("mentor", "parts", reqById(l.rid).name + ": " + l.problem.toLowerCase() + " (order #" + P().orders[+b.dataset.o].id + ")."); D.render(); };
A.pall = function (b) { var snap = JSON.stringify(D.S.parts), o = P().orders[+b.dataset.o]; o.lines.forEach(function (l) { if (!l.done && !l.problem) { var r = reqById(l.rid); l.got = l.got || r.qty * r.pack; l.done = true; l.by = D.me().name; receive(o, l); } }); D.log("checked in order #" + o.id, "parts"); closeIfDone(o); D.toast("All lines checked in and put away.", function () { D.S.parts = JSON.parse(snap); }); D.render(); };
A.pclose = function (b) { var o = P().orders[+b.dataset.o]; o.lines.forEach(function (l) { if (!l.done) l.problem = l.problem || "Missing"; }); closeIfDone(o); D.toast("Order closed. Missing lines can be reordered from the request."); D.render(); };
A.ploc2 = function (b) { P().loc = b.dataset.v; D.render(); };
D.inputs.pinvq = function (el) { P().invq = el.value; D.render(); };
A.plow = function () { P().low = !P().low; D.render(); };
A.pitem = function (b, e) { if (e && e.target.closest("[data-act='pmore']")) return; D.openDrawer("pitem", { id: b.dataset.v }); };
A.pmore = function (b) { var i = item(b.dataset.v), c = P().catalog.filter(function (x) { return x.id === i.cid; })[0], d = blankDraft(); if (c) fill(d, c, "Low stock: " + inStore(i) + " left, minimum " + i.min + "."); d.qty = Math.max(1, Math.ceil((i.min * 2 - inStore(i)) / (c ? c.pack : 1))); d.task = "Restock " + i.name; d.from = "Inventory"; P().draft = d; D.S.tabs.parts = "new"; D.S.drawer = null; D.render(); };
A.ptake = function (b) { D.openModal("ptake", { id: b.dataset.v, k: +b.dataset.k }); };
A.padjust = function (b) { D.openModal("ptake", { id: b.dataset.v, k: +b.dataset.k, adjust: true }); };
A.ptakego = function (b) {
  var i = item(b.dataset.v), s = i.stock[+b.dataset.k], n = parseInt(D.val("pt-n"), 10) || 0;
  if (b.dataset.adj === "1") { var why = D.val("pt-why"); i.hist.unshift({ who: D.me().name, what: "counted " + n + " in " + s.place + " (was " + s.qty + ", " + why.toLowerCase() + ")", when: "Just now" }); s.qty = n; }
  else { var to = D.val("pt-to"); n = Math.min(n, s.qty); s.qty -= n; if (to.indexOf("Used") < 0) { var t = i.stock.filter(function (x) { return x.place === to; })[0]; if (!t) { t = { place: to, qty: 0 }; i.stock.push(t); } t.qty += n; } i.hist.unshift({ who: D.me().name, what: "took " + n + " for " + to, when: "Just now" }); D.log("took " + n + " " + i.name + " for " + to, "parts"); }
  D.S.modal = null; D.render();
};
A.preturn = function (b) { var i = item(b.dataset.v), s = i.stock[+b.dataset.k], home = i.stock.filter(function (x) { return x.place.indexOf("bot") < 0; })[0]; home.qty += s.qty; i.hist.unshift({ who: D.me().name, what: "returned " + s.qty + " from " + s.place + " to " + home.place, when: "Just now" }); i.stock.splice(+b.dataset.k, 1); D.render(); };
A.pexport = function () { D.toast("Exported 2026–27 orders to the “Parts (export, don't edit)” Google Sheet."); D.render(); };
D.partsApi = {
  stockFor: function (name) { var i = P().items.filter(function (x) { return x.name.toLowerCase().indexOf(name.toLowerCase()) >= 0; })[0]; return i ? { name: i.name, store: inStore(i), where: i.stock.filter(function (s) { return s.place.indexOf("bot") < 0; }).map(function (s) { return s.place + " (" + s.qty + ")"; }).join(", ") } : null; },
  startRequest: function (opts) { var p = P(), d = blankDraft(), c = opts.catalogName ? p.catalog.filter(function (x) { return x.name.toLowerCase().indexOf(opts.catalogName.toLowerCase()) >= 0; })[0] : null; if (c) fill(d, c, "From the catalog."); d.task = opts.task || ""; d.from = opts.from || "Tasks"; d.sub = opts.sub || ""; d.need = opts.need || ""; d.pri = opts.pri || "normal"; if (!c && opts.name) d.name = opts.name; if (opts.why) d.why = opts.why; p.draft = d; D.S.tabs.parts = "new"; D.go("parts"); }
};
})();
