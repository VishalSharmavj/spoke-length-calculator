/**
 * Turning a calculated length into something you can actually order, and
 * sanity-checking the result. Pure functions, same as geometry.js.
 */

/** Spokes are stocked in 2 mm steps nearly everywhere. */
export const STEP = 2;

/**
 * Round a calculated length to a stock size.
 *
 * Ties go DOWN, and that asymmetry is deliberate. A spoke a touch short still
 * seats in the nipple and tensions fine. A spoke a touch long runs out of
 * thread, bottoms out in the nipple, and can push through the rim tape and
 * puncture the tube. So we only round up when there is more than 1.0 mm to
 * make up.
 *
 * The length is first rounded to the tenth that the UI displays, so a figure
 * shown as "295.0" can never recommend 296 because of a hundredth of a
 * millimetre nobody can see.
 */
export function stockSize(length) {
	if (!isFinite(length) || length <= 0) return 0;
	const shown = Math.round(length * 10) / 10;
	const lower = Math.floor(shown / STEP) * STEP;
	return shown - lower > 1.0 ? lower + STEP : lower;
}

/**
 * How comfortably the spoke meets the rim, from the nipple angle.
 * See nippleAngle() in geometry.js for what the number means.
 */
export function lacingVerdict(nippleAngle) {
	if (nippleAngle >= 80) return { level: 'good', text: 'Easy to lace' };
	if (nippleAngle >= 75) return { level: 'good', text: 'Laces fine' };
	if (nippleAngle >= 70) return { level: 'warn', text: 'Tight at the nipple' };
	return { level: 'bad', text: 'Too shallow — use washers' };
}

/**
 * The highest cross count a flange can take.
 *
 * A spoke has to leave its hole heading *outwards*. Push the cross count high
 * enough and the rim end swings so far round the hub that the spoke would have
 * to set off backwards and wrap around the flange to get there.
 *
 * The tipping point is where the spoke leaves exactly tangentially, which is
 * when the rim end's radial distance, measured along the hole's own radius,
 * equals the flange radius:
 *
 *     r * cos(angle) >= f
 *
 * On a 32h hub, 4-cross lands exactly on that line (angle = 90 degrees, so
 * r * cos = 0) — which is why 4-cross is a 36h build and 3-cross is the
 * sensible maximum on 32h.
 */
export function maxCrosses(holes, flangeDiameter, erd) {
	const f = flangeDiameter / 2;
	const r = erd / 2;
	for (let x = 4; x >= 1; x--) {
		const a = (720 * x) / holes;
		if (r * Math.cos(a * (Math.PI / 180)) >= f) return x;
	}
	return 0;
}

/**
 * Check the inputs before trusting the answer. Returns a list of plain-English
 * problems; an empty list means go ahead.
 *
 * These are the mistakes that actually get made, in rough order of how often:
 * typing a rim's nominal size instead of its ERD, measuring to the outside of
 * the flange instead of the hole circle, and forgetting that `holes` is the
 * whole wheel rather than one side.
 */
export function validate(spec) {
	const problems = [];
	const { erd, holes, left, right } = spec;

	if (!(erd > 0)) problems.push('Enter the rim ERD.');
	else if (erd < 250 || erd > 660) problems.push(`An ERD of ${erd} mm is outside anything normal — bike rims run about 280–640 mm. Measure it rather than using the rim's nominal size.`);

	if (!(holes > 0)) problems.push('Enter the number of spoke holes.');
	else if (holes % 4 !== 0) problems.push(`${holes} holes cannot be laced evenly — hole counts are multiples of 4.`);

	for (const [name, side] of [['Left', left], ['Right', right]]) {
		if (!(side.flangeDiameter > 0)) problems.push(`Enter the ${name.toLowerCase()} flange diameter.`);
		else if (side.flangeDiameter > erd / 2) problems.push(`The ${name.toLowerCase()} flange is more than half the rim's diameter. That is a hub motor — double-check you measured the hole circle, not the whole shell.`);

		if (!(side.centreToFlange > 0)) problems.push(`Enter the ${name.toLowerCase()} centre-to-flange distance.`);
		else if (side.centreToFlange > 60) problems.push(`A ${name.toLowerCase()} centre-to-flange of ${side.centreToFlange} mm is larger than any hub — it is measured from the middle of the hub, not from the locknut.`);
	}

	return problems;
}

/**
 * Things worth saying about an otherwise valid wheel. Unlike validate(), these
 * never suppress the answer — the numbers are sound, they just describe a build
 * that is awkward, unusual, or at the edge of what laces up.
 */
export function warnings(spec, result) {
	const notes = [];

	for (const [name, side, computed] of [
		['Left', spec.left, result.left],
		['Right', spec.right, result.right]
	]) {
		const cap = maxCrosses(spec.holes, side.flangeDiameter, spec.erd);
		if (side.crosses > cap) {
			notes.push(`${side.crosses}-cross is past what that ${name.toLowerCase()} flange `
				+ `really takes — the spokes leave the hub almost tangentially. `
				+ `${cap}-cross is the usual maximum.`);
		}

		const verdict = lacingVerdict(computed.nippleAngle);
		if (verdict.level !== 'good') {
			notes.push(`${name} side meets the rim at ${computed.nippleAngle.toFixed(0)}\u00b0 `
				+ `\u2014 ${verdict.text.toLowerCase()}.`);
		}

		/* Every dished rear wheel has a smallish drive-side angle — around 3.5
		   degrees is ordinary. Below 3 is where it starts to matter. */
		if (computed.bracingAngle < 3) {
			notes.push(`${name} side has only ${computed.bracingAngle.toFixed(1)}\u00b0 of bracing `
				+ `angle, so it does little to hold the wheel straight sideways.`);
		}
	}

	return notes;
}
