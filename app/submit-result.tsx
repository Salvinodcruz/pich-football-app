import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import { recalculateAllRatings } from '@/src/utils/ratingService';
import { submitMatchResult } from '@/src/utils/matchService';
import CustomDialog from '@/src/components/CustomDialog';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDialog } from '@/src/context/DialogContext';

export default function SubmitResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useDialog();
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
  const [goalkeeperId, setGoalkeeperId] = useState<string | null>(null);
  const [playerSaves, setPlayerSaves] = useState<Record<string, number>>({});
  const [playerCleanSheets, setPlayerCleanSheets] = useState<Record<string, boolean>>({});
  const [myTeamId, setMyTeamId] = useState('');
  const [matchData, setMatchData] = useState<any>(null);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => { 
    const unsub = onSnapshot(doc(db, 'challenges', challengeId), (snap) => {
      if (snap.exists()) setMatchData(snap.data());
    });
    loadPlayers(); 
    return () => unsub();
  }, []);

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
        if (pDoc.exists()) {
          const pData = pDoc.id === user.uid ? { ...pDoc.data(), ...userDoc.data() } : pDoc.data();
          profiles.push({ id: pDoc.id, ...pData });
        }
      }
      setMyPlayers(profiles);
      // Auto-set GK if player has GK position or teamPosition
      const defaultGK = profiles.find(p => p.teamPosition === 'GK' || p.position === 'GK');
      if (defaultGK) setGoalkeeperId(defaultGK.id);
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

