import { useState } from 'react';

const INTENTS = [
	{ id: 'automate', label: 'Prozesse automatisieren', signal: '#5B8DEF' },
	{ id: 'testing', label: 'Testfälle aus Anforderungen', signal: '#5B8DEF' },
	{ id: 'staffing', label: 'Routineaufgaben entlasten', signal: '#5B8DEF' },
	{ id: 'consulting', label: 'Erstmal nur beraten lassen', signal: '#5B8DEF' },
];

const URGENCY = [
	{ id: 'now', label: 'Sofort' },
	{ id: 'quarter', label: 'Dieses Quartal' },
	{ id: 'exploring', label: 'Ich sondiere nur' },
];

const STEPS = ['intent', 'urgency', 'contact'];

function ChipGroup({ options, value, onChange }) {
	return (
		<div className="flex flex-wrap gap-2.5">
			{options.map((opt) => {
				const active = value === opt.id;
				return (
					<button
						key={opt.id}
						type="button"
						onClick={() => onChange(opt.id)}
						aria-pressed={active}
						className="rounded-sm border px-4 py-2.5 text-sm transition-all duration-200"
						style={{
							borderColor: active ? (opt.signal ?? '#5B8DEF') : 'rgba(255,255,255,0.12)',
							backgroundColor: active ? `${opt.signal ?? '#5B8DEF'}1A` : 'transparent',
							color: active ? '#F5F6F7' : 'rgba(245,246,247,0.7)',
													}}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}

export default function ContactSurvey() {
	const [stepIndex, setStepIndex] = useState(0);
	const [submitted, setSubmitted] = useState(false);
	const [form, setForm] = useState({ intent: '', urgency: '', name: '', email: '', company: '', message: '' });

	const step = STEPS[stepIndex];
	const canAdvance = step === 'intent' ? !!form.intent : step === 'urgency' ? !!form.urgency : true;
	const canSubmit = form.name.trim() !== '' && form.email.trim() !== '';

	function update(field, value) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function next() {
		setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
	}
	function back() {
		setStepIndex((i) => Math.max(i - 1, 0));
	}

	function handleSubmit(e) {
		e.preventDefault();
		if (!canSubmit) return;

		const intentLabel = INTENTS.find((i) => i.id === form.intent)?.label ?? '—';
		const urgencyLabel = URGENCY.find((u) => u.id === form.urgency)?.label ?? '—';
		const subject = encodeURIComponent(`Anfrage: ${intentLabel}`);
		const body = encodeURIComponent(
			`Bedarf: ${intentLabel}\nDringlichkeit: ${urgencyLabel}\nFirma: ${form.company || '—'}\n\n${form.message || '(keine weitere Nachricht)'}\n\n— ${form.name}, ${form.email}`
		);
		window.location.href = `mailto:kontakt@cloud-pioneers.de?subject=${subject}&body=${body}`;
		setSubmitted(true);
	}

	if (submitted) {
		return (
			<div className="rounded-xl border border-border/60 bg-card/40 p-10 text-center">
				<div className="mx-auto flex h-11 w-11 items-center justify-center border border-primary">
					<span className="h-2.5 w-2.5 bg-primary" />
				</div>
				<h3 className="mt-4 font-heading text-xl font-medium">Ihr Mail-Programm sollte sich gerade öffnen</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					Falls nicht: schreiben Sie uns direkt an{' '}
					<a href="mailto:kontakt@cloud-pioneers.de" className="text-signal-cyan hover:underline">
						kontakt@cloud-pioneers.de
					</a>
					.
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="rounded-xl border border-border/60 bg-card/40 p-6 md:p-10">
			<div className="flex items-center justify-between gap-4">
				<span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
					Schritt {stepIndex + 1} / {STEPS.length}
				</span>
				<div className="grid flex-1 max-w-[180px] grid-cols-3 gap-1" aria-hidden="true">
					{STEPS.map((s, i) => (
						<span
							key={s}
							className="h-0.5 transition-colors duration-300"
							style={{ backgroundColor: i <= stepIndex ? '#3E72D0' : 'rgba(255,255,255,0.12)' }}
						/>
					))}
				</div>
			</div>

			<div className="mt-8 min-h-[220px]">
				{step === 'intent' && (
					<div>
						<h3 className="font-heading text-xl font-medium">Was brauchen Sie?</h3>
						<p className="mt-1 text-sm text-muted-foreground">Wählen Sie, was am nächsten dran ist.</p>
						<div className="mt-6">
							<ChipGroup options={INTENTS} value={form.intent} onChange={(v) => update('intent', v)} />
						</div>
					</div>
				)}

				{step === 'urgency' && (
					<div>
						<h3 className="font-heading text-xl font-medium">Wie dringend ist es?</h3>
						<p className="mt-1 text-sm text-muted-foreground">Hilft uns, den richtigen Termin vorzuschlagen.</p>
						<div className="mt-6">
							<ChipGroup options={URGENCY} value={form.urgency} onChange={(v) => update('urgency', v)} />
						</div>
					</div>
				)}

				{step === 'contact' && (
					<div>
						<h3 className="font-heading text-xl font-medium">Wie erreichen wir Sie?</h3>
						<div className="mt-6 space-y-4">
							<input
								required
								type="text"
								placeholder="Name"
								value={form.name}
								onChange={(e) => update('name', e.target.value)}
								className="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus-visible:border-signal-cyan focus-visible:ring-3 focus-visible:ring-signal-cyan/30"
							/>
							<input
								required
								type="email"
								placeholder="E-Mail"
								value={form.email}
								onChange={(e) => update('email', e.target.value)}
								className="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus-visible:border-signal-cyan focus-visible:ring-3 focus-visible:ring-signal-cyan/30"
							/>
							<input
								type="text"
								placeholder="Unternehmen (optional)"
								value={form.company}
								onChange={(e) => update('company', e.target.value)}
								className="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus-visible:border-signal-cyan focus-visible:ring-3 focus-visible:ring-signal-cyan/30"
							/>
							<textarea
								placeholder="Kurz zum Anwendungsfall (optional)"
								value={form.message}
								onChange={(e) => update('message', e.target.value)}
								rows={3}
								className="w-full resize-none rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus-visible:border-signal-cyan focus-visible:ring-3 focus-visible:ring-signal-cyan/30"
							/>
						</div>
					</div>
				)}
			</div>

			<div className="mt-8 flex items-center justify-between">
				<button
					type="button"
					onClick={back}
					disabled={stepIndex === 0}
					className="text-sm text-muted-foreground transition-opacity hover:text-foreground disabled:opacity-0"
				>
					Zurück
				</button>

				{step !== 'contact' ? (
					<button
						type="button"
						onClick={next}
						disabled={!canAdvance}
						className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-40"
					>
						Weiter
					</button>
				) : (
					<button
						type="submit"
						disabled={!canSubmit}
						className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-40"
					>
						Absenden
					</button>
				)}
			</div>
		</form>
	);
}
