import React, { useState, useEffect, useRef } from 'react';
import {View, Text, StyleSheet, ScrollView,TouchableOpacity, Alert, ActivityIndicator,TextInput, RefreshControl, Modal, KeyboardAvoidingView, Platform, Image} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {doc, getDoc, updateDoc, arrayRemove, collection,query, where, getDocs, addDoc, onSnapshot, orderBy,} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import type { Team } from '@/src/types';
import * as ImagePicker from 'expo-image-picker';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons } from '@expo/vector-icons';
import { startConversation } from '@/src/utils/teamService';

const TEAM_COLORS = ['#00E676', '#FF6B6B', '#4FC3F7', '#FFD54F', '#CE93D8', '#FF8A65'];
const FORMATS = ['5-a-side', '7-a-side', '11-a-side'];
const EMIRATES = ['Sharjah', 'Dubai', 'Ajman'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

function SwitchToPickupBanner({ onSwitch }: { onSwitch: () => void }) {
  const [pickupTeam, setPickupTeam] = useState<any>(null);

  useEffect(() => {
    const check = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const permTeamId = userDoc.data()?.permanentTeamId;
      if (!permTeamId) return;
      const q = await getDocs(query(collection(db, 'teams'), where('players', 'array-contains', user.uid), where('isPickup', '==', true)));
      if (!q.empty) setPickupTeam({ id: q.docs[0].id, ...q.docs[0].data() });
    };
    check();
  }, []);

  if (!pickupTeam) return null;

  return (
    <TouchableOpacity style={styles.switchBanner} onPress={async () => {
        const user = auth.currentUser; if (!user) return;
        await updateDoc(doc(db, 'users', user.uid), { teamId: pickupTeam.id });
        onSwitch(); Alert.alert('Switched!', `Now viewing ${pickupTeam.name}`);
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="flash" size={14} color="#4FC3F7" />
        <Text style={styles.switchBannerText}>Pickup: {pickupTeam.name}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={styles.switchBannerAction}>Switch</Text>
        <Ionicons name="arrow-forward" size={12} color="#4FC3F7" />
      </View>
    </TouchableOpacity>
  );
}

export default function MyTeamScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [isCaptain, setIsCaptain] = useState(false);
  const [myName, setMyName] = useState('');
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  // Add player
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // Edit team modal
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editFormats, setEditFormats] = useState<string[]>([]);
  const [editEmirate, setEditEmirate] = useState('');
  const [editSkill, setEditSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      setMyName(`${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Player');
      const teamId = userData?.teamId;
      if (!teamId) { setLoading(false); return; }

      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (!teamDoc.exists()) { setLoading(false); return; }

      const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
      setTeam(teamData);
      const isCap = teamData.captainId === user.uid;
      setIsCaptain(isCap);

      if (isCap) {
        const { getPendingJoinRequests } = await import('@/src/utils/teamService');
        const reqs = await getPendingJoinRequests(teamId);
        setJoinRequests(reqs);
      }

      if (!(teamData as any).teamCode) {
        const newCode = 'PCT-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        await updateDoc(doc(db, 'teams', teamId), { teamCode: newCode });
        (teamData as any).teamCode = newCode;
      }

      setEditName(teamData.name);
      setEditColor((teamData as any).color || '#00E676');
      setEditFormats((teamData as any).formats || (teamData.format ? [teamData.format] : ['7-a-side']));
      setEditEmirate(teamData.emirate);
      setEditSkill(teamData.skillLevel);

      const playerProfiles: any[] = [];
      for (const pid of teamData.players || []) {
        const pDoc = await getDoc(doc(db, 'users', pid));
        if (pDoc.exists()) playerProfiles.push({ id: pDoc.id, ...pDoc.data() });
      }
      setPlayers(playerProfiles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRespondJoin = async (requestId: string, approve: boolean) => {
    try {
      const { respondToJoinRequest } = await import('@/src/utils/teamService');
      await respondToJoinRequest(requestId, approve);
      if (approve) Alert.alert('Success! ✅', 'Player has been added to your team.');
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      load();
    } catch (e) { Alert.alert('Error responding to request'); }
  };

  const handleLogoUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true });
      if (result.canceled || !result.assets[0].base64) return;
      setUploadingLogo(true);
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await updateDoc(doc(db, 'teams', team!.id), { logoURL: base64Image });
      await load();
    } catch (e) { Alert.alert('Error', 'Could not upload logo'); } finally { setUploadingLogo(false); }
  };

  const handleSaveTeam = async () => {
    if (!editName.trim() || !team) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'teams', team.id), { name: editName.trim(), color: editColor, formats: editFormats, format: editFormats[0], emirate: editEmirate, skillLevel: editSkill });
      setShowEditTeam(false); load();
    } catch (e) { Alert.alert('Error', 'Save failed'); } finally { setSaving(false); }
  };

  const searchPlayer = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    try {
      const q = query(collection(db, 'users'), where('playerId', '==', searchId.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) Alert.alert('Not Found');
      else setSearchResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch (e) { Alert.alert('Error', 'Search failed'); } finally { setSearching(false); }
  };

  const addPlayer = async () => {
    if (!searchResult || !team) return;
    try {
      await updateDoc(doc(db, 'teams', team.id), { players: [...(team.players || []), searchResult.id] });
      await updateDoc(doc(db, 'users', searchResult.id), { teamId: team.id, isFreeAgent: false });
      setShowAddPlayer(false); load();
    } catch (e) { Alert.alert('Error', 'Could not add player'); }
  };

  const removePlayer = async (playerId: string, playerName: string) => {
    if (!team) return;
    Alert.alert('Remove Player', `Remove ${playerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const { doc, updateDoc, arrayRemove } = await import('firebase/firestore');
          await updateDoc(doc(db, 'teams', team.id), { players: arrayRemove(playerId) });
          await updateDoc(doc(db, 'users', playerId), { teamId: null, isFreeAgent: true });
          load();
        } catch (e) { Alert.alert('Error'); }
      }}
    ]);
  };

  const transferCaptaincy = async (newCaptainId: string, newCaptainName: string) => {
    if (!team) return;
    Alert.alert('Transfer Captaincy', `Make ${newCaptainName} captain?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Transfer', onPress: async () => {
        try {
          await updateDoc(doc(db, 'teams', team.id), { captainId: newCaptainId, captainName: newCaptainName });
          load();
        } catch (e) { Alert.alert('Error'); }
      }}
    ]);
  };

  const changePlayerPosition = async (playerId: string, newPosition: string) => {
    try { await updateDoc(doc(db, 'users', playerId), { teamPosition: newPosition }); load(); }
    catch (e) { Alert.alert('Error'); }
  };

  const getPositionColor = (pos: string) => {
    if (pos === 'GK') return '#FFC107'; if (pos === 'DEF') return '#4FC3F7';
    if (pos === 'MID') return Colors.dark.tint; if (pos === 'FWD') return '#FF6B6B';
    return Colors.dark.textSecondary;
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.dark.tint} /></View>
  );

  if (!team) return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: Spacing.lg, paddingTop: insets.top + Spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>My Team</Text>
        <Text style={styles.noTeamSubtitle}>You are not part of a team yet</Text>
        <View style={styles.options}>
          <View style={styles.optionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="football" size={24} color={Colors.dark.tint} />
              <Text style={styles.optionTitle}>Create a Team</Text>
            </View>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/create-team')}>
              <Text style={styles.ctaBtnText}>Create Team</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.optionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="search" size={24} color={Colors.dark.tint} />
              <Text style={styles.optionTitle}>Find a Team</Text>
            </View>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(tabs)/find')}>
              <Text style={styles.ctaBtnText}>Browse Teams</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const topScorer = players.reduce((top, p) => (p.goals || 0) > (top?.goals || 0) ? p : top, null);
  const totalGames = (team.wins || 0) + (team.draws || 0) + (team.losses || 0);
  const myUid = auth.currentUser?.uid;

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView 
        ref={scrollRef} 
        style={[styles.container, { backgroundColor: 'transparent' }]} 
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 80 }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.dark.tint} />}
      >
        <View style={styles.headerGlass}>
          <TouchableOpacity style={[styles.teamBadge, { backgroundColor: (team as any).color || Colors.dark.tint }]} onPress={isCaptain ? handleLogoUpload : undefined} disabled={uploadingLogo}>
            {uploadingLogo ? <ActivityIndicator color="#000" size="small" /> : (team as any).logoURL ? <Image source={{ uri: (team as any).logoURL }} style={styles.teamLogoImg} /> : <Text style={styles.teamBadgeText}>{team.name.substring(0, 2).toUpperCase()}</Text>}
            {isCaptain && !(team as any).logoURL && (
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={12} color="#000" />
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.teamName}>{team.name}</Text>
            <Text style={styles.teamMeta}>{team.emirate} · {team.format}</Text>
            {(team as any).teamCode && (
              <View style={styles.teamCodeBadge}>
                <Text style={styles.teamCodeText}>{(team as any).teamCode}</Text>
              </View>
            )}
          </View>
          {isCaptain && (
            <TouchableOpacity style={styles.captainTag} onPress={() => setShowEditTeam(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="settings-outline" size={14} color={Colors.dark.tint} />
                <Text style={styles.captainTagText}>Edit</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {!(team as any).isPickup && <SwitchToPickupBanner onSwitch={load} />}

        {/* Join Requests */}
        {isCaptain && joinRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Join Requests ({joinRequests.length})</Text>
            <View style={styles.glassContainer}>
              {joinRequests.map((req, i) => (
                <View key={req.id} style={[styles.playerRowGlass, i === joinRequests.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerName}>{req.userName}</Text>
                    <Text style={styles.playerIdText}>Wants to join</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity 
                      style={styles.msgBtnSmall} 
                      onPress={() => {
                        const chatId = startConversation(auth.currentUser!.uid, req.userId);
                        router.push({ pathname: '/direct-chat/[id]', params: { id: req.userId, name: req.userName } });
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleRespondJoin(req.id, true)}>
                      <Ionicons name="checkmark" size={16} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.denyBtn} onPress={() => handleRespondJoin(req.id, false)}>
                      <Ionicons name="close" size={16} color="#FF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.statsGridGlass}>
          <View style={styles.statBoxGlass}><Text style={styles.statValue}>{totalGames}</Text><Text style={styles.statLabel}>Played</Text></View>
          <View style={styles.statBoxGlass}><Text style={[styles.statValue, { color: Colors.dark.tint }]}>{team.wins || 0}</Text><Text style={styles.statLabel}>Won</Text></View>
          <View style={styles.statBoxGlass}><Text style={[styles.statValue, { color: '#FFC107' }]}>{team.draws || 0}</Text><Text style={styles.statLabel}>Draw</Text></View>
          <View style={styles.statBoxGlass}><Text style={[styles.statValue, { color: '#FF4444' }]}>{team.losses || 0}</Text><Text style={styles.statLabel}>Lost</Text></View>
        </View>

        <View style={styles.ratingRowGlass}>
          <View style={styles.ratingBoxGlass}>
            <Text style={styles.ratingLabel}>Rating</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Ionicons name="star" size={12} color="#FFC107" />
              <Text style={styles.ratingValue}>{team.skillRating ?? 0}</Text>
            </View>
          </View>
          <View style={styles.ratingBoxGlass}>
            <Text style={styles.ratingLabel}>Trust Score</Text>
            <Text style={[styles.ratingValue, { color: (team.trustScore || 0) >= 70 ? Colors.dark.tint : '#FFC107' }]}>{team.trustScore ?? 100}%</Text>
          </View>
          {topScorer && (
            <View style={styles.ratingBoxGlass}>
              <Text style={styles.ratingLabel}>Top Scorer</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="football" size={12} color="#FFF" />
                <Text style={styles.ratingValue} numberOfLines={1}>{topScorer.firstName || topScorer.name?.split(' ')[0]}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actionBtns}>
          {isCaptain && (
            <TouchableOpacity style={styles.actionBtnGlass} onPress={() => router.push('/challenges')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flash" size={14} color="#000" />
                <Text style={styles.actionBtnTextGlass}>Challenges</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionBtnGlass, styles.chatActionBtnGlass]} 
            onPress={() => router.push({ pathname: '/chat-team/[id]', params: { id: team!.id, teamName: team!.name } })}
          >
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="chatbubbles-outline" size={14} color="#FFF" />
                <Text style={styles.chatActionBtnTextGlass}>Team Chat</Text>
              </View>
          </TouchableOpacity>
          {isCaptain && (
            <TouchableOpacity style={[styles.actionBtnGlass, styles.addPlayerBtnGlass]} onPress={() => setShowAddPlayer(!showAddPlayer)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={showAddPlayer ? "close" : "person-add-outline"} size={14} color={Colors.dark.tint} />
                <Text style={[styles.actionBtnTextGlass, { color: Colors.dark.tint }]}>{showAddPlayer ? 'Cancel' : 'Player'}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {showAddPlayer && isCaptain && (
          <View style={styles.addPlayerSectionGlass}>
            <Text style={styles.sectionTitle}>Add Player</Text>
            <View style={styles.searchRow}>
              <TextInput style={styles.searchInput} value={searchId} onChangeText={setSearchId} placeholder="Player ID" placeholderTextColor="#666" autoCapitalize="characters" />
              <TouchableOpacity style={styles.searchBtn} onPress={searchPlayer}>
                {searching ? <ActivityIndicator color="#000" size="small" /> : <Ionicons name="search" size={20} color="#000" />}
              </TouchableOpacity>
            </View>
            {searchResult && (
              <View style={styles.searchResultCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{searchResult.firstName} {searchResult.lastName}</Text>
                  <Text style={{ color: '#666', fontSize: 10 }}>{searchResult.playerId}</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={addPlayer}>
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Squad ({players.length})</Text>
          <View style={styles.glassContainer}>
            {players.map((player, i) => (
              <View key={player.id} style={[styles.playerRowGlass, i === players.length - 1 && { borderBottomWidth: 0 }]}>
                {player.photoURL ? <Image source={{ uri: player.photoURL }} style={styles.playerAvatarImg} /> : <View style={styles.playerAvatar}><Text style={styles.playerAvatarText}>{(player.firstName || 'P')[0]}</Text></View>}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.playerName}>{player.firstName ? `${player.firstName} ${player.lastName}` : player.name}</Text>
                    {player.id === team.captainId && <Ionicons name="ribbon" size={12} color={Colors.dark.tint} />}
                  </View>
                  <Text style={styles.playerIdText}>{player.playerId}</Text>
                </View>
                <View style={[styles.posBadge, { borderColor: getPositionColor(player.teamPosition || player.position) }]}><Text style={[styles.posText, { color: getPositionColor(player.teamPosition || player.position) }]}>{player.teamPosition || player.position || '?'}</Text></View>
                <View style={{ gap: 2, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="football-outline" size={10} color="#666" />
                    <Text style={styles.playerStatText}>{player.goals || 0}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="flash-outline" size={10} color="#666" />
                    <Text style={styles.playerStatText}>{player.assists || 0}</Text>
                  </View>
                </View>
                {isCaptain && player.id !== team.captainId && (
                  <TouchableOpacity style={{ padding: 4 }} onPress={() => Alert.alert(player.firstName, 'Action', [
                    { text: '👑 Captain', onPress: () => transferCaptaincy(player.id, player.firstName) },
                    { text: '📍 Position', onPress: () => Alert.alert('Position', 'Select', [
                      { text: 'GK', onPress: () => changePlayerPosition(player.id, 'GK') },
                      { text: 'DEF', onPress: () => changePlayerPosition(player.id, 'DEF') },
                      { text: 'MID', onPress: () => changePlayerPosition(player.id, 'MID') },
                      { text: 'FWD', onPress: () => changePlayerPosition(player.id, 'FWD') },
                      { text: 'Cancel', style: 'cancel' }
                    ])},
                    { text: '🗑 Remove', style: 'destructive', onPress: () => removePlayer(player.id, player.firstName) },
                    { text: 'Cancel', style: 'cancel' }
                  ])}>
                    <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showEditTeam} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditTeam(false)}>
        <View style={styles.modalWrapper}>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Team</Text>
              <TouchableOpacity onPress={() => setShowEditTeam(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Team Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholderTextColor="#666" />
            
            <Text style={styles.inputLabel}>Identity Color</Text>
            <View style={styles.colorRow}>
              {TEAM_COLORS.map(c => (
                <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, editColor === c && { borderWidth: 3, borderColor: '#fff' }]} onPress={() => setEditColor(c)} />
              ))}
            </View>

            <Text style={styles.inputLabel}>Emirate Base</Text>
            <View style={styles.optionRow}>
              {EMIRATES.map(e => (
                <TouchableOpacity key={e} style={[styles.optionBtn, editEmirate === e && styles.optionBtnActive]} onPress={() => setEditEmirate(e)}>
                  <Text style={[styles.optionText, editEmirate === e && styles.optionTextActive]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTeam} disabled={saving}>
              {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: Spacing.lg }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 }, noTeamSubtitle: { color: '#666', fontSize: 16, marginBottom: 24 },
  options: { gap: 16 }, optionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 16 },
  optionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' }, ctaBtn: { backgroundColor: Colors.dark.tint, borderRadius: 8, padding: 12, alignItems: 'center' }, ctaBtnText: { fontWeight: 'bold', color: '#000' },
  headerGlass: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  teamBadge: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', position: 'relative' }, teamBadgeText: { fontWeight: 'bold', fontSize: 20, color: '#000' },
  cameraIcon: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFF', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: '#000' },
  teamName: { color: '#fff', fontSize: 20, fontWeight: 'bold' }, teamMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  teamCodeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,230,118,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)' }, teamCodeText: { color: Colors.dark.tint, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  captainTag: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }, captainTagText: { color: Colors.dark.tint, fontSize: 12, fontWeight: 'bold' },
  statsGridGlass: { flexDirection: 'row', gap: 8, marginBottom: 8 }, statBoxGlass: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' }, statLabel: { color: '#666', fontSize: 10, marginTop: 2 },
  ratingRowGlass: { flexDirection: 'row', gap: 8, marginBottom: 20 }, ratingBoxGlass: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  ratingLabel: { color: '#666', fontSize: 10 }, ratingValue: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  actionBtns: { flexDirection: 'row', gap: 8, marginBottom: 24 }, actionBtnGlass: { flex: 1, backgroundColor: Colors.dark.tint, borderRadius: 12, padding: 12, alignItems: 'center', minWidth: '30%' },
  actionBtnTextGlass: { fontWeight: 'bold', fontSize: 12, color: '#000' }, chatActionBtnGlass: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  addPlayerBtnGlass: { backgroundColor: 'rgba(0,230,118,0.1)', borderWidth: 1, borderColor: Colors.dark.tint },
  section: { marginBottom: 24 }, sectionTitle: { color: '#aaa', fontSize: 12, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  glassContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  playerRowGlass: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  playerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  playerAvatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  playerName: { color: '#fff', fontSize: 14, fontWeight: 'bold' }, playerIdText: { color: '#666', fontSize: 10 },
  posBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 }, posText: { fontSize: 10, fontWeight: 'bold' },
  playerStatText: { color: '#666', fontSize: 10 }, playerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  teamLogoImg: { width: 56, height: 56, borderRadius: 28 },
  chatActionBtnTextGlass: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  msgText: { color: Colors.dark.textSecondary, fontSize: 14 },
  switchBanner: { backgroundColor: 'rgba(79,195,247,0.1)', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(79,195,247,0.3)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchBannerText: { color: '#4FC3F7', fontSize: 12, fontWeight: 'bold' }, switchBannerAction: { color: '#4FC3F7', fontSize: 12, fontWeight: 'bold' },
  requestActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  msgBtnSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  approveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  denyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#FF4444', justifyContent: 'center', alignItems: 'center' },
  modalWrapper: { flex: 1, backgroundColor: '#050505' }, modalContent: { padding: 20 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' }, modalClose: { color: '#666' },
  inputLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16 }, input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  saveBtn: { backgroundColor: Colors.dark.tint, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 32 }, saveBtnText: { fontWeight: 'bold', color: '#000' },
  chatHeader: { backgroundColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 8 }, myBubble: { alignSelf: 'flex-end', backgroundColor: Colors.dark.tint }, theirBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }, chatInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12, color: '#fff', maxHeight: 100 },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 8 }, colorDot: { width: 32, height: 32, borderRadius: 16 },
  addPlayerSectionGlass: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)' },
  searchRow: { flexDirection: 'row', gap: 12 }, searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, color: '#fff' },
  searchBtn: { backgroundColor: Colors.dark.tint, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  searchResultCard: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, gap: 12 }, addBtn: { backgroundColor: Colors.dark.tint, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 }, addBtnText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  optionBtnActive: { backgroundColor: Colors.dark.tint + '20', borderColor: Colors.dark.tint },
  optionText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  optionTextActive: { color: Colors.dark.tint },
});
