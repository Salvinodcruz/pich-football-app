import React, { useState } from 'react';
import {View, Text, TextInput, TouchableOpacity,StyleSheet, Alert, ActivityIndicator,ScrollView} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';
import { updatePlayerRating } from '@/src/utils/ratingService';

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];
const EMIRATES = ['Sharjah', 'Dubai', 'Ajman'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const generatePlayerId = () => {
  return 'PCH-' + Math.random().toString(36).substring(2, 7).toUpperCase();
};

export default function ProfileSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const email = params.email as string;
  const firstName = params.firstName as string;
  const middleName = params.middleName as string;
  const lastName = params.lastName as string;

  const [position, setPosition] = useState('');
  const [emirate, setEmirate] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [loading, setLoading] = useState(false);

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

  const handleSave = async () => {
    if (!position) { Alert.alert('Error', 'Please select your position'); return; }
    if (!emirate) { Alert.alert('Error', 'Please select your emirate'); return; }

    setLoading(true);
    try {
      const dob = dobDay && dobMonth && dobYear
        ? `${dobDay} ${dobMonth} ${dobYear}`
        : null;

      await setDoc(doc(db, 'users', userId), {
        email,
        firstName,
        middleName: middleName || '',
        lastName,
        name: `${firstName} ${lastName}`,
        fullName,
        position,
        emirate,
        dob,
        skillRating: 1,
        isFreeAgent: true,
        isCasual: false,
        teamId: null,
        photoURL: null,
        matches: 0,
        goals: 0,
        assists: 0,
        createdAt: new Date().toISOString(),
        playerId: generatePlayerId(),
      });

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Complete Profile</Text>
        <Text style={styles.subtitle}>Welcome, {firstName}! Just a few more details.</Text>
      </View>

      {/* Name Preview */}
      <View style={styles.namePreview}>
        <View style={styles.nameAvatar}>
          <Text style={styles.nameAvatarText}>
            {firstName.substring(0, 1)}{lastName.substring(0, 1)}
          </Text>
        </View>
        <Text style={styles.namePreviewText}>{fullName}</Text>
      </View>

      {/* Date of Birth */}
      <View style={styles.section}>
        <Text style={styles.label}>Date of Birth (optional)</Text>
        <View style={styles.dobRow}>
          <TextInput
            style={[styles.input, styles.dobDay]}
            placeholder="DD"
            placeholderTextColor={Colors.dark.textSecondary}
            value={dobDay}
            onChangeText={setDobDay}
            keyboardType="numeric"
            maxLength={2}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.monthScroll}
          >
            {MONTHS.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.monthBtn, dobMonth === m && styles.monthBtnActive]}
                onPress={() => setDobMonth(m)}
              >
                <Text style={[styles.monthText, dobMonth === m && styles.monthTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={[styles.input, styles.dobYear]}
            placeholder="YYYY"
            placeholderTextColor={Colors.dark.textSecondary}
            value={dobYear}
            onChangeText={setDobYear}
            keyboardType="numeric"
            maxLength={4}
          />
        </View>
      </View>

      {/* Position */}
      <View style={styles.section}>
        <Text style={styles.label}>Position *</Text>
        <View style={styles.optionRow}>
          {POSITIONS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.optionBtn, position === p && styles.optionBtnActive]}
              onPress={() => setPosition(p)}
            >
              <Text style={[styles.optionText, position === p && styles.optionTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Emirate */}
      <View style={styles.section}>
        <Text style={styles.label}>Emirate *</Text>
        <View style={styles.optionRow}>
          {EMIRATES.map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.optionBtn, emirate === e && styles.optionBtnActive]}
              onPress={() => setEmirate(e)}
            >
              <Text style={[styles.optionText, emirate === e && styles.optionTextActive]}>
                {e}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={Colors.dark.background} />
          : <Text style={styles.buttonText}>Let's Go! →</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  header: { marginTop: 40, marginBottom: Spacing.xl },
  title: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text },
  subtitle: { fontSize: FontSizes.md, color: Colors.dark.textSecondary, marginTop: 4 },
  namePreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.dark.border },
  nameAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  nameAvatarText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  namePreviewText: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  section: { marginBottom: Spacing.lg },
  label: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.dark.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.dark.text },
  dobRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dobDay: { width: 60, textAlign: 'center' },
  dobYear: { width: 80, textAlign: 'center' },
  monthScroll: { flex: 1 },
  monthBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.card, marginRight: Spacing.xs },
  monthBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  monthText: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  monthTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  optionRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.card },
  optionBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  optionText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  optionTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  button: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.dark.background, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});