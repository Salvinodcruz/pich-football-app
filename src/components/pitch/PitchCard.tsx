/**
 * PitchCard — Card for a single pitch in the directory listing.
 *
 * Displays photo, name, emirate, turf type, pricing, rating, and amenity chips.
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import { Pitch, PITCH_AMENITIES } from '@/src/types/pitch';

interface Props {
  pitch: Pitch;
  onPress: (pitch: Pitch) => void;
}

const TURF_LABELS: Record<string, string> = {
  'natural-grass':      'Natural Grass',
  'artificial-turf-3g': '3G Turf',
  'artificial-turf-5g': '5G Turf',
  'hybrid':             'Hybrid',
  'indoor-futsal':      'Indoor',
};

const TURF_COLORS: Record<string, string> = {
  'artificial-turf-5g': '#00E676',
  'artificial-turf-3g': '#4FC3F7',
  'indoor-futsal':      '#FFC107',
  'natural-grass':      '#66BB6A',
  'hybrid':             '#CE93D8',
};

export default function PitchCard({ pitch, onPress }: Props) {
  const turfColor = TURF_COLORS[pitch.turfType] ?? '#888';
  const primaryPhoto = pitch.photos[0];

  // Show max 4 amenity chips
  const visibleAmenities = (pitch.amenityIds ?? [])
    .slice(0, 4)
    .map(id => PITCH_AMENITIES.find(a => a.id === id))
    .filter(Boolean) as typeof PITCH_AMENITIES;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(pitch)} activeOpacity={0.8}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        {primaryPhoto ? (
          <Image source={{ uri: primaryPhoto }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="football-outline" size={36} color="#2A2A2A" />
          </View>
        )}

        {/* Verified badge */}
        {pitch.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={Colors.dark.tint} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}

        {/* Turf badge */}
        <View style={[styles.turfBadge, { borderColor: turfColor + '60', backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <Text style={[styles.turfText, { color: turfColor }]}>
            {TURF_LABELS[pitch.turfType] ?? pitch.turfType}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{pitch.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#FFC107" />
            <Text style={styles.rating}>{pitch.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({pitch.reviewCount})</Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color="#555" />
          <Text style={styles.location}>{pitch.location.emirate} · {pitch.location.address}</Text>
        </View>

        {/* Format chips */}
        <View style={styles.formatRow}>
          {pitch.supportedFormats.map(f => (
            <View key={f} style={styles.formatChip}>
              <Text style={styles.formatChipText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Amenities */}
        {visibleAmenities.length > 0 && (
          <View style={styles.amenityRow}>
            {visibleAmenities.map(a => (
              <View key={a.id} style={styles.amenityChip}>
                <Ionicons name={a.icon as any} size={11} color="#555" />
                <Text style={styles.amenityText}>{a.label}</Text>
              </View>
            ))}
            {(pitch.amenityIds?.length ?? 0) > 4 && (
              <Text style={styles.moreAmenities}>+{(pitch.amenityIds?.length ?? 0) - 4}</Text>
            )}
          </View>
        )}

        {/* Price row */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>AED {pitch.pricing.amount}</Text>
            <Text style={styles.priceUnit}>/{pitch.pricing.unit === 'per-hour' ? 'hr' : 'session'}</Text>
          </View>
          {pitch.contactPhone && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={13} color={Colors.dark.tint} />
              <Text style={styles.contactText}>{pitch.contactPhone}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.viewBtn} onPress={() => onPress(pitch)}>
            <Text style={styles.viewBtnText}>Details</Text>
            <Ionicons name="arrow-forward" size={14} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  photoContainer: {
    height: 180,
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.dark.tint + '44',
  },
  verifiedText: { color: Colors.dark.tint, fontSize: 10, fontWeight: FontWeights.bold },
  turfBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  turfText: { fontSize: 10, fontWeight: FontWeights.bold, letterSpacing: 0.5 },
  info: { padding: Spacing.md, gap: Spacing.sm },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    flex: 1,
    marginRight: Spacing.sm,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { color: '#FFC107', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  reviewCount: { color: '#555', fontSize: 11 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { color: '#555', fontSize: FontSizes.xs, flex: 1 },
  formatRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  formatChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  formatChipText: { color: '#888', fontSize: 11 },
  amenityRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  amenityText: { color: '#555', fontSize: 10 },
  moreAmenities: { color: '#444', fontSize: 10 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  price: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  priceUnit: { color: '#555', fontSize: 10 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactText: { color: Colors.dark.tint, fontSize: FontSizes.xs },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.dark.tint,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  viewBtnText: { color: '#000', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
});
