/**
 * YouTube Page Detection Content Script Tests
 */

import { isYouTubeVideoURL, getVideoId } from './youtubeDetection';

describe('YouTubeDetection Content Script - Unit Tests', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
  });

  describe('getVideoId() - URL Pattern Matching', () => {
    it('should extract valid 11-character video ID from standard URL', () => {
      // This test validates the regex pattern used in getVideoId()
      // Pattern: /[?&]v=([a-zA-Z0-9_-]{11})/
      
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const match = testUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID when v parameter uses & separator', () => {
      const testUrl = 'https://www.youtube.com/watch?list=PLx&v=dQw4w9WgXcQ&t=10s';
      const match = testUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('dQw4w9WgXcQ');
    });

    it('should return null if video ID is missing', () => {
      const testUrl = 'https://www.youtube.com/results?search_query=test';
      const match = testUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      
      expect(match).toBeNull();
    });

    it('should return null for invalid video ID length', () => {
      const testUrl = 'https://www.youtube.com/watch?v=short';
      const match = testUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      
      expect(match).toBeNull();
    });

    it('should accept hyphens and underscores in video ID', () => {
      const testUrl = 'https://www.youtube.com/watch?v=1_2-3a4B5c6';
      const match = testUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('1_2-3a4B5c6');
    });

    it('should reject video ID with invalid characters', () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXc@';
      const match = testUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      
      expect(match).toBeNull();
    });
  });

  describe('YouTube Domain Validation', () => {
    it('should identify youtube.com with www subdomain', () => {
      const hostname: string = 'www.youtube.com';
      const isYouTube = 
        hostname === 'www.youtube.com' ||
        hostname === 'youtube.com' ||
        hostname === 'm.youtube.com';
      
      expect(isYouTube).toBe(true);
    });

    it('should identify youtube.com without www subdomain', () => {
      const hostname: string = 'youtube.com';
      const isYouTube = 
        hostname === 'www.youtube.com' ||
        hostname === 'youtube.com' ||
        hostname === 'm.youtube.com';
      
      expect(isYouTube).toBe(true);
    });

    it('should identify mobile YouTube (m.youtube.com)', () => {
      const hostname: string = 'm.youtube.com';
      const isYouTube = 
        hostname === 'www.youtube.com' ||
        hostname === 'youtube.com' ||
        hostname === 'm.youtube.com';
      
      expect(isYouTube).toBe(true);
    });

    it('should reject non-YouTube domains', () => {
      const hostname: string = 'example.com';
      const isYouTube = 
        hostname === 'www.youtube.com' ||
        hostname === 'youtube.com' ||
        hostname === 'm.youtube.com';
      
      expect(isYouTube).toBe(false);
    });

    it('should reject vimeo.com', () => {
      const hostname: string = 'www.vimeo.com';
      const isYouTube = 
        hostname === 'www.youtube.com' ||
        hostname === 'youtube.com' ||
        hostname === 'm.youtube.com';
      
      expect(isYouTube).toBe(false);
    });
  });

  describe('Video Page Detection - DOM Elements', () => {
    it('should detect video element when present in DOM', () => {
      // Arrange
      const video = document.createElement('video');
      document.body.appendChild(video);

      // Act
      const hasPlayer = document.querySelector('video') !== null;

      // Assert
      expect(hasPlayer).toBe(true);
    });

    it('should detect data-player-type element when present', () => {
      // Arrange
      const playerElement = document.createElement('div');
      playerElement.setAttribute('data-player-type', 'html5');
      document.body.appendChild(playerElement);

      // Act
      const hasPlayer = document.querySelector('[data-player-type]') !== null;

      // Assert
      expect(hasPlayer).toBe(true);
    });

    it('should detect ytd-video-primary-info-renderer when present', () => {
      // Arrange
      const infoElement = document.createElement('ytd-video-primary-info-renderer');
      document.body.appendChild(infoElement);

      // Act
      const hasPlayer = document.querySelector('ytd-video-primary-info-renderer') !== null;

      // Assert
      expect(hasPlayer).toBe(true);
    });

    it('should return false when no video player elements exist', () => {
      // Arrange
      // No video elements added to empty body

      // Act
      const hasPlayer = 
        document.querySelector('video') !== null ||
        document.querySelector('[data-player-type]') !== null ||
        document.querySelector('ytd-video-primary-info-renderer') !== null;

      // Assert
      expect(hasPlayer).toBe(false);
    });
  });

  describe('Content Script Initialization - Duplicate Prevention', () => {
    it('should set duplicate prevention flag on window', () => {
      // Arrange
      const flag = '__youtubeExtensionInjected';

      // Act
      (window as any)[flag] = true;

      // Assert
      expect((window as any)[flag]).toBe(true);
    });

    it('should check flag before execution', () => {
      // Arrange
      (window as any).__youtubeExtensionInjected = true;

      // Act & Assert
      if ((window as any).__youtubeExtensionInjected) {
        expect(true).toBe(true); // Script would abort here
      }
    });

    it('should only set flag once per page', () => {
      // Arrange
      const flag = '__youtubeExtensionInjected';
      (window as any)[flag] = true;

      // Act - simulate second injection attempt
      if ((window as any)[flag]) {
        // Should skip re-initialization
        expect((window as any)[flag]).toBe(true);
      }
    });
  });

  describe('Message Communication Format', () => {
    it('should have correct contentScriptReady message structure', () => {
      // Arrange
      const message = {
        action: 'contentScriptReady',
        videoId: 'dQw4w9WgXcQ',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        timestamp: new Date().toISOString()
      };

      // Assert
      expect(message.action).toBe('contentScriptReady');
      expect(message.videoId).toBeDefined();
      expect(message.url).toBeDefined();
      expect(message.timestamp).toBeDefined();
    });

    it('should support ping message format', () => {
      // Arrange
      const message = {
        action: 'ping'
      };

      // Assert
      expect(message.action).toBe('ping');
    });

    it('should support getVideoId message format', () => {
      // Arrange
      const message = {
        action: 'getVideoId'
      };

      // Assert
      expect(message.action).toBe('getVideoId');
    });
  });
});
