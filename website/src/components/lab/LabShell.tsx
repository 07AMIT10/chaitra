import type { ReactNode } from "react";
import "./lab.css";

type LabShellProps = {
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Shared chrome for Tier A interactive labs (surface, border, intro). */
export function LabShell({ intro, children, className }: LabShellProps) {
  return (
    <div className={className ? `lab ${className}` : "lab"}>
      {intro != null && <p className="lab__intro">{intro}</p>}
      {children}
    </div>
  );
}
