import React, { useState } from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { auth, db } from '@/src/config/firebase';
import { createTeam } from '@/src/utils/teamService';
import { doc, getDoc } from 'firebase/firestore';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import CustomDialog from '@/src/components/CustomDialog';
import { Ionicons } from '@expo/vector-icons';

const TEAM_COLORS = ['#00E676', '#FF6B6B', '#4FC3F7', '#FFD54F', '#CE93D8', '#FF8A65'];
const FORMATS = ['5-a-side', '7-a-side', '11-a-side'];
const EMIRATES = ['Sharjah', 'Dubai', 'Ajman'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function CreateTeamScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [format, setFormat] = useState(FORMATS[1]);
  const [emirate, setEmirate] = useState(EMIRATES[0]);
  const [skill, setSkill] = useState(SKILL_LEVELS[1]);

  const [dialog, setDialog] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [] as any[],
  });

  const showCustomAlert = (title: string, message: string, buttons?: any[]) => {
    setDialog({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK', onPress: () => setDialog(prev => ({ ...prev, visible: false })) }],
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) { showCustomAlert('Error', 'Please enter a team name'); return; }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const captainName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.name || 'Captain';
      
      await createTeam({ 
        name: name.trim(), 
        color, 
        format: format as any, 
        emirate: emirate as any, 
        skillLevel: skill as any,
        captainId: user.uid,
        captainName: captainName,
      }, user.uid);
      showCustomAlert('Success!', 'Your team has been created.', [{ text: 'OK', onPress: () => { setDialog(prev => ({ ...prev, visible: false })); router.replace('/(tabs)/my-team'); } }]);
    } catch (e) { showCustomAlert('Error', 'Could not create team'); } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView 
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ padding: Spacing.lg, paddingTop: insets.top + Spacing.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-back" size={20} color={Colors.dark.tint} />
            <Text style={{ color: Colors.dark.tint, fontWeight: 'bold' }}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Create Team</Text>
        <Text style={styles.subtitle}>Build your squad and start challenging others</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Team Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter name" placeholderTextColor="#666" />

          <Text style={styles.label}>Identity Color</Text>
          <View style={styles.colorRow}>
            {TEAM_COLORS.map(c => (
              <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: '#fff' }]} onPress={() => setColor(c)} />
            ))}
          </View>

          <Text style={styles.label}>Primary Format</Text>
          <View style={styles.optionRow}>
            {FORMATS.map(f => (
              <TouchableOpacity key={f} style={[styles.optionBtn, format === f && styles.optionBtnActive]} onPress={() => setFormat(f)}><Text style={[styles.optionText, format === f && styles.optionTextActive]}>{f}</Text></TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Emirate Base</Text>
          <View style={styles.optionRow}>
            {EMIRATES.map(e => (
              <TouchableOpacity key={e} style={[styles.optionBtn, emirate === e && styles.optionBtnActive]} onPress={() => setEmirate(e)}><Text style={[styles.optionText, emirate === e && styles.optionTextActive]}>{e}</Text></TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Squad Level</Text>
          <View style={styles.optionRow}>
            {SKILL_LEVELS.map(s => (
              <TouchableOpacity key={s} style={[styles.optionBtn, skill === s && styles.optionBtnActive]} onPress={() => setSkill(s)}><Text style={[styles.optionText, skill === s && styles.optionTextActive]}>{s}</Text></TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.createBtn, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.createBtnText}>Create Team</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CustomDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        buttons={dialog.buttons}
        onClose={() => setDialog(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, fontWeight: '900', color: '#fff' },
  subtitle: { color: '#666', fontSize: 14, marginBottom: 24, marginTop: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  label: { color: '#aaa', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  colorRow: { flexDirection: 'row', gap: 12 }, colorDot: { width: 32, height: 32, borderRadius: 16 },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  optionBtnActive: { backgroundColor: Colors.dark.tint + '20', borderColor: Colors.dark.tint },
  optionText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  optionTextActive: { color: Colors.dark.tint },
  createBtn: { backgroundColor: Colors.dark.tint, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 32, shadowColor: Colors.dark.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  createBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
