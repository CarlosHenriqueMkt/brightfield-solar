import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChoreographyTimeline,
  initialChoreographySnapshot,
  curtainLiftAt,
  type ChoreographySnapshot,
} from './choreography';
import {
  BrightfieldViewer,
  PANEL_TWEEN_DURATION,
  panelAnimationInterval,
  type BrightfieldViewerCallbacks,
  type SceneIntent,
} from './viewer';
import {
  applySolarState,
  type Manifest,
  type ResolvedAsset,
  type SolarState,
} from './solar';
import { interpolateCalibration } from './camera-calibration';
import {
  APPROVED_CAMERA_MOTION,
  approvedCameraPresets,
} from './camera-presets';

const identityTransform = {
  matrix_column_major: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  translation: [0, 0, 0] as [number, number, number],
  rotation_xyzw: [0, 0, 0, 1] as [number, number, number, number],
  scale: [1, 1, 1] as [number, number, number],
  parent: null,
};
const mixedPanelTransform = {
  matrix_column_major: [0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 1, 2, 3, 1],
  translation: [1, 2, 3] as [number, number, number],
  rotation_xyzw: [0, 0, Math.SQRT1_2, Math.SQRT1_2] as [
    number,
    number,
    number,
    number,
  ],
  scale: [2, 3, 4] as [number, number, number],
  parent: null,
};

const refinedPanelTransform = {
  matrix_column_major: [0, -3, 0, 0, 4, 0, 0, 0, 0, 0, 5, 0, -4, 1, 2, 1],
  translation: [-4, 1, 2] as [number, number, number],
  rotation_xyzw: [0, 0, -Math.SQRT1_2, Math.SQRT1_2] as [
    number,
    number,
    number,
    number,
  ],
  scale: [3, 4, 5] as [number, number, number],
  parent: null,
};

interface FixtureWrapper {
  wrapper: THREE.Group;
  parent: THREE.Object3D;
}

interface FixtureViewer {
  transitionPanels(target: SolarState): void;
  advancePanels(deltaSeconds: number): void;
  setSolarState(state: SolarState): void;
  setInsets(insets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }): void;
  setIntent(intent: SceneIntent): void;
  panelTransition: { pendingIds: string[] } | null;
  panelWrappers: Map<string, FixtureWrapper>;
  [key: string]: unknown;
}

interface PaintFixtureViewer extends FixtureViewer {
  callbacks: BrightfieldViewerCallbacks;
  disposed: boolean;
  choreographySnapshot: ChoreographySnapshot;
  currentState: SolarState;
  loadGeneration: number;
  rafId: number | null;
  renderImmediately(): void;
  recover(): void;
}
interface PublicFixtureViewer extends FixtureViewer {
  choreographySnapshot: ChoreographySnapshot;
  renderFrame(timestamp: number): void;
  dispose(): void;
}

