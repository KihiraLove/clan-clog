import * as appText from './text.js';
/** Administrator-editable public labels with one shared validation contract. */
export const defaultSiteCopy = {
  collectionTitle: appText.domainSiteCopyCollectionTitle,
  collectionCaption: appText.domainSiteCopyCollectionCaption,
  xpTitle: appText.domainSiteCopyXpTitle,
};
export type SiteCopy = typeof defaultSiteCopy;
export interface HardcoreAppearance {
  clanName: string;
  copy: SiteCopy;
}
export function parseHardcoreAppearance(value: unknown): HardcoreAppearance {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(appText.domainSiteCopyInvalidHardcoreAppearance);
  const data = value as Record<string, unknown>;
  if (
    Object.keys(data).length !== 2 ||
    typeof data.clanName !== 'string' ||
    !data.clanName.trim() ||
    data.clanName.trim().length > 80 ||
    Array.from(data.clanName).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new Error(
      appText.domainSiteCopyHardcoreClanNameMustContain180PrintableCharacters,
    );
  return { clanName: data.clanName.trim(), copy: parseSiteCopy(data.copy) };
}
export function parseSiteCopy(value: unknown): SiteCopy {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(appText.domainSiteCopyInvalidWebsiteText);
  const data = value as Record<string, unknown>;
  const keys = Object.keys(defaultSiteCopy) as (keyof SiteCopy)[];
  if (
    Object.keys(data).length !== keys.length ||
    keys.some(
      (key) =>
        typeof data[key] !== 'string' ||
        !(data[key] as string).trim() ||
        (data[key] as string).length > 160 ||
        Array.from(data[key] as string).some(
          (character) =>
            character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
        ),
    )
  )
    throw new Error(
      appText.domainSiteCopyEachWebsiteTextMustContain1160PrintableCharacters,
    );
  return Object.fromEntries(
    keys.map((key) => [key, (data[key] as string).trim()]),
  ) as SiteCopy;
}
