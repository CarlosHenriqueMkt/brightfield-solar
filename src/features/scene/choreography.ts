export type ChoreographyPhase =
  | 'covered'
  | 'waiting'
  | 'lead-in'
  | 'camera'
  | 'revealing'
  | 'active'
  | 'concealing'
  | 'returning';

export interface ChoreographySnapshot {
  revision: number;
  phase: ChoreographyPhase;
  cameraProgress: number;
  curtainProgress: number;
  drawerProgress: number;
  cameraComplete: boolean;
  curtainComplete: boolean;
  panelsComplete: boolean;
  drawerComplete: boolean;
}

export interface ChoreographyIntent {
  active: boolean;
  panelCount: number;
  reducedMotion: boolean;
  revision: number;
  leadInSeconds?: number;
}

export interface ChoreographyTimelineOptions {
  drawerDuration?: number;
  concealDrawerDuration?: number;
  cameraDuration?: number;
}

const DEFAULT_LEAD_IN = 0.4;
const DEFAULT_CAMERA_DURATION = 3;
const DEFAULT_DRAWER_DURATION = 0.4;
const DEFAULT_CONCEAL_DRAWER_DURATION = 0.2;
const DEFAULT_RETURN_DURATION = 2.4;
const WHITE_MILESTONE = 0.03;

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeCount(count: number): number {
  return clamp(Math.round(Number.isFinite(count) ? count : 0), 0, 51);
}

export function normalizeLeadIn(seconds: number | undefined): number {
  return clamp(
    Number.isFinite(seconds ?? NaN) ? (seconds as number) : DEFAULT_LEAD_IN,
    0.3,
    0.5,
  );
}

export function curtainLiftAt(progress: number): number {
  const normalized = clamp(Number.isFinite(progress) ? progress : 0);
  if (normalized <= WHITE_MILESTONE) return 0;
  const t = (normalized - WHITE_MILESTONE) / (1 - WHITE_MILESTONE);
  return t * t * (3 - 2 * t);
}

export function initialChoreographySnapshot(
  revision = 0,
): ChoreographySnapshot {
  return {
    revision,
    phase: 'covered',
    cameraProgress: 0,
    curtainProgress: 0,
    drawerProgress: 0,
    cameraComplete: true,
    curtainComplete: true,
    panelsComplete: true,
    drawerComplete: true,
  };
}

/** Pure state machine advanced by the viewer's single active RAF clock. */
export class ChoreographyTimeline {
  private readonly drawerDuration: number;
  private readonly concealDrawerDuration: number;
  private readonly cameraDuration: number;
  private intent: ChoreographyIntent = {
    active: false,
    panelCount: 0,
    reducedMotion: false,
    revision: 0,
  };
  private phase: ChoreographyPhase = 'covered';
  /** Composite forward coordinate q. Return remaps this same coordinate. */
  private compositeTime = 0;
  private drawerElapsed = 0;
  private panelsSettled = true;
  private drawerComplete = true;
  private returnElapsed = 0;
  private returnOrigin = 0;
  private returnDuration = 0;

  constructor(options: ChoreographyTimelineOptions = {}) {
    this.drawerDuration = options.drawerDuration ?? DEFAULT_DRAWER_DURATION;
    this.concealDrawerDuration =
      options.concealDrawerDuration ?? DEFAULT_CONCEAL_DRAWER_DURATION;
    this.cameraDuration = options.cameraDuration ?? DEFAULT_CAMERA_DURATION;
  }

  get entryDuration(): number {
    return this.totalTime();
  }

  snapshot(): ChoreographySnapshot {
    const leadIn = normalizeLeadIn(this.intent.leadInSeconds);
    const total = this.entryDuration;
    const curtainProgress = clamp(this.compositeTime / total);
    const cameraProgress = clamp(
      (this.compositeTime - leadIn) / this.cameraDuration,
    );
    return {
      revision: this.intent.revision,
      phase: this.phase,
      cameraProgress,
      curtainProgress,
      drawerProgress:
        this.drawerDuration > 0
          ? clamp(this.drawerElapsed / this.drawerDuration)
          : 1,
      cameraComplete: this.intent.active
        ? this.compositeTime >= total
        : this.compositeTime <= leadIn,
      curtainComplete: this.intent.active
        ? this.compositeTime >= total
        : curtainLiftAt(curtainProgress) === 0,
      panelsComplete: this.panelsSettled,
      drawerComplete: this.drawerComplete,
    };
  }

  setIntent(next: ChoreographyIntent): ChoreographySnapshot {
    if (next.revision < this.intent.revision) return this.snapshot();
    const wasActive = this.intent.active;
    const previousCount = this.intent.panelCount;
    this.intent = {
      active: next.active,
      panelCount: normalizeCount(next.panelCount),
      reducedMotion: next.reducedMotion,
      revision: next.revision,
      leadInSeconds: normalizeLeadIn(next.leadInSeconds),
    };
    const countChanged = previousCount !== this.intent.panelCount;

    if (next.reducedMotion) {
      this.compositeTime = next.active ? this.entryDuration : 0;
      this.drawerElapsed = next.active ? this.drawerDuration : 0;
      this.drawerComplete = true;
      this.panelsSettled = true;
      this.phase = next.active ? 'active' : 'covered';
      this.resetReturn();
      return this.snapshot();
    }

    if (next.active && !wasActive) {
      this.phase =
        this.compositeTime >= this.entryDuration
          ? 'revealing'
          : this.compositeTime < normalizeLeadIn(this.intent.leadInSeconds)
            ? 'lead-in'
            : 'camera';
      this.panelsSettled = false;
      this.drawerComplete =
        this.drawerDuration <= 0 || this.drawerElapsed >= this.drawerDuration;
      this.resetReturn();
    } else if (!next.active && wasActive) {
      this.phase = 'concealing';
      this.panelsSettled = false;
      this.drawerElapsed = Math.min(this.drawerElapsed, this.drawerDuration);
      this.drawerComplete = this.drawerDuration <= 0 || this.drawerElapsed <= 0;
      this.resetReturn();
    } else if (next.active && countChanged) {
      if (this.compositeTime >= this.entryDuration) this.phase = 'revealing';
      this.panelsSettled = false;
      this.drawerComplete =
        this.drawerDuration <= 0 || this.drawerElapsed >= this.drawerDuration;
    } else if (next.active && this.phase === 'concealing') {
      this.phase =
        this.compositeTime >= this.entryDuration
          ? 'revealing'
          : this.compositeTime < normalizeLeadIn(this.intent.leadInSeconds)
            ? 'lead-in'
            : 'camera';
      this.resetReturn();
    }
    return this.snapshot();
  }

