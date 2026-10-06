import { describe, expect, it } from 'vitest';
import {
  AssetSelectionError,
  selectAssetKey,
  selectAssetSource,
} from './asset-source';

describe('finished-v04 asset source selection', () => {
  it('defaults to the finished-v04 consumer asset and preserves the first repeated query value', () => {
    expect(selectAssetKey('')).toBe('finished-v04');
    expect(
      selectAssetSource('?asset=finished-v04&asset=finished-v03').key,
    ).toBe('finished-v04');
  });

  it('rejects empty, historical, and unknown asset selections explicitly', () => {
    for (const selection of [
      '?asset=',
      '?asset=finished-v02',
      '?asset=finished-v03',
      '?asset=finished-v99',
      '?asset=house',
    ]) {
      expect(() => selectAssetKey(selection)).toThrow(AssetSelectionError);
      expect(() => selectAssetSource(selection)).toThrow(AssetSelectionError);
    }
  });
});
