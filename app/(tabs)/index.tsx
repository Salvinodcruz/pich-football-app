import React, { useState, useEffect, useRef } from 'react';
import {View, Text, StyleSheet, ScrollView,TouchableOpacity, ActivityIndicator, RefreshControl,Image, Modal, Dimensions,} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Polygon } from 'react-native-svg';
import {doc, getDoc, collection, query,where, orderBy, limit, updateDoc, onSnapshot, getDocs,} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import CustomDialog from '@/src/components/CustomDialog';
import PremiumBackground from '@/src/components/PremiumBackground';
import HeroMatchCard from '@/src/components/HeroMatchCard';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// LaLiga-style match card
function MatchCard({ match, onPress }: { match: any; onPress: () => void }) {
  const W = SCREEN_WIDTH - 32;
  const isToday = () => {
    try {
      const MONTHS: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      let cleanDate = match.date.replace(/^[a-zA-Z]+\s*,\s*/i, '').trim();
      const parts = cleanDate.split(' ');
      const day = parseInt(parts[0]);
      const month = MONTHS[parts[1]?.toLowerCase().substring(0, 3)];
      const year = parseInt(parts[2]) || new Date().getFullYear();
      const matchDate = new Date(year, month, day);
      const today = new Date();
      return matchDate.toDateString() === today.toDateString();
    } catch { return false; }
  };

  const dateLabel = isToday() ? 'TODAY' : match.date?.replace(/^[a-zA-Z]+\s*,\s*/i, '').trim() || match.date;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.matchCardOuter}>
      <View style={styles.matchCardBg} />
      <Svg style={StyleSheet.absoluteFillObject} width={SCREEN_WIDTH - 32} height={110}>
        <Polygon points={`0,0 ${W * 0.45},0 ${W * 0.7},110 0,110`} fill="#202020" />
        <Polygon points={`${W * 0.55},0 ${W},0 ${W},110 ${W * 0.3},110`} fill="#1C1C1C" />
        <Polygon points={`${W * 0.4},0 ${W * 0.6},0 ${W * 0.55},110 ${W * 0.45},110`} fill="#181818" />
      </Svg>

      <View style={styles.matchCardContent}>
        <View style={styles.matchTypeBadge}>
          <View style={styles.matchTypeDot} />
          <Text style={styles.matchTypeText}>
            {(match.matchType || 'FRIENDLY').toUpperCase()} · {(match.format || '').toUpperCase()}
          </Text>
        </View>

        <View style={styles.matchTeamsRow}>
          <View style={styles.matchTeamSide}>
            <View style={[styles.matchTeamBadge, { backgroundColor: match.fromTeamColor || Colors.dark.tint }]}>
              <Text style={styles.matchTeamBadgeText}>{match.fromTeamName?.substring(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.matchTeamName} numberOfLines={1}>{match.fromTeamName}</Text>
          </View>

          <View style={styles.matchCenterCol}>
            <Text style={styles.matchDateLabel}>{dateLabel}</Text>
            <Text style={styles.matchTimeLabel}>{match.time}</Text>
          </View>

          <View style={styles.matchTeamSide}>
            <View style={[styles.matchTeamBadge, { backgroundColor: match.toTeamColor || '#FF6B6B' }]}>
              <Text style={[styles.matchTeamBadgeText, { color: '#fff' }]}>{match.toTeamName?.substring(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.matchTeamName} numberOfLines={1}>{match.toTeamName}</Text>
          </View>
        </View>

        <View style={styles.matchBottomRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 }}>
            <Ionicons name="location-outline" size={12} color="#555" />
            <Text style={styles.matchVenue} numberOfLines={1}>{match.venue}</Text>
          </View>
          <View style={[styles.matchConfirmedBadge, match.status === 'disputed' && { borderColor: '#FF444450', backgroundColor: '#FF444412' }]}>
            <Text style={[styles.matchConfirmedText, match.status === 'disputed' && { color: '#FF4444' }]}>
              {match.status === 'disputed' ? (
                <Ionicons name="warning" size={10} color="#FF4444" />
              ) : (
                <Ionicons name="checkmark-circle" size={10} color={Colors.dark.tint} />
              )}
              {match.status === 'disputed' ? ' DISPUTED' : ' CONFIRMED'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CompletedMatchCards({ teamId }: { teamId: string | null }) {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!teamId) return;
    loadResults();
  }, [teamId]);

  const loadResults = async () => {
    try {
      const now = new Date().toISOString();
      const [q1, q2] = await Promise.all([
        getDocs(query(collection(db, 'challenges'), where('fromTeamId', '==', teamId), where('status', '==', 'completed'))),
        getDocs(query(collection(db, 'challenges'), where('toTeamId', '==', teamId), where('status', '==', 'completed'))),
      ]);
      const all = [...q1.docs, ...q2.docs]
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((m: any) => m.resultExpiresAt && m.resultExpiresAt > now);
      setResults(all);
    } catch (e) { console.error(e); }
  };

  if (results.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Results</Text>
      {results.map((m: any) => {
        const homeStats: any[] = m.homeScoreSubmittedPlayerStats || [];
        const awayStats: any[] = m.awayScoreSubmittedPlayerStats || [];
        const allScorers = [...homeStats, ...awayStats].filter(p => p.goals > 0 || p.assists > 0);

        return (
          <View key={m.id} style={styles.broadcastCard}>
            <View style={styles.broadcastHeader}>
              <View style={styles.broadcastTeam}>
                <View style={[styles.broadcastBadge, { backgroundColor: m.fromTeamColor || Colors.dark.tint }]}>
                  <Text style={styles.broadcastBadgeText}>{m.fromTeamName?.substring(0, 2).toUpperCase()}</Text>
                </View>
                <Text style={styles.broadcastTeamName} numberOfLines={1}>{m.fromTeamName}</Text>
              </View>
              <View style={styles.broadcastScoreContainer}>
                <Text style={styles.broadcastScore}>{m.finalScore?.home ?? 0}</Text>
                <View style={styles.broadcastDivider} />
                <Text style={styles.broadcastScore}>{m.finalScore?.away ?? 0}</Text>
              </View>
              <View style={styles.broadcastTeam}>
                <View style={[styles.broadcastBadge, { backgroundColor: m.toTeamColor || '#FF6B6B' }]}>
                  <Text style={styles.broadcastBadgeText}>{m.toTeamName?.substring(0, 2).toUpperCase()}</Text>
                </View>
                <Text style={styles.broadcastTeamName} numberOfLines={1}>{m.toTeamName}</Text>
              </View>
            </View>
            {allScorers.length > 0 && (
              <View style={styles.broadcastScorers}>
                {allScorers.map((p: any, i: number) => (
                  <View key={i} style={styles.broadcastScorerRow}>
                    <Text style={styles.broadcastScorerName}>{p.playerName}</Text>
                    <View style={styles.broadcastScorerStats}>
                      {p.goals > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Ionicons name="football" size={10} color="#FFF" />
                          <Text style={styles.broadcastScorerText}>{p.goals}</Text>
                        </View>
                      )}
                      {p.assists > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Ionicons name="flash-outline" size={10} color={Colors.dark.tint} />
                          <Text style={styles.broadcastScorerText}>{p.assists}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 16 }}>
              <Text style={styles.broadcastMeta}>FINAL RESULT · UPDATED RATINGS</Text>
              <Ionicons name="checkmark-circle" size={10} color="rgba(255,255,255,0.2)" />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [incomingChallenges, setIncomingChallenges] = useState<any[]>([]);
  const [acceptedMatches, setAcceptedMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [mapVenue, setMapVenue] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [pendingCancel, setPendingCancel] = useState<any>(null);
  const unsubscribers = useRef<(() => void)[]>([]);
  const teamIdRef = useRef<string | null>(null);
  const toMatchesRef = useRef<any[]>([]);
  const fromMatchesRef = useRef<any[]>([]);

  const nextMatch = acceptedMatches.length > 0 
    ? [...acceptedMatches].sort((a, b) => a.date.localeCompare(b.date))[0] 
    : null;

  const otherUpcomingMatches = acceptedMatches.filter(m => m.id !== nextMatch?.id);

  useEffect(() => {
    loadProfileAndListen();
    return () => unsubscribers.current.forEach(u => u());
  }, []);

  const checkDeadlines = async (tid: string) => {
    try {
      const { checkScoreDeadline } = await import('@/src/utils/matchService');
      const [q1, q2] = await Promise.all([
        getDocs(query(collection(db, 'challenges'), where('fromTeamId', '==', tid), where('status', '==', 'accepted'))),
        getDocs(query(collection(db, 'challenges'), where('toTeamId', '==', tid), where('status', '==', 'accepted'))),
      ]);
      for (const m of [...q1.docs, ...q2.docs]) await checkScoreDeadline(m.id);
    } catch (e) { console.error('Deadline check error:', e); }
  };

  const loadProfileAndListen = async () => {
    try {
      const { cleanupExpiredPickupTeams } = await import('@/src/utils/friendsService');
      await cleanupExpiredPickupTeams();
    } catch (e) { console.error('cleanup error', e); }

    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      setProfile(userData);
      if (userData?.teamId) {
        const tid = userData.teamId;
        setTeamId(tid);
        teamIdRef.current = tid;
        const teamDoc = await getDoc(doc(db, 'teams', tid));
        if (teamDoc.exists()) setTeam({ id: teamDoc.id, ...teamDoc.data() });
        const u1 = onSnapshot(query(collection(db, 'challenges'), where('toTeamId', '==', tid), where('status', '==', 'pending')), snap => setIncomingChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const u2 = onSnapshot(query(collection(db, 'challenges'), where('toTeamId', '==', tid), where('status', 'in', ['accepted', 'disputed'])), snap => {
          toMatchesRef.current = snap.docs.map(d => ({ id: d.id, ...d.data(), isHome: false }));
          const unique = [...toMatchesRef.current, ...fromMatchesRef.current].filter((m, i, s) => s.findIndex(x => x.id === m.id) === i);
          setAcceptedMatches(unique);
        });
        const u3 = onSnapshot(query(collection(db, 'challenges'), where('fromTeamId', '==', tid), where('status', 'in', ['accepted', 'disputed'])), snap => {
          fromMatchesRef.current = snap.docs.map(d => ({ id: d.id, ...d.data(), isHome: true }));
          const unique = [...toMatchesRef.current, ...fromMatchesRef.current].filter((m, i, s) => s.findIndex(x => x.id === m.id) === i);
          setAcceptedMatches(unique);
        });
        unsubscribers.current = [u1, u2, u3];
        checkDeadlines(tid);
        try {
          const { sendScoreReminders } = await import('@/src/utils/matchService');
          await sendScoreReminders(tid);
        } catch (e) { console.error('Reminder trigger error:', e); }
      }
      const tSnap = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), limit(5)));
      setTournaments(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  const handleAccept = async (challengeId: string) => { try { await updateDoc(doc(db, 'challenges', challengeId), { status: 'accepted' }); setSelectedChallenge(null); } catch (e) { console.error(e); } };
  const handleDecline = async (challengeId: string) => { try { await updateDoc(doc(db, 'challenges', challengeId), { status: 'declined' }); setSelectedChallenge(null); } catch (e) { console.error(e); } };
  const handleCancelMatch = (challenge: any) => { const c = { ...challenge }; setSelectedChallenge(null); setTimeout(() => { setPendingCancel(c); setCancelDialog(true); }, 500); };
  const confirmCancel = async () => {
    const challenge = pendingCancel; const tid = teamIdRef.current; setCancelDialog(false); setPendingCancel(null); setSelectedChallenge(null);
    if (!challenge || !tid) return;
    try {
      const { requestCancelMatch } = await import('@/src/utils/matchService');
      const teamDoc = await getDoc(doc(db, 'teams', tid));
      const tName = teamDoc.data()?.name || 'Your team';
      await requestCancelMatch(challenge.id, tid, tName);
    } catch (e) { console.error('Cancel error:', e); }
  };

  const openMap = (venue: string) => { setSelectedChallenge(null); setSelectedTournament(null); setTimeout(() => setMapVenue(venue), 400); };
  const greeting = () => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.dark.tint} /></View>
  );

  const firstName = profile?.firstName || profile?.name?.split(' ')[0] || 'Player';

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView 
        style={[styles.container, { backgroundColor: 'transparent' }]} 
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 80 }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); unsubscribers.current.forEach(u => u()); unsubscribers.current = []; loadProfileAndListen(); }} tintColor={Colors.dark.tint} />}
      >
        <View style={styles.headerGlass}>
          <View style={styles.headerLeft}>
            {profile?.photoURL ? <Image source={{ uri: profile.photoURL }} style={styles.headerAvatar} /> : <View style={styles.headerAvatarPlaceholder}><Text style={styles.headerAvatarText}>{(profile?.firstName || 'P')[0]}</Text></View>}
            <View>
              <Text style={styles.greeting}>{greeting()}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.headerName}>{firstName}</Text>
                <Ionicons name="hand-right-outline" size={14} color={Colors.dark.tint} />
              </View>
              {team && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="football-outline" size={10} color={Colors.dark.tint} />
                  <Text style={styles.headerTeam}>{team.name}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.msgIconBtn} onPress={() => router.push('/messages')}>
            <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {nextMatch && <View style={styles.section}><HeroMatchCard match={nextMatch} onPress={() => setSelectedChallenge({ ...nextMatch })} /></View>}

        {incomingChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>New Challenges</Text><View style={styles.countBadge}><Text style={styles.countBadgeText}>{incomingChallenges.length}</Text></View></View>
            {incomingChallenges.map(c => (
              <TouchableOpacity key={c.id} style={styles.challengeCardGlass} onPress={() => setSelectedChallenge({ ...c })} activeOpacity={0.8}>
                <View style={styles.challengeHeader}><View style={[styles.teamDot, { backgroundColor: c.fromTeamColor || Colors.dark.tint }]}><Text style={styles.teamDotText}>{c.fromTeamName?.substring(0, 2).toUpperCase()}</Text></View><View style={styles.challengeInfo}><Text style={styles.challengeFrom} numberOfLines={1}>{c.fromTeamName}</Text><Text style={styles.challengeMeta}>{c.format} · {c.matchType}</Text></View><View style={[styles.typePill, c.matchType === 'Rated' && styles.ratedPill]}><Text style={[styles.typePillText, c.matchType === 'Rated' && styles.ratedPillText]}>{c.matchType}</Text></View></View>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={12} color="#666" />
                    <Text style={styles.challengeDetail} numberOfLines={1}>{c.date} · {c.time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="location-outline" size={12} color="#666" />
                    <Text style={styles.challengeDetail} numberOfLines={1}>{c.venue}</Text>
                  </View>
                </View>
                <View style={styles.challengeActions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(c.id)}><Text style={styles.acceptBtnText}>Accept</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(c.id)}><Text style={styles.declineBtnText}>Decline</Text></TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {otherUpcomingMatches.length > 0 && (
          <View style={styles.section}><Text style={styles.sectionTitle}>Other Matches</Text>{otherUpcomingMatches.map(m => (<MatchCard key={m.id} match={m} onPress={() => setSelectedChallenge({ ...m })} />))}</View>
        )}

        <CompletedMatchCards teamId={teamId} />

        {tournaments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tournaments</Text>
            {tournaments.map(t => (
              <TouchableOpacity key={t.id} style={styles.tournamentCardGlass} onPress={() => setSelectedTournament({ ...t })} activeOpacity={0.8}>
                <View style={styles.tournamentHeader}>
                  <View style={styles.tournamentIcon}><Ionicons name="trophy-outline" size={16} color="#FFC107" /></View>
                  <View style={{ flex: 1 }}><Text style={styles.tournamentName} numberOfLines={1}>{t.name}</Text><Text style={styles.tournamentMeta} numberOfLines={1}>{t.format} · {t.emirate} · {t.teams?.length || 0}/{t.maxTeams}</Text></View>
                </View>
                <View style={{ gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="calendar-outline" size={11} color="#666" /><Text style={styles.tournamentDetail} numberOfLines={1}>{t.startDate}</Text></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="location-outline" size={11} color="#666" /><Text style={styles.tournamentDetail} numberOfLines={1}>{t.venue}</Text></View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {incomingChallenges.length === 0 && acceptedMatches.length === 0 && tournaments.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="football-outline" size={48} color="#333" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/find')}><Text style={styles.emptyBtnText}>Find Teams →</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selectedChallenge} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedChallenge(null)}>
        <View style={styles.modalWrapper}>
          {selectedChallenge && (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>Match Details</Text><TouchableOpacity onPress={() => setSelectedChallenge(null)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity></View>
              <View style={styles.modalTeamsRow}><View style={styles.modalTeam}><View style={[styles.modalTeamBadge, { backgroundColor: selectedChallenge.fromTeamColor || Colors.dark.tint }]}><Text style={styles.modalTeamBadgeText}>{selectedChallenge.fromTeamName?.substring(0, 2).toUpperCase()}</Text></View><Text style={styles.modalTeamName} numberOfLines={2}>{selectedChallenge.fromTeamName}</Text></View><Text style={styles.modalVs}>VS</Text><View style={styles.modalTeam}><View style={[styles.modalTeamBadge, { backgroundColor: selectedChallenge.toTeamColor || '#FF6B6B' }]}><Text style={styles.modalTeamBadgeText}>{selectedChallenge.toTeamName?.substring(0, 2).toUpperCase()}</Text></View><Text style={styles.modalTeamName} numberOfLines={2}>{selectedChallenge.toTeamName}</Text></View></View>
              <View style={styles.modalDetailsCard}>
                {[
                  { icon: 'football-outline', label: 'Format', value: selectedChallenge.format },
                  { icon: 'trophy-outline', label: 'Type', value: selectedChallenge.matchType },
                  { icon: 'calendar-outline', label: 'Date', value: selectedChallenge.date },
                  { icon: 'time-outline', label: 'Time', value: selectedChallenge.time },
                  { icon: 'location-outline', label: 'Venue', value: selectedChallenge.venue },
                ].map((row, i, arr) => (
                  <View key={row.label}>
                    <View style={styles.modalDetailRow}>
                      <Ionicons name={row.icon as any} size={16} color="#666" style={{ width: 24 }} />
                      <Text style={styles.modalDetailLabel}>{row.label}</Text>
                      <Text style={styles.modalDetailValue}>{row.value}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.modalDivider} />}
                  </View>
                ))}
                {selectedChallenge.status === 'disputed' && (
                  <View style={styles.disputeBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Ionicons name="warning-outline" size={16} color="#FF4444" />
                      <Text style={styles.disputeTitle}>Score Dispute</Text>
                    </View>
                    <View style={styles.disputeScores}>
                      <View style={styles.disputeScoreSide}><Text style={styles.disputeScoreLabel}>{selectedChallenge.fromTeamName}</Text><Text style={styles.disputeScoreValue}>{selectedChallenge.homeScoreSubmitted?.home} - {selectedChallenge.homeScoreSubmitted?.away}</Text></View>
                      <View style={styles.disputeScoreSide}><Text style={styles.disputeScoreLabel}>{selectedChallenge.toTeamName}</Text><Text style={styles.disputeScoreValue}>{selectedChallenge.awayScoreSubmitted?.home} - {selectedChallenge.awayScoreSubmitted?.away}</Text></View>
                    </View>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.mapBtn} onPress={() => openMap(selectedChallenge.venue)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="map-outline" size={18} color="#FFF" />
                  <Text style={styles.mapBtnText}>View on Map</Text>
                </View>
              </TouchableOpacity>
              {selectedChallenge.status === 'pending' && (<View style={styles.modalActions}><TouchableOpacity style={styles.modalAcceptBtn} onPress={() => handleAccept(selectedChallenge.id)}><Text style={styles.modalAcceptBtnText}>Accept Challenge</Text></TouchableOpacity><TouchableOpacity style={styles.modalDeclineBtn} onPress={() => handleDecline(selectedChallenge.id)}><Text style={styles.modalDeclineBtnText}>Decline</Text></TouchableOpacity></View>)}
              {selectedChallenge.status === 'accepted' && (
                <View style={styles.confirmedBlock}>
                  {selectedChallenge.fromTeamId === teamId && (
                    <TouchableOpacity style={styles.editMatchBtn} onPress={() => { const id = selectedChallenge.id; const d = selectedChallenge.date; const t = selectedChallenge.time; const v = selectedChallenge.venue; setSelectedChallenge(null); setTimeout(() => router.push({ pathname: '/edit-match', params: { challengeId: id, currentDate: d, currentTime: t, currentVenue: v } }), 400); }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="pencil-outline" size={14} color="#FFC107" /><Text style={styles.editMatchBtnText}>Edit Details</Text></View>
                    </TouchableOpacity>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginVertical: 12 }}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.dark.tint} />
                    <Text style={styles.confirmedBlockText}>Match Confirmed</Text>
                  </View>
                  <TouchableOpacity style={styles.chatBtn} onPress={() => { const id = selectedChallenge.id; const name = selectedChallenge.fromTeamName; setSelectedChallenge(null); setTimeout(() => router.push({ pathname: '/chat/[id]', params: { id, opponentName: name } }), 400); }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="chatbubble-outline" size={18} color="#FFF" /><Text style={styles.chatBtnText}>Message Captain</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitResultBtn} onPress={() => { const id = selectedChallenge.id; const home = selectedChallenge.fromTeamName; const away = selectedChallenge.toTeamName; const amIHome = selectedChallenge.fromTeamId === teamIdRef.current; setSelectedChallenge(null); setTimeout(() => router.push({ pathname: '/submit-result', params: { challengeId: id, homeTeam: home, awayTeam: away, isHome: amIHome ? 'true' : 'false' } }), 400); }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="clipboard-outline" size={18} color={Colors.dark.tint} /><Text style={styles.submitResultBtnText}>Submit Result</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelMatchBtn} onPress={() => handleCancelMatch(selectedChallenge)}>
                    <Text style={styles.cancelMatchBtnText}>{selectedChallenge.cancelRequest ? 'Cancel Requested...' : 'Cancel Match'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal visible={!!selectedTournament} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedTournament(null)}>
        <View style={styles.modalWrapper}>
          {selectedTournament && (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>Tournament</Text><TouchableOpacity onPress={() => setSelectedTournament(null)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity></View>
              <View style={styles.tournamentModalHeader}>
                <Ionicons name="trophy" size={48} color="#FFC107" style={{ marginBottom: 12 }} />
                <Text style={styles.tournamentModalName}>{selectedTournament.name}</Text>
              </View>
              <View style={styles.modalDetailsCard}>
                {[
                  { icon: 'football-outline', label: 'Format', value: selectedTournament.format },
                  { icon: 'business-outline', label: 'Emirate', value: selectedTournament.emirate },
                  { icon: 'people-outline', label: 'Teams', value: `${selectedTournament.teams?.length || 0} / ${selectedTournament.maxTeams}` },
                  { icon: 'calendar-outline', label: 'Start Date', value: selectedTournament.startDate },
                ].map((row, i, arr) => (
                  <View key={row.label}><View style={styles.modalDetailRow}><Ionicons name={row.icon as any} size={16} color="#666" style={{ width: 24 }} /><Text style={styles.modalDetailLabel}>{row.label}</Text><Text style={styles.modalDetailValue}>{row.value}</Text></View>{i < arr.length - 1 && <View style={styles.modalDivider} />}</View>
                ))}
              </View>
              <TouchableOpacity style={styles.joinBtn} onPress={() => { const id = selectedTournament.id; setSelectedTournament(null); setTimeout(() => router.push(`/tournament/${id}`), 400); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="add-circle-outline" size={20} color="#000" /><Text style={styles.joinBtnText}>Join Tournament</Text></View>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal visible={!!mapVenue} animationType="slide" presentationStyle="pageSheet"><View style={styles.modalWrapper}>{mapVenue && <MapView venue={mapVenue} onClose={() => setMapVenue(null)} />}</View></Modal>
      <CustomDialog visible={cancelDialog} title="Cancel Match" message="Are you sure you want to request cancellation?" onClose={() => { setCancelDialog(false); setPendingCancel(null); }} buttons={[{ text: 'No', style: 'cancel', onPress: () => { setCancelDialog(false); setPendingCancel(null); } }, { text: 'Yes, Request Cancel', style: 'destructive', onPress: confirmCancel }]} />
    </View>
  );
}

function MapView({ venue, onClose }: { venue: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#050505', paddingTop: insets.top }}>
      <TouchableOpacity onPress={onClose} style={{ padding: 16 }}><Text style={{ color: Colors.dark.tint, fontWeight: 'bold' }}>← Back</Text></TouchableOpacity>
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Ionicons name="map-outline" size={48} color={Colors.dark.tint} style={{ marginBottom: 16 }} />
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>{venue}</Text>
        <Text style={{ color: '#666', marginTop: 8 }}>Venue location on map</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: Spacing.lg }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  headerGlass: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 }, headerAvatar: { width: 44, height: 44, borderRadius: 22 }, headerAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' }, headerAvatarText: { fontWeight: 'bold' },
  greeting: { color: '#666', fontSize: 10 }, headerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' }, headerTeam: { color: Colors.dark.tint, fontSize: 10 },
  msgIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  section: { marginBottom: 24 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 }, sectionTitle: { color: '#aaa', fontSize: 12, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  countBadge: { backgroundColor: '#FF4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginBottom: 12 }, countBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  challengeCardGlass: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)' },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }, teamDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, teamDotText: { fontWeight: 'bold', fontSize: 12 },
  challengeInfo: { flex: 1 }, challengeFrom: { color: '#fff', fontWeight: 'bold' }, challengeMeta: { color: '#666', fontSize: 10 },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: Colors.dark.tint }, ratedPill: { borderColor: '#FFC107' }, typePillText: { color: Colors.dark.tint, fontSize: 9, fontWeight: 'bold' }, ratedPillText: { color: '#FFC107' },
  challengeDetail: { color: '#666', fontSize: 12 }, challengeActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  acceptBtn: { flex: 1, backgroundColor: Colors.dark.tint, padding: 10, borderRadius: 8, alignItems: 'center' }, acceptBtnText: { fontWeight: 'bold', fontSize: 12, color: '#000' },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: '#FF4444', padding: 10, borderRadius: 8, alignItems: 'center' }, declineBtnText: { color: '#FF4444', fontWeight: 'bold', fontSize: 12 },
  matchCardOuter: { marginBottom: 12, borderRadius: 16, overflow: 'hidden', minHeight: 110, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  matchCardBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0D0D0D' }, matchCardContent: { padding: 16 },
  matchTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  matchTypeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.dark.tint }, matchTypeText: { fontSize: 8, color: '#777', fontWeight: 'bold' },
  matchTeamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, matchTeamSide: { flex: 1, alignItems: 'center' }, matchTeamBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }, matchTeamBadgeText: { fontWeight: 'bold', fontSize: 12 }, matchTeamName: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  matchCenterCol: { alignItems: 'center' }, matchDateLabel: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 }, matchTimeLabel: { color: '#444', fontSize: 10 },
  matchBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  matchVenue: { color: '#555', fontSize: 9, flex: 1 }, matchConfirmedBadge: { borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }, matchConfirmedText: { color: Colors.dark.tint, fontSize: 8, fontWeight: 'bold' },
  tournamentCardGlass: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tournamentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }, tournamentIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,193,7,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)' },
  tournamentName: { color: '#fff', fontWeight: 'bold' }, tournamentMeta: { color: '#666', fontSize: 10 }, tournamentDetail: { color: '#666', fontSize: 11 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }, statusPillText: { fontSize: 10, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 60 }, emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }, emptyBtn: { backgroundColor: Colors.dark.tint, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }, emptyBtnText: { fontWeight: 'bold', color: '#000' },
  modalWrapper: { flex: 1, backgroundColor: '#050505' }, modalContent: { padding: 20 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' }, modalClose: { color: '#666' },
  modalTeamsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 32 }, modalTeam: { alignItems: 'center', flex: 1 }, modalTeamBadge: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }, modalTeamBadgeText: { fontSize: 20, fontWeight: 'bold' }, modalTeamName: { color: '#fff', fontWeight: 'bold', textAlign: 'center' }, modalVs: { color: '#333', fontSize: 24, fontWeight: '900' },
  modalDetailsCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  modalDetailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }, modalDetailIcon: { width: 24 }, modalDetailLabel: { color: '#666', flex: 1, marginLeft: 8 }, modalDetailValue: { color: '#fff', fontWeight: 'bold' }, modalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  disputeBox: { marginTop: 16, padding: 16, backgroundColor: '#FF444415', borderRadius: 12, borderWidth: 1, borderColor: '#FF444430' }, disputeTitle: { color: '#FF4444', fontWeight: 'bold', marginBottom: 8 }, disputeScores: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, disputeScoreSide: { flex: 1 }, disputeScoreLabel: { color: '#666', fontSize: 10 }, disputeScoreValue: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  mapBtn: { padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }, mapBtnText: { color: '#fff', fontWeight: 'bold' },
  modalActions: { gap: 12 }, modalAcceptBtn: { backgroundColor: Colors.dark.tint, padding: 16, borderRadius: 12, alignItems: 'center' }, modalAcceptBtnText: { fontWeight: 'bold', color: '#000' }, modalDeclineBtn: { borderWidth: 1, borderColor: '#FF4444', padding: 16, borderRadius: 12, alignItems: 'center' }, modalDeclineBtnText: { color: '#FF4444', fontWeight: 'bold' },
  confirmedBlock: { gap: 12 }, confirmedBlockText: { color: Colors.dark.tint, fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  editMatchBtn: { padding: 12, backgroundColor: '#FFC10715', borderRadius: 8, borderWidth: 1, borderColor: '#FFC10730', alignItems: 'center' }, editMatchBtnText: { color: '#FFC107', fontWeight: 'bold' },
  chatBtn: { padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }, chatBtnText: { color: '#fff', fontWeight: 'bold' },
  submitResultBtn: { padding: 16, backgroundColor: Colors.dark.tint + '20', borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.tint, alignItems: 'center' }, submitResultBtnText: { color: Colors.dark.tint, fontWeight: 'bold' },
  cancelMatchBtn: { padding: 12, alignItems: 'center' }, cancelMatchBtnText: { color: '#FF4444', fontSize: 12 },
  tournamentModalHeader: { alignItems: 'center', marginBottom: 24 }, tournamentModalIcon: { fontSize: 48, marginBottom: 12 }, tournamentModalName: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  joinBtn: { backgroundColor: Colors.dark.tint, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 }, joinBtnText: { fontWeight: 'bold', color: '#000' },
  broadcastCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  broadcastHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  broadcastTeam: { flex: 1, alignItems: 'center' }, broadcastBadge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }, broadcastBadgeText: { fontWeight: 'bold' }, broadcastTeamName: { color: '#fff', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  broadcastScoreContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  broadcastScore: { color: Colors.dark.tint, fontSize: 24, fontWeight: '900' }, broadcastDivider: { width: 1, height: 20, backgroundColor: '#222' },
  broadcastScorers: { paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', gap: 4 }, broadcastScorerRow: { flexDirection: 'row', justifyContent: 'space-between' }, broadcastScorerName: { color: '#666', fontSize: 10 }, broadcastScorerStats: { flexDirection: 'row', gap: 8 }, broadcastScorerText: { color: '#fff', fontSize: 9 },
  broadcastMeta: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: 'bold', textAlign: 'center', marginTop: 16, letterSpacing: 1 },
});
