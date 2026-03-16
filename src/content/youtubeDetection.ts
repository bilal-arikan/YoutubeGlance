/**
 * YouTube Page Detection & Content Script
 *
 * Runs at document_start on YouTube video pages.
 * Sets up message listener immediately, then waits for player to inject button.
 */

import { injectButton, setupButtonObserver, findPlayerElement } from './buttonInjection';

declare global {
  interface Window {
    __youtubeExtensionInjected?: boolean;
  }
}

function getVideoId(): string | null {
  const match = window.location.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isYouTubeVideoURL(): boolean {
  const hostname = window.location.hostname;
  return (
    (hostname === 'www.youtube.com' || hostname === 'youtube.com' || hostname === 'm.youtube.com') &&
    getVideoId() !== null
  );
}

function notifyServiceWorkerReady(): void {
  chrome.runtime.sendMessage(
    {
      action: 'contentScriptReady',
      videoId: getVideoId(),
      url: window.location.href,
      timestamp: new Date().toISOString(),
    },
    () => {
      if (chrome.runtime.lastError) {
        // Service worker not ready yet, that's fine
      }
    }
  );
}

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    switch (request.action) {
      case 'ping':
        sendResponse({ status: 'pong', videoId: getVideoId() });
        break;

      case 'getVideoId':
        sendResponse({ videoId: getVideoId() });
        break;

      case 'getVideoInfo': {
        const titleEl =
          document.querySelector('h1.title yt-formatted-string') ||
          document.querySelector('h1 yt-formatted-string') ||
          document.querySelector('ytd-video-primary-info-renderer h2 yt-formatted-string');
        sendResponse({
          success: true,
          videoId: getVideoId(),
          title: titleEl?.textContent || 'Unknown Title',
          hasPlayer: findPlayerElement() !== null,
          data: {
            hasClosedCaptions:
              document.querySelector('[aria-label*="Captions"]') !== null ||
              document.querySelector('[aria-label*="captions"]') !== null,
          },
        });
        break;
      }

      case 'getVideoTitle': {
        const el =
          document.querySelector('h1.title yt-formatted-string') ||
          document.querySelector('h1 yt-formatted-string');
        sendResponse({ title: el?.textContent || 'Unknown Title' });
        break;
      }

      case 'getPlayerElement':
        sendResponse({ hasPlayer: document.querySelector('video') !== null });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  });
}

/**
 * Wait for .ytp-right-controls to appear, then inject button.
 * Uses MutationObserver instead of polling — more efficient and reliable.
 */
function waitForPlayerAndInject(): void {
  // Try immediately first
  if (injectButton()) {
    // console.log('[YoutubeGlance] Button injected');
    return;
  }

  // Watch for the controls container to appear
  const observer = new MutationObserver(() => {
    if (injectButton()) {
      // console.log('[YoutubeGlance] Button injected (after DOM ready)');
      observer.disconnect();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Safety timeout: stop watching after 15s
  setTimeout(() => {
    observer.disconnect();
  }, 15000);
}

function initialize(): void {
  if (window.__youtubeExtensionInjected) return;
  window.__youtubeExtensionInjected = true;

  // URL check only — no DOM checks since we run at document_start
  if (!isYouTubeVideoURL()) return;

  // console.log('[YoutubeGlance] Content script loaded, video:', getVideoId());

  // Message listener works immediately
  setupMessageListener();
  notifyServiceWorkerReady();

  // Wait for player controls to appear, then inject button
  waitForPlayerAndInject();

  // Re-inject on SPA navigation
  setupButtonObserver();
}

// Run immediately — don't wait for DOMContentLoaded since we need the message listener ASAP
// and button injection already waits for the controls via MutationObserver
initialize();

export { isYouTubeVideoURL, getVideoId, notifyServiceWorkerReady };
