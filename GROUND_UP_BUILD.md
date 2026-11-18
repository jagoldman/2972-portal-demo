# Build brief for the Ground up version (binding for coders)

The lead wrote this on 2026-11-17. `GROUND_UP.md` says why; this page says exactly what each coder builds.
Four coders work in this folder at the same time, each in their own files. The lead builds Home and the shell.

## Common rules (every coder)

**Where.** Work only in the `design-8.3` worktree of this repo (`.worktrees/demo-design83` beside the repo folders). Do not touch
any other folder, repo or worktree. Do not run `git commit`, `git stash`, `git checkout`, `git reset` or `git push`;
the lead commits. Do not install anything. Do not start a server; the demo opens from `index.html` as a file.

**Your files.** Edit only the files your section lists. If you need something from a file you do not own, do not
edit it: say so in your report. `js/core.js`, `css/ground.css`, `css/ideal.css`, `css/look.css` and `index.html`
belong to the lead.

**Read first.** `GROUND_UP.md` (all of it, it is short). The header comments of `css/look.css`, `css/ideal.css` and
`css/ground.css`. `js/core.js` (the whole file: it holds the helpers `D.ic`, `D.esc`, `D.topbar`, `D.tabsFor`,
`D.toast`, `D.withUndo`, `D.openDrawer`, `D.openModal`, `D.go`, `D.render`, the event wiring through `data-act`,
`data-change` and `data-input`, and the new `D.ideal()`, `D.ground()`, `D.practicesLeft(date)`,
`D.practicesText(date)`, `D.stages(steps, cur, label)`, `D.move(who, mine)`). Then your own app file.

**Three versions, one codebase.** The demo strip switches Live, Baseline, Ground up. `D.ground()` is true only in
Ground up. **Everything you add shows only when `D.ground()` is true** (the calculators are the one exception, see
T). In Live and Baseline every screen must draw exactly as it does now. Put your styles in your own css file, under
`:root[data-design="c"] { ... }` (CSS nesting, as the other files do).

**Code style.** Match the file: plain browser JavaScript, `var`, `function`, strings built with `+`, no build step,
no modules, no libraries, no arrow functions or template strings. Escape every piece of data with `D.esc`. Comments
say why, in full sentences, like the ones already there.

**Design rules.**
- Use the tokens only (`var(--text)`, `var(--mute)`, `var(--line)`, `var(--surface-2)`, `var(--bumper)`,
  `var(--accent)`, `var(--ok)`, `var(--warn)`, `var(--bad)`, `var(--tint)`, `var(--r)`, `var(--r-ctl)`), so dark mode
  works. No hex colours, no new fonts, no shadows on content, no gradients.
- The typeface is Archivo, already loaded. Headings are `h2` (16 px) and `h3`; do not make type bigger to get
  attention. No upper-case labels. No middle dots (`·`) in new text: use a comma, "and", or separate elements. No
  arrows on links or buttons. Sentence case.
- A status is a dot and a word: `<span class="pill ok|warn|bad|info">Word</span>`. A count is `.tcount`.
- One main button per screen (`.btn.primary`). Others are `.btn` or `.btn.ghost`.
- Phone first. Every screen must work at 390 px with no sideways scroll, and anything tapped is at least 44 px high
  on a phone (640 px and narrower). With a mouse, rows are 40 px and buttons 34 px (see `css/ideal.css`).
- Keyboard: everything reachable by Tab, focus visible, real `<button>`, `<a>`, `<input>` and `<label>` elements.
  Give icon-only buttons an `aria-label`. Respect `prefers-reduced-motion` (base.css already turns transitions off).
- Words: write for a 14-year-old on a phone. Active voice, short sentences, the same word for the same thing
  everywhere. A button says what it does ("Request it", not "Submit"). An empty state says what to do next.
- Do not add a feature this page does not list. If something seems missing, write it in your report.

