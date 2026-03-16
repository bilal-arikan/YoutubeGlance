/**
 * YoutubeGlance - Popup UI Controller
 * Manages popup state, messaging, and user interactions
 */

import { CaptionData } from '../types/caption';
import { generatePrompt, getPresetById, PRESET_TEMPLATES } from '../utils/promptTemplate';

const TOAST_DURATION = 4000;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  tr: 'Turkish',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
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

interface PopupState {
  status: 'idle' | 'loading' | 'success' | 'error';
  videoId: string;
  videoTitle: string;
  selectedLanguage: string;
  promptText: string | null;
  selectedPreset: string;
  customTemplate: string;
  autoSend: boolean;
  selectedPlatform: string;
}

class PopupUI {
  private state: PopupState = {
    status: 'idle',
    videoId: '',
    videoTitle: '',
    selectedLanguage: 'en',
    promptText: null,
    selectedPreset: 'short',
    customTemplate: getPresetById('custom')!.template,
    autoSend: false,
    selectedPlatform: 'chatgpt',
  };

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Load saved preferences
    chrome.storage.local.get(
      ['preferredLanguage', 'selectedPreset', 'customTemplate', 'autoSend', 'selectedPlatform'],
      (result: any) => {
        if (result.preferredLanguage && LANGUAGE_NAMES[result.preferredLanguage]) {
          this.state.selectedLanguage = result.preferredLanguage;
        }

        if (result.selectedPreset) {
          this.state.selectedPreset = result.selectedPreset;
        }

        if (result.customTemplate) {
          this.state.customTemplate = result.customTemplate;
        }

        if (typeof result.autoSend === 'boolean') {
          this.state.autoSend = result.autoSend;
        }

        if (result.selectedPlatform && PLATFORM_URLS[result.selectedPlatform]) {
          this.state.selectedPlatform = result.selectedPlatform;
        }

        // Update UI
        this.updateLanguageUI();
        this.updatePlatformUI();
        this.updatePresetUI();
        this.updateAutoSendUI();
      }
    );

    // Get video info from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;

      chrome.tabs.sendMessage(tabs[0].id, { action: 'getVideoInfo' }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          this.showStatus('Open a YouTube video to get started', 'error');
          return;
        }

        this.state.videoId = response.videoId || '';
        this.state.videoTitle = response.title || 'Untitled Video';

        const titleEl = document.getElementById('video-title');
        const metaEl = document.getElementById('video-meta');
        const iconEl = document.getElementById('video-icon');
        const startBtn = document.getElementById('start-btn');

