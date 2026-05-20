import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  collection, query, where, getDocs, doc, 
  deleteDoc, writeBatch, arrayUnion, updateDoc
} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const q = query(collection(db, 'notifications'), where('toUserId', '==', user.uid));
      const snap = await getDocs(q);
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
      
      setNotifications(sorted);
      
      const unread = snap.docs.filter(d => !d.data().read);
      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
      }
    } catch (e) { 
      console.error('Error loading notifications:', e); 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  const clearOne = async (id: string) => {
    try { 
      await deleteDoc(doc(db, 'notifications', id)); 
      setNotifications(prev => prev.filter(n => n.id !== id)); 
    } catch (e) { 
      console.error(e); 
    }
  };

  const handleAcceptInvite = async (n: any) => {
    if (!auth.currentUser) return;
    setResponding(n.id);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'teams', n.fromTeamId), { 
        players: arrayUnion(auth.currentUser.uid) 
      });
      batch.update(doc(db, 'users', auth.currentUser.uid), { 
        teamId: n.fromTeamId, 
        isFreeAgent: false 
      });
      batch.delete(doc(db, 'notifications', n.id));
      await batch.commit();
      Alert.alert('Success! ✅', `You've joined ${n.fromTeamName}`);
      load();
    } catch (e) { 
      Alert.alert('Error', 'Could not join team'); 
    } finally { 
      setResponding(null); 
    }
  };

  const handleMessage = (userId: string, userName: string) => {
    router.push({ pathname: '/direct-chat/[id]', params: { id: userId, name: userName } });
  };

  const getTimeAgo = (date: any) => {
    try {
      const timestamp = date?.toDate ? date.toDate().getTime() : new Date(date).getTime();
      const diff = Date.now() - timestamp;
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      return `${Math.max(0, mins)}m ago`;
    } catch {
      return 'just now';
    }
  };

  const getNotifConfig = (type: string): { icon: any, color: string, label: string } => {
    const green = Colors.dark.tint;
    switch (type) {
      case 'join_request': return { icon: 'person', color: green, label: 'Team Join Request' };
      case 'team_invite': return { icon: 'mail', color: '#4FC3F7', label: 'Team Invite' };
      case 'join_approved': return { icon: 'football', color: green, label: 'Request Approved' };
      case 'result_submitted': return { icon: 'clipboard', color: '#FFC107', label: 'Score Reported' };
      case 'score_reminder': return { icon: 'time', color: '#FF4444', label: 'Submit Score' };
      case 'friend_request': return { icon: 'people', color: '#4FC3F7', label: 'Friend Request' };
      case 'challenge_received': return { icon: 'flash', color: '#FFC107', label: 'New Match' };
      default: return { icon: 'notifications', color: green, label: 'Notification' };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[styles.content, { 
          paddingTop: insets.top + (Spacing.md || 16), 
          paddingBottom: insets.bottom + 40 
        }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); load(); }} 
            tintColor={Colors.dark.tint} 
          />
        }
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-back" size={20} color={Colors.dark.tint} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        
        <Text style={styles.pageTitle}>Activity</Text>
        
        {notifications.length === 0 && !loading && (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#333" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>All caught up!</Text>
          </View>
        )}

        {notifications.map(n => {
          const config = getNotifConfig(n.type);
          const hasActions = n.type === 'join_request' || n.type === 'team_invite' || n.type === 'friend_request' || n.type === 'challenge_received';

          return (
            <View key={n.id} style={[styles.card, !n.read && styles.unreadCard]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconCircle, { backgroundColor: config.color + '15', borderColor: config.color + '30', borderWidth: 1 }]}>
                  <Ionicons name={config.icon as any} size={18} color={config.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{config.label}</Text>
                  <Text style={styles.notifBody}>
                    {n.type === 'join_request' && `${n.fromUserName} wants to join ${n.teamName}`}
                    {n.type === 'team_invite' && `${n.fromTeamName} invited you to join them!`}
                    {n.type === 'join_approved' && `You've been accepted into the team!`}
                    {n.type === 'result_submitted' && `${n.fromTeamName} submitted a score for your match on ${n.matchDate}`}
                    {n.type === 'score_reminder' && `Don't forget to report the score for your match vs ${n.opponentTeamName}`}
                    {n.type === 'friend_request' && `${n.fromName} sent you a friend request`}
                    {n.type === 'challenge_received' && `${n.fromTeamName} challenged you to a match!`}
                  </Text>
                  <Text style={styles.notifTime}>{getTimeAgo(n.createdAt)}</Text>
                </View>
                <TouchableOpacity onPress={() => clearOne(n.id)} style={styles.clearBtn}>
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>
              </View>

              {hasActions && (
                <View style={styles.notifActions}>
                   {n.fromUserId && (
                    <TouchableOpacity 
                      style={styles.viewBtn}
                      onPress={() => router.push({ pathname: '/player-profile', params: { id: n.fromUserId } })}
                    >
                      <Text style={styles.viewBtnText}>View Profile</Text>
                    </TouchableOpacity>
                  )}
                  {n.type === 'team_invite' && (
                    <TouchableOpacity 
                      style={styles.viewBtn}
                      onPress={() => router.push({ pathname: '/team/[id]', params: { id: n.fromTeamId, preview: 'true' } })}
                    >
                      <Text style={styles.viewBtnText}>View Team</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.msgBtn}
                    onPress={() => handleMessage(n.fromUserId, n.fromUserName || n.fromTeamName || n.fromName)}
                  >
                    <Text style={styles.msgBtnText}>Message</Text>
                  </TouchableOpacity>
                  {n.type === 'team_invite' && (
                    <TouchableOpacity 
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptInvite(n)}
                      disabled={responding === n.id}
                    >
                      {responding === n.id ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.acceptBtnText}>Accept</Text>}
                    </TouchableOpacity>
                  )}
                  {n.type === 'join_request' && (
                    <TouchableOpacity 
                      style={styles.acceptBtn}
                      onPress={() => router.push('/(tabs)/my-team')}
                    >
                      <Text style={styles.acceptBtnText}>Review</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
        {loading && <ActivityIndicator style={{ marginTop: 20 }} color={Colors.dark.tint} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg || 24 },
  backBtn: { marginBottom: 20 },
  backText: { color: Colors.dark.tint, fontWeight: 'bold' },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  unreadCard: { borderColor: (Colors.dark.tint || '#00E676') + '40', backgroundColor: (Colors.dark.tint || '#00E676') + '05' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notifTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  notifBody: { color: '#888', fontSize: 12, marginTop: 2, lineHeight: 18 },
  notifTime: { color: '#444', fontSize: 10, marginTop: 8 },
  notifActions: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  viewBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  viewBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  msgBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  msgBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  acceptBtn: { flex: 1, backgroundColor: Colors.dark.tint || '#00E676', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  acceptBtnText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  clearBtn: { padding: 8 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#666', fontSize: 16 },
});
