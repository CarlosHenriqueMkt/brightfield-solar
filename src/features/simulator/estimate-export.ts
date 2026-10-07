import type { EstimateSnapshot } from './estimate-document';

export class EstimatePdfSession {
  private snapshot: EstimateSnapshot | null = null;
  private key: string | null = null;
  private file: File | null = null;
  private pending: Promise<File | null> | null = null;
  private revision = 0;
  private disposed = false;

  constructor(
    private readonly generate: (snapshot: EstimateSnapshot) => Promise<File>,
  ) {}

  update(snapshot: EstimateSnapshot, key: string): void {
    if (this.disposed) return;
    if (this.snapshot?.key === snapshot.key && this.key === key) return;
    this.revision += 1;
    this.snapshot = snapshot;
    this.key = key;
    this.file = null;
    this.pending = null;
  }

  prepare(): Promise<File | null> {
    if (this.disposed || !this.snapshot) return Promise.resolve(null);
    if (this.file) return Promise.resolve(this.file);
    if (this.pending) return this.pending;

    const snapshot = this.snapshot;
    const revision = this.revision;
    const pending = Promise.resolve()
      .then(() => this.generate(snapshot))
      .then(
        (file) => {
          if (this.disposed || revision !== this.revision) return null;
          this.file = file;
          return file;
        },
        (error: unknown) => {
          if (this.disposed || revision !== this.revision) return null;
          throw error;
        },
      )
      .finally(() => {
        if (this.pending === pending) this.pending = null;
      });
    this.pending = pending;
    return pending;
  }

  fileFor(key: string): File | null {
    return !this.disposed && this.key === key ? this.file : null;
  }

  dispose(): void {
    this.disposed = true;
    this.revision += 1;
    this.snapshot = null;
    this.key = null;
    this.file = null;
    this.pending = null;
  }
}

type FileShareNavigator = {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

export async function sharePreparedEstimate(
  file: File,
  navigator: FileShareNavigator,
  secure: boolean,
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!secure || !navigator.share || !navigator.canShare) return 'unsupported';
  if (!navigator.canShare({ files: [file] })) return 'unsupported';

  try {
    // Invoke before the first await to preserve the click's user activation.
    await navigator.share({
      files: [file],
      title: 'Brightfield Solar estimate',
    });
    return 'shared';
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      return 'cancelled';
    }
    throw error;
  }
}

export class EstimateShareSession {
  private pending = false;

  get busy(): boolean {
    return this.pending;
  }

  share(
    file: File,
    navigator: FileShareNavigator,
    secure: boolean,
  ): Promise<'shared' | 'cancelled' | 'unsupported'> | null {
    if (this.pending) return null;
    this.pending = true;
    // Set ownership before invoking the browser, including synchronous throws.
    return sharePreparedEstimate(file, navigator, secure).finally(() => {
      this.pending = false;
    });
  }
}

const pendingDownloads = new WeakMap<File, Promise<void>>();

export function downloadPreparedEstimate(file: File): Promise<void> {
  const pending = pendingDownloads.get(file);
  if (pending) return pending;
  const url = URL.createObjectURL(file);
  let anchor: HTMLAnchorElement | null = null;
  try {
    anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    document.body.append(anchor);
    anchor.click();
  } finally {
    // Browser download consumers may read the URL after this component unmounts.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    anchor?.remove();
  }
  const cooldown = new Promise<void>((resolve) => {
    setTimeout(() => {
      pendingDownloads.delete(file);
      resolve();
    }, 500);
  });
  pendingDownloads.set(file, cooldown);
  return cooldown;
}
