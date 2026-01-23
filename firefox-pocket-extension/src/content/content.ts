import browser from 'webextension-polyfill';
import { Readability } from '@mozilla/readability';

function getMetaContent(...properties: string[]): string | undefined {
  for (const property of properties) {
    const element = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
    const content = element?.getAttribute('content');
    if (content) return content;
  }
  return undefined;
}

function calculateReadTime(text: string): number {
  const wpm = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wpm));
}

browser.runtime.onMessage.addListener((message: any) => {
  if (message.action === 'getMetadata') {
    try {
      // Clone document to avoid modifying the live page
      const documentClone = document.cloneNode(true) as Document;
      const reader = new Readability(documentClone);
      const article = reader.parse();

      // Fallback or additional metadata
      const title = article?.title || getMetaContent('og:title', 'twitter:title') || document.title;
      const description = article?.excerpt || getMetaContent('og:description', 'twitter:description', 'description') || '';
      const imageUrl = getMetaContent('og:image', 'twitter:image', 'twitter:image:src');
      const siteName = article?.siteName || getMetaContent('og:site_name', 'application-name');
      const author = article?.byline || getMetaContent('author', 'article:author', 'twitter:creator');

      let content = article?.content || '';
      if (!content) {
        // Very basic fallback if readability fails
        content = document.querySelector('article')?.innerHTML || document.querySelector('main')?.innerHTML || '';
      }

      // Extract favicon
      const faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
        || document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement
        || document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      const favicon = faviconLink?.href || `${window.location.origin}/favicon.ico`;

      const textContent = article?.textContent || document.body.innerText;
      const estimatedReadTime = calculateReadTime(textContent);

      return Promise.resolve({
        title,
        description, // Mapping excerpt to description/excerpt
        excerpt: description,
        imageUrl,
        siteName,
        author,
        estimatedReadTime,
        content,
        favicon
      });
    } catch (e) {
      console.error("Readability parsing failed", e);
      // Fallback to minimal data
      return Promise.resolve({
        title: document.title,
        url: window.location.href
      });
    }
  }
});
