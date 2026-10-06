import * as THREE from 'three';

export type SolarState =
  | { mode: 'CASA_BASE' }
  | { mode: 'REFINADOS_08' }
  | { mode: 'MISTO_PREFIXO'; n: number };

export interface TransformRecord {
  parent: string | null;
  matrix_column_major: number[];
  translation: [number, number, number];
  rotation_xyzw: [number, number, number, number];
  scale: [number, number, number];
}

export interface ManifestNode {
  id: string;
  name: string;
  parent: string | null;
  role: string;
  source_name?: string | null;
  extras: Record<string, unknown>;
  transform: TransformRecord;
  world_matrix_column_major?: number[];
  pivot?: { local: number[]; world: number[]; definition?: string };
  bounds?: {
    local: { min: number[]; max: number[] } | null;
    world?: { min: number[]; max: number[] } | null;
  };
  mesh_resource_id: string | null;
  material_slots: string[];
}

export interface ResourceMesh {
  id: string;
  name: string;
  gltf_mesh_index: number;
  triangles: number;
  vertex_records_across_primitives: number;
  primitive_material_slots: string[];
  primitive_layout: Array<{
    attributes: Record<string, number>;
    material_slot: number;
    triangles: number;
  }>;
  node_ids: string[];
  bounds_local: { min: number[]; max: number[] };
}

export interface ResourceMaterial {
  id: string;
  name: string;
  gltf_material_index: number;
  pbr_metallic_roughness?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
  alpha_mode?: string;
  double_sided?: boolean;
  source_constant_parameters?: Record<string, unknown>;
}

export interface ResourceTexture {
  id: string;
  gltf_texture_index: number;
  gltf_image_index: number;
  image_name: string;
  mime_type: string;
  embedded: boolean;
  bytes: number;
  width: number;
  height: number;
  color_space: string;
  purpose: string;
  sha256: string;
  sampler?: Record<string, unknown>;
  bake_verdict?: Record<string, unknown>;
}

export interface ManifestPanelState {
  source_module_id: string;
  source_position_id: string;
  transform: TransformRecord;
}

export interface ManifestPanel {
  id: string;
  children: { module: string; support: string };
  roof_group: string;
  mixed_local_uv_m: [number, number];
  source_record_refined: Record<string, unknown> | null;
  source_record_mixed: Record<string, unknown>;
  states: {
    MISTO_PREFIXO: ManifestPanelState;
    REFINADOS_08: ManifestPanelState | null;
  };
  child_transforms: { module: TransformRecord; support: TransformRecord };
}

export interface ManifestCamera {
  id: string;
  source_name: string;
  source: Record<string, unknown>;
  gltf_perspective: {
    aspectRatio: number;
    yfov: number;
    zfar: number;
    znear: number;
  };
  gltf_node_world_matrix_column_major: number[];
  aspect_reference: number;
  resolution_reference: [number, number];
  framing_policy: string;
}

export interface ManifestStates {
  CASA_BASE: { count: number; active_panel_ids: string[] };
  REFINADOS_08: {
    count: number;
    active_panel_ids: string[];
    transform_key?: string;
    [key: string]: unknown;
  };
  MISTO_PREFIXO: {
    N_min: number;
    N_max: number;
    transform_key?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Manifest {
  schema_version: string;
  asset_id: string;
  source: Record<string, unknown>;
  tools: Record<string, unknown>;
  units: Record<string, unknown>;
  glb: Record<string, unknown>;
  coordinate_system: Record<string, unknown>;
  nodes: ManifestNode[];
  panels: ManifestPanel[];
  resources: {
    meshes: ResourceMesh[];
    materials: ResourceMaterial[];
    textures: ResourceTexture[];
    sharing_note?: string;
    [key: string]: unknown;
  };
  occupancy_order: string[];
  states: ManifestStates;
  cameras: ManifestCamera[];
  camera_reference_identification: Record<string, unknown>;
  physical_panel_dimensions_m: Record<string, unknown>;
  hypotheses: Record<string, unknown>;
  exclusions_and_areas: unknown[];
  limitations: unknown[];
  occupancy_is_illustrative_not_capacity_power_generation: boolean;
  disclaimer: string;
  source_to_export: Record<string, unknown>;
  validation: Record<string, unknown>;
  technical_adaptations: unknown[];
  [key: string]: unknown;
}

export interface ResolvedPanel {
  parent: THREE.Object3D;
  module: THREE.Object3D;
  support: THREE.Object3D;
}

export interface ResolvedAsset {
  manifest: Manifest;
  root: THREE.Object3D;
  nodes: Map<string, THREE.Object3D>;
  panels: Map<string, ResolvedPanel>;
  state: SolarState;
}

export interface SolarDiagnostics {
  state: SolarState;
  mode: SolarState['mode'];
  n: number | null;
  activeCount: number;
  activePanelIds: string[];
  visiblePanelIds: string[];
  visibleModuleIds: string[];
  visibleSupportIds: string[];
  hiddenPanelIds: string[];
  panelMatrices: Record<string, number[]>;
  panelWorldPositions: Record<string, [number, number, number]>;
  panelLocalMatrices: Record<string, number[]>;
  panelWorldMatrices: Record<string, number[]>;
  childLocalMatrices: Record<string, { module: number[]; support: number[] }>;
  childWorldMatrices: Record<string, { module: number[]; support: number[] }>;
}

export class ManifestValidationError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`Manifest ${path}: ${message}`);
    this.name = 'ManifestValidationError';
    this.path = path;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function fail(path: string, message: string): never {
  throw new ManifestValidationError(path, message);
}

const requiredRecord = (
  value: unknown,
  path: string,
): Record<string, unknown> => {
  if (!isRecord(value)) fail(path, 'expected an object');
  return value;
};

const requiredString = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.length === 0)
    fail(path, 'expected a non-empty string');
  return value;
};

