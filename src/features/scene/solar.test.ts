import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  applySolarState,
  inspectSolarState,
  ManifestValidationError,
  resolveAsset,
  validateManifest,
  type Manifest,
  type ResolvedAsset,
  type SolarState,
} from './solar';

interface GlbNode {
  name?: string;
  children?: number[];
  extras?: Record<string, unknown>;
  mesh?: number;
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}

interface GlbJson {
  nodes: GlbNode[];
  scene?: number;
  scenes?: Array<{ nodes?: number[] }>;
}

const manifestUrl = new URL(
  '../../../public/assets/finished-v04/house.manifest.json',
  import.meta.url,
);
const glbUrl = new URL(
  '../../../public/assets/finished-v04/house.glb',
  import.meta.url,
);
const sourceManifest = validateManifest(
  JSON.parse(readFileSync(fileURLToPath(manifestUrl), 'utf8')),
);

function copyManifest(): Manifest {
  return structuredClone(sourceManifest);
}

function readGlbJson(): GlbJson {
  const bytes = readFileSync(fileURLToPath(glbUrl));
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2)
    throw new Error('Expected a glTF 2.0 binary fixture');
  const jsonLength = bytes.readUInt32LE(12);
  const jsonType = bytes.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error('Expected a JSON GLB chunk');
  return JSON.parse(
    bytes
      .subarray(20, 20 + jsonLength)
      .toString('utf8')
      .trim(),
  ) as GlbJson;
}

function assetId(node: GlbNode): string {
  const id = node.extras?.asset_id;
  if (typeof id !== 'string' || id.length === 0)
    throw new Error('GLB node is missing extras.asset_id');
  return id;
}

function glbLocalMatrix(node: GlbNode): THREE.Matrix4 {
  if (node.matrix !== undefined)
    return new THREE.Matrix4().fromArray(node.matrix);
  const position = new THREE.Vector3().fromArray(node.translation ?? [0, 0, 0]);
  const rotation = new THREE.Quaternion().fromArray(
    node.rotation ?? [0, 0, 0, 1],
  );
  const scale = new THREE.Vector3().fromArray(node.scale ?? [1, 1, 1]);
  return new THREE.Matrix4().compose(position, rotation, scale);
}

function makeSceneFromGlb(glb: GlbJson): {
  root: THREE.Group;
  objects: Map<string, THREE.Object3D>;
} {
  const root = new THREE.Group();
  const objects = new Map<string, THREE.Object3D>();
  const indexed = glb.nodes.map((node) => {
    const object =
      typeof node.mesh === 'number'
        ? new THREE.Mesh(
            new THREE.BufferGeometry(),
            new THREE.MeshBasicMaterial(),
          )
        : new THREE.Group();
    object.name = node.name ?? '';
    object.userData.asset_id = assetId(node);
    object.matrixAutoUpdate = false;
    object.matrix.copy(glbLocalMatrix(node));
    objects.set(assetId(node), object);
    return object;
  });
  const children = new Set<number>();
  glb.nodes.forEach((node, index) => {
    node.children?.forEach((childIndex) => {
      indexed[index]!.add(indexed[childIndex]!);
      children.add(childIndex);
    });
  });
  const sceneRoots =
    glb.scenes?.[glb.scene ?? 0]?.nodes ??
    glb.nodes
      .map((_node, index) => index)
      .filter((index) => !children.has(index));
  sceneRoots.forEach((index) => root.add(indexed[index]!));
  return { root, objects };
}

function setup(): {
  asset: ResolvedAsset;
  scene: { root: THREE.Group; objects: Map<string, THREE.Object3D> };
  glb: GlbJson;
} {
  const glb = readGlbJson();
  const scene = makeSceneFromGlb(glb);
  return { asset: resolveAsset(scene.root, sourceManifest), scene, glb };
}

function expectClose(
  left: readonly number[],
  right: readonly number[],
  epsilon = 1e-8,
): void {
  expect(left).toHaveLength(right.length);
  left.forEach((value, index) =>
    expect(Math.abs(value - right[index]!)).toBeLessThanOrEqual(epsilon),
  );
}

const panelMatrix = (asset: ResolvedAsset, id: string): number[] =>
  asset.panels.get(id)!.parent.matrix.toArray();

const expectedSentinels = {
  PANEL_001: {
    translation: [-5.235000133514404, 3.3668265342712402, 5.034947872161865],
    rotation: [0.1045285239815712, 0, 0, 0.994521975517273],
  },
  PANEL_022: {
    translation: [4.2649993896484375, 3.3668265342712402, -5.034947395324707],
    rotation: [
      0, -0.994521975517273, 0.1045285165309906, 4.3471938937500454e-8,
    ],
  },
  PANEL_051: {
    translation: [10.36572265625, 3.85355806350708, 1.2899999618530273],
    rotation: [
      -0.15643446147441864, -0.987688422203064, 0, 7.245601807426283e-8,
    ],
  },
} as const;

