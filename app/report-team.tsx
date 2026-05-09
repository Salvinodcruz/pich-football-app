import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons } from '@expo/vector-icons';

const REASONS = [
  { id: 'no-show', label: 'No-show — did not turn up', icon: 'person-remove-outline' },
  { id: 'fake-score', label: 'Fake or disputed score', icon: 'close-circle-outline' },
  { id: 'ineligible', label: 'Ineligible player', icon: 'warning-outline' },
  { id: 'abusive', label: 'Abusive behaviour', icon: 'alert-circle-outline' },
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
        'Report Submitted!',
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
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 40,
        }]}
        showsVerticalScrollIndicator={false}
      >
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="arrow-back" size={20} color={Colors.dark.tint} />
          <Text style={styles.backText}>Back</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.pageTitle}>Report a Team</Text>

      {/* Reported Team */}
      <View style={styles.reportedCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="flag" size={16} color="#FF4444" />
          <Text style={styles.reportedLabel}>Reporting Team</Text>
        </View>
        <Text style={styles.reportedTeam}>{teamName}</Text>
        <View style={styles.noteBox}>
           <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.4)" />
           <Text style={styles.reportedNote}>
            Verified reports will affect this team's trust score and rankings.
          </Text>
        </View>
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
            <Ionicons name={r.icon as any} size={20} color={reason === r.id ? '#FF4444' : '#666'} />
            <Text style={[styles.reasonText, reason === r.id && styles.reasonTextActive]}>
              {r.label}
            </Text>
            <View style={[styles.radio, reason === r.id && styles.radioActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Details */}
      <Text style={styles.sectionTitle}>Additional Details</Text>
      <TextInput
        style={styles.detailsInput}
        value={details}
        onChangeText={setDetails}
        placeholder="Describe exactly what happened..."
        placeholderTextColor="#444"
        multiline
        numberOfLines={4}
      />

      {/* Proof Note */}
      <View style={styles.proofCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="attach" size={18} color="#FFF" />
          <Text style={styles.proofTitle}>Evidence</Text>
        </View>
        <Text style={styles.proofText}>
          If you have photo or video proof, please email it to reports@pich.app
          with your team name. Reports without proof may be dismissed.
        </Text>
      </View>

      {/* Warning */}
      <View style={styles.warningCard}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Ionicons name="warning-outline" size={20} color="#FFC107" />
          <Text style={styles.warningText}>
            False reports are a violation of community guidelines and will negatively affect YOUR team's trust score.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#FFF" />
          : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="send" size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>Submit Report</Text>
            </View>
        }
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff', marginBottom: Spacing.lg },
  reportedCard: { backgroundColor: 'rgba(255,68,68,0.05)', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)' },
  reportedLabel: { color: '#FF4444', fontSize: FontSizes.xs, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  reportedTeam: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 8 },
  noteBox: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  reportedNote: { color: 'rgba(255,255,255,0.4)', fontSize: 11, flex: 1 },
  sectionTitle: { color: '#aaa', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  reasonList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  reasonBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  reasonBtnActive: { borderColor: 'rgba(255,68,68,0.5)', backgroundColor: 'rgba(255,68,68,0.05)' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', marginLeft: 'auto' },
  radioActive: { borderColor: '#FF4444', backgroundColor: '#FF4444' },
  reasonText: { color: '#666', fontSize: FontSizes.sm, flex: 1, fontWeight: 'bold' },
  reasonTextActive: { color: '#fff' },
  detailsInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.md, padding: Spacing.md, color: '#fff', fontSize: FontSizes.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', height: 120, textAlignVertical: 'top', marginBottom: Spacing.lg },
  proofCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  proofTitle: { color: '#fff', fontSize: FontSizes.sm, fontWeight: 'bold' },
  proofText: { color: '#666', fontSize: 12, lineHeight: 18, marginTop: 4 },
  warningCard: { backgroundColor: 'rgba(255,193,7,0.05)', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)' },
  warningText: { color: '#FFC107', fontSize: 11, lineHeight: 18, flex: 1, fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#FF4444', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', shadowColor: '#FF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '800' },
});