function makePanelFixture(
  count: number,
  options: { distinctTransforms?: boolean } = {},
): {
  asset: ResolvedAsset;
  ids: string[];
  viewer: FixtureViewer;
} {
  const ids = Array.from({ length: count }, (_, index) => `panel-${index}`);
  const root = new THREE.Group();
  const panels = ids.map((id) => {
    const parent = new THREE.Group();
    const solarModule = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 0.1).translate(0.4, 0.2, -0.3),
      new THREE.MeshBasicMaterial(),
    );
    const support = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 1),
      new THREE.MeshBasicMaterial(),
    );
    parent.add(solarModule, support);
    root.add(parent);
    return {
      id,
      parent,
      module: solarModule,
      support,
      manifest: {
        id,
        children: { module: `${id}-module`, support: `${id}-support` },
        roof_group: 'roof',
        mixed_local_uv_m: [0, 0] as [number, number],
        source_record_refined: null,
        source_record_mixed: {},
        states: {
          MISTO_PREFIXO: {
            transform: options.distinctTransforms
              ? mixedPanelTransform
              : identityTransform,
          },
          REFINADOS_08: {
            transform: options.distinctTransforms
              ? refinedPanelTransform
              : identityTransform,
          },
        },
        child_transforms: {
          module: identityTransform,
          support: identityTransform,
        },
      },
    };
  });
  const manifest = {
    panels: panels.map((panel) => panel.manifest),
    occupancy_order: ids,
    states: {
      CASA_BASE: { count: 0, active_panel_ids: [] },
      REFINADOS_08: {
        count: Math.min(8, count),
        active_panel_ids: ids.slice(0, 8),
      },
      MISTO_PREFIXO: { N_min: 0, N_max: count },
    },
  } as unknown as Manifest;
  const asset = {
    manifest,
    root,
    nodes: new Map(),
    panels: new Map(
      panels.map((panel) => [
        panel.id,
        {
          parent: panel.parent,
          module: panel.module,
          support: panel.support,
        },
      ]),
    ),
    state: { mode: 'CASA_BASE' as const },
  } as ResolvedAsset;
  applySolarState(asset, { mode: 'MISTO_PREFIXO', n: count });
  const viewer = Object.create(BrightfieldViewer.prototype) as FixtureViewer;
  Object.assign(viewer, {
    host: { clientWidth: 815, clientHeight: 390 },
    loaded: true,
    disposed: false,
    dirty: false,
    visible: true,
    backgrounded: false,
    contextLost: false,
    renderFailed: false,
    renderer: {
      getSize: (size: THREE.Vector2) => size.set(815, 390),
      setSize: () => undefined,
      setViewport: () => undefined,
      setScissor: () => undefined,
      setScissorTest: () => undefined,
      clear: () => undefined,
      render: () => undefined,
      dispose: () => undefined,
      forceContextLoss: () => undefined,
    },
    scene: null,
    camera: null,
    root,
    renderSize: new THREE.Vector2(),
    actualCameraTarget: new THREE.Vector3(),
    dpr: 1,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    measuredOverlayInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    intersectionRatio: null,
    rafId: null,
    firstFrameSnapshot: null,
    lastFrameTime: null,
    lastRafTime: null,
    lastRafInterval: null,
    pendingReadyCallback: false,
    pendingReadyGeneration: null,
    loadGeneration: 1,
    recoveryGeneration: 1,
    rendererRegistered: false,
    counters: {
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
    },
    assetSource: null,
    shared: null,
    sharedReleased: true,
    skyTexture: null,
    contextRecovery: null,
    resizeObserver: null,
    intersectionObserver: null,
    loadPromise: null,
    skyGeneration: 0,
    calibration: null,
    calibrationBaseline: null,
    calibrationBaselineViewport: null,
    calibrationListener: null,
    calibrationNotifiedAt: 0,
    resolvedAsset: asset,
    panelTransition: null,
    panelWrappers: new Map(),
    panelEntranceOrder: ids.slice(),
    journey: null,
    arrival: null,
    pendingReturn: null,
    lastCompletedArrival: null,
    intent: {
      active: false,
      panelCount: count,
      reducedMotion: false,
      revision: 1,
    },
    currentState: asset.state,
    choreography: new ChoreographyTimeline(),
    choreographySnapshot: initialChoreographySnapshot(1),
    callbacks: {
      onReady: () => undefined,
      onError: () => undefined,
      onArrival: () => undefined,
    },
    scheduleFrame: () => undefined,
    completeArrivalIfReady: () => undefined,
    emitChoreography: () => undefined,
  });
  return { asset, ids, viewer };
}
function makePublicPanelFixture(count: number): {
  asset: ResolvedAsset;
  ids: string[];
  viewer: PublicFixtureViewer;
} {
  const { asset, ids } = makePanelFixture(count, {
    distinctTransforms: true,
  });
  const canvas = {
    style: {},
    setAttribute: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    remove: () => undefined,
  } as unknown as HTMLCanvasElement;
  const host = {
    clientWidth: 815,
    clientHeight: 390,
    appendChild: () => undefined,
  } as unknown as HTMLDivElement;
  const fakeDocument = {
    hidden: false,
    createElement: () => canvas,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as Document;
  const fakeWindow = {
    devicePixelRatio: 1,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as Window & typeof globalThis;
  const fakeResizeObserver = class {
    observe(): void {}
    disconnect(): void {}
  };
  const fakeIntersectionObserver = class {
    observe(): void {}
    disconnect(): void {}
  };
  const globalObject = globalThis as typeof globalThis & {
    document?: unknown;
    window?: unknown;
    ResizeObserver?: unknown;
    IntersectionObserver?: unknown;
  };
  const previousGlobals = {
    document: globalObject.document,
    window: globalObject.window,
    ResizeObserver: globalObject.ResizeObserver,
    IntersectionObserver: globalObject.IntersectionObserver,
  };
  const installGlobals = (): void => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: fakeDocument,
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: fakeWindow,
    });
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: fakeResizeObserver,
    });
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: fakeIntersectionObserver,
    });
  };
  const restoreGlobals = (): void => {
    (
      [
        ['document', previousGlobals.document],
        ['window', previousGlobals.window],
        ['ResizeObserver', previousGlobals.ResizeObserver],
        ['IntersectionObserver', previousGlobals.IntersectionObserver],
      ] as const
    ).forEach(([key, value]) => {
      if (value === undefined) Reflect.deleteProperty(globalThis, key);
      else
        Object.defineProperty(globalThis, key, {
          configurable: true,
          value,
        });
    });
  };
  const callbacks: BrightfieldViewerCallbacks = {
    onReady: () => undefined,
    onError: () => undefined,
    onArrival: () => undefined,
    onChoreography: () => undefined,
  };
  installGlobals();
  const viewer = new BrightfieldViewer(
    host,
    callbacks,
  ) as unknown as PublicFixtureViewer;
  const renderer = {
    getSize: (size: THREE.Vector2) => size.set(815, 390),
    setSize: () => undefined,
    setViewport: () => undefined,
    setScissor: () => undefined,
    setScissorTest: () => undefined,
    clear: () => undefined,
    render: () => undefined,
    dispose: () => undefined,
    forceContextLoss: () => undefined,
  };
  Object.assign(viewer, {
    loaded: true,
    disposed: false,
    dirty: true,
    renderer,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    root: asset.root,
    resolvedAsset: asset,
    panelTransition: null,
    panelWrappers: new Map(),
    panelEntranceOrder: ids.slice(),
    intent: {
      active: false,
      panelCount: count,
      reducedMotion: false,
      revision: 0,
    },
    currentState: asset.state,
    choreography: new ChoreographyTimeline(),
    choreographySnapshot: initialChoreographySnapshot(0),
    pendingReadyCallback: false,
    pendingReadyGeneration: null,
    loadGeneration: 1,
    recoveryGeneration: 1,
    renderFailed: false,
    contextLost: false,
    visible: true,
    backgrounded: false,
    lastRafTime: null,
    lastFrameTime: null,
    lastRafInterval: null,
    firstFrameSnapshot: null,
    rendererRegistered: false,
    scheduleFrame: () => undefined,
  });
  const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
  const renderFrame = viewer.renderFrame;
  viewer.renderFrame = (timestamp) => {
    clock.mockReturnValue(timestamp);
    renderFrame(timestamp);
  };
  const disposeViewer = viewer.dispose.bind(viewer);
  viewer.dispose = () => {
    installGlobals();
    try {
      disposeViewer();
    } finally {
      restoreGlobals();
      clock.mockRestore();
    }
  };
  restoreGlobals();
  return { asset, ids, viewer };
}
function expectMixedPanelTrs(node: THREE.Object3D): void {
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  node.matrix.decompose(position, rotation, scale);
  expect(position.toArray()).toEqual([1, 2, 3]);
  expect(rotation.x).toBeCloseTo(0);
  expect(rotation.y).toBeCloseTo(0);
  expect(rotation.z).toBeCloseTo(Math.SQRT1_2);
  expect(rotation.w).toBeCloseTo(Math.SQRT1_2);
  expect(scale.toArray()).toEqual([2, 3, 4]);
}

