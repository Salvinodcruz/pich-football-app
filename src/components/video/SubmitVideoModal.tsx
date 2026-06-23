/**
 * SubmitVideoModal — Sheet for submitting footage to Pich AI.
 *
 * Step 1: Choose source (smartphone, dual-phone, external URL)
 * Step 2: Pick output format & options
 * Step 3: Review & submit
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, TextInput, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import {
  VideoSubmission,
  VideoSourceType,
  VideoOutputFormat,
  VideoTier,
} from '@/src/types/aiVideo';

interface Props {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (submission: VideoSubmission) => void;
}

type Step = 1 | 2 | 3;

const SOURCE_OPTIONS: { type: VideoSourceType; label: string; icon: string; desc: string }[] = [
  { type: 'smartphone',    label: 'Single Phone',    icon: 'phone-portrait-outline', desc: 'Upload from your phone gallery' },
  { type: 'dual-phone',   label: 'Dual Phone Rig',  icon: 'phone-landscape-outline', desc: 'Halfway-line 2-camera setup' },
  { type: 'external-url', label: 'External URL',    icon: 'link-outline',            desc: 'YouTube or any public video link' },
];

const FORMAT_OPTIONS: { format: VideoOutputFormat; label: string; icon: string; desc: string }[] = [
  { format: 'highlights',  label: 'Highlights Reel', icon: 'flash-outline',       desc: '1–6 min condensed action' },
  { format: 'player-reel', label: 'Player Reel',     icon: 'person-outline',      desc: 'Vertical 9:16 reel for social' },
  { format: 'compilation', label: 'Compilation',     icon: 'film-outline',         desc: 'Multi-match montage' },
  { format: 'full-match',  label: 'Full Match',      icon: 'videocam-outline',     desc: 'Stabilised and colour-graded' },
];

const TIER_OPTIONS: { tier: VideoTier; label: string; color: string; desc: string }[] = [
  { tier: 'casual',     label: 'Casual',     color: '#888',    desc: 'No overlays — simple highlights' },
  { tier: 'league',     label: 'League',     color: '#4FC3F7', desc: 'Branded intro + basic scoreboard' },
  { tier: 'tournament', label: 'Tournament', color: '#FFC107', desc: 'Full sponsor overlays + analytics' },
];

export default function SubmitVideoModal({ visible, submitting, onClose, onSubmit }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [sourceType, setSourceType] = useState<VideoSourceType>('smartphone');
  const [localUri, setLocalUri] = useState<string | undefined>();
  const [externalUrl, setExternalUrl] = useState('');
  const [outputFormat, setOutputFormat] = useState<VideoOutputFormat>('highlights');
  const [targetMinutes, setTargetMinutes] = useState(3);
  const [includeSlowMotion, setIncludeSlowMotion] = useState(true);
  const [includeBroadcast, setIncludeBroadcast] = useState(false);
  const [enableTracking, setEnableTracking] = useState(true);
  const [tier, setTier] = useState<VideoTier>('casual');
  const [collaborationHandle, setCollaborationHandle] = useState('@pich.ae');

  const reset = () => {
    setStep(1);
    setSourceType('smartphone');
    setLocalUri(undefined);
    setExternalUrl('');
    setOutputFormat('highlights');
    setTargetMinutes(3);
    setIncludeSlowMotion(true);
    setIncludeBroadcast(false);
    setEnableTracking(true);
    setTier('casual');
    setCollaborationHandle('@pich.ae');
  };

  const handleClose = () => { reset(); onClose(); };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to upload footage.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled && result.assets[0].uri) {
      setLocalUri(result.assets[0].uri);
    }
  };

  const canProceedStep1 = sourceType === 'external-url'
    ? externalUrl.trim().length > 0
    : !!localUri;

  const handleSubmit = () => {
    const submission: VideoSubmission = {
      source: {
        type: sourceType,
        uri: localUri,
        externalUrl: sourceType === 'external-url' ? externalUrl.trim() : undefined,
      },
      options: {
        outputFormat,
        targetDurationMinutes: targetMinutes,
        includeSlowMotion,
        includeBroadcastOverlay: includeBroadcast,
        aspectRatio: outputFormat === 'player-reel' ? '9:16' : '16:9',
        tier,
        enableAutoTracking: enableTracking,
      },
      shareConfig: {
        platforms: ['instagram', 'whatsapp'],
        collaborationHandle,
        hashtags: ['#pichai', '#pich', '#uaefootball'],
      },
    };
    onSubmit(submission);
    reset();
  };

  const stepIndicator = (
    <View style={styles.stepRow}>
      {([1, 2, 3] as Step[]).map(s => (
        <React.Fragment key={s}>
          <View style={[styles.stepDot, step >= s ? styles.stepDotActive : {}]}>
            <Text style={[styles.stepNum, step >= s ? styles.stepNumActive : {}]}>{s}</Text>
          </View>
          {s < 3 && <View style={[styles.stepLine, step > s ? styles.stepLineActive : {}]} />}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Submit Footage</Text>
          <View style={{ width: 36 }} />
        </View>

        {stepIndicator}

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

          {/* ── Step 1: Source ─────────────────────────── */}
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>Choose Video Source</Text>
              {SOURCE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.optionCard, sourceType === opt.type && styles.optionCardActive]}
                  onPress={() => setSourceType(opt.type)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.optionIcon, sourceType === opt.type && { backgroundColor: Colors.dark.tint + '20' }]}>
                    <Ionicons name={opt.icon as any} size={22} color={sourceType === opt.type ? Colors.dark.tint : '#555'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, sourceType === opt.type && { color: '#fff' }]}>{opt.label}</Text>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </View>
                  {sourceType === opt.type && <Ionicons name="checkmark-circle" size={20} color={Colors.dark.tint} />}
                </TouchableOpacity>
              ))}

              {/* Video picker / URL input */}
              {sourceType !== 'external-url' ? (
                <TouchableOpacity style={styles.uploadBtn} onPress={pickVideo}>
                  <Ionicons name={localUri ? 'checkmark-circle-outline' : 'cloud-upload-outline'} size={22} color={localUri ? Colors.dark.tint : '#555'} />
                  <Text style={[styles.uploadBtnText, localUri && { color: Colors.dark.tint }]}>
                    {localUri ? 'Video selected ✓' : 'Select video from gallery'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Video URL</Text>
                  <TextInput
                    style={styles.input}
                    value={externalUrl}
                    onChangeText={setExternalUrl}
                    placeholder="https://youtube.com/..."
                    placeholderTextColor="#444"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </>
              )}
            </>
          )}

          {/* ── Step 2: Options ───────────────────────── */}
          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>Processing Options</Text>

              <Text style={styles.inputLabel}>Output Format</Text>
              {FORMAT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.format}
                  style={[styles.optionCard, outputFormat === opt.format && styles.optionCardActive]}
                  onPress={() => setOutputFormat(opt.format)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.optionIcon, outputFormat === opt.format && { backgroundColor: Colors.dark.tint + '20' }]}>
                    <Ionicons name={opt.icon as any} size={20} color={outputFormat === opt.format ? Colors.dark.tint : '#555'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, outputFormat === opt.format && { color: '#fff' }]}>{opt.label}</Text>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </View>
                  {outputFormat === opt.format && <Ionicons name="checkmark-circle" size={20} color={Colors.dark.tint} />}
                </TouchableOpacity>
              ))}

              {outputFormat === 'highlights' && (
                <>
                  <Text style={styles.inputLabel}>Target Duration: {targetMinutes} min</Text>
                  <View style={styles.durationRow}>
                    {[1, 2, 3, 4, 5, 6].map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.durationBtn, targetMinutes === m && styles.durationBtnActive]}
                        onPress={() => setTargetMinutes(m)}
                      >
                        <Text style={[styles.durationText, targetMinutes === m && { color: Colors.dark.tint }]}>{m}m</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.inputLabel}>Production Tier</Text>
              {TIER_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.tier}
                  style={[styles.optionCard, tier === opt.tier && { borderColor: opt.color + '66', backgroundColor: opt.color + '0A' }]}
                  onPress={() => setTier(opt.tier)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.optionIcon, { backgroundColor: opt.color + '20' }]}>
                    <Ionicons name="ribbon-outline" size={20} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, { color: tier === opt.tier ? '#fff' : '#888' }]}>{opt.label}</Text>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </View>
                  {tier === opt.tier && <Ionicons name="checkmark-circle" size={20} color={opt.color} />}
                </TouchableOpacity>
              ))}

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Auto Ball Tracking</Text>
                  <Text style={styles.toggleDesc}>AI pans/zooms a static camera</Text>
                </View>
                <Switch
                  value={enableTracking}
                  onValueChange={setEnableTracking}
                  trackColor={{ false: '#2A2A2A', true: Colors.dark.tint }}
                  thumbColor={enableTracking ? '#000' : '#888'}
                />
              </View>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Slow-Motion Replays</Text>
                  <Text style={styles.toggleDesc}>Key events get slow-mo treatment</Text>
                </View>
                <Switch
                  value={includeSlowMotion}
                  onValueChange={setIncludeSlowMotion}
                  trackColor={{ false: '#2A2A2A', true: Colors.dark.tint }}
                  thumbColor={includeSlowMotion ? '#000' : '#888'}
                />
              </View>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Broadcast Scoreboard</Text>
                  <Text style={styles.toggleDesc}>Dynamic score overlay</Text>
                </View>
                <Switch
                  value={includeBroadcast}
                  onValueChange={setIncludeBroadcast}
                  trackColor={{ false: '#2A2A2A', true: Colors.dark.tint }}
                  thumbColor={includeBroadcast ? '#000' : '#888'}
                />
              </View>
            </>
          )}

          {/* ── Step 3: Review ────────────────────────── */}
          {step === 3 && (
            <>
              <Text style={styles.stepTitle}>Review & Submit</Text>
              <View style={styles.reviewCard}>
                <ReviewRow label="Source" value={SOURCE_OPTIONS.find(s => s.type === sourceType)?.label ?? ''} />
                <ReviewRow label="Format" value={FORMAT_OPTIONS.find(f => f.format === outputFormat)?.label ?? ''} />
                {outputFormat === 'highlights' && <ReviewRow label="Duration" value={`${targetMinutes} minutes`} />}
                <ReviewRow label="Tier" value={tier.charAt(0).toUpperCase() + tier.slice(1)} />
                <ReviewRow label="Ball Tracking" value={enableTracking ? 'On' : 'Off'} />
                <ReviewRow label="Slow Motion" value={includeSlowMotion ? 'On' : 'Off'} />
                <ReviewRow label="Scoreboard" value={includeBroadcast ? 'On' : 'Off'} />
              </View>

              <Text style={styles.inputLabel}>Social Collaboration Handle</Text>
              <TextInput
                style={styles.input}
                value={collaborationHandle}
                onChangeText={setCollaborationHandle}
                placeholder="@handle"
                placeholderTextColor="#444"
                autoCapitalize="none"
              />

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color="#4FC3F7" />
                <Text style={styles.infoText}>
                  {"Your footage will be processed within 24 hours. You'll receive a notification when it's ready."}
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep((step - 1) as Step)}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          {step < 3 ? (
            <TouchableOpacity
              style={[styles.nextBtn, !canProceedStep1 && step === 1 && { opacity: 0.4 }]}
              onPress={() => setStep((step + 1) as Step)}
              disabled={step === 1 && !canProceedStep1}
            >
              <Text style={styles.nextBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color="#000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#000" />
                : <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#000" />
                    <Text style={styles.nextBtnText}>Submit</Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={reviewStyles.row}>
      <Text style={reviewStyles.label}>{label}</Text>
      <Text style={reviewStyles.value}>{value}</Text>
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  label: { color: '#666', fontSize: FontSizes.sm },
  value: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: 0,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: { backgroundColor: Colors.dark.tint + '22', borderColor: Colors.dark.tint },
  stepNum: { color: '#555', fontSize: 12, fontWeight: FontWeights.bold },
  stepNumActive: { color: Colors.dark.tint },
  stepLine: { flex: 1, height: 1, backgroundColor: '#2A2A2A', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: Colors.dark.tint + '66' },
  body: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
  stepTitle: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginBottom: Spacing.xs,
  },
  optionCardActive: {
    borderColor: Colors.dark.tint + '66',
    backgroundColor: Colors.dark.tint + '0A',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: { color: '#888', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  optionDesc: { color: '#444', fontSize: FontSizes.xs, marginTop: 2 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginTop: Spacing.xs,
  },
  uploadBtnText: { color: '#555', fontSize: FontSizes.sm },
  inputLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: '#fff',
    fontSize: FontSizes.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  durationRow: { flexDirection: 'row', gap: Spacing.sm },
  durationBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  durationBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '18' },
  durationText: { color: '#666', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  toggleLabel: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  toggleDesc: { color: '#555', fontSize: FontSizes.xs, marginTop: 2 },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: '#4FC3F710',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#4FC3F730',
    marginTop: Spacing.sm,
  },
  infoText: { color: '#4FC3F7', fontSize: FontSizes.xs, flex: 1, lineHeight: 18 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: '#080808',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  backBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  backBtnText: { color: '#888', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark.tint,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  nextBtnText: { color: '#000', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
});
