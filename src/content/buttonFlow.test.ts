/** @jest-environment-options {"url":"https://www.youtube.com/watch?v=abcdefghijk"} */
import { injectButton } from './buttonInjection';

describe('Player button flow', () => {
  let sendMessage: jest.Mock;
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  beforeEach(() => {
    history.replaceState({}, '', '/watch?v=abcdefghijk');
    document.body.innerHTML = '<div id="movie_player"><div class="ytp-right-controls"></div></div>';
    sendMessage = jest.fn((message, callback) => callback(message.action === 'extractCaptions'
      ? { success: true, data: { videoId: 'abcdefghijk', videoTitle: 'Test video', transcript: 'Actual captions', trackKind: 'manual' } }
      : { success: true }));
    (globalThis as any).chrome = {
      storage: { local: { get: jest.fn().mockResolvedValue({ selectedPlatform: 'gemini', autoSend: false }) } },
      runtime: { sendMessage },
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: jest.fn().mockRejectedValue(new Error('Clipboard denied')),
    } });
    injectButton();
  });

  it('delivers captions to the selected AI without requiring clipboard access', async () => {
    document.getElementById('yt-glance-btn')!.click();
    await flush();
    const delivery = sendMessage.mock.calls.find(([message]) => message.action === 'openTabAndPaste')![0];
    expect(delivery.url).toBe('https://gemini.google.com/app');
    expect(delivery.data.promptText).toContain('Test video');
    expect(delivery.data.promptText).toContain('Actual captions');
    expect(delivery.data.autoSend).toBe(false);
    expect(document.getElementById('yt-glance-btn')!.dataset.loading).toBe('false');
  });

  it('discards captions if the user changes videos while extraction is pending', async () => {
    let reply: Function | undefined;
    sendMessage.mockImplementation((_message, callback) => { reply = callback; });
    document.getElementById('yt-glance-btn')!.click();
    await flush();
    history.pushState({}, '', '/watch?v=12345678901');
    reply!({ success: true, data: { videoId: 'abcdefghijk', transcript: 'Old captions' } });
    await flush();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.yt-glance-notification')!.textContent).toContain('video changed');
  });

  it('releases the loading state and exposes storage/context failures', async () => {
    (chrome.storage.local.get as jest.Mock).mockRejectedValue(new Error('Extension context invalidated'));
    document.getElementById('yt-glance-btn')!.click();
    await flush();
    expect(document.getElementById('yt-glance-btn')!.dataset.loading).toBe('false');
    expect(document.querySelector('.yt-glance-notification')!.textContent).toContain('Extension context invalidated');
  });
});
