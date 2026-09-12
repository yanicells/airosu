import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Vec2 } from '../../beatmap/model';
import { prepareMapPerformance } from '../../beatmap/mapWorker';
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
  const pendingHits = useRef<HitEvent[]>([]);
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
        // created once at capture so every submit retry reuses the same key
        playId: crypto.randomUUID(),
        inputMode: settings.inputMode,
        forgiveness: settings.forgiveness,
        cursorAnchor: settings.cursorAnchor,
      });
    }
    clockRef.current?.stop();
    setScreen('results');
  }, [setLastResult, setScreen, settings]);

  useEffect(() => {
    const host = stageHostRef.current;
    const cv = peekCvSession();
    if (!map || !host) {
      setScreen('songs');
      return;
    }

    let disposed = false;
    let failed = false;
    let rafId = 0;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let stageDestroy = () => {};

    const fail = (message: string) => {
      if (disposed || failed) return;
      failed = true;
      phaseRef.current = 'done';
      setPhase('done');
      setFatal(message);
      cancelAnimationFrame(rafId);
      clearTimeout(finishTimer);
      clockRef.current?.stop();
      stageDestroy();
    };

    const session = new GameSession(map, settings);
    sessionRef.current = session;
    const preempt = session.preemptMs();

    if (cv) {
      if (calibration) cv.cursor.setCalibration(calibration);
      cv.cursor.setSettings(settings);
    }
    const offSample = cv?.cursor.onSample((s) => {
      cursorRef.current = s.playfield;
      if (s.error) fail(s.error);
    });
    if (!cv) fail('Hand tracking is unavailable. Return to song select and calibrate again.');

    (async () => {
      if (failed) return;
      let stage: Awaited<ReturnType<typeof createStage>>;
      let clock;
      let skin: Skin | null = null;
      const preparedPp = prepareMapPerformance(map).catch(() => null);
      try {
        skin = await getSkin();
        if (disposed || failed) return;
        stage = await createStage(host, settings.visualMode === 'focus', skin);
        stageDestroy = () => {
          stageDestroy = () => {};
          stage.destroy();
        };
        if (disposed || failed) {
          stageDestroy();
          return;
        }
        clock = await AudioClock.create(map.audio, settings.volume);
      } catch (e) {
        stageDestroy();
        fail(
          e instanceof Error
            ? `Could not start gameplay: ${e.message}`
            : 'Could not start gameplay. Try restarting the map.',
        );
        return;
      }
      if (disposed || failed) {
        stageDestroy();
        clock.stop();
        return;
      }
      clockRef.current = clock;

      const prepared = await preparedPp;
      if (disposed || failed) return;
      ppRef.current = prepared ? new PpCounter(prepared) : null;

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
        if (disposed || failed) return;
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
        // Browsers can suspend/interrupt audio independently of tab visibility.
        if (!clock.running) {
          phaseRef.current = 'paused';
          setPhase('paused');
          return;
        }
        const t = clock.nowMs(settings.audioOffsetMs);
        const cursor = cursorRef.current;
        const events = pendingHits.current.splice(0);
        events.push(...session.tick(t, cursor));
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
        if (state.finished) {
          phaseRef.current = 'done';
          setPhase('done');
          finishTimer = setTimeout(finish, 600);
        }
      };
      rafId = requestAnimationFrame(loop);

      // 3-2-1 countdown, then start audio
      for (let c = 3; c > 0; c--) {
        setCount(c);
        await new Promise((r) => setTimeout(r, 700));
        if (disposed || failed) return;
      }
      clock.start();
      const next = clock.running && !document.hidden ? 'playing' : 'paused';
      if (next === 'paused') clock.pause();
      phaseRef.current = next;
      setPhase(next);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(finishTimer);
      pendingHits.current = [];
      offSample?.();
      clockRef.current?.stop();
      clockRef.current = null;
      stageDestroy();
    };
    // Each play snapshots its settings; a different map starts a new session.
  }, [map]);

  // input: tap keys and pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phaseRef.current === 'playing') {
          phaseRef.current = 'paused';
          clockRef.current?.pause();
          setPhase('paused');
        }
        return;
      }
      if (phaseRef.current !== 'playing' || e.repeat) return;
      const key = e.key.toLowerCase();
      if (settings.inputMode === 'manual' && settings.tapKeys.includes(key)) {
        e.preventDefault();
        const t = clockRef.current?.nowMs(settings.audioOffsetMs) ?? 0;
        const hit = sessionRef.current?.press(t, cursorRef.current);
        if (hit) pendingHits.current.push(hit);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings]);

  // auto-pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === 'playing') {
        phaseRef.current = 'paused';
        clockRef.current?.pause();
        setPhase('paused');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const resume = useCallback(async () => {
    const clock = clockRef.current;
    if (!clock || phaseRef.current !== 'paused') return;
    try {
      await clock.resume();
      if (clock !== clockRef.current || phaseRef.current !== 'paused') return;
      if (document.hidden) {
        clock.pause();
        return;
      }
      phaseRef.current = 'playing';
      setPhase('playing');
    } catch (error) {
      if (clock !== clockRef.current) return;
      clock.stop();
      phaseRef.current = 'done';
      setPhase('done');
      setFatal(error instanceof Error ? error.message : 'Audio could not resume.');
    }
  }, []);

  const quit = useCallback(() => {
    clockRef.current?.stop();
    setScreen('songs');
  }, [setScreen]);

  return { phase, count, fatal, resume, quit };
}