const handleSubmit = async () => {
  if (totalGoalsAssigned > myCurrentScore) {
    showAlert('Error', 'Assigned goals exceed total score');
    return;
  }

  setSubmitting(true);
  try {
    const scoreToSubmit = { home: homeScore, away: awayScore };

      // Save player stats with submission
      const playerStatsSubmission = myPlayers.map(p => ({
        playerId: p.id,
        playerName: `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || 'Player',
        goals: goalkeeperId === p.id ? 0 : (playerGoals[p.id] || 0),
        assists: playerAssists[p.id] || 0,
        isGK: goalkeeperId === p.id,
        saves: goalkeeperId === p.id ? (playerSaves[p.id] || 0) : 0,
        cleanSheet: goalkeeperId === p.id ? (playerCleanSheets[p.id] || false) : false,
      }));

      const result = await submitMatchResult(
        challengeId,
        myTeamId,
        amIHome,
        scoreToSubmit,
        playerStatsSubmission,
        matchData
      );

      if (result.status === 'confirmed') {
        const otherStats = matchData?.homeScoreSubmittedPlayerStats || matchData?.awayScoreSubmittedPlayerStats || [];
        const allPlayerIds = [...new Set([...playerStatsSubmission, ...otherStats].map(s => s.playerId))];
        await recalculateAllRatings(allPlayerIds);
        showResult(
          'Result Confirmed!',
          `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}\n\nPlayer stats have been updated!`,
          () => router.replace('/(tabs)/my-team')
        );
      } else if (result.status === 'disputed') {
        showResult(
          'Score Disputed',
          `Your score: ${homeScore} - ${awayScore}\n\nAn admin will review.`,
          () => router.replace('/(tabs)/my-team')
        );
      } else {
        showResult(
          'Score Submitted',
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
    <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' }}>
      <PremiumBackground />
      <ActivityIndicator size="large" color={Colors.dark.tint} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Ionicons name="clipboard-outline" size={24} color={Colors.dark.tint} />
          <Text style={styles.pageTitle}>Submit Result</Text>
        </View>
        <Text style={styles.subtitle}>{homeTeam} vs {awayTeam}</Text>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreColumn}>
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
          </View>
          
          <View style={styles.vsColumn}>
            <Text style={styles.vsText}>VS</Text>
            <Text style={styles.scoreSummary}>{myCurrentScore} — {opponentCurrentScore}</Text>
          </View>

          <View style={styles.scoreColumn}>
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
        </View>

        {/* Player Stats Section */}
        {myPlayers.length > 0 && (
          <View style={styles.playerStatsSection}>
            <View style={styles.playerStatsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="football" size={18} color="#fff" />
                <Text style={styles.playerStatsTitle}>{myTeamName}&apos;s Match Stats</Text>
              </View>
              <Text style={styles.playerStatsSubtitle}>
                {totalGoalsAssigned}/{myCurrentScore} goals assigned
              </Text>
            </View>

            {totalGoalsAssigned > myCurrentScore && (
              <View style={styles.warningCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="warning-outline" size={14} color="#FFC107" />
                  <Text style={styles.warningText}>
                    Goals assigned ({totalGoalsAssigned}) exceed {myTeamName}&apos;s score ({myCurrentScore})
                  </Text>
                </View>
              </View>
            )}

            {myPlayers.map(player => {
              const isGK = goalkeeperId === player.id;
              const goals = playerGoals[player.id] || 0;
              const assists = playerAssists[player.id] || 0;
              const saves = playerSaves[player.id] || 0;
              const cleanSheet = playerCleanSheets[player.id] || false;
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
                    <TouchableOpacity 
                      style={[styles.gkChip, isGK && styles.gkChipActive]}
                      onPress={() => setGoalkeeperId(isGK ? null : player.id)}
                    >
                      <Text style={[styles.gkChipText, isGK && styles.gkChipTextActive]}>GK</Text>
                    </TouchableOpacity>
                  </View>

                  {!isGK ? (
                    <>
                      {/* Goals */}
                      <View style={styles.statControl}>
                        <Ionicons name="football-outline" size={14} color="#aaa" />
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
                    </>
                  ) : (
                    <>
                      {/* Saves */}
                      <View style={styles.statControl}>
                        <MaterialCommunityIcons name="hand-front-right-outline" size={14} color={Colors.dark.tint} />
                        <TouchableOpacity
                          style={styles.statBtn}
                          onPress={() => setPlayerSaves(prev => ({ ...prev, [player.id]: Math.max(0, (prev[player.id] || 0) - 1) }))}
                        >
                          <Text style={styles.statBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.statValue}>{saves}</Text>
                        <TouchableOpacity
                          style={styles.statBtn}
                          onPress={() => setPlayerSaves(prev => ({ ...prev, [player.id]: (prev[player.id] || 0) + 1 }))}
                        >
                          <Text style={styles.statBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Clean Sheet */}
                      <TouchableOpacity 
                        style={[styles.csBtn, cleanSheet && styles.csBtnActive]}
                        onPress={() => setPlayerCleanSheets(prev => ({ ...prev, [player.id]: !cleanSheet }))}
                      >
                        <MaterialCommunityIcons 
                          name={cleanSheet ? "shield-check" : "shield-check-outline"} 
                          size={18} 
                          color={cleanSheet ? Colors.dark.tint : "#666"} 
                        />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Assists */}
                  <View style={styles.statControl}>
                    <MaterialCommunityIcons name="bullseye-arrow" size={14} color="#aaa" />
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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Ionicons name="information-circle-outline" size={18} color="#666" />
            <Text style={styles.infoText}>
              Both captains must submit the same score. Player goals/assists update automatically when confirmed.
            </Text>
          </View>
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
  scoreCard: { 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20, 
    padding: Spacing.md, 
    marginBottom: Spacing.lg, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  scoreColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsColumn: {
    flex: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  scoreControl: { 
    alignItems: 'center', 
    width: '100%',
  },
  scoreTeamLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  scoreBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  scoreBtnText: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  scoreValue: { color: '#fff', fontSize: 32, fontWeight: FontWeights.bold, minWidth: 36, textAlign: 'center' },
  vsText: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '900' },
  scoreSummary: { color: Colors.dark.tint, fontSize: 10, fontWeight: 'bold' },

  // Player stats
  playerStatsSection: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
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
  gkChip: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  gkChipActive: { backgroundColor: Colors.dark.tint + '20', borderColor: Colors.dark.tint },
  gkChipText: { color: '#666', fontSize: 8, fontWeight: 'bold' },
  gkChipTextActive: { color: Colors.dark.tint },
  csBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  csBtnActive: { backgroundColor: Colors.dark.tint + '10', borderColor: Colors.dark.tint + '40' },
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
