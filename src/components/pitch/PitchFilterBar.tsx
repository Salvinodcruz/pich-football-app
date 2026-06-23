/**
 * PitchFilterBar — Horizontal scrollable filter chips for the pitch directory.
 *
 * Renders quick-toggle chips for emirate, turf type, and pitch format.
 * Calls onFilterChange whenever a chip is toggled.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import { PitchSearchFilters, UAE_Emirate, TurfType, PitchFormat } from '@/src/types/pitch';

interface Props {
  filters: PitchSearchFilters;
  onFilterChange: (filters: PitchSearchFilters) => void;
}

const EMIRATES: UAE_Emirate[] = ['Dubai', 'Sharjah', 'Ajman', 'Abu Dhabi'];
const TURF_TYPES: { value: TurfType; label: string }[] = [
  { value: 'artificial-turf-5g', label: '5G Turf' },
  { value: 'artificial-turf-3g', label: '3G Turf' },
  { value: 'indoor-futsal',      label: 'Indoor' },
  { value: 'natural-grass',      label: 'Grass' },
];
const FORMATS: { value: PitchFormat; label: string }[] = [
  { value: '5-a-side',   label: '5-a-Side' },
  { value: '7-a-side',   label: '7-a-Side' },
  { value: '11-a-side',  label: '11-a-Side' },
  { value: 'futsal',     label: 'Futsal' },
];

export default function PitchFilterBar({ filters, onFilterChange }: Props) {
  const toggle = <K extends keyof PitchSearchFilters>(key: K, value: PitchSearchFilters[K]) => {
    onFilterChange({
      ...filters,
      [key]: filters[key] === value ? undefined : value,
    });
  };

  const hasActiveFilters =
    !!filters.emirate || !!filters.turfType || !!filters.format;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* Clear all */}
        {hasActiveFilters && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onFilterChange({})}
          >
            <Ionicons name="close-circle" size={14} color="#FF4444" />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}

        {/* Separator */}
        {hasActiveFilters && <View style={styles.sep} />}

        {/* Emirates */}
        {EMIRATES.map(e => (
          <Chip
            key={e}
            label={e}
            active={filters.emirate === e}
            onPress={() => toggle('emirate', e)}
          />
        ))}

        <View style={styles.sep} />

        {/* Turf types */}
        {TURF_TYPES.map(t => (
          <Chip
            key={t.value}
            label={t.label}
            active={filters.turfType === t.value}
            onPress={() => toggle('turfType', t.value)}
          />
        ))}

        <View style={styles.sep} />

        {/* Formats */}
        {FORMATS.map(f => (
          <Chip
            key={f.value}
            label={f.label}
            active={filters.format === f.value}
            onPress={() => toggle('format', f.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: {
    borderColor: Colors.dark.tint + '88',
    backgroundColor: Colors.dark.tint + '18',
  },
  chipText: {
    color: '#666',
    fontSize: 12,
    fontWeight: FontWeights.medium,
  },
  chipTextActive: {
    color: Colors.dark.tint,
    fontWeight: FontWeights.bold,
  },
  sep: {
    width: 1,
    height: 20,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 4,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF444444',
    backgroundColor: '#FF444415',
  },
  clearText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: FontWeights.semibold,
  },
});
