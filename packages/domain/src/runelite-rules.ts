import * as appText from './text.js';
import {
  blockedRuneLiteWorldTypes,
  hardcoreRuneLiteWorldTypes,
} from './world-types.js';

export type WorldPolicy = 'reject' | 'review' | 'allow';
export const runeLiteClanNameLimit = 20;
export interface RuneLiteRules {
  matchClanName: boolean;
  clanNames: string[];
  worldPolicies: {
    f2p: WorldPolicy;
    pvp: WorldPolicy;
    members: Exclude<WorldPolicy, 'reject'>;
    hardcore: Exclude<WorldPolicy, 'reject'>;
  };
  playerWhitelist: string[];
}
export interface RuneLiteSettings extends RuneLiteRules {
  revision: string;
  clanKeyRequirement?: { enabled: boolean; revision: string };
}
export interface RuneLiteSettingsUpdate extends RuneLiteRules {
  expectedRevision: string;
  clanKeyRequirement?: { enabled: boolean; expectedRevision: string };
}
export function defaultRuneLiteRules(clanName: string): RuneLiteRules {
  return {
    matchClanName: true,
    clanNames: clanName ? [clanName] : [],
    worldPolicies: {
      f2p: 'review',
      pvp: 'review',
      members: 'review',
      hardcore: 'review',
    },
    playerWhitelist: [],
  };
}
/** RuneScape names treat underscores and nonbreaking spaces as spaces. */
export const normalizePlayerName = (name: string) =>
  name
    .replace(/[_\u00a0]/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLowerCase();

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(appText.domainRuneliteRulesInvalidRuneLiteSettings);
  return value as Record<string, unknown>;
}
const validName = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= 80 &&
  !Array.from(value).some(
    (character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  );
export const normalizeRuneLiteClanName = (name: string) =>
  name.trim().toLowerCase();

export function parseRuneLiteClanNames(value: unknown, required: boolean) {
  if (!Array.isArray(value) || value.length > runeLiteClanNameLimit)
    throw new Error(
      appText.domainRuneliteRulesClanNameLimit(runeLiteClanNameLimit),
    );
  if (required && value.length === 0)
    throw new Error(appText.domainRuneliteRulesClanNameRequired);
  const names = new Map<string, string>();
  for (const name of value) {
    if (!validName(name))
      throw new Error(appText.domainRuneliteRulesInvalidClanName);
    const normalized = normalizeRuneLiteClanName(name);
    if (names.has(normalized))
      throw new Error(appText.domainRuneliteRulesDuplicateClanName);
    names.set(normalized, name.trim());
  }
  return [...names.values()];
}

export function parseStoredRuneLiteRules(value: unknown): RuneLiteRules {
  const data = record(value);
  if ('clanName' in data && !('clanNames' in data)) {
    const { clanName, ...rules } = data;
    return parseRuneLiteRules({ ...rules, clanNames: [clanName] });
  }
  return parseRuneLiteRules(data);
}

export function parseRuneLiteRules(value: unknown): RuneLiteRules {
  const data = record(value),
    policies = record(data.worldPolicies);
  if (
    Object.keys(data).some(
      (key) =>
        ![
          'matchClanName',
          'clanNames',
          'worldPolicies',
          'playerWhitelist',
        ].includes(key),
    ) ||
    typeof data.matchClanName !== 'boolean' ||
    Object.keys(policies).some(
      (key) => !['f2p', 'pvp', 'members', 'hardcore'].includes(key),
    ) ||
    typeof policies.f2p !== 'string' ||
    !['reject', 'review', 'allow'].includes(policies.f2p) ||
    typeof policies.pvp !== 'string' ||
    !['reject', 'review', 'allow'].includes(policies.pvp) ||
    typeof policies.members !== 'string' ||
    !['review', 'allow'].includes(policies.members) ||
    typeof policies.hardcore !== 'string' ||
    !['review', 'allow'].includes(policies.hardcore) ||
    !Array.isArray(data.playerWhitelist) ||
    data.playerWhitelist.length > 200 ||
    !data.playerWhitelist.every(
      (name) => validName(name) && normalizePlayerName(name).length > 0,
    )
  )
    throw new Error(
      appText.domainRuneliteRulesInvalidRuneLiteSettingsUseValidNamesAndWorldPoliciesWith,
    );
  const names = new Map<string, string>();
  for (const name of data.playerWhitelist as string[])
    names.set(normalizePlayerName(name), name.trim());
  return {
    matchClanName: data.matchClanName,
    clanNames: parseRuneLiteClanNames(data.clanNames, data.matchClanName),
    worldPolicies: {
      f2p: policies.f2p as WorldPolicy,
      pvp: policies.pvp as WorldPolicy,
      members: policies.members as 'review' | 'allow',
      hardcore: policies.hardcore as 'review' | 'allow',
    },
    playerWhitelist: [...names.values()],
  };
}
export function parseRuneLiteSettings(value: unknown): RuneLiteSettings {
  const { revision, clanKeyRequirement, ...rules } = record(value);
  if (typeof revision !== 'string' || !/^runelite-[1-9][0-9]*$/u.test(revision))
    throw new Error(appText.domainRuneliteRulesInvalidRuneLiteSettingsRevision);
  let requirement: RuneLiteSettings['clanKeyRequirement'];
  if (clanKeyRequirement !== undefined) {
    const key = record(clanKeyRequirement);
    if (
      Object.keys(key).some(
        (name) => !['enabled', 'revision'].includes(name),
      ) ||
      typeof key.enabled !== 'boolean' ||
      typeof key.revision !== 'string' ||
      !/^clan-key-[1-9][0-9]*$/u.test(key.revision)
    )
      throw new Error(appText.domainRuneliteRulesInvalidClanApiKeyRequirement);
    requirement = { enabled: key.enabled, revision: key.revision };
  }
  return {
    revision,
    ...parseRuneLiteRules(rules),
    ...(requirement ? { clanKeyRequirement: requirement } : {}),
  };
}
/** Rejections always win. Review wins over allow; a whitelist can then grant approval. */
export function runeLiteDecision(
  types: readonly string[],
  username: string,
  rules: RuneLiteRules,
) {
  const blocked = types.find((type) =>
    blockedRuneLiteWorldTypes.includes(type),
  );
  if (blocked)
    return {
      action: 'reject' as const,
      reason:
        appText.domainRuneliteRulesSubmissionsFromWorldsAreNotAllowed(blocked),
    };
  const policies: [string, WorldPolicy][] = [];
  if (types.includes('F2P')) policies.push(['F2P', rules.worldPolicies.f2p]);
  if (types.includes('PVP')) policies.push(['PVP', rules.worldPolicies.pvp]);
  if (types.includes('MEMBERS'))
    policies.push(['MEMBERS', rules.worldPolicies.members]);
  if (
    types.some((type) =>
      (hardcoreRuneLiteWorldTypes as readonly string[]).includes(type),
    )
  )
    policies.push(['hardcore', rules.worldPolicies.hardcore]);
  const rejected = policies.find(([, action]) => action === 'reject');
  if (rejected)
    return {
      action: 'reject' as const,
      reason: appText.domainRuneliteRulesSubmissionsFromWorldsAreNotAllowed2(
        rejected[0],
      ),
    };
  if (
    rules.playerWhitelist.some(
      (name) => normalizePlayerName(name) === normalizePlayerName(username),
    )
  )
    return {
      action: 'allow' as const,
      reason: appText.domainRuneliteRulesAutomaticallyApprovedPlayerWhitelist,
    };
  if (policies.length && policies.every(([, action]) => action === 'allow'))
    return {
      action: 'allow' as const,
      reason: appText.domainRuneliteRulesAutomaticallyApprovedWorldPolicies(
        policies.map(([type]) => type).join(', '),
      ),
    };
  return {
    action: 'review' as const,
    reason: appText.domainRuneliteRulesAwaitingStaffReview,
  };
}
