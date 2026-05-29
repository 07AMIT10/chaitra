/** Naive Bayes spam classifier — simplified from SPAM_DETECTION README */

export type WordStats = { spam: number; ham: number };

export const VOCAB: Record<string, WordStats> = {
  free: { spam: 80, ham: 5 },
  win: { spam: 70, ham: 8 },
  money: { spam: 65, ham: 10 },
  urgent: { spam: 60, ham: 4 },
  meeting: { spam: 3, ham: 50 },
  project: { spam: 5, ham: 45 },
  team: { spam: 4, ham: 40 },
  schedule: { spam: 2, ham: 35 },
  hello: { spam: 10, ham: 30 },
  thanks: { spam: 8, ham: 55 },
};

export const SAMPLE_EMAILS = [
  { id: "e1", words: ["free", "win", "money"], label: "spam" as const },
  { id: "e2", words: ["meeting", "project", "team"], label: "ham" as const },
  { id: "e3", words: ["urgent", "free", "money"], label: "spam" as const },
  { id: "e4", words: ["hello", "thanks", "schedule"], label: "ham" as const },
  { id: "e5", words: ["free", "meeting"], label: "ham" as const },
];

export function wordLikelihood(word: string, label: "spam" | "ham", vocab = VOCAB): number {
  const stats = vocab[word];
  if (!stats) return 0.01;
  const total = label === "spam" ? stats.spam + 1 : stats.ham + 1;
  const corpus = label === "spam" ? 300 : 250;
  return total / corpus;
}

export function classify(
  words: string[],
  priorSpam: number,
  vocab = VOCAB
): { spamProb: number; hamProb: number; prediction: "spam" | "ham" } {
  const priorHam = 1 - priorSpam;
  let logSpam = Math.log(priorSpam);
  let logHam = Math.log(priorHam);
  for (const w of words) {
    logSpam += Math.log(wordLikelihood(w, "spam", vocab));
    logHam += Math.log(wordLikelihood(w, "ham", vocab));
  }
  const maxLog = Math.max(logSpam, logHam);
  const spamProb = Math.exp(logSpam - maxLog);
  const hamProb = Math.exp(logHam - maxLog);
  const norm = spamProb + hamProb;
  const pSpam = spamProb / norm;
  return { spamProb: pSpam, hamProb: 1 - pSpam, prediction: pSpam >= 0.5 ? "spam" : "ham" };
}
