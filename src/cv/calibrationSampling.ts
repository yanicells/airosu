export const MIN_CALIBRATION_SAMPLES = 8;

export function hasEnoughCalibrationSamples(count: number): boolean {
  return count >= MIN_CALIBRATION_SAMPLES;
}
