# Spoke Length Calculator

Work out the spoke lengths for both sides of a bicycle wheel from the rim's
ERD, the hub's flange measurements and the lacing pattern.

No dependencies, no build step, no framework. The geometry lives in one small
file that runs unchanged in a browser, in Node, and in the test suite.

**[Try the full version on Bikeshala →](https://bikeshala.com/tools/spoke-length-calculator/)**

```
Left  non-drive/disc        Right  drive side
294.2 mm                    292.4 mm
order 294 mm · 16 spokes    order 292 mm · 16 spokes
3-cross · brace 7.2°        3-cross · brace 3.5°
```

---

## Run it

```bash
git clone https://github.com/VishalSharmavj/spoke-length-calculator.git
cd spoke-length-calculator
python3 -m http.server 8000     # or: npm start
```

Then open <http://localhost:8000>.

It needs a server rather than opening `index.html` directly, because the
JavaScript is split into ES modules and browsers block module imports over
`file://`. Any static server will do.

```bash
npm test        # 15 tests, no dependencies, node --test
```

---

## Use the maths on its own

`js/geometry.js` imports nothing, so you can lift it straight out:

```js
import { wheel, spokeLength } from './js/geometry.js';

const w = wheel({
  erd: 602,              // effective rim diameter, mm
  holes: 32,             // spoke holes in the whole wheel
  spokeHole: 2.6,        // diameter of a hole in the hub flange
  left:  { flangeDiameter: 45, centreToFlange: 37, crosses: 3 },
  right: { flangeDiameter: 45, centreToFlange: 18, crosses: 3 }
});

w.left.length;        // 294.15
w.right.length;       // 292.38
w.dish;               // 9.5   — how far the rim sits off the hub's middle
w.balance;            // 48.9  — left tension as a % of right
w.slackSide;          // 'left'
w.left.bracingAngle;  // 7.19  — how far the spoke leans out of the wheel
w.left.nippleAngle;   // 81.74 — how squarely it meets the rim
```

Every length is millimetres, every angle degrees.

---

## How it works

### The one formula that matters

A spoke connects two points: one on the rim, one on the hub flange. Name them:

| | |
|---|---|
| `r` | rim radius — half the ERD |
| `f` | flange radius — half the diameter of the circle of spoke holes |
| `w` | centre-to-flange — how far that flange sits from the middle of the wheel |
| `a` | the angle the spoke sweeps round the hub |

Ignore the sideways offset for a moment and the two ends are just two points on
two circles, separated by the angle `a`. The law of cosines gives the distance
between them. Now put the offset back: it is perpendicular to everything else,
so Pythagoras finishes the job.

```
chord² = r² + f² − 2·r·f·cos(a)     in the flange's plane
spoke² = chord² + w²                stepping out to the rim
```

which collapses into the line every wheel-building calculator uses:

```
L = √(r² + f² + w² − 2·r·f·cos a) − hole/2
```

That last subtraction is an easy one to miss. A spoke is measured from the
**inside of its elbow**, and the elbow sits half a hole-diameter closer to the
axle than the centre of the hole it passes through.

### Where the crossing angle comes from

```
a = 720 × crosses / holes
```

Each flange carries half the wheel's holes, and only half of *those* lean the
same way — so one step round the flange, from one same-direction spoke to the
next, is `1440 / holes` degrees. A crossing is half a step. Multiply out and
you get 720.

For a 32-hole wheel laced 3-cross: `720 × 3 / 32 = 67.5°`.

### Two results that surprise people

**More crosses means a *longer* spoke, not a shorter one.**

```
32h, 45 mm flange, 18 mm centre-to-flange:

radial  277.8 mm
1-cross 279.6 mm
2-cross 284.8 mm
3-cross 292.4 mm
4-cross 301.1 mm
```

A radial spoke takes the shortest path that exists — straight out along the
radius. Every crossing swings the rim end further round the hub, and that can
only lengthen the journey. Radial wheels use the shortest spokes of all.

**The dished side of a wheel is the slack side.**

Each side pulls the rim towards its own flange with `tension × sin(bracing
angle)`, and at rest those two pulls cancel. The side that leans out further
therefore needs *less* tension to hold up its end. On a rear wheel that is the
left, which is exactly why left-side spokes go slack, unwind and break first.

The code never computes a force — the sine of the bracing angle is `w /
diagonal`, which is already sitting there:

```js
const pullLeft  = spec.left.centreToFlange  / left.diagonal;
const pullRight = spec.right.centreToFlange / right.diagonal;
```

### Rounding to a size you can buy

Spokes come in 2 mm steps, so the exact answer has to be rounded. The rule is
deliberately lopsided — **ties go down**:

```js
return shown - lower > 1.0 ? lower + STEP : lower;
```

A spoke a touch short still seats in the nipple and tensions up fine. A spoke a
touch long runs out of thread, bottoms out, and can push through the rim tape
and puncture the tube. So the calculator only rounds up when there is more than
a full millimetre to make up.

It also rounds to the displayed tenth first, so a length shown as `295.0` can
never quietly recommend 296 on the strength of a hundredth of a millimetre
nobody can see.

### How high a cross count will actually lace

A spoke has to leave its hole heading *outwards*. Push the cross count high
enough and the rim end swings so far round the hub that the spoke would have to
set off backwards and wrap around the flange to reach it.

The tipping point is where it leaves exactly tangentially:

```
r · cos(a) ≥ f
```

On a 32-hole hub, 4-cross needs a 90° sweep, so `r · cos(a)` is zero and the
spoke is right on the line. That is why 4-cross is a 36-hole build and 3-cross
is the sensible maximum on 32.

### Errors versus warnings

These are different things, and mixing them up makes a calculator annoying.

`validate()` returns the **blocking** problems — numbers that are missing or
impossible, where any answer would be a wrong answer. The UI shows these
*instead of* a result:

- an ERD that is really the rim's nominal size (`700` instead of `602`)
- a hole count that is not a multiple of 4
- a centre-to-flange measured from the locknut instead of the hub's middle
- a flange diameter measured across the whole disc instead of the hole circle

`warnings()` returns **advisory** notes — the numbers are sound, the build is
just awkward. These appear *alongside* the answer:

- a cross count past what the flange really takes
- a shallow nipple angle, where the spoke levers sideways on the nipple
- a bracing angle under 3°

The thresholds are set where they mean something. An early version warned below
4° of bracing angle, which fired on essentially every rear wheel ever built —
3.5° is just what the drive side of a dished wheel looks like.

---

## Layout

```
index.html              the UI
css/
  base.css              tokens, layout, inputs
  calculator.css        result cards, stats, warnings
js/
  geometry.js           the maths — pure functions, no DOM, no imports
  spokes.js             stock rounding, lacing verdicts, validation
  presets.js            typical rim and hub figures
  app.js                the only file that knows a browser exists
test/
  geometry.test.js      15 tests, node --test
docs/
  measuring.md          how to measure ERD, flange diameter, centre-to-flange
```

The split is the point. `geometry.js` has no imports at all, which is what lets
the same file serve the page and the test suite, and lets you drop it into
something else without taking the UI with it.

---

## Measure before you order

The maths is not the hard part. Every wrong answer comes from one of four
measurements, and **ERD is the one people get wrong** — a "700c" rim is 622 mm
at the bead seat but typically 590–610 mm at the spoke ends.

Two millimetres of error in the flange diameter is a whole stock size.

**[How to measure all four →](docs/measuring.md)**

The presets in `js/presets.js` are rounded, representative figures to start
from — not a manufacturer database. Measure the hub in front of you.

---

## What this version leaves out

This is a deliberately simplified build. It handles a standard wheel: two
flanges, evenly spaced holes, no rim offset.

The full version on Bikeshala also covers:

- **paired-hole flanges**, common on hub motors, where holes sit in twos and
  each flange needs two different spoke lengths
- **offset / asymmetric rims**, where the spoke bed is moved sideways
- **split cross counts** — different lacing left and right
- a **lock-nut measuring mode**, so you can enter what a caliper actually
  reaches rather than working out centre-to-flange yourself
- a **live cross-section drawing** of your wheel as you type
- a **cross-count picker** that shows which patterns your hub will take

**[Spoke Length Calculator on Bikeshala →](https://bikeshala.com/tools/spoke-length-calculator/)**

---

## Accuracy

The geometry here produces identical results to the full Bikeshala calculator —
verified to within 10⁻¹² mm across road, MTB, hub-motor and radial builds.

It is the same formula used by every wheel-building calculator, including
Sheldon Brown's, DT Swiss's and Park Tool's. Where calculators disagree it is
almost always because they disagree about ERD conventions, not about the maths.

**Measure twice, and buy one spare spoke.** A wheel is cheap to re-lace and
expensive to re-buy.

---

## Licence

MIT — see [LICENSE](LICENSE). Use it, fork it, build something better.