const finiteNumber = (value: unknown, path: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    fail(path, 'expected a finite number');
  return value;
};

const finiteArray = (
  value: unknown,
  length: number,
  path: string,
): number[] => {
  if (!Array.isArray(value) || value.length !== length)
    fail(path, `expected ${length} numbers`);
  return value.map((entry, index) => finiteNumber(entry, `${path}[${index}]`));
};

const finiteTuple = <T extends number[]>(
  value: unknown,
  length: number,
  path: string,
): T => finiteArray(value, length, path) as T;

const finiteList = (value: unknown, path: string): number[] => {
  if (!Array.isArray(value)) fail(path, 'expected an array');
  return value.map((entry, index) => finiteNumber(entry, `${path}[${index}]`));
};

const unknownList = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) fail(path, 'expected an array');
  return value;
};

const uniqueIds = (values: string[], path: string): void => {
  const seen = new Set<string>();
  values.forEach((id, index) => {
    if (seen.has(id))
      fail(`${path}[${index}]`, `duplicate id ${JSON.stringify(id)}`);
    seen.add(id);
  });
};

const validateTransform = (value: unknown, path: string): TransformRecord => {
  const record = requiredRecord(value, path);
  const parent =
    record.parent === null
      ? null
      : requiredString(record.parent, `${path}.parent`);
  return {
    parent,
    matrix_column_major: finiteArray(
      record.matrix_column_major,
      16,
      `${path}.matrix_column_major`,
    ),
    translation: finiteTuple<[number, number, number]>(
      record.translation,
      3,
      `${path}.translation`,
    ),
    rotation_xyzw: finiteTuple<[number, number, number, number]>(
      record.rotation_xyzw,
      4,
      `${path}.rotation_xyzw`,
    ),
    scale: finiteTuple<[number, number, number]>(
      record.scale,
      3,
      `${path}.scale`,
    ),
  };
};

const validateCamera = (value: unknown, path: string): ManifestCamera => {
  const record = requiredRecord(value, path);
  const id = requiredString(record.id, `${path}.id`);
  const sourceName = requiredString(record.source_name, `${path}.source_name`);
  const source = requiredRecord(record.source, `${path}.source`);
  const perspective = requiredRecord(
    record.gltf_perspective,
    `${path}.gltf_perspective`,
  );
  const aspectRatio = finiteNumber(
    perspective.aspectRatio,
    `${path}.gltf_perspective.aspectRatio`,
  );
  const yfov = finiteNumber(perspective.yfov, `${path}.gltf_perspective.yfov`);
  const zfar = finiteNumber(perspective.zfar, `${path}.gltf_perspective.zfar`);
  const znear = finiteNumber(
    perspective.znear,
    `${path}.gltf_perspective.znear`,
  );
  if (!(aspectRatio > 0))
    fail(`${path}.gltf_perspective.aspectRatio`, 'must be greater than zero');
  if (!(yfov > 0 && yfov < Math.PI))
    fail(`${path}.gltf_perspective.yfov`, 'must be between zero and PI');
  if (!(znear > 0))
    fail(`${path}.gltf_perspective.znear`, 'must be greater than zero');
  if (!(zfar > znear))
    fail(`${path}.gltf_perspective.zfar`, 'must be greater than znear');
  const aspectReference = finiteNumber(
    record.aspect_reference,
    `${path}.aspect_reference`,
  );
  if (!(aspectReference > 0))
    fail(`${path}.aspect_reference`, 'must be greater than zero');
  const resolution = finiteTuple<[number, number]>(
    record.resolution_reference,
    2,
    `${path}.resolution_reference`,
  );
  resolution.forEach((dimension, index) => {
    if (!(Number.isInteger(dimension) && dimension > 0))
      fail(
        `${path}.resolution_reference[${index}]`,
        'must be a positive integer',
      );
  });
  return {
    id,
    source_name: sourceName,
    source,
    gltf_perspective: { aspectRatio, yfov, zfar, znear },
    gltf_node_world_matrix_column_major: finiteArray(
      record.gltf_node_world_matrix_column_major,
      16,
      `${path}.gltf_node_world_matrix_column_major`,
    ),
    aspect_reference: aspectReference,
    resolution_reference: resolution,
    framing_policy: requiredString(
      record.framing_policy,
      `${path}.framing_policy`,
    ),
  };
};