function expectRefinedPanelTrs(node: THREE.Object3D): void {
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  node.matrix.decompose(position, rotation, scale);
  expect(position.toArray()).toEqual([-4, 1, 2]);
  expect(rotation.x).toBeCloseTo(0);
  expect(rotation.y).toBeCloseTo(0);
  expect(rotation.z).toBeCloseTo(-Math.SQRT1_2);
  expect(rotation.w).toBeCloseTo(Math.SQRT1_2);
  expect(scale.toArray()).toEqual([3, 4, 5]);
}

describe('responsive choreography camera', () => {
  it.each([
    { active: true, phase: 'camera', progress: 0.4 },
    { active: false, phase: 'returning', progress: 0.65 },
  ] as const)(
    'preserves the sampled $phase pose when insets resize',
    ({ active, phase, progress }) => {
      const { viewer } = makePanelFixture(0);
      const camera = new THREE.PerspectiveCamera();
      const target = new THREE.Vector3();
      Object.assign(viewer, {
        loaded: true,
        host: { clientWidth: 815, clientHeight: 390 },
        camera,
        actualCameraTarget: target,
        intent: { active, panelCount: 0, reducedMotion: false, revision: 1 },
        choreographySnapshot: {
          ...initialChoreographySnapshot(1),
          phase,
          cameraProgress: progress,
        },
      });
      viewer.setInsets({ top: 20, right: 340, bottom: 20, left: 20 });
      const presets = approvedCameraPresets(815);
      const expected = interpolateCalibration(
        presets.frontal,
        presets.elevated,
        progress,
        APPROVED_CAMERA_MOTION,
      );
      expect(camera.position.toArray()).toEqual(expected.position);
      expect(target.toArray()).toEqual(expected.target);
      expect(camera.fov).toBe(expected.fov);
    },
  );
});

