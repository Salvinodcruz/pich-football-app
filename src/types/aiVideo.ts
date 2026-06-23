/**
 * Pich AI — TypeScript interfaces for the AI Video Processing engine.
 *
 * Architecture notes
 * ──────────────────
 * • VideoJob is the central entity: one job per raw footage upload.
 * • Processing happens server-side (24h turnaround target).
 * • PlayerReel is derived from a completed VideoJob — one per participating player.
 * • SocialShareConfig is decoupled so sharing can be triggered independently.
 * • VideoTier drives branded intro / sponsor overlay eligibility.
 */

// ─── Enumerations ──────────────────────────────────────────────────────────────

export type VideoSourceType = 'smartphone' | 'dual-phone' | 'external-url';
export type VideoProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type VideoTier = 'casual' | 'league' | 'tournament';
export type VideoOutputFormat = 'highlights' | 'player-reel' | 'compilation' | 'full-match';
export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube-shorts' | 'whatsapp';

// ─── Source ────────────────────────────────────────────────────────────────────

/** Raw footage source descriptor. */
export interface VideoSource {
  /** How the footage was captured / provided. */
  type: VideoSourceType;
  /** Local URI (smartphone / dual-phone footage picked from device gallery). */
  uri?: string;
  /**
   * External URL for remote processing (e.g. a YouTube link).
   * Used when type === 'external-url'.
   */
  externalUrl?: string;
  /**
   * Approximate footage duration in seconds — used for queue time estimation.
   */
  durationSeconds?: number;
  /**
   * For dual-phone rigs: second camera angle URI.
   * The AI stitches both streams into a wider field view.
   */
  secondCameraUri?: string;
}

// ─── Detection ─────────────────────────────────────────────────────────────────

/** A single key moment detected by the AI. */
export interface DetectedEvent {
  id: string;
  type: 'goal' | 'assist' | 'save' | 'skill' | 'tackle' | 'shot' | 'foul';
  timestampSeconds: number;
  playerId?: string;
  playerName?: string;
  /** Model confidence — used to filter low-certainty events. */
  confidence: number; // 0–1
}

// ─── Processing Options ────────────────────────────────────────────────────────

/** User-selected processing parameters for a submitted job. */
export interface ProcessingOptions {
  outputFormat: VideoOutputFormat;
  /**
   * Target highlight duration in minutes (1–6).
   * Only relevant when outputFormat === 'highlights'.
   */
  targetDurationMinutes: number;
  /** Insert automated slow-motion replays at key events. */
  includeSlowMotion: boolean;
  /** Overlay broadcast-style scoreboard and match info. */
  includeBroadcastOverlay: boolean;
  /**
   * UID of the player whose clip reel to generate.
   * Only required when outputFormat === 'player-reel'.
   */
  playerReelPlayerId?: string;
  /** Output aspect ratio — 9:16 for social reels, 16:9 for full video. */
  aspectRatio: '16:9' | '9:16';
  /** Tier governs branding overlays and sponsor eligibility. */
  tier: VideoTier;
  /**
   * Enable auto ball-tracking and simulated camera movement.
   * The AI pans/crops the static frame to follow the ball.
   */
  enableAutoTracking: boolean;
}

// ─── Overlays ──────────────────────────────────────────────────────────────────

export interface SponsorOverlay {
  imageUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  durationSeconds: number;
}

export interface BroadcastOverlay {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  matchDate: string; // ISO date
  tournamentName?: string;
  sponsorOverlays?: SponsorOverlay[];
}

// ─── Core Job ──────────────────────────────────────────────────────────────────

/** Central entity — tracks a single video processing job end-to-end. */
export interface VideoJob {
  id: string;
  userId: string;
  matchId?: string;
  source: VideoSource;
  options: ProcessingOptions;
  status: VideoProcessingStatus;
  /** Position in the processing queue (null when not queued / already processing). */
  queuePosition?: number;
  /** ISO datetime — estimated completion (server-provided, 24h target). */
  estimatedCompletionTime?: string;
  /** 0–100 progress percentage (updated while status === 'processing'). */
  progress?: number;
  /** Signed URL to download / stream the processed output. */
  outputUrl?: string;
  thumbnailUrl?: string;
  detectedEvents?: DetectedEvent[];
  broadcastOverlay?: BroadcastOverlay;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// ─── Player Reel ───────────────────────────────────────────────────────────────

/** Vertical (9:16) highlight reel generated for an individual player. */
export interface PlayerReel {
  id: string;
  playerId: string;
  playerName: string;
  /** The parent VideoJob that produced this reel. */
  jobId: string;
  outputUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  aspectRatio: '9:16';
  highlights: DetectedEvent[];
  createdAt: string;
}

// ─── Social Sharing ────────────────────────────────────────────────────────────

/** Config for publishing a reel to social platforms. */
export interface SocialShareConfig {
  platforms: SocialPlatform[];
  caption?: string;
  hashtags?: string[];
  /**
   * External creator handle for collaboration (e.g. '@pich.ae').
   * The share sheet co-credits this handle on supported platforms.
   */
  collaborationHandle?: string;
  /** Pich player IDs to tag in the post. */
  taggedPlayerIds?: string[];
}

// ─── Submission Payload ────────────────────────────────────────────────────────

/** Full payload sent when a user submits footage for processing. */
export interface VideoSubmission {
  source: VideoSource;
  options: ProcessingOptions;
  shareConfig?: SocialShareConfig;
  matchId?: string;
}
