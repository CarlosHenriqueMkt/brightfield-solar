'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  CalibrationMotion,
  CalibrationPose,
  CalibrationState,
  CameraPresetName,
} from '@/features/scene/camera-calibration';
import type {
  BrightfieldInsets,
  BrightfieldViewer,
} from '@/features/scene/viewer';
import styles from './calibration.module.css';

interface CameraCalibrationProps {
  viewer: BrightfieldViewer | null;
  ready: boolean;
  getInsets: () => { initial: BrightfieldInsets; arrival: BrightfieldInsets };
}
type Draft = Record<
  | 'positionX'
  | 'positionY'
  | 'positionZ'
  | 'targetX'
  | 'targetY'
  | 'targetZ'
  | 'fov',
  string
>;
function draftFromPose(pose: CalibrationPose): Draft {
  return {
    positionX: String(pose.position[0]),
    positionY: String(pose.position[1]),
    positionZ: String(pose.position[2]),
    targetX: String(pose.target[0]),
    targetY: String(pose.target[1]),
    targetZ: String(pose.target[2]),
    fov: String(pose.fov),
  };
}
function parse(value: string): number {
  if (!value.trim() || !Number.isFinite(Number(value)))
    throw new RangeError('Enter finite numbers in every camera field.');
  return Number(value);
}

