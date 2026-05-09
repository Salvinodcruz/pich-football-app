import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { sendChallenge } from '@/src/utils/challengeService';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons } from '@expo/vector-icons';

const FORMATS = ['5-a-side', '7-a-side', '11-a-side'];
const MATCH_TYPES = ['Friendly', 'Rated'];

const VENUES_BY_EMIRATE: Record<string, string[]> = {
  Sharjah: [
    'Falcon Sports - Al Majaz, SHJ',
    'Al Wahda Sports Club, SHJ',
    'Sharjah Club Ground, SHJ',
    'Sharjah Stadium Area, SHJ',
  ],
  Dubai: [
    'Ahdaaf Sports Club - Al Quoz, DXB',
    'Champs 5 A Side - Festival City, DXB',
    'The Sevens Stadium, DXB',
    'Dubai Sports City, DXB',
  ],
  Ajman: [
    'Football Ground - Al Jerf, AJM',
    'Green Sport Club - Ajman City, AJM',
    'Titan Pro Sports - Al Tallah, AJM',
    'Ajman Club Ground, AJM',
  ],
};

const now = new Date();
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = [String(now.getFullYear()), String(now.getFullYear() + 1), String(now.getFullYear() + 2)];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

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

export default function SendChallengeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toTeamId, toTeamName, toTeamColor } = useLocalSearchParams<{
    toTeamId: string;
    toTeamName: string;
    toTeamColor: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState('7-a-side');
  const [matchType, setMatchType] = useState<'Friendly' | 'Rated'>('Friendly');
  const [venue, setVenue] = useState('');
  const [venueEmirate, setVenueEmirate] = useState('Sharjah');
  const [showCustomVenue, setShowCustomVenue] = useState(false);
  const [customVenue, setCustomVenue] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const nowDate = new Date();
  const currentDay = String(nowDate.getDate()).padStart(2, '0');
  const currentMonth = MONTHS[nowDate.getMonth()];
  const currentYear = String(nowDate.getFullYear());
  const currentHour24 = nowDate.getHours();
  const currentPeriod = currentHour24 >= 12 ? 'PM' : 'AM';
  const currentHour12 = currentHour24 % 12 || 12;
  const currentHour = String(currentHour12).padStart(2, '0');
  const currentMinute = MINUTES.reduce((prev, curr) =>
    Math.abs(parseInt(curr) - nowDate.getMinutes()) < Math.abs(parseInt(prev) - nowDate.getMinutes()) ? curr : prev
  );

  const [day, setDay] = useState(currentDay);
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [hour, setHour] = useState(currentHour);
  const [minute, setMinute] = useState(currentMinute);
  const [period, setPeriod] = useState(currentPeriod);

  const dateString = `${day} ${month} ${year}`;
  const timeString = `${hour}:${minute} ${period}`;

  const handleSend = async () => {
    if (!venue) { Alert.alert('Missing Info', 'Please select a venue'); return; }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      if (!userData?.teamId) {
        Alert.alert('No Team', 'You need to be in a team to send challenges');
        return;
      }
      const teamDoc = await getDoc(doc(db, 'teams', userData.teamId));
      const teamData = teamDoc.data();
      await sendChallenge({
        fromTeamId: userData.teamId,
        fromTeamName: teamData?.name || 'Unknown',
        fromTeamColor: teamData?.color || '#00E676',
        toTeamId,
        toTeamName,
        toTeamColor: toTeamColor || '#00E676',
        format,
        matchType,
        date: dateString,
        time: timeString,
        venue,
        message: '',
      });
      Alert.alert('Challenge Sent!', `Your challenge has been sent to ${toTeamName}.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Could not send challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 40,
        }]}
        showsVerticalScrollIndicator={false}
      >
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="arrow-back" size={20} color={Colors.dark.tint} />
          <Text style={styles.backText}>Back</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.pageTitle}>Send Challenge</Text>

      {/* Opponent */}
      <View style={styles.opponentCard}>
        <View style={[styles.teamBadge, { backgroundColor: toTeamColor || Colors.dark.tint }]}>
          <Text style={styles.badgeText}>{toTeamName?.substring(0, 2).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.vsText}>Challenging</Text>
          <Text style={styles.opponentName}>{toTeamName}</Text>
        </View>
      </View>

      {/* Format */}
      <View style={styles.section}>
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
      </View>

      {/* Match Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Match Type</Text>
        <View style={styles.optionRow}>
          {MATCH_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.optionBtn, matchType === t && styles.optionBtnActive]}
              onPress={() => setMatchType(t as any)}
            >
              <Text style={[styles.optionText, matchType === t && styles.optionTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {matchType === 'Rated' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm }}>
            <Ionicons name="alert-circle-outline" size={14} color="#FFC107" />
            <Text style={styles.ratedNote}>Rated matches require lineup submission 24hrs before</Text>
          </View>
        )}
      </View>

      {/* Date Picker */}
      <View style={styles.section}>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={Colors.dark.tint} />
          <Text style={styles.pickerTriggerText}>{dateString}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.dark.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Time Picker */}
      <View style={styles.section}>
        <Text style={styles.label}>Time</Text>
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time-outline" size={18} color={Colors.dark.tint} />
          <Text style={styles.pickerTriggerText}>{timeString}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.dark.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Venue */}
      <View style={styles.section}>
        <Text style={styles.label}>Venue</Text>
        
        {/* Emirate tabs for venue */}
        <View style={styles.venueEmirateRow}>
          {['Sharjah', 'Dubai', 'Ajman'].map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.venueEmirateBtn, venueEmirate === e && styles.venueEmirateBtnActive]}
              onPress={() => { setVenueEmirate(e); setVenue(''); setShowCustomVenue(false); }}
            >
              <Text style={[styles.venueEmirateBtnText, venueEmirate === e && styles.venueEmirateBtnTextActive]}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.venueList}>
          {VENUES_BY_EMIRATE[venueEmirate].map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.venueRow, venue === v && !showCustomVenue && styles.venueRowActive]}
              onPress={() => { setVenue(v); setShowCustomVenue(false); }}
            >
              <Ionicons name="location-outline" size={14} color={venue === v && !showCustomVenue ? Colors.dark.tint : Colors.dark.textSecondary} />
              <Text style={[styles.venueText, venue === v && !showCustomVenue && styles.venueTextActive]} numberOfLines={1}>{v}</Text>
              {venue === v && !showCustomVenue && <Ionicons name="checkmark-circle" size={16} color={Colors.dark.tint} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.venueRow, showCustomVenue && styles.venueRowActive]}
            onPress={() => { setShowCustomVenue(true); setVenue(''); }}
          >
            <Ionicons name="pencil-outline" size={14} color={showCustomVenue ? Colors.dark.tint : Colors.dark.textSecondary} />
            <Text style={[styles.venueText, showCustomVenue && styles.venueTextActive]}>Custom venue...</Text>
            {showCustomVenue && <Ionicons name="checkmark-circle" size={16} color={Colors.dark.tint} />}
          </TouchableOpacity>
        </View>

  {showCustomVenue && (
    <TextInput
      style={[styles.input, { marginTop: Spacing.sm }]}
      value={customVenue}
      onChangeText={v => { setCustomVenue(v); setVenue(v); }}
      placeholder="Type venue name and area..."
      placeholderTextColor={Colors.dark.textSecondary}
      autoFocus
    />
  )}
</View>

      <TouchableOpacity
        style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#000" />
          : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flash" size={18} color="#000" />
              <Text style={styles.sendBtnText}>Send Challenge</Text>
            </View>
        }
      </TouchableOpacity>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Date</Text>
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
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar" size={18} color={Colors.dark.tint} />
                <Text style={styles.pickerPreviewText}>{dateString}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.pickerModalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerRow}>
              <View style={styles.pickerColWrapper}>
                <Text style={styles.pickerColLabel}>Hour</Text>
                <ScrollPicker items={HOURS} selected={hour} onSelect={setHour} />
              </View>
              <View style={styles.pickerColWrapper}>
                <Text style={styles.pickerColLabel}>Min</Text>
                <ScrollPicker items={MINUTES} selected={minute} onSelect={setMinute} />
              </View>
              <View style={styles.pickerColWrapper}>
                <Text style={styles.pickerColLabel}>AM/PM</Text>
                <ScrollPicker items={PERIODS} selected={period} onSelect={setPeriod} />
              </View>
            </View>
            <View style={styles.pickerPreview}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time" size={18} color={Colors.dark.tint} />
                <Text style={styles.pickerPreviewText}>{timeString}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.dark.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.dark.border },
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text, marginBottom: Spacing.lg },
  opponentCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.dark.border },
  teamBadge: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  vsText: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  opponentName: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  section: { marginBottom: Spacing.lg },
  label: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, marginBottom: Spacing.sm },
  optionRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.card },
  optionBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  optionText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  optionTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },
  ratedNote: { color: '#FFC107', fontSize: FontSizes.xs },
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.sm },
  pickerTriggerIcon: { fontSize: 18 },
  pickerTriggerText: { flex: 1, color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  pickerTriggerArrow: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  venueChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.card, marginRight: Spacing.sm },
  venueChipActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  venueChipText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  venueChipTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },
  sendBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },

  venueEmirateRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  venueEmirateBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.card, alignItems: 'center' },
  venueEmirateBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  venueEmirateBtnText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  venueEmirateBtnTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  venueList: { gap: Spacing.xs },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.sm, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  venueRowActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '15' },
  venuePin: { fontSize: 14 },
  venueText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, flex: 1 },
  venueTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },
  venueCheck: { color: Colors.dark.tint, fontWeight: FontWeights.bold },

  // Picker Modal
  pickerModalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: Colors.dark.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, paddingBottom: 40 },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  pickerModalTitle: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  pickerModalDone: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  pickerRow: { flexDirection: 'row', gap: Spacing.sm, height: 180 },
  pickerColWrapper: { flex: 1, alignItems: 'center' },
  pickerColLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, marginBottom: Spacing.sm },
  pickerColumn: { flex: 1, width: '100%' },
  pickerItem: { paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
  pickerItemActive: { backgroundColor: Colors.dark.tint + '20', borderWidth: 1, borderColor: Colors.dark.tint },
  pickerItemText: { color: Colors.dark.textSecondary, fontSize: FontSizes.md },
  pickerItemTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  pickerPreview: { marginTop: Spacing.lg, backgroundColor: Colors.dark.background, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  pickerPreviewText: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
});
