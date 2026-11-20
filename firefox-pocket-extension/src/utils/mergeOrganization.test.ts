import { mergeOrganization } from './mergeOrganization';
import { ItemStatus, ItemType, SavedItem } from './types';

const item = (id: string, extra: Partial<SavedItem> = {}): SavedItem => ({
  id,
  url: `https://example.com/${id}`,
  title: id,
  status: ItemStatus.Unread,
  isFavorite: false,
  type: ItemType.Article,
  tags: [],
  savedAt: '2026-11-20T00:00:00.000Z',
  ...extra,
});

describe('mergeOrganization', () => {
  it('copies the AI folder and tags onto matching items', () => {
    const result = mergeOrganization([item('a')], [item('a', { aiFolder: 'Tech/Web', aiTags: ['react'] })]);
    expect(result).toEqual([item('a', { aiFolder: 'Tech/Web', aiTags: ['react'] })]);
  });

  it('keeps an item saved after the preview was generated', () => {
    const result = mergeOrganization([item('new'), item('a')], [item('a', { aiFolder: 'Tech' })]);
    expect(result.map(i => i.id)).toEqual(['new', 'a']);
  });

  it('does not bring back an item deleted after the preview', () => {
    const result = mergeOrganization([item('a')], [item('a'), item('deleted', { aiFolder: 'X' })]);
    expect(result.map(i => i.id)).toEqual(['a']);
  });

  it('keeps edits made after the preview (archive, favorite)', () => {
    const current = [item('a', { status: ItemStatus.Archived, isFavorite: true })];
    const [merged] = mergeOrganization(current, [item('a', { aiFolder: 'Tech' })]);
    expect(merged.status).toBe(ItemStatus.Archived);
    expect(merged.isFavorite).toBe(true);
    expect(merged.aiFolder).toBe('Tech');
  });

  it('handles an empty preview without touching the list', () => {
    expect(mergeOrganization([item('a')], [])).toEqual([item('a')]);
  });
});
