import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Vec2 } from '../../beatmap/model';
import { peekCvSession } from '../../cv/cvSession';
import { AudioClock } from '../../game/audioClock';
import { PpCounter, type HitStats } from '../../game/pp';
import { GameSession } from '../../game/session';
import { createStage } from '../../render/stage';
import type { RenderView } from '../../render/types';
import { getSkin } from '../../skin/loadSkin';
import { playSound } from '../../skin/soundBank';
import type { Skin } from '../../skin/types';
import type { HitEvent } from '../../game/session';
import { useAppState } from '../appState';

export type PlayPhase = 'countdown' | 'playing' | 'paused' | 'done';

function toHitStats(
  counts: { 300: number; 100: number; 50: number; 0: number },
  maxCombo: number,
): HitStats {
  return {
    count300: counts[300],
    count100: counts[100],
    count50: counts[50],
    countMiss: counts[0],
    maxCombo,
  };
}

export function useGameLoop(stageHostRef: RefObject<HTMLDivElement | null>) {
  const { map, settings, calibration, setScreen, setLastResult } = useAppState();
  const [phase, setPhase] = useState<PlayPhase>('countdown');
  const [count, setCount] = useState(3);
  const [fatal, setFatal] = useState<string | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const clockRef = useRef<AudioClock | null>(null);
  const sessionRef = useRef<GameSession | null>(null);
  const cursorRef = useRef<Vec2 | null>(null);
  const skinRef = useRef<Skin | null>(null);
  const ppRef = useRef<PpCounter | null>(null);

  const finish = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      const s = session.state.score;
      setLastResult({
        score: s.score,
        maxCombo: s.maxCombo,
        accuracy: s.accuracy,
        pp: ppRef.current?.final(toHitStats(s.counts, s.maxCombo)) ?? 0,
        counts: s.counts,
      });
    }
    clockRef.current?.stop();
    setScreen('results');
  }, [setLastResult, setScreen]);

  useEffect(() => {
    const host = stageHostRef.current;
    const cv = peekCvSession();
    if (!map || !host) {
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
      let stage;
      let clock;
      let skin: Skin | null = null;
      try {
        skin = await getSkin();
        stage = await createStage(host, settings.visualMode === 'focus', skin);
        clock = await AudioClock.create(map.audio, settings.volume);
      } catch (e) {
        setFatal(
          e instanceof Error
            ? `Could not start renderer/audio: ${e.message}. WebGL is required.`
            : 'Could not start renderer. WebGL is required.',
        );
        return;
      }
      if (disposed) {
        stage.destroy();
        clock.stop();
        return;
      }
      clockRef.current = clock;
      skinRef.current = skin;
      stageDestroy = () => stage.destroy();

      try {
        ppRef.current = new PpCounter(map.rawOsu);
      } catch {
        ppRef.current = null; // pp is cosmetic — never block play on it
      }

      let prevCombo = 0;
      let livePp = 0;
      const playHitSounds = (events: HitEvent[], comboBefore: number) => {
        if (!skin) return;
        if (events.some((e) => e.judgment > 0) && skin.sounds.hitnormal)
          playSound(skin.sounds.hitnormal, settings.volume);
        // combobreak only stings when a real combo was lost
        if (events.some((e) => e.judgment === 0) && comboBefore >= 8 && skin.sounds.combobreak)
          playSound(skin.sounds.combobreak, settings.volume);
      };

      const loop = () => {
        if (disposed) return;
        rafId = requestAnimationFrame(loop);
        if (phaseRef.current === 'countdown') {
          // cursor-only frames so the player can find their hand pre-start
          stage.render({
            timeMs: 0,
            objects: [],
            cursor: cursorRef.current,
            score: 0,
            combo: 0,
            accuracy: 1,
            pp: 0,
            preemptMs: preempt,
            cs: map.meta.cs,
            recentHits: [],
          });
          return;
        }
        if (phaseRef.current !== 'playing') return;
        const t = clock.nowMs(settings.audioOffsetMs);
        const cursor = cursorRef.current;
        const events = session.tick(t, cursor);
        playHitSounds(events, prevCombo);
        const state = session.state;
        prevCombo = state.score.combo;
        if (events.length && ppRef.current) {
          livePp = ppRef.current.currentAt(t, toHitStats(state.score.counts, state.score.maxCombo));
        }
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
          pp: livePp,
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

      // 3-2-1 countdown, then start audio
      for (let c = 3; c > 0; c--) {
        setCount(c);
        await new Promise((r) => setTimeout(r, 700));
        if (disposed) return;
      }
      clock.start();
      setPhase('playing');
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
        const hit = sessionRef.current?.press(t, cursorRef.current);
        const sounds = skinRef.current?.sounds;
        if (hit && hit.judgment > 0 && sounds?.hitnormal)
          playSound(sounds.hitnormal, settings.volume);
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

  return { phase, count, fatal, resume, quit };
}