export default function CameraCalibration({
  viewer,
  ready,
  getInsets,
}: CameraCalibrationProps) {
  const [calibration, setCalibration] = useState<CalibrationState | null>(null);
  const [draft, setDraft] = useState<Draft>({
    positionX: '',
    positionY: '',
    positionZ: '',
    targetX: '',
    targetY: '',
    targetZ: '',
    fov: '',
  });
  const [duration, setDuration] = useState('4');
  const [message, setMessage] = useState('');
  const [json, setJson] = useState('');
  const [mode, setMode] = useState<
    'CASA_BASE' | 'REFINADOS_08' | 'MISTO_PREFIXO'
  >('CASA_BASE');
  const [count, setCount] = useState(8);
  const [, setRevision] = useState(0);
  const output = useRef<HTMLTextAreaElement>(null);
  const signature = useRef('');
  const motionDuration = useRef(4);
  const diagnostics = viewer?.snapshot() ?? null;
  const selected = calibration?.selected ?? 'frontal';
  const preset = calibration?.presets[selected];

  useEffect(() => {
    if (!viewer) return;
    viewer.setCalibrationListener((next) => {
      setCalibration(next);
      if (!next) return;
      const nextSignature =
        next.selected + JSON.stringify(next.presets[next.selected]);
      if (signature.current !== nextSignature) {
        signature.current = nextSignature;
        setDraft(draftFromPose(next.presets[next.selected]));
      }
      if (motionDuration.current !== next.motion.duration) {
        motionDuration.current = next.motion.duration;
        setDuration(String(next.motion.duration));
      }
    });
    return () => viewer.setCalibrationListener(null);
  }, [viewer]);
  useEffect(() => {
    if (!viewer || !ready) return;
    viewer.beginCalibration(
      getInsets().initial,
      getInsets().arrival,
      'frontal',
    );
    return () => viewer.endCalibration();
  }, [viewer, ready, getInsets]);

  function run(action: () => void) {
    try {
      action();
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Camera update failed.',
      );
    }
  }
  function applySolar(nextMode: typeof mode, nextCount = count) {
    setMode(nextMode);
    viewer?.setSolarState(
      nextMode === 'CASA_BASE'
        ? { mode: 'CASA_BASE' }
        : nextMode === 'REFINADOS_08'
          ? { mode: 'REFINADOS_08' }
          : { mode: 'MISTO_PREFIXO', n: nextCount },
    );
    setRevision((value) => value + 1);
  }
  function motion(patch: Partial<CalibrationMotion>) {
    run(() => {
      if (calibration)
        viewer?.updateCalibrationMotion({
          ...calibration.motion,
          duration: parse(duration),
          ...patch,
        });
    });
  }
  function generate() {
    run(() => {
      viewer?.pauseCalibration();
      setJson(JSON.stringify(viewer?.exportCameraCalibration(), null, 2));
      setMessage(
        'Current camera JSON generated. Review, copy or download it below.',
      );
    });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setMessage('Camera JSON copied.');
    } catch {
      output.current?.focus();
      output.current?.select();
      setMessage('Text selected. Use Copy or Ctrl+C to copy the JSON.');
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([json], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'brightfield-camera-calibration.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={styles.tool} aria-label="Technical camera calibration">
      <h1>Brightfield scene calibration</h1>
      <p>
        Development only. Session edits do not change the approved presets.
        Revision: carlos-2026-10-05-mobile-target.
      </p>
      {!calibration ? (
        <button
          disabled={!ready}
          onClick={() =>
            run(() =>
              viewer?.beginCalibration(
                getInsets().initial,
                getInsets().arrival,
                'frontal',
              ),
            )
          }
        >
          Activate calibration
        </button>
      ) : (
        <>
          <label>
            Preset in editing
            <select
              value={selected}
              onChange={(event) =>
                run(() =>
                  viewer?.selectCalibrationPreset(
                    event.target.value as CameraPresetName,
                  ),
                )
              }
            >
              <option value="frontal">Frontal</option>
              <option value="elevated">Elevated</option>
            </select>
          </label>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              run(() => {
                if (preset)
                  viewer?.updateCalibrationPose(selected, {
                    ...preset,
                    position: [
                      parse(draft.positionX),
                      parse(draft.positionY),
                      parse(draft.positionZ),
                    ],
                    target: [
                      parse(draft.targetX),
                      parse(draft.targetY),
                      parse(draft.targetZ),
                    ],
                    fov: parse(draft.fov),
                  });
              });
            }}
          >
            <fieldset disabled={calibration.playing}>
              <legend>Camera position · XYZ</legend>
              <div className={styles.vector}>
                {(['positionX', 'positionY', 'positionZ'] as const).map(
                  (field, axis) => (
                    <label key={field}>
                      {['X', 'Y', 'Z'][axis]}
                      <input
                        aria-label={`Camera position ${['X', 'Y', 'Z'][axis]}`}
                        type="number"
                        step="any"
                        required
                        value={draft[field]}
                        onChange={(event) =>
                          setDraft({ ...draft, [field]: event.target.value })
                        }
                      />
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            <fieldset disabled={calibration.playing}>
              <legend>Camera target · XYZ</legend>
              <div className={styles.vector}>
                {(['targetX', 'targetY', 'targetZ'] as const).map(
                  (field, axis) => (
                    <label key={field}>
                      {['X', 'Y', 'Z'][axis]}
                      <input
                        aria-label={`Camera target ${['X', 'Y', 'Z'][axis]}`}
                        type="number"
                        step="any"
                        required
                        value={draft[field]}
                        onChange={(event) =>
                          setDraft({ ...draft, [field]: event.target.value })
                        }
                      />
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            <label>
              Vertical FOV · degrees
              <input
                aria-label="Vertical FOV"
                type="number"
                step="any"
                required
                disabled={calibration.playing}
                value={draft.fov}
                onChange={(event) =>
                  setDraft({ ...draft, fov: event.target.value })
                }
              />
            </label>
            <div className={styles.actions}>
              <button type="submit" disabled={calibration.playing}>
                Apply pose
              </button>
              <button
                type="button"
                disabled={calibration.playing}
                onClick={() => run(() => viewer?.captureCalibrationPreset())}
              >
                Use current pose in this preset
              </button>
            </div>
          </form>
          <p>
            XYZ: −500 to 500; FOV: 5° to 100°. The approved composition offsets
            are preserved. The drawer does not move the camera. Applying an
            out-of-range value clamps it to the supported range.
          </p>
          <fieldset>
            <legend>Frontal → elevated motion</legend>
            <label>
              Duration · seconds
              <input
                aria-label="Motion duration"
                type="number"
                min="0.2"
                max="30"
                step="0.1"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                onBlur={() => motion({})}
              />
            </label>
            <label>
              Easing
              <select
                value={calibration.motion.easing}
                onChange={(event) =>
                  motion({
                    easing: event.target.value as CalibrationMotion['easing'],
                  })
                }
              >
                <option value="smoothstep">Smoothstep</option>
                <option value="linear">Linear</option>
                <option value="easeInOutCubic">Ease in/out cubic</option>
              </select>
            </label>
            <label>
              Path
              <select
                value={calibration.motion.path}
                onChange={(event) =>
                  motion({
                    path: event.target.value as CalibrationMotion['path'],
                  })
                }
              >
                <option value="orbit">Orbit</option>
                <option value="linear">Direct line</option>
              </select>
            </label>
            <label>
              Manual preview · {Math.round(calibration.progress * 100)}%
              <input
                aria-label="Manual camera progress"
                type="range"
                min="0"
                max="1000"
                step="1"
                value={Math.round(calibration.progress * 1000)}
                onChange={(event) =>
                  run(() =>
                    viewer?.seekCalibration(Number(event.target.value) / 1000),
                  )
                }
              />
            </label>
            <div className={styles.actions}>
              <button
                disabled={calibration.playing}
                onClick={() =>
                  run(() => {
                    viewer?.updateCalibrationMotion({
                      ...calibration.motion,
                      duration: parse(duration),
                    });
                    viewer?.playCalibration();
                  })
                }
              >
                Play
              </button>
              <button
                disabled={!calibration.playing}
                onClick={() => viewer?.pauseCalibration()}
              >
                Pause
              </button>
              <button onClick={() => run(() => viewer?.seekCalibration(0))}>
                Return to start
              </button>
            </div>
            <p>Reduced motion moves directly to the elevated destination.</p>
          </fieldset>
          <div className={styles.actions}>
            <button
              onClick={() =>
                run(() => viewer?.restoreApprovedCalibrationPreset())
              }
            >
              Restore approved preset at this width
            </button>
            <button onClick={() => viewer?.endCalibration()}>
              Exit calibration
            </button>
          </div>
        </>
      )}
      <p>
        Resizing during editing retains session adjustments. Restore applies the
        approved preset for the current width to the selected view only.
      </p>
      <fieldset>
        <legend>Solar state</legend>
        <div className={styles.actions}>
          <button
            aria-pressed={mode === 'CASA_BASE'}
            onClick={() => applySolar('CASA_BASE')}
          >
            CASA_BASE (0)
          </button>
          <button
            aria-pressed={mode === 'REFINADOS_08'}
            onClick={() => applySolar('REFINADOS_08')}
          >
            REFINADOS_08 (8)
          </button>
          {[0, 8, 17, 21, 42, 51].map((value) => (
            <button
              key={value}
              aria-pressed={mode === 'MISTO_PREFIXO' && count === value}
              onClick={() => {
                setCount(value);
                applySolar('MISTO_PREFIXO', value);
              }}
            >
              MISTO_PREFIXO {value}
            </button>
          ))}
        </div>
        <label>
          Mixed prefix: {count}
          <input
            aria-label="Mixed panel count"
            type="range"
            min={0}
            max={51}
            value={count}
            onChange={(event) => {
              const value = Number(event.target.value);
              setCount(value);
              applySolar('MISTO_PREFIXO', value);
            }}
          />
        </label>
      </fieldset>
      <div className={styles.actions}>
        <button onClick={() => viewer?.simulateContextLoss()}>
          Simulate context loss
        </button>
        <button onClick={() => viewer?.recover()}>Retry WebGL</button>
        <button disabled={!ready} onClick={generate}>
          Pause and generate current JSON
        </button>
      </div>
      {json && (
        <>
          <label>
            Current camera JSON
            <textarea
              ref={output}
              aria-label="Current camera JSON"
              value={json}
              readOnly
              rows={8}
              spellCheck={false}
            />
          </label>
          <div className={styles.actions}>
            <button onClick={() => void copy()}>Copy JSON</button>
            <button onClick={download}>Download JSON</button>
          </div>
        </>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
      <pre className={styles.diagnostics}>
        {JSON.stringify(diagnostics, null, 2)}
      </pre>
    </section>
  );
}