**Check your work, and report only what you ran.**
1. `node --check js/<your file>.js`.
2. The sweep script draws screens and prints a line for every script error (`PAGEERROR`, `CONSOLE`) and every
   sideways scroll (`HSCROLL`). There must be none. Use your own output folder.
   ```
   SP=<the lead session's scratch folder, given in the task message>
   ROUTES='<regex on role/route>' node $SP/sweep.js "$PWD" $SP/coder-<letter>/c c     # all three widths, Ground up
   ROUTES='<regex>' NOSHOT=1 node $SP/sweep.js "$PWD" $SP/coder-<letter>/x b          # Baseline: no errors
   ROUTES='<regex>' NOSHOT=1 node $SP/sweep.js "$PWD" $SP/coder-<letter>/x live       # Live: no errors
   DARK=1 ROUTES='<regex>' node $SP/sweep.js "$PWD" $SP/coder-<letter>/dark c d       # dark mode, desktop
   ```
   The script clicks every tab of each route. Screens it does not reach (a drawer, a search with text in it, a
   calculator with other inputs) need your own short Playwright script, kept in your `$SP/coder-<letter>/` folder,
   never in the repo. Playwright is at `../tools/node_modules/playwright` (the `tools` repo beside this one).
   The demo takes `?design=c&role=student|mentor|admin|parent&mode=competition#<route>`.
3. **Look at your screenshots** with the Read tool, at 1280, 820 and 390 px, and fix what looks wrong: text cut off,
   things misaligned, two things that say the same, a row taller than its neighbours.
4. Other coders are editing other files at the same moment, so a script error from a file that is not yours can
   appear in a sweep. Report it; do not fix it.

**Your report** (the last thing you write): what you built, file by file; what you did not build and why; every
check you ran and its result; anything you were unsure about. Do not say a check passed unless you ran it.

---

## T. Tools: the calculators

> **2026-11-18:** this brief built the nine calculators (`js/calcs.js`, `css/calcs.css`). The owner then chose the
> fourteen of the calculators plan in their place, and those two files were removed. Kept for the record.

**Files:** `js/calcs.js`, `css/calcs.css`, and in `js/tools.js` only `D.views.tools` (the Tools page). Do not change
the two existing tools.

Build the nine calculators of `GROUND_UP.md` §6. They are new function, so they show in **Baseline and Ground up**
and not in Live: the lead's `D.visibleTools()` already hides any tool with `calc: true` in Live. Styles in
`css/calcs.css` are therefore not scoped to a version; prefix every class with `calc` so they touch nothing else.

**Registering.** At load, `js/calcs.js` pushes one entry per calculator onto `D.TOOLS`, in the order of the table
below: `{ id, name, icon, line, tip, modes: ["build", "competition"], groups: ["admin", "mentor", "student"], calc: true }`,
sets `D.APPNAME[id] = "Tools"`, and defines `D.views[id]`. Ids: `calc-gearbox`, `calc-drive`, `calc-belt`,
`calc-chain`, `calc-arm`, `calc-elevator`, `calc-flywheel`, `calc-drill`, `calc-motors`. `line` is one short
sentence a student would say yes to ("Which belt fits, and how far apart the pulleys go."). You may add icon paths
to `D.ICON` (24 px grid, stroke only, like the others).

**The Tools page** (`D.views.tools`): when calculators are visible, two groups with an `h2` each, "From a photo"
(the two existing tools) and "Calculators", rows drawn with `D.toolRow`. In Live the page is unchanged.

**State.** Keep each calculator's inputs in `D.S.tools.calc.<name>` (set defaults in a `D.inits.push`). Demo Reset
restores the defaults.

**Typing must not lose focus or redraw the page.** `D.render()` rebuilds everything. On each keystroke, update the
state and repaint only the answer, the results and the drawing in place (one `paint()` per calculator that sets
`innerHTML` of those containers). Call `D.render()` only for changes that alter the inputs themselves (adding a
gear stage, switching units).

**Every calculator page, top to bottom:**
1. A back link "All tools" and the `h1` (copy the `head()` pattern in `js/tools.js`).
2. **The answer**: one sentence in plain words that changes as you type, in an `aria-live="polite"` element. Example:
   "Use a 110-tooth belt. Put the pulleys 9.842 in apart." If the inputs cannot work, the sentence says why and what
   to change ("The pulleys overlap. Make the distance more than 2.3 in.").
