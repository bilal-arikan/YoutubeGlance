/**
 * Tests for Prompt Template Module
 */

import { CaptionData } from '../types/caption';
import { generatePrompt } from './promptTemplate';

describe('Prompt Template', () => {
  const mockCaptionData: CaptionData = {
    videoId: 'abc123',
    videoTitle: 'Test Video Title',
    language: 'en',
    transcript: 'This is the transcript text of the video.',
    trackKind: 'manual',
  };

  describe('generatePrompt', () => {
    it('should generate a prompt with correct format', () => {
      const prompt = generatePrompt(mockCaptionData, 'Turkish');

      expect(prompt).toContain('Please summarize this YouTube video transcript in Turkish');
      expect(prompt).toContain('Video Title: Test Video Title');
      expect(prompt).toContain('This is the transcript text of the video.');
      expect(prompt).toContain('Provide a concise summary with key points.');
    });

    it('should include the summary language in the prompt', () => {
      const promptTR = generatePrompt(mockCaptionData, 'Turkish');
      expect(promptTR).toContain('in Turkish');

      const promptEN = generatePrompt(mockCaptionData, 'English');
      expect(promptEN).toContain('in English');
    });

    it('should truncate transcript exceeding 10000 characters', () => {
      const longTranscript = 'A'.repeat(15000);
      const longData: CaptionData = {
        ...mockCaptionData,
        transcript: longTranscript,
      };

      const prompt = generatePrompt(longData, 'English');

      expect(prompt).toContain('... [truncated]');
      expect(prompt).not.toContain('A'.repeat(15000));
      // The transcript portion should be 10000 chars + truncation marker
      expect(prompt.indexOf('... [truncated]')).toBeGreaterThan(0);
    });

    it('should not truncate transcript under 10000 characters', () => {
      const shortData: CaptionData = {
        ...mockCaptionData,
        transcript: 'Short transcript',
      };

      const prompt = generatePrompt(shortData, 'English');
      expect(prompt).not.toContain('... [truncated]');
      expect(prompt).toContain('Short transcript');
    });

    it('should handle empty transcript', () => {
      const emptyData: CaptionData = {
        ...mockCaptionData,
        transcript: '',
      };

      const prompt = generatePrompt(emptyData, 'Turkish');
      expect(prompt).toContain('Video Title: Test Video Title');
      expect(prompt).toContain('Transcript:\n');
    });

    it('should include video title in prompt', () => {
      const customData: CaptionData = {
        ...mockCaptionData,
        videoTitle: 'My Special Video',
      };

      const prompt = generatePrompt(customData, 'English');
      expect(prompt).toContain('Video Title: My Special Video');
    });
  });
});
