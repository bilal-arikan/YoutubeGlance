/**
 * YouTube Page Detection & Content Script
 *
 * Runs at document_start on every YouTube page.
 * Sets up message listener immediately, then waits for player to inject button.
 */

import { findPlayerElement } from './buttonInjection';
import { startPlayerLifecycle } from './playerLifecycle';
import { getVideoId, isYouTubeVideoURL } from './videoLocation';

declare global {
  interface Window {
    __youtubeExtensionInjected?: boolean;
  }
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
          success: isYouTubeVideoURL(),
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

function initialize(): void {
  if (window.__youtubeExtensionInjected) return;
  window.__youtubeExtensionInjected = true;
  setupMessageListener();
  startPlayerLifecycle();
  notifyServiceWorkerReady();
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) initialize();

export { isYouTubeVideoURL, getVideoId, notifyServiceWorkerReady };
