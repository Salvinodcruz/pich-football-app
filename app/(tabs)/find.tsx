import React, { useState, useEffect, useRef } from 'react';
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
import ChevronBackground from '@/src/components/ChevronBackground';
import type { Team } from '@/src/types';

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
      const filtered = all.filter(t => !t.players?.includes(auth.currentUser?.uid || ''));
      setTeams(filtered);
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
      // Load team data for each recent team id
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
    // Save to recent teams
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
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ChevronBackground />
      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 80,
        }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTeams(); }} tintColor={Colors.dark.tint} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Find Teams</Text>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.filterBtnIcon}>⚙️</Text>
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

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
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
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <View style={styles.activeFilters}>
            {emirate !== 'All' && <View style={styles.activeChip}><Text style={styles.activeChipText}>{emirate} ✕</Text></View>}
            {format !== 'All' && <View style={styles.activeChip}><Text style={styles.activeChipText}>{format} ✕</Text></View>}
            {level !== 'All' && <View style={styles.activeChip}><Text style={styles.activeChipText}>{level} ✕</Text></View>}
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearAll}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recently Viewed */}
        {recentTeams.length > 0 && !search && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Viewed</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
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

        {/* Results */}
        <Text style={styles.resultsText}>
          {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''} found
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 40 }} />
        ) : filteredTeams.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
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
              <Text style={styles.applyBtnText}>
                Show {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}
              </Text>
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
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1A1A', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: '#2A2A2A' },
  filterBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '15' },
  filterBtnIcon: { fontSize: 14 },
  filterBtnText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  filterBtnTextActive: { color: Colors.dark.tint },
  filterBadge: { backgroundColor: Colors.dark.tint, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  filterBadgeText: { color: '#000', fontSize: 9, fontWeight: FontWeights.bold },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#2A2A2A', gap: Spacing.sm },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: '#fff', fontSize: FontSizes.md },
  searchClear: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, padding: 4 },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md, alignItems: 'center' },
  activeChip: { backgroundColor: Colors.dark.tint + '20', borderRadius: 20, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: Colors.dark.tint + '40' },
  activeChipText: { color: Colors.dark.tint, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  clearAll: { color: '#FF4444', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: '#aaa', fontSize: FontSizes.xs, fontWeight: FontWeights.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  recentScroll: { marginTop: 4 },
  recentCard: { backgroundColor: '#141414', borderRadius: BorderRadius.md, padding: Spacing.sm, marginRight: Spacing.sm, alignItems: 'center', width: 80, borderWidth: 1, borderColor: '#2A2A2A' },
  recentBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  recentBadgeText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.xs },
  recentName: { color: '#fff', fontSize: 10, fontWeight: FontWeights.bold, textAlign: 'center' },
  recentMeta: { color: '#666', fontSize: 9, textAlign: 'center' },
  resultsText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.md },
  teamList: { gap: Spacing.sm },
  empty: { alignItems: 'center', marginTop: 60, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.semibold },
  emptySubtext: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
  filterOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  filterSheet: { backgroundColor: '#141414', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, paddingBottom: 40 },
  filterSheetHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  filterSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  filterSheetTitle: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  filterClearBtn: { color: '#FF4444', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  filterSectionLabel: { color: '#aaa', fontSize: FontSizes.xs, fontWeight: FontWeights.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#1A1A1A' },
  chipActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  chipText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  chipTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },
  applyBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
  applyBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});