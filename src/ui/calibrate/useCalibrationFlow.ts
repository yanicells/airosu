import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultBox, isAtCalibrationCorner, MIN_CALIBRATION_SAMPLES } from '../../cv/calibration';
import type { CalibrationBox } from '../../cv/calibration';
import type { CvSession } from '../../cv/cvSession';
import { getCvSession } from '../../cv/cvSession';
import type { Settings } from '../appState';

export type CalibrationStep = 'loading' | 'error' | 'intro' | 'corner1' | 'corner2' | 'test';
const SAMPLE_MS = 2000;

export function useCalibrationFlow(settings: Settings, initialBox?: CalibrationBox) {
  const [step, setStep] = useState<CalibrationStep>('loading');
  const [error, setError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [session, setSession] = useState<CvSession | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [box, setBox] = useState<CalibrationBox>(initialBox ?? defaultBox());
  const samples = useRef(0);
  const collecting = useRef(false);
  const connection = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const connect = useCallback(() => {
    const id = ++connection.current;
    setStep('loading');
    setError(null);
    void getCvSession().then((s) => {
      if (id !== connection.current) return;
      setSession(s);
      setStep('intro');
    }).catch((e) => {
      if (id !== connection.current) return;
      setError(e instanceof Error ? e.message : 'Camera unavailable');
      setStep('error');
    });
  }, []);
  useEffect(() => {
    connect();
    return () => { connection.current++; clearInterval(timer.current); collecting.current = false; };
  }, [connect]);

  useEffect(() => session?.cursor.onSample((sample) => {
    if (collecting.current && sample.camera && isAtCalibrationCorner(
      sample.camera, box, step === 'corner1' ? 'top-left' : 'bottom-right', settings.sensitivity, settings.mirror,
    )) samples.current++;
  }), [session, box, step, settings.sensitivity, settings.mirror]);

  const collect = useCallback((corner: 'corner1' | 'corner2') => {
    clearInterval(timer.current);
    setCaptureError(null);
    setStep(corner);
    samples.current = 0;
    collecting.current = true;
    const start = performance.now();
    setCountdown(SAMPLE_MS / 1000);
    timer.current = setInterval(() => {
      const left = SAMPLE_MS - (performance.now() - start);
      setCountdown(Math.max(0, Math.ceil(left / 1000)));
      if (left > 0) return;
      clearInterval(timer.current);
      collecting.current = false;
      if (samples.current < MIN_CALIBRATION_SAMPLES) {
        setCaptureError('Hold your hand on the target. Resize the area if it is hard to reach.');
        setStep(corner === 'corner1' ? 'intro' : 'corner2');
      } else setStep(corner === 'corner1' ? 'corner2' : 'test');
    }, 100);
  }, []);

  return {
    step, error, captureError, session, countdown, box, setBox, connect,
    startCorner1: () => collect('corner1'),
    startCorner2: () => collect('corner2'),
    testArea: () => { setCaptureError(null); setStep('test'); },
    editArea: () => { clearInterval(timer.current); collecting.current = false; setCountdown(0); setCaptureError(null); setStep('intro'); },
  };
}