export function validateManifest(input: unknown): Manifest {
  const value = requiredRecord(input, '$');
  if (value.schema_version !== '1.0.0')
    fail('$.schema_version', 'expected supported version "1.0.0"');
  const assetId = requiredString(value.asset_id, '$.asset_id');
  const nodesValue = value.nodes;
  if (!Array.isArray(nodesValue) || nodesValue.length === 0)
    fail('$.nodes', 'expected a non-empty array');
  const nodeIds: string[] = [];
  const nodeRecords: ManifestNode[] = [];
  nodesValue.forEach((entry, index) => {
    const path = `$.nodes[${index}]`;
    const record = requiredRecord(entry, path);
    const id = requiredString(record.id, `${path}.id`);
    nodeIds.push(id);
    const parent =
      record.parent === null
        ? null
        : requiredString(record.parent, `${path}.parent`);
    const transform = validateTransform(record.transform, `${path}.transform`);
    if (transform.parent !== parent)
      fail(
        `${path}.transform.parent`,
        `must match node parent ${JSON.stringify(parent)}`,
      );
    const materials = record.material_slots;
    if (!Array.isArray(materials))
      fail(`${path}.material_slots`, 'expected an array');
    const materialSlots = materials.map((entry, materialIndex) =>
      requiredString(entry, `${path}.material_slots[${materialIndex}]`),
    );
    const mesh =
      record.mesh_resource_id === null
        ? null
        : requiredString(record.mesh_resource_id, `${path}.mesh_resource_id`);
    const worldMatrix =
      record.world_matrix_column_major === undefined
        ? undefined
        : finiteArray(
            record.world_matrix_column_major,
            16,
            `${path}.world_matrix_column_major`,
          );
    let pivot: ManifestNode['pivot'];
    if (record.pivot !== undefined) {
      const pivotRecord = requiredRecord(record.pivot, `${path}.pivot`);
      pivot = {
        local: finiteList(pivotRecord.local, `${path}.pivot.local`),
        world: finiteList(pivotRecord.world, `${path}.pivot.world`),
        ...(pivotRecord.definition === undefined
          ? {}
          : {
              definition: requiredString(
                pivotRecord.definition,
                `${path}.pivot.definition`,
              ),
            }),
      };
    }
    let bounds: ManifestNode['bounds'];
    if (record.bounds !== undefined) {
      const boundsRecord = requiredRecord(record.bounds, `${path}.bounds`);
      let local: { min: number[]; max: number[] } | null = null;
      if (boundsRecord.local !== null) {
        const localRecord = requiredRecord(
          boundsRecord.local,
          `${path}.bounds.local`,
        );
        local = {
          min: finiteTuple(localRecord.min, 3, `${path}.bounds.local.min`),
          max: finiteTuple(localRecord.max, 3, `${path}.bounds.local.max`),
        };
      } else if (mesh !== null)
        fail(`${path}.bounds.local`, 'mesh nodes require local bounds');
      let world: { min: number[]; max: number[] } | null | undefined;
      if (boundsRecord.world !== undefined && boundsRecord.world !== null) {
        const worldRecord = requiredRecord(
          boundsRecord.world,
          `${path}.bounds.world`,
        );
        world = {
          min: finiteTuple(worldRecord.min, 3, `${path}.bounds.world.min`),
          max: finiteTuple(worldRecord.max, 3, `${path}.bounds.world.max`),
        };
      } else {
        world = boundsRecord.world;
      }
      bounds = { local, ...(world === undefined ? {} : { world }) };
    }
    if (mesh !== null && (!bounds || bounds.local === null))
      fail(`${path}.bounds.local`, 'mesh nodes require local bounds');
    const sourceName =
      record.source_name === undefined || record.source_name === null
        ? record.source_name
        : requiredString(record.source_name, `${path}.source_name`);
    nodeRecords.push({
      id,
      name: requiredString(record.name, `${path}.name`),
      parent,
      role: requiredString(record.role, `${path}.role`),
      source_name: sourceName,
      extras: requiredRecord(record.extras, `${path}.extras`),
      transform,
      world_matrix_column_major: worldMatrix,
      pivot,
      bounds,
      mesh_resource_id: mesh,
      material_slots: materialSlots,
    });
  });
  uniqueIds(nodeIds, '$.nodes.id');
  const nodeIdSet = new Set(nodeIds);
  const nodeById = new Map(nodeRecords.map((node) => [node.id, node]));
  nodeRecords.forEach((node, index) => {
    if (node.parent !== null && !nodeIdSet.has(node.parent))
      fail(
        `$.nodes[${index}].parent`,
        `missing node ${JSON.stringify(node.parent)}`,
      );
    const seen = new Set<string>();
    let cursor: string | null = node.id;
    while (cursor !== null) {
      if (seen.has(cursor))
        fail(
          `$.nodes[${index}].parent`,
          `cycle detected through ${JSON.stringify(cursor)}`,
        );
      seen.add(cursor);
      cursor = nodeById.get(cursor)?.parent ?? null;
    }
  });

  const resources = requiredRecord(value.resources, '$.resources');
  const meshValues = resources.meshes;
  const materialValues = resources.materials;
  const textureValues = resources.textures;
  if (!Array.isArray(meshValues))
    fail('$.resources.meshes', 'expected an array');
  if (!Array.isArray(materialValues))
    fail('$.resources.materials', 'expected an array');
  if (!Array.isArray(textureValues))
    fail('$.resources.textures', 'expected an array');
  const materials: ResourceMaterial[] = [];
  materialValues.forEach((entry, index) => {
    const path = `$.resources.materials[${index}]`;
    const record = requiredRecord(entry, path);
    const optionalRecord = (
      key: string,
    ): Record<string, unknown> | undefined =>
      record[key] === undefined
        ? undefined
        : requiredRecord(record[key], `${path}.${key}`);
    const alphaMode =
      record.alpha_mode === undefined
        ? undefined
        : requiredString(record.alpha_mode, `${path}.alpha_mode`);
    const doubleSided =
      record.double_sided === undefined ? undefined : record.double_sided;
    if (doubleSided !== undefined && typeof doubleSided !== 'boolean')
      fail(`${path}.double_sided`, 'expected boolean');
    materials.push({
      id: requiredString(record.id, `${path}.id`),
      name: requiredString(record.name, `${path}.name`),
      gltf_material_index: finiteNumber(
        record.gltf_material_index,
        `${path}.gltf_material_index`,
      ),
      pbr_metallic_roughness: optionalRecord('pbr_metallic_roughness'),
      extensions: optionalRecord('extensions'),
      alpha_mode: alphaMode,
      double_sided: doubleSided,
      source_constant_parameters: optionalRecord('source_constant_parameters'),
    });
  });
  uniqueIds(
    materials.map((entry) => entry.id),
    '$.resources.materials.id',
  );
  const materialIds = new Set(materials.map((entry) => entry.id));
  const meshes: ResourceMesh[] = [];
  meshValues.forEach((entry, index) => {
    const path = `$.resources.meshes[${index}]`;
    const record = requiredRecord(entry, path);
    const slots = record.primitive_material_slots;
    if (!Array.isArray(slots))
      fail(`${path}.primitive_material_slots`, 'expected an array');
    const slotIds = slots.map((slot, slotIndex) =>
      requiredString(slot, `${path}.primitive_material_slots[${slotIndex}]`),
    );
    slotIds.forEach((id, slotIndex) => {
      if (!materialIds.has(id))
        fail(
          `${path}.primitive_material_slots[${slotIndex}]`,
          `missing material ${JSON.stringify(id)}`,
        );
    });
    const nodeRefs = record.node_ids;
    if (!Array.isArray(nodeRefs)) fail(`${path}.node_ids`, 'expected an array');
    const nodeIdsForMesh = nodeRefs.map((id, nodeIndex) =>
      requiredString(id, `${path}.node_ids[${nodeIndex}]`),
    );
    nodeIdsForMesh.forEach((id, nodeIndex) => {
      if (!nodeIdSet.has(id))
        fail(
          `${path}.node_ids[${nodeIndex}]`,
          `missing node ${JSON.stringify(id)}`,
        );
    });
    const layoutValue = record.primitive_layout;
    if (!Array.isArray(layoutValue))
      fail(`${path}.primitive_layout`, 'expected an array');
    const primitiveLayout = layoutValue.map((layout, layoutIndex) => {
      const layoutPath = `${path}.primitive_layout[${layoutIndex}]`;
      const item = requiredRecord(layout, layoutPath);
      const attributes = requiredRecord(
        item.attributes,
        `${layoutPath}.attributes`,
      );
      Object.entries(attributes).forEach(([key, attr]) =>
        finiteNumber(attr, `${layoutPath}.attributes.${key}`),
      );
      const materialSlot = finiteNumber(
        item.material_slot,
        `${layoutPath}.material_slot`,
      );
      if (
        !Number.isInteger(materialSlot) ||
        materialSlot < 0 ||
        materialSlot >= slotIds.length
      )
        fail(
          `${layoutPath}.material_slot`,
          `must reference primitive_material_slots[0..${slotIds.length - 1}]`,
        );
      return {
        attributes: attributes as Record<string, number>,
        material_slot: materialSlot,
        triangles: finiteNumber(item.triangles, `${layoutPath}.triangles`),
      };
    });
    const bounds = requiredRecord(record.bounds_local, `${path}.bounds_local`);
    meshes.push({
      id: requiredString(record.id, `${path}.id`),
      name: requiredString(record.name, `${path}.name`),
      gltf_mesh_index: finiteNumber(
        record.gltf_mesh_index,
        `${path}.gltf_mesh_index`,
      ),
      triangles: finiteNumber(record.triangles, `${path}.triangles`),
      vertex_records_across_primitives: finiteNumber(
        record.vertex_records_across_primitives,
        `${path}.vertex_records_across_primitives`,
      ),
      primitive_material_slots: slotIds,
      primitive_layout: primitiveLayout,
      node_ids: nodeIdsForMesh,
      bounds_local: {
        min: finiteArray(bounds.min, 3, `${path}.bounds_local.min`),
        max: finiteArray(bounds.max, 3, `${path}.bounds_local.max`),
      },
    });
  });
  uniqueIds(
    meshes.map((entry) => entry.id),
    '$.resources.meshes.id',
  );
  const meshIds = new Set(meshes.map((entry) => entry.id));
  const textures: ResourceTexture[] = [];
  textureValues.forEach((entry, index) => {
    const path = `$.resources.textures[${index}]`;
    const record = requiredRecord(entry, path);
    if (typeof record.embedded !== 'boolean')
      fail(`${path}.embedded`, 'expected boolean');
    textures.push({
      id: requiredString(record.id, `${path}.id`),
      gltf_texture_index: finiteNumber(
        record.gltf_texture_index,
        `${path}.gltf_texture_index`,
      ),
      gltf_image_index: finiteNumber(
        record.gltf_image_index,
        `${path}.gltf_image_index`,
      ),
      image_name: requiredString(record.image_name, `${path}.image_name`),
      mime_type: requiredString(record.mime_type, `${path}.mime_type`),
      embedded: record.embedded,
      bytes: finiteNumber(record.bytes, `${path}.bytes`),
      width: finiteNumber(record.width, `${path}.width`),
      height: finiteNumber(record.height, `${path}.height`),
      color_space: requiredString(record.color_space, `${path}.color_space`),
      purpose: requiredString(record.purpose, `${path}.purpose`),
      sha256: requiredString(record.sha256, `${path}.sha256`),
      sampler:
        record.sampler === undefined
          ? undefined
          : requiredRecord(record.sampler, `${path}.sampler`),
      bake_verdict:
        record.bake_verdict === undefined
          ? undefined
          : requiredRecord(record.bake_verdict, `${path}.bake_verdict`),
    });
  });
  uniqueIds(
    textures.map((entry) => entry.id),
    '$.resources.textures.id',
  );
  nodeRecords.forEach((node, index) => {
    if (node.mesh_resource_id !== null && !meshIds.has(node.mesh_resource_id))
      fail(
        `$.nodes[${index}].mesh_resource_id`,
        `missing mesh ${JSON.stringify(node.mesh_resource_id)}`,
      );
    if (node.mesh_resource_id !== null) {
      const resource = meshes.find((mesh) => mesh.id === node.mesh_resource_id);
      if (resource && !resource.node_ids.includes(node.id))
        fail(
          `$.nodes[${index}].mesh_resource_id`,
          `mesh ${JSON.stringify(node.mesh_resource_id)} does not list node ${JSON.stringify(node.id)}`,
        );
    }
    node.material_slots.forEach((id, materialIndex) => {
      if (!materialIds.has(id))
        fail(
          `$.nodes[${index}].material_slots[${materialIndex}]`,
          `missing material ${JSON.stringify(id)}`,
        );
    });
  });

  const panelValues = value.panels;
  if (!Array.isArray(panelValues) || panelValues.length === 0)
    fail('$.panels', 'expected a non-empty array');
  if (panelValues.length !== 51)
    fail(
      '$.panels',
      `expected exactly 51 panels, received ${panelValues.length}`,
    );
  const panels: ManifestPanel[] = [];
  panelValues.forEach((entry, index) => {
    const path = `$.panels[${index}]`;
    const record = requiredRecord(entry, path);
    const id = requiredString(record.id, `${path}.id`);
    if (!nodeIdSet.has(id))
      fail(`${path}.id`, `missing panel parent node ${JSON.stringify(id)}`);
    if (nodeById.get(id)?.role !== 'panel_parent')
      fail(
        `${path}.id`,
        `node ${JSON.stringify(id)} must have role panel_parent`,
      );
    const children = requiredRecord(record.children, `${path}.children`);
    const childIds = {
      module: requiredString(children.module, `${path}.children.module`),
      support: requiredString(children.support, `${path}.children.support`),
    };
    const states = requiredRecord(record.states, `${path}.states`);
    const mixed = requiredRecord(
      states.MISTO_PREFIXO,
      `${path}.states.MISTO_PREFIXO`,
    );
    const refinedValue = states.REFINADOS_08;
    const refined =
      refinedValue === null
        ? null
        : requiredRecord(refinedValue, `${path}.states.REFINADOS_08`);
    const sourceRefinedValue = record.source_record_refined;
    const sourceRecordRefined =
      sourceRefinedValue === null
        ? null
        : requiredRecord(sourceRefinedValue, `${path}.source_record_refined`);
    if (index < 8 && refined === null)
      fail(
        `${path}.states.REFINADOS_08`,
        'the first eight panels require refined transforms',
      );
    if (index >= 8 && refined !== null)
      fail(
        `${path}.states.REFINADOS_08`,
        'only the first eight panels may define refined transforms',
      );
    if (index < 8 && sourceRecordRefined === null)
      fail(
        `${path}.source_record_refined`,
        'the first eight panels require refined source records',
      );
    if (index >= 8 && sourceRecordRefined !== null)
      fail(
        `${path}.source_record_refined`,
        'only the first eight panels may define refined source records',
      );
    const state = (
      raw: Record<string, unknown>,
      statePath: string,
    ): ManifestPanelState => ({
      source_module_id: requiredString(
        raw.source_module_id,
        `${statePath}.source_module_id`,
      ),
      source_position_id: requiredString(
        raw.source_position_id,
        `${statePath}.source_position_id`,
      ),
      transform: validateTransform(raw.transform, `${statePath}.transform`),
    });
    const childTransforms = requiredRecord(
      record.child_transforms,
      `${path}.child_transforms`,
    );
    const moduleTransform = validateTransform(
      childTransforms.module,
      `${path}.child_transforms.module`,
    );
    const supportTransform = validateTransform(
      childTransforms.support,
      `${path}.child_transforms.support`,
    );
    if (moduleTransform.parent !== id)
      fail(
        `${path}.child_transforms.module.parent`,
        `must be ${JSON.stringify(id)}`,
      );
    if (supportTransform.parent !== id)
      fail(
        `${path}.child_transforms.support.parent`,
        `must be ${JSON.stringify(id)}`,
      );
    for (const [label, childId] of Object.entries(childIds)) {
      const child = nodeById.get(childId);
      if (!child)
        fail(
          `${path}.children.${label}`,
          `missing node ${JSON.stringify(childId)}`,
        );
      if (child?.parent !== id)
        fail(
          `${path}.children.${label}`,
          `node parent must be ${JSON.stringify(id)}`,
        );
      if (label === 'module' && child?.role !== 'solar_module')
        fail(
          `${path}.children.module`,
          `node ${JSON.stringify(childId)} must have role solar_module`,
        );
      if (label === 'support' && child?.role !== 'solar_support')
        fail(
          `${path}.children.support`,
          `node ${JSON.stringify(childId)} must have role solar_support`,
        );
      const childTransform =
        label === 'module' ? moduleTransform : supportTransform;
      if (
        child &&
        child.transform.matrix_column_major.some(
          (item, matrixIndex) =>
            item !== childTransform.matrix_column_major[matrixIndex],
        )
      )
        fail(
          `${path}.child_transforms.${label}`,
          `must match node transform ${JSON.stringify(childId)}`,
        );
    }
    const panelParentId = nodeById.get(id)?.parent ?? null;
    const mixedState = state(mixed, `${path}.states.MISTO_PREFIXO`);
    if (mixedState.transform.parent !== panelParentId)
      fail(
        `${path}.states.MISTO_PREFIXO.transform.parent`,
        `must match panel parent ${JSON.stringify(panelParentId)}`,
      );
    const refinedState =
      refined === null ? null : state(refined, `${path}.states.REFINADOS_08`);
    if (
      refinedState !== null &&
      refinedState.transform.parent !== panelParentId
    )
      fail(
        `${path}.states.REFINADOS_08.transform.parent`,
        `must match panel parent ${JSON.stringify(panelParentId)}`,
      );
    panels.push({
      id,
      children: childIds,
      roof_group: requiredString(record.roof_group, `${path}.roof_group`),
      mixed_local_uv_m: finiteArray(
        record.mixed_local_uv_m,
        2,
        `${path}.mixed_local_uv_m`,
      ) as [number, number],
      source_record_mixed: requiredRecord(
        record.source_record_mixed,
        `${path}.source_record_mixed`,
      ),
      source_record_refined: sourceRecordRefined,
      states: { MISTO_PREFIXO: mixedState, REFINADOS_08: refinedState },
      child_transforms: { module: moduleTransform, support: supportTransform },
    });
  });
  uniqueIds(
    panels.map((entry) => entry.id),
    '$.panels.id',
  );
  const panelIds = new Set(panels.map((entry) => entry.id));
  const occupancy = value.occupancy_order;
  if (!Array.isArray(occupancy) || occupancy.length !== panels.length)
    fail('$.occupancy_order', `expected exactly ${panels.length} panel ids`);
  const occupancyIds = occupancy.map((id, index) =>
    requiredString(id, `$.occupancy_order[${index}]`),
  );
  uniqueIds(occupancyIds, '$.occupancy_order');
  occupancyIds.forEach((id, index) => {
    if (!panelIds.has(id))
      fail(
        `$.occupancy_order[${index}]`,
        `missing panel ${JSON.stringify(id)}`,
      );
  });
  const declaredStates = requiredRecord(value.states, '$.states');
  const baseState = requiredRecord(
    declaredStates.CASA_BASE,
    '$.states.CASA_BASE',
  );
  const refinedDeclared = requiredRecord(
    declaredStates.REFINADOS_08,
    '$.states.REFINADOS_08',
  );
  const mixedDeclared = requiredRecord(
    declaredStates.MISTO_PREFIXO,
    '$.states.MISTO_PREFIXO',
  );
  const optionalTransformKey = (
    record: Record<string, unknown>,
    path: string,
  ): string | undefined =>
    record.transform_key === undefined
      ? undefined
      : requiredString(record.transform_key, `${path}.transform_key`);
  const refinedTransformKey = optionalTransformKey(
    refinedDeclared,
    '$.states.REFINADOS_08',
  );
  const mixedTransformKey = optionalTransformKey(
    mixedDeclared,
    '$.states.MISTO_PREFIXO',
  );
  const baseIds = baseState.active_panel_ids;
  if (
    !Array.isArray(baseIds) ||
    baseIds.length !== 0 ||
    finiteNumber(baseState.count, '$.states.CASA_BASE.count') !== 0
  )
    fail('$.states.CASA_BASE', 'must declare count 0 and no active panels');
  const refinedIds = Array.isArray(refinedDeclared.active_panel_ids)
    ? refinedDeclared.active_panel_ids.map((id, index) =>
        requiredString(id, `$.states.REFINADOS_08.active_panel_ids[${index}]`),
      )
    : fail('$.states.REFINADOS_08.active_panel_ids', 'expected an array');
  if (
    finiteNumber(refinedDeclared.count, '$.states.REFINADOS_08.count') !== 8 ||
    refinedIds.length !== 8
  )
    fail('$.states.REFINADOS_08', 'must declare exactly eight active panels');
  const expectedRefinedIds = panels.slice(0, 8).map((panel) => panel.id);
  if (refinedIds.some((id, index) => id !== expectedRefinedIds[index]))
    fail(
      '$.states.REFINADOS_08.active_panel_ids',
      'must preserve the first eight panel IDs',
    );
  const nMin = finiteNumber(
    mixedDeclared.N_min,
    '$.states.MISTO_PREFIXO.N_min',
  );
  const nMax = finiteNumber(
    mixedDeclared.N_max,
    '$.states.MISTO_PREFIXO.N_max',
  );
  if (nMin !== 0 || nMax !== panels.length)
    fail(
      '$.states.MISTO_PREFIXO',
      `must declare N_min=0 and N_max=${panels.length}`,
    );
  const states: ManifestStates = {
    ...declaredStates,
    CASA_BASE: { count: 0, active_panel_ids: [] },
    REFINADOS_08: {
      ...refinedDeclared,
      count: 8,
      active_panel_ids: refinedIds,
      ...(refinedTransformKey === undefined
        ? {}
        : { transform_key: refinedTransformKey }),
    },
    MISTO_PREFIXO: {
      ...mixedDeclared,
      N_min: nMin,
      N_max: nMax,
      ...(mixedTransformKey === undefined
        ? {}
        : { transform_key: mixedTransformKey }),
    },
  };

  const camerasValue = value.cameras;
  if (!Array.isArray(camerasValue) || camerasValue.length === 0)
    fail('$.cameras', 'expected a non-empty array');
  const cameras = camerasValue.map((entry, index) =>
    validateCamera(entry, `$.cameras[${index}]`),
  );
  uniqueIds(
    cameras.map((entry) => entry.id),
    '$.cameras.id',
  );
  cameras.forEach((camera, index) => {
    const node = nodeById.get(camera.id);
    if (!node)
      fail(
        `$.cameras[${index}].id`,
        `missing camera node ${JSON.stringify(camera.id)}`,
      );
    if (node?.role !== 'camera_reference')
      fail(`$.cameras[${index}].id`, 'must reference a camera_reference node');
  });

  const requiredTopLevelObjects = [
    'source',
    'tools',
    'units',
    'glb',
    'coordinate_system',
    'occupancy_order_definition',
    'states',
    'counts',
    'camera_reference_identification',
    'physical_panel_dimensions_m',
    'hypotheses',
    'source_to_export',
    'validation',
  ];
  requiredTopLevelObjects.forEach((key) =>
    requiredRecord(value[key], `$.${key}`),
  );
  const exclusions = unknownList(
    value.exclusions_and_areas,
    '$.exclusions_and_areas',
  );
  const limitations = unknownList(value.limitations, '$.limitations');
  const technicalAdaptations = unknownList(
    value.technical_adaptations,
    '$.technical_adaptations',
  );
  const sharingNote =
    resources.sharing_note === undefined
      ? undefined
      : requiredString(resources.sharing_note, '$.resources.sharing_note');
  if (
    typeof value.occupancy_is_illustrative_not_capacity_power_generation !==
    'boolean'
  )
    fail(
      '$.occupancy_is_illustrative_not_capacity_power_generation',
      'expected boolean',
    );
  requiredString(value.disclaimer, '$.disclaimer');

  return {
    ...value,
    schema_version: requiredString(value.schema_version, '$.schema_version'),
    asset_id: assetId,
    source: requiredRecord(value.source, '$.source'),
    tools: requiredRecord(value.tools, '$.tools'),
    units: requiredRecord(value.units, '$.units'),
    glb: requiredRecord(value.glb, '$.glb'),
    coordinate_system: requiredRecord(
      value.coordinate_system,
      '$.coordinate_system',
    ),
    nodes: nodeRecords,
    panels,
    resources: {
      ...resources,
      meshes,
      materials,
      textures,
      ...(sharingNote === undefined ? {} : { sharing_note: sharingNote }),
    },
    occupancy_order: occupancyIds,
    states,
    cameras,
    camera_reference_identification: requiredRecord(
      value.camera_reference_identification,
      '$.camera_reference_identification',
    ),
    physical_panel_dimensions_m: requiredRecord(
      value.physical_panel_dimensions_m,
      '$.physical_panel_dimensions_m',
    ),
    hypotheses: requiredRecord(value.hypotheses, '$.hypotheses'),
    exclusions_and_areas: exclusions,
    limitations,
    occupancy_is_illustrative_not_capacity_power_generation:
      value.occupancy_is_illustrative_not_capacity_power_generation,
    disclaimer: requiredString(value.disclaimer, '$.disclaimer'),
    source_to_export: requiredRecord(
      value.source_to_export,
      '$.source_to_export',
    ),
    validation: requiredRecord(value.validation, '$.validation'),
    technical_adaptations: technicalAdaptations,
  };
}

