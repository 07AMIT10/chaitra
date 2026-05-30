import { useState, type ReactNode } from "react";

type Props = {
  prompt: ReactNode;
  children: ReactNode;
  revealLabel?: string;
};

export function PredictReveal({ prompt, children, revealLabel = "Show result" }: Props) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="lab__predict">
      <p className="lab__predict-prompt">{prompt}</p>
      {!revealed ? (
        <button type="button" className="lab__btn" onClick={() => setRevealed(true)}>
          {revealLabel}
        </button>
      ) : (
        <div className="lab__predict-result">{children}</div>
      )}
    </div>
  );
}
