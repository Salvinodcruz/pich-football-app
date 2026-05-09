import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { getTournament, joinTournament } from '@/src/utils/tournamentService';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';

export default function TournamentScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setUserTeamId(userDoc.data()?.teamId || null);
      }
      const data = await getTournament(id);
      setTournament(data);
    } catch (e) {
      Alert.alert('Error', 'Could not load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!userTeamId) {
      Alert.alert('No Team', 'You need a team to join a tournament');
      return;
    }
    if (tournament.teams?.length >= tournament.maxTeams) {
      Alert.alert('Full', 'This tournament is full');
      return;
    }
    setJoining(true);
    try {
      await joinTournament(id, userTeamId);
      Alert.alert('Joined! 🏆', 'Your team has been added to the tournament');
      load();
    } catch (e) {
      Alert.alert('Error', 'Could not join tournament');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.dark.tint} />
    </View>
  );

  if (!tournament) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Tournament not found</Text>
    </View>
  );

  const isJoined = tournament.teams?.includes(userTeamId);
  const isFull = tournament.teams?.length >= tournament.maxTeams;
  const isCreator = tournament.creatorId === auth.currentUser?.uid;

  const getStatusColor = (s: string) => {
    if (s === 'open') return Colors.dark.tint;
    if (s === 'ongoing') return '#FFC107';
    return Colors.dark.textSecondary;
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.trophyIcon}>🏆</Text>
        <Text style={styles.name}>{tournament.name}</Text>
        <Text style={[styles.status, { color: getStatusColor(tournament.status) }]}>
          {tournament.status?.toUpperCase()}
        </Text>
        <Text style={styles.meta}>
          {tournament.format} · {tournament.emirate}
        </Text>
      </View>

      {/* Details */}
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Teams</Text>
          <Text style={styles.detailValue}>
            {tournament.teams?.length || 0} / {tournament.maxTeams}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Start Date</Text>
          <Text style={styles.detailValue}>{tournament.startDate}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Venue</Text>
          <Text style={styles.detailValue}>{tournament.venue}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Entry Fee</Text>
          <Text style={styles.detailValue}>
            {tournament.entryFee > 0 ? `AED ${tournament.entryFee}` : 'Free'}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          {tournament.teams?.length || 0} of {tournament.maxTeams} teams registered
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {
            width: `${((tournament.teams?.length || 0) / tournament.maxTeams) * 100}%`
          }]} />
        </View>
      </View>

      {/* Join Button */}
      {!isCreator && tournament.status === 'open' && (
        <TouchableOpacity
          style={[
            styles.joinBtn,
            isJoined && styles.joinedBtn,
            isFull && styles.fullBtn,
            joining && styles.joinBtnDisabled,
          ]}
          onPress={isJoined || isFull ? undefined : handleJoin}
          disabled={joining || isJoined || isFull}
        >
          {joining
            ? <ActivityIndicator color="#000" />
            : <Text style={[styles.joinBtnText, isJoined && styles.joinedBtnText]}>
                {isJoined ? '✓ Joined' : isFull ? 'Tournament Full' : '+ Join Tournament'}
              </Text>
          }
        </TouchableOpacity>
      )}

      {isCreator && (
        <View style={styles.creatorBadge}>
          <Text style={styles.creatorText}>👑 You created this tournament</Text>
        </View>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.background },
  backBtn: { marginBottom: Spacing.lg },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  trophyIcon: { fontSize: 48, marginBottom: Spacing.sm },
  name: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.dark.text, textAlign: 'center' },
  status: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, marginTop: 4 },
  meta: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  card: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  detailLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  detailValue: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  divider: { height: 1, backgroundColor: Colors.dark.border },
  progressSection: { marginBottom: Spacing.xl },
  progressLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.sm },
  progressBar: { height: 8, backgroundColor: Colors.dark.card, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.dark.tint, borderRadius: 4 },
  joinBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  joinedBtn: { backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.tint },
  fullBtn: { backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.border },
  joinBtnDisabled: { opacity: 0.6 },
  joinBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  joinedBtnText: { color: Colors.dark.tint },
  creatorBadge: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#FFC107' },
  creatorText: { color: '#FFC107', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  errorText: { color: Colors.dark.textSecondary, fontSize: FontSizes.md },
});