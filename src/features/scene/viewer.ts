import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  INTERSECTION_THRESHOLDS,
  shouldRenderAtIntersection,
} from './visibility';
import {
  APPROVED_CAMERA_MOTION,
  APPROVED_CAMERA_PROJECTION,
  APPROVED_CAMERA_REVISION,
  approvedCameraPresets,
} from './camera-presets';
import {
  finiteClamped,
  interpolateCalibration,
  validateCalibrationMotion,
  validateCalibrationPose,
  type CalibrationMotion,
  type CalibrationPose,
  type CalibrationState,
  type CameraPresetName,
} from './camera-calibration';
import { selectAssetSource, type AssetDescriptor } from './asset-source';
import {
  applySolarState,
  inspectSolarState,
  resolveAsset,
  validateManifest,
  type Manifest,
  type ResolvedAsset,
  type SolarState,
} from './solar';
import {
  ChoreographyTimeline,
  normalizeLeadIn,
  type ChoreographySnapshot,
} from './choreography';

export interface BrightfieldInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BrightfieldViewerCallbacks {
  onReady: () => void;
  onError: (message: string) => void;
  onArrival: (destination: 'frontal' | 'elevated', revision: number) => void;
  onStatus?: (message: string) => void;
  onChoreography?: (snapshot: ChoreographySnapshot) => void;
}

export interface SceneIntent {
  active: boolean;
  panelCount: number;
  reducedMotion: boolean;
  revision: number;
  leadInSeconds?: number;
}

interface SharedAsset {
  key: string;
  refs: number;
  promise: Promise<{ scene: THREE.Group; manifest: Manifest }>;
}

interface Journey {
  elapsed: number;
  duration: number;
  leadIn: number;
  from: CalibrationPose;
  to: CalibrationPose;
  destination: 'frontal' | 'elevated';
  revision: number;
}
interface PanelTransitionBase {
  target: SolarState;
  pendingIds: string[];
  elapsed: number;
  starts: Map<string, number>;
}
type PanelTransition = PanelTransitionBase &
  (
    | { direction: 'in' }
    | {
        direction: 'out';
        fromProgress: Map<string, number>;
        continuationStarts: Map<string, number>;
      }
  );

interface PanelWrapperRecord {
  wrapper: THREE.Group;
  parent: THREE.Object3D;
  module: THREE.Object3D;
  support: THREE.Object3D;
  originalChildren: THREE.Object3D[];
}

interface Arrival {
  destination: 'frontal' | 'elevated';
  revision: number;
}

interface LifecycleCounters {
  loads: number;
  successfulLoads: number;
  failedLoads: number;
  disposeCalls: number;
  rafScheduled: number;
  rafExecuted: number;
  rafCanceled: number;
  frames: number;
  firstFrames: number;
  contextLost: number;
  contextRestored: number;
  visibilityPauses: number;
  visibilityResumes: number;
  resizeEvents: number;
  intersectionEvents: number;
}

const sharedAssets = new Map<string, SharedAsset>();
const loader = new GLTFLoader();
const DPR_MAX = 1.5;
const JOURNEY_DURATION = 4;
const globalLifecycle = {
  activeRenderers: 0,
  activeListeners: 0,
  activeObservers: 0,
  pendingRAF: 0,
  loadGenerations: 0,
};

