import { describe, expect, it } from 'vitest';
import {
  APPROVED_CAMERA_MOTION,
  APPROVED_CAMERA_PROJECTION,
  APPROVED_CAMERA_REVISION,
  approvedCameraPresets,
} from './camera-presets';
import { interpolateCalibration } from './camera-calibration';

describe('approved camera presets', () => {
  it('keeps the approved revision, projection, and exact 470px/1800px endpoint poses', () => {
    expect(APPROVED_CAMERA_REVISION).toBe('carlos-2026-10-05-mobile-target');
    expect(APPROVED_CAMERA_PROJECTION).toEqual({
      up: [0, 1, 0],
      near: 0.1,
      far: 500,
    });
    const mobile = approvedCameraPresets(470);
    const desktop = approvedCameraPresets(1800);
    expect(mobile.frontal).toEqual({
      position: [0.0223608681227, 7.6499999761581, 34.1402330458625],
      target: [0.02236086812273, 0.649999976158142, 5.8200001437217],
      fov: 22.3607687487464,
      insets: { top: 160, right: 16, bottom: 20, left: 16 },
      verticalOffset: 0,
    });
    expect(mobile.elevated.target).toEqual([
      -3.97763913187727, -5.81882671926335, 3.8200001437217,
    ]);
    expect(mobile.elevated.fov).toBe(30.3812212878179);
    expect(desktop.frontal.position).toEqual([
      3.0223608681227, 1.64999997615814, 24.1402330458625,
    ]);
    expect(desktop.elevated.target).toEqual([
      3.0223608681227265, 2.18117328073665, 4.8200001437217,
    ]);
    expect(desktop.elevated.position).toEqual([
      30.6220823922084, 30.60710496189, 23.4269573000231,
    ]);
    for (const presets of [mobile, desktop]) {
      expect(
        (presets.elevated.insets.right - presets.elevated.insets.left) / 2,
      ).toBe(155);
      expect(
        (presets.frontal.insets.bottom - presets.frontal.insets.top) / 2,
      ).toBe(-70);
    }
  });

  it('resizes continuously through 700px while clamping below 470px and above 1800px', () => {
    const mobile = approvedCameraPresets(470);
    const boundary = approvedCameraPresets(700);
    const desktop = approvedCameraPresets(1800);
    expect(approvedCameraPresets(320)).toEqual(mobile);
    expect(approvedCameraPresets(2200)).toEqual(desktop);
    expect(
      Math.abs(
        boundary.elevated.target[0] -
          approvedCameraPresets(700.001).elevated.target[0],
      ),
    ).toBeLessThan(0.001);
    for (const width of [
      469.999, 470.001, 699.999, 700, 700.001, 1799.999, 1800.001,
    ]) {
      const before = approvedCameraPresets(width);
      const after = approvedCameraPresets(width + 0.001);
      expect(
        Math.abs(before.elevated.target[0] - after.elevated.target[0]),
      ).toBeLessThan(0.001);
      expect(
        Math.abs(before.elevated.target[1] - after.elevated.target[1]),
      ).toBeLessThan(0.001);
      expect(
        Math.abs(before.elevated.target[2] - after.elevated.target[2]),
      ).toBeLessThan(0.001);
    }
    expect(
      Math.abs(
        approvedCameraPresets(699.999).elevated.target[0] -
          approvedCameraPresets(700.001).elevated.target[0],
      ),
    ).toBeLessThan(0.0001);
    expect(
      Math.abs(
        approvedCameraPresets(699.999).elevated.target[1] -
          approvedCameraPresets(700.001).elevated.target[1],
      ),
    ).toBeLessThan(0.0001);
    expect(
      Math.abs(
        approvedCameraPresets(699.999).elevated.target[2] -
          approvedCameraPresets(700.001).elevated.target[2],
      ),
    ).toBeLessThan(0.0001);
    expect(approvedCameraPresets(585).elevated.target[1]).toBeCloseTo(
      -1.81882671926335,
      12,
    );
    expect(approvedCameraPresets(585).elevated.target[2]).toBeCloseTo(
      4.3200001437217,
      12,
    );
    mobile.frontal.position[0] = 400;
    mobile.elevated.insets.right = 999;
    expect(approvedCameraPresets(470).frontal.position[0]).toBe(
      0.0223608681227,
    );
    expect(approvedCameraPresets(470).elevated.insets.right).toBe(330);
  });

  it('keeps approved endpoints and finite shortest-orbit samples at all calibration widths', () => {
    expect(APPROVED_CAMERA_MOTION).toEqual({
      duration: 4,
      easing: 'easeInOutCubic',
      path: 'orbit',
    });
    for (const width of [470, 700, 1800]) {
      const { frontal, elevated } = approvedCameraPresets(width);
      expect(
        interpolateCalibration(frontal, elevated, 0, APPROVED_CAMERA_MOTION),
      ).toEqual(frontal);
      expect(
        interpolateCalibration(frontal, elevated, 1, APPROVED_CAMERA_MOTION),
      ).toEqual(elevated);
      for (let index = 0; index <= 40; index += 1) {
        const sample = interpolateCalibration(
          frontal,
          elevated,
          index / 40,
          APPROVED_CAMERA_MOTION,
        );
        expect(
          [...sample.position, ...sample.target, sample.fov].every(
            Number.isFinite,
          ),
        ).toBe(true);
      }
      const nearFrontal = interpolateCalibration(
        frontal,
        elevated,
        0.000001,
        APPROVED_CAMERA_MOTION,
      );
      const nearElevated = interpolateCalibration(
        frontal,
        elevated,
        0.999999,
        APPROVED_CAMERA_MOTION,
      );
      expect(
        Math.hypot(
          ...nearFrontal.position.map(
            (value, index) => value - frontal.position[index]!,
          ),
        ),
      ).toBeLessThan(0.00001);
      expect(
        Math.hypot(
          ...nearElevated.position.map(
            (value, index) => value - elevated.position[index]!,
          ),
        ),
      ).toBeLessThan(0.00001);
    }
  });
});
