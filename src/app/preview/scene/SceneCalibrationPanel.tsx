'use client';

import { useCallback, useState } from 'react';
import SceneCanvas from '../../../features/scene/SceneCanvas';
import type {
  BrightfieldViewer,
  SceneIntent,
} from '../../../features/scene/viewer';
import CameraCalibration from './CameraCalibration';
import styles from './calibration.module.css';

export default function SceneCalibrationPanel() {
  const [viewer, setViewer] = useState<BrightfieldViewer | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [intent] = useState<SceneIntent>({
    active: false,
    panelCount: 0,
    reducedMotion: false,
    revision: 0,
  });
  const getInsets = useCallback(
    () => ({
      initial: { top: 0, right: 0, bottom: 0, left: 0 },
      arrival: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
    [],
  );

  return (
    <main className={styles.page}>
      <div className={styles.scene}>
        <SceneCanvas
          intent={intent}
          onViewer={setViewer}
          onReady={() => {
            setReady(true);
            setError('');
          }}
          onError={(message) => {
            setReady(false);
            setError(message);
          }}
        />
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <CameraCalibration viewer={viewer} ready={ready} getInsets={getInsets} />
    </main>
  );
}
