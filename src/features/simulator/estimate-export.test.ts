import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCityBySlug } from '@/domain/cities/cities';
import { phoenix } from '@/domain/cities/phoenix';
import { createEstimateSnapshot } from './estimate-document';
import {
  downloadPreparedEstimate,
  EstimatePdfSession,
  EstimateShareSession,
  sharePreparedEstimate,
} from './estimate-export';

function registryCity(slug: string) {
  const city = getCityBySlug(slug);
  if (!city) throw new Error(`Missing registered test city: ${slug}`);
  return city;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const oldSnapshot = () => createEstimateSnapshot(phoenix, 90, 100);
const newSnapshot = () => createEstimateSnapshot(phoenix, 600, 100);
const pdf = (name: string) =>
  new File(['%PDF-1.7'], name, { type: 'application/pdf' });

describe('prepared estimate ownership', () => {
  afterEach(() => vi.useRealTimers());

  it('holds result readiness through both module loading and File generation', async () => {
    const moduleLoad = deferred<() => Promise<File>>();
    const generation = deferred<File>();
    const session = new EstimatePdfSession(() =>
      moduleLoad.promise.then((generate) => generate()),
    );
    session.update(oldSnapshot(), '90/100');
    const pending = session.prepare();
    expect(session.presentationReadyFor('90/100')).toBe(false);
    moduleLoad.resolve(() => generation.promise);
    await moduleLoad.promise;
    expect(session.fileFor('90/100')).toBeNull();
    expect(session.presentationReadyFor('90/100')).toBe(false);
    const file = pdf('ready.pdf');
    generation.resolve(file);
    expect(await pending).toBe(file);
    expect(session.presentationReadyFor('90/100')).toBe(true);
  });

  it('reveals a usable failed result and keeps it visible during an import retry', async () => {
    const firstImport = deferred<() => Promise<File>>();
    const retryImport = deferred<() => Promise<File>>();
    let first = true;
    const session = new EstimatePdfSession(() => {
      const moduleLoad = first ? firstImport : retryImport;
      first = false;
      return moduleLoad.promise.then((generate) => generate());
    });
    session.update(oldSnapshot(), '90/100');
    const pending = session.prepare();
    firstImport.reject(new Error('module unavailable'));
    await expect(pending).rejects.toThrow('module unavailable');
    expect(session.presentationReadyFor('90/100')).toBe(true);
    expect(session.fileFor('90/100')).toBeNull();
    const retry = session.prepare();
    expect(session.presentationReadyFor('90/100')).toBe(true);
    const file = pdf('retry.pdf');
    retryImport.resolve(async () => file);
    expect(await retry).toBe(file);
    expect(session.fileFor('90/100')).toBe(file);
    session.update(newSnapshot(), '600/100');
    expect(session.presentationReadyFor('600/100')).toBe(false);
  });

  it('releases stalled preparation for retry without accepting its late file', async () => {
    vi.useFakeTimers();
    const stalled = deferred<File>();
    const fresh = pdf('fresh.pdf');
    let attempts = 0;
    const session = new EstimatePdfSession(() =>
      ++attempts === 1 ? stalled.promise : Promise.resolve(fresh),
    );
    session.update(oldSnapshot(), '90/100');
    let outcome = 'pending';
    const first = session.prepare().then(
      () => {
        outcome = 'resolved';
      },
      () => {
        outcome = 'failed';
      },
    );
    await vi.advanceTimersByTimeAsync(19_999);
    expect(outcome).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    expect(outcome).toBe('failed');
    await first;
    expect(session.presentationReadyFor('90/100')).toBe(true);
    expect(await session.prepare()).toBe(fresh);
    stalled.resolve(pdf('obsolete.pdf'));
    await Promise.resolve();
    expect(session.fileFor('90/100')).toBe(fresh);
  });

  it('deduplicates preparation and returns the identical file for both actions', async () => {
    const work = deferred<File>();
    const generate = vi.fn(() => work.promise);
    const session = new EstimatePdfSession(generate);
    session.update(oldSnapshot(), '90/100');
    const first = session.prepare();
    const second = session.prepare();
    const file = pdf('current.pdf');
    work.resolve(file);
    expect(await first).toBe(file);
    expect(await second).toBe(file);
    expect(session.fileFor('90/100')).toBe(file);
    expect(await session.prepare()).toBe(file);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('never publishes an older completion over the new estimate', async () => {
    const oldWork = deferred<File>();
    const newWork = deferred<File>();
    const session = new EstimatePdfSession(
      vi
        .fn()
        .mockReturnValueOnce(oldWork.promise)
        .mockReturnValueOnce(newWork.promise),
    );
    session.update(oldSnapshot(), '90/100');
    const first = session.prepare();
    session.update(newSnapshot(), '600/100');
    const second = session.prepare();
    expect(session.presentationReadyFor('600/100')).toBe(false);
    const current = pdf('600.pdf');
    newWork.resolve(current);
    expect(await second).toBe(current);
    oldWork.resolve(pdf('90.pdf'));
    expect(await first).toBeNull();
    expect(session.fileFor('600/100')).toBe(current);
    expect(session.fileFor('90/100')).toBeNull();
    expect(session.presentationReadyFor('90/100')).toBe(false);
    expect(session.presentationReadyFor('600/100')).toBe(true);
  });

  it('invalidates on raw-input changes even when the accepted numeric snapshot is unchanged', async () => {
    const session = new EstimatePdfSession(async () => pdf('90.pdf'));
    session.update(oldSnapshot(), '90/100');
    await session.prepare();
    session.update(oldSnapshot(), 'invalid/100');
    expect(session.fileFor('90/100')).toBeNull();
    expect(session.presentationReadyFor('invalid/100')).toBe(false);
    expect(session.fileFor('invalid/100')).toBeNull();
  });

  it('invalidates when city assumptions change with the same input values', async () => {
    const session = new EstimatePdfSession(async () => pdf('old-city.pdf'));
    session.update(oldSnapshot(), '90/100');
    await session.prepare();
    const changedCity = createEstimateSnapshot(
      { ...phoenix, city: 'Tucson', utilityRatePerKwh: 0.2 },
      90,
      100,
    );
    session.update(changedCity, '90/100');
    expect(session.fileFor('90/100')).toBeNull();
  });

  it('discards failed obsolete work and permits retry of current preparation', async () => {
    const oldWork = deferred<File>();
    const current = pdf('new.pdf');
    const session = new EstimatePdfSession(
      vi
        .fn()
        .mockReturnValueOnce(oldWork.promise)
        .mockRejectedValueOnce(new Error('failed'))
        .mockResolvedValueOnce(current),
    );
    session.update(oldSnapshot(), '90/100');
    const old = session.prepare();
    session.update(newSnapshot(), '600/100');
    oldWork.reject(new Error('obsolete'));
    expect(await old).toBeNull();
    expect(session.presentationReadyFor('600/100')).toBe(false);
    await expect(session.prepare()).rejects.toThrow('failed');
    expect(session.presentationReadyFor('600/100')).toBe(true);
    expect(await session.prepare()).toBe(current);
  });

  it('preserves a prepared file when an equivalent snapshot is supplied', async () => {
    const current = pdf('current.pdf');
    const session = new EstimatePdfSession(async () => current);
    session.update(oldSnapshot(), '90/100');
    await session.prepare();
    session.update(oldSnapshot(), '90/100');
    expect(session.fileFor('90/100')).toBe(current);
    expect(session.presentationReadyFor('90/100')).toBe(true);
  });

  it('invalidates changed numeric inputs even when the raw key is reused', async () => {
    const session = new EstimatePdfSession(async () => pdf('old.pdf'));
    session.update(oldSnapshot(), 'same-key');
    await session.prepare();
    session.update(newSnapshot(), 'same-key');
    expect(session.fileFor('same-key')).toBeNull();
  });

  it('discards pending success after disposal and cannot prepare again', async () => {
    const work = deferred<File>();
    const session = new EstimatePdfSession(() => work.promise);
    session.update(oldSnapshot(), '90/100');
    const pending = session.prepare();
    session.dispose();
    work.resolve(pdf('obsolete.pdf'));
    expect(await pending).toBeNull();
    session.update(newSnapshot(), '600/100');
    expect(await session.prepare()).toBeNull();
    expect(session.fileFor('90/100')).toBeNull();
    expect(session.fileFor('600/100')).toBeNull();
  });

  it('discards pending failure after disposal', async () => {
    const work = deferred<File>();
    const session = new EstimatePdfSession(() => work.promise);
    session.update(oldSnapshot(), '90/100');
    const pending = session.prepare();
    session.dispose();
    work.reject(new Error('obsolete'));
    expect(await pending).toBeNull();
  });

  it('releases a prepared file on disposal', async () => {
    const session = new EstimatePdfSession(async () => pdf('current.pdf'));
    session.update(oldSnapshot(), '90/100');
    await session.prepare();
    session.dispose();
    expect(session.fileFor('90/100')).toBeNull();
  });

  it('cannot reuse an obsolete file when raw inputs change and then change back', async () => {
    const oldWork = deferred<File>();
    const current = pdf('current.pdf');
    const session = new EstimatePdfSession(
      vi
        .fn()
        .mockReturnValueOnce(oldWork.promise)
        .mockResolvedValueOnce(current),
    );
    session.update(oldSnapshot(), '90/100');
    const old = session.prepare();
    session.update(oldSnapshot(), 'invalid/100');
    session.update(oldSnapshot(), '90/100');
    const next = session.prepare();
    oldWork.resolve(pdf('obsolete.pdf'));
    expect(await old).toBeNull();
    expect(await next).toBe(current);
    expect(session.fileFor('90/100')).toBe(current);
  });

  it('can retry a synchronous generation failure', async () => {
    const current = pdf('current.pdf');
    let fail = true;
    const session = new EstimatePdfSession(() => {
      if (fail) throw new Error('synchronous failure');
      return Promise.resolve(current);
    });
    session.update(oldSnapshot(), '90/100');
    await expect(session.prepare()).rejects.toThrow('synchronous failure');
    fail = false;
    expect(await session.prepare()).toBe(current);
  });
  it('releases obsolete city work through Phoenix, A, B, and Phoenix again', async () => {
    const phoenixWork = deferred<File>();
    const cityAWork = deferred<File>();
    const cityBWork = deferred<File>();
    const destinationWork = deferred<File>();
    const retryWork = deferred<File>();
    const phoenixSnapshot = createEstimateSnapshot(phoenix, 90, 100);
    const cityASnapshot = createEstimateSnapshot(
      registryCity('city-a'),
      220,
      80,
    );
    const cityBSnapshot = createEstimateSnapshot(
      registryCity('city-b'),
      90,
      100,
    );
    const generate = vi
      .fn()
      .mockReturnValueOnce(phoenixWork.promise)
      .mockReturnValueOnce(cityAWork.promise)
      .mockReturnValueOnce(cityBWork.promise)
      .mockReturnValueOnce(destinationWork.promise)
      .mockReturnValueOnce(retryWork.promise);
    const session = new EstimatePdfSession(generate);

    session.update(phoenixSnapshot, 'phoenix');
    const oldPhoenix = session.prepare();
    await Promise.resolve();
    session.update(cityASnapshot, 'city-a');
    const oldCityA = session.prepare();
    await Promise.resolve();
    session.update(cityBSnapshot, 'city-b');
    const oldCityB = session.prepare();
    await Promise.resolve();
    session.update(phoenixSnapshot, 'phoenix');
    const destination = session.prepare();

    phoenixWork.resolve(pdf('obsolete-phoenix.pdf'));
    cityAWork.reject(new Error('obsolete-city-a'));
    cityBWork.resolve(pdf('obsolete-city-b.pdf'));
    expect(await oldPhoenix).toBeNull();
    expect(await oldCityA).toBeNull();
    expect(await oldCityB).toBeNull();
    expect(session.fileFor('city-a')).toBeNull();
    expect(session.fileFor('city-b')).toBeNull();

    const destinationFile = pdf('destination-phoenix.pdf');
    destinationWork.resolve(destinationFile);
    expect(await destination).toBe(destinationFile);
    expect(session.fileFor('phoenix')).toBe(destinationFile);

    session.update(cityASnapshot, 'city-a');
    session.update(phoenixSnapshot, 'phoenix');
    const retry = session.prepare();
    retryWork.resolve(pdf('roundtrip-phoenix.pdf'));
    expect(await retry).toEqual(expect.any(File));
    expect(session.fileFor('phoenix')?.name).toBe('roundtrip-phoenix.pdf');
  });
});

describe('component-wide native share ownership', () => {
  it('prepares a changed estimate without opening a second sheet until the first settles', async () => {
    const oldFile = pdf('old.pdf');
    const currentFile = pdf('current.pdf');
    const pdfSession = new EstimatePdfSession(async (snapshot) =>
      snapshot.bill === 90 ? oldFile : currentFile,
    );
    const shareSession = new EstimateShareSession();
    const work = deferred<void>();
    const share = vi
      .fn()
      .mockReturnValueOnce(work.promise)
      .mockResolvedValue(undefined);
    const navigator = { canShare: () => true, share };

    pdfSession.update(oldSnapshot(), '90/100');
    const first = shareSession.share(
      (await pdfSession.prepare())!,
      navigator,
      true,
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ files: [oldFile] }),
    );
    expect(shareSession.busy).toBe(true);

    pdfSession.update(newSnapshot(), '600/100');
    expect(await pdfSession.prepare()).toBe(currentFile);
    expect(shareSession.share(currentFile, navigator, true)).toBeNull();
    expect(share).toHaveBeenCalledTimes(1);

    work.resolve(undefined);
    expect(await first).toBe('shared');
    expect(shareSession.busy).toBe(false);
    expect(await shareSession.share(currentFile, navigator, true)).toBe(
      'shared',
    );
    expect(share).toHaveBeenLastCalledWith(
      expect.objectContaining({ files: [currentFile] }),
    );
  });

  it('releases native share ownership after failure so the current file can be retried', async () => {
    const session = new EstimateShareSession();
    const file = pdf('current.pdf');
    const failed = session.share(
      file,
      {
        canShare: () => true,
        share: () => {
          throw new Error('sharing failed');
        },
      },
      true,
    );
    expect(session.busy).toBe(true);
    await expect(failed).rejects.toThrow('sharing failed');
    expect(session.busy).toBe(false);
    expect(
      await session.share(
        file,
        {
          canShare: () => true,
          share: () => Promise.resolve(),
        },
        true,
      ),
    ).toBe('shared');
  });
});

describe('native file sharing', () => {
  it('invokes native sharing synchronously with the prepared File', async () => {
    const file = pdf('current.pdf');
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn(() => true);
    const result = sharePreparedEstimate(file, { canShare, share }, true);
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ files: [file] }),
    );
    expect(await result).toBe('shared');
  });

  it('treats cancellation as a normal outcome', async () => {
    expect(
      await sharePreparedEstimate(
        pdf('a.pdf'),
        {
          canShare: () => true,
          share: () =>
            Promise.reject(new DOMException('Cancelled', 'AbortError')),
        },
        true,
      ),
    ).toBe('cancelled');
  });

  it.each([
    [{}, true],
    [{ share: vi.fn() }, true],
    [{ share: vi.fn(), canShare: () => false }, true],
    [{ share: vi.fn(), canShare: () => true }, false],
  ])(
    'reports unsupported sharing without opening a native sheet',
    async (navigator, secure) => {
      expect(await sharePreparedEstimate(pdf('a.pdf'), navigator, secure)).toBe(
        'unsupported',
      );
      if ('share' in navigator) expect(navigator.share).not.toHaveBeenCalled();
    },
  );

  it('exposes genuine share failures for accessible retry instead of reporting success', async () => {
    await expect(
      sharePreparedEstimate(
        pdf('a.pdf'),
        {
          canShare: () => true,
          share: () => Promise.reject(new Error('permission denied')),
        },
        true,
      ),
    ).rejects.toThrow('permission denied');
  });

  it('propagates capability-check errors without opening native sharing', async () => {
    const share = vi.fn();
    await expect(
      sharePreparedEstimate(
        pdf('a.pdf'),
        {
          canShare: () => {
            throw new Error('capability failure');
          },
          share,
        },
        true,
      ),
    ).rejects.toThrow('capability failure');
    expect(share).not.toHaveBeenCalled();
  });

  it('propagates synchronous share errors', async () => {
    await expect(
      sharePreparedEstimate(
        pdf('a.pdf'),
        {
          canShare: () => true,
          share: () => {
            throw new Error('share failure');
          },
        },
        true,
      ),
    ).rejects.toThrow('share failure');
  });

  it('treats synchronous AbortError as cancellation', async () => {
    expect(
      await sharePreparedEstimate(
        pdf('a.pdf'),
        {
          canShare: () => true,
          share: () => {
            throw new DOMException('Cancelled', 'AbortError');
          },
        },
        true,
      ),
    ).toBe('cancelled');
  });

  it('does not confuse a rejected NotAllowedError with cancellation', async () => {
    await expect(
      sharePreparedEstimate(
        pdf('a.pdf'),
        {
          canShare: () => true,
          share: () =>
            Promise.reject(new DOMException('Denied', 'NotAllowedError')),
        },
        true,
      ),
    ).rejects.toMatchObject({ name: 'NotAllowedError' });
  });
});

