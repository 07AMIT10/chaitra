import { useEffect, useState, type ReactNode } from "react";
import "../../styles/algorithms.css";

type Props = {
  index: number;
  count: number;
  playing: boolean;
  speed: number;
  onIndex(i: number): void;
  onPlayPause(): void;
  onReset(): void;
  onSpeed(s: number): void;
  /** Compatibility: wrap a stepped child instead of driving an external index. */
  children?: ReactNode;
  label?: string;
};

const SPEEDS = [1, 2, 3];

/**
 * Transport for a stepped visualisation.
 *
 * Canonical use is fully controlled: index/playing/speed and every callback come
 * from the page. Because Astro cannot serialise function props across an island
 * boundary, the component also carries a self-driving fallback that engages only
 * when no callback arrives at runtime — that keeps it usable (and crash-free) in
 * plain `client:visible` MDX usage, while remaining purely controlled when a
 * parent island supplies the handlers.
 *
 * It additionally accepts `children` + `label` so a page can wrap a
 * self-stepping child (workstream C's shape); the wrapper renders the transport
 * above the child.
 */
export default function PaceControls({
  index = 0,
  count = 1,
  playing = false,
  speed = 1,
  onIndex,
  onPlayPause,
  onReset,
  onSpeed,
  children,
  label,
}: Props) {
  const controlled = typeof onIndex === "function";

  const [iInternal, setIInternal] = useState(index);
  const [playingInternal, setPlayingInternal] = useState(playing);
  const [speedInternal, setSpeedInternal] = useState(speed);

  const i = controlled ? index : iInternal;
  const isPlaying = controlled ? playing : playingInternal;
  const spd = controlled ? speed : speedInternal;

  const last = Math.max(0, count - 1);
  const clamped = Math.min(Math.max(i, 0), last);
  const atStart = clamped <= 0;
  const atEnd = clamped >= last;

  const go = (n: number) => {
    if (typeof onIndex === "function") onIndex(n);
    else setIInternal(n);
  };
  const playPause = () => {
    if (typeof onPlayPause === "function") onPlayPause();
    else setPlayingInternal((p) => !p);
  };
  const reset = () => {
    if (typeof onReset === "function") onReset();
    else {
      setIInternal(0);
      setPlayingInternal(false);
    }
  };
  const setSpeed = (s: number) => {
    if (typeof onSpeed === "function") onSpeed(s);
    else setSpeedInternal(s);
  };

  useEffect(() => {
    if (controlled || !isPlaying) return;
    if (children != null) return; // a wrapped child owns its own stepping
    const period = Math.max(60, 900 / Math.max(1, spd));
    const id = setInterval(() => {
      setIInternal((prev) => (count > 0 ? (prev + 1) % count : 0));
    }, period);
    return () => clearInterval(id);
  }, [controlled, isPlaying, spd, count, children]);

  const transport = (
    <div className="alg-pace" role="group" aria-label="Playback controls">
      <button
        type="button"
        className="alg-btn"
        onClick={() => go(Math.max(0, clamped - 1))}
        disabled={atStart}
        aria-label="Step back"
        title="Step back"
      >
        ◀
      </button>

      <button
        type="button"
        className="alg-btn alg-btn--on"
        onClick={playPause}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "❚❚" : "▶"}
      </button>

      <button
        type="button"
        className="alg-btn"
        onClick={() => go(Math.min(last, clamped + 1))}
        disabled={atEnd}
        aria-label="Step forward"
        title="Step forward"
      >
        ▶
      </button>

      <button type="button" className="alg-btn" onClick={reset} aria-label="Reset" title="Reset">
        ⟲
      </button>

      <span className="alg-pace__count" aria-live="polite">
        {clamped + 1} / {Math.max(1, count)}
      </span>

      <span className="alg-pace__speeds" role="group" aria-label="Speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className="alg-pace__speed"
            aria-pressed={spd === s}
            onClick={() => setSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </span>
    </div>
  );

  if (children != null) {
    return (
      <div className="alg-pace-wrap">
        {label != null && <p className="alg-pace__label">{label}</p>}
        {transport}
        <div className="alg-pace__child">{children}</div>
      </div>
    );
  }

  return transport;
}
