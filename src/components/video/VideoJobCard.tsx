/**
 * VideoJobCard — Displays a single Pich AI processing job.
 *
 * Shows status badge, progress bar (while processing), output thumbnail
 * (when complete), and quick-action buttons.
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import { VideoJob } from '@/src/types/aiVideo';
import { statusLabel, statusColor } from '@/src/services/aiVideoService';

interface Props {
  job: VideoJob;
  onCancel?: (jobId: string) => void;
  onView?: (job: VideoJob) => void;
  onShare?: (job: VideoJob) => void;
}

const FORMAT_LABELS: Record<string, string> = {
  'highlights':   '⚡ Highlights',
  'player-reel':  '🎬 Player Reel',
  'compilation':  '📽 Compilation',
  'full-match':   '📹 Full Match',
};

const TIER_COLORS: Record<string, string> = {
  casual:     '#888',
  league:     '#4FC3F7',
  tournament: '#FFC107',
};

export default function VideoJobCard({ job, onCancel, onView, onShare }: Props) {
  const sColor = statusColor(job.status);
  const isCompleted = job.status === 'completed';
  const isProcessing = job.status === 'processing';
  const isQueued = job.status === 'queued';
  const isFailed = job.status === 'failed';

  return (
    <View style={styles.card}>
      {/* Thumbnail or placeholder */}
      <View style={styles.thumbContainer}>
        {job.thumbnailUrl ? (
          <Image source={{ uri: job.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="videocam-outline" size={32} color="#333" />
          </View>
        )}

        {/* Tier badge */}
        <View style={[styles.tierBadge, { borderColor: TIER_COLORS[job.options.tier] + '60' }]}>
          <Text style={[styles.tierText, { color: TIER_COLORS[job.options.tier] }]}>
            {job.options.tier.toUpperCase()}
          </Text>
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: sColor + '22', borderColor: sColor + '66' }]}>
          <View style={[styles.statusDot, { backgroundColor: sColor }]} />
          <Text style={[styles.statusText, { color: sColor }]}>
            {statusLabel(job.status)}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.formatLabel}>
            {FORMAT_LABELS[job.options.outputFormat] ?? job.options.outputFormat}
          </Text>
          {job.options.aspectRatio === '9:16' && (
            <View style={styles.reelBadge}>
              <Text style={styles.reelBadgeText}>REEL</Text>
            </View>
          )}
        </View>

        {/* Detected events summary */}
        {isCompleted && job.detectedEvents && job.detectedEvents.length > 0 && (
          <View style={styles.eventsRow}>
            {job.detectedEvents.slice(0, 4).map((e, i) => (
              <View key={e.id} style={styles.eventChip}>
                <Text style={styles.eventChipText}>
                  {e.type === 'goal' ? '⚽' : e.type === 'save' ? '🧤' : e.type === 'skill' ? '🪄' : '⚡'} {e.playerName?.split(' ')[0] ?? e.type}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Progress bar */}
        {(isProcessing || isQueued) && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${isQueued ? 0 : (job.progress ?? 0)}%` as any,
                    backgroundColor: isQueued ? '#555' : Colors.dark.tint,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {isQueued
                ? `Queue position: ${job.queuePosition ?? '—'}`
                : `${job.progress ?? 0}%`}
            </Text>
          </View>
        )}

        {/* ETA */}
        {(isQueued || isProcessing) && job.estimatedCompletionTime && (
          <View style={styles.etaRow}>
            <Ionicons name="time-outline" size={13} color="#555" />
            <Text style={styles.etaText}>
              Est. ready: {new Date(job.estimatedCompletionTime).toLocaleDateString('en-AE', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
        )}

        {/* Error message */}
        {isFailed && job.errorMessage && (
          <Text style={styles.errorText}>{job.errorMessage}</Text>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {isCompleted && onView && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => onView(job)}>
              <Ionicons name="play-circle-outline" size={16} color="#000" />
              <Text style={styles.primaryBtnText}>Watch</Text>
            </TouchableOpacity>
          )}
          {isCompleted && onShare && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => onShare(job)}>
              <Ionicons name="share-social-outline" size={16} color={Colors.dark.tint} />
              <Text style={styles.secondaryBtnText}>Share</Text>
            </TouchableOpacity>
          )}
          {isQueued && onCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(job.id)}>
              <Ionicons name="close-circle-outline" size={16} color="#FF4444" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  thumbContainer: {
    height: 160,
    backgroundColor: '#0D0D0D',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  tierBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  tierText: {
    fontSize: 9,
    fontWeight: FontWeights.bold,
    letterSpacing: 1.2,
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: FontWeights.semibold,
  },
  body: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  formatLabel: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    flex: 1,
  },
  reelBadge: {
    backgroundColor: '#FF6B6B22',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF6B6B55',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reelBadgeText: {
    color: '#FF6B6B',
    fontSize: 9,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
  },
  eventsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  eventChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eventChipText: {
    color: '#999',
    fontSize: 11,
  },
  progressContainer: {
    gap: 5,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#1A1A1A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: '#555',
    fontSize: 11,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  etaText: {
    color: '#555',
    fontSize: 11,
  },
  errorText: {
    color: '#FF4444',
    fontSize: FontSizes.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.dark.tint,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.dark.tint + '15',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.tint + '44',
  },
  secondaryBtnText: {
    color: Colors.dark.tint,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF444415',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FF444444',
  },
  cancelBtnText: {
    color: '#FF4444',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
});
