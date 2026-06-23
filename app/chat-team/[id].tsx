import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons } from '@expo/vector-icons';

export default function TeamChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, teamName } = useLocalSearchParams<{ id: string; teamName: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState('');
  const [myName, setMyName] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadMe();
    const q = query(
      collection(db, 'teamChats', id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
  };

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'teamChats', id, 'messages'), {
        text: text.trim(),
        senderId: myId,
        senderName: myName,
        createdAt: new Date().toISOString(),
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
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.tint} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="chatbubbles" size={20} color={Colors.dark.tint} />
              <Text style={styles.headerTitle}>Team Chat</Text>
            </View>
            <Text style={styles.headerSub}>{teamName?.replace(' Chat', '')}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="rgba(255,255,255,0.1)" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>Start the conversation with your team!</Text>
            </View>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderId === myId;
              return (
                <View key={msg.id} style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                  {!isMe && <Text style={styles.senderName}>{msg.senderName}</Text>}
                  <Text style={[styles.msgText, isMe && styles.myMsgText]}>{msg.text}</Text>
                  <Text style={[styles.msgTime, isMe && styles.myMsgTime]}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <View style={styles.inputCapsule}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Message your team..."
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
  header: { backgroundColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  headerSub: { color: '#666', fontSize: FontSizes.xs },
  messages: { flex: 1, backgroundColor: 'transparent' },
  messagesContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyTitle: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  emptySub: { color: '#666', fontSize: FontSizes.sm, textAlign: 'center' },
  bubble: { maxWidth: '75%', padding: Spacing.md, borderRadius: 20, gap: 2 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: Colors.dark.tint },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  senderName: { color: '#888', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  msgText: { color: '#fff', fontSize: FontSizes.sm },
  myMsgText: { color: '#000' },
  msgTime: { color: '#666', fontSize: 10, alignSelf: 'flex-end' },
  myMsgTime: { color: '#00000060' },
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