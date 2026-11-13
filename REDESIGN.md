# Redesign brief: simple and usable (branch `simple-ui`)

The lead wrote this brief on 2026-11-10 from the user's request: redo the design of every app,
for usability and simplicity, mostly look and feel, with little change to what the apps do.
The Kickoff app was removed from the suite on 2026-11-10.

This prototype is the design source for the real apps (change the demo first, then build it). So every change
here must be something a Next.js/Tailwind app can copy: tokens, a small set of shared parts, and clear screens.

## Who uses this, day to day

| Person | Device | What they do most days |
|---|---|---|
| Student | Phone, standing in the shop | Sign in at the door. See the next task. Mark it done or stuck. Request a part. Check a skill. |
| Mentor | Phone in the shop, laptop at home | See what waits on them (part approvals, skill sign-offs). Order parts. Check who is here. Plan the week. |
| Parent | Phone | See the next practice or event. Sign up for snacks. |
| Admin | Laptop | The mentor list, plus accounts and settings. |
| Shop screen | TV | Door code, projector, pit monitor. Nobody touches it. |
| Everyone at an event | Phone, in a loud pit | My shift now. Pit checklist. Scout a match with one thumb. |

## Five rules

1. **One main action per screen.** Only that button is gold. Everything else is a plain or text button.
2. **Words, not decoration.** A status is a small coloured dot and a word. No filled badges, no outlines, no
   upper-case labels except short group headings.
3. **Little chrome.** One navy bar, then a thin row of tabs. No page title band, no host names, no repeated titles.
4. **Phone first.** One column, 44 px touch targets, the main action reachable with a thumb, no sideways scroll
   except tables and the tab row.
5. **Say what to do, not how it works.** No host names, service names, "Authentik", "signed code", or notes about
   the build. At most one short helper line per card. Sentence case.

## Tokens (replace the values, keep the variable names)

Light:
`--bg #f7f8fa; --surface #ffffff; --surface-2 #f1f3f6; --surface-3 #e5e8ee; --line rgba(11,18,36,.10);
--line-2 rgba(11,18,36,.22); --text #0b1224; --text-2 #343d52; --mute #5b6478;
--gold #e8b931; --gold-2 #f2c94f; --on-gold #07090f;
--accent #2148a8; --tint rgba(33,72,168,.07); --tint-2 rgba(33,72,168,.13);
--ok #1d7446; --warn #8f5a00; --bad #b42318; --info #2353b0` (keep the `-bg` pairs).

Dark: keep the present dark surfaces, but `--accent #a9c1ff; --tint rgba(169,193,255,.10); --tint-2 rgba(169,193,255,.18)`.

Meaning: **gold is only the main button, the active-tab underline, the 2972 badge and "today" on a calendar.**
Links, selected chips, selected rows and focus rings use `--accent`. Text on gold is always `--on-gold`.
All text must pass WCAG AA in light and dark.

Type: Inter for everything. Bricolage Grotesque only for the 2972 badge and brand name, the `h1`, and big numbers
(`.kpi b`, `.big`, counters). `h2` and `h3` are Inter 600. Body 15 px (16 px at 640 px and below so iOS
does not zoom). JetBrains Mono only for real codes (SKUs, times in grids).

Shape: cards radius 12, controls radius 8, no shadows on cards (only on drawers, menus, toasts). Page gutter 16 px
on phones, 24 px on desktop. Content max width 1120 px, centred. Forms and Account max 720 px.

## Shared parts

- **App bar** (navy, 52 px, sticky): nine-dot Apps button (icon only, at the far left), 2972 badge, then the
  current app's name in white (on Home: "Gears & Buccaneers"). Right: Competition chip (only in that mode), bell,
  account initials. No "/ crumb".
- **Tab row** (`.topbar`, sticky under the bar, white, one hairline below): underline tabs, the active one has
  dark text and a 3 px gold underline. One row; on phones it scrolls sideways with a fade at the right edge (drop
  the two-row grid and its `--cols` script). The right side holds at most one button. `D.topbar(title, host, tabs,
  right)` keeps its signature: `host` is ignored; with tabs the title is not shown (the bar already names the app);
  without tabs the title is an `h1` at the top of the content and there is no band. Tasks keeps its menu button and
  its own title there.
- **Buttons**: 40 px high (44 px on phones), `.btn` plain, `.btn.primary` gold, `.btn.ghost` accent text,
  `.btn.danger` red text.
- **Status** (`.pill`): restyle as dot plus word: no background, no padding, a 8 px dot before the text coloured by
  `.ok/.warn/.bad/.info/.gold`, grey when none. `.pill.pri` (priority) is plain coloured text with no dot. Counts
  (`.tcount`, `.count`) stay small rounded numbers. Remove the fixed pill widths in list rows.
- **Chips and segments**: selected = `--tint-2` background and `--accent` text (not navy and gold).
  `.seg` is a grey track with a white selected piece.
