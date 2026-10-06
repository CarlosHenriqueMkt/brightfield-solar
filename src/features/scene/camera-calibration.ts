export type CameraPresetName = 'frontal' | 'elevated';
export type CameraVector = [number, number, number];
export interface CameraInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export interface CalibrationPose {
  position: CameraVector;
  target: CameraVector;
  fov: number;
  insets: CameraInsets;
  verticalOffset: number;
}
export interface CalibrationMotion {
  duration: number;
  easing: 'smoothstep' | 'linear' | 'easeInOutCubic';
  path: 'orbit' | 'linear';
}
export interface CalibrationState {
  selected: CameraPresetName;
  presets: Record<CameraPresetName, CalibrationPose>;
  motion: CalibrationMotion;
  progress: number;
  playing: boolean;
}
export const DEFAULT_CALIBRATION_MOTION: CalibrationMotion = {
  duration: 4,
  easing: 'smoothstep',
  path: 'orbit',
};
const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));
export function finiteClamped(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) throw new Error('Use finite numbers.');
  return clamp(value, min, max);
}
export function validateCalibrationPose(
  pose: CalibrationPose,
): CalibrationPose {
  const vector = (v: CameraVector): CameraVector => [
    finiteClamped(v[0], -500, 500),
    finiteClamped(v[1], -500, 500),
    finiteClamped(v[2], -500, 500),
  ];
  const position = vector(pose.position),
    target = vector(pose.target);
  if (Math.hypot(...position.map((v, i) => v - target[i]!)) < 0.01)
    throw new Error('Position and target must be different.');
  const { top, right, bottom, left } = pose.insets;
  return {
    position,
    target,
    fov: finiteClamped(pose.fov, 5, 100),
    insets: {
      top: finiteClamped(top, 0, 2000),
      right: finiteClamped(right, 0, 2000),
      bottom: finiteClamped(bottom, 0, 2000),
      left: finiteClamped(left, 0, 2000),
    },
    verticalOffset: finiteClamped(pose.verticalOffset, -2000, 2000),
  };
}
export function validateCalibrationMotion(
  motion: CalibrationMotion,
): CalibrationMotion {
  if (!['smoothstep', 'linear', 'easeInOutCubic'].includes(motion.easing))
    throw new Error('Unsupported easing.');
  if (!['orbit', 'linear'].includes(motion.path))
    throw new Error('Unsupported camera path.');
  return {
    duration: finiteClamped(motion.duration, 0.2, 30),
    easing: motion.easing,
    path: motion.path,
  };
}
export function interpolateCalibration(
  from: CalibrationPose,
  to: CalibrationPose,
  progress: number,
  motion: CalibrationMotion,
): CalibrationPose {
  const p = finiteClamped(progress, 0, 1);
  if (p === 0) return structuredClone(from);
  if (p === 1) return structuredClone(to);
  const t =
    motion.easing === 'linear'
      ? p
      : motion.easing === 'easeInOutCubic'
        ? p < 0.5
          ? 4 * p * p * p
          : 1 - Math.pow(-2 * p + 2, 3) / 2
        : p * p * (3 - 2 * p);
  const mix = (a: number, b: number): number => a + (b - a) * t;
  const position: CameraVector = [
    mix(from.position[0], to.position[0]),
    mix(from.position[1], to.position[1]),
    mix(from.position[2], to.position[2]),
  ];
  if (motion.path === 'orbit') {
    const dx = from.position[0] - to.target[0],
      dz = from.position[2] - to.target[2];
    const ex = to.position[0] - to.target[0],
      ez = to.position[2] - to.target[2];
    const start = Math.atan2(dz, dx);
    // Shortest orbit: no angular clamp that would jump to the edited endpoint.
    const delta = Math.atan2(
      Math.sin(Math.atan2(ez, ex) - start),
      Math.cos(Math.atan2(ez, ex) - start),
    );
    const radius = mix(Math.hypot(dx, dz), Math.hypot(ex, ez));
    position[0] = to.target[0] + Math.cos(start + delta * t) * radius;
    position[2] = to.target[2] + Math.sin(start + delta * t) * radius;
  }
  return {
    position,
    target: [
      mix(from.target[0], to.target[0]),
      mix(from.target[1], to.target[1]),
      mix(from.target[2], to.target[2]),
    ],
    fov: mix(from.fov, to.fov),
    verticalOffset: mix(from.verticalOffset, to.verticalOffset),
    insets: {
      top: mix(from.insets.top, to.insets.top),
      right: mix(from.insets.right, to.insets.right),
      bottom: mix(from.insets.bottom, to.insets.bottom),
      left: mix(from.insets.left, to.insets.left),
    },
  };
}
