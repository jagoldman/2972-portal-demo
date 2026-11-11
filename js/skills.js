/* Skills: trees of categories, categories of skills, both drawn as layered graphs; mentor sign-off, requests, bulk sign-off, AI doc import.
   CAD: FRCDesign.org. Electrical: FRCElectrical.org. Programming: WPILib Java.
   Every skill names its check: written test, demonstration, both (a dual check), or an Onshape review for CAD. */
(function () {
"use strict";
var esc = D.esc;
var STUDENTS = ["Sam Ortiz", "Leo Brooks", "Priya Shah", "Ava Kim", "Jordan Lee", "Maya Gold"];

function sk(id, name, sum, req, url, checks) { return { id: id, name: name, sum: sum, req: req || [], url: url || "", checks: checks || null }; }
/* Checks: test = written test, demo = a mentor watches, both = dual check, rev = a mentor reviews the Onshape document. */
function both(test, demo) { return { test: test, demo: demo }; }
function demoOnly(demo) { return both("", demo); }
function test(q) { return both(q, ""); }
function rev(pass) { return { review: pass }; }
function frc(slug) { return "https://frcdesign.org/" + slug + "/"; }
function fel(slug) { return "https://frcelectrical.org/" + slug; }
function wpi(slug) { return "https://docs.wpilib.org/en/stable/docs/" + slug; }
var TREES = [
  { id: "safety", name: "Safety", tag: "SF", note: "Required. Unlocks every other tree.", req: null, cats: [
    { id: "shop", name: "Shop Safety", req: [], skills: [
      sk("s1", "Shop rules and PPE", "safety glasses on, closed shoes, long hair and loose clothes tied back", [], "", demoOnly("Arrive with glasses on, closed shoes, and hair and sleeves secured; a mentor checks all three and you show where the spare glasses are.")),
      sk("s2", "Find the e-stops, eyewash, and first aid", "where each one is, and which adult you tell", ["s1"], "", demoOnly("Walk a mentor to each e-stop, the eyewash, and the first-aid kit, and name the adult you tell after any injury, even a small one.")),
      sk("s10", "Fire and smoke", "stop the machine if you safely can, tell an adult, leave by the nearest exit to the meeting spot if it spreads; never fight a battery fire alone", ["s2"], "", both("Where the extinguisher is, when you leave instead of using it, and what you do if a battery or the laser starts to smoke.", "Walk the route from your bench to the nearest exit and the meeting spot.")),
      sk("s15", "Chemicals, dust, and noise", "CA glue, solvents, cutting fluid; dust from deburring; ear protection at loud machines", ["s1"], "", test("Where the safety data sheets are, what you do if CA glue or a solvent gets on skin or in an eye, and which machines need ear protection.")),
      sk("s3", "Clean-up and tool return", "machines off, tools back where they live, floor swept", ["s1"], "", demoOnly("Run the end-of-practice clean-up for one bench and leave it ready for the next person."))
    ] },
    { id: "batt", name: "Battery and Robot Power", req: ["shop"], skills: [
      sk("s4", "Battery handling", "carry by the case, never the leads; look for cracks, swelling, and loose lugs", [], "", demoOnly("Carry a battery by the case, inspect it, and say what you do if it is cracked, swollen, or leaking: leave it and tell a mentor.")),
      sk("s6", "Lock out before work", "disable, main breaker off, battery unplugged", ["s4"], "", demoOnly("Make the robot safe to touch, then show a mentor it cannot power on.")),
      sk("s11", "Release stored energy", "vent the air, lower or pin arms and elevators, watch for springs", ["s6"], "", both("Name three ways a robot that is switched off can still move or hurt you.", "Vent the pneumatics and lower or pin a raised mechanism before you reach in.")),
      sk("s13", "Charge and store batteries", "on the charging cart, never left charging overnight, damaged ones set aside", ["s4"], "", demoOnly("Put a battery on charge, read the charger, and show where a damaged battery goes.")),
      sk("s14", "Pinch points and lifting the robot", "hands clear of wheels, belts, and arms; two people and the cart to move it", ["s6"], "", demoOnly("Point out three pinch points on the robot, then move it onto the cart with a partner.")),
      sk("s5", "Power on and enable safely", "area clear, call out “enabling”, someone ready to disable", ["s6"], "", demoOnly("Power on with the area clear, call it out before you enable, and show the keys that stop the robot: Enter disables, the space bar e-stops."))
    ] },
    { id: "mach", name: "Machine Safety", req: ["shop"], skills: [
      sk("s7", "Only signed-off machines", "the qualified list posted in the shop, or a mentor beside you", [], "", demoOnly("Find the posted qualified list, say whether you may run the metal bandsaw today, and name who could supervise you if not.")),
      sk("s8", "Stop a machine", "its switch or e-stop, then hands off until it is fully still", ["s7"], "", demoOnly("Stop a running machine, keep your hands away until it is fully still, and switch it off.")),
      sk("s9", "Rotating-tool rules", "no gloves, sleeves and hair secured, chips away from you", ["s7"], "", test("Why gloves stay off near a spinning tool, and where hair, sleeves, and chips go.")),
      sk("s12", "Hot parts and fumes", "printer nozzles and beds, fresh-cut metal, laser smoke; let it cool, run the air", ["s7"], "", test("Name three hot things in our shop and what you wait for or use before you touch each one."))
    ] }
  ] },
  /* CAD follows FRCDesign.org's Onshape learning course (setup through Stage 2). Each skill links to the lesson.
     A mentor reviews the student's Onshape document against the pass line. */
  { id: "cad", name: "CAD", tag: "CAD", note: "Onshape, following FRCDesign.org from setup through Stage 2.", req: "safety", cats: [
    { id: "cadsetup", name: "Course Setup", req: [], skills: [
      sk("cd1", "Why CAD for FRC", "iteration, collaboration, manufacturing", [], frc("learning-course/course-setup/new-to-cad"), test("In two sentences, why the team models a part before it cuts one.")),
      sk("cd2", "Set up Onshape", "education account, documents page, sharing with the team", ["cd1"], frc("learning-course/course-setup/new-to-onshape/account-setup"), rev("Your education account works and a mentor can open a document you shared.")),
      sk("cd3", "Tune Onshape performance", "units, graphics, shortcuts", ["cd2"], frc("learning-course/course-setup/new-to-onshape/performance-tuning"), rev("Units match the team standard (inches) and the lesson's graphics settings are on.")),
      sk("cd4", "Add FRCDesignLib", "MKCad parts in every document", ["cd2"], frc("learning-course/course-setup/required-course-tools/part-library"), rev("FRCDesignLib is in your library and you insert one part from it.")),
      sk("cd5", "Install course Featurescripts", "Origin Cube, Tube Converter, Belt & Chain Gen", ["cd2"], frc("learning-course/course-setup/required-course-tools/featurescripts"), rev("All three Featurescripts are on your toolbar."))
    ] },
    { id: "cad1a", name: "1A Onshape Fundamentals", req: ["cadsetup"], skills: [
      sk("cd6", "Navigate a part studio", "rotate, pan, zoom, tabs", [], frc("learning-course/stage1/1a/section1-exercise0"), rev("Exercise 0 is done, and you reach a face a mentor names without the view cube.")),
      sk("cd7", "Extrude box tubes", "1×1 and 2×1 tubes with Tube Converter", ["cd6"], frc("learning-course/stage1/1a/section1-exercise1"), rev("Exercises 1 and 2 match the lesson's sizes and were made with Tube Converter.")),
      sk("cd8", "Fully constrain a sketch", "dimensions, constraints, mirrors", ["cd7"], frc("learning-course/stage1/1a/section1-exercise3"), rev("Every sketch in Exercise 3 is fully defined (all black).")),
      sk("cd9", "Model tube frames", "drivetrain, box, and triangle frames", ["cd8"], frc("learning-course/stage1/1a/section1-exercise4"), rev("Exercises 4 to 6 match the lesson's drawings.")),
      sk("cd10", "Model plates and gussets", "plate workflow, 0.5 in hole grid, superstructure gussets", ["cd8"], frc("learning-course/stage1/1a/section2-exercise1"), rev("Section 2 Exercises 1 to 3: plates and gussets with holes on the tube's 0.5 in grid.")),
      sk("cd11", "Motor mounting plate", "bolt circle and pilot hole from the motor", ["cd10"], frc("learning-course/stage1/1a/section2-exercise4"), rev("Exercise 4: the plate's holes line up with the FRCDesignLib motor.")),
      sk("cd12", "Rivets and gussets on a frame", "rivet pattern, gusset setup, mates", ["cd9", "cd11"], frc("learning-course/stage1/1a/section3-exercise1"), rev("Section 3 Exercises 1 and 3: rivets sit on the hole grid and every gusset is mated.")),
      sk("cd46", "Mate swerve modules", "four MK4i modules on the frame corners", ["cd12"], frc("learning-course/stage1/1a/section3-exercise2"), rev("Exercise 2: four modules mated at the corners; nothing moves when you drag it.")),
      sk("cd51", "Full frame and finishing", "gussets, rivets, and the finished frame", ["cd46"], frc("learning-course/stage1/1a/section3-exercise4"), rev("Exercises 4 and 5: every gusset placed and riveted, and the frame matches the lesson."))
    ] },
    { id: "cad1b", name: "1B Power Transmissions", req: ["cad1a"], skills: [
      sk("cd13", "Motors, shafts, and bearings", "COTS motors, hex shaft, flanged bearings", [], frc("learning-course/stage1/1b/motors"), test("Name two FRC motors, why we use hex shaft, and where a flanged bearing goes.")),
      sk("cd14", "Torque, speed, and ratios", "a reduction trades speed for torque", ["cd13"], frc("learning-course/stage1/1b/torque-speed"), test("A motor with a 6000 rpm free speed drives a 3:1 reduction: give the output speed and say what happens to torque.")),
      sk("cd47", "Gears", "tooth count, pitch, center-to-center distance", ["cd14"], frc("learning-course/stage1/1b/gears"), test("Work out the center-to-center distance for two gears a mentor names.")),
      sk("cd15", "Model a simple gearbox", "gears at the right center-to-center, Origin Cube", ["cd47"], frc("learning-course/stage1/1b/exercise1"), rev("Exercise 1: gears mesh at the right center-to-center and the output turns with the motor.")),
      sk("cd16", "Model a two-stage gearbox", "stacked reductions", ["cd15"], frc("learning-course/stage1/1b/exercise2"), rev("Exercise 2: both stages mesh and your stated ratio matches the tooth counts.")),
      sk("cd17", "Belt and pulley drives", "5 mm HTD, Belt & Chain Gen", ["cd15"], frc("learning-course/stage1/1b/belts"), rev("A belt made with Belt & Chain Gen at a belt length you could order.")),
      sk("cd18", "Chain and sprocket drives", "#25 chain, center-to-center, tensioning", ["cd15"], frc("learning-course/stage1/1b/chain"), rev("A #25 chain run at a whole number of links, with a way to tension it.")),
      sk("cd19", "Gear and belt gearbox", "mixed transmission", ["cd16", "cd17", "cd18"], frc("learning-course/stage1/1b/exercise3"), rev("Exercise 3: gear and belt stages together, and the overall ratio is right."))
    ] },
    { id: "cad1c", name: "1C Practice Mechanisms", req: ["cad1b"], skills: [
      sk("cd20", "Origin Cube on every mechanism", "first feature, group, fasten to origin", [], frc("learning-course/stage1/1c/introduction"), rev("Each 1C mechanism starts with an Origin Cube and is fastened to the origin in its assembly.")),
      sk("cd21", "Model a flat intake", "layout sketch drives the rollers", ["cd20"], frc("learning-course/stage1/1c/exercise1"), rev("Exercise 1: change one layout dimension and the rollers follow.")),
      sk("cd22", "Model dead-axle rollers", "bushings, live vs dead axles", ["cd21"], frc("learning-course/stage1/1c/exercise2"), rev("Exercise 2: you can say which axles are live and which are dead, and the bearings match.")),
      sk("cd23", "Model a practice shooter", "flywheels, compression", ["cd22"], frc("learning-course/stage1/1c/exercise3"), rev("Exercise 3: flywheel spacing and compression come from the layout.")),
      sk("cd24", "Model a telescoping hook", "linear extension, hard stops", ["cd23"], frc("learning-course/stage1/1c/exercise4"), rev("Exercise 4: the hook extends in the assembly and stops at its hard stop.")),
      sk("cd25", "Flipped and direction-swap gearboxes", "packaging a reduction", ["cd23"], frc("learning-course/stage1/1c/exercise5"), rev("Exercise 5: the output turns the way the lesson asks.")),
      sk("cd26", "Model an indexer", "vertical rollers, belts and chain", ["cd22"], frc("learning-course/stage1/1c/exercise8"), rev("Exercise 8: the game piece has a clear path from intake to shooter."))
    ] },
    { id: "cad1d", name: "1D Design Methodology", req: ["cad1c"], skills: [
      sk("cd27", "Top-down design", "layout sketches drive the parts", [], frc("learning-course/stage1/1d/top-down-design"), test("Why parts come from a layout sketch, and what breaks when they do not.")),
      sk("cd28", "Drivetrain layout sketch", "the course's swerve frame with MK4i modules, side and top", ["cd27"], frc("learning-course/stage1/1d/layout-sketch"), rev("Top and side layout sketches are fully defined, and the module positions come from them.")),
      sk("cd29", "Model the swerve chassis", "tubes and bellypan derived from the layout", ["cd28"], frc("learning-course/stage1/1d/part-modeling"), rev("Change the frame size in the layout and the tubes and bellypan follow.")),
      sk("cd30", "Assemble the drivebase", "modules, groups, top-level robot assembly", ["cd29"], frc("learning-course/stage1/1d/assembly-modeling"), rev("Modules grouped, the top-level assembly built, and nothing floats."))
    ] },
    { id: "cad1e", name: "1E Subsystem Workflow", req: ["cad1d"], skills: [
      sk("cd31", "Battery holder", "the battery comes out fast", [], frc("learning-course/stage1/1e/battery-mounting"), rev("Exercise 1: the holder fits the battery model and the battery comes out without removing other parts.")),
      sk("cd48", "Mount the electronics", "power board, controller, radio, main breaker", ["cd31"], frc("learning-course/stage1/1e/electronics"), rev("Exercise 2: every part is mounted with room for wires, and the main breaker is easy to reach.")),
      sk("cd49", "Bellypan pocketing", "lighten without weakening", ["cd48"], frc("learning-course/stage1/1e/exercise3"), rev("Exercise 3: pockets leave material under every bolt and electronics mount.")),
      sk("cd32", "Bumpers and bumper mounts", "game-manual rules, quick on and off", ["cd48"], frc("learning-course/stage1/1e/exercise4"), rev("Exercises 4 and 5: bumpers sit where the rules say, and the pit crew can take them off fast."))
    ] },
    { id: "cad2a", name: "2A Basic Shooter", req: ["cad1e"], skills: [
      sk("cd33", "Shooter design", "trajectory, exit velocity, compression, wrap, spin", [], frc("learning-course/stage2/2a/introduction"), test("Compression, wrap, and spin in one line each, and one way to raise exit velocity.")),
      sk("cd34", "Shooter layout sketch", "field element, hood, ball path", ["cd33"], frc("learning-course/stage2/2a/layout-sketch"), rev("The layout shows the game piece path and the hood angle.")),
      sk("cd35", "Model a flywheel shooter", "plates, belts, Limelight mount", ["cd34"], frc("learning-course/stage2/2a/part-studio"), rev("The part studio is driven by the layout, with belts and a camera mount."))
    ] },
    { id: "cad2b", name: "2B Dead Axle Pivot", req: ["cad1e"], skills: [
      sk("cd36", "Pivot design", "strength, friction, backlash, tensioning", [], frc("learning-course/stage2/2b/introduction"), test("Where backlash comes from in a pivot, and one way to reduce it.")),
      sk("cd37", "Model a dead-axle pivot", "layout, chain, moving subassemblies", ["cd36"], frc("learning-course/stage2/2b/part-studio"), rev("The arm pivots in the assembly and the chain can be tensioned."))
    ] },
    { id: "cad2c", name: "2C Slapdown Intake", req: ["cad2b"], skills: [
      sk("cd38", "Intake golden rules", "robust rollers, the pivot, zombie axles (a pivot axle that also drives the rollers)", [], frc("learning-course/stage2/2c/intake-golden-rules"), test("Three intake golden rules, and what a zombie axle lets you do with the roller motor.")),
      sk("cd39", "Model a slapdown intake", "over the bumper, ball path, motion", ["cd38"], frc("learning-course/stage2/2c/part-studio"), rev("The intake folds inside the frame and deploys over the bumper."))
    ] },
    { id: "cad2d", name: "2D Cascade Elevator", req: ["cad1e"], skills: [
      sk("cd40", "Elevator design", "blocks, chain attachment, rigging, cables", [], frc("learning-course/stage2/2d/elevator-blocks"), test("How a cascade elevator differs from a continuous one, and how the chain attaches.")),
      sk("cd41", "Model a cascade elevator", "stages, sliders, linear relation", ["cd40"], frc("learning-course/stage2/2d/part-studio"), rev("The stages move together in the assembly and the travel matches the layout."))
    ] },
    { id: "cadnext", name: "Next Steps", req: ["cad2a", "cad2c", "cad2d"], skills: [
      sk("cd42", "CAD best practices", "named parts, layout-driven, clean feature tree", [], frc("best-practices"), rev("One Stage 2 document has every part named, every part driven by a layout sketch, no red features, and no floating parts.")),
      sk("cd50", "Release a part for the shop", "DXF for the router or laser, a 3MF for the printers, units checked", ["cd42"], "", rev("Make a drawing of one plate with its critical dimensions, export it as a DXF, and export one part for a printer; note the material, cutter, and how the part is held, and a mentor approves units and hole sizes before anything is cut.")),
      sk("cd43", "Independent mechanism", "your own project, then a design review", ["cd42"], frc("learning-course/next-steps"), rev("Present your own mechanism at a design review and fix what the review finds.")),
      sk("cd44", "Study public robot CAD", "Open Alliance, mechanism examples", ["cd42"], frc("mechanism-examples"), test("Pick a public mechanism and explain two choices its team made."))
    ] }
  ] },
  { id: "mfg", name: "Manufacturing", tag: "MF", note: "Our shop. Each machine: rules (written test), a supervised job (demonstration), then qualification (both). Qualified means you may run it alone while a mentor is in the shop.", req: "safety", cats: [
    { id: "meas", name: "Measuring and Layout", req: [], skills: [
      sk("mf1", "Read calipers", "to 0.001 in, inside and outside", [], "", demoOnly("Measure three features a mentor names and get each within 0.005 in.")),
      sk("mf5", "Pick the stock", "aluminum tube and plate, polycarbonate, wall thickness on the label", ["mf1"], "", test("Which stock you use for a frame tube, a gusset, and a guard, and how you check the wall thickness.")),
      sk("mf6", "Fits and tolerances", "clearance, close, and press fits; which dimensions must be exact", ["mf1"], "", test("The clearance hole for a 10-32 bolt, how a bearing bore differs from a clearance hole, and which dimension on a drawing you check first.")),
      sk("mf2", "Layout and center punch", "scribe, square, punch on the cross", ["mf1"], "", demoOnly("Lay out a hole pattern and punch every center within 1/32 in of the mark."))
    ] },
    { id: "hand", name: "Hand Work", req: ["meas"], skills: [
      sk("mf3", "Deburr and file", "every cut edge, no gloves near a spinning part", [], "", demoOnly("Deburr a cut tube until a shop rag pulled along every edge does not snag.")),
      sk("mf4", "Pop rivets", "grip length, set, and drill out", ["mf3"], "", demoOnly("Set two rivets flush and drill one out without enlarging the hole."))
    ] },
    { id: "miter", name: "Compound Miter Saw", req: ["meas"], skills: [
      sk("mt1", "Miter saw rules", "guard down, work clamped, hands outside the no-hands zone, blade stopped before you reach", [], "", test("What you clamp, what you never cut freehand, and when you may reach for the offcut.")),
      sk("mt2", "Supervised square cut", "length to a mark, blade fully stopped before you reach in", ["mt1"], "", demoOnly("Cut one piece to a marked length while a mentor watches the whole cycle.")),
      sk("mt3", "Qualified on the miter saw", "you may cut alone while a mentor is in the shop", ["mt2"], "", both("Kickback, which side of the line you cut, and who may use the saw without a mentor beside them.", "Support and clamp a tube, cut it to a length a mentor names within 1/32 in, check it square, and sweep the table."))
    ] },
    { id: "drill", name: "Drill Press", req: ["meas"], skills: [
      sk("dp1", "Drill press rules", "clamp the work, peck, no gloves, hair tied", [], "", test("Why the work is clamped, what peck drilling is, and why gloves stay off.")),
      sk("dp2", "Drill a laid-out hole", "center punch, pilot, then finish size", ["dp1"], "", demoOnly("Drill one hole on a punched center without the part walking.")),
      sk("dp4", "Tap a hole", "10-32 or 1/4-20, cutting fluid, back the tap out to break the chip", ["dp3"], "", both("Tap drill size for 10-32 and 1/4-20, and when you back the tap out.", "Tap one hole that a bolt turns in by hand.")),
      sk("dp5", "Countersink and step drill", "flush rivets and bolts, clean holes in thin plate", ["dp3"], "", demoOnly("Countersink one hole so a flat-head screw sits flush, and step-drill a clean hole in thin plate.")),
      sk("dp3", "Qualified on the drill press", "you may drill alone while a mentor is in the shop", ["dp2"], "", both("Speed for a large bit vs a small one, and what you do if the part catches.", "Drill a laid-out three-hole pattern within 1/32 in, then brush the chips and the table clean."))
    ] },
    { id: "band", name: "Metal Bandsaw", req: ["meas"], skills: [
      sk("bw1", "Know the metal bandsaw", "vertical metal bandsaw, variable blade speed, key switch", [], "https://support.grizzly.com/hc/en-us/articles/35557903989911-FAQ-G0994-Metal-cutting-Bandsaw", test("Which blade speed you use for aluminum, why round stock needs support, and where the key is kept.")),
      sk("bw2", "Supervised metal cut", "fence or miter gauge, speed set for aluminum, guard just above the work", ["bw1"], "", demoOnly("Cut one piece of aluminum with the guard set and the speed matched to the metal.")),
      sk("bw3", "Qualified on the metal bandsaw", "you may cut alone while a mentor is in the shop", ["bw2"], "https://www.grizzly.com/videos/kpq5DqCAVHQ", both("Speed, guard height, and what you do not cut unsupported.", "Cut a square end, shut down, brush the chips, and return the key."))
    ] },
    { id: "lathe", name: "Lathe", req: ["meas"], skills: [
      sk("lt1", "Lathe rules and the DRO", "chuck key never left in the chuck, no gloves, sleeves short", [], "https://mechmaxx.com/products/10-x-22-industrial-metal-lathe-machine-high-precision-benchtop-1-5hp-0-2000-rpm-variable-speed-metal-working-machine", test("Where the chuck key goes before you start the spindle, what a DRO zero means, and why gloves stay off.")),
      sk("lt2", "Face and turn to a diameter", "light cuts, read the DRO, chip brush not your hand", ["lt1"], "", demoOnly("Face one end and turn a diameter a mentor calls out, within 0.005 in measured with calipers.")),
      sk("lt3", "Qualified on the lathe", "you may turn parts alone while a mentor is in the shop", ["lt2"], "", both("Spindle speed for aluminum, how you zero the DRO, and what you do if the part chatters.", "Turn a short pin to a diameter, stop the spindle, and put the chuck key back on its hook."))
    ] },
    { id: "omio", name: "OMIO Router", req: ["meas"], skills: [
      sk("om1", "OMIO safety", "spindle, collet, e-stop, no gloves, spoil board under sheet", [], "https://docs.wcproducts.com/welcome/frc-build-system/shop-accessories/omio-and-accessories", test("What the e-stop does, why the collet must be tight, and what the spoil board is for.")),
      sk("om2", "Screen, zero, and g-code", "load the screen set, set zero, check the toolpath against the clamps", ["om1"], "https://docs.wcproducts.com/welcome/shop-accessories/omio-cnc-router-x8-usb/basic-operation/screen-sets", demoOnly("Load a file, show the toolpath, and point out every clamp or screw the bit must miss.")),
      sk("om3", "Supervised sheet or tube job", "tube fixture or screwed-down sheet, hand near the e-stop", ["om2"], "https://docs.wcproducts.com/welcome/shop-accessories/omio-cnc-router-x8-usb/basic-operation/basic-operation", demoOnly("Run one job from zero to spindle-off while a mentor watches.")),
      sk("om4", "Qualified on the OMIO", "you may run a known file while a mentor is in the shop", ["om3"], "", both("Zero, feeds, and what you do if the bit sounds wrong.", "Set up and run a known plate or tube file, then vacuum the bed."))
    ] },
    { id: "print", name: "Bambu X2D Printers", req: [], skills: [
      sk("x1", "Slice for an X2D", "Bambu Studio, the right printer, the filament the profile expects", [], "https://wiki.bambulab.com/en/x2d/manual/first-print", test("Which of the three printers you sent the file to, and which filament and plate the profile expects.")),
      sk("x2", "Watch the first layer", "load filament and stay until the first layer is good; the nozzle and bed are hot", ["x1"], "https://wiki.bambulab.com/en/x2d", demoOnly("Start a print and show a mentor a first layer with lines touching and no lifted corners before you leave it.")),
      sk("x3", "Qualified on the X2Ds", "you may start known prints and leave them running", ["x2"], "https://wiki.bambulab.com/en/x2d/manual/x2d-faq", both("Bed temperature for PLA and PETG, when you cancel a print, and when the plate is cool enough to touch.", "Finish a spacer or clip, pop it off a cooled plate, and leave the plate clean."))
    ] },
    { id: "laser", name: "Bambu R1 Laser", req: ["meas"], skills: [
      sk("lr1", "R1 rules", "55 W CO₂; opening the lid stops the laser; never unattended; no PVC, vinyl, or bare metal", [], "https://wiki.bambulab.com/en/r1/manual/first-setup-guide", test("Why the lid stays closed, two materials you never cut and why (PVC gives off hydrogen chloride gas), and where the extinguisher is.")),
      sk("lr2", "A supervised cut or engrave", "Bambu Suite, material measured, air and ventilation on", ["lr1"], "https://wiki.bambulab.com/en/r1", demoOnly("Run a small wood or acrylic job and stay at the machine for the whole cut while a mentor watches.")),
      sk("lr3", "Qualified on the R1", "you may run a known file while you stay in the room", ["lr2"], "https://wiki.bambulab.com/en/r1", both("Lid, air, ventilation, and what you do if you see flame: stop the job, keep the lid shut, tell a mentor, and leave if it spreads.", "Set up a file, cut or engrave it, and leave the bed clear."))
    ] }
  ] },
  { id: "elec", name: "Electrical", tag: "EL", note: "Following FRCElectrical.org, from theory to a legal robot.", req: "safety", cats: [
    { id: "elbase", name: "Basics", req: [], skills: [
      sk("el1", "Electrical safety", "robot off before you touch wiring, no rings or watches, glasses on", [], fel("intro/"), both("What a short circuit does to a battery, why metal jewelry comes off, and why the robot is off before you touch a wire.", "Show the robot is safe to wire: main breaker off and battery unplugged.")),
      sk("el2", "Voltage, current, resistance", "Ohm's law, and what each word means on a robot", ["el1"], fel("intro/"), test("V = I × R, and one sentence each for volts, amps, and ohms.")),
      sk("el3", "Wire gauge and color", "lower AWG is thicker; red is positive, black is negative", ["el2"], fel("intro/"), test("Which is thicker, 6 AWG or 22 AWG, and which color is positive.")),
      sk("el21", "Use a multimeter", "set the mode and the jack first; voltage on a battery, continuity with the robot off", ["el2"], fel("Tools/"), demoOnly("Set the meter's mode and leads, read a battery's voltage, then check a wire for continuity with the robot off.")),
      sk("el4", "Power, CAN, and signal wires", "power feeds devices, CAN carries data between controllers, signal wires go to sensors", ["el3"], fel("FRC-Control-System/#control-system-communications-signal-basics"), test("What power, CAN, and signal wires each carry, with one device on each."))
    ] },
    { id: "elctrl", name: "Control System", req: ["elbase"], skills: [
      sk("el5", "Battery, main breaker, and power board", "PDH or PDP 2.0; each breaker matches its wire", [], fel("FRC-Control-System/#power-distribution"), test("Draw battery to main breaker to power board to a motor controller, and say why each breaker matches its wire.")),
      sk("el6", "Radio and Systemcore", "radio against metal, lights visible, easy to remove", ["el5"], fel("FRC-Control-System/#robot-radio-20"), demoOnly("Power the radio and Systemcore and show the link lights, with the radio mounted the way the lesson says.")),
      sk("el22", "Network and camera wiring", "radio Ethernet to Systemcore, camera powered and on the network", ["el6"], fel("FRC-Control-System/#cameras"), demoOnly("Connect a camera to the practice board's network and show its feed from the driver laptop.")),
      sk("el7", "Wire a practice board", "a board with the power, radio, Systemcore, and RSL used for practice; breakers sized to the wire", ["el6"], fel("FRC-Control-System/"), demoOnly("Power the practice board and get the radio and RSL lights with no short."))
    ] },
    { id: "elconn", name: "Making Connections", req: ["elctrl"], skills: [
      sk("el8", "Strip and tug-test", "strip length matches the crimp; a nicked strand means cut and start over", [], fel("Making-Connections/"), demoOnly("Strip one wire to the right length with no nicked strands and tug the crimp.")),
      sk("el9", "Anderson Powerpole", "red is positive, the contact clicks into the housing", ["el8"], fel("Making-Connections/"), demoOnly("Crimp a red and a black Powerpole, snap the housings together, and tug.")),
      sk("el10", "Ferrules and WAGO", "square ferrule crimp, then the lever", ["el8"], fel("Tools/"), demoOnly("Ferrule one wire and land it in a WAGO that holds when tugged.")),
      sk("el11", "Battery connector", "6 AWG with SB50, two crimps per lug, heat shrink on first, Nordlock washers", ["el9"], fel("Battery/#battery-assembly"), both("Which wire goes with an SB50 and which with an SB120, and why the lug's built-in washer is never used.", "Crimp a battery lug with the heat shrink on first, bolt it with two Nordlock washers, and pass a hard pull.")),
      sk("el12", "Small signal connectors", "sensor and CAN connectors, gentle tug", ["el8"], fel("Making-Connections/"), demoOnly("Crimp one small connector with the contact facing the right way, and tug."))
    ] },
    { id: "elcan", name: "CAN and Motors", req: ["elconn"], skills: [
      sk("el13", "Daisy-chain a CAN bus", "twisted pair from Systemcore, device to device, ending at a 120 ohm resistor; never a star", [], fel("FRC-Control-System/#can-controller-area-network"), both("Where the bus starts, where it ends, where the resistor goes, and why a star is a bad CAN layout.", "Wire a three-device bus that still talks with the resistor on the end.")),
      sk("el14", "Set a CAN id", "Phoenix Tuner or REV Hardware Client", ["el13"], fel("FRC-Control-System/#motor-controllers"), demoOnly("Change one controller's id and read it back.")),
      sk("el15", "Motor power leads", "gauge matches the breaker, red to red, encoder or CAN cable seated, no bare copper", ["el14"], fel("Mechanism-Wiring/"), demoOnly("Land one motor's power leads, tug them, and show no bare copper."))
    ] },
    { id: "elmech", name: "On the Robot", req: ["elcan"], skills: [
      sk("el23", "Label and document wiring", "both ends of every wire labeled, the wiring diagram kept current", [], fel("Mechanism-Wiring/"), demoOnly("Label both ends of three wires and update the wiring diagram to match.")),
      sk("el16", "Service loop on a joint", "strain relief, wires clear of gears and wheels", [], fel("Mechanism-Wiring/"), demoOnly("Show a loop that still has slack at both ends of the joint's travel.")),
      sk("el17", "Pneumatics: vent, tube, leak check", "dump valve first, 120 psi limit, relief valve", [], fel("Pneumatics/"), both("Where the dump valve is, the 120 psi limit, and what the relief valve does.", "Vent the system, tube one solenoid with a square cut, pressurize, and find a leak.")),
      sk("el18", "Wire a sensor", "limit switch, beam break, or encoder; polarity right", [], fel("FRC-Control-System/#sensors"), demoOnly("Wire one sensor and show it change state.")),
      sk("el19", "Practice inspection", "wire size, breakers, battery strapped, no bare copper", ["el16", "el17", "el18"], fel("FRC-Control-System/#fuses-and-breakers"), both("Three things that fail inspection.", "Walk a mentor through the practice board as if it were inspection.")),
      sk("el20", "Find a wiring fault", "brownouts in the log, CAN faults in the vendor tool, then tug-test", ["el18"], fel("Mechanism-Wiring/"), demoOnly("Find and fix a fault a mentor puts on the practice board."))
    ] }
  ] },
  { id: "prog", name: "Programming", tag: "PR", note: "WPILib. Our robot code is Java and command-based.", req: "safety", cats: [
    { id: "pgtools", name: "Tools", req: [], skills: [
      sk("pg1", "Clone, branch, and a pull request", "your own branch; a teammate reviews before merge", [], "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests", demoOnly("Clone the team repo, make your own branch, and open a pull request that a teammate reviews and merges.")),
      sk("pg24", "Resolve a merge conflict", "pull main, fix the conflict, rerun the code", ["pg1"], "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line", demoOnly("Resolve a conflict a mentor sets up, run the code, and push the fix.")),
      sk("pg2", "Install WPILib", "VS Code, the WPILib extension, and the JDK", ["pg1"], wpi("zero-to-robot/step-2/wpilib-setup.html"), demoOnly("Open the team project and build it with no errors.")),
      sk("pg3", "Find a page in the WPILib docs", "pick Java on the page, don't guess the API", [], wpi("zero-to-robot/introduction.html"), demoOnly("Open the Java example for a class a mentor names."))
    ] },
    { id: "pgpy", name: "Java for the Robot", req: [], skills: [
      sk("pg5", "if, for, and arrays", "the control flow in a command", [], "https://docs.oracle.com/javase/tutorial/java/nutsandbolts/flow.html", demoOnly("Write a loop that prints each motor's name and CAN id.")),
      sk("pg4", "Methods and classes", "a class, a method, and new", ["pg5"], "https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html", demoOnly("Put that loop in a method on a small class and call it.")),
      sk("pg20", "Read Robot.java", "fields, the constructor, and this", ["pg4"], "https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html", test("Read Robot.java and explain what the constructor does and when it runs."))
    ] },
    { id: "pgz", name: "Zero to Robot", req: ["pgtools", "pgpy"], skills: [
      sk("pg6", "A TimedRobot that drives", "the robot loop first, with a joystick deadband; our robot itself is command-based", [], wpi("zero-to-robot/step-4/creating-test-drivetrain-program-cpp-java.html"), demoOnly("Write a TimedRobot that drives from a joystick.")),
      sk("pg7", "Run it in simulation", "the sim GUI, from VS Code", ["pg6"], wpi("software/wpilib-tools/robot-simulation/introduction.html"), demoOnly("Run the sim and show the drive answering the joystick.")),
      sk("pg8", "Driver Station modes", "disabled, teleop, auto, test; Enter disables, space bar e-stops", ["pg6"], wpi("software/driverstation/driver-station.html"), test("What each mode does, and which keys disable and e-stop the robot.")),
      sk("pg17", "Deploy to the robot", "robot on blocks, then deploy from VS Code", ["pg7", "pg8"], wpi("software/vscode-overview/deploying-robot-code.html"), demoOnly("Deploy, enable with the wheels off the ground, and disable."))
    ] },
    { id: "pgcmd", name: "Command-Based", req: ["pgz"], skills: [
      sk("pg9", "A subsystem owns the hardware", "each motor is created in one place", [], wpi("software/commandbased/what-is-command-based.html"), demoOnly("Write one subsystem that owns its motor; no other file creates that motor.")),
      sk("pg18", "Run a motor controller from code", "Phoenix 6 or REVLib: id, inversion, current limit", ["pg9"], wpi("software/hardware-apis/motors/index.html"), demoOnly("Set a motor's id, inversion, and current limit in code and spin it in sim or on blocks.")),
      sk("pg10", "Commands, triggers, and default commands", "a button starts a command, which interrupts the default and hands back", ["pg9"], wpi("software/commandbased/binding-commands-to-triggers.html"), demoOnly("Bind a button to a command that interrupts the subsystem's default command while held, and show the default resume on release.")),
      sk("pg11", "One mechanism in sim", "intake or arm, start to stop", ["pg10", "pg18"], wpi("software/commandbased/structuring-command-based-project.html"), demoOnly("Run an intake or arm subsystem with its commands in sim, from start to stop.")),
      sk("pg19", "Test a subsystem", "one JUnit test, run from VS Code", ["pg11"], wpi("software/wpilib-tools/robot-simulation/unit-testing.html"), demoOnly("Add a test that fails when the subsystem's logic is wrong and passes when it is right."))
    ] },
    { id: "pgctl", name: "Control", req: ["pgcmd"], skills: [
      sk("pg12", "Read a sensor", "encoder, beam break, or limit switch on the dashboard", [], wpi("hardware/sensors/index.html"), demoOnly("Show a sensor's value on the dashboard and change it by hand.")),
      sk("pg13", "PID or feedforward", "one mechanism holds a setpoint", ["pg12"], wpi("software/advanced-controls/introduction/index.html"), demoOnly("One mechanism holds a setpoint in sim, with gains you can explain.")),
      sk("pg23", "Read the gyro", "heading in degrees, zero it at the start", ["pg12"], wpi("software/hardware-apis/sensors/gyros-software.html"), demoOnly("Show the heading on the dashboard, turn the robot or sim by hand, and reset it to zero.")),
      sk("pg21", "Swerve and field-relative drive", "gyro heading, chassis speeds, module states", ["pg23", "pg13"], wpi("software/kinematics-and-odometry/swerve-drive-kinematics.html"), demoOnly("In sim, push the stick forward and the robot goes away from the driver whichever way it faces.")),
      sk("pg25", "Zero the swerve modules", "encoder offsets so every wheel points forward", ["pg21"], "", demoOnly("Set the module offsets on the robot (on blocks) and show all four wheels point straight ahead after a restart.")),
      sk("pg22", "Odometry", "wheel and gyro data become the robot's pose", ["pg21"], wpi("software/kinematics-and-odometry/swerve-drive-odometry.html"), demoOnly("Drive a square in sim and show the pose return close to where it started."))
    ] },
    { id: "pgmatch", name: "Match Code", req: ["pgctl"], skills: [
      sk("pg14", "A Choreo path and the auto chooser", "one path runs from the dashboard pick", [], "https://choreo.autos/", demoOnly("Pick an auto on the dashboard and run its path in sim.")),
      sk("pg15", "AprilTag pose", "a tag in view corrects where the robot thinks it is", [], wpi("software/vision-processing/apriltag/index.html"), demoOnly("Put the robot on a marked spot in front of a tag and show the estimated pose within 10 cm of the measured one.")),
      sk("pg16", "Read a log in AdvantageScope", "find the trace that explains a miss", [], "https://docs.advantagescope.org/", demoOnly("From a match log, find the trace that explains a problem a mentor points to."))
    ] }
  ] },
  { id: "pit", name: "Pit Crew and Drive", tag: "PD", note: "Competition-ready. Team-written.", req: "safety", cats: [
    { id: "pitb", name: "Pit Basics", req: [], skills: [
      sk("d1", "Pit setup and layout", "cart, tools, power strip, battery corner", [], "", demoOnly("Set up the pit from the cart; a mentor names five items and you find each one at once.")),
      sk("d2", "Run a match checklist", "every item on the team's Pit app checklist, before every match", ["d1"], "", demoOnly("Run the full checklist on the robot; a mentor rechecks every item after you and finds nothing missed.")),
      sk("d11", "Driver Station ready", "laptop charged, team number, controllers in order, auto picked", ["d1"], "", demoOnly("Set up the Driver Station laptop, connect to the robot, and show the right auto selected.")),
      sk("d12", "Move the robot to the field", "on the cart, lifted the team's way, battery in, bumpers on", ["d1"], "", demoOnly("Take the robot from the pit to a practice field on the cart and lift it on using the team's lift method.")),
      sk("d9", "Inspection ready", "bumpers, frame perimeter, battery strapped, no bare copper", ["d2"], "", demoOnly("Walk a mentor around the robot as an inspector would, and catch the problem they planted.")),
      sk("d10", "Fault triage", "no comms, brownout, a CAN light, a dead mechanism: check in order; a mentor repairs anything with exposed power", ["d2"], "", demoOnly("Find the cause of a fault a mentor sets up, in the triage order."))
    ] },
    { id: "brot", name: "Battery Rotation", req: ["pitb"], skills: [
      sk("d3", "Charge, test, and log batteries", "Battery Beak: over 20 milliohms stays off the robot (FRCElectrical.org)", [], fel("Battery/#maintaining-your-battery"), demoOnly("Test three batteries, log each one, and pull any over 20 milliohms.")),
      sk("d4", "Swap a battery fast", "strap, connector, breaker, under 60 seconds", ["d3"], "", demoOnly("Swap a battery in under 60 seconds with the strap tight and the connector clicked."))
    ] },
    { id: "drvb", name: "Driving Basics", req: ["pitb"], skills: [
      sk("d5", "Robot driving 101", "field-relative swerve; area clear, a spotter ready to disable", [], "", demoOnly("Drive a figure-eight field-relative with a spotter ready to disable.")),
      sk("d14", "Drive team roles", "driver, operator, coach, human player; who calls a disable", ["d5"], "", test("What each drive-team role does in a match, and who calls a disable and how.")),
      sk("d15", "Game rules and penalties", "this season's game manual: scoring, fouls, and what gets a card", ["d14"], "", test("Five fouls a driver can cause this season, and what each one costs.")),
      sk("d6", "Controls map", "every button on both controllers", ["d5"], "", demoOnly("In a practice drive, use each control the moment a mentor calls it."))
    ] },
    { id: "drvp", name: "Driver Practice", req: ["drvb"], skills: [
      sk("d7", "Cycle drills", "score, return, repeat, timed against the coach's target", [], "", demoOnly("Run five score-and-return cycles with an average under the target time on the drill sheet.")),
      sk("d8", "Practice match", "a full match with the pit crew; enter and leave the field when the field crew says, disable if the robot misbehaves", ["d7"], "", demoOnly("Drive a full practice match with the pit crew and stop the robot at once when a mentor calls it.")),
      sk("d13", "Match debrief", "what happened, why, and one change, from video or the log", ["d8"], "", demoOnly("Lead a five-minute debrief from match video or the log, ending in one change the team agrees to make."))
    ] }
  ] }
];
var BYID = {}; TREES.forEach(function (t) { t.cats.forEach(function (c) { c.tree = t.id; c.skills.forEach(function (s) { s.cat = c.id; s.tree = t.id; BYID[s.id] = s; }); }); });
/* Machines a student may not run alone until the qualification is signed off. That sign-off is the written test and the demonstration. */
var PERMITS = [
  { cat: "miter", skill: "mt3", name: "Miter saw" },
  { cat: "drill", skill: "dp3", name: "Drill press" },
  { cat: "band", skill: "bw3", name: "Metal bandsaw" },
  { cat: "lathe", skill: "lt3", name: "Lathe" },
  { cat: "omio", skill: "om4", name: "OMIO router" },
  { cat: "laser", skill: "lr3", name: "R1 laser" }
];
function tree(id) { return TREES.filter(function (t) { return t.id === id; })[0]; }
function cat(t, id) { return t.cats.filter(function (c) { return c.id === id; })[0]; }

function seed(S) {
  var levels = { "Sam Ortiz": [1, .42, .45, .55, .2, .3], "Leo Brooks": [1, .28, .76, .2, .1, .6], "Priya Shah": [1, .18, .2, .4, .85, .3], "Ava Kim": [1, .52, .35, .7, .3, .2], "Jordan Lee": [.6, .08, 0, 0, 0, 0], "Maya Gold": [1, .38, .15, .1, .5, .1] };
  var prog = {};
  STUDENTS.forEach(function (st) {
    prog[st] = {};
    TREES.forEach(function (t, ti) {
      var all = []; t.cats.forEach(function (c) { c.skills.forEach(function (s) { all.push(s.id); }); });
      var n = Math.round(all.length * levels[st][ti]);
      all.slice(0, n).forEach(function (id) { prog[st][id] = { s: "done", by: ["Mr. Chen", "Ms. Rivera", "Mr. Okafor"][id.length % 3], at: "Oct " + (3 + (id.charCodeAt(1) % 25)) }; });
      if (n < all.length && levels[st][ti] > 0) prog[st][all[n]] = { s: "progress" };
    });
  });
  // keep order sensible: drop "done" marks whose prereqs aren't done
  STUDENTS.forEach(function (st) { Object.keys(prog[st]).forEach(function (id) { if (!skillOpenFor(prog[st], BYID[id]) && prog[st][id].s === "done") delete prog[st][id]; }); });
  S.sk = { prog: prog, student: "Sam Ortiz", tree: "elec", cat: null, requests: [ { st: "Leo Brooks", id: "om4", note: "Cut the intake plates on Saturday" }, { st: "Ava Kim", id: "el15", note: "" }, { st: "Maya Gold", id: "cd17", note: "Belt & Chain Gen on the 1B gearbox" } ], bulk: { id: "s9", picks: {} }, ai: null };
}
function skillOpenFor(p, s) { return s.req.every(function (r) { return p[r] && p[r].s === "done"; }); }

/* Status, from one student's progress */
function treeDone(p, t) { return t.cats.every(function (c) { return c.skills.every(function (s) { return p[s.id] && p[s.id].s === "done"; }); }); }
function treeLocked(p, t) { return t.req && !treeDone(p, tree(t.req)); }
function catCounts(p, c) { var d = 0; c.skills.forEach(function (s) { if (p[s.id] && p[s.id].s === "done") d++; }); return d; }
function catWait(p, t, c) {
  var names = [];
  if (treeLocked(p, t)) names.push(tree(t.req).name);
  c.req.forEach(function (r) { var rc = cat(t, r); if (catCounts(p, rc) < rc.skills.length) names.push(rc.name); });
  return names;
}
function catStatus(p, t, c) {
  if (treeLocked(p, t)) return "locked";
  if (c.req.some(function (r) { var rc = cat(t, r); return catCounts(p, rc) < rc.skills.length; })) return "locked";
  var d = catCounts(p, c);
  if (d === c.skills.length) return "complete";
  if (d > 0 || c.skills.some(function (s) { return p[s.id] && p[s.id].s === "progress"; })) return "progress";
  return "available";
}
function skillStatus(st, p, t, c, s) {
  if (p[s.id] && p[s.id].s === "done") return "complete";
  if (catStatus(p, t, c) === "locked" || !skillOpenFor(p, s)) return "locked";
  if (D.S.sk.requests.some(function (r) { return r.st === st && r.id === s.id; })) return "requested";
  if (p[s.id] && p[s.id].s === "progress") return "progress";
  return "available";
}
function treePct(p, t) { var all = 0, d = 0; t.cats.forEach(function (c) { all += c.skills.length; d += catCounts(p, c); }); return { pct: D.pct(d, all), d: d, all: all }; }

/* Layered layout: each node one row below its deepest prerequisite; rows ordered by the parents' positions.
   Side padding is reserved so a line that skips a row can run down the margin instead of through a box. */
var NW = 150, NH = 56, GX = 14, GY = 26;
function layout(nodes, W, H, GX, GY) {
  var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
  var layer = {};
  function L(n) { if (layer[n.id] != null) return layer[n.id]; var reqs = n.req.filter(function (r) { return byId[r]; }); layer[n.id] = reqs.length ? 1 + Math.max.apply(null, reqs.map(function (r) { return L(byId[r]); })) : 0; return layer[n.id]; }
  nodes.forEach(L);
  var rows = []; nodes.forEach(function (n) { (rows[layer[n.id]] = rows[layer[n.id]] || []).push(n); });
  var maxRow = Math.max.apply(null, rows.map(function (r) { return r.length; }));
  var PAD = 24;
  var width = Math.max(1, maxRow) * (W + GX) - GX + 2 * PAD, pos = {};
  rows.forEach(function (row, li) {
    if (li > 0) row.sort(function (a, b) { return bary(a) - bary(b); });
    var rowW = row.length * (W + GX) - GX, x0 = (width - rowW) / 2;
    row.forEach(function (n, i) { pos[n.id] = { x: x0 + i * (W + GX), y: GY / 2 + li * (H + GY) }; });
  });
  function bary(n) { var ps = n.req.filter(function (r) { return pos[r]; }); return ps.length ? ps.reduce(function (a, r) { return a + pos[r].x; }, 0) / ps.length : 0; }
  var height = rows.length * (H + GY) + GY / 2;
  var edges = []; nodes.forEach(function (n) { n.req.forEach(function (r) { if (pos[r]) edges.push({ from: r, to: n.id }); }); });
  var order = []; rows.forEach(function (row) { row.forEach(function (n) { order.push(n); }); });
  return { pos: pos, width: width, height: height, edges: edges, layer: layer, order: order };
}
function roundedPolyline(pts) {
  var rad = 8, d = "M" + pts[0][0] + " " + pts[0][1];
  for (var i = 1; i < pts.length - 1; i++) {
    var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    var v1x = p0[0] - p1[0], v1y = p0[1] - p1[1], v2x = p2[0] - p1[0], v2y = p2[1] - p1[1];
    var l1 = Math.sqrt(v1x * v1x + v1y * v1y), l2 = Math.sqrt(v2x * v2x + v2y * v2y);
    var rr = Math.min(rad, l1 / 2, l2 / 2);
    if (rr < 1) { d += " L" + p1[0] + " " + p1[1]; continue; }
    d += " L" + (p1[0] + v1x / l1 * rr) + " " + (p1[1] + v1y / l1 * rr) + " Q" + p1[0] + " " + p1[1] + " " + (p1[0] + v2x / l2 * rr) + " " + (p1[1] + v2y / l2 * rr);
  }
  var last = pts[pts.length - 1];
  return d + " L" + last[0] + " " + last[1];
}
/* A line to the next row stays in the gap. A line that skips a row goes out to the margin first. */
function edgePoints(a, b, W, H, GY, width) {
  var x1 = a.x + W / 2, y1 = a.y + H, x2 = b.x + W / 2, y2 = b.y;
  if (y2 - y1 <= GY + 1) {
    var ym = (y1 + y2) / 2;
    return Math.abs(x1 - x2) < 1 ? [[x1, y1], [x2, y2]] : [[x1, y1], [x1, ym], [x2, ym], [x2, y2]];
  }
  var lane = (x1 + x2) / 2 < width / 2 ? 11 : width - 11;
  var yOut = y1 + GY / 2, yIn = y2 - GY / 2;
  return [[x1, y1], [x1, yOut], [lane, yOut], [lane, yIn], [x2, yIn], [x2, y2]];
}
function edgePath(a, b, W, H, GY, width) { return roundedPolyline(edgePoints(a, b, W, H, GY, width)); }
function graph(nodes, renderNode, doneEdge) {
  var W = NW, g = layout(nodes, W, NH, GX, GY);
  /* A wide row narrows the nodes (down to 124) so the tree fits the card without sideways scrolling. */
  var avail = Math.min(window.innerWidth, 1120) - 48 - 34;
  if (g.width > avail) { var per = Math.round((g.width + GX - 48) / (W + GX)); W = Math.max(124, Math.min(NW, Math.floor((avail - 48 + GX) / per) - GX)); g = layout(nodes, W, NH, GX, GY); }
  var svg = '<svg width="' + g.width + '" height="' + g.height + '" aria-hidden="true">' + g.edges.map(function (e) { return '<path class="' + (doneEdge(e.from) ? "done" : "") + '" d="' + edgePath(g.pos[e.from], g.pos[e.to], W, NH, GY, g.width) + '"/>'; }).join("") + "</svg>";
  return '<div class="graphwrap" data-keepscroll="skillgraph"><div class="graph" style="width:' + g.width + "px;height:" + g.height + 'px">' + svg +
    nodes.map(function (n) { var p = g.pos[n.id]; return renderNode(n, 'style="left:' + p.x + "px;top:" + p.y + "px;width:" + W + "px;height:" + NH + 'px"'); }).join("") + "</div></div>";
}
/* On a phone the same nodes are an indented list in dependency order. renderRow(node, depthClass) returns one row. */
function stepList(nodes, renderRow) {
  var g = layout(nodes, NW, NH, GX, GY);
  return '<div class="sklist">' + g.order.map(function (n) { return renderRow(n, "d" + Math.min(g.layer[n.id], 4)); }).join("") + "</div>";
}
var mqPhone = window.matchMedia("(max-width: 640px)");
function isPhone() { return mqPhone.matches; }
function onPhoneChange() { if (D.S && D.S.route === "skills") D.render(); }
if (mqPhone.addEventListener) mqPhone.addEventListener("change", onPhoneChange); else if (mqPhone.addListener) mqPhone.addListener(onPhoneChange);
var MARK = { complete: "✓", requested: "…", progress: "●", available: "", locked: "" };
var WORD = { complete: "Complete", requested: "Waiting for sign-off", progress: "In progress", available: "Available", locked: "Locked" };
var DOT = { complete: "ok", requested: "info", progress: "warn", available: "info", locked: "" };
var LEGEND = '<p class="sklegend"><span><i class="dotc k-locked"></i>Locked</span><span><i class="dotc k-available"></i>Available</span><span><i class="dotc k-progress"></i>In progress</span><span><i class="dotc k-requested"></i>Waiting</span><span><i class="dotc k-complete"></i>Complete</span></p>';
function tag(t) { return '<span class="sktag" aria-hidden="true">' + t.tag + "</span>"; }

/* ---------- Views ---------- */
D.views.skills = function () {
  var S = D.S, staff = D.isStaff();
  var list = [["overview", "Overview"], ["trees", "Skill trees"], ["permits", "Permissions"]];
  if (staff) { list.unshift(["signoff", "Sign off", S.sk.requests.length || ""]); list.push(["edit", "Edit trees"]); }
  var t = D.tab("skills", staff ? "signoff" : "overview"), body;
  if (t === "overview") body = overview();
  else if (t === "permits") body = permitsView();
  else if (t === "signoff" && staff) body = signoffView();
  else if (t === "edit" && staff) body = editView();
  else if (t === "trees") body = treesView();
  else body = staff ? signoffView() : overview();
  return D.topbar("Skills", "", D.tabsFor("skills", list, staff ? "signoff" : "overview"), "") + '<div class="content skills">' + body + "</div>";
};
var readyAll = false;
/* What this student can do next: open skills, grouped by where they stand. */
function nextUp(name) {
  var P = D.S.sk.prog[name], out = { ready: [], prog: [], wait: [] };
  TREES.forEach(function (t) {
    t.cats.forEach(function (c) {
      var cs = catStatus(P, t, c);
      c.skills.forEach(function (s) {
        var stt = skillStatus(name, P, t, c, s);
        if (stt === "available") out.ready.push({ s: s, t: t, c: c, hot: cs === "progress" });
        else if (stt === "progress") out.prog.push({ s: s, t: t, c: c });
        else if (stt === "requested") out.wait.push({ s: s, t: t, c: c });
      });
    });
  });
  out.ready.sort(function (a, b) { return (b.hot ? 1 : 0) - (a.hot ? 1 : 0); });
  return out;
}
function skillRow(x, word, kind) {
  return '<button class="li" data-act="skmine" data-v="' + x.s.id + '"><span class="grow"><b>' + esc(x.s.name) + '</b><br><span class="who">' + esc(x.t.name) + " › " + esc(x.c.name) + '</span></span><span class="pill ' + kind + '">' + word + '</span><span class="chev" aria-hidden="true">›</span></button>';
}
function treeRows(P, staff) {
  return TREES.map(function (t) {
    var line, pct, extra = "";
    if (staff) {
      pct = Math.round(STUDENTS.reduce(function (a, st) { return a + treePct(P[st], t).pct; }, 0) / STUDENTS.length);
      var fin = STUDENTS.filter(function (st) { return treeDone(P[st], t); }).length;
      line = "Team average · " + fin + " of " + STUDENTS.length + " finished";
    } else {
      var r = treePct(P, t); pct = r.pct;
      line = treeLocked(P, t) ? "Open to read. Start after " + tree(t.req).name : r.d + " of " + r.all + " skills";
    }
    return '<button class="li sktree' + (!staff && treeLocked(P, t) ? " locked" : "") + '" data-act="sktree" data-v="' + t.id + '">' + tag(t) + '<span class="grow"><b>' + esc(t.name) + '</b><br><span class="who">' + esc(line) + '</span></span><span class="skpct"><span class="bar"><i class="' + (pct === 100 ? "ok" : "") + '" style="width:' + pct + '%"></i></span><span class="num">' + pct + '%</span></span><span class="chev" aria-hidden="true">›</span></button>';
  }).join("");
}
function overview() {
  var S = D.S, P = S.sk.prog, staff = D.isStaff(), html = "";
  if (!staff) {
    var me = D.me().name, n = nextUp(me), cap = readyAll ? n.ready.length : 5;
    html += '<div class="card"><div class="row between"><h2>Ready to start</h2>' + (n.ready.length ? '<span class="tcount">' + n.ready.length + "</span>" : "") + "</div>" +
      (n.ready.length ? '<div class="list">' + n.ready.slice(0, cap).map(function (x) { return skillRow(x, "Ready", "info"); }).join("") + "</div>" + (n.ready.length > 5 ? '<div><button class="btn ghost" data-act="skreadyall">' + (readyAll ? "Show fewer" : "Show all " + n.ready.length) + "</button></div>" : "") : '<p class="mute">Nothing new is open. Finish what you started.</p>') + "</div>";
    html += '<div class="card"><div class="row between"><h2>In progress</h2>' + (n.prog.length ? '<span class="tcount">' + n.prog.length + "</span>" : "") + "</div>" +
      (n.prog.length ? '<div class="list">' + n.prog.map(function (x) { return skillRow(x, "In progress", "warn"); }).join("") + "</div>" : '<p class="mute">Nothing in progress. Pick a skill above to start.</p>') + "</div>";
    if (n.wait.length) html += '<div class="card"><div class="row between"><h2>Waiting for sign-off</h2><span class="tcount">' + n.wait.length + '</span></div><div class="list">' + n.wait.map(function (x) { return skillRow(x, "Waiting for a mentor", "info"); }).join("") + "</div></div>";
  }
  html += '<div class="card"><h2>Skill trees</h2><div class="list">' + treeRows(staff ? P : P[D.me().name], staff) + "</div></div>";
  var rows = STUDENTS.map(function (st) {
    var all = 0, d = 0, prog = 0;
    var cells = TREES.map(function (t) { var r = treePct(P[st], t); all += r.all; d += r.d; return '<td class="num pc ' + (r.pct === 100 ? "full" : r.pct ? "" : "zero") + '">' + r.pct + "%</td>"; }).join("");
    Object.keys(P[st]).forEach(function (k) { if (P[st][k].s === "progress") prog++; });
    return '<tr class="click" data-act="skstudent" data-v="' + esc(st) + '"><td><b>' + esc(st) + "</b>" + (st === "Sam Ortiz" && S.role === "student" ? ' <span class="who">(you)</span>' : "") + "</td>" + cells + '<td class="num">' + d + '</td><td class="num">' + prog + '</td><td class="num">' + D.pct(d, all) + "%</td></tr>";
  }).join("");
  html += '<div class="card"><div class="row between"><h2>Students</h2><span class="who">Tap a row to open their trees.</span></div><div class="tablewrap"><table class="sktable"><thead><tr><th>Student</th>' + TREES.map(function (t) { return '<th title="' + esc(t.name) + '">' + t.tag + "</th>"; }).join("") + "<th>Done</th><th>Started</th><th>Overall</th></tr></thead><tbody>" + rows + "</tbody></table></div></div>";
  return html;
}
function permitState(p, tool) {
  var c = cat(tree("mfg"), tool.cat);
  if (p[tool.skill] && p[tool.skill].s === "done") return "yes";
  if (c.skills.some(function (s) { return p[s.id]; })) return "training";
  return "no";
}
function permitsView() {
  var P = D.S.sk.prog;
  var heads = PERMITS.map(function (tool) {
    var n = STUDENTS.filter(function (st) { return permitState(P[st], tool) === "yes"; }).length;
    return "<th>" + esc(tool.name) + '<br><span class="who">' + n + " of " + STUDENTS.length + "</span></th>";
  }).join("");
  var rows = STUDENTS.map(function (st) {
    var you = st === "Sam Ortiz" && D.S.role === "student" ? ' <span class="who">(you)</span>' : "";
    var cells = PERMITS.map(function (tool) {
      var state = permitState(P[st], tool);
      var rec = P[st][tool.skill];
      var label = state === "yes" ? "Yes" : state === "training" ? "Training" : "No";
      var cls = state === "yes" ? "ok" : state === "training" ? "warn" : "";
      var tip = state === "yes" ? "Signed off by " + rec.by + " · " + rec.at : state === "training" ? "Started. The qualification is not signed off." : "Not started. May not run this tool alone.";
      return '<td><button class="pill skperm ' + cls + '" data-act="skpermit" data-st="' + esc(st) + '" data-cat="' + tool.cat + '" data-skill="' + tool.skill + '" title="' + esc(tip) + '">' + label + "</button></td>";
    }).join("");
    return "<tr><td><b>" + esc(st) + "</b>" + you + "</td>" + cells + "</tr>";
  }).join("");
  return '<div class="card"><div><h2>Who can use which machine</h2><p class="who">Yes means the written test and the demonstration are signed off. Tap a cell to open that skill.</p></div><div class="tablewrap"><table class="sktable skperms"><thead><tr><th>Student</th>' + heads + "</tr></thead><tbody>" + rows + "</tbody></table></div></div>";
}
function studentPicker() {
  var S = D.S;
  return '<div class="field skstudent"><label for="sk-st">Student</label><select id="sk-st" data-change="skstudent">' + STUDENTS.map(function (st) { return "<option" + (st === S.sk.student ? " selected" : "") + ">" + esc(st) + "</option>"; }).join("") + "</select></div>";
}
function treesView() {
  var S = D.S, st = S.sk.student, P = S.sk.prog[st], t = tree(S.sk.tree);
  var chips = '<div class="chips skchips" role="group" aria-label="Skill trees">' + TREES.map(function (x) {
    var r = treePct(P, x);
    return '<button class="chip' + (treeLocked(P, x) ? " locked" : "") + '" data-act="sktree" data-v="' + x.id + '" aria-pressed="' + (x.id === t.id) + '">' + esc(x.name) + ' <span class="pct">' + r.pct + "%</span></button>";
  }).join("") + "</div>";
  var head = '<div class="skhead">' + chips + (D.isStaff() || st !== "Sam Ortiz" ? studentPicker() : "") + "</div>";
  if (S.sk.cat) return head + catGraph(st, P, t, cat(t, S.sk.cat));
  var r = treePct(P, t), locked = treeLocked(P, t);
  var node = function (c, style) {
    var stt = catStatus(P, t, c), d = catCounts(P, c);
    return '<button class="gnode ' + stt + '" ' + style + ' data-act="skcat" data-v="' + c.id + '" title="' + esc(c.name + " · " + (stt === "locked" ? "Open to read. Start after the level before it." : WORD[stt])) + '">' + (MARK[stt] ? '<span class="mark">' + MARK[stt] + "</span>" : "") + "<b>" + esc(c.name) + '</b><span class="gline"><span class="gbar"><i style="width:' + D.pct(d, c.skills.length) + '%"></i></span><span class="gcount">' + d + "/" + c.skills.length + "</span></span></button>";
  };
  var row = function (c, dc) {
    var stt = catStatus(P, t, c), d = catCounts(P, c);
    return '<button class="skrow ' + stt + " " + dc + '" data-act="skcat" data-v="' + c.id + '"><span class="skmark">' + MARK[stt] + '</span><span class="sktxt"><b>' + esc(c.name) + '</b><span class="who">' + d + " of " + c.skills.length + " skills · " + (stt === "locked" ? "Open to read" : WORD[stt]) + '</span></span><span class="chev" aria-hidden="true">›</span></button>';
  };
  var done = function (id) { var c = cat(t, id); return catCounts(P, c) === c.skills.length; };
  return head + '<div class="card"><div class="row between nowrap">' + '<div class="row nowrap">' + tag(t) + '<div><h2>' + esc(t.name) + '</h2><span class="who">' + esc(t.note) + (locked ? " You can read it. Start a skill after " + esc(tree(t.req).name) + " is complete." : "") + '</span></div></div><span class="who skcount">' + r.d + " of " + r.all + " skills</span></div>" +
    (isPhone() ? stepList(t.cats, row) : LEGEND + graph(t.cats, node, done)) + '<p class="small mute">Open any category to read it. A skill stays locked until the level before it is finished.</p></div>';
}
function catGraph(st, P, t, c) {
  var d = catCounts(P, c);
  var node = function (s, style) {
    var stt = skillStatus(st, P, t, c, s);
    return '<button class="gnode ' + stt + '" ' + style + ' data-act="skskill" data-v="' + s.id + '" title="' + esc(s.name + (s.sum ? " — " + s.sum : "")) + '">' + (MARK[stt] ? '<span class="mark">' + MARK[stt] + "</span>" : "") + "<b>" + esc(s.name) + "</b></button>";
  };
  var row = function (s, dc) {
    var stt = skillStatus(st, P, t, c, s), after = s.req.filter(function (r) { return BYID[r]; }).map(function (r) { return BYID[r].name; });
    return '<button class="skrow ' + stt + " " + dc + '" data-act="skskill" data-v="' + s.id + '"><span class="skmark">' + MARK[stt] + '</span><span class="sktxt"><b>' + esc(s.name) + '</b><span class="who">' + WORD[stt] + (after.length && stt !== "complete" ? " · after " + esc(after.join(", ")) : "") + '</span></span><span class="chev" aria-hidden="true">›</span></button>';
  };
  var done = function (id) { return P[id] && P[id].s === "done"; };
  var wait = catWait(P, t, c);
  return '<div class="card"><div class="row between nowrap"><div class="row nowrap"><button class="btn sm" data-act="skback" aria-label="Back to ' + esc(t.name) + '">← ' + esc(t.name) + '</button><div><p class="eyebrow">' + esc(st) + "</p><h2>" + esc(c.name) + "</h2>" + (wait.length ? '<span class="who">You can read these. Start them after ' + esc(wait.join(", ")) + ".</span>" : "") + '</div></div><span class="who skcount">' + d + " of " + c.skills.length + " skills</span></div>" +
    (isPhone() ? stepList(c.skills, row) : LEGEND + graph(c.skills, node, done)) + "</div>";
}
function linkLabel(url) {
  var host = url.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  if (host === "frcdesign.org") return "FRCDesign.org lesson";
  if (host === "frcelectrical.org") return "FRCElectrical.org lesson";
  if (host === "docs.wpilib.org") return "WPILib docs";
  if (host === "docs.oracle.com") return "Java tutorial";
  if (host === "docs.github.com") return "Git guide";
  if (host === "docs.advantagescope.org") return "AdvantageScope docs";
  if (host === "choreo.autos") return "Choreo docs";
  if (host === "docs.wcproducts.com") return "WCP guide";
  if (host === "wiki.bambulab.com" || host === "bambulab.com") return "Bambu guide";
  if (host === "youtube.com" || host === "youtu.be") return "Video";
  if (host === "grizzly.com") return "Metal bandsaw video";
  if (host === "support.grizzly.com") return "Metal bandsaw FAQ";
  if (host === "osha.gov") return "OSHA machine guarding";
  if (host === "mechmaxx.com") return "Similar lathe page";
  return "Guide";
}
function checkCopy(s) {
  if (!s.checks) return "";
  if (s.checks.review) return "<p><b>Onshape review.</b> " + esc(s.checks.review) + "</p>";
  var test = s.checks.test || "", demo = s.checks.demo || "", html = "";
  if (test) html += "<p><b>Written test.</b> " + esc(test) + "</p>";
  if (demo) html += "<p><b>Demonstration.</b> " + esc(demo) + "</p>";
  if (test && demo) html += '<p class="mute">You need both.</p>';
  return html;
}
D.drawers.skill = function (d) {
  var S = D.S, s = BYID[d.id], t = tree(s.tree), c = cat(t, s.cat), st = S.sk.student, P = S.sk.prog[st], stt = skillStatus(st, P, t, c, s), rec = P[s.id];
  var self = S.role === "student" && st === "Sam Ortiz", staff = D.isStaff();
  var acts = "";
  if (staff && stt !== "complete" && stt !== "locked") acts = '<button class="btn primary" data-act="sksignoff" data-v="' + s.id + '">' + D.ic("check", 16) + " Sign off " + esc(st.split(" ")[0]) + '</button><button class="btn" data-act="skprogress" data-v="' + s.id + '">Mark in progress</button>';
  else if (staff && stt === "complete") acts = '<button class="btn danger" data-act="skunsign" data-v="' + s.id + '">Remove sign-off</button>';
  else if (self && (stt === "available" || stt === "progress")) acts = '<button class="btn primary" data-act="skrequest" data-v="' + s.id + '">Request sign-off</button>' + (stt === "available" ? '<button class="btn" data-act="skprogress" data-v="' + s.id + '">I\'m working on it</button>' : "");
  else if (self && stt === "requested") acts = '<button class="btn" data-act="skcancelreq" data-v="' + s.id + '">Cancel request</button>';
  var reqs = s.req.map(function (r) { var ok = P[r] && P[r].s === "done"; return '<div class="li"><span class="pill ' + (ok ? "ok" : "") + '">' + (ok ? "Done" : "Needed") + "</span>" + esc(BYID[r].name) + "</div>"; }).join("");
  var sumText = s.sum ? s.sum.charAt(0).toUpperCase() + s.sum.slice(1) + "." : "";
  var onshape = s.url.indexOf("frcdesign.org") !== -1;
  var link = s.url
    ? '<p><a class="vlink" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(linkLabel(s.url)) + " ↗</a>" + (onshape && !s.checks ? " A mentor reviews your Onshape document and signs it off." : "") + "</p>"
    : "";
  var guide = (sumText ? "<p>" + esc(sumText) + "</p>" : "") + link + checkCopy(s);
  if (!s.url && !s.checks) guide += "<p>A mentor watches you do it once and signs it off.</p>";
  return D.drawerHead(t.name + " › " + c.name, s.name) +
    '<div class="row"><span class="pill ' + DOT[stt] + '">' + WORD[stt] + '</span><span class="who">for ' + esc(st) + "</span></div>" +
    guide +
    (reqs ? '<div><p class="flabel">Needs first</p><div class="list">' + reqs + "</div></div>" : "") +
    (rec && rec.s === "done" ? '<p class="who">Signed off by ' + esc(rec.by) + " · " + esc(rec.at) + "</p>" : "") +
    (acts ? '<div class="row skacts">' + acts + "</div>" : stt === "locked" ? '<p class="mute">' + (catWait(P, t, c).length ? "You can read this. Start it after " + esc(catWait(P, t, c).join(", ")) + "." : "Finish the skill before this one before you start it.") + "</p>" : "");
};
function signoffView() {
  var S = D.S, b = S.sk.bulk, s = BYID[b.id];
  var opts = TREES.map(function (t) { return '<optgroup label="' + esc(t.name) + '">' + t.cats.map(function (c) { return c.skills.map(function (x) { return '<option value="' + x.id + '"' + (x.id === b.id ? " selected" : "") + ">" + esc(c.name + " › " + x.name) + "</option>"; }).join(""); }).join("") + "</optgroup>"; }).join("");
  var people = STUDENTS.map(function (st) {
    var p = S.sk.prog[st], t = tree(s.tree), c = cat(t, s.cat), stt = skillStatus(st, p, t, c, s);
    var can = stt !== "complete" && stt !== "locked";
    return '<div class="skpick"><button class="bigcheck sm" data-act="skbulkpick" data-v="' + esc(st) + '" aria-pressed="' + !!b.picks[st] + '"' + (can ? "" : " disabled") + ' aria-label="Pick ' + esc(st) + '">' + D.ic("check", 22) + "</button><b>" + esc(st) + '</b><span class="pill ' + (stt === "complete" ? "ok" : stt === "locked" ? "" : "info") + '">' + ({ complete: "Done", locked: "Locked", requested: "Asked", progress: "In progress", available: "Available" })[stt] + "</span></div>";
  }).join("");
  var n = Object.keys(b.picks).filter(function (k) { return b.picks[k]; }).length;
  var queue = S.sk.requests.length ? S.sk.requests.map(function (r, i) {
    var x = BYID[r.id];
    return '<div class="li skq"><span class="grow"><b>' + esc(r.st) + "</b> asks for <b>" + esc(x.name) + '</b><br><span class="who">' + esc(tree(x.tree).name) + " › " + esc(cat(tree(x.tree), x.cat).name) + (r.note ? " · “" + esc(r.note) + "”" : "") + '</span></span><span class="skqa"><button class="btn" data-act="skqok" data-i="' + i + '">Sign off</button><button class="btn ghost" data-act="skqno" data-i="' + i + '">Not yet</button></span></div>';
  }).join("") : '<p class="mute">No one is waiting for a sign-off.</p>';
  return '<div class="grid2"><div class="card"><div class="row between"><h2>Waiting for sign-off</h2>' + (S.sk.requests.length ? '<span class="tcount warn">' + S.sk.requests.length + "</span>" : "") + '</div><div class="list">' + queue + '</div></div><div class="card"><div><h2>Sign off a group</h2><p class="who">Pick the skill, tick who did it.</p></div><div class="field"><label for="sk-bulk">Skill</label><select id="sk-bulk" data-change="skbulk">' + opts + "</select></div><div>" + people + '</div><div class="row"><button class="btn primary" data-act="skbulkgo"' + (n ? "" : " disabled") + ">Sign off " + n + " student" + (n === 1 ? "" : "s") + "</button></div></div></div>";
}
function editView() {
  var ai = D.S.sk.ai;
  return '<div class="grid2"><div class="card"><div><h2>Turn a doc into skills</h2><p class="who">Upload a team guide, then check the draft. Nothing changes until you accept it.</p></div>' +
    '<div class="row"><button class="btn" data-act="skaipick">Use “Battery wiring guide.pdf” (sample)</button></div>' +
    (ai ? '<div class="card flat"><p class="eyebrow">Draft · Electrical › Control System</p><div class="list">' + ai.map(function (x, i) { return '<div class="li"><span class="pill ' + (x.op === "Add" ? "ok" : "info") + '">' + x.op + '</span><span class="grow"><b>' + esc(x.name) + '</b><br><span class="who">' + esc(x.note) + '</span></span><button class="btn ghost sm" data-act="skaidrop" data-i="' + i + '">Drop</button></div>'; }).join("") + '</div><div class="row"><button class="btn primary" data-act="skaiaccept">Accept ' + ai.length + ' changes</button><button class="btn" data-act="skaidiscard">Discard</button></div></div>' : "") +
    '</div><div class="card"><div><h2>Edit by hand</h2><p class="who">Rename, reorder, add or remove trees, categories and skills.</p></div><div class="list">' +
    TREES.map(function (t) { return '<div class="li"><b class="grow">' + esc(t.name) + '</b><span class="who">' + t.cats.length + " categories</span><button class=\"btn ghost sm\">Edit</button></div>"; }).join("") +
    '</div><div class="row"><button class="btn sm">+ New tree</button><button class="btn sm">Export</button><button class="btn sm">Import file</button></div></div></div>';
}

/* ---------- Actions ---------- */
var A = D.acts;
A.sktree = function (b) { var S = D.S; S.sk.tree = b.dataset.v; S.sk.cat = null; S.tabs.skills = "trees"; D.render(); };
A.skpermit = function (b) { var S = D.S; S.sk.student = b.dataset.st; S.sk.tree = "mfg"; S.sk.cat = b.dataset.cat; D.openDrawer("skill", { id: b.dataset.skill }); };
A.skmine = function (b) { var S = D.S; S.sk.student = "Sam Ortiz"; D.openDrawer("skill", { id: b.dataset.v }); };
A.skreadyall = function () { readyAll = !readyAll; D.render(); };
A.skstudent = function (b) { var S = D.S; S.sk.student = b.dataset.v; S.sk.cat = null; S.tabs.skills = "trees"; D.render(); };
D.changes.skstudent = function (el) { D.S.sk.student = el.value; D.render(); };
A.skcat = function (b) { D.S.sk.cat = b.dataset.v; D.render(); };
A.skback = function () { D.S.sk.cat = null; D.render(); };
A.skskill = function (b) { D.openDrawer("skill", { id: b.dataset.v }); };
function setDone(st, id) {
  var s = BYID[id], t = tree(s.tree), c = cat(t, s.cat);
  if (skillStatus(st, D.S.sk.prog[st], t, c, s) === "locked") return false;
  D.S.sk.prog[st][id] = { s: "done", by: D.me().name, at: "Nov 10" }; D.S.sk.requests = D.S.sk.requests.filter(function (r) { return !(r.st === st && r.id === id); });
  return true;
}
A.sksignoff = function (b) {
  var S = D.S, st = S.sk.student, id = b.dataset.v, prev = S.sk.prog[st][id];
  D.withUndo("Signed off " + st + " on " + BYID[id].name, function () { setDone(st, id); D.log("signed off " + st + " on " + BYID[id].name, "skills"); if (st === "Sam Ortiz") D.notify("student", "skills", D.me().name + " signed you off on " + BYID[id].name + "."); }, function () { if (prev) S.sk.prog[st][id] = prev; else delete S.sk.prog[st][id]; S.activity.shift(); });
};
A.skunsign = function (b) { var S = D.S; delete S.sk.prog[S.sk.student][b.dataset.v]; D.toast("Sign-off removed."); D.render(); };
A.skprogress = function (b) {
  var S = D.S, st = S.sk.student, id = b.dataset.v, s = BYID[id], t = tree(s.tree), c = cat(t, s.cat);
  if (skillStatus(st, S.sk.prog[st], t, c, s) === "locked") { D.toast("Finish the level before this one first."); D.render(); return; }
  S.sk.prog[st][id] = { s: "progress" }; D.render();
};
A.skrequest = function (b) {
  var S = D.S, id = b.dataset.v, s = BYID[id], t = tree(s.tree), c = cat(t, s.cat);
  if (skillStatus("Sam Ortiz", S.sk.prog["Sam Ortiz"], t, c, s) === "locked") { D.toast("Finish the level before this one first."); D.render(); return; }
  S.sk.requests.push({ st: "Sam Ortiz", id: id, note: "" }); S.sk.prog["Sam Ortiz"][id] = S.sk.prog["Sam Ortiz"][id] || { s: "progress" };
  D.notify(["mentor", "admin"], "skills", "Sam Ortiz asked for a sign-off on " + BYID[id].name + "."); D.log("asked for a sign-off on " + BYID[id].name, "skills");
  D.toast("Asked. Mentors get a notice."); D.render();
};
A.skcancelreq = function (b) { var S = D.S; S.sk.requests = S.sk.requests.filter(function (r) { return !(r.st === "Sam Ortiz" && r.id === b.dataset.v); }); D.render(); };
A.skqok = function (b) { var S = D.S, r = S.sk.requests[+b.dataset.i]; if (!setDone(r.st, r.id)) { D.toast("Finish the level before this one first."); D.render(); return; } D.log("signed off " + r.st + " on " + BYID[r.id].name, "skills"); if (r.st === "Sam Ortiz") D.notify("student", "skills", D.me().name + " signed you off on " + BYID[r.id].name + "."); D.toast("Signed off " + r.st + "."); D.render(); };
A.skqno = function (b) { var S = D.S, r = S.sk.requests.splice(+b.dataset.i, 1)[0]; if (r.st === "Sam Ortiz") D.notify("student", "skills", D.me().name + " says not yet on " + BYID[r.id].name + ". Ask them what to practice."); D.render(); };
D.changes.skbulk = function (el) { D.S.sk.bulk = { id: el.value, picks: {} }; D.render(); };
A.skbulkpick = function (b) { var p = D.S.sk.bulk.picks; p[b.dataset.v] = !p[b.dataset.v]; D.render(); };
A.skbulkgo = function () { var S = D.S, b = S.sk.bulk, names = Object.keys(b.picks).filter(function (k) { return b.picks[k]; }); var done = names.filter(function (st) { return setDone(st, b.id); }); D.log("signed off " + done.length + " students on " + BYID[b.id].name, "skills"); b.picks = {}; D.toast("Signed off " + done.length + " on " + BYID[b.id].name + "."); D.render(); };
A.skaipick = function () { D.S.sk.ai = [ { op: "Add", name: "Inspect battery leads", note: "Before each match: cracks, loose lugs, heat marks" }, { op: "Add", name: "Torque SB50 terminals", note: "Needs: Large lugs" }, { op: "Add", name: "Label and log a battery", note: "Number, date, first use" }, { op: "Update", name: "Power distribution", note: "Adds “check the main breaker rating” to the description" } ]; D.render(); };
A.skaidrop = function (b) { D.S.sk.ai.splice(+b.dataset.i, 1); D.render(); };
A.skaidiscard = function () { D.S.sk.ai = null; D.render(); };
A.skaiaccept = function () {
  var S = D.S, c = cat(tree("elec"), "elctrl"), n = 0;
  S.sk.ai.forEach(function (x, i) { if (x.op === "Add") { var s = sk("ai" + i + Date.now(), x.name, x.note.toLowerCase(), [c.skills[n % c.skills.length].id]); s.cat = "elctrl"; s.tree = "elec"; c.skills.push(s); BYID[s.id] = s; n++; } });
  D.log("added " + n + " skills to Electrical › Control System", "skills"); S.sk.ai = null; S.sk.tree = "elec"; S.sk.cat = "elctrl"; S.tabs.skills = "trees"; D.toast(n + " skills added. Opened the category so you can see them."); D.render();
};

D.inits.push(function (S) {
  seed(S);
  S.notices.push({ to: "student", app: "skills", text: "Mr. Chen signed you off on Battery handling.", when: "Yesterday", read: false });
  S.notices.push({ to: "mentor", app: "skills", text: "2 students asked for a sign-off.", when: "1 h ago", read: false });
  S.activity.push({ who: "Mr. Chen", what: "signed off Sam Ortiz on Battery handling", app: "skills", when: "Mon" });
});
})();
