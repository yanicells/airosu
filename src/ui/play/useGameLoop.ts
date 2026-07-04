import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Vec2 } from '../../beatmap/model';
import { peekCvSession } from '../../cv/cvSession';
import { AudioClock } from '../../game/audioClock';
import { GameSession } from '../../game/session';
import { createStage } from '../../render/stage';
import type { RenderView } from '../../render/types';
import { useAppState } from '../appState';

export type PlayPhase = 'countdown' | 'playing' | 'paused' | 'done';

export function useGameLoop(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const { map, settings, calibration, setScreen, setLastResult } = useAppState();
  const [phase, setPhase] = useState<PlayPhase>('countdown');
  const [count, setCount] = useState(3);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const clockRef = useRef<AudioClock | null>(null);
  const sessionRef = useRef<GameSession | null>(null);
  const cursorRef = useRef<Vec2 | null>(null);

  const finish = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      const s = session.state.score;
      setLastResult({
        score: s.score,
        maxCombo: s.maxCombo,
        accuracy: s.accuracy,
        counts: s.counts,
      });
    }
    clockRef.current?.stop();
    setScreen('results');
  }, [setLastResult, setScreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const cv = peekCvSession();
    if (!map || !canvas) {
      setScreen('home');
      return;
    }

    let disposed = false;
    let rafId = 0;
    let stageDestroy = () => {};

    const session = new GameSession(map, settings);
    sessionRef.current = session;
    const preempt = session.preemptMs();

    if (cv) {
      if (calibration) cv.cursor.setCalibration(calibration);
      cv.cursor.setSettings(settings);
    }
    const offSample = cv?.cursor.onSample((s) => {
      cursorRef.current = s.playfield;
    });

    (async () => {
      const stage = await createStage(canvas, settings.visualMode === 'focus');
      const clock = await AudioClock.create(map.audio, settings.volume);
      if (disposed) {
        stage.destroy();
        clock.stop();
        return;
      }
      clockRef.current = clock;
      stageDestroy = () => stage.destroy();

      // 3-2-1 countdown, then start audio
      for (let c = 3; c > 0; c--) {
        setCount(c);
        await new Promise((r) => setTimeout(r, 700));
        if (disposed) return;
      }
      clock.start();
      setPhase('playing');

      const loop = () => {
        if (disposed) return;
        rafId = requestAnimationFrame(loop);
        if (phaseRef.current !== 'playing') return;
        const t = clock.nowMs(settings.audioOffsetMs);
        const cursor = cursorRef.current;
        const events = session.tick(t, cursor);
        const state = session.state;
        const view: RenderView = {
          timeMs: t,
          objects: state.activeObjects.map((i) => ({
            obj: map.objects[i],
            index: i,
            judged: false,
          })),
          cursor,
          score: state.score.score,
          combo: state.score.combo,
          accuracy: state.score.accuracy,
          preemptMs: preempt,
          cs: map.meta.cs,
          recentHits: events,
        };
        stage.render(view);
        if (state.finished || clock.ended) {
          setPhase('done');
          setTimeout(finish, 600);
        }
      };
      rafId = requestAnimationFrame(loop);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      offSample?.();
      clockRef.current?.stop();
      clockRef.current = null;
      stageDestroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // input: tap keys, recenter, pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPhase((p) => {
          if (p === 'playing') {
            clockRef.current?.pause();
            return 'paused';
          }
          return p;
        });
        return;
      }
      if (phaseRef.current !== 'playing') return;
      const key = e.key.toLowerCase();
      if (settings.inputMode === 'manual' && settings.tapKeys.includes(key)) {
        e.preventDefault();
        const t = clockRef.current?.nowMs(settings.audioOffsetMs) ?? 0;
        sessionRef.current?.press(t, cursorRef.current);
      }
      if (key === 'r') {
        const cv = peekCvSession();
        const cam = cv ? cursorRef : null;
        void cam; // recenter handled on calibration screen in V1
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings]);

  // auto-pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === 'playing') {
        clockRef.current?.pause();
        setPhase('paused');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const resume = useCallback(() => {
    clockRef.current?.resume();
    setPhase('playing');
  }, []);

  const quit = useCallback(() => {
    clockRef.current?.stop();
    setScreen('home');
  }, [setScreen]);

  return { phase, count, resume, quit };
}