- **Cards**: `.card.hero` is a normal card with a 3 px gold left edge (no ring, no glow).
- **Lists**: rows at least 52 px, one title line, one muted line, status at the right, hover `--surface-2`.
- **Fields**: label above, 44 px, focus ring `--accent`.
- **Drawer**: 480 px on desktop; a full-screen sheet on phones with the close button at the top right.
- **Empty state**: one plain sentence and, if useful, one button. No dashed boxes.
- **Hints** (`.flowhint`, `.hint`): delete the ones that explain the system or the demo. Keep one only where it
  tells the person what to do next, as one muted sentence without a box.
- **Demo bar**: a slim grey strip (not gold, not sticky): "Demo · sample data", the role switch, Event day, Reset.

## Home

Top to bottom, one column up to 1120 px:
1. Date in muted text, then `h1` "Hi Sam."
2. **Today** card: a short list of what matters to this person now, each row a link into the right app and tab.
   - Student: today's practice time and whether they are signed in (button: Sign in); then the next-task card as it
     is (Done is the gold button). On event day: my shift first.
   - Mentor and admin: "Waiting on you" rows computed from the sample data where possible (part requests that need
     an OK, skill sign-offs requested, mentors who have not answered for this week), each with a count; then today's
     practice and how many are signed in. Remove the sentence greeting that lists counts.
   - Parent: the next practice or event, and any practice that still needs snacks (button: Sign up).
3. **Apps**: compact tiles (icon, name, the short description) in a grid: 2 across on phones, 3 to 4 on desktop.
   Under them two quiet rows, **Tools** and **More**, each closed by default (see "Apps, Tools and More" below).
4. Recent activity (not for parents): five rows, plain text, app name muted in front. No pills.

Delete the yellow-bar instructions at the bottom.

## Per app (keep every feature reachable)

**Tasks.** Keep the sidebar and the flows. Calm the sidebar (selected row = tint and accent). "New task" is a plain
button, because Done on the next-task card is the main action. Task rows: title, one muted line, status dot and
word, date. On phones the task panel is a full-screen sheet.

**Parts & Inventory.** Tabs: Requests, To order (staff), Arriving, Inventory, Budget and Vendors (staff). Remove
"New request" as a tab; "Request a part" is the one gold button at the right of the tab row and opens the same
form. Filters: one "Show" select with counts on every screen size (no chip row), "Only mine", and search, on one
line on desktop. Rows: part name; one muted line (vendor · qty · total · who · need by); status at the right;
show priority only when it is Blocking or High. "To order" has one gold button per vendor group at most.

**Calendar, Attendance and Snacks are one app (decided 2026-11-13).** They answer one question, "what is happening at
practice on this day", so there is one tile, "Calendar" ("Practices, attendance and snacks"), and the app bar says
"Calendar" on every tab. The tab row has three tabs: Calendar, Attendance, Snacks. Who sees which stays what the three
tiles said: Calendar for everyone; Attendance for admin, mentor and student; Snacks for admin, mentor and parent, in Build
mode only. A tab that had its own tabs (Calendar's Month and Agenda, Attendance's Today, Leaderboard and the rest) now
shows them as a small segmented switch at the top of the tab, so the row stays at three tabs and at most one button. On
the agenda, and in a day's panel, a practice day has two short lines that are doors, not controls: attendance ("You are
signed in", "Sign in", "N signed in", or the mentors coming) and snacks ("Needs snacks", "Kim family is bringing snacks").
Each opens that tab for that day, and only roles that have the tab see the line. Old routes `#here` and `#snacks` open the
matching tab. A person who has only one tab (a parent in Competition mode) sees no tab row, just the page title.

**Only admins edit the practice pattern (decided 2026-11-13, the owner: "mentors cannot edit practice patterns. only admin").** The Calendar tab's "Practice pattern and sync" view (the pattern, days off and the Google Calendar subscribe links) is shown to admins only. A mentor does not see it in the switch, and any old link or `?tab=` value for it opens the Calendar tab's default view. Mentors still create and edit single events, change one practice day, cancel one practice, and use Attendance and Snacks.

**Calendar.** Phones open on Agenda; desktop opens on Month. Events in the month grid are pale with a coloured
dot, not solid colour bars; the legend is one quiet line under the grid. "Subscribe on my phone" stays a plain button.

**Attendance.** The Today tab starts with one status card: "You are not signed in" with the gold "Scan the door
code" button, or "Signed in since 3:31 pm" with a plain "Sign out". Under it: who is here now, then mentors. No text
about how the code works.

**Snacks.** A list of the coming practices; each row shows who brings snacks or a "I'll bring snacks" button.

**Skills.** Students open on Overview, which answers "what can I do next": Ready to start, In progress, Waiting
for sign-off, then the six trees with progress. Mentors open on the sign-off requests. In the tree, nodes are
smaller (about 150 × 56) so a whole tree fits a laptop screen; at 640 px and below show the tree as an indented
list in order instead of a graph, with the same states and the same tap to open.

