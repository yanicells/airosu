import { useCallback, useEffect, useRef, useState } from 'react';
import type { Vec2 } from '../../beatmap/model';
import { boxFromSamples, defaultBox } from '../../cv/calibration';
import type { CalibrationBox } from '../../cv/calibration';
import type { CvSession } from '../../cv/cvSession';
import { getCvSession } from '../../cv/cvSession';

export type CalibrationStep = 'loading' | 'error' | 'intro' | 'corner1' | 'corner2' | 'test';

const SAMPLE_MS = 2000;

export function useCalibrationFlow() {
  const [step, setStep] = useState<CalibrationStep>('loading');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CvSession | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [box, setBox] = useState<CalibrationBox>(defaultBox());
  const samplesRef = useRef<Vec2[]>([]);
  const cameraRef = useRef<Vec2 | null>(null);
  const collectingRef = useRef(false);

  const connect = useCallback(() => {
    setStep('loading');
    setError(null);
    getCvSession()
      .then((s) => {
        setSession(s);
        setStep('intro');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Camera unavailable');
        setStep('error');
      });
  }, []);

  useEffect(connect, [connect]);

  useEffect(() => {
    if (!session) return;
    return session.cursor.onSample((s) => {
      cameraRef.current = s.camera;
      if (collectingRef.current && s.camera) samplesRef.current.push(s.camera);
    });
  }, [session]);

  const collect = useCallback((next: () => void) => {
    collectingRef.current = true;
    const start = performance.now();
    setCountdown(SAMPLE_MS / 1000);
    const timer = setInterval(() => {
      const left = SAMPLE_MS - (performance.now() - start);
      setCountdown(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) {
        clearInterval(timer);
        collectingRef.current = false;
        next();
      }
    }, 100);
  }, []);

  const startCorner1 = useCallback(() => {
    samplesRef.current = [];
    setStep('corner1');
    collect(() => {
      setStep('corner2');
    });
  }, [collect]);

  const startCorner2 = useCallback(() => {
    collect(() => {
      setBox(boxFromSamples(samplesRef.current));
      setStep('test');
    });
  }, [collect]);

  const skip = useCallback(() => {
    setBox(defaultBox());
    setStep('test');
  }, []);

  return { step, error, session, countdown, box, connect, startCorner1, startCorner2, skip };
}
