import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '@/src/config/firebase';
import { createTeam } from '@/src/utils/teamService';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';

const EMIRATES = ['Sharjah', 'Dubai', 'Ajman'];
const FORMATS = ['5-a-side', '7-a-side', '11-a-side'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const TEAM_COLORS = ['#00E676', '#FF6B6B', '#4FC3F7', '#FFD54F', '#CE93D8', '#FF8A65'];

export default function CreateTeamScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [selectedEmirate, setSelectedEmirate] = useState('Sharjah');
  const [selectedFormat, setSelectedFormat] = useState('7-a-side');
  const [selectedSkill, setSelectedSkill] = useState('Intermediate');
  const [selectedColor, setSelectedColor] = useState('#00E676');

  const handleCreate = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }
    setLoading(true);
    try {
      await createTeam({
        name: teamName.trim(),
        captainId: user.uid,
        captainName: user.displayName || 'Captain',
        emirate: selectedEmirate as any,
        format: selectedFormat as any,
        skillLevel: selectedSkill as any,
        color: selectedColor,
      }, user.uid);
      Alert.alert('Success!', 'Your team has been created!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/my-team') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

return (
  <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
    <ChevronBackground />
    <ScrollView
      style={[styles.container, { backgroundColor: 'transparent' }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Team</Text>
      </View>

      {/* Team Name */}
      <View style={styles.section}>
        <Text style={styles.label}>Team Name</Text>
        <TextInput
          style={styles.input}
          value={teamName}
          onChangeText={setTeamName}
          placeholder="e.g. Desert Kings FC"
          placeholderTextColor={Colors.dark.textSecondary}
          maxLength={30}
        />
      </View>

      {/* Team Color */}
      <View style={styles.section}>
        <Text style={styles.label}>Team Color</Text>
        <View style={styles.colorRow}>
          {TEAM_COLORS.map(color => (
            <TouchableOpacity
              key={color}
              style={[styles.colorDot, { backgroundColor: color },
                selectedColor === color && styles.colorDotSelected]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>
      </View>

      {/* Emirate */}
      <View style={styles.section}>
        <Text style={styles.label}>Home Emirate</Text>
        <View style={styles.optionRow}>
          {EMIRATES.map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.optionBtn, selectedEmirate === e && styles.optionBtnActive]}
              onPress={() => setSelectedEmirate(e)}
            >
              <Text style={[styles.optionText, selectedEmirate === e && styles.optionTextActive]}>
                {e}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Format */}
      <View style={styles.section}>
        <Text style={styles.label}>Format</Text>
        <View style={styles.optionRow}>
          {FORMATS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.optionBtn, selectedFormat === f && styles.optionBtnActive]}
              onPress={() => setSelectedFormat(f)}
            >
              <Text style={[styles.optionText, selectedFormat === f && styles.optionTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Skill Level */}
      <View style={styles.section}>
        <Text style={styles.label}>Skill Level</Text>
        <View style={styles.optionRow}>
          {SKILL_LEVELS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.optionBtn, selectedSkill === s && styles.optionBtnActive]}
              onPress={() => setSelectedSkill(s)}
            >
              <Text style={[styles.optionText, selectedSkill === s && styles.optionTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Preview */}
      <View style={styles.preview}>
        <View style={[styles.previewBadge, { backgroundColor: selectedColor }]}>
          <Text style={styles.previewBadgeText}>
            {teamName ? teamName.substring(0, 2).toUpperCase() : 'FC'}
          </Text>
        </View>
        <View>
          <Text style={styles.previewName}>{teamName || 'Your Team Name'}</Text>
          <Text style={styles.previewMeta}>{selectedEmirate} · {selectedFormat} · {selectedSkill}</Text>
        </View>
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={[styles.createBtn, loading && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={styles.createBtnText}>Create Team</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  header: { marginBottom: Spacing.xl },
  backBtn: { marginBottom: Spacing.sm },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md },
  title: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text },
  section: { marginBottom: Spacing.lg },
  label: { fontSize: FontSizes.sm, color: Colors.dark.textSecondary, marginBottom: Spacing.sm, fontWeight: FontWeights.semibold },
  input: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.dark.text,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  colorRow: { flexDirection: 'row', gap: Spacing.sm },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.dark.text },
  optionRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  optionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
  },
  optionBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  optionText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  optionTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  previewBadge: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  previewBadgeText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  previewName: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  previewMeta: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  createBtn: {
    backgroundColor: Colors.dark.tint,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});
