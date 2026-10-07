import { describe, expect, it } from 'vitest';
import { ChoreographyTimeline, curtainLiftAt } from './choreography';

const open = (leadInSeconds = 0.4, panelCount = 17) => ({
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
    timeline.advance(0.4);
    const pose = timeline.advance(0.75);
    expect(pose.cameraProgress).toBeCloseTo(0.25, 10);
    expect(pose.curtainProgress).toBeCloseTo(1.15 / 3.4, 10);
  });

  it('clamps the lead-in while retaining a raw composite curtain coordinate', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open(0.1));
    const leading = timeline.advance(0.29);
    expect(leading.phase).toBe('lead-in');
    expect(leading.cameraProgress).toBe(0);
    expect(leading.curtainProgress).toBeCloseTo(0.29 / 3.3, 10);
    const departing = timeline.advance(0.01);
    expect(departing.phase).toBe('camera');
    expect(departing.cameraProgress).toBe(0);
  });

  it('holds white at the early milestone and lifts smoothly to clear', () => {
    expect(curtainLiftAt(0)).toBe(0);
    expect(curtainLiftAt(0.03)).toBe(0);
    expect(curtainLiftAt(0.04)).toBeGreaterThan(0);
    expect(curtainLiftAt(0.5)).toBeGreaterThan(curtainLiftAt(0.04));
    expect(curtainLiftAt(1)).toBe(1);
  });

  it('keeps the drawer at zero when Close interrupts the curtain-only lead-in', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    const leading = timeline.advance(0.2);
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
    timeline.advance(timeline.entryDuration);
    const revealed = timeline.advance(0.1);
    timeline.setIntent({ ...open(), active: false, revision: 2 });
    const closing = timeline.advance(0.01);
    expect(closing.drawerProgress).toBeLessThan(revealed.drawerProgress);
    expect(closing.drawerProgress).toBeGreaterThanOrEqual(0);
  });

  it('gives an empty illustrative installation the same readable drawer reveal', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open(0.4, 0));
    const barrier = timeline.advance(timeline.entryDuration);
    expect(barrier.phase).toBe('revealing');
    expect(barrier.drawerProgress).toBe(0);
    expect(barrier.drawerComplete).toBe(false);
    const usable = timeline.advance(0.4);
    expect(usable.drawerProgress).toBe(1);
    expect(usable.drawerComplete).toBe(true);
  });
});

describe('drawer continuity during panel reconciliation', () => {
  it('keeps a usable drawer open when a valid estimate retargets panels', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    timeline.advance(timeline.entryDuration);
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
    timeline.advance(timeline.entryDuration);
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

describe('prompt reveal and coupled return', () => {
  it('reaches both visual barriers promptly without making the drawer usable early', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    const arriving = timeline.advance(3.4);
    expect(arriving.cameraComplete).toBe(true);
    expect(arriving.curtainComplete).toBe(true);
    expect(arriving.drawerComplete).toBe(false);
    expect(arriving.drawerProgress).toBe(0);
    expect(arriving.panelsComplete).toBe(false);
  });

  it('waits for both conceal barriers and reverses the same coordinate with deceleration', () => {
    const timeline = new ChoreographyTimeline();
    const intent = open();
    timeline.setIntent(intent);
    timeline.advance(timeline.entryDuration);
    timeline.setPanelsComplete(1, true);
    timeline.setIntent({ ...intent, active: false, revision: 2 });
    const concealed = timeline.advance(0.2);
    expect(concealed.phase).toBe('concealing');
    expect(concealed.drawerComplete).toBe(true);
    expect(concealed.panelsComplete).toBe(false);
    timeline.setPanelsComplete(2, true);
    const origin = timeline.snapshot();
    const first = timeline.advance(0.2);
    const middleStart = timeline.advance(0.8);
    const middleEnd = timeline.advance(0.2);
    const tailStart = timeline.advance(0.8);
    const tailEnd = timeline.advance(0.2);
    const middleDrop = middleStart.curtainProgress - middleEnd.curtainProgress;
    expect(origin.curtainProgress - first.curtainProgress).toBeLessThan(
      middleDrop * 0.7,
    );
    expect(tailStart.curtainProgress - tailEnd.curtainProgress).toBeLessThan(
      middleDrop * 0.7,
    );
    expect(tailEnd.curtainComplete).toBe(true);
    expect(tailEnd.phase).toBe('returning');
    expect(tailEnd.drawerProgress).toBe(0);
    const covered = timeline.advance(0.2);
    expect(covered.phase).toBe('covered');
    expect(covered.curtainProgress).toBe(0);
  });
});

describe('interrupted return and completion replay', () => {
  it('consumes the drawer barrier once and does not restart on repeated panel completion', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    timeline.advance(10);
    timeline.setPanelsComplete(1, true);
    timeline.setIntent({ ...open(), active: false, revision: 2 });
    timeline.setPanelsComplete(2, true);
    const barrier = timeline.advance(0.2);
    expect(barrier.phase).toBe('returning');
    expect(barrier.curtainProgress).toBe(1);
    const sampled = timeline.advance(0.6);
    const replayed = timeline.setPanelsComplete(2, true);
    expect(replayed.curtainProgress).toBe(sampled.curtainProgress);
    const continued = timeline.advance(0.6);
    expect(continued.curtainProgress).toBeCloseTo(0.5);
  });

  it('reopens on the same sampled coordinate rather than jumping to an endpoint', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    timeline.advance(10);
    timeline.setPanelsComplete(1, true);
    timeline.setIntent({ ...open(), active: false, revision: 2 });
    timeline.advance(0.2);
    timeline.setPanelsComplete(2, true);
    const sampled = timeline.advance(1.2);
    const reopened = timeline.setIntent({ ...open(), revision: 3 });
    expect(reopened.cameraProgress).toBe(sampled.cameraProgress);
    expect(reopened.curtainProgress).toBe(sampled.curtainProgress);
    expect(reopened.drawerProgress).toBe(0);
    expect(reopened.phase).toBe('camera');
    expect(timeline.advance(0.1).cameraProgress).toBeGreaterThan(
      sampled.cameraProgress,
    );
  });

  it('ignores a stale Close and completion after a newer reopen', () => {
    const timeline = new ChoreographyTimeline();
    timeline.setIntent(open());
    timeline.advance(2);
    timeline.setIntent({ ...open(), active: false, revision: 2 });
    timeline.setPanelsComplete(2, true);
    timeline.advance(0.3);
    const reopened = timeline.setIntent({ ...open(), revision: 3 });
    expect(
      timeline.setIntent({ ...open(), active: false, revision: 2 }),
    ).toEqual(reopened);
    expect(timeline.setPanelsComplete(2, true)).toEqual(reopened);
    expect(timeline.advance(0.1).cameraProgress).toBeGreaterThan(
      reopened.cameraProgress,
    );
  });
});
