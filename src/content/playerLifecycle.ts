import { injectButton } from './buttonInjection';
import { removeButton } from './buttonStyles';
import { isYouTubeVideoURL } from './videoLocation';

/** Keep the control attached across SPA navigation and player replacements. */
export function startPlayerLifecycle(): () => void {
  let navigating = false;
  let queued = false;
  let disposed = false;
  const reconcile = () => {
    if (disposed) return;
    if (navigating || !isYouTubeVideoURL()) {
      removeButton();
      return;
    }
    injectButton();
  };
  const schedule = () => {
    if (queued || disposed) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      reconcile();
    });
  };
  const onStart = () => { navigating = true; removeButton(); };
  const onFinish = () => { navigating = false; reconcile(); };
  const observer = new MutationObserver(schedule);
  // Document exists even before documentElement at document_start.
  observer.observe(document, { childList: true, subtree: true });
  window.addEventListener('yt-navigate-start', onStart);
  window.addEventListener('yt-navigate-finish', onFinish);
  window.addEventListener('popstate', onFinish);
  reconcile();
  return () => {
    disposed = true;
    observer.disconnect();
    window.removeEventListener('yt-navigate-start', onStart);
    window.removeEventListener('yt-navigate-finish', onFinish);
    window.removeEventListener('popstate', onFinish);
    removeButton();
  };
}
