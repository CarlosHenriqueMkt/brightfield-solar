import {
  interpolateCalibration,
  type CalibrationMotion,
  type CalibrationState,
} from './camera-calibration';

// Carlos's approved chat exports. Use calibration.presets, never baselinePresets.
// Insets are artistic composition in CSS pixels, not a promise to avoid the modal.
export const APPROVED_CAMERA_REVISION = 'carlos-2026-10-05-mobile-target';
export const APPROVED_CAMERA_PROJECTION = {
  up: [0, 1, 0] as [number, number, number],
  near: 0.1,
  far: 500,
};
export const APPROVED_CAMERA_MOTION: CalibrationMotion = {
  duration: 4,
  easing: 'easeInOutCubic',
  path: 'orbit',
};
export const DESKTOP_REFERENCE_CANVAS = { width: 1800, height: 697 };
const DESKTOP_PRESETS: CalibrationState['presets'] = {
  frontal: {
    position: [3.0223608681227, 1.64999997615814, 24.1402330458625],
    target: [3.02236086812273, 1.649999976158142, 4.8200001437217],
    fov: 25.360768748746445,
    insets: {
      top: 160,
      right: 16,
      bottom: 20,
      left: 16,
    },
    verticalOffset: 0,
  },
  elevated: {
    position: [30.6220823922084, 30.60710496189, 23.4269573000231],
    target: [3.0223608681227265, 2.18117328073665, 4.8200001437217],
    fov: 26.381221287817866,
    insets: {
      top: 20,
      right: 330,
      bottom: 20,
      left: 20,
    },
    verticalOffset: 0,
  },
};
export const MOBILE_REFERENCE_CANVAS = { width: 470, height: 605 };
const MOBILE_PRESETS: CalibrationState['presets'] = {
  frontal: {
    position: [0.0223608681227, 7.6499999761581, 34.1402330458625],
    target: [0.02236086812273, 0.649999976158142, 5.8200001437217],
    fov: 22.3607687487464,
    insets: {
      top: 160,
      right: 16,
      bottom: 20,
      left: 16,
    },
    verticalOffset: 0,
  },
  elevated: {
    position: [30.6220823922084, 30.60710496189, 23.4269573000231],
    target: [-3.97763913187727, -5.81882671926335, 3.8200001437217],
    fov: 30.3812212878179,
    insets: {
      top: 20,
      right: 330,
      bottom: 20,
      left: 20,
    },
    verticalOffset: 0,
  },
};

// Same mobile boundary as Poc.tsx / globals.css. Desktop must retain its old blend.
export const MOBILE_LAYOUT_MAX_WIDTH = 700;
// Historical blend anchor is retained solely to avoid propagating a mobile-only
// edit into desktop widths. The approved mobile endpoint above is the new target.
const MOBILE_BLEND_ANCHOR: CalibrationState['presets'] =
  structuredClone(MOBILE_PRESETS);
MOBILE_BLEND_ANCHOR.elevated.target = [
  -3.97763913187727, 2.18117328073665, 4.8200001437217,
];

// Approval: Sentinel_98348ab7480c81918d9cf3be7196abfa, 2026-10-05T21:31:54.689Z.
// Height still changes only aspect; no fit-to-overlay or extrapolation.
export function approvedCameraPresets(
  canvasWidth: number,
): CalibrationState['presets'] {
  if (!Number.isFinite(canvasWidth))
    throw new Error('Canvas width must be finite.');
  const t = Math.max(
    0,
    Math.min(
      1,
      (canvasWidth - MOBILE_REFERENCE_CANVAS.width) /
        (DESKTOP_REFERENCE_CANVAS.width - MOBILE_REFERENCE_CANVAS.width),
    ),
  );
  const mix: CalibrationMotion = {
    duration: 4,
    easing: 'linear',
    path: 'linear',
  };
  const presets = {
    frontal: interpolateCalibration(
      MOBILE_BLEND_ANCHOR.frontal,
      DESKTOP_PRESETS.frontal,
      t,
      mix,
    ),
    elevated: interpolateCalibration(
      MOBILE_BLEND_ANCHOR.elevated,
      DESKTOP_PRESETS.elevated,
      t,
      mix,
    ),
  };
  if (canvasWidth <= MOBILE_REFERENCE_CANVAS.width) {
    presets.elevated = structuredClone(MOBILE_PRESETS.elevated);
  } else if (canvasWidth < MOBILE_LAYOUT_MAX_WIDTH) {
    // Fade only the edited target coordinates into the unchanged boundary pose.
    // This preserves all desktop sizes and avoids a discontinuity at 700px.
    const boundaryT =
      (MOBILE_LAYOUT_MAX_WIDTH - MOBILE_REFERENCE_CANVAS.width) /
      (DESKTOP_REFERENCE_CANVAS.width - MOBILE_REFERENCE_CANVAS.width);
    const boundary = interpolateCalibration(
      MOBILE_BLEND_ANCHOR.elevated,
      DESKTOP_PRESETS.elevated,
      boundaryT,
      mix,
    );
    const mobileT =
      (canvasWidth - MOBILE_REFERENCE_CANVAS.width) /
      (MOBILE_LAYOUT_MAX_WIDTH - MOBILE_REFERENCE_CANVAS.width);
    for (const axis of [1, 2] as const) {
      const from = MOBILE_PRESETS.elevated.target[axis];
      presets.elevated.target[axis] =
        from + (boundary.target[axis] - from) * mobileT;
    }
  }
  return presets;
}