const objectAssetId = (object: THREE.Object3D | null): string | null => {
  if (object === null) return null;
  const userData = object.userData as Record<string, unknown> | undefined;
  if (typeof userData?.asset_id === 'string') return userData.asset_id;
  const extras = userData?.extras;
  return isRecord(extras) && typeof extras.asset_id === 'string'
    ? extras.asset_id
    : null;
};

export function resolveAsset(
  root: THREE.Object3D,
  manifestInput: Manifest,
): ResolvedAsset {
  if (!(root instanceof THREE.Object3D))
    throw new TypeError('resolveAsset: root must be a THREE.Object3D');
  const manifest = validateManifest(manifestInput);
  const objects = new Map<string, THREE.Object3D>();
  root.traverse((object) => {
    const id = objectAssetId(object);
    if (id === null) return;
    if (objects.has(id))
      throw new Error(
        `Asset node ${JSON.stringify(id)} appears more than once in loaded scene`,
      );
    objects.set(id, object);
  });
  const manifestIds = new Set(manifest.nodes.map((node) => node.id));
  objects.forEach((_object, id) => {
    if (!manifestIds.has(id))
      throw new Error(
        `Loaded asset contains unexpected asset_id ${JSON.stringify(id)}`,
      );
  });
  const nodes = new Map<string, THREE.Object3D>();
  manifest.nodes.forEach((node) => {
    const object = objects.get(node.id);
    if (!object)
      throw new Error(
        `Loaded asset is missing node ${JSON.stringify(node.id)} (manifest nodes[${manifest.nodes.indexOf(node)}])`,
      );
    const actualParentId = objectAssetId(object.parent);
    if (node.parent !== null && actualParentId !== node.parent)
      throw new Error(
        `Loaded node ${JSON.stringify(node.id)} has parent ${JSON.stringify(actualParentId)}, expected ${JSON.stringify(node.parent)}`,
      );
    nodes.set(node.id, object);
  });
  const panels = new Map<string, ResolvedPanel>();
  manifest.panels.forEach((panel) => {
    const parent = nodes.get(panel.id);
    const moduleObject = nodes.get(panel.children.module);
    const support = nodes.get(panel.children.support);
    if (!parent || !moduleObject || !support)
      throw new Error(
        `Panel ${JSON.stringify(panel.id)} is missing immutable module/support nodes`,
      );
    if (
      objectAssetId(moduleObject.parent) !== panel.id ||
      objectAssetId(support.parent) !== panel.id
    )
      throw new Error(
        `Panel ${JSON.stringify(panel.id)} child hierarchy does not match manifest`,
      );
    setTransform(moduleObject, panel.child_transforms.module);
    setTransform(support, panel.child_transforms.support);
    panels.set(panel.id, { parent, module: moduleObject, support });
  });
  return { manifest, root, nodes, panels, state: { mode: 'CASA_BASE' } };
}

