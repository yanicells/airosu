export { grade, type Grade } from '../../game/grade';
import type { Grade } from '../../game/grade';

/** osu!lazer rank colours (OsuColour.ForRank). */
export function gradeColor(g: Grade): string {
  switch (g) {
    case 'SS':
      return '#de31ae';
    case 'S':
      return '#02b5c3';
    case 'A':
      return '#88da20';
    case 'B':
      return '#e3b130';
    case 'C':
      return '#ff8e5d';
    default:
      return '#ff5a5a';
  }
}

/** osu!lazer judgement palette: great / ok / meh / miss */
export const judgmentColors: Record<300 | 100 | 50 | 0, string> = {
  300: '#66ccff',
  100: '#b3d944',
  50: '#ffcc22',
  0: '#ed1121',
};

export const judgmentLabels: Record<300 | 100 | 50 | 0, string> = {
  300: 'Great',
  100: 'Ok',
  50: 'Meh',
  0: 'Miss',
};
