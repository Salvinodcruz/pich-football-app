import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
  TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  collection, query, where, getDocs,
  doc, getDoc,
} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import {
  getFriends, sendFriendRequest, acceptFriendRequest,
  getPendingRequests, removeFriend,
} from '@/src/utils/friendsService';
import { Ionicons } from '@expo/vector-icons';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [pendingWithProfiles, setPendingWithProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const [myProfile, setMyProfile] = useState<any>(null);

  useFocusEffect(useCallback(() => { load(); }, []));

  useEffect(() => {
    if (pending.length === 0) { setPendingWithProfiles([]); return; }
    const loadProfiles = async () => {
      const result = [];
      for (const req of pending) {
        try {
          const userDoc = await getDoc(doc(db, 'users', req.requestedBy));
          result.push({ ...req, requester: userDoc.data() });
        } catch (e) {
          result.push({ ...req, requester: null });
        }
      }
      setPendingWithProfiles(result);
    };
    loadProfiles();
  }, [pending]);

  const load = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      setMyProfile({ id: user.uid, ...userDoc.data() });
      const [f, p] = await Promise.all([
        getFriends(user.uid),
        getPendingRequests(user.uid),
      ]);
      setFriends(f);
      setPending(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const searchPlayer = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const q = query(collection(db, 'users'), where('playerId', '==', search.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        Alert.alert('Not Found', 'No player with that ID');
      } else {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if ((data as any).id === auth.currentUser?.uid) {
          Alert.alert('Oops', "That's your own ID!");
        } else {
          setSearchResult(data);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult || !myProfile) return;
    try {
      await sendFriendRequest(
        myProfile.id,
        `${myProfile.firstName || ''} ${myProfile.lastName || ''}`.trim() || 'Player',
        myProfile.photoURL || null,
        searchResult.id,
      );
      Alert.alert('Request Sent!', `Friend request sent to ${searchResult.firstName || searchResult.name}`);
      setSearchResult(null);
      setSearch('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send request');
    }
  };

  const handleAcceptRequest = async (req: any) => {
    try {
      await acceptFriendRequest(
        req.id,
        myProfile.id,
        `${myProfile.firstName || ''} ${myProfile.lastName || ''}`.trim() || 'Player',
        req.requestedBy,
      );
      load();
    } catch (e) {
      Alert.alert('Error', 'Could not accept request');
    }
  };

  const handleRemoveFriend = (friend: any) => {
    Alert.alert(
      'Remove Friend',
      `Remove ${friend.firstName || friend.name} from friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await removeFriend(friend.friendshipId);
            load();
          }
        }
      ]
    );
  };

  const openDM = (friend: any) => {
    const myId = auth.currentUser?.uid;
    const dmId = [myId, friend.id].sort().join('_');
    router.push({
      pathname: '/friend-dm/[id]',
      params: {
        id: dmId,
        friendName: `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || friend.name || 'Friend'
      }
    });
  };

  const renderFriend = (friend: any) => {
    const name = `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || friend.name || 'Player';
    return (
      <View key={friend.id} style={styles.friendRow}>
        {friend.photoURL ? (
          <Image source={{ uri: friend.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.dark.tint + '40' }]}>
            <Text style={styles.avatarText}>{name[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="id-card-outline" size={10} color="#666" />
            <Text style={styles.friendMeta}>{friend.playerId} · {friend.position || '?'} · {friend.emirate}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.dmBtn} onPress={() => openDM(friend)}>
            <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveFriend(friend)}>
            <Ionicons name="trash-outline" size={18} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
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
        <Text style={styles.pageTitle}>Friends</Text>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
            <Ionicons name="person-add-outline" size={14} color={Colors.dark.tint} />
            <Text style={styles.sectionLabel}>Add Friend by Player ID</Text>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Enter Player ID (PCH-XXXXX)"
              placeholderTextColor="#555"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={searchPlayer} disabled={searching}>
              {searching
                ? <ActivityIndicator color="#000" size="small" />
                : <Ionicons name="search" size={20} color="#000" />
              }
            </TouchableOpacity>
          </View>
          {searchResult && (
            <View style={styles.searchResultCard}>
              {searchResult.photoURL ? (
                <Image source={{ uri: searchResult.photoURL }} style={styles.resultAvatar} />
              ) : (
                <View style={[styles.resultAvatarPlaceholder, { backgroundColor: Colors.dark.tint + '40' }]}>
                  <Text style={styles.resultAvatarText}>{(searchResult.firstName || 'P')[0]}</Text>
                </View>
              )}
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{searchResult.firstName} {searchResult.lastName}</Text>
                <Text style={styles.resultMeta}>{searchResult.playerId} · {searchResult.position} · {searchResult.emirate}</Text>
              </View>
              <TouchableOpacity style={styles.addFriendBtn} onPress={handleSendRequest}>
                <Text style={styles.addFriendBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'friends' && styles.tabActive]}
            onPress={() => setTab('friends')}
          >
            <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>
              Friends {friends.length > 0 ? `(${friends.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'requests' && styles.tabActive]}
            onPress={() => setTab('requests')}
          >
            <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
              Requests {pending.length > 0 ? `(${pending.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 40 }} />
        ) : tab === 'friends' ? (
          friends.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#333" />
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptySubtext}>Search by Player ID to add friends</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {friends.map(renderFriend)}
              <TouchableOpacity
                style={styles.pickupBtn}
                onPress={() => router.push('/create-pickup')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="flash" size={20} color={Colors.dark.tint} />
                  <Text style={styles.pickupBtnText}>Create Pickup Game with Friends</Text>
                </View>
              </TouchableOpacity>
            </View>
          )
        ) : (
          pendingWithProfiles.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="mail-unread-outline" size={48} color="#333" />
              <Text style={styles.emptyTitle}>No pending requests</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {pendingWithProfiles.map((req: any) => {
                const requester = req.requester;
                return (
                  <View key={req.id} style={styles.requestRow}>
                    {requester?.photoURL ? (
                      <Image source={{ uri: requester.photoURL }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.dark.tint + '40' }]}>
                        <Text style={styles.avatarText}>{(requester?.firstName || 'P')[0]}</Text>
                      </View>
                    )}
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{requester?.firstName} {requester?.lastName}</Text>
                      <Text style={styles.friendMeta}>{requester?.playerId} · {requester?.position || '?'} · {requester?.emirate}</Text>
                    </View>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(req)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark" size={16} color="#000" />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff', marginBottom: Spacing.lg },
  searchSection: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  sectionLabel: { color: '#aaa', fontSize: FontSizes.xs, fontWeight: FontWeights.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  searchRow: { flexDirection: 'row', gap: Spacing.sm },
  searchInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.md, padding: Spacing.md, color: '#fff', fontSize: FontSizes.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, justifyContent: 'center' },
  searchBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  searchResultCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.tint + '40' },
  resultAvatar: { width: 40, height: 40, borderRadius: 20 },
  resultAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  resultAvatarText: { color: '#fff', fontWeight: FontWeights.bold },
  resultInfo: { flex: 1 },
  resultName: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  resultMeta: { color: '#666', fontSize: FontSizes.xs },
  addFriendBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addFriendBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  tabActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  tabText: { color: '#666', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  tabTextActive: { color: Colors.dark.tint },
  list: { gap: Spacing.xs },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.tint + '30' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  friendInfo: { flex: 1, minWidth: 0 },
  friendName: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  friendMeta: { color: '#666', fontSize: FontSizes.xs, marginTop: 2 },
  dmBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  removeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,68,68,0.1)' },
  acceptBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  acceptBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  pickupBtn: { backgroundColor: Colors.dark.tint + '20', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.dark.tint },
  pickupBtnText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  empty: { alignItems: 'center', marginTop: 60, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  emptySubtext: { color: '#666', fontSize: FontSizes.sm, textAlign: 'center' },
});