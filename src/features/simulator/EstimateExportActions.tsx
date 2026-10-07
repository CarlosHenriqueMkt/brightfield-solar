'use client';

import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import type { EstimateSnapshot } from './estimate-document';
import {
  downloadPreparedEstimate,
  EstimatePdfSession,
  EstimateShareSession,
} from './estimate-export';
import { generateEstimatePdf } from './estimate-pdf';
import styles from './EstimateExportActions.module.css';

type ExportStatus =
  | 'preparing'
  | 'ready'
  | 'sharing'
  | 'downloading'
  | 'downloaded'
  | 'shared'
  | 'cancelled'
  | 'fallback'
  | 'error';

type ExportContext = {
  session: EstimatePdfSession;
  identity: string;
  active: boolean;
  operation: 'preparing' | 'sharing' | 'downloading' | null;
};

type ExportView = {
  identity: string;
  status: ExportStatus;
  message: string;
};

export default function EstimateExportActions({
  snapshot,
  invalidationKey,
  active,
}: {
  snapshot: EstimateSnapshot;
  invalidationKey: string;
  active: boolean;
}) {
  const identity = JSON.stringify([snapshot.key, invalidationKey]);
  const current = useRef<ExportContext | null>(null);
  const nativeShare = useRef<EstimateShareSession | null>(null);
  const statusId = useId();
  const [view, setView] = useState<ExportView | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const prepare = useCallback((context: ExportContext) => {
    if (context.operation) return;
    context.operation = 'preparing';
    void context.session.prepare().then(
      (file) => {
        context.operation = null;
        if (current.current !== context || !file) return;
        setView({
          identity: context.identity,
          status: 'ready',
          message:
            'PDF ready. Activate Download PDF or Share estimate to continue.',
        });
      },
      () => {
        context.operation = null;
        if (current.current !== context) return;
        setView({
          identity: context.identity,
          status: 'error',
          message: 'PDF preparation failed. Activate either action to retry.',
        });
      },
    );
  }, []);

  useLayoutEffect(() => {
    const previous = current.current;
    const session =
      previous?.session ?? new EstimatePdfSession(generateEstimatePdf);
    session.update(snapshot, invalidationKey);
    if (previous?.identity === identity) {
      previous.active = active;
      if (active && !session.fileFor(invalidationKey)) prepare(previous);
      return;
    }
    const context: ExportContext = {
      session,
      identity,
      active,
      operation: null,
    };
    current.current = context;
    if (active) prepare(context);
  }, [snapshot, invalidationKey, identity, active, prepare]);

  useLayoutEffect(
    () => () => {
      current.current?.session.dispose();
      current.current = null;
    },
    [],
  );

  function download(context: ExportContext, file: File, fallback: boolean) {
    context.operation = 'downloading';
    try {
      const cooldown = downloadPreparedEstimate(file);
      setView({
        identity: context.identity,
        status: 'downloading',
        message: fallback
          ? 'File sharing is unavailable in this browser. PDF download started instead. Please wait a moment before starting another.'
          : 'PDF download started. Please wait a moment before starting another.',
      });
      void cooldown.then(() => {
        context.operation = null;
        if (current.current !== context) return;
        setView({
          identity: context.identity,
          status: fallback ? 'fallback' : 'downloaded',
          message: fallback
            ? 'File sharing is unavailable in this browser. PDF download started instead.'
            : 'PDF download started.',
        });
      });
    } catch {
      context.operation = null;
      setView({
        identity: context.identity,
        status: 'error',
        message: fallback
          ? 'File sharing is unavailable and the download failed. Try Download PDF again.'
          : 'Download failed. Try Download PDF again or choose Share estimate.',
      });
    }
  }

  function activate(action: 'download' | 'share') {
    const context = current.current;
    if (!active || !context?.active || context.identity !== identity) return;
    if (nativeShare.current?.busy) return;
    if (context.operation === 'sharing' || context.operation === 'downloading')
      return;
    const file = context.session.fileFor(invalidationKey);
    if (!file || context.operation === 'preparing') {
      setView({
        identity,
        status: 'preparing',
        message:
          'Preparing PDF. When ready, activate your chosen action again.',
      });
      prepare(context);
      return;
    }

    if (action === 'download') {
      download(context, file, false);
      return;
    }

    const shareSession = (nativeShare.current ??= new EstimateShareSession());
    // No preparation await: share() invokes native sharing in this activation.
    const sharing = shareSession.share(file, navigator, window.isSecureContext);
    if (!sharing) return;
    context.operation = 'sharing';
    setShareBusy(true);
    setView({ identity, status: 'sharing', message: 'Opening share options…' });
    void sharing.then(
      (result) => {
        context.operation = null;
        if (current.current) setShareBusy(false);
        if (current.current !== context) return;
        switch (result) {
          case 'shared':
            setView({
              identity,
              status: 'shared',
              message: 'Estimate shared.',
            });
            return;
          case 'cancelled':
            setView({
              identity,
              status: 'cancelled',
              message: 'Sharing cancelled. Your PDF is still ready.',
            });
            return;
          case 'unsupported':
            if (context.active) {
              download(context, file, true);
            } else {
              setView({
                identity,
                status: 'ready',
                message:
                  'File sharing is unavailable. Choose Download PDF when the estimate is open.',
              });
            }
            return;
          default: {
            const unexpected: never = result;
            throw new Error(`Unhandled share result: ${unexpected}`);
          }
        }
      },
      () => {
        context.operation = null;
        if (current.current) setShareBusy(false);
        if (current.current !== context) return;
        setView({
          identity,
          status: 'error',
          message:
            'Sharing failed. Try Share estimate again or choose Download PDF.',
        });
      },
    );
  }

  const status = !active
    ? 'inactive'
    : shareBusy
      ? 'sharing'
      : view?.identity === identity
        ? view.status
        : 'preparing';
  const message = !active
    ? 'PDF actions are available when this estimate is open and the inputs are valid.'
    : shareBusy
      ? 'A share request is still open. Complete or cancel it before exporting again.'
      : view?.identity === identity
        ? view.message
        : 'Preparing your estimate PDF…';
  const busy =
    status === 'preparing' || status === 'sharing' || status === 'downloading';
  const unavailable =
    !active || shareBusy || status === 'sharing' || status === 'downloading';

  return (
    <div className={styles.root} data-status={status}>
      <div
        className={styles.actions}
        role="group"
        aria-label="Export your estimate"
        aria-busy={busy}
      >
        <button
          type="button"
          className={styles.download}
          aria-disabled={unavailable}
          aria-describedby={statusId}
          tabIndex={active ? 0 : -1}
          onClick={() => activate('download')}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 24 24"
            width="18"
            height="18"
          >
            <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
          </svg>
          <span>Download PDF</span>
        </button>
        <button
          type="button"
          className={styles.share}
          aria-disabled={unavailable}
          aria-describedby={statusId}
          tabIndex={active ? 0 : -1}
          onClick={() => activate('share')}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 24 24"
            width="18"
            height="18"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4" />
          </svg>
          <span>Share estimate</span>
        </button>
      </div>
      <p
        id={statusId}
        className={styles.status}
        role={status === 'error' ? 'alert' : 'status'}
        aria-live={status === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        {message}
      </p>
    </div>
  );
}
