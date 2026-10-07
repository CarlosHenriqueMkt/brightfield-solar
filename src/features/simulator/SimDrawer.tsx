'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
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
  modal = false,
  keepMounted = false,
  liveSummary,
  exportActions,
  resultPreparing = false,
  onInstallation,
  onViewHouse,
  onBillChange,
  onCoverageChange,
  onProfileSelect,
  onStepChange,
  onOpenChange,
}: SimDrawerProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const previousOpen = useRef(open);
  const previousStep = useRef(step);
  const previousPreparing = useRef(resultPreparing);
  useLayoutEffect(() => {
    if (open && (!previousOpen.current || previousStep.current !== step)) {
      if (previousStep.current !== step) {
        heading.current
          ?.closest('section')
          ?.scrollTo({ top: 0, behavior: 'instant' });
      }
      heading.current?.focus({ preventScroll: true });
    }
    if (
      open &&
      step === 'result' &&
      previousPreparing.current &&
      !resultPreparing
    ) {
      const drawer = heading.current?.closest('section');
      const focused = document.activeElement;
      if (
        drawer &&
        focused instanceof HTMLElement &&
        drawer.contains(focused)
      ) {
        const bounds = drawer.getBoundingClientRect();
        const target = focused.getBoundingClientRect();
        const delta =
          target.top < bounds.top + 8
            ? target.top - bounds.top - 8
            : target.bottom > bounds.bottom - 8
              ? target.bottom - bounds.bottom + 8
              : 0;
        if (delta) drawer.scrollBy({ top: delta, behavior: 'instant' });
      }
    }
    previousOpen.current = open;
    previousStep.current = step;
    previousPreparing.current = resultPreparing;
  }, [open, step, resultPreparing]);

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
      <input
        className={styles.range}
        type="range"
        min="40"
        max="600"
        step="10"
        aria-label="Adjust monthly electricity bill"
        value={values.bill || '40'}
        onChange={(event) => onBillChange(event.target.value)}
      />
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
      <input
        className={styles.range}
        type="range"
        min="50"
        max="100"
        step="5"
        aria-label="Adjust solar coverage target"
        value={values.coverage || '50'}
        onChange={(event) => onCoverageChange(event.target.value)}
      />
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
          {resultPreparing ? (
            <div className={styles.preparation}>
              <p
                className={styles.preparationStatus}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className={styles.spinner} aria-hidden="true" />
                Preparing your estimate…
              </p>
            </div>
          ) : (
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
              <div className={styles.notice}>
                <p>{stateIncentiveNote}</p>
                {notices.map((notice) => (
                  <p key={notice}>{notice}</p>
                ))}
              </div>
            </>
          )}
          <button
            className={styles.link}
            type="button"
            onClick={() => onStepChange('edit')}
          >
            {resultPreparing ? 'Back to edit estimate' : 'Edit estimate'}
          </button>
          {!resultPreparing && (
            <details className={styles.explanation}>
              <summary>See how it is calculated</summary>
              <p>{explanation}</p>
            </details>
          )}
        </>
      );
      break;
    default: {
      const exhaustive: never = step;
      throw new Error(`Unknown drawer step: ${exhaustive}`);
    }
  }

  if (!open && !keepMounted) return null;

  return (
    <section
      className={`${styles.drawer} ${!open ? styles.closed : ''}`}
      id={id}
      aria-labelledby={`${id}-title`}
      aria-hidden={!open}
      inert={!open ? true : undefined}
      role={modal && open ? 'dialog' : undefined}
      aria-modal={modal && open ? true : undefined}
      data-sim-drawer-open={open ? 'true' : 'false'}
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
          aria-label="Close simulation"
          onClick={() => onOpenChange(false)}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path
              d="m6 6 12 12M18 6 6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onStepChange(step === 'bill' ? 'coverage' : 'result');
        }}
      >
        {content}
        <div className={styles.resultActions} hidden={step !== 'result'}>
          {!resultPreparing && (
            <a
              className={styles.resultAction}
              href={installationHref}
              onClick={onInstallation}
            >
              See the installation steps
            </a>
          )}
          <button
            className={resultPreparing ? styles.link : styles.resultAction}
            type="button"
            onClick={() => onStepChange('bill')}
          >
            Return to presets
          </button>
          {!resultPreparing && exportActions}
        </div>
      </form>
      {liveSummary && step !== 'result' && (
        <div className={styles.notice}>
          <p>{liveSummary}</p>
          {notices.map((notice) => (
            <p key={notice}>{notice}</p>
          ))}
        </div>
      )}
      {onViewHouse && (
        <button type="button" className={styles.link} onClick={onViewHouse}>
          View house
        </button>
      )}
    </section>
  );
}
