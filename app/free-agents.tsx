import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  collection, getDocs, query, where,
  doc, getDoc, addDoc,
} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons } from '@expo/vector-icons';

const POSITIONS = ['All', 'GK', 'DEF', 'MID', 'FWD'];
const EMIRATES = ['All', 'Sharjah', 'Dubai', 'Ajman'];

export default function FreeAgentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [position, setPosition] = useState('All');
  const [emirate, setEmirate] = useState('All');
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [userTeamName, setUserTeamName] = useState('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [recruiting, setRecruiting] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;
    
    const init = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const tid = userDoc.data()?.teamId;
          setUserTeamId(tid || null);
          if (tid) {
            const teamDoc = await getDoc(doc(db, 'teams', tid));
            const teamData = teamDoc.data();
            setIsCaptain(teamData?.captainId === user.uid);
            setUserTeamName(teamData?.name || '');
          }
        }

        const q = query(collection(db, 'users'), where('isFreeAgent', '==', true));
        unsubscribe = onSnapshot(q, (snap) => {
          const all = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((p: any) => p.id !== auth.currentUser?.uid);
          
          const seen = new Set();
          const unique = all.filter((p: any) => {
            const key = p.playerId || p.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setPlayers(unique);
          setLoading(false);
          setRefreshing(false);
        });
      } catch (e) { console.error(e); setLoading(false); setRefreshing(false); }
    };

    init();
    return () => unsubscribe?.();
  }, []);

  const load = () => {
    setRefreshing(true);
    // onSnapshot handles data
  };

  const handleRecruit = async (player: any) => {
    if (!isCaptain) { Alert.alert('Captains Only', 'Only team captains can recruit players'); return; }
    if (!userTeamId) { Alert.alert('No Team', 'You need a team to recruit players'); return; }

    const playerName = player.firstName
      ? `${player.firstName} ${player.lastName}`
      : player.name || 'Player';

    Alert.alert(
      'Send Recruit Request',
      `Send a recruit request to ${playerName} from ${userTeamName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            setRecruiting(player.id);
            try {
              await addDoc(collection(db, 'notifications'), {
                type: 'recruit_request',
                toUserId: player.id,
                fromUserId: auth.currentUser?.uid,
                fromTeamId: userTeamId,
                fromTeamName: userTeamName,
                playerName,
                status: 'pending',
                createdAt: new Date().toISOString(),
                read: false,
              });
              Alert.alert('Request Sent! ✅', `${playerName} has been notified.`);
            } catch (e) { Alert.alert('Error', 'Could not send request'); }
            finally { setRecruiting(null); }
          }
        }
      ]
    );
  };

  const filtered = players.filter((p: any) => {
    if (position !== 'All' && p.position !== position) return false;
    if (emirate !== 'All' && p.emirate !== emirate) return false;
    return true;
  });

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
        style={styles.container}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 40,
        }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.dark.tint} />
        }
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-back" size={20} color={Colors.dark.tint} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Free Agent Board</Text>
        <Text style={styles.subtitle}>Players looking for a team</Text>

        {/* Filters */}
        <View style={styles.filterSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs }}>
            <Ionicons name="football-outline" size={12} color="#666" />
            <Text style={styles.filterLabel}>Position</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {POSITIONS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, position === p && styles.chipActive]}
                onPress={() => setPosition(p)}
              >
                <Text style={[styles.chipText, position === p && styles.chipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs, marginTop: Spacing.sm }}>
            <Ionicons name="location-outline" size={12} color="#666" />
            <Text style={styles.filterLabel}>Emirate</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {EMIRATES.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.chip, emirate === e && styles.chipActive]}
                onPress={() => setEmirate(e)}
              >
                <Text style={[styles.chipText, emirate === e && styles.chipTextActive]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md }}>
          <Ionicons name="people-outline" size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.resultsText}>
            {filtered.length} player{filtered.length !== 1 ? 's' : ''} available
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>No free agents found</Text>
            <Text style={styles.emptySubtext}>Try changing your filters</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((player: any) => {
              const displayName = player.firstName
                ? `${player.firstName} ${player.lastName}`
                : player.name || 'Unknown';
              const initials = player.firstName
                ? `${player.firstName[0]}${player.lastName?.[0] || ''}`
                : (player.name || 'P').substring(0, 2);

              return (
                <TouchableOpacity 
                  key={player.id} 
                  style={styles.card}
                  onPress={() => router.push({ pathname: '/player-profile', params: { id: player.id } })}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playerName} numberOfLines={1}>{displayName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="location-outline" size={10} color="#666" />
                        <Text style={styles.playerMeta}>{player.emirate}</Text>
                      </View>
                      {player.playerId && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                           <Ionicons name="id-card-outline" size={10} color={Colors.dark.tint} />
                           <Text style={styles.playerIdText}>{player.playerId}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.posBadge, { borderColor: getPositionColor(player.position) }]}>
                      <Text style={[styles.posText, { color: getPositionColor(player.position) }]}>
                        {player.position || '?'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    {[
                      { label: 'Matches', value: player.matches || 0 },
                      { label: 'Goals', value: player.goals || 0 },
                      { label: 'Assists', value: player.assists || 0 },
                      { label: 'Rating', value: player.skillRating ?? 0, highlight: true },
                    ].map(s => (
                      <View key={s.label} style={styles.stat}>
                        <Text style={[styles.statValue, s.highlight && { color: Colors.dark.tint }]}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff' },
  subtitle: { color: '#666', fontSize: FontSizes.sm, marginBottom: Spacing.lg },
  filterSection: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  filterLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  filterScroll: { marginTop: 4 },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', marginRight: Spacing.sm },
  chipActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  chipText: { color: '#666', fontSize: FontSizes.sm },
  chipTextActive: { color: Colors.dark.tint, fontWeight: 'bold' },
  resultsText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  list: { gap: Spacing.md },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  avatarText: { color: Colors.dark.tint, fontWeight: 'bold', fontSize: FontSizes.md },
  playerName: { color: '#fff', fontSize: FontSizes.md, fontWeight: 'bold' },
  playerMeta: { color: '#666', fontSize: FontSizes.xs },
  playerIdText: { color: Colors.dark.tint, fontSize: 10, fontWeight: 'bold' },
  posBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm, borderWidth: 1 },
  posText: { fontSize: 10, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  stat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: BorderRadius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  statValue: { color: '#fff', fontSize: FontSizes.sm, fontWeight: 'bold' },
  statLabel: { color: '#444', fontSize: 9, textTransform: 'uppercase', marginTop: 2 },
  recruitBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
  recruitBtnText: { color: '#000', fontWeight: 'bold', fontSize: FontSizes.sm },
  empty: { alignItems: 'center', marginTop: 60, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.semibold },
  emptySubtext: { color: '#666', fontSize: FontSizes.sm, textAlign: 'center' },
});