import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ManifestValidationError,
  validateManifest,
  type Manifest,
} from './solar';

const manifestUrl = new URL(
  '../../../public/assets/finished-v04/house.manifest.json',
  import.meta.url,
);
const sourceManifest = validateManifest(
  JSON.parse(readFileSync(fileURLToPath(manifestUrl), 'utf8')),
);

function copyManifest(): Manifest {
  return structuredClone(sourceManifest);
}

function expectPath(mutate: (manifest: Manifest) => void, path: string): void {
  const manifest = copyManifest();
  mutate(manifest);
  let thrown: unknown;
  try {
    validateManifest(manifest);
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(ManifestValidationError);
  expect(thrown).toMatchObject({ path });
}

describe('finished-v04 manifest validation contract', () => {
  it('retains semantic resources, unknown payloads, and environment nodes', () => {
    const manifest = copyManifest();
    manifest.resources.materials[0]!.pbr_metallic_roughness = {
      unknown_nested: ['kept'],
    };
    manifest.resources.unknown_payload = { arbitrary: true };
    const validated = validateManifest(manifest);
    expect(validated.resources.materials[0]!.pbr_metallic_roughness).toEqual({
      unknown_nested: ['kept'],
    });
    expect(validated.resources.unknown_payload).toEqual({ arbitrary: true });
    expect(validated.nodes).toHaveLength(210);
    expect(
      validated.nodes
        .filter((node) => node.role === 'environment_part')
        .map((node) => node.id)
        .sort(),
    ).toEqual(['ENV_PAVEMENTCONNECTIONS', 'ENV_SIDEWALK', 'ENV_STREET']);
    expect(validated.resources.meshes).toHaveLength(48);
    expect(validated.resources.materials).toHaveLength(3);
    expect(validated.resources.textures).toHaveLength(3);
  });

  it('rejects required top-level arrays and malformed material envelopes', () => {
    expectPath((manifest) => {
      Reflect.deleteProperty(manifest, 'limitations');
    }, '$.limitations');
    expectPath((manifest) => {
      Object.assign(manifest, { exclusions_and_areas: 42 });
    }, '$.exclusions_and_areas');
    expectPath((manifest) => {
      Object.assign(manifest, { technical_adaptations: null });
    }, '$.technical_adaptations');
    expectPath((manifest) => {
      Object.assign(manifest.resources.materials[0], { double_sided: 'false' });
    }, '$.resources.materials[0].double_sided');
    expectPath((manifest) => {
      Object.assign(manifest.resources.materials[0], { extensions: 'bad' });
    }, '$.resources.materials[0].extensions');
    expectPath((manifest) => {
      Object.assign(manifest.resources.materials[0], {
        pbr_metallic_roughness: null,
      });
    }, '$.resources.materials[0].pbr_metallic_roughness');
    expectPath((manifest) => {
      Object.assign(manifest.resources.materials[0], {
        source_constant_parameters: [],
      });
    }, '$.resources.materials[0].source_constant_parameters');
    expectPath((manifest) => {
      Object.assign(manifest.resources.materials[0], { alpha_mode: 3 });
    }, '$.resources.materials[0].alpha_mode');
    expectPath((manifest) => {
      Object.assign(manifest.resources, { sharing_note: 3 });
    }, '$.resources.sharing_note');
    const meshIndex = sourceManifest.nodes.findIndex(
      (node) => node.mesh_resource_id !== null,
    );
    expectPath((manifest) => {
      Reflect.deleteProperty(manifest.nodes[meshIndex], 'bounds');
    }, `$.nodes[${meshIndex}].bounds.local`);
    expectPath((manifest) => {
      manifest.nodes[meshIndex]!.bounds!.local = null;
    }, `$.nodes[${meshIndex}].bounds.local`);
  });

  it('rejects missing IDs, broken hierarchy references, and invalid transform matrices', () => {
    expectPath((manifest) => {
      Reflect.deleteProperty(manifest.nodes[0], 'id');
    }, '$.nodes[0].id');
    expectPath((manifest) => {
      manifest.nodes[0]!.parent = 'NOT_A_NODE';
      manifest.nodes[0]!.transform.parent = 'NOT_A_NODE';
    }, '$.nodes[0].parent');
    expectPath((manifest) => {
      manifest.nodes[0]!.transform.parent = 'NOT_A_NODE';
    }, '$.nodes[0].transform.parent');
    expectPath((manifest) => {
      Reflect.deleteProperty(manifest.panels[0]!.children, 'module');
    }, '$.panels[0].children.module');
    expectPath((manifest) => {
      manifest.panels[0]!.child_transforms.module.parent = 'WRONG_PARENT';
    }, '$.panels[0].child_transforms.module.parent');
    expectPath((manifest) => {
      manifest.panels[0]!.states.MISTO_PREFIXO.transform.matrix_column_major = [
        1, 2, 3,
      ];
    }, '$.panels[0].states.MISTO_PREFIXO.transform.matrix_column_major');
    expectPath((manifest) => {
      manifest.panels[0]!.child_transforms.support.matrix_column_major[0] =
        Number.NaN;
    }, '$.panels[0].child_transforms.support.matrix_column_major[0]');
  });

  it('rejects duplicate IDs, missing resources, camera references, and cycles', () => {
    expectPath((manifest) => {
      manifest.nodes[1]!.id = manifest.nodes[0]!.id;
    }, '$.nodes.id[1]');
    expectPath((manifest) => {
      manifest.nodes[0]!.mesh_resource_id = 'MESH_MISSING';
    }, '$.nodes[0].mesh_resource_id');
    expectPath((manifest) => {
      manifest.nodes[0]!.material_slots = ['MATERIAL_MISSING'];
    }, '$.nodes[0].material_slots[0]');
    expectPath((manifest) => {
      manifest.cameras[0]!.id = 'NOT_A_CAMERA';
    }, '$.cameras[0].id');
    expectPath((manifest) => {
      manifest.nodes[0]!.parent = manifest.nodes[1]!.id;
      manifest.nodes[0]!.transform.parent = manifest.nodes[1]!.id;
      manifest.nodes[1]!.parent = manifest.nodes[0]!.id;
      manifest.nodes[1]!.transform.parent = manifest.nodes[0]!.id;
    }, '$.nodes[0].parent');
  });

  it('enforces camera numeric invariants and exact state declarations', () => {
    for (const value of [0, Math.PI, -1]) {
      expectPath((manifest) => {
        manifest.cameras[0]!.gltf_perspective.yfov = value;
      }, '$.cameras[0].gltf_perspective.yfov');
    }
    expectPath((manifest) => {
      manifest.cameras[0]!.gltf_perspective.znear = 0;
    }, '$.cameras[0].gltf_perspective.znear');
    expectPath((manifest) => {
      manifest.cameras[0]!.gltf_perspective.zfar =
        manifest.cameras[0]!.gltf_perspective.znear;
    }, '$.cameras[0].gltf_perspective.zfar');
    expectPath((manifest) => {
      manifest.cameras[0]!.gltf_perspective.aspectRatio = 0;
    }, '$.cameras[0].gltf_perspective.aspectRatio');
    expectPath((manifest) => {
      manifest.states.CASA_BASE.active_panel_ids = ['PANEL_001'];
    }, '$.states.CASA_BASE');
    expectPath((manifest) => {
      manifest.states.REFINADOS_08.active_panel_ids = manifest.panels
        .slice(0, 7)
        .map((panel) => panel.id);
    }, '$.states.REFINADOS_08');
    expectPath((manifest) => {
      manifest.states.MISTO_PREFIXO.N_min = 1;
    }, '$.states.MISTO_PREFIXO');
  });
});
