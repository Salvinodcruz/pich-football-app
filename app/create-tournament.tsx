import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { createTournament } from '@/src/utils/tournamentService';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';

const FORMATS = ['5-a-side', '7-a-side', '11-a-side'];
const EMIRATES = ['Sharjah', 'Dubai', 'Ajman'];
const MAX_TEAMS_OPTIONS = ['4', '8', '16'];

const VENUES_BY_EMIRATE: Record<string, string[]> = {
  Sharjah: [
    'Falcon Sports - Al Majaz, SHJ',
    'Al Wahda Sports Club, SHJ',
    'Sharjah Club Ground, SHJ',
    'Custom...',
  ],
  Dubai: [
    'Ahdaaf Sports Club - Al Quoz, DXB',
    'Champs 5 A Side - Festival City, DXB',
    'The Sevens Stadium, DXB',
    'Custom...',
  ],
  Ajman: [
    'Football Ground - Al Jerf, AJM',
    'Green Sport Club - Ajman City, AJM',
    'Titan Pro Sports - Al Tallah, AJM',
    'Custom...',
  ],
};

const now = new Date();
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = [String(now.getFullYear()), String(now.getFullYear() + 1)];

export default function CreateTournamentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [format, setFormat] = useState('7-a-side');
  const [emirate, setEmirate] = useState('Sharjah');
  const [maxTeams, setMaxTeams] = useState('8');
  const [venue, setVenue] = useState('');
  const [customVenue, setCustomVenue] = useState('');
  const [showCustomVenue, setShowCustomVenue] = useState(false);
  const [entryFee, setEntryFee] = useState('0');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const currentDay = String(now.getDate()).padStart(2, '0');
  const currentMonth = MONTHS[now.getMonth()];
  const currentYear = String(now.getFullYear());
  const [day, setDay] = useState(currentDay);
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const dateString = `${day} ${month} ${year}`;

  const finalVenue = showCustomVenue ? customVenue : venue;

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Missing Info', 'Please enter a tournament name'); return; }
    if (!finalVenue.trim()) { Alert.alert('Missing Info', 'Please select or enter a venue'); return; }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const teamId = userDoc.data()?.teamId;
      if (!teamId) { Alert.alert('No Team', 'You need a team to create a tournament'); return; }
      await createTournament({
        name: name.trim(),
        format,
        emirate,
        maxTeams: parseInt(maxTeams),
        startDate: dateString,
        venue: finalVenue.trim(),
        entryFee: parseInt(entryFee) || 0,
      }, user.uid, teamId);
      Alert.alert('Tournament Created! 🏆', `${name} is now live!`, [
        { text: 'OK', onPress: () => router.replace('/(tabs)/tournaments') }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Could not create tournament');
    } finally {
      setLoading(false);
    }
  };

  const ScrollPicker = ({ items, selected, onSelect }: { items: string[], selected: string, onSelect: (v: string) => void }) => (
    <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
      {items.map(item => (
        <TouchableOpacity
          key={item}
          style={[styles.pickerItem, selected === item && styles.pickerItemActive]}
          onPress={() => onSelect(item)}
        >
          <Text style={[styles.pickerItemText, selected === item && styles.pickerItemTextActive]}>
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ChevronBackground />
      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 40,
        }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Create Tournament</Text>

        {/* Step 1 — Name */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepTitle}>Tournament Name</Text>
          </View>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sharjah Cup 2026"
            placeholderTextColor={Colors.dark.textSecondary}
          />
        </View>

        {/* Step 2 — Format & Emirate */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepTitle}>Format & Location</Text>
          </View>
          <Text style={styles.label}>Format</Text>
          <View style={styles.optionRow}>
            {FORMATS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.optionBtn, format === f && styles.optionBtnActive]}
                onPress={() => setFormat(f)}
              >
                <Text style={[styles.optionText, format === f && styles.optionTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Emirate</Text>
          <View style={styles.optionRow}>
            {EMIRATES.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.optionBtn, emirate === e && styles.optionBtnActive]}
                onPress={() => { setEmirate(e); setVenue(''); setShowCustomVenue(false); }}
              >
                <Text style={[styles.optionText, emirate === e && styles.optionTextActive]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 3 — Teams & Fee */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepTitle}>Teams & Entry Fee</Text>
          </View>
          <Text style={styles.label}>Max Teams</Text>
          <View style={styles.optionRow}>
            {MAX_TEAMS_OPTIONS.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.optionBtn, maxTeams === t && styles.optionBtnActive]}
                onPress={() => setMaxTeams(t)}
              >
                <Text style={[styles.optionText, maxTeams === t && styles.optionTextActive]}>{t} teams</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Entry Fee (AED) — 0 for free</Text>
          <TextInput
            style={styles.input}
            value={entryFee}
            onChangeText={setEntryFee}
            placeholder="0"
            placeholderTextColor={Colors.dark.textSecondary}
            keyboardType="numeric"
          />
        </View>

        {/* Step 4 — Date */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>4</Text></View>
            <Text style={styles.stepTitle}>Start Date</Text>
          </View>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.pickerTriggerIcon}>📅</Text>
            <Text style={styles.pickerTriggerText}>{dateString}</Text>
            <Text style={styles.pickerTriggerArrow}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Step 5 — Venue */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>5</Text></View>
            <Text style={styles.stepTitle}>Venue</Text>
          </View>
          <Text style={styles.label}>Select a venue in {emirate}</Text>
          <View style={styles.venueList}>
            {VENUES_BY_EMIRATE[emirate].map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.venueRow, venue === v && !showCustomVenue && styles.venueRowActive]}
                onPress={() => {
                  if (v === 'Custom...') {
                    setShowCustomVenue(true);
                    setVenue('');
                  } else {
                    setVenue(v);
                    setShowCustomVenue(false);
                  }
                }}
              >
                <Text style={styles.venueIcon}>📍</Text>
                <Text style={[styles.venueText, venue === v && !showCustomVenue && styles.venueTextActive]}>
                  {v}
                </Text>
                {venue === v && !showCustomVenue && <Text style={styles.venueCheck}>✓</Text>}
                {v === 'Custom...' && showCustomVenue && <Text style={styles.venueCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
          {showCustomVenue && (
            <TextInput
              style={[styles.input, { marginTop: Spacing.sm }]}
              value={customVenue}
              onChangeText={setCustomVenue}
              placeholder="Enter venue name and area..."
              placeholderTextColor={Colors.dark.textSecondary}
              autoFocus
            />
          )}
        </View>

        {/* Summary */}
        {name.trim() && finalVenue.trim() && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>🏆 {name}</Text>
            <Text style={styles.summaryMeta}>{format} · {emirate} · {maxTeams} teams</Text>
            <Text style={styles.summaryMeta}>📅 {dateString}</Text>
            <Text style={styles.summaryMeta}>📍 {finalVenue}</Text>
            <Text style={styles.summaryMeta}>💰 {entryFee === '0' ? 'Free entry' : `AED ${entryFee}`}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.createBtnText}>🏆 Create Tournament</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Start Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerModalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerRow}>
              <View style={styles.pickerColWrapper}>
                <Text style={styles.pickerColLabel}>Day</Text>
                <ScrollPicker items={DAYS} selected={day} onSelect={setDay} />
              </View>
              <View style={styles.pickerColWrapper}>
                <Text style={styles.pickerColLabel}>Month</Text>
                <ScrollPicker items={MONTHS} selected={month} onSelect={setMonth} />
              </View>
              <View style={styles.pickerColWrapper}>
                <Text style={styles.pickerColLabel}>Year</Text>
                <ScrollPicker items={YEARS} selected={year} onSelect={setYear} />
              </View>
            </View>
            <View style={styles.pickerPreview}>
              <Text style={styles.pickerPreviewText}>📅 {dateString}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 , backgroundColor: 'transparent' },
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff', marginBottom: Spacing.lg },

  // Step cards
  stepCard: { backgroundColor: '#141414CC', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#2A2A2A' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: '#000', fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  stepTitle: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },

  label: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, color: '#fff', fontSize: FontSizes.md, borderWidth: 1, borderColor: '#2A2A2A' },
  optionRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#1A1A1A' },
  optionBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  optionText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  optionTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },

  // Venue
  venueList: { gap: Spacing.xs },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#1A1A1A', borderRadius: BorderRadius.sm, padding: Spacing.md, borderWidth: 1, borderColor: '#2A2A2A' },
  venueRowActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '15' },
  venueIcon: { fontSize: 14 },
  venueText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, flex: 1 },
  venueTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },
  venueCheck: { color: Colors.dark.tint, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },

  // Date picker trigger
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: '#2A2A2A', gap: Spacing.sm },
  pickerTriggerIcon: { fontSize: 18 },
  pickerTriggerText: { flex: 1, color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  pickerTriggerArrow: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },

  // Summary
  summaryCard: { backgroundColor: Colors.dark.tint + '15', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.dark.tint + '40', gap: 4 },
  summaryTitle: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  summaryMeta: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },

  createBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },

  // Picker modal
  pickerModalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, paddingBottom: 40 },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  pickerModalTitle: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  pickerModalDone: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  pickerRow: { flexDirection: 'row', gap: Spacing.sm, height: 180 },
  pickerColWrapper: { flex: 1, alignItems: 'center' },
  pickerColLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, marginBottom: Spacing.sm },
  pickerColumn: { flex: 1, width: '100%' },
  pickerItem: { paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
  pickerItemActive: { backgroundColor: Colors.dark.tint + '20', borderWidth: 1, borderColor: Colors.dark.tint },
  pickerItemText: { color: Colors.dark.textSecondary, fontSize: FontSizes.md },
  pickerItemTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  pickerPreview: { marginTop: Spacing.lg, backgroundColor: '#111', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  pickerPreviewText: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
});