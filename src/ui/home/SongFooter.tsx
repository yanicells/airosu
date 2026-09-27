import type { CSSProperties, ReactNode } from 'react';
import { useAppState } from '../appState';
import {
  ChevronLeftIcon,
  HandIcon,
  OptionsIcon,
  ShuffleIcon,
  TargetIcon,
  UploadIcon,
} from '../shared/icons';
import { lz } from '../shared/palette';

function FooterTab({
  color,
  icon,
  label,
  value,
  ...props
}: {
  color: string;
  icon: ReactNode;
  label: string;
  value?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="footer-tab"
      style={{ '--tab-color': color } as CSSProperties}
      aria-label={value ? `${label}: ${value}` : label}
      {...props}
    >
      {icon}
      <strong>{label}</strong>
      {value && <small>{value}</small>}
    </button>
  );
}

/** Song select footer: Back, then lazer-style tabs for play style, random, options, and import. */
export function SongFooter({
  onRandom,
  randomDisabled,
  onImport,
}: {
  onRandom: () => void;
  randomDisabled: boolean;
  onImport: (file: File) => void;
}) {
  const { settings, setSettings, setScreen } = useAppState();
  return (
    <footer className="lazer-footer song-footer">
      <button className="lazer-back" onClick={() => setScreen('home')}>
        <ChevronLeftIcon size={22} />
        <span>Back</span>
      </button>
      <FooterTab
        color={lz.lime}
        icon={<HandIcon size={20} />}
        label="Input"
        value={settings.inputMode === 'relax' ? 'Relax' : 'Manual'}
        onClick={() =>
          setSettings({ ...settings, inputMode: settings.inputMode === 'relax' ? 'manual' : 'relax' })
        }
      />
      <FooterTab
        color={lz.pink}
        icon={<TargetIcon size={20} />}
        label="Cursor"
        value={settings.cursorAnchor === 'palm' ? 'Palm' : 'Fingertip'}
        onClick={() =>
          setSettings({ ...settings, cursorAnchor: settings.cursorAnchor === 'palm' ? 'index' : 'palm' })
        }
      />
      <FooterTab
        color={lz.blue}
        icon={<ShuffleIcon size={20} />}
        label="Random"
        disabled={randomDisabled}
        onClick={onRandom}
      />
      <FooterTab
        color={lz.purple}
        icon={<OptionsIcon size={20} />}
        label="Options"
        onClick={() => setScreen('settings')}
      />
      <label className="footer-tab footer-tab--import" style={{ '--tab-color': lz.orange } as CSSProperties}>
        <UploadIcon size={20} />
        <strong>Import</strong>
        <input
          type="file"
          accept=".osz,.osu"
          aria-label="Import a beatmap (.osz or .osu)"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.target.value = '';
          }}
        />
      </label>
    </footer>
  );
}
