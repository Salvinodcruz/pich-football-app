import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';

const VENUES_BY_EMIRATE: Record<string, string[]> = {
  Sharjah: ['Falcon Sports - Al Majaz, SHJ', 'Al Wahda Sports Club, SHJ', 'Sharjah Club Ground, SHJ', 'Sharjah Stadium Area, SHJ'],
  Dubai: ['Ahdaaf Sports Club - Al Quoz, DXB', 'Champs 5 A Side - Festival City, DXB', 'The Sevens Stadium, DXB', 'Dubai Sports City, DXB'],
  Ajman: ['Football Ground - Al Jerf, AJM', 'Green Sport Club - Ajman City, AJM', 'Titan Pro Sports - Al Tallah, AJM', 'Ajman Club Ground, AJM'],
};

const now = new Date();
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = [String(now.getFullYear()), String(now.getFullYear() + 1)];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

const ScrollPicker = ({ items, selected, onSelect }: any) => (
  <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
    {items.map((item: string) => (
      <TouchableOpacity
        key={item}
        style={[styles.pickerItem, selected === item && styles.pickerItemActive]}
        onPress={() => onSelect(item)}
      >
        <Text style={[styles.pickerItemText, selected === item && styles.pickerItemTextActive]}>{item}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

export default function EditMatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { challengeId, currentDate, currentTime, currentVenue } = useLocalSearchParams<{
    challengeId: string;
    currentDate: string;
    currentTime: string;
    currentVenue: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [venueEmirate, setVenueEmirate] = useState('Sharjah');
  const [venue, setVenue] = useState(currentVenue || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const dateParts = currentDate?.split(' ') || [];
  const timeParts = currentTime?.split(' ') || [];
  const timeHM = timeParts[0]?.split(':') || ['07', '00'];

  const [day, setDay] = useState(dateParts[0] || String(now.getDate()).padStart(2, '0'));
  const [month, setMonth] = useState(dateParts[1] || MONTHS[now.getMonth()]);
  const [year, setYear] = useState(dateParts[2] || String(now.getFullYear()));
  const [hour, setHour] = useState(timeHM[0] || '07');
  const [minute, setMinute] = useState(timeHM[1] || '00');
  const [period, setPeriod] = useState(timeParts[1] || 'PM');

  const dateString = `${day} ${month} ${year}`;
  const timeString = `${hour}:${minute} ${period}`;

  const handleSave = async () => {
    if (!venue.trim()) { Alert.alert('Missing Info', 'Please select a venue'); return; }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get team name for notification
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const teamId = userDoc.data()?.teamId;
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      const teamName = teamDoc.data()?.name || 'Team';

      // Update challenge
      await updateDoc(doc(db, 'challenges', challengeId), {
        date: dateString,
        time: timeString,
        venue: venue.trim(),
        lastEditedBy: teamId,
        lastEditedAt: new Date().toISOString(),
      });

      // Notify the other team
      const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
      const challengeData = challengeDoc.data();
      const otherTeamId = challengeData?.fromTeamId === teamId ? challengeData?.toTeamId : challengeData?.fromTeamId;
      const otherTeamDoc = await getDoc(doc(db, 'teams', otherTeamId));
      const otherCaptainId = otherTeamDoc.data()?.captainId;

      if (otherCaptainId) {
        const { addDoc, collection } = await import('firebase/firestore');
        await addDoc(collection(db, 'notifications'), {
          type: 'match_details_changed',
          toUserId: otherCaptainId,
          fromTeamName: teamName,
          challengeId,
          newDate: dateString,
          newTime: timeString,
          newVenue: venue.trim(),
          status: 'pending',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      Alert.alert('✅ Match Updated!', 'The other captain has been notified.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not update match details');
    } finally {
      setLoading(false);
    }
  };



  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ChevronBackground />
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 40,
        }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Edit Match Details</Text>
        <Text style={styles.subtitle}>Changes will notify the other captain</Text>

        {/* Date */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepTitle}>Date</Text>
          </View>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.pickerTriggerIcon}>📅</Text>
            <Text style={styles.pickerTriggerText}>{dateString}</Text>
            <Text style={styles.pickerTriggerArrow}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Time */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepTitle}>Time</Text>
          </View>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.pickerTriggerIcon}>🕐</Text>
            <Text style={styles.pickerTriggerText}>{timeString}</Text>
            <Text style={styles.pickerTriggerArrow}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Venue */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepTitle}>Venue</Text>
          </View>
          <View style={styles.venueEmirateRow}>
            {['Sharjah', 'Dubai', 'Ajman'].map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.venueEmirateBtn, venueEmirate === e && styles.venueEmirateBtnActive]}
                onPress={() => { setVenueEmirate(e); }}
              >
                <Text style={[styles.venueEmirateBtnText, venueEmirate === e && styles.venueEmirateBtnTextActive]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.venueList}>
            {VENUES_BY_EMIRATE[venueEmirate].map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.venueRow, venue === v && styles.venueRowActive]}
                onPress={() => setVenue(v)}
              >
                <Text style={styles.venuePin}>📍</Text>
                <Text style={[styles.venueText, venue === v && styles.venueTextActive]} numberOfLines={1}>{v}</Text>
                {venue === v && <Text style={styles.venueCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerRow}>
              <View style={styles.pickerCol}><Text style={styles.pickerColLabel}>Day</Text><ScrollPicker items={DAYS} selected={day} onSelect={setDay} /></View>
              <View style={styles.pickerCol}><Text style={styles.pickerColLabel}>Month</Text><ScrollPicker items={MONTHS} selected={month} onSelect={setMonth} /></View>
              <View style={styles.pickerCol}><Text style={styles.pickerColLabel}>Year</Text><ScrollPicker items={YEARS} selected={year} onSelect={setYear} /></View>
            </View>
            <View style={styles.pickerPreview}><Text style={styles.pickerPreviewText}>📅 {dateString}</Text></View>
          </View>
        </View>
      </Modal>

      {/* Time Picker */}
      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerRow}>
              <View style={styles.pickerCol}><Text style={styles.pickerColLabel}>Hour</Text><ScrollPicker items={HOURS} selected={hour} onSelect={setHour} /></View>
              <View style={styles.pickerCol}><Text style={styles.pickerColLabel}>Min</Text><ScrollPicker items={MINUTES} selected={minute} onSelect={setMinute} /></View>
              <View style={styles.pickerCol}><Text style={styles.pickerColLabel}>AM/PM</Text><ScrollPicker items={PERIODS} selected={period} onSelect={setPeriod} /></View>
            </View>
            <View style={styles.pickerPreview}><Text style={styles.pickerPreviewText}>🕐 {timeString}</Text></View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff', marginBottom: 4 },
  subtitle: { color: '#666', fontSize: FontSizes.sm, marginBottom: Spacing.lg },
  stepCard: { backgroundColor: '#141414CC', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#2A2A2A' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: '#000', fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  stepTitle: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: '#2A2A2A', gap: Spacing.sm },
  pickerTriggerIcon: { fontSize: 18 },
  pickerTriggerText: { flex: 1, color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  pickerTriggerArrow: { color: '#666', fontSize: FontSizes.sm },
  venueEmirateRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  venueEmirateBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#1A1A1A', alignItems: 'center' },
  venueEmirateBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  venueEmirateBtnText: { color: '#666', fontSize: FontSizes.sm },
  venueEmirateBtnTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  venueList: { gap: Spacing.xs },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#1A1A1A', borderRadius: BorderRadius.sm, padding: Spacing.md, borderWidth: 1, borderColor: '#2A2A2A' },
  venueRowActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '15' },
  venuePin: { fontSize: 14 },
  venueText: { color: '#666', fontSize: FontSizes.sm, flex: 1 },
  venueTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },
  venueCheck: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  saveBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  pickerOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, paddingBottom: 40 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  pickerTitle: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  pickerDone: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  pickerRow: { flexDirection: 'row', gap: Spacing.sm, height: 180 },
  pickerCol: { flex: 1, alignItems: 'center' },
  pickerColLabel: { color: '#666', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, marginBottom: Spacing.sm },
  pickerColumn: { flex: 1, width: '100%' },
  pickerItem: { paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
  pickerItemActive: { backgroundColor: Colors.dark.tint + '20', borderWidth: 1, borderColor: Colors.dark.tint },
  pickerItemText: { color: '#666', fontSize: FontSizes.md },
  pickerItemTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  pickerPreview: { marginTop: Spacing.lg, backgroundColor: '#111', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  pickerPreviewText: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
});