describe('prepared file downloads', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('downloads the same file and retains its URL for at least sixty seconds', () => {
    vi.useFakeTimers();
    const file = pdf('current.pdf');
    const createObjectURL = vi.fn(() => 'blob:estimate');
    const revokeObjectURL = vi.fn();
    const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.stubGlobal('document', {
      createElement: () => anchor,
      body: { append: vi.fn() },
    });

    downloadPreparedEstimate(file);

    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(anchor.href).toBe('blob:estimate');
    expect(anchor.download).toBe('current.pdf');
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.remove).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(59_999);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:estimate');
  });

  it('coalesces rapid download activations for the same File until the cooldown ends', async () => {
    vi.useFakeTimers();
    const file = pdf('current.pdf');
    const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:estimate',
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('document', {
      createElement: () => anchor,
      body: { append: vi.fn() },
    });

    const first = downloadPreparedEstimate(file);
    await vi.advanceTimersByTimeAsync(250);
    const repeated = downloadPreparedEstimate(file);
    expect(repeated).toBe(first);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(249);
    downloadPreparedEstimate(file);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await first;
    downloadPreparedEstimate(file);
    expect(anchor.click).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
  });

  it('still removes the anchor and releases its URL when downloading throws', () => {
    vi.useFakeTimers();
    const revokeObjectURL = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click: () => {
        throw new Error('download failure');
      },
      remove: vi.fn(),
    };
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:failed',
      revokeObjectURL,
    });
    vi.stubGlobal('document', {
      createElement: () => anchor,
      body: { append: vi.fn() },
    });

    expect(() => downloadPreparedEstimate(pdf('current.pdf'))).toThrow(
      'download failure',
    );
    expect(anchor.remove).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:failed');
  });
});
