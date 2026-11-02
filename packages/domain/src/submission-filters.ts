import * as appText from './text.js';
export interface SubmissionFilters {
  revision: string;
  filterCollected: boolean;
}

export function parseSubmissionFilters(value: unknown): SubmissionFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(appText.domainSubmissionFiltersInvalidSubmissionFilters);
  const data = value as Record<string, unknown>;
  if (
    typeof data.revision !== 'string' ||
    !/^submission-filters-[1-9][0-9]*$/u.test(data.revision) ||
    typeof data.filterCollected !== 'boolean'
  )
    throw new Error(appText.domainSubmissionFiltersInvalidSubmissionFilters);
  return { revision: data.revision, filterCollected: data.filterCollected };
}
