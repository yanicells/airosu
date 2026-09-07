import { useAppState } from '../appState';
import { SelectMenu } from '../shared/SelectMenu';
import { AudioPicker } from './AudioPicker';
import { PersonalScores } from '../shared/PersonalScores';
import { starColor } from './starColor';

export function SongDetails() {
  const { map, mapset, settings, setSettings, setScreen } = useAppState();
  if (!map) return <div className="song-welcome"><span>◉</span><h1>Find your rhythm.</h1><p>Choose a song on the right, or import your own beatmap.</p></div>;
  const stars = mapset?.preview.difficulties.find((d) => d.name === map.meta.version)?.stars;
  const seconds = Math.round(map.meta.lengthMs / 1000);
  return (
    <>
      <section className="song-detail">
        <span className="song-mode-label">AIROSU! STANDARD</span>
        <h1>{map.meta.title}</h1><p className="song-artist">{map.meta.artist}</p>
        <div className="song-metadata"><span>◷ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span><span>♫ {Math.round(map.meta.bpm)} BPM</span><span>◯ {map.objects.length} objects</span></div>
        <div className="song-difficulty"><span style={{ background: stars === undefined ? undefined : starColor(stars) }}>★ {stars?.toFixed(2) ?? '—'}</span><strong>{map.meta.version}</strong><small>mapped by {map.meta.creator}</small></div>
        <div className="song-stat-grid">{(['cs', 'od', 'hp', 'ar'] as const).map((key, index) => <div key={key}>
          <span>{['Circle size', 'Accuracy', 'HP drain', 'Approach rate'][index]}</span><strong>{map.meta[key].toFixed(1)}</strong>
          <i style={{ width: `${Math.min(100, map.meta[key] * 10)}%` }} />
        </div>)}</div>
      </section>
      <PersonalScores osuText={map.rawOsu} />
      <div className="song-play-options">
        <SelectMenu ariaLabel="Input mode" value={settings.inputMode} options={[{value:'relax',label:'Relax'},{value:'manual',label:'Manual'}]}
          onChange={(value) => setSettings({...settings, inputMode:value as 'relax'|'manual'})} />
        <SelectMenu ariaLabel="Cursor anchor" value={settings.cursorAnchor} options={[{value:'palm',label:'Palm'},{value:'index',label:'Fingertip'}]}
          onChange={(value) => setSettings({...settings, cursorAnchor:value as 'palm'|'index'})} />
        <button className="btn" onClick={() => setScreen('settings')}>More options</button>
      </div>
      {map.audio.byteLength === 0 && <AudioPicker map={map} />}
    </>
  );
}
