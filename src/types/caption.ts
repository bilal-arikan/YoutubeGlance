// Caption extraction type definitions

/**
 * Represents a single caption track from YouTube's player response
 */
export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind: 'asr' | '';  // 'asr' = auto-generated, '' = manual
  name?: { simpleText: string };
}

/**
 * Processed caption data ready for prompt generation
 */
export interface CaptionData {
  videoId: string;
  videoTitle: string;
  language: string;
  transcript: string;
  trackKind: 'asr' | 'manual';
}

/**
 * YouTube's playerCaptionsTracklistRenderer structure
 */
export interface CaptionTrackList {
  captionTracks: CaptionTrack[];
}
