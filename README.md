# 2972 Team Portal Demo (simple UI)

A clickable prototype of the apps planned for 2972robotics.com, the site of FRC Team 2972 (Gears & Buccaneers). It is the design source for the real apps: change it here first, then build it. `REDESIGN.md` is the brief this version follows. Component ideas from outside live in [../infra/docs/UI_LIBRARIES.md](../infra/docs/UI_LIBRARIES.md). This demo stays plain HTML/CSS/JS, so an idea from that list is rebuilt in CSS here before an app gets it.

Everything is sample data. Nothing is saved, and a reload resets it. The only things kept in this browser are your own page choices: which groups are open and how far you are in the guide (per role). **Reset** clears those too.

## How to use it
- **Grey strip at the top:** view the demo as a Student, Mentor, Admin, Parent or a shared Display screen. Tick **Event day** for the competition banner, or **Reset** the sample data and your saved choices (open groups, guide progress).
- **Apps button** (nine dots, top left) reaches every app. The navy bar names the app you are in; the row under it holds that app's tabs, and at most one button.
- **Your initials** (top right) open Account, where you pick Build or Competition mode and how you get notices.
- Home shows what matters to you today, then the apps. Under the apps, **Tools**, **Admin apps** (admins and mentors: Admin, Website editor) and **More** open and close; they start closed and the demo remembers your choice in this browser.
- **Get started** (top of Home) offers a few real first-week jobs for your role, one at a time. "Show me" opens the screen and rings the control to use. Replay it from Account with "Start the tour again".
- Hover over (or tab to) an icon, tab or status word for a short description of what it is.
- Gold is only ever the one main button on a screen.

## What's in it
| App | Try this |
|---|---|
| Tasks | Your next task, projects and subteams, a task panel, the timeline and the projector. The **Projector** (staff, and the Display role) switches between Practice (clock, countdown, who is working on what), Meeting (last practice's and today's tasks, with a note for today) and the Build plan. The **Timeline** shows only the days the team meets (from the Calendar); click a bar to open the task. Mentors, admins and Lead-mode students drag a bar (or use the arrow keys) to move a due date, with Undo. Division and project rows open and close (carets, or "Open all"). |
| Parts & Inventory | Request a part, order by vendor (mentors), check in arrivals, find spares by place. |
| Calendar | One app, three tabs. **Calendar**: agenda and month views; admins also get "Practice pattern and sync" (mentors cannot edit practice patterns). **Attendance**: door-code sign-in, hours, mentor plans. **Snacks**: snack sign-up. Each practice day on the agenda has two short lines that open Attendance and Snacks for that day. Parents see Calendar and Snacks; students see Calendar and Attendance. |
| Skills | Overview of what to do next, skill trees, sign-off requests, shop tool permissions. |
| Schedule, Pit, Scouting | Event roles, pit checklists and monitor, match scouting with stats and a pick list (Competition mode). |
| Tools | Seventeen small helpers on one page, found by group or by search, with the person's starred favourites first (see "FRC calculators" below). **Drawing to vector**: the sample drawing's traced outline, real size from two taps, SVG and DXF downloads (the demo only traces the sample). **Gear and sprocket finder**: sample gear or sprocket, or your photo with the teeth counted by hand, plus one caliper measurement; the size and pitch diameter are worked out for real, with doors into Parts. |
| Account | Profile, notifications, appearance, mode, the guided tour, sign-in. |

## Files
- `index.html` loads the fonts, the styles and the scripts. No build step.
- `css/base.css`: tokens, app bar, tab row, buttons, status, cards, lists, fields, overlays, Home, shop displays, and the few parts that more than one app uses.
- `css/<app>.css`: styles for one app.
- `js/core.js`: sample people, routes, the shell and shared helpers (`D.*`), the Apps / Tools / Admin apps / More groups and the saved choices. `js/<app>.js`: one app each.
- `js/tip.js`: the shared hover description (`data-tip`), the tab descriptions and the status-word glossary.
- `js/tools.js` and `css/tools.css`: the Tools page and the two photo tools.
- `js/frc.js`: the calculators' maths (motors, motion, flywheel, flight, belts). `js/calc.js` and `css/calc.css`: the page every calculator shares (`css/ground-tools.css`: its Ground up look). `js/tool-<name>.js`: one calculator each. `tests/`: Node checks for the maths.
- `js/guide.js` and `css/guide.css`: the Get started card, the stops for each role and the ring.

## Run it locally
Open `index.html` in a browser. Nothing to install.

