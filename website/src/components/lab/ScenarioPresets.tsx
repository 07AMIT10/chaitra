export type ScenarioPreset = { id: string; label: string; onSelect: () => void };

type Props = { presets: ScenarioPreset[]; "aria-label"?: string };

export function ScenarioPresets({
  presets,
  "aria-label": ariaLabel = "Scenario presets",
}: Props) {
  return (
    <div className="lab__presets" role="group" aria-label={ariaLabel}>
      {presets.map((p) => (
        <button key={p.id} type="button" className="lab__btn lab__btn--ghost" onClick={p.onSelect}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
