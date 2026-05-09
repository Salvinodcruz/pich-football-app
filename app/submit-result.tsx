import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, updateDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import { recalculateAllRatings } from '@/src/utils/ratingService';
import CustomDialog from '@/src/components/CustomDialog';
import ChevronBackground from '@/src/components/ChevronBackground';

export default function SubmitResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { challengeId, homeTeam, awayTeam, isHome } = useLocalSearchParams<{
    challengeId: string;
    homeTeam: string;
    awayTeam: string;
    isHome: string;
  }>();

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myPlayers, setMyPlayers] = useState<any[]>([]);
  const [playerGoals, setPlayerGoals] = useState<Record<string, number>>({});
  const [playerAssists, setPlayerAssists] = useState<Record<string, number>>({});
  const [myTeamId, setMyTeamId] = useState('');
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => { loadPlayers(); }, []);

  const loadPlayers = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const teamId = userDoc.data()?.teamId;
      if (!teamId) return;
      setMyTeamId(teamId);
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      const playerIds = teamDoc.data()?.players || [];
      const profiles: any[] = [];
      for (const pid of playerIds) {
        const pDoc = await getDoc(doc(db, 'users', pid));
        if (pDoc.exists()) profiles.push({ id: pDoc.id, ...pDoc.data() });
      }
      setMyPlayers(profiles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const showResult = (title: string, message: string, onConfirm: () => void) => {
    setDialog({ visible: true, title, message, onConfirm });
  };

  const totalGoalsAssigned = Object.values(playerGoals).reduce((a, b) => a + b, 0);
  const amIHome = isHome === 'true';
  const myTeamName = amIHome ? homeTeam : awayTeam;
  const opponentTeamName = amIHome ? awayTeam : homeTeam;
  const myCurrentScore = amIHome ? homeScore : awayScore;
  const opponentCurrentScore = amIHome ? awayScore : homeScore;
  const myScore = myCurrentScore;

const handleSubmit = async () => {
  setSubmitting(true);
  try {
    const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
    if (!challengeDoc.exists()) {
      setSubmitting(false);
      return;
    }

    const data = challengeDoc.data();
    const field = isHome === 'true' ? 'homeScoreSubmitted' : 'awayScoreSubmitted';
    const otherField = isHome === 'true' ? 'awayScoreSubmitted' : 'homeScoreSubmitted';
    const scoreToSubmit = { home: homeScore, away: awayScore };

    console.log('📋 challengeId:', challengeId);
    console.log('📋 isHome:', isHome);
    console.log('📋 field:', field);
    console.log('📋 otherField:', otherField);
    console.log('📋 scoreToSubmit:', scoreToSubmit);
    console.log('📋 data[otherField]:', data[otherField]);
    console.log('📋 challenge status:', data.status);
    console.log('📋 myTeamId:', myTeamId);
    console.log('📋 fromTeamId:', data.fromTeamId);
    console.log('📋 toTeamId:', data.toTeamId);

      // Save player stats with submission
      const playerStatsSubmission = myPlayers.map(p => ({
        playerId: p.id,
        playerName: `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || 'Player',
        goals: playerGoals[p.id] || 0,
        assists: playerAssists[p.id] || 0,
        photoURL: p.photoURL || null,
      }));

      await updateDoc(doc(db, 'challenges', challengeId), {
        [field]: scoreToSubmit,
        [`${field}PlayerStats`]: playerStatsSubmission,
      });

      if (data[otherField]) {
        const other = data[otherField];
        
        console.log('🔍 Comparing scores:');
        console.log('My submission:', JSON.stringify(scoreToSubmit));
        console.log('Other submission:', JSON.stringify(other));
        console.log('home match:', other.home === homeScore, '|', other.home, 'vs', homeScore);
        console.log('away match:', other.away === awayScore, '|', other.away, 'vs', awayScore);
        console.log('Types - other.home:', typeof other.home, 'homeScore:', typeof homeScore);

        if (other.home === homeScore && other.away === awayScore) {
          await updateDoc(doc(db, 'challenges', challengeId), {
            status: 'completed',
            finalScore: scoreToSubmit,
            completedAt: new Date().toISOString(),
            // Keep result card for 24hrs
            resultExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          // Update team stats
          await updateTeamStats(data, homeScore, awayScore);

          // Update individual player goals/assists
          await updatePlayerStats(playerStatsSubmission);

          // Recalculate ratings
          await recalculateAllRatings();

          showResult(
            '✅ Result Confirmed!',
            `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}\n\nPlayer stats have been updated!`,
            () => router.replace('/(tabs)/my-team')
          );
        } else {
          await updateDoc(doc(db, 'challenges', challengeId), { status: 'disputed' });
          showResult(
            '⚠️ Score Disputed',
            `Your score: ${homeScore} - ${awayScore}\nTheir score: ${other.home} - ${other.away}\n\nAn admin will review.`,
            () => router.replace('/(tabs)/my-team')
          );
        }
      } else {
        showResult(
          '✅ Score Submitted',
          'Waiting for the other captain to submit their score.',
          () => router.back()
        );
      }
    } catch (e) {
      console.error(e);
      showResult('Error', 'Could not submit result. Please try again.', () => {});
    } finally {
      setSubmitting(false);
    }
  };

  const updatePlayerStats = async (stats: any[]) => {
    for (const stat of stats) {
      if (stat.goals === 0 && stat.assists === 0) continue;
      try {
        const pDoc = await getDoc(doc(db, 'users', stat.playerId));
        if (pDoc.exists()) {
          const pData = pDoc.data();
          await updateDoc(doc(db, 'users', stat.playerId), {
            goals: (pData.goals || 0) + stat.goals,
            assists: (pData.assists || 0) + stat.assists,
          });
        }
      } catch (e) {
        console.error('Player stat update error:', e);
      }
    }
  };

  const updateTeamStats = async (matchData: any, home: number, away: number) => {
    try {
      const fromTeamRef = doc(db, 'teams', matchData.fromTeamId);
      const toTeamRef = doc(db, 'teams', matchData.toTeamId);
      const fromTeamDoc = await getDoc(fromTeamRef);
      const toTeamDoc = await getDoc(toTeamRef);
      if (!fromTeamDoc.exists() || !toTeamDoc.exists()) return;
      const fromData = fromTeamDoc.data();
      const toData = toTeamDoc.data();

      if (home > away) {
        await updateDoc(fromTeamRef, { wins: (fromData.wins || 0) + 1 });
        await updateDoc(toTeamRef, { losses: (toData.losses || 0) + 1 });
      } else if (away > home) {
        await updateDoc(fromTeamRef, { losses: (fromData.losses || 0) + 1 });
        await updateDoc(toTeamRef, { wins: (toData.wins || 0) + 1 });
      } else {
        await updateDoc(fromTeamRef, { draws: (fromData.draws || 0) + 1 });
        await updateDoc(toTeamRef, { draws: (toData.draws || 0) + 1 });
      }

      const allPlayerIds = [...(fromData.players || []), ...(toData.players || [])];
      for (const pid of allPlayerIds) {
        const pDoc = await getDoc(doc(db, 'users', pid));
        if (pDoc.exists()) {
          const pData = pDoc.data();
          await updateDoc(doc(db, 'users', pid), {
            matches: (pData.matches || pData.matchesPlayed || 0) + 1,
          });
        }
      }
    } catch (e) {
      console.error('Team stats update error:', e);
    }
  };

  const ScoreControl = ({ label, score, onIncrease, onDecrease }: any) => (
    <View style={styles.scoreControl}>
      <Text style={styles.scoreTeamLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.scoreRow}>
        <TouchableOpacity style={styles.scoreBtn} onPress={onDecrease}>
          <Text style={styles.scoreBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.scoreValue}>{score}</Text>
        <TouchableOpacity style={styles.scoreBtn} onPress={onIncrease}>
          <Text style={styles.scoreBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
      <ChevronBackground />
      <ActivityIndicator size="large" color={Colors.dark.tint} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ChevronBackground />
      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 40,
        }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Submit Result</Text>
        <Text style={styles.subtitle}>{homeTeam} vs {awayTeam}</Text>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <ScoreControl
            label={myTeamName}
            score={myCurrentScore}
            onIncrease={() => amIHome
              ? setHomeScore(s => s + 1)
              : setAwayScore(s => s + 1)}
            onDecrease={() => amIHome
              ? setHomeScore(s => Math.max(0, s - 1))
              : setAwayScore(s => Math.max(0, s - 1))}
          />
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
            <Text style={styles.scoreSummary}>{myCurrentScore} — {opponentCurrentScore}</Text>
          </View>
          <ScoreControl
            label={opponentTeamName}
            score={opponentCurrentScore}
            onIncrease={() => amIHome
              ? setAwayScore(s => s + 1)
              : setHomeScore(s => s + 1)}
            onDecrease={() => amIHome
              ? setAwayScore(s => Math.max(0, s - 1))
              : setHomeScore(s => Math.max(0, s - 1))}
          />
        </View>

        {/* Player Stats Section */}
        {myPlayers.length > 0 && (
          <View style={styles.playerStatsSection}>
            <View style={styles.playerStatsHeader}>
              <Text style={styles.playerStatsTitle}>⚽ {myTeamName}'s Scorers</Text>
              <Text style={styles.playerStatsSubtitle}>
                {totalGoalsAssigned}/{myCurrentScore} goals assigned
              </Text>
            </View>

            {totalGoalsAssigned > myCurrentScore && (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  ⚠️ Goals assigned ({totalGoalsAssigned}) exceed {myTeamName}'s score ({myCurrentScore})
                </Text>
              </View>
            )}

            {myPlayers.map(player => {
              const goals = playerGoals[player.id] || 0;
              const assists = playerAssists[player.id] || 0;
              const name = player.firstName
                ? `${player.firstName} ${player.lastName || ''}`.trim()
                : player.name || 'Player';

              return (
                <View key={player.id} style={styles.playerStatRow}>
                  {/* Avatar */}
                  {player.photoURL ? (
                    <Image source={{ uri: player.photoURL }} style={styles.playerAvatar} />
                  ) : (
                    <View style={[styles.playerAvatarPlaceholder, { backgroundColor: Colors.dark.tint + '40' }]}>
                      <Text style={styles.playerAvatarText}>
                        {(player.firstName || player.name || 'P')[0].toUpperCase()}
                        {(player.lastName || '')[0]?.toUpperCase() || ''}
                      </Text>
                    </View>
                  )}

                  {/* Name */}
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.playerPosition}>{player.teamPosition || player.position || '?'}</Text>
                  </View>

                  {/* Goals */}
                  <View style={styles.statControl}>
                    <Text style={styles.statLabel}>⚽</Text>
                    <TouchableOpacity
                      style={styles.statBtn}
                      onPress={() => setPlayerGoals(prev => ({ ...prev, [player.id]: Math.max(0, (prev[player.id] || 0) - 1) }))}
                    >
                      <Text style={styles.statBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.statValue}>{goals}</Text>
                    <TouchableOpacity
                      style={styles.statBtn}
                      onPress={() => setPlayerGoals(prev => ({ ...prev, [player.id]: (prev[player.id] || 0) + 1 }))}
                    >
                      <Text style={styles.statBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Assists */}
                  <View style={styles.statControl}>
                    <Text style={styles.statLabel}>🎯</Text>
                    <TouchableOpacity
                      style={styles.statBtn}
                      onPress={() => setPlayerAssists(prev => ({ ...prev, [player.id]: Math.max(0, (prev[player.id] || 0) - 1) }))}
                    >
                      <Text style={styles.statBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.statValue}>{assists}</Text>
                    <TouchableOpacity
                      style={styles.statBtn}
                      onPress={() => setPlayerAssists(prev => ({ ...prev, [player.id]: (prev[player.id] || 0) + 1 }))}
                    >
                      <Text style={styles.statBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            ℹ️ Both captains must submit the same score. Player goals/assists update automatically when confirmed.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.submitBtnText}>Submit Result</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      <CustomDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onClose={() => setDialog(d => ({ ...d, visible: false }))}
        buttons={[{
          text: 'OK',
          style: 'default',
          onPress: () => {
            setDialog(d => ({ ...d, visible: false }));
            dialog.onConfirm();
          },
        }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff' },
  subtitle: { color: Colors.dark.textSecondary, fontSize: FontSizes.md, marginBottom: Spacing.xl },

  // Score card
  scoreCard: { backgroundColor: '#141414CC', borderRadius: BorderRadius.md, padding: Spacing.xl, marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#2A2A2A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreControl: { alignItems: 'center', flex: 1 },
  scoreTeamLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, marginBottom: Spacing.sm, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  scoreBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  scoreBtnText: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  scoreValue: { color: '#fff', fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, minWidth: 40, textAlign: 'center' },
  vsContainer: { alignItems: 'center', gap: 4 },
  vsText: { color: '#666', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  scoreSummary: { color: Colors.dark.tint, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },

  // Player stats
  playerStatsSection: { backgroundColor: '#141414CC', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#2A2A2A' },
  playerStatsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  playerStatsTitle: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  playerStatsSubtitle: { color: Colors.dark.tint, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  warningCard: { backgroundColor: '#FFC10715', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#FFC10740' },
  warningText: { color: '#FFC107', fontSize: FontSizes.xs },
  playerStatRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: '#1E1E1E' },
  playerAvatar: { width: 36, height: 36, borderRadius: 18 },
  playerAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  playerAvatarText: { color: Colors.dark.text, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { color: '#fff', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  playerPosition: { color: '#666', fontSize: 10 },
  statControl: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 12 },
  statBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  statBtnText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold, lineHeight: 16 },
  statValue: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold, minWidth: 16, textAlign: 'center' },

  // Info
  infoCard: { backgroundColor: '#141414CC', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#2A2A2A' },
  infoText: { color: '#666', fontSize: FontSizes.sm, lineHeight: 20 },
  submitBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});