# Ground up: what the apps are for, and what each one must do

Written by the lead on 2026-11-17 for the owner, who asked: "distil the ideas and goals of each app and the purpose of
this whole thing. Start from the ground up." It is the brief for the third version in the demo strip, **Ground up**.
It is a proposal. Nothing here is approved, and nothing here is in the real apps.

Sources: `MASTER_PLAN.md`, `new-apps/PLATFORM.md` and the app plans beside it, `REDESIGN.md`, and a look at all 183
screens of the demo. Where this page states a goal that no plan states in these words, it says "my reading".

## 1. The purpose, in one paragraph

A high-school robotics team has about forty people, a shop, one robot and a fixed date. The site exists so that
**every person on the team can answer "what should I do now?" in a few seconds, and every piece of work shows whose
move it is.** Students run the work. Mentors keep it safe, unblock it and pay for it. Parents feed the team and need
to know when and where. Everything else the site does (accounts, a public website, notices) supports that.

My reading of what "good" means for this team, in order:

1. **Nobody stands in the shop without something to do.** A student who arrives finds their next task in one tap.
2. **Nothing waits silently.** A part request, a skill sign-off or a blocked task always names the person it waits on.
3. **Mentor time goes to mentoring.** Approvals, sign-offs and orders arrive as one short list, and each can be
   settled where it is listed.
4. **The robot is ready on the date.** The plan is counted in practices, because practices are the only time work
   happens.
5. **Safety is a hard gate.** Whether a student may use a machine has one answer, and a mentor can find it in two
   seconds.
6. **Credit is visible.** Who did each thing is shown to the whole team (the plans call this "attribution by default").

## 2. Three facts the design should start from

**Fact 1: the team's unit of time is the practice.** The team meets two to four times a week for two and a half
hours. A task due "Saturday" matters less than a task with "2 practices left". The shop Projector already counts this
way ("Kickoff, 60 days, 13 practices before it"). The other screens count in calendar dates only.

**Fact 2: the apps are split by who owns the data; people's days are split by moments.** There are five services
because there are five kinds of data (tasks, calendar, parts, skills, competition). A person does not think "I will
now use the Calendar service". They arrive at practice, work, get stuck, and leave. Home is the only screen that can
be organised by the moment, so Home carries the most weight. The apps stay separate (PLATFORM U11); what joins them
is short links from one to the next, which the owner calls doors.

**Fact 3: work crosses the apps as a chain, and each link has an owner.**

```
task ──needs a part──▶ request ─▶ mentor OK ─▶ order ─▶ arrives ─▶ put away ─▶ task can go on
task ──needs a machine──▶ skill ─▶ student asks ─▶ mentor signs off ─▶ student may use the machine
practice ──needs adults──▶ mentor says "coming"        practice ──needs food──▶ a family signs up
```