## Notes
- The names, numbers and schedules are made up.
- Ideas come from [Gearbox](https://frcgearbox.com) by FRC Team 1648, reimplemented from scratch. No Gearbox code or content is copied.

## Design 8.3, a proposal (branch `design-8.3`, 2026-11-17)

The demo strip has **Live | Baseline | Ground up**. `?design=live`, `?design=b` or `?design=c` in the address does
the same, and the choice is kept in this browser. `?event=1` ticks Event day. Not approved, not in the real apps.

- **Live** is the apps as they are today (8.1.6). Nothing in it is changed.
- **Baseline** is the new look and the tighter layout. The owner chose this layout on 2026-11-17 ("I like B's layout.
  Make that the baseline improvement"). Same features, same data as Live, plus the calculators under Tools.
  Files: `css/look.css` (every rule under `:root[data-design]`), `css/ideal.css` and five places in the js files
  behind `D.ideal()`.
- **Ground up** is the Baseline plus the changes that come from asking what each app is for.
  **[GROUND_UP.md](GROUND_UP.md) is the reasoning** (the purpose, the people, each app's job, the rules);
  [GROUND_UP_BUILD.md](GROUND_UP_BUILD.md) is the brief the coders built from. Files: `css/ground.css` (shared pieces
  and Home), `css/ground-parts.css`, `css/ground-skills.css`, `css/ground-compete.css`, and code behind `D.ground()`.
- The first look-only version ("A": the new look on today's layouts) is still reachable with `?design=a`.

### What Ground up adds
| Where | What | Rule it follows |
|---|---|---|
| Home | The season line: practices left to kickoff, one mark per practice, milestones on the marks | Count in practices |
| Home | Now: one list, each item with its own action (Sign in, Approve, Sign off) | Settle it where it is listed |
| Home | Waiting on others: a student's own requests and sign-offs, and who has the next move | Whose move |
| Home | This week: the next seven days, with mentors, snacks and what is due | The moment first |
| Tasks | The next-task card says how many practices are left | Count in practices |
| Parts | "Find it or ask for it": one box that searches the shelves before it offers a request | Check the shelf before the store |
| Parts | The flow (Needs OK, To order, Ordered, Arrived) is the filter; every request says whose move it is | Whose move |
| Skills | A student's Overview opens with the machines they may use; "Finish what you started" comes first | The moment first |
| Schedule, Pit, Scouting | One line across all three: you now, next match, robot | Doors between apps |
| Tools | Fifteen calculators (also in Baseline), each with a drawing to scale; in Ground up they wear its look (`css/ground-tools.css`) | See "FRC calculators" below |

### The look (Baseline and Ground up)
- **Colour** is kept from design 8.2: flag black and white, arena grey, and the blue of the robot's bumpers as the one
  accent (the main button, today, links). The app bar is black.
- **Type** is new. The owner found 8.2's banner lettering (Big Shoulders) tall and wasteful of space. Both versions use
  one family, Archivo: normal width for text, 12% wider for headings. Headings are smaller than in Live (page title
  22 px, not 25.6 px) and still read as headings because they are wide and heavy. No page is taller than it is in Live.
- **Shape**: 8 px corners on things you press, 4 px on things that hold content.

### What the Baseline layout changes from Live
| Change | Where | Why |
|---|---|---|
| The app's tabs and its one button sit in the black bar (1024 px and wider) | every app with tabs | One row of chrome, not two: 48 px back on every screen. |
| A page is one white sheet; sections are divided by a line and a heading | every page | Fewer boxes. On a phone the text gets the 32 px the box edges used. |
| 14 px text, 40 px rows, 34 px buttons with a mouse; 44 px on a phone | every page | More rows on a laptop without making anything hard to tap. |
| Home is two columns: what needs you, then apps and activity | Home | Everything is on screen at 1280 x 800 without scrolling. |
| Apps are one-line rows (name, then what it is for) | Home | Four rows take 144 px; the tiles took a full row each. |
| "Waiting on you" rows do not repeat their number in a badge | Home | The sentence already starts with the number. |
| Requests are a table: part, vendor, quantity, cost, asked by, need by, priority, status | Parts | The facts line up, so a mentor reads down a column. Folds to two lines on a phone. |
| The next task is not listed a second time under its own card | Tasks, My tasks | It was on screen twice. |
| "Ready to start" and "In progress" sit side by side; rows do not repeat the heading as a status word | Skills, Overview | Both lists are visible at once. |
| "Coming up" is listed beside the month (1100 px and wider) | Calendar | The next events are visible without switching to Agenda. |

Measured on 61 desktop screens of the demo (1280 px wide): the look alone makes pages 1% shorter than Live in total
and none taller; the Baseline's are 11.6% shorter in total (11.8% before the calculators were added to the Tools
page). Ground up adds content, so its pages are 8.8% shorter than Live in total. Home for a mentor goes from 1,355 px to
950 px, the student's Skills overview from 1,763 px to 1,142 px.

### Checked, and not checked (2026-11-18)
- **Every screen draws.** 255 screens (every app, every tab, every calculator, five roles, event day; 1280, 820 and
  390 px) in each of Live, Baseline and Ground up: no JavaScript errors and no sideways scroll. Ground up in dark
  mode at 1280 px: 85 screens, none. (Run again on 2026-11-18 after the fourteen calculators replaced the nine.)
- **Live is unchanged.** The 61 desktop screens measured before the Ground up work are the same height after it.
  The coders for Skills, Competition and Parts also compared the page HTML of Live and Baseline before and after
  their changes: identical (Parts: 106 states).
- **Baseline changed in one place:** the Tools page lists the calculators.
- **The calculator maths.** `tests/` holds Node checks for the fifteen calculators and the shared maths (15 files):
  all pass. Nothing has been checked against a real robot.
- **One review per change set, by a different model than the coder.** The four coders were Opus 5.5; the lead
  (Fable 5.2) read each diff and looked at each screen. Home and the Tasks change were written by the lead and have
  had no second review.
- **Judged by other models.** Ground up went through 16 rounds of blind scoring by other models (`HILL_CLIMB.md`);
  the top tier's target of 9.5 in every area was not reached (latest: 8.2 to 8.9 with all three judges). Those
  rounds saw the nine calculators this branch had then. The fourteen were judged on their own branch, in the
  Baseline look, over 12 rounds; **in the Ground up look they have not been judged.**
- **Not checked:** a screen reader; a real phone; the guide's ring on every stop (the first stop for a mentor and a
  student was checked against the tabs in the bar).
- **Known simplifications:** Parts adds a vendor's shipping days as calendar days. Each calculator says what its
  model leaves out under "How this is worked out".
- Left as they are in Live: the Projector's task-state colours, the scouting field drawing, the tool drawings.
- Design 8.2 (Big Shoulders and Libre Franklin) is still on branch `design-8.2`; this branch starts from it and
  replaces its stylesheet.

## FRC calculators (2026-11-18): in the demo, not built in the real Tools service

The owner chose these fourteen (built on branch `tools-calcs`) over the nine simpler calculators that design 8.3 had
(2026-11-18). The nine's files are removed; some of their style rules (`.calc…` in `css/ground.css`) remain and are
unused. They show in Baseline and Ground up and not in Live. In Ground up, `css/ground-tools.css` gives the
Tools page and every calculator that look: rules in place of boxes, the answer in a bar, bumper blue as the first
chart colour, neutral paper in the drawings. It changes no number, word or control.

Fifteen calculators (fourteen until Units and code constants was split) join the two photo tools. The research, the reasons and the open decisions are in
`../new-apps/TOOLS_CALCULATORS.md`; the contract each calculator follows is `../new-apps/briefs/calcs/KIT.md`.

Every calculator has the same page: a drawing to scale that can play, one sentence that says whether the design works,
the answers, grouped inputs with sliders, charts with a readout, "How this is worked out", Copy link and Saved setups.
Typing never redraws the page, only the answers, charts and drawing.

| Group | Tools |
|---|---|
| Mechanisms | Shooter (one shot, rapid fire, every distance, while driving), Elevator, Arm, Drivetrain, Intake |
| Power transmission | Belt, chain and gear spacing; Gear ratio |
| Motors and power | Motors; Battery and breakers; Pneumatics |
| Structure | Tip-over; Tube strength |
| Reference | Holes and fasteners; Unit conversion; Code constants |
| From a photo | Drawing to vector; Gear and sprocket finder (unchanged) |

**After the owner's comments (2026-11-19, branch `tools-feedback`):**
- **Favourites.** Every tool has a star, beside its row on the Tools page and in its page head. The starred tools head
  the Tools page and are the short list under Apps and on Home. A person starts with six and changes them. (They
  replace the fixed "quick answers" links.)
- **Reference** is a group of its own, and Units and code constants is two tools, so there are fifteen calculators.
- **Saved setups.** On a calculator a person can keep its numbers under a name, open them again, download them as a
  small file, open such a file, and compare a saved setup with the page: its figures sit under the present ones and
  its chart lines are dotted grey (the Shooter and Tube strength draw it too). The demo keeps them in this browser;
  the real site would keep them with the account. Holes and Unit conversion have nothing to save; Drivetrain and
  Motors, which already set things side by side, save but do not compare.
- **Shooter, While driving** marks every driving speed that scores (a green patch at the speed arrow's scale), gives
  the fastest speed on the present heading, across, toward and backing away, and when a speed does not score says
  why and what would. **Battery and breakers** is one current bar and one voltage waterfall. **Tip-over** runs until
  the motion is over. **Intake** has an Over the bumper mode (one roller, the floor then the bumper) and opens on
  it. **Pneumatics** draws each stroke slowed and keeps its figures up. **Tube strength** keeps one bend scale at
  every load. **Motors** says what holds the torque level.

The Tools group under Apps and on Home lists a person's favourites and a link to all seventeen.

Run the maths checks: `for f in tests/*.test.js; do node "$f"; done`.

Nothing here has been checked against a real robot. The models and where they come from are in the header of
`js/frc.js` and under "How this is worked out" on each page.
