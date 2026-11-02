import * as appText from '@clog/domain';
/** Saved screenshots stay on the private backend; external proof URLs are historical data only. */
import { safeScreenshotPath, type Submission } from './admin-model.ts';
export function ProofLink({
  source,
  screenshot,
  chatMessage,
}: {
  source: Submission['source'];
  screenshot?: string | null | undefined;
  chatMessage?: string | undefined;
}) {
  if (safeScreenshotPath(screenshot))
    return (
      <div className="submission-proof">
        <a
          href={screenshot}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          <img
            src={screenshot}
            alt={appText.webAdminProofLinkSubmissionScreenshot}
            loading="lazy"
          />
          {appText.webAdminProofLinkViewScreenshot}
        </a>
      </div>
    );
  if (source === 'runelite' && chatMessage?.trim())
    return <span>{appText.webAdminProofLinkChatMessageProof}</span>;
  if (source === 'manual')
    return (
      <span className="admin-note">
        {appText.webAdminProofLinkNoProofSuppliedManualEntry}
      </span>
    );
  return (
    <span className="admin-error">
      {appText.webAdminProofLinkNoScreenshotSuppliedCannotApproveThisClaim}
    </span>
  );
}
