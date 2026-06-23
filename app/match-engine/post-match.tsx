/**
 * Post-Match Report
 *
 * ─ Final score header
 * ─ Player rating cards (auto-calculated)
 * ─ Pitch cost calculator + rent splitter
 * ─ Share / Export summary
 *
 * Share uses React Native's built-in Share API (text).
 * For image capture install: react-native-view-shot + expo-sharing.
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Share, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { useMatchEngine } from '@/src/context/MatchEngineContext';
import { computePlayerStats, PlayerMatchStats } from '@/src/types/matchEngine';

// ─── Rating colour helper ───────────────────────────────────────────────────────

function ratingColor(r: number): string {
  if (r >= 8.5) return '#FFD700';
  if (r >= 7.0) return Colors.dark.tint;
  if (r >= 5.5) return '#4FC3F7';
  if (r >= 4.0) return '#FFC107';
  return '#FF4444';
}

function ratingLabel(r: number): string {
  if (r >= 9.0) return 'Worldclass';
  if (r >= 8.0) return 'Excellent';
  if (r >= 7.0) return 'Good';
  if (r >= 6.0) return 'Average';
  if (r >= 4.5) return 'Poor';
  return 'Terrible';
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function PostMatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, myScore, setPitchCost, resetMatch } = useMatchEngine();
  const { roster, config, events, opponentScore, pitchCost } = state;

  const [pitchCostInput, setPitchCostInput] = useState(pitchCost > 0 ? String(pitchCost) : '');

  const playerStats = useMemo(() => computePlayerStats(events, roster), [events, roster]);
  const playingCount = roster.filter(p => p.isPlaying).length;

  const costPerPlayer = playingCount > 0 && pitchCost > 0
    ? (pitchCost / playingCount).toFixed(2)
    : null;

  const homeWon = myScore > opponentScore;
  const draw    = myScore === opponentScore;

  // ── Share text summary ───────────────────────────────────────────────────────
  const buildShareText = (): string => {
    const homeTeam = config?.homeTeamName ?? 'Home';
    const awayTeam = config?.awayTeamName ?? 'Away';
    const header   = `⚽ MATCH REPORT\n${homeTeam} ${myScore} – ${opponentScore} ${awayTeam}\n`;
    const result   = draw ? '🤝 Draw' : homeWon ? `🏆 ${homeTeam} win!` : `🏆 ${awayTeam} win!`;
    const divider  = '──────────────────';

    const statsLines = playerStats
      .sort((a, b) => b.rating - a.rating)
      .map(p => {
        const parts = [`${p.playerName} — ${p.rating.toFixed(1)}`];
        if (p.goals   > 0) parts.push(`⚽ ${p.goals}`);
        if (p.assists > 0) parts.push(`🎯 ${p.assists}`);
        if (p.saves   > 0) parts.push(`🧤 ${p.saves}`);
        return parts.join('  ');
      })
      .join('\n');

    const rentLine = costPerPlayer
      ? `\n${divider}\n💰 Pitch rent: AED ${pitchCost}\n👥 Split (${playingCount} players): AED ${costPerPlayer} each`
      : '';

    return `${header}${result}\n${divider}\nPLAYER RATINGS\n${statsLines}${rentLine}\n\nPlayed on Pich 🟢`;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: buildShareText(),
        title: 'Match Report',
      });
    } catch (e) {
      console.error('[PostMatch] share error', e);
    }
  };

  const handleNewMatch = () => {
    Alert.alert('New Match', 'This will reset the current match data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Match',
        onPress: () => {
          resetMatch();
          router.replace('/match-engine/setup');
        },
      },
    ]);
  };

  const handleDone = () => {
    resetMatch();
    router.replace('/(tabs)/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Full-Time header ────────────────────────────────────────────── */}
        <View style={s.ftBanner}>
          <Text style={s.ftLabel}>FULL TIME</Text>
          <Text style={s.ftScore}>{myScore}  –  {opponentScore}</Text>
          <View style={[s.resultBadge, { backgroundColor: draw ? '#FFC10718' : homeWon ? Colors.dark.tint + '18' : '#FF444418' }]}>
            <Text style={[s.resultText, { color: draw ? '#FFC107' : homeWon ? Colors.dark.tint : '#FF4444' }]}>
              {draw ? '🤝 Draw' : homeWon ? `🏆 ${config?.homeTeamName ?? 'You'} Win!` : `🏆 ${config?.awayTeamName ?? 'Opponent'} Win`}
            </Text>
          </View>
          <Text style={s.ftTeams}>
            {config?.homeTeamName}  vs  {config?.awayTeamName}
          </Text>
        </View>

        {/* ── Match summary pills ──────────────────────────────────────────── */}
        <View style={s.pillRow}>
          <StatPill icon="football"     label="Goals"  value={events.filter(e => e.type === 'goal').length} color={Colors.dark.tint} />
          <StatPill icon="hand-left"    label="Saves"  value={events.filter(e => e.type === 'save').length} color="#4FC3F7" />
          <StatPill icon="card"         label="Cards"  value={events.filter(e => e.type === 'yellow_card' || e.type === 'red_card').length} color="#FFC107" />
          <StatPill icon="people"       label="Squad"  value={playingCount} color="#CE93D8" />
        </View>

        {/* ── Player Ratings ───────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="stats-chart" size={16} color={Colors.dark.tint} />
            <Text style={s.sectionTitle}>Player Ratings</Text>
          </View>
          {playerStats
            .sort((a, b) => b.rating - a.rating)
            .map((ps, i) => (
              <PlayerRatingCard key={ps.playerId} stats={ps} rank={i + 1} />
            ))}
          {playerStats.length === 0 && (
            <Text style={s.emptyNote}>No events recorded — ratings will update as you add events next match.</Text>
          )}
        </View>

        {/* ── Pitch Cost Splitter ──────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="cash-outline" size={16} color="#FFC107" />
            <Text style={s.sectionTitle}>Pitch Rent Split</Text>
          </View>

          <View style={s.rentCard}>
            <Text style={s.inputLabel}>Total Pitch Cost (AED)</Text>
            <TextInput
              style={s.rentInput}
              value={pitchCostInput}
              onChangeText={t => {
                setPitchCostInput(t);
                const n = parseFloat(t);
                if (!isNaN(n)) setPitchCost(n);
              }}
              placeholder="e.g. 300"
              placeholderTextColor="#444"
              keyboardType="numeric"
            />

            {costPerPlayer && (
              <View style={s.splitResult}>
                <View style={s.splitRow}>
                  <Text style={s.splitLabel}>Total cost</Text>
                  <Text style={s.splitValue}>AED {pitchCost.toFixed(0)}</Text>
                </View>
                <View style={s.splitRow}>
                  <Text style={s.splitLabel}>Players</Text>
                  <Text style={s.splitValue}>{playingCount}</Text>
                </View>
                <View style={[s.splitRow, s.splitRowHighlight]}>
                  <Text style={[s.splitLabel, { color: '#fff' }]}>Each player pays</Text>
                  <Text style={s.splitHighlightValue}>AED {costPerPlayer}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[s.sendPayBtn, !costPerPlayer && s.sendPayBtnDisabled]}
              disabled={!costPerPlayer}
              onPress={async () => {
                const msg = `Great game! 🟢 Total pitch rent: AED ${pitchCost}. Your share: AED ${costPerPlayer}. Please pay your share — Thanks! #Pich`;
                await Share.share({ message: msg, title: 'Payment Request' });
              }}
            >
              <Ionicons name="logo-whatsapp" size={18} color={costPerPlayer ? '#25D366' : '#333'} />
              <Text style={[s.sendPayBtnText, !costPerPlayer && { color: '#444' }]}>
                Send Payment Request
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <View style={s.actionsSection}>
          <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#000" />
            <Text style={s.shareBtnText}>Share Match Report</Text>
          </TouchableOpacity>

          <View style={s.secondaryBtns}>
            <TouchableOpacity style={s.secondaryBtn} onPress={handleNewMatch}>
              <Ionicons name="reload-outline" size={18} color={Colors.dark.tint} />
              <Text style={s.secondaryBtnText}>New Match</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.secondaryBtn, { borderColor: '#333' }]} onPress={handleDone}>
              <Ionicons name="checkmark-done-outline" size={18} color="#888" />
              <Text style={[s.secondaryBtnText, { color: '#888' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <View style={[sp.pill, { borderColor: color + '44' }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[sp.value, { color }]}>{value}</Text>
      <Text style={sp.label}>{label}</Text>
    </View>
  );
}
const sp = StyleSheet.create({
  pill: {
    flex: 1, alignItems: 'center', gap: 3,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  value: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  label: { color: '#555', fontSize: 10, fontWeight: FontWeights.semibold },
});

function PlayerRatingCard({ stats, rank }: { stats: PlayerMatchStats; rank: number }) {
  const color = ratingColor(stats.rating);
  const topPerformer = rank === 1;
  return (
    <View style={[rc.card, topPerformer && { borderColor: '#FFD70055' }]}>
      {/* Avatar */}
      {stats.photoURL ? (
        <Image source={{ uri: stats.photoURL }} style={rc.avatar} />
      ) : (
        <View style={[rc.avatarPlaceholder, { backgroundColor: color + '25' }]}>
          <Text style={[rc.avatarInitial, { color }]}>{stats.playerName[0]?.toUpperCase()}</Text>
        </View>
      )}

      {/* Name + role */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={rc.name} numberOfLines={1}>{stats.playerName}</Text>
          {stats.isGK && <View style={rc.gkBadge}><Text style={rc.gkText}>GK</Text></View>}
          {topPerformer && <Text style={{ fontSize: 12 }}>⭐</Text>}
        </View>
        {/* Stat chips */}
        <View style={rc.statRow}>
          {stats.goals       > 0 && <StatChip icon="football"         value={stats.goals}       label="G" color={Colors.dark.tint} />}
          {stats.assists     > 0 && <StatChip icon="flash-outline"    value={stats.assists}     label="A" color="#4FC3F7" />}
          {stats.saves       > 0 && <StatChip icon="hand-left"        value={stats.saves}       label="S" color="#CE93D8" />}
          {stats.yellowCards > 0 && <StatChip icon="card"             value={stats.yellowCards} label="Y" color="#FFC107" />}
          {stats.redCards    > 0 && <StatChip icon="card"             value={stats.redCards}    label="R" color="#FF4444" />}
        </View>
      </View>

      {/* Rating */}
      <View style={rc.ratingBlock}>
        <Text style={[rc.ratingNum, { color }]}>{stats.rating.toFixed(1)}</Text>
        <Text style={[rc.ratingLabel, { color }]}>{ratingLabel(stats.rating)}</Text>
      </View>
    </View>
  );
}

