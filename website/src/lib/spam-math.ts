/** Naive Bayes log-scores — matches SPAM_DETECTION README (log-sum form). */

export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** ln P(class) + Σ ln P(w_i | class) */
export function logClassScore(
  words: string[],
  priorClass: number,
  label: "spam" | "ham",
  wordLnLikelihood: (word: string, label: "spam" | "ham") => number
): number {
  const prior = label === "spam" ? priorClass : 1 - priorClass;
  let score = Math.log(prior);
  for (const w of words) {
    score += wordLnLikelihood(w, label);
  }
  return score;
}

/** Stable posterior P(spam | words) from two log-scores (same recipe as classify). */
export function posteriorSpamFromLogScores(logSpam: number, logHam: number): number {
  const maxLog = Math.max(logSpam, logHam);
  const spamProb = Math.exp(logSpam - maxLog);
  const hamProb = Math.exp(logHam - maxLog);
  const norm = spamProb + hamProb;
  return spamProb / norm;
}
