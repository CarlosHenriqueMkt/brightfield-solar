import { describe, expect, it } from 'vitest';
import { initialSimulationState, simulationReducer } from './simulation-state';

describe('simulation intent and camera completion', () => {
  it('keeps simulation active and the elevated intent while viewing the house', () => {
    const opened = simulationReducer(initialSimulationState, { type: 'open' });
    const elevated = simulationReducer(opened, {
      type: 'arrival',
      destination: 'elevated',
      revision: opened.revision,
    });
    const house = simulationReducer(elevated, { type: 'view-house' });
    expect(house).toEqual({ ...elevated, panelVisible: false });
    expect(simulationReducer(house, { type: 'back-to-simulation' })).toEqual(
      elevated,
    );
  });
  it('rejects an old return completion after reopening mid-flight', () => {
    const opened = simulationReducer(initialSimulationState, { type: 'open' });
    const returning = simulationReducer(opened, {
      type: 'close',
      animate: true,
    });
    expect(returning.active).toBe(false);
    expect(returning.cameraPhase).toBe('returning');
    const reopened = simulationReducer(returning, { type: 'open' });
    expect(
      simulationReducer(reopened, {
        type: 'arrival',
        destination: 'frontal',
        revision: returning.revision,
      }),
    ).toBe(reopened);
    expect(
      simulationReducer(reopened, {
        type: 'arrival',
        destination: 'elevated',
        revision: reopened.revision,
      }).cameraPhase,
    ).toBe('elevated');
  });
  it('never resurrects an opening completed after close before ready', () => {
    const opened = simulationReducer(initialSimulationState, { type: 'open' });
    const closed = simulationReducer(opened, { type: 'close', animate: false });
    expect(closed.cameraPhase).toBe('frontal');
    expect(
      simulationReducer(closed, {
        type: 'arrival',
        destination: 'elevated',
        revision: opened.revision,
      }),
    ).toBe(closed);
    expect(simulationReducer(closed, { type: 'back-to-simulation' })).toBe(
      closed,
    );
  });
  it('finishes an unavailable renderer without waiting for a nonexistent callback', () => {
    const opened = simulationReducer(initialSimulationState, { type: 'open' });
    expect(simulationReducer(opened, { type: 'unavailable' })).toEqual({
      ...opened,
      cameraPhase: 'elevated',
    });
    const returning = simulationReducer(opened, {
      type: 'close',
      animate: true,
    });
    expect(
      simulationReducer(returning, { type: 'unavailable' }).cameraPhase,
    ).toBe('frontal');
  });
});
