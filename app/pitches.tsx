/**
 * Pitches — Pitch & Ground Directory screen (Phase 1).
 *
 * Layout:
 *   ├─ Header bar (back, title)
 *   ├─ Search input
 *   ├─ PitchFilterBar (horizontal chips)
 *   ├─ Result count label
 *   └─ ScrollView of PitchCards
 *
 * A bottom detail sheet slides up when a pitch is tapped.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Modal, Image,
  Linking, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PremiumBackground from '@/src/components/PremiumBackground';
import PitchCard from '@/src/components/pitch/PitchCard';
import PitchFilterBar from '@/src/components/pitch/PitchFilterBar';
import { usePitchSearch } from '@/src/hooks/usePitchSearch';
import { Pitch, PITCH_AMENITIES } from '@/src/types/pitch';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';

const TURF_LABELS: Record<string, string> = {
  'natural-grass':      'Natural Grass',
  'artificial-turf-3g': '3G Turf',
  'artificial-turf-5g': '5G Turf',
  'hybrid':             'Hybrid',
  'indoor-futsal':      'Indoor Futsal',
};

export default function PitchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { pitches, loading, filters, setFilters, selectPitch, selectedPitch, loadingDetail, clearSelection } = usePitchSearch();
  const [keyword, setKeyword] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { refresh } = usePitchSearch();

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setKeyword(text);
    setFilters({ ...filters, keyword: text });
  };

  const handleSelectPitch = (pitch: Pitch) => {
    selectPitch(pitch.id);
  };

  const openMaps = (pitch: Pitch) => {
    const url = pitch.location.googleMapsUrl
      ?? `https://maps.google.com/?q=${pitch.location.latitude},${pitch.location.longitude}`;
    Linking.openURL(url);
  };

  const callPitch = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const whatsappPitch = (wa: string) => {
    Linking.openURL(`https://wa.me/${wa.replace(/\D/g, '')}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Ionicons name="football-outline" size={18} color={Colors.dark.tint} />
          <Text style={styles.headerText}>Find Pitches</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#555" />
          <TextInput
            style={styles.searchInput}
            value={keyword}
            onChangeText={handleSearch}
            placeholder="Search pitches, areas..."
            placeholderTextColor="#444"
            autoCapitalize="none"
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color="#555" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <PitchFilterBar filters={filters} onFilterChange={setFilters} />

      {/* Result count */}
      <View style={styles.resultMeta}>
        <Text style={styles.resultCount}>
          {loading ? 'Searching…' : `${pitches.length} pitch${pitches.length !== 1 ? 'es' : ''} found`}
        </Text>
        {(filters.emirate || filters.turfType || filters.format) && (
          <Text style={styles.filterActive}>Filters active</Text>
        )}
      </View>

      {/* Results */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.tint} />}
      >
        {loading && pitches.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.tint} />
            <Text style={styles.loadingText}>Finding pitches…</Text>
          </View>
        ) : pitches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="football-outline" size={48} color="#1A1A1A" />
            <Text style={styles.emptyTitle}>No pitches found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters or search term.</Text>
          </View>
        ) : (
          pitches.map(pitch => (
            <PitchCard key={pitch.id} pitch={pitch} onPress={handleSelectPitch} />
          ))
        )}

        {/* Phase 2 teaser */}
        <View style={styles.phase2Banner}>
          <View style={styles.phase2Icon}>
            <Ionicons name="calendar-outline" size={22} color="#4FC3F7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.phase2Title}>Real-Time Booking — Coming Soon</Text>
            <Text style={styles.phase2Sub}>
              Ground owners will be able to manage live availability slots and accept instant bookings.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Pitch Detail Modal ── */}
      <Modal
        visible={!!selectedPitch}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={clearSelection}
      >
        {selectedPitch && (
          <View style={detailStyles.container}>
            {loadingDetail ? (
              <View style={detailStyles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.dark.tint} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Photo header */}
                <View style={detailStyles.photoHeader}>
                  {selectedPitch.photos[0] ? (
                    <Image source={{ uri: selectedPitch.photos[0] }} style={detailStyles.heroPhoto} resizeMode="cover" />
                  ) : (
                    <View style={detailStyles.photoPlaceholder}>
                      <Ionicons name="football-outline" size={48} color="#2A2A2A" />
                    </View>
                  )}
                  <TouchableOpacity style={detailStyles.closeBtn} onPress={clearSelection}>
                    <Ionicons name="close" size={22} color="#fff" />
                  </TouchableOpacity>
                  {selectedPitch.isVerified && (
                    <View style={detailStyles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={13} color={Colors.dark.tint} />
                      <Text style={detailStyles.verifiedText}>Verified Pitch</Text>
                    </View>
                  )}
                </View>

                <View style={detailStyles.body}>
                  {/* Title + Rating */}
                  <View style={detailStyles.titleRow}>
                    <Text style={detailStyles.name}>{selectedPitch.name}</Text>
                    <View style={detailStyles.ratingRow}>
                      <Ionicons name="star" size={14} color="#FFC107" />
                      <Text style={detailStyles.rating}>{selectedPitch.rating.toFixed(1)}</Text>
                      <Text style={detailStyles.reviewCount}>({selectedPitch.reviewCount} reviews)</Text>
                    </View>
                  </View>

                  {/* Location */}
                  <TouchableOpacity style={detailStyles.locationRow} onPress={() => openMaps(selectedPitch)}>
                    <Ionicons name="location" size={16} color="#4FC3F7" />
                    <Text style={detailStyles.locationText}>{selectedPitch.location.address}</Text>
                    <Ionicons name="open-outline" size={13} color="#4FC3F7" />
                  </TouchableOpacity>

                  {/* Turf + Formats */}
                  <View style={detailStyles.badgeRow}>
                    <View style={detailStyles.turfBadge}>
                      <Text style={detailStyles.turfBadgeText}>
                        {TURF_LABELS[selectedPitch.turfType] ?? selectedPitch.turfType}
                      </Text>
                    </View>
                    {selectedPitch.supportedFormats.map(f => (
                      <View key={f} style={detailStyles.formatBadge}>
                        <Text style={detailStyles.formatBadgeText}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Pricing */}
                  <View style={detailStyles.pricingCard}>
                    <Text style={detailStyles.sectionTitle}>PRICING</Text>
                    <View style={detailStyles.priceRow}>
                      <Text style={detailStyles.priceMain}>AED {selectedPitch.pricing.amount}</Text>
                      <Text style={detailStyles.priceUnit}>/{selectedPitch.pricing.unit === 'per-hour' ? 'hour' : 'session'}</Text>
                    </View>
                    {selectedPitch.pricing.peakRate && (
                      <Text style={detailStyles.peakPrice}>
                        Peak ({selectedPitch.pricing.peakHoursStart}–{selectedPitch.pricing.peakHoursEnd}): AED {selectedPitch.pricing.peakRate}/hr
                      </Text>
                    )}
                  </View>

                  {/* Hours */}
                  <View style={detailStyles.hoursCard}>
                    <Text style={detailStyles.sectionTitle}>OPERATING HOURS</Text>
                    <View style={detailStyles.hoursRow}>
                      <Text style={detailStyles.hoursLabel}>Weekdays</Text>
                      <Text style={detailStyles.hoursValue}>
                        {selectedPitch.operatingHours.weekday.open} – {selectedPitch.operatingHours.weekday.close}
                      </Text>
                    </View>
                    <View style={detailStyles.hoursRow}>
                      <Text style={detailStyles.hoursLabel}>Weekends</Text>
                      <Text style={detailStyles.hoursValue}>
                        {selectedPitch.operatingHours.weekend.open} – {selectedPitch.operatingHours.weekend.close}
                      </Text>
                    </View>
                  </View>

                  {/* Amenities */}
                  {selectedPitch.amenityIds && selectedPitch.amenityIds.length > 0 && (
                    <View>
                      <Text style={[detailStyles.sectionTitle, { marginBottom: Spacing.sm }]}>AMENITIES</Text>
                      <View style={detailStyles.amenityGrid}>
                        {selectedPitch.amenityIds.map(id => {
                          const amenity = PITCH_AMENITIES.find(a => a.id === id);
                          if (!amenity) return null;
                          return (
                            <View key={id} style={detailStyles.amenityItem}>
                              <Ionicons name={amenity.icon as any} size={18} color={Colors.dark.tint} />
                              <Text style={detailStyles.amenityLabel}>{amenity.label}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Description */}
                  {selectedPitch.description && (
                    <View>
                      <Text style={[detailStyles.sectionTitle, { marginBottom: Spacing.sm }]}>ABOUT</Text>
                      <Text style={detailStyles.description}>{selectedPitch.description}</Text>
                    </View>
                  )}

                  {/* Phase 2 Booking Banner */}
                  <View style={detailStyles.bookingBanner}>
                    <Ionicons name="calendar-outline" size={18} color="#4FC3F7" />
                    <View style={{ flex: 1 }}>
                      <Text style={detailStyles.bookingBannerTitle}>Real-Time Booking Coming Soon</Text>
                      <Text style={detailStyles.bookingBannerSub}>For now, contact the ground directly to book a slot.</Text>
                    </View>
                  </View>

                  {/* CTA Buttons */}
                  <View style={detailStyles.ctaRow}>
                    {selectedPitch.contactPhone && (
                      <TouchableOpacity style={detailStyles.callBtn} onPress={() => callPitch(selectedPitch.contactPhone!)}>
                        <Ionicons name="call-outline" size={18} color="#000" />
                        <Text style={detailStyles.callBtnText}>Call</Text>
                      </TouchableOpacity>
                    )}
                    {selectedPitch.contactWhatsApp && (
                      <TouchableOpacity style={detailStyles.waBtn} onPress={() => whatsappPitch(selectedPitch.contactWhatsApp!)}>
                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                        <Text style={detailStyles.waBtnText}>WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={detailStyles.mapsBtn} onPress={() => openMaps(selectedPitch)}>
                      <Ionicons name="navigate-outline" size={18} color="#4FC3F7" />
                      <Text style={detailStyles.mapsBtnText}>Directions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1, flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  headerText: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  searchWrapper: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: FontSizes.sm },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  resultCount: { color: '#555', fontSize: FontSizes.xs },
  filterActive: { color: Colors.dark.tint, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  loadingContainer: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  loadingText: { color: '#555', fontSize: FontSizes.sm },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyTitle: { color: '#555', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  emptySub: { color: '#333', fontSize: FontSizes.sm, textAlign: 'center' },
  phase2Banner: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#4FC3F710',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#4FC3F730',
    marginVertical: Spacing.lg,
  },
  phase2Icon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#4FC3F720',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phase2Title: { color: '#4FC3F7', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  phase2Sub: { color: '#4FC3F799', fontSize: FontSizes.xs, lineHeight: 18, marginTop: 2 },
});

const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoHeader: { position: 'relative', height: 240 },
  heroPhoto: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', backgroundColor: '#0D0D0D', justifyContent: 'center', alignItems: 'center' },
  closeBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.dark.tint + '55',
  },
  verifiedText: { color: Colors.dark.tint, fontSize: 11, fontWeight: FontWeights.bold },
  body: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 48 },
  titleRow: { gap: Spacing.xs },
  name: { color: '#fff', fontSize: 22, fontWeight: FontWeights.bold },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { color: '#FFC107', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  reviewCount: { color: '#555', fontSize: FontSizes.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { color: '#4FC3F7', fontSize: FontSizes.sm, flex: 1 },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  turfBadge: { backgroundColor: Colors.dark.tint + '18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.dark.tint + '44' },
  turfBadgeText: { color: Colors.dark.tint, fontSize: 12, fontWeight: FontWeights.bold },
  formatBadge: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  formatBadgeText: { color: '#888', fontSize: 12 },
  pricingCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: Spacing.xs },
  sectionTitle: { color: '#444', fontSize: 10, fontWeight: FontWeights.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  priceMain: { color: '#fff', fontSize: 28, fontWeight: FontWeights.bold },
  priceUnit: { color: '#555', fontSize: FontSizes.sm },
  peakPrice: { color: '#FFC107', fontSize: FontSizes.xs },
  hoursCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: Spacing.sm },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hoursLabel: { color: '#666', fontSize: FontSizes.sm },
  hoursValue: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '47%', paddingVertical: Spacing.xs },
  amenityLabel: { color: '#888', fontSize: FontSizes.sm },
  description: { color: '#666', fontSize: FontSizes.sm, lineHeight: 22 },
  bookingBanner: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', padding: Spacing.md, backgroundColor: '#4FC3F710', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#4FC3F730' },
  bookingBannerTitle: { color: '#4FC3F7', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  bookingBannerSub: { color: '#4FC3F799', fontSize: FontSizes.xs, marginTop: 2 },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, paddingVertical: Spacing.md },
  callBtnText: { color: '#000', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  waBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#25D36618', borderRadius: BorderRadius.md, paddingVertical: Spacing.md, borderWidth: 1, borderColor: '#25D36644' },
  waBtnText: { color: '#25D366', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  mapsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#4FC3F718', borderRadius: BorderRadius.md, paddingVertical: Spacing.md, borderWidth: 1, borderColor: '#4FC3F744' },
  mapsBtnText: { color: '#4FC3F7', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});
