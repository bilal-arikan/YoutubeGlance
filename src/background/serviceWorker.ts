/**
 * Background Service Worker
 * Handles message passing between popup/content scripts and caption extraction.
 *
 * Strategy: Extract captions entirely in MAIN world (page context) where
 * YouTube's cookies, session, and PO tokens are available.
 * Service worker only orchestrates the executeScript call.
 */

interface MessagePayload {
  action: string;
  videoId?: string;
  url?: string;
  timestamp?: string;
  data?: any;
}

interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

chrome.runtime.onMessage.addListener(
  (
    message: MessagePayload,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean => {
    try {
      switch (message.action) {
        case 'contentScriptReady':
        case 'buttonClicked':
          sendResponse({ success: true });
          break;

        case 'ping':
          sendResponse({ success: true, data: 'pong' });
          break;

        case 'extractCaptions':
          handleExtractCaptions(message, sender, sendResponse);
          break;

        case 'openTab':
          if (message.url) {
            chrome.tabs.create({ url: message.url });
          }
          sendResponse({ success: true });
          break;

        case 'openTabAndPaste':
          handleOpenTabAndPaste(message, sendResponse);
          break;

        default:
          sendResponse({ success: false, error: `Unknown action: ${message.action}` });
      }
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return true;
  }
);

/**
 * Runs entirely in MAIN world (page context).
 * Has access to YouTube's player, cookies, session — everything needed
 * to fetch captions with proper authentication (including PO tokens).
 *
 * Three-tier approach:
 * 1. Direct fetch from page context (same-origin, with cookies)
 * 2. Intercept player's own caption request (has PO token in URL)
 * 3. Scrape transcript panel DOM (last resort)
 */
async function extractCaptionsInPageContext(preferredLang: string): Promise<any> {
  try {
    const player = document.getElementById('movie_player') as any;
    const playerResponse =
      (typeof player?.getPlayerResponse === 'function' ? player.getPlayerResponse() : null)
      || (window as any).ytInitialPlayerResponse;

    if (!playerResponse) {
      return { error: 'Player verisi bulunamadı. Sayfayı yenilemeyi dene.' };
    }

    const videoId = playerResponse?.videoDetails?.videoId || '';
    const videoTitle = playerResponse?.videoDetails?.title || 'Unknown Title';

    if (!videoId) {
      return { error: 'Video ID belirlenemedi' };
    }

    const trackList = playerResponse?.captions?.playerCaptionsTracklistRenderer;
    if (!trackList?.captionTracks || trackList.captionTracks.length === 0) {
      return { error: 'Bu videoda altyazı bulunmuyor' };
    }

    const tracks = trackList.captionTracks as any[];

    const preferredTrack =
      tracks.find((t: any) => t.languageCode === preferredLang && t.kind !== 'asr')
      || tracks.find((t: any) => t.languageCode === preferredLang)
      || tracks.find((t: any) => t.languageCode === 'tr')
      || tracks.find((t: any) => t.languageCode === 'en' && t.kind !== 'asr')
      || tracks.find((t: any) => t.languageCode === 'en')
      || tracks[0];

    if (!preferredTrack?.baseUrl) {
      return { error: 'Altyazı URL bulunamadı' };
    }

    // Helper: format milliseconds to [MM:SS] timestamp
    function formatTimestamp(ms: number): string {
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}]`;
    }

    // Helper: parse caption data (JSON3 or XML) with timestamps
    function parseCaptions(text: string): string | null {
      // Try JSON3 format
      try {
        const data = JSON.parse(text);
        if (data?.events?.length > 0) {
          const lines: string[] = [];
          for (const event of data.events) {
            if (!event.segs) continue;
            const t = event.segs.map((s: any) => s.utf8 || '').join('');
            const cleaned = t.replace(/\n/g, ' ').trim();
            if (cleaned) {
              const ts = typeof event.tStartMs === 'number' ? formatTimestamp(event.tStartMs) : '';
              lines.push(ts ? `${ts} ${cleaned}` : cleaned);
            }
          }
          if (lines.length > 0) return lines.join('\n');
        }
      } catch {}

      // Try XML format
      if (text.includes('<text')) {
        const textRegex = /<text\s+start="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g;
        const lines: string[] = [];
        let match;
        while ((match = textRegex.exec(text)) !== null) {
          const startSec = parseFloat(match[1]);
          const decoded = match[2]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/\n/g, ' ')
            .trim();
          if (decoded) {
            const ts = !isNaN(startSec) ? formatTimestamp(startSec * 1000) : '';
            lines.push(ts ? `${ts} ${decoded}` : decoded);
          }
        }
        if (lines.length > 0) return lines.join('\n');

        // Fallback: XML without start attribute
        const fallbackRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
        const fallbackLines: string[] = [];
        let fm;
        while ((fm = fallbackRegex.exec(text)) !== null) {
          const decoded = fm[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/\n/g, ' ')
            .trim();
          if (decoded) fallbackLines.push(decoded);
        }
        if (fallbackLines.length > 0) return fallbackLines.join('\n');
      }

      return null;
    }

    function makeResult(transcript: string, lang: string, kind: string, method: string) {
      return {
        videoId,
        videoTitle,
        language: lang,
        transcript,
        trackKind: kind === 'asr' ? 'asr' : 'manual',
        method,
      };
    }

    // ── TIER 1: Direct fetch from page context ──
    async function tryDirectFetch(trackUrl: string): Promise<string | null> {
      try {
        const jsonUrl = trackUrl + (trackUrl.includes('fmt=') ? '' : '&fmt=json3');
        const resp = await fetch(jsonUrl, { credentials: 'include' });
        if (resp.ok) {
          const text = await resp.text();
          if (text.length > 0) {
            return parseCaptions(text);
          }
        }
      } catch {}

      // Try default XML format
      try {
        const resp = await fetch(trackUrl, { credentials: 'include' });
        if (resp.ok) {
          const text = await resp.text();
          if (text.length > 0) {
            return parseCaptions(text);
          }
        }
      } catch {}

      return null;
    }

    // Try preferred track first
    let transcript = await tryDirectFetch(preferredTrack.baseUrl);
    if (transcript) {
      return makeResult(transcript, preferredTrack.languageCode, preferredTrack.kind || '', 'direct-fetch');
    }

    // Try other tracks
    for (const track of tracks) {
      if (track.baseUrl === preferredTrack.baseUrl) continue;
      transcript = await tryDirectFetch(track.baseUrl);
      if (transcript) {
        return makeResult(transcript, track.languageCode, track.kind || '', 'direct-fetch');
      }
    }

    // ── TIER 2: Intercept player's own caption request ──
    const interceptResult = await new Promise<any>((resolve) => {
      let captured = false;

      const origXhrOpen = XMLHttpRequest.prototype.open;
      const origXhrSend = XMLHttpRequest.prototype.send;
      const origFetch = window.fetch;

      function cleanup() {
        XMLHttpRequest.prototype.open = origXhrOpen;
        XMLHttpRequest.prototype.send = origXhrSend;
        window.fetch = origFetch;
      }

      function finish(result: any) {
        if (captured) return;
        captured = true;
        cleanup();
        resolve(result);
      }

      // Hook XMLHttpRequest
      XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
        const urlStr = typeof url === 'string' ? url : url.toString();
        (this as any).__isCaptionReq = urlStr.includes('timedtext');
        return origXhrOpen.apply(this, [method, url, ...rest] as any);
      };

      XMLHttpRequest.prototype.send = function (...args: any[]) {
        if ((this as any).__isCaptionReq) {
          this.addEventListener('load', function () {
            if (captured) return;
            const text = this.responseText;
            if (text && text.length > 0) {
              const t = parseCaptions(text);
              if (t) {
                finish(makeResult(t, preferredTrack.languageCode, preferredTrack.kind || '', 'player-intercept-xhr'));
              }
            }
          });
        }
        return origXhrSend.apply(this, args as any);
      };

      // Hook fetch
      window.fetch = async function (...args: any[]) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const response = await origFetch.apply(this, args as any);
        if (typeof url === 'string' && url.includes('timedtext') && !captured) {
          try {
            const clone = response.clone();
            const text = await clone.text();
            if (text && text.length > 0) {
              const t = parseCaptions(text);
              if (t) {
                finish(makeResult(t, preferredTrack.languageCode, preferredTrack.kind || '', 'player-intercept-fetch'));
              }
            }
          } catch {}
        }
        return response;
      };

      // Trigger caption loading via player API
      try {
        if (player && typeof player.loadModule === 'function') {
          player.loadModule('captions');
        }
        setTimeout(() => {
          try {
            if (player && typeof player.setOption === 'function') {
              player.setOption('captions', 'track', {});
              setTimeout(() => {
                player.setOption('captions', 'track', {
                  languageCode: preferredTrack.languageCode,
                  kind: preferredTrack.kind || '',
                });
              }, 200);
            }
          } catch {}
        }, 300);
      } catch {}

      // Timeout after 6 seconds
      setTimeout(() => finish(null), 6000);
    });

    if (interceptResult) {
      return interceptResult;
    }

    // ── TIER 3: Scrape transcript panel DOM ──
    const transcriptResult = await new Promise<any>((resolve) => {
      try {
        const menuBtn = document.querySelector(
          'ytd-video-description-transcript-section-renderer button, ' +
          '#description-inline-expander ytd-structured-description-content-renderer button[aria-label*="transcript" i], ' +
          'button[aria-label*="transcript" i]'
        ) as HTMLElement | null;

        if (!menuBtn) {
          const moreBtn = document.querySelector(
            'ytd-menu-renderer.ytd-watch-metadata yt-button-shape button, ' +
            '#actions ytd-menu-renderer yt-icon-button'
          ) as HTMLElement | null;

          if (moreBtn) {
            moreBtn.click();
            setTimeout(() => {
              const transcriptItem = document.querySelector(
                'ytd-menu-service-item-renderer:last-child, ' +
                'tp-yt-paper-listbox ytd-menu-service-item-renderer'
              ) as HTMLElement | null;
              if (transcriptItem) {
                transcriptItem.click();
              }
            }, 500);
          }
        } else {
          menuBtn.click();
        }

        let attempts = 0;
        const maxAttempts = 20;
        const checkInterval = setInterval(() => {
          attempts++;
          const segments = document.querySelectorAll(
            'ytd-transcript-segment-renderer .segment-text, ' +
            'ytd-transcript-segment-renderer yt-formatted-string.segment-text'
          );

          if (segments.length > 0) {
            clearInterval(checkInterval);
            const lines: string[] = [];
            segments.forEach((seg) => {
              const text = (seg.textContent || '').trim();
              if (text) lines.push(text);
            });

            if (lines.length > 0) {
              const closeBtn = document.querySelector(
                'ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"] #visibility-button button'
              ) as HTMLElement | null;
              if (closeBtn) closeBtn.click();

              resolve(makeResult(lines.join(' '), preferredTrack.languageCode, preferredTrack.kind || '', 'transcript-dom'));
            } else {
              resolve(null);
            }
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            resolve(null);
          }
        }, 500);
      } catch {
        resolve(null);
      }
    });

    if (transcriptResult) {
      return transcriptResult;
    }

    return { error: `Altyazı metni alınamadı. ${tracks.length} track denendi, tüm yöntemler başarısız.` };
  } catch (err: any) {
    return { error: `Hata: ${err?.message || err}` };
  }
}

/**
 * Handle extractCaptions: run everything in page context via executeScript.
 */
async function handleExtractCaptions(
  message: MessagePayload,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
): Promise<void> {
  const preferredLang = message.data?.preferredLang || 'tr';
  let tabId = sender.tab?.id;

  // If message comes from popup (not a tab), find the active YouTube tab
  if (!tabId) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tabs[0]?.id;
    } catch {}
  }

  if (!tabId) {
    sendResponse({ success: false, error: 'Tab belirlenemedi' });
    return;
  }

  try {
    const scriptResults = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      args: [preferredLang],
      func: extractCaptionsInPageContext,
    });

    const result = scriptResults?.[0]?.result;
    if (!result) {
      sendResponse({ success: false, error: 'Sayfa script çalıştırılamadı' });
      return;
    }

    if (result.error) {
      sendResponse({ success: false, error: result.error });
    } else {
      sendResponse({ success: true, data: result });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Beklenmeyen hata',
    });
  }
}

/**
 * Open AI platform tab, wait for page load, then auto-paste prompt text.
 */
async function handleOpenTabAndPaste(
  message: MessagePayload,
  sendResponse: (response: MessageResponse) => void
): Promise<void> {
  const url = message.url || 'https://chatgpt.com';
  const promptText = message.data?.promptText || '';
  const autoSend = message.data?.autoSend || false;
  const platform = message.data?.platform || 'chatgpt';

  if (!promptText) {
    if (url) chrome.tabs.create({ url });
    sendResponse({ success: true });
    return;
  }

  try {
    const tab = await chrome.tabs.create({ url });
    const tabId = tab.id;
    if (!tabId) {
      sendResponse({ success: true });
      return;
    }

    // Listen for tab to finish loading, then inject paste script
    const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabUpdateChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onUpdated);

        // Wait for SPA to fully render
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId },
            args: [promptText, autoSend, platform],
            func: pasteIntoAIPlatform,
          }).catch(() => {});
        }, 2500);
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);

    // Safety timeout: remove listener after 30s
    setTimeout(() => chrome.tabs.onUpdated.removeListener(onUpdated), 30000);

    sendResponse({ success: true });
  } catch {
    if (message.url) chrome.tabs.create({ url: message.url });
    sendResponse({ success: true });
  }
}

/**
 * Universal paste function injected into any AI platform page.
 * Uses execCommand('insertText') for contenteditable editors (Tiptap/ProseMirror/Lexical)
 * to properly trigger framework state updates.
 */
function pasteIntoAIPlatform(text: string, autoSend: boolean, platform: string): void {

  // ── Platform-specific selectors ──
  const PLATFORM_CONFIG: Record<string, {
    editorSelectors: string[];
    sendSelectors: string[];
    sendViaEnter?: boolean;
  }> = {
    chatgpt: {
      editorSelectors: [
        '#prompt-textarea',
        'div[contenteditable="true"].ProseMirror',
        'div[id="prompt-textarea"]',
      ],
      sendSelectors: [
        'button[data-testid="send-button"]',
        'button[aria-label="Send prompt"]',
        'form button[type="submit"]',
      ],
    },
    claude: {
      editorSelectors: [
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"][data-placeholder]',
        'fieldset div[contenteditable="true"]',
        'div.ProseMirror[contenteditable="true"]',
      ],
      sendSelectors: [
        'button[aria-label="Send Message"]',
        'button[aria-label="Send message"]',
        'fieldset button:last-of-type',
      ],
    },
    gemini: {
      editorSelectors: [
        'rich-textarea .ql-editor',
        'rich-textarea div[contenteditable="true"]',
        '.text-input-field textarea',
        'div[contenteditable="true"][aria-label*="prompt"]',
        '.input-area div[contenteditable="true"]',
      ],
      sendSelectors: [
        'button.send-button',
        'button[aria-label="Send message"]',
        'button[aria-label*="Send"]',
      ],
    },
    aistudio: {
      // Google AI Studio uses Angular Material components
      editorSelectors: [
        'textarea[aria-label*="prompt" i]',
        'textarea[aria-label*="Type something" i]',
        'ms-autosize-textarea textarea',
        'textarea.text-input',
        '.prompt-input textarea',
        'div[contenteditable="true"]',
        'textarea',
      ],
      sendSelectors: [
        'button[aria-label="Run"]',
        'button[aria-label*="Run" i]',
        'button.run-button',
        'button[mat-raised-button][color="primary"]',
        'button[aria-label*="Send" i]',
      ],
    },
    grok: {
      // Grok uses Tiptap/ProseMirror contenteditable, NOT textarea
      editorSelectors: [
        'div.tiptap.ProseMirror',
        'div[contenteditable="true"]',
      ],
      sendSelectors: [
        'button[type="submit"][aria-label]',
      ],
    },
    deepseek: {
      editorSelectors: [
        'textarea#chat-input',
        'textarea',
      ],
      sendSelectors: [],
      // DeepSeek has no stable send button — submit via Enter key
      sendViaEnter: true,
    },
    kimi: {
      // Kimi uses Lexical editor with role="textbox"
      editorSelectors: [
        'div.chat-input-editor[role="textbox"]',
        'div.chat-input-editor',
        'div[role="textbox"][contenteditable="true"]',
      ],
      sendSelectors: [
        'div.send-button-container',
      ],
    },
    minimax: {
      // Minimax uses Tiptap/ProseMirror editor
      editorSelectors: [
        'div.tiptap-editor[contenteditable="true"]',
        'div.tiptap.ProseMirror.tiptap-editor',
        'div.tiptap.ProseMirror',
      ],
      sendSelectors: [
        '#input-send-icon',
        'div[data-input-icon="true"]',
      ],
    },
  };

  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.chatgpt;

  function findEditor(): HTMLElement | null {
    for (const selector of config.editorSelectors) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) return el;
    }
    return null;
  }

  function findSendButton(): HTMLElement | null {
    for (const selector of config.sendSelectors) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) return el;
    }
    return null;
  }

  /**
   * Fill a contenteditable editor by simulating a clipboard paste event.
   * execCommand('insertText') is extremely slow for large texts in ProseMirror/Tiptap
   * because the framework processes each character. Paste event is instant.
   */
  function fillContentEditable(editor: HTMLElement): void {
    editor.focus();
    // Clear existing content
    if (editor.textContent) {
      document.execCommand('selectAll', false);
      document.execCommand('delete', false);
    }

    // Simulate clipboard paste — this is handled natively by ProseMirror/Tiptap/Lexical
    // and is orders of magnitude faster than insertText for large content
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    const handled = !editor.dispatchEvent(pasteEvent);

    // If paste event wasn't handled by framework, fall back to insertText
    if (!handled && !editor.textContent?.trim()) {
      document.execCommand('insertText', false, text);
    }

    // Dispatch input event as backup for state sync
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: text }));
  }

  /**
   * Fill a textarea using native value setter (bypasses React controlled input).
   */
  function fillTextarea(textarea: HTMLTextAreaElement): void {
    textarea.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    if (nativeSetter) {
      nativeSetter.call(textarea, text);
    } else {
      textarea.value = text;
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillEditor(editor: HTMLElement): void {
    if (editor.tagName === 'TEXTAREA') {
      fillTextarea(editor as HTMLTextAreaElement);
    } else {
      fillContentEditable(editor);
    }
  }

  function triggerSend(editor: HTMLElement): void {
    if (config.sendViaEnter) {
      // Send via Enter key (DeepSeek)
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true,
      }));
      return;
    }

    const sendBtn = findSendButton();
    if (sendBtn) {
      // Some send buttons are divs, not real buttons — check for disabled class
      const isDisabled = sendBtn.classList.contains('disabled')
        || sendBtn.classList.contains('cursor-not-allowed')
        || sendBtn.hasAttribute('disabled')
        || sendBtn.getAttribute('aria-disabled') === 'true';

      if (!isDisabled) {
        sendBtn.click();
      } else {
        // Retry after a short delay (editor state may need time to update)
        setTimeout(() => {
          const btn = findSendButton();
          if (btn) btn.click();
        }, 800);
      }
    }
  }

  function tryPaste(): boolean {
    const editor = findEditor();
    if (!editor) return false;

    fillEditor(editor);

    if (autoSend) {
      // Wait for framework state to catch up before sending
      setTimeout(() => triggerSend(editor), 600);
    }

    return true;
  }

  // Try immediately, then retry a few times if editor isn't ready
  if (tryPaste()) return;

  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (tryPaste() || attempts >= 15) {
      clearInterval(interval);
    }
  }, 1000);
}

chrome.runtime.onInstalled.addListener(() => {});
