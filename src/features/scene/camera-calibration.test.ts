import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CALIBRATION_MOTION,
  interpolateCalibration,
  validateCalibrationMotion,
  validateCalibrationPose,
  type CalibrationPose,
} from './camera-calibration';

const frontal: CalibrationPose = {
  position: [0, 2, 50],
  target: [0, 2, 0],
  fov: 25.3607687,
  insets: { top: 174.5, right: 12, bottom: 12, left: 12 },
  verticalOffset: 157.9,
};
const elevated: CalibrationPose = {
  position: [30, 35, 20],
  target: [3, 3, 0],
  fov: 32,
  insets: { top: 56, right: 12, bottom: 255.9, left: 12 },
  verticalOffset: 0,
};

describe('camera calibration validation and interpolation', () => {
  it('rejects non-finite and coincident poses while preserving bounded source precision', () => {
    expect(validateCalibrationPose(frontal)).toEqual(frontal);
    expect(() =>
      validateCalibrationPose({ ...frontal, fov: Number.NaN }),
    ).toThrow(Error);
    expect(() =>
      validateCalibrationPose({
        ...frontal,
        position: [Number.POSITIVE_INFINITY, 2, 3],
      }),
    ).toThrow(Error);
    expect(() =>
      validateCalibrationPose({ ...frontal, target: [...frontal.position] }),
    ).toThrow(Error);
    const bounded = validateCalibrationPose({
      ...frontal,
      position: [900, -900, 50],
      fov: 200,
    });
    expect(bounded.position).toEqual([500, -500, 50]);
    expect(bounded.fov).toBe(100);
    expect(frontal.fov).toBe(25.3607687);
  });

  it('supports all approved paths and easings with exact independent endpoints', () => {
    for (const path of ['orbit', 'linear'] as const) {
      for (const easing of [
        'linear',
        'smoothstep',
        'easeInOutCubic',
      ] as const) {
        const motion = { duration: 4, path, easing };
        expect(interpolateCalibration(frontal, elevated, 0, motion)).toEqual(
          frontal,
        );
        expect(interpolateCalibration(frontal, elevated, 1, motion)).toEqual(
          elevated,
        );
        const nearElevated = interpolateCalibration(
          frontal,
          elevated,
          0.999999,
          motion,
        );
        expect(
          Math.hypot(
            ...nearElevated.position.map(
              (value, index) => value - elevated.position[index]!,
            ),
          ),
        ).toBeLessThan(0.001);
        const middle = interpolateCalibration(frontal, elevated, 0.5, motion);
        expect(
          [...middle.position, ...middle.target, middle.fov].every(
            Number.isFinite,
          ),
        ).toBe(true);
      }
    }
  });

  it('clamps motion duration and scrub range and rejects unsupported values', () => {
    expect(
      validateCalibrationMotion({ ...DEFAULT_CALIBRATION_MOTION, duration: 0 })
        .duration,
    ).toBe(0.2);
    expect(
      validateCalibrationMotion({ ...DEFAULT_CALIBRATION_MOTION, duration: 90 })
        .duration,
    ).toBe(30);
    expect(() =>
      validateCalibrationMotion({
        ...DEFAULT_CALIBRATION_MOTION,
        duration: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(Error);
    expect(() =>
      validateCalibrationMotion({
        ...DEFAULT_CALIBRATION_MOTION,
        easing: 'bounce' as 'smoothstep',
      }),
    ).toThrow(Error);
    expect(
      interpolateCalibration(frontal, elevated, -1, DEFAULT_CALIBRATION_MOTION),
    ).toEqual(frontal);
    expect(
      interpolateCalibration(frontal, elevated, 2, DEFAULT_CALIBRATION_MOTION),
    ).toEqual(elevated);
    expect(() =>
      interpolateCalibration(
        frontal,
        elevated,
        Number.NaN,
        DEFAULT_CALIBRATION_MOTION,
      ),
    ).toThrow(Error);
  });
});