const stateCopy = (state: SolarState): SolarState => {
  if (!isRecord(state) || typeof state.mode !== 'string')
    throw new TypeError('Solar state must be an object with a supported mode');
  switch (state.mode) {
    case 'CASA_BASE':
      return { mode: 'CASA_BASE' };
    case 'REFINADOS_08':
      return { mode: 'REFINADOS_08' };
    case 'MISTO_PREFIXO':
      return { mode: 'MISTO_PREFIXO', n: state.n };
    default: {
      const neverState: never = state;
      throw new TypeError(
        `Unsupported solar state ${JSON.stringify(neverState)}`,
      );
    }
  }
};

const activePanelIdsForState = (
  asset: ResolvedAsset,
  state: SolarState,
): string[] => {
  if (state.mode === 'CASA_BASE') return [];
  if (state.mode === 'REFINADOS_08')
    return asset.manifest.states.REFINADOS_08.active_panel_ids.slice();
  if (
    !Number.isInteger(state.n) ||
    state.n < 0 ||
    state.n > asset.manifest.panels.length
  )
    throw new RangeError(
      `MISTO_PREFIXO.n must be an integer from 0 through ${asset.manifest.panels.length}; received ${String(state.n)}`,
    );
  return asset.manifest.occupancy_order.slice(0, state.n);
};

