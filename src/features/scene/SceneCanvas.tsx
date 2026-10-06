'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import {
  BrightfieldViewer,
  type BrightfieldInsets,
  type SceneIntent,
} from './viewer';
import type { ChoreographySnapshot } from './choreography';

export interface SceneCanvasProps {
  intent: SceneIntent;
  onReady?: () => void;
  onError?: (message: string) => void;
  onArrival?: (destination: 'frontal' | 'elevated', revision: number) => void;
  onChoreography?: (snapshot: ChoreographySnapshot) => void;
  onViewer?: (viewer: BrightfieldViewer | null) => void;
  className?: string;
  style?: CSSProperties;
}
export type { BrightfieldInsets, SceneIntent };
export type { ChoreographySnapshot };

interface DevHost extends HTMLDivElement {
  __brightfieldViewer?: BrightfieldViewer;
}

export default function SceneCanvas({
  intent,
  onReady,
  onError,
  onArrival,
  onChoreography,
  onViewer,
  className,
  style,
}: SceneCanvasProps) {
  const hostRef = useRef<DevHost | null>(null);
  const viewerRef = useRef<BrightfieldViewer | null>(null);
  const readyRef = useRef(onReady);
  const errorRef = useRef(onError);
  const arrivalRef = useRef(onArrival);
  const choreographyRef = useRef(onChoreography);
  const viewerCallbackRef = useRef(onViewer);
  useEffect(() => {
    readyRef.current = onReady;
    errorRef.current = onError;
    arrivalRef.current = onArrival;
    choreographyRef.current = onChoreography;
    viewerCallbackRef.current = onViewer;
  }, [onReady, onError, onArrival, onChoreography, onViewer]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const viewer = new BrightfieldViewer(host, {
      onReady: () => readyRef.current?.(),
      onError: (message) => errorRef.current?.(message),
      onArrival: (destination, revision) =>
        arrivalRef.current?.(destination, revision),
      onChoreography: (snapshot) => choreographyRef.current?.(snapshot),
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
