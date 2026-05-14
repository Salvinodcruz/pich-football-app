import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  collection, getDocs, query, where,
  doc, getDoc, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';


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

  useEffect(() => { load(); }, []);

  const load = async () => {
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
      const snap = await getDocs(q);
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.id !== auth.currentUser?.uid);

      // Deduplicate by playerId
      const seen = new Set();
      const unique = all.filter((p: any) => {
        const key = p.playerId || p.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setPlayers(unique);
    } 
    
    catch (e) {console.error(e);} 
    finally {setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRecruit = async (player: any) => {
    if (!isCaptain) {
      Alert.alert('Captains Only', 'Only team captains can recruit players');
      return;
    }
    if (!userTeamId) {
      Alert.alert('No Team', 'You need a team to recruit players');
      return;
    }

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
              // Save recruit request to Firestore
              await addDoc(collection(db, 'notifications'), {
                type: 'recruit_request',
                toUserId: player.id,
                fromUserId: auth.currentUser?.uid,
                fromTeamId: userTeamId,
                fromTeamName: userTeamName,
                playerName,
                status: 'pending',
                createdAt: new Date().toISOString(),
              });
              Alert.alert(
                'Request Sent! ✅',
                `${playerName} will receive your recruit request in their notifications.`
              );
            } catch (e) {
              Alert.alert('Error', 'Could not send recruit request');
            } finally {
              setRecruiting(null);
            }
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
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ChevronBackground />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 40,
        }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.dark.tint} />
        }
      >
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.pageTitle}>Free Agent Board</Text>
      <Text style={styles.subtitle}>Players looking for a team</Text>

      {/* Position Filter */}
      <Text style={styles.filterLabel}>Position</Text>
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

      {/* Emirate Filter */}
      <Text style={styles.filterLabel}>Emirate</Text>
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

      <Text style={styles.resultsText}>
        {filtered.length} player{filtered.length !== 1 ? 's' : ''} available
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👟</Text>
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
              <View key={player.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerName} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.playerMeta}>{player.emirate}</Text>
                    {player.playerId && (
                      <Text style={styles.playerIdText}>{player.playerId}</Text>
                    )}
                  </View>
                  <View style={[styles.posBadge, { borderColor: getPositionColor(player.position) }]}>
                    <Text style={[styles.posText, { color: getPositionColor(player.position) }]}>
                      {player.position || '?'}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{player.matches || 0}</Text>
                    <Text style={styles.statLabel}>Matches</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{player.goals || 0}</Text>
                    <Text style={styles.statLabel}>Goals</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{player.assists || 0}</Text>
                    <Text style={styles.statLabel}>Assists</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{player.skillRating ?? 0}</Text>
                    <Text style={styles.statLabel}>Rating</Text>
                  </View>
                </View>

                {isCaptain && (
                  <TouchableOpacity
                    style={[styles.recruitBtn, recruiting === player.id && { opacity: 0.6 }]}
                    onPress={() => handleRecruit(player)}
                    disabled={recruiting === player.id}
                  >
                    {recruiting === player.id
                      ? <ActivityIndicator color="#000" size="small" />
                      : <Text style={styles.recruitBtnText}>+ Send Recruit Request</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text },
  subtitle: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.lg },
  filterLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, marginBottom: Spacing.xs },
  filterScroll: { marginBottom: Spacing.md },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.card, marginRight: Spacing.sm },
  chipActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  chipText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  chipTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },
  resultsText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.md },
  list: { gap: Spacing.md },
  card: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  playerName: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  playerMeta: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  playerIdText: { color: Colors.dark.tint, fontSize: FontSizes.xs },
  posBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm, borderWidth: 1 },
  posText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  stat: { flex: 1, alignItems: 'center', backgroundColor: Colors.dark.background, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  statValue: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  statLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  recruitBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  recruitBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  empty: { alignItems: 'center', marginTop: 60, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.semibold },
  emptySubtext: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
});