# 2972 Team Portal Demo (simple UI)

A clickable prototype of the apps planned for 2972robotics.com, the site of FRC Team 2972 (Gears & Buccaneers). It is the design source for the real apps: change it here first, then build it. `REDESIGN.md` is the brief this version follows. Component ideas from outside live in [../infra/docs/UI_LIBRARIES.md](../infra/docs/UI_LIBRARIES.md). This demo stays plain HTML/CSS/JS, so an idea from that list is rebuilt in CSS here before an app gets it.

Everything is sample data. Nothing is saved, and a reload resets it.

## How to use it
- **Grey strip at the top:** view the demo as a Student, Mentor, Admin, Parent or a shared Display screen. Tick **Event day** for the competition banner, or **Reset** the sample data.
- **Apps button** (nine dots, top left) reaches every app. The navy bar names the app you are in; the row under it holds that app's tabs, and at most one button.
- **Your initials** (top right) open Account, where you pick Build or Competition mode and how you get notices.
- Home shows what matters to you today, then the apps. Gold is only ever the one main button on a screen.

## What's in it
| App | Try this |
|---|---|
| Tasks | Your next task, projects and subteams, a task panel, the timeline and the projector. |
| Parts & Inventory | Request a part, order by vendor (mentors), check in arrivals, find spares by place. |
| Calendar | One app, three tabs. **Calendar**: agenda and month views; admins also get "Practice pattern and sync" (mentors cannot edit practice patterns). **Attendance**: door-code sign-in, hours, mentor plans. **Snacks**: snack sign-up. Each practice day on the agenda has two short lines that open Attendance and Snacks for that day. Parents see Calendar and Snacks; students see Calendar and Attendance. |
| Skills | Overview of what to do next, skill trees, sign-off requests, shop tool permissions. |
| Schedule, Pit, Scouting | Event roles, pit checklists and monitor, match scouting with stats and a pick list (Competition mode). |
| Account | Profile, notifications, appearance, mode, sign-in. |

## Files
- `index.html` loads the fonts, the styles and the scripts. No build step.
- `css/base.css`: tokens, app bar, tab row, buttons, status, cards, lists, fields, overlays, Home, shop displays, and the few parts that more than one app uses.
- `css/<app>.css`: styles for one app.
- `js/core.js`: sample people, routes, the shell and shared helpers (`D.*`). `js/<app>.js`: one app each.

## Run it locally
Open `index.html` in a browser. Nothing to install.

## Notes
- The names, numbers and schedules are made up.
- Ideas come from [Gearbox](https://frcgearbox.com) by FRC Team 1648, reimplemented from scratch. No Gearbox code or content is copied.
