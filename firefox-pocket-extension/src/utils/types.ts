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
}

export interface Tag {
  id: string;
  name: string;
}

export interface Message {
  action: 'saveLink' | 'getLinks' | 'getLink' | 'updateLink' | 'deleteLink' | 'getTags' | 'importBookmarks' | 'organizeWithAI' | 'exportToFirefox';
  payload?: any;
}
