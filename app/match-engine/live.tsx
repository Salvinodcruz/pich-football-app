/**
 * Live Match Dashboard
 *
 * ┌─────────────────────────────────────┐
 * │  Phase badge  ·  Half indicator     │
 * │       ⏱ MM : SS (large)            │
 * │   [Team]  0 – 0  [Opponent]         │
 * │   ▶ Start / ⏸ Pause / ▐▌ Half Time │
 * │──────────────────────────────────── │
 * │  Event feed (scrollable)            │
 * └─────────────────────────────────────┘
 *              [ + Record Event ]  (FAB)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { useMatchEngine } from '@/src/context/MatchEngineContext';
import {
  MatchPlayer, MatchEvent, EventType, GoalType, TimerPhase,
  GOAL_TYPE_LABELS,
} from '@/src/types/matchEngine';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }

const EVENT_DEFS: { type: EventType; label: string; icon: string; color: string }[] = [
  { type: 'goal',        label: 'Goal',        icon: 'football',            color: Colors.dark.tint },
  { type: 'save',        label: 'Save',        icon: 'hand-left',           color: '#4FC3F7' },
  { type: 'yellow_card', label: 'Yellow Card', icon: 'card',                color: '#FFC107' },
  { type: 'red_card',    label: 'Red Card',    icon: 'card',                color: '#FF4444' },
];

const GOAL_TYPES: GoalType[] = ['long_shot', 'tap_in', 'free_kick', 'penalty', 'header', 'volley'];

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, addEvent, removeEvent, setOpponentScore, myScore } = useMatchEngine();
  const { roster, config, events, opponentScore } = state;

  // ── Timer state ─────────────────────────────────────────────────────────────
  const [elapsed, setElapsed]   = useState(0); // total seconds
  const [phase, setPhase]       = useState<TimerPhase>('pre');
  const [isRunning, setIsRunning] = useState(false);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef  = useRef<TimerPhase>('pre');
  const configRef = useRef(config);

  useEffect(() => { phaseRef.current = phase; },   [phase]);
  useEffect(() => { configRef.current = config; }, [config]);

  const halfSecs  = (config?.halfMinutes ?? 30) * 60;
  const totalSecs = config?.structure === 'halves' ? halfSecs * 2 : halfSecs;

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Phase transitions
  useEffect(() => {
    const cfg = configRef.current;
    const ph  = phaseRef.current;
    if (!cfg || !isRunning) return;

    if (ph === 'first_half' && elapsed >= halfSecs) {
      stopTimer();
      if (cfg.structure === 'halves') {
        setPhase('half_time');
        phaseRef.current = 'half_time';
        setShowHalftimeModal(true);
      } else {
        setPhase('full_time');
        phaseRef.current = 'full_time';
      }
    } else if (ph === 'second_half' && elapsed >= totalSecs) {
      stopTimer();
      setPhase('full_time');
      phaseRef.current = 'full_time';
    }
  }, [elapsed]);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRunning(false);
  };

  const startTimer = (fromPhase: 'first_half' | 'second_half') => {
    setPhase(fromPhase);
    phaseRef.current = fromPhase;
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    setIsRunning(true);
  };

  const handleStartPause = () => {
    if (phase === 'pre') {
      startTimer('first_half');
    } else if (isRunning) {
      stopTimer();
    } else if (phase === 'first_half' || phase === 'second_half') {
      // Resume after manual pause
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      setIsRunning(true);
    }
  };

  // ── Display time ─────────────────────────────────────────────────────────────
  // Show seconds within current half
  const currentHalfElapsed =
    phase === 'second_half' ? elapsed - halfSecs : elapsed;
  const displayMin = Math.floor(currentHalfElapsed / 60);
  const displaySec = currentHalfElapsed % 60;

  // Match minute for event stamping (continuous from kick-off)
  const matchMinute = Math.floor(elapsed / 60);

  // Current half number
  const currentHalf: 1 | 2 = phase === 'second_half' || phase === 'full_time' ? 2 : 1;

  // ── Half-Time Modal ──────────────────────────────────────────────────────────
  const [showHalftimeModal, setShowHalftimeModal] = useState(false);

  const startSecondHalf = () => {
    setShowHalftimeModal(false);
    startTimer('second_half');
  };

  // ── Event Modal ──────────────────────────────────────────────────────────────
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [selectedGoalType, setSelectedGoalType]   = useState<GoalType | null>(null);
  const [selectedPlayer, setSelectedPlayer]       = useState<MatchPlayer | null>(null);
  const [selectedAssister, setSelectedAssister]   = useState<MatchPlayer | null>(null);
  const [modalStep, setModalStep] = useState<'type' | 'player'>('type');

  const openEventModal = () => {
    setSelectedEventType(null);
    setSelectedGoalType(null);
    setSelectedPlayer(null);
    setSelectedAssister(null);
    setModalStep('type');
    setShowEventModal(true);
  };

  const handleSelectEventType = (type: EventType) => {
    setSelectedEventType(type);
    setModalStep('player');
  };

  const handleConfirmEvent = () => {
    if (!selectedEventType || !selectedPlayer) return;

    const event: MatchEvent = {
      id: Date.now().toString(),
      type: selectedEventType,
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      minute: matchMinute,
      half: currentHalf,
      goalType: selectedEventType === 'goal' ? (selectedGoalType ?? undefined) : undefined,
      assistPlayerId: selectedEventType === 'goal' ? selectedAssister?.id : undefined,
      assistPlayerName: selectedEventType === 'goal' ? selectedAssister?.name : undefined,
    };

    addEvent(event);
    setShowEventModal(false);
  };

  // ── End Match ────────────────────────────────────────────────────────────────
  const handleEndMatch = () => {
    Alert.alert('End Match', 'Are you sure you want to end the match?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Match',
        style: 'destructive',
        onPress: () => {
          stopTimer();
          setPhase('full_time');
          router.push('/match-engine/post-match');
        },
      },
    ]);
  };

  // ── Playing players ──────────────────────────────────────────────────────────
  const playing    = roster.filter(p => p.isPlaying);
  const gkPlayers  = playing.filter(p => p.isGK);
  const outPlayers = playing.filter(p => !p.isGK);

  // Auto-select GK for saves
  const saveDefaultPlayer = gkPlayers[0] ?? null;

  // Players shown in picker based on event type
  const pickerPlayers = (selectedEventType === 'save' && gkPlayers.length > 0)
    ? gkPlayers
    : playing;

  // ── Phase label ──────────────────────────────────────────────────────────────
  const phaseLabel = {
    pre:         'PRE-MATCH',
    first_half:  '1ST HALF',
    half_time:   'HALF TIME',
    second_half: '2ND HALF',
    full_time:   'FULL TIME',
  }[phase];

  const phaseColor = phase === 'full_time'
    ? '#FF4444'
    : (isRunning ? Colors.dark.tint : '#FFC107');

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />

      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Phase badge + End button ────────────────────────────────────── */}
        <View style={s.topRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={[s.phaseBadge, { borderColor: phaseColor + '55', backgroundColor: phaseColor + '18' }]}>
            <View style={[s.phaseDot, { backgroundColor: phaseColor }]} />
            <Text style={[s.phaseText, { color: phaseColor }]}>{phaseLabel}</Text>
          </View>
          {phase !== 'pre' && phase !== 'full_time' && (
            <TouchableOpacity style={s.endBtn} onPress={handleEndMatch}>
              <Text style={s.endBtnText}>End</Text>
            </TouchableOpacity>
          )}
          {(phase === 'pre' || phase === 'full_time') && <View style={{ width: 48 }} />}
        </View>

        {/* ── Timer ──────────────────────────────────────────────────────── */}
        <View style={s.timerBlock}>
          <Text style={s.timerText}>{pad(displayMin)} : {pad(displaySec)}</Text>
          {config?.structure === 'halves' && (
            <Text style={s.halfLabel}>
              {phase === 'second_half' || phase === 'full_time' ? '2ND' : '1ST'} HALF  ·  {config.halfMinutes} MIN
            </Text>
          )}
        </View>

        {/* ── Score ──────────────────────────────────────────────────────── */}
        <View style={s.scoreRow}>
          <View style={s.scoreTeam}>
            <Text style={s.scoreTeamName} numberOfLines={1}>{config?.homeTeamName ?? 'Home'}</Text>
            <Text style={s.scoreNum}>{myScore}</Text>
          </View>
          <Text style={s.scoreDash}>—</Text>
          <View style={s.scoreTeam}>
            <Text style={s.scoreTeamName} numberOfLines={1}>{config?.awayTeamName ?? 'Away'}</Text>
            <View style={s.opponentControls}>
              <TouchableOpacity style={s.scoreAdj} onPress={() => setOpponentScore(opponentScore - 1)}>
                <Text style={s.scoreAdjText}>−</Text>
              </TouchableOpacity>
              <Text style={s.scoreNum}>{opponentScore}</Text>
              <TouchableOpacity style={s.scoreAdj} onPress={() => setOpponentScore(opponentScore + 1)}>
                <Text style={s.scoreAdjText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Start / Pause / Second-half ─────────────────────────────────── */}
        <View style={s.timerBtnRow}>
          {phase !== 'full_time' && phase !== 'half_time' && (
            <TouchableOpacity style={[s.mainBtn, isRunning && s.mainBtnPause]} onPress={handleStartPause}>
              <Ionicons name={isRunning ? 'pause' : 'play'} size={22} color="#000" />
              <Text style={s.mainBtnText}>
                {phase === 'pre' ? 'Kick Off' : isRunning ? 'Pause' : 'Resume'}
              </Text>
            </TouchableOpacity>
          )}
          {phase === 'half_time' && (
            <TouchableOpacity style={s.mainBtn} onPress={() => setShowHalftimeModal(true)}>
              <Ionicons name="football-outline" size={22} color="#000" />
              <Text style={s.mainBtnText}>Start 2nd Half</Text>
            </TouchableOpacity>
          )}
          {phase === 'full_time' && (
            <TouchableOpacity style={[s.mainBtn, { backgroundColor: '#FFC107' }]} onPress={() => router.push('/match-engine/post-match')}>
              <Ionicons name="bar-chart-outline" size={22} color="#000" />
              <Text style={s.mainBtnText}>Post-Match Report</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Event Feed ──────────────────────────────────────────────────── */}
        {events.length > 0 && (
          <View style={s.eventFeed}>
            <Text style={s.feedTitle}>MATCH EVENTS</Text>
            {[...events].reverse().map(event => (
              <EventChip
                key={event.id}
                event={event}
                onRemove={() => removeEvent(event.id)}
              />
            ))}
          </View>
        )}

        {events.length === 0 && phase !== 'pre' && (
          <View style={s.noEvents}>
            <Ionicons name="clipboard-outline" size={36} color="#222" />
            <Text style={s.noEventsText}>No events recorded yet</Text>
          </View>
        )}
      </ScrollView>

      {/* ── FAB: Record Event ───────────────────────────────────────────── */}
      {phase !== 'pre' && phase !== 'full_time' && (
        <TouchableOpacity
          style={[s.fab, { bottom: insets.bottom + 28 }]}
          onPress={openEventModal}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#000" />
          <Text style={s.fabText}>Record Event</Text>
        </TouchableOpacity>
      )}

      {/* ── Half-Time Modal ─────────────────────────────────────────────── */}
      <Modal visible={showHalftimeModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.htModal}>
            <Text style={s.htTitle}>HALF TIME</Text>
            <Text style={s.htScore}>{myScore} — {opponentScore}</Text>
            <Text style={s.htSub}>
              {config?.homeTeamName}  vs  {config?.awayTeamName}
            </Text>
            <View style={s.htStats}>
              <Text style={s.htStat}>{events.filter(e => e.type === 'goal').length} goals</Text>
              <Text style={s.htStat}>{events.filter(e => e.type === 'save').length} saves</Text>
              <Text style={s.htStat}>{events.filter(e => e.type === 'yellow_card' || e.type === 'red_card').length} cards</Text>
            </View>
            <TouchableOpacity style={s.htBtn} onPress={startSecondHalf}>
              <Ionicons name="play" size={18} color="#000" />
              <Text style={s.htBtnText}>Start 2nd Half</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Event Recording Modal ────────────────────────────────────────── */}
      <Modal visible={showEventModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.eventModal}>
            {/* Header */}
            <View style={s.eventModalHeader}>
              {modalStep === 'player' && (
                <TouchableOpacity onPress={() => setModalStep('type')} style={s.modalBack}>
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              <Text style={s.eventModalTitle}>
                {modalStep === 'type' ? 'Record Event' : `Who ${selectedEventType === 'goal' ? 'scored?' : selectedEventType === 'save' ? 'saved?' : 'got carded?'}`}
              </Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)} style={s.modalClose}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={s.eventMinute}>
              ⏱ {pad(displayMin)}:{pad(displaySec)}  ·  {currentHalf === 1 ? '1st' : '2nd'} Half
            </Text>

            {/* Step 1: Event type */}
            {modalStep === 'type' && (
              <View style={s.eventTypeGrid}>
                {EVENT_DEFS.map(def => (
                  <TouchableOpacity
                    key={def.type}
                    style={[s.eventTypeCard, { borderColor: def.color + '55' }]}
                    onPress={() => handleSelectEventType(def.type)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={def.icon as any} size={28} color={def.color} />
                    <Text style={[s.eventTypeLabel, { color: def.color }]}>{def.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Step 2: Player + details */}
            {modalStep === 'player' && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                {/* Goal type (only for goals) */}
                {selectedEventType === 'goal' && (
                  <View style={s.goalTypeSection}>
                    <Text style={s.pickerSectionLabel}>Goal Type (optional)</Text>
                    <View style={s.goalTypeGrid}>
                      {GOAL_TYPES.map(gt => (
                        <TouchableOpacity
                          key={gt}
                          style={[s.goalTypeChip, selectedGoalType === gt && s.goalTypeChipActive]}
                          onPress={() => setSelectedGoalType(prev => prev === gt ? null : gt)}
                        >
                          {selectedGoalType === gt && (
                            <Ionicons name="checkmark" size={12} color="#000" style={{ marginRight: 3 }} />
                          )}
                          <Text style={[s.goalTypeChipText, selectedGoalType === gt && { color: '#000' }]}>
                            {GOAL_TYPE_LABELS[gt]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Player picker */}
                <Text style={s.pickerSectionLabel}>
                  {selectedEventType === 'save' ? 'Goalkeeper' : 'Player'}
                </Text>
                {pickerPlayers.map(p => (
                  <PlayerPickerRow
                    key={p.id}
                    player={p}
                    selected={selectedPlayer?.id === p.id}
                    onSelect={() => setSelectedPlayer(prev => prev?.id === p.id ? null : p)}
                  />
                ))}

                {/* Assist picker (for goals only) */}
                {selectedEventType === 'goal' && (
                  <>
                    <Text style={[s.pickerSectionLabel, { marginTop: Spacing.md }]}>Assist (optional)</Text>
                    {playing
                      .filter(p => p.id !== selectedPlayer?.id)
                      .map(p => (
                        <PlayerPickerRow
                          key={p.id}
                          player={p}
                          selected={selectedAssister?.id === p.id}
                          onSelect={() => setSelectedAssister(prev => prev?.id === p.id ? null : p)}
                          dim
                        />
                      ))}
                  </>
                )}

                {/* Confirm */}
                <TouchableOpacity
                  style={[s.confirmBtn, !selectedPlayer && s.confirmBtnDisabled]}
                  onPress={handleConfirmEvent}
                  disabled={!selectedPlayer}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#000" />
                  <Text style={s.confirmBtnText}>Confirm Event</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function EventChip({ event, onRemove }: { event: MatchEvent; onRemove: () => void }) {
  const def = EVENT_DEFS.find(d => d.type === event.type);
  return (
    <View style={s.eventChip}>
      <View style={[s.eventChipIconCircle, { backgroundColor: (def?.color ?? '#888') + '20' }]}>
        <Ionicons name={(def?.icon ?? 'ellipse') as any} size={16} color={def?.color ?? '#888'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.eventChipName}>{event.playerName}</Text>
        <Text style={s.eventChipMeta}>
          {def?.label}
          {event.goalType ? `  ·  ${GOAL_TYPE_LABELS[event.goalType]}` : ''}
          {event.assistPlayerName ? `  ·  Assist: ${event.assistPlayerName}` : ''}
          {'  ·  '}{event.minute}&apos;
        </Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={s.eventChipRemove}>
        <Ionicons name="close" size={16} color="#444" />
      </TouchableOpacity>
    </View>
  );
}

function PlayerPickerRow({ player, selected, onSelect, dim }: {
  player: MatchPlayer; selected: boolean; onSelect: () => void; dim?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.pickerRow, selected && s.pickerRowSelected, dim && !selected && { opacity: 0.6 }]}
      onPress={onSelect}
      activeOpacity={0.75}
    >
      {player.photoURL ? (
        <Image source={{ uri: player.photoURL }} style={s.pickerAvatar} />
      ) : (
        <View style={s.pickerAvatarPlaceholder}>
          <Text style={s.pickerAvatarText}>{player.name[0]?.toUpperCase()}</Text>
        </View>
      )}
      <Text style={[s.pickerName, selected && { color: '#000' }]} numberOfLines={1}>
        {player.name}
      </Text>
      {player.isGK && (
        <View style={s.pickerGKBadge}><Text style={s.pickerGKText}>GK</Text></View>
      )}
      {selected && <Ionicons name="checkmark-circle" size={20} color="#000" />}
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  phaseBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  phaseDot: { width: 8, height: 8, borderRadius: 4 },
  phaseText: { fontSize: 11, fontWeight: FontWeights.bold, letterSpacing: 1 },
  endBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: '#FF444418', borderWidth: 1, borderColor: '#FF444444',
  },
  endBtnText: { color: '#FF4444', fontSize: FontSizes.xs, fontWeight: FontWeights.bold },

  // Timer
  timerBlock: { alignItems: 'center', paddingVertical: Spacing.sm },
  timerText: {
    fontSize: 72, fontWeight: FontWeights.bold, color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  halfLabel: { color: '#444', fontSize: 11, fontWeight: FontWeights.bold, letterSpacing: 1.5, marginTop: 6 },

  // Score
  scoreRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  scoreTeam: { flex: 1, alignItems: 'center', gap: 6 },
  scoreTeamName: { color: '#666', fontSize: 11, fontWeight: FontWeights.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreNum: { color: '#fff', fontSize: 48, fontWeight: FontWeights.bold, lineHeight: 54 },
  scoreDash: { color: '#333', fontSize: 28, fontWeight: FontWeights.bold },
  opponentControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreAdj: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  scoreAdjText: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },

  // Buttons
  timerBtnRow: { flexDirection: 'row', justifyContent: 'center' },
  mainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.lg,
    paddingVertical: 16, paddingHorizontal: Spacing.xxl, minWidth: 200,
  },
  mainBtnPause: { backgroundColor: '#FFC107' },
  mainBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },

  // Event feed
  eventFeed: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md, gap: Spacing.xs,
  },
  feedTitle: { color: '#444', fontSize: 10, fontWeight: FontWeights.bold, letterSpacing: 1.5, marginBottom: Spacing.xs },
  eventChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  eventChipIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  eventChipName: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  eventChipMeta: { color: '#555', fontSize: 11, marginTop: 1 },
  eventChipRemove: { padding: 6 },

  noEvents: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  noEventsText: { color: '#333', fontSize: FontSizes.sm },

  // FAB
  fab: {
    position: 'absolute', right: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dark.tint, borderRadius: 30,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    elevation: 8,
    shadowColor: Colors.dark.tint, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  fabText: { color: '#000', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },

  // Modals
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg,
  },
  htModal: {
    width: '100%', backgroundColor: '#111',
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  htTitle: { color: '#fff', fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, letterSpacing: 2 },
  htScore: { color: Colors.dark.tint, fontSize: 56, fontWeight: FontWeights.bold },
  htSub: { color: '#555', fontSize: FontSizes.sm },
  htStats: { flexDirection: 'row', gap: Spacing.lg },
  htStat: { color: '#444', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  htBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginTop: Spacing.sm,
  },
  htBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },

  // Event modal
  eventModal: {
    width: '100%', backgroundColor: '#111',
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '85%',
  },
  eventModalHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs,
  },
  modalBack: { marginRight: Spacing.sm },
  eventModalTitle: { flex: 1, color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  modalClose: { padding: 4 },
  eventMinute: { color: '#555', fontSize: FontSizes.xs, marginBottom: Spacing.md, fontWeight: FontWeights.medium },

  eventTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  eventTypeCard: {
    width: '46%', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  eventTypeLabel: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },

  goalTypeSection: { marginBottom: Spacing.md },
  goalTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  goalTypeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  goalTypeChipActive: { backgroundColor: Colors.dark.tint, borderColor: Colors.dark.tint },
  goalTypeChipText: { color: '#888', fontSize: 12, fontWeight: FontWeights.medium },

  pickerSectionLabel: {
    color: '#444', fontSize: 10, fontWeight: FontWeights.bold,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: Spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 10, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: Spacing.xs,
  },
  pickerRowSelected: { backgroundColor: Colors.dark.tint, borderColor: Colors.dark.tint },
  pickerAvatar: { width: 36, height: 36, borderRadius: 18 },
  pickerAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  pickerAvatarText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  pickerName: { flex: 1, color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  pickerGKBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  pickerGKText: { color: '#888', fontSize: 9, fontWeight: FontWeights.bold },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md, marginTop: Spacing.md,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});
