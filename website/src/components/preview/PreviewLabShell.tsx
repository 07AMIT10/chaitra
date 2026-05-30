import type { ReactNode } from "react";
import { LabShell } from "../lab";

type PreviewLabShellProps = {
  intro: ReactNode;
  children: ReactNode;
};

/** Tier B preview labs — shared shell with short intro. */
export function PreviewLabShell({ intro, children }: PreviewLabShellProps) {
  return (
    <LabShell
      intro={
        <>
          {intro} This is a <strong>Tier B</strong> concept lab — adjust the control, then check your
          prediction.
        </>
      }
    >
      {children}
    </LabShell>
  );
}