  /** Queued intents are kept covered until the asset's first ready frame. */
  markReady(): ChoreographySnapshot {
    if (this.intent.reducedMotion) return this.snapshot();
    if (this.intent.active && this.phase === 'covered') {
      this.phase = 'lead-in';
      this.compositeTime = 0;
      this.drawerElapsed = 0;
      this.drawerComplete = false;
      this.panelsSettled = false;
      this.resetReturn();
    }
    return this.snapshot();
  }

  /** The only panel completion input; it represents actual paired node tweens. */
  setPanelsComplete(revision: number, complete: boolean): ChoreographySnapshot {
    if (revision !== this.intent.revision) return this.snapshot();
    this.panelsSettled = complete;
    this.updatePhase();
    return this.snapshot();
  }

  markPanelsSettled(revision: number): ChoreographySnapshot {
    return this.setPanelsComplete(revision, true);
  }

  advance(deltaSeconds: number): ChoreographySnapshot {
    const delta = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0);
    if (delta === 0 || this.intent.reducedMotion || this.phase === 'covered')
      return this.snapshot();

    if (this.intent.active) {
      const previousTime = this.compositeTime;
      this.compositeTime = Math.min(
        this.entryDuration,
        this.compositeTime + delta,
      );
      if (
        this.phase === 'lead-in' &&
        this.compositeTime >= normalizeLeadIn(this.intent.leadInSeconds)
      )
        this.phase = 'camera';

      let revealDelta = 0;
      if (this.compositeTime >= this.entryDuration) {
        if (this.phase !== 'revealing' && this.phase !== 'active') {
          this.phase = 'revealing';
          this.panelsSettled = this.intent.panelCount === 0;
        }
        revealDelta =
          previousTime >= this.entryDuration
            ? delta
            : Math.max(0, delta - (this.entryDuration - previousTime));
      }
      if (this.phase === 'revealing' || this.phase === 'active') {
        this.drawerElapsed = Math.min(
          this.drawerDuration,
          this.drawerElapsed + revealDelta,
        );
        this.drawerComplete =
          this.drawerDuration <= 0 || this.drawerElapsed >= this.drawerDuration;
      }
    } else if (this.phase === 'concealing') {
      const before = this.drawerElapsed;
      const concealRate =
        this.drawerDuration > 0 && this.concealDrawerDuration > 0
          ? this.drawerDuration / this.concealDrawerDuration
          : 0;
      this.drawerElapsed = Math.max(0, before - delta * concealRate);
      this.drawerComplete = this.drawerDuration <= 0 || this.drawerElapsed <= 0;
      const consumed =
        concealRate > 0 ? Math.min(delta, before / concealRate) : 0;
      const residual = Math.max(0, delta - consumed);
      if (this.drawerComplete && this.panelsSettled) {
        this.beginReturn();
        if (residual > 0) this.advanceReturn(residual);
      }
    } else if (this.phase === 'returning') {
      this.advanceReturn(delta);
    }

    this.updatePhase();
    return this.snapshot();
  }

  private totalTime(): number {
    return normalizeLeadIn(this.intent.leadInSeconds) + this.cameraDuration;
  }

  private resetReturn(): void {
    this.returnElapsed = 0;
    this.returnOrigin = 0;
    this.returnDuration = 0;
  }

  private beginReturn(): void {
    if (this.phase !== 'concealing') return;
    this.returnOrigin = clamp(this.compositeTime, 0, this.entryDuration);
    this.returnElapsed = 0;
    this.returnDuration =
      DEFAULT_RETURN_DURATION * (this.returnOrigin / this.entryDuration);
    if (this.returnOrigin <= 0 || this.returnDuration <= 0) {
      this.compositeTime = 0;
      this.phase = 'covered';
      return;
    }
    this.phase = 'returning';
  }

  private advanceReturn(delta: number): void {
    if (this.returnDuration <= 0) {
      this.compositeTime = 0;
      this.phase = 'covered';
      return;
    }
    this.returnElapsed = Math.min(
      this.returnDuration,
      this.returnElapsed + delta,
    );
    const ratio = this.returnElapsed / this.returnDuration;
    this.compositeTime =
      this.returnElapsed >= this.returnDuration
        ? 0
        : this.returnOrigin * 0.5 * (1 + Math.cos(Math.PI * ratio));
    if (this.returnElapsed >= this.returnDuration) this.phase = 'covered';
  }

  private updatePhase(): void {
    if (
      this.intent.active &&
      this.phase === 'revealing' &&
      this.panelsSettled &&
      this.drawerComplete
    )
      this.phase = 'active';
    if (
      !this.intent.active &&
      this.phase === 'concealing' &&
      this.panelsSettled &&
      this.drawerComplete
    )
      this.beginReturn();
  }
}
