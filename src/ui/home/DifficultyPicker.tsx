import type { OszEntry } from '../../beatmap/load';

export function DifficultyPicker({
  difficulties,
  onPick,
}: {
  difficulties: OszEntry[];
  onPick: (name: string) => void;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <h3>Pick a difficulty</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {difficulties.map((d) => (
          <button
            key={d.difficultyName}
            style={{ padding: '8px 24px', cursor: 'pointer' }}
            onClick={() => onPick(d.difficultyName)}
          >
            {d.difficultyName}
          </button>
        ))}
      </div>
    </div>
  );
}