describe('unavailable scene intents', () => {
  it('settles Close at covered frontal so context recovery cannot revive an exit', () => {
    const { viewer, asset } = makePanelFixture(17);
    const intent = {
      active: true,
      panelCount: 17,
      reducedMotion: false,
      revision: 1,
    };
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(intent);
    timeline.advance(5.4);
    timeline.setPanelsComplete(1, true);
    const camera = new THREE.PerspectiveCamera();
    Object.assign(viewer, {
      loaded: true,
      contextLost: true,
      renderer: null,
      rafId: null,
      host: { clientWidth: 815, clientHeight: 390 },
      camera,
      actualCameraTarget: new THREE.Vector3(),
      intent,
      choreography: timeline,
      choreographySnapshot: timeline.snapshot(),
    });
    viewer.setIntent({ ...intent, active: false, revision: 2 });
    expect(timeline.snapshot()).toMatchObject({
      revision: 2,
      phase: 'covered',
      cameraProgress: 0,
      curtainProgress: 0,
      drawerProgress: 0,
    });
    expect(camera.position.toArray()).toEqual(
      approvedCameraPresets(815).frontal.position,
    );
    asset.panels.forEach((panel) => {
      expect(panel.parent.visible).toBe(false);
      expect(panel.module.visible).toBe(false);
      expect(panel.support.visible).toBe(false);
    });
    expect(viewer.intent).toMatchObject({
      active: false,
      reducedMotion: false,
    });
  });
});

