/**
 * Spoke geometry.
 *
 * Pure functions. No DOM, no dependencies, no I/O — so this one file runs
 * unchanged in a browser, in Node, and in the test suite.
 *
 * Every number here is in millimetres, every angle in degrees.
 */

export const DEG = Math.PI / 180;

/**
 * How far round the hub a spoke travels before it reaches the rim.
 *
 * A spoke laced `crosses`-over has to pass `crosses` other spokes on its way
 * out. Each flange carries half the wheel's holes, and only half of those lean
 * the same way, so one "step" round the flange is 360 / (holes / 4) = 1440/holes
 * degrees... but a crossing is half a step, which leaves the familiar
 *
 *     angle = 720 * crosses / holes
 *
 * Radial lacing is crosses = 0, so the angle is 0 and the spoke runs straight
 * out along the radius.
 */
export function spokeAngle(holes, crosses) {
	return (720 * crosses) / holes;
}

/**
 * The length of one spoke on one side of the wheel.
 *
 * Picture the two ends of the spoke. The rim end sits on a circle of radius
 * `r = erd / 2`, in the plane running through the middle of the rim. The hub
 * end sits on a smaller circle of radius `f = flangeDiameter / 2`, offset
 * sideways by `w = centreToFlange`, and rotated round the axle by the angle
 * above.
 *
 * Flatten the sideways offset away and the two ends are just two points on two
 * circles, separated by that angle — the law of cosines gives the distance
 * between them. Put the offset back and it is one more perpendicular leg, so
 * Pythagoras finishes the job:
 *
 *     chord² = r² + f² - 2·r·f·cos(angle)      (in the flange's plane)
 *     spoke² = chord² + w²                     (stepping out to the rim)
 *
 * which collapses to the single line every wheel-building calculator uses:
 *
 *     L = √(r² + f² + w² - 2·r·f·cos a) - hole/2
 *
 * The final subtraction is because the spoke is measured from the *inside* of
 * the elbow, not from the centre of the hub's spoke hole, and the elbow sits
 * half a hole-diameter closer in.
 *
 * @param {object} side
 * @param {number} side.erd             Effective rim diameter (mm)
 * @param {number} side.flangeDiameter  Diameter of the circle of hub holes (mm)
 * @param {number} side.centreToFlange  Centreline of the rim to this flange (mm)
 * @param {number} side.holes           Spoke holes in the whole wheel
 * @param {number} side.crosses         Lacing pattern: 0 (radial), 1, 2, 3, 4
 * @param {number} [side.spokeHole=2.6] Diameter of a hole in the hub flange (mm)
 */
export function spokeLength(side) {
	const r = side.erd / 2;
	const f = side.flangeDiameter / 2;
	const w = side.centreToFlange;
	const hole = side.spokeHole === undefined ? 2.6 : side.spokeHole;
	const a = spokeAngle(side.holes, side.crosses);

	const chordSq = r * r + f * f - 2 * r * f * Math.cos(a * DEG);
	const diagonal = Math.sqrt(chordSq + w * w);

	return {
		angle: a,
		/** Hub hole centre to rim, before the elbow correction. */
		diagonal,
		/** What you actually order. */
		length: diagonal - hole / 2,
		bracingAngle: bracingAngle(w, diagonal),
		nippleAngle: nippleAngle(r, f, a, diagonal)
	};
}

/**
 * How far the spoke leans out of the wheel's plane.
 *
 * This is the angle that resists a sideways shove: a wheel with a tiny bracing
 * angle on one side (a deeply dished rear wheel, or a disc front) is the one
 * that goes out of true when you lean on it. Under about 4° is worth noticing.
 */
export function bracingAngle(centreToFlange, diagonal) {
	if (!(diagonal > 0)) return 0;
	return Math.asin(clamp(centreToFlange / diagonal, -1, 1)) / DEG;
}

/**
 * The angle the spoke makes with the rim at the nipple, where 90° is dead
 * radial — straight into the rim.
 *
 * As the cross count climbs the spoke approaches the rim at more of a slant,
 * and eventually it is levering sideways on the nipple instead of pulling
 * straight through it. Below roughly 75° you want a washer, a bend, or a rim
 * drilled on the correct angle.
 */
export function nippleAngle(rimRadius, flangeRadius, angle, diagonal) {
	if (!(diagonal > 0)) return 90;
	const cos = clamp((rimRadius - flangeRadius * Math.cos(angle * DEG)) / diagonal, -1, 1);
	return 90 - Math.acos(cos) / DEG;
}

/**
 * Both sides of a wheel at once, plus the things that only make sense when you
 * look at the pair: dish, and how the tension splits between them.
 *
 * @param {object} wheel
 * @param {number} wheel.erd
 * @param {number} wheel.holes
 * @param {number} [wheel.spokeHole=2.6]
 * @param {object} wheel.left   { flangeDiameter, centreToFlange, crosses }
 * @param {object} wheel.right  { flangeDiameter, centreToFlange, crosses }
 */
export function wheel(spec) {
	const common = {
		erd: spec.erd,
		holes: spec.holes,
		spokeHole: spec.spokeHole
	};
	const left = spokeLength({ ...common, ...spec.left });
	const right = spokeLength({ ...common, ...spec.right });

	/* Sideways force balance. Each side pulls the rim towards its own flange
	   with (tension x sin of its bracing angle), and at rest those cancel. So
	   the side that leans out more needs LESS tension to hold its end up — on a
	   dished rear wheel that is the left, which is why left-side spokes go
	   slack and break first. sin(bracing) is just w/diagonal, already to hand. */
	const pullLeft = left.diagonal > 0 ? spec.left.centreToFlange / left.diagonal : 0;
	const pullRight = right.diagonal > 0 ? spec.right.centreToFlange / right.diagonal : 0;

	let balance = 0;      // slack side's tension as a % of the tight side's
	let slackSide = null;
	if (pullLeft > 0 && pullRight > 0) {
		const ratio = pullLeft < pullRight ? pullLeft / pullRight : pullRight / pullLeft;
		balance = ratio * 100;
		slackSide = pullLeft > pullRight ? 'left' : 'right';
	}

	return {
		left,
		right,
		balance,
		slackSide,
		/** How far the rim sits from the midpoint of the two flanges. */
		dish: (spec.left.centreToFlange - spec.right.centreToFlange) / 2,
		spokesPerFlange: spec.holes / 2
	};
}

function clamp(v, lo, hi) {
	return v < lo ? lo : v > hi ? hi : v;
}
