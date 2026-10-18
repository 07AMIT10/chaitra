import type { ReactNode } from "react";
import "../../styles/algorithms.css";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  tone?: "default" | "accent" | "gold";
};

/**
 * Panel chrome shared by every algorithms primitive. Styling is class-based only
 * (`alg-*`), tokens come from tokens.css. SSR-safe: no browser APIs.
 */
export default function PrimitiveShell({
  title,
  subtitle,
  right,
  children,
  tone = "default",
}: Props) {
  return (
    <section className={`alg-shell alg-shell--${tone}`}>
      <header className="alg-shell__head">
        <div className="alg-shell__headtext">
          <h3 className="alg-shell__title">{title}</h3>
          {subtitle != null && <p className="alg-shell__subtitle">{subtitle}</p>}
        </div>
        {right != null && <div className="alg-shell__right">{right}</div>}
      </header>
      <div className="alg-shell__body">{children}</div>
    </section>
  );
}
