import { SavedItem } from './types';

/**
 * Applies the AI folder/tags from a preview onto the current list.
 * The preview is a snapshot taken before the (slow) AI call: items saved, deleted or edited
 * meanwhile must survive, so only aiFolder/aiTags are copied, matched by id.
 */
export const mergeOrganization = (current: SavedItem[], organized: SavedItem[]): SavedItem[] => {
  const byId = new Map(organized.map(item => [item.id, item]));
  return current.map(item => {
    const suggestion = byId.get(item.id);
    if (!suggestion) return item;
    return { ...item, aiFolder: suggestion.aiFolder, aiTags: suggestion.aiTags };
  });
};
