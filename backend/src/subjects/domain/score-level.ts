export enum ScoreLevel {
  EXCELLENT = 'excellent', // >= 8
  GOOD = 'good', //           6 <= x < 8
  AVERAGE = 'average', //     4 <= x < 6
  POOR = 'poor', //           < 4
}

export const SCORE_LEVELS: { level: ScoreLevel; label: string; min: number }[] = [
  { level: ScoreLevel.EXCELLENT, label: '>= 8', min: 8 },
  { level: ScoreLevel.GOOD, label: '6 – 8', min: 6 },
  { level: ScoreLevel.AVERAGE, label: '4 – 6', min: 4 },
  { level: ScoreLevel.POOR, label: '< 4', min: -Infinity },
];

export function classifyScore(score: number): ScoreLevel {
  return SCORE_LEVELS.find((l) => score >= l.min)!.level;
}
