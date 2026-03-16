/**
 * Button Injection Tests
 */

import {
  findPlayerElement,
  findControlsContainer,
  injectButton,
} from './buttonInjection';
import { buttonExists, BUTTON_ID } from './buttonStyles';

describe('Button Injection Module', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('findPlayerElement()', () => {
    it('should find player element with id="movie_player"', () => {
      const player = document.createElement('div');
      player.id = 'movie_player';
      document.body.appendChild(player);

      expect(findPlayerElement()).toBe(player);
    });

    it('should return null if no player element found', () => {
      expect(findPlayerElement()).toBeNull();
    });
  });

  describe('findControlsContainer()', () => {
    it('should find controls with class="ytp-right-controls"', () => {
      const controls = document.createElement('div');
      controls.className = 'ytp-right-controls';
      document.body.appendChild(controls);

      expect(findControlsContainer()).toBe(controls);
    });

    it('should return null when no controls exist', () => {
      expect(findControlsContainer()).toBeNull();
    });
  });

  describe('buttonExists()', () => {
    it('should return true if button exists in DOM', () => {
      const button = document.createElement('button');
      button.id = BUTTON_ID;
      document.body.appendChild(button);

      expect(buttonExists()).toBe(true);
    });

    it('should return false if button does not exist', () => {
      expect(buttonExists()).toBe(false);
    });
  });

  describe('injectButton()', () => {
    function setupPlayer(withControls = true): HTMLElement {
      const player = document.createElement('div');
      player.id = 'movie_player';
      if (withControls) {
        const controls = document.createElement('div');
        controls.className = 'ytp-right-controls';
        player.appendChild(controls);
      }
      document.body.appendChild(player);
      return player;
    }

    it('should inject button when player and controls exist', () => {
      setupPlayer();

      expect(injectButton()).toBe(true);
      expect(buttonExists()).toBe(true);
    });

    it('should return false if no controls container', () => {
      expect(injectButton()).toBe(false);
      expect(buttonExists()).toBe(false);
    });

    it('should return false if button already exists', () => {
      setupPlayer();
      const existing = document.createElement('button');
      existing.id = BUTTON_ID;
      document.body.appendChild(existing);

      expect(injectButton()).toBe(false);
    });

    it('should place button before CC button when present', () => {
      const player = setupPlayer();
      const controls = player.querySelector('.ytp-right-controls')!;
      const ccBtn = document.createElement('button');
      ccBtn.className = 'ytp-subtitles-button';
      controls.appendChild(ccBtn);

      injectButton();

      const btn = controls.querySelector(`#${BUTTON_ID}`);
      expect(btn).not.toBeNull();
      expect(btn!.nextSibling).toBe(ccBtn);
    });

    it('should place button before settings button when no CC button', () => {
      const player = setupPlayer();
      const controls = player.querySelector('.ytp-right-controls')!;
      const settingsBtn = document.createElement('button');
      settingsBtn.className = 'ytp-settings-button';
      controls.appendChild(settingsBtn);

      injectButton();

      const btn = controls.querySelector(`#${BUTTON_ID}`);
      expect(btn!.nextSibling).toBe(settingsBtn);
    });

    it('should append to controls when no anchor buttons found', () => {
      const player = setupPlayer();
      const controls = player.querySelector('.ytp-right-controls')!;
      const someBtn = document.createElement('div');
      someBtn.id = 'other';
      controls.appendChild(someBtn);

      injectButton();

      expect(controls.lastChild!).toBe(controls.querySelector(`#${BUTTON_ID}`));
    });

    it('should create button with correct attributes', () => {
      setupPlayer();
      injectButton();

      const btn = document.getElementById(BUTTON_ID)!;
      expect(btn.getAttribute('aria-label')).toBe('Summarize with AI');
      expect(btn.className).toContain('ytp-button');
      expect(btn.style.width).toBe('48px');
      expect(btn.style.height).toBe('48px');
      expect(btn.style.background).toBe('transparent');
    });

    it('should contain SVG icon', () => {
      setupPlayer();
      injectButton();

      const btn = document.getElementById(BUTTON_ID)!;
      expect(btn.querySelector('svg')).not.toBeNull();
    });
  });
});
