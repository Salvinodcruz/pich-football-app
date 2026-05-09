import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection, addDoc, query, orderBy,
  onSnapshot, doc, getDoc,
} from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons } from '@expo/vector-icons';


export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, opponentName } = useLocalSearchParams<{
    id: string;
    opponentName: string;
  }>();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [myName, setMyName] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadMyName();
    if (!id) return;

    // Real-time listener for messages
    const q = query(
      collection(db, 'captainChats', id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [id]);

  const loadMyName = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    setMyName(userDoc.data()?.name || 'Captain');
  };

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      await addDoc(collection(db, 'captainChats', id, 'messages'), {
        text: text.trim(),
        senderId: user.uid,
        senderName: myName,
        createdAt: new Date().toISOString(),
      });
      setText('');
    } catch (e) {
      Alert.alert('Error', 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const myUid = auth.currentUser?.uid;

return (
  <KeyboardAvoidingView
    style={[styles.container, { backgroundColor: '#050505' }]}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={0}
  >
    <PremiumBackground />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.tint} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Captain Chat</Text>
          <Text style={styles.headerSubtitle}>{opponentName}</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyChatText}>No messages yet</Text>
            <Text style={styles.emptyChatSubtext}>
              Use this chat to coordinate venue details, timing, and match info
            </Text>
          </View>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === myUid;
            return (
              <View
                key={msg.id}
                style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}
              >
                {!isMe && (
                  <Text style={styles.senderName}>{msg.senderName}</Text>
                )}
                <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                  {msg.text}
                </Text>
                <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.dark.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { backgroundColor: 'rgba(255,255,255,0.03)', padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { padding: Spacing.xs },
  headerInfo: { flex: 1 },
  headerTitle: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  headerSubtitle: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs },
  messages: { flex: 1, backgroundColor: 'transparent' },
  messagesContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  emptyChat: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyChatText: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  emptyChatSubtext: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', paddingHorizontal: Spacing.xl },
  messageBubble: { maxWidth: '75%', padding: Spacing.md, borderRadius: 20, gap: 2 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: Colors.dark.tint },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  senderName: { color: Colors.dark.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  messageText: { color: Colors.dark.text, fontSize: FontSizes.sm },
  myMessageText: { color: '#000' },
  messageTime: { color: Colors.dark.textSecondary, fontSize: 10, alignSelf: 'flex-end' },
  myMessageTime: { color: '#00000080' },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, backgroundColor: 'rgba(255,255,255,0.03)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: Spacing.sm, color: Colors.dark.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.dark.tint, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});