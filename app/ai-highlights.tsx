/**
 * AI Highlights — Full-screen video processing hub.
 *
 * Layout:
 *   ├─ Header bar (back, title, refresh)
 *   ├─ Hero banner (feature intro)
 *   ├─ Tab switcher: Jobs | Reels
 *   └─ ScrollView content for whichever tab is active
 *
 * FAB at bottom-right opens SubmitVideoModal.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PremiumBackground from '@/src/components/PremiumBackground';
import VideoJobCard from '@/src/components/video/VideoJobCard';
import SubmitVideoModal from '@/src/components/video/SubmitVideoModal';
import { useAIVideo } from '@/src/hooks/useAIVideo';
import { VideoJob, VideoSubmission } from '@/src/types/aiVideo';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';

type Tab = 'jobs' | 'reels';

export default function AIHighlightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jobs, reels, loading, submitting, refreshJobs, submitJob, cancelJobById, shareReelById } = useAIVideo();
  const [activeTab, setActiveTab] = useState<Tab>('jobs');
  const [showSubmit, setShowSubmit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshJobs();
    setRefreshing(false);
  };

  const handleSubmit = async (submission: VideoSubmission) => {
    const job = await submitJob(submission);
    if (job) {
      setShowSubmit(false);
      Alert.alert(
        '🎬 Submitted!',
        `Your footage is in the queue (#${job.queuePosition ?? 1}). Expected ready within 24 hours.`
      );
    }
  };

  const handleView = (job: VideoJob) => {
    Alert.alert('Coming Soon', 'In-app video player is coming in the next release. Share or download from notifications.');
  };

  const handleShare = (job: VideoJob) => {
    if (!job.id) return;
    Alert.alert('Share Reel', 'Choose platforms to share to:', [
      { text: 'Instagram', onPress: () => shareReelById(job.id, ['instagram'], '@pich.ai') },
      { text: 'WhatsApp',  onPress: () => shareReelById(job.id, ['whatsapp']) },
      { text: 'All',       onPress: () => shareReelById(job.id, ['instagram', 'tiktok', 'whatsapp'], '@pich.ai') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>AI</Text>
          <Text style={[styles.headerText, { color: Colors.dark.tint }]}> Highlights</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color={Colors.dark.tint} />
            : <Ionicons name="refresh-outline" size={20} color="#666" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.tint} />}
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={14} color={Colors.dark.tint} />
            <Text style={styles.heroBadgeText}>AI-Powered</Text>
          </View>
          <Text style={styles.heroHeading}>Turn your match into{'\n'}broadcast-quality content</Text>
          <Text style={styles.heroSub}>
            Goals · Assists · Skills · Saves detected automatically.{'\n'}
            24-hour turnaround · Vertical reels for social.
          </Text>

          {/* Feature pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.md }}>
            {[
              { icon: 'eye-outline', label: 'Scene Detection' },
              { icon: 'locate-outline', label: 'Ball Tracking' },
              { icon: 'film-outline', label: 'Slow Motion' },
              { icon: 'stats-chart-outline', label: 'Scoreboard' },
              { icon: 'logo-instagram', label: 'Reel Ready' },
            ].map(f => (
              <View key={f.label} style={styles.featurePill}>
                <Ionicons name={f.icon as any} size={14} color={Colors.dark.tint} />
                <Text style={styles.featurePillText}>{f.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          {(['jobs', 'reels'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
                {t === 'jobs' ? `Jobs (${jobs.length})` : `Reels (${reels.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'jobs' && (
            <>
              {jobs.length === 0 && !loading && (
                <EmptyState
                  icon="videocam-outline"
                  title="No jobs yet"
                  subtitle="Submit footage to generate your first highlights reel."
                />
              )}
              {jobs.map(job => (
                <VideoJobCard
                  key={job.id}
                  job={job}
                  onCancel={cancelJobById}
                  onView={handleView}
                  onShare={handleShare}
                />
              ))}
            </>
          )}

          {activeTab === 'reels' && (
            <>
              {reels.length === 0 && !loading && (
                <EmptyState
                  icon="phone-portrait-outline"
                  title="No reels yet"
                  subtitle="Complete a job with Player Reel format to generate individual reels."
                />
              )}
              <View style={styles.reelsGrid}>
                {reels.map(reel => (
                  <TouchableOpacity
                    key={reel.id}
                    style={styles.reelThumb}
                    activeOpacity={0.8}
                    onPress={() => Alert.alert('Coming Soon', 'Reel player is coming in the next release.')}
                  >
                    {reel.thumbnailUrl ? (
                      <Image source={{ uri: reel.thumbnailUrl }} style={styles.reelImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.reelPlaceholder}>
                        <Ionicons name="person-outline" size={28} color="#333" />
                      </View>
                    )}
                    <View style={styles.reelOverlay}>
                      <Text style={styles.reelPlayerName}>{reel.playerName}</Text>
                      <Text style={styles.reelDuration}>{Math.round(reel.durationSeconds / 60)}:{String(reel.durationSeconds % 60).padStart(2, '0')}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.reelShareBtn}
                      onPress={() => shareReelById(reel.id, ['instagram', 'whatsapp'], '@pich.ai')}
                    >
                      <Ionicons name="share-social" size={16} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* FAB — Submit Footage */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setShowSubmit(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#000" />
      </TouchableOpacity>

      {/* Submit Modal */}
      <SubmitVideoModal
        visible={showSubmit}
        submitting={submitting}
        onClose={() => setShowSubmit(false)}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={emptyStyles.container}>
      <Ionicons name={icon as any} size={40} color="#2A2A2A" />
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  title: { color: '#555', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  subtitle: { color: '#333', fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
});

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },

  // Hero
  heroBanner: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: Colors.dark.tint + '18',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.dark.tint + '44',
    marginBottom: Spacing.md,
  },
  heroBadgeText: {
    color: Colors.dark.tint,
    fontSize: 11,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },
  heroHeading: {
    color: '#fff',
    fontSize: 20,
    fontWeight: FontWeights.bold,
    lineHeight: 28,
    marginBottom: Spacing.sm,
  },
  heroSub: {
    color: '#555',
    fontSize: FontSizes.xs,
    lineHeight: 18,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginRight: Spacing.xs,
  },
  featurePillText: { color: '#888', fontSize: 11 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabBtnActive: { backgroundColor: Colors.dark.tint + '22' },
  tabBtnText: { color: '#555', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  tabBtnTextActive: { color: Colors.dark.tint },

  // Content
  tabContent: { paddingHorizontal: Spacing.lg },

  // Reels grid (2-column)
  reelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  reelThumb: {
    width: '48.5%',
    aspectRatio: 9 / 16,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  reelImage: { width: '100%', height: '100%' },
  reelPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  reelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  reelPlayerName: { color: '#fff', fontSize: 12, fontWeight: FontWeights.bold },
  reelDuration: { color: '#888', fontSize: 10 },
  reelShareBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.tint,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.dark.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
