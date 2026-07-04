import { useEffect, useRef, useState } from 'react';
import { peekCvSession } from '../../cv/cvSession';
import { useAppState } from '../appState';
import { PauseOverlay } from './PauseOverlay';
import { useGameLoop } from './useGameLoop';

export function PlayScreen() {
  const { settings, setScreen } = useAppState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoHolderRef = useRef<HTMLDivElement>(null);
  const [restartKey, setRestartKey] = useState(0);

  // arcade mode: camera video behind the canvas
  useEffect(() => {
    const holder = videoHolderRef.current;
    const cv = peekCvSession();
    if (!holder || !cv || settings.visualMode !== 'arcade') return;
    const video = cv.video;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.opacity = '0.5';
    holder.append(video);
    return () => video.remove();
  }, [settings.visualMode, restartKey]);

  return (
    <GameLoopRunner
      key={restartKey}
      canvasRef={canvasRef}
      onRestart={() => setRestartKey((k) => k + 1)}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111' }}>
        <div
          ref={videoHolderRef}
          style={{
            position: 'absolute',
            inset: 0,
            transform: settings.mirror ? 'scaleX(-1)' : undefined,
          }}
        />
        <div style={{ position: 'absolute', inset: 0 }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
        <button
          style={{ position: 'absolute', top: 12, left: 12, opacity: 0.6, zIndex: 5 }}
          onClick={() => setScreen('home')}
        >
          ✕
        </button>
      </div>
    </GameLoopRunner>
  );
}

function GameLoopRunner({
  canvasRef,
  onRestart,
  children,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onRestart: () => void;
  children: React.ReactNode;
}) {
  const { phase, count, fatal, resume, quit } = useGameLoop(canvasRef);

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
          <button onClick={quit}>Back to home</button>
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
            fontSize: 96,
            fontWeight: 'bold',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          {count}
        </div>
      )}
      {phase === 'paused' && (
        <PauseOverlay onResume={resume} onRestart={onRestart} onQuit={quit} />
      )}
    </div>
  );
}
