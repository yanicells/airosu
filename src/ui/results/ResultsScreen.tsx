import { useAppState } from '../appState';
import { grade } from './grade';

export function ResultsScreen() {
  const { map, lastResult, setScreen, setMap } = useAppState();

  if (!lastResult || !map) {
    return (
      <div style={{ padding: 32 }}>
        No results. <button onClick={() => setScreen('home')}>Home</button>
      </div>
    );
  }

  const g = grade(lastResult.accuracy);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: '100%',
        padding: 32,
      }}
    >
      <p style={{ margin: 0, opacity: 0.7 }}>
        {map.meta.artist} — {map.meta.title} [{map.meta.version}]
      </p>
      <div style={{ fontSize: 120, fontWeight: 'bold', lineHeight: 1, color: gradeColor(g) }}>
        {g}
      </div>
      <div style={{ fontSize: 40, fontWeight: 'bold' }}>{lastResult.score.toLocaleString()}</div>
      <div style={{ fontSize: 20 }}>
        {(lastResult.accuracy * 100).toFixed(2)}% · {lastResult.maxCombo}x max combo
      </div>
      <div style={{ display: 'flex', gap: 20, opacity: 0.85, fontSize: 18 }}>
        <span style={{ color: '#66ccff' }}>300 × {lastResult.counts[300]}</span>
        <span style={{ color: '#88ee88' }}>100 × {lastResult.counts[100]}</span>
        <span style={{ color: '#ffcc66' }}>50 × {lastResult.counts[50]}</span>
        <span style={{ color: '#ff5555' }}>miss × {lastResult.counts[0]}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button
          style={{ fontSize: 18, padding: '10px 32px' }}
          onClick={() => setScreen('play')}
        >
          Retry
        </button>
        <button
          style={{ fontSize: 18, padding: '10px 32px' }}
          onClick={() => {
            setMap(undefined);
            setScreen('home');
          }}
        >
          Change map
        </button>
      </div>
    </div>
  );
}

function gradeColor(g: string): string {
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
