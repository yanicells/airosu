import { useCallback, useEffect, useRef, useState } from 'react';
import type { Vec2 } from '../../beatmap/model';
import { boxFromSamples, defaultBox } from '../../cv/calibration';
import type { CalibrationBox } from '../../cv/calibration';
import { hasEnoughCalibrationSamples } from '../../cv/calibrationSampling';
import type { CvSession } from '../../cv/cvSession';
import { getCvSession } from '../../cv/cvSession';

export type CalibrationStep = 'loading' | 'error' | 'intro' | 'corner1' | 'corner2' | 'test';

const SAMPLE_MS = 2000;

export function useCalibrationFlow() {
  const [step, setStep] = useState<CalibrationStep>('loading');
  const [error, setError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [session, setSession] = useState<CvSession | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [box, setBox] = useState<CalibrationBox>(defaultBox());
  const samplesRef = useRef<Vec2[]>([]);
  const corner1SamplesRef = useRef<Vec2[]>([]);
  const cameraRef = useRef<Vec2 | null>(null);
  const collectingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      collectingRef.current = false;
    },
    [],
  );

  const collect = useCallback((next: (sampleCount: number) => void) => {
    if (timerRef.current) clearInterval(timerRef.current);
    collectingRef.current = true;
    const initialSampleCount = samplesRef.current.length;
    const start = performance.now();
    setCountdown(SAMPLE_MS / 1000);
    timerRef.current = setInterval(() => {
      const left = SAMPLE_MS - (performance.now() - start);
      setCountdown(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
        collectingRef.current = false;
        next(samplesRef.current.length - initialSampleCount);
      }
    }, 100);
  }, []);

  const startCorner1 = useCallback(() => {
    setCaptureError(null);
    samplesRef.current = [];
    corner1SamplesRef.current = [];
    setStep('corner1');
    collect((sampleCount) => {
      if (!hasEnoughCalibrationSamples(sampleCount)) {
        setCaptureError('Hand tracking dropped out. Keep your hand visible, then try again.');
        setStep('intro');
        return;
      }
      corner1SamplesRef.current = [...samplesRef.current];
      setStep('corner2');
    });
  }, [collect]);

  const startCorner2 = useCallback(() => {
    setCaptureError(null);
    samplesRef.current = [...corner1SamplesRef.current];
    collect((sampleCount) => {
      if (!hasEnoughCalibrationSamples(sampleCount)) {
        setCaptureError('Tracking was interrupted. Hold the target again when ready.');
        return;
      }
      setBox(boxFromSamples(samplesRef.current));
      setStep('test');
    });
  }, [collect]);

  const skip = useCallback(() => {
    setCaptureError(null);
    setBox(defaultBox());
    setStep('test');
  }, []);

  return {
    step,
    error,
    captureError,
    session,
    countdown,
    box,
    connect,
    startCorner1,
    startCorner2,
    skip,
  };
}
