import { useEffect, useRef } from "react";

type UseStreamPlaybackOptions = {
  isPlaying: boolean;
  intervalMs: number;
  onTick: () => void;
  onComplete?: () => void;
  shouldStop?: () => boolean;
};

/** Interval-driven playback for stream / step labs (respects cleanup on pause). */
export function useStreamPlayback({
  isPlaying,
  intervalMs,
  onTick,
  onComplete,
  shouldStop,
}: UseStreamPlaybackOptions) {
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);
  const shouldStopRef = useRef(shouldStop);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    shouldStopRef.current = shouldStop;
  }, [shouldStop]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      if (shouldStopRef.current?.()) {
        onCompleteRef.current?.();
        return;
      }
      onTickRef.current();
    }, intervalMs);
    return () => clearInterval(id);
  }, [isPlaying, intervalMs]);
}