At every arrow, one person has the next move. The apps already store that. They show it in some places (the
Projector's "Blocked: waits on the part MAXSpline shaft") and leave it out in most.

## 3. Who uses it, and the moment they are in

| Moment | Who | Device | The question | Answered today |
|---|---|---|---|---|
| Arriving at practice | student | phone, standing | Am I signed in? What do I work on? | Home, in two cards |
| Working | student | phone, hands busy | Am I allowed on this machine? Do we have this part? I am stuck. | Skills (3 taps), Parts (2 tabs), Tasks |
| Running practice | mentor | phone, walking | Who is here? What is stuck? What waits on me? | Home lists it; each item is settled in another app |
| The evening after | mentor, admin | laptop | Are we on track? What do I order? Who is coming Thursday? | Tasks, Parts, Calendar, one at a time |
| Any day | parent | phone | When is the next practice or event? When do I bring snacks? | Home and Calendar |
| At an event | everyone | phone, loud pit | What is my job now? When is our next match? Is the robot ready? | Three apps, each with a part of the answer |
| All day | shop screen | TV, nobody touches it | The door code; who works on what; time left | Door QR, Projector, Pit monitor |

## 4. Each app: its job, its first screen, and what changes

For each app: the job in one sentence, the questions its first screen must answer, what already works, what gets in
the way, and what the Ground up version does. "Kept" means the Baseline version is already right.

### Home
- **Job:** tell this person what to do now, then get out of the way.
- **Must answer:** What needs me? What is today? How long until the date?
- **Works today:** "Waiting on you", "Today", the next-task card with Done and I'm stuck.
- **In the way:** a mentor must open another app to approve a part or sign off a skill that Home already lists. A
  student cannot see what they are waiting for. Nothing on Home says how far away kickoff or the event is. The week
  ahead is in another app.
- **Ground up:**
  1. **The season line.** One thin line under the greeting: where the team is in its year, the next date that
     matters, and the count in days and practices. It is the one bold element in this version; everything else on
     the page is quiet.
  2. **Now.** One list, most urgent first. Each item carries its own action: Sign in, Done, Approve, Sign off.
     Approving here does exactly what the button in Parts does.
  3. **Waiting on others.** For a student: each open request of theirs and who has the next move.
  4. **This week.** The next seven days as a strip: practice times, how many mentors are coming, whether snacks are
     covered, what is due. Each day is a door to the Calendar.
  5. Apps stay a short list of doors.

### Tasks
- **Job:** every student knows their next piece of work; leads and mentors see whether the robot will be ready.
- **Must answer:** (student) What is my next task and what stops me? (lead) What is late, blocked or unowned?
- **Works today:** "Your next task" with Done, I'm stuck and Request a part. The Projector. The Timeline drawn in
  practice days. Lead mode.
- **In the way:** due dates are calendar dates, so "due Sat, Nov 14" hides that only two practices are left.
- **Ground up:** due dates in the next-task card and in My tasks also say how many practices are left. Nothing else
  changes; this app has had the most rounds with the owner and the pilot is using it.

### Calendar (calendar, attendance, snacks)
- **Job:** say when the team meets and who will be there, and record who was.
- **Must answer:** When is the next practice? Who is coming? Am I signed in?
- **Works today:** the Agenda with its two doors per practice day (attendance, snacks). Door-code sign-in. The
  mentor "My days" plan.
- **In the way:** on a laptop the month hid the next events (fixed in Baseline with "Coming up").
- **Ground up:** kept. Home's "This week" strip is built from this app's data and opens it.

### Parts & Inventory
- **Job:** get the right part into a student's hand by the practice it is needed, inside the budget, and know where
  every spare is.
- **Must answer:** (student) Do we already have it? Where is the one I asked for? (mentor) What needs my OK, what do
  I order today, what has arrived?
- **Works today:** the flow itself (asked, OK'd, ordered, arrived, put away), ordering by vendor with the
  free-shipping line, check-in with counts, "Order by" dates.
- **In the way:** a student who needs a part must choose between two tabs (Inventory, Requests) before knowing
  which one holds the answer. The stages of the flow are a dropdown. A request shows a status word but not whose
  move it is.
- **Ground up:**
  1. **Find it or ask for it.** One box at the top of Requests. Typing shows what the shop already has (where, how
     many, Take) above the matching requests. If nothing matches, the one button is "Request it", with the name
     filled in. This stops the team buying what is on the shelf.
  2. **The flow is the filter.** Needs OK, To order, Ordered, Arrived as a row of steps with counts.
  3. **Whose move.** Each request says who it waits on. The request panel opens with the steps, who did each, and
     when.

### Skills
- **Job:** students learn in an order that makes sense, and nobody uses a machine before a mentor has seen them do
  it safely.
- **Must answer:** (student) What may I use? What do I finish next? (mentor) Who asked me to sign off? May this
  student use this machine?
- **Works today:** trees that unlock, sign-off requests, group sign-off, the machine table.
- **In the way:** a student's own machine permissions are on the third tab, in a table of everyone. "Ready to
  start" is listed above "In progress", which invites starting a fifth skill before finishing the first four.
- **Ground up:**
  1. **Machines you can use** opens the student's Overview: cleared, in training, not yet, each a door to the skill
     that comes next.
  2. **Finish what you started** comes before "Ready to start".
  3. A waiting sign-off says it waits on a mentor, and since when.
  4. The machine table can be narrowed to one student by name.

### Competition (Schedule, Pit, Scouting)
- **Job:** at an event, each person knows their job this minute, and the robot goes to every match checked.
- **Must answer:** What am I doing now and next? When is our next match? Is the robot ready?
- **Works today:** each app's top card answers its own part well. The scouting form works with one thumb. The pit
  checklist has big targets.
- **In the way:** the three answers are in three apps. A scout does not see the next match time; the pit crew does
  not see who is on shift next.
- **Ground up:** one line at the top of all three apps, the same in each: **you now**, **next match**, **robot**.
  Each part is a door to the app that owns it.

### Account
- **Job:** hold a person's own settings. **Kept.**

### Tools
- **Job:** small helpers that work in the browser, save nothing, and hand off to another app when there is a next
  step (the Gear finder already ends at Parts).
- **Works today:** Drawing to vector, Gear and sprocket finder.
- **Ground up:** the owner is adding **interactive FRC calculators** to the plan. See §6.

### Shop screens (Door QR, Projector, Pit monitor)
- **Job:** answer one question for the whole room without being touched. **Kept.** The Projector's practice view is
  the best screen in the suite and is the model for this brief: it is built around a moment, counts in practices,
  and names who has each task.

## 5. Rules the Ground up version follows

1. **The moment first.** A first screen answers the question of the person who just arrived at it. Lists and
   settings come after.
2. **Whose move.** Anything that waits names the person or role it waits on.
3. **Settle it where it is listed.** If a list shows a thing that needs one decision, the decision is on the row.
   The action is the same one its own app has; it is not a second way of doing it.
4. **Count in practices** beside the date, wherever a date is a deadline.
5. **Doors between apps.** Where a chain crosses from one app to another, there is one plain link at that point.
6. **Check the shelf before the store.** Anything that leads to buying shows what the shop already has first.
7. **One bold thing.** In this version it is the season line on Home. No other new decoration.

Rules kept from `REDESIGN.md`: one main action per screen, words before decoration, phone first, say what to do.
Rules kept from the owner: menus are short lists of doors; no tall lettering.

## 6. Tools: interactive calculators

**Why the team needs its own, when good public ones exist** (my reading): the answer can end in a door. A belt
length can be looked up in the team's own stock. A motor list can be the motors the team owns. And a setup can be
passed to a teammate as a link.

Rules for every calculator:
- It works in the browser and saves nothing (the Tools rule). The inputs are kept in the page address, so
  **Copy link** gives a teammate the same setup.
- Results change as you type. There is no Calculate button.
- Units are shown on every field and can be switched between inch and metric where both are used in the shop.
- Each one has a short **How this is worked out** section with the formula in words. Students should be able to
  check the tool by hand.
- Where a result is a part (a belt, a chain, a sprocket), there is a door to Parts with the search filled in.
- Motor figures are the makers' published ones (free speed, stall torque, stall current, free current at 12 V).
  The page says so. Real mechanisms lose more than the maths says; each page says that once.

| Calculator | A student asks | Inputs | Results |
|---|---|---|---|
| Gearbox | "What ratio do I have, and how fast and strong is the output?" | motor, how many, up to four stages of teeth, efficiency | overall ratio, output free speed, output stall torque, a chart of torque and current against speed |
| Drivetrain | "How fast will the robot be, and how soon does it get there?" | motor, how many, ratio, wheel size, robot weight, current limit | free speed, likely top speed, time to cover a chosen distance, a chart of speed against time |
| Belt | "Which belt fits, and how far apart do the pulleys go?" | belt type (3 mm, 5 mm), teeth on each pulley, the distance wanted | the nearest belts with the exact centre distance for each, a to-scale drawing |
| Chain | the same for chain | chain size (#25, #35), teeth on each sprocket, the distance wanted | links needed (even), exact centre distance, a to-scale drawing |
| Arm | "Can this motor hold the arm up, and how hot will it run?" | motor, how many, ratio, arm weight, distance to its centre, current limit | torque needed when level, current to hold, how much is in reserve, time for a quarter turn |
| Elevator | "Will it lift, and how fast?" | motor, how many, ratio, spool size, load, travel | speed with the load, time for the travel, current to hold, the load that stalls it |
| Flywheel | "How fast does the wheel's edge move?" | motor, ratio, wheel size | wheel speed, edge speed, a rough exit speed |
| Drill and tap chart | "What drill for a 10-32 tap?" | a search box | tap drill, close and free clearance drills, in inch and metric sizes |
| Motors | "Which motor?" | pick two | the published figures side by side and their curves |

The Tools page groups them: **From a photo** (the two tools that exist) and **Calculators**. The Apps menu and
Home keep one door, "Tools", and do not list calculators one by one.

## 7. What this version does not do

- It adds no app and no service (D137), and no new data: every number it shows is already in the sample data.
- It does not change Tasks beyond the practice count, or Calendar, Account and the shop screens at all.
- The calculators are new function. They are in the demo for the owner to try; building them in the real Tools
  service is a separate decision.
- Home's inline Approve and Sign off would need two new calls between services in the real build (Home is served
  by `landing`, which today only reads). That cost is real and is the main thing to decide before adopting Home.
