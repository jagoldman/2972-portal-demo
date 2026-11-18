# Hill climb on the Ground up version

Blind judges from other models score 16 areas from 47 screenshots (1280 px and 390 px). The lead fixes between rounds.
Every judge in a tier must score every area at the tier's target. Fixes are made only in Ground up
(`D.ground()`, `:root[data-design="c"]`), so the Baseline stays as the owner approved it.

| Round | Tier | Judges that counted | Lowest to highest | Result |
|---|---|---|---|---|
| 1 | 1 (7.5) | Haiku, GPT-6 Luna | 7.0 to 8.7 | 10 of 16 areas under 7.5 |
| 2 | 1 (7.5) | Haiku, GPT-6 Luna | 7.5 to 8.5 | passed |
| 3 | 2 (8.5) | Sonnet, GPT-6.1 Terra, Grok 4.6 | 6.7 to 8.7 | 16 of 16 areas under 8.5 from at least one judge |
| 4 | 2 (8.5) | Sonnet, GPT-6.1 Terra, Grok 4.6 | 7.0 to 8.8 | 16 of 16 areas under 8.5 from at least one judge; lowest per area 7.0 to 8.3 |
| 5 | 2 (8.5) | Sonnet, GPT-6.1 Terra, Grok 4.6 | 7.3 to 8.8 | 16 of 16 areas under 8.5 from at least one judge; lowest per area 7.3 to 8.4 |
| 6 | 3 (9.5) | Opus, GPT-6.1 Sol, Grok 4.7 (all three passed the proof) | 7.6 to 9.0 | 16 of 16 areas under 9.5; lowest per area 7.6 to 8.6 |
| 7 | 3 (9.5) | Opus, GPT-6.1 Sol, Grok 4.7 | 8.0 to 9.2 | 16 of 16 areas under 9.5; Opus 8.0 to 8.8, Sol 8.0 to 9.1, Grok 4.7 8.1 to 9.2; lowest per area 8.0 to 8.8 |
| 8 | 3 (9.5) | Opus, GPT-6.1 Sol, Grok 4.7 | with the judges | |

Grok 4.5 was thrown out in rounds 1 and 2: asked to copy exact text from three screenshots, it invented it.
Grok 4.6 copied the text correctly in round 3 and counts.

## Round 3 fixes for coders (binding; the common rules of GROUND_UP_BUILD.md apply)

Everything shows only when `D.ground()` is true. Live and Baseline must draw exactly as now. No git commands.
Check with the sweep in GROUND_UP_BUILD.md and look at your own screenshots at 1280 and 390 px before reporting.
The lead is editing `js/core.js`, `js/compete.js`, `js/calendar.js`, `js/tasks.js`, `css/ground.css` and
`css/ground-compete.css` at the same time; do not touch them.

### Coder P2: `js/parts.js`, `css/ground-parts.css`

1. **Group the requests list by step, and say whose move once.** In the Ground up table (`.ptable.gt`), put the rows
   in the order of the flow (Needs OK, To order, Ordered, Arrived), each group under one heading row that carries the
   step's name, its count, and whose move it is, said once: for a mentor or admin "Needs OK, your move" and "To
   order, your move"; for a student "Needs OK, waiting on a mentor" and "To order, waiting on a mentor to order";
   "Ordered" and "Arrived" need no move text. Inside a group keep today's urgency order. Rows in Needs OK and To
   order then drop their own move line. Rows in Ordered keep "Arrives about <date>"; rows in Arrived keep "Ready to
   put away". With one step chosen in the filter there is one group. Judges said the same move text nine times
   diluted it.
2. **"Your move" is not a link.** It must not look like one: no blue. Use the text colour and weight 650. (The
   shared `.move.mine` style in `css/ground.css` is the lead's; override it inside `.ptable.gt` and `.preqsteps`
   only, in your css.)
3. **The tab count and the filter count must agree.** The "To order" tab shows 6 while the "To order" step shows 5,
   because the tab adds the one that needs an OK. In Ground up show them apart in the tab: the plain count is the
   requests to order, and the amber count reads "1 to OK" (`D.tabsFor` takes `[id, name, count, warnCount]`; the
   warn count may be a short string).
