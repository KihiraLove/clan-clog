import * as appText from '@clog/domain';
import type { CatalogUpdateProposal, CatalogUpdateReview } from '@clog/domain';

export const catalogUpdateGroups = [
  ['pageNames', appText.webCatalogUpdateGroupsPageNameMismatches],
  ['pages', appText.webCatalogUpdateGroupsMissingPages],
  ['items', appText.webCatalogUpdateGroupsMissingItems],
  ['names', appText.webCatalogUpdateGroupsIncorrectItemNames],
  ['ids', appText.webCatalogUpdateGroupsIncorrectItemIds],
  ['links', appText.webCatalogUpdateGroupsMissingItemPageRelationships],
  ['extraLinks', appText.webCatalogUpdateGroupsIncorrectItemPageRelationships],
] as const;
export type CatalogUpdateGroup = (typeof catalogUpdateGroups)[number][0];

const itemIds = appText.webCatalogUpdateGroupsItemIds;

function problem(p: CatalogUpdateProposal) {
  switch (p.kind) {
    case 'createPage':
      return appText.webCatalogUpdateGroupsMissingEntity(p.label);
    case 'createItem':
      return appText.webCatalogUpdateGroupsMissingEntity(
        itemIds(p.label, p.after.split(', ')),
      );
    case 'addLink':
      return appText.webCatalogUpdateGroupsAddLink(
        p.label,
        p.afterLabel ?? p.after,
      );
    case 'removeLink':
      return appText.webCatalogUpdateGroupsRemoveLink(
        p.label,
        p.beforeLabel ?? p.before,
      );
    case 'adopt':
      return appText.webCatalogUpdateGroupsAdopt(p.label);
    case 'pageCategory':
      return appText.webCatalogUpdateGroupsCategoryChange(
        p.label,
        p.before,
        p.after,
      );
    case 'gameIds':
      return appText.webCatalogUpdateGroupsChange(
        itemIds(p.beforeLabel ?? p.label, p.before ? p.before.split(', ') : []),
        itemIds(p.afterLabel ?? p.label, p.after ? p.after.split(', ') : []),
      );
    default:
      return appText.webCatalogUpdateGroupsChange(
        p.before || appText.webCatalogUpdateGroupsMissing,
        p.after || appText.webCatalogUpdateGroupsNone,
      );
  }
}

/** Combine only the pending ID operations; unchanged variants stay out of the diff. */
export function catalogProblemRows(
  proposals: CatalogUpdateProposal[],
  review: CatalogUpdateReview,
) {
  const identity = (p: CatalogUpdateProposal) =>
    JSON.stringify([p.entityKey, p.localId]);
  const names = new Map(
    review.proposals
      .filter((p) => p.kind === 'name')
      .map((p) => [identity(p), p]),
  );
  const ids = new Map<string, CatalogUpdateProposal[]>();
  for (const p of proposals) {
    if (p.kind !== 'addGameId' && p.kind !== 'removeGameId') continue;
    const key = identity(p);
    const changes = ids.get(key) ?? [];
    changes.push(p);
    ids.set(key, changes);
  }
  const shown = new Set<string>();
  return proposals.flatMap((p) => {
    if (p.kind !== 'addGameId' && p.kind !== 'removeGameId')
      return [{ id: p.id, text: problem(p) }];
    const key = identity(p);
    if (shown.has(key)) return [];
    shown.add(key);
    const changes = ids.get(key)!;
    const before = changes
      .filter((p) => p.kind === 'removeGameId')
      .map((p) => p.before)
      .sort((a, b) => Number(a) - Number(b));
    const after = changes
      .filter((p) => p.kind === 'addGameId')
      .map((p) => p.after)
      .sort((a, b) => Number(a) - Number(b));
    return [
      {
        id: p.id,
        text: appText.webCatalogUpdateGroupsChange(
          itemIds(p.beforeLabel ?? names.get(key)?.before ?? p.label, before),
          itemIds(p.afterLabel ?? names.get(key)?.after ?? p.label, after),
        ),
      },
    ];
  });
}

export function proposalGroup(
  p: CatalogUpdateProposal,
): CatalogUpdateGroup | 'icons' {
  switch (p.kind) {
    case 'pageName':
    case 'pageCategory':
      return 'pageNames';
    case 'adoptPage':
    case 'createPage':
      return 'pages';
    case 'createItem':
      return 'items';
    case 'name':
      return 'names';
    case 'gameIds':
    case 'addGameId':
    case 'removeGameId':
      return 'ids';
    case 'adopt':
      return p.before === appText.databaseCatalogUpdateStoreUnlinkedLocalPage
        ? 'pages'
        : 'ids';
    case 'addLink':
      return 'links';
    case 'removeLink':
      return 'extraLinks';
    case 'image':
      return 'icons';
  }
}
export function groupedCatalogReview(review: CatalogUpdateReview) {
  return catalogUpdateGroups
    .map(([key, title]) => ({
      key,
      title,
      proposals: review.proposals.filter((p) => proposalGroup(p) === key),
      conflicts: review.conflicts.filter(
        (c) => (c.kind === 'page' ? 'pages' : 'ids') === key,
      ),
    }))
    .filter((g) => g.proposals.length || g.conflicts.length);
}
export function selectedCatalogProposals(
  review: CatalogUpdateReview,
  groups: ReadonlySet<CatalogUpdateGroup>,
  icons: boolean,
  identities: Record<string, string>,
) {
  return review.proposals
    .filter((p) => {
      const group = proposalGroup(p);
      if (group === 'icons') return icons;
      if (!groups.has(group)) return false;
      if (
        ['adoptPage', 'createPage'].includes(p.kind) &&
        review.pageMatches?.some((m) => m.entityKey === p.entityKey)
      )
        return identities[p.entityKey] === p.id;
      return true;
    })
    .map((p) => p.id)
    .sort();
}
