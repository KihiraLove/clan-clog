import * as appText from './text.js';
/** Public submission instructions, shared across world modes and API/browser validation. */
export const submissionHelpMaxBytes = 32 * 1024;
export const defaultSubmissionHelp =
  appText.domainSubmissionHelpDefaultMarkdown;

export function parseSubmissionHelp(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.includes('\0') ||
    new TextEncoder().encode(value).length > submissionHelpMaxBytes
  )
    throw new Error(
      appText.domainSubmissionHelpSubmissionInstructionsMustBeAtMost32KiBOfUtf,
    );
  return value;
}
