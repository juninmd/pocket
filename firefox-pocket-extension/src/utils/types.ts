// Types for the application

export enum ItemStatus {
  Unread = 'unread',
  Archived = 'archived'
}

export enum ItemType {
  Article = 'article',
  Video = 'video',
  Image = 'image'
}

export interface SavedItem {
  id: string;
  url: string;
  title: string;
  excerpt?: string;
  imageUrl?: string;
  status: ItemStatus;
  isFavorite: boolean;
  type: ItemType;
  tags: string[];
  savedAt: string;
  readAt?: string;
  estimatedReadTime?: number; // in minutes
  siteName?: string;
  author?: string;
  content?: string; // HTML content of the article
  snapshotUrl?: string; // Data URI of the screenshot
  originalFolder?: string; // Folder path if imported from bookmarks
  aiFolder?: string; // Suggested folder by AI
  aiTags?: string[]; // Tags suggested by AI
  favicon?: string; // Site favicon URL
}

export interface Tag {
  id: string;
  name: string;
}

export type Message =
  | { action: 'saveLink'; payload: { url: string; title?: string;[key: string]: any } }
  | { action: 'getLinks'; payload?: any }
  | { action: 'getLink'; payload: { url: string } }
  | { action: 'updateLink'; payload: { id: string; updates: Partial<SavedItem> } }
  | { action: 'deleteLink'; payload: { id?: string; url?: string } }
  | { action: 'getTags'; payload?: any }
  | { action: 'importBookmarks'; payload?: any }
  | { action: 'organizeWithAI'; payload: { apiKey: string } }
  | { action: 'previewOrganization'; payload: { apiKey: string } } // New
  | { action: 'applyOrganization'; payload: { items: SavedItem[] } } // New
  | { action: 'exportToFirefox'; payload?: any }
  | { action: 'organizeAndExportAI'; payload: { apiKey: string } }
  | { action: 'itemsUpdated'; payload?: any };
