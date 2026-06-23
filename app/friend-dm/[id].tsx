import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, onSnapshot, orderBy, query, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons } from '@expo/vector-icons';

export default function FriendDMScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, friendName } = useLocalSearchParams<{ id: string; friendName: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState('');
  const [myName, setMyName] = useState('');
  const [myPhoto, setMyPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadMe();
    const q = query(
      collection(db, 'friendDMs', id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [id]);

  const loadMe = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setMyId(user.uid);
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const data = userDoc.data();
    setMyName(`${data?.firstName || ''} ${data?.lastName || ''}`.trim() || 'Player');
    setMyPhoto(data?.photoURL || null);
  };

  const sendMessage = async () => {
    if (!text.trim() || sending || !myId) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'friendDMs', id, 'messages'), {
        text: text.trim(),
        senderId: myId,
        senderName: myName,
        senderPhoto: myPhoto,
        createdAt: new Date().toISOString(),
        read: false,
      });
      setText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.tint} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{friendName || 'Friend'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="person-outline" size={10} color="#666" />
              <Text style={styles.headerSub}>Friend · Direct Message</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.dark.tint} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="chatbubble-ellipses-outline" size={64} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>Say hi to your friend!</Text>
              </View>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === myId;
                return (
                  <View key={msg.id} style={[styles.msgRow, isMe && styles.msgRowMe]}>
                    {!isMe && (
                      msg.senderPhoto ? (
                        <Image source={{ uri: msg.senderPhoto }} style={styles.msgAvatar} />
                      ) : (
                        <View style={styles.msgAvatarPlaceholder}>
                          <Text style={styles.msgAvatarText}>{msg.senderName?.[0] || '?'}</Text>
                        </View>
                      )
                    )}
                    <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                      {!isMe && <Text style={styles.senderName}>{msg.senderName}</Text>}
                      <Text style={[styles.msgText, isMe && styles.myMsgText]}>{msg.text}</Text>
                      <Text style={[styles.msgTime, isMe && styles.myMsgTime]}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <View style={styles.inputCapsule}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Message..."
              placeholderTextColor="#555"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
              onPress={sendMessage}
              disabled={!text.trim() || sending}
            >
              <Ionicons name="send" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  headerSub: { color: '#666', fontSize: FontSizes.xs },
  messages: { flex: 1, backgroundColor: 'transparent' },
  messagesContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyTitle: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  emptySub: { color: '#666', fontSize: FontSizes.sm, textAlign: 'center' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: 4 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14 },
  msgAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  msgAvatarText: { color: '#fff', fontSize: 10, fontWeight: FontWeights.bold },
  bubble: { maxWidth: '75%', padding: Spacing.md, borderRadius: 20, gap: 2 },
  myBubble: { backgroundColor: Colors.dark.tint },
  theirBubble: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  senderName: { color: Colors.dark.tint, fontSize: 10, fontWeight: FontWeights.bold, marginBottom: 2 },
  msgText: { color: '#fff', fontSize: FontSizes.sm },
  myMsgText: { color: '#000' },
  msgTime: { color: '#666', fontSize: 8, alignSelf: 'flex-end' },
  myMsgTime: { color: 'rgba(0,0,0,0.5)' },
  inputContainer: { 
    padding: Spacing.md, 
    backgroundColor: 'transparent',
  },
  inputCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 30,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: { 
    flex: 1, 
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: '#fff', 
    fontSize: FontSizes.md, 
    maxHeight: 120,
  },
  sendBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: Colors.dark.tint, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 4,
  },
});