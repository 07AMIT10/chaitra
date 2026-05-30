import type { ReactNode } from "react";

export type WorkbenchNoticeProps = {
  children: ReactNode;
  variant?: "note" | "warning";
};

export function WorkbenchNotice({ children, variant = "note" }: WorkbenchNoticeProps) {
  return (
    <aside
      className={`code-workbench__notice code-workbench__notice--${variant}`}
      role="note"
    >
      {children}
    </aside>
  );
}
