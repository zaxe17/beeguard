// lib/notifySound.ts
//
// Short "ding" when a notification or chat message arrives while
// BeeGuard is open. Made with the Web Audio API — no sound file needed.
//
// Browsers only allow sound after the person has clicked/tapped the page
// once, so the audio is "unlocked" on the first click or key press
// (unlockNotificationSound, called from components/RegisterSW.tsx).
// Can be turned off in Profile → Settings → Notification Sound.
// NEW — never plays when nobody is logged in (after logout).

import { tokenStore } from "@/services/api";

const SETTING_KEY = "beeguard_sound_on";
// Never ding more than once in this many ms (e.g. push + badge refresh
// for the same notification).
const MIN_GAP_MS = 2000;

let ctx: AudioContext | null = null;
let lastPlayed = 0;

export type SoundKind = "notification" | "chat";

export const isSoundOn = (): boolean => {
	try {
		return localStorage.getItem(SETTING_KEY) !== "off";
	} catch {
		return true;
	}
};

export const setSoundOn = (on: boolean) => {
	try {
		localStorage.setItem(SETTING_KEY, on ? "on" : "off");
	} catch {
		/* ignore */
	}
};

const getContext = (): AudioContext | null => {
	if (typeof window === "undefined") return null;
	if (!ctx) {
		const Ctor =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext?: typeof AudioContext })
				.webkitAudioContext;
		if (!Ctor) return null;
		ctx = new Ctor();
	}
	return ctx;
};

/** Call on the first click/tap/key so later dings are allowed to play. */
export const unlockNotificationSound = () => {
	const c = getContext();
	if (c && c.state === "suspended") c.resume().catch(() => {});
};

const tone = (c: AudioContext, freq: number, start: number, length: number) => {
	const osc = c.createOscillator();
	const gain = c.createGain();
	osc.type = "sine";
	osc.frequency.value = freq;
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
	osc.connect(gain).connect(c.destination);
	osc.start(start);
	osc.stop(start + length + 0.05);
};

/**
 * notification -> two rising notes (ding-ding)
 * chat         -> one short soft note (like a message pop)
 */
export const playNotificationSound = (kind: SoundKind = "notification") => {
	if (!isSoundOn()) return;
	// Logged out -> no sound.
	if (!tokenStore.get()) return;
	const now = Date.now();
	if (now - lastPlayed < MIN_GAP_MS) return;
	const c = getContext();
	if (!c || c.state !== "running") return; // not unlocked yet — stay quiet
	lastPlayed = now;

	const t = c.currentTime;
	if (kind === "chat") {
		tone(c, 880, t, 0.18);
	} else {
		tone(c, 660, t, 0.18);
		tone(c, 990, t + 0.14, 0.28);
	}
};