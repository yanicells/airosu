import { useEffect, useRef, useState } from 'react';
import { peekCvSession } from '../../cv/cvSession';
import { useAppState } from '../appState';
import { PauseOverlay } from './PauseOverlay';
import { useGameLoop } from './useGameLoop';

export function PlayScreen() {
  const { settings, setScreen } = useAppState();
  const stageHostRef = useRef<HTMLDivElement>(null);
  const videoHolderRef = useRef<HTMLDivElement>(null);
  const [restartKey, setRestartKey] = useState(0);

  // Keep the camera attached in both modes so video-frame callbacks keep arriving.
  useEffect(() => {
    const holder = videoHolderRef.current;
    const cv = peekCvSession();
    if (!holder || !cv) return;
    const video = cv.video;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.opacity = settings.visualMode === 'arcade' ? '0.5' : '0';
    holder.append(video);
    return () => video.remove();
  }, [settings.visualMode, restartKey]);

  return (
    <GameLoopRunner
      key={restartKey}
      stageHostRef={stageHostRef}
      onRestart={() => setRestartKey((k) => k + 1)}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)' }}>
        <div
          ref={videoHolderRef}
          style={{
            position: 'absolute',
            inset: 0,
            transform: settings.mirror ? 'scaleX(-1)' : undefined,
          }}
        />
        <div ref={stageHostRef} style={{ position: 'absolute', inset: 0 }} />
        <button
          type="button"
          className="game-exit"
          aria-label="Quit to song select"
          onClick={() => setScreen('songs')}
        >
          ✕
        </button>
      </div>
    </GameLoopRunner>
  );
}

function GameLoopRunner({
  stageHostRef,
  onRestart,
  children,
}: {
  stageHostRef: React.RefObject<HTMLDivElement | null>;
  onRestart: () => void;
  children: React.ReactNode;
}) {
  const { phase, count, fatal, resume, quit } = useGameLoop(stageHostRef);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
      {fatal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            background: '#111',
            zIndex: 20,
          }}
        >
          <p style={{ maxWidth: 420, textAlign: 'center' }}>{fatal}</p>
          <button className="btn" onClick={quit}>
            Back to home
          </button>
        </div>
      )}
      {phase === 'countdown' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 110,
            fontWeight: 800,
            fontStyle: 'italic',
            color: 'var(--pink)',
            textShadow: '0 0 40px rgba(255, 102, 170, 0.5)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <span key={count} className="count-pop" style={{ display: 'inline-block' }}>
            {count}
          </span>
        </div>
      )}
      {phase === 'paused' && (
        <PauseOverlay onResume={resume} onRestart={onRestart} onQuit={quit} />
      )}
    </div>
  );
}
