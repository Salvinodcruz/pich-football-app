import React, { useState, useEffect, useRef , useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, ActivityIndicator,
  TextInput, Image, Modal, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter , useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import { updatePlayerRating } from '@/src/utils/ratingService';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import PremiumBackground from '@/src/components/PremiumBackground';
import SkillHexagon from '@/src/components/SkillHexagon';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];
const EMIRATES = ['Sharjah', 'Dubai', 'Ajman'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isFreeAgent, setIsFreeAgent] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPlayerInfo, setShowPlayerInfo] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [editFirstName, setEditFirstName] = useState('');
  const [editMiddleName, setEditMiddleName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editEmirate, setEditEmirate] = useState('');
  const [editDobDay, setEditDobDay] = useState('');
  const [editDobMonth, setEditDobMonth] = useState('');
  const [editDobYear, setEditDobYear] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Derived stats for Hexagon
  const hexagonStats = {
    attack: Math.min(100, (profile?.goals || 0) * 10 + (profile?.skillRating || 0) * 0.4),
    defense: Math.min(100, (profile?.matches || 0) * 2 + (profile?.position === 'DEF' || profile?.position === 'GK' ? 60 : 25)),
    speed: Math.min(100, (profile?.matches || 0) * 3 + 35),
    passing: Math.min(100, (profile?.assists || 0) * 15 + (profile?.skillRating || 0) * 0.2),
    stamina: Math.min(100, (profile?.matches || 0) * 5 + 10),
  };

  useEffect(() => {
    let unsubscribe: () => void;
    const user = auth.currentUser;
    if (user) {
      updatePlayerRating(user.uid).then(() => {
        unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setProfile(data);
            setIsFreeAgent(data.isFreeAgent || false);
            setEditFirstName(data.firstName || '');
            setEditMiddleName(data.middleName || '');
            setEditLastName(data.lastName || '');
            setEditPosition(data.position || '');
            setEditEmirate(data.emirate || '');
            const dobParts = data.dob?.split(' ') || [];
            setEditDobDay(dobParts[0] || '');
            setEditDobMonth(dobParts[1] || '');
            setEditDobYear(dobParts[2] || '');
          }
          setLoading(false);
        });
      });
    } else {
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, []);

  useFocusEffect(useCallback(() => { loadUnreadCount(); }, []));

  const loadProfile = async () => {
    // legacy function replaced by onSnapshot
  };

  const loadUnreadCount = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'notifications'), where('toUserId', '==', user.uid), where('read', '==', false));
      const snap = await getDocs(q);
      setUnreadCount(snap.size);
    } catch (e) { console.error(e); }
  };

  const handlePhotoUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow access to your photo library'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true,
      });
      if (result.canceled || !result.assets[0].base64) return;
      setUploadingPhoto(true);
      const user = auth.currentUser;
      if (!user) return;
      await updateDoc(doc(db, 'users', user.uid), { photoURL: `data:image/jpeg;base64,${result.assets[0].base64}` });
      await loadProfile();
      Alert.alert('Photo Updated!');
    } catch (e) {
      Alert.alert('Error', 'Could not upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) { Alert.alert('Error', 'First and last name required'); return; }
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const fullName = [editFirstName, editMiddleName, editLastName].filter(Boolean).join(' ');
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: editFirstName.trim(),
        middleName: editMiddleName.trim(),
        lastName: editLastName.trim(),
        name: `${editFirstName.trim()} ${editLastName.trim()}`,
        fullName,
        position: editPosition,
        emirate: editEmirate,
        dob: editDobDay && editDobMonth && editDobYear ? `${editDobDay} ${editDobMonth} ${editDobYear}` : profile?.dob || null,
      });
      await loadProfile();
      setShowEditModal(false);
      Alert.alert('Saved!');
    } catch (e) {
      Alert.alert('Error', 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const toggleFreeAgent = async (value: boolean) => {
    setIsFreeAgent(value);
    try {
      const user = auth.currentUser;
      if (!user) return;
      await updateDoc(doc(db, 'users', user.uid), { isFreeAgent: value });
    } catch (e) { Alert.alert('Error', 'Could not update free agent status'); }
  };

  useEffect(() => {
    if (showDropdown) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [showDropdown]);

  const handleSignOut = async () => {
    setShowDropdown(false);
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { 
        try {
          await signOut(auth); 
          router.replace('/login'); 
        } catch (e) {
          Alert.alert('Error', 'Could not sign out');
        }
      } }
    ]);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.dark.tint} />
    </View>
  );

  const displayName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile?.name || 'Player';

  const initials = profile?.firstName && profile?.lastName
    ? `${profile.firstName[0]}${profile.lastName[0]}`
    : (profile?.name || 'P').substring(0, 2);

  const positionColors: Record<string, string> = {
    GK: '#FFC107', DEF: '#4FC3F7', MID: Colors.dark.tint, FWD: '#FF6B6B',
  };
  const posColor = positionColors[profile?.position] || Colors.dark.tint;

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      
      {/* Dropdown Overlay - placed here to be behind dropdown but above content */}
      {showDropdown && (
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          onPress={() => setShowDropdown(false)} 
          activeOpacity={1} 
        />
      )}

      {/* Dropdown Menu - placed outside ScrollView for stable absolute positioning */}
      {showDropdown && (
        <Animated.View style={[styles.dropdown, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }]}>
          <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowDropdown(false); setShowEditModal(true); }}>
            <Ionicons name="pencil-outline" size={18} color="#FFF" style={styles.dropdownIcon} />
            <Text style={styles.dropdownText}>Edit Profile</Text>
          </TouchableOpacity>
          <View style={styles.dropdownDivider} />
          <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowDropdown(false); setShowPlayerInfo(true); }}>
            <Ionicons name="id-card-outline" size={18} color="#FFF" style={styles.dropdownIcon} />
            <Text style={styles.dropdownText}>Player Info</Text>
          </TouchableOpacity>
          <View style={styles.dropdownDivider} />
          <View style={styles.dropdownItemRow}>
            <Ionicons name="walk-outline" size={18} color="#FFF" style={styles.dropdownIcon} />
            <Text style={styles.dropdownText}>Free Agent</Text>
            <Switch
              value={isFreeAgent}
              onValueChange={toggleFreeAgent}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.tint }}
              thumbColor={isFreeAgent ? '#000' : '#888'}
              style={{ marginLeft: 'auto', transform: [{ scale: 0.8 }] }}
            />
          </View>
          <View style={styles.dropdownDivider} />
          <TouchableOpacity style={styles.dropdownItem} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#FF4444" style={styles.dropdownIcon} />
            <Text style={[styles.dropdownText, { color: '#FF4444' }]}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 80,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Glass Row ── */}
        <View style={styles.headerGlass}>
          <Text style={styles.pageTitle}>Profile</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/friends')}>
              <Ionicons name="people-outline" size={20} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={20} color="#FFF" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowDropdown(!showDropdown)}>
              <Ionicons name="ellipsis-vertical" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero Section ── */}
        <View style={styles.heroSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePhotoUpload} disabled={uploadingPhoto}>
            <View style={[styles.avatarGlow, { borderColor: posColor, shadowColor: posColor }]}>
              {profile?.photoURL ? (
                <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={[styles.avatarInitials, { color: posColor }]}>{initials.toUpperCase()}</Text>
                </View>
              )}
              {profile?.position && (
                <View style={[styles.posBadgeOnAvatar, { backgroundColor: posColor }]}>
                  <Text style={styles.posBadgeText}>{profile.position}</Text>
                </View>
              )}
            </View>
            {uploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color={Colors.dark.tint} />
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.heroName}>{displayName}</Text>
            <Ionicons name="hand-right-outline" size={18} color={Colors.dark.tint} />
          </View>
          <View style={styles.heroSubRow}>
            {profile?.playerId && (
              <View style={[styles.playerIdChip, { borderColor: posColor + '40', backgroundColor: posColor + '10' }]}>
                <Text style={[styles.playerIdChipText, { color: posColor }]}>{profile.playerId}</Text>
              </View>
            )}
            {profile?.emirate && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={12} color="#666" />
                <Text style={styles.heroMeta}>{profile.emirate}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Hexagon & Rating ── */}
        <View style={styles.dataContainer}>
          <SkillHexagon stats={hexagonStats} color={posColor} />
          <View style={styles.ratingHero}>
            <View style={[styles.ratingRing, { borderColor: posColor, backgroundColor: posColor + '10', shadowColor: posColor }]}>
              <Text style={[styles.ratingValue, { color: posColor }]}>{profile?.skillRating ?? 0}</Text>
              <Text style={[styles.ratingLabel, { color: posColor }]}>RATING</Text>
            </View>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {profile?.position === 'GK' ? (
            <>
              {[
                { label: 'Matches', value: profile?.matches || 0, icon: 'calendar-outline', type: 'ion' },
                { label: 'Clean Sheets', value: profile?.totalCleanSheets || 0, icon: 'shield-check-outline', type: 'mci' },
                { label: 'Total Saves', value: profile?.totalSaves || 0, icon: 'hand-front-right-outline', type: 'mci' },
              ].map(stat => (
                <View key={stat.label} style={styles.statGlass}>
                  {stat.type === 'ion' ? (
                    <Ionicons name={stat.icon as any} size={20} color="#666" />
                  ) : (
                    <MaterialCommunityIcons name={stat.icon as any} size={20} color={Colors.dark.tint} />
                  )}
                  <Text style={styles.statVal}>{stat.value}</Text>
                  <Text style={styles.statLbl}>{stat.label}</Text>
                </View>
              ))}
            </>
          ) : (
            <>
              {[
                { label: 'Matches', value: profile?.matches || 0, icon: 'calendar-outline' },
                { label: 'Goals', value: profile?.goals || 0, icon: 'football-outline' },
                { label: 'Assists', value: profile?.assists || 0, icon: 'flash-outline' },
              ].map(stat => (
                <View key={stat.label} style={styles.statGlass}>
                  <Ionicons name={stat.icon as any} size={20} color="#666" />
                  <Text style={styles.statVal}>{stat.value}</Text>
                  <Text style={styles.statLbl}>{stat.label}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ── Action Row ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionGlass} onPress={() => router.push('/friends')}>
            <Ionicons name="people-outline" size={18} color="#aaa" />
            <Text style={styles.actionGlassText}>Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionGlass, styles.actionGlassGreen]} onPress={() => router.push('/free-agents')}>
            <Ionicons name="walk-outline" size={18} color={Colors.dark.tint} />
            <Text style={[styles.actionGlassText, { color: Colors.dark.tint }]}>Free Agents</Text>
          </TouchableOpacity>
        </View>

        {/* Admin */}
        {(profile?.role === 'admin' || profile?.role === 'Admin') && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={async () => {
              const { recalculateAllRatings } = await import('@/src/utils/ratingService');
              await recalculateAllRatings();
              loadProfile();
              Alert.alert('Done!', 'All ratings recalculated!');
            }}
          >
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="settings-outline" size={16} color="#FFC107" />
                <Text style={styles.adminBtnText}>Recalculate All Ratings</Text>
             </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Edit Modal ── */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>First Name *</Text>
            <TextInput style={styles.input} value={editFirstName} onChangeText={setEditFirstName} placeholder="First Name" placeholderTextColor={Colors.dark.textSecondary} autoCapitalize="words" />
            <Text style={styles.inputLabel}>Middle Name</Text>
            <TextInput style={styles.input} value={editMiddleName} onChangeText={setEditMiddleName} placeholder="Middle Name" placeholderTextColor={Colors.dark.textSecondary} autoCapitalize="words" />
            <Text style={styles.inputLabel}>Last Name *</Text>
            <TextInput style={styles.input} value={editLastName} onChangeText={setEditLastName} placeholder="Last Name" placeholderTextColor={Colors.dark.textSecondary} autoCapitalize="words" />
            <Text style={styles.inputLabel}>Date of Birth</Text>
            <View style={styles.dobRow}>
              <TextInput style={[styles.input, styles.dobDay]} value={editDobDay} onChangeText={setEditDobDay} placeholder="DD" placeholderTextColor={Colors.dark.textSecondary} keyboardType="numeric" maxLength={2} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                  <TouchableOpacity key={m} style={[styles.monthBtn, editDobMonth === m && styles.monthBtnActive]} onPress={() => setEditDobMonth(m)}>
                    <Text style={[styles.monthText, editDobMonth === m && styles.monthTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput style={[styles.input, styles.dobYear]} value={editDobYear} onChangeText={setEditDobYear} placeholder="YYYY" placeholderTextColor={Colors.dark.textSecondary} keyboardType="numeric" maxLength={4} />
            </View>
            <Text style={styles.inputLabel}>Position</Text>
            <View style={styles.optionRow}>
              {POSITIONS.map(p => (
                <TouchableOpacity key={p} style={[styles.optionBtn, editPosition === p && styles.optionBtnActive]} onPress={() => setEditPosition(p)}>
                  <Text style={[styles.optionText, editPosition === p && styles.optionTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputLabel}>Emirate</Text>
            <View style={styles.optionRow}>
              {EMIRATES.map(e => (
                <TouchableOpacity key={e} style={[styles.optionBtn, editEmirate === e && styles.optionBtnActive]} onPress={() => setEditEmirate(e)}>
                  <Text style={[styles.optionText, editEmirate === e && styles.optionTextActive]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveEdit} disabled={saving}>
              {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Player Info Modal ── */}
      <Modal visible={showPlayerInfo} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPlayerInfo(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Player Info</Text>
              <TouchableOpacity onPress={() => setShowPlayerInfo(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.infoCard}>
              {[
                { label: 'Player ID', value: profile?.playerId, color: Colors.dark.tint, icon: 'id-card-outline' },
                { label: 'Full Name', value: profile?.fullName || displayName, icon: 'person-outline' },
                { label: 'Position', value: profile?.position, icon: 'football-outline' },
                { label: 'Emirate', value: profile?.emirate, icon: 'location-outline' },
                { label: 'Date of Birth', value: profile?.dob, icon: 'calendar-outline' },
                { label: 'Free Agent', value: isFreeAgent ? 'Yes' : 'No', color: isFreeAgent ? Colors.dark.tint : undefined, icon: 'walk-outline' },
              ].map((row, i, arr) => (
                <View key={row.label}>
                  <View style={styles.infoRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Ionicons name={row.icon as any} size={18} color="#666" style={{ width: 24 }} />
                      <Text style={styles.infoLabel}>{row.label}</Text>
                    </View>
                    <Text style={[styles.infoValue, row.color ? { color: row.color } : {}]}>{row.value || '—'}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.infoDivider} />}
                </View>
              ))}
            </View>
            <Text style={styles.shareHint}>Share your Player ID so captains can find and add you</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },

  // Header Glass
  headerGlass: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#fff' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative' },
  badge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#FF4444', borderRadius: 8, minWidth: 15, height: 15, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#050505' },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: FontWeights.bold },

  // Dropdown
  dropdown: { position: 'absolute', top: 64, right: Spacing.lg, backgroundColor: '#1A1A1A', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#2A2A2A', zIndex: 9999, minWidth: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 10 },
  dropdownOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 9998, backgroundColor: 'transparent' },

  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  dropdownItemRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  dropdownIcon: { marginRight: 8 },
  dropdownText: { color: '#fff', fontSize: FontSizes.sm },
  dropdownDivider: { height: 1, backgroundColor: '#2A2A2A' },

  // Hero
  heroSection: { alignItems: 'center', marginBottom: Spacing.lg },
  avatarWrapper: { position: 'relative', marginBottom: Spacing.md },
  avatarGlow: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'visible',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 48, overflow: 'hidden' },
  avatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1A1A1A', borderRadius: 48, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarInitials: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  posBadgeOnAvatar: { position: 'absolute', bottom: -5, right: -5, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1.5, borderColor: '#050505' },
  posBadgeText: { color: '#000', fontSize: 9, fontWeight: FontWeights.bold },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
  heroName: { fontSize: 22, fontWeight: FontWeights.bold, color: '#fff', marginBottom: 6 },
  heroSubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  playerIdChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  playerIdChipText: { fontSize: 11, fontWeight: FontWeights.bold, letterSpacing: 1 },
  heroMeta: { color: '#666', fontSize: FontSizes.xs },

  // Data Container
  dataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  ratingHero: { alignItems: 'center' },
  ratingRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  ratingValue: { fontSize: 24, fontWeight: FontWeights.bold },
  ratingLabel: { fontSize: 8, fontWeight: FontWeights.bold, letterSpacing: 1 },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statGlass: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  statVal: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  statLbl: { color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Action Row
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  actionGlass: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  actionGlassGreen: { borderColor: 'rgba(0,230,118,0.2)', backgroundColor: 'rgba(0,230,118,0.05)' },
  actionGlassText: { color: '#aaa', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },

  // Admin
  adminBtn: { backgroundColor: 'rgba(255,193,7,0.05)', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,193,7,0.1)' },
  adminBtnText: { color: '#FFC107', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#050505' },
  modalContent: { padding: Spacing.lg, paddingBottom: 60 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.md },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: '#fff' },
  modalClose: { color: '#666', fontSize: FontSizes.sm },
  inputLabel: { color: '#666', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, marginTop: Spacing.md, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.md, padding: Spacing.md, color: '#fff', fontSize: FontSizes.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  dobRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  dobDay: { width: 60, textAlign: 'center' },
  dobYear: { width: 80, textAlign: 'center' },
  monthBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', marginRight: Spacing.xs },
  monthBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  monthText: { color: '#666', fontSize: FontSizes.xs },
  monthTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  optionRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: Spacing.xs },
  optionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  optionBtnActive: { borderColor: Colors.dark.tint, backgroundColor: Colors.dark.tint + '20' },
  optionText: { color: '#666', fontSize: FontSizes.sm },
  optionTextActive: { color: Colors.dark.tint, fontWeight: FontWeights.bold },
  saveBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
  saveBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },

  // Player Info
  infoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  infoLabel: { color: '#666', fontSize: FontSizes.sm },
  infoValue: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  infoDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  shareHint: { color: '#444', fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 18 },
});