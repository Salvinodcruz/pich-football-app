import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image, Alert, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';
import { getFriends, createPickupTeam } from '@/src/utils/friendsService';

const FORMATS = ['5-a-side', '7-a-side', '11-a-side'];
const EMIRATES = ['Sharjah', 'Dubai', 'Ajman'];

export default function CreatePickupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [teamName, setTeamName] = useState('');
  const [format, setFormat] = useState('7-a-side');
  const [emirate, setEmirate] = useState('Sharjah');
  const [myProfile, setMyProfile] = useState<any>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      setMyProfile({ id: user.uid, ...userData });



      const f = await getFriends(user.uid);
      setFriends(f);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreate = async () => {
    if (!teamName.trim()) {
      Alert.alert('Missing Info', 'Please enter a team name');
      return;
    }
    if (selectedFriends.length === 0) {
      Alert.alert('Select Friends', 'Select at least one friend to play with');
      return;
    }
    setCreating(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const name = `${myProfile.firstName || ''} ${myProfile.lastName || ''}`.trim() || 'Captain';
      const teamId = await createPickupTeam(
        user.uid, name, teamName.trim(),
        selectedFriends, format, emirate
      );
      Alert.alert(
        '⚡ Pickup Team Created!',
        `${teamName} is ready!\n\nThis team auto-deletes 48hrs after creation.\nYou can convert it to permanent anytime.`,
        [{ text: 'Let\'s Go!', onPress: () => router.replace('/(tabs)/my-team') }]
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not create pickup team');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
      <ChevronBackground />
      <ActivityIndicator size="large" color={Colors.dark.tint} />
    </View>
  );

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
        <Text style={styles.pageTitle}>⚡ Create Pickup Game</Text>
        <Text style={styles.subtitle}>Temporary team with friends — auto-deletes after 48hrs</Text>

        {/* Team Name */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepTitle}>Team Name</Text>
          </View>
          <TextInput
            style={styles.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="e.g. Friday FC"
            placeholderTextColor="#555"
          />
        </View>

        {/* Format */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepTitle}>Format & Emirate</Text>
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
          <Text style={[styles.label, { marginTop: Spacing.sm }]}>Emirate</Text>
          <View style={styles.optionRow}>
            {EMIRATES.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.optionBtn, emirate === e && styles.optionBtnActive]}
                onPress={() => setEmirate(e)}
              >
                <Text style={[styles.optionText, emirate === e && styles.optionTextActive]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Select Friends */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepTitle}>Select Friends ({selectedFriends.length} selected)</Text>
          </View>
          {friends.length === 0 ? (
            <Text style={styles.noFriends}>No friends yet. Add friends first!</Text>
          ) : (
            friends.map(friend => {
              const name = `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || friend.name || 'Player';
              const selected = selectedFriends.includes(friend.id);
              return (
                <TouchableOpacity
                  key={friend.id}
                  style={[styles.friendRow, selected && styles.friendRowSelected]}
                  onPress={() => toggleFriend(friend.id)}
                >
                  {friend.photoURL ? (
                    <Image source={{ uri: friend.photoURL }} style={styles.friendAvatar} />
                  ) : (
                    <View style={[styles.friendAvatarPlaceholder, { backgroundColor: Colors.dark.tint + '40' }]}>
                      <Text style={styles.friendAvatarText}>{name[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, selected && styles.friendNameSelected]}>{name}</Text>
                    <Text style={styles.friendMeta}>{friend.position} · {friend.emirate}</Text>
                  </View>
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            ⚡ Pickup teams are temporary — they auto-delete after 48hrs.{'\n'}
            📊 Player stats (goals, assists) are kept even after deletion.{'\n'}
            🔄 You can convert to a permanent team anytime from My Team.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, creating && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={creating}
        >
          {creating
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.createBtnText}>⚡ Create Pickup Team</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff', marginBottom: 4 },
  subtitle: { color: '#666', fontSize: FontSizes.sm, marginBottom: Spacing.lg },
  stepCard: { backgroundColor: '#141414CC', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#2A2A2A' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: '#000', fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  stepTitle: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  input: { backgroundColor: '#0A0A0A', borderRadius: BorderRadius.md, padding: Spacing.md, color: '#fff', fontSize: FontSizes.md, borderWidth: 1, borderColor: '#2A2A2A' },
  label: { color: '#aaa', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  optionRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#1A1A1A' },
  optionBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  optionText: { color: '#666', fontSize: FontSizes.sm },
  optionTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: '#2A2A2A', marginBottom: 6 },
  friendRowSelected: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '10' },
  friendAvatar: { width: 36, height: 36, borderRadius: 18 },
  friendAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  friendAvatarText: { color: '#fff', fontWeight: FontWeights.bold },
  friendInfo: { flex: 1 },
  friendName: { color: '#aaa', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  friendNameSelected: { color: '#fff' },
  friendMeta: { color: '#555', fontSize: FontSizes.xs },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: Colors.dark.tint, borderColor: Colors.dark.tint },
  checkmark: { color: '#000', fontSize: 12, fontWeight: FontWeights.bold },
  noFriends: { color: '#666', fontSize: FontSizes.sm, textAlign: 'center', padding: Spacing.md },
  infoCard: { backgroundColor: '#141414CC', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#2A2A2A' },
  infoText: { color: '#666', fontSize: FontSizes.sm, lineHeight: 22 },
  createBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  createBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});