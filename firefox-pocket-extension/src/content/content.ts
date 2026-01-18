import browser from 'webextension-polyfill';

function getMetaContent(property: string): string | undefined {
  const element = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
  return element?.getAttribute('content') || undefined;
}

function calculateReadTime(): number {
  const text = document.body.innerText;
  const wpm = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wpm);
}

browser.runtime.onMessage.addListener((message: any) => {
  if (message.action === 'getMetadata') {
    const title = getMetaContent('og:title') || document.title;
    const description = getMetaContent('og:description') || getMetaContent('description');
    const imageUrl = getMetaContent('og:image');
    const siteName = getMetaContent('og:site_name');
    const author = getMetaContent('author') || getMetaContent('article:author');
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
