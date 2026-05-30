import { useEffect, useState, type ReactNode } from "react";

export type GuessOption = {
  id: string;
  label: string;
  isCorrect: boolean;
};

type Props = {
  prompt: ReactNode;
  children: ReactNode;
  revealLabel?: string;
  options?: GuessOption[];
  storageKey?: string;
};

export function PredictReveal({
  prompt,
  children,
  revealLabel = "Show result",
  options,
  storageKey = "global",
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [justGuessed, setJustGuessed] = useState<boolean>(false);

  const streakKey = `chaitra_streak_${storageKey}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(streakKey);
      if (saved) {
        setStreak(parseInt(saved, 10) || 0);
      }
    }
  }, [streakKey]);

  const handleRevealWithoutGuess = () => {
    setRevealed(true);
  };

  const handleGuess = (option: GuessOption) => {
    if (revealed) return;
    setSelectedId(option.id);
    setRevealed(true);
    setJustGuessed(true);

    if (typeof window !== "undefined") {
      let newStreak = 0;
      if (option.isCorrect) {
        const current = parseInt(localStorage.getItem(streakKey) || "0", 10) || 0;
        newStreak = current + 1;
      } else {
        newStreak = 0;
      }
      localStorage.setItem(streakKey, String(newStreak));
      setStreak(newStreak);
    }
  };

  const correctOption = options?.find((o) => o.isCorrect);

  return (
    <div className="lab__predict">
      <p className="lab__predict-prompt">{prompt}</p>
      
      {!revealed ? (
        options && options.length > 0 ? (
          <div className="lab__predict-options" role="group" aria-label="Make a prediction">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="lab__predict-opt-btn"
                onClick={() => handleGuess(opt)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" className="lab__btn" onClick={handleRevealWithoutGuess}>
            {revealLabel}
          </button>
        )
      ) : (
        <div className="lab__predict-result">
          {options && options.length > 0 && justGuessed && (
            <div className={`lab__predict-feedback ${selectedId === correctOption?.id ? "lab__predict-feedback--correct" : "lab__predict-feedback--incorrect"}`}>
              {selectedId === correctOption?.id ? (
                <span>🔥 Correct! Current streak: <strong>{streak}</strong></span>
              ) : (
                <span>❌ Incorrect. Streak reset to 0. Correct answer was: <strong>{correctOption?.label}</strong></span>
              )}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

