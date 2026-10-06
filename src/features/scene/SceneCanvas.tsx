'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import {
  BrightfieldViewer,
  type BrightfieldInsets,
  type SceneIntent,
} from './viewer';

export interface SceneCanvasProps {
  intent: SceneIntent;
  onReady?: () => void;
  onError?: (message: string) => void;
  onArrival?: (destination: 'frontal' | 'elevated', revision: number) => void;
  onViewer?: (viewer: BrightfieldViewer | null) => void;
  className?: string;
  style?: CSSProperties;
}
export type { BrightfieldInsets, SceneIntent };

interface DevHost extends HTMLDivElement {
  __brightfieldViewer?: BrightfieldViewer;
}

export default function SceneCanvas({
  intent,
  onReady,
  onError,
  onArrival,
  onViewer,
  className,
  style,
}: SceneCanvasProps) {
  const hostRef = useRef<DevHost | null>(null);
  const viewerRef = useRef<BrightfieldViewer | null>(null);
  const readyRef = useRef(onReady);
  const errorRef = useRef(onError);
  const arrivalRef = useRef(onArrival);
  const viewerCallbackRef = useRef(onViewer);

  useEffect(() => {
    readyRef.current = onReady;
    errorRef.current = onError;
    arrivalRef.current = onArrival;
    viewerCallbackRef.current = onViewer;
  }, [onReady, onError, onArrival, onViewer]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const viewer = new BrightfieldViewer(host, {
      onReady: () => readyRef.current?.(),
      onError: (message) => errorRef.current?.(message),
      onArrival: (destination, revision) =>
        arrivalRef.current?.(destination, revision),
    });
    viewerRef.current = viewer;
    viewerCallbackRef.current?.(viewer);
    if (process.env.NODE_ENV === 'development')
      host.__brightfieldViewer = viewer;
    void viewer.load();
    return () => {
      if (
        process.env.NODE_ENV === 'development' &&
        host.__brightfieldViewer === viewer
      )
        delete host.__brightfieldViewer;
      viewer.dispose();
      viewerRef.current = null;
      viewerCallbackRef.current?.(null);
    };
  }, []);

  useEffect(() => {
    viewerRef.current?.setIntent(intent);
  }, [intent]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
      data-scene-canvas="finished-v04"
    />
  );
}