3. Two columns on a wide screen (inputs left, results and drawing right), one column on a phone with the inputs
   first.
4. **Inputs**: `.field` blocks with a real `<label>`, `type="number"` with `inputmode="decimal"`, sensible `min`,
   `max` and `step`, and the unit shown after the box. Where the shop uses both, a small in / mm switch (`.seg`).
   Empty or impossible input never shows `NaN` or `Infinity`; it shows a dash and the answer sentence explains.
5. **Results**: a short list of name, value, unit. Numbers use `class="num"` and are rounded to what a student can
   use (3 decimals for inches, 1 for mm, whole rpm, 1 decimal for ft/s and amps).
6. **How this is worked out**: a `<details>` with the formula in words and symbols, short. A student should be able
   to redo it on paper.
7. A row with **Copy link** and **Reset**. Copy link puts a link on the clipboard that opens this calculator with
   these inputs: the page address with `?in=<the inputs, compactly>` and the route. On load, a calculator whose
   route is open reads `in` once. Do not rewrite the address while the person types. Toast "Link copied."
8. Where a result is a part, one door: "Find it in Parts" (see how the Gear finder in `js/tools.js` opens Parts and
   do the same).
9. One line, once per page, where it applies: "These are the makers' published motor figures at 12 V. A real
   mechanism loses more, so leave room."

**Motor data** (makers' published figures at 12 V; free speed rpm, stall torque N·m, stall current A, free
current A). Use exactly these:

| Motor | Free speed | Stall torque | Stall current | Free current |
|---|---|---|---|---|
| Kraken X60 | 6000 | 7.09 | 366 | 2 |
| Kraken X44 | 7530 | 4.05 | 275 | 2 |
| Falcon 500 | 6380 | 4.69 | 257 | 1.5 |
| NEO Vortex | 6784 | 3.6 | 211 | 3.6 |
| NEO | 5676 | 2.6 | 105 | 1.8 |
| NEO 550 | 11000 | 0.97 | 100 | 1.4 |
| CIM | 5330 | 2.41 | 131 | 2.7 |

**The motor model** (one function, used by every mechanism calculator). For one motor at speed ω (0 to free speed
ω_f): torque τ = τ_stall × (1 − ω/ω_f); current I = I_free + (I_stall − I_free) × (1 − ω/ω_f). The torque constant
is k_t = τ_stall / (I_stall − I_free). A current limit I_lim caps the torque at k_t × (I_lim − I_free). Efficiency η
(default 90%, an input) multiplies the torque that reaches the output.

**Formulas** (keep the pure maths in one object, `D.calcMath`, with no DOM in it, so it can be tested):

- **Gearbox.** Each stage is driving teeth to driven teeth; ratio = product of driven/driving. Output free speed =
  ω_f / ratio. Output stall torque = n × τ_stall × ratio × η. Also the output torque at the current limit. Chart:
  output torque and current per motor against output speed, from stall to free speed.
- **Drivetrain.** Free speed = (ω_f / ratio) × π × wheel diameter. Step a simulation at 5 ms: force at the floor =
  n × τ(ω, I_lim) × ratio × η / wheel radius, capped at the grip limit μ × weight (μ is an input, default 1.1);
  acceleration = force / mass. Stop at the chosen distance or at 10 s. Results: free speed, the speed reached at the
  chosen distance, the time to cover it, and whether the wheels slip at the start. Chart: speed against time.
  Offer the ratio as a number, with three well-known swerve ratios as quick picks: 8.14, 6.75, 6.12.
- **Belt.** Pitch p is 3 mm (GT2) or 5 mm (HTD). Pitch diameter D = p × teeth / π. For centre distance C and radii
  R1 ≤ R2: length L = 2 × sqrt(C² − (R2 − R1)²) + π × (R1 + R2) + 2 × (R2 − R1) × asin((R2 − R1) / C). Belts come in
  whole teeth; an input chooses "every 5 teeth" (default) or "any". From the distance wanted, find the belt just
  shorter, the nearest and the just longer; for each, solve L(C) = p × teeth for C by bisection. Show the three, the
  nearest marked. Also the teeth in mesh on the small pulley (wrap angle / 360 × teeth; wrap = 180° − 2 × asin((R2 −
  R1)/C)), with a warning under 6. Drawing: both pulleys and the belt to scale, the centre distance dimensioned.
