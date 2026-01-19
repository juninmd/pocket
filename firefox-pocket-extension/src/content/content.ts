import browser from 'webextension-polyfill';

function getMetaContent(...properties: string[]): string | undefined {
  for (const property of properties) {
    const element = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
    const content = element?.getAttribute('content');
    if (content) return content;
  }
  return undefined;
}

function calculateReadTime(): number {
  // Try to find the main content to avoid counting navigation/footer words
  const article = document.querySelector('article') || document.querySelector('main') || document.body;
  const text = (article as HTMLElement).innerText;
  const wpm = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wpm));
}

browser.runtime.onMessage.addListener((message: any) => {
  if (message.action === 'getMetadata') {
    const title = getMetaContent('og:title', 'twitter:title') || document.title;
    const description = getMetaContent('og:description', 'twitter:description', 'description');
    const imageUrl = getMetaContent('og:image', 'twitter:image', 'twitter:image:src');
    const siteName = getMetaContent('og:site_name', 'application-name');
    const author = getMetaContent('author', 'article:author', 'twitter:creator');
    const estimatedReadTime = calculateReadTime();

    return Promise.resolve({
      title,
      description,
      imageUrl,
      siteName,
      author,
      estimatedReadTime
    });
  }
});