        if (titleEl) titleEl.textContent = this.state.videoTitle;
        if (metaEl) metaEl.textContent = this.state.videoId;
        if (iconEl) iconEl.classList.add('loaded');
        if (startBtn) startBtn.disabled = false;
      });
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Language select
    document.getElementById('lang-select')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.setLanguage(value);
    });

    // Platform select
    document.getElementById('platform-select')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.setPlatform(value);
    });

    // Action buttons
    document.getElementById('start-btn')?.addEventListener('click', () => this.handleStart());
    document.getElementById('retry-btn')?.addEventListener('click', () => this.handleStart());
    document.getElementById('copy-btn')?.addEventListener('click', () => this.handleCopy());

    // Template toggle
    document.getElementById('template-toggle')?.addEventListener('click', () => this.toggleTemplate());

    // Preset radio buttons
    document.querySelectorAll('input[name="preset"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.selectPreset(value);
      });
    });

    // Custom template textarea
    const textarea = document.getElementById('prompt-template') as HTMLTextAreaElement | null;
    textarea?.addEventListener('input', () => this.handleCustomTemplateChange());

    // Template reset
    document.getElementById('template-reset')?.addEventListener('click', () => this.resetCustomTemplate());

    // Auto-send toggle
    document.getElementById('auto-send-toggle')?.addEventListener('change', (e) => {
      this.state.autoSend = (e.target as HTMLInputElement).checked;
      chrome.storage.local.set({ autoSend: this.state.autoSend });
    });
  }

  // ---- Language ----

  private setLanguage(lang: string): void {
    this.state.selectedLanguage = lang;
    chrome.storage.local.set({ preferredLanguage: lang });
  }

  private updateLanguageUI(): void {
    const select = document.getElementById('lang-select') as HTMLSelectElement | null;
    if (select) select.value = this.state.selectedLanguage;
  }

  // ---- Platform ----

  private setPlatform(platform: string): void {
    this.state.selectedPlatform = platform;
    chrome.storage.local.set({ selectedPlatform: platform });
  }

  private updatePlatformUI(): void {
    const select = document.getElementById('platform-select') as HTMLSelectElement | null;
    if (select) select.value = this.state.selectedPlatform;
  }

  // ---- Template ----

  private toggleTemplate(): void {
    const body = document.getElementById('template-body');
    const chevron = document.getElementById('template-chevron');
    if (!body) return;

    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    chevron?.classList.toggle('open', !isOpen);
  }

  private selectPreset(presetId: string): void {
    this.state.selectedPreset = presetId;
    chrome.storage.local.set({ selectedPreset: presetId });

    // Show/hide custom editor
    const customEditor = document.getElementById('custom-editor');
    if (customEditor) {
      customEditor.style.display = presetId === 'custom' ? 'block' : 'none';
    }
  }

  private updatePresetUI(): void {
    // Select the right radio
    const radio = document.querySelector(
      `input[name="preset"][value="${this.state.selectedPreset}"]`
    ) as HTMLInputElement | null;
    if (radio) radio.checked = true;

    // Show custom editor if needed
    const customEditor = document.getElementById('custom-editor');
    if (customEditor) {
      customEditor.style.display = this.state.selectedPreset === 'custom' ? 'block' : 'none';
    }

    // Set custom textarea value
    const textarea = document.getElementById('prompt-template') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = this.state.customTemplate;
    }
  }

  private updateAutoSendUI(): void {
    const toggle = document.getElementById('auto-send-toggle') as HTMLInputElement | null;
    if (toggle) toggle.checked = this.state.autoSend;
  }

  private handleCustomTemplateChange(): void {
    const textarea = document.getElementById('prompt-template') as HTMLTextAreaElement | null;
    if (!textarea) return;

    this.state.customTemplate = textarea.value;

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      chrome.storage.local.set({ customTemplate: this.state.customTemplate });
      this.showTemplateStatus('Saved');
    }, 800);
  }

  private resetCustomTemplate(): void {
    const defaultCustom = getPresetById('custom')!.template;
    this.state.customTemplate = defaultCustom;

    const textarea = document.getElementById('prompt-template') as HTMLTextAreaElement | null;
    if (textarea) textarea.value = defaultCustom;

    chrome.storage.local.set({ customTemplate: defaultCustom });
    this.showTemplateStatus('Reset to default');
  }

  private showTemplateStatus(message: string): void {
    const status = document.getElementById('template-status');
    if (!status) return;
    status.textContent = message;
    status.classList.add('visible');
    setTimeout(() => status.classList.remove('visible'), 2000);
  }

  /**
   * Get the active template string based on current selection.
   */
  private getActiveTemplate(): string {
    if (this.state.selectedPreset === 'custom') {
      return this.state.customTemplate;
    }
    const preset = getPresetById(this.state.selectedPreset);
    return preset ? preset.template : PRESET_TEMPLATES[0].template;
  }

  // ---- Main Flow ----

  private handleStart(): void {
    if (!this.state.videoId) return;

    const startTime = Date.now();
    this.showStatus('Extracting captions...', 'loading');
    this.showButton('none');

    chrome.runtime.sendMessage(
      { action: 'extractCaptions', data: { preferredLang: this.state.selectedLanguage } },
      (response) => {
        if (chrome.runtime.lastError) {
          this.showStatus('Refresh the page and try again', 'error');
          this.showButton('retry');
          return;
        }

        if (response?.success && response.data) {
          this.onCaptionsReady(response.data as CaptionData, startTime);
        } else {
          this.showStatus(response?.error || 'Could not extract captions', 'error');
          this.showButton('retry');
        }
      }
    );
  }

  private async onCaptionsReady(data: CaptionData, startTime: number): Promise<void> {
    try {
      const lang = LANGUAGE_NAMES[this.state.selectedLanguage] || 'English';
      const template = this.getActiveTemplate();
      const prompt = generatePrompt(data, lang, template);
      this.state.promptText = prompt;

      // Copy to clipboard
      this.showStatus('Copying to clipboard...', 'loading');
      await navigator.clipboard.writeText(prompt);

      const platformUrl = PLATFORM_URLS[this.state.selectedPlatform] || PLATFORM_URLS.chatgpt;
      const platformName = this.state.selectedPlatform.charAt(0).toUpperCase() + this.state.selectedPlatform.slice(1);

      // Open AI platform and auto-paste
      chrome.runtime.sendMessage({
        action: 'openTabAndPaste',
        url: platformUrl,
        data: {
          promptText: prompt,
          autoSend: this.state.autoSend,
          platform: this.state.selectedPlatform,
        },
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[YoutubeGlance] Done in ${elapsed}s`);

      const sendMsg = this.state.autoSend ? ' ve gönderiliyor' : '';
      this.showStatus(`${platformName}'e yapıştırılıyor${sendMsg}...`, 'success');
      this.showButton('copy');
      this.showToast(`Altyazı kopyalandı! ${platformName}'e otomatik yapıştırılıyor...`);
    } catch (error) {
      console.error('[YoutubeGlance] Error:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.showStatus('Clipboard access denied', 'error');
      } else {
        this.showStatus('Failed to copy to clipboard', 'error');
      }
      this.showButton('retry');
    }
  }

  private async handleCopy(): Promise<void> {
    if (!this.state.promptText) return;
    try {
      await navigator.clipboard.writeText(this.state.promptText);
      this.showToast('Copied again!');
    } catch {
      this.showStatus('Failed to copy', 'error');
    }
  }

  // ---- UI Helpers ----

  private showStatus(message: string, type: 'loading' | 'error' | 'success'): void {
    const section = document.getElementById('status-section');
    if (!section) return;

    const box = document.createElement('div');
    box.className = `status-box ${type}`;

    if (type === 'loading') {
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      box.appendChild(spinner);
    }

    const icon = type === 'error' ? '! ' : '';
    box.appendChild(document.createTextNode(icon + message));

    section.innerHTML = '';
    section.appendChild(box);
  }

  private showButton(which: 'start' | 'retry' | 'copy' | 'none'): void {
    const start = document.getElementById('start-btn');
    const retry = document.getElementById('retry-btn');
    const copy = document.getElementById('copy-btn');

    if (start) start.style.display = which === 'start' ? '' : 'none';
    if (retry) retry.style.display = which === 'retry' ? '' : 'none';
    if (copy) copy.style.display = which === 'copy' ? '' : 'none';
  }

  private showToast(message: string): void {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), TOAST_DURATION);
  }
}

// Initialize
if (typeof chrome !== 'undefined' && chrome.storage) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PopupUI());
  } else {
    new PopupUI();
  }
}

export { PopupUI };
