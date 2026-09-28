/** @jest-environment-options {"url":"https://www.youtube.com/"} */
import { startPlayerLifecycle } from './playerLifecycle';
import { getVideoId } from './videoLocation';

describe('YouTube navigation lifecycle', () => {
  let stop: () => void;
  const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
  const player = () => {
    document.body.innerHTML = '<div id="movie_player"><div class="ytp-right-controls"></div></div>';
  };
  const navigate = (path: string) => {
    window.dispatchEvent(new Event('yt-navigate-start'));
    history.pushState({}, '', path);
    window.dispatchEvent(new Event('yt-navigate-finish'));
  };
  beforeEach(() => {
    document.body.innerHTML = '';
    history.replaceState({}, '', '/');
  });
  afterEach(() => stop?.());

  it('adds the control after home-to-watch navigation with a late player', async () => {
    stop = startPlayerLifecycle();
    navigate('/watch?v=abcdefghijk');
    expect(document.getElementById('yt-glance-btn')).toBeNull();
    player();
    await flush();
    expect(document.querySelectorAll('#yt-glance-btn')).toHaveLength(1);
  });

  it('survives player replacement and does not duplicate the control', async () => {
    history.replaceState({}, '', '/watch?v=abcdefghijk');
    player();
    stop = startPlayerLifecycle();
    const original = document.getElementById('yt-glance-btn');
    player();
    await flush();
    expect(document.getElementById('yt-glance-btn')).not.toBe(original);
    window.dispatchEvent(new Event('yt-navigate-finish'));
    await flush();
    expect(document.querySelectorAll('#yt-glance-btn')).toHaveLength(1);
  });

  it('removes controls off watch pages and restores them on back navigation', async () => {
    player();
    stop = startPlayerLifecycle();
    navigate('/watch?v=abcdefghijk');
    expect(document.getElementById('yt-glance-btn')).not.toBeNull();
    navigate('/results?search_query=test');
    await flush();
    expect(document.getElementById('yt-glance-btn')).toBeNull();
    history.replaceState({}, '', '/watch?v=12345678901');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(document.getElementById('yt-glance-btn')).not.toBeNull();
    expect(getVideoId()).toBe('12345678901');
  });

  it('waits until navigation finishes before reattaching to old controls', async () => {
    history.replaceState({}, '', '/watch?v=abcdefghijk');
    player();
    stop = startPlayerLifecycle();
    window.dispatchEvent(new Event('yt-navigate-start'));
    await flush();
    expect(document.getElementById('yt-glance-btn')).toBeNull();
    navigate('/watch?v=12345678901');
    expect(document.querySelectorAll('#yt-glance-btn')).toHaveLength(1);
  });

  it('rejects non-watch URLs and overlong video IDs', () => {
    stop = () => {};
    history.replaceState({}, '', '/?v=abcdefghijk');
    expect(getVideoId()).toBeNull();
    history.replaceState({}, '', '/watch?v=abcdefghijkX');
    expect(getVideoId()).toBeNull();
  });
});
