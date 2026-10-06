export type CameraPhase = 'frontal' | 'outbound' | 'elevated' | 'returning';

export interface SimulationState {
  readonly active: boolean;
  readonly panelVisible: boolean;
  readonly cameraPhase: CameraPhase;
  readonly revision: number;
}

export const initialSimulationState: SimulationState = {
  active: false,
  panelVisible: false,
  cameraPhase: 'frontal',
  revision: 0,
};

export type SimulationEvent =
  | { type: 'open' }
  | { type: 'view-house' }
  | { type: 'back-to-simulation' }
  | { type: 'close'; animate: boolean }
  | { type: 'arrival'; destination: 'frontal' | 'elevated'; revision: number }
  | { type: 'unavailable' };

export function simulationReducer(
  state: SimulationState,
  event: SimulationEvent,
): SimulationState {
  switch (event.type) {
    case 'open':
      return {
        active: true,
        panelVisible: true,
        cameraPhase: state.cameraPhase === 'elevated' ? 'elevated' : 'outbound',
        revision: state.revision + 1,
      };
    case 'view-house':
      return state.active ? { ...state, panelVisible: false } : state;
    case 'back-to-simulation':
      return state.active ? { ...state, panelVisible: true } : state;
    case 'close':
      return {
        ...state,
        active: false,
        panelVisible: false,
        cameraPhase: event.animate ? 'returning' : 'frontal',
        revision: state.revision + 1,
      };
    case 'arrival':
      if (
        event.revision !== state.revision ||
        (event.destination === 'elevated') !== state.active
      )
        return state;
      return { ...state, cameraPhase: event.destination };
    case 'unavailable':
      return { ...state, cameraPhase: state.active ? 'elevated' : 'frontal' };
    default: {
      const exhaustive: never = event;
      throw new Error(`Unknown simulation event: ${exhaustive}`);
    }
  }
}
