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

const DEFAULT_LEAD_IN = 1;
const DEFAULT_CAMERA_DURATION = 4;
const DEFAULT_DRAWER_DURATION = 0.4;
const DEFAULT_CONCEAL_DRAWER_DURATION = 0.2;

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeCount(count: number): number {
  return clamp(Math.round(Number.isFinite(count) ? count : 0), 0, 51);
}

function normalizeLeadIn(seconds: number | undefined): number {
  return clamp(
    Number.isFinite(seconds ?? NaN) ? (seconds as number) : DEFAULT_LEAD_IN,
    1,
    2,
  );
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
  /** Composite forward coordinate q. Entry q += dt; return q -= 2*dt. */
  private compositeTime = 0;
  private drawerElapsed = 0;
  private panelsSettled = true;
  private drawerComplete = true;

  constructor(options: ChoreographyTimelineOptions = {}) {
    this.drawerDuration = options.drawerDuration ?? DEFAULT_DRAWER_DURATION;
    this.concealDrawerDuration =
      options.concealDrawerDuration ?? DEFAULT_CONCEAL_DRAWER_DURATION;
    this.cameraDuration = options.cameraDuration ?? DEFAULT_CAMERA_DURATION;
  }

  snapshot(): ChoreographySnapshot {
    const leadIn = normalizeLeadIn(this.intent.leadInSeconds);
    const total = leadIn + this.cameraDuration;
    const cameraProgress = clamp(
      (this.compositeTime - leadIn) / this.cameraDuration,
    );
    const curtainProgress = clamp(this.compositeTime / total);
    return {
      revision: this.intent.revision,
      phase: this.phase,
      cameraProgress,
      curtainProgress,
      drawerProgress: clamp(this.drawerElapsed / this.drawerDuration),
      cameraComplete: this.intent.active
        ? this.compositeTime >= total
        : this.compositeTime <= leadIn,
      curtainComplete: this.intent.active
        ? this.compositeTime >= total
        : this.compositeTime <= 0,
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
      this.compositeTime = next.active
        ? normalizeLeadIn(next.leadInSeconds) + this.cameraDuration
        : 0;
      this.drawerElapsed = next.active ? this.drawerDuration : 0;
      this.drawerComplete = true;
      this.panelsSettled = true;
      this.phase = next.active ? 'active' : 'covered';
      return this.snapshot();
    }

    if (next.active && !wasActive) {
      this.phase =
        this.compositeTime >= this.totalTime()
          ? 'revealing'
          : this.compositeTime < normalizeLeadIn(this.intent.leadInSeconds)
            ? 'lead-in'
            : 'camera';
      this.panelsSettled = false;
      this.drawerComplete = this.drawerElapsed >= this.drawerDuration;
    } else if (!next.active && wasActive) {
      this.phase = 'concealing';
      this.panelsSettled = false;
      this.drawerElapsed = Math.min(this.drawerElapsed, this.drawerDuration);
      this.drawerComplete = this.drawerElapsed <= 0;
    } else if (next.active && countChanged) {
      if (this.compositeTime >= this.totalTime()) this.phase = 'revealing';
      this.panelsSettled = false;
      this.drawerComplete = this.drawerElapsed >= this.drawerDuration;
    } else if (next.active && this.phase === 'concealing') {
      this.phase =
        this.compositeTime >= this.totalTime() ? 'revealing' : 'camera';
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
      if (this.phase === 'concealing') this.phase = 'camera';
      const previousTime = this.compositeTime;
      this.compositeTime = Math.min(
        this.totalTime(),
        this.compositeTime + delta,
      );
      if (
        this.phase === 'lead-in' &&
        this.compositeTime >= normalizeLeadIn(this.intent.leadInSeconds)
      )
        this.phase = 'camera';
      if (this.compositeTime >= this.totalTime() && this.phase === 'camera') {
        this.phase = 'revealing';
        this.drawerElapsed = 0;
        this.drawerComplete = false;
        this.panelsSettled = this.intent.panelCount === 0;
      }
      if (this.phase === 'revealing') {
        const revealDelta =
          this.compositeTime >= this.totalTime()
            ? Math.max(0, delta - (this.totalTime() - previousTime))
            : delta;
        this.drawerElapsed = Math.min(
          this.drawerDuration,
          this.drawerElapsed + revealDelta,
        );
        this.drawerComplete = this.drawerElapsed >= this.drawerDuration;
      }
    } else if (this.phase === 'concealing') {
      this.drawerElapsed = Math.max(
        0,
        this.drawerElapsed -
          (delta * this.drawerDuration) / this.concealDrawerDuration,
      );
      this.drawerComplete = this.drawerElapsed <= 0;
      if (this.drawerComplete && this.panelsSettled) this.phase = 'returning';
    }
    if (this.phase === 'returning') {
      this.compositeTime = Math.max(0, this.compositeTime - 2 * delta);
      if (this.compositeTime <= 0) this.phase = 'covered';
    }
    this.updatePhase();
    return this.snapshot();
  }

  private totalTime(): number {
    return normalizeLeadIn(this.intent.leadInSeconds) + this.cameraDuration;
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
      this.phase = 'returning';
  }
}
