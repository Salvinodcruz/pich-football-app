import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';


export default function TournamentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { loadTournaments(); }, []);

  const loadTournaments = async () => {
    try {
      // Check if admin
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setIsAdmin(userDoc.data()?.role === 'admin');
      }

      const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'open') return Colors.dark.tint;
    if (status === 'ongoing') return '#FFC107';
    return Colors.dark.textSecondary;
  };

  const getStatusBg = (status: string) => {
    if (status === 'open') return Colors.dark.tint + '20';
    if (status === 'ongoing') return '#FFC10720';
    return Colors.dark.border;
  };

    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
        <ChevronBackground />
        <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 80,
        }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadTournaments(); }}
          tintColor={Colors.dark.tint}
        />
      }
    >
      {/* Header — Create only visible to admin */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Tournaments</Text>
          <Text style={styles.pageSubtitle}>Join a tournament near you</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/create-tournament')}
          >
            <Text style={styles.createBtnText}>+ Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 40 }} />
      ) : tournaments.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyText}>No tournaments yet</Text>
          <Text style={styles.emptySubtext}>
            Check back soon — tournaments will appear here when they open
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {tournaments.map(t => (
            <TouchableOpacity
              key={t.id}
              style={styles.card}
              onPress={() => router.push(`/tournament/${t.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.trophyIcon}>
                  <Text style={styles.trophyEmoji}>🏆</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tournamentName} numberOfLines={1}>{t.name}</Text>
                  <Text style={styles.tournamentMeta}>
                    {t.format} · {t.emirate}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(t.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(t.status) }]}>
                    {t.status?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Teams</Text>
                  <Text style={styles.detailValue}>
                    {t.teams?.length || 0} / {t.maxTeams}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Entry</Text>
                  <Text style={[styles.detailValue, t.entryFee > 0 && { color: Colors.dark.tint }]}>
                    {t.entryFee > 0 ? `AED ${t.entryFee}` : 'Free'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Format</Text>
                  <Text style={styles.detailValue}>{t.format}</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(((t.teams?.length || 0) / t.maxTeams) * 100, 100)}%`
                }]} />
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>📅 {t.startDate}</Text>
                <Text style={styles.footerText}>📍 {t.venue}</Text>
              </View>

              {t.status === 'open' && (
                <View style={styles.joinCta}>
                  <Text style={styles.joinCtaText}>Tap to view & join →</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text },
  pageSubtitle: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  createBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  createBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  list: { gap: Spacing.md },
  card: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  trophyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.dark.background, justifyContent: 'center', alignItems: 'center' },
  trophyEmoji: { fontSize: 22 },
  tournamentName: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.dark.text },
  tournamentMeta: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  detailsGrid: { flexDirection: 'row', gap: Spacing.sm },
  detailItem: { flex: 1, backgroundColor: Colors.dark.background, borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center' },
  detailLabel: { color: Colors.dark.textSecondary, fontSize: 10 },
  detailValue: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.bold, marginTop: 2 },
  progressBar: { height: 4, backgroundColor: Colors.dark.background, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.dark.tint, borderRadius: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  joinCta: { borderTopWidth: 1, borderTopColor: Colors.dark.border, paddingTop: Spacing.sm, alignItems: 'center' },
  joinCtaText: { color: Colors.dark.tint, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 56 },
  emptyText: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.semibold },
  emptySubtext: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
});