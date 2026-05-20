import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  TextInput, Modal, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getAllTeams } from '@/src/utils/teamService';
import { auth, db } from '@/src/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import TeamCard from '@/src/components/team/TeamCard';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import type { Team } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

const EMIRATES = ['All', 'Sharjah', 'Dubai', 'Ajman'];
const FORMATS = ['All', '5-a-side', '7-a-side', '11-a-side'];
const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

const MAX_RECENT = 3;

export default function FindScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emirate, setEmirate] = useState('All');
  const [format, setFormat] = useState('All');
  const [level, setLevel] = useState('All');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [recentTeams, setRecentTeams] = useState<any[]>([]);

  useEffect(() => {
    loadTeams();
    loadRecentTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const all = await getAllTeams();
      setTeams(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRecentTeams = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const recent = userDoc.data()?.recentTeams || [];
      const profiles = await Promise.all(
        recent.slice(0, MAX_RECENT).map(async (id: string) => {
          const snap = await getDoc(doc(db, 'teams', id));
          if (snap.exists()) return { id: snap.id, ...snap.data() };
          return null;
        })
      );
      setRecentTeams(profiles.filter(Boolean));
    } catch (e) {
      console.error(e);
    }
  };

  const handleTeamPress = async (teamId: string) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const existing: string[] = userDoc.data()?.recentTeams || [];
        const updated = [teamId, ...existing.filter((id: string) => id !== teamId)].slice(0, MAX_RECENT);
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', user.uid), { recentTeams: updated });
      }
    } catch (e) {
      console.error(e);
    }
    router.push(`/team/${teamId}`);
  };

  const activeFilterCount = [
    emirate !== 'All' ? 1 : 0,
    format !== 'All' ? 1 : 0,
    level !== 'All' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const filteredTeams = teams.filter(t => {
    if (emirate !== 'All' && t.emirate !== emirate) return false;
    if (format !== 'All' && t.format !== format) return false;
    if (level !== 'All' && t.skillLevel !== level) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const nameMatch = t.name?.toLowerCase().includes(q);
      const codeMatch = (t as any).teamCode?.toLowerCase().includes(q);
      if (!nameMatch && !codeMatch) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setEmirate('All');
    setFormat('All');
    setLevel('All');
  };

  const FilterChips = ({ options, selected, onSelect }: any) => (
    <View style={styles.chipRow}>
      {options.map((o: string) => (
        <TouchableOpacity
          key={o}
          style={[styles.chip, selected === o && styles.chipActive]}
          onPress={() => onSelect(o)}
        >
          <Text style={[styles.chipText, selected === o && styles.chipTextActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 80,
        }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTeams(); }} tintColor={Colors.dark.tint} />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Find Teams</Text>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={16} color={activeFilterCount > 0 ? Colors.dark.tint : Colors.dark.textSecondary} />
            <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#666" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by team name or code..."
            placeholderTextColor={Colors.dark.textSecondary}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {activeFilterCount > 0 && (
          <View style={styles.activeFilters}>
            {emirate !== 'All' && <View style={styles.activeChip}><Text style={styles.activeChipText}>{emirate}</Text><TouchableOpacity onPress={() => setEmirate('All')}><Ionicons name="close" size={12} color={Colors.dark.tint} /></TouchableOpacity></View>}
            {format !== 'All' && <View style={styles.activeChip}><Text style={styles.activeChipText}>{format}</Text><TouchableOpacity onPress={() => setFormat('All')}><Ionicons name="close" size={12} color={Colors.dark.tint} /></TouchableOpacity></View>}
            {level !== 'All' && <View style={styles.activeChip}><Text style={styles.activeChipText}>{level}</Text><TouchableOpacity onPress={() => setLevel('All')}><Ionicons name="close" size={12} color={Colors.dark.tint} /></TouchableOpacity></View>}
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearAll}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        {recentTeams.length > 0 && !search && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
              <Ionicons name="time-outline" size={14} color="#aaa" />
              <Text style={styles.sectionTitle}>Recently Viewed</Text>
            </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.recentScroll}
        >
          {recentTeams.map(t => (
            <TouchableOpacity
              key={t.id}
              style={styles.recentCard}
              onPress={() => handleTeamPress(t.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.recentBadge, { backgroundColor: t.color || Colors.dark.tint }]}>
                <Text style={styles.recentBadgeText}>{t.name?.substring(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.recentName} numberOfLines={1}>{t.name}</Text>
              <Text style={styles.recentMeta}>{t.emirate}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md }}>
          <Ionicons name="list" size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.resultsText}>
            {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 40 }} />
        ) : filteredTeams.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>No teams found</Text>
            <Text style={styles.emptySubtext}>
              {search ? `No results for "${search}"` : 'Try changing your filters'}
            </Text>
          </View>
        ) : (
          <View style={styles.teamList}>
            {filteredTeams.map(team => (
              <TouchableOpacity
                key={team.id}
                onPress={() => handleTeamPress(team.id)}
                activeOpacity={0.8}
              >
                <TeamCard team={team} onPress={() => handleTeamPress(team.id)} showDetails={true} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <TouchableOpacity style={styles.filterOverlay} onPress={() => setShowFilters(false)} activeOpacity={1}>
          <View style={styles.filterSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.filterSheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filters</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.filterClearBtn}>Clear all</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionLabel}>Emirate</Text>
            <FilterChips options={EMIRATES} selected={emirate} onSelect={setEmirate} />

            <Text style={styles.filterSectionLabel}>Format</Text>
            <FilterChips options={FORMATS} selected={format} onSelect={setFormat} />

            <Text style={styles.filterSectionLabel}>Skill Level</Text>
            <FilterChips options={LEVELS} selected={level} onSelect={setLevel} />

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setShowFilters(false)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.applyBtnText}>
                  Show {filteredTeams.length} Teams
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#000" />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '15' },
  filterBtnText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  filterBtnTextActive: { color: Colors.dark.tint },
  filterBadge: { backgroundColor: Colors.dark.tint, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: '#000', fontSize: 9, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: Spacing.sm },
  searchInput: { flex: 1, color: '#fff', fontSize: FontSizes.md },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md, alignItems: 'center' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.dark.tint + '15', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.dark.tint + '30' },
  activeChipText: { color: Colors.dark.tint, fontSize: FontSizes.xs, fontWeight: 'bold' },
  clearAll: { color: '#FF4444', fontSize: FontSizes.xs, fontWeight: 'bold', marginLeft: 4 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: '#aaa', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  recentScroll: { marginTop: 4 },
  recentCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    alignItems: 'center',
    width: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  recentBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  recentBadgeText: { color: '#000', fontWeight: 'bold', fontSize: FontSizes.sm },
  recentName: { color: '#fff', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  recentMeta: { color: '#666', fontSize: 9, textAlign: 'center', marginTop: 2 },
  resultsText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  teamList: { gap: Spacing.sm },
  empty: { alignItems: 'center', marginTop: 60, gap: Spacing.md },
  emptyText: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.semibold },
  emptySubtext: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  filterSheet: { backgroundColor: '#121212', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  filterSheetHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  filterSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  filterSheetTitle: { color: '#fff', fontSize: FontSizes.xl, fontWeight: 'bold' },
  filterClearBtn: { color: '#FF4444', fontSize: FontSizes.sm, fontWeight: 'bold' },
  filterSectionLabel: { color: '#aaa', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  chipActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  chipText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  chipTextActive: { color: Colors.dark.tint, fontWeight: 'bold' },
  applyBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
  applyBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: 'bold' },
});