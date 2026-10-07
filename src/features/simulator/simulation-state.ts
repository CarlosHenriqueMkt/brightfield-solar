import type {
  ChoreographyPhase,
  ChoreographySnapshot,
} from '@/features/scene/choreography';

export type CameraPhase = 'frontal' | 'outbound' | 'elevated' | 'returning';

export interface SimulationState {
  readonly active: boolean;
  readonly panelVisible: boolean;
  readonly cameraPhase: CameraPhase;
  readonly revision: number;
  readonly phase: ChoreographyPhase;
  readonly cameraComplete: boolean;
  readonly curtainComplete: boolean;
  readonly drawerComplete: boolean;
  readonly drawerUsable: boolean;
  readonly houseView: boolean;
}

export const initialSimulationState: SimulationState = {
  active: false,
  panelVisible: false,
  cameraPhase: 'frontal',
  revision: 0,
  phase: 'covered',
  cameraComplete: false,
  curtainComplete: false,
  drawerComplete: false,
  drawerUsable: false,
  houseView: false,
};

export type SimulationEvent =
  | { type: 'open' }
  | { type: 'view-house' }
  | { type: 'back-to-simulation' }
  | { type: 'close'; animate: boolean }
  | { type: 'arrival'; destination: 'frontal' | 'elevated'; revision: number }
  | { type: 'choreography'; snapshot: ChoreographySnapshot }
  | { type: 'unavailable' };

function showDrawer(state: SimulationState): SimulationState {
  const panelVisible =
    state.active &&
    state.cameraComplete &&
    state.curtainComplete &&
    (state.phase === 'revealing' || state.phase === 'active');
  return {
    ...state,
    houseView: false,
    panelVisible,
    drawerUsable: panelVisible && state.drawerComplete,
  };
}

export function simulationReducer(
  state: SimulationState,
  event: SimulationEvent,
): SimulationState {
  switch (event.type) {
    case 'open':
      if (state.active) return state.houseView ? showDrawer(state) : state;
      return {
        ...state,
        active: true,
        panelVisible: false,
        drawerUsable: false,
        drawerComplete: false,
        cameraComplete: false,
        curtainComplete: false,
        houseView: false,
        phase: 'waiting',
        cameraPhase: state.cameraPhase === 'frontal' ? 'frontal' : 'outbound',
        revision: state.revision + 1,
      };
    case 'view-house':
      return state.active && !state.houseView
        ? {
            ...state,
            houseView: true,
            panelVisible: false,
            drawerUsable: false,
          }
        : state;
    case 'back-to-simulation':
      return state.active && state.houseView ? showDrawer(state) : state;
    case 'close':
      if (!state.active) return state;
      return {
        ...state,
        active: false,
        panelVisible: false,
        drawerUsable: false,
        drawerComplete: false,
        cameraComplete: false,
        curtainComplete: false,
        houseView: state.houseView,
        phase: event.animate
          ? state.phase === 'active' || state.phase === 'revealing'
            ? 'concealing'
            : 'returning'
          : 'covered',
        cameraPhase:
          event.animate && state.cameraPhase !== 'frontal'
            ? 'returning'
            : 'frontal',
        revision: state.revision + 1,
      };
    case 'choreography': {
      const snapshot = event.snapshot;
      if (
        snapshot.revision !== state.revision ||
        (state.active &&
          (snapshot.phase === 'covered' ||
            snapshot.phase === 'concealing' ||
            snapshot.phase === 'returning')) ||
        (!state.active &&
          snapshot.phase !== 'covered' &&
          snapshot.phase !== 'concealing' &&
          snapshot.phase !== 'returning')
      )
        return state;
      const cameraComplete = state.cameraComplete || snapshot.cameraComplete;
      const curtainComplete = state.curtainComplete || snapshot.curtainComplete;
      const revealPhase =
        snapshot.phase === 'revealing' || snapshot.phase === 'active';
      const phase =
        revealPhase && (!cameraComplete || !curtainComplete)
          ? 'camera'
          : snapshot.phase;
      const panelVisible =
        state.active &&
        !state.houseView &&
        revealPhase &&
        cameraComplete &&
        curtainComplete;
      const drawerUsable = panelVisible && snapshot.drawerComplete;
      const cameraPhase: CameraPhase =
        phase === 'covered' || phase === 'waiting' || phase === 'lead-in'
          ? 'frontal'
          : phase === 'returning'
            ? snapshot.cameraProgress > 0
              ? 'returning'
              : 'frontal'
            : phase === 'camera'
              ? 'outbound'
              : 'elevated';
      if (
        phase === state.phase &&
        cameraPhase === state.cameraPhase &&
        cameraComplete === state.cameraComplete &&
        curtainComplete === state.curtainComplete &&
        snapshot.drawerComplete === state.drawerComplete &&
        panelVisible === state.panelVisible &&
        drawerUsable === state.drawerUsable
      )
        return state;
      return {
        ...state,
        phase,
        cameraPhase,
        cameraComplete,
        curtainComplete,
        drawerComplete: snapshot.drawerComplete,
        panelVisible,
        drawerUsable,
      };
    }
    case 'arrival':
      if (
        event.revision !== state.revision ||
        (event.destination === 'elevated') !== state.active ||
        !state.cameraComplete ||
        !state.curtainComplete
      )
        return state;
      return state.cameraPhase === event.destination
        ? state
        : { ...state, cameraPhase: event.destination };
    case 'unavailable':
      return state.active
        ? {
            ...state,
            phase: 'active',
            cameraPhase: 'frontal',
            cameraComplete: true,
            curtainComplete: true,
            drawerComplete: true,
            panelVisible: !state.houseView,
            drawerUsable: !state.houseView,
          }
        : {
            ...initialSimulationState,
            revision: state.revision,
          };
    default: {
      const exhaustive: never = event;
      throw new Error(`Unknown simulation event: ${exhaustive}`);
    }
  }
}
