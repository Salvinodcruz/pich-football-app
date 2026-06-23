/**
 * useAIVideo — Custom hook for the Pich AI video processing feature.
 *
 * Encapsulates all async data-fetching and submission logic so screens
 * remain thin view layers.
 *
 * Usage:
 *   const { jobs, reels, submitting, submitJob, refreshJobs } = useAIVideo();
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { auth } from '@/src/config/firebase';
import {
  VideoJob,
  PlayerReel,
  VideoSubmission,
} from '../types/aiVideo';
import {
  getVideoJobs,
  getPlayerReels,
  submitVideoJob,
  cancelJob,
  shareReel,
  PICH_AI_ENABLED,
} from '../services/aiVideoService';

interface UseAIVideoResult {
  /** Feature flag — hide UI entirely when false. */
  enabled: boolean;
  jobs: VideoJob[];
  reels: PlayerReel[];
  loading: boolean;
  submitting: boolean;
  /** Re-fetch jobs and reels. */
  refreshJobs: () => Promise<void>;
  /** Submit new footage. Resolves with the created job or null on error. */
  submitJob: (submission: VideoSubmission) => Promise<VideoJob | null>;
  /** Cancel a queued job. */
  cancelJobById: (jobId: string) => Promise<void>;
  /** Share a reel to social platforms. */
  shareReelById: (reelId: string, platforms: string[], handle?: string) => Promise<void>;
}

export function useAIVideo(): UseAIVideoResult {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [reels, setReels] = useState<PlayerReel[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const userId = auth.currentUser?.uid ?? 'demo';

  const refreshJobs = useCallback(async () => {
    if (!PICH_AI_ENABLED) return;
    setLoading(true);
    try {
      const [fetchedJobs, fetchedReels] = await Promise.all([
        getVideoJobs(userId),
        getPlayerReels(userId),
      ]);
      setJobs(fetchedJobs);
      setReels(fetchedReels);
    } catch (err) {
      console.error('[useAIVideo] refreshJobs error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  const submitJob = useCallback(
    async (submission: VideoSubmission): Promise<VideoJob | null> => {
      if (!PICH_AI_ENABLED) return null;
      setSubmitting(true);
      try {
        const job = await submitVideoJob(userId, submission);
        setJobs(prev => [job, ...prev]);
        return job;
      } catch (err) {
        console.error('[useAIVideo] submitJob error:', err);
        Alert.alert('Submission Failed', 'Could not submit your footage. Please try again.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [userId]
  );

  const cancelJobById = useCallback(
    async (jobId: string) => {
      const ok = await cancelJob(jobId);
      if (ok) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
      } else {
        Alert.alert('Cannot Cancel', 'Only queued jobs can be cancelled.');
      }
    },
    []
  );

  const shareReelById = useCallback(
    async (reelId: string, platforms: string[], handle?: string) => {
      try {
        const result = await shareReel(reelId, platforms, handle);
        if (result.success) {
          Alert.alert('Shared!', `Reel shared to: ${result.sharedTo.join(', ')}`);
        }
      } catch {
        Alert.alert('Share Failed', 'Could not share the reel. Please try again.');
      }
    },
    []
  );

  return {
    enabled: PICH_AI_ENABLED,
    jobs,
    reels,
    loading,
    submitting,
    refreshJobs,
    submitJob,
    cancelJobById,
    shareReelById,
  };
}
