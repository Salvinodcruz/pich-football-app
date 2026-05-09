import React, { useState, useEffect, useRef } from 'react';
import {View, Text, StyleSheet, ScrollView,TouchableOpacity, Alert, ActivityIndicator,TextInput, RefreshControl, Modal, KeyboardAvoidingView, Platform, Image} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {doc, getDoc, updateDoc, arrayRemove, collection,query, where, getDocs, addDoc, onSnapshot, orderBy,} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import type { Team } from '@/src/types';
import * as ImagePicker from 'expo-image-picker';
import ChevronBackground from '@/src/components/ChevronBackground';


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
      // Check if user has a pickup team saved
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      // Find any pickup team where user is a player
      const q = await getDocs(
        query(collection(db, 'teams'),
          where('players', 'array-contains', user.uid),
          where('isPickup', '==', true))
      );
      if (!q.empty) setPickupTeam({ id: q.docs[0].id, ...q.docs[0].data() });
    };
    check();
  }, []);

  if (!pickupTeam) return null;

  return (
    <TouchableOpacity
      style={{
        backgroundColor: '#4FC3F720', borderRadius: 8, padding: 10,
        marginBottom: 12, borderWidth: 1, borderColor: '#4FC3F7',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
      }}
      onPress={async () => {
        const user = auth.currentUser;
        if (!user) return;
        await updateDoc(doc(db, 'users', user.uid), { teamId: pickupTeam.id });
        onSwitch();
        Alert.alert('✅ Switched!', `Now viewing ${pickupTeam.name}`);
      }}
    >
      <Text style={{ color: '#4FC3F7', fontSize: 12 }}>⚡ You have a pickup team: {pickupTeam.name}</Text>
      <Text style={{ color: '#4FC3F7', fontSize: 12, fontWeight: '700' }}>Switch →</Text>
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

  // Add player
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // Edit team modal
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editFormat, setEditFormat] = useState('');
  const [editFormats, setEditFormats] = useState<string[]>([]);  const [editEmirate, setEditEmirate] = useState('');
  const [editSkill, setEditSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Team chat
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

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
      setIsCaptain(teamData.captainId === user.uid);

      // Auto-generate teamCode if missing
      if (!(teamData as any).teamCode) {
        const newCode = 'PCT-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        await updateDoc(doc(db, 'teams', teamId), { teamCode: newCode });
        (teamData as any).teamCode = newCode;
      }

      

      // Set edit defaults
      setEditName(teamData.name);
      setEditColor((teamData as any).color || '#00E676');
      setEditFormat(teamData.format);
      setEditFormats((teamData as any).formats || (teamData.format ? [teamData.format] : ['7-a-side']));
      setEditEmirate(teamData.emirate);
      setEditSkill(teamData.skillLevel);

      const playerProfiles: any[] = [];
      for (const pid of teamData.players || []) {
        const pDoc = await getDoc(doc(db, 'users', pid));
        if (pDoc.exists()) {
          console.log('Player data:', JSON.stringify(pDoc.data()));
          playerProfiles.push({ id: pDoc.id, ...pDoc.data() });
        }
      }
      setPlayers(playerProfiles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Team chat listener
  useEffect(() => {
    if (!team?.id || !showChat) return;
    const q = query(
      collection(db, 'teamChats', team.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [team?.id, showChat]);

  const sendMessage = async () => {
    if (!chatText.trim() || !team || sendingMsg) return;
    setSendingMsg(true);
    try {
      await addDoc(collection(db, 'teamChats', team.id, 'messages'), {
        text: chatText.trim(),
        senderId: auth.currentUser?.uid,
        senderName: myName,
        createdAt: new Date().toISOString(),
      });
      setChatText('');
    } catch (e) {
      Alert.alert('Error', 'Could not send message');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleLogoUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });
      if (result.canceled || !result.assets[0].base64) return;
      setUploadingLogo(true);
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await updateDoc(doc(db, 'teams', team!.id), { logoURL: base64Image });
      await load();
      Alert.alert('✅ Logo Updated!', 'Team logo has been updated');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };


  const handleSaveTeam = async () => {
    if (!editName.trim() || !team) return;
    if (editFormats.length === 0) {
      Alert.alert('Select Format', 'Please select at least one format');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'teams', team.id), {
        name: editName.trim(),
        color: editColor,
        formats: editFormats,
        format: editFormats[0],
        emirate: editEmirate,
        skillLevel: editSkill,
      });
      setShowEditTeam(false);
      load();
      Alert.alert('Saved! ✅', 'Team details updated');
    } catch (e) {
      Alert.alert('Error', 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const searchPlayer = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const q = query(collection(db, 'users'), where('playerId', '==', searchId.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        Alert.alert('Not Found', 'No player found with that ID');
      } else {
        setSearchResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e) {
      Alert.alert('Error', 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const addPlayer = async () => {
    if (!searchResult || !team) return;
    if (team.players?.includes(searchResult.id)) {
      Alert.alert('Already in Team', 'This player is already in your team');
      return;
    }
    try {
      await updateDoc(doc(db, 'teams', team.id), {
        players: [...(team.players || []), searchResult.id],
      });
      await updateDoc(doc(db, 'users', searchResult.id), { teamId: team.id });
      Alert.alert('Player Added! ✅', `${searchResult.firstName || searchResult.name} added`);
      setSearchResult(null);
      setSearchId('');
      setShowAddPlayer(false);
      load();
    } catch (e) {
      Alert.alert('Error', 'Could not add player');
    }
  };

  const removePlayer = async (playerId: string, playerName: string) => {
    if (!team) return;
    if (playerId === team.captainId) {
      Alert.alert('Cannot Remove', 'Transfer captaincy first.');
      return;
    }
    Alert.alert('Remove Player', `Remove ${playerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await updateDoc(doc(db, 'teams', team.id), { players: arrayRemove(playerId) });
            await updateDoc(doc(db, 'users', playerId), { teamId: null });
            load();
          } catch (e) {
            Alert.alert('Error', 'Could not remove player');
          }
        }
      }
    ]);
  };

  const transferCaptaincy = async (newCaptainId: string, newCaptainName: string) => {
    if (!team) return;
    Alert.alert('Transfer Captaincy', `Make ${newCaptainName} the captain?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Transfer', onPress: async () => {
          try {
            await updateDoc(doc(db, 'teams', team.id), {
              captainId: newCaptainId,
              captainName: newCaptainName,
            });
            Alert.alert('Done! 👑', `${newCaptainName} is now captain`);
            load();
          } catch (e) {
            Alert.alert('Error', 'Could not transfer captaincy');
          }
        }
      }
    ]);
  };

  const changePlayerPosition = async (playerId: string, newPosition: string) => {
    try {
      await updateDoc(doc(db, 'users', playerId), {
        teamPosition: newPosition,
      });
      Alert.alert('Updated! ✅', `Position changed to ${newPosition}`);
      load();
    } catch (e) {
      Alert.alert('Error', 'Could not change position');
    }
  };

  const getPositionColor = (pos: string) => {
    if (pos === 'GK') return '#FFC107';
    if (pos === 'DEF') return '#4FC3F7';
    if (pos === 'MID') return Colors.dark.tint;
    if (pos === 'FWD') return '#FF6B6B';
    return Colors.dark.textSecondary;
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.dark.tint} />
    </View>
  );

  if (!team) return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ChevronBackground />
      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 80,
        }]}
      >
      <Text style={styles.pageTitle}>My Team</Text>
      <Text style={styles.noTeamSubtitle}>You are not part of a team yet</Text>
      <View style={styles.options}>
        <View style={styles.optionCard}>
          <Text style={styles.optionTitle}>⚽ Create a Team</Text>
          <Text style={styles.optionText}>Start your own team and become captain</Text>
          <TouchableOpacity style={styles.optionBtn} onPress={() => router.push('/create-team')}>
            <Text style={styles.optionBtnText}>Create Team</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.optionCard}>
          <Text style={styles.optionTitle}>🔍 Find a Team</Text>
          <Text style={styles.optionText}>Browse teams looking for players</Text>
          <TouchableOpacity style={styles.optionBtn} onPress={() => router.push('/(tabs)/find')}>
            <Text style={styles.optionBtnText}>Browse Teams</Text>
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
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ChevronBackground />
      <ScrollView ref={scrollRef} style={styles.container}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 80,
        }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.dark.tint} />
        }
      >
        {/* Team Header */}
        <View style={styles.teamHeader}>
          <TouchableOpacity
            style={[styles.teamBadge, { backgroundColor: (team as any).color || Colors.dark.tint }]}
            onPress={isCaptain ? handleLogoUpload : undefined}
            disabled={uploadingLogo}
          >
            {uploadingLogo ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (team as any).logoURL ? (
              <Image source={{ uri: (team as any).logoURL }} style={styles.teamLogoImg} />
            ) : (
              <Text style={styles.teamBadgeText}>{team.name.substring(0, 2).toUpperCase()}</Text>
            )}
            {isCaptain && !(team as any).logoURL && (
              <View style={styles.logoEditHint}>
                <Text style={styles.logoEditHintText}>📷</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.teamName}>{team.name}</Text>
            <Text style={styles.teamMeta}>{team.emirate} · {team.format} · {team.skillLevel}</Text>
            {(team as any).teamCode && (
              <Text style={styles.teamCode}>{(team as any).teamCode}</Text>
            )}
          </View>
          {isCaptain && (
            <TouchableOpacity style={styles.captainTag} onPress={() => setShowEditTeam(true)}>
              <Text style={styles.captainTagText}>👑 Edit Team</Text>
            </TouchableOpacity>
          )}
          {!isCaptain && (
            <View style={styles.memberTag}>
              <Text style={styles.memberTagText}>⚽ Player</Text>
            </View>
          )}
        </View>

        {/* Convert pickup to permanent — only for pickup teams */}
        {isCaptain && (team as any).isPickup && (
          <TouchableOpacity
            style={styles.convertPickupBtn}
            onPress={() => {
              Alert.alert(
                '🔄 Convert to Permanent Team?',
                'This will make the team permanent and it won\'t auto-delete.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Convert', onPress: async () => {
                      const { convertPickupToPermanent } = await import('@/src/utils/friendsService');
                      await convertPickupToPermanent(team.id);
                      load();
                      Alert.alert('✅ Done!', 'Team is now permanent!');
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.convertPickupBtnText}>🔄 Convert to Permanent</Text>
          </TouchableOpacity>
        )}

        {/* Pickup team warning */}
        {(team as any).isPickup && (
          <View style={styles.pickupWarning}>
            <Text style={styles.pickupWarningText}>
              ⚡ Pickup Team — auto-deletes 48hrs after creation
            </Text>
            <View style={styles.pickupBtnRow}>
              {/* Switch back to permanent team */}
              <TouchableOpacity
                style={styles.switchTeamBtn}
                onPress={async () => {
                  const user = auth.currentUser;
                  if (!user) return;
                  const userDoc = await getDoc(doc(db, 'users', user.uid));
                  const permTeamId = userDoc.data()?.permanentTeamId;
                  if (!permTeamId) {
                    Alert.alert('No permanent team', 'You have no permanent team to switch back to.');
                    return;
                  }
                  await updateDoc(doc(db, 'users', user.uid), { teamId: permTeamId });
                  load();
                  Alert.alert('✅ Switched!', 'Back to your permanent team.');
                }}
              >
                <Text style={styles.switchTeamBtnText}>↩ Switch to Main Team</Text>
              </TouchableOpacity>

              {/* Delete pickup team */}
              {isCaptain && (
                <TouchableOpacity
                  style={styles.deletePickupBtn}
                  onPress={() => {
                    Alert.alert(
                      'Delete Pickup Team',
                      'This will delete the pickup team. Player stats are kept.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete', style: 'destructive',
                          onPress: async () => {
                            try {
                              const { deletePickupTeam } = await import('@/src/utils/friendsService');
                              await deletePickupTeam(team.id);
                              load();
                              Alert.alert('✅ Deleted', 'Pickup team deleted. Stats kept.');
                            } catch (e) {
                              Alert.alert('Error', 'Could not delete team');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.deletePickupBtnText}>🗑 Delete Pickup</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Switch to pickup team if on permanent team and has a pickup */}
        {!(team as any).isPickup && (
          <SwitchToPickupBanner onSwitch={load} />
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalGames}</Text>
            <Text style={styles.statLabel}>Played</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.dark.tint }]}>{team.wins || 0}</Text>
            <Text style={styles.statLabel}>Won</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#FFC107' }]}>{team.draws || 0}</Text>
            <Text style={styles.statLabel}>Draw</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#FF4444' }]}>{team.losses || 0}</Text>
            <Text style={styles.statLabel}>Lost</Text>
          </View>
        </View>

        {/* Rating & Trust Row */}
        <View style={styles.ratingRow}>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingLabel}>Rating</Text>
            <Text style={styles.ratingValue}>⭐ {team.skillRating ?? 0}</Text>
          </View>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingLabel}>Trust Score</Text>
            <Text style={[styles.ratingValue, {
              color: (team.trustScore || 0) >= 70 ? Colors.dark.tint : (team.trustScore || 0) >= 30 ? '#FFC107' : '#FF4444'
            }]}>
              {team.trustScore ?? 100} / 100
            </Text>
          </View>
          {topScorer && (
            <View style={styles.ratingBox}>
              <Text style={styles.ratingLabel}>Top Scorer</Text>
              <Text style={styles.ratingValue} numberOfLines={1}>
                ⚽ {topScorer.firstName || topScorer.name?.split(' ')[0]} ({topScorer.goals || 0})
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionBtns}>
          {isCaptain && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/challenges')}
            >
              <Text style={styles.actionBtnText}>⚡ Challenges</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.chatActionBtn]}
            onPress={() => setShowChat(true)}
          >
            <Text style={styles.chatActionBtnText}>💬 Team Chat</Text>
          </TouchableOpacity>
          {isCaptain && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.addPlayerBtn]}
              onPress={() => setShowAddPlayer(!showAddPlayer)}
            >
              <Text style={[styles.actionBtnText, { color: Colors.dark.tint }]}>
                {showAddPlayer ? '✕ Cancel' : '+ Add Player'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Add Player Search */}
        {showAddPlayer && isCaptain && (
          <View style={styles.addPlayerSection}>
            <Text style={styles.sectionTitle}>Add Player by ID</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={searchId}
                onChangeText={setSearchId}
                placeholder="Enter Player ID (e.g. PCH-A3X9K)"
                placeholderTextColor={Colors.dark.textSecondary}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={searchPlayer}>
                {searching
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.searchBtnText}>Search</Text>
                }
              </TouchableOpacity>
            </View>
            {searchResult && (
              <View style={styles.searchResultCard}>
                <View style={styles.searchResultInfo}>
                  <View style={styles.searchResultAvatar}>
                    <Text style={styles.searchResultAvatarText}>
                      {(searchResult.firstName || 'P').substring(0, 1)}
                      {(searchResult.lastName || '').substring(0, 1)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.searchResultName}>{searchResult.firstName} {searchResult.lastName}</Text>
                    <Text style={styles.searchResultMeta}>{searchResult.position} · {searchResult.emirate}</Text>
                    <Text style={styles.searchResultId}>{searchResult.playerId}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={addPlayer}>
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Squad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Squad — {players.length} player{players.length !== 1 ? 's' : ''}</Text>
          {players.length === 0 ? (
            <Text style={styles.emptyText}>No players yet. Add players using their Player ID.</Text>
          ) : (
            players.map((player, i) => (
              <View key={player.id} style={styles.playerRow}>
                <Text style={styles.playerNumber}>{i + 1}</Text>
                {player.photoURL ? (
                  <Image source={{ uri: player.photoURL }} style={styles.playerAvatarImg} />
                ) : (
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerAvatarText}>
                      {(player.firstName || player.name || 'P').substring(0, 1)}
                      {(player.lastName || '').substring(0, 1)}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.playerNameRow}>
                    <Text style={styles.playerName} numberOfLines={1}>
                      {player.firstName ? `${player.firstName} ${player.lastName}` : player.name || 'Unknown'}
                    </Text>
                    {player.id === team.captainId && (
                      <View style={styles.captainBadge}>
                        <Text style={styles.captainBadgeText}>C</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerIdText}>{player.playerId}</Text>
                </View>
                <View style={[styles.posBadge, { borderColor: getPositionColor(player.teamPosition || player.position) }]}>
                  <Text style={[styles.posText, { color: getPositionColor(player.teamPosition || player.position) }]}>
                    {player.teamPosition || player.position || '?'}
                  </Text>
                </View>

                <View style={styles.playerStats}>
                  <Text style={styles.playerStatText}>⚽ {player.goals || 0}</Text>
                  <Text style={styles.playerStatText}>🎯 {player.assists || 0}</Text>
                </View>
                {isCaptain && player.id !== team.captainId && (
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => Alert.alert(
                      player.firstName || player.name,
                      'What do you want to do?',
                      [
                        { text: '👑 Make Captain', onPress: () => transferCaptaincy(player.id, `${player.firstName || ''} ${player.lastName || player.name || ''}`.trim()) },
                        {
                          text: '📍 Change Position',
                          onPress: () => Alert.alert(
                            'Change Position',
                            `Current: ${player.teamPosition || player.position || 'None'}`,
                            [
                              { text: 'GK', onPress: () => changePlayerPosition(player.id, 'GK') },
                              { text: 'DEF', onPress: () => changePlayerPosition(player.id, 'DEF') },
                              { text: 'MID', onPress: () => changePlayerPosition(player.id, 'MID') },
                              { text: 'FWD', onPress: () => changePlayerPosition(player.id, 'FWD') },
                              { text: 'Cancel', style: 'cancel' },
                            ]
                          )
                        },
                        { text: '🗑 Remove from Team', style: 'destructive', onPress: () => removePlayer(player.id, `${player.firstName || player.name}`) },
                        { text: 'Cancel', style: 'cancel' }
                      ]
                    )}
                  >
                    <Text style={styles.moreBtnText}>•••</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Team Modal */}
      <Modal visible={showEditTeam} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditTeam(false)}>
        <View style={styles.modalWrapper}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Team</Text>
              <TouchableOpacity onPress={() => setShowEditTeam(false)}>
                <Text style={styles.modalClose}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Team Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Team name"
              placeholderTextColor={Colors.dark.textSecondary}
              autoCapitalize="words"
            />


            <Text style={styles.teamMeta}>{team.emirate} · {team.format} · {team.skillLevel}</Text>

            <Text style={styles.inputLabel}>Team Color</Text>
            <View style={styles.colorRow}>
              {TEAM_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, editColor === c && styles.colorDotSelected]}
                  onPress={() => setEditColor(c)}
                />
              ))}
            </View>

            <Text style={styles.inputLabel}>Formats (select all that apply)</Text>
            <View style={styles.optionRow}>
              {FORMATS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.optionBtn, editFormats.includes(f) && styles.optionBtnActive]}
                  onPress={() => {
                    setEditFormats(prev =>
                      prev.includes(f)
                        ? prev.filter(x => x !== f)
                        : [...prev, f]
                    );
                  }}
                >
                  <Text style={[styles.optionText, editFormats.includes(f) && styles.optionTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Emirate</Text>
            <View style={styles.optionRow}>
              {EMIRATES.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.optionBtn, editEmirate === e && styles.optionBtnActive]}
                  onPress={() => setEditEmirate(e)}
                >
                  <Text style={[styles.optionText, editEmirate === e && styles.optionTextActive]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Skill Level</Text>
            <View style={styles.optionRow}>
              {SKILL_LEVELS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.optionBtn, editSkill === s && styles.optionBtnActive]}
                  onPress={() => setEditSkill(s)}
                >
                  <Text style={[styles.optionText, editSkill === s && styles.optionTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveTeam}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.saveBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Team Chat Modal */}
      <Modal visible={showChat} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowChat(false)}>
        <KeyboardAvoidingView
          style={styles.modalWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Chat Header */}
          <View style={[styles.chatHeader, { paddingTop: insets.top + Spacing.sm }]}>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <Text style={styles.chatBackText}>←</Text>
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderTitle}>Team Chat</Text>
              <Text style={styles.chatHeaderSub}>{team.name} · {players.length} players</Text>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatMessages}
            contentContainerStyle={styles.chatMessagesContent}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={styles.chatEmpty}>
                <Text style={styles.chatEmptyIcon}>💬</Text>
                <Text style={styles.chatEmptyText}>No messages yet</Text>
                <Text style={styles.chatEmptySubtext}>Start the conversation with your team!</Text>
              </View>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === myUid;
                return (
                  <View key={msg.id} style={[styles.msgBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                    {!isMe && <Text style={styles.msgSender}>{msg.senderName}</Text>}
                    <Text style={[styles.msgText, isMe && styles.myMsgText]}>{msg.text}</Text>
                    <Text style={[styles.msgTime, isMe && styles.myMsgTime]}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Input */}
          <View style={[styles.chatInputRow, { paddingBottom: insets.bottom + Spacing.sm }]}>
            <TextInput
              style={styles.chatInput}
              value={chatText}
              onChangeText={setChatText}
              placeholder="Message your team..."
              placeholderTextColor={Colors.dark.textSecondary}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.chatSendBtn, (!chatText.trim() || sendingMsg) && { opacity: 0.4 }]}
              onPress={sendMessage}
              disabled={!chatText.trim() || sendingMsg}
            >
              <Text style={styles.chatSendBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },  
  content: { padding: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.background },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text, marginBottom: Spacing.sm },
  noTeamSubtitle: { color: Colors.dark.textSecondary, fontSize: FontSizes.md, marginBottom: Spacing.xl },
  options: { gap: Spacing.md },
  optionCard: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.sm },
  optionTitle: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  optionText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  optionBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', marginTop: Spacing.xs },
  optionBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },

  // Team Header
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  teamBadge: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  teamBadgeText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.lg },
  teamName: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  teamMeta: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  captainTag: { backgroundColor: Colors.dark.tint + '20', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: Colors.dark.tint },
  captainTagText: { color: Colors.dark.tint, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  memberTag: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: Colors.dark.border },
  memberTagText: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  teamLogoImg: { width: 56, height: 56, borderRadius: 28 },
  logoEditHint: { position: 'absolute', bottom: -2, right: -2, backgroundColor: Colors.dark.card, borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  logoEditHintText: { fontSize: 8 },
  pickupBtnRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  switchTeamBtn: { flex: 1, backgroundColor: '#4FC3F720', borderRadius: 6, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#4FC3F7' },
  switchTeamBtnText: { color: '#4FC3F7', fontSize: 11, fontWeight: '700' },
  deletePickupBtn: { flex: 1, backgroundColor: '#FF444415', borderRadius: 6, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#FF444440' },
  deletePickupBtnText: { color: '#FF4444', fontSize: 11, fontWeight: '700' },

  // Stats
  statsGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  statBox: { flex: 1, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  statValue: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  statLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  ratingRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  ratingBox: { flex: 1, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  ratingLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  ratingValue: { color: Colors.dark.text, fontSize: FontSizes.xs, fontWeight: FontWeights.bold, marginTop: 2, textAlign: 'center' },

  // Action Buttons
  actionBtns: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  actionBtn: { flex: 1, backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', minWidth: '30%' },
  actionBtnText: { color: '#000', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  chatActionBtn: { backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.border },
  chatActionBtnText: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  addPlayerBtn: { backgroundColor: Colors.dark.tint + '25', borderWidth: 1, borderColor: Colors.dark.tint },

  // Add Player
  addPlayerSection: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.sm },
  searchRow: { flexDirection: 'row', gap: Spacing.sm },
  searchInput: { flex: 1, backgroundColor: Colors.dark.background, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.dark.text, fontSize: FontSizes.sm, borderWidth: 1, borderColor: Colors.dark.border },
  searchBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, justifyContent: 'center' },
  searchBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  searchResultCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.dark.background, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.tint },
  searchResultInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  searchResultAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  searchResultAvatarText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  searchResultName: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  searchResultMeta: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  searchResultId: { color: Colors.dark.tint, fontSize: FontSizes.xs },
  addBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },

  // Squad
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold, marginBottom: Spacing.md },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  playerNumber: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, width: 16 },
  playerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  playerAvatarText: { color: Colors.dark.text, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  playerName: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, flexShrink: 1 },
  playerIdText: { color: Colors.dark.textSecondary, fontSize: 10 },
  captainBadge: { backgroundColor: Colors.dark.tint, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  captainBadgeText: { color: '#000', fontSize: 9, fontWeight: FontWeights.bold },
  posBadge: { paddingHorizontal: Spacing.xs, paddingVertical: 2, borderRadius: BorderRadius.sm, borderWidth: 1 },
  posText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  playerStats: { gap: 2, alignItems: 'flex-end' },
  playerStatText: { color: Colors.dark.textSecondary, fontSize: 10 },
  moreBtn: { padding: Spacing.xs },
  moreBtnText: { color: Colors.dark.textSecondary, fontSize: FontSizes.md, letterSpacing: 1 },
  emptyText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  playerAvatarImg: { width: 36, height: 36, borderRadius: 18 },

  // Modal
  modalWrapper: { flex: 1, backgroundColor: Colors.dark.background },
  modalContent: { padding: Spacing.lg, paddingBottom: 60, paddingTop: Spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { color: Colors.dark.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  modalClose: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  inputLabel: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, marginTop: Spacing.md, marginBottom: Spacing.xs, textTransform: 'uppercase' },
  input: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.dark.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.dark.border },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.dark.text },
  optionRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: Spacing.sm },
  optionBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  optionText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  optionTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  saveBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
  saveBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  convertPickupBtn: { backgroundColor: '#4FC3F720', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: '#4FC3F7', marginTop: 4 },
  convertPickupBtnText: { color: '#4FC3F7', fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  pickupWarning: { backgroundColor: '#FFC10715', borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#FFC10740' },
  pickupWarningText: { color: '#FFC107', fontSize: FontSizes.xs, textAlign: 'center' },

  // Chat
  chatHeader: { backgroundColor: Colors.dark.card, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  chatBackText: { color: Colors.dark.tint, fontSize: FontSizes.xl },
  chatHeaderInfo: { flex: 1 },
  chatHeaderTitle: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  chatHeaderSub: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  chatMessages: { flex: 1 },
  chatMessagesContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  chatEmpty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  chatEmptyIcon: { fontSize: 48 },
  chatEmptyText: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  chatEmptySubtext: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
  msgBubble: { maxWidth: '75%', padding: Spacing.sm, borderRadius: BorderRadius.md, gap: 2 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: Colors.dark.tint },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.border },
  msgSender: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  msgText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  myMsgText: { color: '#000' },
  msgTime: { color: Colors.dark.textSecondary, fontSize: 10, alignSelf: 'flex-end' },
  myMsgTime: { color: '#00000080' },
  chatInputRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.dark.card, borderTopWidth: 1, borderTopColor: Colors.dark.border, alignItems: 'flex-end' },
  chatInput: { flex: 1, backgroundColor: Colors.dark.background, borderRadius: BorderRadius.md, padding: Spacing.sm, color: Colors.dark.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.dark.border, maxHeight: 100 },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  chatSendBtnText: { color: '#000', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  teamCode: { color: Colors.dark.tint, fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 1, marginTop: 2 },

});
