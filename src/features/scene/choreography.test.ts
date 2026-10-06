import { describe, expect, it } from 'vitest';
import { ChoreographyTimeline } from './choreography';

const open = (leadInSeconds = 1, panelCount = 17) => ({
  active: true,
  panelCount,
  reducedMotion: false,
  revision: 1,
  leadInSeconds,
});

describe('rendered timeline coordinate continuity', () => {
  it('leaves easing to the approved camera interpolation, not the clock', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    timeline.advance(1);
    const pose = timeline.advance(1);
    expect(pose.cameraProgress).toBeCloseTo(0.25, 10);
    expect(pose.curtainProgress).toBeCloseTo(0.4, 10);
  });

  it('normalizes the curtain across the configured lead-in and full camera travel', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open(2));
    const leading = timeline.advance(0.5);
    expect(leading.phase).toBe('lead-in');
    expect(leading.cameraProgress).toBe(0);
    expect(leading.curtainProgress).toBeCloseTo(1 / 12, 10);
    const departing = timeline.advance(1.5);
    expect(departing.phase).toBe('camera');
    expect(departing.cameraProgress).toBe(0);
    expect(departing.curtainProgress).toBeCloseTo(1 / 3, 10);
  });

  it('keeps the drawer at zero when Close interrupts the curtain-only lead-in', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    const leading = timeline.advance(0.5);
    timeline.setIntent({ ...open(), active: false, revision: 2 });
    timeline.setPanelsComplete(2, true);
    const closing = timeline.advance(0.01);
    expect(closing.cameraProgress).toBe(0);
    expect(closing.drawerProgress).toBe(0);
    expect(closing.curtainProgress).toBeLessThan(leading.curtainProgress);
    expect(closing.curtainProgress).toBeGreaterThan(0);
  });

  it('does not fabricate a drawer-width jump when Close interrupts its reveal', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    timeline.advance(5);
    const revealed = timeline.advance(0.1);
    timeline.setIntent({ ...open(), active: false, revision: 2 });
    const closing = timeline.advance(0.01);
    expect(closing.drawerProgress).toBeLessThan(revealed.drawerProgress);
    expect(closing.drawerProgress).toBeGreaterThanOrEqual(0);
  });

  it('gives an empty illustrative installation the same readable drawer reveal', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open(1, 0));
    const barrier = timeline.advance(5);
    expect(barrier.phase).toBe('revealing');
    expect(barrier.drawerProgress).toBe(0);
    expect(barrier.drawerComplete).toBe(false);
    const usable = timeline.advance(0.4);
    expect(usable.drawerProgress).toBe(1);
    expect(usable.drawerComplete).toBe(true);
  });

  it('retains the curtain-only tail at frontal when reversing a two-second lead-in', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open(2));
    timeline.advance(6);
    timeline.advance(1.5);
    timeline.setPanelsComplete(1, true);
    timeline.setIntent({ ...open(2), active: false, revision: 2 });
    timeline.advance(0.79);
    timeline.setPanelsComplete(2, true);
    const frontal = timeline.advance(2);
    expect(frontal.phase).toBe('returning');
    expect(frontal.cameraProgress).toBeCloseTo(0, 10);
    expect(frontal.curtainProgress).toBeCloseTo(1 / 3, 10);
    const covered = timeline.advance(1);
    expect(covered.phase).toBe('covered');
    expect(covered.curtainProgress).toBe(0);
  });
});

describe('drawer continuity during panel reconciliation', () => {
  it('keeps a usable drawer open when a valid estimate retargets panels', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    timeline.advance(5);
    timeline.advance(0.4);
    timeline.setPanelsComplete(1, true);
    const retargeted = timeline.setIntent({ ...open(), panelCount: 51 });
    expect(retargeted.cameraProgress).toBe(1);
    expect(retargeted.curtainProgress).toBe(1);
    expect(retargeted.drawerProgress).toBe(1);
    expect(retargeted.drawerComplete).toBe(true);
    expect(retargeted.panelsComplete).toBe(false);
  });

  it('reopens during concealment from the sampled drawer width', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    timeline.advance(5);
    timeline.advance(0.4);
    timeline.setPanelsComplete(1, true);
    timeline.setIntent({ ...open(), active: false, revision: 2 });
    const sampled = timeline.advance(0.08);
    expect(sampled.drawerProgress).toBeCloseTo(0.6, 10);
    const reopened = timeline.setIntent({ ...open(), revision: 3 });
    expect(reopened.phase).toBe('revealing');
    expect(reopened.drawerProgress).toBeCloseTo(0.6, 10);
    expect(reopened.cameraProgress).toBe(1);
    expect(reopened.curtainProgress).toBe(1);
  });
});
