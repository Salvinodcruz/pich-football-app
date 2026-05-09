import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getTeam } from '@/src/utils/teamService';
import { auth, db } from '@/src/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import type { Team } from '@/src/types';
import ChevronBackground from '@/src/components/ChevronBackground';


export default function TeamProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isCaptain = team?.captainId === auth.currentUser?.uid;
  const isMyTeam = team?.players?.includes(auth.currentUser?.uid || '');

  useEffect(() => {
    if (id) loadTeam();
  }, [id]);

  const loadTeam = async () => {
    try {
      const data = await getTeam(id);
      setTeam(data);

      // Load actual player profiles
      const profiles: any[] = [];
      for (const pid of data?.players || []) {
        const pDoc = await getDoc(doc(db, 'users', pid));
        if (pDoc.exists()) {
          profiles.push({ id: pDoc.id, ...pDoc.data() });
        }
      }
      setPlayers(profiles);
    } catch (e) {
      Alert.alert('Error', 'Could not load team');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.dark.tint} />
    </View>
  );

  if (!team) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Team not found</Text>
    </View>
  );

  const getTrustColor = (score: number) => {
    if (score >= 70) return Colors.dark.tint;
    if (score >= 30) return '#FFC107';
    return '#FF4444';
  };

  const getPositionColor = (pos: string) => {
    if (pos === 'GK') return '#FFC107';
    if (pos === 'DEF') return '#4FC3F7';
    if (pos === 'MID') return Colors.dark.tint;
    if (pos === 'FWD') return '#FF6B6B';
    return Colors.dark.textSecondary;
  };

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

      {/* Team Header */}
      <View style={styles.teamHeader}>
        {(team as any).logoURL ? (
          <Image source={{ uri: (team as any).logoURL }} style={styles.teamLogoImg} />
        ) : (
          <View style={[styles.teamBadge, { backgroundColor: (team as any).color || Colors.dark.tint }]}>
            <Text style={styles.badgeText}>{team.name.substring(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.teamName}>{team.name}</Text>
        <Text style={styles.teamMeta}>{team.emirate} · {team.format} · {team.skillLevel}</Text>
        {(team as any).teamCode && (
          <View style={styles.teamCodeBadge}>
            <Text style={styles.teamCodeBadgeText}>{(team as any).teamCode}</Text>
          </View>
        )}
        
        <Text style={styles.captainText}>
          👑 Captain: {team.captainName || players.find(p => p.id === team.captainId)?.firstName || 'Unknown'}
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{team.wins || 0}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{team.draws || 0}</Text>
          <Text style={styles.statLabel}>Draws</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{team.losses || 0}</Text>
          <Text style={styles.statLabel}>Losses</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>⭐ {(team.skillRating ?? 0).toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Trust Score */}
      <View style={styles.trustCard}>
        <Text style={styles.trustLabel}>Trust Score</Text>
        <Text style={[styles.trustValue, { color: getTrustColor(team.trustScore || 100) }]}>
          {team.trustScore ?? 100} / 100
        </Text>
        {(team.trustScore || 100) < 30 && (
          <Text style={styles.trustWarning}>⚠️ Low trust — challenge with care</Text>
        )}
      </View>

      {/* Buttons for opponent teams */}
      {!isMyTeam && (
        <>
          <TouchableOpacity
            style={styles.messageCaptainBtn}
            onPress={async () => {
              const user = auth.currentUser;
              if (!user) return;
              const myTeamDoc = await getDoc(doc(db, 'users', user.uid));
              const myTeamId = myTeamDoc.data()?.teamId;
              if (!myTeamId) {
                Alert.alert('Error', 'You are not part of a team');
                return;
              }
              const chatId = [myTeamId, team.id].sort().join('_');
              router.push({
                pathname: '/direct-chat/[id]',
                params: { id: chatId, chatName: team.name }
              });
            }}
          >
            <Text style={styles.messageCaptainBtnText}>💬 Message Captain</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.challengeBtn}
            onPress={() => router.push({
              pathname: '/send-challenge',
              params: {
                toTeamId: team.id,
                toTeamName: team.name,
                toTeamColor: (team as any).color,
              }
            })}
          >
            <Text style={styles.challengeBtnText}>⚡ Send Challenge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => router.push({
              pathname: '/report-team',
              params: { teamId: team.id, teamName: team.name }
            })}
          >
            <Text style={styles.reportBtnText}>🚩 Report Team</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Squad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Squad ({players.length} player{players.length !== 1 ? 's' : ''})
        </Text>
        {players.length === 0 ? (
          <Text style={styles.emptyText}>No players yet</Text>
        ) : (
          players.map((player, i) => (
            <View key={player.id} style={styles.playerRow}>
              <Text style={styles.playerNumber}>{i + 1}</Text>

              {player.photoURL ? (
                <Image source={{ uri: player.photoURL }} style={styles.playerAvatarImg} />
              ) : (
                <View style={[styles.playerAvatar, { backgroundColor: ((team as any).color || Colors.dark.tint) + '40' }]}>
                  <Text style={styles.playerAvatarText}>
                    {(player.firstName || player.name || 'P')[0].toUpperCase()}
                    {(player.lastName || '')[0]?.toUpperCase() || ''}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.playerNameRow}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {player.firstName
                      ? `${player.firstName} ${player.lastName || ''}`
                      : player.name || 'Unknown'}
                  </Text>
                  {player.id === team.captainId && (
                    <View style={styles.captainBadgeContainer}>
                      <Text style={styles.captainBadge}>C</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.playerIdText}>{player.playerId}</Text>
              </View>

              <View style={[styles.posBadge, { borderColor: getPositionColor(player.teamPosition || player.position) }]}>
                <Text style={[styles.posText, { color: getPositionColor(player.teamPosition || player.position) }]}>
                  {player.teamPosition || player.position || '?'}
                </Text>
              </View>

              <View style={styles.playerStats}>
                <Text style={styles.playerStatText}>⚽ {player.goals || 0}</Text>
                <Text style={styles.playerStatText}>🎯 {player.assists || 0}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Captain Actions */}
      {isCaptain && (
        <View style={styles.captainActions}>
          <Text style={styles.sectionTitle}>Captain Actions</Text>
          <TouchableOpacity
            style={styles.viewChallengesBtn}
            onPress={() => router.push('/challenges')}
          >
            <Text style={styles.viewChallengesBtnText}>⚡ View Challenges</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  teamLogoImg: { width: 80, height: 80, borderRadius: 40, marginBottom: Spacing.md },
  content: { padding: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.background },
  backBtn: { marginBottom: Spacing.lg },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  teamHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  teamBadge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  badgeText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.xl },
  teamName: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.dark.text, textAlign: 'center' },
  teamMeta: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  captainText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statBox: { flex: 1, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  statValue: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  statLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  trustCard: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.sm },
  trustLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  trustValue: { fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  trustWarning: { color: '#FFC107', fontSize: FontSizes.xs, width: '100%' },
  messageCaptainBtn: { backgroundColor: '#4FC3F720', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#4FC3F7' },
  messageCaptainBtnText: { color: '#4FC3F7', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  challengeBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm },
  challengeBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  reportBtn: { borderWidth: 1, borderColor: '#FF4444', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg },
  reportBtnText: { color: '#FF4444', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.dark.text, marginBottom: Spacing.md },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  playerNumber: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, width: 16 },
  playerAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  playerAvatarText: { color: Colors.dark.text, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  playerName: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, flexShrink: 1 },
  playerIdText: { color: Colors.dark.textSecondary, fontSize: 10 },
  captainBadgeContainer: { backgroundColor: Colors.dark.tint, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  captainBadge: { color: '#000', fontSize: 9, fontWeight: FontWeights.bold },
  posBadge: { paddingHorizontal: Spacing.xs, paddingVertical: 2, borderRadius: BorderRadius.sm, borderWidth: 1 },
  posText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  playerStats: { gap: 2, alignItems: 'flex-end' },
  playerStatText: { color: Colors.dark.textSecondary, fontSize: 10 },
  emptyText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  captainActions: { gap: Spacing.sm },
  viewChallengesBtn: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.tint },
  viewChallengesBtnText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  errorText: { color: Colors.dark.textSecondary, fontSize: FontSizes.md },
  playerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  teamCodeBadge: { marginTop: 4, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: 4, borderWidth: 1, borderColor: Colors.dark.border },
  teamCodeBadgeText: { color: Colors.dark.tint, fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 1 },
});