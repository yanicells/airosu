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
        color="#a5cc00"
        icon={<HandIcon size={20} />}
        label="Input"
        value={settings.inputMode === 'relax' ? 'Relax' : 'Manual'}
        onClick={() =>
          setSettings({ ...settings, inputMode: settings.inputMode === 'relax' ? 'manual' : 'relax' })
        }
      />
      <FooterTab
        color="#ff66aa"
        icon={<TargetIcon size={20} />}
        label="Cursor"
        value={settings.cursorAnchor === 'palm' ? 'Palm' : 'Fingertip'}
        onClick={() =>
          setSettings({ ...settings, cursorAnchor: settings.cursorAnchor === 'palm' ? 'index' : 'palm' })
        }
      />
      <FooterTab
        color="#66ccff"
        icon={<ShuffleIcon size={20} />}
        label="Random"
        disabled={randomDisabled}
        onClick={onRandom}
      />
      <FooterTab
        color="#8866ee"
        icon={<OptionsIcon size={20} />}
        label="Options"
        onClick={() => setScreen('settings')}
      />
      <label className="footer-tab footer-tab--import" style={{ '--tab-color': '#eeaa00' } as CSSProperties}>
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
