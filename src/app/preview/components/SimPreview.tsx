'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { CityConfig } from '@/domain/cities/city-config';
import { SimDrawer } from '@/features/simulator/SimDrawer';
import type {
  SimDrawerStep,
  SimDrawerValues,
} from '@/features/simulator/sim-drawer-types';
import { presentationFixtures } from './presentation-fixtures';
import styles from './preview.module.css';

export function SimPreview({
  city,
  id,
  initialStep = 'bill',
  initiallyOpen = true,
  initialFixture = 'standard',
  embedded = false,
}: {
  city: Pick<CityConfig, 'householdProfiles' | 'stateIncentiveNote'>;
  id: string;
  initialStep?: SimDrawerStep;
  initiallyOpen?: boolean;
  initialFixture?: keyof typeof presentationFixtures;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [openedBefore, setOpenedBefore] = useState(initiallyOpen);
  const [step, setStep] = useState<SimDrawerStep>(initialStep);
  const [fixtureName, setFixtureName] = useState(initialFixture);
  const fixture = presentationFixtures[fixtureName];
  const [values, setValues] = useState<SimDrawerValues>(fixture.values);
  const [selectedProfile, setSelectedProfile] = useState<number | null>(() => {
    const index = city.householdProfiles.findIndex(
      (profile) => String(profile.typicalBill) === fixture.values.bill,
    );
    return index < 0 ? null : index;
  });
  const launcher = useRef<HTMLButtonElement>(null);

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) setOpenedBefore(true);
    else launcher.current?.focus({ preventScroll: true });
  }

  return (
    <div className={styles.simPreview}>
      <div className={styles.actions}>
        <Button
          ref={launcher}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => changeOpen(!open)}
        >
          {open
            ? 'View visual reference'
            : openedBefore
              ? 'Back to estimate'
              : 'See my solar estimate'}
        </Button>
        {embedded && (
          <p className={styles.helper}>
            Start with your average monthly electricity bill.
          </p>
        )}
      </div>
      <div className={`${styles.stage} ${embedded ? styles.heroStage : ''}`}>
        {!embedded && (
          <p className={styles.sceneLabel}>
            Neutral scene placeholder · no renderer
          </p>
        )}
        <SimDrawer
          id={id}
          open={open}
          step={step}
          values={values}
          profiles={city.householdProfiles}
          selectedProfile={selectedProfile}
          result={fixture.result}
          notices={fixture.notices}
          stateIncentiveNote={city.stateIncentiveNote}
          explanation="This preview uses fixed fictional presentation fixtures from the approved export. Changing the inputs does not calculate or update these financial values. The pure calculation will be implemented in WEB 03."
          installationHref="#process-preview"
          onBillChange={(bill) => {
            setValues((current) => ({ ...current, bill }));
            setSelectedProfile(null);
          }}
          onCoverageChange={(coverage) =>
            setValues((current) => ({ ...current, coverage }))
          }
          onProfileSelect={(index) => {
            const profile = city.householdProfiles[index];
            if (!profile)
              throw new RangeError('Unknown household profile index');
            setValues((current) => ({
              ...current,
              bill: String(profile.typicalBill),
            }));
            setSelectedProfile(index);
          }}
          onStepChange={setStep}
          onOpenChange={changeOpen}
        />
      </div>
      {!embedded && (
        <div className={styles.fixtureControl}>
          <label htmlFor={`${id}-fixture`}>
            Presentation fixture (no calculation)
          </label>
          <select
            id={`${id}-fixture`}
            value={fixtureName}
            onChange={(event) => {
              const next = event.target.value;
              if (next !== 'standard' && next !== 'minimum') return;
              setFixtureName(next);
              setValues(presentationFixtures[next].values);
              setSelectedProfile(null);
            }}
          >
            <option value="standard">Approved result · fictional</option>
            <option value="minimum">Minimum and savings cap · fictional</option>
          </select>
          <p>
            {fixture.label}. Inputs, step and selection survive
            closing/reopening; the result is a fixed fixture.
          </p>
        </div>
      )}
    </div>
  );
}
