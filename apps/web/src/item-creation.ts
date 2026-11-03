/** Creation-only validation stays with the lazy staff editor. */
import * as appText from '@clog/domain';
import type { CreateItem } from './admin-model.ts';
import type { Catalog } from './model.ts';
export function validateItem(fields: CreateItem, catalog: Catalog): CreateItem {
  const name = fields.name.trim();
  if (!name || name.length > 200)
    throw new Error(appText.webAdminModelEnterAnItemNameOf1200Characters);
  if (
    Object.hasOwn(fields, 'iconAssetId') &&
    (typeof fields.iconAssetId !== 'string' || !fields.iconAssetId.trim())
  )
    throw new Error(appText.webAdminModelChooseAndUploadAnItemIcon);
  if (
    !fields.gameItemIds?.length ||
    fields.gameItemIds.length > 100 ||
    new Set(fields.gameItemIds).size !== fields.gameItemIds.length ||
    fields.gameItemIds.some(
      (id) => !Number.isInteger(id) || id < 1 || id > 2147483647,
    )
  )
    throw new Error(appText.webAdminModelEnterDistinctPositiveInGameItemIds);
  if (
    !fields.pageIds.length ||
    new Set(fields.pageIds).size !== fields.pageIds.length ||
    fields.pageIds.some((id) => !catalog.pages.some((page) => page.id === id))
  )
    throw new Error(
      appText.webAdminModelSelectOneOrMoreExistingCollectionLogPages,
    );
  return { ...fields, name };
}