describe('finished-v04 GLB and solar consumer contract', () => {
  it('extracts all 210 semantic nodes, including the 207 original nodes and three environment nodes', () => {
    const glb = readGlbJson();
    const manifestIds = sourceManifest.nodes.map((node) => node.id).sort();
    const glbIds = glb.nodes.map(assetId).sort();
    expect(glb.nodes).toHaveLength(210);
    expect(glbIds).toEqual(manifestIds);
    expect(new Set(glbIds).size).toBe(210);
    expect(
      glb.nodes.filter((node) => node.extras?.role !== 'environment_part'),
    ).toHaveLength(207);
    expect(
      glb.nodes
        .filter((node) => node.extras?.role === 'environment_part')
        .map(assetId)
        .sort(),
    ).toEqual(['ENV_PAVEMENTCONNECTIONS', 'ENV_SIDEWALK', 'ENV_STREET']);

    const parentByIndex = new Map<number, number>();
    glb.nodes.forEach((node, index) =>
      node.children?.forEach((child) => parentByIndex.set(child, index)),
    );
    const manifestById = new Map(
      sourceManifest.nodes.map((node) => [node.id, node]),
    );
    glb.nodes.forEach((node, index) => {
      const manifestNode = manifestById.get(assetId(node));
      expect(manifestNode).toBeDefined();
      const actualParent = parentByIndex.has(index)
        ? assetId(glb.nodes[parentByIndex.get(index)!]!)
        : null;
      expect(actualParent).toBe(manifestNode!.parent);
      expectClose(
        glbLocalMatrix(node).toArray(),
        manifestNode!.transform.matrix_column_major,
      );
    });
  });

  it('protects actual extracted TRS sentinels independently of manifest state fixtures', () => {
    const byId = new Map(
      readGlbJson().nodes.map((node) => [assetId(node), node]),
    );
    Object.entries(expectedSentinels).forEach(([id, expected]) => {
      const node = byId.get(id);
      expect(node).toBeDefined();
      expect(node!.translation).toEqual(expected.translation);
      expect(node!.rotation).toEqual(expected.rotation);
      expect(node!.scale ?? [1, 1, 1]).toEqual([1, 1, 1]);
    });
  });

  it('resolves semantic module/support children from the actual GLB hierarchy', () => {
    const { asset, scene } = setup();
    const first = asset.panels.get('PANEL_001')!;
    expect(first.module).toBe(scene.objects.get('PANEL_001_MODULE'));
    expect(first.support).toBe(scene.objects.get('PANEL_001_SUPPORT'));
    expect(first.module).toBeInstanceOf(THREE.Mesh);
    expect(first.support).toBeInstanceOf(THREE.Mesh);
    expect(first.module.parent).toBe(first.parent);
    expect(first.support.parent).toBe(first.parent);
    sourceManifest.panels.forEach((panel) => {
      const resolved = asset.panels.get(panel.id)!;
      expectClose(
        resolved.module.matrix.toArray(),
        panel.child_transforms.module.matrix_column_major,
      );
      expectClose(
        resolved.support.matrix.toArray(),
        panel.child_transforms.support.matrix_column_major,
      );
    });
    applySolarState(asset, { mode: 'MISTO_PREFIXO', n: 1 });
    expect(inspectSolarState(asset).activePanelIds).toEqual(['PANEL_001']);
    expect(inspectSolarState(asset).visibleModuleIds).toHaveLength(1);
    expect(inspectSolarState(asset).visibleSupportIds).toHaveLength(1);
  });

  it.each([0, 8, 17, 21, 42, 51])(
    'applies prefix %s in occupancy order with stable panel transforms and paired visibility',
    (n) => {
      const { asset } = setup();
      applySolarState(asset, { mode: 'MISTO_PREFIXO', n });
      const diagnostics = inspectSolarState(asset);
      const expectedIds = sourceManifest.occupancy_order.slice(0, n);
      expect(diagnostics.activePanelIds).toEqual(expectedIds);
      expect(diagnostics.visiblePanelIds).toEqual(expectedIds);
      expect(diagnostics.visibleModuleIds).toEqual(
        expectedIds.map(
          (id) =>
            sourceManifest.panels.find((panel) => panel.id === id)!.children
              .module,
        ),
      );
      expect(diagnostics.visibleSupportIds).toEqual(
        expectedIds.map(
          (id) =>
            sourceManifest.panels.find((panel) => panel.id === id)!.children
              .support,
        ),
      );
      sourceManifest.panels.forEach((panel) => {
        expectClose(
          panelMatrix(asset, panel.id),
          panel.states.MISTO_PREFIXO.transform.matrix_column_major,
        );
        const visible = expectedIds.includes(panel.id);
        const resolved = asset.panels.get(panel.id)!;
        expect(resolved.parent.visible).toBe(visible);
        expect(resolved.module.visible).toBe(visible);
        expect(resolved.support.visible).toBe(visible);
        const expectedPanelWorld = new THREE.Matrix4().multiplyMatrices(
          resolved.parent.parent!.matrixWorld,
          resolved.parent.matrix,
        );
        expectClose(
          resolved.parent.matrixWorld.toArray(),
          expectedPanelWorld.toArray(),
        );
        const expectedModuleWorld = new THREE.Matrix4().multiplyMatrices(
          resolved.parent.matrixWorld,
          resolved.module.matrix,
        );
        const expectedSupportWorld = new THREE.Matrix4().multiplyMatrices(
          resolved.parent.matrixWorld,
          resolved.support.matrix,
        );
        expectClose(
          resolved.module.matrixWorld.toArray(),
          expectedModuleWorld.toArray(),
        );
        expectClose(
          resolved.support.matrixWorld.toArray(),
          expectedSupportWorld.toArray(),
        );
      });
    },
  );

  it('uses eight distinct refined poses and keeps module/support visibility paired', () => {
    const { asset } = setup();
    applySolarState(asset, { mode: 'REFINADOS_08' });
    const diagnostics = inspectSolarState(asset);
    expect(diagnostics.activePanelIds).toEqual(
      sourceManifest.panels.slice(0, 8).map((panel) => panel.id),
    );
    sourceManifest.panels.forEach((panel, index) => {
      const expected =
        panel.states.REFINADOS_08?.transform ??
        panel.states.MISTO_PREFIXO.transform;
      expectClose(panelMatrix(asset, panel.id), expected.matrix_column_major);
      expect(asset.panels.get(panel.id)!.module.visible).toBe(index < 8);
      expect(asset.panels.get(panel.id)!.support.visible).toBe(index < 8);
    });
    expect(panelMatrix(asset, 'PANEL_001')).not.toEqual(
      sourceManifest.panels[0]!.states.MISTO_PREFIXO.transform
        .matrix_column_major,
    );
  });

  it('does not drift panel matrices, world poses, or hierarchy through repeated state cycles', () => {
    const { asset, scene } = setup();
    applySolarState(asset, { mode: 'MISTO_PREFIXO', n: 51 });
    const initial = inspectSolarState(asset);
    for (let cycle = 0; cycle < 20; cycle += 1) {
      applySolarState(asset, { mode: 'CASA_BASE' });
      applySolarState(asset, { mode: 'MISTO_PREFIXO', n: 0 });
      applySolarState(asset, { mode: 'REFINADOS_08' });
      applySolarState(asset, { mode: 'MISTO_PREFIXO', n: 51 });
    }
    const final = inspectSolarState(asset);
    expect(final.panelMatrices).toEqual(initial.panelMatrices);
    expect(final.panelWorldPositions).toEqual(initial.panelWorldPositions);
    sourceManifest.panels.forEach((panel) => {
      const resolved = asset.panels.get(panel.id)!;
      expect(resolved.module.parent).toBe(resolved.parent);
      expect(resolved.support.parent).toBe(resolved.parent);
      expect(resolved.module.visible).toBe(true);
      expect(resolved.support.visible).toBe(true);
    });
    scene.objects.get('PANEL_001_MODULE')!.removeFromParent();
    expect(() => resolveAsset(scene.root, sourceManifest)).toThrow(
      /missing node.*PANEL_001_MODULE/,
    );
  });

  it('rejects invalid prefix values and malformed manifest IDs, hierarchy, and matrices', () => {
    const { asset } = setup();
    for (const state of [
      { mode: 'MISTO_PREFIXO', n: -1 },
      { mode: 'MISTO_PREFIXO', n: 52 },
      { mode: 'MISTO_PREFIXO', n: 1.5 },
      { mode: 'MISTO_PREFIXO', n: Number.NaN },
    ] as SolarState[])
      expect(() => applySolarState(asset, state)).toThrow(
        /must be an integer from 0 through 51/,
      );

    const duplicate = copyManifest();
    duplicate.nodes[1]!.id = duplicate.nodes[0]!.id;
    expect(() => validateManifest(duplicate)).toThrow(ManifestValidationError);
    const missingParent = copyManifest();
    missingParent.nodes[0]!.parent = 'NOT_A_NODE';
    expect(() => validateManifest(missingParent)).toThrow(
      ManifestValidationError,
    );
    const badMatrix = copyManifest();
    badMatrix.panels[0]!.states.MISTO_PREFIXO.transform.matrix_column_major = [
      1, 2, 3,
    ];
    expect(() => validateManifest(badMatrix)).toThrow(ManifestValidationError);
  });

  it('rejects duplicate and parent-mismatched loaded semantic IDs', () => {
    const { asset, scene } = setup();
    const duplicate = new THREE.Group();
    duplicate.userData.asset_id = 'PANEL_001';
    scene.root.add(duplicate);
    expect(() => resolveAsset(scene.root, sourceManifest)).toThrow(
      /appears more than once/,
    );
    duplicate.removeFromParent();
    const panel = scene.objects.get('PANEL_001')!;
    panel.removeFromParent();
    scene.root.add(panel);
    expect(() => resolveAsset(scene.root, sourceManifest)).toThrow(
      /has parent null, expected "SOLAR_ROOT"/,
    );
    expect(asset.state).toEqual({ mode: 'CASA_BASE' });
  });
});
