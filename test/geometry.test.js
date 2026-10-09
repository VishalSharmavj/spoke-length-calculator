import test from 'node:test';
import assert from 'node:assert/strict';
import { spokeAngle, spokeLength, wheel } from '../js/geometry.js';
import { stockSize, maxCrosses, validate, warnings } from '../js/spokes.js';

/* A standard 32h rim-brake road rear wheel, used as the baseline throughout. */
const ROAD_REAR = {
	erd: 602,
	holes: 32,
	spokeHole: 2.6,
	left: { flangeDiameter: 45, centreToFlange: 37, crosses: 3 },
	right: { flangeDiameter: 45, centreToFlange: 18, crosses: 3 }
};

const near = (a, b, tol = 0.05) =>
	assert.ok(Math.abs(a - b) < tol, `expected ${a} to be within ${tol} of ${b}`);

test('spokeAngle: 3-cross on 32 holes sweeps 67.5 degrees', () => {
	assert.equal(spokeAngle(32, 3), 67.5);
	assert.equal(spokeAngle(32, 0), 0);          // radial goes straight out
	assert.equal(spokeAngle(36, 3), 60);
	assert.equal(spokeAngle(36, 4), 80);
});

test('spokeLength: a radial spoke on a centred flange is just r - f', () => {
	/* With no sideways offset and no crossing angle the triangle collapses and
	   the spoke runs flat along the radius. If this ever fails, the law of
	   cosines term is wrong. */
	const s = spokeLength({
		erd: 602, flangeDiameter: 38, centreToFlange: 0,
		holes: 32, crosses: 0, spokeHole: 2.6
	});
	near(s.length, 301 - 19 - 1.3);
	near(s.bracingAngle, 0);
	near(s.nippleAngle, 90);                     // dead radial into the rim
});

test('spokeLength: known good values for a road rear wheel', () => {
	const w = wheel(ROAD_REAR);
	near(w.left.length, 294.15);
	near(w.right.length, 292.38);
});

test('spokeLength: more crosses means a LONGER spoke', () => {
	/* The intuition runs the wrong way here, so it is worth pinning down: a
	   radial spoke takes the shortest path there is, straight out along the
	   radius. Every crossing swings the rim end further round the hub, which can
	   only lengthen the journey. Radial wheels need the shortest spokes. */
	const at = (crosses) => spokeLength({
		erd: 602, flangeDiameter: 45, centreToFlange: 18,
		holes: 32, crosses, spokeHole: 2.6
	}).length;
	const lengths = [0, 1, 2, 3, 4].map(at);
	for (let i = 1; i < lengths.length; i++) {
		assert.ok(lengths[i] > lengths[i - 1], `${i}-cross should be longer than ${i - 1}-cross`);
	}
	near(lengths[0], 277.78);
	near(lengths[4], 301.08);
});

test('spokeLength: a bigger flange needs a shorter spoke', () => {
	const at = (flangeDiameter) => spokeLength({
		erd: 596, flangeDiameter, centreToFlange: 30,
		holes: 36, crosses: 1, spokeHole: 2.6
	}).length;
	assert.ok(at(160) < at(45));                 // hub motor vs ordinary hub
});

test('wheel: the dished side is the slack side', () => {
	const w = wheel(ROAD_REAR);
	/* The left flange sits further from the rim centreline, so it leans out
	   more, so it needs less tension to balance the right. */
	assert.equal(w.slackSide, 'left');
	near(w.balance, 48.9, 0.5);                  // ~49% of drive-side tension
	near(w.dish, 9.5);
	assert.ok(w.left.bracingAngle > w.right.bracingAngle);
});

test('wheel: a symmetric front wheel balances evenly', () => {
	const side = { flangeDiameter: 38, centreToFlange: 35, crosses: 3 };
	const w = wheel({ erd: 602, holes: 32, spokeHole: 2.6, left: side, right: { ...side } });
	near(w.left.length, w.right.length, 1e-9);
	near(w.balance, 100, 1e-9);
	near(w.dish, 0, 1e-9);
});

test('stockSize: rounds to 2 mm, and ties go down', () => {
	assert.equal(stockSize(294.15), 294);
	assert.equal(stockSize(295.4), 296);
	/* A spoke 1.0 mm over still rounds DOWN: too short seats anyway, too long
	   bottoms out and can push through the rim tape. */
	assert.equal(stockSize(295.0), 294);
	assert.equal(stockSize(295.1), 296);
	assert.equal(stockSize(296.0), 296);
	assert.equal(stockSize(0), 0);
	assert.equal(stockSize(NaN), 0);
});

test('stockSize: never recommends a size a hidden decimal away', () => {
	/* 294.96 displays as "295.0", and 295.0 must round to 294 — not to 296 on
	   the strength of a hundredth the user cannot see. */
	assert.equal(stockSize(294.96), 294);
});

test('maxCrosses: the limit is where the spoke leaves the hub tangentially', () => {
	/* 32h 4-cross needs a 90 degree sweep, so r * cos(a) is 0 and the spoke
	   would have to set off backwards round the flange. That is exactly why
	   4-cross is a 36h build. */
	assert.equal(maxCrosses(32, 45, 602), 3);
	assert.equal(maxCrosses(36, 45, 596), 4);

	/* A hub motor's flange is so big it runs out of room sooner, even at the
	   same hole count. */
	assert.equal(maxCrosses(36, 160, 596), 3);
	assert.ok(maxCrosses(36, 160, 596) < maxCrosses(36, 45, 596));
});

test('validate: accepts a sound wheel', () => {
	assert.deepEqual(validate(ROAD_REAR), []);
});

test('validate: catches the mistakes people actually make', () => {
	const nominal = validate({ ...ROAD_REAR, erd: 700 });   // nominal size, not ERD
	assert.match(nominal.join(' '), /outside anything normal/);

	const odd = validate({ ...ROAD_REAR, holes: 30 });      // not a multiple of 4
	assert.match(odd.join(' '), /multiples of 4/);

	const locknut = validate({                              // measured from the locknut
		...ROAD_REAR,
		left: { ...ROAD_REAR.left, centreToFlange: 65 }
	});
	assert.match(locknut.join(' '), /middle of the hub/);
});

test('warnings: flag an awkward build without suppressing it', () => {
	/* A hub motor laced 3-cross computes perfectly well, but the spokes arrive
	   at the rim at a shallow angle and the nipples feel it. */
	const spec = {
		erd: 596, holes: 36, spokeHole: 2.6,
		left: { flangeDiameter: 160, centreToFlange: 30, crosses: 3 },
		right: { flangeDiameter: 160, centreToFlange: 30, crosses: 3 }
	};
	assert.deepEqual(validate(spec), []);            // nothing actually wrong
	const notes = warnings(spec, wheel(spec));
	assert.ok(notes.length > 0);
	assert.match(notes.join(' '), /meets the rim at/);
});

test('warnings: a sound road wheel has nothing to say', () => {
	/* The drive side of this wheel braces at 3.5 degrees, which is simply what a
	   dished rear wheel looks like. Warning about it would fire on almost every
	   rear wheel ever built, so the threshold sits below it. */
	assert.deepEqual(warnings(ROAD_REAR, wheel(ROAD_REAR)), []);
});

test('warnings: a genuinely shallow bracing angle does get flagged', () => {
	const spec = {
		...ROAD_REAR,
		right: { flangeDiameter: 45, centreToFlange: 13, crosses: 3 }
	};
	assert.match(warnings(spec, wheel(spec)).join(' '), /bracing angle/);
});
