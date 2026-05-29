import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { diceRolls } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function DiceLab() {
  const [rolls, setRolls] = useState(600);
  const [sides, setSides] = useState(6);
  const hist = useMemo(() => diceRolls(rolls, sides), [rolls, sides]);
  const max = Math.max(...hist, 1);
  const expected = rolls / sides;

  const metrics: LabMetric[] = [
    { id: "rolls", label: "Rolls", value: String(rolls) },
    { id: "expected", label: "Expected per face", value: expected.toFixed(1) },
    { id: "maxdev", label: "Max deviation", value: String(Math.max(...hist.map((h) => Math.abs(h - expected)))) },
  ];

  return (
    <MiniSimLab
      intro={<>Law of large numbers: histogram converges to uniform as rolls increase.</>}
      controls={[
        { id: "r", label: "Rolls", min: 100, max: 5000, step: 100, value: rolls, valueText: `${rolls} rolls` },
        { id: "s", label: "Sides", min: 2, max: 12, value: sides, valueText: `${sides}-sided die` },
      ]}
      onControlChange={(id, v) => (id === "r" ? setRolls(v) : setSides(v))}
      metrics={metrics}
      status={`${rolls} rolls of a ${sides}-sided die. Expected count per face: ${expected.toFixed(1)}.`}
    >
      <div className="minisim__bars" role="img" aria-label="Dice histogram">
        {hist.map((h, i) => (
          <div key={i} className="minisim__bar" style={{ height: `${(h / max) * 100}%` }} title={`Face ${i + 1}: ${h}`} />
        ))}
      </div>
    </MiniSimLab>
  );
}