function setTransform(
  object: THREE.Object3D,
  transform: TransformRecord,
): void {
  object.matrixAutoUpdate = false;
  object.matrix.fromArray(transform.matrix_column_major);
  object.matrixWorldNeedsUpdate = true;
}

export function applySolarState(asset: ResolvedAsset, state: SolarState): void {
  const normalized = stateCopy(state);
  const activeIds = new Set(activePanelIdsForState(asset, normalized));
  asset.manifest.panels.forEach((panel) => {
    const resolved = asset.panels.get(panel.id);
    if (!resolved)
      throw new Error(
        `Resolved asset is missing panel ${JSON.stringify(panel.id)}`,
      );
    let transform = panel.states.MISTO_PREFIXO.transform;
    if (
      normalized.mode === 'REFINADOS_08' &&
      panel.states.REFINADOS_08 !== null
    )
      transform = panel.states.REFINADOS_08.transform;
    if (!transform)
      throw new Error(
        `Manifest is missing base transform for panel ${JSON.stringify(panel.id)}`,
      );
    setTransform(resolved.parent, transform);
    const visible = activeIds.has(panel.id);
    resolved.parent.visible = visible;
    resolved.module.visible = visible;
    resolved.support.visible = visible;
  });
  asset.root.updateMatrixWorld(true);
  asset.state = normalized;
}

