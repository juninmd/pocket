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
    });
});
