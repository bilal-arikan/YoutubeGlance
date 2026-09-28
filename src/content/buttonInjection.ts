/**
 * Button Injection Module
 *
 * Injects the YoutubeGlance button into YouTube's player right-controls.
 * Handles click → extract captions → clipboard → AI platform (auto-paste) flow.
 */

import { createButton, buttonExists } from './buttonStyles';
import { getVideoId } from './videoLocation';
import { extensionRequest } from '../utils/extensionRequest';
import { deliverPrompt } from '../utils/promptDelivery';
import { CaptionData } from '../types/caption';

const CONTROLS_SELECTOR = '.ytp-right-controls';
const MAX_TRANSCRIPT_LENGTH = 100000;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', tr: 'Turkish', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', hi: 'Hindi', it: 'Italian', nl: 'Dutch', pl: 'Polish',
};

const PLATFORM_URLS: Record<string, string> = {
  chatgpt: 'https://chatgpt.com',
  claude: 'https://claude.ai/new',
  gemini: 'https://gemini.google.com/app',
  aistudio: 'https://aistudio.google.com/',
  grok: 'https://grok.com',
  deepseek: 'https://chat.deepseek.com',
  kimi: 'https://www.kimi.com/',
  minimax: 'https://agent.minimax.io/',
};

const PRESET_TEMPLATES: Record<string, string> = {
  short: `Task: Summarize the following content in 5-10 bullet points with timestamp if it's transcript. in {{language}}\n\nVideo Title: {{title}}\n\nTranscript:\n{{transcript}}`,
  detailed: `Task: Summarize the following content in 15-20 bullet points with timestamp if it's transcript. in {{language}}\n\nVideo Title: {{title}}\n\nTranscript:\n{{transcript}}`,
  'web-enhanced': `Instruction: Before responding, make sure to perform a web search to find relevant insights or highlights, never use exact match queries (e.g., quoted keywords like "keywords"). Use these insights only when they are directly relevant and meaningfully enhance the response by adding clarity, depth, or useful context, do not include them otherwise. Be sure to cite any insights used with their corresponding URLs. If no relevant insights are found, do not use them.\n\nTask: Summarize the following content in {{language}}\n\nVideo Title: {{title}}\n\nTranscript:\n{{transcript}}`,
  custom: `Please summarize this YouTube video transcript in {{language}}:\n\nVideo Title: {{title}}\n\nTranscript:\n{{transcript}}\n\nProvide a concise summary with key points.`,
};

/**
 * Find the right-controls container inside the player.
 */
export function findControlsContainer(): HTMLElement | null {
  return document.querySelector(CONTROLS_SELECTOR);
}

/**
 * Find the YouTube player element.
 */
export function findPlayerElement(): HTMLElement | null {
  return document.getElementById('movie_player') as HTMLElement | null;
}

/**
 * Inject the button as the first child of right-controls.
 */
export function injectButton(): boolean {
  if (buttonExists()) return false;

  const controls = findControlsContainer();
  if (!controls) return false;

  const btn = createButton();
  attachClickHandler(btn);

  try {
    if (controls.firstChild) {
      controls.insertBefore(btn, controls.firstChild);
    } else {
      controls.appendChild(btn);
    }
  } catch {
    try {
      controls.appendChild(btn);
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Generate prompt from template and caption data.
 */
function generatePromptFromTemplate(
  template: string,
  data: { videoTitle: string; videoId: string; transcript: string; trackKind: string },
  summaryLanguage: string
): string {
  let transcript = data.transcript;
  if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
    transcript = transcript.substring(0, MAX_TRANSCRIPT_LENGTH) + '... [truncated]';
  }

  return template
    .replace(/\{\{title\}\}/g, data.videoTitle)
    .replace(/\{\{transcript\}\}/g, transcript)
    .replace(/\{\{language\}\}/g, summaryLanguage)
    .replace(/\{\{videoId\}\}/g, data.videoId || '')
    .replace(/\{\{trackKind\}\}/g, data.trackKind || '');
}

/**
 * Click handler: extract captions → generate prompt → clipboard → ChatGPT (auto-paste)
 */
function attachClickHandler(btn: HTMLButtonElement): void {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.loading === 'true') return;
    const videoId = getVideoId();
    if (!videoId) return;
    btn.dataset.loading = 'true';
    btn.style.opacity = '0.5';
    try {
      const result = await chrome.storage.local.get([
        'preferredLanguage', 'selectedPreset', 'customTemplate', 'autoSend', 'readAloud', 'selectedPlatform',
      ]);
      const lang = typeof result.preferredLanguage === 'string' ? result.preferredLanguage : 'en';
      const presetId = typeof result.selectedPreset === 'string' ? result.selectedPreset : 'short';
      const template = presetId === 'custom'
        ? (typeof result.customTemplate === 'string' && result.customTemplate ? result.customTemplate : PRESET_TEMPLATES.custom)
        : (PRESET_TEMPLATES[presetId] || PRESET_TEMPLATES.short);
      const platform = typeof result.selectedPlatform === 'string' ? result.selectedPlatform : 'chatgpt';
      const response = await extensionRequest<CaptionData>({
        action: 'extractCaptions', videoId, data: { preferredLang: lang },
      });
      if (!response.data) throw new Error('No captions were returned.');
      if (!btn.isConnected || getVideoId() !== videoId || response.data.videoId !== videoId) {
        throw new Error('The video changed. Please try again on the current video.');
      }
      const promptText = generatePromptFromTemplate(template, response.data, LANGUAGE_NAMES[lang] || 'English');
      const copied = await deliverPrompt(PLATFORM_URLS[platform] || PLATFORM_URLS.chatgpt, {
        promptText, platform, autoSend: result.autoSend === true, readAloud: result.readAloud === true,
      });
      showPlayerNotification(copied ? 'AI tab opened. Prompt copied as a backup.' : 'AI tab opened. Clipboard backup unavailable.', 'success');
    } catch (error) {
      showPlayerNotification(error instanceof Error ? error.message : 'Could not prepare the prompt. Please try again.', 'error');
    } finally {
      btn.dataset.loading = 'false';
      btn.style.opacity = '0.9';
    }
  });
}
/**
 * Show a brief notification overlay on the video player.
 */
function showPlayerNotification(message: string, type: 'success' | 'error'): void {
  const player = findPlayerElement();
  if (!player) return;

  // Remove existing notification
  const existing = player.querySelector('.yt-glance-notification');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = 'yt-glance-notification';
  Object.assign(el.style, {
    position: 'absolute',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: type === 'success' ? 'rgba(6, 214, 160, 0.9)' : 'rgba(239, 71, 111, 0.9)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '9999',
    pointerEvents: 'none',
    transition: 'opacity 0.3s',
  });
  el.textContent = message;
  player.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
