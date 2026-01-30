import { handleMessage, calculateReadTime, getMetaContent } from './content';
import { Readability } from '@mozilla/readability';

jest.mock('@mozilla/readability');

describe('content script', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('calculateReadTime', () => {
        it('should calculate time correctly', () => {
            const text = new Array(200).fill('word').join(' ');
            expect(calculateReadTime(text)).toBe(1);

            const text2 = new Array(400).fill('word').join(' ');
            expect(calculateReadTime(text2)).toBe(2);
        });

        it('should return at least 1 minute', () => {
            expect(calculateReadTime('')).toBe(1);
        });
    });

    describe('getMetaContent', () => {
        it('should get content from meta tags', () => {
            const meta = document.createElement('meta');
            meta.setAttribute('property', 'og:title');
            meta.content = 'My Title';
            document.head.appendChild(meta);

            expect(getMetaContent('og:title')).toBe('My Title');
        });

        it('should return undefined if not found', () => {
            expect(getMetaContent('og:title')).toBeUndefined();
        });
    });

    describe('handleMessage', () => {
        it('should extract metadata using Readability', async () => {
            const mockArticle = {
                title: 'Parsed Title',
                excerpt: 'Parsed Excerpt',
                siteName: 'Parsed Site',
                byline: 'Parsed Author',
                content: '<p>Content</p>',
                textContent: 'Content'
            };

            (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue(mockArticle)
            }));

            // Mock document clone
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);

            const result: any = await handleMessage({ action: 'getMetadata' });

            expect(result.title).toBe('Parsed Title');
            expect(result.description).toBe('Parsed Excerpt');
            expect(result.siteName).toBe('Parsed Site');
            expect(result.content).toBe('<p>Content</p>');
        });

        it('should fallback to meta tags and DOM if Readability fails partially', async () => {
             (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue({})
            }));
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);
            document.title = "Doc Title";

            // Add fallback article content
            const article = document.createElement('article');
            article.innerHTML = '<p>Fallback Content</p>';
            document.body.appendChild(article);

            const result: any = await handleMessage({ action: 'getMetadata' });

            expect(result.title).toBe('Doc Title');
            expect(result.content).toBe('<p>Fallback Content</p>');
        });

        it('should fallback to main content if article missing', async () => {
             (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue({})
            }));
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);

            const main = document.createElement('main');
            main.innerHTML = '<p>Main Content</p>';
            document.body.appendChild(main);

            const result: any = await handleMessage({ action: 'getMetadata' });
            expect(result.content).toBe('<p>Main Content</p>');
        });

        it('should fallback to body text if readability fails text extraction', async () => {
             (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue({ textContent: null })
            }));
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);
            document.body.textContent = 'Body Text';

            const result: any = await handleMessage({ action: 'getMetadata' });
            // Read time calculation uses textContent.
            // "Body Text" is 2 words.
            expect(result.estimatedReadTime).toBe(1);
        });

        it('should catch errors and return minimal data', async () => {
             jest.spyOn(document, 'cloneNode').mockImplementation(() => {
                 throw new Error('Clone fail');
             });
             document.title = "Minimal";

             const result: any = await handleMessage({ action: 'getMetadata' });
             expect(result.title).toBe('Minimal');
             expect(result.url).toBe('http://localhost/');
        });

        it('should extract favicon', async () => {
             (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue({})
            }));
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);

            const link = document.createElement('link');
            link.rel = 'icon';
            link.href = 'favicon.ico';
            document.head.appendChild(link);

            const result: any = await handleMessage({ action: 'getMetadata' });
            expect(result.favicon).toContain('favicon.ico');
        });

        it('should fallback to default favicon if none found', async () => {
             (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue({})
            }));
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);
            // No link tags added

            const result: any = await handleMessage({ action: 'getMetadata' });
            expect(result.favicon).toContain('/favicon.ico');
        });

        it('should use meta tags if Readability returns minimal info', async () => {
             (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue({}) // No title/excerpt
            }));
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);

            // Add meta tags
            const metaTitle = document.createElement('meta');
            metaTitle.setAttribute('property', 'og:title');
            metaTitle.content = 'Meta Title';
            document.head.appendChild(metaTitle);

            const metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            metaDesc.content = 'Meta Desc';
            document.head.appendChild(metaDesc);

            const result: any = await handleMessage({ action: 'getMetadata' });
            expect(result.title).toBe('Meta Title');
            expect(result.description).toBe('Meta Desc');
        });

        it('should fallback to document title and empty string if all else fails', async () => {
             (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue({})
            }));
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);
            document.title = 'Fallback Title';

            const result: any = await handleMessage({ action: 'getMetadata' });
            expect(result.title).toBe('Fallback Title');
            expect(result.description).toBe('');
        });

        it('should handle null article from Readability', async () => {
             (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue(null)
            }));
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);
            document.title = 'Title';

            const result: any = await handleMessage({ action: 'getMetadata' });
            expect(result.title).toBe('Title');
            expect(result.content).toBe('');
        });

        it('should handle undefined article from Readability', async () => {
             (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue(undefined)
            }));
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);
            document.title = 'Title';

            const result: any = await handleMessage({ action: 'getMetadata' });
            expect(result.content).toBe('');
        });

        it('should handle article with null content', async () => {
             (Readability as unknown as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockReturnValue({ content: null })
            }));
            jest.spyOn(document, 'cloneNode').mockReturnValue(document);

            const result: any = await handleMessage({ action: 'getMetadata' });
            expect(result.content).toBe('');
        });
    });
});
