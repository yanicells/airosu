import type { OszEntry } from '../../beatmap/load';

export function DifficultyPicker({
  difficulties,
  onPick,
}: {
  difficulties: OszEntry[];
  onPick: (name: string) => void;
}) {
  return (
    <div className="panel fade-up" style={{ padding: 20, textAlign: 'center', maxWidth: '92vw' }}>
      <p className="eyebrow" style={{ margin: '0 0 12px' }}>
        Pick a difficulty
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {difficulties.map((d) => (
          <button key={d.difficultyName} className="btn" onClick={() => onPick(d.difficultyName)}>
            {d.difficultyName}
          </button>
        ))}
      </div>
    </div>
  );
}
