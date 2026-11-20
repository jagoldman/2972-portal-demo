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
     Approving here does exactly what the button in Parts does. A mentor's list also holds every task marked
     stuck, with who has it and what it waits on, so stuck work does not depend on someone reading a notice.
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
- **Ground up:** one line at the top of all three apps: **you now**, **next match**, **robot**. Each part is a door
  to the app that owns it. An app's own top card already gives its part, so the line leaves that part out: Schedule
  shows next match and robot, the Pit shows you now, and Scouting shows all three.

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

> **2026-11-18:** the owner chose the fourteen calculators of the separate calculators plan over the nine listed
> here. The rules below still hold; the table is the first plan, kept for the record. The fourteen are listed in
> `README.md` under "FRC calculators". The Tools group in the Apps menu and on Home now lists the six tools people
> open most and one link to all sixteen.

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

## 8. The owner's requests of 2026-11-19 (D215, brief `new-apps/briefs/r84/DEMO_84.md`)

Four things the owner asked for, drawn in Ground up only. Live and Baseline keep what they had.

### 8.1 Assigning people: three groups that open and close
> "have dropdown groups for task assignment with students the mentors then parents" … "I want the list to be dropdowns"

- **What:** "+ Someone" on a task's panel opens a small picker anchored to it (on a phone, a sheet from the bottom):
  a search ("Search people"), then **Students, Mentors, Parents**, in that order, each a row with its count and a
  chevron. Open, a row lists its people; a check marks the ones already on the task. Pressing a name puts the person
  on the task or takes them off, and the picker stays open so several can be picked.
- **Who sees it:** everyone who can open a task's panel (students, mentors, admins). A parent can be assigned: the
  real app allows any approved person.
- **Rules:** all three groups start closed, and the picker remembers which ones a person left open (a saved choice,
  like the Home groups). Typing opens every group with a match and hides the others; "No one matches …" when nothing
  does. Every group row is a real button with `aria-expanded`. Tab reaches the search, each row and each name;
  Escape, the close button or a click outside closes the picker (not the panel under it) and puts the focus back on
  "+ Someone". The same three groups, in the same order, are the New task form's "Who" (8.2) and the Assignee list
  under More filters, which keeps "Assigned to me" and "Unassigned" pinned on top.

### 8.2 New task: a button at the top of every list, and every level chosen
> "I also want a make new task button at the top of task list somewhere such, when they do that they should select
> each of the required higher levels."

- **What:** a "New task" button in the bar of every Tasks view that shows tasks (My tasks, This week, the Dashboard,
  Due dates, the Timeline, a project's grid, list and board, a subteam's list and board). On a phone it sits on the
  title row as a "+" (its name is still read out), so it is never behind the menu button. The side menu's "New task"
  stays and opens the same form.
- **Who sees it:** students, mentors and admins. Parents only read Tasks, so they do not get it.
- **The form:** what needs doing; then **Division, Project, Subteam**, in that order, each a labelled choice that is
  filled only from the one before and cannot be used until the one before is chosen ("Choose a division first");
  then Milestone (optional, "No milestone"), Due, and Who (the picker of 8.1, starting with the person themself).
  Where the person started fixes what it can: inside a subteam the form arrives with the division, project and
  subteam chosen, inside a project with the division and project; a "+ Add" in a grid cell or board column also
  brings its milestone or status. Every chosen level can still be changed, and changing one clears the ones under it.
- **Rules:** "Create" is never disabled. Until there is a title and all three levels are chosen, it does nothing but
  point at the first thing missing, in the order of the form: the focus goes there and a plain line under it says
  what to do ("Choose a project."). After Create, a task the view shows gets the focus and the toast says where it
  went; a task the view does not show gets a toast that names the place, with a link ("Open CAD").
- **One filled button:** the button is the view's filled button, except on My tasks when the next-task card already
  has one (its "Mark step done"): there it is a plain button.

### 8.3 Choosing a task opens its side panel, in place
> "i want a task selection to open up the side detail panel."

- **What:** in every view, pressing a task opens its panel at the side **in place**: the view behind stays where it
  was, scrolled where it was, and nothing goes to another page. The whole row (or card) is the target, not only the
  title; the controls inside a row (the done check, the pick box, "Move to…", "I'll take it") keep their own job.
- **Where:** My tasks (its rows and "Nobody has these yet"), the Dashboard, a subteam's or project's list, a board
  card, a grid card, a Due dates entry, This week, the Timeline, the Projector's rows, and Home (the next-task card
  and a mentor's "Stuck" rows, which used to go to Tasks first).
