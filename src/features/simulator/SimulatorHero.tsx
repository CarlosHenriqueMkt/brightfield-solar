'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CityConfig } from '@/domain/cities/city-config';
import { Button } from '@/components/ui/Button';
import type { BrightfieldViewer } from '@/features/scene/viewer';
import type { ChoreographySnapshot } from '@/features/scene/choreography';
import { calculateSolarEstimate, validateSimulationInput } from './finance';
import { SimDrawer } from './SimDrawer';
import type { SimDrawerStep, SimDrawerValues } from './sim-drawer-types';
import { initialSimulationState, simulationReducer } from './simulation-state';
import styles from './SimulatorHero.module.css';

const SceneCanvas = dynamic(() => import('@/features/scene/SceneCanvas'), {
  ssr: false,
});

const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const years = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function SimulatorHero({
  city,
  children,
}: {
  city: CityConfig;
  children: ReactNode;
}) {
  const [simulation, dispatch] = useReducer(
    simulationReducer,
    initialSimulationState,
  );
  const [step, setStep] = useState<SimDrawerStep>('bill');
  const [values, setValues] = useState<SimDrawerValues>({
    bill: '220',
    coverage: '80',
  });
  const [accepted, setAccepted] = useState({ bill: 220, coverage: 80 });
  const [selectedProfile, setSelectedProfile] = useState<number | null>(() => {
    const index = city.householdProfiles.findIndex(
      (profile) => profile.typicalBill === 220,
    );
    return index < 0 ? null : index;
  });
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [introVisible, setIntroVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const safeFocus = useRef<HTMLDivElement>(null);
  const returnControl = useRef<HTMLButtonElement>(null);
  const returnFocusPending = useRef(false);
  const leavingPanel = useRef(false);
  const viewer = useRef<BrightfieldViewer | null>(null);
  const previousChoreography = useRef<ChoreographySnapshot | null>(null);
  const drawerWidth = useRef(340);
  const failedScene = useRef(false);
  const revisionRef = useRef(simulation.revision);
  const simulationRef = useRef(simulation);
  useLayoutEffect(() => {
    revisionRef.current = simulation.revision;
    simulationRef.current = simulation;
  }, [simulation]);
  const estimate = useMemo(
    () => calculateSolarEstimate(city, accepted.bill, accepted.coverage),
    [city, accepted.bill, accepted.coverage],
  );
  const formatted = {
    panelCount: `${estimate.installedPanels} panels`,
    investment: dollars.format(estimate.netCost),
    monthlySavings: dollars.format(estimate.monthlySavings),
    payback: `${years.format(estimate.paybackYears)} years`,
  };
  let draftError: string | null = null;
  try {
    validateSimulationInput(
      values.bill.trim() === '' ? NaN : Number(values.bill),
      values.coverage.trim() === '' ? NaN : Number(values.coverage),
    );
  } catch {
    draftError =
      'Enter a bill from $40 to $600 in steps of $10 and coverage from 50% to 100% in steps of 5. The last valid estimate remains visible until both fields are valid.';
  }
  const summary = `${formatted.panelCount} · ${formatted.investment} after federal credit · ${formatted.monthlySavings}/month · ${formatted.payback} payback`;
  const notices: string[] = [];
  if (estimate.minimumApplied)
    notices.push(
      `Every installation in ${city.city} has a minimum of ${city.minPanels} panels. Your selected usage needs fewer panels, so the minimum applies.`,
    );
  if (estimate.savingsCapped)
    notices.push(
      'Estimated savings stop at the size of your electricity bill.',
    );
  if (estimate.excessCredit)
    notices.push(
      `Energy generated beyond your usage becomes credit with ${city.utilityName}, not cash back.`,
    );
  if (estimate.installedPanels > 51)
    notices.push(
      `Your estimate includes ${estimate.installedPanels} panels. This illustrative roof displays up to 51; the financial calculation includes every panel.`,
    );
  if (sceneError)
    notices.push(
      'The 3D house could not be displayed. Your estimate and choices are still available. Use View house or close the panel to retry the illustration.',
    );
  const copyHidden = simulation.active || simulation.phase !== 'covered';
  const sceneIntent = useMemo(
    () => ({
      active: simulation.active,
      panelCount: estimate.installedPanels,
      reducedMotion,
      revision: simulation.revision,
    }),
    [
      simulation.active,
      simulation.revision,
      estimate.installedPanels,
      reducedMotion,
    ],
  );
  const onChoreography = useCallback((snapshot: ChoreographySnapshot) => {
    if (snapshot.revision !== revisionRef.current || failedScene.current)
      return;
    const host = root.current;
    if (host) {
      const curtain = Math.max(0, Math.min(1, snapshot.curtainProgress));
      const lift =
        curtain <= 0.92
          ? curtain * (0.07 / 0.92)
          : 0.07 + (curtain - 0.92) * (0.93 / 0.08);
      host.style.setProperty('--curtain-progress', String(curtain));
      host.style.setProperty(
        '--curtain-lift',
        `${Math.max(0, Math.min(1, lift)) * 100}%`,
      );
      const drawerProgress = Math.max(0, Math.min(1, snapshot.drawerProgress));
      const drawerInnerWidth = drawerWidth.current;
      host.style.setProperty('--drawer-progress', String(drawerProgress));
      host.style.setProperty(
        '--drawer-reveal-width',
        `${drawerProgress * drawerInnerWidth}px`,
      );
    }
    if (snapshot.phase === 'covered' && !simulationRef.current.active)
      setIntroVisible(true);
    const previous = previousChoreography.current;
    if (
      !previous ||
      previous.revision !== snapshot.revision ||
      previous.phase !== snapshot.phase ||
      previous.cameraComplete !== snapshot.cameraComplete ||
      previous.curtainComplete !== snapshot.curtainComplete ||
      previous.panelsComplete !== snapshot.panelsComplete ||
      previous.drawerComplete !== snapshot.drawerComplete
    ) {
      dispatch({ type: 'choreography', snapshot });
    }
    previousChoreography.current = snapshot;
  }, []);

  const moveFocusOutsidePanel = useCallback(() => {
    leavingPanel.current = true;
    if (!safeFocus.current) return;
    safeFocus.current.removeAttribute('inert');
    safeFocus.current.focus({ preventScroll: true });
  }, []);
  const closeSimulation = useCallback(() => {
    moveFocusOutsidePanel();
    setIntroVisible(false);
    if (!ready || sceneError || reducedMotion) {
      root.current?.style.setProperty('--curtain-progress', '0');
      root.current?.style.setProperty('--curtain-lift', '0%');
      root.current?.style.setProperty('--drawer-progress', '0');
      root.current?.style.setProperty('--drawer-reveal-width', '0px');
      setIntroVisible(true);
    }
    returnFocusPending.current = true;
    dispatch({
      type: 'close',
      animate: ready && !sceneError && !reducedMotion,
    });
  }, [ready, sceneError, reducedMotion, moveFocusOutsidePanel]);
  const openSimulation = useCallback(() => {
    safeFocus.current?.focus({ preventScroll: true });
    const host = root.current;
    if (host) {
      const headerHeight =
        document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      const bounds = host.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight + 1)
        window.scrollTo({
          top: window.scrollY + bounds.top - headerHeight,
          behavior: 'instant',
        });
    }
    if (simulationRef.current.active) {
      dispatch({ type: 'open' });
      if (simulationRef.current.drawerUsable)
        panel.current
          ?.querySelector<HTMLElement>('h3')
          ?.focus({ preventScroll: true });
      return;
    }
    returnFocusPending.current = false;
    dispatch({ type: 'open' });
    if (sceneError) {
      host?.style.setProperty('--curtain-progress', '0');
      host?.style.setProperty('--curtain-lift', '0%');
      host?.style.setProperty('--drawer-progress', '1');
      host?.style.setProperty(
        '--drawer-reveal-width',
        `${drawerWidth.current}px`,
      );
      dispatch({ type: 'unavailable' });
    }
  }, [sceneError]);
  useEffect(() => {
    const host = root.current;
    const header = document.querySelector<HTMLElement>('header');
    if (!host || !header) return;
    const measure = () => {
      host.style.setProperty(
        '--header-height',
        `${Math.max(0, header.getBoundingClientRect().height)}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const host = root.current;
    const drawer = panel.current?.firstElementChild;
    if (!host || !(drawer instanceof HTMLElement)) return;
    const sync = () => {
      drawerWidth.current = drawer.getBoundingClientRect().width;
      const progress = Number(
        host.style.getPropertyValue('--drawer-progress') || '0',
      );
      host.style.setProperty(
        '--drawer-reveal-width',
        `${Math.max(0, progress) * drawerWidth.current}px`,
      );
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(drawer);
    window.addEventListener('resize', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, []);
  useEffect(() => {
    const layout = window.matchMedia('(max-width: 700px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function sync() {
      setMobile(layout.matches);
      setReducedMotion(motion.matches);
    }
    sync();
    layout.addEventListener('change', sync);
    motion.addEventListener('change', sync);
    function launch(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('a[data-open-simulation][href="#solar-estimate"]')
      ) {
        event.preventDefault();
        openSimulation();
      }
    }
    document.addEventListener('click', launch);
    return () => {
      layout.removeEventListener('change', sync);
      motion.removeEventListener('change', sync);
      document.removeEventListener('click', launch);
    };
  }, [openSimulation]);

  useEffect(() => {
    const intro =
      root.current?.querySelectorAll<HTMLElement>('[data-hero-intro]');
    intro?.forEach((element) => {
      element.toggleAttribute('inert', copyHidden);
    });
    if (
      !copyHidden &&
      simulation.phase === 'covered' &&
      !simulation.active &&
      returnFocusPending.current
    ) {
      returnFocusPending.current = false;
      root.current
        ?.querySelector<HTMLElement>('[data-open-simulation]')
        ?.focus({ preventScroll: true });
    }
    return () => {
      intro?.forEach((element) => {
        element.removeAttribute('inert');
      });
    };
  }, [copyHidden, simulation.active, simulation.phase]);

  useEffect(() => {
    if (!simulation.active || simulation.drawerUsable || simulation.houseView)
      return;
    function cancel(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeSimulation();
    }
    document.addEventListener('keydown', cancel);
    return () => document.removeEventListener('keydown', cancel);
  }, [
    simulation.active,
    simulation.drawerUsable,
    simulation.houseView,
    closeSimulation,
  ]);
  useEffect(() => {
    leavingPanel.current = false;
    if (simulation.active && !simulation.panelVisible) {
      (returnControl.current ?? safeFocus.current)?.focus({
        preventScroll: true,
      });
    }
    if (!simulation.drawerUsable || !simulation.panelVisible || !panel.current)
      return;
    const drawer = panel.current;
    if (!drawer.contains(document.activeElement))
      drawer.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
    if (!mobile) return;
    const locked: { element: HTMLElement; previous: boolean }[] = [];
    let child: HTMLElement = drawer;
    while (
      child.parentElement &&
      child.parentElement !== document.documentElement
    ) {
      for (const sibling of child.parentElement.children) {
        if (sibling !== child && sibling instanceof HTMLElement) {
          locked.push({ element: sibling, previous: sibling.inert });
          sibling.setAttribute('inert', '');
        }
      }
      child = child.parentElement;
    }
    const overflow = document.body.style.overflow;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, a[href], summary, select, [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
    function trap(event: KeyboardEvent) {
      if (leavingPanel.current || event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !items.includes(document.activeElement as HTMLElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !items.includes(document.activeElement as HTMLElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    }
    function contain(event: FocusEvent) {
      if (
        !leavingPanel.current &&
        event.target instanceof Node &&
        !drawer.contains(event.target)
      )
        drawer.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
    }
    document.addEventListener('keydown', trap);
    document.addEventListener('focusin', contain);
    return () => {
      document.removeEventListener('keydown', trap);
      document.removeEventListener('focusin', contain);
      locked.forEach(({ element, previous }) => {
        element.toggleAttribute('inert', previous);
      });
      document.body.style.overflow = overflow;
      window.scrollTo(scrollX, scrollY);
    };
  }, [
    simulation.active,
    simulation.panelVisible,
    simulation.drawerUsable,
    mobile,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setAnnouncement(summary), 600);
    return () => window.clearTimeout(timeout);
  }, [summary]);

  const onSceneReady = useCallback(() => {
    failedScene.current = false;
    setReady(true);
    setSceneError(null);
  }, []);
  const onViewer = useCallback((next: BrightfieldViewer | null) => {
    viewer.current = next;
  }, []);
  const onSceneError = useCallback(
    (message: string) => {
      failedScene.current = true;
      setReady(false);
      setSceneError(message);
      previousChoreography.current = null;
      const host = root.current;
      host?.style.setProperty('--curtain-progress', '0');
      host?.style.setProperty('--curtain-lift', '0%');
      const fallbackWidth = drawerWidth.current;
      host?.style.setProperty(
        '--drawer-progress',
        simulation.active ? '1' : '0',
      );
      host?.style.setProperty(
        '--drawer-reveal-width',
        simulation.active ? `${fallbackWidth}px` : '0px',
      );
      dispatch({ type: 'unavailable' });
    },
    [simulation.active],
  );
  const onSceneArrival = useCallback(
    (destination: 'frontal' | 'elevated', revision: number) => {
      dispatch({ type: 'arrival', destination, revision });
    },
    [],
  );

  function updateField(field: 'bill' | 'coverage', value: string) {
    const nextDraft = { ...values, [field]: value };
    setValues(nextDraft);
    if (field === 'bill') setSelectedProfile(null);
    if (!nextDraft.bill.trim() || !nextDraft.coverage.trim()) return;
    const next = {
      bill: Number(nextDraft.bill),
      coverage: Number(nextDraft.coverage),
    };
    try {
      validateSimulationInput(next.bill, next.coverage);
    } catch {
      return;
    }
    setAccepted(next);
  }

  return (
    <div
      id="solar-estimate"
      ref={root}
      className={styles.root}
      data-simulation-active={simulation.active}
      data-camera-phase={simulation.cameraPhase}
      data-copy-hidden={copyHidden}
      data-scene-ready={ready}
      data-intro-visible={introVisible}
      data-house-view={simulation.houseView}
      data-choreography-phase={simulation.phase}
    >
      {children}
      <SceneCanvas
        className={styles.scene}
        intent={sceneIntent}
        onReady={onSceneReady}
        onError={onSceneError}
        onArrival={onSceneArrival}
        onChoreography={onChoreography}
        onViewer={onViewer}
      />
      <div
        ref={safeFocus}
        tabIndex={-1}
        className={styles.safeFocus}
        aria-label="Solar simulation"
      >
        {simulation.cameraPhase === 'returning'
          ? 'Returning to the house view.'
          : simulation.active && !simulation.drawerUsable
            ? 'Preparing your house view.'
            : simulation.active
              ? 'Your solar estimate.'
              : ''}
      </div>
      {simulation.active &&
        !simulation.drawerUsable &&
        !simulation.houseView && (
          <Button className={styles.returnControl} onClick={closeSimulation}>
            Cancel simulation
          </Button>
        )}
      {!simulation.active &&
        (simulation.phase === 'concealing' ||
          simulation.phase === 'returning') && (
          <Button
            className={styles.returnControl}
            onClick={() => openSimulation()}
          >
            Reopen simulation
          </Button>
        )}
      {simulation.active && simulation.houseView && (
        <div className={styles.houseControls}>
          <Button
            ref={returnControl}
            onClick={() => dispatch({ type: 'back-to-simulation' })}
          >
            Back to simulation
          </Button>
          <button className={styles.closeHouse} onClick={closeSimulation}>
            Close simulation
          </button>
        </div>
      )}
      <div
        ref={panel}
        className={styles.panel}
        data-drawer-usable={simulation.drawerUsable}
      >
        <SimDrawer
          id="simulation-panel"
          open={simulation.drawerUsable}
          keepMounted
          step={step}
          values={values}
          profiles={city.householdProfiles}
          selectedProfile={selectedProfile}
          result={formatted}
          notices={notices}
          stateIncentiveNote={city.stateIncentiveNote}
          explanation={`Monthly consumption is your bill divided by ${city.utilityName}'s $${city.utilityRatePerKwh}/kWh rate. Each ${city.panelWatts} W panel generates an estimated ${numbers.format(estimate.generationPerPanelKwh)} kWh/month from ${city.peakSunHoursPerDay} peak sun hours/day and a performance factor of ${city.performanceRatio * 100}%. Panel counts round up, with a minimum of ${city.minPanels} panels. Installation costs $${city.costPerWattInstalled}/W; the ${city.federalCreditRate * 100}% federal credit reduces the investment. Savings are capped at your bill; payback divides net investment by twelve months of capped savings. These are fictional estimates, not tax advice.`}
          installationHref="#installation"
          modal={mobile}
          closeLabel="Close simulation"
          onInstallation={() => {
            moveFocusOutsidePanel();
            dispatch({ type: 'view-house' });
          }}
          liveSummary={draftError ? `${draftError} ${summary}` : summary}
          onViewHouse={
            mobile
              ? () => {
                  moveFocusOutsidePanel();
                  dispatch({ type: 'view-house' });
                }
              : undefined
          }
          onBillChange={(value) => updateField('bill', value)}
          onCoverageChange={(value) => updateField('coverage', value)}
          onProfileSelect={(index) => {
            const profile = city.householdProfiles[index];
            if (!profile) throw new RangeError('Unknown household profile');
            updateField('bill', String(profile.typicalBill));
            setSelectedProfile(index);
          }}
          onStepChange={(next) => {
            if (!draftError) setStep(next);
          }}
          onOpenChange={(open) => {
            if (!open) closeSimulation();
          }}
        />
      </div>
      <p
        className={styles.announcement}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {simulation.active ? announcement : ''}
      </p>
      {sceneError && (
        <div className={styles.sceneError}>
          <p>
            The 3D house could not be displayed. Your estimate and choices are
            still available.
          </p>
          <button type="button" onClick={() => viewer.current?.recover()}>
            Retry 3D house
          </button>
        </div>
      )}
    </div>
  );
}