describe('panel animation boundaries', () => {
  it('keeps the complete installation within 1.5 seconds for every occupancy', () => {
    for (let panels = 1; panels <= 51; panels += 1) {
      const interval = panelAnimationInterval(panels);
      expect(interval).toBeGreaterThan(0);
      expect(
        (panels - 1) * interval + PANEL_TWEEN_DURATION,
      ).toBeLessThanOrEqual(1500);
    }
  });
});
describe('real Three panel choreography fixtures', () => {
  it.each([0, 1, 8, 17, 51])(
    'removes %i paired panels in actual entrance order',
    (count) => {
      const { viewer, asset, ids } = makePanelFixture(count);
      const originalMatrices = new Map(
        ids.map((id) => {
          const panel = asset.panels.get(id)!;
          return [
            id,
            [panel.parent, panel.module, panel.support].map((node) =>
              node.matrix.toArray(),
            ),
          ];
        }),
      );
      viewer.transitionPanels({ mode: 'CASA_BASE' });
      expect(viewer.panelTransition?.pendingIds ?? []).toEqual(
        ids.slice().reverse(),
      );
      const initiallyVisible = ids.filter(
        (id) => asset.panels.get(id)?.parent.visible,
      );
      expect(initiallyVisible).toHaveLength(count);
      viewer.advancePanels(2);
      expect(viewer.panelTransition).toBeNull();
      ids.forEach((id) => {
        const panel = asset.panels.get(id)!;
        expect(panel.parent.visible).toBe(false);
        expect(panel.module.visible).toBe(false);
        expect(panel.support.visible).toBe(false);
        expect(panel.module.parent).toBe(panel.parent);
        expect(panel.support.parent).toBe(panel.parent);
        expect(
          [panel.parent, panel.module, panel.support].map((node) =>
            node.matrix.toArray(),
          ),
        ).toEqual(originalMatrices.get(id));
      });
    },
  );

  it('reverses an interrupted entrance monotonically from sampled scales', () => {
    const { viewer, asset, ids } = makePanelFixture(8);
    applySolarState(asset, { mode: 'CASA_BASE' });
    viewer.transitionPanels({ mode: 'MISTO_PREFIXO', n: 8 });
    viewer.advancePanels(0.08);
    const visibleIds = ids.filter((id) => asset.panels.get(id)!.parent.visible);
    const sampled = new Map(
      visibleIds.map((id) => [
        id,
        viewer.panelWrappers.get(id)!.wrapper.scale.x,
      ]),
    );
    expect([...sampled.values()].every((scale) => scale > 0 && scale < 1)).toBe(
      true,
    );
    viewer.transitionPanels({ mode: 'CASA_BASE' });
    expect(viewer.panelTransition?.pendingIds).toEqual(visibleIds.reverse());
    viewer.advancePanels(0);
    sampled.forEach((scale, id) => {
      expect(viewer.panelWrappers.get(id)!.wrapper.scale.x).toBeCloseTo(scale);
    });
    for (let frame = 0; frame < 10; frame += 1) {
      viewer.advancePanels(0.01);
      sampled.forEach((previous, id) => {
        const current = viewer.panelWrappers.get(id)?.wrapper.scale.x ?? 0;
        expect(current).toBeLessThanOrEqual(previous + 1e-9);
        sampled.set(id, current);
        const panel = asset.panels.get(id)!;
        expect(panel.module.visible).toBe(panel.parent.visible);
        expect(panel.support.visible).toBe(panel.parent.visible);
      });
    }
    viewer.advancePanels(2);
    expect(viewer.panelTransition).toBeNull();
    ids.forEach((id) => {
      expect(asset.panels.get(id)!.parent.visible).toBe(false);
    });
  });

  it('retargets a partial entrance without moving or restarting visible pairs', () => {
    const { viewer, asset, ids } = makePanelFixture(51);
    applySolarState(asset, { mode: 'CASA_BASE' });
    viewer.transitionPanels({ mode: 'MISTO_PREFIXO', n: 8 });
    viewer.advancePanels(0.08);
    asset.root.updateMatrixWorld(true);
    const sampled = ids
      .filter((id) => asset.panels.get(id)!.parent.visible)
      .map((id) => ({
        id,
        scale: viewer.panelWrappers.get(id)!.wrapper.scale.x,
        matrices: [
          asset.panels.get(id)!.module,
          asset.panels.get(id)!.support,
        ].map((node) => node.matrixWorld.toArray()),
      }));
    viewer.transitionPanels({ mode: 'MISTO_PREFIXO', n: 17 });
    viewer.advancePanels(0);
    asset.root.updateMatrixWorld(true);
    sampled.forEach(({ id, scale, matrices }) => {
      expect(viewer.panelWrappers.get(id)!.wrapper.scale.x).toBeCloseTo(scale);
      [asset.panels.get(id)!.module, asset.panels.get(id)!.support].forEach(
        (node, child) => {
          node.matrixWorld.toArray().forEach((value, index) => {
            expect(value).toBeCloseTo(matrices[child]![index]!, 9);
          });
        },
      );
    });
    viewer.advancePanels(2);
    expect(ids.filter((id) => asset.panels.get(id)!.parent.visible)).toEqual(
      ids.slice(0, 17),
    );
    viewer.transitionPanels({ mode: 'MISTO_PREFIXO', n: 51 });
    viewer.advancePanels(2);
    expect(ids.filter((id) => asset.panels.get(id)!.parent.visible)).toEqual(
      ids,
    );
    expect(viewer.panelWrappers.size).toBe(0);
  });

  it('reveals new target pairs after removing disjoint old occupancy', () => {
    const { viewer, asset, ids } = makePanelFixture(51);
    asset.manifest.states.REFINADOS_08.active_panel_ids = ids.slice(17, 25);
    viewer.transitionPanels({ mode: 'MISTO_PREFIXO', n: 17 });
    viewer.advancePanels(2);
    viewer.transitionPanels({ mode: 'REFINADOS_08' });
    viewer.advancePanels(2);
    expect(viewer.panelTransition?.pendingIds).toEqual(ids.slice(17, 25));
    viewer.advancePanels(2);
    expect(ids.filter((id) => asset.panels.get(id)!.parent.visible)).toEqual(
      ids.slice(17, 25),
    );
  });
});
describe('public panel-count state reconciliation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps MISTO_PREFIXO poses for a 9-to-8-to-9 consumer retarget', () => {
    const { viewer, asset, ids } = makePublicPanelFixture(9);

    viewer.setIntent({
      active: true,
      panelCount: 9,
      reducedMotion: false,
      revision: 1,
    });
    viewer.renderFrame(0);
    viewer.renderFrame(4000);
    viewer.setIntent({
      active: true,
      panelCount: 8,
      reducedMotion: false,
      revision: 2,
    });
    viewer.renderFrame(5000);

    expect(viewer.currentState).toEqual({
      mode: 'MISTO_PREFIXO',
      n: 8,
    });
    expect(ids.filter((id) => asset.panels.get(id)!.parent.visible)).toEqual(
      ids.slice(0, 8),
    );
    expect(asset.panels.get(ids[0]!)!.parent.matrix.toArray()).toEqual([
      0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 1, 2, 3, 1,
    ]);
    expectMixedPanelTrs(asset.panels.get(ids[0]!)!.parent);

    viewer.setIntent({
      active: true,
      panelCount: 9,
      reducedMotion: false,
      revision: 3,
    });
    viewer.renderFrame(6000);

    expect(viewer.currentState).toEqual({
      mode: 'MISTO_PREFIXO',
      n: 9,
    });
    expect(ids.filter((id) => asset.panels.get(id)!.parent.visible)).toEqual(
      ids,
    );
    expect(asset.panels.get(ids[0]!)!.parent.matrix.toArray()).toEqual([
      0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 1, 2, 3, 1,
    ]);
    expectMixedPanelTrs(asset.panels.get(ids[0]!)!.parent);
    viewer.dispose();
  });

  it('settles a 17-to-8 removal with the mixed-state survivor transforms', () => {
    const { viewer, asset, ids } = makePublicPanelFixture(17);

    viewer.setIntent({
      active: true,
      panelCount: 17,
      reducedMotion: false,
      revision: 1,
    });
    viewer.renderFrame(0);
    viewer.renderFrame(4000);
    viewer.setIntent({
      active: true,
      panelCount: 8,
      reducedMotion: false,
      revision: 2,
    });
    viewer.renderFrame(5000);

    expect(viewer.currentState).toEqual({
      mode: 'MISTO_PREFIXO',
      n: 8,
    });
    expect(ids.filter((id) => asset.panels.get(id)!.parent.visible)).toEqual(
      ids.slice(0, 8),
    );
    expect(asset.panels.get(ids[0]!)!.parent.matrix.toArray()).toEqual([
      0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 1, 2, 3, 1,
    ]);
    expectMixedPanelTrs(asset.panels.get(ids[0]!)!.parent);
    viewer.dispose();
  });

  it('closes and reopens eight public panels in the mixed state', () => {
    const { viewer, asset, ids } = makePublicPanelFixture(8);

    viewer.setIntent({
      active: true,
      panelCount: 8,
      reducedMotion: false,
      revision: 1,
    });
    viewer.renderFrame(0);
    viewer.renderFrame(4000);
    viewer.setIntent({
      active: false,
      panelCount: 8,
      reducedMotion: false,
      revision: 2,
    });
    viewer.renderFrame(5000);

    expect(viewer.currentState).toEqual({ mode: 'CASA_BASE' });
    expect(ids.some((id) => asset.panels.get(id)!.parent.visible)).toBe(false);

    viewer.setIntent({
      active: true,
      panelCount: 8,
      reducedMotion: false,
      revision: 3,
    });
    viewer.renderFrame(9000);

    expect(viewer.currentState).toEqual({
      mode: 'MISTO_PREFIXO',
      n: 8,
    });
    expect(ids.every((id) => asset.panels.get(id)!.parent.visible)).toBe(true);
    expect(asset.panels.get(ids[0]!)!.parent.matrix.toArray()).toEqual([
      0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 1, 2, 3, 1,
    ]);
    expectMixedPanelTrs(asset.panels.get(ids[0]!)!.parent);
    viewer.dispose();
  });

  it('lets the latest target win across a rapid eight-panel crossing', () => {
    const { viewer, asset, ids } = makePublicPanelFixture(9);

    viewer.setIntent({
      active: true,
      panelCount: 9,
      reducedMotion: false,
      revision: 1,
    });
    viewer.renderFrame(0);
    viewer.renderFrame(4000);
    viewer.setIntent({
      active: true,
      panelCount: 8,
      reducedMotion: false,
      revision: 2,
    });
    viewer.renderFrame(4050);
    expect(viewer.choreographySnapshot.revision).toBe(2);
    expect(viewer.panelTransition).not.toBeNull();
    viewer.setIntent({
      active: true,
      panelCount: 9,
      reducedMotion: false,
      revision: 3,
    });
    viewer.renderFrame(5050);
    expect(viewer.choreographySnapshot.revision).toBe(3);

    expect(viewer.panelTransition).toBeNull();
    expect(viewer.currentState).toEqual({
      mode: 'MISTO_PREFIXO',
      n: 9,
    });
    expect(ids.filter((id) => asset.panels.get(id)!.parent.visible)).toEqual(
      ids,
    );
    expectMixedPanelTrs(asset.panels.get(ids[0]!)!.parent);
    viewer.setIntent({
      active: true,
      panelCount: 8,
      reducedMotion: false,
      revision: 2,
    });
    viewer.renderFrame(6000);
    expect(viewer.choreographySnapshot.revision).toBe(3);
    expect(viewer.currentState).toEqual({ mode: 'MISTO_PREFIXO', n: 9 });
    expect(ids.filter((id) => asset.panels.get(id)!.parent.visible)).toEqual(
      ids,
    );
    viewer.dispose();
  });

  it('keeps an explicit REFINADOS_08 transition on its authored pose', () => {
    const { viewer, asset, ids } = makePanelFixture(8, {
      distinctTransforms: true,
    });

    viewer.setSolarState({ mode: 'REFINADOS_08' });

    expect(viewer.currentState).toEqual({ mode: 'REFINADOS_08' });
    expect(ids.every((id) => asset.panels.get(id)!.parent.visible)).toBe(true);
    expect(asset.panels.get(ids[0]!)!.parent.matrix.toArray()).toEqual([
      0, -3, 0, 0, 4, 0, 0, 0, 0, 0, 5, 0, -4, 1, 2, 1,
    ]);
    expectRefinedPanelTrs(asset.panels.get(ids[0]!)!.parent);
  });
});