export function inspectSolarState(asset: ResolvedAsset): SolarDiagnostics {
  asset.root.updateMatrixWorld(true);
  const activePanelIds = activePanelIdsForState(asset, asset.state);
  const visiblePanelIds: string[] = [];
  const visibleModuleIds: string[] = [];
  const visibleSupportIds: string[] = [];
  const hiddenPanelIds: string[] = [];
  const panelMatrices: Record<string, number[]> = {};
  const panelWorldPositions: Record<string, [number, number, number]> = {};
  const panelLocalMatrices: Record<string, number[]> = {};
  const panelWorldMatrices: Record<string, number[]> = {};
  const childLocalMatrices: Record<
    string,
    { module: number[]; support: number[] }
  > = {};
  const childWorldMatrices: Record<
    string,
    { module: number[]; support: number[] }
  > = {};
  asset.manifest.panels.forEach((panel) => {
    const resolved = asset.panels.get(panel.id);
    if (!resolved) return;
    if (resolved.parent.visible) visiblePanelIds.push(panel.id);
    else hiddenPanelIds.push(panel.id);
    if (resolved.module.visible) visibleModuleIds.push(panel.children.module);
    if (resolved.support.visible)
      visibleSupportIds.push(panel.children.support);
    panelMatrices[panel.id] = resolved.parent.matrix.toArray();
    panelLocalMatrices[panel.id] = resolved.parent.matrix.toArray();
    panelWorldMatrices[panel.id] = resolved.parent.matrixWorld.toArray();
    const world = resolved.parent.matrixWorld.elements;
    panelWorldPositions[panel.id] = [world[12], world[13], world[14]];
    childLocalMatrices[panel.id] = {
      module: resolved.module.matrix.toArray(),
      support: resolved.support.matrix.toArray(),
    };
    childWorldMatrices[panel.id] = {
      module: resolved.module.matrixWorld.toArray(),
      support: resolved.support.matrixWorld.toArray(),
    };
  });
  return {
    state: stateCopy(asset.state),
    mode: asset.state.mode,
    n: asset.state.mode === 'MISTO_PREFIXO' ? asset.state.n : null,
    activeCount: activePanelIds.length,
    activePanelIds,
    visiblePanelIds,
    visibleModuleIds,
    visibleSupportIds,
    hiddenPanelIds,
    panelMatrices,
    panelWorldPositions,
    panelLocalMatrices,
    panelWorldMatrices,
    childLocalMatrices,
    childWorldMatrices,
  };
}
