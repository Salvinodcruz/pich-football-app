import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getTeam, requestToJoinTeam, startConversation } from '@/src/utils/teamService';
import { auth, db } from '@/src/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import type { Team } from '@/src/types';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';


export default function TeamProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id, preview } = useLocalSearchParams<{ id: string, preview?: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [hasTeam, setHasTeam] = useState(false);

  const isCaptain = team?.captainId === auth.currentUser?.uid;
  const isMyTeam = team?.players?.includes(auth.currentUser?.uid || '');
  const isPreview = preview === 'true';

  useEffect(() => {
    if (id) {
      loadTeam();
      checkUserTeam();
    }
  }, [id]);

  const checkUserTeam = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    setHasTeam(!!userDoc.data()?.teamId);
  };

  const loadTeam = async () => {
    try {
      const data = await getTeam(id);
      setTeam(data);
      const profiles: any[] = [];
      for (const pid of data?.players || []) {
        const pDoc = await getDoc(doc(db, 'users', pid));
        if (pDoc.exists()) profiles.push({ id: pDoc.id, ...pDoc.data() });
      }
      setPlayers(profiles);
    } catch (e) { Alert.alert('Error', 'Could not load team'); } finally { setLoading(false); }
  };

  const handleJoinRequest = async () => {
    const user = auth.currentUser;
    if (!user || !team) return;
    setRequesting(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userName = `${userDoc.data()?.firstName || ''} ${userDoc.data()?.lastName || ''}`.trim() || 'Player';
      await requestToJoinTeam(team.id, user.uid, userName);
      Alert.alert('✅ Request Sent!', 'The captain has been notified.');
    } catch (e: any) {
      Alert.alert('Info', e.message || 'Could not send request');
    } finally { setRequesting(false); }
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

  const getPositionColor = (pos: string) => {
    if (pos === 'GK') return '#FFC107';
    if (pos === 'DEF') return '#4FC3F7';
    if (pos === 'MID') return Colors.dark.tint;
    if (pos === 'FWD') return '#FF6B6B';
    return Colors.dark.textSecondary;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 40 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={20} color={Colors.dark.tint} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>

        {/* Team Header Glass */}
        <View style={styles.headerGlass}>
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
            <View style={styles.teamCodeBadge}><Text style={styles.teamCodeBadgeText}>{(team as any).teamCode}</Text></View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
            <Ionicons name="star" size={14} color={Colors.dark.tint} />
            <Text style={styles.captainText}>{team.captainName || players.find(p => p.id === team.captainId)?.firstName || 'Captain'}</Text>
          </View>
        </View>

        {/* Stats Grid Glass */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Stats</Text>
          <View style={styles.statsRowGlass}>
            <View style={styles.statBoxGlass}>
              <Text style={styles.statValue}>{(team.wins || 0) + (team.draws || 0) + (team.losses || 0)}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={[styles.statBoxGlass, { borderColor: Colors.dark.tint + '40' }]}>
              <Text style={[styles.statValue, { color: Colors.dark.tint }]}>{team.wins || 0}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statBoxGlass}>
              <Text style={styles.statValue}>{team.draws || 0}</Text>
              <Text style={styles.statLabel}>Draws</Text>
            </View>
            <View style={[styles.statBoxGlass, { borderColor: '#FF444440' }]}>
              <Text style={[styles.statValue, { color: '#FF4444' }]}>{team.losses || 0}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
          </View>

          <View style={[styles.statsRowGlass, { marginTop: Spacing.sm }]}>
            <View style={styles.statBoxGlass}>
              <Text style={styles.statValue}>{(team as any).totalGoalsScored || 0}</Text>
              <Text style={styles.statLabel}>Goals Scored</Text>
            </View>
            <View style={styles.statBoxGlass}>
              <Text style={styles.statValue}>{(team as any).totalCleanSheets || 0}</Text>
              <Text style={styles.statLabel}>Clean Sheets</Text>
            </View>
            <View style={styles.statBoxGlass}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Ionicons name="star" size={14} color={Colors.dark.tint} />
                <Text style={styles.statValue}>
                  {players.length > 0 
                    ? (players.reduce((acc, p) => acc + (p.skillRating || 0), 0) / players.length).toFixed(1)
                    : (team.skillRating?.toFixed(1) || '0.0')}
                </Text>
              </View>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {!isMyTeam && !isPreview && (
          <View style={styles.actionsContainer}>
            {!hasTeam && (
              <TouchableOpacity style={styles.joinRequestBtn} onPress={handleJoinRequest} disabled={requesting}>
                {requesting ? <ActivityIndicator color="#000" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="add" size={20} color="#000" />
                    <Text style={styles.joinRequestBtnText}>Request to Join Team</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.messageCaptainBtnGlass} onPress={async () => {
              const user = auth.currentUser; if (!user) return;
              const chatId = startConversation(user.uid, team.captainId);
              router.push({ pathname: '/direct-chat/[id]', params: { id: team.captainId, name: team.captainName || 'Captain' } });
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="chatbubble" size={20} color="#FFF" />
                <Text style={styles.messageCaptainBtnTextGlass}>Message Captain</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.challengeBtn} onPress={() => router.push({ pathname: '/send-challenge', params: { toTeamId: team.id, toTeamName: team.name, toTeamColor: (team as any).color } })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flash" size={20} color={Colors.dark.tint} />
                <Text style={styles.challengeBtnText}>Send Challenge</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Squad Glass */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Squad ({players.length})</Text>
          <View style={styles.glassContainer}>
            {players.length === 0 ? (
              <Text style={styles.emptyText}>No players yet</Text>
            ) : (
              players.map((player, i) => (
                <TouchableOpacity 
                  key={player.id} 
                  style={[styles.playerRowGlass, i === players.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => router.push({ pathname: '/player-profile', params: { id: player.id } })}
                >
                  <Text style={styles.playerNumber}>{i + 1}</Text>
                  {player.photoURL ? (
                    <Image source={{ uri: player.photoURL }} style={styles.playerAvatarImg} />
                  ) : (
                    <View style={[styles.playerAvatar, { backgroundColor: ((team as any).color || Colors.dark.tint) + '20' }]}>
                      <Text style={styles.playerAvatarText}>{(player.firstName || player.name || 'P')[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.playerNameRow}>
                      <Text style={styles.playerName} numberOfLines={1}>{player.firstName ? `${player.firstName} ${player.lastName}` : player.name}</Text>
                      {player.id === team.captainId && (<View style={styles.captainBadgeContainer}><Text style={styles.captainBadge}>C</Text></View>)}
                    </View>
                    <Text style={styles.playerIdText}>{player.playerId}</Text>
                  </View>
                  <View style={[styles.posBadge, { borderColor: getPositionColor(player.teamPosition || player.position) }]}>
                    <Text style={[styles.posText, { color: getPositionColor(player.teamPosition || player.position) }]}>{player.teamPosition || player.position || '?'}</Text>
                  </View>
                  <View style={styles.playerStats}>
                    {(player.teamPosition === 'GK' || player.position === 'GK') ? (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MaterialCommunityIcons name="shield-check-outline" size={10} color={Colors.dark.tint} />
                          <Text style={styles.playerStatText}>{player.totalCleanSheets || 0}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MaterialCommunityIcons name="hand-front-right-outline" size={10} color={Colors.dark.tint} />
                          <Text style={styles.playerStatText}>{player.totalSaves || 0}</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="football" size={10} color="rgba(255,255,255,0.4)" />
                          <Text style={styles.playerStatText}>{player.goals || 0}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="star-outline" size={10} color="rgba(255,255,255,0.4)" />
                          <Text style={styles.playerStatText}>{player.assists || 0}</Text>
                        </View>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {isCaptain && !isPreview && (
          <TouchableOpacity style={styles.viewChallengesBtn} onPress={() => router.push('/challenges')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <Ionicons name="flash" size={20} color={Colors.dark.tint} />
              <Text style={styles.viewChallengesBtnText}>View Challenges</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.reportBtn} onPress={() => router.push({ pathname: '/report-team', params: { teamId: team.id, teamName: team.name } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="flag" size={14} color="rgba(255,255,255,0.2)" />
            <Text style={styles.reportBtnText}>Report Team</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  backBtn: { marginBottom: Spacing.lg },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  
  // Header Glass
  headerGlass: { alignItems: 'center', marginBottom: Spacing.xl, padding: Spacing.xl, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  teamLogoImg: { width: 80, height: 80, borderRadius: 40, marginBottom: Spacing.md },
  teamBadge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  badgeText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.xl },
  teamName: { fontSize: FontSizes.xl, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  teamMeta: { color: 'rgba(255,255,255,0.5)', fontSize: FontSizes.sm, marginTop: 4 },
  captainText: { color: Colors.dark.tint, fontSize: FontSizes.xs, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },

  // Stats Row Glass
  statsRowGlass: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statBoxGlass: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statValue: { color: '#FFF', fontSize: FontSizes.md, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2, textTransform: 'uppercase' },

  // Action Buttons
  actionsContainer: { gap: Spacing.sm, marginBottom: Spacing.xl },
  joinRequestBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', shadowColor: Colors.dark.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  joinRequestBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: '800' },
  messageCaptainBtnGlass: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  messageCaptainBtnTextGlass: { color: '#FFF', fontSize: FontSizes.md, fontWeight: 'bold' },
  challengeBtn: { backgroundColor: Colors.dark.tint + '20', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.tint },
  challengeBtnText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  reportBtn: { alignSelf: 'center', marginTop: Spacing.xl },
  reportBtnText: { color: 'rgba(255,255,255,0.2)', fontSize: FontSizes.xs, fontWeight: 'semibold', textDecorationLine: 'underline' },

  // Squad Glass
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: 'bold', color: '#AAA', marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  glassContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  playerRowGlass: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  playerNumber: { color: 'rgba(255,255,255,0.2)', fontSize: FontSizes.xs, width: 16 },
  playerAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  playerAvatarText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: 'bold' },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  playerName: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '600', flexShrink: 1 },
  playerIdText: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  captainBadgeContainer: { backgroundColor: Colors.dark.tint, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  captainBadge: { color: '#000', fontSize: 9, fontWeight: 'bold' },
  posBadge: { paddingHorizontal: Spacing.xs, paddingVertical: 2, borderRadius: BorderRadius.sm, borderWidth: 1 },
  posText: { fontSize: 10, fontWeight: 'bold' },
  playerStats: { gap: 2, alignItems: 'flex-end' },
  playerStatText: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: FontSizes.sm, padding: Spacing.md },
  
  viewChallengesBtn: { backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.tint, marginBottom: Spacing.lg },
  viewChallengesBtnText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: 'bold' },
  errorText: { color: 'rgba(255,255,255,0.5)', fontSize: FontSizes.md },
  playerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  teamCodeBadge: { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  teamCodeBadgeText: { color: Colors.dark.tint, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
});