- **Rules:** one task open at a time; choosing another inside the panel (a subtask) swaps its content. Opening puts
  the focus on the panel's close button; the close button, the dimmed page and Escape close it and put the focus back
  on the row that opened it. On a phone the panel is a full-height sheet with its close button at the top. The title
  stays a real button, so the keyboard reaches every task with Tab and opens it with Enter.

### 8.4 Admin: join links and QR codes that carry a role
> "I want QR codes and links that have premade permissions like for parents, mentors, students. and links"

Decided by the owner: **a link fills in the role, and an admin still lets each person in with one press.** A
leaked or photographed code gives nobody access.

- **What:** the demo draws the Admin app in Ground up (`#admin`, `js/admin.js`, `css/ground-admin.css`), opened from
  the Admin tile like the other apps. Live and Baseline keep Admin as a link-out. Two tabs:
  - **Requests** (the one an admin opens most): the people waiting to be let in, oldest first. A request that came
    through a join link says so ("Asked with the Parents link, Fall open house") and its button names the role ("Let
    in as a parent"), with "Change role" (Student, Parent, Mentor) and "Turn down" beside it. A request without a link
    has "Choose a role" first. Letting in and turning down act at once, with Undo in the toast.
  - **Join links:** one row per link: the role (a mark and the word), the name the admin gave it, when it ends ("Ends
    Dec 19, 11 practices left"), how many people have used it, and On, Off or Ended. Actions: Show code, and Switch
    off or Switch on; an ended link offers "Make a new one like it". "New join link" (the tab's one filled button)
    asks who it is for (required), a name, and how long it lasts (7 days, 30 days chosen, or until the season ends).
  - **Show code** opens a sheet made to be shown or printed: a large QR code, "Join Team 2972 as a parent", the
    short address, Copy link, Print, and "This fills in the role. An admin still lets each person in." Printing prints
    only the code, the role, the address and that sentence. "See what a new person sees" opens the join page as a
    visitor sees it: the role in words and "Continue with Google", then "Thanks. An admin will let you in, usually by
    the next practice."
- **Who sees it:** admins only (the Admin tile's group).
- **Rules:** a mentor link looks no different, but its sheet (and the New join link form, and a mentor's request)
  says "Mentors can see students' information: share this link only with people you know." A switched-off or ended
  link's join page says the link no longer works and to ask for a new one. On the Requests tab only the first
  request's "Let in" is a filled button, so the screen keeps one; the others are plain buttons with the same words.
- **In the demo only:** the QR code is a drawn sample pattern (three corner squares and a field of modules), not a
  code a phone can read. The people asking to join are made up, from the families of the demo's made-up students.

### 8.5 "Needs snacks" opens the Snacks tab on that day
> "If i click on "needs snacks" on the homepage as a parent, i want the link to bring me to the snacks page and
> highlight + scroll to the snack date i had selected."

- **What:** every place that says a practice needs snacks is a door to the Snacks tab **on that date**: Home's
  "Snacks needed Thu, Nov 12" rows (the title; the Sign up button beside it still signs up in one press), the
  "Needs snacks" mark in Home's This week (its own small door inside the day's row; the rest of the row still opens
  the Calendar), a notice in the bell about a date that needs snacks, and the Calendar tab's "Needs snacks" (8.6).
- **On arrival:** the tab scrolls so that day's row sits in the upper third of the room below the app bar and the tab
  row, the row is marked (a blue tint and a bar at its left edge) that fades after about two seconds, and the focus
  is on its "I'll bring snacks" button (or on the row, when this family is already on it), so a screen reader lands
  there. With reduced motion there is no fade: the mark stays until the next press. A date further off than the
  tab's fourteen practices makes the list run to that date.
- **When the date no longer needs snacks:** the tab opens at the top with one line that takes the focus: "Thu, Nov 5
  is past. These are the practices coming up.", "Tue, Nov 10 has all its snacks now." or "There is no practice on …
  any more." (a cancelled practice).
- **Who sees it:** the people who have the Snacks tab: parents, mentors and admins. Students have no Snacks tab, so
  nothing of theirs leads there.
- **In the demo:** the bell's notice carries its date as data (`date`), so the real app's notices about a day need
  the same field.

### 8.6 The Calendar says "Needs snacks"
> "I also would like the calendar to show the "needs snacks" text for practice days without snacks."

- **What:** on the Calendar tab (Events), a practice or build day from today on that still has an open snack spot
  says so: on the month, "Needs snacks" (a dot and the words, in the warning colour) under the day's events; on the
  agenda and in a day's panel, the day's snack line becomes that state: "Needs snacks", or "Brooks family is bringing
  snacks, 1 more needed" when only some spots are taken. Days that are filled show what they showed before.
- **On a phone's month** the words do not fit a cell, so the day gets the snacks mark in a small warm circle, the
  cell's full width and 44 px tall, read out as "Thu, Nov 12 needs snacks. Open Snacks for this day", and the key
  under the month says what the mark means.
- **Pressing it** opens the Snacks tab on that day (8.5). On the agenda a parent's line keeps its Sign up button
  beside it, which still signs up in one press.
- **Who sees it:** parents, mentors and admins, who have the Snacks tab. Students do not.

### 8.7 Snacks in bulk: several practices in one go
> "There should also be instructions that say if parents bring bulk snacks, they can mark multiple consecutive days."

- **Before:** signing up for several practices took one "I'll bring snacks" press per day, with nothing saying it
  could be done for more than one.
- **What:** under "Coming practices" a plain line: "Bringing snacks in bulk? Sign up for one practice, then add the
  practices after it in one go." The one-press "I'll bring snacks" for a single day is unchanged. After that press,
  on this tab, the row offers "Bringing enough for more practices?": the next practices after it that still need
  snacks (up to four, by date, each with its time and who is already bringing some), each a tick box, then "Sign up
  for these" and "No thanks". The family ticks the ones they will cover and presses once.
- **Rules:** while the choice is open its "Sign up for these" is the screen's one filled button. Pressing it with
  nothing ticked does nothing but say "Tick the practices you will bring snacks to, or press No thanks." and put the
  focus on the first box. After it, the toast names the whole run ("Signed up for Nov 12, Nov 14 and Nov 17.") and
  its Undo takes off every day of the run, the first one included. The focus starts on the choice when it opens and
  returns to the first day's row when it closes. The ticks survive a redraw; leaving the tab, "No thanks" or
  cancelling the first day ends the offer. A sign-up from Home or the Calendar tab stays one press with no offer.
- **Who sees it:** whoever signs up for snacks: parents, mentors and admins.
- **Not decided:** whether a run should skip a practice that is already covered (the demo lists only the practices
  that still need snacks, so a run can step over a covered one), and whether four is the right number to offer.


### 8.8 "+ Task" in every milestone group
> "for students under milestones, in a list (like Intake→cad) there should be a +task button to add a new task in a
> milestone or in the unassigned milestone area"

- **What:** in a list grouped by milestone (a subteam's list, such as Engineering, Intake, CAD, and a project's List),
  each milestone's heading row and the "No milestone" group have a quiet "+ Task" button at the right (a thin
  outline, not filled). It opens the New task form (8.2) with the division, the project, the subteam (on a subteam's
  list) and that milestone, or "No milestone", already chosen; every one can still be changed. On a project's list
  the subteam is left to choose, since the group holds every subteam's tasks.
- **Who sees it:** everyone who may add a task: students, mentors and admins. Parents only read Tasks and do not get
  it. Grouped by status, priority, due date or subteam, the groups have no "+ Task".
- **Rules:** it is a plain button the keyboard reaches with Tab; its name says where the task goes ("Add a task to
  CAD, Prototype intaking"). On a phone it is 44 px tall. The title field has the focus when the form opens.

### 8.9 Tools under Apps: favourites, or three picked once
> "make sure that tools when selected from the menu doesnt enter a page. it should dopdown and show favorites or 3
> randomly selected tools. and show "see all tools" that can then open to a new page." … "random once. unless favorite."

- **What:** pressing Tools in the Apps menu opens it in place (it already did): the person's favourite tools, or,
  when they have starred none, **three tools picked at random**, with the line "Three to try. Star a tool on the Tools
  page to keep your own here." The last link is **"See all tools"**, which opens the Tools page. Home's Tools group
  shows the same list and the same last link.
- **Picked once:** the three are picked the first time they are needed and kept for that person (a saved choice;
  the real app keeps it with the account), so the menu is the same on every visit. Starring a tool replaces them with
  the favourites; taking every star off brings the same three back. The three are always at least one calculator
  and one photo tool (Drawing to vector or Gear and sprocket finder): one of each, then one more calculator.
- **The six starters are gone in Ground up:** nobody starts with favourites any more, so the Tools page's
  favourites line reads "None yet. Press the star beside a tool to keep it here, under Apps and on Home. Until then,
  those show three tools picked for you." The data keeps `top: true` on six tools, because Live and Baseline still
  start everyone with those six and still say "All 17 tools".
