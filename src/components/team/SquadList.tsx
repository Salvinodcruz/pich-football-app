/**
 * SquadList Component
 * Displays team squad members with their positions and roles
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';
import type { User } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

interface SquadListProps {
  members: User[];
  captainId: string;
  showLeaveButton?: boolean;
  onLeavePress?: (userId: string) => void;
}

const positionColors: Record<string, string> = {
  GK: '#FF6B6B',      // Red
  DEF: '#4ECDC4',     // Teal
  MID: '#45B7D1',     // Blue
  FWD: '#96CEB4',     // Green
};

export default function SquadList({ members, captainId, showLeaveButton, onLeavePress }: SquadListProps) {
  const captain = members.find(m => m.id === captainId);
  const otherMembers = members.filter(m => m.id !== captainId);

  const renderMember = (member: User, isCaptain: boolean) => (
    <View key={member.id} style={styles.memberRow}>
      {/* Position Badge */}
      <View style={[styles.positionBadge, { backgroundColor: positionColors[member.position] || Colors.dark.tint }]}>
        <Text style={styles.positionText}>{member.position}</Text>
      </View>

      {/* Member Info */}
      <View style={styles.memberInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.memberName}>{member.name}</Text>
          {isCaptain && (
            <Ionicons name="ribbon-outline" size={14} color={Colors.dark.tint} style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={styles.memberDetail}>
          Rating: {member.skillRating}
        </Text>
      </View>

      {/* Leave Button */}
      {showLeaveButton && !isCaptain && onLeavePress && (
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => onLeavePress(member.id)}
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