function now(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stateForPanelCount(panelCount: number): SolarState {
  const count = clamp(Math.round(panelCount), 0, 51);
  if (count === 0) return { mode: 'CASA_BASE' };
  return { mode: 'MISTO_PREFIXO', n: count };
}

export const PANEL_TWEEN_DURATION = 150;

export function panelAnimationInterval(additionCount: number): number {
  const count = Math.max(1, Math.round(additionCount));
  return Math.min(40, 1300 / Math.max(1, count - 1));
}
function poseDistance(from: CalibrationPose, to: CalibrationPose): number {
  const position = Math.hypot(
    ...from.position.map((value, index) => value - to.position[index]!),
  );
  const target = Math.hypot(
    ...from.target.map((value, index) => value - to.target[index]!),
  );
  const insets =
    Math.hypot(
      from.insets.top - to.insets.top,
      from.insets.right - to.insets.right,
      from.insets.bottom - to.insets.bottom,
      from.insets.left - to.insets.left,
    ) / 100;
  return position + target + Math.abs(from.fov - to.fov) / 10 + insets;
}

function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    const values = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    values.forEach((material) => {
      if (!material) return;
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

function resourceSnapshot(
  root: THREE.Object3D | null,
): Record<string, unknown> {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let meshes = 0;
  root?.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes += 1;
    geometries.add(mesh.geometry);
    const values = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    values.forEach((material) => {
      if (!material) return;
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  });
  return {
    meshes,
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size,
  };
}

async function fetchManifest(url: string): Promise<Manifest> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
  return validateManifest((await response.json()) as unknown);
}

function getSharedAsset(source: AssetDescriptor): SharedAsset {
  const key = `${source.manifestUrl}|${source.glbUrl}`;
  const existing = sharedAssets.get(key);
  if (existing) {
    existing.refs += 1;
    return existing;
  }
  const entry: SharedAsset = {
    key,
    refs: 1,
    promise: Promise.allSettled([
      fetchManifest(source.manifestUrl),
      loader.loadAsync(source.glbUrl),
    ]).then(([manifest, gltf]) => {
      if (manifest.status === 'rejected') {
        if (gltf.status === 'fulfilled') disposeObject(gltf.value.scene);
        throw manifest.reason;
      }
      if (gltf.status === 'rejected') throw gltf.reason;
      return { scene: gltf.value.scene, manifest: manifest.value };
    }),
  };
  entry.promise.catch(() => {
    if (sharedAssets.get(key) === entry) sharedAssets.delete(key);
  });
  sharedAssets.set(key, entry);
  return entry;
}

function releaseSharedAsset(entry: SharedAsset): void {
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs > 0) return;
  entry.promise
    .then(({ scene }) => {
      if (entry.refs === 0) disposeObject(scene);
    })
    .catch(() => undefined);
  if (sharedAssets.get(entry.key) === entry) sharedAssets.delete(entry.key);
}

export function getLifecycleDiagnostics(): Record<string, unknown> {
  return { ...globalLifecycle };
}

export class BrightfieldViewer {
  private readonly host: HTMLDivElement;
  private readonly callbacks: BrightfieldViewerCallbacks;
  private readonly canvas: HTMLCanvasElement;
  private readonly skyLoader = new THREE.TextureLoader();
  private readonly renderSize = new THREE.Vector2();
  private readonly actualCameraTarget = new THREE.Vector3();
  private readonly counters: LifecycleCounters = {
    loads: 0,
    successfulLoads: 0,
    failedLoads: 0,
    disposeCalls: 0,
    rafScheduled: 0,
    rafExecuted: 0,
    rafCanceled: 0,
    frames: 0,
    firstFrames: 0,
    contextLost: 0,
    contextRestored: 0,
    visibilityPauses: 0,
    visibilityResumes: 0,
    resizeEvents: 0,
    intersectionEvents: 0,
  };
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private root: THREE.Object3D | null = null;
  private resolvedAsset: ResolvedAsset | null = null;
  private shared: SharedAsset | null = null;
  private sharedReleased = true;
  private assetSource: AssetDescriptor | null = null;
  private skyTexture: THREE.Texture | null = null;
  private contextRecovery: {
    loseContext(): void;
    restoreContext(): void;
  } | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private rafId: number | null = null;
  private loadPromise: Promise<void> | null = null;
  private loadGeneration = 0;
  private skyGeneration = 0;
  private journey: Journey | null = null;
  private panelTransition: PanelTransition | null = null;
  private readonly panelWrappers = new Map<string, PanelWrapperRecord>();
  private panelEntranceOrder: string[] = [];
  private readonly choreography = new ChoreographyTimeline();
  private choreographySnapshot: ChoreographySnapshot = {
    revision: 0,
    phase: 'covered',
    cameraProgress: 0,
    curtainProgress: 0,
    drawerProgress: 0,
    cameraComplete: true,
    curtainComplete: true,
    panelsComplete: true,
    drawerComplete: true,
  };
  private arrival: Arrival | null = null;
  private pendingReturn: { revision: number } | null = null;
  private lastCompletedArrival: Arrival | null = null;
  private calibration: CalibrationState | null = null;
  private calibrationBaseline: CalibrationState['presets'] | null = null;
  private calibrationBaselineViewport: {
    width: number;
    height: number;
  } | null = null;
  private calibrationListener:
    ((state: CalibrationState | null) => void) | null = null;
  private intent: SceneIntent = {
    active: false,
    panelCount: 0,
    reducedMotion: false,
    revision: 0,
  };
  private currentState: SolarState = { mode: 'CASA_BASE' };
  private dpr: number;
  private insets: BrightfieldInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private measuredOverlayInsets: BrightfieldInsets = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  private visible = true;
  private intersectionRatio: number | null = null;
  private backgrounded = false;
  private contextLost = false;
  private loaded = false;
  private disposed = false;
  private dirty = false;
  private pendingReadyCallback = false;
  private pendingReadyGeneration: number | null = null;
  private recoveryGeneration = 0;
  private renderFailed = false;
  private firstFrameSnapshot: Record<string, unknown> | null = null;
  private lastFrameTime: number | null = null;
  private lastRafTime: number | null = null;
  private lastRafInterval: number | null = null;
  private rendererRegistered = false;
  private calibrationNotifiedAt = 0;

  constructor(host: HTMLDivElement, callbacks: BrightfieldViewerCallbacks) {
    this.host = host;
    this.callbacks = callbacks;
    this.dpr = clamp(window.devicePixelRatio || 1, 1, DPR_MAX);
    this.backgrounded = document.hidden;
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute(
      'aria-label',
      'Brightfield house 3D visualization',
    );
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.addEventListener(
      'webglcontextlost',
      this.handleContextLost,
      false,
    );
    this.canvas.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
      false,
    );
    this.host.appendChild(this.canvas);
    this.resizeObserver = new ResizeObserver(() => {
      this.counters.resizeEvents += 1;
      this.dirty = true;
      if (this.journey) this.resizeJourney();
      else if (this.loaded && !this.calibration) {
        this.applyChoreographyPose();
        this.updateViewport();
      } else this.updateViewport();
      this.scheduleFrame();
    });
    this.resizeObserver.observe(this.host);
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersection,
      { threshold: [...INTERSECTION_THRESHOLDS] },
    );
    this.intersectionObserver.observe(this.host);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide);
    window.addEventListener('pageshow', this.handlePageShow);
    globalLifecycle.activeObservers += 2;
    globalLifecycle.activeListeners += 5;
  }

  async load(): Promise<void> {
    if (this.disposed) return;
    if (this.loadPromise) return this.loadPromise;
    if (this.shared && !this.sharedReleased) {
      this.releaseCurrentScene();
      releaseSharedAsset(this.shared);
      this.sharedReleased = true;
      this.shared = null;
    }
    this.counters.loads += 1;
    let source: AssetDescriptor;
    try {
      source = selectAssetSource(window.location.search);
    } catch (error: unknown) {
      this.counters.failedLoads += 1;
      this.callbacks.onError(
        error instanceof Error ? error.message : 'Unknown asset selection.',
      );
      return;
    }
    const generation = ++this.loadGeneration;
    globalLifecycle.loadGenerations += 1;
    const shared = getSharedAsset(source);
    this.shared = shared;
    this.sharedReleased = false;
    this.assetSource = source;
    this.loadPromise = shared.promise
      .then(async ({ scene, manifest }) => {
        if (this.disposed || generation !== this.loadGeneration) return;
        this.releaseCurrentScene();
        this.root = scene.clone(true);
        this.resolvedAsset = resolveAsset(this.root, manifest);
        applySolarState(this.resolvedAsset, { mode: 'CASA_BASE' });
        this.currentState = { mode: 'CASA_BASE' };
        this.createRenderer();
        if (!this.renderer) throw new Error('WebGL is unavailable.');
        this.scene = new THREE.Scene();
        const skyTexture = await this.loadSkyTexture(source);
        if (this.disposed || generation !== this.loadGeneration) {
          if (this.skyTexture === skyTexture) this.skyTexture = null;
          skyTexture.dispose();
          throw new Error('Scene load superseded.');
        }
        this.scene.background = skyTexture;
        this.scene.backgroundRotation.y = source.backgroundYawRadians;
        this.scene.fog = null;
        this.scene.add(this.root);
        this.loaded = true;
        this.configureCamera('frontal');
        this.assetSource = source;
        this.dirty = true;
        this.pendingReadyCallback = true;
        this.pendingReadyGeneration = ++this.recoveryGeneration;
        this.renderImmediately();
        if (this.disposed || generation !== this.loadGeneration) return;
        this.counters.successfulLoads += 1;
        this.callbacks.onStatus?.(
          `Finished-v04 house loaded in ${Math.round(now())}ms`,
        );
        if (this.intent.active || this.intent.panelCount > 0)
          this.setIntent(this.intent);
      })
      .catch((error: unknown) => {
        if (this.disposed || generation !== this.loadGeneration) return;
        this.counters.failedLoads += 1;
        this.callbacks.onError(
          error instanceof Error
            ? error.message
            : 'Failed to load finished-v04 house.',
        );
        this.releaseCurrentScene();
        this.renderer?.dispose();
        this.renderer = null;
        this.contextRecovery = null;
        if (this.rendererRegistered) {
          globalLifecycle.activeRenderers = Math.max(
            0,
            globalLifecycle.activeRenderers - 1,
          );
          this.rendererRegistered = false;
        }
        this.scene = null;
        this.root = null;
        this.resolvedAsset = null;
        if (!this.sharedReleased) {
          releaseSharedAsset(shared);
          this.sharedReleased = true;
        }
        this.shared = null;
      })
      .finally(() => {
        if (generation === this.loadGeneration) this.loadPromise = null;
      });
    return this.loadPromise;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.counters.disposeCalls += 1;
    this.loadGeneration += 1;
    this.cancelFrame();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    window.removeEventListener('pagehide', this.handlePageHide);
    window.removeEventListener('pageshow', this.handlePageShow);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );
    globalLifecycle.activeObservers = Math.max(
      0,
      globalLifecycle.activeObservers - 2,
    );
    globalLifecycle.activeListeners = Math.max(
      0,
      globalLifecycle.activeListeners - 5,
    );
    this.releaseCurrentScene();
    if (this.shared && !this.sharedReleased) releaseSharedAsset(this.shared);
    this.sharedReleased = true;
    this.shared = null;
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = null;
    this.contextRecovery = null;
    this.scene = null;
    this.camera = null;
    this.root = null;
    this.resolvedAsset = null;
    this.canvas.remove();
    if (this.rendererRegistered) {
      globalLifecycle.activeRenderers = Math.max(
        0,
        globalLifecycle.activeRenderers - 1,
      );
      this.rendererRegistered = false;
    }
  }

  setIntent(intent: SceneIntent): void {
    if (this.disposed || intent.revision < this.intent.revision) return;
    const nextIntent: SceneIntent = {
      active: intent.active,
      panelCount: clamp(Math.round(intent.panelCount), 0, 51),
      reducedMotion: intent.reducedMotion,
      revision: intent.revision,
      leadInSeconds: intent.leadInSeconds,
    };
    const immediate =
      nextIntent.reducedMotion ||
      (!nextIntent.active &&
        (this.contextLost || this.renderFailed || !this.renderer));
    const choreographyWasAnimating = this.isChoreographyAnimating();
    this.intent = nextIntent;
    if (nextIntent.active || immediate) this.pendingReturn = null;
    if (!this.loaded) return;
    if (!choreographyWasAnimating) this.lastRafTime = now();
    this.choreographySnapshot = this.choreography.setIntent(
      immediate && !nextIntent.reducedMotion
        ? { ...nextIntent, reducedMotion: true }
        : nextIntent,
    );
    this.emitChoreography();
    const destination = nextIntent.active ? 'elevated' : 'frontal';
    const targetState = nextIntent.active
      ? stateForPanelCount(nextIntent.panelCount)
      : { mode: 'CASA_BASE' as const };
    if (immediate) this.transitionPanels(targetState, true);
    else if (nextIntent.active && this.panelTransition)
      this.transitionPanels(targetState, false);
    else if (!nextIntent.active) this.transitionPanels(targetState, false);
    if (immediate) this.cancelFrame();
    if (!nextIntent.active && !immediate) {
      this.pendingReturn = { revision: nextIntent.revision };
      this.journey = null;
      this.arrival = null;
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (immediate) {
      const presets = approvedCameraPresets(this.host.clientWidth);
      this.journey = null;
      this.lastRafTime = null;
      this.applyCalibrationPose(presets[destination]);
      this.arrival = { destination, revision: nextIntent.revision };
      this.completeArrivalIfReady();
      this.renderImmediately();
      return;
    }
    if (nextIntent.active) {
      this.arrival = { destination: 'elevated', revision: nextIntent.revision };
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
  }

  setSolarState(state: SolarState): void {
    if (!this.resolvedAsset) {
      this.currentState = state;
      return;
    }
    this.transitionPanels(state, true);
    this.renderImmediately();
  }

  startJourney(
    reducedMotion: boolean,
    destination: 'frontal' | 'elevated' = 'elevated',
    revision = this.intent.revision,
  ): void {
    if (!this.loaded || !this.camera) return;
    const presets = approvedCameraPresets(this.host.clientWidth);
    const current = this.readCurrentPose();
    const to = structuredClone(presets[destination]);
    const remaining = poseDistance(current, to);
    if (remaining < 1e-5) {
      this.applyCalibrationPose(to);
      this.finishJourney(destination, revision);
      this.renderImmediately();
      return;
    }
    const endpoints = poseDistance(presets.frontal, presets.elevated);
    const duration =
      JOURNEY_DURATION * Math.min(1, remaining / Math.max(endpoints, 1e-5));
    this.journey = null;
    this.lastRafTime = null;
    if (reducedMotion) {
      this.applyCalibrationPose(to);
      this.finishJourney(destination, revision);
      this.renderImmediately();
      return;
    }
    this.journey = {
      elapsed: 0,
      duration,
      leadIn:
        destination === 'elevated' && this.intent.active
          ? normalizeLeadIn(this.intent.leadInSeconds)
          : 0,
      from: current,
      to,
      destination,
      revision,
    };
    this.dirty = true;
    this.scheduleFrame();
  }

  reset(): void {
    this.intent = {
      active: false,
      panelCount: 0,
      reducedMotion: this.intent.reducedMotion,
      revision: this.intent.revision + 1,
    };
    this.pendingReturn = null;
    this.choreographySnapshot = this.choreography.setIntent(this.intent);
    this.emitChoreography();
    this.journey = null;
    this.arrival = null;
    this.clearPanelWrappers();
    this.panelEntranceOrder = [];
    this.panelTransition = null;
    this.currentState = { mode: 'CASA_BASE' };
    if (this.resolvedAsset)
      applySolarState(this.resolvedAsset, this.currentState);
    this.configureCamera('frontal');
    this.dirty = true;
    this.renderImmediately();
  }

  setDpr(dpr: 1 | 1.5): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, clamp(dpr, 1, DPR_MAX));
    this.renderer?.setPixelRatio(this.dpr);
    this.dirty = true;
    this.scheduleFrame();
  }

  setInsets(insets: BrightfieldInsets): void {
    this.measuredOverlayInsets = { ...insets };
    const nextInsets = {
      top: Math.max(0, insets.top),
      right: Math.max(0, insets.right),
      bottom: Math.max(0, insets.bottom),
      left: Math.max(0, insets.left),
    };
    if (this.loaded && this.journey) this.resizeJourney();
    else {
      this.insets = nextInsets;
      if (this.loaded && !this.calibration) {
        this.applyChoreographyPose();
        this.updateViewport();
      } else if (this.loaded) this.updateViewport();
    }
    this.dirty = true;
    this.scheduleFrame();
  }

  resizeJourney(
    _initial?: BrightfieldInsets,
    arrival?: BrightfieldInsets,
  ): void {
    if (arrival) this.measuredOverlayInsets = { ...arrival };
    const journey = this.journey;
    if (!journey) return;
    const presets = approvedCameraPresets(this.host.clientWidth);
    const from = this.readCurrentPose();
    const to = structuredClone(presets[journey.destination]);
    const remaining = poseDistance(from, to);
    const endpoints = poseDistance(presets.frontal, presets.elevated);
    if (remaining < 1e-5) {
      this.journey = null;
      this.applyCalibrationPose(to);
      this.finishJourney(journey.destination, journey.revision);
      return;
    }
    const journeyProgress =
      (journey.elapsed - journey.leadIn) /
      Math.max(journey.duration, Number.EPSILON);
    const normalizedProgress = clamp(journeyProgress, 0, 1);
    const previousElapsed = journey.elapsed;
    journey.from = from;
    journey.to = to;
    journey.duration =
      JOURNEY_DURATION * Math.min(1, remaining / Math.max(endpoints, 1e-5));
    journey.elapsed =
      previousElapsed < journey.leadIn
        ? previousElapsed
        : journey.leadIn + normalizedProgress * journey.duration;
    this.dirty = true;
    this.scheduleFrame();
  }

  redraw(): void {
    this.dirty = true;
    this.scheduleFrame();
  }

  recover(): void {
    if (this.disposed) return;
    if (!this.loaded) {
      void this.load();
      return;
    }
    if (this.contextLost) {
      if (this.contextRecovery) this.contextRecovery.restoreContext();
      else this.renderer?.forceContextRestore();
      return;
    }
    if (!this.renderFailed) return;
    this.renderFailed = false;
    this.dirty = true;
    this.lastRafTime = null;
    this.pendingReadyCallback = true;
    this.pendingReadyGeneration = ++this.recoveryGeneration;
    this.setIntent(this.intent);
    this.scheduleFrame();
  }

  snapshot(): Record<string, unknown> {
    const drawing = new THREE.Vector2();
    this.renderer?.getDrawingBufferSize(drawing);
    return {
      loaded: this.loaded,
      disposed: this.disposed,
      asset: this.assetSource ? { ...this.assetSource } : null,
      intent: { ...this.intent },
      choreography: { ...this.choreographySnapshot },
      state: this.currentState,
      journey: this.journey
        ? {
            elapsed: this.journey.elapsed,
            duration: this.journey.duration,
            leadIn: this.journey.leadIn,
            destination: this.journey.destination,
            revision: this.journey.revision,
          }
        : null,
      camera: this.camera
        ? {
            position: this.camera.position.toArray(),
            target: this.actualCameraTarget.toArray(),
            fov: this.camera.fov,
            aspect: this.camera.aspect,
            near: this.camera.near,
            far: this.camera.far,
          }
        : null,
      settings: {
        outputColorSpace: this.renderer?.outputColorSpace ?? null,
        toneMapping: this.renderer?.toneMapping ?? null,
        exposure: this.renderer?.toneMappingExposure ?? null,
        shadows: this.renderer?.shadowMap.enabled ?? null,
        lights: 0,
        fog: this.scene?.fog ?? null,
      },
      viewport: {
        cssWidth: this.host.clientWidth,
        cssHeight: this.host.clientHeight,
        drawingWidth: drawing.x,
        drawingHeight: drawing.y,
        dpr: this.dpr,
        insets: this.insets,
      },
      resources: {
        scene: resourceSnapshot(this.root),
        renderer: this.renderer?.info.memory ?? null,
        sharedRefs: this.shared?.refs ?? 0,
      },
      panelAnimation: {
        visiblePanelIds: [...this.actualVisiblePanelIds()],
        transitioning: this.panelTransition
          ? {
              direction: this.panelTransition.direction,
              elapsed: this.panelTransition.elapsed,
              pendingIds: [...this.panelTransition.pendingIds],
            }
          : null,
        scales: Object.fromEntries(
          [...this.panelWrappers.entries()].map(([id, record]) => [
            id,
            record.wrapper.scale.x,
          ]),
        ),
      },
      lifecycle: {
        ...this.counters,
        lastFrameMs: this.lastFrameTime,
        lastRafIntervalMs: this.lastRafInterval,
        visible: this.visible,
        intersectionRatio: this.intersectionRatio,
        backgrounded: this.backgrounded,
        contextLost: this.contextLost,
      },
      firstFrame: this.firstFrameSnapshot,
      diagnostics: this.resolvedAsset
        ? inspectSolarState(this.resolvedAsset)
        : null,
      approvedCameraRevision: APPROVED_CAMERA_REVISION,
    };
  }

  simulateContextLoss(): boolean {
    if (!this.contextRecovery) return false;
    this.contextRecovery.loseContext();
    return true;
  }

  restoreContext(): boolean {
    if (!this.contextRecovery) return false;
    this.contextRecovery.restoreContext();
    return true;
  }
  renderPoster(): Promise<Blob | null> {
    this.renderImmediately();
    return new Promise((resolve) => this.canvas.toBlob(resolve, 'image/png'));
  }

  setCalibrationListener(
    listener: ((state: CalibrationState | null) => void) | null,
  ): void {
    this.calibrationListener = listener;
    this.notifyCalibration();
  }

  beginCalibration(
    initial: BrightfieldInsets,
    arrival: BrightfieldInsets,
    selected: CameraPresetName,
  ): void {
    if (!this.loaded || this.calibration) return;
    this.journey = null;
    this.measuredOverlayInsets = {
      ...(selected === 'frontal' ? initial : arrival),
    };
    const presets = approvedCameraPresets(this.host.clientWidth);
    this.calibrationBaseline = structuredClone(presets);
    this.calibrationBaselineViewport = {
      width: this.host.clientWidth,
      height: this.host.clientHeight,
    };
    this.calibration = {
      presets,
      selected,
      motion: { ...APPROVED_CAMERA_MOTION },
      progress: selected === 'frontal' ? 0 : 1,
      playing: false,
    };
    this.selectCalibrationPreset(selected);
  }

  selectCalibrationPreset(selected: CameraPresetName): void {
    if (!this.calibration) return;
    this.pauseCalibration();
    this.calibration.selected = selected;
    this.calibration.progress = selected === 'frontal' ? 0 : 1;
    this.applyCalibrationPose(this.calibration.presets[selected]);
    this.notifyCalibration();
    this.renderImmediately();
  }

  updateCalibrationPose(
    selected: CameraPresetName,
    pose: CalibrationPose,
  ): void {
    if (!this.calibration) return;
    this.calibration.presets[selected] = validateCalibrationPose(pose);
    this.selectCalibrationPreset(selected);
  }

  captureCalibrationPreset(): void {
    if (!this.calibration) return;
    this.updateCalibrationPose(
      this.calibration.selected,
      this.readActualCalibrationPose(),
    );
  }

  updateCalibrationMotion(motion: CalibrationMotion): void {
    if (!this.calibration) return;
    this.pauseCalibration();
    this.calibration.motion = validateCalibrationMotion(motion);
    this.seekCalibration(this.calibration.progress);
  }

  seekCalibration(progress: number): void {
    if (!this.calibration) return;
    this.pauseCalibration();
    this.calibration.progress = finiteClamped(progress, 0, 1);
    const state = this.calibration;
    this.applyCalibrationPose(
      interpolateCalibration(
        state.presets.frontal,
        state.presets.elevated,
        state.progress,
        state.motion,
      ),
    );
    this.notifyCalibration();
    this.renderImmediately();
  }

  playCalibration(): void {
    if (!this.calibration || this.calibration.playing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.seekCalibration(1);
      return;
    }
    if (this.calibration.progress >= 1) this.calibration.progress = 0;
    this.calibration.playing = true;
    this.lastRafTime = null;
    this.dirty = true;
    this.scheduleFrame();
  }

  pauseCalibration(): void {
    if (!this.calibration) return;
    this.calibration.playing = false;
    this.lastRafTime = null;
    this.notifyCalibration();
  }

  restoreApprovedCalibrationPreset(): void {
    if (!this.calibration) return;
    const selected = this.calibration.selected;
    this.calibration.presets[selected] = approvedCameraPresets(
      this.host.clientWidth,
    )[selected];
    this.calibration.motion = { ...APPROVED_CAMERA_MOTION };
    this.selectCalibrationPreset(selected);
  }

  endCalibration(): void {
    if (!this.calibration) return;
    this.pauseCalibration();
    this.calibration = null;
    this.calibrationBaseline = null;
    this.calibrationBaselineViewport = null;
    this.configureCamera(this.intent.active ? 'elevated' : 'frontal');
    this.notifyCalibration();
    this.renderImmediately();
  }

  exportCameraCalibration(): unknown {
    if (!this.camera || !this.loaded)
      throw new Error('Wait for the 3D house to load.');
    this.updateViewport();
    const buffer = this.renderer?.getDrawingBufferSize(new THREE.Vector2());
    return {
      schema: 'brightfield.camera-calibration',
      version: 1,
      generatedAt: new Date().toISOString(),
      coordinateSystem:
        'Three.js world coordinates, Y up; original house units',
      camera: {
        ...this.readActualCalibrationPose(),
        up: this.camera.up.toArray(),
        quaternion: this.camera.quaternion.toArray(),
        near: this.camera.near,
        far: this.camera.far,
        aspect: this.camera.aspect,
        viewOffset: this.camera.view ? { ...this.camera.view } : null,
      },
      calibration: this.calibration ? structuredClone(this.calibration) : null,
      baselinePresets: this.calibrationBaseline
        ? structuredClone(this.calibrationBaseline)
        : null,
      baselineViewport: this.calibrationBaselineViewport,
      approvedComposition: {
        revision: APPROVED_CAMERA_REVISION,
        presetsForCurrentCanvas: approvedCameraPresets(this.host.clientWidth),
        motion: APPROVED_CAMERA_MOTION,
      },
      measuredOverlayInsets: { ...this.measuredOverlayInsets },
      viewport: {
        canvasCSS: {
          width: this.host.clientWidth,
          height: this.host.clientHeight,
        },
        drawingBuffer: { width: buffer?.x ?? null, height: buffer?.y ?? null },
        deviceDPR: window.devicePixelRatio,
        effectiveDPR: this.dpr,
      },
      scene: {
        solarState: { ...this.currentState },
        activeCount: inspectSolarState(this.resolvedAsset!).activeCount,
      },
    };
  }

  private releaseCurrentScene(): void {
    this.releaseSkyTexture();
    this.clearPanelWrappers();
    this.scene?.clear();
    this.panelWrappers.clear();
    this.loaded = false;
    this.journey = null;
    this.arrival = null;
    this.lastCompletedArrival = null;
    this.panelTransition = null;
  }

  private releaseSkyTexture(): void {
    this.skyGeneration += 1;
    this.skyTexture?.dispose();
    this.skyTexture = null;
  }

  private loadSkyTexture(source: AssetDescriptor): Promise<THREE.Texture> {
    const generation = ++this.skyGeneration;
    return this.skyLoader.loadAsync(source.backgroundUrl).then((texture) => {
      if (this.disposed || generation !== this.skyGeneration) {
        texture.dispose();
        throw new Error('Sky load superseded.');
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.needsUpdate = true;
      this.skyTexture = texture;
      return texture;
    });
  }

  private createRenderer(): void {
    if (this.disposed) return;
    this.renderer?.dispose();
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: false,
      });
      this.contextRecovery = this.renderer
        .getContext()
        .getExtension('WEBGL_lose_context');
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.toneMappingExposure = 1;
      this.renderer.shadowMap.enabled = false;
      this.renderer.shadowMap.autoUpdate = false;
      if (!this.rendererRegistered) {
        globalLifecycle.activeRenderers += 1;
        this.rendererRegistered = true;
      }
    } catch (error: unknown) {
      this.renderer = null;
      this.callbacks.onError(
        error instanceof Error ? error.message : 'WebGL is unavailable.',
      );
    }
  }

  private configureCamera(destination: 'frontal' | 'elevated'): void {
    const presets = approvedCameraPresets(this.host.clientWidth);
    const pose = presets[destination];
    if (!this.camera)
      this.camera = new THREE.PerspectiveCamera(
        pose.fov,
        1,
        APPROVED_CAMERA_PROJECTION.near,
        APPROVED_CAMERA_PROJECTION.far,
      );
    this.applyCalibrationPose(pose);
    this.updateViewport();
  }

  private applyChoreographyPose(): void {
    const presets = approvedCameraPresets(this.host.clientWidth);
    this.applyCalibrationPose(
      interpolateCalibration(
        presets.frontal,
        presets.elevated,
        this.choreographySnapshot.cameraProgress,
        APPROVED_CAMERA_MOTION,
      ),
    );
  }

  private readCurrentPose(): CalibrationPose {
    const camera = this.camera;
    if (!camera) {
      const pose = approvedCameraPresets(this.host.clientWidth).frontal;
      return structuredClone(pose);
    }
    return this.readActualCalibrationPose();
  }

  private applyCalibrationPose(pose: CalibrationPose): void {
    if (!this.camera) return;
    this.camera.up.fromArray(APPROVED_CAMERA_PROJECTION.up);
    this.camera.near = APPROVED_CAMERA_PROJECTION.near;
    this.camera.far = APPROVED_CAMERA_PROJECTION.far;
    this.camera.position.fromArray(pose.position);
    this.actualCameraTarget.fromArray(pose.target);
    this.camera.lookAt(this.actualCameraTarget);
    this.camera.fov = pose.fov;
    this.insets = { ...pose.insets };
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  private readActualCalibrationPose(): CalibrationPose {
    if (!this.camera) throw new Error('Wait for the camera to load.');
    return {
      position: this.camera.position.toArray(),
      target: this.actualCameraTarget.toArray(),
      fov: this.camera.fov,
      insets: { ...this.insets },
      verticalOffset: 0,
    };
  }

  private createPanelWrapper(id: string): PanelWrapperRecord | null {
    const existing = this.panelWrappers.get(id);
    if (existing) return existing;
    const panel = this.resolvedAsset?.panels.get(id);
    if (
      !panel ||
      panel.module.parent !== panel.parent ||
      panel.support.parent !== panel.parent
    )
      return null;
    const wrapper = new THREE.Group();
    wrapper.name = `${id}_ANIMATION_WRAPPER`;
    wrapper.matrixAutoUpdate = true;
    const record: PanelWrapperRecord = {
      wrapper,
      parent: panel.parent,
      module: panel.module,
      support: panel.support,
      originalChildren: panel.parent.children.slice(),
    };
    panel.parent.add(wrapper);
    panel.module.removeFromParent();
    panel.support.removeFromParent();
    wrapper.add(panel.module, panel.support);
    this.panelWrappers.set(id, record);
    return record;
  }

  private restorePanelWrapper(id: string): void {
    const record = this.panelWrappers.get(id);
    if (!record) return;
    record.module.removeFromParent();
    record.support.removeFromParent();
    record.wrapper.removeFromParent();
    record.parent.children = record.originalChildren;
    record.originalChildren.forEach((child) => {
      child.parent = record.parent;
    });
    record.parent.matrixWorldNeedsUpdate = true;
    this.panelWrappers.delete(id);
  }

  private clearPanelWrappers(): void {
    [...this.panelWrappers.keys()].forEach((id) =>
      this.restorePanelWrapper(id),
    );
  }

  private actualVisiblePanelIds(): Set<string> {
    const ids = new Set<string>();
    this.resolvedAsset?.panels.forEach((panel, id) => {
      const wrapper = this.panelWrappers.get(id);
      const scale = wrapper?.wrapper.scale.x ?? 1;
      if (
        panel.parent.visible &&
        panel.module.visible &&
        panel.support.visible &&
        scale > 1e-4
      )
        ids.add(id);
    });
    return ids;
  }

  private panelIdsForState(state: SolarState): string[] {
    if (!this.resolvedAsset) return [];
    if (state.mode === 'CASA_BASE') return [];
    if (state.mode === 'REFINADOS_08')
      return this.resolvedAsset.manifest.states.REFINADOS_08.active_panel_ids;
    return this.resolvedAsset.manifest.occupancy_order.slice(0, state.n);
  }

  private transitionPanels(target: SolarState, reducedMotion = false): void {
    if (!this.resolvedAsset) return;
    const actual = this.actualVisiblePanelIds();
    const currentIds =
      this.panelEntranceOrder.filter((id) => actual.has(id)).length > 0
        ? this.panelEntranceOrder.filter((id) => actual.has(id))
        : [...actual];
    const targetIds = new Set(this.panelIdsForState(target));
    const removing = currentIds.filter((id) => !targetIds.has(id)).reverse();

    if (removing.length > 0 && !reducedMotion) {
      const interval = panelAnimationInterval(removing.length);
      const starts = new Map<string, number>();
      const fromProgress = new Map<string, number>();
      const continuationStarts = new Map<string, number>();
      currentIds.forEach((id) => {
        if (!targetIds.has(id)) return;
        const record = this.panelWrappers.get(id);
        const scale = record?.wrapper.scale.x ?? 1;
        if (!record || scale <= 1e-4 || scale >= 1 - 1e-4) return;
        const progress =
          scale < 0.5 ? Math.cbrt(scale / 4) : 1 - Math.cbrt((1 - scale) / 4);
        continuationStarts.set(id, -progress * PANEL_TWEEN_DURATION);
      });
      removing.forEach((id, index) => {
        const record = this.createPanelWrapper(id);
        const scale = record?.wrapper.scale.x ?? 1;
        fromProgress.set(
          id,
          scale < 0.5 ? Math.cbrt(scale / 4) : 1 - Math.cbrt((1 - scale) / 4),
        );
        if (record) {
          record.wrapper.scale.setScalar(scale);
          record.wrapper.updateMatrix();
        }
        starts.set(id, index * interval);
        const panel = this.resolvedAsset?.panels.get(id);
        if (panel) {
          panel.parent.visible = true;
          panel.module.visible = true;
          panel.support.visible = true;
        }
      });
      this.panelTransition = {
        target,
        pendingIds: removing,
        elapsed: 0,
        starts,
        direction: 'out',
        fromProgress,
        continuationStarts,
      };
      this.currentState = this.resolvedAsset.state;
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    applySolarState(this.resolvedAsset, target);
    const after = inspectSolarState(this.resolvedAsset);
    const activeIds = new Set(after.activePanelIds);
    for (const [id, record] of this.panelWrappers) {
      if (!activeIds.has(id) || record.wrapper.scale.x >= 1 - 1e-4)
        this.restorePanelWrapper(id);
    }
    const additions = after.activePanelIds.filter((id) => {
      const record = this.panelWrappers.get(id);
      return (
        !actual.has(id) ||
        (record !== undefined && record.wrapper.scale.x < 1 - 1e-4)
      );
    });
    this.panelEntranceOrder = [
      ...this.panelEntranceOrder.filter((id) => activeIds.has(id)),
      ...additions.filter((id) => !this.panelEntranceOrder.includes(id)),
    ];
    if (reducedMotion || additions.length === 0) {
      this.clearPanelWrappers();
      this.panelTransition = null;
      this.currentState = this.resolvedAsset.state;
      this.choreographySnapshot = this.choreography.markPanelsSettled(
        this.intent.revision,
      );
      this.emitChoreography();
      this.completeArrivalIfReady();
      this.dirty = true;
      return;
    }
    const interval = panelAnimationInterval(additions.length);
    const starts = new Map<string, number>();
    additions.forEach((id, index) => {
      const hadWrapper = this.panelWrappers.has(id);
      const record = this.createPanelWrapper(id);
      const scale = hadWrapper ? (record?.wrapper.scale.x ?? 0) : 0;
      if (record) {
        record.wrapper.scale.setScalar(scale);
        record.wrapper.updateMatrix();
      }
      let start = index * interval;
      if (scale > 1e-4) {
        const progress =
          scale < 0.5 ? Math.cbrt(scale / 4) : 1 - Math.cbrt((1 - scale) / 4);
        start = -progress * PANEL_TWEEN_DURATION;
      }
      starts.set(id, start);
      const panel = this.resolvedAsset?.panels.get(id);
      if (panel) {
        panel.parent.visible = scale > 1e-4;
        panel.module.visible = panel.parent.visible;
        panel.support.visible = panel.parent.visible;
      }
    });
    this.panelTransition = {
      target,
      pendingIds: additions,
      elapsed: 0,
      starts,
      direction: 'in',
    };
    this.currentState = this.resolvedAsset.state;
    this.dirty = true;
    this.scheduleFrame();
  }

  private advancePanels(deltaSeconds: number): void {
    const transition = this.panelTransition;
    if (!transition || !this.resolvedAsset) return;
    transition.elapsed += Math.max(0, deltaSeconds) * 1000;
    let settled = true;
    transition.pendingIds.forEach((id) => {
      const panel = this.resolvedAsset?.panels.get(id);
      const record = this.panelWrappers.get(id);
      const start = transition.starts.get(id) ?? 0;
      const progress = clamp(
        (transition.elapsed - start) / PANEL_TWEEN_DURATION,
        0,
        1,
      );
      const sampledProgress =
        transition.direction === 'out'
          ? Math.max(0, (transition.fromProgress.get(id) ?? 1) - progress)
          : progress;
      const scale =
        sampledProgress < 0.5
          ? 4 * sampledProgress * sampledProgress * sampledProgress
          : 1 - Math.pow(-2 * sampledProgress + 2, 3) / 2;
      if (panel) {
        const visible = scale > 1e-4;
        panel.parent.visible = visible;
        panel.module.visible = visible;
        panel.support.visible = visible;
      }
      if (record) {
        record.wrapper.scale.setScalar(scale);
        record.wrapper.updateMatrix();
      }
      if (transition.direction === 'out' ? sampledProgress > 0 : progress < 1)
        settled = false;
    });
    if (transition.direction === 'out') {
      for (const [id, start] of transition.continuationStarts) {
        const panel = this.resolvedAsset.panels.get(id);
        const record = this.panelWrappers.get(id);
        const progress = clamp(
          (transition.elapsed - start) / PANEL_TWEEN_DURATION,
          0,
          1,
        );
        const scale =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        if (panel) {
          const visible = scale > 1e-4;
          panel.parent.visible = visible;
          panel.module.visible = visible;
          panel.support.visible = visible;
        }
        if (record) {
          record.wrapper.scale.setScalar(scale);
          record.wrapper.updateMatrix();
        }
        if (progress < 1) settled = false;
      }
    }
    if (!settled) return;
    this.clearPanelWrappers();
    if (transition.direction === 'out') {
      this.panelTransition = null;
      this.transitionPanels(transition.target, this.intent.reducedMotion);
      return;
    }
    this.currentState = transition.target;
    this.panelTransition = null;
    this.choreographySnapshot = this.choreography.markPanelsSettled(
      this.intent.revision,
    );
    this.emitChoreography();
    const pendingReturn = this.pendingReturn;
    if (pendingReturn && !this.intent.active) return;
    this.pendingReturn = null;
    this.completeArrivalIfReady();
  }

  private emitChoreography(): void {
    this.callbacks.onChoreography?.({
      ...this.choreographySnapshot,
    });
  }

  private completeArrivalIfReady(): void {
    if (!this.arrival || this.journey || this.panelTransition) return;
    if (
      this.intent.active &&
      ((this.arrival.destination === 'elevated' &&
        this.choreographySnapshot.phase !== 'active') ||
        (this.arrival.destination === 'frontal' &&
          this.choreographySnapshot.phase !== 'covered'))
    )
      return;
    const arrival = this.arrival;
    this.arrival = null;
    if (
      arrival.destination === 'frontal' &&
      !this.intent.active &&
      this.resolvedAsset
    ) {
      this.clearPanelWrappers();
      applySolarState(this.resolvedAsset, { mode: 'CASA_BASE' });
      this.currentState = { mode: 'CASA_BASE' };
    }
    if (
      this.lastCompletedArrival?.destination === arrival.destination &&
      this.lastCompletedArrival.revision === arrival.revision
    )
      return;
    this.lastCompletedArrival = arrival;
    this.callbacks.onArrival(arrival.destination, arrival.revision);
  }

  private finishJourney(
    destination: 'frontal' | 'elevated',
    revision: number,
  ): void {
    this.journey = null;
    this.arrival = { destination, revision };
    this.completeArrivalIfReady();
    this.dirty = true;
  }
  private updateViewport(): void {
    const renderer = this.renderer;
    const camera = this.camera;
    if (!renderer || !camera) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    renderer.getSize(this.renderSize);
    if (this.renderSize.x !== width || this.renderSize.y !== height)
      renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.setViewOffset(
      width,
      height,
      (this.insets.right - this.insets.left) * 0.5,
      (this.insets.bottom - this.insets.top) * 0.5,
      width,
      height,
    );
    camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, width, height);
    renderer.setScissor(0, 0, width, height);
  }

  private handleRenderFailure(error: unknown): void {
    if (this.disposed) return;
    this.renderFailed = true;
    this.pendingReadyCallback = false;
    this.pendingReadyGeneration = null;
    this.recoveryGeneration += 1;
    this.dirty = false;
    this.lastRafTime = null;
    this.cancelFrame();
    if (!this.intent.active) {
      this.setIntent(this.intent);
      this.dirty = false;
    }
    this.callbacks.onError(
      error instanceof Error ? error.message : 'WebGL render failed.',
    );
  }

  private paintFrame(): boolean {
    try {
      this.renderer!.setScissorTest(true);
      this.renderer!.clear(true, true, true);
      this.renderer!.render(this.scene!, this.camera!);
      this.renderFailed = false;
      return true;
    } catch (error: unknown) {
      this.handleRenderFailure(error);
      return false;
    }
  }

  private renderImmediately(): void {
    if (
      this.disposed ||
      this.renderFailed ||
      !this.loaded ||
      !this.renderer ||
      !this.scene ||
      !this.camera ||
      !this.visible ||
      this.backgrounded ||
      this.contextLost
    )
      return;
    this.updateViewport();
    const started = now();
    if (!this.paintFrame()) return;
    this.recordFrame(now() - started);
    this.dirty = false;
  }

  private isChoreographyAnimating(): boolean {
    return (
      this.choreographySnapshot.phase !== 'covered' &&
      this.choreographySnapshot.phase !== 'active'
    );
  }

  private scheduleFrame(): void {
    if (
      this.disposed ||
      !this.loaded ||
      !this.visible ||
      this.backgrounded ||
      this.contextLost ||
      this.renderFailed ||
      this.rafId !== null
    )
      return;
    if (
      !this.dirty &&
      !this.journey &&
      !this.panelTransition &&
      !this.calibration?.playing &&
      !this.isChoreographyAnimating()
    )
      return;
    this.counters.rafScheduled += 1;
    this.rafId = requestAnimationFrame(this.renderFrame);
    globalLifecycle.pendingRAF += 1;
  }

  private cancelFrame(): void {
    if (this.rafId === null) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
    globalLifecycle.pendingRAF = Math.max(0, globalLifecycle.pendingRAF - 1);
    this.counters.rafCanceled += 1;
  }

  private renderFrame = (timestamp: number): void => {
    this.rafId = null;
    globalLifecycle.pendingRAF = Math.max(0, globalLifecycle.pendingRAF - 1);
    if (
      this.disposed ||
      !this.loaded ||
      !this.renderer ||
      !this.scene ||
      !this.camera ||
      !this.visible ||
      this.backgrounded ||
      this.contextLost ||
      this.renderFailed
    )
      return;
    this.counters.rafExecuted += 1;
    const previous = this.lastRafTime;
    const interval = previous === null ? 0 : Math.max(0, timestamp - previous);
    const delta = Math.max(0, interval / 1000);
    this.lastRafTime = Math.max(timestamp, previous ?? timestamp);
    const choreographyWasAnimating = this.isChoreographyAnimating();
    const before = this.choreographySnapshot;
    this.choreographySnapshot = this.choreography.advance(delta);
    this.emitChoreography();
    if (
      this.choreographySnapshot.phase === 'revealing' &&
      this.intent.active &&
      !this.panelTransition
    )
      this.transitionPanels(
        stateForPanelCount(this.intent.panelCount),
        this.intent.reducedMotion,
      );
    let panelDelta = delta;
    if (
      this.intent.active &&
      this.choreographySnapshot.phase === 'revealing' &&
      (before.phase === 'lead-in' || before.phase === 'camera')
    ) {
      const entryDuration = this.choreography.entryDuration;
      panelDelta = Math.max(
        0,
        delta - (1 - before.curtainProgress) * entryDuration,
      );
    }
    this.advancePanels(panelDelta);
    if (
      this.pendingReturn &&
      !this.intent.active &&
      (this.choreographySnapshot.phase === 'returning' ||
        this.choreographySnapshot.phase === 'covered') &&
      !this.journey
    ) {
      const pendingReturn = this.pendingReturn;
      this.pendingReturn = null;
      this.arrival = {
        destination: 'frontal',
        revision: pendingReturn.revision,
      };
    }
    if (
      this.arrival &&
      ((this.arrival.destination === 'elevated' &&
        this.choreographySnapshot.phase === 'active') ||
        (this.arrival.destination === 'frontal' &&
          this.choreographySnapshot.phase === 'covered'))
    )
      this.completeArrivalIfReady();
    if (this.calibration?.playing) {
      const state = this.calibration;
      state.progress = Math.min(
        1,
        state.progress + delta / state.motion.duration,
      );
      this.applyCalibrationPose(
        interpolateCalibration(
          state.presets.frontal,
          state.presets.elevated,
          state.progress,
          state.motion,
        ),
      );
      if (state.progress >= 1) state.playing = false;
      if (!state.playing || timestamp - this.calibrationNotifiedAt >= 100) {
        this.calibrationNotifiedAt = timestamp;
        this.notifyCalibration();
      }
    }
    if (
      !this.journey &&
      !this.calibration &&
      (this.choreographySnapshot.phase !== 'covered' ||
        choreographyWasAnimating) &&
      this.choreographySnapshot.phase !== 'waiting' &&
      this.camera
    ) {
      this.applyChoreographyPose();
    }

    if (this.journey) {
      const journey = this.journey;
      journey.elapsed = Math.min(
        journey.leadIn + journey.duration,
        journey.elapsed + delta,
      );
      if (journey.elapsed < journey.leadIn) {
        this.applyCalibrationPose(journey.from);
      } else {
        this.applyCalibrationPose(
          interpolateCalibration(
            journey.from,
            journey.to,
            (journey.elapsed - journey.leadIn) / journey.duration,
            APPROVED_CAMERA_MOTION,
          ),
        );
      }
      if (journey.elapsed >= journey.leadIn + journey.duration)
        this.finishJourney(journey.destination, journey.revision);
    }
    this.updateViewport();
    const started = now();
    if (!this.paintFrame()) return;
    this.recordFrame(now() - started, interval);
    if (
      this.journey ||
      this.panelTransition ||
      this.calibration?.playing ||
      (this.intent.active && this.choreographySnapshot.phase !== 'active') ||
      (!this.intent.active && this.choreographySnapshot.phase !== 'covered')
    )
      this.scheduleFrame();
  };

  private recordFrame(renderMs: number, rafInterval = 0): void {
    if (this.disposed) return;
    this.lastFrameTime = renderMs;
    this.lastRafInterval = rafInterval > 0 ? rafInterval : null;
    this.counters.frames += 1;
    if (!this.firstFrameSnapshot) {
      this.counters.firstFrames += 1;
      this.firstFrameSnapshot = {
        state: this.currentState,
        camera: this.camera
          ? {
              position: this.camera.position.toArray(),
              fov: this.camera.fov,
              aspect: this.camera.aspect,
            }
          : null,
        resources: resourceSnapshot(this.root),
        renderer: { dpr: this.dpr },
        activePanelIds: this.resolvedAsset
          ? inspectSolarState(this.resolvedAsset).activePanelIds
          : [],
      };
    }
    if (this.pendingReadyCallback) {
      const readyGeneration = this.pendingReadyGeneration;
      const readyLoadGeneration = this.loadGeneration;
      this.pendingReadyCallback = false;
      this.pendingReadyGeneration = null;
      if (
        this.contextLost ||
        this.renderFailed ||
        readyGeneration === null ||
        readyGeneration !== this.recoveryGeneration
      )
        return;
      this.callbacks.onReady();
      if (
        this.disposed ||
        this.contextLost ||
        readyGeneration === null ||
        readyGeneration !== this.recoveryGeneration ||
        readyLoadGeneration !== this.loadGeneration
      )
        return;
      this.emitChoreography();
    }
  }

  private notifyCalibration(): void {
    this.calibrationListener?.(
      this.calibration ? structuredClone(this.calibration) : null,
    );
  }

  private handleContextLost = (event: Event): void => {
    if (this.disposed) return;
    event.preventDefault();
    this.contextLost = true;
    this.counters.contextLost += 1;
    this.lastRafTime = null;
    this.cancelFrame();
    if (!this.intent.active) this.setIntent(this.intent);
    this.callbacks.onError('WebGL context lost; use retry to recover.');
  };

  private handleContextRestored = (): void => {
    if (this.disposed) return;
    const wasJourney = this.journey !== null;
    this.contextLost = false;
    this.renderFailed = false;
    this.counters.contextRestored += 1;
    this.lastRafTime = null;
    this.pendingReadyCallback = true;
    this.pendingReadyGeneration = ++this.recoveryGeneration;
    if (wasJourney || this.intent.active) this.setIntent(this.intent);
    this.dirty = true;
    this.scheduleFrame();
  };

  private handleIntersection = (entries: IntersectionObserverEntry[]): void => {
    const entry = entries.at(-1);
    if (!entry) return;
    this.counters.intersectionEvents += 1;
    this.intersectionRatio = entry.intersectionRatio;
    const nextVisible = shouldRenderAtIntersection(
      this.visible,
      entry.isIntersecting,
      entry.intersectionRatio,
    );
    if (nextVisible === this.visible) return;
    this.visible = nextVisible;
    if (nextVisible) {
      this.counters.visibilityResumes += 1;
      this.lastRafTime = null;
      this.dirty = true;
      this.scheduleFrame();
    } else {
      this.counters.visibilityPauses += 1;
      this.cancelFrame();
      this.lastRafTime = null;
    }
  };

  private handleVisibilityChange = (): void => {
    this.backgrounded = document.hidden;
    if (this.backgrounded) {
      this.counters.visibilityPauses += 1;
      this.cancelFrame();
    } else {
      this.counters.visibilityResumes += 1;
      this.lastRafTime = null;
      this.dirty = true;
      this.scheduleFrame();
    }
  };

  private handlePageHide = (): void => {
    this.backgrounded = true;
    this.cancelFrame();
    this.lastRafTime = null;
  };

  private handlePageShow = (): void => {
    this.backgrounded = false;
    this.lastRafTime = null;
    this.dirty = true;
    this.scheduleFrame();
  };
}
