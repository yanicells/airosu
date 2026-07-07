export type Grade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';

export function grade(accuracy: number): Grade {
  if (accuracy >= 1) return 'SS';
  if (accuracy >= 0.95) return 'S';
  if (accuracy >= 0.9) return 'A';
  if (accuracy >= 0.8) return 'B';
  if (accuracy >= 0.7) return 'C';
  return 'D';
}

export function gradeColor(g: Grade): string {
  switch (g) {
    case 'SS':
    case 'S':
      return '#ffd700';
    case 'A':
      return '#88ee88';
    case 'B':
      return '#66aaff';
    case 'C':
      return '#cc88ff';
    default:
      return '#ff5555';
  }
}

/** shared judgment palette: 300 / 100 / 50 / miss */
export const judgmentColors: Record<300 | 100 | 50 | 0, string> = {
  300: '#66ccff',
  100: '#88ee88',
  50: '#ffcc55',
  0: '#ff5555',
};

export const judgmentLabels: Record<300 | 100 | 50 | 0, string> = {
  300: 'Great',
  100: 'Ok',
  50: 'Meh',
  0: 'Miss',
};
