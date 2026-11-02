import * as appText from './text.js';
/** Canonical WOM identifiers, collection-log display order and local icon metadata. */
export const skills = [
  ['attack', appText.domainSkillsAttack, 'attack.webp'],
  ['hitpoints', appText.domainSkillsHitpoints, 'hitpoints.webp'],
  ['mining', appText.domainSkillsMining, 'mining.webp'],
  ['strength', appText.domainSkillsStrength, 'strength.webp'],
  ['agility', appText.domainSkillsAgility, 'agility.webp'],
  ['smithing', appText.domainSkillsSmithing, 'smithing.webp'],
  ['defence', appText.domainSkillsDefence, 'defence.webp'],
  ['herblore', appText.domainSkillsHerblore, 'herblore.webp'],
  ['fishing', appText.domainSkillsFishing, 'fishing.webp'],
  ['ranged', appText.domainSkillsRanged, 'ranged.webp'],
  ['thieving', appText.domainSkillsThieving, 'thieving.webp'],
  ['cooking', appText.domainSkillsCooking, 'cooking.webp'],
  ['prayer', appText.domainSkillsPrayer, 'prayer.webp'],
  ['crafting', appText.domainSkillsCrafting, 'crafting.webp'],
  ['firemaking', appText.domainSkillsFiremaking, 'firemaking.webp'],
  ['magic', appText.domainSkillsMagic, 'magic.webp'],
  ['fletching', appText.domainSkillsFletching, 'fletching.webp'],
  ['woodcutting', appText.domainSkillsWoodcutting, 'woodcutting.webp'],
  ['runecrafting', appText.domainSkillsRunecraft, 'runecraft.webp'],
  ['slayer', appText.domainSkillsSlayer, 'slayer.webp'],
  ['farming', appText.domainSkillsFarming, 'farming.webp'],
  ['construction', appText.domainSkillsConstruction, 'construction.webp'],
  ['hunter', appText.domainSkillsHunter, 'hunter.webp'],
  ['sailing', appText.domainSkillsSailing, 'sailing.webp'],
] as const;
export type Skill = (typeof skills)[number][0];
export const skillIds: readonly Skill[] = skills.map(([id]) => id);
export const isSkill = (value: unknown): value is Skill =>
  skillIds.some((id) => id === value);
export const skillName = (id: Skill) => skills.find(([key]) => key === id)![1];
export const skillIcon = (id: Skill) =>
  '/skills/' + skills.find(([key]) => key === id)![2];