4. **The request panel: steps.** Mark as "now" the step the request has reached (the same word as its status), not
   the step it is waiting for: status Ordered means Asked and Approved are done and "Ordered" is now; "Arrives about
   <date>" stays under "Arrived". Take out the lead's `NOW` renaming (Needs OK, To order, Arriving, To put away).
   Rename "OK'd" to "Approved" and "No OK needed" to "No approval needed". A request that is put away shows all five
   done. Give the order number a label ("Order #4471" on its own line is fine).
5. **The request panel: actions come right after the steps.** In Ground up the row of actions (Approve, Deny,
   Replace item; or "Check it in on Arriving"; or "Withdraw my request") sits directly under the steps and the
   whose-move line, before the quote and the list of facts. On a phone the main button is full width and the
   others share the row under it.
6. **To order tab, "Needs your OK" block.** `budgetEffect()` now returns two lines in Ground up (the lead's change
   for the panel). In this block it broke the line: there is a line break and a dangling " · ". Give
   `budgetEffect` a second argument so only the panel gets two lines; in this block write it on one line with a
   comma ("Mechanisms: $1,838.52 left, $1,438.54 after this") and no dangling separator. Bring the priority and the
   Approve and Deny buttons next to the text (not at the far right edge of a wide screen).
7. **To order tab, vendor headings.** The order cutoff is the fact that matters on the day. Show it first and in
   the text colour at weight 650; the other facts (tax, payment, the link) follow in the muted line. Make the
   free-shipping bar a fixed short width (about 240 px) beside its sentence, not the full width of the page.
8. **Find it or ask for it.** When the shop has the part, "Take" is the one filled button and "Request more" is
   plain. While a search is active, the heading over the matching requests reads "Already requested". The hint
   "Try a shorter name or the part number." is normal text size, not small grey.
9. **Phone rows.** Separate the facts in a folded row with commas (CSS `::after` on all but the last), so "Qty 4 ×
   pack of 2 $19.96 Sam Ortiz" does not run together.
10. **Phone tab row.** Nothing to do; the lead owns it.

Shoot: Requests as student and mentor (1280, 390), a search for "bearing" and "gizmo", the panel for a request that
needs an OK (mentor, 390 and 1280), one that is ordered (student), one put away, and the To order tab (1280, 390).

### Coder S2: `js/skills.js`, `css/ground-skills.css`, `js/account.js`, `js/calcs.js`, `css/calcs.css`

Skills
1. **Group sign-off list.** A student who is already signed off, or whose skill is not open yet, cannot be picked,
   but their row has the same empty tick box as a student who can. In Ground up show a tick box only on rows that
   can be picked. Signed-off rows show the green "Signed off"; not-open rows show a grey "Not open yet". If nobody
   can be picked, say so in one plain sentence above the button.
2. **"Not yet"** beside "Sign off" does not say what it does. In Ground up label it "Send back" and add one muted
   line under the list heading: "Send back tells the student what to practise first."  (Keep the action as it is.)
3. **Heading.** "Machines you can use" lists machines the student may not use yet. Rename it "Your machines".
4. **Machine rows are doors and must look like it.** Add the same small chevron (`<span class="chev"
   aria-hidden="true">›</span>`) the other door rows have, at the right of each machine row.
5. **Students table.** In Ground up the column headings are the trees' full names (they may wrap to two lines), not
   the two-letter codes. On a phone each row is at least 44 px tall.
6. **Skill trees list on a phone.** The progress bar is hidden on a phone, leaving a bare percentage. Keep a short
   bar (about 64 px) in each row.
7. **Permissions, one student on a phone.** The line under each machine repeats "Not started. May not use this
   machine alone." five times. Show a line only when it adds something: cleared rows say who signed off and when;
   in-training rows say "Started. May not use it alone yet."; not-started rows have no line.

Account
8. **Notification summaries.** In Ground up `appSummary()` now returns "Bell only for some, bell and email for
   others", which repeats on seven rows and says little. Return a short, specific summary: the common choice when
   every kind is the same ("Bell only", "Bell and email"); otherwise count, for example "Email for 2 of 5" or
   "Discord for 1, email for 2 of 5". Keep "Mixed" in Live and Baseline.

