import * as appText from '@clog/domain';
/** Native top-layer dialog preserves the current route, selection and page scroll. */
import { lazy, Suspense, useEffect, useRef } from 'react';
import { defaultSubmissionHelp } from '@clog/domain';
import { RenderBoundary } from './RenderBoundary.tsx';

const HelpMarkdown = lazy(() => import('./HelpMarkdown.tsx'));

export function SubmissionHelpContent({ text }: { text: string }) {
  return (
    <RenderBoundary
      fallback={
        <p>
          {
            appText.webSubmissionHelpInstructionsCouldNotBeDisplayedPleaseAskYourClanStaff
          }
        </p>
      }
    >
      <Suspense
        fallback={
          <p role="status">{appText.webSubmissionHelpLoadingInstructions}</p>
        }
      >
        <HelpMarkdown text={text.trim() ? text : defaultSubmissionHelp} />
      </Suspense>
    </RenderBoundary>
  );
}

export function SubmissionHelp({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const opener = document.activeElement;
    const x = window.scrollX,
      y = window.scrollY;
    element.showModal();
    return () => {
      element.close();
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
      window.scrollTo(x, y);
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="site-dialog submission-help-dialog"
      aria-labelledby="submission-help-title"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const elements = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex="0"]',
          ),
        );
        const first = elements[0],
          last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="submission-help-heading">
        <h2 id="submission-help-title">
          {appText.webSubmissionHelpHowToSubmit}
        </h2>
        <button
          type="button"
          className="site-button"
          aria-label={appText.webSubmissionHelpCloseSubmissionHelp}
          onClick={onClose}
        >
          {appText.webSubmissionHelpCloseSymbol}
        </button>
      </header>
      <div
        className="submission-help-body"
        role="region"
        tabIndex={0}
        aria-label={appText.webSubmissionHelpSubmissionInstructions}
      >
        <SubmissionHelpContent text={text} />
      </div>
    </dialog>
  );
}
