import { describe, expect, it } from 'vitest';
import type { ChoreographySnapshot } from '@/features/scene/choreography';
import {
  initialSimulationState,
  simulationReducer,
  type SimulationState,
} from './simulation-state';

function progress(
  state: SimulationState,
  overrides: Partial<ChoreographySnapshot>,
): SimulationState {
  return simulationReducer(state, {
    type: 'choreography',
    snapshot: {
      revision: state.revision,
      phase: 'camera',
      cameraProgress: 0.5,
      curtainProgress: 0.6,
      drawerProgress: 0,
      cameraComplete: false,
      curtainComplete: false,
      panelsComplete: false,
      drawerComplete: false,
      ...overrides,
    },
  });
}

function settled(state: SimulationState): SimulationState {
  return progress(state, {
    phase: 'active',
    cameraProgress: 1,
    curtainProgress: 1,
    drawerProgress: 1,
    cameraComplete: true,
    curtainComplete: true,
    panelsComplete: true,
    drawerComplete: true,
  });
}

describe('simulation transition barriers', () => {
  it('keeps the intro covered and drawer concealed until activated and ready', () => {
    expect(initialSimulationState.phase).toBe('covered');
    const opened = simulationReducer(initialSimulationState, { type: 'open' });
    expect(opened.active).toBe(true);
    expect(opened.phase).toBe('waiting');
    expect(opened.cameraPhase).toBe('frontal');
    expect(opened.panelVisible).toBe(false);
    expect(opened.drawerUsable).toBe(false);
  });

  it('does not restart an already active opening on repeated CTA activation', () => {
    const opened = simulationReducer(initialSimulationState, { type: 'open' });
    expect(simulationReducer(opened, { type: 'open' })).toBe(opened);
  });

  it('retains the frontal phase while the moving curtain leads the camera', () => {
    const opened = simulationReducer(initialSimulationState, { type: 'open' });
    const leading = progress(opened, {
      phase: 'lead-in',
      cameraProgress: 0,
      curtainProgress: 0.1,
    });
    expect(leading.cameraPhase).toBe('frontal');
    expect(leading.panelVisible).toBe(false);
    expect(leading.drawerUsable).toBe(false);
    expect(progress(leading, { phase: 'camera' }).cameraPhase).toBe('outbound');
  });

  it.each(['cameraComplete', 'curtainComplete'] as const)(
    'waits for the other track after %s arrives first',
    (first) => {
      const opened = simulationReducer(initialSimulationState, {
        type: 'open',
      });
      const waiting = progress(opened, { [first]: true });
      expect(waiting.panelVisible).toBe(false);
      expect(waiting.drawerUsable).toBe(false);
      const revealing = progress(waiting, {
        phase: 'revealing',
        cameraComplete: true,
        curtainComplete: true,
      });
      expect(revealing.panelVisible).toBe(true);
      expect(revealing.drawerUsable).toBe(false);
      const usable = progress(revealing, {
        phase: 'revealing',
        cameraComplete: true,
        curtainComplete: true,
        drawerComplete: true,
        drawerProgress: 1,
      });
      expect(usable.drawerUsable).toBe(true);
    },
  );

  it('does not accept a premature drawer reveal or aggregate camera arrival', () => {
    const opened = simulationReducer(initialSimulationState, { type: 'open' });
    const premature = progress(opened, {
      phase: 'revealing',
      cameraComplete: true,
      drawerComplete: true,
    });
    expect(premature.phase).toBe('camera');
    expect(premature.panelVisible).toBe(false);
    expect(premature.drawerUsable).toBe(false);
    expect(
      simulationReducer(premature, {
        type: 'arrival',
        destination: 'elevated',
        revision: premature.revision,
      }),
    ).toBe(premature);
  });

  it('ignores duplicate completion snapshots', () => {
    const active = settled(
      simulationReducer(initialSimulationState, { type: 'open' }),
    );
    expect(settled(active)).toBe(active);
  });

  it('never resurrects a queued opening after Close before readiness', () => {
    const opened = simulationReducer(initialSimulationState, { type: 'open' });
    const closed = simulationReducer(opened, { type: 'close', animate: false });
    expect(closed.phase).toBe('covered');
    expect(closed.cameraPhase).toBe('frontal');
    expect(
      progress(closed, { revision: opened.revision, phase: 'active' }),
    ).toBe(closed);
    expect(progress(closed, { phase: 'active' })).toBe(closed);
    expect(simulationReducer(closed, { type: 'back-to-simulation' })).toBe(
      closed,
    );
  });

  it('closes the lead-in without describing a camera departure that never ran', () => {
    const leading = progress(
      simulationReducer(initialSimulationState, { type: 'open' }),
      { phase: 'lead-in', cameraProgress: 0, curtainProgress: 0.1 },
    );
    const closing = simulationReducer(leading, {
      type: 'close',
      animate: true,
    });
    expect(closing.phase).toBe('returning');
    expect(closing.cameraPhase).toBe('frontal');
    expect(closing.drawerUsable).toBe(false);
    const covered = progress(closing, {
      phase: 'covered',
      cameraProgress: 0,
      curtainProgress: 0,
      cameraComplete: true,
      curtainComplete: true,
    });
    expect(covered.phase).toBe('covered');
    expect(covered.panelVisible).toBe(false);
  });

  it('rejects an obsolete return completion after reopening mid-exit', () => {
    const active = settled(
      simulationReducer(initialSimulationState, { type: 'open' }),
    );
    const closing = simulationReducer(active, { type: 'close', animate: true });
    expect(closing.phase).toBe('concealing');
    const reopened = simulationReducer(closing, { type: 'open' });
    expect(
      progress(reopened, {
        revision: closing.revision,
        phase: 'covered',
        cameraProgress: 0,
        curtainProgress: 0,
      }),
    ).toBe(reopened);
    expect(settled(reopened).drawerUsable).toBe(true);
  });

  it('keeps simulation and revision unchanged through View house and Back', () => {
    const active = settled(
      simulationReducer(initialSimulationState, { type: 'open' }),
    );
    const house = simulationReducer(active, { type: 'view-house' });
    expect(house.active).toBe(true);
    expect(house.cameraPhase).toBe('elevated');
    expect(house.revision).toBe(active.revision);
    expect(house.panelVisible).toBe(false);
    expect(house.drawerUsable).toBe(false);
    expect(simulationReducer(house, { type: 'back-to-simulation' })).toEqual(
      active,
    );
    expect(simulationReducer(house, { type: 'open' })).toEqual(active);
  });

  it('releases failed-renderer barriers without claiming a successful camera journey', () => {
    const opened = simulationReducer(initialSimulationState, { type: 'open' });
    const fallback = simulationReducer(opened, { type: 'unavailable' });
    expect(fallback.phase).toBe('active');
    expect(fallback.cameraPhase).toBe('frontal');
    expect(fallback.panelVisible).toBe(true);
    expect(fallback.drawerUsable).toBe(true);
    const closing = simulationReducer(fallback, {
      type: 'close',
      animate: true,
    });
    const closed = simulationReducer(closing, { type: 'unavailable' });
    expect(closed.phase).toBe('covered');
    expect(closed.panelVisible).toBe(false);
    expect(closed.revision).toBe(closing.revision);
  });

  it('accepts coherently settled reduced-motion activation and exit', () => {
    const active = settled(
      simulationReducer(initialSimulationState, { type: 'open' }),
    );
    expect(active.cameraPhase).toBe('elevated');
    expect(active.drawerUsable).toBe(true);
    const closed = simulationReducer(active, { type: 'close', animate: false });
    expect(closed.phase).toBe('covered');
    expect(closed.cameraPhase).toBe('frontal');
    expect(closed.drawerUsable).toBe(false);
  });
});
