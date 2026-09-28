/**
 * Tests for Prompt Template Module
 */

import { CaptionData } from '../types/caption';
import { generatePrompt, getPresetById } from './promptTemplate';

describe('Prompt Template', () => {
  const template = getPresetById('custom')!.template;
  const mockCaptionData: CaptionData = {
    videoId: 'abc123',
    videoTitle: 'Test Video Title',
    language: 'en',
    transcript: 'This is the transcript text of the video.',
    trackKind: 'manual',
  };

  describe('generatePrompt', () => {
    it('should generate a prompt with correct format', () => {
      const prompt = generatePrompt(mockCaptionData, 'Turkish', template);

      expect(prompt).toContain('Please summarize this YouTube video transcript in Turkish');
      expect(prompt).toContain('Video Title: Test Video Title');
      expect(prompt).toContain('This is the transcript text of the video.');
      expect(prompt).toContain('Provide a concise summary with key points.');
    });

    it('should include the summary language in the prompt', () => {
      const promptTR = generatePrompt(mockCaptionData, 'Turkish', template);
      expect(promptTR).toContain('in Turkish');

      const promptEN = generatePrompt(mockCaptionData, 'English', template);
      expect(promptEN).toContain('in English');
    });

    it('should truncate transcript exceeding 100000 characters', () => {
      const longTranscript = 'A'.repeat(150000);
      const longData: CaptionData = {
        ...mockCaptionData,
        transcript: longTranscript,
      };

      const prompt = generatePrompt(longData, 'English', template);

      expect(prompt).toContain('... [truncated]');
      expect(prompt).not.toContain('A'.repeat(150000));
      // The transcript portion should be 100000 chars + truncation marker
      expect(prompt.indexOf('... [truncated]')).toBeGreaterThan(0);
    });

    it('should not truncate transcript under 100000 characters', () => {
      const shortData: CaptionData = {
        ...mockCaptionData,
        transcript: 'Short transcript',
      };

      const prompt = generatePrompt(shortData, 'English', template);
      expect(prompt).not.toContain('... [truncated]');
      expect(prompt).toContain('Short transcript');
    });

    it('should handle empty transcript', () => {
      const emptyData: CaptionData = {
        ...mockCaptionData,
        transcript: '',
      };

      const prompt = generatePrompt(emptyData, 'Turkish', template);
      expect(prompt).toContain('Video Title: Test Video Title');
      expect(prompt).toContain('Transcript:\n');
    });

    it('should include video title in prompt', () => {
      const customData: CaptionData = {
        ...mockCaptionData,
        videoTitle: 'My Special Video',
      };

      const prompt = generatePrompt(customData, 'English', template);
      expect(prompt).toContain('Video Title: My Special Video');
    });
  });
});
