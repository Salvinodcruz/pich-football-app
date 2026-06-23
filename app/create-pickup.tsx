import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { getFriends, createPickupTeam } from '@/src/utils/friendsService';
import { Ionicons } from '@expo/vector-icons';
import { useDialog } from '@/src/context/DialogContext';

const FORMATS = ['5-a-side', '7-a-side', '11-a-side'];
const EMIRATES = ['Sharjah', 'Dubai', 'Ajman'];

export default function CreatePickupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useDialog();
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
      showAlert('Missing Info', 'Please enter a team name');
      return;
    }
    if (selectedFriends.length === 0) {
      showAlert('Select Friends', 'Select at least one friend to play with');
      return;
    }
    setCreating(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const name = `${myProfile.firstName || ''} ${myProfile.lastName || ''}`.trim() || 'Captain';
      await createPickupTeam(
        user.uid, name, teamName.trim(),
        selectedFriends, format, emirate
      );
      showAlert(
        'Pickup Team Created!',
        `${teamName} is ready!\n\nThis team auto-deletes 48hrs after creation.`,
        [{ text: 'Let\'s Go!', onPress: () => router.replace('/(tabs)/my-team') }]
      );
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Could not create pickup team');
    } finally {
      setCreating(false);
    }
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
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Ionicons name="flash" size={24} color={Colors.dark.tint} />
          <Text style={styles.pageTitle}>Create Pickup Game</Text>
        </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm }}>
            <Ionicons name="football-outline" size={14} color="#aaa" />
            <Text style={styles.label}>Format</Text>
          </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, marginBottom: Spacing.sm }}>
            <Ionicons name="location-outline" size={14} color="#aaa" />
            <Text style={styles.label}>Emirate</Text>
          </View>
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
            <View style={{ alignItems: 'center', padding: Spacing.md }}>
               <Ionicons name="people-outline" size={32} color="#333" style={{ marginBottom: 8 }} />
               <Text style={styles.noFriends}>No friends yet. Add friends first!</Text>
            </View>
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
                    {selected && <Ionicons name="checkmark" size={12} color="#000" />}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.dark.tint} />
            <Text style={styles.infoText}>
              Pickup teams are temporary — they auto-delete after 48hrs.{'\n'}
              Player stats (goals, assists) are kept even after deletion.{'\n'}
              You can convert to a permanent team anytime from My Team.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, creating && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={creating}
        >
          {creating
            ? <ActivityIndicator color="#000" />
            : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flash" size={18} color="#000" />
                <Text style={styles.createBtnText}>Create Pickup Team</Text>
              </View>
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
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff' },
  subtitle: { color: '#666', fontSize: FontSizes.sm, marginBottom: Spacing.lg },
  stepCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: '#000', fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  stepTitle: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.md, padding: Spacing.md, color: '#fff', fontSize: FontSizes.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  label: { color: '#aaa', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  optionRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  optionBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  optionText: { color: '#666', fontSize: FontSizes.sm },
  optionTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.semibold },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.01)' },
  friendRowSelected: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '10' },
  friendAvatar: { width: 36, height: 36, borderRadius: 18 },
  friendAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  friendAvatarText: { color: '#fff', fontWeight: FontWeights.bold },
  friendInfo: { flex: 1 },
  friendName: { color: '#aaa', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  friendNameSelected: { color: '#fff' },
  friendMeta: { color: '#555', fontSize: FontSizes.xs },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: Colors.dark.tint, borderColor: Colors.dark.tint },
  noFriends: { color: '#666', fontSize: FontSizes.sm, textAlign: 'center' },
  infoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoText: { color: '#666', fontSize: FontSizes.sm, lineHeight: 22, flex: 1 },
  createBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  createBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});