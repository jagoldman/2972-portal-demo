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

## Design 8.2, a proposal (branch `design-8.2`, 2026-11-16)

A second look for every app, made on the user's request to move away from the generated style: flag black and white,
arena grey, the blue of the robot's bumpers as the one accent, banner lettering (Big Shoulders) for titles and big
numbers, Libre Franklin for text, square panels and padded controls. It matches the public-site proposal in
`../public-redesign-demo/v8.2/` (its README has the reasons).

- **Compare the two:** the demo strip has **Design 8.1 | Design 8.2**. `?design=8.1` or `?design=8.2` in the address
  does the same. The choice is kept in this browser.
- **One file:** `css/design82.css`, loaded last. Every rule is under `:root[data-design="8.2"]`; no other stylesheet
  is changed, and with the switch on 8.1 every screen is as it was. `js/core.js` gained only the switch; `index.html`
  gained the two fonts and the stylesheet.
- **Same rules as before, one colour swapped:** bumper blue is used where gold was (the one main button, the active
  tab, today) and where the link blue was. Layouts, words and behaviour are untouched.
- **Not approved, not in the real apps, not reviewed by a second model.** Checked by the designer in screenshots:
  19 screens, light and dark, 1280 px and 390 px, no JavaScript errors and no sideways scroll.
- **Left for a second pass:** the Projector's own colours for task states, the scouting field drawing, the tool
  drawings, and each app's finer spacing still use 8.1 values.
