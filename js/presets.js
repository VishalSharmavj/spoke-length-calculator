/**
 * Typical hub figures, as a starting point only.
 *
 * These are rounded, representative numbers for each category — not a
 * manufacturer database. Hubs vary between models and between production runs,
 * and a couple of millimetres of flange diameter moves the answer by about a
 * millimetre, which is a whole stock size. Always measure the hub in front of
 * you before you order.
 *
 * `left` is the non-drive side on a rear wheel, and the disc side on a front.
 */
export const HUB_PRESETS = [
	{
		id: 'road-rear',
		name: 'Road rear, rim brake',
		left: { flangeDiameter: 45, centreToFlange: 37, crosses: 3 },
		right: { flangeDiameter: 45, centreToFlange: 18, crosses: 3 }
	},
	{
		id: 'road-front',
		name: 'Road front, rim brake',
		left: { flangeDiameter: 38, centreToFlange: 35, crosses: 3 },
		right: { flangeDiameter: 38, centreToFlange: 35, crosses: 3 }
	},
	{
		id: 'disc-rear',
		name: 'Disc road / gravel rear',
		left: { flangeDiameter: 45, centreToFlange: 36, crosses: 3 },
		right: { flangeDiameter: 45, centreToFlange: 19, crosses: 3 }
	},
	{
		id: 'disc-front',
		name: 'Disc front',
		left: { flangeDiameter: 45, centreToFlange: 23, crosses: 3 },
		right: { flangeDiameter: 38, centreToFlange: 33, crosses: 3 }
	},
	{
		id: 'mtb-boost-rear',
		name: 'MTB Boost rear (148 mm)',
		left: { flangeDiameter: 48, centreToFlange: 33, crosses: 3 },
		right: { flangeDiameter: 48, centreToFlange: 22, crosses: 3 }
	},
	{
		id: 'hub-motor',
		name: 'E-bike hub motor',
		left: { flangeDiameter: 160, centreToFlange: 30, crosses: 1 },
		right: { flangeDiameter: 160, centreToFlange: 30, crosses: 1 }
	}
];

/**
 * Common ERDs. ERD is the diameter the spoke ends actually reach, which is NOT
 * the rim's nominal size — a "700c" rim is 622 mm at the bead seat and
 * typically 590–610 mm at the spoke ends, depending on how deep it is.
 */
export const RIM_PRESETS = [
	{ id: 'road-shallow', name: '700c shallow box (typical)', erd: 602 },
	{ id: 'road-deep', name: '700c 40 mm deep (typical)', erd: 560 },
	{ id: 'mtb-29', name: '29" / 700c MTB (typical)', erd: 596 },
	{ id: 'mtb-275', name: '27.5" MTB (typical)', erd: 554 },
	{ id: 'mtb-26', name: '26" MTB (typical)', erd: 524 },
	{ id: 'bmx-20', name: '20" BMX (typical)', erd: 390 }
];