function StatChip({ icon, value, label, color }: { icon: any; value: number; label: string; color: string }) {
  return (
    <View style={[rc.chip, { backgroundColor: color + '18', borderColor: color + '44' }]}>
      <Ionicons name={icon} size={10} color={color} />
      <Text style={[rc.chipText, { color }]}>{value}{label}</Text>
    </View>
  );
}

const rc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: Spacing.sm, marginBottom: Spacing.xs,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  name: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, flex: 1 },
  gkBadge: {
    backgroundColor: Colors.dark.tint + '20', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: Colors.dark.tint + '55',
  },
  gkText: { color: Colors.dark.tint, fontSize: 8, fontWeight: FontWeights.bold },
  statRow: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  chipText: { fontSize: 10, fontWeight: FontWeights.bold },
  ratingBlock: { alignItems: 'center', minWidth: 60 },
  ratingNum: { fontSize: 28, fontWeight: FontWeights.bold },
  ratingLabel: { fontSize: 9, fontWeight: FontWeights.bold, letterSpacing: 0.5 },
});

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },

  // Full-time banner
  ftBanner: {
    alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  ftLabel: { color: '#444', fontSize: 11, fontWeight: FontWeights.bold, letterSpacing: 2 },
  ftScore: { color: '#fff', fontSize: 56, fontWeight: FontWeights.bold },
  resultBadge: { borderRadius: 20, paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  resultText: { fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  ftTeams: { color: '#555', fontSize: FontSizes.sm, marginTop: Spacing.xs },

  pillRow: { flexDirection: 'row', gap: Spacing.sm },

  // Sections
  section: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md, gap: Spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: Spacing.xs },
  sectionTitle: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold, letterSpacing: 0.5 },

  emptyNote: { color: '#555', fontSize: FontSizes.sm, textAlign: 'center', paddingVertical: Spacing.md },

  // Pitch rent
  rentCard: { gap: Spacing.sm },
  inputLabel: { color: '#555', fontSize: 10, fontWeight: FontWeights.bold, letterSpacing: 1, textTransform: 'uppercase' },
  rentInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md, padding: Spacing.sm,
    color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  splitResult: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: Spacing.sm,
    gap: Spacing.xs,
  },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  splitRowHighlight: {
    backgroundColor: Colors.dark.tint + '12',
    borderRadius: 8, paddingHorizontal: Spacing.sm, marginTop: 4,
  },
  splitLabel: { color: '#666', fontSize: FontSizes.sm },
  splitValue: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  splitHighlightValue: { color: Colors.dark.tint, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },

  sendPayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#25D36618',
    borderRadius: BorderRadius.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: '#25D36644',
  },
  sendPayBtnDisabled: { opacity: 0.4 },
  sendPayBtnText: { color: '#25D366', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },

  // Action buttons
  actionsSection: { gap: Spacing.sm },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md,
  },
  shareBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  secondaryBtns: { flexDirection: 'row', gap: Spacing.sm },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.dark.tint + '55',
  },
  secondaryBtnText: { color: Colors.dark.tint, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});
