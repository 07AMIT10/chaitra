/** Naive Bayes spam classifier — simplified from SPAM_DETECTION README */

import { logClassScore, posteriorSpamFromLogScores } from "./spam-math";

export type WordStats = { spam: number; ham: number };

export const VOCAB_BALANCED: Record<string, WordStats> = {
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

/** Training skew: spam tokens dominate counts (Bayesian poisoning defense still needs top-k). */
export const VOCAB_SPAM_HEAVY: Record<string, WordStats> = {
  free: { spam: 120, ham: 3 },
  win: { spam: 110, ham: 4 },
  money: { spam: 100, ham: 5 },
  urgent: { spam: 95, ham: 3 },
  meeting: { spam: 8, ham: 42 },
  project: { spam: 10, ham: 40 },
  team: { spam: 9, ham: 38 },
  schedule: { spam: 6, ham: 32 },
  hello: { spam: 25, ham: 22 },
  thanks: { spam: 15, ham: 48 },
};

/** @deprecated use VOCAB_BALANCED */
export const VOCAB = VOCAB_BALANCED;

export type CorpusPreset = "balanced" | "spam-heavy";

export function vocabForPreset(preset: CorpusPreset): Record<string, WordStats> {
  return preset === "spam-heavy" ? VOCAB_SPAM_HEAVY : VOCAB_BALANCED;
}

export const SAMPLE_EMAILS = [
  { id: "e1", words: ["free", "win", "money"], label: "spam" as const },
  { id: "e2", words: ["meeting", "project", "team"], label: "ham" as const },
  { id: "e3", words: ["urgent", "free", "money"], label: "spam" as const },
  { id: "e4", words: ["hello", "thanks", "schedule"], label: "ham" as const },
  { id: "e5", words: ["free", "meeting"], label: "ham" as const },
];

const SPAM_CORPUS = 300;
const HAM_CORPUS = 250;
const OOV = 0.01;

export function wordLikelihood(
  word: string,
  label: "spam" | "ham",
  vocab: Record<string, WordStats> = VOCAB_BALANCED
): number {
  const stats = vocab[word];
  if (!stats) return OOV;
  const total = label === "spam" ? stats.spam + 1 : stats.ham + 1;
  const corpus = label === "spam" ? SPAM_CORPUS : HAM_CORPUS;
  return total / corpus;
}

export function wordEvidence(
  word: string,
  vocab: Record<string, WordStats>
): { pSpam: number; pHam: number; favors: "spam" | "ham" } {
  const pSpam = wordLikelihood(word, "spam", vocab);
  const pHam = wordLikelihood(word, "ham", vocab);
  return { pSpam, pHam, favors: pSpam >= pHam ? "spam" : "ham" };
}

export function classify(
  words: string[],
  priorSpam: number,
  vocab: Record<string, WordStats> = VOCAB_BALANCED
): {
  spamProb: number;
  hamProb: number;
  prediction: "spam" | "ham";
  logSpam: number;
  logHam: number;
} {
  const ln = (w: string, label: "spam" | "ham") => Math.log(wordLikelihood(w, label, vocab));
  const logSpam = logClassScore(words, priorSpam, "spam", ln);
  const logHam = logClassScore(words, priorSpam, "ham", ln);
  const pSpam = posteriorSpamFromLogScores(logSpam, logHam);
  return {
    spamProb: pSpam,
    hamProb: 1 - pSpam,
    prediction: pSpam >= 0.5 ? "spam" : "ham",
    logSpam,
    logHam,
  };
}
