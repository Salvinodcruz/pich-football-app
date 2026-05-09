import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  collection, query, where, getDocs,
  orderBy, doc, getDoc,
} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<any[]>([]);

  // ✅ useFocusEffect is at component level — correct
  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadChats();
  }, []));

  const loadChats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const teamId = userData?.teamId;
      const allChats: any[] = [];

      if (teamId) {
        // 1. Captain-to-captain match chats
        try {
          const [q1, q2] = await Promise.all([
            getDocs(query(collection(db, 'challenges'), where('fromTeamId', '==', teamId), where('status', '==', 'accepted'))),
            getDocs(query(collection(db, 'challenges'), where('toTeamId', '==', teamId), where('status', '==', 'accepted'))),
          ]);

          for (const d of [...q1.docs, ...q2.docs]) {
            const match = { id: d.id, ...d.data() } as any;
            const isFrom = match.fromTeamId === teamId;
            const opponentName = isFrom ? match.toTeamName : match.fromTeamName;

            try {
              const msgSnap = await getDocs(
                query(collection(db, 'captainChats', match.id, 'messages'), orderBy('createdAt', 'desc'))
              );
              const lastMsg = msgSnap.docs[0]?.data();

              // Get opponent captain name
              let captainName = opponentName || 'Opponent';
              try {
                const oppTeamId = isFrom ? match.toTeamId : match.fromTeamId;
                const oppTeamDoc = await getDoc(doc(db, 'teams', oppTeamId));
                const captainId = oppTeamDoc.data()?.captainId;
                if (captainId) {
                  const captainDoc = await getDoc(doc(db, 'users', captainId));
                  const cData = captainDoc.data();
                  captainName = `${cData?.firstName || ''} ${cData?.lastName || ''}`.trim() || opponentName;
                }
              } catch (e) {}

              allChats.push({
                id: match.id,
                type: 'captain',
                name: captainName,
                subtitle: `⚽ ${opponentName} · ${match.date || ''}`,
                lastMessage: lastMsg?.text || 'No messages yet',
                lastTime: lastMsg?.createdAt || match.createdAt || '',
                unread: (msgSnap.docs || []).filter(d => !d.data().read && d.data().senderId !== user.uid).length,
                color: isFrom ? (match.toTeamColor || Colors.dark.tint) : (match.fromTeamColor || Colors.dark.tint),
              });
            } catch (e) { console.error('match chat error', e); }
          }
        } catch (e) { console.error('challenges error', e); }

        // 2. Direct chats between team captains
        try {
          const directSnap = await getDocs(
            query(collection(db, 'directChats'), where('participants', 'array-contains', teamId))
          );
          for (const d of directSnap.docs) {
            const data = d.data();
            const participants = data.participants || [];
            const otherTeamId = participants.find((p: string) => p !== teamId);
            if (!otherTeamId) continue;

            try {
              const otherTeamDoc = await getDoc(doc(db, 'teams', otherTeamId));
              const otherTeam = otherTeamDoc.data();

              // Get other team captain name
              let captainName = otherTeam?.name || 'Team';
              try {
                const captainId = otherTeam?.captainId;
                if (captainId) {
                  const captainDoc = await getDoc(doc(db, 'users', captainId));
                  const cData = captainDoc.data();
                  captainName = `${cData?.firstName || ''} ${cData?.lastName || ''}`.trim() || otherTeam?.name;
                }
              } catch (e) {}

              const msgSnap = await getDocs(
                query(collection(db, 'directChats', d.id, 'messages'), orderBy('createdAt', 'desc'))
              );
              const lastMsg = msgSnap.docs[0]?.data();
              allChats.push({
                id: d.id,
                type: 'direct',
                name: captainName,
                subtitle: `💬 ${otherTeam?.name || 'Team'} · Direct`,
                lastMessage: lastMsg?.text || 'No messages yet',
                lastTime: lastMsg?.createdAt || data.createdAt || '',
                unread: (msgSnap.docs || []).filter(d => !d.data().read && d.data().senderId !== teamId).length,
                color: otherTeam?.color || Colors.dark.tint,
                logoURL: otherTeam?.logoURL,
              });
            } catch (e) { console.error('direct chat error', e); }
          }
        } catch (e) { console.error('directChats error', e); }

        // 3. Team chat - show captain name with team name as subtitle
        try {
          const teamDoc = await getDoc(doc(db, 'teams', teamId));
          const teamData = teamDoc.data();
          const teamMsgSnap = await getDocs(
            query(collection(db, 'teamChats', teamId, 'messages'), orderBy('createdAt', 'desc'))
          );
          const lastTeamMsg = teamMsgSnap.docs[0]?.data();

          // Get team captain name
          let captainName = teamData?.name || 'Team';
          try {
            const captainId = teamData?.captainId;
            if (captainId) {
              const captainDoc = await getDoc(doc(db, 'users', captainId));
              const cData = captainDoc.data();
              captainName = `${cData?.firstName || ''} ${cData?.lastName || ''}`.trim() || teamData?.name;
            }
          } catch (e) {}

          allChats.push({
            id: teamId,
            type: 'team',
            name: captainName,
            subtitle: `👥 ${teamData?.name || 'Team'} · ${(teamData?.players || []).length} players`,
            lastMessage: lastTeamMsg?.text || 'No messages yet',
            lastTime: lastTeamMsg?.createdAt || '',
            unread: 0,
            color: teamData?.color || Colors.dark.tint,
            logoURL: teamData?.logoURL,
          });
        } catch (e) { console.error('team chat error', e); }

        // 4. Friend DMs
        try {
          const { getFriends } = await import('@/src/utils/friendsService');
          const friendsList = await getFriends(user.uid);
          for (const friend of friendsList) {
            const dmId = [user.uid, friend.id].sort().join('_');
            try {
              const msgSnap = await getDocs(
                query(collection(db, 'friendDMs', dmId, 'messages'), orderBy('createdAt', 'desc'))
              );
              const lastMsg = msgSnap.docs[0]?.data();
              if (lastMsg) {
                const friendName = `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || friend.name || 'Friend';
                allChats.push({
                  id: dmId,
                  type: 'friend',
                  name: friendName,
                  subtitle: `🤝 Friend · Direct Message`,
                  lastMessage: lastMsg.text || '',
                  lastTime: lastMsg.createdAt || '',
                  unread: (msgSnap.docs || []).filter(d => !d.data().read && d.data().senderId !== user.uid).length,
                  color: '#4FC3F7',
                  photoURL: friend.photoURL,
                  friendId: friend.id,
                });
              }
            } catch (e) { console.error('friend dm error', e); }
          }
        } catch (e) { console.error('friends error', e); }
      }

      // ✅ Sort at the END after all chats are collected
      allChats.sort((a, b) => {
        if (!a.lastTime) return 1;
        if (!b.lastTime) return -1;
        return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
      });

      setChats(allChats);
    } catch (e) {
      console.error('loadChats error', e);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (chat: any) => {
    if (chat.type === 'team') {
      router.push({
        pathname: `/chat-team/${chat.id}`,
        params: { teamName: chat.name }
      });
    } else if (chat.type === 'captain') {
      router.push({
        pathname: `/chat/${chat.id}`,
        params: { opponentName: chat.name }
      });
    } else if (chat.type === 'direct') {
      router.push({
        pathname: `/direct-chat/${chat.id}`,
        params: { chatName: chat.name }
      });
    } else if (chat.type === 'friend') {
      router.push({
        pathname: `/friend-dm/${chat.id}`,
        params: { friendName: chat.name }
      });
    }
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (mins > 0) return `${mins}m`;
    return 'now';
  };

  const getChatTypeDotColor = (type: string) => {
    if (type === 'team') return '#4FC3F7';
    if (type === 'captain') return Colors.dark.tint;
    if (type === 'friend') return '#4ff787';
    return '#FFC107';
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

        <Text style={styles.pageTitle}>Messages</Text>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: Colors.dark.tint, label: 'Match' },
            { color: '#4FC3F7', label: 'Team' },
            { color: '#FFC107', label: 'Direct' },
            { color: '#4ff787', label: 'Friend' },
          ].map(item => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 40 }} />
        ) : chats.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Accept a challenge or message a team captain to start chatting
            </Text>
          </View>
        ) : (
          <View style={styles.chatList}>
            {chats.map(chat => (
              <TouchableOpacity
                key={`${chat.id}-${chat.type}`}
                style={styles.chatRow}
                onPress={() => openChat(chat)}
                activeOpacity={0.8}
              >
                <View style={styles.avatarWrapper}>
                  <View style={[styles.chatAvatar, { backgroundColor: chat.color || Colors.dark.tint }]}>
                    {chat.logoURL || chat.photoURL ? (
                      <Image source={{ uri: chat.logoURL || chat.photoURL }} style={styles.chatAvatarImg} />
                    ) : (
                      <Text style={styles.chatAvatarText}>
                        {chat.name.substring(0, 2).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.chatTypeDot, { backgroundColor: getChatTypeDotColor(chat.type) }]} />
                </View>

                <View style={styles.chatContent}>
                  <View style={styles.chatTopRow}>
                    <Text style={[styles.chatName, chat.unread > 0 && styles.chatNameUnread]} numberOfLines={1}>
                      {chat.name}
                    </Text>
                    <Text style={styles.chatTime}>{getTimeAgo(chat.lastTime)}</Text>
                  </View>
                  <View style={styles.chatBottomRow}>
                    <Text style={[styles.chatLastMsg, chat.unread > 0 && styles.chatLastMsgUnread]} numberOfLines={1}>
                      {chat.lastMessage}
                    </Text>
                    {chat.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{chat.unread}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.chatSubtitle} numberOfLines={1}>{chat.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff', marginBottom: Spacing.md },
  legend: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#666', fontSize: FontSizes.xs },
  chatList: { gap: Spacing.xs },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: '#141414CC', borderWidth: 1, borderColor: '#2A2A2A' },
  avatarWrapper: { position: 'relative', flexShrink: 0 },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  chatAvatarImg: { width: 50, height: 50, borderRadius: 25 },
  chatAvatarText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  chatTypeDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#141414' },
  chatContent: { flex: 1, minWidth: 0 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  chatName: { color: '#aaa', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, flex: 1 },
  chatNameUnread: { color: '#fff', fontWeight: FontWeights.bold },
  chatTime: { color: '#555', fontSize: FontSizes.xs, marginLeft: Spacing.sm },
  chatBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatLastMsg: { color: '#555', fontSize: FontSizes.xs, flex: 1 },
  chatLastMsgUnread: { color: '#aaa', fontWeight: FontWeights.semibold },
  chatSubtitle: { color: '#444', fontSize: 10, marginTop: 2 },
  unreadBadge: { backgroundColor: Colors.dark.tint, borderRadius: 8, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, marginLeft: 4 },
  unreadBadgeText: { color: '#000', fontSize: 9, fontWeight: FontWeights.bold },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  emptySubtext: { color: '#666', fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
});