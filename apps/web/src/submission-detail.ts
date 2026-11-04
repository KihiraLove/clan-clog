/** Staff review snapshots load on demand alongside private evidence. */
import * as appText from '@clog/domain';
import {
  parseSubmission,
  type SubmissionDetail,
  type AuditEntry,
} from './admin-model.ts';
import { object, list, text, timestamp, unique } from './xp-model.ts';
/** Every before/after audit snapshot must refer to the selected submission. */
export function parseDetail(value: unknown): SubmissionDetail {
  const data = object(value),
    submission = parseSubmission(data.submission);
  const audit = list(data.audit).map((entry) => {
    const a = object(entry),
      before = parseSubmission(a.before),
      after = parseSubmission(a.after),
      action = text(a.action);
    if (before.id !== submission.id || after.id !== submission.id)
      throw new Error(appText.webAdminModelUnexpectedAuditIdentity);
    if (!['create', 'edit', 'approve', 'reject', 'revoke'].includes(action))
      throw new Error(appText.webAdminModelInvalidAdminResponse);
    return {
      id: text(a.id),
      actorName: text(a.actorName),
      at: timestamp(a.at),
      action: action as AuditEntry['action'],
      reason: a.reason === null ? null : text(a.reason),
      before,
      after,
    };
  });
  unique(audit.map((a) => a.id));
  if (audit.length > 20)
    throw new Error(appText.webAdminModelAuditPageExceedsSupportedSize);
  return {
    submission,
    audit,
    auditRevision: text(data.auditRevision),
    auditCursor: text(data.auditCursor),
    nextAuditCursor:
      data.nextAuditCursor === null ? null : text(data.nextAuditCursor),
  };
}
