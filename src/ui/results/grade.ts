export type Grade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';

export function grade(accuracy: number): Grade {
  if (accuracy >= 1) return 'SS';
  if (accuracy >= 0.95) return 'S';
  if (accuracy >= 0.9) return 'A';
  if (accuracy >= 0.8) return 'B';
  if (accuracy >= 0.7) return 'C';
  return 'D';
}
