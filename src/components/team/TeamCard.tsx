/**
 * TeamCard Component
 * Displays team information in a card format
 */

import React from 'react';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import type { Team } from '@/src/types';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TeamCardProps {
  team: Team;
  onPress?: () => void;
  showDetails?: boolean;
}

export default function TeamCard({ team, onPress, showDetails }: TeamCardProps) {
  const getSkillColor = (level: string) => {
    if (level === 'Advanced') return '#FF6B6B';
    if (level === 'Intermediate') return Colors.dark.warning;
    return Colors.dark.tint;
  };

  const getTrustColor = (score: number) => {
    if (score >= 70) return Colors.dark.tint;
    if (score >= 30) return Colors.dark.warning;
    return Colors.dark.error;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        {(team as any).logoURL ? (
          <Image source={{ uri: (team as any).logoURL }} style={styles.teamLogoImg} />
        ) : (
          <View style={[styles.teamBadge, { backgroundColor: team.color || Colors.dark.tint }]}>
            <Text style={styles.badgeText}>
              {team.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamMeta}>
            {team.emirate} · {team.format}
          </Text>
          {(team as any).teamCode && (
            <Text style={styles.teamCode}>{(team as any).teamCode}</Text>
          )}
        </View>
        <View style={styles.rating}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{team.skillRating?.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {showDetails && (
        <View style={styles.details}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{team.wins}</Text>
            <Text style={styles.statLabel}>W</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{team.draws}</Text>
            <Text style={styles.statLabel}>D</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{team.losses}</Text>
            <Text style={styles.statLabel}>L</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.badge}>
            <Text style={[styles.badgeLabel, { color: getSkillColor(team.skillLevel) }]}>
              {team.skillLevel}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={[styles.badgeLabel, { color: getTrustColor(team.trustScore) }]}>
              Trust: {team.trustScore}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  teamBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#000',
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.md,
  },
  teamInfo: {
    flex: 1,
  },
  teamLogoImg: { width: 48, height: 48, borderRadius: 24 },
  teamName: {
    color: Colors.dark.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  teamMeta: {
    color: Colors.dark.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  rating: {
    alignItems: 'flex-end',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: Colors.dark.text,
    fontSize: FontSizes.sm,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
  stat: {
    alignItems: 'center',
    minWidth: 30,
  },
  statValue: {
    color: Colors.dark.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  statLabel: {
    color: Colors.dark.textSecondary,
    fontSize: FontSizes.xs,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badgeLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },

  teamCode: {
    color: Colors.dark.tint,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
    marginTop: 2,
  },
});