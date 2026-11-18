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
| Tools | **Drawing to vector**: the sample drawing's traced outline, real size from two taps, SVG and DXF downloads (the demo only traces the sample). **Gear and sprocket finder**: sample gear or sprocket, or your photo with the teeth counted by hand, plus one caliper measurement; the size and pitch diameter are worked out for real, with doors into Parts. |
| Account | Profile, notifications, appearance, mode, the guided tour, sign-in. |

## Files
- `index.html` loads the fonts, the styles and the scripts. No build step.
- `css/base.css`: tokens, app bar, tab row, buttons, status, cards, lists, fields, overlays, Home, shop displays, and the few parts that more than one app uses.
- `css/<app>.css`: styles for one app.
- `js/core.js`: sample people, routes, the shell and shared helpers (`D.*`), the Apps / Tools / Admin apps / More groups and the saved choices. `js/<app>.js`: one app each.
- `js/tip.js`: the shared hover description (`data-tip`), the tab descriptions and the status-word glossary.
- `js/tools.js` and `css/tools.css`: the Tools page and the two tools.
- `js/guide.js` and `css/guide.css`: the Get started card, the stops for each role and the ring.

## Run it locally
Open `index.html` in a browser. Nothing to install.

## Notes
- The names, numbers and schedules are made up.
- Ideas come from [Gearbox](https://frcgearbox.com) by FRC Team 1648, reimplemented from scratch. No Gearbox code or content is copied.

## Design 8.3, a proposal in two versions (branch `design-8.3`, 2026-11-17)

The demo strip has **Live | A Baseline | B Ideal**. `?design=live`, `?design=a` or `?design=b` in the address does the
same, and the choice is kept in this browser. Not approved, not in the real apps.

- **Live** is the apps as they are today (8.1.6). Nothing in it is changed.
- **A Baseline** is today's apps in a new look. Every layout, control, word and behaviour is the same as Live.
  One file: `css/look.css`, every rule under `:root[data-design]`.
- **B Ideal** is version A plus a tighter layout. Same features, same data. `css/ideal.css`, every rule under
  `:root[data-design="b"]`, and five places in the js files behind `D.ideal()`.

### The look (A and B)
- **Colour** is kept from design 8.2: flag black and white, arena grey, and the blue of the robot's bumpers as the one
  accent (the main button, today, links). The app bar is black.
- **Type** is new. The owner found 8.2's banner lettering (Big Shoulders) tall and wasteful of space. Both versions use
  one family, Archivo: normal width for text, 12% wider for headings. Headings are smaller than in Live (page title
  22 px, not 25.6 px) and still read as headings because they are wide and heavy. No page is taller than it is in Live.
- **Shape**: 8 px corners on things you press, 4 px on things that hold content.

### What version B changes
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

Measured on the 61 desktop screens of the demo (1280 px wide): version A's pages are 1% shorter than Live in total and
none is taller; version B's are 11.8% shorter in total and none is taller. Home for a mentor goes from 1,355 px to
950 px, the student's Skills overview from 1,763 px to 1,142 px.

### Checked, and not checked
- Checked by the designer: 183 screens (every app, every tab, five roles; 1280, 820 and 390 px) in each of the three
  versions, with no JavaScript errors and no sideways scroll. Dark mode looked at on Home and Parts only.
- Not reviewed by a second model. Not tested with a screen reader. The guide's ring was not re-tested against the
  tabs in the bar.
- Left as they are in Live: the Projector's task-state colours, the scouting field drawing, the tool drawings.
- Design 8.2 (Big Shoulders and Libre Franklin) is still on branch `design-8.2`; this branch starts from it and
  replaces its stylesheet.
