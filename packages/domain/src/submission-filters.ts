import * as appText from './text.js';
export const repeatCollectorPolicies = ['reject', 'separate', 'merge'] as const;
export type RepeatCollectorPolicy = (typeof repeatCollectorPolicies)[number];
export function parseRepeatCollectorPolicy(
  value: unknown = 'separate',
): RepeatCollectorPolicy {
  if (!repeatCollectorPolicies.includes(value as RepeatCollectorPolicy))
    throw new Error(appText.domainSubmissionFiltersInvalidSubmissionFilters);
  return value as RepeatCollectorPolicy;
}
export interface SubmissionFilters {
  revision: string;
  filterCollected: boolean;
  repeatCollectorPolicy: RepeatCollectorPolicy;
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
  return {
    revision: data.revision,
    filterCollected: data.filterCollected,
    repeatCollectorPolicy: parseRepeatCollectorPolicy(
      data.repeatCollectorPolicy,
    ),
  };
}
