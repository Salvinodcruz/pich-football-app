import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import { parseMatchDateTime, requestCancelMatch } from '@/src/utils/matchService';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function MatchDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { matchId, teamId: paramTeamId } = useLocalSearchParams<{ matchId: string; teamId: string }>();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(paramTeamId || null);
  const [isCaptain, setIsCaptain] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    const unsub = onSnapshot(doc(db, 'challenges', matchId), (snap) => {
      if (snap.exists()) {
        setMatch({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });

    // Check if current user is captain
    const checkCaptain = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const tid = userDoc.data()?.teamId;
      if (tid) {
        setUserTeamId(tid);
        const teamDoc = await getDoc(doc(db, 'teams', tid));
        setIsCaptain(teamDoc.data()?.captainId === user.uid);
      }
    };
    checkCaptain();

    return unsub;
  }, [matchId]);

  const handleAccept = async () => {
    try {
      await updateDoc(doc(db, 'challenges', matchId), { status: 'accepted' });
    } catch (e) { console.error(e); }
  };

  const handleDecline = async () => {
    try {
      await updateDoc(doc(db, 'challenges', matchId), { status: 'declined' });
      router.back();
    } catch (e) { console.error(e); }
  };

  const handleCancel = async () => {
    if (!userTeamId || !match) return;
    Alert.alert(
      'Cancel Match',
      'Are you sure you want to cancel this match?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const teamDoc = await getDoc(doc(db, 'teams', userTeamId));
              const tName = teamDoc.data()?.name || 'Your team';
              await requestCancelMatch(match.id, userTeamId, tName);
              Alert.alert('Success', 'Cancellation processed');
            } catch (e) {
              Alert.alert('Error', 'Could not cancel match');
            }
          }
        }
      ]
    );
  };

  const openInMaps = () => {
    if (!match?.venue) return;
    router.push({
      pathname: '/match-map',
      params: { venue: match.venue, name: match.venue }
    });
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.dark.tint} />
    </View>
  );

  if (!match) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Match not found</Text>
    </View>
  );

  const matchDateObj = parseMatchDateTime(match.date, match.time);
  const isPast = matchDateObj ? matchDateObj.getTime() < Date.now() : false;
  const isOrganizer = match.fromTeamId === userTeamId;
  const canEdit = isOrganizer && isCaptain && match.status === 'accepted';
  const canSubmit = isCaptain && (match.fromTeamId === userTeamId || match.toTeamId === userTeamId) && match.status === 'accepted' && isPast;
  const canCancel = isCaptain && (match.fromTeamId === userTeamId || match.toTeamId === userTeamId) && (match.status === 'accepted' || match.status === 'pending');

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
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="chevron-back" size={20} color={Colors.dark.tint} />
              <Text style={styles.backText}>Back</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {canEdit && (
              <TouchableOpacity 
                style={styles.headerActionBtn} 
                onPress={() => router.push({ 
                  pathname: '/edit-match', 
                  params: { 
                    challengeId: match.id, 
                    currentDate: match.date, 
                    currentTime: match.time, 
                    currentVenue: match.venue 
                  } 
                })}
              >
                <MaterialCommunityIcons name="pencil-outline" size={20} color={Colors.dark.tint} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerActionBtn} onPress={openInMaps}>
              <Ionicons name="map-outline" size={20} color={Colors.dark.tint} />
            </TouchableOpacity>
            {match.status === 'accepted' && (match.fromTeamId === userTeamId || match.toTeamId === userTeamId) && (
              <TouchableOpacity 
                style={styles.headerActionBtn}
                onPress={() => router.push({ 
                  pathname: '/chat/[id]', 
                  params: { id: match.id, opponentName: match.fromTeamId === userTeamId ? match.toTeamName : match.fromTeamName } 
                })}
              >
                <Ionicons name="chatbubbles-outline" size={20} color={Colors.dark.tint} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Match Details</Text>
          {match.status === 'cancelled' && (
            <View style={styles.cancelledBadge}>
              <Ionicons name="close-circle-outline" size={12} color="#FF4444" />
              <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
            </View>
          )}
        </View>

        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            <View style={[styles.teamBadge, { backgroundColor: match.fromTeamColor || Colors.dark.tint }]}>
              <Text style={styles.teamBadgeText}>{match.fromTeamName?.substring(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.teamName}>{match.fromTeamName}</Text>
          </View>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.teamCol}>
            <View style={[styles.teamBadge, { backgroundColor: match.toTeamColor || '#FF6B6B' }]}>
              <Text style={styles.teamBadgeText}>{match.toTeamName?.substring(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.teamName}>{match.toTeamName}</Text>
          </View>
        </View>

        <View style={styles.card}>
          {[
            { icon: 'football-outline', label: 'Format', value: match.format },
            { icon: 'trophy-outline', label: 'Type', value: match.matchType },
            { icon: 'calendar-outline', label: 'Date', value: match.date },
            { icon: 'time-outline', label: 'Time', value: match.time },
            { icon: 'location-outline', label: 'Venue', value: match.venue },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <View style={styles.detailRow}>
                <Ionicons name={row.icon as any} size={18} color="#666" style={{ width: 24 }} />
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{row.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          {match.status === 'pending' && match.toTeamId === userTeamId && (
            <>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                <Text style={styles.acceptBtnText}>Accept Challenge</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}

          {canEdit && (
            <View />
          )}

          {/* Submit Request Button (New) */}
          {match.status === 'pending' && match.fromTeamId === userTeamId && (
            <TouchableOpacity 
              style={styles.submitRequestBtn} 
              onPress={() => Alert.alert('Request Sent', 'Your match request is active')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="paper-plane-outline" size={18} color={Colors.dark.tint} />
                <Text style={styles.submitRequestBtnText}>Submit Request</Text>
              </View>
            </TouchableOpacity>
          )}

          {canSubmit && (
            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={() => router.push({ 
                pathname: '/submit-result', 
                params: { 
                  challengeId: match.id, 
                  homeTeam: match.fromTeamName, 
                  awayTeam: match.toTeamName, 
                  isHome: match.fromTeamId === userTeamId ? 'true' : 'false' 
                } 
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="clipboard-outline" size={18} color={Colors.dark.tint} />
                <Text style={styles.submitBtnText}>Submit Result</Text>
              </View>
            </TouchableOpacity>
          )}

          {match.status === 'accepted' && !isPast && (
            <View style={styles.confirmedBox}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.dark.tint} />
              <Text style={styles.confirmedText}>Match Confirmed</Text>
            </View>
          )}

          {canCancel && match.status !== 'cancelled' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="close-circle-outline" size={18} color="#FF4444" />
                <Text style={styles.cancelBtnText}>{match.cancelRequest ? 'Cancel Requested...' : 'Cancel Match'}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  backBtn: { },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  headerRight: { flexDirection: 'row', gap: 12 },
  headerActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  title: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff' },
  cancelledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,68,68,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)' },
  cancelledBadgeText: { color: '#FF4444', fontSize: 10, fontWeight: FontWeights.bold },
  teamsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 32 },
  teamCol: { alignItems: 'center', flex: 1 },
  teamBadge: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  teamBadgeText: { fontSize: 24, fontWeight: FontWeights.bold, color: '#000' },
  teamName: { color: '#fff', fontWeight: FontWeights.bold, textAlign: 'center', fontSize: FontSizes.md },
  vs: { color: '#333', fontSize: 28, fontWeight: '900' },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  detailLabel: { color: '#666', flex: 1, marginLeft: 12, fontSize: FontSizes.sm },
  detailValue: { color: '#fff', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  actions: { gap: 12, marginTop: 12 },
  acceptBtn: { backgroundColor: Colors.dark.tint, padding: 18, borderRadius: BorderRadius.md, alignItems: 'center' },
  acceptBtnText: { fontWeight: FontWeights.bold, color: '#000', fontSize: FontSizes.md },
  declineBtn: { borderWidth: 1, borderColor: '#FF4444', padding: 18, borderRadius: BorderRadius.md, alignItems: 'center' },
  declineBtnText: { color: '#FF4444', fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  editBtn: { backgroundColor: 'rgba(255,193,7,0.05)', padding: 18, borderRadius: BorderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)' },
  editBtnText: { color: '#FFC107', fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  submitRequestBtn: { backgroundColor: Colors.dark.tint + '10', padding: 18, borderRadius: BorderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.tint + '30' },
  submitRequestBtnText: { color: Colors.dark.tint, fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  submitBtn: { backgroundColor: Colors.dark.tint + '20', padding: 18, borderRadius: BorderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.tint },
  submitBtnText: { color: Colors.dark.tint, fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#FF4444', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  confirmedBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(0,230,118,0.05)', padding: 20, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)', marginTop: 12 },
  confirmedText: { color: Colors.dark.tint, fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  errorText: { color: '#666', fontSize: FontSizes.md },
});
