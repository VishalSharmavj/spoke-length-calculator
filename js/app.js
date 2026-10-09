/**
 * DOM wiring. This is the only file that knows a browser exists — everything it
 * displays comes from geometry.js and spokes.js, which are plain maths.
 */
import { wheel } from './geometry.js';
import { stockSize, lacingVerdict, validate, warnings } from './spokes.js';
import { HUB_PRESETS, RIM_PRESETS } from './presets.js';

const $ = (id) => document.getElementById(id);

/** Read every control into the shape geometry.js expects. */
function readForm() {
	const num = (id) => parseFloat($(id).value);
	return {
		erd: num('erd'),
		holes: num('holes'),
		spokeHole: num('spoke-hole'),
		left: {
			flangeDiameter: num('fd-left'),
			centreToFlange: num('ctf-left'),
			crosses: num('x-left')
		},
		right: {
			flangeDiameter: num('fd-right'),
			centreToFlange: num('ctf-right'),
			crosses: num('x-right')
		}
	};
}

function render() {
	const spec = readForm();
	const problems = validate(spec);

	const list = $('problems');
	list.hidden = problems.length === 0;
	list.innerHTML = problems.map((p) => `<li>${escape(p)}</li>`).join('');

	// Show nothing rather than something wrong.
	if (problems.length) {
		for (const side of ['left', 'right']) {
			$(`len-${side}`).textContent = '—';
			$(`order-${side}`).textContent = '';
			$(`meta-${side}`).innerHTML = '';
			$(`card-${side}`).classList.add('is-empty');
		}
		$('warnings').hidden = true;
		$('same').hidden = true;
		$('stat-dish').textContent = '—';
		$('stat-balance').textContent = '—';
		$('stat-per-flange').textContent = '—';
		$('balance-note').textContent = '';
		return;
	}

	const w = wheel(spec);

	/* Advisory notes. The answer is sound, so these sit alongside it rather
	   than replacing it. */
	const notes = warnings(spec, w);
	const noteList = $('warnings');
	noteList.hidden = notes.length === 0;
	noteList.innerHTML = notes.map((n) => `<li>${escape(n)}</li>`).join('');

	for (const side of ['left', 'right']) {
		const s = w[side];
		const verdict = lacingVerdict(s.nippleAngle);

		$(`card-${side}`).classList.remove('is-empty');
		$(`len-${side}`).textContent = s.length.toFixed(1);
		$(`order-${side}`).innerHTML =
			`order <b>${stockSize(s.length)} mm</b> &middot; ${w.spokesPerFlange} spokes`;
		$(`meta-${side}`).innerHTML = [
			`<li>${spec[side].crosses === 0 ? 'Radial' : spec[side].crosses + '-cross'}</li>`,
			`<li>brace ${s.bracingAngle.toFixed(1)}&deg;</li>`,
			`<li class="tag is-${verdict.level}">${verdict.text}</li>`
		].join('');
	}

	// The builder's green light: close enough to buy one box of spokes.
	const gap = Math.abs(w.left.length - w.right.length);
	const same = $('same');
	same.hidden = gap >= 1;
	if (gap < 1) {
		const one = stockSize((w.left.length + w.right.length) / 2);
		same.innerHTML = `Both sides land within ${gap.toFixed(1)} mm of each other — `
			+ `order <b>${spec.holes} &times; ${one} mm</b> and build the whole wheel from one box.`;
	}

	$('stat-dish').textContent = `${Math.abs(w.dish).toFixed(1)} mm`;
	$('stat-balance').textContent = w.balance ? `${Math.round(w.balance)}%` : '—';
	$('stat-per-flange').textContent = w.spokesPerFlange;
	$('balance-note').textContent = balanceNote(w);
}

function balanceNote(w) {
	if (!w.balance) return '';
	if (w.balance > 97) return 'Both sides tension evenly.';
	const side = w.slackSide === 'left' ? 'Left' : 'Right';
	return `${side}-side spokes sit at about ${Math.round(w.balance)}% of the other side's `
		+ `tension. That is normal for a dished wheel — it is also why that side goes slack first.`;
}

/* ---- presets --------------------------------------------------------- */

function fillPresets() {
	const rim = $('rim-preset');
	for (const r of RIM_PRESETS) {
		rim.insertAdjacentHTML('beforeend', `<option value="${r.id}">${r.name}</option>`);
	}
	rim.addEventListener('change', () => {
		const found = RIM_PRESETS.find((r) => r.id === rim.value);
		if (!found) return;
		$('erd').value = found.erd;
		render();
	});

	const hub = $('hub-preset');
	for (const h of HUB_PRESETS) {
		hub.insertAdjacentHTML('beforeend', `<option value="${h.id}">${h.name}</option>`);
	}
	hub.addEventListener('change', () => {
		const found = HUB_PRESETS.find((h) => h.id === hub.value);
		if (!found) return;
		for (const side of ['left', 'right']) {
			$(`fd-${side}`).value = found[side].flangeDiameter;
			$(`ctf-${side}`).value = found[side].centreToFlange;
			$(`x-${side}`).value = found[side].crosses;
		}
		render();
	});
}

/* Minimal escaping — validate() messages interpolate user numbers. */
function escape(s) {
	return String(s).replace(/[&<>"]/g, (c) =>
		({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function init() {
	fillPresets();
	$('form').addEventListener('input', render);
	$('form').addEventListener('change', render);
	$('form').addEventListener('submit', (e) => e.preventDefault());
	render();
}

init();
