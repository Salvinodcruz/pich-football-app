import React, { useState, useEffect, useRef } from 'react';
import {View, Text, StyleSheet, ScrollView,TouchableOpacity, ActivityIndicator, RefreshControl,Image, Modal, Dimensions,} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Polygon, Line } from 'react-native-svg';
import {doc, getDoc, collection, query,where, orderBy, limit, updateDoc, onSnapshot, getDocs,} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import CustomDialog from '@/src/components/CustomDialog';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Chevron background pattern component
function ChevronBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFillObject}>
        {/* Base */}
        <Polygon points={`0,0 ${SCREEN_WIDTH},0 ${SCREEN_WIDTH},${SCREEN_HEIGHT} 0,${SCREEN_HEIGHT}`} fill="#0A0A0A" />

        {/* Diagonal bands */}
        <Polygon points={`-50,0 ${SCREEN_WIDTH * 0.5},0 ${SCREEN_WIDTH * 1.2},${SCREEN_HEIGHT} ${SCREEN_WIDTH * 0.5},${SCREEN_HEIGHT}`} fill="#0F0F0F" />
        <Polygon points={`${SCREEN_WIDTH * 0.4},0 ${SCREEN_WIDTH * 0.9},0 ${SCREEN_WIDTH * 1.5},${SCREEN_HEIGHT} ${SCREEN_WIDTH},${SCREEN_HEIGHT}`} fill="#0D0D0D" />

        {/* Chevron row 1 */}
        <Polygon points={`10,120 ${SCREEN_WIDTH / 2},20 ${SCREEN_WIDTH - 10},120 ${SCREEN_WIDTH - 10},140 ${SCREEN_WIDTH / 2},40 10,140`} fill="#141414" />
        <Polygon points={`10,150 ${SCREEN_WIDTH / 2},50 ${SCREEN_WIDTH - 10},150 ${SCREEN_WIDTH - 10},168 ${SCREEN_WIDTH / 2},68 10,168`} fill="#121212" />

        {/* Chevron row 2 */}
        <Polygon points={`10,300 ${SCREEN_WIDTH / 2},200 ${SCREEN_WIDTH - 10},300 ${SCREEN_WIDTH - 10},320 ${SCREEN_WIDTH / 2},220 10,320`} fill="#141414" />
        <Polygon points={`10,330 ${SCREEN_WIDTH / 2},230 ${SCREEN_WIDTH - 10},330 ${SCREEN_WIDTH - 10},348 ${SCREEN_WIDTH / 2},248 10,348`} fill="#121212" />

        {/* Chevron row 3 */}
        <Polygon points={`10,480 ${SCREEN_WIDTH / 2},380 ${SCREEN_WIDTH - 10},480 ${SCREEN_WIDTH - 10},500 ${SCREEN_WIDTH / 2},400 10,500`} fill="#141414" />
        <Polygon points={`10,510 ${SCREEN_WIDTH / 2},410 ${SCREEN_WIDTH - 10},510 ${SCREEN_WIDTH - 10},528 ${SCREEN_WIDTH / 2},428 10,528`} fill="#121212" />

        {/* Chevron row 4 */}
        <Polygon points={`10,660 ${SCREEN_WIDTH / 2},560 ${SCREEN_WIDTH - 10},660 ${SCREEN_WIDTH - 10},680 ${SCREEN_WIDTH / 2},580 10,680`} fill="#141414" />
        <Polygon points={`10,690 ${SCREEN_WIDTH / 2},590 ${SCREEN_WIDTH - 10},690 ${SCREEN_WIDTH - 10},708 ${SCREEN_WIDTH / 2},608 10,708`} fill="#121212" />

        {/* Chevron row 5 */}
        <Polygon points={`10,840 ${SCREEN_WIDTH / 2},740 ${SCREEN_WIDTH - 10},840 ${SCREEN_WIDTH - 10},860 ${SCREEN_WIDTH / 2},760 10,860`} fill="#141414" />

        {/* Subtle diagonal lines */}
        <Line x1="-50" y1="0" x2={`${SCREEN_WIDTH * 0.6}`} y2={`${SCREEN_HEIGHT}`} stroke="#161616" strokeWidth="1" />
        <Line x1={`${SCREEN_WIDTH * 0.2}`} y1="0" x2={`${SCREEN_WIDTH * 1.1}`} y2={`${SCREEN_HEIGHT}`} stroke="#151515" strokeWidth="1" />
      </Svg>
    </View>
  );
}

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
      {/* Dark angular background */}
      <View style={styles.matchCardBg} />
      <Svg style={StyleSheet.absoluteFillObject} width={SCREEN_WIDTH - 32} height={110}>
        <Polygon points={`0,0 ${W * 0.45},0 ${W * 0.7},110 0,110`} fill="#202020" />
        <Polygon points={`${W * 0.55},0 ${W},0 ${W},110 ${W * 0.3},110`} fill="#1C1C1C" />
        <Polygon points={`${W * 0.4},0 ${W * 0.6},0 ${W * 0.55},110 ${W * 0.45},110`} fill="#181818" />
      </Svg>

      <View style={styles.matchCardContent}>
        {/* Top badge */}
        <View style={styles.matchTypeBadge}>
          <View style={styles.matchTypeDot} />
          <Text style={styles.matchTypeText}>
            {(match.matchType || 'FRIENDLY').toUpperCase()} · {(match.format || '').toUpperCase()}
          </Text>
        </View>

        {/* Teams row */}
        <View style={styles.matchTeamsRow}>
          <View style={styles.matchTeamSide}>
            <View style={[styles.matchTeamBadge, { backgroundColor: match.fromTeamColor || Colors.dark.tint }]}>
              <Text style={styles.matchTeamBadgeText}>
                {match.fromTeamName?.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.matchTeamName} numberOfLines={1}>{match.fromTeamName}</Text>
          </View>

          <View style={styles.matchCenterCol}>
            <Text style={styles.matchDateLabel}>{dateLabel}</Text>
            <Text style={styles.matchTimeLabel}>{match.time}</Text>
          </View>

          <View style={styles.matchTeamSide}>
            <View style={[styles.matchTeamBadge, { backgroundColor: match.toTeamColor || '#FF6B6B' }]}>
              <Text style={[styles.matchTeamBadgeText, { color: '#fff' }]}>
                {match.toTeamName?.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.matchTeamName} numberOfLines={1}>{match.toTeamName}</Text>
          </View>
        </View>

        {/* Bottom row */}
        <View style={styles.matchBottomRow}>
          <Text style={styles.matchVenue} numberOfLines={1}>📍 {match.venue}</Text>
          <View style={styles.matchConfirmedBadge}>
            <Text style={styles.matchConfirmedText}>✓ CONFIRMED</Text>
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
        getDocs(query(collection(db, 'challenges'),
          where('fromTeamId', '==', teamId),
          where('status', '==', 'completed'))),
        getDocs(query(collection(db, 'challenges'),
          where('toTeamId', '==', teamId),
          where('status', '==', 'completed'))),
      ]);
      const all = [...q1.docs, ...q2.docs]
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((m: any) => m.resultExpiresAt && m.resultExpiresAt > now);
      setResults(all);
    } catch (e) { console.error(e); }
  };

  if (results.length === 0) return null;

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: '#aaa', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Recent Results
      </Text>
      {results.map((m: any) => {
        const homeStats: any[] = m.homeScoreSubmittedPlayerStats || [];
        const awayStats: any[] = m.awayScoreSubmittedPlayerStats || [];
        const allScorers = [...homeStats, ...awayStats].filter(p => p.goals > 0 || p.assists > 0);

        return (
          <View key={m.id} style={{ backgroundColor: '#141414CC', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A2A' }}>
            {/* Score */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 }}>{m.fromTeamName}</Text>
              <View style={{ backgroundColor: Colors.dark.tint + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: Colors.dark.tint }}>
                <Text style={{ color: Colors.dark.tint, fontSize: 16, fontWeight: '700' }}>
                  {m.finalScore?.home ?? 0} - {m.finalScore?.away ?? 0}
                </Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' }}>{m.toTeamName}</Text>
            </View>

            {/* Scorers */}
            {allScorers.length > 0 && (
              <View style={{ borderTopWidth: 1, borderTopColor: '#222', paddingTop: 8, gap: 4 }}>
                {allScorers.map((p: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {p.photoURL ? (
                      <Image source={{ uri: p.photoURL }} style={{ width: 20, height: 20, borderRadius: 10 }} />
                    ) : (
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 8 }}>{p.playerName?.[0] || '?'}</Text>
                      </View>
                    )}
                    <Text style={{ color: '#aaa', fontSize: 11, flex: 1 }}>{p.playerName}</Text>
                    {p.goals > 0 && <Text style={{ color: '#fff', fontSize: 10 }}>⚽ {p.goals}</Text>}
                    {p.assists > 0 && <Text style={{ color: Colors.dark.tint, fontSize: 10 }}>🎯 {p.assists}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Expires */}
            <Text style={{ color: '#444', fontSize: 9, marginTop: 6 }}>
              Result visible for 24hrs after match
            </Text>
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
      for (const m of [...q1.docs, ...q2.docs]) {
        await checkScoreDeadline(m.id);
      }
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

      const u1 = onSnapshot(
        query(collection(db, 'challenges'), where('toTeamId', '==', tid), where('status', '==', 'pending')),
        snap => setIncomingChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      );

      const u2 = onSnapshot(
        query(collection(db, 'challenges'), where('toTeamId', '==', tid), where('status', '==', 'accepted')),
        snap => {
          toMatchesRef.current = snap.docs.map(d => ({ id: d.id, ...d.data(), isHome: false }));
          const unique = [...toMatchesRef.current, ...fromMatchesRef.current].filter((m, i, s) => s.findIndex(x => x.id === m.id) === i);
          setAcceptedMatches(unique);
        }
      );

      const u3 = onSnapshot(
        query(collection(db, 'challenges'), where('fromTeamId', '==', tid), where('status', '==', 'accepted')),
        snap => {
          fromMatchesRef.current = snap.docs.map(d => ({ id: d.id, ...d.data(), isHome: true }));
          const unique = [...toMatchesRef.current, ...fromMatchesRef.current].filter((m, i, s) => s.findIndex(x => x.id === m.id) === i);
          setAcceptedMatches(unique);
        }
      );

      unsubscribers.current = [u1, u2, u3];
      checkDeadlines(tid);
    }

    const tSnap = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), limit(5)));
    setTournaments(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  const handleAccept = async (challengeId: string) => {
    try {
      await updateDoc(doc(db, 'challenges', challengeId), { status: 'accepted' });
      setSelectedChallenge(null);
    } catch (e) { console.error(e); }
  };

  const handleDecline = async (challengeId: string) => {
    try {
      await updateDoc(doc(db, 'challenges', challengeId), { status: 'declined' });
      setSelectedChallenge(null);
    } catch (e) { console.error(e); }
  };

  const handleCancelMatch = (challenge: any) => {
    const c = { ...challenge };
    setSelectedChallenge(null);
    setTimeout(() => { setPendingCancel(c); setCancelDialog(true); }, 500);
  };

  const confirmCancel = async () => {
    const challenge = pendingCancel;
    const tid = teamIdRef.current;
    setCancelDialog(false);
    setPendingCancel(null);
    setSelectedChallenge(null);
    if (!challenge || !tid) return;
    try {
      const { requestCancelMatch } = await import('@/src/utils/matchService');
      const teamDoc = await getDoc(doc(db, 'teams', tid));
      const tName = teamDoc.data()?.name || 'Your team';
      await requestCancelMatch(challenge.id, tid, tName);
    } catch (e) { console.error('Cancel error:', e); }
  };

  const openMap = (venue: string) => {
    setSelectedChallenge(null);
    setSelectedTournament(null);
    setTimeout(() => setMapVenue(venue), 400);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.dark.tint} />
    </View>
  );

  const firstName = profile?.firstName || profile?.name?.split(' ')[0] || 'Player';

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      {/* Chevron background — behind everything */}
      <ChevronBackground />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 80,
        }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              unsubscribers.current.forEach(u => u());
              unsubscribers.current = [];
              loadProfileAndListen();
            }}
            tintColor={Colors.dark.tint}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarText}>
                  {(profile?.firstName || 'P')[0]}{(profile?.lastName || '')[0]}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.headerName}>{firstName} 👋</Text>
              {team && <Text style={styles.headerTeam}>⚽ {team.name}</Text>}
            </View>
          </View>
          <TouchableOpacity
            style={styles.msgIconBtn}
            onPress={() => router.push('/messages')}
          >
            <Text style={styles.msgIconText}>💬</Text>
          </TouchableOpacity>
        </View>

        {/* New Challenges */}
        {incomingChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Challenges</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{incomingChallenges.length}</Text>
              </View>
            </View>
            {incomingChallenges.map(c => (
              <TouchableOpacity
                key={c.id}
                style={styles.challengeCard}
                onPress={() => setSelectedChallenge({ ...c })}
                activeOpacity={0.8}
              >
                <View style={styles.challengeHeader}>
                  <View style={[styles.teamDot, { backgroundColor: c.fromTeamColor || Colors.dark.tint }]}>
                    <Text style={styles.teamDotText}>{c.fromTeamName?.substring(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeFrom} numberOfLines={1}>{c.fromTeamName}</Text>
                    <Text style={styles.challengeMeta}>{c.format} · {c.matchType}</Text>
                  </View>
                  <View style={[styles.typePill, c.matchType === 'Rated' && styles.ratedPill]}>
                    <Text style={[styles.typePillText, c.matchType === 'Rated' && styles.ratedPillText]}>{c.matchType}</Text>
                  </View>
                </View>
                <Text style={styles.challengeDetail} numberOfLines={1}>📅 {c.date} · {c.time}</Text>
                <Text style={styles.challengeDetail} numberOfLines={1}>📍 {c.venue}</Text>
                <View style={styles.challengeActions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(c.id)}>
                    <Text style={styles.acceptBtnText}>✓ Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(c.id)}>
                    <Text style={styles.declineBtnText}>✕ Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.detailsBtn} onPress={() => setSelectedChallenge({ ...c })}>
                    <Text style={styles.detailsBtnText}>Details</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Matches — LaLiga style */}
        {acceptedMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Matches</Text>
            {acceptedMatches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                onPress={() => setSelectedChallenge({ ...m })}
              />
            ))}
          </View>
        )}

        {/* Completed Match Results — show for 24hrs */}
        <CompletedMatchCards teamId={teamId} />

        {/* Tournaments */}
        {tournaments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tournaments</Text>
            {tournaments.map(t => (
              <TouchableOpacity
                key={t.id}
                style={styles.tournamentCard}
                onPress={() => setSelectedTournament({ ...t })}
                activeOpacity={0.8}
              >
                <View style={styles.tournamentHeader}>
                  <View style={styles.tournamentIcon}>
                    <Text style={{ fontSize: 16 }}>🏆</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tournamentName} numberOfLines={1}>{t.name}</Text>
                    <Text style={styles.tournamentMeta} numberOfLines={1}>
                      {t.format} · {t.emirate} · {t.teams?.length || 0}/{t.maxTeams} teams
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: t.status === 'open' ? Colors.dark.tint + '20' : '#FFC10720' }]}>
                    <Text style={[styles.statusPillText, { color: t.status === 'open' ? Colors.dark.tint : '#FFC107' }]}>
                      {t.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.tournamentDetail} numberOfLines={1}>📅 {t.startDate} · 📍 {t.venue}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty */}
        {incomingChallenges.length === 0 && acceptedMatches.length === 0 && tournaments.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚽</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySubtext}>Find teams and send challenges to get started</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/find')}>
              <Text style={styles.emptyBtnText}>Find Teams →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Challenge Detail Modal */}
      <Modal visible={!!selectedChallenge} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedChallenge(null)}>
        <View style={styles.modalWrapper}>
          {selectedChallenge && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Match Details</Text>
                <TouchableOpacity onPress={() => setSelectedChallenge(null)}>
                  <Text style={styles.modalClose}>✕ Close</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalTeamsRow}>
                <View style={styles.modalTeam}>
                  <View style={[styles.modalTeamBadge, { backgroundColor: selectedChallenge.fromTeamColor || Colors.dark.tint }]}>
                    <Text style={styles.modalTeamBadgeText}>{selectedChallenge.fromTeamName?.substring(0, 2).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.modalTeamName} numberOfLines={2}>{selectedChallenge.fromTeamName}</Text>
                </View>
                <Text style={styles.modalVs}>VS</Text>
                <View style={styles.modalTeam}>
                  <View style={[styles.modalTeamBadge, { backgroundColor: selectedChallenge.toTeamColor || '#FF6B6B' }]}>
                    <Text style={styles.modalTeamBadgeText}>{selectedChallenge.toTeamName?.substring(0, 2).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.modalTeamName} numberOfLines={2}>{selectedChallenge.toTeamName}</Text>
                </View>
              </View>
              <View style={styles.modalDetailsCard}>
                {[
                  { icon: '⚽', label: 'Format', value: selectedChallenge.format },
                  { icon: '🏆', label: 'Type', value: selectedChallenge.matchType },
                  { icon: '📅', label: 'Date', value: selectedChallenge.date },
                  { icon: '🕐', label: 'Time', value: selectedChallenge.time },
                  { icon: '📍', label: 'Venue', value: selectedChallenge.venue },
                ].map((row, i, arr) => (
                  <View key={row.label}>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailIcon}>{row.icon}</Text>
                      <Text style={styles.modalDetailLabel}>{row.label}</Text>
                      <Text style={[styles.modalDetailValue, styles.modalDetailValueWrap]}>{row.value}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.modalDivider} />}
                  </View>
                ))}
                {selectedChallenge.message ? (
                  <>
                    <View style={styles.modalDivider} />
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailIcon}>💬</Text>
                      <Text style={styles.modalDetailLabel}>Message</Text>
                      <Text style={[styles.modalDetailValue, styles.modalDetailValueWrap]}>{selectedChallenge.message}</Text>
                    </View>
                  </>
                ) : null}
              </View>
              <TouchableOpacity style={styles.mapBtn} onPress={() => openMap(selectedChallenge.venue)}>
                <Text style={styles.mapBtnText}>🗺️ View on Map</Text>
              </TouchableOpacity>
              {selectedChallenge.status === 'pending' && (
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalAcceptBtn} onPress={() => handleAccept(selectedChallenge.id)}>
                    <Text style={styles.modalAcceptBtnText}>✓ Accept Challenge</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalDeclineBtn} onPress={() => handleDecline(selectedChallenge.id)}>
                    <Text style={styles.modalDeclineBtnText}>✕ Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
              {selectedChallenge.status === 'accepted' && (
                <View style={styles.confirmedBlock}>
                  
                  {/* Edit Match Details — only for match creator */}
                  {selectedChallenge.fromTeamId === teamId && (
                    <TouchableOpacity
                      style={styles.editMatchBtn}
                      onPress={() => {
                        const id = selectedChallenge.id;
                        setSelectedChallenge(null);
                        setTimeout(() => router.push({
                          pathname: '/edit-match',
                          params: {
                            challengeId: id,
                            currentDate: selectedChallenge.date,
                            currentTime: selectedChallenge.time,
                            currentVenue: selectedChallenge.venue,
                          }
                        }), 400);
                      }}
                    >
                      <Text style={styles.editMatchBtnText}>✏️ Edit Date / Time / Venue</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.confirmedBlockText}>✓ Match Confirmed</Text>

                  
                  <TouchableOpacity style={styles.chatBtn} onPress={() => {
                    const id = selectedChallenge.id;
                    const name = selectedChallenge.fromTeamName;
                    setSelectedChallenge(null);
                    setTimeout(() => router.push({ pathname: `/chat/${id}`, params: { opponentName: name } }), 400);
                  }}>
                    <Text style={styles.chatBtnText}>💬 Message Captain</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitResultBtn} onPress={() => {
                    const id = selectedChallenge.id;
                    const home = selectedChallenge.fromTeamName;
                    const away = selectedChallenge.toTeamName;
                    const amIHome = selectedChallenge.fromTeamId === teamIdRef.current;
                    console.log('🏠 amIHome:', amIHome, 'fromTeamId:', selectedChallenge.fromTeamId, 'myTeamId:', teamIdRef.current);
                    setSelectedChallenge(null);
                    setTimeout(() => router.push({
                      pathname: '/submit-result',
                      params: {
                        challengeId: id,
                        homeTeam: home,
                        awayTeam: away,
                        isHome: amIHome ? 'true' : 'false',
                      }
                    }), 400);
                  }}>
                    <Text style={styles.submitResultBtnText}>📋 Submit Result</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelMatchBtn} onPress={() => handleCancelMatch(selectedChallenge)}>
                    <Text style={styles.cancelMatchBtnText}>
                      {selectedChallenge.cancelRequest
                        ? selectedChallenge.cancelRequest.teamId === teamId ? '⏳ Cancel Requested...' : '⚠️ Confirm Cancel'
                        : '✕ Cancel Match'}
                    </Text>
                  </TouchableOpacity>
                  <CustomDialog
                    visible={cancelDialog}
                    title="Cancel Match"
                    message={pendingCancel?.cancelRequest
                      ? `${pendingCancel.cancelRequest.teamName} has requested cancellation. Confirm to cancel?`
                      : 'Are you sure?\n\nBefore 24hrs: You can cancel alone.\nWithin 24hrs: Both captains must agree.'}
                    onClose={() => { setCancelDialog(false); setPendingCancel(null); }}
                    buttons={[
                      { text: 'No, Keep Match', style: 'cancel', onPress: () => { setCancelDialog(false); setPendingCancel(null); } },
                      { text: pendingCancel?.cancelRequest ? 'Yes, Cancel Match' : 'Request Cancel', style: 'destructive', onPress: confirmCancel },
                    ]}
                  />
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Tournament Detail Modal */}
      <Modal visible={!!selectedTournament} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedTournament(null)}>
        <View style={styles.modalWrapper}>
          {selectedTournament && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tournament</Text>
                <TouchableOpacity onPress={() => setSelectedTournament(null)}>
                  <Text style={styles.modalClose}>✕ Close</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tournamentModalHeader}>
                <Text style={styles.tournamentModalIcon}>🏆</Text>
                <Text style={styles.tournamentModalName}>{selectedTournament.name}</Text>
                <View style={[styles.statusPill, { backgroundColor: selectedTournament.status === 'open' ? Colors.dark.tint + '20' : '#FFC10720' }]}>
                  <Text style={[styles.statusPillText, { color: selectedTournament.status === 'open' ? Colors.dark.tint : '#FFC107' }]}>
                    {selectedTournament.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.modalDetailsCard}>
                {[
                  { icon: '⚽', label: 'Format', value: selectedTournament.format },
                  { icon: '🏙️', label: 'Emirate', value: selectedTournament.emirate },
                  { icon: '👥', label: 'Teams', value: `${selectedTournament.teams?.length || 0} / ${selectedTournament.maxTeams}` },
                  { icon: '📅', label: 'Start Date', value: selectedTournament.startDate },
                  { icon: '📍', label: 'Venue', value: selectedTournament.venue },
                  { icon: '💰', label: 'Entry Fee', value: selectedTournament.entryFee > 0 ? `AED ${selectedTournament.entryFee}` : 'Free' },
                ].map((row, i, arr) => (
                  <View key={row.label}>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailIcon}>{row.icon}</Text>
                      <Text style={styles.modalDetailLabel}>{row.label}</Text>
                      <Text style={[styles.modalDetailValue, styles.modalDetailValueWrap]}>{row.value}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.modalDivider} />}
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.mapBtn} onPress={() => openMap(selectedTournament.venue)}>
                <Text style={styles.mapBtnText}>🗺️ View on Map</Text>
              </TouchableOpacity>
              <View style={styles.progressSection}>
                <Text style={styles.progressLabel}>{selectedTournament.teams?.length || 0} of {selectedTournament.maxTeams} teams registered</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(((selectedTournament.teams?.length || 0) / selectedTournament.maxTeams) * 100, 100)}%` }]} />
                </View>
              </View>
              {selectedTournament.status === 'open' && (
                <TouchableOpacity style={styles.joinBtn} onPress={() => {
                  const id = selectedTournament.id;
                  setSelectedTournament(null);
                  setTimeout(() => router.push(`/tournament/${id}`), 400);
                }}>
                  <Text style={styles.joinBtnText}>+ Join Tournament</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Map Modal */}
      <Modal visible={!!mapVenue} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMapVenue(null)}>
        <View style={styles.modalWrapper}>
          {mapVenue && <MapView venue={mapVenue} onClose={() => setMapVenue(null)} />}
        </View>
      </Modal>

      {/* Cancel Dialog */}
      <CustomDialog
        visible={cancelDialog}
        title="Cancel Match"
        message={pendingCancel?.cancelRequest
          ? `${pendingCancel.cancelRequest.teamName} has requested cancellation. Confirm to cancel?`
          : 'Are you sure?\n\nBefore 24hrs: You can cancel alone.\nWithin 24hrs: Both captains must agree.'}
        onClose={() => { setCancelDialog(false); setPendingCancel(null); }}
        buttons={[
          { text: 'No, Keep Match', style: 'cancel', onPress: () => { setCancelDialog(false); setPendingCancel(null); } },
          { text: pendingCancel?.cancelRequest ? 'Yes, Cancel Match' : 'Request Cancel', style: 'destructive', onPress: confirmCancel },
        ]}
      />
    </View>
  );
}

function MapView({ venue, onClose }: { venue: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { Linking } = require('react-native');
  const venues = [
    { name: 'Falcon Sports - Al Majaz, SHJ', lat: 25.3373, lng: 55.3920, area: 'Al Majaz, Sharjah' },
    { name: 'Ahdaaf Sports Club - Al Quoz, DXB', lat: 25.1460, lng: 55.2194, area: 'Al Quoz, Dubai' },
    { name: 'Champs 5 A Side - Festival City, DXB', lat: 25.2285, lng: 55.3534, area: 'Festival City, Dubai' },
    { name: 'Football Ground - Al Jerf, AJM', lat: 25.4052, lng: 55.5136, area: 'Al Jerf, Ajman' },
    { name: 'Green Sport Club - Ajman City, AJM', lat: 25.4111, lng: 55.4354, area: 'Ajman City, Ajman' },
    { name: 'Titan Pro Sports - Al Tallah, AJM', lat: 25.4289, lng: 55.4847, area: 'Al Tallah, Ajman' },
  ];
  const venueData = venues.find(v => v.name === venue) || { name: venue, lat: 25.3000, lng: 55.3800, area: 'UAE' };
  const openExternal = (app: 'apple' | 'google') => {
    if (app === 'apple') Linking.openURL(`maps://?q=${encodeURIComponent(venue + ' UAE')}&ll=${venueData.lat},${venueData.lng}`);
    else Linking.openURL(`https://maps.google.com/?q=${venueData.lat},${venueData.lng}`);
  };
  return (
    <View style={[mapStyles.container, { paddingTop: insets.top }]}>
      <View style={mapStyles.header}>
        <TouchableOpacity onPress={onClose} style={mapStyles.backBtn}>
          <Text style={mapStyles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={mapStyles.title}>Venue Location</Text>
        <View style={{ width: 70 }} />
      </View>
      <View style={mapStyles.venueCard}>
        <View style={mapStyles.venueLeft}>
          <View style={mapStyles.venuePinCircle}><Text style={mapStyles.venuePinText}>📍</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={mapStyles.venueName} numberOfLines={2}>{venueData.name}</Text>
            <Text style={mapStyles.venueArea}>{venueData.area}</Text>
          </View>
        </View>
      </View>
      <View style={mapStyles.mapContainer}>
        <View style={mapStyles.mapBg}>
          {[...Array(12)].map((_, i) => <View key={`h${i}`} style={[mapStyles.gridLineH, { top: `${(i + 1) * 8}%` }]} />)}
          {[...Array(8)].map((_, i) => <View key={`v${i}`} style={[mapStyles.gridLineV, { left: `${(i + 1) * 12.5}%` }]} />)}
          <View style={mapStyles.roadH} /><View style={mapStyles.roadV} />
          <View style={mapStyles.pinContainer}>
            <View style={mapStyles.pin}><View style={mapStyles.pinInner} /></View>
            <View style={mapStyles.pinLabel}><Text style={mapStyles.pinLabelText} numberOfLines={1}>{venueData.name.split('-')[0].trim()}</Text></View>
          </View>
          <View style={mapStyles.coordsBadge}><Text style={mapStyles.coordsText}>{venueData.lat.toFixed(4)}°N  {venueData.lng.toFixed(4)}°E</Text></View>
        </View>
      </View>
      <View style={mapStyles.actions}>
        <TouchableOpacity style={mapStyles.appleBtn} onPress={() => openExternal('apple')}>
          <Text style={mapStyles.appleBtnIcon}>🍎</Text><Text style={mapStyles.appleBtnText}>Open in Apple Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity style={mapStyles.googleBtn} onPress={() => openExternal('google')}>
          <Text style={mapStyles.googleBtnIcon}>🌐</Text><Text style={mapStyles.googleBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { paddingVertical: Spacing.xs },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  title: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  venueCard: { marginHorizontal: Spacing.lg, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  venueLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  venuePinCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF444420', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FF444440' },
  venuePinText: { fontSize: 20 },
  venueName: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  venueArea: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  mapContainer: { flex: 1, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  mapBg: { flex: 1, backgroundColor: '#0F1F0F', position: 'relative' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#1A3A1A' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#1A3A1A' },
  roadH: { position: 'absolute', top: '50%', left: 0, right: 0, height: 4, backgroundColor: '#2A4A2A', marginTop: -2 },
  roadV: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 4, backgroundColor: '#2A4A2A', marginLeft: -2 },
  pinContainer: { position: 'absolute', top: '50%', left: '50%', alignItems: 'center', marginLeft: -20, marginTop: -50 },
  pin: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF4444', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  pinInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
  pinLabel: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, marginTop: Spacing.xs, borderWidth: 1, borderColor: Colors.dark.border, maxWidth: 160 },
  pinLabelText: { color: Colors.dark.text, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, textAlign: 'center' },
  coordsBadge: { position: 'absolute', bottom: Spacing.sm, right: Spacing.sm, backgroundColor: Colors.dark.background + 'CC', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  coordsText: { color: Colors.dark.textSecondary, fontSize: 10 },
  actions: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.sm },
  appleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md },
  appleBtnIcon: { fontSize: 18 },
  appleBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  googleBtnIcon: { fontSize: 18 },
  googleBtnText: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  headerAvatar: { width: 46, height: 46, borderRadius: 23 },
  headerAvatarPlaceholder: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  greeting: { color: '#666', fontSize: FontSizes.xs },
  headerName: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  headerTeam: { color: Colors.dark.tint, fontSize: FontSizes.xs, marginTop: 1 },
  msgIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#141414CC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  msgIconText: { fontSize: 18 },

  // Section
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold, marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5, color: '#aaa' },
  countBadge: { backgroundColor: '#FF4444', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: Spacing.md },
  countBadgeText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: FontWeights.bold },

  // Challenge card
  challengeCard: { backgroundColor: '#141414CC', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#00E67630', gap: Spacing.sm },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  challengeInfo: { flex: 1, minWidth: 0 },
  teamDot: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  teamDotText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.xs },
  challengeFrom: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  challengeMeta: { color: '#666', fontSize: FontSizes.xs },
  typePill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm, backgroundColor: Colors.dark.tint + '20', borderWidth: 1, borderColor: Colors.dark.tint, flexShrink: 0 },
  ratedPill: { backgroundColor: '#FFC10720', borderColor: '#FFC107' },
  typePillText: { color: Colors.dark.tint, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  ratedPillText: { color: '#FFC107' },
  challengeDetail: { color: '#666', fontSize: FontSizes.sm },
  challengeActions: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.xs },
  acceptBtn: { flex: 1, backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  acceptBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: '#FF4444', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  declineBtnText: { color: '#FF4444', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  detailsBtn: { paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: '#2A2A2A', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  detailsBtnText: { color: '#666', fontSize: FontSizes.sm },

  // Match card (LaLiga style)
  matchCardOuter: { marginBottom: Spacing.sm, borderRadius: 12, overflow: 'hidden', minHeight: 110 },
  matchCardBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#161616' },
  matchCardContent: { padding: Spacing.md, gap: 6 },
  matchTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', backgroundColor: '#1C1C1C', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  matchTypeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.dark.tint },
  matchTypeText: { fontSize: 9, color: '#777', fontWeight: FontWeights.semibold, letterSpacing: 0.5 },
  matchTeamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  matchTeamSide: { flex: 1, alignItems: 'center', gap: 4 },
  matchTeamBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  matchTeamBadgeText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.xs },
  matchTeamName: { color: '#fff', fontSize: FontSizes.xs, fontWeight: FontWeights.bold, textAlign: 'center' },
  matchCenterCol: { alignItems: 'center', gap: 2, paddingHorizontal: 8 },
  matchDateLabel: { color: '#ffffff70', fontSize: FontSizes.sm, fontWeight: FontWeights.bold, letterSpacing: 1.5 },
  matchTimeLabel: { color: '#ffffff40', fontSize: 10 },
  matchBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTopWidth: 1, borderTopColor: '#1C1C1C', marginTop: 2 },
  matchVenue: { color: '#ffffff30', fontSize: 9, flex: 1 },
  matchConfirmedBadge: { backgroundColor: '#00E67612', borderWidth: 1, borderColor: '#00E67650', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  matchConfirmedText: { color: Colors.dark.tint, fontSize: 9, fontWeight: FontWeights.bold, letterSpacing: 0.3 },

  // Tournament card
  tournamentCard: { backgroundColor: '#141414CC', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#1E1E1E', gap: Spacing.xs },
  tournamentHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tournamentIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFC10715', borderWidth: 1, borderColor: '#FFC10730', justifyContent: 'center', alignItems: 'center' },
  tournamentName: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold, flex: 1 },
  tournamentMeta: { color: '#555', fontSize: FontSizes.xs },
  tournamentDetail: { color: '#555', fontSize: FontSizes.xs },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm, flexShrink: 0 },
  statusPillText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },

  // Empty
  emptyState: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  emptySubtext: { color: '#555', fontSize: FontSizes.sm, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginTop: Spacing.sm },
  emptyBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  editMatchBtn: { backgroundColor: '#FFC10715', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: '#FFC10740', width: '100%' },
  editMatchBtnText: { color: '#FFC107', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },

  // Modal
  modalWrapper: { flex: 1, backgroundColor: Colors.dark.background },
  modalContent: { padding: Spacing.lg, paddingBottom: 60, paddingTop: Spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { color: Colors.dark.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  modalClose: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  modalTeamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: Spacing.xl },
  modalTeam: { alignItems: 'center', gap: Spacing.sm, flex: 1 },
  modalTeamBadge: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  modalTeamBadgeText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  modalTeamName: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, textAlign: 'center' },
  modalVs: { color: Colors.dark.textSecondary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  modalDetailsCard: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border },
  modalDetailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.sm, gap: Spacing.sm },
  modalDetailIcon: { fontSize: 16, width: 24, marginTop: 1 },
  modalDetailLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, width: 60 },
  modalDetailValue: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, flex: 1, textAlign: 'right' },
  modalDetailValueWrap: { textAlign: 'right', flexWrap: 'wrap' },
  modalDivider: { height: 1, backgroundColor: Colors.dark.border },
  mapBtn: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border },
  mapBtnText: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  modalActions: { gap: Spacing.sm },
  modalAcceptBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  modalAcceptBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  modalDeclineBtn: { borderWidth: 1, borderColor: '#FF4444', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  modalDeclineBtnText: { color: '#FF4444', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  confirmedBlock: { backgroundColor: Colors.dark.tint + '15', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.tint, width: '100%' },
  confirmedBlockText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  chatBtn: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.sm, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border, width: '100%', alignItems: 'center' },
  chatBtnText: { color: Colors.dark.text, fontSize: FontSizes.sm },
  submitResultBtn: { backgroundColor: Colors.dark.background, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.tint, width: '100%' },
  submitResultBtnText: { color: Colors.dark.tint, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  cancelMatchBtn: { borderWidth: 1, borderColor: '#FF4444', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', width: '100%' },
  cancelMatchBtnText: { color: '#FF4444', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  tournamentModalHeader: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  tournamentModalIcon: { fontSize: 48 },
  tournamentModalName: { color: Colors.dark.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold, textAlign: 'center' },
  progressSection: { marginBottom: Spacing.lg },
  progressLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.sm },
  progressBar: { height: 6, backgroundColor: Colors.dark.card, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.dark.tint, borderRadius: 3 },
  joinBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  joinBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});
