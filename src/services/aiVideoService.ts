/**
 * Pich AI — Mock AI Video Service
 *
 * All functions return realistic mock data with simulated async delays.
 * Replace the internals with real API calls (Firebase Cloud Functions / REST)
 * when the backend is ready — the public interfaces remain unchanged.
 *
 * Toggle feature on/off via the PICH_AI_ENABLED flag.
 */

import {
  VideoJob,
  VideoSubmission,
  PlayerReel,
  DetectedEvent,
  VideoProcessingStatus,
} from '../types/aiVideo';

export const PICH_AI_ENABLED = true;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const mockId = () => Math.random().toString(36).slice(2, 10);

/** Returns an ISO string N hours from now. */
const hoursFromNow = (h: number) =>
  new Date(Date.now() + h * 3_600_000).toISOString();

const MOCK_EVENTS: DetectedEvent[] = [
  { id: 'e1', type: 'goal',  timestampSeconds: 182, playerName: 'Ahmed K.', confidence: 0.97 },
  { id: 'e2', type: 'save',  timestampSeconds: 340, playerName: 'Kareem A.', confidence: 0.91 },
  { id: 'e3', type: 'skill', timestampSeconds: 512, playerName: 'Mohamed R.', confidence: 0.85 },
  { id: 'e4', type: 'goal',  timestampSeconds: 890, playerName: 'Bilal S.', confidence: 0.96 },
  { id: 'e5', type: 'tackle',timestampSeconds: 1020, playerName: 'Zaid H.', confidence: 0.78 },
  { id: 'e6', type: 'assist',timestampSeconds: 1200, playerName: 'Omar F.', confidence: 0.89 },
];

const SEED_JOBS: VideoJob[] = [
  {
    id: 'job_demo1',
    userId: 'demo',
    matchId: 'match_001',
    source: { type: 'smartphone', durationSeconds: 1800 },
    options: {
      outputFormat: 'highlights',
      targetDurationMinutes: 3,
      includeSlowMotion: true,
      includeBroadcastOverlay: true,
      aspectRatio: '16:9',
      tier: 'league',
      enableAutoTracking: true,
    },
    status: 'completed',
    progress: 100,
    outputUrl: 'https://example.com/outputs/job_demo1.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/job_demo1.jpg',
    detectedEvents: MOCK_EVENTS,
    broadcastOverlay: {
      homeTeamName: 'Al Noor FC',
      awayTeamName: 'Desert Eagles',
      homeScore: 3,
      awayScore: 1,
      matchDate: '2026-06-20',
    },
    createdAt: '2026-06-20T10:00:00Z',
    completedAt: '2026-06-21T10:30:00Z',
  },
  {
    id: 'job_demo2',
    userId: 'demo',
    source: { type: 'smartphone', durationSeconds: 2400 },
    options: {
      outputFormat: 'player-reel',
      targetDurationMinutes: 1,
      includeSlowMotion: true,
      includeBroadcastOverlay: false,
      playerReelPlayerId: 'player_001',
      aspectRatio: '9:16',
      tier: 'casual',
      enableAutoTracking: false,
    },
    status: 'processing',
    progress: 62,
    queuePosition: undefined,
    estimatedCompletionTime: hoursFromNow(8),
    createdAt: new Date().toISOString(),
  },
];

// In-memory store (replace with Firestore in production)
let jobStore: VideoJob[] = [...SEED_JOBS];

const MOCK_REELS: PlayerReel[] = [
  {
    id: 'reel_001',
    playerId: 'player_001',
    playerName: 'Ahmed K.',
    jobId: 'job_demo1',
    outputUrl: 'https://example.com/reels/ahmed_k.mp4',
    thumbnailUrl: 'https://example.com/reels/ahmed_k_thumb.jpg',
    durationSeconds: 52,
    aspectRatio: '9:16',
    highlights: MOCK_EVENTS.filter(e => e.type === 'goal' || e.type === 'skill'),
    createdAt: '2026-06-21T10:35:00Z',
  },
];

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Submit raw footage for AI processing.
 * Returns the newly created VideoJob in 'queued' status.
 */
export async function submitVideoJob(
  userId: string,
  submission: VideoSubmission
): Promise<VideoJob> {
  await delay(800);
  const job: VideoJob = {
    id: `job_${mockId()}`,
    userId,
    matchId: submission.matchId,
    source: submission.source,
    options: submission.options,
    status: 'queued',
    queuePosition: Math.floor(Math.random() * 4) + 1,
    estimatedCompletionTime: hoursFromNow(24),
    progress: 0,
    createdAt: new Date().toISOString(),
  };
  jobStore = [job, ...jobStore];
  return job;
}

/**
 * Fetch all VideoJobs belonging to a user, most recent first.
 */
export async function getVideoJobs(userId: string): Promise<VideoJob[]> {
  await delay(400);
  return jobStore.filter(j => j.userId === userId || j.userId === 'demo');
}

/**
 * Fetch a single job by ID, with a simulated incremental progress tick.
 */
export async function getJobStatus(jobId: string): Promise<VideoJob | null> {
  await delay(300);
  const idx = jobStore.findIndex(j => j.id === jobId);
  if (idx === -1) return null;
  // Simulate progress tick for 'processing' jobs
  const job = { ...jobStore[idx] };
  if (job.status === 'processing' && (job.progress ?? 0) < 100) {
    job.progress = Math.min(100, (job.progress ?? 0) + 5);
    if (job.progress === 100) {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.outputUrl = `https://example.com/outputs/${jobId}.mp4`;
      job.thumbnailUrl = `https://example.com/thumbnails/${jobId}.jpg`;
      job.detectedEvents = MOCK_EVENTS.slice(0, 3);
    }
    jobStore[idx] = job;
  }
  return job;
}

/**
 * Fetch all PlayerReels for a given user.
 */
export async function getPlayerReels(userId: string): Promise<PlayerReel[]> {
  await delay(350);
  // In production: query Firestore collection filtered by userId
  return MOCK_REELS;
}

/**
 * Trigger social sharing for a reel.
 * In production this calls a Cloud Function to publish via platform APIs.
 */
export async function shareReel(
  reelId: string,
  platforms: string[],
  collaborationHandle?: string
): Promise<{ success: boolean; sharedTo: string[] }> {
  await delay(600);
  return { success: true, sharedTo: platforms };
}

/**
 * Cancel a queued job (only possible before processing starts).
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  await delay(300);
  const idx = jobStore.findIndex(j => j.id === jobId);
  if (idx === -1) return false;
  if (jobStore[idx].status !== 'queued') return false;
  jobStore.splice(idx, 1);
  return true;
}

// ─── Utility ───────────────────────────────────────────────────────────────────

export function statusLabel(status: VideoProcessingStatus): string {
  switch (status) {
    case 'queued':     return 'In Queue';
    case 'processing': return 'Processing';
    case 'completed':  return 'Ready';
    case 'failed':     return 'Failed';
  }
}

export function statusColor(status: VideoProcessingStatus): string {
  switch (status) {
    case 'queued':     return '#FFC107';
    case 'processing': return '#4FC3F7';
    case 'completed':  return '#00E676';
    case 'failed':     return '#FF4444';
  }
}
