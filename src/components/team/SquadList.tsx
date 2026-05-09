/**
 * SquadList Component
 * Displays team squad members with their positions and roles
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';
import type { UserProfile, Position } from '@/src/types';

interface SquadListProps {
  members: UserProfile[];
  captainId: string;
  showLeaveButton?: boolean;
  onLeavePress?: (userId: string) => void;
}

const positionColors: Record<Position, string> = {
  GK: '#FF6B6B',      // Red
  DEF: '#4ECDC4',     // Teal
  MID: '#45B7D1',     // Blue
  FWD: '#96CEB4',     // Green
};

export default function SquadList({ members, captainId, showLeaveButton, onLeavePress }: SquadListProps) {
  const captain = members.find(m => m.uid === captainId);
  const otherMembers = members.filter(m => m.uid !== captainId);

  const renderMember = (member: UserProfile, isCaptain: boolean) => (
    <View key={member.uid} style={styles.memberRow}>
      {/* Position Badge */}
      <View style={[styles.positionBadge, { backgroundColor: positionColors[member.position }]}>
        <Text style={styles.positionText}>{member.position}</Text>
      </View>

      {/* Member Info */}
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.displayName}
          {isCaptain && ' (C)'}
        </Text>
        <Text style={styles.memberDetail}>
          {member.skillLevel} • Rating: {member.skillRating}
        </Text>
      </View>

      {/* Leave Button */}
      {showLeaveButton && !isCaptain && onLeavePress && (
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => onLeavePress(member.uid)}
        >
          <Text style={styles.leaveButtonText}>Leave</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Squad ({members.length})</Text>

      {/* Captain */}
      {captain && renderMember(captain, true)}

      {/* Other Members */}
      {otherMembers.length > 0 && (
        <View style={styles.membersList}>
          {otherMembers.map(member => renderMember(member, false))}
        </View>
      )}

      {members.length === 0 && (
        <Text style={styles.emptyText}>No squad members yet</Text>
      )}
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  positionBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.dark.text,
  },
  memberInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  memberName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.dark.text,
  },
  memberDetail: {
    fontSize: FontSizes.sm,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  membersList: {
    marginTop: Spacing.sm,
  },
  leaveButton: {
    backgroundColor: Colors.dark.border,
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
  },
  leaveButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.dark.textSecondary,
    fontWeight: FontWeights.medium,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
