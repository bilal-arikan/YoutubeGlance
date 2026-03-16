/**
 * Prompt Template Module
 *
 * Preset templates and custom template support with placeholders.
 */

import { CaptionData } from '../types/caption';

const MAX_TRANSCRIPT_LENGTH = 100000;

export interface PromptPreset {
  id: string;
  name: string;
  template: string;
}

export const PRESET_TEMPLATES: PromptPreset[] = [
  {
    id: 'short',
    name: 'Short Summary (5-10 bullets)',
    template: `Task: Summarize the following content in 5-10 bullet points with timestamp if it's transcript. in {{language}}

Video Title: {{title}}

Transcript:
{{transcript}}`,
  },
  {
    id: 'detailed',
    name: 'Detailed Summary (15-20 bullets)',
    template: `Task: Summarize the following content in 15-20 bullet points with timestamp if it's transcript. in {{language}}

Video Title: {{title}}

Transcript:
{{transcript}}`,
  },
  {
    id: 'web-enhanced',
    name: 'Web-Enhanced Summary',
    template: `Instruction: Before responding, make sure to perform a web search to find relevant insights or highlights, never use exact match queries (e.g., quoted keywords like "keywords"). Use these insights only when they are directly relevant and meaningfully enhance the response by adding clarity, depth, or useful context, do not include them otherwise. Be sure to cite any insights used with their corresponding URLs. If no relevant insights are found, do not use them.

Task: Summarize the following content in {{language}}

Video Title: {{title}}

Transcript:
{{transcript}}`,
  },
  {
    id: 'custom',
    name: 'Custom Template',
    template: `Please summarize this YouTube video transcript in {{language}}:

Video Title: {{title}}

Transcript:
{{transcript}}

Provide a concise summary with key points.`,
  },
];

export function getPresetById(id: string): PromptPreset | undefined {
  return PRESET_TEMPLATES.find((p) => p.id === id);
}

/**
 * Generates a prompt from caption data using a template string.
 */
export function generatePrompt(captionData: CaptionData, summaryLanguage: string, template: string): string {
  let transcript = captionData.transcript;

  if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
    transcript = transcript.substring(0, MAX_TRANSCRIPT_LENGTH) + '... [truncated]';
  }

  return template
    .replace(/\{\{title\}\}/g, captionData.videoTitle)
    .replace(/\{\{transcript\}\}/g, transcript)
    .replace(/\{\{language\}\}/g, summaryLanguage)
    .replace(/\{\{videoId\}\}/g, captionData.videoId)
    .replace(/\{\{trackKind\}\}/g, captionData.trackKind);
}
