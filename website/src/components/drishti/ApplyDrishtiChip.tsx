import { forwardRef } from "react";

type Props = {
  hasDraft: boolean;
  onClick: () => void;
};

export const ApplyDrishtiChip = forwardRef<HTMLButtonElement, Props>(function ApplyDrishtiChip(
  { hasDraft, onClick },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className="drishti-apply-chip"
      onClick={onClick}
      aria-label={hasDraft ? "Apply Drishti — draft in progress" : "Apply Drishti"}
      data-analytics="apply-drishti-chip"
    >
      <span aria-hidden="true">◎</span>
      Apply Drishti
      {hasDraft && <span className="drishti-apply-chip__dot" aria-hidden="true" />}
    </button>
  );
});
