import { useCallback, useEffect, useRef, useState } from "react";

export type GameCue = "select" | "move" | "error" | "win" | "unlock" | "hint" | "map";

const STORAGE_KEY = "chaitra_algorithms_game_audio";

/**
 * Low master gain is deliberate: the cues are console texture, not a soundtrack.
 * Every voice peaks well below the master, which itself sits at 0.2.
 */
const MASTER_GAIN = 0.2;

type CueNote = {
  freq: number;
  /** Optional glide destination. */
  to?: number;
  /** Offset from the start of the cue, in seconds. */
  at?: number;
  dur: number;
  gain: number;
  type?: OscillatorType;
};

/**
 * Short, quiet cues built from one or two partials. No audio assets.
 * The lowpass in the rig keeps the edges soft; the envelopes are all
 * click-free ramps rather than hard starts.
 */
const CUES: Record<GameCue, readonly CueNote[]> = {
  select: [
    { freq: 1046.5, dur: 0.045, gain: 0.1, type: "sine" },
    { freq: 1568, at: 0.008, dur: 0.03, gain: 0.045, type: "sine" },
  ],
  move: [
    { freq: 523.25, dur: 0.085, gain: 0.11, type: "triangle" },
    { freq: 659.25, at: 0.06, dur: 0.11, gain: 0.12, type: "triangle" },
  ],
  error: [
    { freq: 196, to: 130.81, dur: 0.16, gain: 0.15, type: "triangle" },
    { freq: 98, dur: 0.18, gain: 0.07, type: "sine" },
  ],
  win: [
    { freq: 392, dur: 0.22, gain: 0.09, type: "sine" },
    { freq: 523.25, at: 0.09, dur: 0.26, gain: 0.1, type: "sine" },
    { freq: 659.25, at: 0.18, dur: 0.34, gain: 0.1, type: "sine" },
    { freq: 783.99, at: 0.27, dur: 0.5, gain: 0.11, type: "sine" },
    { freq: 130.81, dur: 0.55, gain: 0.07, type: "sine" },
  ],
  unlock: [
    { freq: 440, to: 659.25, dur: 0.28, gain: 0.09, type: "sine" },
    { freq: 880, at: 0.16, dur: 0.28, gain: 0.035, type: "sine" },
  ],
  hint: [
    { freq: 880, dur: 0.06, gain: 0.07, type: "sine" },
    { freq: 1174.66, at: 0.075, dur: 0.09, gain: 0.06, type: "sine" },
  ],
  map: [
    { freq: 392, to: 196, dur: 0.22, gain: 0.09, type: "sine" },
    { freq: 587.33, at: 0.02, dur: 0.12, gain: 0.035, type: "triangle" },
  ],
};

type AudioRig = {
  context: AudioContext;
  master: GainNode;
  tone: BiquadFilterNode;
};

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function scheduleCue(rig: AudioRig, cue: GameCue) {
  const { context, tone } = rig;
  const start = context.currentTime + 0.012;

  for (const note of CUES[cue]) {
    const at = start + (note.at ?? 0);
    const osc = context.createOscillator();
    const envelope = context.createGain();

    osc.type = note.type ?? "sine";
    osc.frequency.setValueAtTime(note.freq, at);
    if (note.to != null) {
      osc.frequency.exponentialRampToValueAtTime(note.to, at + note.dur);
    }

    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(note.gain, at + 0.014);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + note.dur);

    osc.connect(envelope);
    envelope.connect(tone);

    osc.onended = () => {
      try {
        osc.disconnect();
        envelope.disconnect();
      } catch {
        /* the graph may already be closed */
      }
    };

    osc.start(at);
    osc.stop(at + note.dur + 0.04);
  }
}

/**
 * Opt-in console audio. Default is off and persisted per browser.
 *
 * The AudioContext is created lazily and only once a real user gesture has
 * happened, so a page load is silent even when audio was enabled previously.
 * Re-enabling ramps the master back up; disabling ramps it down and suspends
 * the context after the tail. Unmount closes the context.
 */
export function useGameAudio() {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const rigRef = useRef<AudioRig | null>(null);
  const gestureRef = useRef(false);
  const suspendTimer = useRef<number | null>(null);

  const clearSuspendTimer = useCallback(() => {
    if (suspendTimer.current == null) return;
    window.clearTimeout(suspendTimer.current);
    suspendTimer.current = null;
  }, []);

  const ensureRig = useCallback((): AudioRig | null => {
    if (typeof window === "undefined") return null;

    const activated =
      gestureRef.current ||
      (typeof navigator !== "undefined" && navigator.userActivation?.hasBeenActive);
    if (!activated) return null;

    const existing = rigRef.current;
    if (existing && existing.context.state !== "closed") return existing;

    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return null;

    try {
      const context = new Ctor();
      const tone = context.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = 5200;
      tone.Q.value = 0.4;

      const master = context.createGain();
      master.gain.value = MASTER_GAIN;

      tone.connect(master);
      master.connect(context.destination);

      const rig: AudioRig = { context, master, tone };
      rigRef.current = rig;
      return rig;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) === "1";
      enabledRef.current = saved;
      if (saved) setEnabled(true);
    } catch {
      /* storage disabled — remain silent */
    }

    const markGesture = () => {
      gestureRef.current = true;
    };
    document.addEventListener("pointerdown", markGesture, { capture: true, once: true });
    document.addEventListener("keydown", markGesture, { capture: true, once: true });

    return () => {
      document.removeEventListener("pointerdown", markGesture, { capture: true });
      document.removeEventListener("keydown", markGesture, { capture: true });

      if (suspendTimer.current != null) {
        window.clearTimeout(suspendTimer.current);
        suspendTimer.current = null;
      }

      const rig = rigRef.current;
      rigRef.current = null;
      if (!rig) return;

      try {
        rig.tone.disconnect();
        rig.master.disconnect();
      } catch {
        /* already disconnected */
      }
      void rig.context.close().catch(() => {});
    };
  }, []);

  const play = useCallback(
    (cue: GameCue) => {
      if (!enabledRef.current) return;
      const rig = ensureRig();
      if (!rig) return;

      if (rig.context.state === "suspended") {
        void rig.context.resume().catch(() => {});
      }

      // Restore the master if the mute fade was interrupted.
      const now = rig.context.currentTime;
      rig.master.gain.cancelScheduledValues(now);
      rig.master.gain.setTargetAtTime(MASTER_GAIN, now, 0.012);

      scheduleCue(rig, cue);
    },
    [ensureRig],
  );

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* storage disabled — the choice still holds for this session */
    }

    clearSuspendTimer();

    if (next) {
      const rig = ensureRig();
      if (!rig) return;

      if (rig.context.state === "suspended") {
        void rig.context.resume().catch(() => {});
      }
      const now = rig.context.currentTime;
      rig.master.gain.cancelScheduledValues(now);
      rig.master.gain.setTargetAtTime(MASTER_GAIN, now, 0.012);
      scheduleCue(rig, "unlock");
      return;
    }

    const rig = rigRef.current;
    if (!rig) return;

    const now = rig.context.currentTime;
    rig.master.gain.cancelScheduledValues(now);
    rig.master.gain.setTargetAtTime(0.0001, now, 0.02);

    suspendTimer.current = window.setTimeout(() => {
      suspendTimer.current = null;
      if (!enabledRef.current && rigRef.current === rig) {
        void rig.context.suspend().catch(() => {});
      }
    }, 180);
  }, [clearSuspendTimer, ensureRig]);

  return { enabled, toggle, play };
}
