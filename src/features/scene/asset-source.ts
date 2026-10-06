export const ASSET_KEYS = ['finished-v04'] as const;
export type AssetKey = (typeof ASSET_KEYS)[number];

export type AssetPipeline = 'baked-unlit';

export interface AssetDescriptor {
  readonly key: AssetKey;
  readonly glbUrl: string;
  readonly manifestUrl: string;
  readonly pipeline: AssetPipeline;
  readonly backgroundUrl: string;
  readonly backgroundYawRadians: number;
}

const FINISHED_V04: AssetDescriptor = Object.freeze({
  key: 'finished-v04',
  glbUrl: '/assets/finished-v04/house.glb',
  manifestUrl: '/assets/finished-v04/house.manifest.json',
  pipeline: 'baked-unlit',
  backgroundUrl: '/assets/finished-v04/sky-softened-2k.jpg',
  backgroundYawRadians: 0,
});

export const assetDescriptors: Readonly<Record<AssetKey, AssetDescriptor>> =
  Object.freeze({
    'finished-v04': FINISHED_V04,
  });

export class AssetSelectionError extends Error {
  readonly value: string;

  constructor(value: string) {
    super(
      `Unknown asset selection ${JSON.stringify(value)}; only finished-v04 is available.`,
    );
    this.name = 'AssetSelectionError';
    this.value = value;
  }
}

export function selectAssetKey(search: string | URLSearchParams): AssetKey {
  const params =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search;
  const selected = params.get('asset');
  if (selected === null) return 'finished-v04';
  if (selected === 'finished-v04') return selected;
  throw new AssetSelectionError(selected);
}

export function selectAssetSource(
  search: string | URLSearchParams,
): AssetDescriptor {
  return assetDescriptors[selectAssetKey(search)];
}
