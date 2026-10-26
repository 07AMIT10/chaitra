type Props = {
  enabled: boolean;
  onToggle: () => void;
};

/**
 * Console audio is opt-in and off by default. The visible label stays short;
 * the accessible name states both the current state and the action.
 */
export default function SoundToggle({ enabled, onToggle }: Props) {
  return (
    <button
      type="button"
      className="game-sound"
      aria-pressed={enabled}
      aria-label={enabled ? "Audio on. Mute console audio" : "Audio off. Enable console audio"}
      onClick={onToggle}
      title={enabled ? "Mute console audio" : "Enable console audio"}
    >
      <span className="game-sound__icon" aria-hidden="true">
        <svg
          viewBox="0 0 20 20"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          <path d="M3.2 8.1h2.6L9.7 5v10l-3.9-3.1H3.2z" fill="currentColor" stroke="none" />
          {enabled ? (
            <>
              <path className="game-sound__wave" d="M12.4 7.2a3.6 3.6 0 0 1 0 5.6" />
              <path className="game-sound__wave" d="M14.7 4.9a6.6 6.6 0 0 1 0 10.2" />
            </>
          ) : (
            <path className="game-sound__slash" d="M12.8 7.4l4.4 5.2M17.2 7.4l-4.4 5.2" />
          )}
        </svg>
      </span>
      <span className="game-sound__led" aria-hidden="true" />
      <span className="game-sound__label">{enabled ? "Audio on" : "Audio off"}</span>
    </button>
  );
}
