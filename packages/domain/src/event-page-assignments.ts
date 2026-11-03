/** Administrator-only upgrade review; never part of anonymous metadata. */
export interface EventPageAssignmentReview {
  revision: string;
  total: number;
  credits: {
    submissionId: string;
    version: number;
    itemId: number;
    itemName: string;
    collectorName: string;
    collectedOn: string;
    pages: { id: string; name: string; available: boolean }[];
    eligiblePageIds: string[];
    receivedAt: string | null;
  }[];
}
export interface EventPageAssignmentSelection {
  expectedRevision: string;
  assignments: {
    submissionId: string;
    expectedVersion: number;
    eventPageId: string;
  }[];
}
export interface EventPageAssignmentResult {
  assignedIds: string[];
}
