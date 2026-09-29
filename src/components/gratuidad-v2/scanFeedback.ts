"use client";

export type TipoFeedback = "ok" | "aviso" | "error";

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine") {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

/**
 * Distinct sounds so the operator doesn't need to look at the screen:
 * ok = one short high beep, aviso = two medium beeps, error = low buzz.
 * Also vibrates on phones that support it.
 */
export function playFeedback(tipo: TipoFeedback): void {
  const ac = ctx();
  if (ac) {
    if (tipo === "ok") tone(ac, 1318, 0, 0.12);
    else if (tipo === "aviso") { tone(ac, 880, 0, 0.1); tone(ac, 880, 0.16, 0.1); }
    else tone(ac, 196, 0, 0.35, "square");
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(tipo === "ok" ? 60 : tipo === "aviso" ? [60, 60, 60] : 300);
  }
}
