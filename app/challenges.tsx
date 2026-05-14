import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  doc, getDoc, collection, query,
  where, onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import {
  acceptChallenge, declineChallenge,
} from '@/src/utils/challengeService';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [accepted, setAccepted] = useState<any[]>([]);
  const [tab, setTab] = useState<'incoming' | 'outgoing' | 'accepted'>('incoming');
  const [teamId, setTeamId] = useState<string | null>(null);

  // Custom dialog state
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    confirmColor: Colors.dark.tint,
    onConfirm: () => {},
  });

  const showDialog = (title: string, message: string, confirmText: string, confirmColor: string, onConfirm: () => void) => {
    setDialog({ visible: true, title, message, confirmText, confirmColor, onConfirm });
  };
  const hideDialog = () => setDialog(d => ({ ...d, visible: false }));

  const unsubscribers = useRef<(() => void)[]>([]);

  useEffect(() => {
    loadTeamAndListen();
    return () => unsubscribers.current.forEach(u => u());
  }, []);

  const loadTeamAndListen = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const tid = userDoc.data()?.teamId;
      if (!tid) { setLoading(false); return; }
      setTeamId(tid);
      setupListeners(tid);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const setupListeners = (tid: string) => {
    // Incoming pending
    const q1 = query(collection(db, 'challenges'), where('toTeamId', '==', tid), where('status', '==', 'pending'));
    const u1 = onSnapshot(q1, snap => {
      setIncoming(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Outgoing pending
    const q2 = query(collection(db, 'challenges'), where('fromTeamId', '==', tid), where('status', '==', 'pending'));
    const u2 = onSnapshot(q2, snap => {
      setOutgoing(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Accepted from
    const q3 = query(collection(db, 'challenges'), where('fromTeamId', '==', tid), where('status', '==', 'accepted'));
    const u3 = onSnapshot(q3, snap => {
      const fromMatches = snap.docs.map(d => ({ id: d.id, ...d.data(), isHome: true }));
      setAccepted(prev => {
        const toMatches = prev.filter((m: any) => m.isHome === false);
        return [...fromMatches, ...toMatches];
      });
    });

    // Accepted to
    const q4 = query(collection(db, 'challenges'), where('toTeamId', '==', tid), where('status', '==', 'accepted'));
    const u4 = onSnapshot(q4, snap => {
      const toMatches = snap.docs.map(d => ({ id: d.id, ...d.data(), isHome: false }));
      setAccepted(prev => {
        const fromMatches = prev.filter((m: any) => m.isHome === true);
        return [...fromMatches, ...toMatches];
      });
    });

    unsubscribers.current = [u1, u2, u3, u4];
  };

  const handleAccept = (challengeId: string, fromTeamName: string) => {
    showDialog(
      'Accept Challenge',
      `Accept challenge from ${fromTeamName}?`,
      'Accept',
      Colors.dark.tint,
      async () => {
        hideDialog();
        await acceptChallenge(challengeId);
        // Send notification to challenger
        const { notifyChallengeAccepted } = await import('@/src/utils/matchService');
        await notifyChallengeAccepted(challengeId);
        setTab('accepted');
      }
    );
  };

  const handleDecline = (challengeId: string) => {
    showDialog(
      'Decline Challenge',
      'Are you sure you want to decline this challenge?',
      'Decline',
      '#FF4444',
      async () => {
        hideDialog();
        try {
          await declineChallenge(challengeId);
          // Remove from UI immediately without waiting for listener
          setIncoming(prev => prev.filter((c: any) => c.id !== challengeId));
        } catch (e) {
          console.error('Decline error:', e);
          showDialog('Error', 'Could not decline challenge', 'OK', Colors.dark.tint, hideDialog);
        }
      }
    );
  };

  const handleCancelMatch = (challenge: any) => {
    const hasCancelRequest = !!challenge.cancelRequest;
    const isMyRequest = challenge.cancelRequest?.teamId === teamId;

    if (isMyRequest) {
      showDialog(
        'Pending Cancellation',
        'You already requested cancellation. Waiting for the other captain to confirm.',
        'OK',
        Colors.dark.tint,
        hideDialog
      );
      return;
    }

    showDialog(
      hasCancelRequest ? '⚠️ Confirm Cancellation' : 'Cancel Match',
      hasCancelRequest
        ? `${challenge.cancelRequest.teamName} has requested cancellation. Do you agree to cancel this match?`
        : 'Are you sure you want to cancel this match?\n\nBefore 24hrs: You can cancel alone.\nWithin 24hrs: Both captains must agree.',
      hasCancelRequest ? 'Yes, Cancel Match' : 'Request Cancel',
      '#FF4444',
      async () => {
        hideDialog();
        try {
          const { requestCancelMatch } = await import('@/src/utils/matchService');
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
          const tid = userDoc.data()?.teamId;
          const teamDoc = await getDoc(doc(db, 'teams', tid));
          const tName = teamDoc.data()?.name || 'Your team';
          await requestCancelMatch(challenge.id, tid, tName);
          showDialog(
            hasCancelRequest ? 'Match Cancelled ✅' : 'Request Sent',
            hasCancelRequest
              ? 'The match has been cancelled by mutual agreement.'
              : 'Cancel request sent. The other captain needs to confirm.',
            'OK',
            Colors.dark.tint,
            hideDialog
          );
        } catch (e) {
          showDialog('Error', 'Could not process cancellation', 'OK', Colors.dark.tint, hideDialog);
        }
      }
    );
  };

  const ChallengeCard = ({ challenge, isIncoming, isAccepted }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.teamBadge, {
          backgroundColor: isIncoming ? challenge.fromTeamColor : challenge.toTeamColor || Colors.dark.tint
        }]}>
          <Text style={styles.badgeText}>
            {(isIncoming ? challenge.fromTeamName : challenge.toTeamName)?.substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.teamName} numberOfLines={1}>
            {isIncoming ? challenge.fromTeamName : challenge.toTeamName}
          </Text>
          <Text style={styles.matchMeta}>{challenge.format} · {challenge.matchType}</Text>
        </View>
        <View style={[
          styles.typeBadge,
          challenge.matchType === 'Rated' && styles.ratedBadge,
          isAccepted && styles.acceptedBadge,
        ]}>
          <Text style={[styles.typeBadgeText, isAccepted && styles.acceptedBadgeText]}>
            {isAccepted ? 'CONFIRMED' : challenge.matchType}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="calendar-outline" size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.detailText}>{challenge.date} at {challenge.time}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="location-outline" size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>{challenge.venue}</Text>
        </View>
        {challenge.message ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
            <Ionicons name="chatbubble-outline" size={14} color={Colors.dark.textSecondary} style={{ marginTop: 2 }} />
            <Text style={styles.messageText}>&quot;{challenge.message}&quot;</Text>
          </View>
        ) : null}
      </View>

      {/* Incoming pending */}
      {isIncoming && !isAccepted && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(challenge.id, challenge.fromTeamName)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#000" />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(challenge.id)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="close-circle-outline" size={18} color="#FF4444" />
              <Text style={styles.declineBtnText}>Decline</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Outgoing pending */}
      {!isIncoming && !isAccepted && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingTop: Spacing.xs }}>
          <Ionicons name="time-outline" size={16} color={Colors.dark.textSecondary} />
          <Text style={styles.waitingText}>Waiting for response...</Text>
        </View>
      )}

      {/* Accepted */}
      {isAccepted && (
        <View style={styles.acceptedActions}>
          <TouchableOpacity
            style={styles.submitResultBtn}
            onPress={() => router.push({
              pathname: '/submit-result',
              params: {
                challengeId: challenge.id,
                homeTeam: challenge.fromTeamName,
                awayTeam: challenge.toTeamName,
                isHome: challenge.isHome ? 'true' : 'false',
              }
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="clipboard-outline" size={18} color={Colors.dark.tint} />
              <Text style={styles.submitResultBtnText}>Submit Result</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => router.push({
              pathname: `/chat/${challenge.id}` as any,
              params: { opponentName: isIncoming ? challenge.fromTeamName : challenge.toTeamName }
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.dark.textSecondary} />
              <Text style={styles.chatBtnText}>Message Captain</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelMatchBtn, challenge.cancelRequest && styles.cancelMatchBtnWarning]}
            onPress={() => handleCancelMatch(challenge)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons 
                name={challenge.cancelRequest ? "alert-circle-outline" : "close-outline"} 
                size={18} 
                color={challenge.cancelRequest ? "#FF4444" : Colors.dark.textSecondary} 
              />
              <Text style={[styles.cancelMatchBtnText, challenge.cancelRequest && styles.cancelMatchBtnTextWarning]}>
                {challenge.cancelRequest
                  ? challenge.cancelRequest.teamId === teamId
                    ? 'Cancel Requested...'
                    : 'Confirm Cancel'
                  : 'Cancel Match'
                }
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const currentList = tab === 'incoming' ? incoming : tab === 'outgoing' ? outgoing : accepted;

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
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => {}} tintColor={Colors.dark.tint} />
        }
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-back" size={20} color={Colors.dark.tint} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Challenges</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['incoming', 'outgoing', 'accepted'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'incoming' && incoming.length > 0 && ` (${incoming.length})`}
                {t === 'outgoing' && outgoing.length > 0 && ` (${outgoing.length})`}
                {t === 'accepted' && accepted.length > 0 && ` (${accepted.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 40 }} />
        ) : !teamId ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You need a team first</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/my-team')}>
              <Text style={styles.emptyBtnText}>Go to My Team</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {currentList.length === 0 ? (
              <View style={styles.empty}>
                <View style={{ marginBottom: Spacing.md }}>
                  {tab === 'incoming' && <Ionicons name="flash" size={48} color={Colors.dark.tint} />}
                  {tab === 'outgoing' && <Ionicons name="send" size={48} color={Colors.dark.tint} />}
                  {tab === 'accepted' && <Ionicons name="checkmark-circle" size={48} color={Colors.dark.tint} />}
                </View>
                <Text style={styles.emptyText}>
                  {tab === 'incoming' ? 'No incoming challenges' : tab === 'outgoing' ? 'No outgoing challenges' : 'No confirmed matches yet'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {tab === 'incoming' ? 'When teams challenge you, they\'ll appear here' : tab === 'accepted' ? 'Accept a challenge to see confirmed matches here' : ''}
                </Text>
              </View>
            ) : (
              currentList.map(c => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  isIncoming={tab === 'incoming'}
                  isAccepted={tab === 'accepted'}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>


      {/* Custom Dark Dialog — replaces all Alert popups */}
      <Modal visible={dialog.visible} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>{dialog.title}</Text>
            <Text style={styles.dialogMessage}>{dialog.message}</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={hideDialog}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, { backgroundColor: dialog.confirmColor }]}
                onPress={dialog.onConfirm}
              >
                <Text style={styles.dialogConfirmText}>{dialog.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text, marginBottom: Spacing.lg },
  tabs: { flexDirection: 'row', marginBottom: Spacing.lg, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.dark.border },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.dark.card },
  tabActive: { backgroundColor: Colors.dark.tint },
  tabText: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  tabTextActive: { color: '#000' },
  list: { gap: Spacing.md },
  card: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  teamBadge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  badgeText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  teamName: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  matchMeta: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm, backgroundColor: Colors.dark.tint + '20', borderWidth: 1, borderColor: Colors.dark.tint },
  ratedBadge: { backgroundColor: '#FFC10720', borderColor: '#FFC107' },
  acceptedBadge: { backgroundColor: Colors.dark.tint + '20', borderColor: Colors.dark.tint },
  typeBadgeText: { color: Colors.dark.tint, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  acceptedBadgeText: { color: Colors.dark.tint },
  details: { gap: 4, paddingLeft: 52 },
  detailText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  messageText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  acceptBtn: { flex: 1, backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  acceptBtnText: { color: '#000', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: '#FF4444', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  declineBtnText: { color: '#FF4444', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  waitingText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', paddingTop: Spacing.xs },
  acceptedActions: { gap: Spacing.xs, marginTop: Spacing.xs },
  submitResultBtn: { backgroundColor: Colors.dark.background, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.tint },
  submitResultBtnText: { color: Colors.dark.tint, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  chatBtn: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  chatBtnText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  cancelMatchBtn: { borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  cancelMatchBtnWarning: { borderColor: '#FF4444', backgroundColor: '#FF444410' },
  cancelMatchBtnText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  cancelMatchBtnTextWarning: { color: '#FF4444' },
  empty: { alignItems: 'center', marginTop: 40, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.semibold },
  emptySubtext: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  emptyBtnText: { color: '#000', fontWeight: FontWeights.bold },

  // Custom Dialog
  dialogOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  dialogBox: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.lg, padding: Spacing.xl, width: '100%', borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.md },
  dialogTitle: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  dialogMessage: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  dialogActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  dialogCancelBtn: { flex: 1, backgroundColor: Colors.dark.background, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  dialogCancelText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  dialogConfirmBtn: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  dialogConfirmText: { color: '#000', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
});