**Schedule, Pit, Scouting.** Pit: unchecked boxes are a neutral outline (not gold), checked is green; "Problem" is
a small plain button. Scouting: keep the big thumb controls; selected choices use accent, not navy and gold; the
gold button is Send. Schedule: keep; soften the bars.

**Account.** One column, 720 px: Profile, Notifications (one row per kind with its switches, not a table on
phones), Appearance, Build or Competition mode, Sign-in. Plain words: "team sign-in", never "Authentik".

## Apps, Tools and More (decided 2026-11-13, D139)

The Apps menu and Home show three groups. **Apps** are the tiles. **Tools** are small helpers that open inside the
site, in the same tab (Drawing to vector, Gear and sprocket finder); they are not apps and not link-outs. **More** holds
the link-outs. Tools and More are each one quiet row (name, count, chevron) that opens and closes; both start closed.
The row is a real button with `aria-expanded`, the chevron turns (no motion with reduced motion), and each person's
open or closed choice is remembered the way theme and mode are. A group with nothing in it for that person is not
shown. Tools are for admins, mentors and students in both modes; parents and the shop screen do not see the group.

**One place for tools.** `#tools` lists every tool (icon, name, one line). A tool page keeps "Tools" in the bar, has a
small "All tools" link, the tool's name as the `h1`, then numbered steps with one gold action. Adding a tool adds one
row and one page, never a new tile. A tool that cannot do the real work in the demo says so on the screen; a sample
result is labelled as a sample.

## Hover descriptions (decided 2026-11-13, D139)

One shared tip for every app: any element with `data-tip="…"` gets it. Do not use `title` (it adds a second,
browser-made tip).
- It shows after about half a second of mouse hover and at once on keyboard focus, never from touch. It goes away on
  leave, blur, Escape, scroll or click. It sits above the element (below when there is no room), inside the window,
  above every layer, with no arrow and only a short fade. It is tied to the element with `aria-describedby`.
- **What gets one:** every icon-only button (Apps, bell, initials, menu and "…" buttons, the task check circle, close
  buttons); every tab and view-switch item (what you find there); every status word (what it means); each tile in the
  Apps menu; the Build / Competition switch; short codes and jargon (DP, SKU, "Qual 12"); each tool row. A switch or
  checkbox that sits next to its own visible label does not need one.
- **How it reads:** one short sentence, at most about 80 characters, on what the thing is or does. Never the visible
  label again. Sentence case, no host or service names.
- **Never the only way:** nothing a person must know lives only in a tip, because phones have no hover. Do not remove
  visible helper text to make room for tips.
- Tabs and status words take their words from one shared table (tab descriptions by app and id; one glossary of
  status words per app), so the same word always means the same thing.

## Guide (decided 2026-11-13, D140; the full design is `new-apps/briefs/GUIDE_DESIGN.md`)

A new person learns by doing three to five real first-week jobs, not by watching a tour. Home shows a small "Get
started" card with only the next stop; "Show me" opens the real screen and rings one control that stays live; using it
finishes the stop. The card ends once with what they covered and is gone; Account has "Start the tour again".

**Fast, by rule.**
- No timers, no typing effects, no step that waits. A stop is on screen within about a tenth of a second of the tap.
  No animation longer than 200 ms; none with reduced motion.
- One sentence of about 20 words per stop, naming the control ("the gold Scan the door code button"). If a stop
  needs more words, the screen it points at needs fixing, not the guide.
- A person who taps "Got it" at every stop is done in under 30 seconds; doing every action, about a minute.
- Never more than five stops for any role. **A new app adds at most one stop to a role, and only by replacing a
  weaker one.**
- The guide adds no weight to a page that is not showing it.

**Engaging, without tricks.** It is about their first day: their first name and their role's real first job. Progress
is visible and small ("2 of 4" and a thin line). Each stop ends in something real (signed in, task open, days saved);
the page's own confirmation is the reward and the guide adds one tick. The ending says what they did, not
"congratulations". No points, streaks, mascots or confetti.

**The guide never adds a gold button** (decided 2026-11-13). "Show me", "Got it", "Next" and the ending's "Done" are
plain buttons. The page's own gold control stays the one gold thing on the screen, also while a stop is open.

**Writing a stop.** A verb-first title; one sentence that names the control; what finishes it (an action on that
control, never just a page view where an action exists); and one sentence for when the control is missing.

## Working rules for whoever codes this

- Plain HTML, CSS and JS; no build step, no libraries. Keep `data-act` wiring and the `D.*` structure.
- Shared CSS lives in `css/base.css`. App-specific CSS goes in `css/<app>.css`. Only the foundation step edits
  `index.html`, `css/base.css` and `js/core.js`.
- Check light and dark, 1280 px and 390 px, for student, mentor and parent. No console errors. No horizontal
  page scroll at 390 px or 320 px.
