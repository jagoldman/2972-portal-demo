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
   "More" links below as a plain list of links.
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

## Working rules for whoever codes this

- Plain HTML, CSS and JS; no build step, no libraries. Keep `data-act` wiring and the `D.*` structure.
- Shared CSS lives in `css/base.css`. App-specific CSS goes in `css/<app>.css`. Only the foundation step edits
  `index.html`, `css/base.css` and `js/core.js`.
- Check light and dark, 1280 px and 390 px, for student, mentor and parent. No console errors. No horizontal
  page scroll at 390 px or 320 px.
