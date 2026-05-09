import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  collection, query, where, getDocs,
  doc, updateDoc, getDoc, deleteDoc, writeBatch,
} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'notifications'), where('toUserId', '==', user.uid));
      const snap = await getDocs(q);
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(sorted);

      // Mark all as read
      const unread = snap.docs.filter(d => !d.data().read);
      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
      }
      const batch = writeBatch(db);
      unread.forEach(d => batch.update(d.ref, { read: true }));
      if (unread.length > 0) await batch.commit();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const clearAll = async () => {
    setClearing(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'notifications'), where('toUserId', '==', user.uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setNotifications([]);
    } catch (e) {
      console.error(e);
    } finally {
      setClearing(false);
    }
  };

  const clearOne = async (notifId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notifId));
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptRecruit = async (notif: any) => {
    setResponding(notif.id);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.data()?.teamId) {
        alert('You are already part of a team. Leave your current team first.');
        return;
      }
      const teamDoc = await getDoc(doc(db, 'teams', notif.fromTeamId));
      if (!teamDoc.exists()) { alert('Team no longer exists'); return; }
      const teamData = teamDoc.data();
      await updateDoc(doc(db, 'teams', notif.fromTeamId), {
        players: [...(teamData?.players || []), user.uid],
      });
      await updateDoc(doc(db, 'users', user.uid), {
        teamId: notif.fromTeamId,
        isFreeAgent: false,
      });
      await updateDoc(doc(db, 'notifications', notif.id), { status: 'accepted' });
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setResponding(null);
    }
  };

  const handleDeclineRecruit = async (notifId: string) => {
    setResponding(notifId);
    try {
      await updateDoc(doc(db, 'notifications', notifId), { status: 'declined' });
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setResponding(null);
    }
  };

  const getNotifConfig = (type: string) => {
    switch (type) {
      case 'recruit_request':     return { icon: '👥', color: Colors.dark.tint, label: 'Recruit Request' };
      case 'cancel_request':      return { icon: '⚠️', color: '#FFC107', label: 'Cancel Request' };
      case 'match_cancelled':     return { icon: '❌', color: '#FF4444', label: 'Match Cancelled' };
      case 'challenge_accepted':  return { icon: '✅', color: Colors.dark.tint, label: 'Challenge Accepted' };
      case 'challenge_declined':  return { icon: '❌', color: '#FF4444', label: 'Challenge Declined' };
      case 'challenge_received':  return { icon: '⚡', color: '#FFC107', label: 'New Challenge' };
      case 'score_submitted':     return { icon: '📋', color: Colors.dark.tint, label: 'Score Submitted' };
      case 'deadline_warning':    return { icon: '⏰', color: '#FF4444', label: 'Deadline Warning' };
      case 'friend_request':      return { icon: '🤝', color: '#4FC3F7', label: 'Friend Request' };
      case 'friend_accepted':     return { icon: '👋', color: Colors.dark.tint, label: 'Friend Accepted' };
      case 'match_details_changed': return { icon: '✏️', color: '#FFC107', label: 'Match Updated' };
      default:                    return { icon: '🔔', color: Colors.dark.tint, label: 'Notification' };
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ChevronBackground />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 40,
        }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.dark.tint} />
        }
      >
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.unreadText}>{unreadCount} unread</Text>
            )}
          </View>
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearAllBtn}
              onPress={clearAll}
              disabled={clearing}
            >
              {clearing
                ? <ActivityIndicator size="small" color="#FF4444" />
                : <Text style={styles.clearAllText}>Clear All</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>Match updates and requests will appear here</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((notif: any) => {
              const config = getNotifConfig(notif.type);
              const isPending = notif.status === 'pending';
              const isRead = notif.read;

              return (
                <View
                  key={notif.id}
                  style={[
                    styles.card,
                    { borderColor: isPending ? config.color + '40' : Colors.dark.border },
                    isRead && styles.cardRead,
                  ]}
                >
                  {/* Unread dot */}
                  {!isRead && <View style={[styles.unreadDot, { backgroundColor: config.color }]} />}

                  <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: config.color + '20' }]}>
                      <Text style={styles.icon}>{config.icon}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifTitle}>{config.label}</Text>

                      {/* Recruit Request */}
                      {notif.type === 'recruit_request' && (
                        <Text style={styles.notifBody}>
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.fromTeamName}</Text>
                          {' wants you to join their team!'}
                        </Text>
                      )}

                      {/* Cancel Request */}
                      {notif.type === 'cancel_request' && (
                        <Text style={styles.notifBody}>
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.fromTeamName}</Text>
                          {` requested to cancel your match on ${notif.matchDate} at ${notif.matchTime}. Go to the match to confirm.`}
                        </Text>
                      )}

                      {/* Match Cancelled */}
                      {notif.type === 'match_cancelled' && (
                        <Text style={styles.notifBody}>
                          {'Your match against '}
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.opponentTeamName}</Text>
                          {` on ${notif.matchDate} has been cancelled${notif.cancelledBy === 'mutual' ? ' by mutual agreement' : ''}.`}
                        </Text>
                      )}

                      {/* Challenge Accepted */}
                      {notif.type === 'challenge_accepted' && (
                        <Text style={styles.notifBody}>
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.fromTeamName}</Text>
                          {` accepted your challenge! Match on ${notif.matchDate} at ${notif.matchTime}.`}
                        </Text>
                      )}

                      {/* Challenge Received */}
                      {notif.type === 'challenge_received' && (
                        <Text style={styles.notifBody}>
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.fromTeamName}</Text>
                          {` challenged you to a ${notif.format} match on ${notif.matchDate}!`}
                        </Text>
                      )}

                      {notif.type === 'match_details_changed' && (
                        <Text style={styles.notifBody}>
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.fromTeamName}</Text>
                          {` updated the match — ${notif.newDate} at ${notif.newTime}`}
                          {notif.newVenue ? `, ${notif.newVenue}` : ''}
                        </Text>
                      )}

                      {/* Score Submitted */}
                      {notif.type === 'score_submitted' && (
                        <Text style={styles.notifBody}>
                          {'Score submitted for your match against '}
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.opponentTeamName}</Text>
                          {`: ${notif.score}`}
                        </Text>
                      )}

                      {/* Challenge Declined */}
                      {notif.type === 'challenge_declined' && (
                        <Text style={styles.notifBody}>
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.fromTeamName}</Text>
                          {` declined your challenge for ${notif.matchDate}.`}
                        </Text>
                      )}

                      {/* Friend Request */}
                      {notif.type === 'friend_request' && (
                        <Text style={styles.notifBody}>
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.fromName}</Text>
                          {' sent you a friend request!'}
                        </Text>
                      )}

                      {/* Friend Accepted */}
                      {notif.type === 'friend_accepted' && (
                        <Text style={styles.notifBody}>
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.fromName}</Text>
                          {' accepted your friend request!'}
                        </Text>
                      )}

                      {/* Deadline Warning */}
                      {notif.type === 'deadline_warning' && (
                        <Text style={styles.notifBody}>
                          {'⏰ Your match against '}
                          <Text style={[styles.highlight, { color: config.color }]}>{notif.opponentTeamName}</Text>
                          {` is in less than 24hrs! Match on ${notif.matchDate} at ${notif.matchTime}.`}
                        </Text>
                      )}

                      <Text style={styles.notifTime}>{getTimeAgo(notif.createdAt)}</Text>
                    </View>

                    {/* Status badge */}
                    {notif.status && notif.status !== 'pending' && (
                      <View style={[styles.statusBadge, {
                        backgroundColor: notif.status === 'accepted'
                          ? Colors.dark.tint + '20'
                          : notif.status === 'dismissed'
                          ? Colors.dark.border
                          : '#FF444420'
                      }]}>
                        <Text style={[styles.statusText, {
                          color: notif.status === 'accepted'
                            ? Colors.dark.tint
                            : notif.status === 'dismissed'
                            ? Colors.dark.textSecondary
                            : '#FF4444'
                        }]}>
                          {notif.status === 'accepted' ? '✓ Accepted'
                            : notif.status === 'declined' ? '✕ Declined'
                            : notif.status === 'dismissed' ? 'Dismissed'
                            : notif.status}
                        </Text>
                      </View>
                    )}

                    {/* Clear single */}
                    {(notif.status !== 'pending' || notif.type === 'match_cancelled' || notif.type === 'challenge_accepted' || notif.type === 'score_submitted' || notif.type === 'deadline_warning') && (
                      <TouchableOpacity
                        style={styles.clearBtn}
                        onPress={() => clearOne(notif.id)}
                      >
                        <Text style={styles.clearBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Recruit Request Actions */}
                  {notif.type === 'recruit_request' && notif.status === 'pending' && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptRecruit(notif)}
                        disabled={responding === notif.id}
                      >
                        {responding === notif.id
                          ? <ActivityIndicator color="#000" size="small" />
                          : <Text style={styles.acceptBtnText}>✓ Join Team</Text>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleDeclineRecruit(notif.id)}
                        disabled={responding === notif.id}
                      >
                        <Text style={styles.declineBtnText}>✕ Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Cancel Request Actions */}
                  {notif.type === 'cancel_request' && notif.status === 'pending' && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => {
                          updateDoc(doc(db, 'notifications', notif.id), { status: 'dismissed' });
                          router.push('/(tabs)');
                        }}
                      >
                        <Text style={styles.acceptBtnText}>View Match</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dismissBtn}
                        onPress={() => {
                          updateDoc(doc(db, 'notifications', notif.id), { status: 'dismissed' });
                          load();
                        }}
                      >
                        <Text style={styles.dismissBtnText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Challenge Received Actions */}
                  {notif.type === 'challenge_received' && notif.status === 'pending' && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => {
                          updateDoc(doc(db, 'notifications', notif.id), { status: 'dismissed' });
                          router.push('/challenges');
                        }}
                      >
                        <Text style={styles.acceptBtnText}>View Challenge</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dismissBtn}
                        onPress={() => {
                          updateDoc(doc(db, 'notifications', notif.id), { status: 'dismissed' });
                          load();
                        }}
                      >
                        <Text style={styles.dismissBtnText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Challenge Declined Actions */}
                  {notif.type === 'challenge_declined' && notif.status === 'pending' && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => {
                          updateDoc(doc(db, 'notifications', notif.id), { status: 'dismissed' });
                          load();
                        }}
                      >
                        <Text style={styles.acceptBtnText}>OK, Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Friend Request Actions */}
                  {notif.type === 'friend_request' && notif.status === 'pending' && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => {
                          updateDoc(doc(db, 'notifications', notif.id), { status: 'accepted' });
                          load();
                        }}
                      >
                        <Text style={styles.acceptBtnText}>✓ Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => {
                          updateDoc(doc(db, 'notifications', notif.id), { status: 'declined' });
                          load();
                        }}
                      >
                        <Text style={styles.declineBtnText}>✕ Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text },
  unreadText: { color: Colors.dark.tint, fontSize: FontSizes.xs, marginTop: 2 },
  clearAllBtn: { backgroundColor: '#FF444420', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: '#FF4444' },
  clearAllText: { color: '#FF4444', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  list: { gap: Spacing.md },
  card: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, gap: Spacing.sm, position: 'relative' },
  cardRead: { opacity: 0.75 },
  unreadDot: { position: 'absolute', top: Spacing.sm, right: Spacing.sm, width: 8, height: 8, borderRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  icon: { fontSize: 20 },
  notifTitle: { color: Colors.dark.text, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  notifBody: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, marginTop: 2, lineHeight: 18 },
  highlight: { fontWeight: FontWeights.bold },
  notifTime: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, marginTop: 4 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm, flexShrink: 0 },
  statusText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  clearBtn: { padding: 4, marginLeft: Spacing.xs },
  clearBtnText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  acceptBtn: { flex: 1, backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  acceptBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: '#FF4444', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  declineBtnText: { color: '#FF4444', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  dismissBtn: { flex: 1, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  dismissBtnText: { color: Colors.dark.textSecondary, fontWeight: FontWeights.semibold, fontSize: FontSizes.sm },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 56 },
  emptyText: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.semibold },
  emptySubtext: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
});