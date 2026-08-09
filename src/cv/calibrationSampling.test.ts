import { describe, expect, it } from 'vitest';
import { hasEnoughCalibrationSamples, MIN_CALIBRATION_SAMPLES } from './calibrationSampling';

describe('hasEnoughCalibrationSamples', () => {
  it('rejects missing or partial hand tracking captures', () => {
    expect(hasEnoughCalibrationSamples(0)).toBe(false);
    expect(hasEnoughCalibrationSamples(MIN_CALIBRATION_SAMPLES - 1)).toBe(false);
  });

  it('accepts a sustained tracked-hand capture', () => {
    expect(hasEnoughCalibrationSamples(MIN_CALIBRATION_SAMPLES)).toBe(true);
  });
});