- **Chain.** Pitch p is 0.25 in (#25) or 0.375 in (#35). Pitch diameter D = p / sin(π / teeth). Use the same length
  formula on the pitch circles; links = L / p. Chain needs a whole number of links, and an even number unless a half
  link is used: offer the even counts just below and above the distance wanted, with the exact C for each. Drawing
  as for the belt.
- **Arm.** Torque to hold the arm level = weight × distance to its centre of mass. Per motor that is torque /
  (ratio × n). Current to hold = I_free + that / k_t. Reserve = (n × torque at the current limit × ratio × η) /
  holding torque, shown as "2.4 times what it needs"; under 2 is a warning, under 1 is "cannot hold". Time for a
  quarter turn from level to straight up: simulate at 2 ms with inertia = mass × distance², the motor model and
  gravity torque = weight × distance × cos(angle); if it is not there in 5 s say so.
- **Elevator.** Force = load weight. Torque per motor to hold = force × spool radius / (ratio × n); current to hold
  as for the arm. Load that stalls it at the current limit = n × limited torque × ratio × η / spool radius. Speed
  and time for the travel: simulate at 2 ms with the load's mass and the motor model, upward against gravity.
- **Flywheel.** Wheel speed = ω_f / ratio (a ratio under 1 is a speed-up and is allowed). Edge speed = π × diameter
  × wheel speed. Rough exit speed: about half the edge speed with one wheel and a fixed hood, about the edge speed
  with two wheels; say "rough". With the wheel's weight (an input, optional), time to reach 90% of free speed:
  simulate with inertia = ½ × mass × radius².
- **Drill and tap chart.** A table with a search box that filters as you type. Columns: thread, tap drill, close
  clearance, free clearance; each cell gives the drill name and its size in inches and mm. Data, exactly:

  | Thread | Tap drill | Close clearance | Free clearance |
  |---|---|---|---|
  | #4-40 | #43 (0.089) | #32 (0.116) | #30 (0.1285) |
  | #6-32 | #36 (0.1065) | #27 (0.144) | #25 (0.1495) |
  | #8-32 | #29 (0.136) | #18 (0.1695) | #16 (0.177) |
  | #10-24 | #25 (0.1495) | #9 (0.196) | #7 (0.201) |
  | #10-32 | #21 (0.159) | #9 (0.196) | #7 (0.201) |
  | 1/4-20 | #7 (0.201) | F (0.257) | H (0.266) |
  | 1/4-28 | #3 (0.213) | F (0.257) | H (0.266) |
  | 5/16-18 | F (0.257) | P (0.323) | Q (0.332) |
  | 3/8-16 | 5/16 (0.3125) | W (0.386) | X (0.397) |
  | M3 x 0.5 | 2.5 mm | 3.2 mm | 3.4 mm |
  | M4 x 0.7 | 3.3 mm | 4.3 mm | 4.5 mm |
  | M5 x 0.8 | 4.2 mm | 5.3 mm | 5.5 mm |
  | M6 x 1.0 | 5.0 mm | 6.4 mm | 6.6 mm |

  Mark #10-32 and 1/4-20 as "most used on the robot". This page has no motor line and no Copy link.
- **Motors.** The table above with peak power added (¼ × τ_stall × ω_f in rad/s, in watts). Pick two motors to see
  their torque curves on one chart. No Copy link needed.

**Charts and drawings.** Inline SVG, sized by `viewBox`, colours from the tokens (`stroke="currentColor"` or
`style="stroke:var(--bumper)"`). Axis titles with units. Label the lines on the chart itself, not in a legend. At
most two series; the second is `var(--text-2)` and dashed, so the chart does not depend on colour. Text in a chart
is at least 11 px at 390 px wide. Each chart has a `<title>` and the same numbers appear in the results list, so
nothing is only in the picture. If a skill named `dataviz` is available to you, load it before drawing the first
chart and follow it where it does not conflict with this page.

**Test the maths.** Write a node script in `$SP/coder-T/` that loads `js/calcs.js` with a stub `D` and checks
`D.calcMath` against these, to 3 significant figures, and prints each result:
- Belt, 5 mm, 24 and 24 teeth, 100-tooth belt: centre distance 190.0 mm.
- Belt, 5 mm, 18 and 36 teeth, 200 mm wanted: the three belts and their distances; check each by putting C back
  into the length formula.
- Chain, #25, 16 and 16 teeth, 60 links: 5.500 in.
- Gearbox, 12 to 60 then 20 to 50: 12.5 to 1; one Kraken X60: 480 rpm free.
- Drivetrain, Kraken X60, 6.75 to 1, 4 in wheel: free speed 15.5 ft/s.
- Arm, 10 lb at 20 in: 22.6 N·m to hold level.
- Elevator, one Kraken X60, 10 to 1, 1.5 in spool, 20 lb: torque per motor to hold = 0.170 N·m.
Put the script's output in your report.

**Routes for the sweep:** `ROUTES='student/(tools|calc-)'`. The sweep's page list does not include the calculator
routes, so write your own short script that opens all nine at the three widths, types into a few inputs, and takes
screenshots.

---

## P. Parts & Inventory

**Files:** `js/parts.js`, `css/ground-parts.css`.

Build `GROUND_UP.md` §4, Parts, items 1 to 3, on the Requests tab and the request panel, plus the small api Home
needs. All of it only when `D.ground()` is true. The Baseline table of requests (`.ptable`, in `requests()`) stays
and is the base you extend.

1. **Find it or ask for it.** In Ground up the search box is the first control on the Requests tab, full width,
   with a visible label "Find it or ask for it" and the placeholder "What do you need?". When it has text:
   - **In the shop**: inventory items that match (name or SKU), at most five: name, where it is, how many are in the
     store (with its unit), the Low mark if low, and the same Take button the Inventory tab has (same `data-act`).
     One door under them: "Open Inventory" (it opens the Inventory tab with the same text in its search).
   - **Requests**: the matching requests, in the table.
   - If nothing matches in either: one sentence, "Nothing like “<text>” is in the shop or on order.", and the main
     button **Request it**, which opens the request form with the name filled in.
   - If the shop has it, the request button is plain and says "Request more".
   Typing must keep focus in the box (the page already restores focus to an input that has an `id`).
2. **The flow is the filter.** Replace the "Show" dropdown with a row of step buttons, each with its count: All
   open, Needs OK, To order, Ordered, Arrived. They set the same `p.filter` values the dropdown did
   (`aria-pressed`). The rarely used ones (Denied or cancelled, All, Wishlist) go in one small "More" select at the
   end of the row. Keep "Only mine". On a phone the row wraps; it never scrolls the page sideways.
3. **Whose move.** In each request row, under or beside the status word, `D.move(...)`: Needs OK is "Your move" for a
   mentor or admin and "Waiting on a mentor" for a student; To order the same with "a mentor to order"; Ordered
   shows "Arrives about <date>" when the order's date plus the vendor's shipping days gives one; Arrived shows
   "Ready to put away". Use `D.practicesText(r.need)` after the need-by date where there is room ("Thu, Nov 12, 1
   practice left").
4. **The request panel** (`D.drawers.preq`): in Ground up it opens with `D.stages(...)`: Asked, OK'd, Ordered,
   Arrived, Put away, each with who and when taken from `r.hist` where the history has it. A denied or cancelled
   request shows one plain line instead of the steps.
5. **The api for Home.** Define, in every version (it is only data):
   - `D.partsApi.needsOk()` returns `[{ id, name, by, total, pri, orderBy }]` (total in cents; `orderBy` an ISO date
     or null), most urgent first.
   - `D.partsApi.approve(id)` does exactly what the Approve button does (same function, same toast with Undo, same
     notice and log) and redraws.
   - `D.partsApi.mine()` returns the signed-in person's own unfinished requests:
     `[{ id, name, status, statusText, kind, waitingOn, eta }]` where `kind` is the pill class, `waitingOn` is "a
     mentor" or "" and `eta` is the "Arrives about" text or "".
   - `D.partsApi.open(id)` goes to Parts, Requests tab, and opens that request's panel.

**Routes for the sweep:** `ROUTES='(student|mentor)/parts'`. Your own script must also shoot: the search with a text
that matches inventory ("bearing"), one that matches nothing ("gizmo"), and the request panel open, as student and
as mentor, at 1280 and 390 px.

---

## S. Skills

**Files:** `js/skills.js`, `css/ground-skills.css`.

Build `GROUND_UP.md` §4, Skills, items 1 to 4, plus the small api Home needs. Only when `D.ground()` is true, except
the api.

1. **Machines you can use** is the first section of a student's Overview. One row per shop machine (the same list
   and the same states the Permissions tab uses: `permitState`): a `.pill ok` "Cleared", `.pill warn` "In training"
   or a grey "Not yet", then one short line that says what comes next ("Next: Know the metal bandsaw") and opens
   that skill. Cleared machines first. On a wide screen the rows may sit in two or three columns; on a phone, one.
2. **Finish what you started** (the "In progress" list, renamed in Ground up) comes before "Ready to start". In
   Baseline the two lists sit side by side (`.skhalf`); keep that side-by-side layout in Ground up with the order
   swapped. Under "Ready to start" show three, then "Show all N".
3. **Waiting for sign-off** rows say `D.move("a mentor")` and since when, if the request has a date.
4. **Permissions tab**: a "Find a student" box above the table that narrows the rows as you type (keep focus). On a
   phone, when one student is left, show their machines as a list of rows, not a wide table.
5. **The api for Home.** Define, in every version:
   - `D.skillsApi.requests()` returns the sign-off requests a mentor sees: `[{ key, student, skill, where }]`
     (`where` like "Manufacturing, OMIO Router"; `key` is whatever `signOff` needs).
   - `D.skillsApi.signOff(key)` does exactly what the Sign off button in the Sign off tab does (same function, same
     toast with Undo if it has one, same notice and log) and redraws.
   - `D.skillsApi.mine()` returns, for the signed-in student, `{ waiting: [{ skill, since }], machines: [{ name,
     state }] }` with `state` one of "yes", "training", "no".
   - `D.skillsApi.open(tab)` goes to Skills on that tab ("signoff", "overview", "permits").

**Routes for the sweep:** `ROUTES='(student|mentor)/skills'`. Your own script must also shoot the Permissions tab
with a name typed, at 1280 and 390 px.

---

## E. Competition: one line across Schedule, Pit and Scouting

**Files:** `js/compete.js`, `css/ground-compete.css`.

Build `GROUND_UP.md` §4, Competition. Only when `D.ground()` is true, except `D.eventLine`, which is defined in every
version so Home can use it.

1. **The event line.** One function, `eventLine(here)`, that returns a slim strip with up to three parts:
   - **You now**: the signed-in person's role this slot and until when, then what comes next ("Scouting until 10:00,
     then Break"). For someone with no shift: "No shift now".
   - **Next match**: the match name, our alliance colour as a word, the scheduled time, and how long from the demo's
     "now" ("Qual 14, Red, 12:00, in 2 h 45 min"). Use the data the Pit and Scouting top cards already use.
   - **Robot**: the checklist count ("5 of 11 checked") and the battery in the robot if the Pit data has one.
   Each part is a door: a real link or button that opens Schedule, Pit or Scouting.
2. **No repeats.** Each app's own top card already gives that app's part. So in Schedule the line shows Next match
   and Robot; in Pit it shows You now and Next match; in Scouting it shows You now and Robot. `here` says which
   part to leave out. With `here` empty (Home), all three show.
3. It sits at the very top of the content of all three apps (above the top card), and is the same height in each.
   On a phone the parts stack as short rows or sit side by side if they fit; no sideways scroll; each part is at
   least 44 px high to tap.
4. `D.eventLine = function () { return eventLine(""); }` for Home's event-day view.
5. Do not change the forms, the checklist, the schedule grid or the top cards themselves.

**Routes for the sweep:** `ROUTES='(student|mentor)/(schedule|pit|scouting)'` (the sweep adds
`&mode=competition` for these).
