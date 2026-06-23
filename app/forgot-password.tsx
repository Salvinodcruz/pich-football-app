import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/src/config/firebase';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons } from '@expo/vector-icons';
import { useDialog } from '@/src/context/DialogContext';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useDialog();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showAlert(
        "Email Sent! ✅",
        `A secure password reset link has been dispatched to ${email}. Please check your inbox and follow the instructions.`,
        [{ text: 'Back to Login', onPress: () => router.replace('/login') }]
      );
    } catch (error: any) {
      let message = 'Failed to send reset email';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.content, {
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 40,
          }]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.iconWrapper}>
            <Ionicons name="key-outline" size={40} color="#000" />
          </View>

          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we&apos;ll send you a link to reset your password.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.dark.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={Colors.dark.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity
              style={[styles.resetBtn, loading && styles.btnDisabled]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.resetBtnText}>Send Reset Link</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: Spacing.xl },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: 28, fontWeight: FontWeights.bold, color: Colors.dark.text, marginBottom: Spacing.sm },
  subtitle: { 
    fontSize: FontSizes.sm, 
    color: Colors.dark.textSecondary, 
    textAlign: 'center', 
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    lineHeight: 20
  },
  form: { width: '100%', gap: Spacing.md },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.dark.text,
  },
  errorText: { color: '#FF4444', fontSize: FontSizes.xs, marginLeft: Spacing.xs },
  resetBtn: {
    backgroundColor: Colors.dark.tint,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
  resetBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});