Calculators
9. **Drivetrain.** With the default inputs "Speed after 15 ft" equals "Free speed" (15.5 ft/s), so the second row
   teaches nothing, and "Grip" has no explanation. When the speed reached is within 0.05 ft/s of the free speed,
   that row reads "Free speed reached" with the distance at which it was reached (for example "after 6.2 ft").
   Rename the last row's value to "Grip holds" or "Wheels slip".
10. **The answer stays in view.** On a wide screen, the results column of every calculator sticks to the top of the
    window (under the app bar, `top: calc(var(--bar) + 12px)`) while the inputs scroll.
11. **Drawing and chart text on a phone** is too small. At 640 px and narrower, set the text in `.calcdraw` and
    `.calcchart` to 16 units (the view box is 400 wide), and check that labels still do not collide.

Shoot: the Skills overview (student, 1280 and 390), Sign off (mentor, 1280), Permissions with "pri" typed (mentor,
390), Account (student, 390), and the drivetrain, belt and gearbox calculators (1280 and 390).

**Tier 2 did not pass.** Over rounds 3, 4 and 5 the lowest score per area went 6.7 to 8.0, then 7.0 to 8.3, then
7.3 to 8.4: a slow rise, with each fresh judge finding new small things and no area reaching 8.5 from all three. The
owner's rule is to move up after about three rounds without a pass, so round 6 goes to tier 3. Two of the round 5
drops (Tools, To order) were faults the lead introduced in round 4 and fixed before round 6.

## What the lead settled when judges disagreed across rounds
- **Late tasks.** Round 1 asked for a red dot and a word; round 4 said lateness then reads as a second status. Late
  is plain red text with no dot.
- **Request panel steps.** Round 3 asked for "now" to be the step the request has reached; round 4 asked for the step
  it waits for. It stays the step reached, and the line under the steps says what happens next and who does it.
- **Rarely used Parts filters.** Round 1 asked for one shape of control; round 3 asked for a "More" menu. They stay
  plain buttons after a divider, and a filter with nothing in it is greyed.
- **"Done" and "Sign in" on Home.** Round 2 asked for one filled button; round 3 asked for "Done" to match Tasks.
  Sign in is a tinted first step with its own filled button, and the task's button stays filled.
- **A parent's next practice.** Round 1 wanted it as the first row of Now; round 3 said it was then on the page
  twice. The week leads the parent's page, and "Can you help?" holds only what they can do.
- **Request panel steps, again.** Round 5 showed the round 3 choice still read as two different "now"s. Final form:
  a finished step is named in the past with who and when ("Ordered, Ms. Rivera, Nov 6"); the step being waited for is
  marked "now" and named as the thing to come ("Order"); the sentence above the steps says who it waits on.
- **Snacks in a parent's week.** Round 3 said "Needs snacks" in the week repeated the sign-up rows; round 6 said a
  parent then had to look elsewhere to learn if a day was covered. The week shows the amber "Needs snacks" again,
  and the sign-up rows sit beside it ("Can you help?").
- **Centre distances.** Rounds 3 and 5 asked for two decimals in the calculator's answer; round 6 said the answer
  and the table then disagreed. Everything shows three decimals of an inch, which is how the distance is machined.
- **"Sign in" and "Mark task done" on Home, final.** Rounds 2, 5 and 6 asked for one filled button until the
  student has signed in; rounds 3 and 4 asked for the task's button to match Tasks. Until sign-in, Sign in is filled
  and the task's button is outlined; after it, the task's button is filled. The judges' brief now says so.
- **Phone filters in Parts.** Round 6 said a sliding row hid steps; round 7 said two rows of chips were heavy. The
  four steps wrap and the rarely used views sit behind "More".
- **"Practice today" on a mentor's Home.** One judge wanted it first as the day's anchor; two wanted the things only
  the mentor can do first. It is the last row of Now.
- **The same notification setting on every app.** Round 5 asked for a summary on each row; round 7 said seven equal
  summaries were noise. A shared setting is said once above the list; rows show a summary only when they differ.
