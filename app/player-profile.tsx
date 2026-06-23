import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, addDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { invitePlayerToTeam, startConversation } from '@/src/utils/teamService';
import { useDialog } from '@/src/context/DialogContext';

export default function PlayerProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [player, setPlayers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCaptain, setIsCaptain] = useState(false);
  const [userTeam, setUserTeam] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const targetId = id || auth.currentUser?.uid;
    if (!targetId) return;

    const unsub = onSnapshot(doc(db, 'users', targetId), (snap) => {
      if (snap.exists()) setPlayers({ id: snap.id, ...snap.data() });
      setLoading(false);
    });

    const checkCaptain = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const tid = userDoc.data()?.teamId;
      if (tid) {
        const teamDoc = await getDoc(doc(db, 'teams', tid));
        const teamData = teamDoc.data();
        if (teamData?.captainId === user.uid) {
          setIsCaptain(true);
          setUserTeam({ id: teamDoc.id, ...teamData });
        }
      }
    };
    checkCaptain();

    return unsub;
  }, [id]);

  const handleInvite = async () => {
    if (!userTeam || !player) return;
    setProcessing(true);
    try {
      await invitePlayerToTeam(userTeam.id, userTeam.name, auth.currentUser!.uid, player.id);
      showAlert('Invite Sent! ✅', `${player.firstName || 'Player'} has been invited.`);
    } catch (e) {
      showAlert('Error', 'Could not send invite');
    } finally {
      setProcessing(false);
    }
  };

  const handleMessage = () => {
    if (!player) return;
    const chatId = startConversation(auth.currentUser!.uid, player.id);
    router.push({ pathname: '/direct-chat/[id]', params: { id: player.id, name: player.firstName || player.name } });
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.dark.tint} /></View>
  );

  if (!player) return (
    <View style={styles.center}><Text style={{ color: '#666' }}>Player not found</Text></View>
  );

  const initials = player.firstName
    ? `${player.firstName[0]}${player.lastName?.[0] || ''}`
    : (player.name || 'P').substring(0, 2);

  const isGK = player.position === 'GK';

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 40,
        }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-back" size={20} color={Colors.dark.tint} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {player.photoURL ? (
              <Image source={{ uri: player.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
              </View>
            )}
            <View style={[styles.posBadge, { backgroundColor: isGK ? '#FFC107' : Colors.dark.tint }]}>
              <Text style={styles.posText}>{player.position || '?'}</Text>
            </View>
          </View>
          <Text style={styles.name}>{player.firstName} {player.lastName}</Text>
          <Text style={styles.meta}>{player.emirate} · {player.skillRating || 0} Rating</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Ionicons name="football-outline" size={20} color={Colors.dark.tint} />
            <Text style={styles.statVal}>{player.goals || 0}</Text>
            <Text style={styles.statLbl}>Goals</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="flash-outline" size={20} color={Colors.dark.tint} />
            <Text style={styles.statVal}>{player.assists || 0}</Text>
            <Text style={styles.statLbl}>Assists</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="trophy-outline" size={20} color={Colors.dark.tint} />
            <Text style={styles.statVal}>{player.wins || 0}</Text>
            <Text style={styles.statLbl}>Wins</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color={Colors.dark.tint} />
            <Text style={styles.statVal}>{player.totalCleanSheets || 0}</Text>
            <Text style={styles.statLbl}>Clean Sheets</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="calendar-outline" size={20} color={Colors.dark.tint} />
            <Text style={styles.statVal}>{player.matches || 0}</Text>
            <Text style={styles.statLbl}>Matches</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="star-outline" size={20} color={Colors.dark.tint} />
            <Text style={styles.statVal}>{player.skillRating || 0}</Text>
            <Text style={styles.statLbl}>Rating</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.msgBtn} onPress={handleMessage}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
              <Text style={styles.msgBtnText}>Message Player</Text>
            </View>
          </TouchableOpacity>

          {isCaptain && !player.teamId && (
            <TouchableOpacity 
              style={[styles.inviteBtn, processing && { opacity: 0.6 }]} 
              onPress={handleInvite}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="person-add-outline" size={20} color="#000" />
                  <Text style={styles.inviteBtnText}>Invite to Team</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  backBtn: { marginBottom: Spacing.lg },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  header: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  avatarText: { color: Colors.dark.tint, fontSize: 32, fontWeight: 'bold' },
  posBadge: { position: 'absolute', bottom: -5, right: -5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 2, borderColor: '#050505' },
  posText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  meta: { color: '#666', fontSize: 14, marginTop: 4 },
  statsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    gap: 12, 
    marginBottom: 32 
  },
  statBox: { 
    width: '30%', 
    aspectRatio: 1, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20, 
    padding: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)' 
  },
  statVal: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  statLbl: { color: '#444', fontSize: 8, textTransform: 'uppercase', marginTop: 2, textAlign: 'center' },
  actions: { gap: 12 },
  msgBtn: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.md, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  msgBtnText: { color: '#fff', fontWeight: 'bold', fontSize: FontSizes.md },
  inviteBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: 18, alignItems: 'center' },
  inviteBtnText: { color: '#000', fontWeight: 'bold', fontSize: FontSizes.md },
});
