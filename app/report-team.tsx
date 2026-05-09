import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';

const REASONS = [
  { id: 'no-show', label: '🚫 No-show — did not turn up' },
  { id: 'fake-score', label: '❌ Fake or disputed score' },
  { id: 'ineligible', label: '⚠️ Ineligible player' },
  { id: 'abusive', label: '🔴 Abusive behaviour' },
];

export default function ReportTeamScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { teamId, teamName, matchId } = useLocalSearchParams<{
    teamId: string;
    teamName: string;
    matchId: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Select Reason', 'Please select a reason for the report');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const reporterTeamId = userDoc.data()?.teamId;

      await addDoc(collection(db, 'reports'), {
        reportedTeamId: teamId,
        reportedTeamName: teamName,
        reporterUserId: user.uid,
        reporterTeamId,
        matchId: matchId || null,
        reason,
        details,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        'Report Submitted ✅',
        'Our team will review this report. Verified reports will affect the team\'s trust score.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Error', 'Could not submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ChevronBackground />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 40,
        }]}
      >
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.pageTitle}>Report a Team</Text>

      {/* Reported Team */}
      <View style={styles.reportedCard}>
        <Text style={styles.reportedLabel}>Reporting</Text>
        <Text style={styles.reportedTeam}>{teamName}</Text>
        <Text style={styles.reportedNote}>
          Reports affect the team's trust score. Only submit with valid reason.
        </Text>
      </View>

      {/* Reason */}
      <Text style={styles.sectionTitle}>Reason for Report</Text>
      <View style={styles.reasonList}>
        {REASONS.map(r => (
          <TouchableOpacity
            key={r.id}
            style={[styles.reasonBtn, reason === r.id && styles.reasonBtnActive]}
            onPress={() => setReason(r.id)}
          >
            <View style={[styles.radio, reason === r.id && styles.radioActive]} />
            <Text style={[styles.reasonText, reason === r.id && styles.reasonTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Details */}
      <Text style={styles.sectionTitle}>Additional Details</Text>
      <TextInput
        style={styles.detailsInput}
        value={details}
        onChangeText={setDetails}
        placeholder="Describe what happened..."
        placeholderTextColor={Colors.dark.textSecondary}
        multiline
        numberOfLines={4}
      />

      {/* Proof Note */}
      <View style={styles.proofCard}>
        <Text style={styles.proofTitle}>📎 Evidence</Text>
        <Text style={styles.proofText}>
          If you have photo or video proof, please email it to reports@pich.app
          with your team name and the opponent team name.
          Reports without proof may be dismissed.
        </Text>
      </View>

      {/* Warning */}
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          ⚠️ False reports will negatively affect YOUR trust score.
          Only report genuine violations.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={styles.submitBtnText}>Submit Report</Text>
        }
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text, marginBottom: Spacing.lg },
  reportedCard: { backgroundColor: '#FF444420', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, borderColor: '#FF4444' },
  reportedLabel: { color: '#FF4444', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  reportedTeam: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginTop: 2 },
  reportedNote: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, marginTop: Spacing.sm },
  sectionTitle: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold, marginBottom: Spacing.md },
  reasonList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  reasonBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  reasonBtnActive: { borderColor: '#FF4444', backgroundColor: '#FF444410' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.dark.border },
  radioActive: { borderColor: '#FF4444', backgroundColor: '#FF4444' },
  reasonText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, flex: 1 },
  reasonTextActive: { color: Colors.dark.text },
  detailsInput: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.dark.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.dark.border, height: 100, textAlignVertical: 'top', marginBottom: Spacing.lg },
  proofCard: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  proofTitle: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.bold, marginBottom: Spacing.xs },
  proofText: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, lineHeight: 18 },
  warningCard: { backgroundColor: '#FFC10715', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#FFC107' },
  warningText: { color: '#FFC107', fontSize: FontSizes.xs, lineHeight: 18 },
  submitBtn: { backgroundColor: '#FF4444', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});