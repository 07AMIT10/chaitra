import { useMemo, useState } from "react";
import { mseForDegree, polyFitCoeffs } from "../../lib/statistical-learning-math";
import { LabShell, MetricsAside, PredictReveal, RangeControl, type LabMetric } from "../lab";

const XS = [-2, -1, 0, 1, 2, 2.2];
const TRUE_Y = XS.map((x) => 0.5 * x * x - 0.3 * x + 0.2);
const NOISY_Y = TRUE_Y.map((y, i) => y + (i % 2 === 0 ? 0.4 : -0.35));

export default function StatisticalLearningLab() {
  const [degree, setDegree] = useState(1);

  const coeffs = useMemo(() => polyFitCoeffs(XS, NOISY_Y, degree), [degree]);
  const trainMse = useMemo(() => mseForDegree(XS, NOISY_Y, coeffs), [coeffs]);
  const testMse = useMemo(() => {
    const testX = [-1.5, 0.5, 1.8];
    const testY = testX.map((x) => 0.5 * x * x - 0.3 * x + 0.2);
    return mseForDegree(testX, testY, coeffs);
  }, [coeffs]);

  const metrics: LabMetric[] = [
    { id: "deg", label: "Polynomial degree", value: String(degree) },
    { id: "train", label: "Train MSE", value: trainMse.toFixed(3) },
    {
      id: "test",
      label: "Hold-out MSE",
      value: testMse.toFixed(3),
      tone: testMse > trainMse * 1.5 ? "warn" : "default",
    },
  ];

  return (
    <LabShell intro={<>Bias–variance tradeoff: fit noisy quadratics with increasing polynomial degree.</>}>
      <div className="lab__grid">
        <div>
          <RangeControl
            id="stat-degree"
            label="Model degree"
            min={1}
            max={5}
            step={1}
            value={degree}
            valueText={`degree ${degree}`}
            onChange={setDegree}
          />
          <svg className="preview-lab__chart" viewBox="0 0 240 120" role="img" aria-label="Scatter and fit curve">
            {NOISY_Y.map((y, i) => (
              <circle
                key={i}
                cx={40 + (XS[i] + 2) * 40}
                cy={100 - (y + 1) * 35}
                r={4}
                fill="var(--color-warning)"
              />
            ))}
            <polyline
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2}
              points={Array.from({ length: 50 }, (_, i) => {
                const x = -2 + (i / 49) * 4.2;
                let y = 0;
                for (let j = 0; j < coeffs.length; j++) y += coeffs[j] * x ** j;
                return `${40 + (x + 2) * 40},${100 - (y + 1) * 35}`;
              }).join(" ")}
            />
          </svg>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <PredictReveal
        prompt="Does very high degree usually overfit (low train MSE, higher test MSE)?"
        options={[
          { id: "yes", label: "Yes — variance dominates", isCorrect: true },
          { id: "no", label: "No — always helps", isCorrect: false },
        ]}
        storageKey="preview-statistical-learning"
      >
        <p className="lab__status">
          Train {trainMse.toFixed(3)} vs hold-out {testMse.toFixed(3)}.
        </p>
      </PredictReveal>
    </LabShell>
  );
}
