/**
 * TeamStats Component
 * Displays team statistics: W/L record, rating, trust score
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';

interface TeamStatsProps {
  wins: number;
  losses: number;
  rating: number;
  trustScore: number;
  matchesPlayed?: number;
}

export default function TeamStats({ wins, losses, rating, trustScore, matchesPlayed }: TeamStatsProps) {
  const winRate = matchesPlayed && matchesPlayed > 0
    ? Math.round((wins / matchesPlayed) * 100)
    : 0;

  const getTrustColor = (score: number) => {
    if (score >= 80) return '#00E676';  // Green
    if (score >= 50) return '#FFC107';  // Yellow
    return '#FF4444';                   // Red
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Team Stats</Text>

      <View style={styles.statsGrid}>
        {/* Win/Loss Record */}
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{wins}-{losses}</Text>
          <Text style={styles.statLabel}>Win/Loss</Text>
          {matchesPlayed !== undefined && (
            <Text style={styles.statSub}>{winRate}% win rate</Text>
          )}
        </View>

        {/* Team Rating */}
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
          <Text style={styles.statSub}>Skill rating</Text>
        </View>

        {/* Trust Score */}
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: getTrustColor(trustScore) }]}>
            {trustScore}
          </Text>
          <Text style={styles.statLabel}>Trust Score</Text>
          {trustScore < 30 && (
            <Text style={styles.warningText}>⚠️ Low trust</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.dark.background,
    borderRadius: BorderRadius.sm,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.dark.text,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.dark.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statSub: {
    fontSize: FontSizes.xs,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  warningText: {
    fontSize: FontSizes.xs,
    color: '#FF4444',
    marginTop: 2,
  },
});
