import { htmlToText } from './htmlToText';

describe('htmlToText', () => {
  it('returns visible text and drops script/style content', () => {
    expect(htmlToText('<p>A</p><script>x()</script><style>p{}</style><b>B</b>')).toBe('AB');
    expect(htmlToText('<p>A</p> <p>B</p>')).toBe('A B');
  });

  it('decodes entities and handles empty input', () => {
    expect(htmlToText('<p>a &amp; b</p>')).toBe('a & b');
    expect(htmlToText('')).toBe('');
  });

  it('does not load remote resources', () => {
    const spy = jest.spyOn(window, 'Image');
    htmlToText('<img src="https://tracker.example/pixel.png">');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
