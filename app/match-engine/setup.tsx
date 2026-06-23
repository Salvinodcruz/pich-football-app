/**
 * Pre-Match Setup — Captain configures the match before kick-off.
 *
 * 1. Match structure (Full / Two Halves) + duration + break
 * 2. Roster selection from the captain's team
 * 3. Mandatory GK validation before proceeding
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { useMatchEngine } from '@/src/context/MatchEngineContext';
import { MatchPlayer, MatchConfig, MatchStructure } from '@/src/types/matchEngine';

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { challengeId, homeTeam, awayTeam, format } = useLocalSearchParams<{
    challengeId?: string;
    homeTeam?: string;
    awayTeam?: string;
    format?: string;
  }>();

  const { setRoster, setConfig, resetMatch } = useMatchEngine();

  // ── Match structure ─────────────────────────────────────────────────────────
  const [structure, setStructure] = useState<MatchStructure>('halves');
  const [halfMinutesStr, setHalfMinutesStr] = useState('30');
  const [breakMinutesStr, setBreakMinutesStr] = useState('5');
  const [homeTeamName, setHomeTeamName] = useState(homeTeam ?? '');
  const [awayTeamName, setAwayTeamName] = useState(awayTeam ?? '');

  // ── Roster ──────────────────────────────────────────────────────────────────
  const [allPlayers, setAllPlayers] = useState<MatchPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resetMatch();
    loadRoster();
  }, []);

  const loadRoster = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const tid = userDoc.data()?.teamId;

      if (!tid) { setLoading(false); return; }

      const teamDoc = await getDoc(doc(db, 'teams', tid));
      const teamData = teamDoc.data();

      // Pre-fill team names from DB if not supplied via params
      if (!homeTeam && teamData?.name) setHomeTeamName(teamData.name);

      const playerIds: string[] = teamData?.players ?? [];
      const profiles: MatchPlayer[] = [];
      for (const pid of playerIds) {
        const pDoc = await getDoc(doc(db, 'users', pid));
        if (!pDoc.exists()) continue;
        const d = pDoc.data();
        const isDefaultGK = d.teamPosition === 'GK' || d.position === 'GK';
        profiles.push({
          id: pDoc.id,
          name: [d.firstName, d.lastName].filter(Boolean).join(' ') || d.name || 'Player',
          photoURL: d.photoURL,
          position: d.teamPosition || d.position,
          isGK: isDefaultGK,
          isPlaying: true, // everyone starts selected
        });
      }
      setAllPlayers(profiles);
    } catch (e) {
      console.error('[SetupScreen] loadRoster error:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Roster helpers ──────────────────────────────────────────────────────────
  const togglePlayer = (id: string) =>
    setAllPlayers(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, isPlaying: !p.isPlaying, isGK: p.isGK && p.isPlaying ? false : p.isGK }
          : p,
      ),
    );

  const assignGK = (id: string) =>
    setAllPlayers(prev =>
      prev.map(p => ({ ...p, isGK: p.id === id && p.isPlaying })),
    );

  // ── Validation ──────────────────────────────────────────────────────────────
  const playing  = allPlayers.filter(p => p.isPlaying);
  const gkCount  = playing.filter(p => p.isGK).length;
  const hasGK    = gkCount >= 1;

  const halfMins  = parseInt(halfMinutesStr)  || 30;
  const breakMins = parseInt(breakMinutesStr) || 5;

  const handleBeginMatch = () => {
    if (!homeTeamName.trim() || !awayTeamName.trim()) {
      Alert.alert('Missing Info', 'Please enter both team names.');
      return;
    }
    if (playing.length < 2) {
      Alert.alert('Too few players', 'Select at least 2 players to start.');
      return;
    }
    if (!hasGK) {
      Alert.alert('GK Required', 'You must assign at least one Goalkeeper before starting the match.');
      return;
    }

    const config: MatchConfig = {
      structure,
      halfMinutes: halfMins,
      breakMinutes: breakMins,
      homeTeamName: homeTeamName.trim(),
      awayTeamName: awayTeamName.trim(),
      format: format ?? '5-a-side',
      challengeId,
    };

    setRoster(allPlayers);
    setConfig(config);
    router.push('/match-engine/live');
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' }}>
      <PremiumBackground />
      <ActivityIndicator size="large" color={Colors.dark.tint} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={s.title}>Match Setup</Text>
            <Text style={s.subtitle}>Configure before kick-off</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Team Names ──────────────────────────────────────────────────── */}
        <SectionCard title="Teams" icon="football-outline">
          <LabeledInput label="Your Team" value={homeTeamName} onChangeText={setHomeTeamName} placeholder="Home team name" />
          <View style={{ height: Spacing.sm }} />
          <LabeledInput label="Opponent" value={awayTeamName} onChangeText={setAwayTeamName} placeholder="Away team name" />
        </SectionCard>

        {/* ── Match Structure ──────────────────────────────────────────────── */}
        <SectionCard title="Match Structure" icon="time-outline">
          {/* Toggle */}
          <View style={s.toggleRow}>
            <ToggleBtn
              label="Two Halves"
              icon="git-branch-outline"
              active={structure === 'halves'}
              onPress={() => setStructure('halves')}
            />
            <ToggleBtn
              label="Full Match"
              icon="radio-button-on-outline"
              active={structure === 'full'}
              onPress={() => setStructure('full')}
            />
          </View>

          <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
            <LabeledInput
              label={structure === 'halves' ? 'Minutes per Half' : 'Total Match Duration (min)'}
              value={halfMinutesStr}
              onChangeText={setHalfMinutesStr}
              keyboardType="numeric"
              placeholder={structure === 'halves' ? '30' : '60'}
            />
            {structure === 'halves' && (
              <LabeledInput
                label="Half-Time Break (min)"
                value={breakMinutesStr}
                onChangeText={setBreakMinutesStr}
                keyboardType="numeric"
                placeholder="5"
              />
            )}
          </View>

          {/* Summary pill */}
          <View style={s.summaryPill}>
            <Ionicons name="checkmark-circle-outline" size={14} color={Colors.dark.tint} />
            <Text style={s.summaryText}>
              {structure === 'halves'
                ? `${halfMins} + ${halfMins} min  ·  ${breakMins} min break  ·  Total: ${halfMins * 2} min`
                : `${halfMins} min full match`}
            </Text>
          </View>
        </SectionCard>

        {/* ── Roster ──────────────────────────────────────────────────────── */}
        <SectionCard title={`Lineup  ·  ${playing.length} selected`} icon="people-outline">
          {/* GK validation badge */}
          <View style={[s.gkBadge, hasGK ? s.gkBadgeOk : s.gkBadgeWarn]}>
            <Ionicons
              name={hasGK ? 'shield-checkmark' : 'warning'}
              size={14}
              color={hasGK ? Colors.dark.tint : '#FFC107'}
            />
            <Text style={[s.gkBadgeText, { color: hasGK ? Colors.dark.tint : '#FFC107' }]}>
              {hasGK ? `GK assigned · ${gkCount} goalkeeper` : 'No GK assigned — tap GK to set'}
            </Text>
          </View>

          {allPlayers.length === 0 && (
            <Text style={s.emptyNote}>No players found. Add players to your team first.</Text>
          )}

          {allPlayers.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              onToggle={() => togglePlayer(player.id)}
              onSetGK={() => assignGK(player.id)}
            />
          ))}
        </SectionCard>
      </ScrollView>

      {/* ── Begin Match Button ───────────────────────────────────────────── */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        {!hasGK && (
          <Text style={s.footerWarn}>⚠ Assign a GK before starting</Text>
        )}
        <TouchableOpacity
          style={[s.beginBtn, !hasGK && s.beginBtnDisabled]}
          onPress={handleBeginMatch}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={20} color="#000" />
          <Text style={s.beginBtnText}>Begin Match</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Ionicons name={icon} size={16} color={Colors.dark.tint} />
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function LabeledInput({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any;
}) {
  return (
    <View>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#444"
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

function ToggleBtn({ label, icon, active, onPress }: {
  label: string; icon: any; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.toggleBtn, active && s.toggleBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={18} color={active ? Colors.dark.tint : '#555'} />
      <Text style={[s.toggleBtnText, active && { color: Colors.dark.tint }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PlayerRow({ player, onToggle, onSetGK }: {
  player: MatchPlayer; onToggle: () => void; onSetGK: () => void;
}) {
  return (
    <View style={[s.playerRow, !player.isPlaying && s.playerRowOff]}>
      {/* Avatar */}
      <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
        {player.photoURL ? (
          <Image source={{ uri: player.photoURL }} style={s.avatar} />
        ) : (
          <View style={[s.avatarPlaceholder, !player.isPlaying && { opacity: 0.35 }]}>
            <Text style={s.avatarInitial}>{player.name[0]?.toUpperCase()}</Text>
          </View>
        )}
        {!player.isPlaying && (
          <View style={s.avatarX}>
            <Ionicons name="close" size={12} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {/* Name + position */}
      <View style={{ flex: 1 }}>
        <Text style={[s.playerName, !player.isPlaying && { color: '#444' }]} numberOfLines={1}>
          {player.name}
        </Text>
        {player.position ? (
          <Text style={s.playerPos}>{player.position}</Text>
        ) : null}
      </View>

      {/* GK badge */}
      {player.isPlaying && (
        <TouchableOpacity
          style={[s.gkChip, player.isGK && s.gkChipActive]}
          onPress={onSetGK}
        >
          <Text style={[s.gkChipText, player.isGK && { color: '#000' }]}>GK</Text>
        </TouchableOpacity>
      )}

      {/* Playing toggle */}
      <TouchableOpacity
        style={[s.playingChip, player.isPlaying && s.playingChipOn]}
        onPress={onToggle}
      >
        <Ionicons
          name={player.isPlaying ? 'checkmark' : 'add'}
          size={14}
          color={player.isPlaying ? '#000' : '#555'}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold, textAlign: 'center' },
  subtitle: { color: '#555', fontSize: FontSizes.xs, textAlign: 'center', marginTop: 2 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  cardTitle: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold, letterSpacing: 0.5 },

  inputLabel: { color: '#666', fontSize: 10, fontWeight: FontWeights.bold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    color: '#fff',
    fontSize: FontSizes.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  toggleRow: { flexDirection: 'row', gap: Spacing.sm },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  toggleBtnActive: { borderColor: Colors.dark.tint + '66', backgroundColor: Colors.dark.tint + '12' },
  toggleBtnText: { color: '#555', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },

  summaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.dark.tint + '0F',
    borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: 7,
    marginTop: Spacing.xs, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: Colors.dark.tint + '33',
  },
  summaryText: { color: Colors.dark.tint, fontSize: 11, fontWeight: FontWeights.medium },

  gkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, marginBottom: Spacing.xs,
  },
  gkBadgeOk: { backgroundColor: Colors.dark.tint + '0D', borderColor: Colors.dark.tint + '44' },
  gkBadgeWarn: { backgroundColor: '#FFC10710', borderColor: '#FFC10740' },
  gkBadgeText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },

  emptyNote: { color: '#555', fontSize: FontSizes.sm, textAlign: 'center', paddingVertical: Spacing.lg },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  playerRowOff: { opacity: 0.5 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.tint + '30',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  avatarX: {
    position: 'absolute', bottom: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF4444', justifyContent: 'center', alignItems: 'center',
  },
  playerName: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  playerPos: { color: '#555', fontSize: 10, marginTop: 1 },

  gkChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: '#333', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  gkChipActive: { backgroundColor: Colors.dark.tint, borderColor: Colors.dark.tint },
  gkChipText: { color: '#555', fontSize: 10, fontWeight: FontWeights.bold },

  playingChip: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },
  playingChipOn: { backgroundColor: Colors.dark.tint, borderColor: Colors.dark.tint },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    backgroundColor: 'rgba(5,5,5,0.95)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    gap: Spacing.sm,
  },
  footerWarn: { color: '#FFC107', fontSize: FontSizes.xs, textAlign: 'center', fontWeight: FontWeights.medium },
  beginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.dark.tint,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md,
  },
  beginBtnDisabled: { opacity: 0.4 },
  beginBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});
