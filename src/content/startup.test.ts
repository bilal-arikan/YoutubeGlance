/** @jest-environment-options {"url":"https://www.youtube.com/"} */
import * as lifecycle from './playerLifecycle';

it('boots on the homepage and handles a later video without reloading the document', async () => {
  const start = jest.spyOn(lifecycle, 'startPlayerLifecycle');
  const addListener = jest.fn();
  (globalThis as any).chrome = { runtime: {
    onMessage: { addListener },
    sendMessage: jest.fn((_message, callback) => callback()),
  } };
  const manifest = jest.requireActual('../../manifest.json');
  expect(manifest.content_scripts[0].matches).toContain('*://*.youtube.com/*');
  await import('./youtubeDetection');
  expect(addListener).toHaveBeenCalledTimes(1);
  history.pushState({}, '', '/watch?v=abcdefghijk');
  window.dispatchEvent(new Event('yt-navigate-finish'));
  document.body.innerHTML = '<h1><yt-formatted-string>Current video</yt-formatted-string></h1><div id="movie_player"><div class="ytp-right-controls"></div></div>';
  for (let i = 0; i < 5; i++) await Promise.resolve();
  expect(document.querySelectorAll('#yt-glance-btn')).toHaveLength(1);
  const reply = jest.fn();
  addListener.mock.calls[0][0]({ action: 'getVideoInfo' }, {}, reply);
  expect(reply).toHaveBeenCalledWith(expect.objectContaining({ success: true, videoId: 'abcdefghijk', title: 'Current video' }));
  start.mock.results[0].value();
  start.mockRestore();
});
