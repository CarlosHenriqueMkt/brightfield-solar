'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import type { SimDrawerProps } from './sim-drawer-types';
import styles from './SimDrawer.module.css';

export function SimDrawer({
  id,
  open,
  step,
  values,
  profiles,
  selectedProfile,
  result,
  notices,
  stateIncentiveNote,
  explanation,
  installationHref,
  onBillChange,
  onCoverageChange,
  onProfileSelect,
  onStepChange,
  onOpenChange,
}: SimDrawerProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const previousOpen = useRef(open);
  const previousStep = useRef(step);
  useEffect(() => {
    if (open && (!previousOpen.current || previousStep.current !== step)) {
      heading.current?.focus({ preventScroll: true });
    }
    previousOpen.current = open;
    previousStep.current = step;
  }, [open, step]);

  const billField = (
    <div className={styles.field}>
      <label htmlFor={`${id}-bill`}>Average monthly electricity bill</label>
      <div className={styles.inputWrap}>
        <span aria-hidden="true">$</span>
        <input
          id={`${id}-bill`}
          name="bill"
          type="number"
          inputMode="decimal"
          min="40"
          max="600"
          step="10"
          required
          value={values.bill}
          onChange={(event) => onBillChange(event.target.value)}
          aria-describedby={`${id}-bill-help`}
        />
      </div>
      <p id={`${id}-bill-help`} className={styles.fieldHelp}>
        $40–$600 · increments of $10
      </p>
    </div>
  );
  const coverageField = (
    <div className={styles.field}>
      <label htmlFor={`${id}-coverage`}>Solar coverage target</label>
      <div className={`${styles.inputWrap} ${styles.percentage}`}>
        <input
          id={`${id}-coverage`}
          name="coverage"
          type="number"
          inputMode="numeric"
          min="50"
          max="100"
          step="5"
          required
          value={values.coverage}
          onChange={(event) => onCoverageChange(event.target.value)}
          aria-describedby={`${id}-coverage-help`}
        />
        <span aria-hidden="true">%</span>
      </div>
      <p id={`${id}-coverage-help`} className={styles.fieldHelp}>
        50%–100% · increments of 5 percentage points
      </p>
    </div>
  );

  let title: string;
  let content: ReactNode;
  switch (step) {
    case 'bill':
      title = 'From your bill to a clearer picture.';
      content = (
        <>
          <p className={styles.progress}>1 / 2</p>
          {billField}
          <fieldset className={styles.profiles}>
            <legend>Household profiles</legend>
            {profiles.map((profile, index) => (
              <button
                key={profile.label}
                type="button"
                aria-pressed={selectedProfile === index}
                onClick={() => onProfileSelect(index)}
              >
                {profile.label} · ${profile.typicalBill}
              </button>
            ))}
          </fieldset>
          <Button className={styles.primaryAction} type="submit">
            Continue
          </Button>
          <button className={styles.link} type="submit">
            Next: Solar coverage target
          </button>
        </>
      );
      break;
    case 'coverage':
      title = 'From your bill to a clearer picture.';
      content = (
        <>
          <p className={styles.progress}>2 / 2</p>
          {coverageField}
          <Button className={styles.primaryAction} type="submit">
            Continue
          </Button>
          <button
            className={styles.link}
            type="button"
            onClick={() => onStepChange('bill')}
          >
            Back
          </button>
          <p className={styles.notice}>
            Illustrative panel layout. Your estimate is shown in the numbers.
          </p>
        </>
      );
      break;
    case 'edit':
      title = 'Edit estimate';
      content = (
        <>
          {billField}
          {coverageField}
          <Button className={styles.primaryAction} type="submit">
            Continue
          </Button>
          <button
            className={styles.link}
            type="button"
            onClick={() => onStepChange('result')}
          >
            Back
          </button>
        </>
      );
      break;
    case 'result':
      title = 'Your solar estimate';
      content = (
        <>
          <dl className={styles.results}>
            <div>
              <dt>Number of panels</dt>
              <dd>{result.panelCount}</dd>
            </div>
            <div>
              <dt>Investment after federal credit</dt>
              <dd>{result.investment}</dd>
            </div>
            <div>
              <dt>Estimated monthly savings</dt>
              <dd>{result.monthlySavings}</dd>
            </div>
            <div>
              <dt>Estimated payback</dt>
              <dd>{result.payback}</dd>
            </div>
          </dl>
          <p className={styles.notice}>{stateIncentiveNote}</p>
          {notices.map((notice) => (
            <p className={styles.notice} key={notice}>
              {notice}
            </p>
          ))}
          <Button
            className={styles.primaryAction}
            onClick={() => onStepChange('edit')}
          >
            Edit estimate
          </Button>
          <details className={styles.explanation}>
            <summary>See how it is calculated</summary>
            <p>{explanation}</p>
          </details>
          <a className={styles.link} href={installationHref}>
            See the installation steps
          </a>
        </>
      );
      break;
    default: {
      const exhaustive: never = step;
      throw new Error(`Unknown drawer step: ${exhaustive}`);
    }
  }

  if (!open) return null;

  return (
    <section
      className={styles.drawer}
      id={id}
      aria-labelledby={`${id}-title`}
      data-sim-drawer-open="true"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onOpenChange(false);
        }
      }}
    >
      <header className={styles.top}>
        <h3 id={`${id}-title`} ref={heading} tabIndex={-1}>
          {title}
        </h3>
        <button
          type="button"
          className={styles.close}
          aria-label="Close estimate"
          onClick={() => onOpenChange(false)}
        >
          Close <span aria-hidden="true">×</span>
        </button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onStepChange(step === 'bill' ? 'coverage' : 'result');
        }}
      >
        {content}
      </form>
    </section>
  );
}
