import type { ReactNode } from "react";

type Props = {
  left: ReactNode;
  right: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
};

export function ComparePanel({
  left,
  right,
  leftLabel = "Algorithm",
  rightLabel = "Ground truth",
}: Props) {
  return (
    <div
      className="lab__compare lab__compare--panel"
      role="group"
      aria-label={`${leftLabel} versus ${rightLabel}`}
    >
      <div>
        <strong>{leftLabel}</strong>
        {left}
      </div>
      <div>
        <strong>{rightLabel}</strong>
        {right}
      </div>
    </div>
  );
}