describe('active-clock choreography contract', () => {
  it('holds frontal during lead-in and opens the barrier once', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent({
      active: true,
      panelCount: 8,
      reducedMotion: false,
      revision: 1,
    });
    expect(timeline.advance(0.39)).toMatchObject({
      phase: 'lead-in',
      cameraProgress: 0,
      cameraComplete: false,
      curtainComplete: false,
    });
    expect(timeline.advance(0.01).phase).toBe('camera');
    const camera = timeline.advance(3);
    expect(camera).toMatchObject({
      phase: 'revealing',
      cameraProgress: 1,
      curtainProgress: 1,
      cameraComplete: true,
      curtainComplete: true,
    });
    expect(timeline.advance(0.4).drawerComplete).toBe(true);
  });

  it('preserves sampled progress through close and returns to cover', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent({
      active: true,
      panelCount: 17,
      reducedMotion: false,
      revision: 4,
    });
    timeline.advance(2.6);
    const sampled = timeline.snapshot();
    timeline.setPanelsComplete(4, true);
    timeline.setIntent({
      active: false,
      panelCount: 17,
      reducedMotion: false,
      revision: 5,
    });
    timeline.setPanelsComplete(5, true);
    expect(timeline.snapshot().cameraProgress).toBe(sampled.cameraProgress);
    timeline.advance(10);
    expect(timeline.snapshot()).toMatchObject({
      phase: 'covered',
      cameraProgress: 0,
      curtainProgress: 0,
      drawerProgress: 0,
    });
  });

  it('retargets panel count without restarting the camera', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent({
      active: true,
      panelCount: 1,
      reducedMotion: false,
      revision: 1,
    });
    timeline.advance(2.2);
    const cameraProgress = timeline.snapshot().cameraProgress;
    timeline.setIntent({
      active: true,
      panelCount: 51,
      reducedMotion: false,
      revision: 2,
    });
    expect(timeline.snapshot().cameraProgress).toBe(cameraProgress);
  });

  it('settles reduced motion as coherent endpoints', () => {
    const timeline = new ChoreographyTimeline();
    expect(
      timeline.setIntent({
        active: true,
        panelCount: 51,
        reducedMotion: true,
        revision: 3,
      }),
    ).toMatchObject({
      phase: 'active',
      cameraProgress: 1,
      curtainProgress: 1,
      panelsComplete: true,
      drawerComplete: true,
    });
    expect(initialChoreographySnapshot()).toMatchObject({
      phase: 'covered',
      cameraProgress: 0,
      curtainProgress: 0,
    });
  });
});
describe('recovered paint lifecycle', () => {
  function makePaintFixture() {
    const events: string[] = [];
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    let shouldThrow = false;
    let renders = 0;
    let ready = false;
    let visibleLift = 0;
    const renderer = {
      outputColorSpace: THREE.SRGBColorSpace,
      toneMapping: THREE.NoToneMapping,
      toneMappingExposure: 1,
      shadowMap: { enabled: false },
      info: { memory: {} },
      setScissorTest: () => undefined,
      clear: () => undefined,
      render: () => {
        if (shouldThrow) throw new Error('software paint failure');
        renders += 1;
      },
      getSize: (size: THREE.Vector2) => size.set(815, 390),
      setSize: () => undefined,
      setViewport: () => undefined,
      setScissor: () => undefined,
      getDrawingBufferSize: (size: THREE.Vector2) => size.set(815, 390),
    };
    const viewer = Object.create(
      BrightfieldViewer.prototype,
    ) as PaintFixtureViewer;
    Object.assign(viewer, {
      loaded: true,
      visible: true,
      backgrounded: false,
      contextLost: false,
      disposed: false,
      dirty: true,
      renderSize: new THREE.Vector2(),
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
      renderer,
      scene,
      camera,
      actualCameraTarget: new THREE.Vector3(),
      host: { clientWidth: 815, clientHeight: 390 },
      callbacks: {
        onReady: () => {
          ready = true;
          events.push('ready');
        },
        onError: (message: string) => {
          ready = false;
          visibleLift = 0;
          events.push(`error:${message}`);
        },
        onArrival: () => undefined,
        onChoreography: (snapshot: ChoreographySnapshot) => {
          if (ready) visibleLift = curtainLiftAt(snapshot.curtainProgress);
          events.push(`snapshot:${snapshot.phase}`);
        },
      },
      choreographySnapshot: {
        ...initialChoreographySnapshot(7),
        phase: 'active',
        cameraProgress: 1,
        curtainProgress: 1,
        drawerProgress: 1,
        cameraComplete: true,
        curtainComplete: true,
        panelsComplete: true,
        drawerComplete: true,
      },
      choreography: new ChoreographyTimeline(),
      intent: {
        active: true,
        panelCount: 17,
        reducedMotion: false,
        revision: 7,
      },
      currentState: { mode: 'MISTO_PREFIXO', n: 17 },
      pendingReadyCallback: true,
      pendingReadyGeneration: 1,
      recoveryGeneration: 1,
      loadGeneration: 1,
      renderFailed: false,
      rafId: null,
      panelWrappers: new Map(),
      panelEntranceOrder: [],
      counters: {
        frames: 0,
        firstFrames: 0,
        rafCanceled: 0,
      },
      root: null,
      resolvedAsset: null,
      firstFrameSnapshot: null,
      lastFrameTime: null,
      lastRafInterval: null,
    });
    viewer.scheduleFrame = () => undefined;
    return {
      viewer,
      events,
      renderer,
      get renders() {
        return renders;
      },
      get ready() {
        return ready;
      },
      get visibleLift() {
        return visibleLift;
      },
      failPaint(value: boolean) {
        shouldThrow = value;
      },
    };
  }

  it('replays the authoritative active snapshot after recovered onReady', () => {
    const fixture = makePaintFixture();

    fixture.viewer.renderImmediately();

    expect(fixture.ready).toBe(true);
    expect(fixture.visibleLift).toBe(1);
    expect(fixture.renders).toBe(1);
  });

  it('does not replay readiness after a reentrant dispose', () => {
    const fixture = makePaintFixture();
    fixture.viewer.callbacks.onReady = () => {
      fixture.events.push('dispose');
      fixture.viewer.disposed = true;
    };

    fixture.viewer.renderImmediately();

    expect(fixture.events).toEqual(['dispose']);
  });
  it('does not replay a snapshot after the ready scene generation is replaced', () => {
    const fixture = makePaintFixture();
    fixture.viewer.callbacks.onReady = () => {
      fixture.events.push('replace');
      fixture.viewer.loadGeneration += 1;
    };

    fixture.viewer.renderImmediately();

    expect(fixture.events).toEqual(['replace']);
  });

  it('does not release the white fallback for an obsolete ready generation', () => {
    const fixture = makePaintFixture();
    Object.assign(fixture.viewer, { pendingReadyGeneration: 0 });
    fixture.viewer.renderImmediately();
    expect(fixture.ready).toBe(false);
    expect(fixture.visibleLift).toBe(0);
  });

  it('recovers the accepted active view without discarding the current estimate', () => {
    const fixture = makePaintFixture();
    const timeline = new ChoreographyTimeline();
    timeline.setIntent({
      active: true,
      panelCount: 17,
      reducedMotion: true,
      revision: 7,
    });
    Object.assign(fixture.viewer, { choreography: timeline });
    fixture.viewer.renderImmediately();
    expect(fixture.visibleLift).toBe(1);
    fixture.failPaint(true);
    fixture.viewer.renderImmediately();
    expect(fixture.ready).toBe(false);
    expect(fixture.visibleLift).toBe(0);
    expect(fixture.viewer.currentState).toEqual({
      mode: 'MISTO_PREFIXO',
      n: 17,
    });
    fixture.failPaint(false);
    fixture.viewer.recover();
    fixture.viewer.renderImmediately();
    expect(fixture.ready).toBe(true);
    expect(fixture.visibleLift).toBe(1);
  });

  it('reports a paint failure as recoverable inactive state and retries', () => {
    const fixture = makePaintFixture();
    const { asset } = makePanelFixture(17);
    applySolarState(asset, { mode: 'MISTO_PREFIXO', n: 17 });
    Object.assign(fixture.viewer, {
      intent: {
        active: false,
        panelCount: 17,
        reducedMotion: false,
        revision: 8,
      },
      currentState: { mode: 'MISTO_PREFIXO', n: 17 },
      resolvedAsset: asset,
      choreography: new ChoreographyTimeline(),
      choreographySnapshot: initialChoreographySnapshot(8),
      pendingReadyCallback: false,
    });
    fixture.failPaint(true);

    fixture.viewer.renderImmediately();
    expect(fixture.events).toContain('error:software paint failure');
    expect(fixture.viewer.contextLost).toBe(false);
    expect(fixture.viewer.choreographySnapshot).toMatchObject({
      phase: 'covered',
      cameraProgress: 0,
      curtainProgress: 0,
      drawerProgress: 0,
    });
    expect(fixture.viewer.currentState).toEqual({ mode: 'CASA_BASE' });
    asset.panels.forEach((panel) => {
      expect(panel.parent.visible).toBe(false);
      expect(panel.module.visible).toBe(false);
      expect(panel.support.visible).toBe(false);
    });
    expect(fixture.ready).toBe(false);
    fixture.viewer.renderImmediately();
    expect(
      fixture.events.filter((event) => event.startsWith('error:')),
    ).toHaveLength(1);

    fixture.failPaint(false);
    fixture.viewer.recover();
    fixture.viewer.renderImmediately();
    expect(fixture.renders).toBe(1);
    expect(fixture.ready).toBe(true);
    expect(fixture.visibleLift).toBe(0);
  });
});
